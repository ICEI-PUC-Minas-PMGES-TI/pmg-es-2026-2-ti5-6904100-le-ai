/// Livro oficial como a busca do `acervo` o devolve (`LivroOficialResumo`, `PaginaLivros` e
/// `ListaAssuntos` em `docs/api/acervo.yaml`).
///
/// O parse é defensivo: item que não tem a forma do contrato é descartado em vez de virar
/// `TypeError` no meio da lista, e só a ausência da própria página é tratada como resposta
/// inválida (quem faz isso é o serviço).
library;

class AssuntoResumo {
  final String id;
  final String nome;

  const AssuntoResumo({required this.id, required this.nome});

  static AssuntoResumo? deJson(Object? bruto) {
    if (bruto is! Map<String, dynamic>) {
      return null;
    }
    final id = bruto['id'];
    final nome = bruto['nome'];
    if (id is! String || nome is! String) {
      return null;
    }
    return AssuntoResumo(id: id, nome: nome);
  }
}

class AutorResumo {
  final String id;
  final String nome;

  const AutorResumo({required this.id, required this.nome});

  static AutorResumo? deJson(Object? bruto) {
    if (bruto is! Map<String, dynamic>) {
      return null;
    }
    final id = bruto['id'];
    final nome = bruto['nome'];
    if (id is! String || nome is! String) {
      return null;
    }
    return AutorResumo(id: id, nome: nome);
  }
}

/// Uma edição (RN-01). Editora, ano e autores podem faltar: parte do acervo carregado não os tem,
/// e a tela omite o que falta em vez de inventar.
class LivroOficialResumo {
  final String id;
  final String titulo;
  final List<AutorResumo> autores;
  final String? editora;
  final int? anoPublicacao;
  final int paginas;

  /// Capa já resolvida pelo servidor (cópia própria, depois URL externa, RN-14.4). Nula cai no
  /// placeholder textual.
  final String? capaUrl;
  final List<AssuntoResumo> assuntos;

  const LivroOficialResumo({
    required this.id,
    required this.titulo,
    required this.autores,
    required this.editora,
    required this.anoPublicacao,
    required this.paginas,
    required this.capaUrl,
    required this.assuntos,
  });

  /// Autores para exibição, na ordem do servidor (por nome). Nulo quando não há autor.
  String? get autoresParaExibir =>
      autores.isEmpty ? null : autores.map((autor) => autor.nome).join(', ');

  static LivroOficialResumo? deJson(Object? bruto) {
    if (bruto is! Map<String, dynamic>) {
      return null;
    }
    final id = bruto['id'];
    final titulo = bruto['titulo'];
    final paginas = bruto['paginas'];
    if (id is! String || titulo is! String || paginas is! num) {
      return null;
    }
    final editora = bruto['editora'];
    final ano = bruto['anoPublicacao'];
    final capa = bruto['capa'];
    final url = capa is Map<String, dynamic> ? capa['url'] : null;
    return LivroOficialResumo(
      id: id,
      titulo: titulo,
      autores: _lista(bruto['autores'], AutorResumo.deJson),
      editora: editora is String ? editora : null,
      anoPublicacao: ano is num ? ano.toInt() : null,
      paginas: paginas.toInt(),
      capaUrl: url is String ? url : null,
      assuntos: _lista(bruto['assuntos'], AssuntoResumo.deJson),
    );
  }
}

/// Página da busca, **a partir de 1** (`page`), ao contrário das listas de F-PERFIL.
class PaginaLivros {
  final List<LivroOficialResumo> itens;
  final int page;
  final int totalItens;
  final int totalPaginas;

  const PaginaLivros({
    required this.itens,
    required this.page,
    required this.totalItens,
    required this.totalPaginas,
  });

  /// Nulo quando o corpo não é uma página: o serviço transforma isso em resposta inválida.
  static PaginaLivros? deJson(Map<String, dynamic> json) {
    final itens = json['itens'];
    final page = json['page'];
    final totalItens = json['totalItens'];
    final totalPaginas = json['totalPaginas'];
    if (itens is! List || page is! num || totalItens is! num || totalPaginas is! num) {
      return null;
    }
    return PaginaLivros(
      itens: _lista(itens, LivroOficialResumo.deJson),
      page: page.toInt(),
      totalItens: totalItens.toInt(),
      totalPaginas: totalPaginas.toInt(),
    );
  }
}

List<T> _lista<T>(Object? bruto, T? Function(Object?) item) {
  if (bruto is! List) {
    return <T>[];
  }
  return <T>[for (final elemento in bruto) ?item(elemento)];
}
