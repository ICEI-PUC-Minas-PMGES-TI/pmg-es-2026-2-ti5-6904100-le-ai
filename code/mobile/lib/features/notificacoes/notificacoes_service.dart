import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import 'notificacao.dart';

/// Padrão do contrato; o servidor aceita até 50 (RNF-DES-02).
const int tamanhoDaPaginaDeNotificacoes = 20;

/// Chamadas de F-NOT. Lista e marcação vão ao `social`; a ação de abandonar da leitura em risco
/// (RF-NOT-04) vai direto ao `leitura`, dono da leitura, que revalida propriedade e estado
/// (`x-external-actions` de `docs/api/social.yaml`). O `social` não abandona nada.
class NotificacoesService {
  final ApiClient _social;
  final ApiClient _leitura;

  NotificacoesService(this._social, this._leitura);

  factory NotificacoesService.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) {
    ApiClient cliente(String baseUrl) =>
        ApiClient(baseUrl: baseUrl, getToken: getToken, renovarSessao: renovarSessao);
    return NotificacoesService(cliente(AppConfig.socialBaseUrl), cliente(AppConfig.leituraBaseUrl));
  }

  Future<PaginaDeNotificacoes> listar(
    int pagina, {
    int tamanho = tamanhoDaPaginaDeNotificacoes,
  }) async {
    final json = await _social.getJson('/notificacoes?page=$pagina&size=$tamanho');
    return PaginaDeNotificacoes.fromJson(json);
  }

  /// Marcação individual (um id) ou do lote escolhido. Devolve o novo total de não lidas.
  Future<int> marcarLidas(List<String> ids, {required String idempotencyKey}) =>
      _marcar(<String, Object>{'modo': 'SELECIONADAS', 'ids': ids}, idempotencyKey);

  Future<int> marcarTodas({required String idempotencyKey}) =>
      _marcar(const <String, Object>{'modo': 'TODAS'}, idempotencyKey);

  Future<void> abandonarLeitura(String leituraId, {required String idempotencyKey}) async {
    await _leitura.postJson(
      '/leituras/${Uri.encodeComponent(leituraId)}/abandonar',
      idempotencyKey: idempotencyKey,
    );
  }

  Future<int> _marcar(Map<String, Object> corpo, String idempotencyKey) async {
    final json = await _social.postJson(
      '/notificacoes/marcar-lidas',
      body: corpo,
      idempotencyKey: idempotencyKey,
    );
    return (json['totalNaoLidas'] as num).toInt();
  }
}
