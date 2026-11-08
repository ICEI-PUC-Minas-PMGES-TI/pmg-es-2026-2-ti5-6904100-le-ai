import '../../core/config/app_config.dart';
import '../../core/network/api_client.dart';

const String _plataformaAndroid = 'android';

class DispositivosPushService {
  final ApiClient _social;

  DispositivosPushService(this._social);

  factory DispositivosPushService.padrao({
    required String? Function() getToken,
    Future<bool> Function(String tokenQueFalhou)? renovarSessao,
  }) => DispositivosPushService(
    ApiClient(baseUrl: AppConfig.socialBaseUrl, getToken: getToken, renovarSessao: renovarSessao),
  );

  Future<String> registrar(String token) async {
    final json = await _social.postJson(
      '/me/dispositivos-push',
      body: <String, String>{'token': token, 'plataforma': _plataformaAndroid},
      idempotencyKey: ApiClient.newIdempotencyKey(),
    );
    return json['id'] as String;
  }

  Future<void> revogar(String id) =>
      _social.deleteVazio('/me/dispositivos-push/${Uri.encodeComponent(id)}');
}
