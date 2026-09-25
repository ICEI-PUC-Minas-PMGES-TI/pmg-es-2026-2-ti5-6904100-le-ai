import '../../core/network/api_client.dart';

/// Perfil e grafo de seguidores no serviço `identidade` (F-PERFIL, RF-SOC-01..08). Espelha os
/// schemas de `docs/api/identidade.yaml` e o `services/perfil.ts` da web. Toda escrita exige
/// `Idempotency-Key`, e quem guarda a chave da intenção é a tela.

enum Privacidade {
  publico,
  privado;

  static Privacidade deJson(Object? bruto) => bruto == 'privado' ? privado : publico;

  String get json => name;
}

class Avatar {
  final String url;
  final String publicId;

  const Avatar({required this.url, required this.publicId});

  Map<String, Object?> paraJson() => <String, Object?>{'url': url, 'publicId': publicId};

  @override
  bool operator ==(Object other) => other is Avatar && other.url == url && other.publicId == publicId;

  @override
  int get hashCode => Object.hash(url, publicId);
}

/// Schema `Perfil`: o `PerfilResumo` (identidade pública, privacidade, `conteudoRestrito` e a
/// relação com quem pergunta) mais biografia e contadores.
class Perfil {
  final String id;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final Privacidade privacidade;
  final bool conteudoRestrito;
  final String relacao;
  final String? biografia;
  final int seguidores;
  final int seguidos;

  const Perfil({
    required this.id,
    required this.username,
    required this.displayName,
    required this.avatarUrl,
    required this.privacidade,
    required this.conteudoRestrito,
    required this.relacao,
    required this.biografia,
    required this.seguidores,
    required this.seguidos,
  });

