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

  /// Status HTTP da resposta, quando houve resposta. Nulo para timeout e falha de rede. Dois
  /// `409` de `acervo` têm códigos iguais e desfechos opostos — ISBN já cadastrado leva à página
  /// do livro, chave de idempotência reutilizada é erro do cliente —, e é o corpo que os separa.
  final int? status;

  /// Corpo de erro inteiro, para os campos que o contrato acrescenta ao padrão: `livroId` em
  /// `ErroLivroExistente` e `campos` em `ErroValidacao` (docs/api/acervo.yaml).
  final Map<String, dynamic>? corpo;

  const ApiException({
    required this.kind,
    required this.correlationId,
    required this.message,
    this.codigo,
    this.status,
    this.corpo,
  });

  /// Id do livro oficial já existente no `409` de RF-ACV-07.
  String? get livroId => corpo?['livroId'] as String?;

  /// Mensagem por campo do `400` de validação, na forma `campo → mensagem`.
  Map<String, String> get campos {
    final brutos = corpo?['campos'];
    if (brutos is! List) {
      return const <String, String>{};
    }
    return <String, String>{
      for (final item in brutos)
        if (item is Map &&
            item['campo'] is String &&
            item['mensagem'] is String)
          item['campo'] as String: item['mensagem'] as String,
    };
  }

  @override
  String toString() =>
      'ApiException($kind, status: $status, correlationId: $correlationId)';
}

class ApiClient {
  final http.Client _client;
  final Uri baseUri;
  final Duration timeout;

  /// Token da sessão atual, se houver. Injetado como `Authorization: Bearer <token>` quando a
  /// chamada não define o cabeçalho por conta própria (P0-NAV).
  final String? Function()? getToken;

  /// Esperas entre tentativas de uma operação idempotente (RNF-ERR-03). Retentar só faz sentido
  /// para falha de rede e para `502/503/504`, que são o proxy ou o serviço dizendo "agora não";
  /// timeout já esperou 90 s de cold start, e um `4xx` vai responder a mesma coisa de novo.
  final List<Duration> esperasDeRetentativa;

  /// Chamado quando uma requisição que levou o token da sessão recebe `401`. Devolve se a sessão
  /// foi renovada; se sim, a requisição é repetida uma vez com o token novo (F-AUT).
  final Future<bool> Function(String tokenQueFalhou)? renovarSessao;

  ApiClient({
    required String baseUrl,
    http.Client? client,
    this.timeout = const Duration(seconds: 90),
    this.getToken,
    this.renovarSessao,
    this.esperasDeRetentativa = const <Duration>[
      Duration(seconds: 1),
      Duration(seconds: 3),
    ],
  }) : baseUri = Uri.parse(baseUrl),
       _client = client ?? http.Client();

  /// GET é idempotente por definição, então sempre pode ser retentado.
  Future<http.Response> get(
    String path, {
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
  }) {
    return _enviar(
      'GET',
      path,
      headers: headers,
      correlationId: correlationId,
      idempotente: true,
    );
  }

