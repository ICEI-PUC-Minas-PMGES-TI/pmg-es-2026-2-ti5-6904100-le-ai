import {
  normalizarEditora,
  normalizarNome,
  normalizarNomeAutor,
  nomeDeAutorUtilizavel,
} from './normalizacao';

// Os mesmos casos de `code/scripts/ingestao/tests/test_normalizacao.py`, de
// propósito: se as duas implementações divergirem, uma das suítes quebra.
describe('normalização RN-12', () => {
  it.each([
    ['Editora Intrínseca', 'intrínseca'],
    ['Rocco Ltda.', 'rocco'],
    ['Companhia das Letras Ltda', 'companhia das letras'],
    ['  EDITORA   ROCCO  ', 'rocco'],
    ['Editora 34', '34'],
  ])(
    'editora "%s" perde sufixo societário e moldura de ramo',
    (entrada, esperado) => {
      expect(normalizarEditora(entrada)).toBe(esperado);
    },
  );

  it.each([
    'Globo Livros',
    'Universo dos Livros',
    'Geração Editorial',
    'DarkSide Books',
  ])('palavra de ramo no fim faz parte da marca: %s', (entrada) => {
    expect(normalizarEditora(entrada)).toBe(normalizarNome(entrada));
  });

  it('editora preserva acento porque é o sinônimo que resolve', () => {
    expect(normalizarEditora('Intrinseca')).not.toBe(
      normalizarEditora('Intrínseca'),
    );
  });

  it('editora sozinha não vira vazio', () => {
    expect(normalizarEditora('Editora')).toBe('editora');
    expect(normalizarEditora('')).toBe('');
    expect(normalizarEditora(null)).toBe('');
  });

  it('autor deduplica por caixa e acento', () => {
    expect(normalizarNomeAutor('José Saramago')).toBe(
      normalizarNomeAutor('JOSE  saramago'),
    );
  });

  // A fonte manda parte dos nomes decomposta (NFD). O acento solto não é letra,
  // e sem compor antes ele virava espaço: "João" saía "joa o".
  it.each([
    [normalizarNomeAutor, 'João Guimarães Rosa', 'joao guimaraes rosa'],
    [normalizarEditora, 'Civilização Brasileira', 'civilização brasileira'],
    [
      normalizarNome,
      'Coleção Memória da educação',
      'coleção memória da educação',
    ],
  ])(
    'nome decomposto normaliza igual ao composto (%#)',
    (funcao, composto, esperado) => {
      const decomposto = composto.normalize('NFD');
      expect(decomposto).not.toBe(composto);
      expect(funcao(decomposto)).toBe(esperado);
      expect(funcao(composto)).toBe(esperado);
    },
  );

  it.each([
    '[author not identified]',
    '[Unknown]',
    'Unknown',
    'Autor desconhecido',
    'invalid author ID',
    '   ',
  ])('marcador de catálogo não é nome de autor: "%s"', (nome) => {
    expect(nomeDeAutorUtilizavel(nome)).toBe(false);
  });

  it.each(['Austin Kleon', 'Anônimo', 'Machado de Assis'])(
    'nome real continua valendo: %s',
    (nome) => {
      expect(nomeDeAutorUtilizavel(nome)).toBe(true);
    },
  );
});
