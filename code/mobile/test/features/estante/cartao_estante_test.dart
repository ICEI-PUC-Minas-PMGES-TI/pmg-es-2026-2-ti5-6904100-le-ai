import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/estante/cartao_estante.dart';
import 'package:le_ai_mobile/features/estante/estante_de_perfil.dart';
import 'package:le_ai_mobile/features/estante/estante_page.dart';
import 'package:le_ai_mobile/features/estante/estante_service.dart';

import '../livros/apoio.dart';
import 'apoio_estante.dart';

const String _oficialId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const String _pessoalId = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

final Finder _capa = find.byKey(const ValueKey<String>('capa-do-cartao'));
final Finder _titulo = find.byKey(const ValueKey<String>('titulo-do-cartao'));
final Finder _acoes = find.byKey(const ValueKey<String>('acoes-do-cartao'));
final Finder _resto = find.byKey(const ValueKey<String>('resto-do-cartao'));

/// Item da estante com o `tipo` que o `leitura` devolve desde a melhoria do card.
Map<String, Object?> _itemComTipo(String livroId, String tipo, {String titulo = 'Torto Arado'}) {
  final item = itemJson(livroId, titulo: titulo, status: 'LENDO', percentual: 40);
  return <String, Object?>{
    ...item,
    'livro': <String, Object?>{...item['livro']! as Map<String, Object?>, 'tipo': tipo},
  };
}

ItemEstante _item(String tipo) => ItemEstante.fromJson(_itemComTipo(_oficialId, tipo));

Future<void> _montarCartao(
  WidgetTester tester,
  ItemEstante item, {
  VoidCallback? aoAbrir,
  VoidCallback? aoAbrirLivro,
}) async {
  await tester.pumpWidget(
    envolver(
      Align(
        alignment: Alignment.topLeft,
        child: SizedBox(
          width: 160,
          child: CartaoEstante(item: item, aoAbrir: aoAbrir, aoAbrirLivro: aoAbrirLivro),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  group('LivroDaEstante.tipo', () {
    test('tipo pessoal vira pessoal; oficial ou ausente, não', () {
      LivroDaEstante livro(Object? tipo) => LivroDaEstante.fromJson(<String, dynamic>{
        'titulo': 'Torto Arado',
        'autor': null,
        'capaUrl': null,
        'tipo': ?tipo,
      });

      expect(livro('pessoal').pessoal, isTrue);
      expect(livro('oficial').pessoal, isFalse);
      expect(livro(null).pessoal, isFalse);
    });
  });

  group('CartaoEstante: capa e título abrem a página do livro', () {
    testWidgets('capa e título chamam a página do livro, e não as ações', (tester) async {
      var livro = 0;
      var acoes = 0;
      await _montarCartao(
        tester,
        _item('oficial'),
        aoAbrir: () => acoes++,
        aoAbrirLivro: () => livro++,
      );

      await tester.tap(_capa);
      await tester.tap(_titulo);

      expect(livro, 2);
      expect(acoes, 0);
    });

    testWidgets('o botão de mais ações, a barra de progresso e o resto do card abrem as ações', (
      tester,
    ) async {
      var livro = 0;
      var acoes = 0;
      await _montarCartao(
        tester,
        _item('oficial'),
        aoAbrir: () => acoes++,
        aoAbrirLivro: () => livro++,
      );

      await tester.tap(_acoes);
      await tester.tap(find.text('40%'));
      await tester.tap(find.text('Itamar Vieira Junior'));

      expect(acoes, 3);
      expect(livro, 0);
    });

    testWidgets('o botão de ações tem rótulo com o título; o título é link e a capa não repete', (
      tester,
    ) async {
      final semantica = tester.ensureSemantics();
      await _montarCartao(tester, _item('oficial'), aoAbrir: () {}, aoAbrirLivro: () {});

      expect(
        tester.getSemantics(_acoes),
        matchesSemantics(label: 'Ações de Torto Arado', isButton: true, hasTapAction: true),
      );
      expect(tester.getSemantics(find.text('Torto Arado')).flagsCollection.isLink, isTrue);
      expect(find.bySemanticsLabel('Ações de Torto Arado'), findsOneWidget);
      semantica.dispose();
    });

    testWidgets('sem ações (perfis): nenhum botão, e o resto do card não reage', (tester) async {
      var livro = 0;
      await _montarCartao(tester, _item('oficial'), aoAbrirLivro: () => livro++);

      expect(_acoes, findsNothing);
      await tester.tap(_resto);
      expect(livro, 0);

      await tester.tap(_titulo);
      expect(livro, 1);
    });

    testWidgets('sem página do livro, capa e título ficam sem toque', (tester) async {
      var acoes = 0;
      await _montarCartao(tester, _item('pessoal'), aoAbrir: () => acoes++);

      expect(_capa, findsNothing);
      expect(_titulo, findsNothing);
      await tester.tap(find.text('Torto Arado'));
      expect(acoes, 0);
    });
  });

  group('EstantePage: o card leva à página do livro', () {
    testWidgets('título do oficial e capa do pessoal chamam aoAbrirLivro com o tipo', (
      tester,
    ) async {
      usarTelaDeCelular(tester);
      final abertos = <(String, bool)>[];
      final servico = estanteSimulada(
        (request) async => json(
          paginaJson(<Map<String, Object?>>[
            _itemComTipo(_oficialId, 'oficial'),
            _itemComTipo(_pessoalId, 'pessoal', titulo: 'Diário de bordo'),
          ], totaisPorStatus: totais(lendo: 2)),
          200,
        ),
      );
      await tester.pumpWidget(
        envolver(
          EstantePage(
            servico: servico,
            aoBuscarLivros: () {},
            aoAbrirLivro: (livroId, {required pessoal}) => abertos.add((livroId, pessoal)),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(_titulo.first);
      await tester.tap(_capa.last);

      expect(abertos, <(String, bool)>[(_oficialId, false), (_pessoalId, true)]);
    });
  });

  group('EstanteDePerfil: o card leva à página do livro', () {
    Future<List<(String, bool)>> tocarNosTitulos(
      WidgetTester tester, {
      required bool proprio,
    }) async {
      usarTelaDeCelular(tester);
      final abertos = <(String, bool)>[];
      final servico = estanteSimulada(
        (request) async => json(
          paginaJson(<Map<String, Object?>>[
            _itemComTipo(_oficialId, 'oficial'),
            _itemComTipo(_pessoalId, 'pessoal', titulo: 'Diário de bordo'),
          ], totaisPorStatus: totais(lendo: 2)),
          200,
        ),
      );
      await tester.pumpWidget(
        envolver(
          SingleChildScrollView(
            child: EstanteDePerfil(
              servico: servico,
              usuarioId: 'u2',
              primeiroNome: 'Bia',
              proprio: proprio,
              aoAbrirLivro: (livroId, {required pessoal}) => abertos.add((livroId, pessoal)),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(_acoes, findsNothing);
      await tester.tap(find.text('Torto Arado'));
      await tester.tap(find.text('Diário de bordo'));
      return abertos;
    }

    testWidgets('no próprio perfil, oficial e pessoal abrem', (tester) async {
      expect(await tocarNosTitulos(tester, proprio: true), <(String, bool)>[
        (_oficialId, false),
        (_pessoalId, true),
      ]);
    });

    testWidgets('no perfil de outro leitor, o pessoal fica sem link (RN-15)', (tester) async {
      expect(await tocarNosTitulos(tester, proprio: false), <(String, bool)>[(_oficialId, false)]);
    });
  });
}
