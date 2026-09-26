import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/features/livros/capa.dart';
import 'package:le_ai_mobile/features/perfil/avatar.dart';
import 'package:le_ai_mobile/features/perfil/editar_perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';

import '../livros/apoio.dart';

const _avatarAtual = 'https://res.cloudinary.com/leai/image/upload/v1/avatares/atual.png';
const _avatarNovo = Avatar(
  url: 'https://res.cloudinary.com/leai/image/upload/v2/avatares/novo.png',
  publicId: 'avatares/novo',
);

const Map<String, Object?> _paginaVazia = <String, Object?>{
  'items': <Object?>[],
  'page': 0,
  'size': 1,
  'totalElements': 0,
  'totalPages': 0,
};

Map<String, Object?> _perfil({
  String privacidade = 'publico',
  String? avatarUrl = _avatarAtual,
  String? biografia = 'Leio de tudo.',
  int seguidores = 84,
}) => <String, Object?>{
  'id': 'u1',
  'username': 'marinableu',
  'displayName': 'Marina Beltrão',
  'avatarUrl': avatarUrl,
  'privacidade': privacidade,
  'conteudoRestrito': false,
  'relacao': 'proprio',
  'biografia': biografia,
  'contadores': <String, Object?>{'seguidores': seguidores, 'seguidos': 97},
};

PerfilService _servico(Future<http.Response> Function(http.Request) handler) => PerfilService(
  ApiClient(
    baseUrl: 'https://identidade.example.com',
    client: MockClient(handler),
    esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
  ),
);

class _SeletorFixo implements SeletorDeImagem {
  final ImagemEscolhida? imagem;
  _SeletorFixo(this.imagem);

  @override
  Future<ImagemEscolhida?> escolher() async => imagem;
}

class _EnviadorFixo implements EnviadorDeAvatar {
  final bool falhar;
  int envios = 0;
  _EnviadorFixo({this.falhar = false});

  @override
  Future<Avatar> enviar(ImagemEscolhida imagem) async {
    envios++;
    if (falhar) {
      throw const FalhaNoEnvioDoAvatar();
    }
    return _avatarNovo;
  }
}

class _CapaFixa implements EnviadorDeCapa {
  final String url;
  _CapaFixa(this.url);

