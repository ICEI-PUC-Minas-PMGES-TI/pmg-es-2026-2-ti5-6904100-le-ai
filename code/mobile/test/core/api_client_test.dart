import 'dart:convert';

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

  group('escritas idempotentes e retentativa (RNF-ERR-03/04)', () {
    ApiClient semEspera(MockClient client) => ApiClient(
      baseUrl: 'https://api.example.com',
      client: client,
      esperasDeRetentativa: const <Duration>[Duration.zero, Duration.zero],
    );

    test(
      'envia Idempotency-Key e reusa a mesma chave e correlation-id ao retentar 503',
      () async {
        final chaves = <String?>[];
        final correlations = <String?>[];
        final client = MockClient((request) async {
          chaves.add(request.headers['Idempotency-Key']);
          correlations.add(request.headers['X-Correlation-Id']);
          return chaves.length < 3
              ? http.Response('', 503)
              : http.Response('{"id":"x"}', 201);
        });

        final json = await semEspera(client).postJson(
          '/livros/pessoal',
          body: <String, Object>{'titulo': 't'},
          idempotencyKey: 'chave-1',
        );

        expect(json['id'], 'x');
        expect(chaves, <String>['chave-1', 'chave-1', 'chave-1']);
        expect(correlations.toSet(), hasLength(1));
      },
    );

    test('POST sem chave nunca é retentado', () async {
      var chamadas = 0;
      final client = MockClient((request) async {
        chamadas++;
        return http.Response('', 503);
      });

      await expectLater(
        () =>
            semEspera(client).postJson('/auth/login', body: <String, Object>{}),
        throwsA(isA<ApiException>().having((e) => e.status, 'status', 503)),
      );
      expect(chamadas, 1);
    });

    test('GET é retentado depois de falha de rede', () async {
      var chamadas = 0;
      final client = MockClient((request) async {
        chamadas++;
        if (chamadas == 1) {
          throw http.ClientException('conexão recusada');
        }
        return http.Response('{"ok":true}', 200);
      });

      final json = await semEspera(client).getJson('/livros/importacoes/1');

      expect(json['ok'], isTrue);
      expect(chamadas, 2);
    });

    test('4xx não é retentado mesmo com chave', () async {
      var chamadas = 0;
      final client = MockClient((request) async {
        chamadas++;
        return http.Response(
          '{"codigo":"CONFLITO","mensagem":"Já existe.","correlationId":"c"}',
          409,
        );
      });

      await expectLater(
        () =>
            semEspera(client).postJson('/livros/oficial', idempotencyKey: 'k'),
        throwsA(isA<ApiException>()),
      );
      expect(chamadas, 1);
    });

    test(
      'PATCH e DELETE usam o método certo e o DELETE aceita 204 sem corpo',
      () async {
        final metodos = <String>[];
        final client = MockClient((request) async {
          metodos.add(request.method);
          return request.method == 'DELETE'
              ? http.Response('', 204)
              : http.Response('{"titulo":"novo"}', 200);
        });
        final api = semEspera(client);

        final json = await api.patchJson(
          '/livros/pessoal/1',
          body: <String, Object>{'titulo': 'novo'},
          idempotencyKey: 'k1',
        );
        await api.deleteVazio('/livros/pessoal/1', idempotencyKey: 'k2');

        expect(json['titulo'], 'novo');
        expect(metodos, <String>['PATCH', 'DELETE']);
      },
    );
  });

  test('erro carrega status, livroId do 409 e campos do 400', () async {
    final client = MockClient((request) async {
      if (request.url.path.endsWith('oficial')) {
        return http.Response(
          '{"codigo":"CONFLITO","mensagem":"Já está no acervo.","correlationId":"c","livroId":"livro-1"}',
          409,
        );
      }
      return http.Response(
        '{"codigo":"REQUISICAO_INVALIDA","mensagem":"Confira.","correlationId":"c","campos":[{"campo":"titulo","mensagem":"Informe o título do livro."}]}',
        400,
      );
    });
    final api = ApiClient(baseUrl: 'https://api.example.com', client: client);

    await expectLater(
      () => api.postJson('/livros/oficial', idempotencyKey: 'k'),
      throwsA(
        isA<ApiException>()
            .having((e) => e.status, 'status', 409)
            .having((e) => e.livroId, 'livroId', 'livro-1'),
      ),
    );
    await expectLater(
      () => api.postJson('/livros/pessoal', idempotencyKey: 'k'),
      throwsA(
        isA<ApiException>().having((e) => e.campos, 'campos', <String, String>{
          'titulo': 'Informe o título do livro.',
        }),
      ),
    );
  });

  group('renovação no 401', () {
    http.Response naoAutenticado() => http.Response(
      '{"codigo":"NAO_AUTENTICADO","mensagem":"Sessão expirada.","correlationId":"c1"}',
      401,
    );

    test('renova e repete uma vez com o token novo', () async {
      var token = 'jwt-vencido';
      final autorizacoes = <String?>[];
      final client = MockClient((request) async {
        autorizacoes.add(request.headers['Authorization']);
        return autorizacoes.length == 1 ? naoAutenticado() : http.Response('{"ok":true}', 200);
      });
      final api = ApiClient(
        baseUrl: 'https://api.example.com',
        client: client,
        getToken: () => token,
        renovarSessao: (tokenQueFalhou) async {
          expect(tokenQueFalhou, 'jwt-vencido');
          token = 'jwt-renovado';
          return true;
        },
      );

      expect(await api.getJson('/me'), <String, dynamic>{'ok': true});
      expect(autorizacoes, <String?>['Bearer jwt-vencido', 'Bearer jwt-renovado']);
    });

    test('renovação recusada devolve o 401 sem repetir', () async {
      var chamadas = 0;
      final client = MockClient((request) async {
        chamadas++;
        return naoAutenticado();
      });
      final api = ApiClient(
        baseUrl: 'https://api.example.com',
        client: client,
        getToken: () => 'jwt-vencido',
        renovarSessao: (_) async => false,
      );

      await expectLater(
        api.getJson('/me'),
        throwsA(isA<ApiException>().having((erro) => erro.status, 'status', 401)),
      );
      expect(chamadas, 1);
    });

    test('repete uma vez só: 401 depois de renovar volta como erro', () async {
      var chamadas = 0;
      var renovacoes = 0;
      final client = MockClient((request) async {
        chamadas++;
        return naoAutenticado();
      });
      final api = ApiClient(
        baseUrl: 'https://api.example.com',
        client: client,
        getToken: () => 'sempre-recusado',
        renovarSessao: (_) async {
          renovacoes++;
          return true;
        },
      );

      await expectLater(api.getJson('/me'), throwsA(isA<ApiException>()));
      expect(chamadas, 2);
      expect(renovacoes, 1);
    });

    test('Authorization explícito não renova', () async {
      var renovacoes = 0;
      final api = ApiClient(
        baseUrl: 'https://api.example.com',
        client: MockClient((request) async => naoAutenticado()),
        getToken: () => 'da-sessao',
        renovarSessao: (_) async {
          renovacoes++;
          return true;
        },
      );

      await expectLater(
        api.getJson('/me', headers: <String, String>{'Authorization': 'Bearer explicito'}),
        throwsA(isA<ApiException>()),
      );
      expect(renovacoes, 0);
    });
  });

  test('anonimo manda sem o token da sessão e não renova', () async {
    String? autorizacao = 'não chamado';
    var renovacoes = 0;
    final api = ApiClient(
      baseUrl: 'https://api.example.com',
      client: MockClient((request) async {
        autorizacao = request.headers['Authorization'];
        return http.Response(
          '{"codigo":"NAO_AUTENTICADO","mensagem":"x","correlationId":"c1"}',
          401,
        );
      }),
      getToken: () => 'jwt-vencido',
      renovarSessao: (_) async {
        renovacoes++;
        return true;
      },
    );

    await expectLater(
      api.postJson('/auth/logout', body: <String, String>{'refreshToken': 'r'}, anonimo: true),
      throwsA(isA<ApiException>()),
    );
    expect(autorizacao, isNull);
    expect(renovacoes, 0);
  });

  group('abrirFluxo (SSE)', () {
    MockClient streaming(Future<http.StreamedResponse> Function(http.BaseRequest) responder) =>
        MockClient.streaming((request, _) => responder(request));

    http.StreamedResponse resposta(int status, String corpo) =>
        http.StreamedResponse(Stream<List<int>>.value(utf8.encode(corpo)), status);

    test('abre com o token da sessao no cabecalho e devolve o corpo como stream', () async {
      late http.BaseRequest enviada;
      final api = ApiClient(
        baseUrl: 'https://social.example.com',
        client: streaming((request) async {
          enviada = request;
          return resposta(200, 'event:sincronizacao\ndata:{}\n\n');
        }),
        getToken: () => 'token-atual',
      );

      final corpo = await api.abrirFluxo('/notificacoes/tempo-real');

      expect(await utf8.decodeStream(corpo), contains('sincronizacao'));
      expect(enviada.method, 'GET');
      expect(enviada.url.toString(), 'https://social.example.com/notificacoes/tempo-real');
      expect(enviada.url.query, isEmpty);
      expect(enviada.headers['Authorization'], 'Bearer token-atual');
      expect(enviada.headers['Accept'], 'text/event-stream');
    });

    test('token vencido renova a sessao uma vez e reabre com o token novo', () async {
      var token = 'vencido';
      final autorizacoes = <String?>[];
      final api = ApiClient(
        baseUrl: 'https://social.example.com',
        client: streaming((request) async {
          autorizacoes.add(request.headers['Authorization']);
          return request.headers['Authorization'] == 'Bearer novo'
              ? resposta(200, '')
              : resposta(401, '{"codigo":"NAO_AUTENTICADO","mensagem":"Sessão expirada."}');
        }),
        getToken: () => token,
        renovarSessao: (falhou) async {
          expect(falhou, 'vencido');
          token = 'novo';
          return true;
        },
      );

      await api.abrirFluxo('/notificacoes/tempo-real');

      expect(autorizacoes, <String>['Bearer vencido', 'Bearer novo']);
    });

    test('sessao que nao renova vira ApiException 401 com o codigo do corpo', () async {
      final api = ApiClient(
        baseUrl: 'https://social.example.com',
        client: streaming(
          (_) async =>
              resposta(401, '{"codigo":"NAO_AUTENTICADO","mensagem":"Sessão expirada."}'),
        ),
        getToken: () => 'vencido',
        renovarSessao: (_) async => false,
      );

      await expectLater(
        api.abrirFluxo('/notificacoes/tempo-real'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.status, 'status', 401)
              .having((e) => e.codigo, 'codigo', 'NAO_AUTENTICADO'),
        ),
      );
    });

    test('falha de rede na abertura vira ApiException de rede', () async {
      final api = ApiClient(
        baseUrl: 'https://social.example.com',
        client: streaming((_) async => throw http.ClientException('sem rede')),
      );

      await expectLater(
        api.abrirFluxo('/notificacoes/tempo-real'),
        throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiFailureKind.network)),
      );
    });
  });
}
