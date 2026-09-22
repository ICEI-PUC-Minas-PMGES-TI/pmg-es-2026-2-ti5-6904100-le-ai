import {
  normalizarEditora,
  normalizarNome,
  normalizarNomeAutor,
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
});
