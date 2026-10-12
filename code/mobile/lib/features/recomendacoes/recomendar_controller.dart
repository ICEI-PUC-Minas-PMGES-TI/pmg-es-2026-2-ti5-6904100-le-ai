import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../feed/social_service.dart';
import '../perfil/textos.dart';

const int limiteDaMensagem = 280;
const Duration limiteDoColdStart = Duration(seconds: 3);
const int _muitasRequisicoes = 429;

enum EstadoDosLeitores { carregando, pronta, erro }

enum FalhaDoEnvio { conexao, frequencia }

sealed class SituacaoDoLeitor {
  const SituacaoDoLeitor();
}

class Disponivel extends SituacaoDoLeitor {
  const Disponivel();
}

class Enviada extends SituacaoDoLeitor {
  const Enviada();
}

class Indisponivel extends SituacaoDoLeitor {
  final MotivoBloqueio motivo;

  const Indisponivel(this.motivo);
}

const Map<MotivoBloqueio, String> _segundaFrase = <MotivoBloqueio, String>{
  MotivoBloqueio.jaTemLivro: 'já tem esse livro em sua estante e não recebeu.',
  MotivoBloqueio.limiteAtingido: 'atingiu o limite de recomendações suas e não recebeu.',
  MotivoBloqueio.semMutuo: 'não segue mais você de volta e não recebeu.',
  MotivoBloqueio.jaRecomendado: 'já tem uma recomendação sua deste livro e não recebeu.',
};

String listaDeNomes(List<String> nomes) {
  if (nomes.length <= 1) {
    return nomes.isEmpty ? '' : nomes.first;
  }
  return '${nomes.sublist(0, nomes.length - 1).join(', ')} e ${nomes.last}';
}

String avisoDeEnviada(List<String> nomes) => nomes.length >= 3
    ? 'Recomendação enviada para ${contagem(nomes.length, 'leitor', 'leitores')}.'
    : 'Recomendação enviada para ${listaDeNomes(nomes)}.';

String _normalizar(String texto) {
  const comAcento = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
  const semAcento = 'aaaaaeeeeiiiiooooouuuucn';
  final minusculo = texto.toLowerCase().trim();
  final saida = StringBuffer();
  for (final caractere in minusculo.split('')) {
    final indice = comAcento.indexOf(caractere);
    saida.write(indice < 0 ? caractere : semAcento[indice]);
  }
  return saida.toString();
}

class RecomendarController extends ChangeNotifier {
  final SocialService _social;
  final String livroId;

  RecomendarController(this._social, this.livroId);

  EstadoDosLeitores estado = EstadoDosLeitores.carregando;
  bool coldStart = false;
  List<CandidatoARecomendacao> candidatos = const <CandidatoARecomendacao>[];
  final List<String> selecionados = <String>[];
  final List<String> _enviadas = <String>[];
  final Map<String, MotivoBloqueio> _bloqueadosNoEnvio = <String, MotivoBloqueio>{};
  String busca = '';
  String mensagem = '';
  bool enviando = false;
  FalhaDoEnvio? falha;
  String? avisoParcial;

  Timer? _timerDoColdStart;
  ({String payload, String valor})? _chave;
  bool _descartado = false;

  int get caracteres => mensagem.runes.length;
  bool get mensagemExcede => caracteres > limiteDaMensagem;
  bool get semMutuos => estado == EstadoDosLeitores.pronta && candidatos.isEmpty;
  bool get alterado => selecionados.isNotEmpty || mensagem.trim().isNotEmpty;
  bool get podeEnviar => selecionados.isNotEmpty && !mensagemExcede && !enviando;
  bool get podeConcluir => _enviadas.isNotEmpty && selecionados.isEmpty;

  List<CandidatoARecomendacao> get filtrados {
    final termo = _normalizar(busca.replaceFirst(RegExp('^@'), ''));
    if (termo.isEmpty) {
      return candidatos;
    }
    return candidatos
        .where(
          (c) =>
              _normalizar(c.leitor.nomeExibicao).contains(termo) ||
              _normalizar(c.leitor.username).contains(termo),
        )
        .toList();
  }

