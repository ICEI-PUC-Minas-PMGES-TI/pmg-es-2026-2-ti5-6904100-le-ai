/// Corpos de `GET /livros` e `GET /assuntos` no formato de `docs/api/acervo.yaml`, para os testes
/// da busca.
library;

Map<String, Object?> livroJson(
  String id,
  String titulo, {
  List<Map<String, String>> autores = const <Map<String, String>>[
    <String, String>{'id': 'autor-1', 'nome': 'Conceição Evaristo'},
  ],
  String? editora = 'Pallas',
  int? ano = 2003,
  int paginas = 128,
  String? capa,
}) {
  return <String, Object?>{
    'id': id,
    'titulo': titulo,
    'autores': autores,
    'editora': editora,
    'anoPublicacao': ano,
    'paginas': paginas,
    'capa': <String, Object?>{'url': capa, 'origem': capa == null ? 'placeholder' : 'externa'},
    'assuntos': <Object?>[],
  };
}

Map<String, Object?> paginaJson(
  List<Map<String, Object?>> itens, {
  int page = 1,
  int? totalItens,
  int totalPaginas = 1,
}) {
  return <String, Object?>{
    'itens': itens,
    'page': page,
    'limit': 20,
    'totalItens': totalItens ?? itens.length,
    'totalPaginas': totalPaginas,
  };
}

const Map<String, Object?> assuntosJson = <String, Object?>{
  'itens': <Object?>[
    <String, String>{'id': 'romance', 'nome': 'Romance'},
    <String, String>{'id': 'conto', 'nome': 'Conto'},
    <String, String>{'id': 'terror', 'nome': 'Terror'},
  ],
};
