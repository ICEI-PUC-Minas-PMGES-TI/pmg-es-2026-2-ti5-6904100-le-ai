import { MAXIMO_DE_PALAVRAS, palavrasDaBusca } from './palavras-da-busca';

describe('palavrasDaBusca', () => {
  it('separa por espaço, inclusive espaços repetidos', () => {
    expect(palavrasDaBusca('torto   arado')).toEqual(['torto', 'arado']);
  });

  it('descarta a palavra só de pontuação quando há outra com letra', () => {
    expect(palavrasDaBusca('grande sertão - veredas')).toEqual([
      'grande',
      'sertão',
      'veredas',
    ]);
  });

  it('tira a pontuação das pontas e mantém a do meio', () => {
    expect(palavrasDaBusca('dom casmurro.')).toEqual(['dom', 'casmurro']);
    expect(palavrasDaBusca('grande sertão, veredas')).toEqual([
      'grande',
      'sertão',
      'veredas',
    ]);
    expect(palavrasDaBusca('d’água nome_de')).toEqual(['d’água', 'nome_de']);
  });

  it('sem nenhuma palavra com letra ou número, fica o que foi digitado', () => {
    expect(palavrasDaBusca('%')).toEqual(['%']);
    expect(palavrasDaBusca('\\ %')).toEqual(['\\', '%']);
  });

  it('número conta como palavra', () => {
    expect(palavrasDaBusca('1984 -')).toEqual(['1984']);
    expect(palavrasDaBusca('100%')).toEqual(['100']);
  });

  it('tira a palavra repetida ou contida em outra, que não filtra nada a mais', () => {
    expect(palavrasDaBusca('o senhor dos aneis')).toEqual([
      'senhor',
      'dos',
      'aneis',
    ]);
    expect(palavrasDaBusca('Rosa rosa ROSA')).toEqual(['Rosa']);
  });

  it(`fica com no máximo ${MAXIMO_DE_PALAVRAS} palavras, as mais longas`, () => {
    const muitas = palavrasDaBusca(
      'aa bb cc dd ee ff gg hh ii jj kkkk llll mmmm',
    );
    expect(muitas).toHaveLength(MAXIMO_DE_PALAVRAS);
    expect(muitas).toEqual(expect.arrayContaining(['kkkk', 'llll', 'mmmm']));
    expect(palavrasDaBusca(Array(100).fill('a').join(' '))).toEqual(['a']);
  });
});