  /// POST com corpo JSON opcional. Só é retentado quando traz [idempotencyKey]: sem a chave, um
  /// reenvio depois de uma resposta perdida criaria o recurso duas vezes (RNF-ERR-04).
  ///
  /// [anonimo] manda sem o token da sessão, para as rotas públicas do `identidade`: o filtro de
  /// bearer do Spring Security recusa token vencido com `401` mesmo em rota aberta, e o logout é
  /// chamado justamente quando o acesso pode ter vencido.
  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
    String? idempotencyKey,
    bool anonimo = false,
  }) {
    return _enviar(
      'POST',
      path,
      body: body,
      headers: headers,
      correlationId: correlationId,
      idempotencyKey: idempotencyKey,
      anonimo: anonimo,
    );
  }

  Future<http.Response> patch(
    String path, {
    Object? body,
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
    String? idempotencyKey,
  }) {
    return _enviar(
      'PATCH',
      path,
      body: body,
      headers: headers,
      correlationId: correlationId,
      idempotencyKey: idempotencyKey,
    );
  }

  Future<http.Response> delete(
    String path, {
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
    String? idempotencyKey,
  }) {
    return _enviar(
      'DELETE',
      path,
      headers: headers,
      correlationId: correlationId,
      idempotencyKey: idempotencyKey,
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
    String? idempotencyKey,
    bool anonimo = false,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final response = await post(
      path,
      body: body,
      headers: headers,
      correlationId: requestCorrelationId,
      idempotencyKey: idempotencyKey,
      anonimo: anonimo,
    );
    return _decodeJson(response, requestCorrelationId);
  }

  Future<Map<String, dynamic>> patchJson(
    String path, {
    Object? body,
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
    String? idempotencyKey,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final response = await patch(
      path,
      body: body,
      headers: headers,
      correlationId: requestCorrelationId,
      idempotencyKey: idempotencyKey,
    );
    return _decodeJson(response, requestCorrelationId);
  }

  /// DELETE que responde `204` sem corpo. Lança [ApiException] para qualquer status fora de 2xx.
  Future<void> deleteVazio(
    String path, {
    Map<String, String> headers = const <String, String>{},
    String? correlationId,
    String? idempotencyKey,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final response = await delete(
      path,
      headers: headers,
      correlationId: requestCorrelationId,
      idempotencyKey: idempotencyKey,
    );
    _decodeJson(response, requestCorrelationId);
  }

  /// Um só caminho para todos os métodos: cabeçalhos, timeout, mapeamento de falha e retentativa
  /// não podem divergir entre `get`, `post`, `patch` e `delete` com o tempo. O correlation-id e a
  /// chave de idempotência são os mesmos em todas as tentativas — é a mesma operação, e é a
  /// chave repetida que faz o servidor devolver a resposta original em vez de refazer o efeito.
  Future<http.Response> _enviar(
    String metodo,
    String path, {
    Object? body,
    required Map<String, String> headers,
    String? correlationId,
    String? idempotencyKey,
    bool idempotente = false,
    bool anonimo = false,
  }) async {
    final requestCorrelationId = correlationId ?? newCorrelationId();
    final comChave = <String, String>{
      'Idempotency-Key': ?idempotencyKey,
      ...headers,
    };
    // Só o token da sessão é renovável; o Authorization explícito de quem chamou não é.
    final tokenDaSessao = anonimo || headers.containsKey('Authorization')
        ? null
        : getToken?.call();

    Future<http.Response> enviarCom(String? token) => _enviarComRetentativa(
      metodo,
      path,
      body: body,
      requestCorrelationId: requestCorrelationId,
      mergedHeaders: _headersFor(
        comChave,
        requestCorrelationId,
        hasBody: body != null,
        token: token,
      ),
      podeRetentar: idempotente || idempotencyKey != null,
    );

    final response = await enviarCom(tokenDaSessao);
    // 401 com o token da sessão: ele venceu ou foi revogado. Repetir uma vez depois de renovar
    // é seguro até em escrita sem chave, porque o 401 garante que nada foi feito.
    if (response.statusCode != 401 ||
        tokenDaSessao == null ||
        tokenDaSessao.isEmpty ||
        renovarSessao == null ||
        !await renovarSessao!(tokenDaSessao)) {
      return response;
    }
    final renovado = getToken?.call();
    if (renovado == null || renovado.isEmpty) {
      return response;
    }
    return enviarCom(renovado);
  }

  Future<http.Response> _enviarComRetentativa(
    String metodo,
    String path, {
    Object? body,
    required String requestCorrelationId,
    required Map<String, String> mergedHeaders,
    required bool podeRetentar,
  }) async {
    final esperas = podeRetentar ? esperasDeRetentativa : const <Duration>[];

    for (var tentativa = 0; ; tentativa++) {
      final ultima = tentativa >= esperas.length;
      try {
        final response = await _guarded(requestCorrelationId, () {
          final request = http.Request(metodo, _resolve(path))
            ..headers.addAll(mergedHeaders);
          if (body != null) {
            request.body = jsonEncode(body);
          }
          return _client.send(request).then(http.Response.fromStream);
        });
        if (ultima || !_statusRetentavel(response.statusCode)) {
          return response;
        }
      } on ApiException catch (erro) {
        if (ultima || erro.kind != ApiFailureKind.network) {
          rethrow;
        }
      }
      await Future<void>.delayed(esperas[tentativa]);
    }
  }

  static bool _statusRetentavel(int status) =>
      status == 502 || status == 503 || status == 504;

  /// Cabeçalhos comuns a todos os métodos. `Authorization` só entra quando há token e a chamada
  /// não trouxe um cabeçalho próprio — `headers` é aplicado por último e sobrepõe o que vier
  /// antes, então um `Authorization` explícito da chamada sempre vence o do `getToken`.
  Map<String, String> _headersFor(
    Map<String, String> headers,
    String correlationId, {
    required bool hasBody,
    required String? token,
  }) {
    return <String, String>{
      'Accept': 'application/json',
      'X-Correlation-Id': correlationId,
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      if (hasBody) 'Content-Type': 'application/json',
      ...headers,
    };
  }

  /// Timeout e erro de rede em um lugar só (RNF-ERR-09): timeout vira `coldStart`, o resto vira
  /// `network`.
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
    // `204` de exclusão não tem corpo, e isso é sucesso, não resposta inválida.
    if (response.statusCode == 204 || response.body.trim().isEmpty) {
      return <String, dynamic>{};
    }

    try {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } on FormatException {
      throw ApiException(
        kind: ApiFailureKind.invalidResponse,
        correlationId:
            response.headers['x-correlation-id'] ?? requestCorrelationId,
        message: 'O serviço retornou uma resposta inválida.',
        status: response.statusCode,
      );
    }
  }

  /// Corpo de erro padrão do backend (RNF-ERR-01): `{ codigo, mensagem, correlationId }`.
  /// Quando a resposta segue o contrato, a exceção carrega a mensagem e o código de verdade;
  /// quando não segue (corpo vazio, HTML de um proxy, JSON de outro formato), cai na mensagem
  /// genérica de sempre — nunca lança por causa de um corpo inesperado.
  ApiException _erroDoCorpo(
    http.Response response,
    String requestCorrelationId,
  ) {
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
          status: response.statusCode,
          corpo: corpo,
        );
      }
    } on FormatException {
      // Corpo não é JSON: cai na mensagem genérica abaixo.
    }
    return ApiException(
      kind: ApiFailureKind.invalidResponse,
      correlationId: correlationIdDoCabecalho,
      message: 'O serviço respondeu com um status inesperado.',
      status: response.statusCode,
    );
  }

  Uri _resolve(String path) {
    final normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return baseUri.resolve(normalizedPath);
  }

  void close() => _client.close();

  /// Chave de idempotência nova para uma intenção do usuário. É gerada uma vez por intenção
  /// (tocar em "Salvar livro") e reaproveitada em todo reenvio da mesma intenção.
  static String newIdempotencyKey() => newCorrelationId();

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
