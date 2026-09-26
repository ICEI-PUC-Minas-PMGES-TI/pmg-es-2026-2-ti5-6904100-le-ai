import { resolverCapa } from './capa';

const PROPRIA = 'https://res.cloudinary.com/leai/image/upload/v1/capas/a.jpg';
const EXTERNA = 'https://covers.openlibrary.org/b/id/1-L.jpg';

describe('resolverCapa', () => {
  it('prefere a cópia própria', () => {
    expect(resolverCapa(PROPRIA, EXTERNA)).toEqual({
      url: PROPRIA,
      origem: 'propria',
    });
  });

  it('usa a URL externa quando não há cópia própria', () => {
    expect(resolverCapa(null, EXTERNA)).toEqual({
      url: EXTERNA,
      origem: 'externa',
    });
  });

  it('cai no placeholder sem URL nenhuma', () => {
    expect(resolverCapa(null, null)).toEqual({
      url: null,
      origem: 'placeholder',
    });
  });
});
