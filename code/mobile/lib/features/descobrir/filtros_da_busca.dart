/// Filtros avançados do Descobrir (RF-ACV-03, `descobrir.md` do Período 2). Autor, editora e
/// série são texto livre, sem autocompletar; `ano` é valor único; a faixa de páginas é fechada e
/// cada lado vale sozinho. Mesma regra da web (`code/front/src/livros/filtrosDaBusca.ts`).
library;

/// Um chip por filtro; a faixa de páginas é um chip só.
enum ChaveDoFiltro { autor, editora, serie, ano, paginas }

class ChipDeFiltro {
  final ChaveDoFiltro chave;
  final String rotulo;

  const ChipDeFiltro(this.chave, this.rotulo);
}

/// Teto do contrato para os textos e limites que evitam o `400` do servidor.
const int maximoDoTextoDoFiltro = 200;
const int digitosDoAno = 4;
const int digitosDasPaginas = 5;

const String mensagemFaixaInvertida = 'O mínimo não pode ser maior que o máximo.';
const String mensagemPaginasZero = 'Use um número de páginas maior que zero.';
const String mensagemAnoZero = 'Use um ano maior que zero.';

/// Os filtros aplicados, não o que está digitado no formulário.
class FiltrosDaBusca {
  final String? autor;
  final String? editora;
  final String? serie;
  final int? ano;
  final int? paginasMin;
  final int? paginasMax;

  const FiltrosDaBusca({
    this.autor,
    this.editora,
    this.serie,
    this.ano,
    this.paginasMin,
    this.paginasMax,
  });

  static const FiltrosDaBusca nenhum = FiltrosDaBusca();

  bool get vazio => chips.isEmpty;

  /// O número do badge: a faixa conta 1, e o assunto não entra (já aparece ativo na faixa).
  int get quantidade => chips.length;

  List<ChipDeFiltro> get chips {
    final faixa = rotuloDaFaixa(paginasMin, paginasMax);
    return <ChipDeFiltro>[
      if (autor != null) ChipDeFiltro(ChaveDoFiltro.autor, 'Autor: $autor'),
      if (editora != null) ChipDeFiltro(ChaveDoFiltro.editora, 'Editora: $editora'),
      if (serie != null) ChipDeFiltro(ChaveDoFiltro.serie, 'Série: $serie'),
      if (ano != null) ChipDeFiltro(ChaveDoFiltro.ano, 'Ano: $ano'),
      if (faixa != null) ChipDeFiltro(ChaveDoFiltro.paginas, faixa),
    ];
  }

  /// Remover um chip tira só aquele filtro; o da faixa tira os dois lados.
  FiltrosDaBusca sem(ChaveDoFiltro chave) => FiltrosDaBusca(
    autor: chave == ChaveDoFiltro.autor ? null : autor,
    editora: chave == ChaveDoFiltro.editora ? null : editora,
    serie: chave == ChaveDoFiltro.serie ? null : serie,
    ano: chave == ChaveDoFiltro.ano ? null : ano,
    paginasMin: chave == ChaveDoFiltro.paginas ? null : paginasMin,
    paginasMax: chave == ChaveDoFiltro.paginas ? null : paginasMax,
  );

  /// Parâmetros de `GET /livros`: só os preenchidos.
  Map<String, String> get parametros => <String, String>{
    'autor': ?autor,
    'editora': ?editora,
    'serie': ?serie,
    if (ano != null) 'ano': '$ano',
    if (paginasMin != null) 'paginasMin': '$paginasMin',
    if (paginasMax != null) 'paginasMax': '$paginasMax',
  };

  @override
  bool operator ==(Object other) =>
      other is FiltrosDaBusca &&
      other.autor == autor &&
      other.editora == editora &&
      other.serie == serie &&
      other.ano == ano &&
      other.paginasMin == paginasMin &&
      other.paginasMax == paginasMax;

  @override
  int get hashCode => Object.hash(autor, editora, serie, ano, paginasMin, paginasMax);
}

String? rotuloDaFaixa(int? minimo, int? maximo) {
  if (minimo != null && maximo != null) {
    return '$minimo a $maximo páginas';
  }
  if (minimo != null) {
    return 'A partir de $minimo páginas';
  }
  return maximo != null ? 'Até $maximo páginas' : null;
}

/// O que está digitado no formulário, antes de aplicar.
class RascunhoDosFiltros {
  final String autor;
  final String editora;
  final String serie;
  final String ano;
  final String paginasMin;
  final String paginasMax;

  const RascunhoDosFiltros({
    this.autor = '',
    this.editora = '',
    this.serie = '',
    this.ano = '',
    this.paginasMin = '',
    this.paginasMax = '',
  });

  factory RascunhoDosFiltros.de(FiltrosDaBusca filtros) => RascunhoDosFiltros(
    autor: filtros.autor ?? '',
    editora: filtros.editora ?? '',
    serie: filtros.serie ?? '',
    ano: filtros.ano?.toString() ?? '',
    paginasMin: filtros.paginasMin?.toString() ?? '',
    paginasMax: filtros.paginasMax?.toString() ?? '',
  );

  /// Validação do cliente (`descobrir.md`): com erro, nada vai ao servidor.
  ErrosDosFiltros validar() {
    final ano = _numero(this.ano);
    final minimo = _numero(paginasMin);
    final maximo = _numero(paginasMax);
    final erroDoMinimo = minimo != null && minimo <= 0 ? mensagemPaginasZero : null;
    final erroDoMaximo = maximo != null && maximo <= 0 ? mensagemPaginasZero : null;
    final invertida =
        erroDoMinimo == null &&
        erroDoMaximo == null &&
        minimo != null &&
        maximo != null &&
        minimo > maximo;
    return ErrosDosFiltros(
      ano: ano != null && ano <= 0 ? mensagemAnoZero : null,
      paginasMin: erroDoMinimo,
      paginasMax: erroDoMaximo,
      faixa: invertida ? mensagemFaixaInvertida : null,
    );
  }

  /// Só chamar com o rascunho já validado.
  FiltrosDaBusca paraFiltros() => FiltrosDaBusca(
    autor: _texto(autor),
    editora: _texto(editora),
    serie: _texto(serie),
    ano: _numero(ano),
    paginasMin: _numero(paginasMin),
    paginasMax: _numero(paginasMax),
  );

  static String? _texto(String valor) {
    final aparado = valor.trim();
    if (aparado.isEmpty) {
      return null;
    }
    return aparado.length > maximoDoTextoDoFiltro
        ? aparado.substring(0, maximoDoTextoDoFiltro)
        : aparado;
  }

  static int? _numero(String valor) => int.tryParse(valor.trim());
}

class ErrosDosFiltros {
  final String? ano;
  final String? paginasMin;
  final String? paginasMax;

  /// Faixa invertida: uma mensagem só, abaixo do par, com os dois campos em `rubi`.
  final String? faixa;

  const ErrosDosFiltros({this.ano, this.paginasMin, this.paginasMax, this.faixa});

  bool get algum => ano != null || paginasMin != null || paginasMax != null || faixa != null;

  /// A mensagem anunciada quando o envio é barrado.
  String? get principal => faixa ?? paginasMin ?? paginasMax ?? ano;
}
