/// Calendário da sequência (F-GAM-OPC, RF-GAM-04): `CalendarioSequencia` de
/// docs/api/leitura.yaml e as regras puras da grade (calendario-de-sequencia.md §4).
library;

import '../livros/formatos.dart';

/// Um mês de calendário, `AAAA-MM` no contrato.
class Mes implements Comparable<Mes> {
  final int ano;

  /// De 1 a 12.
  final int mes;

  const Mes(this.ano, this.mes);

  factory Mes.deData(DateTime data) => Mes(data.year, data.month);

  /// `2026-09`. Lança [FormatException] fora do formato.
  factory Mes.doContrato(Object? valor) {
    final achado = valor is String ? RegExp(r'^(\d{4})-(\d{2})$').firstMatch(valor) : null;
    final mes = achado == null ? 0 : int.parse(achado[2]!);
    if (achado == null || mes < 1 || mes > 12) {
      throw FormatException('Mês fora do formato: $valor');
    }
    return Mes(int.parse(achado[1]!), mes);
  }

  String get valor => '$ano-${mes.toString().padLeft(2, '0')}';

  Mes get anterior => mes == 1 ? Mes(ano - 1, 12) : Mes(ano, mes - 1);

  Mes get seguinte => mes == 12 ? Mes(ano + 1, 1) : Mes(ano, mes + 1);

  int get diasNoMes => DateTime.utc(ano, mes + 1, 0).day;

  /// Dia da semana ISO do dia 1: segunda = 0, domingo = 6.
  int get colunaDoPrimeiroDia => DateTime.utc(ano, mes).weekday - 1;

  /// `Setembro de 2026`.
  String get titulo {
    final nome = nomeDoMes(mes);
    return '${nome[0].toUpperCase()}${nome.substring(1)} de $ano';
  }

  @override
  int compareTo(Mes other) => (ano * 12 + mes) - (other.ano * 12 + other.mes);

  bool operator <(Mes outro) => compareTo(outro) < 0;

  bool operator >(Mes outro) => compareTo(outro) > 0;

  @override
  bool operator ==(Object other) => other is Mes && other.ano == ano && other.mes == mes;

  @override
  int get hashCode => Object.hash(ano, mes);

  @override
  String toString() => valor;
}

/// Um dia `AAAA-MM-DD` do contrato, sem fuso: o servidor já resolveu a data local.
DateTime _dia(Object? valor) {
  if (valor is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(valor)) {
    throw FormatException('Dia fora do formato: $valor');
  }
  final partes = valor.split('-').map(int.parse).toList();
  final dia = DateTime.utc(partes[0], partes[1], partes[2]);
  if (dia.month != partes[1] || dia.day != partes[2]) {
    throw FormatException('Dia inexistente: $valor');
  }
  return dia;
}

/// `CalendarioSequencia`: os dias com leitura de [mes] e os limites da janela do servidor
/// (RNF-DES-02). [hoje] é o dia corrente no mesmo fuso que apura a sequência, e é ele, não o
/// relógio do aparelho, que marca o anel de hoje e os dias futuros.
class CalendarioDaSequencia {
  final Mes mes;
  final Mes mesAtual;
  final Mes mesMaisAntigo;
  final DateTime hoje;

  /// Números dos dias de [mes] com leitura.
  final Set<int> dias;

  const CalendarioDaSequencia({
    required this.mes,
    required this.mesAtual,
    required this.mesMaisAntigo,
    required this.hoje,
    required this.dias,
  });

  factory CalendarioDaSequencia.fromJson(Map<String, dynamic> json) {
    final mes = Mes.doContrato(json['mes']);
    final brutos = json['dias'];
    if (brutos is! List) {
      throw const FormatException('Calendário sem a lista de dias.');
    }
    final dias = <int>{};
    for (final bruto in brutos) {
      final dia = _dia(bruto);
      // Dia de outro mês não é do contrato; não inventa marca na grade.
      if (dia.year != mes.ano || dia.month != mes.mes) {
        throw FormatException('Dia fora do mês pedido: $bruto');
      }
      dias.add(dia.day);
    }
    return CalendarioDaSequencia(
      mes: mes,
      mesAtual: Mes.doContrato(json['mesAtual']),
      mesMaisAntigo: Mes.doContrato(json['mesMaisAntigo']),
      hoje: _dia(json['hoje']),
      dias: dias,
    );
  }

  bool get podeVoltar => mes > mesMaisAntigo;

  bool get podeAvancar => mes < mesAtual;

  /// O dia de hoje, se cair neste mês.
  int? get diaDeHoje => hoje.year == mes.ano && hoje.month == mes.mes ? hoje.day : null;

  bool get hojeTemLeitura => diaDeHoje != null && dias.contains(diaDeHoje);

  SituacaoDoDia situacao(int dia) {
    final data = DateTime.utc(mes.ano, mes.mes, dia);
    final hojeUtc = DateTime.utc(hoje.year, hoje.month, hoje.day);
    final comLeitura = dias.contains(dia);
    if (data == hojeUtc) {
      return comLeitura ? SituacaoDoDia.hojeComLeitura : SituacaoDoDia.hojeSemLeitura;
    }
    if (data.isAfter(hojeUtc)) {
      return SituacaoDoDia.futuro;
    }
    return comLeitura ? SituacaoDoDia.comLeitura : SituacaoDoDia.semLeitura;
  }
}

