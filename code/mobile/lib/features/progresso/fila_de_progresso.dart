import 'dart:async';
import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';
import 'progresso_service.dart';
import 'textos.dart';

const int _naoAutenticado = 401;
const int _tempoEsgotado = 408;
const int _conflito = 409;
const int _muitasRequisicoes = 429;
const int _erroDoCliente = 400;
const int _erroDoServidor = 500;
const Duration intervaloDeReenvio = Duration(seconds: 30);

class RegistroPendente {
  final String chave;
  final String leituraId;
  final int pagina;
  final int? minutos;
  final String registradoEmDispositivo;
  final String fusoHorarioDispositivo;
  final String? pausa;

  const RegistroPendente({
    required this.chave,
    required this.leituraId,
    required this.pagina,
    this.minutos,
    required this.registradoEmDispositivo,
    required this.fusoHorarioDispositivo,
    this.pausa,
  });

  bool get pausado => pausa != null;

  NovoProgresso get novo => NovoProgresso(
    pagina: pagina,
    minutos: minutos,
    registradoEmDispositivo: registradoEmDispositivo,
    fusoHorarioDispositivo: fusoHorarioDispositivo,
  );

  RegistroPendente pausadoCom(String motivo) => RegistroPendente(
    chave: chave,
    leituraId: leituraId,
    pagina: pagina,
    minutos: minutos,
    registradoEmDispositivo: registradoEmDispositivo,
    fusoHorarioDispositivo: fusoHorarioDispositivo,
    pausa: motivo,
  );

  RegistroPendente corrigido({required int pagina, int? minutos}) => RegistroPendente(
    chave: ApiClient.newIdempotencyKey(),
    leituraId: leituraId,
    pagina: pagina,
    minutos: minutos,
    registradoEmDispositivo: registradoEmDispositivo,
    fusoHorarioDispositivo: fusoHorarioDispositivo,
  );

  Map<String, Object?> toJson() => <String, Object?>{
    'chave': chave,
    'leituraId': leituraId,
    'pagina': pagina,
    'minutos': minutos,
    'registradoEmDispositivo': registradoEmDispositivo,
    'fusoHorarioDispositivo': fusoHorarioDispositivo,
    'pausa': pausa,
  };

  factory RegistroPendente.fromJson(Map<String, dynamic> json) => RegistroPendente(
    chave: json['chave'] as String,
    leituraId: json['leituraId'] as String,
    pagina: (json['pagina'] as num).toInt(),
    minutos: (json['minutos'] as num?)?.toInt(),
    registradoEmDispositivo: json['registradoEmDispositivo'] as String,
    fusoHorarioDispositivo: json['fusoHorarioDispositivo'] as String,
    pausa: json['pausa'] as String?,
  );
}

abstract interface class ArmazemDaFila {
  Future<String?> ler();

  Future<void> gravar(String conteudo);
}

class ArmazemDaFilaEmPreferencias implements ArmazemDaFila {
  static const String chave = 'fila_de_progresso';

  final SharedPreferencesAsync preferencias;

  ArmazemDaFilaEmPreferencias({SharedPreferencesAsync? preferencias})
    : preferencias = preferencias ?? SharedPreferencesAsync();

  @override
  Future<String?> ler() => preferencias.getString(chave);

  @override
  Future<void> gravar(String conteudo) => preferencias.setString(chave, conteudo);
}

bool falhaDeConexao(ApiException erro) =>
    erro.kind == ApiFailureKind.network || erro.kind == ApiFailureKind.coldStart;

bool _pausaAFila(ApiException erro) {
  final status = erro.status;
  if (status == null || status < _erroDoCliente || status >= _erroDoServidor) {
    return false;
  }
  return status != _naoAutenticado && status != _tempoEsgotado && status != _muitasRequisicoes;
}

String _motivoDaPausa(ApiException erro) {
  if (erro.status == _conflito) {
    return TextosDoRegistro.erroListaDesatualizada;
  }
  return erro.campos['pagina'] ?? erro.campos['minutos'] ?? erro.message;
}

