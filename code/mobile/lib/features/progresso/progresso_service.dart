import '../../core/network/api_client.dart';

class Progresso {
  final String id;
  final String leituraId;
  final int posicao;
  final int pagina;
  final int paginaAnterior;
  final int paginasLidas;
  final int minutos;
  final String registradoEmDispositivo;
  final String fusoHorarioDispositivo;
  final String dataLocal;

  const Progresso({
    required this.id,
    required this.leituraId,
    required this.posicao,
    required this.pagina,
    required this.paginaAnterior,
    required this.paginasLidas,
    required this.minutos,
    required this.registradoEmDispositivo,
    required this.fusoHorarioDispositivo,
    required this.dataLocal,
  });

  factory Progresso.fromJson(Map<String, dynamic> json) => Progresso(
    id: json['id'] as String,
    leituraId: json['leituraId'] as String,
    posicao: (json['posicao'] as num).toInt(),
    pagina: (json['pagina'] as num).toInt(),
    paginaAnterior: (json['paginaAnterior'] as num).toInt(),
    paginasLidas: (json['paginasLidas'] as num).toInt(),
    minutos: (json['minutos'] as num?)?.toInt() ?? 0,
    registradoEmDispositivo: json['registradoEmDispositivo'] as String,
    fusoHorarioDispositivo: json['fusoHorarioDispositivo'] as String,
    dataLocal: json['dataLocal'] as String,
  );
}

class ResumoProgresso {
  final int paginaAtual;
  final int totalPaginas;
  final double percentualConcluido;
  final int minutosTotais;

  const ResumoProgresso({
    required this.paginaAtual,
    required this.totalPaginas,
    required this.percentualConcluido,
    required this.minutosTotais,
  });

  factory ResumoProgresso.fromJson(Map<String, dynamic> json) => ResumoProgresso(
    paginaAtual: (json['paginaAtual'] as num).toInt(),
    totalPaginas: (json['totalPaginas'] as num).toInt(),
    percentualConcluido: (json['percentualConcluido'] as num).toDouble(),
    minutosTotais: (json['minutosTotais'] as num?)?.toInt() ?? 0,
  );
}

class PaginaProgresso {
  final List<Progresso> itens;
  final int pagina;
  final int totalItens;
  final int totalPaginas;
  final ResumoProgresso resumo;
  final bool somenteLeitura;

  const PaginaProgresso({
    required this.itens,
    required this.pagina,
    required this.totalItens,
    required this.totalPaginas,
    required this.resumo,
    required this.somenteLeitura,
  });

  factory PaginaProgresso.fromJson(Map<String, dynamic> json) {
    final paginacao = json['paginacao'] as Map<String, dynamic>;
    return PaginaProgresso(
      itens: (json['itens'] as List<dynamic>)
          .map((bruto) => Progresso.fromJson(bruto as Map<String, dynamic>))
          .toList(),
      pagina: (paginacao['page'] as num).toInt(),
      totalItens: (paginacao['totalItens'] as num).toInt(),
      totalPaginas: (paginacao['totalPaginas'] as num).toInt(),
      resumo: ResumoProgresso.fromJson(json['resumo'] as Map<String, dynamic>),
      somenteLeitura: json['somenteLeitura'] as bool? ?? false,
    );
  }
}

class ProgressoComResumo {
  final Progresso progresso;
  final ResumoProgresso resumo;

  const ProgressoComResumo({required this.progresso, required this.resumo});

  factory ProgressoComResumo.fromJson(Map<String, dynamic> json) => ProgressoComResumo(
    progresso: Progresso.fromJson(json['progresso'] as Map<String, dynamic>),
    resumo: ResumoProgresso.fromJson(json['resumo'] as Map<String, dynamic>),
  );
}

class ExclusaoProgresso {
  final List<String> idsRemovidos;
  final ResumoProgresso resumo;

  const ExclusaoProgresso({required this.idsRemovidos, required this.resumo});

  factory ExclusaoProgresso.fromJson(Map<String, dynamic> json) => ExclusaoProgresso(
    idsRemovidos: (json['idsRemovidos'] as List<dynamic>).cast<String>(),
    resumo: ResumoProgresso.fromJson(json['resumo'] as Map<String, dynamic>),
  );
}

class NovoProgresso {
  final int pagina;
  final int? minutos;
  final String registradoEmDispositivo;
  final String fusoHorarioDispositivo;

  const NovoProgresso({
    required this.pagina,
    this.minutos,
    required this.registradoEmDispositivo,
    required this.fusoHorarioDispositivo,
  });

  Map<String, Object> get corpo => <String, Object>{
    'pagina': pagina,
    'minutos': ?minutos,
    'registradoEmDispositivo': registradoEmDispositivo,
    'fusoHorarioDispositivo': fusoHorarioDispositivo,
  };
}

class ProgressoService {
  final ApiClient client;

  const ProgressoService(this.client);

  String _daLeitura(String leituraId) => '/leituras/${Uri.encodeComponent(leituraId)}/progresso';

  String _doProgresso(String progressoId) => '/progresso/${Uri.encodeComponent(progressoId)}';

  Future<ProgressoComResumo> registrar(
    String leituraId,
    NovoProgresso novo, {
    required String idempotencyKey,
  }) async {
    final json = await client.postJson(
      _daLeitura(leituraId),
      body: novo.corpo,
      idempotencyKey: idempotencyKey,
    );
    return ProgressoComResumo.fromJson(json);
  }

  Future<PaginaProgresso> listar(String leituraId, {int? pagina, int? limite}) async {
    final consulta = <String, String>{'page': ?pagina?.toString(), 'limite': ?limite?.toString()};
    final caminho = Uri(
      path: _daLeitura(leituraId),
      queryParameters: consulta.isEmpty ? null : consulta,
    ).toString();
    return PaginaProgresso.fromJson(await client.getJson(caminho));
  }

  Future<ExclusaoProgresso> excluirTrecho(
    String progressoId, {
    required String ultimoProgressoIdConfirmado,
    required String idempotencyKey,
  }) async {
    final json = await client.deleteJson(
      _doProgresso(progressoId),
      body: <String, String>{'ultimoProgressoIdConfirmado': ultimoProgressoIdConfirmado},
      idempotencyKey: idempotencyKey,
    );
    return ExclusaoProgresso.fromJson(json);
  }
}
