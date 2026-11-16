import { podeVerResenhaDeOutroLeitor } from './privacidade-de-resenha';

const LEITOR = '00000000-0000-4000-8000-000000000001';
const AUTOR = '00000000-0000-4000-8000-000000000002';

describe('podeVerResenhaDeOutroLeitor (RN-08)', () => {
  it('perfil público: qualquer leitor vê a resenha', () => {
    expect(
      podeVerResenhaDeOutroLeitor({
        leitorId: LEITOR,
        autorId: AUTOR,
        privacidade: 'publico',
        segue: false,
      }),
    ).toBe(true);
    expect(
      podeVerResenhaDeOutroLeitor({
        leitorId: LEITOR,
        autorId: AUTOR,
        privacidade: 'publico',
        segue: true,
      }),
    ).toBe(true);
  });

  it('perfil privado: só quem segue com seguimento aceito vê', () => {
    expect(
      podeVerResenhaDeOutroLeitor({
        leitorId: LEITOR,
        autorId: AUTOR,
        privacidade: 'privado',
        segue: true,
      }),
    ).toBe(true);
    expect(
      podeVerResenhaDeOutroLeitor({
        leitorId: LEITOR,
        autorId: AUTOR,
        privacidade: 'privado',
        segue: false,
      }),
    ).toBe(false);
  });

  it('autor fora da VIEW de perfis (suspenso ou em exclusão) não aparece', () => {
    for (const segue of [false, true]) {
      expect(
        podeVerResenhaDeOutroLeitor({
          leitorId: LEITOR,
          autorId: AUTOR,
          privacidade: null,
          segue,
        }),
      ).toBe(false);
    }
  });

  it('privacidade desconhecida não libera a resenha', () => {
    expect(
      podeVerResenhaDeOutroLeitor({
        leitorId: LEITOR,
        autorId: AUTOR,
        privacidade: 'amigos',
        segue: true,
      }),
    ).toBe(false);
  });

  it('a resenha do próprio leitor fica de fora da lista de outros leitores', () => {
    for (const privacidade of ['publico', 'privado']) {
      expect(
        podeVerResenhaDeOutroLeitor({
          leitorId: LEITOR,
          autorId: LEITOR,
          privacidade,
          segue: true,
        }),
      ).toBe(false);
    }
  });
});
