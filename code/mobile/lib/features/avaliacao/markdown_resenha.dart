import 'package:flutter/material.dart';
import 'package:markdown/markdown.dart' as md;

import '../../design/theme.dart';
import '../../design/tokens.dart';

/// Markdown da resenha (RN-13, RNF-SEC-15, F-AVA-2). A resenha continua gravada como texto cru e é
/// renderizada aqui, no cliente, só com o subconjunto do RN-13: negrito, itálico, tachado, lista
/// ordenada, lista não ordenada e citação em bloco.
///
/// - O parser só conhece as sintaxes do subconjunto: link, imagem, título, código, tabela, HTML e
///   entidade não existem para ele e aparecem **como texto literal**. Sem HTML no caminho: a árvore
///   vira `TextSpan`, que nunca interpreta marcação.
/// - `Enter` simples quebra a linha, como nas resenhas gravadas antes do Markdown.
/// - A web usa o `markdown-it` com a mesma configuração; os dois passam pelos casos de
///   `docs/design-system/markdown-resenha-casos.json` (RN-13.4).

/// Trecho de um parágrafo: texto, formatação ou quebra de linha.
sealed class TrechoDaResenha {
  const TrechoDaResenha();

  /// O formato dos casos compartilhados com a web.
  Object paraCaso();
}

final class TextoSimples extends TrechoDaResenha {
  final String texto;
  const TextoSimples(this.texto);

  @override
  Object paraCaso() => <String, Object>{'t': texto};
}

enum Formato { negrito, italico, tachado }

final class TrechoFormatado extends TrechoDaResenha {
  final Formato formato;
  final List<TrechoDaResenha> filhos;
  const TrechoFormatado(this.formato, this.filhos);

  @override
  Object paraCaso() => <String, Object>{
    switch (formato) {
      Formato.negrito => 'b',
      Formato.italico => 'i',
      Formato.tachado => 's',
    }: filhos
        .map((filho) => filho.paraCaso())
        .toList(),
  };
}

final class QuebraDeLinha extends TrechoDaResenha {
  const QuebraDeLinha();

  @override
  Object paraCaso() => const <String, Object>{'br': true};
}

/// Bloco da resenha: parágrafo, lista ou citação.
sealed class BlocoDaResenha {
  const BlocoDaResenha();

  Object paraCaso();
}

final class Paragrafo extends BlocoDaResenha {
  final List<TrechoDaResenha> trechos;
  const Paragrafo(this.trechos);

  @override
  Object paraCaso() => <String, Object>{'p': trechos.map((trecho) => trecho.paraCaso()).toList()};
}

final class Lista extends BlocoDaResenha {
  /// `null` na lista com marcadores; o número do primeiro item na numerada.
  final int? inicio;
  final List<List<BlocoDaResenha>> itens;
  const Lista({required this.inicio, required this.itens});

  bool get numerada => inicio != null;

  @override
  Object paraCaso() {
    final itensDoCaso = itens
        .map((item) => item.map((bloco) => bloco.paraCaso()).toList())
        .toList();
    return numerada
        ? <String, Object>{'ol': itensDoCaso, 'inicio': inicio!}
        : <String, Object>{'ul': itensDoCaso};
  }
}

final class Citacao extends BlocoDaResenha {
  final List<BlocoDaResenha> blocos;
  const Citacao(this.blocos);

  @override
  Object paraCaso() => <String, Object>{'q': blocos.map((bloco) => bloco.paraCaso()).toList()};
}

/// Tachado só com `~~texto~~` (decisão do dono, 07/10/2026): um til sozinho fica literal, como no
/// `markdown-it`.
class _TachadoDuplo extends md.DelimiterSyntax {
  _TachadoDuplo()
    : super(
        '~+',
        requiresDelimiterRun: true,
        allowIntraWord: true,
        startCharacter: 0x7E,
        tags: <md.DelimiterTag>[md.DelimiterTag('del', 2)],
      );
}

md.Document _documento() => md.Document(
  encodeHtml: false,
  withDefaultBlockSyntaxes: false,
  withDefaultInlineSyntaxes: false,
  blockSyntaxes: const <md.BlockSyntax>[
    md.EmptyBlockSyntax(),
    md.BlockquoteSyntax(),
    md.UnorderedListSyntax(),
    md.OrderedListSyntax(),
    md.ParagraphSyntax(),
  ],
  inlineSyntaxes: <md.InlineSyntax>[
    md.EscapeSyntax(),
    md.EmphasisSyntax.asterisk(),
    md.EmphasisSyntax.underscore(),
    _TachadoDuplo(),
    md.LineBreakSyntax(),
  ],
);

