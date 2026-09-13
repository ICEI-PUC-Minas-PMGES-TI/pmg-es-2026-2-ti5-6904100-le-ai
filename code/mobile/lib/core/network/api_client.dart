import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

enum ApiFailureKind { coldStart, network, invalidResponse }

class ApiException implements Exception {
  final ApiFailureKind kind;
  final String correlationId;
  final String message;

  const ApiException({
    required this.kind,
    required this.correlationId,
    required this.message,
  });

  @override
  String toString() => 'ApiException($kind, correlationId: $correlationId)';
}

class ApiClient {
  final http.Client _client;
  final Uri baseUri;
  final Duration timeout;

  ApiClient({
    required String baseUrl,
    http.Client? client,
    this.timeout = const Duration(seconds: 90),
  }) : baseUri = Uri.parse(baseUrl),
       _client = client ?? http.Client();

  Future<http.Response> get(
    String path, {
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final mergedHeaders = <String, String>{
      'Accept': 'application/json',
      'X-Correlation-Id': requestCorrelationId,
      ...headers,
    };

    try {
      final response = await _client
          .get(_resolve(path), headers: mergedHeaders)
          .timeout(timeout);
      return response;
    } on TimeoutException {
      throw ApiException(
        kind: ApiFailureKind.coldStart,
        correlationId: requestCorrelationId,
        message: 'O serviço está iniciando. Aguarde e tente novamente.',
      );
    } on Exception {
      throw ApiException(
        kind: ApiFailureKind.network,
        correlationId: requestCorrelationId,
        message: 'Não foi possível conectar ao serviço.',
      );
    }
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final response = await get(
      path,
      headers: headers,
      correlationId: requestCorrelationId,
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        kind: ApiFailureKind.invalidResponse,
        correlationId:
            response.headers['x-correlation-id'] ?? requestCorrelationId,
        message: 'O serviço respondeu com um status inesperado.',
      );
    }

    try {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } on FormatException {
      throw ApiException(
        kind: ApiFailureKind.invalidResponse,
        correlationId:
            response.headers['x-correlation-id'] ?? requestCorrelationId,
        message: 'O serviço retornou uma resposta inválida.',
      );
    }
  }

  Uri _resolve(String path) {
    final normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return baseUri.resolve(normalizedPath);
  }

  void close() => _client.close();

  static String newCorrelationId() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    final hex = bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0'));
    final value = hex.join();
    return '${value.substring(0, 8)}-${value.substring(8, 12)}-'
        '${value.substring(12, 16)}-${value.substring(16, 20)}-'
        '${value.substring(20)}';
  }
}
