import 'package:flutter_test/flutter_test.dart';

import 'package:le_ai_mobile/features/descobrir/filtros_da_busca.dart';

void main() {
  test('chips no formato do protótipo, com a faixa num chip só', () {
    const filtros = FiltrosDaBusca(
      autor: 'Evaristo',
      editora: 'Pallas',
      serie: 'Duna',
      ano: 2019,
      paginasMin: 100,
      paginasMax: 150,
    );

    expect(filtros.chips.map((chip) => chip.rotulo), <String>[
      'Autor: Evaristo',
      'Editora: Pallas',
      'Série: Duna',
      'Ano: 2019',
      '100 a 150 páginas',
    ]);
    expect(filtros.quantidade, 5);
    expect(const FiltrosDaBusca(paginasMin: 100).chips.single.rotulo, 'A partir de 100 páginas');
    expect(const FiltrosDaBusca(paginasMax: 150).chips.single.rotulo, 'Até 150 páginas');
    expect(FiltrosDaBusca.nenhum.vazio, isTrue);
  });

  test('remover a faixa tira os dois lados', () {
    const filtros = FiltrosDaBusca(ano: 2019, paginasMin: 100, paginasMax: 150);

    expect(filtros.sem(ChaveDoFiltro.paginas), const FiltrosDaBusca(ano: 2019));
    expect(filtros.sem(ChaveDoFiltro.ano), const FiltrosDaBusca(paginasMin: 100, paginasMax: 150));
  });

  test('parâmetros só com o que está preenchido', () {
    expect(const FiltrosDaBusca(autor: 'evaristo', paginasMax: 300).parametros, <String, String>{
      'autor': 'evaristo',
      'paginasMax': '300',
    });
  });

  test('valida a faixa com as mensagens do protótipo', () {
    expect(
      const RascunhoDosFiltros(paginasMin: '200', paginasMax: '100').validar().faixa,
      mensagemFaixaInvertida,
    );
    final zero = const RascunhoDosFiltros(paginasMin: '0').validar();
    expect(zero.paginasMin, mensagemPaginasZero);
    expect(zero.faixa, isNull);
    expect(const RascunhoDosFiltros(paginasMin: '100', paginasMax: '100').validar().algum, isFalse);
    expect(const RascunhoDosFiltros(ano: '0').validar().ano, mensagemAnoZero);
  });

  test('o rascunho vira filtros aparados, com vazio como ausente', () {
    expect(
      const RascunhoDosFiltros(autor: '  Evaristo ', editora: '   ', ano: '2019').paraFiltros(),
      const FiltrosDaBusca(autor: 'Evaristo', ano: 2019),
    );
    expect(
      RascunhoDosFiltros.de(const FiltrosDaBusca(serie: 'Duna', paginasMin: 10)).paraFiltros(),
      const FiltrosDaBusca(serie: 'Duna', paginasMin: 10),
    );
  });
}
