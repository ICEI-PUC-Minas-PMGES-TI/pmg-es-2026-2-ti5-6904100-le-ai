import '../../core/network/api_client.dart';
import '../../core/session/session_controller.dart';

/// Contrato do serviço `identidade`. Espelha `docs/api/identidade.yaml` e o `authService` da
/// web: mesmos campos, mesmas rotas.
class UsuarioResposta {
  final String id;
  final String username;
  final String displayName;

  /// Só em `GET /me` (`UsuarioProprio`): o e-mail do próprio dono, que Configurações mostra. O
  /// 201 do cadastro não o traz.
  final String? email;

  const UsuarioResposta({
    required this.id,
    required this.username,
    required this.displayName,
    this.email,
  });

  factory UsuarioResposta.fromJson(Map<String, dynamic> json) {
    return UsuarioResposta(
      id: json['id'] as String,
      username: json['username'] as String,
      displayName: json['displayName'] as String,
      email: json['email'] as String?,
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

  /// Pede o link de recuperação (RF-AUT-04). O servidor responde o mesmo `202` exista ou não a
  /// conta; a tela também não pode diferenciar (RNF-SEC-28). Chave nova por pedido: "Enviar de
  /// novo" é outra intenção, e a mesma chave não reenviaria.
  Future<void> solicitarRecuperacao(String email) async {
    await client.postJson(
      '/auth/password/forgot',
      body: <String, String>{'email': email},
      idempotencyKey: ApiClient.newIdempotencyKey(),
      anonimo: true,
    );
  }

  /// Redefine a senha pelo token do link. `410` é link desconhecido, vencido ou usado, sempre
  /// com a mesma mensagem; `400` é a senha nova.
  Future<void> redefinirSenha({
    required String token,
    required String novaSenha,
    required String idempotencyKey,
  }) async {
    await client.postJson(
      '/auth/password/reset',
      body: <String, String>{'token': token, 'novaSenha': novaSenha},
      idempotencyKey: idempotencyKey,
      anonimo: true,
    );
  }

  /// Troca a senha (RF-AUT-05). O servidor revoga **todas** as renovações da conta, inclusive a
  /// deste aparelho, então a sessão daqui é refeita com um login pela senha nova: é o que cumpre
  /// o "aqui você continua conectado" de alterar-senha.md §4.6 sem mudar o contrato. O username
  /// vem do `/me` antes da troca, porque a sessão do mobile guarda só os tokens.
  ///
  /// Devolve a sessão nova, ou `null` se o login depois da troca falhar: a troca já aconteceu e
  /// não é desfeita, e a sessão daqui termina quando o token de acesso vencer.
  Future<SessaoResposta?> alterarSenha({
    required String senhaAtual,
    required String novaSenha,
    required String idempotencyKey,
  }) async {
    final usuario = await buscarUsuarioAtual();
    await client.postJson(
      '/auth/password/change',
      body: <String, String>{'senhaAtual': senhaAtual, 'novaSenha': novaSenha},
      idempotencyKey: idempotencyKey,
    );
    try {
      return await entrar(identificador: usuario.username, senha: novaSenha);
    } on ApiException {
      return null;
    }
  }
}
