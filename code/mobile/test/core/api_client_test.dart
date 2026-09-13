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
}
