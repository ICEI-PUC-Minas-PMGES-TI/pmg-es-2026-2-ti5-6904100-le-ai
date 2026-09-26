import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../livros/acervo_service.dart';
import '../livros/livro_oficial.dart';
import 'agrupar_edicoes.dart';

enum EstadoDaBusca { aterrissagem, buscando, resultados, vazio, erro }

/// Estado da aba Descobrir (descobrir.md), no mesmo molde de `ChangeNotifier` do resto do app.
///
/// - **Debounce de 350 ms com mínimo de 2 caracteres**, igual na web. É decisão de F-ACV-BUSCA:
///   o contrato aceita `q` a partir de 1 caractere, mas uma letra devolve meio acervo.
/// - **Guarda de corrida por geração.** O `ApiClient` não cancela requisição, e um GET antigo
///   ainda pode estar retentando um `503`; toda resposta confere se ainda é da busca atual antes
///   de mexer no estado.
/// - **Página a partir de 1**, acumulada por rolagem, sem repetir id. A falha da página seguinte
///   não apaga as anteriores.
/// - Cold start é carregamento (RNF-ERR-09): depois de 3 s a tela ganha a frase de servidor
///   iniciando, sem virar erro.
class BuscaDeLivrosController extends ChangeNotifier {
  static const Duration espera = Duration(milliseconds: 350);
  static const Duration limiteDoColdStart = Duration(seconds: 3);
  static const int minimoDeCaracteres = 2;

  final AcervoService _servico;

  BuscaDeLivrosController(this._servico);

  EstadoDaBusca estado = EstadoDaBusca.aterrissagem;
  String consulta = '';
  AssuntoResumo? assunto;
  List<AssuntoResumo> assuntos = const <AssuntoResumo>[];

  List<LivroOficialResumo> livros = const <LivroOficialResumo>[];
  List<GrupoDeEdicoes> grupos = const <GrupoDeEdicoes>[];
  int totalItens = 0;
  bool coldStart = false;
  bool carregandoMais = false;
  bool falhouMais = false;

  int _geracao = 0;
  String? _termoBuscado;
  int _proximaPagina = 1;
  int _totalPaginas = 0;
  bool _descartado = false;
  bool _carregandoAssuntos = false;
  Timer? _debounce;
  Timer? _timerDoColdStart;

  bool get temMais => _proximaPagina <= _totalPaginas;

  /// Muda a cada busca nova, nunca na página seguinte: a tela usa para voltar a lista ao topo.
  int get geracao => _geracao;

  /// O `q` que vai ao servidor: aparado, e só a partir de 2 caracteres.
  String? get _termo {
    final aparado = consulta.trim();
    return aparado.length >= minimoDeCaracteres ? aparado : null;
  }

  Future<void> carregarAssuntos() async {
    if (_carregandoAssuntos || assuntos.isNotEmpty) {
      return;
    }
    _carregandoAssuntos = true;
    try {
      final lista = await _servico.listarAssuntos();
      if (_descartado) {
        return;
      }
      assuntos = lista;
      _avisar();
    } on ApiException {
      // Sem a faixa de assuntos a busca por texto continua funcionando; a próxima busca tenta
      // de novo.
    } finally {
      _carregandoAssuntos = false;
    }
  }

  /// A cada tecla. A busca só sai depois de [espera] sem digitar.
  void alterarConsulta(String texto) {
    if (texto == consulta) {
      return;
    }
    consulta = texto;
    _debounce?.cancel();
    if (_termo == null && assunto == null) {
      _voltarParaAterrissagem();
      return;
    }
    // Espaço no fim ou volta ao mesmo texto: o que iria ao servidor não mudou.
    if (_termo == _termoBuscado && estado != EstadoDaBusca.erro) {
      return;
    }
    _debounce = Timer(espera, _buscar);
  }

  /// Seleção única: tocar no assunto ativo o remove (descobrir.md §4.2).
  void alternarAssunto(AssuntoResumo escolhido) {
    assunto = assunto?.id == escolhido.id ? null : escolhido;
    _buscarAgora();
  }

  void limparConsulta() {
    consulta = '';
    _buscarAgora();
  }

  void tentarDeNovo() => _buscarAgora();

  Future<void> carregarMais() async {
    if (!temMais || carregandoMais || estado != EstadoDaBusca.resultados) {
      return;
    }
    final minha = _geracao;
    carregandoMais = true;
    falhouMais = false;
    _avisar();
    try {
      final pagina = await _servico.buscarLivros(
        q: _termo,
        assuntoId: assunto?.id,
        page: _proximaPagina,
      );
      if (minha != _geracao || _descartado) {
        return;
      }
      final vistos = livros.map((livro) => livro.id).toSet();
      _definirLivros(<LivroOficialResumo>[
        ...livros,
        ...pagina.itens.where((livro) => !vistos.contains(livro.id)),
      ]);
      totalItens = pagina.totalItens;
      _totalPaginas = pagina.totalPaginas;
      _proximaPagina = pagina.page + 1;
    } on ApiException {
      if (minha == _geracao) {
        falhouMais = true;
      }
    } finally {
      if (minha == _geracao) {
        carregandoMais = false;
        _avisar();
      }
    }
  }

  void _buscarAgora() {
    _debounce?.cancel();
    if (_termo == null && assunto == null) {
      _voltarParaAterrissagem();
      return;
    }
    _buscar();
  }

  Future<void> _buscar() async {
    final minha = ++_geracao;
    _termoBuscado = _termo;
    _timerDoColdStart?.cancel();
    estado = EstadoDaBusca.buscando;
    coldStart = false;
    carregandoMais = false;
    falhouMais = false;
    _avisar();
    unawaited(carregarAssuntos());
    _timerDoColdStart = Timer(limiteDoColdStart, () {
      if (minha == _geracao && estado == EstadoDaBusca.buscando) {
        coldStart = true;
        _avisar();
      }
    });
    try {
      final pagina = await _servico.buscarLivros(q: _termo, assuntoId: assunto?.id);
      if (minha != _geracao || _descartado) {
        return;
      }
      _definirLivros(pagina.itens);
      totalItens = pagina.totalItens;
      _totalPaginas = pagina.totalPaginas;
      _proximaPagina = pagina.page + 1;
      estado = pagina.itens.isEmpty ? EstadoDaBusca.vazio : EstadoDaBusca.resultados;
    } on ApiException {
      if (minha != _geracao || _descartado) {
        return;
      }
      estado = EstadoDaBusca.erro;
    } finally {
      if (minha == _geracao) {
        _timerDoColdStart?.cancel();
        coldStart = false;
        _avisar();
      }
    }
  }

  void _voltarParaAterrissagem() {
    _geracao++;
    _termoBuscado = null;
    _timerDoColdStart?.cancel();
    estado = EstadoDaBusca.aterrissagem;
    coldStart = false;
    carregandoMais = false;
    falhouMais = false;
    totalItens = 0;
    _proximaPagina = 1;
    _totalPaginas = 0;
    _definirLivros(const <LivroOficialResumo>[]);
    _avisar();
  }

  void _definirLivros(List<LivroOficialResumo> novos) {
    livros = novos;
    grupos = agruparEdicoes(novos);
  }

  void _avisar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _descartado = true;
    _debounce?.cancel();
    _timerDoColdStart?.cancel();
    super.dispose();
  }
}
