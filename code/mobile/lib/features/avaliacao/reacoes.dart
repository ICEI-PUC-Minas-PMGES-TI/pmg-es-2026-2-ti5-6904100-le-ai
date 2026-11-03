import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';

/// Reações à resenha (F-AVA-2, RF-AVA-05/08), no molde de `useReacao.ts` da web.

enum TipoDeReacao {
  curtida('curtida'),
  descurtida('descurtida');

  final String contrato;
  const TipoDeReacao(this.contrato);

  /// Valor fora do contrato vira ausência de reação, nunca erro na tela.
  static TipoDeReacao? deContrato(Object? valor) {
    for (final tipo in values) {
      if (tipo.contrato == valor) {
        return tipo;
      }
    }
    return null;
  }
}

/// `Reacoes` do contrato: contagens separadas e a reação de quem olha.
@immutable
class EstadoDasReacoes {
  final TipoDeReacao? minhaReacao;
  final int curtidas;
  final int descurtidas;

  const EstadoDasReacoes({this.minhaReacao, this.curtidas = 0, this.descurtidas = 0});

  /// Parse tolerante: contagem ausente é zero, e a reação desconhecida é nenhuma.
  factory EstadoDasReacoes.fromJson(Map<String, dynamic> json) {
    int contagem(String campo) {
      final valor = json[campo];
      return valor is num ? math.max(0, valor.toInt()) : 0;
    }

    return EstadoDasReacoes(
      minhaReacao: TipoDeReacao.deContrato(json['minhaReacao']),
      curtidas: contagem('curtidas'),
      descurtidas: contagem('descurtidas'),
    );
  }

  int total(TipoDeReacao tipo) => tipo == TipoDeReacao.curtida ? curtidas : descurtidas;

  @override
  bool operator ==(Object other) =>
      other is EstadoDasReacoes &&
      other.minhaReacao == minhaReacao &&
      other.curtidas == curtidas &&
      other.descurtidas == descurtidas;

  @override
  int get hashCode => Object.hash(minhaReacao, curtidas, descurtidas);
}

/// A via de RN-15 pela qual o leitor abriu o livro pessoal de outra pessoa: o servidor só aceita
/// a reação à resenha do dono com ela. Em livro oficial não vai.
@immutable
class ViaDeAcesso {
  final String via;
  final String referenciaId;

  const ViaDeAcesso({required this.via, required this.referenciaId});
}

/// O que o toque em [tipo] faz com o estado exibido: troca a reação, ou retira a que está ativa.
EstadoDasReacoes aplicarToque(EstadoDasReacoes atual, TipoDeReacao tipo) {
  final alvo = atual.minhaReacao == tipo ? null : tipo;
  int contagem(TipoDeReacao qual) => math.max(
    0,
    atual.total(qual) - (atual.minhaReacao == qual ? 1 : 0) + (alvo == qual ? 1 : 0),
  );
  return EstadoDasReacoes(
    minhaReacao: alvo,
    curtidas: contagem(TipoDeReacao.curtida),
    descurtidas: contagem(TipoDeReacao.descurtida),
  );
}

/// Texto da contagem: `1 curtida`, `0 descurtidas`. Zero é contagem real, não ausência.
String rotuloDaContagem(int total, TipoDeReacao tipo) =>
    '$total ${tipo.contrato}${total == 1 ? '' : 's'}';

const String mensagemDeFalhaDaReacao =
    'Não foi possível registrar sua reação. Tente de novo em alguns instantes.';

typedef Reagir =
    Future<EstadoDasReacoes> Function(
      String resenhaId,
      TipoDeReacao tipo, {
      ViaDeAcesso? via,
      required String idempotencyKey,
    });
typedef RemoverReacao =
    Future<EstadoDasReacoes> Function(
      String resenhaId, {
      ViaDeAcesso? via,
      required String idempotencyKey,
    });

/// Curtir e descurtir com efeito na hora: o toque muda [estado], o botão não trava e há uma só
/// requisição em voo. Se a pessoa tocou de novo enquanto ela voava, a que falta segue até
/// convergir; ao convergir, as contagens passam a ser as do servidor.
///
/// A chave de idempotência é por intenção: repetir "curtir" depois de uma falha reusa a chave, e
/// o servidor devolve a resposta guardada se a primeira chegou a gravar. Depois do sucesso, a
/// chave é esquecida. Falha (`429`, `503`, timeout) volta ao último estado confirmado e preenche
/// [erro].
class ReacoesOtimistas extends ChangeNotifier {
  final String resenhaId;
  final ViaDeAcesso? via;
  final Reagir _reagir;
  final RemoverReacao _remover;
  final String Function() _novaChave;

  ReacoesOtimistas({
    required this.resenhaId,
    required EstadoDasReacoes inicial,
    required Reagir reagir,
    required RemoverReacao remover,
    this.via,
    String Function()? novaChave,
  }) : _reagir = reagir,
       _remover = remover,
       _novaChave = novaChave ?? ApiClient.newIdempotencyKey,
       _estado = inicial,
       _confirmado = inicial;

  EstadoDasReacoes _estado;
  EstadoDasReacoes _confirmado;
  bool _emVoo = false;
  String? _erro;
  final Map<String, String> _chaves = <String, String>{};

  bool _descartado = false;

  EstadoDasReacoes get estado => _estado;
  String? get erro => _erro;

  @override
  void dispose() {
    _descartado = true;
    super.dispose();
  }

  void tocar(TipoDeReacao tipo) {
    _erro = null;
    _estado = aplicarToque(_estado, tipo);
    notifyListeners();
    if (!_emVoo) {
      _convergir();
    }
  }

  /// Estado novo vindo do servidor (a tela recarregou): vale ele, sem requisição.
  void redefinir(EstadoDasReacoes novo) {
    if (_emVoo) {
      return;
    }
    _confirmado = novo;
    _estado = novo;
    notifyListeners();
  }

  /// Esquece o erro depois que a tela o mostrou.
  void erroMostrado() {
    _erro = null;
  }

  Future<void> _convergir() async {
    _emVoo = true;
    try {
      while (_estado.minhaReacao != _confirmado.minhaReacao) {
        final alvo = _estado.minhaReacao;
        final intencao = alvo?.contrato ?? 'retirar';
        final chave = _chaves.putIfAbsent(intencao, _novaChave);
        _confirmado = alvo == null
            ? await _remover(resenhaId, via: via, idempotencyKey: chave)
            : await _reagir(resenhaId, alvo, via: via, idempotencyKey: chave);
        _chaves.remove(intencao);
      }
      _estado = _confirmado;
    } on Exception {
      _estado = _confirmado;
      _erro = mensagemDeFalhaDaReacao;
    } finally {
      _emVoo = false;
    }
    if (!_descartado) {
      notifyListeners();
    }
  }
}
