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
}
