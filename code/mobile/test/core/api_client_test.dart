import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:le_ai_mobile/core/network/api_client.dart';

void main() {
  test('envia X-Correlation-Id e resolve o caminho relativo', () async {
    final client = MockClient((request) async {
      expect(request.url.toString(), 'https://api.example.com/health');
      expect(request.headers['X-Correlation-Id'], 'correlation-test');
      return http.Response('{}', 200);
    });
    final api = ApiClient(baseUrl: 'https://api.example.com/', client: client);

    final response = await api.get(
      '/health',
      correlationId: 'correlation-test',
    );

    expect(response.statusCode, 200);
  });

  test('classifica timeout como cold start', () async {
    final client = MockClient((request) async {
      await Future<void>.delayed(const Duration(milliseconds: 20));
      return http.Response('{}', 200);
    });
    final api = ApiClient(
      baseUrl: 'https://api.example.com',
      client: client,
      timeout: const Duration(milliseconds: 1),
    );

    expect(
      () => api.get('/health', correlationId: 'correlation-timeout'),
      throwsA(
        isA<ApiException>().having(
          (error) => error.kind,
          'kind',
          ApiFailureKind.coldStart,
        ),
      ),
    );
  });

  test('post monta o corpo em JSON e o cabeçalho Content-Type', () async {
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.toString(), 'https://api.example.com/auth/login');
      expect(request.headers['Content-Type'], 'application/json');
      expect(request.body, '{"identificador":"marinableu","senha":"segredo"}');
      return http.Response('{"accessToken":"jwt"}', 200);
    });
    final api = ApiClient(baseUrl: 'https://api.example.com', client: client);

    final response = await api.post(
      '/auth/login',
      body: {'identificador': 'marinableu', 'senha': 'segredo'},
    );

    expect(response.statusCode, 200);
  });

  test('injeta Authorization quando getToken devolve um token', () async {
    final client = MockClient((request) async {
      expect(request.headers['Authorization'], 'Bearer token-fixo');
      return http.Response('{}', 200);
    });
    final api = ApiClient(
      baseUrl: 'https://api.example.com',
      client: client,
      getToken: () => 'token-fixo',
    );

    await api.get('/me');
  });

  test('não envia Authorization quando getToken devolve null', () async {
    final client = MockClient((request) async {
      expect(request.headers.containsKey('Authorization'), isFalse);
      return http.Response('{}', 200);
    });
    final api = ApiClient(
      baseUrl: 'https://api.example.com',
      client: client,
      getToken: () => null,
    );

    await api.get('/health');
  });

  test('preserva um Authorization explícito da chamada em vez do getToken', () async {
    final client = MockClient((request) async {
      expect(request.headers['Authorization'], 'Bearer token-explicito');
      return http.Response('{}', 200);
    });
    final api = ApiClient(
      baseUrl: 'https://api.example.com',
      client: client,
      getToken: () => 'token-da-sessao',
    );

    await api.get('/me', headers: {'Authorization': 'Bearer token-explicito'});
  });

  test('postJson decodifica a resposta em Map', () async {
    final client = MockClient((request) async {
      return http.Response('{"accessToken":"jwt","expiresIn":900}', 200);
    });
    final api = ApiClient(baseUrl: 'https://api.example.com', client: client);

    final json = await api.postJson(
      '/auth/login',
      body: {'identificador': 'marinableu', 'senha': 'segredo'},
    );

    expect(json['accessToken'], 'jwt');
    expect(json['expiresIn'], 900);
  });

  test('erro 4xx/5xx com corpo padrão carrega codigo, mensagem e correlationId do servidor', () async {
    final client = MockClient((request) async {
      return http.Response(
        '{"codigo":"CONFLITO","mensagem":"Esse nome de usuário já está em uso. Escolha outro.","correlationId":"c-1"}',
        409,
      );
    });
    final api = ApiClient(baseUrl: 'https://api.example.com', client: client);

    await expectLater(
      () => api.postJson('/auth/register', body: {}),
      throwsA(
        isA<ApiException>()
            .having((erro) => erro.codigo, 'codigo', 'CONFLITO')
            .having(
              (erro) => erro.message,
              'message',
              'Esse nome de usuário já está em uso. Escolha outro.',
            )
            .having((erro) => erro.correlationId, 'correlationId', 'c-1'),
      ),
    );
  });

  test('erro sem corpo reconhecível cai na mensagem genérica, sem codigo', () async {
    final client = MockClient((request) async {
      return http.Response('<html>502 Bad Gateway</html>', 502);
    });
    final api = ApiClient(baseUrl: 'https://api.example.com', client: client);

    await expectLater(
      () => api.postJson('/auth/login', body: {}),
      throwsA(
        isA<ApiException>()
            .having((erro) => erro.codigo, 'codigo', isNull)
            .having(
              (erro) => erro.message,
              'message',
              'O serviço respondeu com um status inesperado.',
            ),
      ),
    );
  });
}
