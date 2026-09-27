import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';

/// Contrato do serviço `leitura` usado por F-AVA. Espelha `docs/api/leitura.yaml`: mesmos
/// campos, mesmas rotas. O parse é defensivo: JSON inesperado vira [FormatException], nunca um
/// `TypeError` solto na tela.

/// `Nota` do contrato: de 0 a 5 em passos de 0,5 (RN-06).
class Nota {
  final String livroId;
  final double valor;
  final DateTime criadoEm;
  final DateTime atualizadoEm;

  const Nota({
    required this.livroId,
    required this.valor,
    required this.criadoEm,
    required this.atualizadoEm,
  });

  factory Nota.fromJson(Map<String, dynamic> json) {
    return Nota(
      livroId: _texto(json, 'livroId'),
      valor: _numero(json, 'valor'),
      criadoEm: _data(json, 'criadoEm'),
      atualizadoEm: _data(json, 'atualizadoEm'),
    );
  }
}

/// `Resenha` do contrato: texto cru, até 5.000 caracteres (RN-07).
class Resenha {
  final String id;
  final String usuarioId;
  final String livroId;
  final String texto;
  final bool spoiler;
  final DateTime criadoEm;
  final DateTime atualizadoEm;

  const Resenha({
    required this.id,
    required this.usuarioId,
    required this.livroId,
    required this.texto,
    required this.spoiler,
    required this.criadoEm,
    required this.atualizadoEm,
  });

  factory Resenha.fromJson(Map<String, dynamic> json) {
    final spoiler = json['spoiler'];
    if (spoiler is! bool) {
      throw const FormatException('Resenha sem o campo spoiler.');
    }
    return Resenha(
      id: _texto(json, 'id'),
      usuarioId: _texto(json, 'usuarioId'),
      livroId: _texto(json, 'livroId'),
      texto: _texto(json, 'texto'),
      spoiler: spoiler,
      criadoEm: _data(json, 'criadoEm'),
      atualizadoEm: _data(json, 'atualizadoEm'),
    );
  }
}

/// `MinhaAvaliacao` do contrato. Ausente é `null`, nunca valor inventado: nota `0` é uma nota.
class MinhaAvaliacao {
  final String livroId;
  final Nota? nota;
  final Resenha? resenha;

  const MinhaAvaliacao({required this.livroId, this.nota, this.resenha});

  factory MinhaAvaliacao.fromJson(Map<String, dynamic> json) {
    final nota = json['nota'];
    final resenha = json['resenha'];
    return MinhaAvaliacao(
      livroId: _texto(json, 'livroId'),
      nota: nota is Map<String, dynamic> ? Nota.fromJson(nota) : null,
      resenha: resenha is Map<String, dynamic> ? Resenha.fromJson(resenha) : null,
    );
  }

  MinhaAvaliacao comNota(Nota? novaNota) =>
      MinhaAvaliacao(livroId: livroId, nota: novaNota, resenha: resenha);

  MinhaAvaliacao comResenha(Resenha? novaResenha) =>
      MinhaAvaliacao(livroId: livroId, nota: nota, resenha: novaResenha);
}

/// O livro de uma resenha do perfil: o que o card mostra.
class LivroDaResenha {
  final String id;
  final bool pessoal;
  final String titulo;

  /// `null` em livro oficial sem autor.
  final String? autor;
  final String? capaUrl;

  const LivroDaResenha({
    required this.id,
    required this.pessoal,
    required this.titulo,
    this.autor,
    this.capaUrl,
  });

  factory LivroDaResenha.fromJson(Map<String, dynamic> json) {
    return LivroDaResenha(
      id: _texto(json, 'id'),
      pessoal: json['tipo'] == 'pessoal',
      titulo: _texto(json, 'titulo'),
      autor: json['autor'] as String?,
      capaUrl: json['capaUrl'] as String?,
    );
  }
}

/// `ResenhaDoPerfil` do contrato: a resenha com o livro e a nota do autor.
class ResenhaDoPerfil {
  final Resenha resenha;
  final LivroDaResenha livro;
  final double? nota;

  const ResenhaDoPerfil({required this.resenha, required this.livro, this.nota});

  factory ResenhaDoPerfil.fromJson(Map<String, dynamic> json) {
    final livro = json['livro'];
    if (livro is! Map<String, dynamic>) {
      throw const FormatException('Resenha do perfil sem o livro.');
    }
    final nota = json['nota'];
    return ResenhaDoPerfil(
      resenha: Resenha.fromJson(json),
      livro: LivroDaResenha.fromJson(livro),
      nota: nota is num ? nota.toDouble() : null,
    );
  }
}

