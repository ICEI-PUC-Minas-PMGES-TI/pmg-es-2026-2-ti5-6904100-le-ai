import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/app/cabecalho_tela.dart';
import 'package:le_ai_mobile/core/network/api_client.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/notificacoes/contador_de_nao_lidas.dart';
import 'package:le_ai_mobile/features/notificacoes/notificacoes_service.dart';

Widget _wrap(Widget child) {
  return MaterialApp(
    theme: AppTheme.light(),
    home: Scaffold(body: child),
  );
}

/// O sino dentro do shell: total de não lidas e abertura vêm do escopo.
Widget _noShell(Widget child, ContadorDeNaoLidas contador, {VoidCallback? aoAbrir}) {
  return _wrap(EscopoDeNotificacoes(contador: contador, aoAbrir: aoAbrir ?? () {}, child: child));
}

ContadorDeNaoLidas _contador(int total) {
  // Nunca chamado: o total é definido direto, como a tela de notificações faz.
  final cliente = ApiClient(baseUrl: 'https://nao-usado.example.com');
  return ContadorDeNaoLidas(NotificacoesService(cliente, cliente))..definir(total);
}

void main() {
  testWidgets('mostra o titulo da tela', (tester) async {
    await tester.pumpWidget(_wrap(const CabecalhoTela(titulo: 'Minha estante')));

    expect(find.text('Minha estante'), findsOneWidget);
  });

  testWidgets('sem nao lidas, o badge nao existe', (tester) async {
    await tester.pumpWidget(_noShell(const CabecalhoTela(titulo: 'Feed'), _contador(0)));

    expect(find.byType(Positioned), findsNothing);
  });

  testWidgets('com nao lidas, mostra o numero no badge', (tester) async {
    await tester.pumpWidget(_noShell(const CabecalhoTela(titulo: 'Feed'), _contador(3)));

    expect(find.text('3'), findsOneWidget);
    expect(find.bySemanticsLabel('Notificações, 3 não lidas'), findsOneWidget);
  });

  testWidgets('acima de nove nao lidas, mostra 9+', (tester) async {
    await tester.pumpWidget(_noShell(const CabecalhoTela(titulo: 'Feed'), _contador(12)));

    expect(find.text('9+'), findsOneWidget);
    expect(find.text('12'), findsNothing);
  });

  testWidgets('o badge acompanha o contador sem reconstruir a tela', (tester) async {
    final contador = _contador(2);
    await tester.pumpWidget(_noShell(const CabecalhoTela(titulo: 'Feed'), contador));

    contador.definir(0);
    await tester.pump();

    expect(find.text('2'), findsNothing);
    expect(find.byType(Positioned), findsNothing);
  });

  testWidgets('tocar no sino abre as notificacoes', (tester) async {
    var abertas = 0;
    await tester.pumpWidget(
      _noShell(const CabecalhoTela(titulo: 'Feed'), _contador(1), aoAbrir: () => abertas++),
    );

    await tester.tap(find.bySemanticsLabel('Notificações, 1 não lida'));

    expect(abertas, 1);
  });

  group('espaçamento do sino', () {
    final sino = find.byIcon(PhosphorIconsRegular.bell);

    double distanciaDaBorda(WidgetTester tester) =>
        tester.view.physicalSize.width / tester.view.devicePixelRatio -
        tester.getTopRight(sino).dx;

    testWidgets('com duas ações, os três ícones ficam igualmente espaçados e o sino a 20px', (
      tester,
    ) async {
      await tester.pumpWidget(
        _noShell(
          CabecalhoTela(
            titulo: 'Perfil',
            acoes: <Widget>[
              IconButton(
                onPressed: () {},
                icon: const Icon(PhosphorIconsRegular.magnifyingGlass),
              ),
              IconButton(onPressed: () {}, icon: const Icon(PhosphorIconsRegular.gear)),
            ],
          ),
          _contador(0),
        ),
      );

      final lupa = tester.getCenter(find.byIcon(PhosphorIconsRegular.magnifyingGlass));
      final engrenagem = tester.getCenter(find.byIcon(PhosphorIconsRegular.gear));
      final campana = tester.getCenter(sino);
      expect(engrenagem.dx - lupa.dx, 48);
      expect(campana.dx - engrenagem.dx, 48);
      expect(distanciaDaBorda(tester), 20);
    });

    testWidgets('sem ações, o sino continua a 20px da borda', (tester) async {
      await tester.pumpWidget(_noShell(const CabecalhoTela(titulo: 'Feed'), _contador(0)));

      expect(distanciaDaBorda(tester), 20);
    });

    testWidgets('o alvo de toque do sino segue com 48px', (tester) async {
      await tester.pumpWidget(_noShell(const CabecalhoTela(titulo: 'Feed'), _contador(0)));

      expect(tester.getSize(find.bySemanticsLabel('Notificações')), const Size(48, 48));
    });
  });
}
