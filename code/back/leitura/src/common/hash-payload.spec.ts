import { hashDoPayload } from './hash-payload';

describe('hashDoPayload', () => {
  it('não depende da ordem das chaves', () => {
    expect(hashDoPayload({ a: 1, b: 2 })).toBe(hashDoPayload({ b: 2, a: 1 }));
  });

  it('não depende da ordem em objetos aninhados', () => {
    expect(hashDoPayload({ x: { a: 1, b: 2 } })).toBe(
      hashDoPayload({ x: { b: 2, a: 1 } }),
    );
  });

  it('respeita a ordem de array, que é significativa', () => {
    expect(hashDoPayload([1, 2])).not.toBe(hashDoPayload([2, 1]));
  });

  it('distingue null de chave ausente', () => {
    expect(hashDoPayload({ sinopse: null })).not.toBe(hashDoPayload({}));
  });

  it('trata undefined como ausente, igual ao JSON', () => {
    expect(hashDoPayload({ a: 1, b: undefined })).toBe(hashDoPayload({ a: 1 }));
  });

  it('distingue valores de tipos diferentes', () => {
    expect(hashDoPayload({ paginas: 1 })).not.toBe(
      hashDoPayload({ paginas: '1' }),
    );
  });
});
