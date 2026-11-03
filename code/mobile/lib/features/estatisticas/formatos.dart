/// Números, datas e tempo das estatísticas (F-STA) em pt-BR, sem `intl`: milhar com ponto,
/// decimal com vírgula (`3.818`, `20,4`). Espelha `code/front/src/estatisticas/formatos.ts`.
library;

import '../livros/formatos.dart';

const List<String> mesesAbreviados = <String>[
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez', //
];

/// `3.818`, `13.538`, `999`.
String formatarMilhar(int valor) {
  final digitos = valor.abs().toString();
  final grupos = <String>[];
  for (var fim = digitos.length; fim > 0; fim -= 3) {
    grupos.insert(0, digitos.substring(fim - 3 < 0 ? 0 : fim - 3, fim));
  }
  return '${valor < 0 ? '-' : ''}${grupos.join('.')}';
}

/// Média com até uma casa: `20,4`, `20`.
String formatarDecimal(double valor) {
  final arredondado = (valor * 10).round() / 10;
  if (arredondado == arredondado.roundToDouble()) {
    return formatarMilhar(arredondado.toInt());
  }
  final inteiro = arredondado.truncate();
  final casa = ((arredondado - inteiro).abs() * 10).round();
  return '${formatarMilhar(inteiro)},$casa';
}

/// A nota média sempre com uma casa, como a escala de estrelas: `4,0`, `4,2`.
String formatarNotaMedia(double valor) => valor.toStringAsFixed(1).replaceAll('.', ',');

/// Parte do tempo para desenhar número e unidade em estilos diferentes.
typedef ParteDoTempo = ({String numero, String unidade});

/// `71 h 20 min`, `88 h 05 min` (com horas, os minutos têm dois dígitos) e `45 min`.
List<ParteDoTempo> partesDoTempo(int minutos) {
  final horas = minutos ~/ 60;
  final resto = minutos % 60;
  if (horas == 0) {
    return <ParteDoTempo>[(numero: '$resto', unidade: 'min')];
  }
  return <ParteDoTempo>[
    (numero: formatarMilhar(horas), unidade: 'h'),
    (numero: '$resto'.padLeft(2, '0'), unidade: 'min'),
  ];
}

String rotuloDoTempo(int minutos) =>
    partesDoTempo(minutos).map((p) => '${p.numero} ${p.unidade}').join(' ');

/// Hoje em São Paulo, o fuso que o `leitura` usa para escolher o ano corrente e cortar o eixo no
/// mês de hoje. O Brasil não tem horário de verão desde 2019: UTC−3 fixo, sem pacote de fuso.
DateTime hojeEmSaoPaulo([DateTime? agora]) {
  final emSaoPaulo = (agora ?? DateTime.now()).toUtc().subtract(const Duration(hours: 3));
  return DateTime(emSaoPaulo.year, emSaoPaulo.month, emSaoPaulo.day);
}

/// `1º de janeiro`, `29 de setembro`.
String diaEMes(DateTime dia) => '${dia.day == 1 ? '1º' : dia.day} de ${nomeDoMes(dia.month)}';

String capitalizar(String texto) =>
    texto.isEmpty ? texto : '${texto[0].toUpperCase()}${texto.substring(1)}';
