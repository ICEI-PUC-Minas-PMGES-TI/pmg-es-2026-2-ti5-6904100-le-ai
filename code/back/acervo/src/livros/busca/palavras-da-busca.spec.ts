import { palavrasDaBusca } from './palavras-da-busca';

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

  it('mantém a pontuação colada na palavra', () => {
    expect(palavrasDaBusca('d’água nome_de')).toEqual(['d’água', 'nome_de']);
  });

  it('sem nenhuma palavra com letra ou número, fica o que foi digitado', () => {
    expect(palavrasDaBusca('%')).toEqual(['%']);
    expect(palavrasDaBusca('\\ %')).toEqual(['\\', '%']);
  });

  it('número conta como palavra', () => {
    expect(palavrasDaBusca('1984 -')).toEqual(['1984']);
  });
});
