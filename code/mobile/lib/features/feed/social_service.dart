import '../../core/network/api_client.dart';
import '../perfil/perfil_service.dart';

/// Feed e interações no serviço `social` (F-FEED, RF-SOC-09..14). Espelha os schemas de
/// `docs/api/social.yaml` e o `services/social.ts` da web. Toda escrita exige `Idempotency-Key`,
/// e quem guarda a chave da intenção é a tela.

enum TipoAtividade {
  leituraIniciada('LEITURA_INICIADA'),
  leituraRetomada('LEITURA_RETOMADA'),
  leituraFinalizada('LEITURA_FINALIZADA'),
  leituraAbandonada('LEITURA_ABANDONADA'),
  resenhaPublicada('RESENHA_PUBLICADA');

  final String json;

  const TipoAtividade(this.json);

  static TipoAtividade deJson(Object? bruto) =>
      values.firstWhere((tipo) => tipo.json == bruto, orElse: () => leituraIniciada);
}

class AutorSnapshot {
  final String id;
  final String username;
  final String nomeExibicao;
  final String? avatarUrl;

  const AutorSnapshot({
    required this.id,
    required this.username,
    required this.nomeExibicao,
    required this.avatarUrl,
  });

  factory AutorSnapshot.fromJson(Map<String, dynamic> json) => AutorSnapshot(
    id: json['id'] as String,
    username: json['username'] as String,
    nomeExibicao: json['nomeExibicao'] as String,
    avatarUrl: json['avatarUrl'] as String?,
  );
}

/// Schema `LivroSnapshot`. Livro pessoal só abre pela atividade (`via=feed`, RN-15): a
/// [referenciaId] é o id da atividade e vai na rota do livro.
class LivroSnapshot {
  final String id;
  final bool pessoal;
  final String titulo;
  final String autor;
  final String? capaUrl;
  final String? referenciaId;

  const LivroSnapshot({
    required this.id,
    required this.pessoal,
    required this.titulo,
    required this.autor,
    required this.capaUrl,
    required this.referenciaId,
  });

  factory LivroSnapshot.fromJson(Map<String, dynamic> json) {
    final link = json['link'] as Map<String, dynamic>?;
    return LivroSnapshot(
      id: json['id'] as String,
      pessoal: json['tipo'] == 'PESSOAL',
      titulo: json['titulo'] as String,
      autor: json['autor'] as String? ?? '',
      capaUrl: json['capaUrl'] as String?,
      referenciaId: link?['referenciaId'] as String?,
    );
  }
}

class ResenhaSnapshot {
  final String id;
  final String texto;
  final bool spoiler;

  /// Nota do autor para o livro resenhado; nula quando não deu nota.
  final double? nota;

  const ResenhaSnapshot({
    required this.id,
    required this.texto,
    required this.spoiler,
    required this.nota,
  });

  factory ResenhaSnapshot.fromJson(Map<String, dynamic> json) => ResenhaSnapshot(
    id: json['id'] as String,
    texto: json['texto'] as String,
    spoiler: json['spoiler'] as bool? ?? false,
    nota: (json['nota'] as num?)?.toDouble(),
  );
}

class Atividade {
  final String id;
  final TipoAtividade tipo;
  final AutorSnapshot autor;
  final LivroSnapshot livro;
  final ResenhaSnapshot? resenha;
  final DateTime criadoEm;
  final int totalCurtidas;
  final int totalComentarios;
  final bool curtidaPeloSolicitante;

  const Atividade({
    required this.id,
    required this.tipo,
    required this.autor,
    required this.livro,
    required this.resenha,
    required this.criadoEm,
    required this.totalCurtidas,
    required this.totalComentarios,
    required this.curtidaPeloSolicitante,
  });

  factory Atividade.fromJson(Map<String, dynamic> json) {
    final resenha = json['resenha'] as Map<String, dynamic>?;
    return Atividade(
      id: json['id'] as String,
      tipo: TipoAtividade.deJson(json['tipo']),
      autor: AutorSnapshot.fromJson(json['autor'] as Map<String, dynamic>),
      livro: LivroSnapshot.fromJson(json['livro'] as Map<String, dynamic>),
      resenha: resenha == null ? null : ResenhaSnapshot.fromJson(resenha),
      criadoEm: DateTime.parse(json['criadoEm'] as String),
      totalCurtidas: (json['totalCurtidas'] as num?)?.toInt() ?? 0,
      totalComentarios: (json['totalComentarios'] as num?)?.toInt() ?? 0,
      curtidaPeloSolicitante: json['curtidaPeloSolicitante'] as bool? ?? false,
    );
  }

  Atividade copiar({int? totalCurtidas, int? totalComentarios, bool? curtidaPeloSolicitante}) =>
      Atividade(
        id: id,
        tipo: tipo,
        autor: autor,
        livro: livro,
        resenha: resenha,
        criadoEm: criadoEm,
        totalCurtidas: totalCurtidas ?? this.totalCurtidas,
        totalComentarios: totalComentarios ?? this.totalComentarios,
        curtidaPeloSolicitante: curtidaPeloSolicitante ?? this.curtidaPeloSolicitante,
      );
}

class Mencao {
  final int posicao;
  final int comprimento;
  final String username;

  const Mencao({required this.posicao, required this.comprimento, required this.username});

  factory Mencao.fromJson(Map<String, dynamic> json) => Mencao(
    posicao: (json['posicao'] as num).toInt(),
    comprimento: (json['comprimento'] as num).toInt(),
    username: json['username'] as String,
  );
}

