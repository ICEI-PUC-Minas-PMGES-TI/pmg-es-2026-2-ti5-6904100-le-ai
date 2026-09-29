import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../estante/datas_de_leitura.dart';
import 'fila_de_progresso.dart';
import 'progresso_service.dart';
import 'textos.dart';

const int _conflito = 409;
const int _naoProcessavel = 422;
const int _erroDoCliente = 400;
const int _erroDoServidor = 500;

sealed class ResultadoDoRegistro {
  const ResultadoDoRegistro();
}

class ProgressoSalvo extends ResultadoDoRegistro {
  final ProgressoComResumo resultado;

  const ProgressoSalvo(this.resultado);
}

class ProgressoEnfileirado extends ResultadoDoRegistro {
  final RegistroPendente registro;

  const ProgressoEnfileirado(this.registro);
}

class _Intencao {
  final String assinatura;
  final String chave;
  final String registradoEmDispositivo;
  final String fusoHorarioDispositivo;

  const _Intencao({
    required this.assinatura,
    required this.chave,
    required this.registradoEmDispositivo,
    required this.fusoHorarioDispositivo,
  });
}

bool _encerraIntencao(ApiException erro) {
  final status = erro.status;
  return status != null && status >= _erroDoCliente && status < _erroDoServidor;
}

class RegistroProgressoController extends ChangeNotifier {
  final ProgressoService _servico;
  final FilaDeProgresso? _fila;
  final DateTime Function() _agora;

  RegistroProgressoController(this._servico, {FilaDeProgresso? fila, DateTime Function()? agora})
    : _fila = fila,
      _agora = agora ?? DateTime.now;

  bool salvando = false;
  String? erro;
  Map<String, String> errosDosCampos = const <String, String>{};
  bool precisaRecarregar = false;

  _Intencao? _intencao;

  _Intencao _intencaoPara(String assinatura) {
    final atual = _intencao;
    if (atual != null && atual.assinatura == assinatura) {
      return atual;
    }
    final agora = _agora();
    return _intencao = _Intencao(
      assinatura: assinatura,
      chave: ApiClient.newIdempotencyKey(),
      registradoEmDispositivo: agora.toUtc().toIso8601String(),
      fusoHorarioDispositivo: fusoHorarioDoDispositivo(agora),
    );
  }

  void limparErro() {
    erro = null;
    errosDosCampos = const <String, String>{};
    precisaRecarregar = false;
    notifyListeners();
  }

  void _registrarFalha(ApiException falha) {
    if (_encerraIntencao(falha)) {
      _intencao = null;
    }
    if (falha.status == _conflito) {
      precisaRecarregar = true;
      erro = TextosDoRegistro.erroListaDesatualizada;
      return;
    }
    if (falha.status == _naoProcessavel) {
      errosDosCampos = <String, String>{
        for (final campo in const <String>['pagina', 'minutos'])
          if (falha.campos[campo] != null) campo: falha.campos[campo]!,
      };
      if (errosDosCampos.isEmpty) {
        erro = falha.message;
      }
      return;
    }
    erro = _encerraIntencao(falha) ? falha.message : TextosDoRegistro.erroEnvio;
  }

  Future<T?> _executar<T>(String assinatura, Future<T> Function(_Intencao intencao) enviar) async {
    if (salvando) {
      return null;
    }
    final intencao = _intencaoPara(assinatura);
    salvando = true;
    erro = null;
    errosDosCampos = const <String, String>{};
    precisaRecarregar = false;
    notifyListeners();
    try {
      final resultado = await enviar(intencao);
      _intencao = null;
      return resultado;
    } on ApiException catch (falha) {
      _registrarFalha(falha);
      return null;
    } finally {
      salvando = false;
      notifyListeners();
    }
  }

  RegistroPendente _pendente(String leituraId, int pagina, int? minutos, _Intencao intencao) =>
      RegistroPendente(
        chave: intencao.chave,
        leituraId: leituraId,
        pagina: pagina,
        minutos: minutos,
        registradoEmDispositivo: intencao.registradoEmDispositivo,
        fusoHorarioDispositivo: intencao.fusoHorarioDispositivo,
      );

  Future<ResultadoDoRegistro?> registrar(String leituraId, {required int pagina, int? minutos}) {
    return _executar(<Object?>['registrar', leituraId, pagina, minutos].join('|'), (
      intencao,
    ) async {
      final fila = _fila;
      if (fila != null) {
        await fila.carregar();
        if (fila.temPendentes(leituraId)) {
          return _enfileirar(fila, _pendente(leituraId, pagina, minutos, intencao));
        }
      }
      try {
        final resultado = await _servico.registrar(
          leituraId,
          _pendente(leituraId, pagina, minutos, intencao).novo,
          idempotencyKey: intencao.chave,
        );
        return ProgressoSalvo(resultado);
      } on ApiException catch (falha) {
        if (fila == null || !falhaDeConexao(falha)) {
          rethrow;
        }
        return _enfileirar(fila, _pendente(leituraId, pagina, minutos, intencao));
      }
    });
  }

  Future<ResultadoDoRegistro> _enfileirar(FilaDeProgresso fila, RegistroPendente registro) async {
    await fila.enfileirar(registro);
    return ProgressoEnfileirado(registro);
  }

  Future<ExclusaoProgresso?> excluirTrecho(
    String progressoId, {
    required String ultimoProgressoIdConfirmado,
  }) {
    return _executar(
      <Object?>['excluir', progressoId, ultimoProgressoIdConfirmado].join('|'),
      (intencao) => _servico.excluirTrecho(
        progressoId,
        ultimoProgressoIdConfirmado: ultimoProgressoIdConfirmado,
        idempotencyKey: intencao.chave,
      ),
    );
  }
}
