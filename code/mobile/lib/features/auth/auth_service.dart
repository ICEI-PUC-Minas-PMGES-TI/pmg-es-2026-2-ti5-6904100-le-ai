import '../../core/network/api_client.dart';

/// Contrato do serviço `identidade` (P0-NAV — esqueleto de auth). Espelha
/// `docs/api/identidade.yaml` e o `authService` da web: mesmos campos, mesmas rotas.
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

class TokenResposta {
  final String accessToken;
  final String tokenType;
  final int expiresIn;

  const TokenResposta({
    required this.accessToken,
    required this.tokenType,
    required this.expiresIn,
  });

  factory TokenResposta.fromJson(Map<String, dynamic> json) {
    return TokenResposta(
      accessToken: json['accessToken'] as String,
      tokenType: json['tokenType'] as String,
      expiresIn: json['expiresIn'] as int,
    );
  }
}

/// Fina camada sobre [ApiClient]: monta os corpos de `/auth/register` e `/auth/login` e
/// decodifica a resposta em DTO tipado. Ao contrário da web, `entrar` não busca `/me` em
/// seguida — `SessionController` (Etapa 10) guarda só o token, não o usuário, então não há
/// nome de exibição para preencher ainda.
class AuthService {
  final ApiClient client;

  const AuthService(this.client);

  Future<UsuarioResposta> cadastrar({
    required String email,
    required String username,
    required String displayName,
    required String dataNascimento,
    required String senha,
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
    );
    return UsuarioResposta.fromJson(json);
  }

  Future<TokenResposta> entrar({
    required String identificador,
    required String senha,
  }) async {
    final json = await client.postJson(
      '/auth/login',
      body: <String, String>{'identificador': identificador, 'senha': senha},
    );
    return TokenResposta.fromJson(json);
  }

  Future<UsuarioResposta> buscarUsuarioAtual() async {
    final json = await client.getJson('/me');
    return UsuarioResposta.fromJson(json);
  }
}
