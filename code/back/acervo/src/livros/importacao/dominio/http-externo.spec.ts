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

  // Seguir redirect às cegas é o caminho clássico de escapar da allowlist.
  it('não segue redirecionamento para fora da allowlist', async () => {
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

  // `openlibrary.org/isbn/{isbn}.json` sempre responde 302 para `/books/{olid}.json`.
  it('segue redirecionamento dentro da allowlist, inclusive relativo', async () => {
    const pedidos: string[] = [];
    const http = new HttpExterno({
      ...BASE,
      fetch: async (url) => {
        pedidos.push(String(url));
        if (String(url).endsWith('/isbn/1.json')) {
          return resposta('', {
            status: 302,
            headers: { location: '/books/OL1M.json' },
          });
        }
        return resposta('{"title":"x"}');
      },
    });

    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).resolves.toEqual({ title: 'x' });
    expect(pedidos).toEqual([
      'https://openlibrary.org/isbn/1.json',
      'https://openlibrary.org/books/OL1M.json',
    ]);
  });

  it.each([
    ['http, mesmo no host permitido', 'http://openlibrary.org/books/OL1M.json'],
    ['host com sufixo do permitido', 'https://openlibrary.org.invasor.com/x'],
    ['credencial embutida', 'https://u:p@openlibrary.org/x'],
    ['porta explícita', 'https://openlibrary.org:8443/x'],
  ])('recusa redirecionamento: %s', async (_caso, location) => {
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => resposta('', { status: 302, headers: { location } }),
    });
    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toThrow(/redirecionamento/);
  });

  it('recusa cadeia longa de redirecionamentos', async () => {
    let chamadas = 0;
    const http = new HttpExterno({
      ...BASE,
      fetch: async () => {
        chamadas += 1;
        return resposta('', {
          status: 302,
          headers: { location: `https://openlibrary.org/${chamadas}` },
        });
      },
    });
    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org/isbn/1.json'),
      ),
    ).rejects.toThrow(/redirecionamento/);
    expect(chamadas).toBe(4);
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
  it('recusa porta explícita já na URL inicial', async () => {
    const fetch = jest.fn();
    const http = new HttpExterno({ ...BASE, fetch });

    await expect(
      http.buscarJson(
        'openlibrary',
        new URL('https://openlibrary.org:8443/isbn/1.json'),
      ),
    ).rejects.toThrow(/allowlist/);
    expect(fetch).not.toHaveBeenCalled();
  });

  describe('baixarImagem (cache de capas, F-ACV-NOTA)', () => {
    const CAPAS = {
      ...BASE,
      hostsPermitidos: [
        'covers.openlibrary.org',
        'archive.org',
        '.us.archive.org',
      ],
      permitirSufixo: true,
    };
    const CAPA = new URL('https://covers.openlibrary.org/b/id/1-L.jpg');
    const imagem = (init: ResponseInit = {}) =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
        ...init,
      });

    it('segue os saltos até o servidor do archive.org e devolve os bytes', async () => {
      const saltos: string[] = [];
      const http = new HttpExterno({
        ...CAPAS,
        fetch: async (url) => {
          saltos.push(String(url));
          if (saltos.length === 1) {
            return resposta('', {
              status: 302,
              headers: { location: 'https://archive.org/download/x/1.jpg' },
            });
          }
          if (saltos.length === 2) {
            return resposta('', {
              status: 302,
              headers: { location: 'https://ia800100.us.archive.org/x/1.jpg' },
            });
          }
          return imagem();
        },
      });

      const resultado = await http.baixarImagem('capas', CAPA);

      expect(resultado).toEqual({
        tipo: 'ok',
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'image/jpeg',
      });
      expect(saltos).toHaveLength(3);
    });

    it('o sufixo vale só na instância que o liga', () => {
      const servidor = new URL('https://ia800100.us.archive.org/x.jpg');
      const comSufixo = new HttpExterno(CAPAS);
      const semSufixo = new HttpExterno({ ...CAPAS, permitirSufixo: false });

      expect(comSufixo.hostPermitido(servidor)).toBe(true);
      expect(semSufixo.hostPermitido(servidor)).toBe(false);
      // A entrada com ponto não aceita o próprio domínio nem um disfarce.
      expect(comSufixo.hostPermitido(new URL('https://us.archive.org/'))).toBe(
        false,
      );
      expect(
        comSufixo.hostPermitido(
          new URL('https://ia1.us.archive.org.invasor.com/'),
        ),
      ).toBe(false);
      // As fontes de metadados (sem a opção) continuam por igualdade exata.
      expect(
        new HttpExterno({
          ...BASE,
          hostsPermitidos: ['.openlibrary.org'],
        }).hostPermitido(new URL('https://covers.openlibrary.org/')),
      ).toBe(false);
    });

    it.each([
      [
        'fora da allowlist',
        new URL('https://invasor.com/1.jpg'),
        'destino fora da allowlist',
      ],
      [
        'com porta',
        new URL('https://covers.openlibrary.org:8443/1.jpg'),
        'destino fora da allowlist',
      ],
      [
        'em http',
        new URL('http://covers.openlibrary.org/1.jpg'),
        'destino fora da allowlist',
      ],
    ])('recusa URL %s sem sair para a rede', async (_caso, url, motivo) => {
      const fetch = jest.fn();
      const http = new HttpExterno({ ...CAPAS, fetch });

      await expect(http.baixarImagem('capas', url)).resolves.toEqual({
        tipo: 'recusada',
        motivo,
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('recusa redirecionamento para fora da allowlist', async () => {
      const http = new HttpExterno({
        ...CAPAS,
        fetch: async () =>
          resposta('', {
            status: 302,
            headers: { location: 'https://10.0.0.1/x' },
          }),
      });

      await expect(http.baixarImagem('capas', CAPA)).resolves.toEqual({
        tipo: 'recusada',
        motivo: 'redirecionamento recusado',
      });
    });

    it('recusa corpo acima do limite', async () => {
      const http = new HttpExterno({
        ...CAPAS,
        fetch: async () =>
          new Response(new Uint8Array(BASE.limiteRespostaBytes + 1), {
            status: 200,
          }),
      });

      await expect(http.baixarImagem('capas', CAPA)).resolves.toEqual({
        tipo: 'recusada',
        motivo: 'resposta acima do limite',
      });
    });

    it.each([
      [404, { tipo: 'ausente' }],
      [410, { tipo: 'ausente' }],
      [403, { tipo: 'recusada', motivo: 'resposta 403' }],
    ])('%i vira resultado, sem exceção', async (status, esperado) => {
      const http = new HttpExterno({
        ...CAPAS,
        fetch: async () => resposta('', { status }),
      });

      await expect(http.baixarImagem('capas', CAPA)).resolves.toEqual(esperado);
    });

    it.each([429, 420, 500, 502])(
      '%i é indisponibilidade e lança, para o runtime tentar de novo',
      async (status) => {
        const http = new HttpExterno({
          ...CAPAS,
          fetch: async () => resposta('', { status }),
        });

        await expect(http.baixarImagem('capas', CAPA)).rejects.toBeInstanceOf(
          FonteIndisponivel,
        );
      },
    );

    it('timeout lança tempo esgotado', async () => {
      const http = new HttpExterno({
        ...CAPAS,
        fetch: (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('abort'), { name: 'AbortError' })),
            );
          }),
      });

      await expect(http.baixarImagem('capas', CAPA)).rejects.toThrow(
        /tempo esgotado/,
      );
    });

    describe('corpos descartados são cancelados e a requisição é encerrada', () => {
      /** Corpo que nunca termina, para ver se alguém o cancela. */
      function corpoAberto() {
        const cancelar = jest.fn();
        const corpo = new ReadableStream<Uint8Array>({
          pull: () => new Promise(() => undefined),
          cancel: cancelar,
        });
        return { corpo, cancelar };
      }

      it('Content-Length acima do limite: cancela o corpo e aborta o sinal', async () => {
        const { corpo, cancelar } = corpoAberto();
        let sinal: AbortSignal | undefined;
        const http = new HttpExterno({
          ...CAPAS,
          fetch: async (_url, init) => {
            sinal = init?.signal ?? undefined;
            return new Response(corpo, {
              status: 200,
              headers: {
                'content-length': String(BASE.limiteRespostaBytes + 1),
              },
            });
          },
        });

        await expect(http.baixarImagem('capas', CAPA)).resolves.toEqual({
          tipo: 'recusada',
          motivo: 'resposta acima do limite',
        });
        expect(cancelar).toHaveBeenCalled();
        expect(sinal?.aborted).toBe(true);
      });

      it('o corpo de cada salto de redirecionamento é cancelado', async () => {
        const { corpo, cancelar } = corpoAberto();
        let chamadas = 0;
        const http = new HttpExterno({
          ...CAPAS,
          fetch: async () =>
            ++chamadas === 1
              ? new Response(corpo, {
                  status: 302,
                  headers: { location: 'https://archive.org/x.jpg' },
                })
              : imagem(),
        });

        await expect(http.baixarImagem('capas', CAPA)).resolves.toMatchObject({
          tipo: 'ok',
        });
        expect(cancelar).toHaveBeenCalled();
      });

      it.each([
        [404, 'resolves'],
        [403, 'resolves'],
        [503, 'rejects'],
      ] as const)(
        'resposta %i descartada: corpo cancelado e sinal abortado',
        async (status, desfecho) => {
          const { corpo, cancelar } = corpoAberto();
          let sinal: AbortSignal | undefined;
          const http = new HttpExterno({
            ...CAPAS,
            fetch: async (_url, init) => {
              sinal = init?.signal ?? undefined;
              return new Response(corpo, { status });
            },
          });

          const resultado = http.baixarImagem('capas', CAPA);
          if (desfecho === 'resolves') {
            await expect(resultado).resolves.toBeDefined();
          } else {
            await expect(resultado).rejects.toBeInstanceOf(FonteIndisponivel);
          }
          expect(cancelar).toHaveBeenCalled();
          expect(sinal?.aborted).toBe(true);
        },
      );
    });

    it('falha de rede lança', async () => {
      const http = new HttpExterno({
        ...CAPAS,
        fetch: async () => {
          throw new TypeError('fetch failed');
        },
      });

      await expect(http.baixarImagem('capas', CAPA)).rejects.toThrow(
        /falha de rede/,
      );
    });
  });
});