  @override
  Future<String> enviar(ImagemEscolhida imagem, {void Function(double progresso)? aoProgredir}) async =>
      url;
}

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
  group('avatar', () {
    test('publicId sai da URL como o servidor extrai', () {
      expect(
        publicIdDaUrl('https://res.cloudinary.com/leai/image/upload/v1790275088/avatares/k7ut.png'),
        'avatares/k7ut',
      );
      expect(publicIdDaUrl('https://res.cloudinary.com/leai/image/upload/avatares/b.webp'), 'avatares/b');
      expect(publicIdDaUrl('https://res.cloudinary.com/leai/raw/avatares/b'), isNull);
    });

    test('miniatura pede o dobro do lado exibido', () {
      expect(
        miniaturaDoAvatar(_avatarAtual, 96),
        'https://res.cloudinary.com/leai/image/upload/c_fill,g_face,w_192,h_192/v1/avatares/atual.png',
      );
    });

    test('o enviador de avatar reaproveita o da capa e deriva o publicId', () async {
      final avatar = await EnviadorDeAvatarCloudinary(_CapaFixa(_avatarNovo.url)).enviar(
        ImagemEscolhida(bytes: Uint8List(1), nome: 'a.png'),
      );
      expect(avatar, _avatarNovo);
    });
  });

  group('PerfilService', () {
    test('PUT com os quatro campos e a chave da intenção', () async {
      late http.Request pedido;
      final servico = _servico((request) async {
        pedido = request;
        return json(_perfil(privacidade: 'privado'), 200);
      });

      final salvo = await servico.atualizarMeuPerfil(
        const EditarPerfil(
          displayName: 'Marina',
          biografia: null,
          avatar: _avatarNovo,
          privacidade: Privacidade.privado,
        ),
        idempotencyKey: 'chave-1',
      );

      expect(pedido.method, 'PUT');
      expect(pedido.url.path, '/me/perfil');
      expect(pedido.headers['Idempotency-Key'], 'chave-1');
      expect(jsonDecode(pedido.body), <String, Object?>{
        'displayName': 'Marina',
        'biografia': null,
        'avatar': <String, Object?>{'url': _avatarNovo.url, 'publicId': 'avatares/novo'},
        'privacidade': 'privado',
      });
      expect(salvo.privacidade, Privacidade.privado);
      expect(salvo.seguidores, 84);
    });
  });

  group('PerfilPage', () {
    testWidgets('identidade, chip, biografia e contadores com unidade', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(envolver(PerfilPage(servico: _servico((_) async => json(_perfil(), 200)))));
      await tester.pumpAndSettle();

      expect(find.text('Marina Beltrão'), findsOneWidget);
      expect(find.text('@marinableu'), findsOneWidget);
      expect(find.text('Perfil público'), findsOneWidget);
      expect(find.text('Leio de tudo.'), findsOneWidget);
      expect(find.bySemanticsLabel('84 seguidores'), findsOneWidget);
      expect(find.bySemanticsLabel('97 seguindo'), findsOneWidget);
      expect(find.text('Editar perfil'), findsOneWidget);
      expect(find.textContaining('livros lidos'), findsNothing);
    });

    testWidgets('privado troca o chip e explica quem vê', (tester) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(PerfilPage(servico: _servico((_) async => json(_perfil(privacidade: 'privado'), 200)))),
      );
      await tester.pumpAndSettle();

      expect(find.text('Perfil privado'), findsOneWidget);
      expect(find.text('Só quem você aceita vê sua estante e suas resenhas.'), findsOneWidget);
    });

    testWidgets('falha mostra o erro e tenta de novo', (tester) async {
      var chamadas = 0;
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: _servico((request) async {
              if (request.url.path != '/me/perfil') {
                return json(_paginaVazia, 200);
              }
              chamadas++;
              return chamadas == 1 ? erro(500, 'ERRO_INTERNO', 'x') : json(_perfil(), 200);
            }),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Não foi possível carregar seu perfil.'), findsOneWidget);

      await tester.tap(find.text('Tentar de novo'));
      await tester.pumpAndSettle();
      expect(find.text('Marina Beltrão'), findsOneWidget);
    });

    testWidgets('editar relê o perfil na volta', (tester) async {
      var chamadas = 0;
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          PerfilPage(
            servico: _servico((request) async {
              if (request.url.path != '/me/perfil') {
                return json(_paginaVazia, 200);
              }
              chamadas++;
              return json(_perfil(), 200);
            }),
            aoEditar: () async {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Editar perfil'));
      await tester.pumpAndSettle();

      expect(chamadas, 2);
    });
  });

  group('EditarPerfilPage', () {
    late List<http.Request> pedidos;
    late int saidas;

    setUp(() {
      pedidos = <http.Request>[];
      saidas = 0;
    });

    Future<void> montar(
      WidgetTester tester, {
      Map<String, Object?>? perfil,
      http.Response Function(http.Request)? aoSalvar,
      ImagemEscolhida? imagem,
      EnviadorDeAvatar? enviador,
    }) async {
      usarTelaDeCelular(tester);
      await tester.pumpWidget(
        envolver(
          EditarPerfilPage(
            servico: _servico((request) async {
              pedidos.add(request);
              if (request.method == 'PUT') {
                return aoSalvar?.call(request) ?? json(_perfil(), 200);
              }
              return json(perfil ?? _perfil(), 200);
            }),
            seletor: _SeletorFixo(imagem),
            enviador: enviador ?? _EnviadorFixo(),
            aoSair: () => saidas++,
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    Map<String, Object?> corpoDoPut() =>
        jsonDecode(pedidos.lastWhere((p) => p.method == 'PUT').body) as Map<String, Object?>;

    testWidgets('preenche, username fixo, e o X sai direto sem mudança', (tester) async {
      await montar(tester);

      expect(find.text('Editar perfil'), findsOneWidget);
      expect(find.text('@marinableu'), findsOneWidget);
      expect(find.text('O nome de usuário não muda.'), findsOneWidget);
      expect(find.text('14/60'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('Fechar'));
      await tester.pumpAndSettle();
      expect(saidas, 1);
      expect(find.text('Descartar alterações?'), findsNothing);
    });

    testWidgets('salva os quatro campos com a foto atual e sai', (tester) async {
      await montar(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Marina Beltrão'), '  Marina B.  ');
      await tester.enterText(find.widgetWithText(TextField, 'Leio de tudo.'), '   ');
      await tocar(tester, find.text('Privado'));
      await tester.pump();
      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();

      expect(corpoDoPut(), <String, Object?>{
        'displayName': 'Marina B.',
        'biografia': null,
        'avatar': <String, Object?>{'url': _avatarAtual, 'publicId': 'avatares/atual'},
        'privacidade': 'privado',
      });
      expect(pedidos.last.headers['Idempotency-Key'], isNotEmpty);
      expect(saidas, 1);
    });

    testWidgets('nome vazio mostra o erro e trava o salvar', (tester) async {
      await montar(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Marina Beltrão'), '');
      await tester.pump();

      expect(find.text('Informe um nome de exibição.'), findsOneWidget);
      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();
      expect(pedidos.where((p) => p.method == 'PUT'), isEmpty);
    });

    testWidgets('trocar para privado avisa com o número de seguidores', (tester) async {
      await montar(tester);

      await tocar(tester, find.text('Privado'));
      await tester.pump();

      expect(find.textContaining('Seus 84 seguidores atuais continuam seguindo você.'), findsOneWidget);
    });

    testWidgets('foto nova sobe e vai no salvar com o publicId', (tester) async {
      final enviador = _EnviadorFixo();
      await montar(
        tester,
        imagem: ImagemEscolhida(bytes: (await tester.runAsync(() => _png(200, 200)))!, nome: 'foto.png'),
        enviador: enviador,
      );

      await tester.runAsync(() async {
        await tester.tap(find.text('Trocar foto'));
        await Future<void>.delayed(const Duration(milliseconds: 200));
      });
      await tester.pumpAndSettle();
      expect(enviador.envios, 1);

      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();
      expect((corpoDoPut()['avatar'] as Map<String, Object?>)['publicId'], 'avatares/novo');
    });

    testWidgets('falha no envio avisa e mantém a foto anterior', (tester) async {
      await montar(
        tester,
        imagem: ImagemEscolhida(bytes: (await tester.runAsync(() => _png(200, 200)))!, nome: 'foto.png'),
        enviador: _EnviadorFixo(falhar: true),
      );

      await tester.runAsync(() async {
        await tester.tap(find.text('Trocar foto'));
        await Future<void>.delayed(const Duration(milliseconds: 200));
      });
      await tester.pumpAndSettle();

      expect(find.text('Não foi possível enviar a foto. Tente de novo.'), findsOneWidget);
      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();
      expect((corpoDoPut()['avatar'] as Map<String, Object?>)['publicId'], 'avatares/atual');
    });

    testWidgets('remover foto manda avatar nulo', (tester) async {
      await montar(tester);

      await tocar(tester, find.text('Remover foto'));
      await tester.pump();
      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();

      expect(corpoDoPut()['avatar'], isNull);
    });

    testWidgets('imagem recusada no app não sobe e mantém a foto', (tester) async {
      final enviador = _EnviadorFixo();
      await montar(
        tester,
        imagem: ImagemEscolhida(bytes: Uint8List.fromList(<int>[0x47, 0x49, 0x46, 0x38]), nome: 'a.gif'),
        enviador: enviador,
      );

      await tester.runAsync(() async {
        await tester.tap(find.text('Trocar foto'));
        await Future<void>.delayed(const Duration(milliseconds: 50));
      });
      await tester.pump();

      expect(find.text('Não foi possível usar essa imagem. Formato não aceito. Use JPG, PNG ou WEBP.'), findsOneWidget);
      expect(enviador.envios, 0);
      expect(find.text('Remover foto'), findsOneWidget);
    });

    testWidgets('422 do servidor volta a foto anterior e deixa salvar de novo', (tester) async {
      var puts = 0;
      await montar(
        tester,
        imagem: ImagemEscolhida(bytes: (await tester.runAsync(() => _png(200, 200)))!, nome: 'foto.png'),
        aoSalvar: (request) {
          puts++;
          return puts == 1
              ? erro(422, 'REGRA_DE_NEGOCIO', 'Use uma foto enviada pelo Lê Ai.')
              : json(_perfil(), 200);
        },
      );

      await tester.runAsync(() async {
        await tester.tap(find.text('Trocar foto'));
        await Future<void>.delayed(const Duration(milliseconds: 200));
      });
      await tester.pumpAndSettle();
      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();

      expect(find.text('Use uma foto enviada pelo Lê Ai.'), findsOneWidget);
      expect(saidas, 0);
      await tester.tap(find.text('Salvar'));
      await tester.pumpAndSettle();
      expect((corpoDoPut()['avatar'] as Map<String, Object?>)['publicId'], 'avatares/atual');
    });

    testWidgets('X com alteração pede confirmação; continuar fica, descartar sai', (tester) async {
      await montar(tester);
      await tester.enterText(find.widgetWithText(TextField, 'Marina Beltrão'), 'Outro nome');
      await tester.pump();

      await tester.tap(find.bySemanticsLabel('Fechar'));
      await tester.pumpAndSettle();
      expect(find.text('Descartar alterações?'), findsOneWidget);

      await tester.tap(find.text('Continuar editando'));
      await tester.pumpAndSettle();
      expect(saidas, 0);

      await tester.tap(find.bySemanticsLabel('Fechar'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Descartar'));
      await tester.pumpAndSettle();
      expect(saidas, 1);
      expect(pedidos.where((p) => p.method == 'PUT'), isEmpty);
    });
  });
}
