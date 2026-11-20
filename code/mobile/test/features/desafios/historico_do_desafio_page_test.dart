import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/design/widgets/banner_aviso.dart';
import 'package:le_ai_mobile/features/desafios/desafios_service.dart';
import 'package:le_ai_mobile/features/desafios/historico_do_desafio_page.dart';
import 'package:le_ai_mobile/features/desafios/widgets_de_desafios.dart';

import 'apoio_desafios.dart';

/// O desafio do mock do protótipo: `150 minutos por semana`, criado em 05/08/2026.
Map<String, Object?> _semanal({bool pausado = false}) => <String, Object?>{
  ...desafioJson(janela: 'semanal', unidade: 'minutos', alvo: 150, acumulado: 95, pausado: pausado),
  'criadoEm': '2026-08-05T15:00:00.000Z',
};

void main() {
  late List<http.Request> pedidos;
  late int voltas;

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) responder, {
    Map<String, Object?>? desafio,
    bool escuro = false,
    Duration timeout = const Duration(seconds: 90),
  }) async {
    usarTelaDeCelular(tester);
    pedidos = <http.Request>[];
    voltas = 0;
    final servico = desafiosSimulado((pedido) {
      pedidos.add(pedido);
      return responder(pedido);
    }, timeout: timeout);
    await tester.pumpWidget(
      envolver(
        HistoricoDoDesafioPage(
          servico: servico,
          desafio: Desafio.fromJson(desafio ?? _semanal()),
          aoVoltar: () => voltas++,
        ),
        escuro: escuro,
      ),
    );
    await assentar(tester);
  }

  Future<http.Response> prototipo(http.Request _) async =>
      json(paginaDeJanelas(historicoDoPrototipo()), 200);

  Finder texto(String valor) => find.text(valor, findRichText: true);

  testWidgets('mostra as janelas encerradas agrupadas, com a meta de cada uma e sem porcentagem', (
    tester,
  ) async {
    await montar(tester, prototipo);

    expect(pedidos.single.url.path, '/desafios/$idDoDesafio/janelas');
    expect(pedidos.single.url.queryParameters['page'], '1');
    expect(texto('150 minutos por semana'), findsOneWidget);
    expect(find.text('Histórico'), findsOneWidget);
    expect(texto('Setembro de 2026'), findsOneWidget);
    expect(texto('14 a 20 de setembro'), findsOneWidget);
    expect(texto('170 de 150 minutos'), findsOneWidget);
    expect(texto('31 de agosto a 6 de setembro'), findsOneWidget);
    expect(texto('Meta alterada: de 120 para 150 minutos por semana'), findsOneWidget);
    // A semana de agosto usa a meta dela, nunca a atual.
    expect(texto('130 de 120 minutos'), findsOneWidget);
    expect(find.textContaining('%'), findsNothing);
    // Sem ações no header: só voltar e o sino.
    expect(find.byIcon(PhosphorIconsRegular.plus), findsNothing);
    expect(find.byIcon(PhosphorIconsRegular.dotsThree), findsNothing);
  });

  testWidgets('cumprido e não cumprido têm forma e palavra diferentes', (tester) async {
    await montar(tester, prototipo);

    expect(find.byIcon(PhosphorIconsFill.checkCircle), findsWidgets);
    expect(find.byIcon(PhosphorIconsRegular.circle), findsWidgets);
    expect(find.text('Cumprido'), findsWidgets);
    expect(find.text('Não cumprido'), findsWidgets);
  });

  testWidgets('a semana pausada se distingue da semana vazia só pela linha de pausa', (
    tester,
  ) async {
    await montar(tester, prototipo);
    await tester.scrollUntilVisible(texto('10 a 16 de agosto'), 200);

    expect(texto('0 de 120 minutos'), findsNWidgets(2));
    expect(find.text('Desafio pausado nesta semana'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.pauseCircle), findsOneWidget);
    final pausa = tester.getTopLeft(find.text('Desafio pausado nesta semana')).dy;
    expect(pausa, lessThan(tester.getTopLeft(texto('10 a 16 de agosto')).dy));
    expect(pausa, greaterThan(tester.getTopLeft(texto('17 a 23 de agosto')).dy));
  });

  testWidgets('lista que não enche a tela já pede a seguinte; o rodapé só vem no fim', (
    tester,
  ) async {
    await montar(tester, (pedido) async {
      if (pedido.url.queryParameters['page'] == '2') {
        await Future<void>.delayed(const Duration(seconds: 5));
        return json(
          paginaDeJanelas(
            historicoDoPrototipo().sublist(3),
            page: 2,
            totalItens: 7,
            totalPaginas: 2,
          ),
          200,
        );
      }
      return json(
        paginaDeJanelas(historicoDoPrototipo().sublist(0, 3), totalItens: 7, totalPaginas: 2),
        200,
      );
    });

    expect(pedidos.map((p) => p.url.queryParameters['page']), <String>['1', '2']);
    expect(find.textContaining('Desafio criado em'), findsNothing);

    await tester.pump(const Duration(seconds: 5));
    await assentar(tester);
    await tester.scrollUntilVisible(find.textContaining('Desafio criado em'), 300);

    expect(
      find.text(
        'Desafio criado em 5 de agosto de 2026. A primeira semana conta o que você registrou '
        'desde o início dela.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('o cabeçalho do grupo fica preso ao topo enquanto as linhas passam', (tester) async {
    await montar(tester, prototipo);
    final topoDaLista = tester.getBottomLeft(find.text('Histórico')).dy;

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -500));
    await tester.pumpAndSettle();

    final agosto = tester.getTopLeft(texto('Agosto de 2026')).dy;
    expect(texto('Setembro de 2026'), findsNothing);
    expect(agosto, lessThan(topoDaLista + 40));
    expect(agosto, greaterThan(topoDaLista));
  });

  testWidgets('carrega a página seguinte ao rolar, sem recarregar o topo', (tester) async {
    await montar(tester, (pedido) async {
      final pagina = int.parse(pedido.url.queryParameters['page']!);
      final itens = pagina == 1
          ? historicoDoPrototipo().sublist(0, 4)
          : historicoDoPrototipo().sublist(4);
      return json(paginaDeJanelas(itens, page: pagina, totalItens: 7, totalPaginas: 2), 200);
    });

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
    await assentar(tester);
    await tester.pumpAndSettle();

    expect(pedidos.map((p) => p.url.queryParameters['page']), <String>['1', '2']);
    await tester.scrollUntilVisible(texto('3 a 9 de agosto'), 200);
    expect(find.textContaining('Desafio criado em'), findsOneWidget);
  });

  testWidgets('sem rede ao carregar mais, a linha do fim avisa e tenta de novo', (tester) async {
    var falhar = true;
    await montar(tester, (pedido) async {
      final pagina = int.parse(pedido.url.queryParameters['page']!);
      if (pagina == 2 && falhar) {
        throw http.ClientException('sem rede');
      }
      final itens = pagina == 1
          ? historicoDoPrototipo().sublist(0, 4)
          : historicoDoPrototipo().sublist(4);
      return json(paginaDeJanelas(itens, page: pagina, totalItens: 7, totalPaginas: 2), 200);
    });

    await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
    await assentar(tester);
    await tester.pumpAndSettle();

    expect(find.text('Sem conexão para carregar janelas mais antigas.'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.wifiSlash), findsOneWidget);
    // As janelas já carregadas continuam lá.
    expect(texto('24 a 30 de agosto'), findsOneWidget);
    expect(find.byType(BannerAviso), findsNothing);

    falhar = false;
    await tester.tap(find.text('Tentar de novo'));
    await assentar(tester);
    await tester.pumpAndSettle();

    expect(find.text('Sem conexão para carregar janelas mais antigas.'), findsNothing);
    await tester.scrollUntilVisible(texto('3 a 9 de agosto'), 200);
  });

  testWidgets('sem janela encerrada, o vazio diz quando a corrente fecha, sem botão', (
    tester,
  ) async {
    await montar(
      tester,
      (_) async => json(paginaDeJanelas(<Map<String, Object?>>[]), 200),
      desafio: desafioJson(janela: 'anual', unidade: 'livros', alvo: 24, acumulado: 17),
    );

    expect(find.text('Nenhum ano encerrado ainda'), findsOneWidget);
    expect(
      find.text(
        'Cada ano entra aqui quando termina. 2026 aparece a partir de 1º de janeiro de 2027.',
      ),
      findsOneWidget,
    );
    expect(find.byType(TextButton), findsNothing);
    expect(find.byType(ElevatedButton), findsNothing);
  });

  testWidgets('desafio pausado diz desde quando no header', (tester) async {
    await montar(tester, prototipo, desafio: _semanal(pausado: true));

    expect(find.text('Histórico · Pausado desde 15 de setembro'), findsOneWidget);
  });

  testWidgets('servidor fora: banner de erro, e "Tentar de novo" recarrega', (tester) async {
    var falhar = true;
    await montar(tester, (_) async {
      if (falhar) {
        return erro(500, 'ERRO_INTERNO', 'Erro.');
      }
      return prototipo(http.Request('GET', Uri()));
    });

    expect(
      find.text('Não foi possível carregar o histórico deste desafio. Tente de novo em instantes.'),
      findsOneWidget,
    );
    expect(find.byIcon(PhosphorIconsRegular.warning), findsOneWidget);

    falhar = false;
    await tester.tap(find.text('Tentar de novo'));
    await assentar(tester);

    expect(texto('14 a 20 de setembro'), findsOneWidget);
  });

  testWidgets('timeout depois das retentativas é erro do serviço, com "Tentar de novo"', (
    tester,
  ) async {
    await montar(tester, (_) async {
      await Future<void>.delayed(const Duration(seconds: 5));
      return prototipo(http.Request('GET', Uri()));
    }, timeout: const Duration(seconds: 1));

    for (var i = 0; i < 4; i++) {
      await tester.pump(const Duration(seconds: 1));
      await assentar(tester);
    }
    await tester.pump(const Duration(seconds: 5));

    expect(
      find.text('Não foi possível carregar o histórico deste desafio. Tente de novo em instantes.'),
      findsOneWidget,
    );
    expect(find.text('Tentar de novo'), findsOneWidget);
  });

  testWidgets('sem rede ao abrir: aviso de sem conexão, não erro', (tester) async {
    await montar(tester, (_) async => throw http.ClientException('sem rede'));

    expect(
      find.text('Você está sem conexão. O histórico aparece quando a conexão voltar.'),
      findsOneWidget,
    );
    expect(find.byIcon(PhosphorIconsRegular.wifiSlash), findsOneWidget);
    expect(find.text('Tentar de novo'), findsOneWidget);
  });

  testWidgets('carregando: esqueleto, e o aviso de serviço iniciando depois de 3 s', (
    tester,
  ) async {
    await montar(tester, (_) async {
      await Future<void>.delayed(const Duration(seconds: 10));
      return prototipo(http.Request('GET', Uri()));
    });

    expect(texto('150 minutos por semana'), findsOneWidget);
    expect(find.text('O serviço está iniciando. Isso pode levar alguns segundos.'), findsNothing);
    await tester.pump(const Duration(seconds: 3));
    expect(find.text('O serviço está iniciando. Isso pode levar alguns segundos.'), findsOneWidget);

    await tester.pump(const Duration(seconds: 8));
    await assentar(tester);
    expect(find.text('O serviço está iniciando. Isso pode levar alguns segundos.'), findsNothing);
    expect(texto('14 a 20 de setembro'), findsOneWidget);
  });

  testWidgets('o leitor de tela lê cada janela como uma frase, sem botão', (tester) async {
    final semantica = tester.ensureSemantics();
    await montar(tester, prototipo);

    final linha = tester.getSemantics(
      find.bySemanticsLabel('14 a 20 de setembro. 170 de 150 minutos. Cumprido.'),
    );
    expect(linha.flagsCollection.isButton, isFalse);
    expect(linha.getSemanticsData().hasAction(SemanticsAction.tap), isFalse);
    expect(find.bySemanticsLabel('Setembro de 2026'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('com fonte grande, o resultado desce para baixo do nome, alinhado à esquerda', (
    tester,
  ) async {
    usarTelaDeCelular(tester);
    tester.platformDispatcher.textScaleFactorTestValue = 2;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await montar(tester, prototipo);

    final nome = tester.getRect(texto('14 a 20 de setembro'));
    final resultado = tester.getRect(find.text('Cumprido').first);
    expect(resultado.top, greaterThanOrEqualTo(nome.bottom));
    expect(tester.takeException(), isNull);
  });

  testWidgets('voltar chama quem abriu', (tester) async {
    await montar(tester, prototipo);

    await tester.tap(find.bySemanticsLabel('Voltar'));

    expect(voltas, 1);
  });

  testWidgets('no escuro, a barra continua sendo a do desafio', (tester) async {
    await montar(tester, prototipo, escuro: true);

    expect(find.byType(BarraDeProgressoDeDesafio), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
