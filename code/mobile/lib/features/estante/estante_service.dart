import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';

const int _naoEncontrado = 404;

enum StatusEstante {
  queroLer('QUERO_LER'),
  lendo('LENDO'),
  lido('LIDO'),
  relendo('RELENDO'),
  abandonado('ABANDONADO');

  final String valor;

  const StatusEstante(this.valor);

  static StatusEstante deValor(String valor) =>
      StatusEstante.values.firstWhere((status) => status.valor == valor);

  bool get emAndamento => this == StatusEstante.lendo || this == StatusEstante.relendo;
}

enum OrdenacaoEstante {
  adicionadoDesc('adicionado_desc'),
  adicionadoAsc('adicionado_asc'),
  tituloAsc('titulo_asc'),
  tituloDesc('titulo_desc'),
  autorAsc('autor_asc'),
  autorDesc('autor_desc'),
  progressoDesc('progresso_desc'),
  progressoAsc('progresso_asc');

  final String valor;

  const OrdenacaoEstante(this.valor);
}

class LivroDaEstante {
  final String titulo;
  final String? autor;
  final String? capaUrl;

  const LivroDaEstante({required this.titulo, required this.autor, required this.capaUrl});

  factory LivroDaEstante.fromJson(Map<String, dynamic> json) => LivroDaEstante(
    titulo: json['titulo'] as String,
    autor: json['autor'] as String?,
    capaUrl: json['capaUrl'] as String?,
  );
}

class ItemEstante {
  final String livroId;
  final LivroDaEstante livro;
  final StatusEstante status;
  final int vezesLido;
  final String? leituraEmAndamentoId;
  final String? ultimaLeituraId;
  final bool retomavel;
  final int? paginaAtual;
  final int? totalPaginas;
  final double? percentualConcluido;
  final DateTime adicionadoEm;

  String? get leituraParaAcoes => ultimaLeituraId ?? leituraEmAndamentoId;

  const ItemEstante({
    required this.livroId,
    required this.livro,
    required this.status,
    required this.vezesLido,
    required this.leituraEmAndamentoId,
    this.ultimaLeituraId,
    this.retomavel = false,
    required this.paginaAtual,
    required this.totalPaginas,
    required this.percentualConcluido,
    required this.adicionadoEm,
  });

  factory ItemEstante.fromJson(Map<String, dynamic> json) => ItemEstante(
    livroId: json['livroId'] as String,
    livro: LivroDaEstante.fromJson(json['livro'] as Map<String, dynamic>),
    status: StatusEstante.deValor(json['status'] as String),
    vezesLido: (json['vezesLido'] as num).toInt(),
    leituraEmAndamentoId: json['leituraEmAndamentoId'] as String?,
    ultimaLeituraId: json['ultimaLeituraId'] as String?,
    retomavel: json['retomavel'] as bool? ?? false,
    paginaAtual: (json['paginaAtual'] as num?)?.toInt(),
    totalPaginas: (json['totalPaginas'] as num?)?.toInt(),
    percentualConcluido: (json['percentualConcluido'] as num?)?.toDouble(),
    adicionadoEm: DateTime.parse(json['adicionadoEm'] as String),
  );
}

class PaginaEstante {
  final List<ItemEstante> itens;
  final int pagina;
  final int limite;
  final int totalItens;
  final int totalPaginas;
  final Map<StatusEstante, int> totaisPorStatus;

  const PaginaEstante({
    required this.itens,
    required this.pagina,
    required this.limite,
    required this.totalItens,
    required this.totalPaginas,
    required this.totaisPorStatus,
  });

  factory PaginaEstante.fromJson(Map<String, dynamic> json) {
    final paginacao = json['paginacao'] as Map<String, dynamic>;
    final totais = json['totaisPorStatus'] as Map<String, dynamic>;
    return PaginaEstante(
      itens: (json['itens'] as List<dynamic>)
          .map((bruto) => ItemEstante.fromJson(bruto as Map<String, dynamic>))
          .toList(),
      pagina: (paginacao['page'] as num).toInt(),
      limite: (paginacao['limite'] as num).toInt(),
      totalItens: (paginacao['totalItens'] as num).toInt(),
      totalPaginas: (paginacao['totalPaginas'] as num).toInt(),
      totaisPorStatus: <StatusEstante, int>{
        for (final status in StatusEstante.values)
          status: (totais[status.valor] as num?)?.toInt() ?? 0,
      },
    );
  }
}

class Leitura {
  final String id;
  final String livroId;
  final StatusEstante status;
  final String dataInicio;
  final String? dataFim;
  final bool releitura;
  final bool incompleta;
  final bool retomavel;
  final int paginaAtual;
  final int? totalPaginas;
  final double? percentualConcluido;
  final int vezesLido;

  const Leitura({
    required this.id,
    required this.livroId,
    required this.status,
    required this.dataInicio,
    required this.dataFim,
    required this.releitura,
    required this.incompleta,
    required this.retomavel,
    required this.paginaAtual,
    required this.totalPaginas,
    required this.percentualConcluido,
    required this.vezesLido,
  });

  factory Leitura.fromJson(Map<String, dynamic> json) => Leitura(
    id: json['id'] as String,
    livroId: json['livroId'] as String,
    status: StatusEstante.deValor(json['status'] as String),
    dataInicio: json['dataInicio'] as String,
    dataFim: json['dataFim'] as String?,
    releitura: json['releitura'] as bool,
    incompleta: json['incompleta'] as bool,
    retomavel: json['retomavel'] as bool,
    paginaAtual: (json['paginaAtual'] as num).toInt(),
    totalPaginas: (json['totalPaginas'] as num?)?.toInt(),
    percentualConcluido: (json['percentualConcluido'] as num?)?.toDouble(),
    vezesLido: (json['vezesLido'] as num).toInt(),
  );
}