class FilaDeProgresso extends ChangeNotifier {
  final ProgressoService _servico;
  final ArmazemDaFila _armazem;

  FilaDeProgresso(this._servico, this._armazem);

  List<RegistroPendente> _itens = <RegistroPendente>[];
  Future<void>? _carregamento;
  Future<void>? _sincronizacao;

  List<RegistroPendente> get itens => List<RegistroPendente>.unmodifiable(_itens);

  List<RegistroPendente> pendentesDe(String leituraId) =>
      _itens.where((item) => item.leituraId == leituraId).toList();

  bool temPendentes(String leituraId) => _itens.any((item) => item.leituraId == leituraId);

  int? paginaLocal(String leituraId) {
    final pendentes = pendentesDe(leituraId);
    return pendentes.isEmpty ? null : pendentes.last.pagina;
  }

  Future<void> carregar() => _carregamento ??= _ler();

  Future<void> _ler() async {
    final conteudo = await _armazem.ler();
    if (conteudo == null || conteudo.isEmpty) {
      return;
    }
    try {
      _itens = (jsonDecode(conteudo) as List<dynamic>)
          .map((bruto) => RegistroPendente.fromJson(bruto as Map<String, dynamic>))
          .toList();
    } on FormatException {
      _itens = <RegistroPendente>[];
    }
    notifyListeners();
  }

  Future<void> _gravar() =>
      _armazem.gravar(jsonEncode(_itens.map((item) => item.toJson()).toList()));

  Future<void> enfileirar(RegistroPendente registro) async {
    await carregar();
    _itens = <RegistroPendente>[..._itens, registro];
    await _gravar();
    notifyListeners();
  }

  Future<void> corrigir(String chave, {required int pagina, int? minutos}) async {
    await carregar();
    _itens = <RegistroPendente>[
      for (final item in _itens)
        item.chave == chave ? item.corrigido(pagina: pagina, minutos: minutos) : item,
    ];
    await _gravar();
    notifyListeners();
    unawaited(sincronizar());
  }

  Future<void> descartar(String chave) async {
    await carregar();
    _itens = _itens.where((item) => item.chave != chave).toList();
    await _gravar();
    notifyListeners();
    unawaited(sincronizar());
  }

  Future<void> sincronizar() {
    return _sincronizacao ??= _sincronizarTudo().whenComplete(() => _sincronizacao = null);
  }

  Future<void> _sincronizarTudo() async {
    await carregar();
    final leituras = <String>{for (final item in _itens) item.leituraId};
    for (final leituraId in leituras) {
      await _sincronizarLeitura(leituraId);
    }
  }

  Future<void> _sincronizarLeitura(String leituraId) async {
    while (true) {
      final pendentes = pendentesDe(leituraId);
      if (pendentes.isEmpty || pendentes.first.pausado) {
        return;
      }
      final primeiro = pendentes.first;
      try {
        await _servico.registrar(leituraId, primeiro.novo, idempotencyKey: primeiro.chave);
        _itens = _itens.where((item) => item.chave != primeiro.chave).toList();
      } on ApiException catch (erro) {
        if (!_pausaAFila(erro)) {
          return;
        }
        final pausado = primeiro.pausadoCom(_motivoDaPausa(erro));
        _itens = <RegistroPendente>[
          for (final item in _itens) item.chave == primeiro.chave ? pausado : item,
        ];
        await _gravar();
        notifyListeners();
        return;
      }
      await _gravar();
      notifyListeners();
    }
  }
}

class ReenvioDaFila {
  final FilaDeProgresso fila;
  final Duration intervalo;

  ReenvioDaFila(this.fila, {this.intervalo = intervaloDeReenvio});

  Timer? _temporizador;
  AppLifecycleListener? _ciclo;

  void iniciar() {
    _temporizador ??= Timer.periodic(intervalo, (_) => fila.sincronizar());
    _ciclo ??= AppLifecycleListener(onResume: fila.sincronizar);
    unawaited(fila.sincronizar());
  }

  void dispose() {
    _temporizador?.cancel();
    _temporizador = null;
    _ciclo?.dispose();
    _ciclo = null;
  }
}