const Set<String> _tagsDeTrecho = <String>{'strong', 'em', 'del', 'br'};

bool _ehTrecho(md.Node no) => no is md.Text || (no is md.Element && _tagsDeTrecho.contains(no.tag));

/// Árvore da resenha no formato dos casos compartilhados (RN-13.4).
List<BlocoDaResenha> arvoreDaResenha(String texto) => _blocos(_documento().parse(texto));

List<BlocoDaResenha> _blocos(List<md.Node> nos) {
  final blocos = <BlocoDaResenha>[];
  // Item de lista compacta traz os trechos soltos, sem `p`; o `markdown-it` e os casos têm o
  // parágrafo, então os trechos seguidos viram um.
  final soltos = <md.Node>[];
  void fecharSoltos() {
    if (soltos.isNotEmpty) {
      blocos.add(Paragrafo(_trechos(soltos)));
      soltos.clear();
    }
  }

  for (final no in nos) {
    if (_ehTrecho(no)) {
      soltos.add(no);
      continue;
    }
    fecharSoltos();
    if (no is! md.Element) {
      continue;
    }
    final filhos = no.children ?? const <md.Node>[];
    switch (no.tag) {
      case 'p':
        blocos.add(Paragrafo(_trechos(filhos)));
      case 'blockquote':
        blocos.add(Citacao(_blocos(filhos)));
      case 'ul' || 'ol':
        final itens = filhos.whereType<md.Element>().map(
          (li) => _blocos(li.children ?? const <md.Node>[]),
        );
        blocos.add(
          Lista(
            inicio: no.tag == 'ol' ? int.tryParse(no.attributes['start'] ?? '') ?? 1 : null,
            itens: itens.toList(),
          ),
        );
    }
  }
  fecharSoltos();
  return blocos;
}

List<TrechoDaResenha> _trechos(List<md.Node> nos) {
  final trechos = <TrechoDaResenha>[];
  void acrescentarTexto(String bruto) {
    // Como o `markdown-it`: a linha depois de uma quebra começa sem os espaços do começo.
    final texto = trechos.isNotEmpty && trechos.last is QuebraDeLinha ? bruto.trimLeft() : bruto;
    if (texto.isEmpty) {
      return;
    }
    final ultimo = trechos.isEmpty ? null : trechos.last;
    if (ultimo is TextoSimples) {
      trechos[trechos.length - 1] = TextoSimples(ultimo.texto + texto);
    } else {
      trechos.add(TextoSimples(texto));
    }
  }

  void quebrar() {
    // Como o `markdown-it`: os espaços em volta da quebra somem.
    final ultimo = trechos.isEmpty ? null : trechos.last;
    if (ultimo is TextoSimples) {
      final aparado = ultimo.texto.trimRight();
      if (aparado.isEmpty) {
        trechos.removeLast();
      } else {
        trechos[trechos.length - 1] = TextoSimples(aparado);
      }
    }
    trechos.add(const QuebraDeLinha());
  }

  for (final no in nos) {
    if (no is md.Text) {
      final linhas = no.text.split('\n');
      for (var i = 0; i < linhas.length; i++) {
        if (i > 0) {
          quebrar();
        }
        acrescentarTexto(linhas[i]);
      }
    } else if (no is md.Element) {
      final filhos = no.children ?? const <md.Node>[];
      switch (no.tag) {
        case 'br':
          quebrar();
        case 'strong':
          trechos.add(TrechoFormatado(Formato.negrito, _trechos(filhos)));
        case 'em':
          trechos.add(TrechoFormatado(Formato.italico, _trechos(filhos)));
        case 'del':
          trechos.add(TrechoFormatado(Formato.tachado, _trechos(filhos)));
        default:
          acrescentarTexto(no.textContent);
      }
    }
  }
  return trechos;
}

String _textoDosTrechos(List<TrechoDaResenha> trechos) => trechos
    .map(
      (trecho) => switch (trecho) {
        TextoSimples(:final texto) => texto,
        QuebraDeLinha() => '\n',
        TrechoFormatado(:final filhos) => _textoDosTrechos(filhos),
      },
    )
    .join();

List<String> _linhasDosBlocos(List<BlocoDaResenha> blocos) => blocos
    .expand(
      (bloco) => switch (bloco) {
        Paragrafo(:final trechos) => <String>[_textoDosTrechos(trechos)],
        Citacao(:final blocos) => _linhasDosBlocos(blocos),
        Lista(:final itens) => itens.expand(_linhasDosBlocos),
      },
    )
    .toList();

