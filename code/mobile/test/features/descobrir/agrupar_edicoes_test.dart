import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/descobrir/agrupar_edicoes.dart';
import 'package:le_ai_mobile/features/livros/livro_oficial.dart';

LivroOficialResumo _livro(
  String id,
  String titulo, {
  List<String> autores = const <String>['evaristo'],
  int? ano,
}) {
  return LivroOficialResumo(
    id: id,
    titulo: titulo,
    autores: <AutorResumo>[for (final autor in autores) AutorResumo(id: autor, nome: autor)],
    editora: 'Pallas',
    anoPublicacao: ano,
    paginas: 128,
    capaUrl: null,
    assuntos: const <AssuntoResumo>[],
  );
}

List<List<String>> _ids(List<GrupoDeEdicoes> grupos) => <List<String>>[
  for (final grupo in grupos) <String>[for (final livro in grupo.edicoes) livro.id],
];

void main() {
  test('junta edições vizinhas de mesmo título e autores, a primeira como principal', () {
    final grupos = agruparEdicoes(<LivroOficialResumo>[
      _livro('2018', 'Ponciá Vicêncio', ano: 2018),
      _livro('2017', 'Ponciá Vicêncio', ano: 2017),
      _livro('2003', 'Ponciá Vicêncio', ano: 2003),
      _livro('becos', 'Becos da Memória'),
    ]);

    expect(_ids(grupos), <List<String>>[
      <String>['2018', '2017', '2003'],
      <String>['becos'],
    ]);
    expect(grupos.first.principal.anoPublicacao, 2018);
    expect(grupos.first.outras.map((livro) => livro.id), <String>['2017', '2003']);
  });

  test('ignora acento, maiúscula e espaço nas pontas do título', () {
    final grupos = agruparEdicoes(<LivroOficialResumo>[
      _livro('a', 'Ponciá Vicêncio'),
      _livro('b', ' PONCIA VICENCIO '),
    ]);
    expect(_ids(grupos), <List<String>>[
      <String>['a', 'b'],
    ]);
  });

  test('autores diferentes são obras diferentes, na ordem que forem', () {
    final grupos = agruparEdicoes(<LivroOficialResumo>[
      _livro('a', 'Poemas', autores: <String>['x']),
      _livro('b', 'Poemas', autores: <String>['y']),
    ]);
    expect(_ids(grupos), <List<String>>[
      <String>['a'],
      <String>['b'],
    ]);
  });

  test('a ordem dos autores não muda a obra', () {
    final grupos = agruparEdicoes(<LivroOficialResumo>[
      _livro('a', 'A quatro mãos', autores: <String>['x', 'y']),
      _livro('b', 'A quatro mãos', autores: <String>['y', 'x']),
    ]);
    expect(_ids(grupos), <List<String>>[
      <String>['a', 'b'],
    ]);
  });

  test('livro sem autor nunca se agrupa', () {
    final grupos = agruparEdicoes(<LivroOficialResumo>[
      _livro('a', 'Poemas', autores: <String>[]),
      _livro('b', 'Poemas', autores: <String>[]),
    ]);
    expect(_ids(grupos), <List<String>>[
      <String>['a'],
      <String>['b'],
    ]);
  });

  test('só agrupa vizinhos: o mesmo título separado por outro livro são dois grupos', () {
    final grupos = agruparEdicoes(<LivroOficialResumo>[
      _livro('a', 'Poemas'),
      _livro('b', 'Outro'),
      _livro('c', 'Poemas'),
    ]);
    expect(grupos, hasLength(3));
  });
}
