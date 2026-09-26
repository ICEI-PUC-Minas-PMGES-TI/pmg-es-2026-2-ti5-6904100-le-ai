import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import 'acervo_service.dart';
import 'livro_oficial.dart';

enum EstadoDaPagina { carregando, pronta, naoEncontrada, erro }

/// Estado da página do livro oficial (pagina-do-livro.md), no molde de `ChangeNotifier` do app.
///
/// - **Polling da sinopse** com esperas crescentes, cerca de 2 minutos no total: cobre o consumidor
///   e alguns livros na fila à frente. Para em `disponivel`, `ausente` ou `falha_transitoria`, e
///   quando a tela sai. Cada consulta aproveita **só a sinopse**: a `GET /livros/{id}` devolve a
///   primeira página de resenhas de novo, e sobrescrever apagaria as já carregadas e os spoilers
///   revelados.
/// - **Resenhas por cursor**, acumuladas. `resenhas: null` na página vira [resenhasIndisponiveis],
///   com "Tentar de novo".
/// - Cold start é carregamento (RNF-ERR-09): depois de 3 s a tela avisa que o servidor está
///   iniciando.
class LivroOficialController extends ChangeNotifier {
  static const List<Duration> esperasDaSinopse = <Duration>[
    Duration(seconds: 2),
    Duration(seconds: 3),
    Duration(seconds: 5),
    Duration(seconds: 8),
    Duration(seconds: 13),
    Duration(seconds: 20),
    Duration(seconds: 30),
    Duration(seconds: 40),
  ];
  static const Duration limiteDoColdStart = Duration(seconds: 3);

  final AcervoService _servico;
  final String livroId;

  LivroOficialController(this._servico, this.livroId);

  EstadoDaPagina estado = EstadoDaPagina.carregando;
  bool coldStart = false;
  LivroOficialDetalhe? livro;
  SinopseDoLivro sinopse = const SinopseDoLivro(status: StatusDaSinopse.pendente, texto: null);

  /// A sinopse ainda estava pendente quando as esperas acabaram.
  bool sinopseDemorou = false;

  List<ResenhaDoLivro> resenhas = const <ResenhaDoLivro>[];
  String? _proximoCursor;
  bool resenhasIndisponiveis = false;
  bool carregandoResenhas = false;

  bool _descartado = false;
  int _consultasDaSinopse = 0;
  Timer? _proximaConsulta;
  Timer? _timerDoColdStart;

  bool get temMaisResenhas => _proximoCursor != null;

  Future<void> carregar() async {
    estado = EstadoDaPagina.carregando;
    coldStart = false;
    _avisar();
    _timerDoColdStart?.cancel();
    _timerDoColdStart = Timer(limiteDoColdStart, () {
      if (estado == EstadoDaPagina.carregando) {
        coldStart = true;
        _avisar();
      }
    });
    try {
      final detalhe = await _servico.obterLivroOficial(livroId);
      if (_descartado) {
        return;
      }
      livro = detalhe;
      sinopse = detalhe.sinopse;
      sinopseDemorou = false;
      resenhasIndisponiveis = detalhe.resenhas == null;
      resenhas = detalhe.resenhas?.itens ?? const <ResenhaDoLivro>[];
      _proximoCursor = detalhe.resenhas?.proximoCursor;
      estado = EstadoDaPagina.pronta;
      _consultasDaSinopse = 0;
      _agendarSinopse();
    } on ApiException catch (erro) {
      if (_descartado) {
        return;
      }
      estado = erro.status == 404 ? EstadoDaPagina.naoEncontrada : EstadoDaPagina.erro;
    } finally {
      _timerDoColdStart?.cancel();
      coldStart = false;
      _avisar();
    }
  }

  /// "Ver todas as resenhas" e o "Tentar de novo" das resenhas indisponíveis.
  Future<void> carregarResenhas() async {
    if (carregandoResenhas) {
      return;
    }
    final continuacao = !resenhasIndisponiveis;
    if (continuacao && _proximoCursor == null) {
      return;
    }
    carregandoResenhas = true;
    _avisar();
    try {
      final pagina = await _servico.listarResenhasDoLivro(
        livroId,
        cursor: continuacao ? _proximoCursor : null,
      );
      if (_descartado) {
        return;
      }
      final vistas = resenhas.map((resenha) => resenha.id).toSet();
      resenhas = <ResenhaDoLivro>[
        if (continuacao) ...resenhas,
        ...pagina.itens.where((resenha) => !continuacao || !vistas.contains(resenha.id)),
      ];
      _proximoCursor = pagina.proximoCursor;
      resenhasIndisponiveis = false;
    } on ApiException {
      if (!continuacao) {
        resenhasIndisponiveis = true;
      }
    } finally {
      carregandoResenhas = false;
      _avisar();
    }
  }

  void _agendarSinopse() {
    _proximaConsulta?.cancel();
    if (sinopse.status != StatusDaSinopse.pendente &&
        sinopse.status != StatusDaSinopse.naoConsultada) {
      return;
    }
    if (_consultasDaSinopse >= esperasDaSinopse.length) {
      sinopseDemorou = true;
      _avisar();
      return;
    }
    _proximaConsulta = Timer(esperasDaSinopse[_consultasDaSinopse++], _consultarSinopse);
  }

  Future<void> _consultarSinopse() async {
    try {
      final detalhe = await _servico.obterLivroOficial(livroId);
      if (_descartado) {
        return;
      }
      sinopse = detalhe.sinopse;
      _avisar();
    } on ApiException {
      // Uma consulta perdida não é erro de tela: a próxima espera tenta de novo.
    }
    if (!_descartado) {
      _agendarSinopse();
    }
  }

  void _avisar() {
    if (!_descartado) {
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _descartado = true;
    _proximaConsulta?.cancel();
    _timerDoColdStart?.cancel();
    super.dispose();
  }
}
