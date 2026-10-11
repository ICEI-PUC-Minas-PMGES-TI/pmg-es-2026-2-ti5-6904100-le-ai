import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:phosphor_icons/phosphor_icons.dart';

import 'package:le_ai_mobile/design/tokens.dart';
import 'package:le_ai_mobile/design/widgets/banner_aviso.dart';
import 'package:le_ai_mobile/features/desafios/desafios_page.dart';
import 'package:le_ai_mobile/features/desafios/desafios_service.dart';
import 'package:le_ai_mobile/features/desafios/widgets_de_desafios.dart';

import 'apoio_desafios.dart';

const String _outro = 'eeeeeeee-2222-4222-8222-eeeeeeeeeeee';
const String _pausado = 'ffffffff-3333-4333-8333-ffffffffffff';

/// O botão de ações do card, pelo rótulo do `Semantics` dele.
Finder _acoes(String titulo) => find.byWidgetPredicate(
  (widget) => widget is Semantics && widget.properties.label == 'Ações do desafio $titulo',
);

void main() {
  late List<http.Request> pedidos;
  late DesafiosService servico;
  late int criacoes;
  late List<Desafio> edicoes;

  Future<void> montar(
    WidgetTester tester,
    Future<http.Response> Function(http.Request) responder, {
    bool escuro = false,
    Listenable? alteracoesDeLeitura,
    Duration timeout = const Duration(seconds: 90),
  }) async {
    usarTelaDeCelular(tester);
    pedidos = <http.Request>[];
    criacoes = 0;
    edicoes = <Desafio>[];
    servico = desafiosSimulado((pedido) {
      pedidos.add(pedido);
      return responder(pedido);
    }, timeout: timeout);
    await tester.pumpWidget(
      envolver(
        DesafiosPage(
          servico: servico,
          alteracoesDeLeitura: alteracoesDeLeitura,
          aoCriar: () => criacoes++,
          aoEditar: edicoes.add,
        ),
        escuro: escuro,
      ),
    );
    await assentar(tester);
  }

  List<Map<String, Object?>> tres() => <Map<String, Object?>>[
    desafioJson(),
    desafioJson(id: _outro, unidade: 'minutos', janela: 'semanal', alvo: 150, acumulado: 95),
    desafioJson(id: _pausado, unidade: 'livros', janela: 'mensal', alvo: 4, pausado: true),
  ];

  List<String> gets() => pedidos.where((p) => p.method == 'GET').map((p) => p.url.path).toList();

  testWidgets('mostra cada desafio com a janela, o acumulado e o que falta, sem porcentagem', (
    tester,
  ) async {
    await montar(tester, (_) async => json(paginaDeDesafios(tres()), 200));

    expect(gets(), <String>['/desafios']);
    expect(pedidos.single.url.queryParameters['page'], '1');
    expect(find.text('Desafios'), findsOneWidget);
    expect(find.bySemanticsLabel('Novo desafio'), findsOneWidget);
    expect(find.text('20 páginas por dia', findRichText: true), findsOneWidget);
    expect(find.text('Hoje'), findsOneWidget);
    expect(find.text('12 de 20 páginas', findRichText: true), findsOneWidget);
    expect(find.text('Faltam 8 páginas'), findsOneWidget);
    expect(find.text('150 minutos por semana', findRichText: true), findsOneWidget);
    expect(find.text('Esta semana'), findsOneWidget);
    expect(find.textContaining('%'), findsNothing);
  });

  testWidgets('"Faltam" fica alinhado ao fim da barra, não colado ao acumulado', (tester) async {
    await montar(
      tester,
      (_) async => json(paginaDeDesafios(<Map<String, Object?>>[desafioJson()]), 200),
    );

    // A fonte de teste é larga: numa tela mais larga, a linha cabe inteira, como no aparelho.
    tester.view.physicalSize = const Size(2400, 2532);
    await tester.pump();

    final barra = tester.getRect(find.byType(BarraDoDesafio));
    final acumulado = tester.getRect(find.text('12 de 20 páginas', findRichText: true));
    final falta = tester.getRect(find.text('Faltam 8 páginas'));
    expect(falta.center.dy, moreOrLessEquals(acumulado.center.dy, epsilon: 2));
    expect(falta.right, moreOrLessEquals(barra.right, epsilon: 1));
  });

  testWidgets('o leitor de tela aciona o botão de ações e o de novo desafio', (tester) async {
    final semantica = tester.ensureSemantics();
    await montar(tester, (_) async => json(paginaDeDesafios(tres()), 200));

    final acoes = tester.getSemantics(_acoes('20 páginas por dia'));
    expect(acoes.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    expect(acoes.rect.size, const Size(48, 48));
    final novo = tester.getSemantics(
      find.byWidgetPredicate((w) => w is Semantics && w.properties.label == 'Novo desafio'),
    );
    expect(novo.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);

    tester.semantics.tap(find.semantics.byLabel('Ações do desafio 20 páginas por dia'));
    await tester.pumpAndSettle();
    expect(find.text('Editar desafio'), findsOneWidget);
    semantica.dispose();
  });

  testWidgets('pausados ficam no grupo próprio, sem barra, com a data da pausa', (tester) async {
    await montar(tester, (_) async => json(paginaDeDesafios(tres()), 200));

    expect(find.text('Pausados'), findsOneWidget);
    expect(find.text('Pausado'), findsOneWidget);
    expect(find.textContaining('Pausado desde 15 de setembro.'), findsOneWidget);
    // Dois ativos, duas barras: o pausado não tem.
    expect(find.byType(BarraDoDesafio), findsNWidgets(2));
    final grupo = tester.getTopLeft(find.text('Pausados')).dy;
    expect(tester.getTopLeft(find.text('Esta semana')).dy, lessThan(grupo));
    expect(
      tester.getTopLeft(find.text('4 livros por mês', findRichText: true)).dy,
      greaterThan(grupo),
    );
  });

  testWidgets('sem pausados, o grupo não existe', (tester) async {
    await montar(
      tester,
      (_) async => json(paginaDeDesafios(<Map<String, Object?>>[desafioJson()]), 200),
    );

    expect(find.text('Pausados'), findsNothing);
  });

  testWidgets('cumprido: barra cheia mesmo passando do alvo, check e o total real', (tester) async {
    await montar(
      tester,
      (_) async => json(
        paginaDeDesafios(<Map<String, Object?>>[
          desafioJson(janela: 'mensal', alvo: 600, acumulado: 612),
        ]),
        200,
      ),
    );

    expect(find.text('612 de 600 páginas', findRichText: true), findsOneWidget);
    expect(find.text('Cumprido em setembro'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsBold.check), findsOneWidget);
    expect(find.textContaining('Faltam'), findsNothing);
    final preenchimento = tester.widget<FractionallySizedBox>(
      find.byKey(const ValueKey<String>('preenchimento-do-desafio')),
    );
    expect(preenchimento.widthFactor, 1);
  });

  testWidgets('início de janela: trilha vazia e "Faltam" o alvo inteiro', (tester) async {
    await montar(
      tester,
      (_) async => json(paginaDeDesafios(<Map<String, Object?>>[desafioJson(acumulado: 0)]), 200),
    );

    expect(find.text('0 de 20 páginas', findRichText: true), findsOneWidget);
    expect(find.text('Faltam 20 páginas'), findsOneWidget);
    final preenchimento = tester.widget<FractionallySizedBox>(
      find.byKey(const ValueKey<String>('preenchimento-do-desafio')),
    );
    expect(preenchimento.widthFactor, 0);
  });

  testWidgets('a barra é broto no claro e broto-vivo no escuro', (tester) async {
    Color cor() => tester
        .widget<ColoredBox>(
          find.descendant(
            of: find.byKey(const ValueKey<String>('preenchimento-do-desafio')),
            matching: find.byType(ColoredBox),
          ),
        )
        .color;
    await montar(
      tester,
      (_) async => json(paginaDeDesafios(<Map<String, Object?>>[desafioJson()]), 200),
    );
    expect(cor(), DesignTokens.broto);

    await montar(
      tester,
      (_) async => json(paginaDeDesafios(<Map<String, Object?>>[desafioJson()]), 200),
      escuro: true,
    );
    await tester.pumpAndSettle();
    expect(cor(), DesignTokens.brotoVivo);
  });

  testWidgets('vazio: convite com "Novo desafio" e sem o Plus no header', (tester) async {
    await montar(tester, (_) async => json(paginaDeDesafios(<Map<String, Object?>>[]), 200));

    expect(find.text('Você ainda não tem desafios'), findsOneWidget);
    expect(find.byIcon(PhosphorIconsRegular.plus), findsNothing);
    await tocar(tester, find.text('Novo desafio'));
    expect(criacoes, 1);
  });

  testWidgets('serviço indisponível mostra o banner e "Tentar de novo" recarrega', (tester) async {
    var falhar = true;
    await montar(
      tester,
      (_) async => falhar
          ? erro(503, 'SERVICO_INDISPONIVEL', 'Serviço indisponível.')
          : json(paginaDeDesafios(tres()), 200),
    );

    expect(
      find.text('Não foi possível carregar seus desafios. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    falhar = false;
    await tester.tap(find.text('Tentar de novo'));
    await assentar(tester);

    expect(find.byType(BannerAviso), findsNothing);
    expect(find.text('20 páginas por dia', findRichText: true), findsOneWidget);
  });

  testWidgets('carregando: skeleton e, depois de 3s, o aviso de serviço iniciando', (tester) async {
    await montar(tester, (_) async {
      await Future<void>.delayed(const Duration(seconds: 5));
      return json(paginaDeDesafios(tres()), 200);
    });

    expect(find.byType(SkeletonDeDesafio), findsNWidgets(3));
    expect(find.textContaining('O serviço está iniciando'), findsNothing);
    await tester.pump(const Duration(seconds: 3));
    expect(find.textContaining('O serviço está iniciando'), findsOneWidget);
    await tester.pump(const Duration(seconds: 2));
    await assentar(tester);
    expect(find.byType(SkeletonDeDesafio), findsNothing);
    expect(find.textContaining('O serviço está iniciando'), findsNothing);
  });

  testWidgets('timeout cai no banner de falha', (tester) async {
    await montar(tester, (_) async {
      await Future<void>.delayed(const Duration(seconds: 2));
      return json(paginaDeDesafios(tres()), 200);
    }, timeout: const Duration(milliseconds: 100));
    await tester.pump(const Duration(seconds: 10));

    expect(find.byType(BannerAviso), findsOneWidget);
  });

  testWidgets('o menu do ativo oferece editar, pausar e excluir; editar abre a edição', (
    tester,
  ) async {
    await montar(tester, (_) async => json(paginaDeDesafios(tres()), 200));

    await tocar(tester, _acoes('150 minutos por semana'));
    await tester.pumpAndSettle();
    expect(find.text('Esta semana: 95 de 150 minutos'), findsOneWidget);
    expect(find.text('Editar desafio'), findsOneWidget);
    expect(find.text('Pausar desafio'), findsOneWidget);
    expect(find.text('O que você registrar durante a pausa não conta.'), findsOneWidget);
    expect(find.text('Retomar desafio'), findsNothing);
    expect(find.text('Excluir desafio'), findsOneWidget);

    await tester.tap(find.text('Editar desafio'));
    await tester.pumpAndSettle();
    expect(edicoes.single.id, _outro);
  });

  testWidgets('o menu do pausado oferece retomar e diz desde quando', (tester) async {
    await montar(tester, (_) async => json(paginaDeDesafios(tres()), 200));

    await tocar(tester, _acoes('4 livros por mês'));
    await tester.pumpAndSettle();
    expect(find.text('Pausado desde 15 de setembro'), findsOneWidget);
    expect(find.text('Retomar desafio'), findsOneWidget);
    expect(find.text('Volta a contar a partir de agora.'), findsOneWidget);
    expect(find.text('Pausar desafio'), findsNothing);
  });

  testWidgets('pausar não pede confirmação e recarrega a lista', (tester) async {
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        return json(desafioJson(pausado: true), 200);
      }
      return json(paginaDeDesafios(tres()), 200);
    });

    await tocar(tester, _acoes('20 páginas por dia'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Pausar desafio'));
    await tester.pumpAndSettle();

    final post = pedidos.singleWhere((p) => p.method == 'POST');
    expect(post.url.path, '/desafios/$idDoDesafio/pausar');
    expect(post.headers['Idempotency-Key'], isNotEmpty);
    expect(gets(), hasLength(2));
    expect(find.byType(SnackBar), findsNothing);
  });

  testWidgets('falha ao pausar: toast persistente e "Tentar de novo" com a mesma chave', (
    tester,
  ) async {
    var falhar = true;
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        return falhar
            ? erro(503, 'SERVICO_INDISPONIVEL', 'Fora.')
            : json(desafioJson(pausado: true), 200);
      }
      return json(paginaDeDesafios(tres()), 200);
    });

    await tocar(tester, _acoes('20 páginas por dia'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Pausar desafio'));
    await tester.pumpAndSettle();

    expect(
      find.text('Não foi possível pausar o desafio. Verifique sua conexão e tente de novo.'),
      findsOneWidget,
    );
    await tester.pump(const Duration(seconds: 30));
    expect(find.textContaining('Não foi possível pausar'), findsOneWidget);

    falhar = false;
    await tester.tap(find.text('Tentar de novo'));
    await tester.pumpAndSettle();

    final posts = pedidos.where((p) => p.method == 'POST').toList();
    final chaves = posts.map((p) => p.headers['Idempotency-Key']).toSet();
    expect(chaves, hasLength(1));
    expect(find.textContaining('Não foi possível pausar'), findsNothing);
  });

  testWidgets('409 ao retomar (já retomado em outro lugar) recarrega sem toast', (tester) async {
    await montar(tester, (pedido) async {
      if (pedido.method == 'POST') {
        return erro(409, 'ESTADO_INVALIDO', 'Este desafio não está pausado.');
      }
      return json(paginaDeDesafios(tres()), 200);
    });

    await tocar(tester, _acoes('4 livros por mês'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Retomar desafio'));
    await tester.pumpAndSettle();

    expect(pedidos.last.method, 'GET');
    expect(gets(), hasLength(2));
    expect(find.byType(SnackBar), findsNothing);
  });

  testWidgets('excluir só depois de confirmar, com o título do desafio', (tester) async {
    await montar(tester, (pedido) async {
      if (pedido.method == 'DELETE') {
        return http.Response('', 204);
      }
      return json(paginaDeDesafios(tres()), 200);
    });

    await tocar(tester, _acoes('150 minutos por semana'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Excluir desafio'));
    await tester.pumpAndSettle();

    expect(find.text('Excluir o desafio 150 minutos por semana?'), findsOneWidget);
    expect(find.textContaining('Seus registros de leitura continuam como estão.'), findsOneWidget);
    expect(pedidos.where((p) => p.method == 'DELETE'), isEmpty);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Excluir desafio'));
    await tester.pumpAndSettle();
    expect(pedidos.singleWhere((p) => p.method == 'DELETE').url.path, '/desafios/$_outro');
  });

  testWidgets('cancelar a exclusão não apaga nada', (tester) async {
    await montar(tester, (_) async => json(paginaDeDesafios(tres()), 200));

    await tocar(tester, _acoes('150 minutos por semana'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Excluir desafio'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    expect(pedidos.where((p) => p.method == 'DELETE'), isEmpty);
  });

  testWidgets('rolagem perto do fim pede a página seguinte', (tester) async {
    await montar(tester, (pedido) async {
      final page = int.parse(pedido.url.queryParameters['page']!);
      final itens = <Map<String, Object?>>[
        for (var i = 0; i < 8; i++)
          desafioJson(id: 'desafio-$page-$i', alvo: 10 + i + page * 100, acumulado: 1),
      ];
      return json(paginaDeDesafios(itens, page: page, totalItens: 16, totalPaginas: 2), 200);
    });
    expect(gets(), hasLength(1));

    await tester.drag(find.byType(ListView), const Offset(0, -3000));
    await assentar(tester);

    expect(pedidos.last.url.queryParameters['page'], '2');
    await tester.scrollUntilVisible(
      find.text('217 páginas por dia', findRichText: true),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('217 páginas por dia', findRichText: true), findsOneWidget);
    expect(gets(), hasLength(2));
  });

  testWidgets('progresso registrado recarrega em silêncio depois do consumo assíncrono', (
    tester,
  ) async {
    final avisos = ValueNotifier<int>(0);
    addTearDown(avisos.dispose);
    var acumulado = 12;
    await montar(
      tester,
      (_) async =>
          json(paginaDeDesafios(<Map<String, Object?>>[desafioJson(acumulado: acumulado)]), 200),
      alteracoesDeLeitura: avisos,
    );

    acumulado = 15;
    avisos.value++;
    avisos.value++;
    await tester.pump(const Duration(seconds: 1));
    expect(gets(), hasLength(1));

    await tester.pump(const Duration(seconds: 3));
    await assentar(tester);
    expect(gets(), hasLength(2));
    expect(find.text('15 de 20 páginas', findRichText: true), findsOneWidget);
    expect(find.byType(SkeletonDeDesafio), findsNothing);
  });
}