/// Schema `Comentario`: raiz ou resposta, nunca um terceiro nível (RN-10).
class Comentario {
  final String id;
  final String? comentarioRaizId;
  final AutorSnapshot autor;
  final String texto;
  final List<Mencao> mencoes;
  final bool resposta;
  final int totalRespostas;
  final bool meu;
  final bool editado;
  final DateTime criadoEm;

  const Comentario({
    required this.id,
    required this.comentarioRaizId,
    required this.autor,
    required this.texto,
    this.mencoes = const <Mencao>[],
    required this.resposta,
    required this.totalRespostas,
    this.meu = false,
    this.editado = false,
    required this.criadoEm,
  });

  factory Comentario.fromJson(Map<String, dynamic> json) => Comentario(
    id: json['id'] as String,
    comentarioRaizId: json['comentarioRaizId'] as String?,
    autor: AutorSnapshot.fromJson(json['autor'] as Map<String, dynamic>),
    texto: json['texto'] as String,
    mencoes: (json['mencoes'] as List<dynamic>? ?? const <dynamic>[])
        .map((bruto) => Mencao.fromJson(bruto as Map<String, dynamic>))
        .toList(),
    resposta: json['nivel'] == 'RESPOSTA',
    totalRespostas: (json['totalRespostas'] as num?)?.toInt() ?? 0,
    meu: json['pertenceAoSolicitante'] as bool? ?? false,
    editado: json['editado'] as bool? ?? false,
    criadoEm: DateTime.parse(json['criadoEm'] as String),
  );
}

class ListaRespostas {
  final List<Comentario> itens;
  final String? proximoCursor;
  final bool temMais;

  const ListaRespostas({required this.itens, required this.proximoCursor, required this.temMais});
}

class EstadoCurtida {
  final int totalCurtidas;

  const EstadoCurtida({required this.totalCurtidas});
}

class SocialService {
  final ApiClient _api;

  SocialService(this._api);

  static String _id(String id) => Uri.encodeComponent(id);

  /// O `social` pagina com `itens/pagina/totalItens/totalPaginas`; a lista do app espera a
  /// [Pagina] de F-PERFIL.
  static Pagina<T> _pagina<T>(Map<String, dynamic> json, T Function(Map<String, dynamic>) item) =>
      Pagina<T>(
        itens: (json['itens'] as List<dynamic>? ?? const <dynamic>[])
            .map((bruto) => item(bruto as Map<String, dynamic>))
            .toList(),
        pagina: (json['pagina'] as num?)?.toInt() ?? 0,
        totalElementos: (json['totalItens'] as num?)?.toInt() ?? 0,
        totalPaginas: (json['totalPaginas'] as num?)?.toInt() ?? 0,
      );

  Future<Pagina<Atividade>> listarFeed(int pagina) async => _pagina(
    await _api.getJson('/feed?page=$pagina&size=$tamanhoDaPagina'),
    Atividade.fromJson,
  );

  Future<Atividade> obterAtividade(String id) async =>
      Atividade.fromJson(await _api.getJson('/atividades/${_id(id)}'));

  Future<EstadoCurtida> curtir(String id, {required String idempotencyKey}) async {
    final json = await _api.postJson('/atividades/${_id(id)}/curtir', idempotencyKey: idempotencyKey);
    return EstadoCurtida(totalCurtidas: (json['totalCurtidas'] as num).toInt());
  }

  Future<void> descurtir(String id, {required String idempotencyKey}) =>
      _api.deleteVazio('/atividades/${_id(id)}/curtir', idempotencyKey: idempotencyKey);

  Future<Pagina<Comentario>> listarComentariosRaiz(String atividadeId, int pagina) async => _pagina(
    await _api.getJson(
      '/atividades/${_id(atividadeId)}/comentarios?page=$pagina&size=$tamanhoDaPagina',
    ),
    Comentario.fromJson,
  );

  Future<ListaRespostas> listarRespostas(String comentarioRaizId, {String? cursor}) async {
    final parametros = <String, String>{'limit': '$tamanhoDaPagina', 'cursor': ?cursor};
    final json = await _api.getJson(
      Uri(path: '/comentarios/${_id(comentarioRaizId)}/respostas', queryParameters: parametros)
          .toString(),
    );
    return ListaRespostas(
      itens: (json['itens'] as List<dynamic>? ?? const <dynamic>[])
          .map((bruto) => Comentario.fromJson(bruto as Map<String, dynamic>))
          .toList(),
      proximoCursor: json['proximoCursor'] as String?,
      temMais: json['temMais'] as bool? ?? false,
    );
  }

  /// Com [comentarioRespondidoId], é resposta: o servidor deriva a raiz e quem foi respondido
  /// a partir do alvo, nunca da menção no texto (RN-10).
  Future<Comentario> comentar(
    String atividadeId, {
    required String texto,
    String? comentarioRespondidoId,
    required String idempotencyKey,
  }) async => Comentario.fromJson(
    await _api.postJson(
      '/atividades/${_id(atividadeId)}/comentarios',
      body: <String, Object?>{'texto': texto, 'comentarioRespondidoId': ?comentarioRespondidoId},
      idempotencyKey: idempotencyKey,
    ),
  );

  Future<Comentario> editarComentario(
    String comentarioId, {
    required String texto,
    required String idempotencyKey,
  }) async => Comentario.fromJson(
    await _api.patchJson(
      '/comentarios/${_id(comentarioId)}',
      body: <String, Object?>{'texto': texto},
      idempotencyKey: idempotencyKey,
    ),
  );

  Future<void> excluirComentario(String comentarioId, {required String idempotencyKey}) =>
      _api.deleteVazio('/comentarios/${_id(comentarioId)}', idempotencyKey: idempotencyKey);
}
