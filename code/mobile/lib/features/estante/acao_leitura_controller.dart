import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'acoes_disponiveis.dart';
import 'leitura_service.dart';
import 'textos.dart';

const int _conflito = 409;

class PedidoDeAcao {
  final IdAcao acao;
  final String livroId;
  final String? leituraId;
  final String? data;
  final String? fusoHorarioDispositivo;

  const PedidoDeAcao({
    required this.acao,
    required this.livroId,
    this.leituraId,
    this.data,
    this.fusoHorarioDispositivo,
  });

  String get _intencao =>
      <Object?>[acao, livroId, leituraId, data, fusoHorarioDispositivo].join('|');
}

EstadoDeLeitura _estadoDaLeitura(Leitura leitura) {
  final status = leitura.releitura && leitura.incompleta ? StatusEstante.lido : leitura.status;
  return EstadoDeLeitura(status: status, leitura: leitura);
}

bool _encerraIntencao(ApiException erro) {
  final status = erro.status;
  return status != null && status >= 400 && status < 500;
}

String _mensagemDoErro(ApiException erro) {
  if (erro.status == _conflito) {
    return ErrosDeAcao.conflito;
  }
  if (_encerraIntencao(erro)) {
    return erro.message;
  }
  return TextosDeAcao.erroAoSalvar;
}

class AcaoLeituraController extends ChangeNotifier {
  final LeituraService _servico;

  AcaoLeituraController(this._servico);

  bool salvando = false;
  String? erro;
  IdAcao? acaoEmCurso;

  String? _chave;
  String? _intencaoDaChave;

  void _esquecerChave() {
    _chave = null;
    _intencaoDaChave = null;
  }

  Future<EstadoDeLeitura?> executar(PedidoDeAcao pedido) async {
    if (salvando) {
      return null;
    }
    final intencao = pedido._intencao;
    if (_chave == null || _intencaoDaChave != intencao) {
      _chave = ApiClient.newIdempotencyKey();
      _intencaoDaChave = intencao;
    }
    final chave = _chave!;

    salvando = true;
    acaoEmCurso = pedido.acao;
    erro = null;
    notifyListeners();
    try {
      final estado = await _enviar(pedido, chave);
      _esquecerChave();
      return estado;
    } on ApiException catch (falha) {
      if (_encerraIntencao(falha)) {
        _esquecerChave();
      }
      erro = _mensagemDoErro(falha);
      return null;
    } finally {
      salvando = false;
      acaoEmCurso = null;
      notifyListeners();
    }
  }

  void limparErro() {
    if (erro == null) {
      return;
    }
    erro = null;
    notifyListeners();
  }

  Future<EstadoDeLeitura> _enviar(PedidoDeAcao pedido, String chave) async {
    switch (pedido.acao) {
      case IdAcao.adicionarQueroLer:
        await _servico.adicionarEstante(pedido.livroId, idempotencyKey: chave);
        return const EstadoDeLeitura(status: StatusEstante.queroLer);
      case IdAcao.removerDaEstante:
        await _servico.removerEstante(pedido.livroId, idempotencyKey: chave);
        return const EstadoDeLeitura(status: null);
      case IdAcao.iniciarLeitura:
        return _estadoDaLeitura(
          await _servico.iniciarLeitura(
            pedido.livroId,
            dataInicio: pedido.data,
            idempotencyKey: chave,
          ),
        );
      case IdAcao.iniciarReleitura:
        return _estadoDaLeitura(
          await _servico.iniciarReleitura(
            pedido.livroId,
            dataInicio: pedido.data,
            idempotencyKey: chave,
          ),
        );
      case IdAcao.finalizarLeitura:
      case IdAcao.finalizarReleitura:
        return _estadoDaLeitura(
          await _servico.finalizarLeitura(
            pedido.leituraId!,
            dataFim: pedido.data,
            fusoHorarioDispositivo: pedido.fusoHorarioDispositivo!,
            idempotencyKey: chave,
          ),
        );
      case IdAcao.abandonarLeitura:
      case IdAcao.abandonarReleitura:
        return _estadoDaLeitura(
          await _servico.abandonarLeitura(pedido.leituraId!, idempotencyKey: chave),
        );
      case IdAcao.retomarLeitura:
        return _estadoDaLeitura(
          await _servico.retomarLeitura(pedido.leituraId!, idempotencyKey: chave),
        );
      case IdAcao.registrarProgresso:
        throw ArgumentError.value(pedido.acao, 'acao', 'não é uma transição de estante');
    }
  }
}
