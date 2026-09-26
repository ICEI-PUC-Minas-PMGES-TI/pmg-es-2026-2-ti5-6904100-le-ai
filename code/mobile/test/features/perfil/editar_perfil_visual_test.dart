import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/design/widgets/banner_aviso.dart';
import 'package:le_ai_mobile/features/livros/capa.dart';
import 'package:le_ai_mobile/features/perfil/avatar.dart';
import 'package:le_ai_mobile/features/perfil/editar_perfil_page.dart';
import 'package:le_ai_mobile/features/perfil/perfil_service.dart';

import '../livros/apoio.dart';

/// Forma da edição de perfil contra o protótipo (F-PERFIL/editar-perfil): contador do nome,
/// biografia sem contador, `Ver seguidores` dentro do banner, skeleton do formulário e os estados
/// de envio e salvamento. A lógica de salvar fica em perfil_test.dart.

const _avatarAtual = 'https://res.cloudinary.com/leai/image/upload/v1/avatares/atual.png';

Map<String, Object?> _perfil({String? avatarUrl = _avatarAtual}) => <String, Object?>{
  'id': 'u1',
  'username': 'marinableu',
  'displayName': 'Marina Beltrão',
  'avatarUrl': avatarUrl,
  'privacidade': 'publico',
  'conteudoRestrito': false,
  'relacao': 'proprio',
  'biografia': 'Leio de tudo.',
  'contadores': <String, Object?>{'seguidores': 84, 'seguidos': 97},
};

class _SeletorFixo implements SeletorDeImagem {
  @override
  Future<ImagemEscolhida?> escolher() async => null;
}

/// Seletor que devolve um PNG válido de 1x1, para o envio começar.
class _SeletorComFoto implements SeletorDeImagem {
  final Uint8List bytes;
  _SeletorComFoto(this.bytes);

  @override
  Future<ImagemEscolhida?> escolher() async => ImagemEscolhida(bytes: bytes, nome: 'foto.png');
}

class _EnviadorPendente implements EnviadorDeAvatar {
  final Completer<Avatar> envio = Completer<Avatar>();

  @override
  Future<Avatar> enviar(ImagemEscolhida imagem) => envio.future;
}

