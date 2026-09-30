import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/estante/estante_page.dart';
import 'package:le_ai_mobile/features/estante/textos.dart';
import 'package:le_ai_mobile/features/livros/livro_pessoal_page.dart';
import 'package:le_ai_mobile/features/progresso/fila_de_progresso.dart';
import 'package:le_ai_mobile/features/progresso/progresso_page.dart';
import 'package:le_ai_mobile/features/progresso/progresso_service.dart';
import 'package:le_ai_mobile/features/progresso/registrar_progresso.dart';
import 'package:le_ai_mobile/features/progresso/registro_progresso_controller.dart';
import 'package:le_ai_mobile/features/progresso/regras.dart';
import 'package:le_ai_mobile/features/progresso/rotas_progresso.dart';
import 'package:le_ai_mobile/features/progresso/textos.dart';

import '../estante/apoio_estante.dart';
import '../livros/apoio.dart';
import 'apoio_progresso.dart';

Progresso _progresso(String id, int posicao, int pagina, int anterior, {int minutos = 0}) =>
    Progresso.fromJson(
      progressoJson(
        id,
        posicao: posicao,
        pagina: pagina,
        paginaAnterior: anterior,
        minutos: minutos,
      ),
    );

http.Response _semRede() => throw http.ClientException('sem rede');

Map<String, dynamic> _corpo(http.Request request) =>
    jsonDecode(request.body) as Map<String, dynamic>;

