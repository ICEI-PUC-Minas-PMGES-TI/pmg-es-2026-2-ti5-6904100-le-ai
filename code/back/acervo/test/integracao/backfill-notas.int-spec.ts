import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool, PoolClient } from 'pg';
import * as schema from '../../src/db/schema';
import type { Tx } from '../../src/db/tipos';
import {
  backfillDeNotas,
  simularBackfillDeNotas,
} from '../../src/livros/notas/backfill';
import { NotaDosLeitoresConsumer } from '../../src/livros/notas/nota-dos-leitores.consumer';
import { NotaDosLeitoresRepository } from '../../src/livros/notas/nota-dos-leitores.repository';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { limpar, prepararBanco } from './banco';
import { inserirLivroOficial, inserirLivroPessoal, isbn } from './massa';

const FILA = 'leai.acervo.notas';

/**
 * Backfill da nota dos leitores contra Postgres real: reconcilia a projeção com
 * `v_nota_publicacao_v1` (tabela no fixture), é idempotente e, com a mesma
 * trava por livro do consumidor, corre junto com ele sem deixar linha velha.
 */
describe('backfill da nota dos leitores (integração)', () => {
  let pool: Pool;
  let sequencia = 0;
  const novoIsbn = () => isbn(`978500${String(++sequencia).padStart(6, '0')}`);
  const db = () => drizzle(pool, { schema });

  beforeAll(async () => {
    pool = await prepararBanco();
  });
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(() => limpar(pool));

  async function notaNoLeitura(
    usuario: string,
    livro: string,
    valor: number | null,
  ) {
    await pool.query(
      'DELETE FROM leitura.v_nota_publicacao_v1 WHERE usuario_id = $1 AND livro_id = $2',
      [usuario, livro],
    );
    if (valor !== null) {
      await pool.query(
        'INSERT INTO leitura.v_nota_publicacao_v1 VALUES ($1, $2, $3)',
        [usuario, livro, valor],
      );
    }
  }

  async function projecao(livro: string) {
    const { rows } = await pool.query<{ usuario_id: string; valor: number }>(
      `SELECT usuario_id, valor::float AS valor
         FROM acervo.nota_leitor_projecao WHERE livro_id = $1
        ORDER BY usuario_id`,
      [livro],
    );
    return rows;
  }

  async function agregado(livro: string) {
    const { rows } = await pool.query<{ media: number; quantidade: number }>(
      `SELECT media::float AS media, quantidade
         FROM acervo.nota_livro_agregada WHERE livro_id = $1`,
      [livro],
    );
    return rows[0] ?? null;
  }

  it('insere o que falta, corrige o que mudou e apaga o que ficou velho', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());
    const outro = await inserirLivroOficial(pool, novoIsbn());
    const pessoal = await inserirLivroPessoal(pool, randomUUID(), 'Diário');
    const [ana, bia, caio] = [randomUUID(), randomUUID(), randomUUID()];
    await notaNoLeitura(ana, livro, 4);
    await notaNoLeitura(bia, livro, 2.5);
    await notaNoLeitura(ana, pessoal, 5);
    // Projeção com uma nota mudada (bia) e uma que o leitura não tem mais (caio).
    await pool.query(
      `INSERT INTO acervo.nota_leitor_projecao (usuario_id, livro_id, valor)
       VALUES ($1, $3, 1), ($2, $3, 3), ($2, $4, 5)`,
      [bia, caio, livro, outro],
    );
    await pool.query(
      `INSERT INTO acervo.nota_livro_agregada (livro_id, media, quantidade)
       VALUES ($1, 2, 2), ($2, 5, 1)`,
      [livro, outro],
    );

    expect(await simularBackfillDeNotas(db())).toEqual({
      livros: 1,
      gravadas: 2,
      apagadas: 2,
    });
    expect(await backfillDeNotas(db())).toEqual({
      livros: 2,
      gravadas: 2,
      apagadas: 2,
    });

    expect(await projecao(livro)).toEqual(
      [
        { usuario_id: ana, valor: 4 },
        { usuario_id: bia, valor: 2.5 },
      ].sort((a, b) => a.usuario_id.localeCompare(b.usuario_id)),
    );
    expect(await agregado(livro)).toEqual({ media: 3.25, quantidade: 2 });
    expect(await projecao(outro)).toEqual([]);
    expect(await agregado(outro)).toBeNull();
    expect(await projecao(pessoal)).toEqual([]);
  });

  it('é idempotente: a segunda rodada não muda nada', async () => {
    const livro = await inserirLivroOficial(pool, novoIsbn());
    await notaNoLeitura(randomUUID(), livro, 3.5);

    await backfillDeNotas(db());
    const segunda = await backfillDeNotas(db());

    expect(segunda).toEqual({ livros: 1, gravadas: 0, apagadas: 0 });
    expect(await simularBackfillDeNotas(db())).toEqual({
      livros: 1,
      gravadas: 0,
      apagadas: 0,
    });
    expect(await agregado(livro)).toEqual({ media: 3.5, quantidade: 1 });
  });

  describe('junto com o consumidor, em duas conexões', () => {
    let segunda: PoolClient;
    let broker: BrokerEmMemoria;

    beforeEach(async () => {
      segunda = await pool.connect();
      broker = new BrokerEmMemoria();
      const validador = new MessageValidator();
      const consumidor = new ConsumidorSemEspera(
        broker.conexao,
        validador,
        db(),
      );
      new NotaDosLeitoresConsumer(
        consumidor,
        validador,
        new NotaDosLeitoresRepository(),
      ).onModuleInit();
      consumidor.onModuleInit();
      await new Promise<void>((resolve) => setImmediate(resolve));
    });
    afterEach(() => segunda.release());

    function publicar(usuarioId: string, livroId: string, nota: number) {
      const envelope = {
        eventId: randomUUID(),
        type: 'nota.alterada',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: randomUUID(),
        businessKey: `nota:${usuarioId}:${livroId}`,
        data: { usuarioId, livroId, operacao: 'atualizada', nota },
      };
      broker.canal.publish(
        EXCHANGES.leitura,
        'nota.alterada',
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

    /** Resolve `true` se a promessa ainda não terminou depois da espera. */
    async function aindaEsperando(promessa: Promise<unknown>) {
      let terminou = false;
      void promessa.then(() => (terminou = true));
      await new Promise((resolve) => setTimeout(resolve, 300));
      return !terminou;
    }

    it('o consumidor que espera o backfill relê a VIEW e grava o valor novo', async () => {
      const livro = await inserirLivroOficial(pool, novoIsbn());
      const ana = randomUUID();
      await notaNoLeitura(ana, livro, 3);

      // O backfill leu 3 e segura a trava do livro, sem commit.
      await segunda.query('BEGIN');
      await new NotaDosLeitoresRepository().sincronizarLivro(
        drizzle(segunda, { schema }) as unknown as Tx,
        livro,
      );
      // A leitora edita a nota no leitura, e o evento chega.
      await notaNoLeitura(ana, livro, 5);
      publicar(ana, livro, 5);
      const entrega = broker.entregar(FILA);

      expect(await aindaEsperando(entrega)).toBe(true);
      await segunda.query('COMMIT');
      await entrega;

      expect(await projecao(livro)).toEqual([{ usuario_id: ana, valor: 5 }]);
      expect(await agregado(livro)).toEqual({ media: 5, quantidade: 1 });
    });

    it('o backfill que espera o consumidor relê a VIEW e não deixa linha velha', async () => {
      const livro = await inserirLivroOficial(pool, novoIsbn());
      const [ana, bia] = [randomUUID(), randomUUID()];
      await notaNoLeitura(ana, livro, 3);
      await notaNoLeitura(bia, livro, 4);

      // O consumidor gravou a nota 3 da Ana e segura a trava do livro, sem commit.
      await segunda.query('BEGIN');
      await new NotaDosLeitoresRepository().sincronizar(
        drizzle(segunda, { schema }) as unknown as Tx,
        ana,
        livro,
      );
      // A Ana exclui a nota no leitura antes de o backfill chegar ao livro.
      await notaNoLeitura(ana, livro, null);
      const backfill = backfillDeNotas(db());

      expect(await aindaEsperando(backfill)).toBe(true);
      await segunda.query('COMMIT');
      await backfill;

      expect(await projecao(livro)).toEqual([{ usuario_id: bia, valor: 4 }]);
      expect(await agregado(livro)).toEqual({ media: 4, quantidade: 1 });
    });
  });
});
