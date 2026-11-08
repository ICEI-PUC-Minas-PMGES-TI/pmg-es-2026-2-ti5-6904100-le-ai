import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/livros/acervo_service.dart';
import 'package:le_ai_mobile/features/livros/capa.dart';
import 'package:le_ai_mobile/features/livros/livro_pessoal_form_page.dart';
import 'package:le_ai_mobile/features/livros/seletor_de_assuntos.dart';

import 'apoio.dart';
import 'apoio_assuntos.dart';

const _id = 'dddddddd-4444-4444-8444-dddddddddddd';
const _dono = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
const _capa = 'https://res.cloudinary.com/leai/image/upload/v1/capas/abc.jpg';

Map<String, Object?> _livro({
  String titulo = 'Cartas de um sertanejo',
  String? capaUrl,
  List<String> assuntos = const <String>[],
}) =>
    <String, Object?>{
      'id': _id,
      'tipo': 'pessoal',
      'donoId': _dono,
      'titulo': titulo,
      'autor': 'Marina Albuquerque',
      'paginas': 184,
      'sinopse': null,
      'capaUrl': capaUrl,
      'modoConsulta': false,
      'notaDoDono': null,
      'resenhaDoDono': null,
      'assuntos': <Map<String, String>>[for (final id in assuntos) assuntoJson(id)],
    };

class _SeletorFixo implements SeletorDeImagem {
  final ImagemEscolhida? imagem;
  _SeletorFixo(this.imagem);

  @override
  Future<ImagemEscolhida?> escolher() async => imagem;
}

class _EnviadorFixo implements EnviadorDeCapa {
  final bool falhar;
  int envios = 0;
  _EnviadorFixo({this.falhar = false});

  @override
  Future<String> enviar(
    ImagemEscolhida imagem, {
    void Function(double progresso)? aoProgredir,
  }) async {
    envios++;
    aoProgredir?.call(1);
    if (falhar) {
      throw const FalhaNoEnvioDaCapa();
    }
    return _capa;
  }
}

/// PNG de verdade, desenhado na hora, para a validação de dimensões decodificar.
Future<Uint8List> _png(int largura, int altura) async {
  final gravador = ui.PictureRecorder();
  Canvas(gravador).drawRect(
    Rect.fromLTWH(0, 0, largura.toDouble(), altura.toDouble()),
    Paint()..color = const Color(0xFF3E5C42),
  );
  final imagem = await gravador.endRecording().toImage(largura, altura);
  final dados = await imagem.toByteData(format: ui.ImageByteFormat.png);
  return dados!.buffer.asUint8List();
}

