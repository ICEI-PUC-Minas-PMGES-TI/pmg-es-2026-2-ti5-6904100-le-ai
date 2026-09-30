import {
  digitoVerificadorConfere,
  isbn13DeIsbn10,
  normalizarIsbn13,
} from './isbn';

describe('normalizarIsbn13', () => {
  it.each([
    '9788535914849',
    '978-85-359-1484-9',
    '978 85 359 1484 9',
    ' 9788535914849 ',
  ])('aceita %s e devolve só os dígitos', (entrada) => {
    expect(normalizarIsbn13(entrada)).toBe('9788535914849');
  });

  it('recusa dígito verificador errado', () => {
    expect(normalizarIsbn13('9788535914840')).toBeNull();
  });

  it('recusa ISBN-10', () => {
    expect(normalizarIsbn13('8535914849')).toBeNull();
  });

  it('recusa prefixo fora de 978/979', () => {
    expect(normalizarIsbn13('1238535914849')).toBeNull();
  });

  // RNF-SEC-38: o cadastro por ISBN não aceita URL do usuário. É este teste que
  // trava a regra — uma URL com um ISBN dentro não pode virar um ISBN válido.
  it.each([
    'https://openlibrary.org/isbn/9788535914849',
    'http://localhost/9788535914849',
    'file:///9788535914849',
  ])('recusa URL disfarçada de ISBN: %s', (entrada) => {
    expect(normalizarIsbn13(entrada)).toBeNull();
  });

  it('recusa vazio e ausente', () => {
    expect(normalizarIsbn13('')).toBeNull();
    expect(normalizarIsbn13(null)).toBeNull();
    expect(normalizarIsbn13(undefined)).toBeNull();
  });

  it('aceita o prefixo 979', () => {
    expect(digitoVerificadorConfere('9791234567896')).toBe(true);
  });
});

describe('isbn13DeIsbn10', () => {
  it.each(['8535914846', '85-359-1484-6', ' 85 359 1484 6 '])(
    'converte %s no ISBN-13 da mesma edição',
    (entrada) => {
      expect(isbn13DeIsbn10(entrada)).toBe('9788535914849');
    },
  );

  it('aceita o X como dígito verificador, em qualquer caixa', () => {
    expect(isbn13DeIsbn10('080442957X')).toBe('9780804429573');
    expect(isbn13DeIsbn10('080442957x')).toBe('9780804429573');
  });

  it('recusa dígito verificador errado, ISBN-13 e URL', () => {
    expect(isbn13DeIsbn10('8535914849')).toBeNull();
    expect(isbn13DeIsbn10('9788535914849')).toBeNull();
    expect(isbn13DeIsbn10('http://x/8535914846')).toBeNull();
    expect(isbn13DeIsbn10(null)).toBeNull();
  });
});
