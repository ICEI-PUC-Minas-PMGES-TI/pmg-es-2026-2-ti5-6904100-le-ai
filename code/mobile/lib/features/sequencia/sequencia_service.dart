import '../../core/network/api_client.dart';
import 'calendario.dart';

/// `Sequencia` de docs/api/leitura.yaml (F-GAM, RF-GAM-02).
class Sequencia {
  /// Dias seguidos com leitura até hoje ou ontem; 0 quando um dia se encerrou sem leitura.
  final int atual;

  /// Maior sequência já alcançada, preservada quando a atual zera (RN-18.6).
  final int maior;

  const Sequencia({required this.atual, required this.maior});

  factory Sequencia.fromJson(Map<String, dynamic> json) {
    final atual = json['sequenciaAtual'];
    final maior = json['maiorSequencia'];
    if (atual is! num || maior is! num) {
      throw const FormatException('Sequência sem os contadores.');
    }
    return Sequencia(atual: atual.toInt(), maior: maior.toInt());
  }
}

/// Sequência diária do próprio leitor, no `leitura` (`GET /me/sequencia`).
class SequenciaService {
  final ApiClient _api;

  SequenciaService(this._api);

  Future<Sequencia> obterMinha() async {
    final json = await _api.getJson('/me/sequencia');
    try {
      return Sequencia.fromJson(json);
    } on FormatException {
      throw _respostaInvalida;
    }
  }

  /// `GET /me/sequencia/calendario?mes=` (F-GAM-OPC, RF-GAM-04). Sem [mes], o mês corrente no
  /// fuso que apura a sequência. Mês fora da janela do servidor é 422.
  Future<CalendarioDaSequencia> calendario({Mes? mes}) async {
    final json = await _api.getJson(
      Uri(
        path: '/me/sequencia/calendario',
        queryParameters: mes == null ? null : <String, String>{'mes': mes.valor},
      ).toString(),
    );
    try {
      return CalendarioDaSequencia.fromJson(json);
    } on FormatException {
      throw _respostaInvalida;
    } on TypeError {
      throw _respostaInvalida;
    }
  }

  static const ApiException _respostaInvalida = ApiException(
    kind: ApiFailureKind.invalidResponse,
    correlationId: '',
    message: 'O serviço retornou uma resposta inválida.',
  );
}