void main() {
  late List<http.Request> pedidos;

  setUp(() => pedidos = <http.Request>[]);

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) handler, {
    String? livroId,
    SeletorDeImagem? seletor,
    EnviadorDeCapa? enviador,
    void Function(LivroPessoal)? aoSalvar,
    VoidCallback? aoExcluir,
    Duration? timeout,
  }) async {
    usarTelaDeCelular(tester);
    Future<http.Response> registrar(http.Request pedido) {
      pedidos.add(pedido);
      return handler(pedido);
    }

    await tester.pumpWidget(
      envolver(
        LivroPessoalFormPage(
          servico: timeout == null
              ? acervoSimulado(registrar)
              : AcervoService(
                  ApiClient(
                    baseUrl: 'https://acervo.example.com',
                    client: MockClient(registrar),
                    timeout: timeout,
                    esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
                  ),
                ),
          seletor: seletor ?? _SeletorFixo(null),
          enviador: enviador ?? _EnviadorFixo(),
          livroId: livroId,
          aoSalvar: aoSalvar,
          aoExcluir: aoExcluir,
        ),
      ),
    );
    await tester.pump();
  }

  Finder campo(String label) => find.ancestor(
    of: find.text(label),
    matching: find.byType(Column),
  ).first;

  Future<void> preencher(WidgetTester tester, String label, String valor) async {
    await tester.enterText(
      find.descendant(of: campo(label), matching: find.byType(TextField)),
      valor,
    );
    await tester.pump();
  }

  Finder botao(String texto) => find.widgetWithText(ElevatedButton, texto);

  testWidgets('criação: sem campo de ISBN, botão só com os três obrigatórios', (tester) async {
    LivroPessoal? salvo;
    await montar(
      tester,
      (_) async => json(_livro(), 201),
      aoSalvar: (livro) => salvo = livro,
    );

    expect(find.text('Cadastrar livro'), findsOneWidget);
    expect(find.text('ISBN'), findsNothing);
    expect(find.text('Editora'), findsNothing);
    expect(find.text('Excluir livro'), findsNothing);
    expect(tester.widget<ElevatedButton>(botao('Salvar livro')).onPressed, isNull);

    await preencher(tester, 'Título', 'Cartas de um sertanejo');
    await preencher(tester, 'Autor', 'Marina Albuquerque');
    expect(tester.widget<ElevatedButton>(botao('Salvar livro')).onPressed, isNull);
    await preencher(tester, 'Número de páginas', '184');

    await tocar(tester, botao('Salvar livro'));
    await tester.pump();
    await tester.pump();

    final post = pedidos.single;
    expect(post.method, 'POST');
    expect(post.url.path, '/livros/pessoal');
    expect(post.headers['Idempotency-Key'], isNotNull);
    expect(jsonDecode(post.body), <String, Object>{
      'titulo': 'Cartas de um sertanejo',
      'autor': 'Marina Albuquerque',
      'paginas': 184,
    });
    expect(salvo?.id, _id);
  });

  testWidgets('esvaziar um obrigatório mostra o erro no próprio campo', (tester) async {
    await montar(tester, (_) async => json(_livro(), 201));

    await preencher(tester, 'Título', 'Cartas');
    await preencher(tester, 'Título', '');

    expect(find.text('Informe o título do livro.'), findsOneWidget);
  });

  testWidgets('reenviar o mesmo formulário depois de falha reaproveita a chave', (tester) async {
    var tentativas = 0;
    await montar(tester, (_) async {
      tentativas++;
      return tentativas == 1
          ? erro(500, 'ERRO_INTERNO', 'Não foi possível salvar agora. Tente de novo.')
          : json(_livro(), 201);
    });

    await preencher(tester, 'Título', 'Cartas de um sertanejo');
    await preencher(tester, 'Autor', 'Marina Albuquerque');
    await preencher(tester, 'Número de páginas', '184');
    await tocar(tester, botao('Salvar livro'));
    await tester.pump();
    await tester.pump();

    expect(find.text('Não foi possível salvar agora. Tente de novo.'), findsOneWidget);

    await tocar(tester, botao('Salvar livro'));
    await tester.pump();
    await tester.pump();

    expect(pedidos, hasLength(2));
    expect(pedidos[0].headers['Idempotency-Key'], pedidos[1].headers['Idempotency-Key']);
  });

  testWidgets('erro de validação do servidor volta para o campo certo', (tester) async {
    await montar(tester, (_) async {
      return erro(400, 'REQUISICAO_INVALIDA', 'Confira os campos.', <String, Object>{
        'campos': <Map<String, String>>[
          <String, String>{'campo': 'autor', 'mensagem': 'O autor deve ter no máximo 200 caracteres.'},
        ],
      });
    });

    await preencher(tester, 'Título', 'Cartas');
    await preencher(tester, 'Autor', 'Marina');
    await preencher(tester, 'Número de páginas', '10');
    await tocar(tester, botao('Salvar livro'));
    await tester.pump();
    await tester.pump();

    expect(find.text('O autor deve ter no máximo 200 caracteres.'), findsOneWidget);
  });

  testWidgets('capa válida sobe ao Cloudinary e a URL vai no corpo', (tester) async {
    final bytes = (await tester.runAsync(() => _png(300, 400)))!;
    final enviador = _EnviadorFixo();
    await montar(
      tester,
      (_) async => json(_livro(capaUrl: _capa), 201),
      seletor: _SeletorFixo(ImagemEscolhida(bytes: bytes, nome: 'capa.png')),
      enviador: enviador,
    );

    await tester.runAsync(() async {
      await tester.tap(find.text('Adicionar capa'));
      // A validação decodifica a imagem de verdade, fora do tempo simulado.
      await Future<void>.delayed(const Duration(milliseconds: 200));
    });
    await tester.pump();

    expect(enviador.envios, 1);
    expect(find.text('Trocar capa'), findsOneWidget);

    await preencher(tester, 'Título', 'Cartas');
    await preencher(tester, 'Autor', 'Marina');
    await preencher(tester, 'Número de páginas', '10');
    await tocar(tester, botao('Salvar livro'));
    await tester.pump();
    await tester.pump();

    expect((jsonDecode(pedidos.single.body) as Map<String, dynamic>)['capaUrl'], _capa);
  });

  testWidgets('arquivo que não é imagem é recusado sem perder o que foi digitado', (tester) async {
    final enviador = _EnviadorFixo();
    await montar(
      tester,
      (_) async => json(_livro(), 201),
      seletor: _SeletorFixo(
        ImagemEscolhida(bytes: Uint8List.fromList(utf8.encode('MZ não sou imagem')), nome: 'capa.jpg'),
      ),
      enviador: enviador,
    );
    await preencher(tester, 'Título', 'Cartas');

    await tester.runAsync(() async {
      await tester.tap(find.text('Adicionar capa'));
      await Future<void>.delayed(const Duration(milliseconds: 50));
    });
    await tester.pump();

    expect(find.text('Formato não aceito. Use JPG, PNG ou WEBP.'), findsOneWidget);
    expect(enviador.envios, 0);
    expect(find.text('Cartas'), findsOneWidget);
  });

  testWidgets('imagem acima de 5 MB é recusada com o tamanho em pt-BR', (tester) async {
    final grande = Uint8List((8.2 * 1024 * 1024).round())
      ..setAll(0, <int>[0xFF, 0xD8, 0xFF, 0xE0]);
    await montar(
      tester,
      (_) async => json(_livro(), 201),
      seletor: _SeletorFixo(ImagemEscolhida(bytes: grande, nome: 'capa.jpg')),
    );

    await tester.runAsync(() async {
      await tester.tap(find.text('Adicionar capa'));
      await Future<void>.delayed(const Duration(milliseconds: 50));
    });
    await tester.pump();

    expect(find.text('Essa imagem tem 8,2 MB. O limite é 5 MB.'), findsOneWidget);
  });

  testWidgets('falha no envio da capa tem mensagem própria', (tester) async {
    final bytes = (await tester.runAsync(() => _png(300, 400)))!;
    await montar(
      tester,
      (_) async => json(_livro(), 201),
      seletor: _SeletorFixo(ImagemEscolhida(bytes: bytes, nome: 'capa.png')),
      enviador: _EnviadorFixo(falhar: true),
    );

    await tester.runAsync(() async {
      await tester.tap(find.text('Adicionar capa'));
      await Future<void>.delayed(const Duration(milliseconds: 200));
    });
    await tester.pump();

    expect(find.text('Não foi possível enviar a capa. Tente de novo.'), findsOneWidget);
  });

  testWidgets('edição carrega o livro, salva por PATCH e exclui com confirmação nomeada', (
    tester,
  ) async {
    var excluido = false;
    await montar(tester, (pedido) async {
      switch (pedido.method) {
        case 'GET':
          return json(_livro(capaUrl: _capa), 200);
        case 'PATCH':
          return json(_livro(titulo: 'Cartas revistas', capaUrl: _capa), 200);
        default:
          return http.Response('', 204);
      }
    }, livroId: _id, aoExcluir: () => excluido = true);
    await tester.pump();

    expect(find.text('Editar livro'), findsOneWidget);
    final titulo = tester.widget<TextField>(
      find.descendant(of: campo('Título'), matching: find.byType(TextField)),
    );
    expect(titulo.controller!.text, 'Cartas de um sertanejo');
    expect(find.text('Excluir este livro'), findsOneWidget);

    await preencher(tester, 'Título', 'Cartas revistas');
    await tocar(tester, botao('Salvar alterações'));
    await tester.pump();
    await tester.pump();

    final patch = pedidos.firstWhere((p) => p.method == 'PATCH');
    expect(patch.url.path, '/livros/pessoal/$_id');
    expect(jsonDecode(patch.body), <String, Object?>{
      'titulo': 'Cartas revistas',
      'autor': 'Marina Albuquerque',
      'paginas': 184,
      'sinopse': null,
      'capaUrl': _capa,
      // Na edição o array vai sempre (F-ACV-OPC): vazio limpa os assuntos.
      'assuntos': <String>[],
    });

    await tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir livro'));
    await tester.pumpAndSettle();

    expect(find.text('Excluir este livro?'), findsOneWidget);
    expect(find.textContaining('Cartas de um sertanejo sai da sua estante'), findsOneWidget);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Excluir livro').last);
    await tester.pumpAndSettle();

    final delete = pedidos.firstWhere((p) => p.method == 'DELETE');
    expect(delete.headers['Idempotency-Key'], isNotNull);
    expect(excluido, isTrue);
  });

  testWidgets('cancelar a confirmação não exclui', (tester) async {
    await montar(tester, (pedido) async => json(_livro(), 200), livroId: _id);
    await tester.pump();

    await tocar(tester, find.widgetWithText(OutlinedButton, 'Excluir livro'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar').last);
    await tester.pumpAndSettle();

    expect(pedidos.where((p) => p.method == 'DELETE'), isEmpty);
  });

  group('assuntos (F-ACV-OPC)', () {
    Finder naFolha(Finder alvo) =>
        find.descendant(of: find.byType(FolhaDeAssuntos), matching: alvo);

    Finder chipDaFolha(String nome) => naFolha(
      find.byWidgetPredicate((w) => w is ChipDeEscolhaDeAssunto && w.nome == nome),
    );

    Future<void> preencherObrigatorios(WidgetTester tester) async {
      await preencher(tester, 'Título', 'Cartas de um sertanejo');
      await preencher(tester, 'Autor', 'Marina Albuquerque');
      await preencher(tester, 'Número de páginas', '184');
    }

    Future<void> abrirSeletor(WidgetTester tester, String acao) async {
      await tocar(tester, find.text(acao));
      await tester.pumpAndSettle();
    }

    Future<void> escolher(WidgetTester tester, List<String> nomes) async {
      for (final nome in nomes) {
        await tester.ensureVisible(chipDaFolha(nome));
        await tester.tap(chipDaFolha(nome));
        await tester.pump();
      }
      await tester.tap(naFolha(find.text('Concluir')));
      await tester.pumpAndSettle();
    }

    Future<void> salvar(WidgetTester tester, String texto) async {
      await tocar(tester, botao(texto));
      await tester.pump();
      await tester.pump();
    }

    Future<http.Response> servidor(http.Request pedido) async {
      if (pedido.url.path == '/assuntos') {
        return json(listaDeAssuntos(), 200);
      }
      return json(_livro(), 201);
    }

    testWidgets('o campo fica entre páginas e sinopse e a lista só carrega ao abrir', (
      tester,
    ) async {
      await montar(tester, servidor);

      final yPaginas = tester.getTopLeft(find.text('Número de páginas')).dy;
      final yAssuntos = tester.getTopLeft(find.text('Assuntos')).dy;
      final ySinopse = tester.getTopLeft(find.text('Sinopse')).dy;
      expect(yAssuntos, greaterThan(yPaginas));
      expect(yAssuntos, lessThan(ySinopse));
      expect(pedidos, isEmpty);

      await abrirSeletor(tester, 'Escolher assuntos');
      expect(pedidos.single.url.path, '/assuntos');
    });

    testWidgets('criação manda os ids ordenados e a chave muda quando os assuntos mudam', (
      tester,
    ) async {
      var tentativas = 0;
      await montar(tester, (pedido) async {
        if (pedido.url.path == '/assuntos') {
          return json(listaDeAssuntos(), 200);
        }
        tentativas++;
        return erro(500, 'ERRO_INTERNO', 'Não foi possível salvar agora. Tente de novo.');
      });
      await preencherObrigatorios(tester);

      await abrirSeletor(tester, 'Escolher assuntos');
      await escolher(tester, <String>['Biografia', 'Memórias']);
      expect(find.text('Biografia'), findsOneWidget);
      expect(find.text('Memórias'), findsOneWidget);

      await salvar(tester, 'Salvar livro');
      final primeiro = pedidos.lastWhere((p) => p.method == 'POST');
      // Biografia tem o id maior: o corpo segue a ordem dos ids, não a dos nomes.
      expect(
        (jsonDecode(primeiro.body) as Map<String, dynamic>)['assuntos'],
        <String>[idMemorias, idBiografia],
      );

      await abrirSeletor(tester, 'Alterar assuntos');
      await escolher(tester, <String>['História']);
      await salvar(tester, 'Salvar livro');
      final segundo = pedidos.lastWhere((p) => p.method == 'POST');
      expect(
        (jsonDecode(segundo.body) as Map<String, dynamic>)['assuntos'],
        <String>[idMemorias, idHistoria, idBiografia],
      );
      expect(tentativas, 2);
      expect(segundo.headers['Idempotency-Key'], isNot(primeiro.headers['Idempotency-Key']));
    });

    testWidgets('fechar o seletor sem Concluir não muda o formulário', (tester) async {
      await montar(tester, servidor);

      await abrirSeletor(tester, 'Escolher assuntos');
      await tester.tap(chipDaFolha('Fantasia'));
      await tester.pump();
      await tester.tapAt(const Offset(20, 20));
      await tester.pumpAndSettle();

      expect(find.byType(FolhaDeAssuntos), findsNothing);
      expect(find.text('Escolher assuntos'), findsOneWidget);
      expect(find.text('Fantasia'), findsNothing);
    });

    testWidgets('503 da lista não impede salvar: o livro vai sem assuntos', (tester) async {
      LivroPessoal? salvo;
      await montar(tester, (pedido) async {
        if (pedido.url.path == '/assuntos') {
          return erro(503, 'INDISPONIVEL', 'Serviço indisponível.');
        }
        return json(_livro(), 201);
      }, aoSalvar: (livro) => salvo = livro);
      await preencherObrigatorios(tester);

      await abrirSeletor(tester, 'Escolher assuntos');
      expect(naFolha(find.text('Não foi possível carregar os assuntos.')), findsOneWidget);
      await tester.tap(naFolha(find.text('Fechar')));
      await tester.pumpAndSettle();

      expect(tester.widget<ElevatedButton>(botao('Salvar livro')).onPressed, isNotNull);
      await salvar(tester, 'Salvar livro');

      final post = pedidos.singleWhere((p) => p.method == 'POST');
      final corpo = jsonDecode(post.body) as Map<String, dynamic>;
      // O que foi digitado continua lá, e o livro vai sem assuntos.
      expect(corpo['titulo'], 'Cartas de um sertanejo');
      expect(corpo.containsKey('assuntos'), isFalse);
      expect(salvo?.id, _id);
    });

    testWidgets('timeout da lista não impede salvar', (tester) async {
      LivroPessoal? salvo;
      await montar(
        tester,
        (pedido) {
          if (pedido.url.path == '/assuntos') {
            return Completer<http.Response>().future;
          }
          return Future<http.Response>.value(json(_livro(), 201));
        },
        timeout: const Duration(seconds: 5),
        aoSalvar: (livro) => salvo = livro,
      );
      await preencherObrigatorios(tester);

      await tocar(tester, find.text('Escolher assuntos'));
      await tester.pump();
      await tester.pump(const Duration(seconds: 4));
      expect(
        naFolha(find.text('O serviço está iniciando. Isso pode levar alguns segundos.')),
        findsOneWidget,
      );
      // Três tentativas de 5 s (o GET retenta), e a folha mostra a falha.
      await tester.pump(const Duration(seconds: 12));
      await tester.pumpAndSettle();
      expect(naFolha(find.text('Não foi possível carregar os assuntos.')), findsOneWidget);

      await tester.tapAt(const Offset(20, 20));
      await tester.pumpAndSettle();
      await salvar(tester, 'Salvar livro');

      final post = pedidos.singleWhere((p) => p.method == 'POST');
      expect((jsonDecode(post.body) as Map<String, dynamic>).containsKey('assuntos'), isFalse);
      expect(salvo?.id, _id);
    });

    testWidgets('400 de assuntos aparece no campo, sem banner, com o foco em Alterar', (
      tester,
    ) async {
      const mensagem =
          'Um dos assuntos escolhidos não está mais na lista do Lê Ai. Revise e salve de novo.';
      await montar(tester, (pedido) async {
        if (pedido.url.path == '/assuntos') {
          return json(listaDeAssuntos(), 200);
        }
        return erro(400, 'REQUISICAO_INVALIDA', 'Confira os campos.', <String, Object>{
          'campos': <Map<String, String>>[
            <String, String>{'campo': 'assuntos', 'mensagem': mensagem},
          ],
        });
      });
      await preencherObrigatorios(tester);
      await abrirSeletor(tester, 'Escolher assuntos');
      await escolher(tester, <String>['História']);

      await salvar(tester, 'Salvar livro');
      await tester.pump();

      expect(find.text(mensagem), findsOneWidget);
      expect(find.text('Confira os campos.'), findsNothing);
      expect(find.text('História'), findsOneWidget);
      expect(find.text('Opcional. Escolha da lista do Lê Ai, de preferência até 5.'), findsNothing);
      expect(FocusManager.instance.primaryFocus?.debugLabel, 'Assuntos');

      // Escolher de novo limpa o erro.
      await abrirSeletor(tester, 'Alterar assuntos');
      await escolher(tester, <String>['História']);
      expect(find.text(mensagem), findsNothing);
    });

    testWidgets('edição chega preenchida e o PATCH manda o array, vazio quando esvaziado', (
      tester,
    ) async {
      await montar(tester, (pedido) async {
        switch (pedido.method) {
          case 'GET':
            return json(_livro(assuntos: <String>[idMemorias, idHistoria]), 200);
          default:
            return json(_livro(), 200);
        }
      }, livroId: _id);
      await tester.pump();

      expect(find.text('História'), findsOneWidget);
      expect(find.text('Memórias'), findsOneWidget);
      // Ordem alfabética, mesmo que o servidor mande fora dela.
      expect(
        tester.getTopLeft(find.text('História')).dx,
        lessThan(tester.getTopLeft(find.text('Memórias')).dx),
      );

      await tocar(tester, botao('Salvar alterações'));
      await tester.pump();
      await tester.pump();
      var patch = pedidos.lastWhere((p) => p.method == 'PATCH');
      expect(
        (jsonDecode(patch.body) as Map<String, dynamic>)['assuntos'],
        <String>[idMemorias, idHistoria],
      );

      await tocar(tester, find.bySemanticsLabel('Remover História'));
      await tester.pump();
      await tocar(tester, find.bySemanticsLabel('Remover Memórias'));
      await tester.pump();
      expect(find.text('Escolher assuntos'), findsOneWidget);

      await tocar(tester, botao('Salvar alterações'));
      await tester.pump();
      await tester.pump();
      patch = pedidos.lastWhere((p) => p.method == 'PATCH');
      expect((jsonDecode(patch.body) as Map<String, dynamic>)['assuntos'], <String>[]);
    });
  });
}
