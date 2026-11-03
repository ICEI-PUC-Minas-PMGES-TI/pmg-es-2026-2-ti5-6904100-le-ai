import '../../core/network/api_client.dart';
import '../livros/formatos.dart';

/// `ExclusaoSolicitada` do contrato: a janela de 30 dias aberta pelo pedido.
class ExclusaoSolicitada {
  final DateTime solicitadaEm;
  final DateTime previstaEm;

  const ExclusaoSolicitada({required this.solicitadaEm, required this.previstaEm});

  factory ExclusaoSolicitada.fromJson(Map<String, dynamic> json) {
    return ExclusaoSolicitada(
      solicitadaEm: DateTime.parse(json['exclusaoSolicitadaEm'] as String),
      previstaEm: DateTime.parse(json['exclusaoPrevistaEm'] as String),
    );
  }
}

/// Exclusão de conta no `identidade` (F-CONTA-2, RF-AUT-07). Mesmas rotas e regras da web
/// (`solicitarExclusao` e `cancelarExclusao` em `services/auth.ts`).
class ExclusaoService {
  final ApiClient client;

  const ExclusaoService(this.client);

  /// Pede a exclusão (RN-23.1): senha atual, confirmação explícita e a chave de quem chama, que
  /// a repete ao reenviar depois de um erro para o pedido não duplicar. O servidor revoga todas
  /// as renovações; quem chama limpa a sessão local ao receber o `202`.
  Future<ExclusaoSolicitada> solicitar({
    required String senha,
    required String idempotencyKey,
  }) async {
    final json = await client.deleteJson(
      '/me/conta',
      body: <String, Object>{'senha': senha, 'confirmacao': true},
      idempotencyKey: idempotencyKey,
    );
    return ExclusaoSolicitada.fromJson(json);
  }

  /// Cancela com o acesso de recuperação, nunca com a sessão normal (RN-23.4). O `Authorization`
  /// explícito não é renovado pelo [ApiClient]: `401` aqui é o acesso de 15 minutos que venceu.
  Future<void> cancelar({
    required String accessToken,
    required String idempotencyKey,
  }) async {
    await client.postJson(
      '/me/conta/cancelar-exclusao',
      headers: <String, String>{'Authorization': 'Bearer $accessToken'},
      idempotencyKey: idempotencyKey,
    );
  }
}

/// `7 de novembro de 2026`, no fuso do aparelho: data sempre por extenso, nunca `07/11`
/// (excluir-conta.md §8).
String dataPorExtenso(DateTime data) => formatarData(data.toLocal());

/// Data limite mostrada antes do pedido: agora mais 30 dias, calculada no aparelho (§3).
DateTime dataLimiteAPartirDeAgora([DateTime? agora]) =>
    (agora ?? DateTime.now()).add(const Duration(days: 30));

/// Dias que faltam até a remoção, nunca menos de 1 enquanto a conta ainda não foi removida.
int diasAte(DateTime prevista, [DateTime? agora]) {
  final restante = prevista.difference(agora ?? DateTime.now());
  final dias = (restante.inMilliseconds / Duration.millisecondsPerDay).ceil();
  return dias < 1 ? 1 : dias;
}

/// `Faltam 23 dias` ou `Falta 1 dia` (recuperar-conta.md §8).
String textoDosDias(int dias) => dias == 1 ? 'Falta 1 dia' : 'Faltam $dias dias';