void main() {
  Future<void> montar(
    WidgetTester tester, {
    Future<http.Response> Function(http.Request)? handler,
    SeletorDeImagem? seletor,
    EnviadorDeAvatar? enviador,
    VoidCallback? aoVerSeguidores,
    bool assentar = true,
  }) async {
    usarTelaDeCelular(tester);
    await tester.pumpWidget(
      envolver(
        EditarPerfilPage(
          servico: PerfilService(
            ApiClient(
              baseUrl: 'https://identidade.example.com',
              client: MockClient(handler ?? (_) async => json(_perfil(), 200)),
              esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
            ),
          ),
          seletor: seletor ?? _SeletorFixo(),
          enviador: enviador ?? _EnviadorPendente(),
          aoSair: () {},
          aoVerSeguidores: aoVerSeguidores,
        ),
      ),
    );
    if (assentar) {
      await tester.pumpAndSettle();
    }
  }

  testWidgets('carregando mostra o skeleton do formulário, não o da identidade', (tester) async {
    final resposta = Completer<http.Response>();
    await montar(tester, handler: (_) => resposta.future, assentar: false);
    await tester.pump();

    expect(find.bySemanticsLabel('Carregando perfil'), findsOneWidget);
    expect(find.byType(Divider), findsOneWidget);
    final blocos = tester
        .widgetList<Container>(find.byType(Container))
        .where((c) => c.constraints?.maxWidth == double.infinity && c.constraints?.minHeight != null)
        .map((c) => c.constraints!.minHeight)
        .toList();
    expect(blocos, containsAllInOrder(<double>[48, 48, 112, 72, 72]));

    resposta.complete(json(_perfil(), 200));
    await tester.pumpAndSettle();
  });

  testWidgets('contador do nome à direita em mono, e a biografia sem contador', (tester) async {
    await montar(tester);

    final contador = find.byKey(const Key('contador-do-nome'));
    expect(tester.widget<Text>(contador).data, '14/60');
    expect(tester.widget<Text>(contador).style?.fontFamily, contains('JetBrains'));
    final campo = tester.getRect(find.widgetWithText(TextField, 'Marina Beltrão'));
    expect(tester.getRect(contador).right, closeTo(campo.right, 0.5));
    expect(find.textContaining('/1000'), findsNothing);
  });

  testWidgets('nome vazio: a mensagem vem antes do 0/60, que fica em rubi', (tester) async {
    await montar(tester);

    await tester.enterText(find.widgetWithText(TextField, 'Marina Beltrão'), '');
    await tester.pump();

    final contador = find.byKey(const Key('contador-do-nome'));
    final mensagem = find.text('Informe um nome de exibição.');
    expect(tester.widget<Text>(contador).data, '0/60');
    expect(tester.getTopLeft(mensagem).dy, lessThan(tester.getTopLeft(contador).dy));
    final contexto = tester.element(contador);
    expect(tester.widget<Text>(contador).style?.color, Theme.of(contexto).colorScheme.error);
  });

  testWidgets('biografia acima de 1000 caracteres mostra o erro no campo', (tester) async {
    await montar(tester);

    await tester.enterText(find.widgetWithText(TextField, 'Leio de tudo.'), 'a' * 1001);
    await tester.pump();

    expect(find.text('Use no máximo 1000 caracteres.'), findsOneWidget);
  });

  testWidgets('Ver seguidores fica dentro do banner âmbar', (tester) async {
    var abriu = false;
    await montar(tester, aoVerSeguidores: () => abriu = true);

    await tocar(tester, find.text('Privado'));
    await tester.pump();

    final banner = find.byType(BannerAviso);
    expect(find.descendant(of: banner, matching: find.text('Ver seguidores')), findsOneWidget);
    await tocar(tester, find.text('Ver seguidores'));
    expect(abriu, isTrue);
  });

  testWidgets('card de privacidade: ícone e título na mesma linha, descrição sob o ícone', (tester) async {
    await montar(tester);

    final icone = tester.getTopLeft(find.byIcon(PhosphorIconsRegular.globe));
    final titulo = tester.getCenter(find.text('Público'));
    final descricao = tester.getTopLeft(find.text('Qualquer leitor vê sua estante, suas notas e suas resenhas.'));
    expect((tester.getCenter(find.byIcon(PhosphorIconsRegular.globe)).dy - titulo.dy).abs(), lessThan(2));
    expect(descricao.dx, closeTo(icone.dx, 0.5));
  });

  testWidgets('enviando a foto, Remover foto continua no lugar e esmaecido', (tester) async {
    final enviador = _EnviadorPendente();
    final bytes = (await tester.runAsync(_png))!;
    await montar(tester, seletor: _SeletorComFoto(bytes), enviador: enviador);

    await tester.runAsync(() async {
      await tester.tap(find.text('Trocar foto'));
      await Future<void>.delayed(const Duration(milliseconds: 200));
    });
    await tester.pump();

    expect(find.text('Enviando'), findsOneWidget);
    final remover = find.widgetWithText(TextButton, 'Remover foto');
    expect(remover, findsOneWidget);
    expect(tester.widget<TextButton>(remover).onPressed, isNull);

    enviador.envio.complete(const Avatar(url: _avatarAtual, publicId: 'avatares/atual'));
    await tester.pumpAndSettle();
  });

  testWidgets('salvando: Salvando em body-strong grafite e campos a 50%', (tester) async {
    final put = Completer<http.Response>();
    await montar(
      tester,
      handler: (request) => request.method == 'PUT' ? put.future : Future.value(json(_perfil(), 200)),
    );

    await tester.enterText(find.widgetWithText(TextField, 'Marina Beltrão'), 'Marina B.');
    await tester.pump();
    await tester.tap(find.text('Salvar'));
    await tester.pump(const Duration(milliseconds: 300));

    final salvando = tester.widget<Text>(find.text('Salvando'));
    final tema = Theme.of(tester.element(find.text('Salvando')));
    expect(salvando.style?.fontWeight, tema.textTheme.labelLarge?.fontWeight);
    expect(salvando.style?.color, tema.secondaryText);
    final opacidade = tester.widget<AnimatedOpacity>(
      find.ancestor(of: find.text('Nome de exibição'), matching: find.byType(AnimatedOpacity)),
    );
    expect(opacidade.opacity, 0.5);

    put.complete(json(_perfil(), 200));
    await tester.pumpAndSettle();
  });
}

Future<Uint8List> _png() async {
  final gravador = ui.PictureRecorder();
  Canvas(gravador).drawRect(const Rect.fromLTWH(0, 0, 200, 200), Paint()..color = const Color(0xFF3E5C42));
  final imagem = await gravador.endRecording().toImage(200, 200);
  final dados = await imagem.toByteData(format: ui.ImageByteFormat.png);
  return dados!.buffer.asUint8List();
}
