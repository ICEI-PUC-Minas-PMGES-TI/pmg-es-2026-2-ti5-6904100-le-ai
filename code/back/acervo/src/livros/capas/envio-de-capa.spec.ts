import { assinar } from '../../common/cloudinary';
import { FonteIndisponivel } from '../importacao/dominio/fonte-metadados';
import { EnvioDeCapa } from './envio-de-capa';

const LIVRO = '5f0c6d1e-2f0a-4b8e-9a51-2b7f3c9d8e01';
const PUBLIC_ID = `capas-oficiais-dev/${LIVRO}`;
const URL_OK = `https://res.cloudinary.com/leai/image/upload/v1/${PUBLIC_ID}.jpg`;

function envioCom(fetch: jest.Mock) {
  return new EnvioDeCapa({
    cloudName: 'leai',
    apiKey: 'chave',
    apiSecret: 'segredo',
    pasta: 'capas-oficiais-dev',
    hostsPermitidos: ['res.cloudinary.com'],
    fetch,
    agora: () => 1_700_000_000_000,
  });
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('EnvioDeCapa', () => {
  it('envia assinado, com public_id fixo e sem sobrescrever, e devolve a URL validada', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValue(json({ secure_url: URL_OK, public_id: PUBLIC_ID }));

    const resultado = await envioCom(fetch).enviar(
      LIVRO,
      new Uint8Array([1, 2, 3]),
      'jpg',
    );

    expect(resultado).toEqual({ tipo: 'ok', url: URL_OK, assetId: PUBLIC_ID });
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/leai/image/upload');
    const corpo = init.body as FormData;
    const parametros = {
      allowed_formats: 'jpg,png,webp',
      asset_folder: 'capas-oficiais-dev',
      overwrite: 'false',
      public_id: PUBLIC_ID,
      timestamp: 1_700_000_000,
    };
    for (const [chave, valor] of Object.entries(parametros)) {
      expect(corpo.get(chave)).toBe(String(valor));
    }
    expect(corpo.get('api_key')).toBe('chave');
    expect(corpo.get('signature')).toBe(assinar(parametros, 'segredo'));
    expect((corpo.get('file') as Blob).type).toBe('image/jpeg');
  });

  it('400 do Cloudinary é recusa', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValue(json({ error: { message: 'Invalid image' } }, 400));

    await expect(
      envioCom(fetch).enviar(LIVRO, new Uint8Array([1]), 'png'),
    ).resolves.toEqual({
      tipo: 'recusada',
      motivo: 'Cloudinary recusou a imagem',
    });
  });

  it.each([
    [
      'host de fora',
      { secure_url: 'https://invasor.com/x.jpg', public_id: PUBLIC_ID },
    ],
    [
      'outro cloud',
      { secure_url: URL_OK.replace('/leai/', '/outro/'), public_id: PUBLIC_ID },
    ],
    [
      'outro asset',
      {
        secure_url: URL_OK.replace(LIVRO, 'outro'),
        public_id: 'capas-oficiais-dev/outro',
      },
    ],
  ])('URL de resposta inválida (%s) é recusa', async (_caso, corpo) => {
    const fetch = jest.fn().mockResolvedValue(json(corpo));

    const resultado = await envioCom(fetch).enviar(
      LIVRO,
      new Uint8Array([1]),
      'webp',
    );

    expect(resultado.tipo).toBe('recusada');
  });

  it.each([500, 503, 429, 420, 401])(
    '%i lança indisponibilidade, para o runtime tentar e ir à DLQ',
    async (status) => {
      const fetch = jest.fn().mockResolvedValue(json({}, status));

      await expect(
        envioCom(fetch).enviar(LIVRO, new Uint8Array([1]), 'jpg'),
      ).rejects.toBeInstanceOf(FonteIndisponivel);
    },
  );

  it('timeout lança tempo esgotado', async () => {
    const fetch = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
      );

    await expect(
      envioCom(fetch).enviar(LIVRO, new Uint8Array([1]), 'jpg'),
    ).rejects.toThrow(/tempo esgotado/);
  });
});