  SituacaoDoLeitor situacao(CandidatoARecomendacao candidato) {
    final id = candidato.leitor.id;
    if (_enviadas.contains(id)) {
      return const Enviada();
    }
    final noEnvio = _bloqueadosNoEnvio[id];
    if (noEnvio != null) {
      return Indisponivel(noEnvio);
    }
    if (candidato.jaTemLivro) {
      return const Indisponivel(MotivoBloqueio.jaTemLivro);
    }
    if (candidato.limiteAtingido) {
      return const Indisponivel(MotivoBloqueio.limiteAtingido);
    }
    return const Disponivel();
  }

  void alternar(CandidatoARecomendacao candidato) {
    if (situacao(candidato) is! Disponivel) {
      return;
    }
    final id = candidato.leitor.id;
    selecionados.contains(id) ? selecionados.remove(id) : selecionados.add(id);
    notifyListeners();
  }

  void alterarBusca(String texto) {
    busca = texto;
    notifyListeners();
  }

  void alterarMensagem(String texto) {
    mensagem = texto;
    notifyListeners();
  }

  Future<void> carregar() async {
    estado = EstadoDosLeitores.carregando;
    coldStart = false;
    notifyListeners();
    _timerDoColdStart = Timer(limiteDoColdStart, () {
      coldStart = true;
      _avisar();
    });
    try {
      candidatos = await _social.listarCandidatos(livroId);
      estado = EstadoDosLeitores.pronta;
    } on Exception {
      estado = EstadoDosLeitores.erro;
    } finally {
      _timerDoColdStart?.cancel();
      coldStart = false;
      _avisar();
    }
  }

  String _nomeDe(String id) {
    for (final candidato in candidatos) {
      if (candidato.leitor.id == id) {
        return candidato.leitor.nomeExibicao;
      }
    }
    return '';
  }

  /// Devolve o texto do aviso quando todos os escolhidos receberam; `null` deixa a tela aberta.
  Future<String?> enviar() async {
    if (!podeEnviar) {
      return null;
    }
    final texto = mensagem.trim();
    final destinatarios = List<String>.of(selecionados);
    final payload = '$livroId|${destinatarios.join(',')}|$texto';
    if (_chave?.payload != payload) {
      _chave = (payload: payload, valor: ApiClient.newIdempotencyKey());
    }
    enviando = true;
    falha = null;
    avisoParcial = null;
    notifyListeners();
    try {
      final resultados = await _social.recomendar(
        livroId: livroId,
        destinatarios: destinatarios,
        mensagem: texto.isEmpty ? null : texto,
        idempotencyKey: _chave!.valor,
      );
      return _aplicar(resultados);
    } on ApiException catch (erro) {
      falha = erro.status == _muitasRequisicoes ? FalhaDoEnvio.frequencia : FalhaDoEnvio.conexao;
      return null;
    } on Exception {
      falha = FalhaDoEnvio.conexao;
      return null;
    } finally {
      enviando = false;
      _avisar();
    }
  }

  String? _aplicar(List<ResultadoPorDestinatario> resultados) {
    final criadas = <String>[
      for (final r in resultados)
        if (r.criada) r.destinatarioId,
    ];
    final bloqueadas = <ResultadoPorDestinatario>[
      for (final r in resultados)
        if (!r.criada && r.motivo != null) r,
    ];
    selecionados.clear();
    _chave = null;
    if (bloqueadas.isEmpty) {
      return avisoDeEnviada(criadas.map(_nomeDe).toList());
    }
    _enviadas.addAll(criadas);
    for (final r in bloqueadas) {
      _bloqueadosNoEnvio[r.destinatarioId] = r.motivo!;
    }
    avisoParcial = <String>[
      if (criadas.isNotEmpty)
        'Recomendação enviada para ${listaDeNomes(criadas.map(_nomeDe).toList())}.',
      for (final r in bloqueadas) '${_nomeDe(r.destinatarioId)} ${_segundaFrase[r.motivo!]}',
    ].join(' ');
    return null;
  }

  void _avisar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _descartado = true;
    _timerDoColdStart?.cancel();
    super.dispose();
  }
}