class FiltroEstante {
  final StatusEstante? status;
  final OrdenacaoEstante? ordenacao;
  final int? pagina;
  final int? limite;

  const FiltroEstante({this.status, this.ordenacao, this.pagina, this.limite});

  Map<String, String> get consulta => <String, String>{
    'status': ?status?.valor,
    'ordenacao': ?ordenacao?.valor,
    'page': ?pagina?.toString(),
    'limite': ?limite?.toString(),
  };
}

class EstanteService {
  final ApiClient client;

  /// Conta as escritas que deram certo, como `LeituraService.alteracoes`. Quem mostra a estante (a
  /// aba, montada no `indexedStack`, e a situação na página do livro) escuta e recarrega, mesmo
  /// quando a mudança veio de outra aba ou de uma tela empilhada por cima.
  final ValueNotifier<int> alteracoes = ValueNotifier<int>(0);

  EstanteService(this.client);

  String _comConsulta(String caminho, FiltroEstante filtro) {
    final consulta = filtro.consulta;
    return Uri(path: caminho, queryParameters: consulta.isEmpty ? null : consulta).toString();
  }

  String _daLeitura(String leituraId, [String acao = '']) =>
      '/leituras/${Uri.encodeComponent(leituraId)}$acao';

  Future<PaginaEstante> listarEstante([FiltroEstante filtro = const FiltroEstante()]) async {
    final json = await client.getJson(_comConsulta('/estante', filtro));
    return PaginaEstante.fromJson(json);
  }

  Future<PaginaEstante> listarEstantePerfil(
    String usuarioId, [
    FiltroEstante filtro = const FiltroEstante(),
  ]) async {
    final json = await client.getJson(
      _comConsulta('/perfis/${Uri.encodeComponent(usuarioId)}/estante', filtro),
    );
    return PaginaEstante.fromJson(json);
  }

  Future<ItemEstante?> itemDaEstante(String livroId) async {
    try {
      final json = await client.getJson('/estante/${Uri.encodeComponent(livroId)}');
      return ItemEstante.fromJson(json);
    } on ApiException catch (erro) {
      if (erro.status == _naoEncontrado) {
        return null;
      }
      rethrow;
    }
  }

  Future<ItemEstante> adicionarEstante(String livroId, {required String idempotencyKey}) async {
    final json = await client.postJson(
      '/estante',
      body: <String, String>{'livroId': livroId},
      idempotencyKey: idempotencyKey,
    );
    alteracoes.value++;
    return ItemEstante.fromJson(json);
  }

  Future<void> removerEstante(String livroId, {required String idempotencyKey}) async {
    await client.deleteVazio(
      '/estante/${Uri.encodeComponent(livroId)}',
      idempotencyKey: idempotencyKey,
    );
    alteracoes.value++;
  }

  Future<Leitura> iniciarLeitura(
    String livroId, {
    String? dataInicio,
    required String idempotencyKey,
  }) => _iniciar('/leituras', livroId, dataInicio, idempotencyKey);

  Future<Leitura> iniciarReleitura(
    String livroId, {
    String? dataInicio,
    required String idempotencyKey,
  }) => _iniciar('/releituras', livroId, dataInicio, idempotencyKey);

  Future<Leitura> _iniciar(
    String caminho,
    String livroId,
    String? dataInicio,
    String idempotencyKey,
  ) async {
    final json = await client.postJson(
      caminho,
      body: <String, String>{'livroId': livroId, 'dataInicio': ?dataInicio},
      idempotencyKey: idempotencyKey,
    );
    alteracoes.value++;
    return Leitura.fromJson(json);
  }

  Future<Leitura> finalizarLeitura(
    String leituraId, {
    String? dataFim,
    required String fusoHorarioDispositivo,
    required String idempotencyKey,
  }) async {
    final json = await client.postJson(
      _daLeitura(leituraId, '/finalizar'),
      body: <String, String>{'dataFim': ?dataFim, 'fusoHorarioDispositivo': fusoHorarioDispositivo},
      idempotencyKey: idempotencyKey,
    );
    alteracoes.value++;
    return Leitura.fromJson(json);
  }

  Future<Leitura> abandonarLeitura(String leituraId, {required String idempotencyKey}) async {
    final json = await client.postJson(
      _daLeitura(leituraId, '/abandonar'),
      idempotencyKey: idempotencyKey,
    );
    alteracoes.value++;
    return Leitura.fromJson(json);
  }

  Future<Leitura> retomarLeitura(String leituraId, {required String idempotencyKey}) async {
    final json = await client.postJson(
      _daLeitura(leituraId, '/retomar'),
      idempotencyKey: idempotencyKey,
    );
    alteracoes.value++;
    return Leitura.fromJson(json);
  }

  Future<Leitura> detalharLeitura(String leituraId) async {
    final json = await client.getJson(_daLeitura(leituraId));
    return Leitura.fromJson(json);
  }

  Future<int> consultarConclusoes(String livroId) async {
    final json = await client.getJson('/livros/${Uri.encodeComponent(livroId)}/conclusoes');
    return (json['vezesLido'] as num).toInt();
  }
}
