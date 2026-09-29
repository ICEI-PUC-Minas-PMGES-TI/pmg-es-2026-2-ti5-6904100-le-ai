import 'dart:math' as math;

import '../../core/network/api_client.dart';
import 'social_service.dart';

/// Curtir e descurtir com efeito na hora (RF-SOC-11), igual a `useCurtidas.ts` da web. O último
/// toque vale.
///
/// No toque, o item da lista inverte `curtidaPeloSolicitante` e soma ou subtrai 1 de
/// `totalCurtidas` (mínimo 0), e o botão não trava. Por atividade, guarda-se o último estado que
/// o servidor confirmou e permite-se uma única requisição em voo, cada uma com a própria
/// `Idempotency-Key`. Quando ela termina, se o item exibido ainda difere do confirmado (a pessoa
/// tocou de novo), a requisição que falta segue, até convergir: toques rápidos geram no máximo
/// uma requisição extra. Ao convergir, o item recebe o total confirmado, o que corrige o contador.
///
/// Se uma requisição falha (inclusive `429`), o item volta ao último estado confirmado e
/// [aoFalhar] recebe o erro. [descartarPendentes] esquece as intenções em andamento: usado ao
/// recarregar a lista, em que o estado vindo do servidor vale e as respostas antigas não
/// sobrescrevem nem disparam novas requisições.
class CurtidasOtimistas {
  final SocialService _social;
  final Atividade? Function(String id) _atual;
  final void Function(Atividade atividade) _substituir;
  final void Function(ApiException erro) _aoFalhar;

  CurtidasOtimistas(
    this._social, {
    required Atividade? Function(String id) atual,
    required void Function(Atividade atividade) substituir,
    required void Function(ApiException erro) aoFalhar,
  }) : _atual = atual,
       _substituir = substituir,
       _aoFalhar = aoFalhar;

  final Map<String, ({bool curtida, int total})> _confirmados = <String, ({bool curtida, int total})>{};
  final Set<String> _emVoo = <String>{};
  int _geracao = 0;

  /// Inverte a curtida da atividade na hora e garante que o servidor acabe no estado exibido.
  void alternar(Atividade atividade) {
    final exibida = _atual(atividade.id);
    if (exibida == null) {
      return;
    }
    final id = exibida.id;
    _confirmados.putIfAbsent(
      id,
      () => (curtida: exibida.curtidaPeloSolicitante, total: exibida.totalCurtidas),
    );
    final curtida = !exibida.curtidaPeloSolicitante;
    _substituir(
      exibida.copiar(
        curtidaPeloSolicitante: curtida,
        totalCurtidas: math.max(0, exibida.totalCurtidas + (curtida ? 1 : -1)),
      ),
    );
    if (_emVoo.add(id)) {
      _convergir(id, _geracao);
    }
  }

  /// Esquece as intenções pendentes; as respostas das requisições em voo passam a ser ignoradas.
  void descartarPendentes() {
    _geracao++;
    _confirmados.clear();
    _emVoo.clear();
  }

  Future<void> _convergir(String id, int geracao) async {
    try {
      while (true) {
        final exibida = _atual(id);
        final confirmado = _confirmados[id];
        if (exibida == null || confirmado == null) {
          return;
        }
        if (exibida.curtidaPeloSolicitante == confirmado.curtida) {
          if (exibida.totalCurtidas != confirmado.total) {
            _substituir(exibida.copiar(totalCurtidas: confirmado.total));
          }
          return;
        }
        final chave = ApiClient.newIdempotencyKey();
        if (exibida.curtidaPeloSolicitante) {
          final estado = await _social.curtir(id, idempotencyKey: chave);
          if (geracao != _geracao) {
            return;
          }
          _confirmados[id] = (curtida: true, total: estado.totalCurtidas);
        } else {
          await _social.descurtir(id, idempotencyKey: chave);
          if (geracao != _geracao) {
            return;
          }
          _confirmados[id] = (curtida: false, total: math.max(0, confirmado.total - 1));
        }
      }
    } on ApiException catch (erro) {
      if (geracao != _geracao) {
        return;
      }
      final exibida = _atual(id);
      final confirmado = _confirmados[id];
      if (exibida != null && confirmado != null) {
        _substituir(
          exibida.copiar(
            curtidaPeloSolicitante: confirmado.curtida,
            totalCurtidas: confirmado.total,
          ),
        );
        _aoFalhar(erro);
      }
    } finally {
      if (geracao == _geracao) {
        _emVoo.remove(id);
        _confirmados.remove(id);
      }
    }
  }
}
