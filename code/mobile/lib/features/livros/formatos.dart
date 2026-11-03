/// Formatação pt-BR dos números e datas que as telas de livro mostram. Sem `intl`: são três
/// formatos pequenos, e o app ainda não tem a dependência.
library;

const List<String> _meses = <String>[
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/// `4,5` e `4`, nunca `4.5` nem `4,0` (livro-pessoal.md §3).
String formatarNota(double nota) {
  if (nota == nota.roundToDouble()) {
    return nota.toInt().toString();
  }
  return nota.toStringAsFixed(1).replaceAll('.', ',');
}

/// `setembro`, com [mes] de 1 a 12.
String nomeDoMes(int mes) => _meses[mes - 1];

/// `12 de setembro de 2026`, sem zero à esquerda no dia.
String formatarData(DateTime data) {
  final local = data.toLocal();
  return '${local.day} de ${_meses[local.month - 1]} de ${local.year}';
}

/// `8,2 MB`, com vírgula decimal (cadastro-pessoal.md §8).
String formatarMegabytes(int bytes) {
  final mb = bytes / (1024 * 1024);
  return '${mb.toStringAsFixed(1).replaceAll('.', ',')} MB';
}

/// `288 páginas`: todo número aparece com unidade.
String formatarPaginas(int paginas) => paginas == 1 ? '1 página' : '$paginas páginas';
