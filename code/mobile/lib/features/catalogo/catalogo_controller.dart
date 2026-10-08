import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../descobrir/agrupar_edicoes.dart';
import '../livros/acervo_service.dart';
import '../livros/livro_oficial.dart';

enum TipoDeCatalogo { autor, editora, serie }

enum EstadoDoCatalogo { carregando, pronta, naoEncontrada, erro }

/// Um card da lista: o grupo de edições e, na série, o número de ordem (`null` no bloco `Sem
/// número na série`, e sempre em autor e editora).
class GrupoDoCatalogo {
  final int? numero;
  final GrupoDeEdicoes grupo;

  const GrupoDoCatalogo(this.numero, this.grupo);
}

/// Estado das páginas de autor, editora e série (F-ACV-DESCOBERTA), no molde do
/// `LivroOficialController` para a página e do `BuscaDeLivrosController` para os livros.
///
/// - **Página a partir de 1**, acumulada por rolagem, sem repetir id. A falha da página seguinte
///   não apaga as anteriores. Cada página reenvia o cabeçalho, que fica o da primeira.
/// - **Série:** as edições só se agrupam dentro do mesmo número de ordem; os sem número vão para
///   [semNumero], no fim. Lacuna na numeração não gera item.
/// - Cold start é carregamento (RNF-ERR-09); 404 e 400 (id malformado) são "não encontrada".
class CatalogoController extends ChangeNotifier {
  static const Duration limiteDoColdStart = Duration(seconds: 3);

  final AcervoService _servico;
  final TipoDeCatalogo tipo;
  final String id;

  CatalogoController(this._servico, this.tipo, this.id);

  EstadoDoCatalogo estado = EstadoDoCatalogo.carregando;
  bool coldStart = false;
  PaginaDeCatalogo? pagina;
  List<LivroOficialResumo> livros = const <LivroOficialResumo>[];
  List<GrupoDoCatalogo> grupos = const <GrupoDoCatalogo>[];
  List<GrupoDoCatalogo> semNumero = const <GrupoDoCatalogo>[];
  int totalItens = 0;
  bool carregandoMais = false;
  bool falhouMais = false;

  int _proximaPagina = 1;
  int _totalPaginas = 0;
  int _geracao = 0;
  bool _descartado = false;
  Timer? _timerDoColdStart;

  bool get temMais => _proximaPagina <= _totalPaginas;

  Future<PaginaDeCatalogo> _obter(int page) => switch (tipo) {
    TipoDeCatalogo.autor => _servico.obterAutor(id, page: page),
    TipoDeCatalogo.editora => _servico.obterEditora(id, page: page),
    TipoDeCatalogo.serie => _servico.obterSerie(id, page: page),
  };

  Future<void> carregar() async {
    final minha = ++_geracao;
    estado = EstadoDoCatalogo.carregando;
    coldStart = false;
    carregandoMais = false;
    falhouMais = false;
    _avisar();
    _timerDoColdStart?.cancel();
    _timerDoColdStart = Timer(limiteDoColdStart, () {
      if (minha == _geracao && estado == EstadoDoCatalogo.carregando) {
        coldStart = true;
        _avisar();
      }
    });
    try {
      final resposta = await _obter(1);
      if (minha != _geracao || _descartado) {
        return;
      }
      pagina = resposta;
      _definirLivros(resposta.livros.itens);
      _definirPaginacao(resposta.livros);
      estado = EstadoDoCatalogo.pronta;
    } on ApiException catch (erro) {
      if (minha != _geracao || _descartado) {
        return;
      }
      estado = erro.status == 404 || erro.status == 400
          ? EstadoDoCatalogo.naoEncontrada
          : EstadoDoCatalogo.erro;
    } finally {
      if (minha == _geracao) {
        _timerDoColdStart?.cancel();
        coldStart = false;
        _avisar();
      }
    }
  }

  Future<void> carregarMais() async {
    if (!temMais || carregandoMais || estado != EstadoDoCatalogo.pronta) {
      return;
    }
    final minha = _geracao;
    carregandoMais = true;
    falhouMais = false;
    _avisar();
    try {
      final resposta = await _obter(_proximaPagina);
      if (minha != _geracao || _descartado) {
        return;
      }
      final vistos = livros.map((livro) => livro.id).toSet();
      _definirLivros(<LivroOficialResumo>[
        ...livros,
        ...resposta.livros.itens.where((livro) => !vistos.contains(livro.id)),
      ]);
      _definirPaginacao(resposta.livros);
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

  void _definirPaginacao(PaginaLivros livrosDaPagina) {
    totalItens = livrosDaPagina.totalItens;
    _totalPaginas = livrosDaPagina.totalPaginas;
    _proximaPagina = livrosDaPagina.page + 1;
  }

  void _definirLivros(List<LivroOficialResumo> novos) {
    livros = novos;
    if (tipo != TipoDeCatalogo.serie) {
      grupos = <GrupoDoCatalogo>[
        for (final grupo in agruparEdicoes(novos)) GrupoDoCatalogo(null, grupo),
      ];
      return;
    }
    final numerados = <GrupoDoCatalogo>[];
    var trecho = <LivroOficialResumo>[];
    void fecharTrecho() {
      for (final grupo in agruparEdicoes(trecho)) {
        numerados.add(GrupoDoCatalogo(trecho.first.numeroNaSerie, grupo));
      }
      trecho = <LivroOficialResumo>[];
    }

    for (final livro in novos.where((livro) => livro.numeroNaSerie != null)) {
      if (trecho.isNotEmpty && trecho.first.numeroNaSerie != livro.numeroNaSerie) {
        fecharTrecho();
      }
      trecho.add(livro);
    }
    fecharTrecho();
    grupos = numerados;
    semNumero = <GrupoDoCatalogo>[
      for (final grupo in agruparEdicoes(
        novos.where((livro) => livro.numeroNaSerie == null).toList(),
      ))
        GrupoDoCatalogo(null, grupo),
    ];
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
