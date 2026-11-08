import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';
import 'preferencias_de_notificacao.dart';

const String _caminhoDasPreferencias = '/me/notificacoes/preferencias';

class PreferenciasDeNotificacaoService {
  final ApiClient _social;

  PreferenciasDeNotificacaoService(this._social);

  factory PreferenciasDeNotificacaoService.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) => PreferenciasDeNotificacaoService(
    ApiClient(
      baseUrl: AppConfig.socialBaseUrl,
      getToken: getToken,
      renovarSessao: renovarSessao,
    ),
  );

  Future<Map<TipoPreferenciaNotificacao, bool>> carregar() async {
    final json = await _social.getJson(_caminhoDasPreferencias);
    return preferenciasDeNotificacaoDeJson(json);
  }

  Future<void> salvar(
    TipoPreferenciaNotificacao tipo,
    bool habilitada, {
    required String idempotencyKey,
  }) async {
    await _social.putJson(
      _caminhoDasPreferencias,
      body: <String, Object>{
        'preferencias': <Map<String, Object>>[
          <String, Object>{'tipo': tipo.valorDoContrato, 'habilitada': habilitada},
        ],
      },
      idempotencyKey: idempotencyKey,
    );
  }
}