void main() {
  group('regras (RN-17, RF-PRG-04)', () {
    test('página precisa ser maior que a atual e no máximo o total', () {
      expect(validarPagina(148, 264, null), TextosDoRegistro.erroPaginaAusente);
      expect(validarPagina(148, 264, 148), TextosDoRegistro.erroPaginaBaixa(148));
      expect(validarPagina(148, 264, 149), isNull);
      expect(validarPagina(148, 264, 264), isNull);
      expect(validarPagina(148, 264, 265), TextosDoRegistro.erroPaginaAlta(264));
    });

    test('tempo é opcional e vai de 0 a 720 minutos', () {
      expect(validarTempo('', '').minutos, isNull);
      expect(validarTempo('', '').erro, isNull);
      expect(validarTempo('0', '0').minutos, 0);
      expect(validarTempo('', '45').minutos, 45);
      expect(validarTempo('12', '0').minutos, minutosMaximos);
      expect(validarTempo('12', '1').erro, TextosDoRegistro.erroTempoMaximo);
      expect(validarTempo('1,5', '').erro, TextosDoRegistro.erroTempoInvalido);
    });

    test('páginas lidas e percentual são derivados', () {
      expect(paginasLidas(148, 172), 24);
      expect(paginasLidas(148, 148), isNull);
      expect(paginasLidas(148, null), isNull);
      expect(percentual(132, 264), 50);
      expect(percentual(300, 264), 100);
    });

    test('alcance da exclusão conta o registro e os posteriores', () {
      final itens = <Progresso>[
        _progresso('c', 3, 172, 148),
        _progresso('b', 2, 148, 117),
        _progresso('a', 1, 117, 95),
      ];
      final alcance = alcanceDaExclusao(itens, 'b', 264)!;
      expect(alcance.quantidade, 2);
      expect(alcance.paginaResultante, 117);
      expect(alcance.percentualResultante.round(), 44);
      expect(ehUltimo(itens, 'c'), isTrue);
      expect(ehUltimo(itens, 'b'), isFalse);
    });

    test('aviso de ritmo a partir de 40 páginas acima da média dos outros', () {
      final base = <Progresso>[_progresso('a', 1, 20, 0), _progresso('b', 2, 40, 20)];
      expect(precisaDeAvisoDeRitmo(<Progresso>[...base, _progresso('c', 3, 99, 40)], 'c'), isFalse);
      expect(precisaDeAvisoDeRitmo(<Progresso>[...base, _progresso('c', 3, 100, 40)], 'c'), isTrue);
      expect(precisaDeAvisoDeRitmo(<Progresso>[_progresso('a', 1, 39, 0)], 'a'), isFalse);
      expect(precisaDeAvisoDeRitmo(<Progresso>[_progresso('a', 1, 40, 0)], 'a'), isTrue);
    });
  });

  group('RegistroProgressoController', () {
    test('reenvio da mesma intenção reaproveita a chave e a captura', () async {
      final chaves = <String?>[];
      final corpos = <Map<String, dynamic>>[];
      var tentativas = 0;
      final controller = RegistroProgressoController(
        progressoSimulado((request) async {
          chaves.add(request.headers['Idempotency-Key']);
          corpos.add(_corpo(request));
          tentativas++;
          if (tentativas == 1) {
            return erro(503, 'INDISPONIVEL', 'Fora do ar.');
          }
          return json(
            comResumoJson(progressoJson('p1', posicao: 1, pagina: 172, paginaAnterior: 148)),
            201,
          );
        }),
        agora: () => DateTime.utc(2026, 9, 8, 12),
      );
      expect(await controller.registrar('le1', pagina: 172), isNull);
      expect(controller.erro, TextosDoRegistro.erroEnvio);
      final resultado = await controller.registrar('le1', pagina: 172);
      expect(resultado, isA<ProgressoSalvo>());
      expect(chaves[0], chaves[1]);
      expect(corpos[0], corpos[1]);
      expect(corpos[0].containsKey('minutos'), isFalse);
    });

    test('mudar a página gera chave nova', () async {
      final chaves = <String?>[];
      final controller = RegistroProgressoController(
        progressoSimulado((request) async {
          chaves.add(request.headers['Idempotency-Key']);
          return erro(503, 'INDISPONIVEL', 'Fora do ar.');
        }),
      );
      await controller.registrar('le1', pagina: 172);
      await controller.registrar('le1', pagina: 173);
      expect(chaves[0], isNot(chaves[1]));
    });

    test('422 mostra o erro do campo', () async {
      final controller = RegistroProgressoController(
        progressoSimulado(
          (request) async => erro(422, 'ENTIDADE_INVALIDA', 'Inválido.', <String, Object?>{
            'campos': <Object?>[
              <String, Object?>{'campo': 'pagina', 'mensagem': 'Página acima do total.'},
            ],
          }),
        ),
      );
      await controller.registrar('le1', pagina: 300);
      expect(controller.errosDosCampos['pagina'], 'Página acima do total.');
    });

    test('sem conexão, enfileira com a mesma chave e a captura original', () async {
      String? chaveEnviada;
      final armazem = ArmazemEmMemoria();
      final servico = progressoSimulado((request) async {
        chaveEnviada = request.headers['Idempotency-Key'];
        return _semRede();
      });
      final fila = FilaDeProgresso(servico, armazem);
      final controller = RegistroProgressoController(
        servico,
        fila: fila,
        agora: () => DateTime.utc(2026, 9, 8, 12),
      );
      final resultado = await controller.registrar('le1', pagina: 172, minutos: 45);
      expect(resultado, isA<ProgressoEnfileirado>());
      final registro = fila.pendentesDe('le1').single;
      expect(registro.chave, chaveEnviada);
      expect(registro.minutos, 45);
      expect(registro.registradoEmDispositivo, '2026-09-08T12:00:00.000Z');
      expect(armazem.conteudo, contains(chaveEnviada));
    });

    test('com pendentes na leitura, o novo registro entra na fila sem ir à rede', () async {
      var chamadas = 0;
      final servico = progressoSimulado((request) async {
        chamadas++;
        return _semRede();
      });
      final fila = FilaDeProgresso(servico, ArmazemEmMemoria());
      await fila.enfileirar(pendente('k1', 160));
      final controller = RegistroProgressoController(servico, fila: fila);
      final resultado = await controller.registrar('le1', pagina: 172);
      expect(resultado, isA<ProgressoEnfileirado>());
      expect(chamadas, 0);
      expect(fila.pendentesDe('le1').map((item) => item.pagina), <int>[160, 172]);
    });
  });

  group('FilaDeProgresso (RNF-ERR-05)', () {
    test('envia FIFO por leitura, um por vez, com a chave de cada registro', () async {
      final enviados = <String>[];
      var emVoo = 0;
      var maximoEmVoo = 0;
      final fila = FilaDeProgresso(
        progressoSimulado((request) async {
          emVoo++;
          maximoEmVoo = emVoo > maximoEmVoo ? emVoo : maximoEmVoo;
          await Future<void>.delayed(Duration.zero);
          emVoo--;
          enviados.add('${request.url.pathSegments[1]}:${request.headers['Idempotency-Key']}');
          final pagina = _corpo(request)['pagina'] as int;
          return json(
            comResumoJson(progressoJson('p$pagina', posicao: 1, pagina: pagina, paginaAnterior: 0)),
            201,
          );
        }),
        ArmazemEmMemoria(),
      );
      await fila.enfileirar(pendente('k1', 150));
      await fila.enfileirar(pendente('x1', 10, leituraId: 'le2'));
      await fila.enfileirar(pendente('k2', 160));
      await fila.sincronizar();
      expect(enviados, <String>['le1:k1', 'le1:k2', 'le2:x1']);
      expect(maximoEmVoo, 1);
      expect(fila.itens, isEmpty);
    });

    test('422 pausa a fila da leitura e não envia os posteriores', () async {
      final enviados = <String?>[];
      final fila = FilaDeProgresso(
        progressoSimulado((request) async {
          enviados.add(request.headers['Idempotency-Key']);
          if (request.url.pathSegments[1] == 'le1') {
            return erro(422, 'ENTIDADE_INVALIDA', 'A página precisa ser maior que 150.');
          }
          return json(
            comResumoJson(progressoJson('p', posicao: 1, pagina: 10, paginaAnterior: 0)),
            201,
          );
        }),
        ArmazemEmMemoria(),
      );
      await fila.enfileirar(pendente('k1', 150));
      await fila.enfileirar(pendente('k2', 160));
      await fila.enfileirar(pendente('x1', 10, leituraId: 'le2'));
      await fila.sincronizar();
      expect(enviados, <String>['k1', 'x1']);
      final pendentes = fila.pendentesDe('le1');
      expect(pendentes.first.pausa, 'A página precisa ser maior que 150.');
      expect(pendentes.last.pausado, isFalse);
      await fila.sincronizar();
      expect(enviados, <String>['k1', 'x1']);
    });

    test('5xx e falha de rede mantêm o registro para tentar depois', () async {
      var respostas = <http.Response Function()>[
        () => erro(500, 'ERRO_INTERNO', 'Falhou.'),
        _semRede,
      ];
      final chaves = <String?>[];
      final fila = FilaDeProgresso(
        progressoSimulado((request) async {
          chaves.add(request.headers['Idempotency-Key']);
          if (respostas.isNotEmpty) {
            final resposta = respostas.first;
            respostas = respostas.sublist(1);
            return resposta();
          }
          return json(
            comResumoJson(progressoJson('p', posicao: 1, pagina: 150, paginaAnterior: 0)),
            201,
          );
        }),
        ArmazemEmMemoria(),
      );
      await fila.enfileirar(pendente('k1', 150));
      await fila.sincronizar();
      expect(fila.pendentesDe('le1').single.pausado, isFalse);
      await fila.sincronizar();
      expect(fila.pendentesDe('le1'), hasLength(1));
      await fila.sincronizar();
      expect(fila.itens, isEmpty);
      expect(chaves, <String>['k1', 'k1', 'k1']);
    });

    test('a fila sobrevive ao reinício do app', () async {
      final armazem = ArmazemEmMemoria();
      final servico = progressoSimulado((request) async => _semRede());
      final antes = FilaDeProgresso(servico, armazem);
      await antes.enfileirar(pendente('k1', 150));
      await antes.enfileirar(pendente('k2', 160));

      final depois = FilaDeProgresso(servico, armazem);
      await depois.carregar();
      expect(depois.pendentesDe('le1').map((item) => item.chave), <String>['k1', 'k2']);
      expect(depois.paginaLocal('le1'), 160);
    });

    test('corrigir um registro pausado troca a chave e retoma a fila', () async {
      final chaves = <String?>[];
      var recusar = true;
      final fila = FilaDeProgresso(
        progressoSimulado((request) async {
          chaves.add(request.headers['Idempotency-Key']);
          if (recusar) {
            recusar = false;
            return erro(422, 'ENTIDADE_INVALIDA', 'Página inválida.');
          }
          return json(
            comResumoJson(progressoJson('p', posicao: 1, pagina: 155, paginaAnterior: 0)),
            201,
          );
        }),
        ArmazemEmMemoria(),
      );
      await fila.enfileirar(pendente('k1', 150));
      await fila.sincronizar();
      await fila.corrigir('k1', pagina: 155);
      await fila.sincronizar();
      expect(fila.itens, isEmpty);
      expect(chaves.first, 'k1');
      expect(chaves.last, isNot('k1'));
    });
  });

  group('Folha de registro', () {
    Future<void> abrir(
      WidgetTester tester,
      ProgressoService servico, {
      CorrecaoDoPendente? correcao,
      FilaDeProgresso? fila,
    }) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          Builder(
            builder: (context) => TextButton(
              onPressed: () => abrirRegistroDeProgresso(
                context,
                servico: servico,
                fila: fila,
                correcao: correcao,
                leitura: const LeituraDoRegistro(
                  leituraId: 'le1',
                  titulo: 'Torto Arado',
                  paginaAtual: 148,
                  totalPaginas: 264,
                ),
              ),
              child: const Text('abrir'),
            ),
          ),
        ),
      );
      await tester.tap(find.text('abrir'));
      await tester.pumpAndSettle();
    }

    Finder campoDePagina() => find.byType(TextField).first;

    testWidgets('valida a página com números concretos e mostra o derivado', (tester) async {
      await abrir(tester, progressoSimulado((request) async => _semRede()));
      expect(find.text('Página 148 de 264'), findsOneWidget);
      expect(find.text(TextosDoRegistro.ajudaPagina(149, 264)), findsOneWidget);
      expect(find.textContaining('Você leu'), findsNothing);

      await tester.enterText(campoDePagina(), '172');
      await tester.pump();
      expect(find.text('Você leu 24 páginas'), findsOneWidget);

      await tester.enterText(campoDePagina(), '140');
      await tester.tap(find.text(TextosDoRegistro.botaoSalvar));
      await tester.pump();
      expect(find.text(TextosDoRegistro.erroPaginaBaixa(148)), findsOneWidget);
      expect(find.text(TextosDoRegistro.ajudaPagina(149, 264)), findsOneWidget);

      await tester.enterText(campoDePagina(), '300');
      await tester.tap(find.text(TextosDoRegistro.botaoSalvar));
      await tester.pump();
      expect(find.text(TextosDoRegistro.erroPaginaAlta(264)), findsOneWidget);
      expect(find.textContaining('Você leu'), findsNothing);
    });

    testWidgets('tempo acima de 12 horas é recusado no cliente', (tester) async {
      var chamadas = 0;
      await abrir(
        tester,
        progressoSimulado((request) async {
          chamadas++;
          return _semRede();
        }),
      );
      await tester.enterText(campoDePagina(), '172');
      await tester.enterText(find.byType(TextField).at(1), '13');
      await tester.tap(find.text(TextosDoRegistro.botaoSalvar));
      await tester.pump();
      expect(find.text(TextosDoRegistro.erroTempoMaximo), findsOneWidget);
      expect(chamadas, 0);
    });

    testWidgets('falha do servidor mantém a folha aberta com o erro de envio', (tester) async {
      await abrir(
        tester,
        progressoSimulado((request) async => erro(500, 'ERRO_INTERNO', 'Falhou.')),
      );
      await tester.enterText(campoDePagina(), '172');
      await tester.tap(find.text(TextosDoRegistro.botaoSalvar));
      await tester.pumpAndSettle();
      expect(find.text(TextosDoRegistro.erroEnvio), findsOneWidget);
      expect(find.text(TextosDoRegistro.titulo), findsOneWidget);
    });

    testWidgets('corrigir pendente abre preenchido e troca o item da fila sem PATCH', (
      tester,
    ) async {
      final metodos = <String>[];
      final servico = progressoSimulado((request) async {
        metodos.add(request.method);
        return _semRede();
      });
      final armazem = ArmazemEmMemoria();
      final fila = FilaDeProgresso(servico, armazem);
      await tester.runAsync(() => fila.enfileirar(pendente('k1', 172)));
      await abrir(
        tester,
        servico,
        fila: fila,
        correcao: CorrecaoDoPendente(fila.itens.single, paginaAnterior: 148),
      );
      expect(find.text(TextosDoRegistro.titulo), findsOneWidget);
      expect(find.text(TextosDoRegistro.ajudaPagina(149, 264)), findsOneWidget);
      expect(find.text('172'), findsOneWidget);

      await tester.enterText(campoDePagina(), '170');
      await tester.tap(find.text(TextosDoRegistro.botaoSalvar));
      await tester.runAsync(() => Future<void>.delayed(Duration.zero));
      await tester.pumpAndSettle();

      expect(find.text(TextosDoRegistro.titulo), findsNothing);
      expect(fila.itens.single.pagina, 170);
      expect(fila.itens.single.chave, isNot('k1'));
      expect(metodos, isNot(contains('PATCH')));
    });
  });

  group('ProgressoPage', () {
    Future<List<http.Request>> montar(
      WidgetTester tester,
      Future<http.Response> Function(http.Request) handler, {
      FilaDeProgresso Function(ProgressoService servico)? criarFila,
    }) async {
      usarTelaDeCelular(tester);
      final requisicoes = <http.Request>[];
      Future<http.Response> registrar(http.Request request) {
        requisicoes.add(request);
        return handler(request);
      }

      final servico = progressoSimulado(registrar);
      await tester.pumpWidget(
        envolver(
          ProgressoPage(
            leituraId: 'le1',
            progresso: DependenciasDeProgresso(
              servico: servico,
              fila: criarFila?.call(servico) ?? FilaDeProgresso(servico, ArmazemEmMemoria()),
            ),
            estante: estanteSimulada((request) async {
              if (request.url.path.startsWith('/leituras/')) {
                return json(leituraJson('le1'), 200);
              }
              return json(itemJson('l1', status: 'LENDO'), 200);
            }),
            aoVoltar: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      return requisicoes;
    }

    final tres = <Map<String, Object?>>[
      progressoJson('c', posicao: 3, pagina: 172, paginaAnterior: 148, minutos: 45),
      progressoJson('b', posicao: 2, pagina: 148, paginaAnterior: 117, minutos: 70),
      progressoJson('a', posicao: 1, pagina: 117, paginaAnterior: 95, minutos: 35),
    ];

    testWidgets('resumo com minutos totais e exclusão em cada atualização', (tester) async {
      await montar(
        tester,
        (request) async => json(
          paginaProgressoJson(tres, resumo: resumoJson(paginaAtual: 172, minutosTotais: 260)),
          200,
        ),
      );
      expect(find.text('172 páginas'), findsOneWidget);
      expect(find.text('4 h 20 min'), findsOneWidget);
      expect(find.text('3 registros'), findsOneWidget);
      expect(find.text('Página 172 de 264'), findsOneWidget);
      expect(find.text('24 páginas · 45 min'), findsOneWidget);
      expect(find.byTooltip(TextosDasAtualizacoes.rotuloExcluir(172)), findsOneWidget);
      expect(find.byTooltip(TextosDasAtualizacoes.rotuloExcluir(148)), findsOneWidget);
    });

    testWidgets('descartar registro pausado pede confirmação antes de remover', (tester) async {
      late FilaDeProgresso fila;
      await tester.runAsync(() async {
        fila = FilaDeProgresso(progressoSimulado((request) async => _semRede()), ArmazemEmMemoria());
        await fila.enfileirar(pendente('k1', 172).pausadoCom('Página inválida.'));
      });
      await montar(
        tester,
        (request) async => json(paginaProgressoJson(tres, resumo: resumoJson(paginaAtual: 172)), 200),
        criarFila: (_) => fila,
      );
      await tocar(tester, find.text(TextosDasAtualizacoes.pendenteDescartar));
      await tester.pumpAndSettle();
      expect(find.text(TextosDasAtualizacoes.descarteTitulo), findsOneWidget);
      expect(
        find.text('O registro da página 172 ainda não foi enviado e será perdido.'),
        findsOneWidget,
      );

      await tester.tap(find.text(TextosDasAtualizacoes.botaoCancelar));
      await tester.pumpAndSettle();
      expect(fila.itens, hasLength(1));

      await tocar(tester, find.text(TextosDasAtualizacoes.pendenteDescartar));
      await tester.pumpAndSettle();
      await tester.tap(find.text(TextosDasAtualizacoes.pendenteDescartar).last);
      await tester.runAsync(() => Future<void>.delayed(Duration.zero));
      await tester.pumpAndSettle();
      expect(fila.itens, isEmpty);
      expect(find.text(TextosDasAtualizacoes.descarteTitulo), findsNothing);
    });

    testWidgets('confirmação de exclusão diz o alcance e o resultado do recálculo', (tester) async {
      final requisicoes = await montar(tester, (request) async {
        if (request.method == 'DELETE') {
          return json(<String, Object?>{
            'idsRemovidos': <String>['b', 'c'],
            'resumo': resumoJson(paginaAtual: 117),
          }, 200);
        }
        return json(paginaProgressoJson(tres, resumo: resumoJson(paginaAtual: 172)), 200);
      });
      await tocar(tester, find.byTooltip(TextosDasAtualizacoes.rotuloExcluir(148)));
      await tester.pumpAndSettle();
      expect(
        find.text(
          'Esta atualização e a seguinte serão excluídas. Sua página atual volta para 117 e o '
          'percentual para 44%. Os outros registros não mudam.',
        ),
        findsOneWidget,
      );
      await tester.tap(find.text(TextosDasAtualizacoes.confirmacaoBotao));
      await tester.pumpAndSettle();
      final exclusao = requisicoes.firstWhere((request) => request.method == 'DELETE');
      expect(exclusao.url.path, '/progresso/b');
      expect(_corpo(exclusao), <String, Object?>{'ultimoProgressoIdConfirmado': 'c'});
      expect(exclusao.headers['Idempotency-Key'], isNotNull);
    });

    testWidgets('409 na exclusão recarrega a lista e avisa', (tester) async {
      var listagens = 0;
      await montar(tester, (request) async {
        if (request.method == 'DELETE') {
          return erro(409, 'CONFLITO', 'Não é mais o último.');
        }
        listagens++;
        return json(paginaProgressoJson(tres, resumo: resumoJson(paginaAtual: 172)), 200);
      });
      await tocar(tester, find.byTooltip(TextosDasAtualizacoes.rotuloExcluir(172)));
      await tester.pumpAndSettle();
      await tester.tap(find.text(TextosDasAtualizacoes.confirmacaoBotao));
      await tester.pumpAndSettle();
      expect(find.text(TextosDoRegistro.erroListaDesatualizada), findsOneWidget);
      expect(listagens, 2);
    });

    testWidgets('aviso de ritmo em âmbar no registro fora da média', (tester) async {
      await montar(
        tester,
        (request) async => json(
          paginaProgressoJson(<Map<String, Object?>>[
            progressoJson('c', posicao: 3, pagina: 250, paginaAnterior: 148, minutos: 15),
            progressoJson('b', posicao: 2, pagina: 148, paginaAnterior: 117),
            progressoJson('a', posicao: 1, pagina: 117, paginaAnterior: 95),
          ], resumo: resumoJson(paginaAtual: 250)),
          200,
        ),
      );
      expect(
        find.text(
          '102 páginas em 15 minutos. Se você digitou errado, exclua este registro para voltar '
          'à página 148.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('vazio mostra zeros com unidade e o convite para registrar', (tester) async {
      await montar(
        tester,
        (request) async => json(
          paginaProgressoJson(const <Map<String, Object?>>[], resumo: resumoJson(paginaAtual: 0)),
          200,
        ),
      );
      expect(find.text('0 páginas'), findsOneWidget);
      expect(find.text('0 min'), findsOneWidget);
      expect(find.text('0 registros'), findsOneWidget);
      expect(find.text(TextosDasAtualizacoes.vazioTitulo), findsOneWidget);
      expect(find.text(TextosDasAtualizacoes.vazioBotao), findsOneWidget);
    });

    testWidgets('somente leitura esconde excluir e registrar', (tester) async {
      await montar(
        tester,
        (request) async => json(
          paginaProgressoJson(tres, resumo: resumoJson(paginaAtual: 172), somenteLeitura: true),
          200,
        ),
      );
      expect(find.byTooltip(TextosDasAtualizacoes.rotuloExcluir(172)), findsNothing);
      expect(find.byTooltip(TextosDoRegistro.titulo), findsNothing);
    });

    testWidgets('erro de carregamento oferece tentar de novo', (tester) async {
      await montar(tester, (request) async => erro(500, 'ERRO_INTERNO', 'Falhou.'));
      expect(find.text(TextosDasAtualizacoes.erroTexto), findsOneWidget);
      expect(find.text(TextosDasAtualizacoes.erroBotao), findsOneWidget);
    });
  });

  group('Estante com fila offline', () {
    testWidgets('registro sem conexão fica no aparelho e a estante mostra o pendente', (
      tester,
    ) async {
      usarTelaDeCelular(tester);
      final armazem = ArmazemEmMemoria();
      final servico = progressoSimulado((request) async => _semRede());
      String? verAtualizacoesDe;
      await tester.pumpWidget(
        envolver(
          EstantePage(
            servico: estanteSimulada((request) async {
              if (request.url.path.startsWith('/leituras/')) {
                return json(leituraJson('le1'), 200);
              }
              return json(
                paginaJson(<Map<String, Object?>>[
                  itemJson(
                    'l1',
                    status: 'LENDO',
                    leituraEmAndamentoId: 'le1',
                    paginaAtual: 148,
                    totalPaginas: 264,
                    percentual: 148 * 100 / 264,
                  ),
                ], totaisPorStatus: totais(lendo: 1)),
                200,
              );
            }),
            aoBuscarLivros: () {},
            progresso: DependenciasDeProgresso(
              servico: servico,
              fila: FilaDeProgresso(servico, armazem),
            ),
            aoVerAtualizacoes: (leituraId) => verAtualizacoesDe = leituraId,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('56%'), findsOneWidget);

      await tocar(tester, find.text('Torto Arado'));
      await tester.pumpAndSettle();
      expect(find.text(AcoesDeLeitura.verAtualizacoes), findsOneWidget);
      await tester.tap(find.text(AcoesDeLeitura.registrarProgresso));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, '172');
      await tester.tap(find.text(TextosDoRegistro.botaoSalvar));
      await tester.pumpAndSettle();

      expect(find.text(TextosDoRegistro.titulo), findsNothing);
      expect(find.text(TextosDoRegistro.avisoOffline), findsOneWidget);
      expect(find.text('65%'), findsOneWidget);
      expect(armazem.conteudo, contains('"pagina":172'));

      await tocar(tester, find.text('Torto Arado'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(AcoesDeLeitura.verAtualizacoes));
      await tester.pumpAndSettle();
      expect(verAtualizacoesDe, 'le1');
    });

    testWidgets('quando a fila envia o pendente, a estante recarrega do servidor', (tester) async {
      usarTelaDeCelular(tester);
      var online = false;
      var paginaAtual = 148;
      var listagens = 0;
      final servico = progressoSimulado((request) async {
        if (!online) {
          return _semRede();
        }
        paginaAtual = 172;
        return json(
          comResumoJson(progressoJson('p1', posicao: 1, pagina: 172, paginaAnterior: 148)),
          201,
        );
      });
      // O pendente já está gravado no aparelho, como depois de um registro sem conexão.
      final fila = FilaDeProgresso(
        servico,
        ArmazemEmMemoria(jsonEncode(<Map<String, Object?>>[pendente('k1', 172).toJson()])),
      );
      await tester.pumpWidget(
        envolver(
          EstantePage(
            servico: estanteSimulada((request) async {
              listagens++;
              return json(
                paginaJson(<Map<String, Object?>>[
                  itemJson(
                    'l1',
                    status: 'LENDO',
                    leituraEmAndamentoId: 'le1',
                    paginaAtual: paginaAtual,
                    totalPaginas: 264,
                    percentual: paginaAtual * 100 / 264,
                  ),
                ], totaisPorStatus: totais(lendo: 1)),
                200,
              );
            }),
            aoBuscarLivros: () {},
            progresso: DependenciasDeProgresso(servico: servico, fila: fila),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text(TextosDoRegistro.avisoOffline), findsOneWidget);
      final antes = listagens;

      online = true;
      unawaited(fila.sincronizar());
      await tester.pumpAndSettle();

      expect(fila.itens, isEmpty);
      expect(find.text(TextosDoRegistro.avisoOffline), findsNothing);
      expect(find.text('65%'), findsOneWidget);
      expect(listagens, antes + 1);
    });

    testWidgets('excluir progresso em outra tela atualiza o percentual da estante', (
      tester,
    ) async {
      usarTelaDeCelular(tester);
      var paginaAtual = 148;
      final servico = progressoSimulado((request) async {
        paginaAtual = 117;
        return json(<String, Object?>{
          'idsRemovidos': <String>['b', 'c'],
          'resumo': resumoJson(paginaAtual: 117),
        }, 200);
      });
      await tester.pumpWidget(
        envolver(
          EstantePage(
            servico: estanteSimulada(
              (request) async => json(
                paginaJson(<Map<String, Object?>>[
                  itemJson(
                    'l1',
                    status: 'LENDO',
                    leituraEmAndamentoId: 'le1',
                    paginaAtual: paginaAtual,
                    totalPaginas: 264,
                    percentual: paginaAtual * 100 / 264,
                  ),
                ], totaisPorStatus: totais(lendo: 1)),
                200,
              ),
            ),
            aoBuscarLivros: () {},
            progresso: DependenciasDeProgresso(
              servico: servico,
              fila: FilaDeProgresso(servico, ArmazemEmMemoria()),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('56%'), findsOneWidget);

      // A tela de atualizações fica empilhada por cima da estante e usa o mesmo serviço.
      unawaited(servico.excluirTrecho('b', ultimoProgressoIdConfirmado: 'c', idempotencyKey: 'k1'));
      await tester.pumpAndSettle();
      expect(find.text('56%'), findsNothing);
      expect(find.text('44%'), findsOneWidget);
    });
  });

  group('Livro pessoal com progresso', () {
    testWidgets('registrar progresso recarrega a situação e ver atualizações navega', (
      tester,
    ) async {
      usarTelaDeCelular(tester);
      final armazem = ArmazemEmMemoria();
      final registros = <http.Request>[];
      final servico = progressoSimulado((request) async {
        registros.add(request);
        return json(
          comResumoJson(progressoJson('p1', posicao: 1, pagina: 172, paginaAnterior: 148)),
          201,
        );
      });
      var consultasDaEstante = 0;
      String? verAtualizacoesDe;
      await tester.pumpWidget(
        envolver(
          LivroPessoalPage(
            servico: acervoSimulado(
              (request) async => json(<String, Object?>{
                'id': 'l1',
                'tipo': 'pessoal',
                'donoId': 'u1',
                'titulo': 'Torto Arado',
                'autor': 'Itamar Vieira Junior',
                'paginas': 264,
                'sinopse': null,
                'capaUrl': null,
                'modoConsulta': false,
                'notaDoDono': null,
                'resenhaDoDono': null,
                'dono': <String, Object?>{'nome': 'Rafaela Siqueira', 'avatarUrl': null},
              }, 200),
            ),
            leitura: leituraSimulada((request) async => json(semAvaliacao('l1'), 200)),
            livroId: 'l1',
            estante: estanteSimulada((request) async {
              if (request.url.path.startsWith('/leituras/')) {
                return json(leituraJson('le1'), 200);
              }
              consultasDaEstante++;
              return json(
                itemJson(
                  'l1',
                  status: 'LENDO',
                  leituraEmAndamentoId: 'le1',
                  paginaAtual: 148,
                  totalPaginas: 264,
                  percentual: 148 * 100 / 264,
                ),
                200,
              );
            }),
            progresso: DependenciasDeProgresso(
              servico: servico,
              fila: FilaDeProgresso(servico, armazem),
            ),
            aoVerAtualizacoes: (leituraId) => verAtualizacoesDe = leituraId,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(consultasDaEstante, 1);

      await tocar(tester, find.text(AcoesDeLeitura.registrarProgresso));
      await tester.pumpAndSettle();
      expect(find.text(TextosDoRegistro.titulo), findsNWidgets(2));
      await tester.enterText(find.byType(TextField).first, '172');
      await tester.tap(find.text(TextosDoRegistro.botaoSalvar));
      await tester.pumpAndSettle();

      // A recarga vem do aviso do serviço, não da folha: registro salvo muda o servidor.
      expect(find.text(TextosDoRegistro.titulo), findsOneWidget);
      expect(registros.single.method, 'POST');
      expect(_corpo(registros.single)['pagina'], 172);
      expect(consultasDaEstante, 2);

      await tocar(tester, find.text(AcoesDeLeitura.abrir));
      await tester.pumpAndSettle();
      await tester.tap(find.text(AcoesDeLeitura.verAtualizacoes));
      await tester.pumpAndSettle();
      expect(verAtualizacoesDe, 'le1');
    });
  });
}