enum SituacaoDoDia {
  comLeitura,
  semLeitura,
  hojeComLeitura,
  hojeSemLeitura,
  futuro;

  bool get leu => this == comLeitura || this == hojeComLeitura;
}

/// Uma célula da grade: [dia] nulo antes do dia 1 e depois do último (sem dias de meses vizinhos).
/// [ligadaAEsquerda] e [ligadaADireita] desenham a faixa de dias consecutivos, que só liga dias
/// com leitura da mesma linha e quebra na virada de domingo para segunda (§4, faixa).
class CelulaDoMes {
  final int? dia;
  final SituacaoDoDia? situacao;
  final bool ligadaAEsquerda;
  final bool ligadaADireita;

  const CelulaDoMes.vazia()
    : dia = null,
      situacao = null,
      ligadaAEsquerda = false,
      ligadaADireita = false;

  const CelulaDoMes({
    required int this.dia,
    required SituacaoDoDia this.situacao,
    this.ligadaAEsquerda = false,
    this.ligadaADireita = false,
  });
}

/// Linhas de sete células, de segunda a domingo, de quatro a seis conforme cai o dia 1.
List<List<CelulaDoMes>> linhasDoMes(CalendarioDaSequencia calendario) {
  final mes = calendario.mes;
  final total = mes.colunaDoPrimeiroDia + mes.diasNoMes;
  final quantasLinhas = (total / 7).ceil();
  final linhas = <List<CelulaDoMes>>[];
  for (var linha = 0; linha < quantasLinhas; linha++) {
    final dias = <int?>[
      for (var coluna = 0; coluna < 7; coluna++)
        () {
          final dia = linha * 7 + coluna - mes.colunaDoPrimeiroDia + 1;
          return dia >= 1 && dia <= mes.diasNoMes ? dia : null;
        }(),
    ];
    bool leu(int? dia) => dia != null && calendario.situacao(dia).leu;
    linhas.add(<CelulaDoMes>[
      for (var coluna = 0; coluna < 7; coluna++)
        if (dias[coluna] == null)
          const CelulaDoMes.vazia()
        else
          CelulaDoMes(
            dia: dias[coluna]!,
            situacao: calendario.situacao(dias[coluna]!),
            ligadaAEsquerda: leu(dias[coluna]) && coluna > 0 && leu(dias[coluna - 1]),
            ligadaADireita: leu(dias[coluna]) && coluna < 6 && leu(dias[coluna + 1]),
          ),
    ]);
  }
  return linhas;
}

const List<String> diasDaSemanaCurtos = <String>['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/// Cabeçalho com texto ampliado (§9): uma letra, com o nome completo no rótulo acessível.
const List<String> diasDaSemanaLetra = <String>['s', 't', 'q', 'q', 's', 's', 'd'];

const List<String> diasDaSemanaCompletos = <String>[
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
  'domingo',
];

/// `20 dias com leitura`, `1 dia com leitura`, `Nenhum dia com leitura`.
String totalDoMes(int dias) => switch (dias) {
  0 => 'Nenhum dia com leitura',
  1 => '1 dia com leitura',
  _ => '$dias dias com leitura',
};

/// Rótulo acessível de cada dia (§8): `24 de setembro, hoje, com leitura`.
String rotuloDoDia(Mes mes, int dia, SituacaoDoDia situacao) {
  final data = '$dia de ${nomeDoMes(mes.mes)}';
  return switch (situacao) {
    SituacaoDoDia.comLeitura => '$data, com leitura',
    SituacaoDoDia.semLeitura => '$data, sem leitura',
    SituacaoDoDia.hojeComLeitura => '$data, hoje, com leitura',
    SituacaoDoDia.hojeSemLeitura => '$data, hoje, sem leitura ainda',
    SituacaoDoDia.futuro => '$data, dia futuro',
  };
}

/// Linha da fila do aparelho no estado sem conexão (§4.9).
String registrosNaFila(int quantos) => quantos == 1
    ? '1 registro ainda não foi enviado. O dia aparece marcado depois que ele chegar ao servidor.'
    : '$quantos registros ainda não foram enviados. Os dias aparecem marcados depois que eles '
          'chegarem ao servidor.';

abstract final class TextosDoCalendario {
  static const String titulo = 'Sequência';
  static const String mesAnterior = 'Mês anterior';
  static const String proximoMes = 'Próximo mês';
  static const String legendaComLeitura = 'Dia com leitura';
  static const String legendaHoje = 'Hoje';
  static const String hojeSemRegistro =
      'Hoje ainda não tem registro. Registre ao menos 1 página até o fim do dia para manter a '
      'sequência.';
  static const String mesMaisAntigo = 'Este é o mês mais antigo disponível no calendário.';
  static const String contaSemLeitura =
      'Cada dia em que você registrar ao menos 1 página aparece marcado aqui.';
  static const String coldStart = 'O serviço está iniciando. Isso pode levar alguns segundos.';
  static const String erro =
      'Não foi possível carregar seu calendário. Verifique sua conexão e tente de novo.';
  static const String semConexao =
      'Você está sem conexão. O calendário aparece quando a conexão voltar.';
  static const String tentarDeNovo = 'Tentar de novo';

  /// `Não foi possível carregar agosto de 2026. ...`
  static String erroDoMes(Mes mes) =>
      'Não foi possível carregar ${nomeDoMes(mes.mes)} de ${mes.ano}. Verifique sua conexão e '
      'tente de novo.';
}
