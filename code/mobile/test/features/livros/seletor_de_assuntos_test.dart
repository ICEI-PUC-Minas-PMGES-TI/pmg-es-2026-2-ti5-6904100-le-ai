import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:le_ai_mobile/features/livros/livro_oficial.dart';
import 'package:le_ai_mobile/features/livros/seletor_de_assuntos.dart';
import 'package:le_ai_mobile/features/livros/seletor_de_assuntos_controller.dart';

import 'apoio.dart';
import 'apoio_assuntos.dart';

const _historia = AssuntoResumo(id: idHistoria, nome: 'História');
const _memorias = AssuntoResumo(id: idMemorias, nome: 'Memórias');

void main() {
  group('funções de apoio', () {
    test('ordenarAssuntos ignora acento e caixa', () {
      final ordenados = ordenarAssuntos(const <AssuntoResumo>[
        AssuntoResumo(id: '1', nome: 'Romance'),
        AssuntoResumo(id: '2', nome: 'Ética'),
        AssuntoResumo(id: '3', nome: 'crônica'),
        AssuntoResumo(id: '4', nome: 'Fantasia'),
      ]);
      expect(ordenados.map((a) => a.nome), <String>['crônica', 'Ética', 'Fantasia', 'Romance']);
    });

    test('juntarComE usa "e" antes do último', () {
      expect(juntarComE(<String>[]), '');
      expect(juntarComE(<String>['História']), 'História');
      expect(juntarComE(<String>['História', 'Memórias']), 'História e Memórias');
      expect(juntarComE(<String>['A', 'B', 'C']), 'A, B e C');
    });
  });

  group('SeletorDeAssuntosController', () {
    test('carrega uma vez e reaproveita a lista nas aberturas seguintes', () async {
      var pedidos = 0;
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((pedido) async {
          pedidos++;
          return json(listaDeAssuntos(), 200);
        }),
      );
      addTearDown(controller.dispose);

      controller.abrir(const <AssuntoResumo>[]);
      expect(controller.estado, EstadoDaListaDeAssuntos.carregando);
      await controller.carregar();
      expect(controller.estado, EstadoDaListaDeAssuntos.pronto);
      expect(controller.visiveis, hasLength(nomesDosAssuntos.length));

      controller.abrir(const <AssuntoResumo>[_historia]);
      await Future<void>.delayed(Duration.zero);
      expect(pedidos, 1);
      expect(controller.marcado(idHistoria), isTrue);
    });

    test('a busca filtra sem acento nem caixa e não mexe na seleção', () async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      controller.abrir(const <AssuntoResumo>[_memorias]);
      await controller.carregar();

      controller.buscar('HIST');
      expect(controller.visiveis.map((a) => a.nome), <String>['História', 'Romance histórico']);
      controller.buscar('cronica');
      expect(controller.visiveis.map((a) => a.nome), <String>['Crônica']);
      expect(controller.quantidade, 1);
    });

    test('a seleção é provisória: abrir de novo volta à do formulário', () async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      controller.abrir(const <AssuntoResumo>[_memorias]);
      await controller.carregar();

      controller.alternar(_historia);
      expect(controller.selecao.map((a) => a.nome), <String>['História', 'Memórias']);

      controller.abrir(const <AssuntoResumo>[_memorias]);
      expect(controller.selecao.map((a) => a.nome), <String>['Memórias']);
    });

    test('falha deixa a próxima abertura tentar de novo', () async {
      var pedidos = 0;
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async {
          pedidos++;
          return pedidos <= 3
              ? erro(503, 'INDISPONIVEL', 'Serviço indisponível.')
              : json(listaDeAssuntos(), 200);
        }),
      );
      addTearDown(controller.dispose);

      controller.abrir(const <AssuntoResumo>[]);
      await controller.carregar();
      expect(controller.estado, EstadoDaListaDeAssuntos.erro);

      controller.abrir(const <AssuntoResumo>[]);
      await controller.carregar();
      expect(controller.estado, EstadoDaListaDeAssuntos.pronto);
    });
  });

  group('folha do seletor', () {
    Finder naFolha(Finder alvo) =>
        find.descendant(of: find.byType(FolhaDeAssuntos), matching: alvo);

    Finder chip(String nome) =>
        naFolha(find.byWidgetPredicate((w) => w is ChipDeEscolhaDeAssunto && w.nome == nome));

    /// Abre a folha por um botão, como o formulário faz. Com [assentar] falso, não espera a
    /// carga terminar (para ver o estado carregando).
    Future<void> abrirEEsperar(
      WidgetTester tester,
      SeletorDeAssuntosController controller, {
      List<AssuntoResumo> atuais = const <AssuntoResumo>[],
      required void Function(List<AssuntoResumo>?) aoFechar,
      bool assentar = true,
      double? largura,
    }) async {
      usarTelaDeCelular(tester);
      if (largura != null) {
        tester.view.physicalSize = Size(largura * 3, 2532);
      }
      await tester.pumpWidget(
        envolver(
          Builder(
            builder: (context) => Center(
              child: TextButton(
                onPressed: () async {
                  aoFechar(await escolherAssuntos(context, controller: controller, atuais: atuais));
                },
                child: const Text('Abrir'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Abrir'));
      if (assentar) {
        await tester.pumpAndSettle();
      } else {
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));
      }
    }

    testWidgets('mostra a lista, marca com checkbox semântico e o Concluir aplica', (tester) async {
      final semantica = tester.ensureSemantics();
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      List<AssuntoResumo>? escolha;
      var fechou = false;
      await abrirEEsperar(
        tester,
        controller,
        atuais: const <AssuntoResumo>[_memorias],
        aoFechar: (r) {
          escolha = r;
          fechou = true;
        },
      );

      expect(naFolha(find.text('Assuntos')), findsOneWidget);
      expect(naFolha(find.text('1 escolhido')), findsOneWidget);
      expect(naFolha(find.text('Os assuntos vêm de uma lista fixa do Lê Ai.')), findsOneWidget);
      expect(chip('Biografia'), findsOneWidget);

      expect(
        tester.getSemantics(chip('Memórias')),
        isSemantics(label: 'Memórias', hasCheckedState: true, isChecked: true),
      );
      expect(
        tester.getSemantics(chip('História')),
        isSemantics(label: 'História', hasCheckedState: true, isChecked: false),
      );
      // Alvo de toque de 48px (§9).
      expect(tester.getSize(chip('História')).height, greaterThanOrEqualTo(48));

      await tester.tap(chip('História'));
      await tester.pump();
      expect(naFolha(find.text('2 escolhidos')), findsOneWidget);

      await tester.tap(naFolha(find.text('Concluir')));
      await tester.pumpAndSettle();

      expect(fechou, isTrue);
      expect(escolha?.map((a) => a.nome), <String>['História', 'Memórias']);
      semantica.dispose();
    });

    testWidgets('tocar no scrim descarta as mudanças', (tester) async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      List<AssuntoResumo>? escolha = const <AssuntoResumo>[];
      var fechou = false;
      await abrirEEsperar(
        tester,
        controller,
        atuais: const <AssuntoResumo>[_memorias],
        aoFechar: (r) {
          escolha = r;
          fechou = true;
        },
      );

      await tester.tap(chip('História'));
      await tester.pump();
      await tester.tapAt(const Offset(20, 20));
      await tester.pumpAndSettle();

      expect(fechou, isTrue);
      expect(escolha, isNull);
      expect(find.byType(FolhaDeAssuntos), findsNothing);
    });

    testWidgets('voltar descarta as mudanças', (tester) async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      List<AssuntoResumo>? escolha = const <AssuntoResumo>[];
      await abrirEEsperar(tester, controller, aoFechar: (r) => escolha = r);

      await tester.tap(chip('Fantasia'));
      await tester.pump();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();

      expect(escolha, isNull);
      expect(find.byType(FolhaDeAssuntos), findsNothing);
    });

    testWidgets('busca sem acento, contagem de resultados e Limpar busca', (tester) async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      await abrirEEsperar(tester, controller, aoFechar: (_) {});

      await tester.enterText(naFolha(find.byType(TextField)), 'hist');
      await tester.pump();

      expect(chip('História'), findsOneWidget);
      expect(chip('Romance histórico'), findsOneWidget);
      expect(chip('Biografia'), findsNothing);
      expect(naFolha(find.text('2 assuntos')), findsOneWidget);
      expect(naFolha(find.text('Nenhum escolhido')), findsOneWidget);

      await tester.tap(find.byTooltip('Limpar busca'));
      await tester.pump();
      expect(chip('Biografia'), findsOneWidget);
      expect(naFolha(find.text('2 assuntos')), findsNothing);
    });

    testWidgets('com o teclado aberto, busca, resultados e Concluir ficam acima dele', (
      tester,
    ) async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      await abrirEEsperar(tester, controller, aoFechar: (_) {});

      // Teclado de 300 dp numa tela de 390×844 dp: começa em y=544.
      tester.view.viewInsets = const FakeViewPadding(bottom: 900);
      await tester.pumpAndSettle();
      const topoDoTeclado = 844.0 - 300.0;

      void conferirAcimaDoTeclado(List<Finder> alvos) {
        for (final alvo in alvos) {
          final area = tester.getRect(alvo);
          expect(area.top, greaterThanOrEqualTo(0), reason: '$alvo acima da tela');
          expect(area.bottom, lessThanOrEqualTo(topoDoTeclado), reason: '$alvo atrás do teclado');
        }
        expect(tester.takeException(), isNull);
      }

      await tester.enterText(naFolha(find.byType(TextField)), 'hist');
      await tester.pumpAndSettle();
      conferirAcimaDoTeclado(<Finder>[
        naFolha(find.byType(TextField)),
        chip('História'),
        chip('Romance histórico'),
        naFolha(find.text('Concluir')),
      ]);

      // Sem filtro, a lista inteira rola numa área que também termina acima do teclado.
      await tester.tap(find.byTooltip('Limpar busca'));
      await tester.pumpAndSettle();
      conferirAcimaDoTeclado(<Finder>[naFolha(find.byType(TextField)), naFolha(find.text('Concluir'))]);
    });

    for (final (largura, altura, tecladoDp) in <(double, double, double)>[
      (844, 390, 200),
      (844, 390, 160),
      (320, 568, 260),
    ]) {
      testWidgets(
        'em ${largura.toInt()}×${altura.toInt()} com teclado de ${tecladoDp.toInt()} dp a folha '
        'rola inteira, sem estourar, e o Concluir alcança',
        (tester) async {
          final controller = SeletorDeAssuntosController(
            servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
          );
          addTearDown(controller.dispose);
          List<AssuntoResumo>? escolha;
          await abrirEEsperar(tester, controller, aoFechar: (r) => escolha = r);
          tester.view.physicalSize = Size(largura * 3, altura * 3);
          tester.view.viewInsets = FakeViewPadding(bottom: tecladoDp * 3);
          await tester.pumpAndSettle();
          final topoDoTeclado = altura - tecladoDp;

          await tester.enterText(naFolha(find.byType(TextField)), 'hist');
          await tester.pumpAndSettle();
          expect(tester.takeException(), isNull);

          await tester.ensureVisible(chip('História'));
          await tester.pumpAndSettle();
          expect(tester.getRect(chip('História')).bottom, lessThanOrEqualTo(topoDoTeclado));
          await tester.tap(chip('História'));
          await tester.pump();

          final concluir = naFolha(find.text('Concluir'));
          await tester.ensureVisible(concluir);
          await tester.pumpAndSettle();
          final area = tester.getRect(concluir);
          expect(area.top, greaterThanOrEqualTo(0));
          expect(area.bottom, lessThanOrEqualTo(topoDoTeclado));
          await tester.tap(concluir);
          await tester.pumpAndSettle();
          expect(escolha?.map((a) => a.nome), <String>['História']);
          expect(tester.takeException(), isNull);
        },
      );
    }

    testWidgets('busca sem resultado não oferece criar assunto', (tester) async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      await abrirEEsperar(tester, controller, aoFechar: (_) {});

      await tester.enterText(naFolha(find.byType(TextField)), 'realismo mágico');
      await tester.pump();

      expect(naFolha(find.text('Nenhum assunto com "realismo mágico".')), findsOneWidget);
      expect(
        naFolha(
          find.text(
            'A lista é fixa: escolha o assunto mais próximo, como Ficção literária ou Fantasia.',
          ),
        ),
        findsOneWidget,
      );
      expect(find.textContaining('Criar'), findsNothing);
      expect(naFolha(find.text('Concluir')), findsOneWidget);
    });

    testWidgets('Limpar desmarca tudo e some quando nada está marcado', (tester) async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      List<AssuntoResumo>? escolha;
      await abrirEEsperar(
        tester,
        controller,
        atuais: const <AssuntoResumo>[_historia, _memorias],
        aoFechar: (r) => escolha = r,
      );

      await tester.tap(naFolha(find.text('Limpar')));
      await tester.pump();
      expect(naFolha(find.text('Nenhum escolhido')), findsOneWidget);
      expect(naFolha(find.text('Limpar')), findsNothing);

      await tester.tap(naFolha(find.text('Concluir')));
      await tester.pumpAndSettle();
      expect(escolha, isEmpty);
    });

    testWidgets('carregando: skeleton, busca e Concluir desabilitados, cold start aos 3 s', (
      tester,
    ) async {
      final resposta = Completer<http.Response>();
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) => resposta.future),
      );
      addTearDown(controller.dispose);
      await abrirEEsperar(tester, controller, aoFechar: (_) {}, assentar: false);

      expect(naFolha(find.bySemanticsLabel('Carregando assuntos')), findsOneWidget);
      expect(naFolha(find.textContaining('escolhido')), findsNothing);
      expect(tester.widget<TextField>(naFolha(find.byType(TextField))).enabled, isFalse);
      expect(
        tester
            .widget<ElevatedButton>(naFolha(find.widgetWithText(ElevatedButton, 'Concluir')))
            .onPressed,
        isNull,
      );
      expect(find.text('O serviço está iniciando. Isso pode levar alguns segundos.'), findsNothing);

      await tester.pump(const Duration(seconds: 3));
      expect(
        find.text('O serviço está iniciando. Isso pode levar alguns segundos.'),
        findsOneWidget,
      );

      resposta.complete(json(listaDeAssuntos(), 200));
      await tester.pump();
      await tester.pump();
      expect(chip('Biografia'), findsOneWidget);
      expect(find.text('O serviço está iniciando. Isso pode levar alguns segundos.'), findsNothing);
    });

    testWidgets('falha: mensagem, Fechar no lugar de Concluir e Tentar de novo recarrega', (
      tester,
    ) async {
      var pedidos = 0;
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async {
          pedidos++;
          return pedidos <= 3
              ? erro(503, 'INDISPONIVEL', 'Serviço indisponível.')
              : json(listaDeAssuntos(), 200);
        }),
      );
      addTearDown(controller.dispose);
      List<AssuntoResumo>? escolha = const <AssuntoResumo>[];
      await abrirEEsperar(tester, controller, aoFechar: (r) => escolha = r);

      expect(naFolha(find.text('Não foi possível carregar os assuntos.')), findsOneWidget);
      expect(
        naFolha(
          find.text(
            'Você pode salvar o livro agora e escolher os assuntos depois, em Editar livro.',
          ),
        ),
        findsOneWidget,
      );
      expect(naFolha(find.text('Concluir')), findsNothing);
      expect(naFolha(find.text('Fechar')), findsOneWidget);
      expect(tester.widget<TextField>(naFolha(find.byType(TextField))).enabled, isFalse);

      await tester.tap(naFolha(find.text('Tentar de novo')));
      await tester.pumpAndSettle();
      expect(chip('Biografia'), findsOneWidget);
      expect(naFolha(find.text('Concluir')), findsOneWidget);

      await tester.tapAt(const Offset(20, 20));
      await tester.pumpAndSettle();
      expect(escolha, isNull);
    });

    testWidgets('a busca tem um nome só para o leitor de tela', (tester) async {
      final semantica = tester.ensureSemantics();
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
      );
      addTearDown(controller.dispose);
      await abrirEEsperar(tester, controller, aoFechar: (_) {});

      // §9: um rótulo oculto `Buscar assunto`, lido uma vez (não "Buscar assunto\nBuscar assunto").
      expect(
        tester.getSemantics(naFolha(find.byType(EditableText))),
        isSemantics(label: 'Buscar assunto', isTextField: true),
      );
      semantica.dispose();
    });

    for (final escala in <double>[1, 1.3]) {
      testWidgets('rodapé com Limpar e Concluir cabe em 320 dp com fonte ${escala}x', (
        tester,
      ) async {
        tester.platformDispatcher.textScaleFactorTestValue = escala;
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final controller = SeletorDeAssuntosController(
          servico: acervoSimulado((_) async => json(listaDeAssuntos(), 200)),
        );
        addTearDown(controller.dispose);
        await abrirEEsperar(
          tester,
          controller,
          atuais: const <AssuntoResumo>[_historia, _memorias],
          aoFechar: (_) {},
          largura: 320,
        );

        expect(tester.takeException(), isNull);
        expect(naFolha(find.text('Limpar')), findsOneWidget);
        expect(naFolha(find.text('Concluir')), findsOneWidget);
        // Concluir continua à direita de Limpar ou abaixo dele, nunca por cima.
        final limpar = tester.getRect(naFolha(find.text('Limpar')));
        final concluir = tester.getRect(naFolha(find.text('Concluir')));
        expect(limpar.overlaps(concluir), isFalse);
      });
    }

    testWidgets('Fechar na falha descarta', (tester) async {
      final controller = SeletorDeAssuntosController(
        servico: acervoSimulado((_) async => erro(503, 'INDISPONIVEL', 'Serviço indisponível.')),
      );
      addTearDown(controller.dispose);
      List<AssuntoResumo>? escolha = const <AssuntoResumo>[];
      await abrirEEsperar(tester, controller, aoFechar: (r) => escolha = r);

      await tester.tap(naFolha(find.text('Fechar')));
      await tester.pumpAndSettle();
      expect(escolha, isNull);
      expect(find.byType(FolhaDeAssuntos), findsNothing);
    });
  });
}
