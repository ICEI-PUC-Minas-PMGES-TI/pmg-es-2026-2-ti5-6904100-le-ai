import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:le_ai_mobile/design/theme.dart';
import 'package:le_ai_mobile/features/avaliacao/markdown_resenha.dart';

/// Casos compartilhados com a web (RN-13.4): os dois clientes produzem a mesma árvore.
final Map<String, dynamic> _casos =
    jsonDecode(File('../../docs/design-system/markdown-resenha-casos.json').readAsStringSync())
        as Map<String, dynamic>;

Widget _app(Widget filho) => MaterialApp(
  theme: AppTheme.light(),
  home: Scaffold(body: filho),
);

/// Os estilos de todos os `TextSpan` dos `Text.rich` na tela.
List<TextStyle> _estilos(WidgetTester tester) {
  final estilos = <TextStyle>[];
  // `visitChildren` só passa pelos spans com texto; o estilo da formatação fica no span pai.
  void visitar(InlineSpan span) {
    if (span.style != null) {
      estilos.add(span.style!);
    }
    if (span is TextSpan) {
      span.children?.forEach(visitar);
    }
  }

  tester.widgetList<RichText>(find.byType(RichText)).forEach((rico) => visitar(rico.text));
  return estilos;
}

void main() {
  group('árvore da resenha (casos compartilhados com a web)', () {
    for (final caso in (_casos['casos'] as List<dynamic>).cast<Map<String, dynamic>>()) {
      test(caso['nome'] as String, () {
        final arvore = arvoreDaResenha(
          caso['entrada'] as String,
        ).map((bloco) => bloco.paraCaso()).toList();
        expect(jsonDecode(jsonEncode(arvore)), caso['arvore']);
      });
    }
  });

  group('texto sem marcação (prévia do feed e do perfil)', () {
    test('tira a marcação e põe cada bloco numa linha', () {
      expect(
        textoSemMarcacao('**Forte** e *leve*\n\n- um\n- dois\n\n> citado'),
        'Forte e leve\num\ndois\ncitado',
      );
    });

    test('o que não é do subconjunto continua literal', () {
      expect(textoSemMarcacao('[link](https://x.com)'), '[link](https://x.com)');
    });
  });

  group('marcação fora do subconjunto (faixa da pré-visualização)', () {
    for (final texto in <String>[
      '[leia aqui](https://exemplo.com)',
      '![capa](https://exemplo.com/a.png)',
      '# Título',
      'um `código`',
      '| a | b |\n|---|---|',
      '<b>html</b>',
    ]) {
      test('$texto liga a faixa', () => expect(temMarcacaoForaDoSubconjunto(texto), isTrue));
    }

    test('o subconjunto não liga a faixa', () {
      expect(
        temMarcacaoForaDoSubconjunto('**forte** *leve* ~~x~~\n- item\n1. um\n> citação'),
        isFalse,
      );
    });
  });

  group('TextoDaResenha', () {
    testWidgets('negrito em 600, itálico e tachado', (tester) async {
      await tester.pumpWidget(_app(const TextoDaResenha('**forte** *leve* ~~riscado~~')));

      expect(find.text('forte leve riscado', findRichText: true), findsOneWidget);
      final estilos = _estilos(tester);
      expect(estilos.any((estilo) => estilo.fontWeight == FontWeight.w600), isTrue);
      expect(estilos.any((estilo) => estilo.fontStyle == FontStyle.italic), isTrue);
      expect(estilos.any((estilo) => estilo.decoration == TextDecoration.lineThrough), isTrue);
    });

    testWidgets('listas com marcador e número inicial, e citação', (tester) async {
      await tester.pumpWidget(_app(const TextoDaResenha('- um\n- dois\n\n3. três\n\n> citado')));

      expect(find.text('•'), findsNWidgets(2));
      expect(find.text('3.'), findsOneWidget);
      expect(find.text('citado', findRichText: true), findsOneWidget);
    });

    testWidgets('link, título e HTML aparecem literais', (tester) async {
      const texto = '[leia](https://exemplo.com) <b>x</b>';
      await tester.pumpWidget(_app(const TextoDaResenha('$texto\n\n# Título')));

      expect(find.text(texto, findRichText: true), findsOneWidget);
      expect(find.text('# Título', findRichText: true), findsOneWidget);
    });

    testWidgets('resenha antiga com quebra de linha continua com a quebra', (tester) async {
      await tester.pumpWidget(_app(const TextoDaResenha('Primeira linha\nsegunda linha')));

      expect(find.text('Primeira linha\nsegunda linha', findRichText: true), findsOneWidget);
    });
  });
}