  factory Perfil.fromJson(Map<String, dynamic> json) {
    final contadores = json['contadores'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    return Perfil(
      id: json['id'] as String,
      username: json['username'] as String,
      displayName: json['displayName'] as String,
      avatarUrl: json['avatarUrl'] as String?,
      privacidade: Privacidade.deJson(json['privacidade']),
      conteudoRestrito: json['conteudoRestrito'] as bool? ?? false,
      relacao: json['relacao'] as String? ?? 'nenhuma',
      biografia: json['biografia'] as String?,
      seguidores: (contadores['seguidores'] as num?)?.toInt() ?? 0,
      seguidos: (contadores['seguidos'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Relações do schema `RelacaoPerfil`.
abstract final class Relacao {
  static const String proprio = 'proprio';
  static const String nenhuma = 'nenhuma';
  static const String seguindo = 'seguindo';
  static const String solicitacaoEnviada = 'solicitacao_enviada';
  static const String solicitacaoRecebida = 'solicitacao_recebida';
}

/// Schema `PerfilResumo`: o que busca, listas e caixa de pedidos devolvem. Sem biografia.
class PerfilResumo {
  final String id;
  final String username;
  final String displayName;
  final String? avatarUrl;
  final Privacidade privacidade;
  final bool conteudoRestrito;
  final String relacao;

  const PerfilResumo({
    required this.id,
    required this.username,
    required this.displayName,
    required this.avatarUrl,
    required this.privacidade,
    required this.conteudoRestrito,
    required this.relacao,
  });

  factory PerfilResumo.fromJson(Map<String, dynamic> json) => PerfilResumo(
    id: json['id'] as String,
    username: json['username'] as String,
    displayName: json['displayName'] as String,
    avatarUrl: json['avatarUrl'] as String?,
    privacidade: Privacidade.deJson(json['privacidade']),
    conteudoRestrito: json['conteudoRestrito'] as bool? ?? false,
    relacao: json['relacao'] as String? ?? Relacao.nenhuma,
  );
}

class SolicitacaoSeguir {
  final String id;
  final PerfilResumo solicitante;
  final DateTime criadaEm;

  const SolicitacaoSeguir({required this.id, required this.solicitante, required this.criadaEm});

  factory SolicitacaoSeguir.fromJson(Map<String, dynamic> json) => SolicitacaoSeguir(
    id: json['id'] as String,
    solicitante: PerfilResumo.fromJson(json['solicitante'] as Map<String, dynamic>),
    criadaEm: DateTime.parse(json['criadaEm'] as String),
  );
}

/// Schemas `PaginaPerfis` e `PaginaSolicitacoes`: página a partir de zero, até 50 itens.
class Pagina<T> {
  final List<T> itens;
  final int pagina;
  final int totalElementos;
  final int totalPaginas;

  const Pagina({
    required this.itens,
    required this.pagina,
    required this.totalElementos,
    required this.totalPaginas,
  });

  factory Pagina.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) item) =>
      Pagina<T>(
        itens: (json['items'] as List<dynamic>? ?? const <dynamic>[])
            .map((bruto) => item(bruto as Map<String, dynamic>))
            .toList(),
        pagina: (json['page'] as num?)?.toInt() ?? 0,
        totalElementos: (json['totalElements'] as num?)?.toInt() ?? 0,
        totalPaginas: (json['totalPages'] as num?)?.toInt() ?? 0,
      );
}

/// Padrão do contrato; o servidor aceita até 50.
const int tamanhoDaPagina = 20;

/// Substituição: os quatro campos vão sempre, e `avatar` nulo remove a foto.
class EditarPerfil {
  final String displayName;
  final String? biografia;
  final Avatar? avatar;
  final Privacidade privacidade;

  const EditarPerfil({
    required this.displayName,
    required this.biografia,
    required this.avatar,
    required this.privacidade,
  });

  Map<String, Object?> paraJson() => <String, Object?>{
    'displayName': displayName,
    'biografia': biografia,
    'avatar': avatar?.paraJson(),
    'privacidade': privacidade.json,
  };
}

class PerfilService {
  final ApiClient _api;

  PerfilService(this._api);

  Future<Perfil> obterMeuPerfil() async => Perfil.fromJson(await _api.getJson('/me/perfil'));

  Future<Perfil> atualizarMeuPerfil(EditarPerfil dados, {required String idempotencyKey}) async {
    return Perfil.fromJson(
      await _api.putJson('/me/perfil', body: dados.paraJson(), idempotencyKey: idempotencyKey),
    );
  }

  static String _username(String username) => Uri.encodeComponent(username);

  /// Zero ou um perfil: o servidor só compara o username inteiro (RNF-SEC-19/44).
  Future<List<PerfilResumo>> buscarPorUsername(String username) async {
    final lista = await _api.getJsonLista('/perfis?username=${_username(username)}');
    return lista.map((bruto) => PerfilResumo.fromJson(bruto as Map<String, dynamic>)).toList();
  }

  Future<Perfil> obterPerfil(String username) async =>
      Perfil.fromJson(await _api.getJson('/perfis/${_username(username)}'));

  /// `true` quando já segue; `false` quando virou pedido pendente (perfil privado).
  Future<bool> seguir(String username, {required String idempotencyKey}) async {
    final resultado = await _api.postJson(
      '/perfis/${_username(username)}/seguir',
      idempotencyKey: idempotencyKey,
    );
    return resultado['estado'] == 'seguindo';
  }

  Future<void> deixarDeSeguir(String username, {required String idempotencyKey}) =>
      _api.deleteVazio('/perfis/${_username(username)}/seguir', idempotencyKey: idempotencyKey);

  Future<void> removerSeguidor(String username, {required String idempotencyKey}) =>
      _api.deleteVazio('/seguidores/${_username(username)}', idempotencyKey: idempotencyKey);

  Future<Pagina<PerfilResumo>> listarSeguidores(int pagina, {int tamanho = tamanhoDaPagina}) async =>
      Pagina.fromJson(
        await _api.getJson('/me/seguidores?page=$pagina&size=$tamanho'),
        PerfilResumo.fromJson,
      );

  Future<Pagina<PerfilResumo>> listarSeguidos(int pagina, {int tamanho = tamanhoDaPagina}) async =>
      Pagina.fromJson(
        await _api.getJson('/me/seguidos?page=$pagina&size=$tamanho'),
        PerfilResumo.fromJson,
      );

  Future<Pagina<SolicitacaoSeguir>> listarSolicitacoes(
    int pagina, {
    int tamanho = tamanhoDaPagina,
  }) async => Pagina.fromJson(
    await _api.getJson('/solicitacoes?page=$pagina&size=$tamanho'),
    SolicitacaoSeguir.fromJson,
  );

  Future<void> aceitarSolicitacao(String id, {required String idempotencyKey}) async {
    await _api.postJson(
      '/solicitacoes/${Uri.encodeComponent(id)}/aceitar',
      idempotencyKey: idempotencyKey,
    );
  }

  Future<void> recusarSolicitacao(String id, {required String idempotencyKey}) async {
    await _api.postJson(
      '/solicitacoes/${Uri.encodeComponent(id)}/recusar',
      idempotencyKey: idempotencyKey,
    );
  }
}
