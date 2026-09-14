import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

enum ApiFailureKind { coldStart, network, invalidResponse }

class ApiException implements Exception {
  final ApiFailureKind kind;
  final String correlationId;
  final String message;

  /// Código do corpo de erro padrão do backend (`ErroResposta.codigo`: `CONFLITO`,
  /// `NAO_AUTENTICADO`, `MUITAS_REQUISICOES`...), quando a resposta seguiu o contrato
  /// (RNF-ERR-01). Nulo para timeout, falha de rede, ou corpo que não seguiu o contrato — é o
  /// que permite uma tela distinguir credencial inválida de bloqueio de conflito, em vez de um
  /// "status inesperado" genérico para tudo.
  final String? codigo;

  const ApiException({
    required this.kind,
    required this.correlationId,
    required this.message,
    this.codigo,
  });

  @override
  String toString() => 'ApiException($kind, correlationId: $correlationId)';
}

class ApiClient {
  final http.Client _client;
  final Uri baseUri;
  final Duration timeout;

  /// Token da sessão atual, se houver. Injetado como `Authorization: Bearer <token>` quando a
  /// chamada não define o cabeçalho por conta própria (P0-NAV).
  final String? Function()? getToken;

  ApiClient({
    required String baseUrl,
    http.Client? client,
    this.timeout = const Duration(seconds: 90),
    this.getToken,
  }) : baseUri = Uri.parse(baseUrl),
       _client = client ?? http.Client();

  Future<http.Response> get(
    String path, {
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final mergedHeaders = _headersFor(
      headers,
      requestCorrelationId,
      hasBody: false,
    );

    return _guarded(
      requestCorrelationId,
      () => _client.get(_resolve(path), headers: mergedHeaders),
    );
  }

  /// POST com corpo JSON opcional. Reusa a mesma montagem de cabeçalhos, o mesmo timeout de
  /// 90s e o mesmo mapeamento de `TimeoutException` para cold start que `get` já tinha —
  /// `_headersFor` e `_guarded` existem para os dois não divergirem com o tempo.
  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final mergedHeaders = _headersFor(
      headers,
      requestCorrelationId,
      hasBody: body != null,
    );

    return _guarded(
      requestCorrelationId,
      () => _client.post(
        _resolve(path),
        headers: mergedHeaders,
        body: body == null ? null : jsonEncode(body),
      ),
    );
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
    return _decodeJson(response, requestCorrelationId);
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Object? body,
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final response = await post(
      path,
      body: body,
      headers: headers,
      correlationId: requestCorrelationId,
    );
    return _decodeJson(response, requestCorrelationId);
  }

  /// Cabeçalhos comuns a `get` e `post`. `Authorization` só entra quando há token e a chamada
  /// não trouxe um cabeçalho próprio — `headers` é aplicado por último e sobrepõe o que vier
  /// antes, então um `Authorization` explícito da chamada sempre vence o do `getToken`.
  Map<String, String> _headersFor(
    Map<String, String> headers,
    String correlationId, {
    required bool hasBody,
  }) {
    final token = getToken?.call();
    return <String, String>{
      'Accept': 'application/json',
      'X-Correlation-Id': correlationId,
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      if (hasBody) 'Content-Type': 'application/json',
      ...headers,
    };
  }

  /// Timeout e erro de rede em um lugar só (RNF-ERR-09): timeout vira `coldStart`, o resto vira
  /// `network`. `get` e `post` só fornecem a chamada HTTP em si.
  Future<http.Response> _guarded(
    String correlationId,
    Future<http.Response> Function() request,
  ) async {
    try {
      return await request().timeout(timeout);
    } on TimeoutException {
      throw ApiException(
        kind: ApiFailureKind.coldStart,
        correlationId: correlationId,
        message: 'O serviço está iniciando. Aguarde e tente novamente.',
      );
    } on Exception {
      throw ApiException(
        kind: ApiFailureKind.network,
        correlationId: correlationId,
        message: 'Não foi possível conectar ao serviço.',
      );
    }
  }

  Map<String, dynamic> _decodeJson(
    http.Response response,
    String requestCorrelationId,
  ) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _erroDoCorpo(response, requestCorrelationId);
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

  /// Corpo de erro padrão do backend (RNF-ERR-01): `{ codigo, mensagem, correlationId }`.
  /// Quando a resposta segue o contrato, a exceção carrega a mensagem e o código de verdade;
  /// quando não segue (corpo vazio, HTML de um proxy, JSON de outro formato), cai na mensagem
  /// genérica de sempre — nunca lança por causa de um corpo inesperado.
  ApiException _erroDoCorpo(http.Response response, String requestCorrelationId) {
    final correlationIdDoCabecalho =
        response.headers['x-correlation-id'] ?? requestCorrelationId;
    try {
      final corpo = jsonDecode(response.body);
      if (corpo is Map<String, dynamic> &&
          corpo['codigo'] is String &&
          corpo['mensagem'] is String) {
        return ApiException(
          kind: ApiFailureKind.invalidResponse,
          correlationId:
              corpo['correlationId'] as String? ?? correlationIdDoCabecalho,
          message: corpo['mensagem'] as String,
          codigo: corpo['codigo'] as String,
        );
      }
    } on FormatException {
      // Corpo não é JSON: cai na mensagem genérica abaixo.
    }
    return ApiException(
      kind: ApiFailureKind.invalidResponse,
      correlationId: correlationIdDoCabecalho,
      message: 'O serviço respondeu com um status inesperado.',
    );
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
