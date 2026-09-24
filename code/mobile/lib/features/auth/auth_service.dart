import '../../core/network/api_client.dart';
import '../../core/session/session_controller.dart';

/// Contrato do serviço `identidade`. Espelha `docs/api/identidade.yaml` e o `authService` da
/// web: mesmos campos, mesmas rotas.
class UsuarioResposta {
  final String id;
  final String username;
  final String displayName;

  const UsuarioResposta({
    required this.id,
    required this.username,
    required this.displayName,
  });

  factory UsuarioResposta.fromJson(Map<String, dynamic> json) {
    return UsuarioResposta(
      id: json['id'] as String,
      username: json['username'] as String,
      displayName: json['displayName'] as String,
    );
  }
}

/// `Sessao` do contrato: acesso de 15 minutos e renovação rotativa (RF-AUT-03).
class SessaoResposta {
  final String accessToken;
  final String tokenType;
  final int expiresIn;
  final String refreshToken;

  const SessaoResposta({
    required this.accessToken,
    required this.tokenType,
    required this.expiresIn,
    required this.refreshToken,
  });

  factory SessaoResposta.fromJson(Map<String, dynamic> json) {
    return SessaoResposta(
      accessToken: json['accessToken'] as String,
      tokenType: json['tokenType'] as String,
      expiresIn: json['expiresIn'] as int,
      refreshToken: json['refreshToken'] as String,
    );
  }

  TokensDaSessao get tokens =>
      TokensDaSessao(accessToken: accessToken, refreshToken: refreshToken);
}

/// Fina camada sobre [ApiClient]: monta os corpos das rotas de `/auth` e decodifica a resposta
/// em DTO tipado. Ao contrário da web, `entrar` não busca `/me` em seguida: `SessionController`
/// guarda só os tokens, não o usuário.
///
/// As rotas públicas vão com `anonimo: true`, sem o token da sessão: o Spring Security recusa
/// token vencido com `401` mesmo em rota aberta.
class AuthService {
  final ApiClient client;

  const AuthService(this.client);

  /// A chave é de quem chama: a tela a guarda e a repete ao reenviar o mesmo formulário, para
  /// um cadastro que deu certo no servidor mas perdeu a resposta não virar `409`.
  Future<UsuarioResposta> cadastrar({
    required String email,
    required String username,
    required String displayName,
    required String dataNascimento,
    required String senha,
    required String idempotencyKey,
  }) async {
    final json = await client.postJson(
      '/auth/register',
      body: <String, String>{
        'email': email,
        'username': username,
        'displayName': displayName,
        'dataNascimento': dataNascimento,
        'senha': senha,
      },
      idempotencyKey: idempotencyKey,
      anonimo: true,
    );
    return UsuarioResposta.fromJson(json);
  }

  Future<SessaoResposta> entrar({
    required String identificador,
    required String senha,
  }) async {
    final json = await client.postJson(
      '/auth/login',
      body: <String, String>{'identificador': identificador, 'senha': senha},
      idempotencyKey: ApiClient.newIdempotencyKey(),
      anonimo: true,
    );
    return SessaoResposta.fromJson(json);
  }

  /// `POST /auth/refresh`. Uma chave por renovação: as retentativas do cliente a repetem, e o
  /// servidor devolve a mesma sessão em vez de contar como reuso.
  Future<TokensDaSessao> renovar(String refreshToken) async {
    final json = await client.postJson(
      '/auth/refresh',
      body: <String, String>{'refreshToken': refreshToken},
      idempotencyKey: ApiClient.newIdempotencyKey(),
      anonimo: true,
    );
    return SessaoResposta.fromJson(json).tokens;
  }

  /// `POST /auth/logout`. Sempre `204` no servidor; quem limpa a sessão local é
  /// `SessionController.sairRevogando`.
  Future<void> revogar(String refreshToken) async {
    await client.postJson(
      '/auth/logout',
      body: <String, String>{'refreshToken': refreshToken},
      idempotencyKey: ApiClient.newIdempotencyKey(),
      anonimo: true,
    );
  }

  Future<UsuarioResposta> buscarUsuarioAtual() async {
    final json = await client.getJson('/me');
    return UsuarioResposta.fromJson(json);
  }
}