/// Prévia sem marcação, para o feed e o card do perfil, que cortam o texto em poucas linhas
/// (decisão do dono, 07/10/2026): sem `**`, `>` nem `-`, com cada bloco e item numa linha.
String textoSemMarcacao(String texto) => _linhasDosBlocos(arvoreDaResenha(texto)).join('\n');

final List<RegExp> _foraDoSubconjunto = <RegExp>[
  RegExp(r'!?\[[^\]\n]*\]\([^)\n]*\)'), // link e imagem
  RegExp(r'<\/?[a-zA-Z][^>\n]*>'), // HTML e endereço entre sinais
  RegExp(r'^ {0,3}#{1,6}\s', multiLine: true), // título
  RegExp('`'), // código em linha e bloco de código
  RegExp(r'^\s*\|.*\|\s*$', multiLine: true), // tabela
];

/// A faixa da pré-visualização só aparece quando há marcação que a resenha não interpreta.
bool temMarcacaoForaDoSubconjunto(String texto) =>
    _foraDoSubconjunto.any((padrao) => padrao.hasMatch(texto));

/// Corpo da resenha em Markdown (pagina-do-livro.md §4.2 B): Newsreader 400, negrito em
/// Newsreader 600, itálico, tachado, listas com recuo `space-5` e `space-1` entre itens, citação
/// com borda esquerda de 2px `linha` e texto `grafite`. Marcação fora do subconjunto aparece
/// literal.
class TextoDaResenha extends StatelessWidget {
  final String texto;

  /// Estilo do corpo; o padrão é o `editorialBody` do tema.
  final TextStyle? estilo;

  const TextoDaResenha(this.texto, {super.key, this.estilo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final base = estilo ?? theme.editorialBody;
    return _Blocos(blocos: arvoreDaResenha(texto), estilo: base);
  }
}

class _Blocos extends StatelessWidget {
  final List<BlocoDaResenha> blocos;
  final TextStyle estilo;
  final double espaco;

  const _Blocos({required this.blocos, required this.estilo, this.espaco = DesignTokens.space3});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    mainAxisSize: MainAxisSize.min,
    children: <Widget>[
      for (var i = 0; i < blocos.length; i++) ...<Widget>[
        if (i > 0) SizedBox(height: espaco),
        _Bloco(bloco: blocos[i], estilo: estilo),
      ],
    ],
  );
}

class _Bloco extends StatelessWidget {
  final BlocoDaResenha bloco;
  final TextStyle estilo;

  const _Bloco({required this.bloco, required this.estilo});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return switch (bloco) {
      Paragrafo(:final trechos) => Text.rich(TextSpan(style: estilo, children: _spans(trechos))),
      Citacao(:final blocos) => Container(
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: theme.divider, width: 2)),
        ),
        padding: const EdgeInsets.only(left: DesignTokens.space4),
        child: _Blocos(
          blocos: blocos,
          estilo: estilo.copyWith(color: theme.secondaryText),
        ),
      ),
      final Lista lista => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          for (var i = 0; i < lista.itens.length; i++) ...<Widget>[
            if (i > 0) const SizedBox(height: DesignTokens.space1),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                ConstrainedBox(
                  constraints: const BoxConstraints(minWidth: DesignTokens.space5),
                  child: Padding(
                    padding: const EdgeInsets.only(right: DesignTokens.space1),
                    child: Text(lista.numerada ? '${lista.inicio! + i}.' : '•', style: estilo),
                  ),
                ),
                Expanded(
                  child: _Blocos(
                    blocos: lista.itens[i],
                    estilo: estilo,
                    espaco: DesignTokens.space1,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    };
  }

  List<InlineSpan> _spans(List<TrechoDaResenha> trechos) => trechos
      .map(
        (trecho) => switch (trecho) {
          TextoSimples(:final texto) => TextSpan(text: texto),
          QuebraDeLinha() => const TextSpan(text: '\n'),
          TrechoFormatado(:final formato, :final filhos) => TextSpan(
            style: switch (formato) {
              Formato.negrito => const TextStyle(fontWeight: FontWeight.w600),
              Formato.italico => const TextStyle(fontStyle: FontStyle.italic),
              Formato.tachado => const TextStyle(decoration: TextDecoration.lineThrough),
            },
            children: _spans(filhos),
          ),
        },
      )
      .toList();
}
