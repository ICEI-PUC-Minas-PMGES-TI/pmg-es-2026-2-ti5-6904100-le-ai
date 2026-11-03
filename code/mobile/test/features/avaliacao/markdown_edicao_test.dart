import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:le_ai_mobile/features/avaliacao/markdown_edicao.dart';

/// `|` marca o cursor; `[` e `]`, a seleção. Os mesmos casos de `code/front/src/markdown/edicao.spec.ts`.
TextEditingValue _valor(String modelo) {
  if (modelo.contains('|')) {
    final inicio = modelo.indexOf('|');
    return TextEditingValue(
      text: modelo.replaceFirst('|', ''),
      selection: TextSelection.collapsed(offset: inicio),
    );
  }
  final inicio = modelo.indexOf('[');
  final fim = modelo.indexOf(']') - 1;
  return TextEditingValue(
    text: modelo.replaceFirst('[', '').replaceFirst(']', ''),
    selection: TextSelection(baseOffset: inicio, extentOffset: fim),
  );
}

String _modelo(TextEditingValue valor) {
  final texto = valor.text;
  final inicio = valor.selection.start;
  final fim = valor.selection.end;
  if (inicio == fim) {
    return '${texto.substring(0, inicio)}|${texto.substring(inicio)}';
  }
  return '${texto.substring(0, inicio)}[${texto.substring(inicio, fim)}]${texto.substring(fim)}';
}

void main() {
  group('marcas de trecho', () {
    test('envolve a seleção', () {
      expect(_modelo(alternarMarca(_valor('um [livro] bom'), Marca.negrito)), 'um **[livro]** bom');
      expect(_modelo(alternarMarca(_valor('um [livro] bom'), Marca.tachado)), 'um ~~[livro]~~ bom');
    });

    test('sem seleção, insere o par com o cursor no meio', () {
      expect(_modelo(alternarMarca(_valor('um |'), Marca.italico)), 'um *|*');
    });

    test('com o cursor dentro da formatação, fica ativa e tocar de novo remove o par', () {
      final dentro = _valor('um **li|vro** bom');
      expect(marcaAtiva(dentro, Marca.negrito), isTrue);
      expect(marcaAtiva(dentro, Marca.italico), isFalse);
      expect(_modelo(alternarMarca(dentro, Marca.negrito)), 'um li|vro bom');
    });

    test('itálico e negrito não se confundem', () {
      expect(marcaAtiva(_valor('um *li|vro* bom'), Marca.italico), isTrue);
      expect(marcaAtiva(_valor('um *li|vro* bom'), Marca.negrito), isFalse);
    });

    test('sem foco no campo, vale o fim do texto', () {
      const semFoco = TextEditingValue(text: 'um');
      expect(alternarMarca(semFoco, Marca.negrito).text, 'um****');
    });
  });

  group('prefixos de bloco', () {
    test('lista com marcadores na linha do cursor, e tocar de novo tira', () {
      final com = alternarPrefixo(_valor('um|'), Prefixo.marcadores);
      expect(_modelo(com), '- um|');
      expect(prefixoAtivo(com, Prefixo.marcadores), isTrue);
      expect(_modelo(alternarPrefixo(com, Prefixo.marcadores)), 'um|');
    });

    test('lista numerada em sequência em cada linha selecionada', () {
      expect(
        alternarPrefixo(_valor('[um\ndois\ntrês]'), Prefixo.numerada).text,
        '1. um\n2. dois\n3. três',
      );
    });

    test('trocar o tipo de lista troca o marcador', () {
      expect(alternarPrefixo(_valor('[- um\n- dois]'), Prefixo.numerada).text, '1. um\n2. dois');
    });

    test('citação', () {
      expect(alternarPrefixo(_valor('[frase]'), Prefixo.citacao).text, '> frase');
    });
  });

  group('Enter na lista', () {
    test('continua com o próximo marcador', () {
      expect(_modelo(continuarLista(_valor('- um|'))!), '- um\n- |');
      expect(_modelo(continuarLista(_valor('1. um|'))!), '1. um\n2. |');
    });

    test('num item vazio, sai da lista', () {
      expect(_modelo(continuarLista(_valor('- um\n- |'))!), '- um\n|');
    });

    test('fora de lista, o Enter segue o normal', () {
      expect(continuarLista(_valor('texto|')), isNull);
    });

    test('o formatador troca o Enter do teclado pela continuação da lista', () {
      const formatador = ContinuarListaNoEnter();
      final antes = _valor('- um|');
      final comEnter = _valor('- um\n|');
      expect(_modelo(formatador.formatEditUpdate(antes, comEnter)), '- um\n- |');
      // Fora de lista e em colagem, o texto passa como veio.
      expect(formatador.formatEditUpdate(_valor('texto|'), _valor('texto\n|')).text, 'texto\n');
      expect(formatador.formatEditUpdate(antes, _valor('- um\ncolado|')).text, '- um\ncolado');
    });
  });
}
