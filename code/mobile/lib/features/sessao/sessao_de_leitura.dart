import '../progresso/fila_de_progresso.dart';
import '../progresso/registrar_progresso.dart';

const Duration duracaoMaximaDaSessao = Duration(hours: 12);
const List<Duration> duracoesDePausa = <Duration>[
  Duration(minutes: 5),
  Duration(minutes: 10),
  Duration(minutes: 15),
];

enum SituacaoDaSessao { emAndamento, pausada, pausaEsgotada, expirada }

class PausaDaSessao {
  final DateTime inicio;
  final Duration duracao;

  const PausaDaSessao({required this.inicio, required this.duracao});

  DateTime get fim => inicio.add(duracao);

  Map<String, Object?> toJson() => <String, Object?>{
    'inicio': inicio.toUtc().toIso8601String(),
    'duracaoMs': duracao.inMilliseconds,
  };

  factory PausaDaSessao.fromJson(Map<String, dynamic> json) => PausaDaSessao(
    inicio: DateTime.parse(json['inicio'] as String),
    duracao: Duration(milliseconds: (json['duracaoMs'] as num).toInt()),
  );
}

class SessaoDeLeitura {
  final LeituraDoRegistro leitura;
  final String origem;
  final Duration acumulado;
  final DateTime? inicioDoTrecho;
  final PausaDaSessao? pausa;
  final RegistroPendente? encerramento;

  const SessaoDeLeitura({
    required this.leitura,
    required this.origem,
    required this.acumulado,
    this.inicioDoTrecho,
    this.pausa,
    this.encerramento,
  });

  factory SessaoDeLeitura.iniciada(
    LeituraDoRegistro leitura, {
    required String origem,
    required DateTime agora,
  }) => SessaoDeLeitura(
    leitura: leitura,
    origem: origem,
    acumulado: Duration.zero,
    inicioDoTrecho: agora,
  );

  Duration tempoLido(DateTime agora) {
    final inicio = inicioDoTrecho;
    if (inicio == null) {
      return acumulado;
    }
    final trecho = agora.difference(inicio);
    return acumulado + (trecho.isNegative ? Duration.zero : trecho);
  }

  Duration tempoRegistravel(DateTime agora) {
    final tempo = tempoLido(agora);
    return tempo > duracaoMaximaDaSessao ? duracaoMaximaDaSessao : tempo;
  }

  SituacaoDaSessao situacaoEm(DateTime agora) {
    if (tempoLido(agora) >= duracaoMaximaDaSessao) {
      return SituacaoDaSessao.expirada;
    }
    final pausa = this.pausa;
    if (pausa == null) {
      return SituacaoDaSessao.emAndamento;
    }
    return agora.isBefore(pausa.fim) ? SituacaoDaSessao.pausada : SituacaoDaSessao.pausaEsgotada;
  }

  Duration? pausaRestante(DateTime agora) {
    final pausa = this.pausa;
    if (pausa == null) {
      return null;
    }
    final restante = pausa.fim.difference(agora);
    return restante.isNegative ? Duration.zero : restante;
  }

  SessaoDeLeitura pausada(DateTime agora, Duration duracao) => SessaoDeLeitura(
    leitura: leitura,
    origem: origem,
    acumulado: tempoLido(agora),
    pausa: PausaDaSessao(inicio: agora, duracao: duracao),
    encerramento: encerramento,
  );

  SessaoDeLeitura retomada(DateTime agora) => SessaoDeLeitura(
    leitura: leitura,
    origem: origem,
    acumulado: acumulado,
    inicioDoTrecho: agora,
    encerramento: encerramento,
  );

  SessaoDeLeitura comLeitura(LeituraDoRegistro nova) => SessaoDeLeitura(
    leitura: nova,
    origem: origem,
    acumulado: acumulado,
    inicioDoTrecho: inicioDoTrecho,
    pausa: pausa,
    encerramento: encerramento,
  );

  SessaoDeLeitura comEncerramento(RegistroPendente registro) => SessaoDeLeitura(
    leitura: leitura,
    origem: origem,
    acumulado: acumulado,
    inicioDoTrecho: inicioDoTrecho,
    pausa: pausa,
    encerramento: registro,
  );

  Map<String, Object?> toJson() => <String, Object?>{
    'leitura': leitura.toJson(),
    'origem': origem,
    'acumuladoMs': acumulado.inMilliseconds,
    'inicioDoTrecho': inicioDoTrecho?.toUtc().toIso8601String(),
    'pausa': pausa?.toJson(),
    'encerramento': encerramento?.toJson(),
  };

  factory SessaoDeLeitura.fromJson(Map<String, dynamic> json) {
    final inicioDoTrecho = json['inicioDoTrecho'] as String?;
    final pausa = json['pausa'] as Map<String, dynamic>?;
    final encerramento = json['encerramento'] as Map<String, dynamic>?;
    return SessaoDeLeitura(
      leitura: LeituraDoRegistro.fromJson(json['leitura'] as Map<String, dynamic>),
      origem: json['origem'] as String,
      acumulado: Duration(milliseconds: (json['acumuladoMs'] as num).toInt()),
      inicioDoTrecho: inicioDoTrecho == null ? null : DateTime.parse(inicioDoTrecho),
      pausa: pausa == null ? null : PausaDaSessao.fromJson(pausa),
      encerramento: encerramento == null ? null : RegistroPendente.fromJson(encerramento),
    );
  }
}
