import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import * as schema from '../../src/db/schema';
import { backfillDeCapas } from '../../src/livros/capas/backfill';
import type { CacheDeCapas } from '../../src/livros/capas/cache-de-capas.service';
import { CapaConsumer } from '../../src/livros/capas/capa.consumer';
import { criarCacheDeCapas } from '../../src/livros/capas/criar-cache-de-capas';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { gif, jpeg } from '../imagens';
import { criarApp, novoUsuario, tokenDe } from './app';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivroOficial, inserirLivroPessoal, isbn } from './massa';

const FILA = 'leai.acervo.capas';
const PASTA = 'capas-oficiais-teste';

type Origem = () => Response | Promise<Response>;

/**
 * Cache de capas (F-ACV-NOTA, RF-ACV-17) contra Postgres real: o consumidor
 * genérico real valida o envelope e grava o recibo, e `CapaConsumer` baixa,
 * valida, envia e grava a cópia própria com o mesmo `tx`. A origem das capas e
 * o Cloudinary são um `fetch` simulado.
 */
describe('cache de capas oficiais (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let broker: BrokerEmMemoria;
  let cache: CacheDeCapas;
  let origem: Origem;
  let downloads: string[];
  let uploads: FormData[];
  let sequencia = 0;
  const novoIsbn = () => isbn(`978600${String(++sequencia).padStart(6, '0')}`);

  async function fetchSimulado(
    entrada: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> {
    const url = String(entrada);
    if (url.startsWith('https://api.cloudinary.com/')) {
      const corpo = init?.body as FormData;
      uploads.push(corpo);
      const publicId = String(corpo.get('public_id'));
      return new Response(
        JSON.stringify({
          public_id: publicId,
          secure_url: `https://res.cloudinary.com/leai/image/upload/v1/${publicId}.jpg`,
        }),
        { status: 200 },
      );
    }
    downloads.push(url);
    return origem();
  }

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await limpar(pool);
    downloads = [];
    uploads = [];
    origem = () =>
      new Response(jpeg(), {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      });
    broker = new BrokerEmMemoria();
    const db = drizzle(pool, { schema });
    const validador = new MessageValidator();
    const consumidor = new ConsumidorSemEspera(broker.conexao, validador, db);
    cache = criarCacheDeCapas(
      {
        CLOUDINARY_CLOUD_NAME: 'leai',
        CLOUDINARY_API_KEY: 'chave',
        CLOUDINARY_API_SECRET: 'segredo',
        CLOUDINARY_PASTA_CAPAS_OFICIAIS: PASTA,
        CAPA_HOSTS_PERMITIDOS: 'res.cloudinary.com',
        CAPAS_DOWNLOAD_HOSTS:
          'covers.openlibrary.org,archive.org,.us.archive.org,books.google.com',
        CAPAS_DOWNLOAD_TIMEOUT_MS: 1000,
        CAPAS_DOWNLOAD_LIMITE_BYTES: 5_242_880,
        FONTES_USER_AGENT: 'LeAi/teste',
      },
      { fetch: fetchSimulado as typeof globalThis.fetch },
    ) as CacheDeCapas;
    new CapaConsumer(consumidor, validador, cache).onModuleInit();
    consumidor.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  /** Publica como o leitura publica: exchange dele, chave = tipo. */
  function publicar(tipo: string, data: Record<string, unknown>) {
    const envelope = {
      eventId: randomUUID(),
      type: tipo,
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: randomUUID(),
      businessKey: `teste:${randomUUID()}`,
      data,
    };
    broker.canal.publish(
      EXCHANGES.leitura,
      tipo,
      Buffer.from(JSON.stringify(envelope), 'utf8'),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: envelope.eventId,
        correlationId: envelope.correlationId,
        type: envelope.type,
        headers: {
          'x-event-version': 1,
          'x-business-key': envelope.businessKey,
        },
      },
      () => undefined,
    );
  }

  const naEstante = (livroId: string, usuarioId = randomUUID()) =>
    publicar('livro.adicionado_a_estante', { usuarioId, livroId });

  const leituraIniciada = (livroId: string) => {
    const usuarioId = randomUUID();
    publicar('leitura.iniciada', {
      usuarioId,
      leituraId: randomUUID(),
      livroId,
      releitura: false,
      usuario: {
        id: usuarioId,
        username: 'leitora',
        displayName: 'Leitora',
        avatarUrl: null,
      },
      livro: {
        id: livroId,
        tipo: 'oficial',
        titulo: 'Livro',
        autor: null,
        capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
      },
    });
  };

  async function capa(livroId: string) {
    const { rows } = await pool.query<{
      capa_url_propria: string | null;
      capa_asset_id: string | null;
    }>(
      'SELECT capa_url_propria, capa_asset_id FROM acervo.livro WHERE id = $1',
      [livroId],
    );
    return rows[0];
  }

  it('livro.adicionado_a_estante cacheia a capa, com o asset junto, e a página passa a usar a cópia', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());
    const antes = await pool.query<{ atualizado_em: Date }>(
      'SELECT atualizado_em FROM acervo.livro WHERE id = $1',
      [livro],
    );

    naEstante(livro);
    await broker.entregar(FILA);

    expect(broker.acks).toHaveLength(1);
    const propria = `https://res.cloudinary.com/leai/image/upload/v1/${PASTA}/${livro}.jpg`;
    expect(await capa(livro)).toEqual({
      capa_url_propria: propria,
      capa_asset_id: `${PASTA}/${livro}`,
    });
    // `default=false`: id inexistente vira 404 em vez do GIF genérico.
    expect(downloads).toEqual([
      'https://covers.openlibrary.org/b/id/1-L.jpg?default=false',
    ]);
    const { rows } = await pool.query<{ atualizado_em: Date }>(
      'SELECT atualizado_em FROM acervo.livro WHERE id = $1',
      [livro],
    );
    expect(rows[0].atualizado_em).toEqual(antes.rows[0].atualizado_em);

    const referencia = await pool.query<{ capa_resolvida: string }>(
      'SELECT capa_resolvida FROM acervo.v_livro_referencia_v1 WHERE livro_id = $1',
      [livro],
    );
    expect(referencia.rows[0].capa_resolvida).toBe(propria);
    const pagina = await request(app.getHttpServer())
      .get(`/livros/${livro}`)
      .set('Authorization', `Bearer ${tokenDe(novoUsuario())}`);
    expect(pagina.body.capa).toEqual({ url: propria, origem: 'propria' });
  });

  it('leitura.iniciada de livro sem cópia também cacheia', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());

    leituraIniciada(livro);
    await broker.entregar(FILA);

    expect(broker.acks).toHaveLength(1);
    expect((await capa(livro)).capa_asset_id).toBe(`${PASTA}/${livro}`);
  });

  it('o segundo evento do mesmo livro não baixa nem envia de novo (RN-14.3)', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());

    naEstante(livro);
    await broker.entregar(FILA);
    naEstante(livro);
    leituraIniciada(livro);
    await broker.entregar(FILA);

    expect(broker.acks).toHaveLength(3);
    expect(downloads).toHaveLength(1);
    expect(uploads).toHaveLength(1);
  });

  it('livro pessoal e livro inexistente são ignorados (RN-14.7)', async () => {
    const pessoal = await inserirLivroPessoal(pool, randomUUID(), 'Diário');

    naEstante(pessoal);
    naEstante(randomUUID());
    await broker.entregar(FILA);

    expect(broker.acks).toHaveLength(2);
    expect(downloads).toHaveLength(0);
    expect(await capa(pessoal)).toEqual({
      capa_url_propria: null,
      capa_asset_id: null,
    });
  });

  it.each([
    ['ausente na origem (404)', () => new Response('', { status: 404 })],
    ['recusada pela origem (403)', () => new Response('', { status: 403 })],
    [
      'imagem inválida (GIF)',
      () => new Response(gif(), { status: 200 }) as Response,
    ],
  ])(
    '%s: ACK sem cópia, e o livro segue com a capa externa',
    async (_caso, resposta) => {
      origem = resposta;
      const livro = await inserirLivroOficial(pool, novoIsbn());

      naEstante(livro);
      await broker.entregar(FILA);

      expect(broker.acks).toHaveLength(1);
      expect(broker.nacks).toHaveLength(0);
      expect(uploads).toHaveLength(0);
      expect((await capa(livro)).capa_url_propria).toBeNull();
    },
  );

  it('origem indisponível passa pelas retentativas do runtime e vai para a DLQ', async () => {
    origem = () => new Response('', { status: 502 });
    const livro = await inserirLivroOficial(pool, novoIsbn());

    naEstante(livro);
    await broker.entregar(FILA);

    expect(broker.nacks).toHaveLength(1);
    expect(broker.acks).toHaveLength(0);
    // Sem retentativa aninhada: uma ida por tentativa do runtime. Depois da
    // terceira falha seguida o circuito abre, e a quarta tentativa falha sem
    // sair para a rede.
    expect(downloads).toHaveLength(3);
    expect((await capa(livro)).capa_url_propria).toBeNull();
    expect(
      await contar(pool, 'acervo.mensagem_processada', 'consumidor = $1', [
        'acervo.capas',
      ]),
    ).toBe(0);
  });

  it('data fora do schema vai para a DLQ sem baixar nada', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());

    publicar('livro.adicionado_a_estante', { livroId: livro });
    await broker.entregar(FILA);

    expect(broker.nacks).toHaveLength(1);
    expect(downloads).toHaveLength(0);
  });

  it('backfill: oficiais distintos da estante sem cópia, um por vez', async () => {
    const [a, b, comCopia] = [
      await inserirLivroOficial(pool, novoIsbn()),
      await inserirLivroOficial(pool, novoIsbn()),
      await inserirLivroOficial(pool, novoIsbn(), 'Já cacheado', {
        capaPropria: 'https://res.cloudinary.com/leai/image/upload/v1/x.jpg',
      }),
    ];
    const fora = await inserirLivroOficial(pool, novoIsbn());
    const pessoal = await inserirLivroPessoal(pool, randomUUID(), 'Diário');
    for (const [usuario, livro] of [
      [randomUUID(), a],
      [randomUUID(), a],
      [randomUUID(), b],
      [randomUUID(), comCopia],
      [randomUUID(), pessoal],
    ]) {
      await pool.query(
        `INSERT INTO leitura.v_estante_publica_v1 VALUES ($1, $2, 'quero_ler', 0)`,
        [usuario, livro],
      );
    }
    const db = drizzle(pool, { schema });

    const total = await backfillDeCapas(db, cache, 0);

    expect(total).toEqual({
      livros: 2,
      cacheadas: 2,
      bytes: 2 * jpeg().byteLength,
      ausentes: 0,
      recusadas: 0,
      indisponiveis: 0,
    });
    expect((await capa(a)).capa_asset_id).toBe(`${PASTA}/${a}`);
    expect((await capa(b)).capa_asset_id).toBe(`${PASTA}/${b}`);
    expect((await capa(fora)).capa_url_propria).toBeNull();
    expect((await backfillDeCapas(db, cache, 0)).livros).toBe(0);
  });
});