class PaginaResenhasPerfil {
  final List<ResenhaDoPerfil> itens;
  final int page;
  final int totalPaginas;

  const PaginaResenhasPerfil({required this.itens, required this.page, required this.totalPaginas});

  bool get temMais => page < totalPaginas;

  factory PaginaResenhasPerfil.fromJson(Map<String, dynamic> json) {
    final itens = json['itens'];
    final paginacao = json['paginacao'];
    if (itens is! List || paginacao is! Map<String, dynamic>) {
      throw const FormatException('Página de resenhas inválida.');
    }
    return PaginaResenhasPerfil(
      itens: itens.whereType<Map<String, dynamic>>().map(ResenhaDoPerfil.fromJson).toList(),
      page: (paginacao['page'] as num?)?.toInt() ?? 1,
      totalPaginas: (paginacao['totalPaginas'] as num?)?.toInt() ?? 0,
    );
  }
}

class LeituraService {
  final ApiClient _api;

  LeituraService(this._api);

  /// Conta as escritas que deram certo. Quem mostra nota ou resenha fora da página do livro (as
  /// resenhas do perfil, numa aba que continua montada) escuta e recarrega.
  final ValueNotifier<int> alteracoes = ValueNotifier<int>(0);

  Future<MinhaAvaliacao> obterMinhaAvaliacao(String livroId) async {
    final json = await _api.getJson('/livros/$livroId/minha-avaliacao');
    return _ler(() => MinhaAvaliacao.fromJson(json));
  }

  /// Cria ou atualiza a nota. A mesma [idempotencyKey] em cada reenvio da mesma intenção não
  /// cria uma segunda nota (RNF-ERR-04).
  Future<Nota> salvarNota(String livroId, double valor, {required String idempotencyKey}) async {
    final json = await _api.putJson(
      '/livros/$livroId/nota',
      body: <String, Object?>{'valor': valor},
      idempotencyKey: idempotencyKey,
    );
    final nota = _ler(() => Nota.fromJson(json));
    alteracoes.value++;
    return nota;
  }

  Future<void> excluirNota(String livroId, {required String idempotencyKey}) async {
    await _api.deleteVazio('/livros/$livroId/nota', idempotencyKey: idempotencyKey);
    alteracoes.value++;
  }

  /// Cria ou atualiza a resenha: texto cru, até 5.000 caracteres (RN-07).
  Future<Resenha> salvarResenha(
    String livroId, {
    required String texto,
    required bool spoiler,
    required String idempotencyKey,
  }) async {
    final json = await _api.putJson(
      '/livros/$livroId/resenha',
      body: <String, Object?>{'texto': texto, 'spoiler': spoiler},
      idempotencyKey: idempotencyKey,
    );
    final resenha = _ler(() => Resenha.fromJson(json));
    alteracoes.value++;
    return resenha;
  }

  /// Resenhas autorizadas de um perfil (RN-08): página iniciada em 1, até 50 por página.
  Future<PaginaResenhasPerfil> listarResenhasPerfil(
    String usuarioId, {
    int page = 1,
    int limite = 5,
  }) async {
    final json = await _api.getJson('/perfis/$usuarioId/resenhas?page=$page&limite=$limite');
    return _ler(() => PaginaResenhasPerfil.fromJson(json));
  }

  /// Exclui a resenha de forma física, depois da confirmação da tela (RF-AVA-04).
  Future<void> excluirResenha(String livroId, {required String idempotencyKey}) async {
    await _api.deleteVazio('/livros/$livroId/resenha', idempotencyKey: idempotencyKey);
    alteracoes.value++;
  }

  /// Resposta 2xx fora do contrato vira a mesma [ApiException] de resposta inválida do
  /// [ApiClient]: as telas já tratam essa, e uma [FormatException] solta deixava o painel preso
  /// em "Salvando".
  T _ler<T>(T Function() ler) {
    try {
      return ler();
    } on FormatException {
      throw const ApiException(
        kind: ApiFailureKind.invalidResponse,
        correlationId: '',
        message: 'O serviço retornou uma resposta inválida.',
      );
    }
  }
}

String _texto(Map<String, dynamic> json, String campo) {
  final valor = json[campo];
  if (valor is! String) {
    throw FormatException('Campo $campo ausente ou inválido.');
  }
  return valor;
}

double _numero(Map<String, dynamic> json, String campo) {
  final valor = json[campo];
  if (valor is! num) {
    throw FormatException('Campo $campo ausente ou inválido.');
  }
  return valor.toDouble();
}

DateTime _data(Map<String, dynamic> json, String campo) {
  final data = DateTime.tryParse(_texto(json, campo));
  if (data == null) {
    throw FormatException('Campo $campo não é uma data.');
  }
  return data;
}
