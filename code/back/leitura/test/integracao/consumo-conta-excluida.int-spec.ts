import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { ContaExcluidaConsumer } from '../../src/conta/conta-excluida.consumer';
import * as schema from '../../src/db/schema';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { criarApp, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { inserirLivro, inserirPerfil } from './massa';

const FILA = 'leai.leitura.conta';

/**
 * `conta.excluida` (F-CONTA-2) contra Postgres real: a massa entra pela API,
 * o consumidor genérico real valida o envelope e grava o recibo, e
 * `ContaExcluidaConsumer` remove do `leitura` o que é da conta, sem tocar no
 * que é de outra pessoa.
 */
describe('consumo de conta.excluida (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let broker: BrokerEmMemoria;

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
    broker = new BrokerEmMemoria();
    const db = drizzle(pool, { schema });
    const validador = new MessageValidator();
    const consumidor = new ConsumidorSemEspera(broker.conexao, validador, db);
    new ContaExcluidaConsumer(consumidor, validador).onModuleInit();
    consumidor.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  const http = () => request(app.getHttpServer());

  /** Publica como o identidade publica: exchange dele, chave = tipo. */
  function publicar(data: Record<string, unknown>) {
    const envelope = {
      eventId: randomUUID(),
      type: 'conta.excluida',
      version: 1,
      occurredAt: new Date().toISOString(),
      correlationId: randomUUID(),
      businessKey: `conta:${String(data.usuarioId)}`,
      data,
    };
    broker.canal.publish(
      EXCHANGES.identidade,
      'conta.excluida',
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

  async function leitor(username: string): Promise<string> {
    return inserirPerfil(pool, { id: randomUUID(), username });
  }

  /** Estante, nota e resenha pela API: os eventos vão para a outbox. */
  async function atividade(usuario: string, livroId: string): Promise<string> {
    const token = `Bearer ${tokenDe(usuario)}`;
    await http()
      .post('/estante')
      .set('Authorization', token)
      .set('Idempotency-Key', randomUUID())
      .send({ livroId })
      .expect(201);
    await http()
      .put(`/livros/${livroId}/nota`)
      .set('Authorization', token)
      .set('Idempotency-Key', randomUUID())
      .send({ valor: 4 })
      .expect(200);
    const resenha = await http()
      .put(`/livros/${livroId}/resenha`)
      .set('Authorization', token)
      .set('Idempotency-Key', randomUUID())
      .send({ texto: 'Muito bom.', spoiler: false })
      .expect(200);
    return (resenha.body as { id: string }).id;
  }

  async function reagir(usuario: string, resenhaId: string) {
    await pool.query(
      `INSERT INTO leitura.reacao_resenha (resenha_id, usuario_id, tipo, primeira_curtida_em)
       VALUES ($1, $2, 'curtida', now())`,
      [resenhaId, usuario],
    );
  }

  it('remove o que é da conta, e as reações de outros às resenhas dela', async () => {
    const excluida = await leitor('excluida');
    const outra = await leitor('outra');
    const terceira = await leitor('terceira');
    const livroId = await inserirLivro(pool);
    const resenhaDaExcluida = await atividade(excluida, livroId);
    const resenhaDaOutra = await atividade(outra, livroId);
    await reagir(terceira, resenhaDaExcluida);
    await reagir(excluida, resenhaDaOutra);
    // Um evento já publicado que cita a conta, além dos pendentes da massa.
    await pool.query(
      `UPDATE leitura.outbox_leitura SET status = 'publicado', publicado_em = now()
        WHERE payload::text LIKE $1 AND tipo = 'nota.alterada'`,
      [`%${excluida}%`],
    );

    publicar({ usuarioId: excluida });
    await broker.entregar(FILA);

    expect(broker.acks).toHaveLength(1);
    for (const tabela of ['estante', 'nota', 'resenha', 'reacao_resenha']) {
      expect(
        await contar(pool, `leitura.${tabela}`, 'usuario_id = $1', [excluida]),
      ).toBe(0);
    }
    expect(
      await contar(pool, 'leitura.leitura', 'usuario_id = $1', [excluida]),
    ).toBe(0);
    // A reação da terceira foi junto com a resenha da excluída.
    expect(
      await contar(pool, 'leitura.reacao_resenha', 'resenha_id = $1', [
        resenhaDaExcluida,
      ]),
    ).toBe(0);
    // O que é da outra fica.
    for (const tabela of ['estante', 'nota', 'resenha']) {
      expect(
        await contar(pool, `leitura.${tabela}`, 'usuario_id = $1', [outra]),
      ).toBe(1);
    }

    expect(
      await contar(pool, 'leitura.idempotencia_leitura', 'subject_ref = $1', [
        excluida,
      ]),
    ).toBe(0);
    expect(
      await contar(pool, 'leitura.idempotencia_leitura', 'subject_ref = $1', [
        outra,
      ]),
    ).toBeGreaterThan(0);
    expect(
      await contar(pool, 'leitura.outbox_leitura', 'payload::text LIKE $1', [
        `%${excluida}%`,
      ]),
    ).toBe(0);
    expect(
      await contar(
        pool,
        'leitura.outbox_leitura',
        'anonimizado_em IS NOT NULL',
      ),
    ).toBeGreaterThan(0);
    expect(
      await contar(pool, 'leitura.outbox_leitura', 'payload::text LIKE $1', [
        `%${outra}%`,
      ]),
    ).toBeGreaterThan(0);
  });

  it('reentrega do mesmo eventId não repete efeito', async () => {
    const excluida = await leitor('excluida');
    publicar({ usuarioId: excluida });
    const [mensagem] = broker.filas.get(FILA) ?? [];

    await broker.entregar(FILA);
    await broker.reentregar(FILA, mensagem);

    expect(
      await contar(pool, 'leitura.mensagem_processada', 'consumidor = $1', [
        'leitura.conta',
      ]),
    ).toBe(1);
    expect(broker.acks).toHaveLength(2);
  });

  it('data fora do schema vai para a DLQ sem apagar nada', async () => {
    const excluida = await leitor('excluida');
    await atividade(excluida, await inserirLivro(pool));

    publicar({ usuarioId: excluida, email: 'vazou@exemplo.com' });
    await broker.entregar(FILA);

    expect(broker.nacks).toHaveLength(1);
    expect(
      await contar(pool, 'leitura.estante', 'usuario_id = $1', [excluida]),
    ).toBe(1);
  });
});
