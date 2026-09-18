import { FonteIndisponivel } from './fonte-metadados';
import { HttpExterno } from './http-externo';

const BASE = {
  hostsPermitidos: ['openlibrary.org'],
  timeoutMs: 50,
  limiteRespostaBytes: 100,
  userAgent: 'LeAi/0.1 (contato@leai.app)',
};

function resposta(corpo: string, init: ResponseInit = {}): Response {
  return new Response(corpo, { status: 200, ...init });
}

describe('HttpExterno', () => {
  it('devolve o JSON de uma fonte permitida', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => resposta('{"title":"x"}'),
    });
    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).resolves.toEqual({ title: 'x' });
  });

  it('envia o User-Agent que a fonte exige', async () => {
    let capturado: HeadersInit | undefined;
    const http = new HttpExterno({
      ...BASE,
      fetch: async (_url, init) => {
        capturado = init?.headers;
        return resposta('{}');
      },
    });

    await http.buscarJson(
      'openlibrary',
      new URL('https://openlibrary.org/isbn/1.json'),
    );
    expect((capturado as Record<string, string>)['User-Agent']).toBe(
      BASE.userAgent,
    );
  });

  // 404 é resposta, não falha: leva a `nao_encontrado` e à oferta de cadastro
  // pessoal, não a `falha_transitoria`.
  it('trata 404 como ausência, devolvendo null', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => resposta('', { status: 404 }),
    });
    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).resolves.toBeNull();
  });

  it('recusa host fora da allowlist antes de sair para a rede', async () => {
    const chamou = jest.fn();
    const http = new HttpExterno({ ...BASE, fetch: chamou });

    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://invasor.com/isbn/1.json'),
      ),
    ).rejects.toBeInstanceOf(FonteIndisponivel);
    expect(chamou).not.toHaveBeenCalled();
  });

  // Igualdade exata, não sufixo: senão o host do atacante passaria.
  it('recusa host que apenas termina com o host permitido', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => resposta('{}'),
    });
    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org.invasor.com/x.json'),
      ),
    ).rejects.toBeInstanceOf(FonteIndisponivel);
  });

  it('recusa http, mesmo em host permitido', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => resposta('{}'),
    });
    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('http://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toBeInstanceOf(FonteIndisponivel);
  });

  // Seguir redirect é o caminho clássico de escapar da allowlist.
  it('não segue redirecionamento', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () =>
        resposta('', { status: 302, headers: { location: 'https://x/' } }),
    });
    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toThrow(/redirecionamento/);
  });

  it('pede redirect manual ao fetch', async () => {
    let capturado: RequestInit | undefined;
    const http = new HttpExterno({
      ...BASE,
      fetch: async (_url, init) => {
        capturado = init;
        return resposta('{}');
      },
    });

    await http.buscarJson(
      'openlibrary',
      new URL('https://openlibrary.org/isbn/1.json'),
    );
    expect(capturado?.redirect).toBe('manual');
  });

  it('aborta resposta acima do limite de tamanho', async () => {
    const grande = 'x'.repeat(500);
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => resposta(JSON.stringify({ t: grande })),
    });

    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toThrow(/limite/);
  });

  it('recusa resposta que declara content-length acima do limite', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () =>
        resposta('{}', { headers: { 'content-length': '999999' } }),
    });

    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toThrow(/limite/);
  });

  it('trata 5xx como indisponibilidade, não como ausência', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => resposta('', { status: 503 }),
    });

    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toBeInstanceOf(FonteIndisponivel);
  });

  it('trata JSON inválido como indisponibilidade', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => resposta('<html>'),
    });
    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toThrow(/JSON/);
  });

  it('aborta ao estourar o timeout', async () => {
    const http = new HttpExterno({
      ...BASE,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('abort'), { name: 'AbortError' })),
          );
        }),
    });

    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toThrow(/tempo esgotado/);
  });
});
