import { EntidadeInvalida } from '../common/erros-de-negocio';
import {
  contarCaracteres,
  urlOuNulo,
  validarTextoDaResenha,
  validarValorDaNota,
} from './regras';

describe('validarValorDaNota (RN-06)', () => {
  it.each([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])('aceita %d', (valor) => {
    expect(() => validarValorDaNota(valor)).not.toThrow();
  });

  it.each([-0.5, 5.5, 4.3, 0.25, 10, -1])('recusa %d com 422', (valor) => {
    expect(() => validarValorDaNota(valor)).toThrow(EntidadeInvalida);
  });

  it('aponta o campo valor', () => {
    let erro: unknown;
    try {
      validarValorDaNota(4.3);
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(EntidadeInvalida);
    expect((erro as EntidadeInvalida).getStatus()).toBe(422);
    expect((erro as EntidadeInvalida).extras).toEqual({
      campos: [
        {
          campo: 'valor',
          mensagem: 'Use uma nota de 0 a 5, em passos de 0,5.',
        },
      ],
    });
  });
});

describe('contarCaracteres', () => {
  it('conta code points, não unidades UTF-16', () => {
    expect(contarCaracteres('abc')).toBe(3);
    expect(contarCaracteres('😀')).toBe(1);
    expect('😀'.length).toBe(2);
  });

  it('emoji composto conta mais de 1, como no char_length do banco', () => {
    expect(contarCaracteres('👍🏽')).toBe(2);
    expect(contarCaracteres('❤️')).toBe(2);
  });
});

describe('validarTextoDaResenha (RN-07)', () => {
  it('aceita 1 e 5.000 caracteres', () => {
    expect(() => validarTextoDaResenha('a')).not.toThrow();
    expect(() => validarTextoDaResenha('a'.repeat(5000))).not.toThrow();
  });

  it('5.000 emojis de um code point ainda cabem', () => {
    expect(() => validarTextoDaResenha('😀'.repeat(5000))).not.toThrow();
  });

  it('recusa 5.001 com a contagem do excedente', () => {
    let erro: unknown;
    try {
      validarTextoDaResenha('a'.repeat(5126));
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(EntidadeInvalida);
    expect((erro as EntidadeInvalida).extras).toEqual({
      campos: [
        {
          campo: 'texto',
          mensagem: 'A resenha passou do limite em 126 caracteres.',
        },
      ],
    });
  });

  it('recusa texto só com espaços', () => {
    expect(() => validarTextoDaResenha('   \n\t ')).toThrow(EntidadeInvalida);
  });

  it('recusa texto só com caracteres invisíveis (largura zero, BOM)', () => {
    expect(() => validarTextoDaResenha('\u200b \u2060\ufeff')).toThrow(
      EntidadeInvalida,
    );
  });

  // O Postgres não guarda o caractere nulo em `text`: sem esta regra, virava 500.
  it('recusa o caractere nulo com 422', () => {
    expect(() => validarTextoDaResenha('a\u0000b')).toThrow(EntidadeInvalida);
  });
});

describe('urlOuNulo', () => {
  it('mantém URL http(s) válida', () => {
    expect(urlOuNulo('https://covers.openlibrary.org/b/id/1-L.jpg')).toBe(
      'https://covers.openlibrary.org/b/id/1-L.jpg',
    );
  });

  // A outbox valida `format: uri` (RFC 3986, só ASCII): o que ela recusaria dava 500.
  it('codifica acento em vez de deixar a outbox recusar o evento', () => {
    expect(urlOuNulo('https://res.cloudinary.com/x/capa-ação.jpg')).toBe(
      'https://res.cloudinary.com/x/capa-a%C3%A7%C3%A3o.jpg',
    );
  });

  it.each([
    null,
    '',
    'capa.jpg',
    'ftp://x.org/a.jpg',
    'https://x.org/a b.jpg',
    'https://x.org/1|2.jpg',
    'https://x.org/a%zz.jpg',
  ])('troca %p por null', (valor) => {
    expect(urlOuNulo(valor)).toBeNull();
  });
});
