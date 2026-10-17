import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../estante/datas_de_leitura.dart';
import '../estante/estante_service.dart';
import '../progresso/fila_de_progresso.dart';
import '../progresso/progresso_service.dart';
import '../progresso/registrar_progresso.dart';
import '../progresso/registro_progresso_controller.dart';
import '../progresso/textos.dart';
import 'armazem_da_sessao.dart';
import 'regras.dart';
import 'sessao_de_leitura.dart';
import 'textos.dart';

const int _limiteDaConsultaDePagina = 1;

class SessaoController extends ChangeNotifier {
  final ArmazemDaSessao _armazem;
  final ProgressoService _servico;
  final FilaDeProgresso? _fila;
  final DateTime Function() _agora;
  late final RegistroProgressoController _registro = RegistroProgressoController(
    _servico,
    fila: _fila,
    agora: _agora,
  );

  SessaoController(
    this._armazem,
    this._servico, {
    FilaDeProgresso? fila,
    DateTime Function()? agora,
  }) : _fila = fila,
       _agora = agora ?? DateTime.now;

  SessaoDeLeitura? _sessao;
  Future<void>? _carregamento;
  bool _carregada = false;
  SituacaoDaSessao? _situacaoNotificada;
  String? _destinoAoSair;
  String? _erroDaPagina;

  SessaoDeLeitura? get sessao => _sessao;

  bool get carregando => _carregamento != null && !_carregada;

  bool get salvando => _registro.salvando;

  String? get destinoAoSair => _destinoAoSair;

  SituacaoDaSessao? get situacao => _sessao?.situacaoEm(_agora());

  Duration get tempoLido => _sessao?.tempoLido(_agora()) ?? Duration.zero;

  Duration get tempoRegistravel => _sessao?.tempoRegistravel(_agora()) ?? Duration.zero;

  Duration? get pausaRestante => _sessao?.pausaRestante(_agora());

  String? get erroDaPagina => _erroDaPagina ?? _registro.errosDosCampos['pagina'];

  String? get erroDeEnvio {
    final erro = _registro.erro;
    return erro == TextosDoRegistro.erroEnvio ? TextosDoEncerramento.erroEnvio : erro;
  }

  int get paginaBase {
    final leitura = _sessao?.leitura;
    if (leitura == null) {
      return 0;
    }
    final local = _fila?.paginaLocal(leitura.leituraId);
    return local != null && local > leitura.paginaAtual ? local : leitura.paginaAtual;
  }

  Future<void> carregar() => _carregamento ??= _ler();

  Future<void> _ler() async {
    final conteudo = await _armazem.ler();
    await _fila?.carregar();
    if (conteudo != null && conteudo.isNotEmpty) {
      try {
        _sessao = SessaoDeLeitura.fromJson(jsonDecode(conteudo) as Map<String, dynamic>);
      } on FormatException {
        _sessao = null;
      }
    }
    _carregada = true;
    _notificar();
  }

  Future<bool> iniciar(
    LeituraDoRegistro leitura, {
    required StatusEstante status,
    required String origem,
  }) async {
    await carregar();
    if (_sessao != null || !status.emAndamento) {
      return false;
    }
    _destinoAoSair = null;
    await _gravar(SessaoDeLeitura.iniciada(leitura, origem: origem, agora: _agora()));
    return true;
  }

  Future<void> pausar(Duration duracao) async {
    final sessao = _sessao;
    if (sessao == null || situacao != SituacaoDaSessao.emAndamento) {
      return;
    }
    await _gravar(sessao.pausada(_agora(), duracao));
  }

  Future<void> retomar() async {
    final sessao = _sessao;
    if (sessao == null || situacao != SituacaoDaSessao.pausada) {
      return;
    }
    await _gravar(sessao.retomada(_agora()));
  }

  Future<void> descartar() => _limpar();

  void limparErro() {
    _erroDaPagina = null;
    _registro.limparErro();
  }

  void reavaliar() {
    if (situacao != _situacaoNotificada) {
      _notificar();
    }
  }

  Future<bool> encerrar(int pagina) async {
    final sessao = _sessao;
    if (sessao == null || _registro.salvando) {
      return false;
    }
    _erroDaPagina = null;
    if (pagina == paginaBase) {
      await _limpar();
      return true;
    }
    final anterior = sessao.encerramento;
    final encerramento = anterior != null && anterior.pagina == pagina
        ? anterior
        : _novoEncerramento(sessao, pagina);
    await _gravar(sessao.comEncerramento(encerramento));
    final resultado = await _registro.enviar(encerramento);
    if (resultado != null) {
      await _limpar();
      return true;
    }
    if (_registro.errosDosCampos['pagina'] != null) {
      await _conferirPaginaDoServidor();
    }
    notifyListeners();
    return false;
  }

  RegistroPendente _novoEncerramento(SessaoDeLeitura sessao, int pagina) {
    final agora = _agora();
    return RegistroPendente(
      chave: ApiClient.newIdempotencyKey(),
      leituraId: sessao.leitura.leituraId,
      pagina: pagina,
      minutos: minutosDaSessao(sessao.tempoRegistravel(agora)),
      registradoEmDispositivo: agora.toUtc().toIso8601String(),
      fusoHorarioDispositivo: fusoHorarioDoDispositivo(agora),
    );
  }

  Future<void> _conferirPaginaDoServidor() async {
    final sessao = _sessao;
    if (sessao == null) {
      return;
    }
    try {
      final resumo = (await _servico.listar(
        sessao.leitura.leituraId,
        limite: _limiteDaConsultaDePagina,
      )).resumo;
      if (resumo.paginaAtual > sessao.leitura.paginaAtual) {
        await _gravar(sessao.comLeitura(sessao.leitura.naPagina(resumo.paginaAtual)));
        _erroDaPagina = TextosDoEncerramento.erroOutroAparelho(resumo.paginaAtual);
      }
    } on ApiException {
      return;
    }
  }

  Future<void> _gravar(SessaoDeLeitura sessao) async {
    await _armazem.gravar(jsonEncode(sessao.toJson()));
    _sessao = sessao;
    _notificar();
  }

  Future<void> _limpar() async {
    final sessao = _sessao;
    if (sessao == null) {
      return;
    }
    await _armazem.gravar(null);
    _destinoAoSair = sessao.origem;
    _sessao = null;
    _erroDaPagina = null;
    _registro.limparErro();
    _notificar();
  }

  void _notificar() {
    _situacaoNotificada = situacao;
    notifyListeners();
  }

  @override
  void dispose() {
    _registro.dispose();
    super.dispose();
  }
}
