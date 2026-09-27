import 'package:flutter/material.dart';

import 'estrelas_de_nota.dart';

/// Seletor de nota com meia estrela (avaliar-livro.md §4, documento-de-design §4.3, tamanho `lg`).
///
/// - Cada estrela é desenhada em 32px dentro de um alvo de 48px. A metade esquerda do alvo
///   escolhe a meia estrela; a direita, a estrela inteira.
/// - O arraste horizontal sobre a linha escolhe continuamente, em passos de 0,5. Arrastar até o
///   começo da linha dá `0`: nota zero é um julgamento válido (RN-06), e é o único jeito de
///   chegar nele pelo toque.
/// - O leitor de tela lê o valor em texto e ajusta de 0,5 em 0,5 (`slider`), sem depender do
///   desenho das estrelas.
class SeletorDeNota extends StatelessWidget {
  static const double alvo = 48;
  static const double glifo = 32;

  final double? valor;
  final ValueChanged<double> aoMudar;
  final bool habilitado;

  const SeletorDeNota({
    super.key,
    required this.valor,
    required this.aoMudar,
    this.habilitado = true,
  });

  double _valorNa(double dx) {
    final largura = alvo * 5;
    if (dx <= 0) {
      return 0;
    }
    final meios = (dx / largura * 10).ceil();
    return (meios.clamp(0, 10)) / 2;
  }

  void _mudar(double novo) {
    if (habilitado && novo != valor) {
      aoMudar(novo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final atual = valor;
    final descricao = atual == null ? 'Sem nota' : '${_formatar(atual)} de 5';
    return Semantics(
      slider: true,
      enabled: habilitado,
      label: 'Nota',
      value: descricao,
      increasedValue: _formatar(((atual ?? -0.5) + 0.5).clamp(0, 5)),
      decreasedValue: atual == null ? null : _formatar((atual - 0.5).clamp(0, 5)),
      onIncrease: habilitado ? () => _mudar(((atual ?? -0.5) + 0.5).clamp(0, 5)) : null,
      onDecrease: habilitado && atual != null ? () => _mudar((atual - 0.5).clamp(0, 5)) : null,
      child: ExcludeSemantics(
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: (detalhes) {
            // Toque: metade esquerda é a meia estrela, direita é a inteira. Nunca dá 0.
            final indice = (detalhes.localPosition.dx / alvo).floor().clamp(0, 4);
            final metadeEsquerda = detalhes.localPosition.dx - indice * alvo < alvo / 2;
            _mudar(indice + (metadeEsquerda ? 0.5 : 1));
          },
          onHorizontalDragUpdate: (detalhes) => _mudar(_valorNa(detalhes.localPosition.dx)),
          child: SizedBox(
            width: alvo * 5,
            height: alvo,
            child: Center(
              child: EstrelasDeNota(valor: atual, tamanho: glifo, espaco: alvo - glifo),
            ),
          ),
        ),
      ),
    );
  }
}

/// `4,5` e `4`, com vírgula decimal (avaliar-livro.md §3). Local para o design não depender de
/// uma feature.
String _formatar(num nota) {
  final valor = nota.toDouble();
  if (valor == valor.roundToDouble()) {
    return valor.toInt().toString();
  }
  return valor.toStringAsFixed(1).replaceAll('.', ',');
}
