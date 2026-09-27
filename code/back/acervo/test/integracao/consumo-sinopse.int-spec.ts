import { drizzle } from 'drizzle-orm/node-postgres';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import * as schema from '../../src/db/schema';
import { FonteIndisponivel } from '../../src/livros/importacao/dominio/fonte-metadados';
import type { FonteDeSinopse } from '../../src/livros/sinopse/dominio/fonte-de-sinopse';
import { SinopseConsumer } from '../../src/livros/sinopse/sinopse.consumer';
import { AmqpPublisherService } from '../../src/messaging/amqp-publisher.service';
import { MessageValidator } from '../../src/messaging/message-validator';
import { OutboxDispatcherService } from '../../src/messaging/outbox-dispatcher.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivroOficial, isbn } from './massa';

const FILA = 'leai.acervo.sinopse';

/**
 * Caminho assíncrono da sinopse contra Postgres real: a abertura da página
 * grava estado e outbox, o dispatcher real publica, o consumidor genérico real
 * valida e grava o recibo, e `SinopseConsumer` consulta as fontes (simuladas) e
 * grava o desfecho com o mesmo `tx`.
 */
describe('consumo de livro.pagina_aberta (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let broker: BrokerEmMemoria;
  let dispatcher: OutboxDispatcherService;
  let fontes: { buscar: jest.Mock; nome: string }[];
  const leitor = novoUsuario();

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
    fontes = [
      { nome: 'openlibrary', buscar: jest.fn().mockResolvedValue(null) },
      { nome: 'google-books', buscar: jest.fn().mockResolvedValue(null) },
    ];
    new SinopseConsumer(
      consumidor,
      validador,
      fontes as unknown as FonteDeSinopse[],
    ).onModuleInit();
    consumidor.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    dispatcher = new OutboxDispatcherService(
      db,
      broker.conexao,
      new AmqpPublisherService(broker.conexao, validador),
    );
  });

  async function abrirLivro(): Promise<string> {
    const id = await inserirLivroOficial(
      pool,
      isbn('978300000001'),
      'Torto arado',
    );
    const resposta = await request(app.getHttpServer())
      .get(`/livros/${id}`)
      .set('Authorization', `Bearer ${tokenDe(leitor)}`);
    expect(resposta.body.sinopse.status).toBe('pendente');
    return id;
  }

  async function publicarEConsumir() {
    await dispatcher.dispatchOnce();
    await broker.entregar(FILA);
  }

  async function sinopse(id: string) {
    const { rows } = await pool.query<{
      sinopse_status: string;
      sinopse: string | null;
    }>('SELECT sinopse_status, sinopse FROM acervo.livro WHERE id = $1', [id]);
    return rows[0];
  }

  it('publica, consome e grava a sinopse limpa com o recibo', async () => {
    fontes[0].buscar.mockResolvedValue(
      '<p>Duas irmãs no sertão. ([source][1])</p>',
    );
    const id = await abrirLivro();

    await publicarEConsumir();

    expect(await sinopse(id)).toEqual({
      sinopse_status: 'disponivel',
      sinopse: 'Duas irmãs no sertão.',
    });
    expect(
      await contar(pool, 'acervo.mensagem_processada', 'consumidor = $1', [
        'acervo.sinopse',
      ]),
    ).toBe(1);
    expect(broker.acks).toHaveLength(1);
    expect(fontes[1].buscar).not.toHaveBeenCalled();

    const pagina = await request(app.getHttpServer())
      .get(`/livros/${id}`)
      .set('Authorization', `Bearer ${tokenDe(leitor)}`);
    expect(pagina.body.sinopse).toEqual({
      status: 'disponivel',
      texto: 'Duas irmãs no sertão.',
    });
  });

  it('reentrega do mesmo eventId não consulta as fontes de novo', async () => {
    fontes[0].buscar.mockResolvedValue('Sinopse.');
    await abrirLivro();
    await dispatcher.dispatchOnce();
    const [mensagem] = broker.filas.get(FILA) ?? [];

    await broker.entregar(FILA);
    await broker.reentregar(FILA, mensagem);

    expect(fontes[0].buscar).toHaveBeenCalledTimes(1);
    expect(await contar(pool, 'acervo.mensagem_processada')).toBe(1);
    expect(broker.acks).toHaveLength(2);
  });

  it('as duas fontes sem sinopse: ausente, terminal, sem novo pedido', async () => {
    const id = await abrirLivro();

    await publicarEConsumir();

    expect(await sinopse(id)).toEqual({
      sinopse_status: 'ausente',
      sinopse: null,
    });
    await request(app.getHttpServer())
      .get(`/livros/${id}`)
      .set('Authorization', `Bearer ${tokenDe(leitor)}`);
    expect(await contar(pool, 'acervo.outbox_acervo')).toBe(1);
  });

  it('fonte fora do ar: falha transitória confirmada, sem pendente órfão', async () => {
    fontes[0].buscar.mockRejectedValue(
      new FonteIndisponivel('openlibrary', 'timeout'),
    );
    const id = await abrirLivro();

    await publicarEConsumir();

    expect(await sinopse(id)).toEqual({
      sinopse_status: 'falha_transitoria',
      sinopse: null,
    });
    expect(broker.acks).toHaveLength(1);
    expect(broker.nacks).toHaveLength(0);
  });

  it('erro inesperado desfaz efeito e recibo e vai para a DLQ', async () => {
    fontes[0].buscar.mockRejectedValue(new Error('bug no parser'));
    const id = await abrirLivro();

    await publicarEConsumir();

    expect(fontes[0].buscar).toHaveBeenCalledTimes(4);
    expect((await sinopse(id)).sinopse_status).toBe('pendente');
    expect(await contar(pool, 'acervo.mensagem_processada')).toBe(0);
    expect(broker.nacks).toHaveLength(1);
    expect(broker.acks).toHaveLength(0);
  });

  it('data fora do schema canônico vai para a DLQ sem consultar as fontes', async () => {
    const id = await abrirLivro();
    await pool.query(
      `UPDATE acervo.outbox_acervo SET payload = payload || '{"url": "http://169.254.169.254"}'::jsonb`,
    );

    await publicarEConsumir();

    expect(fontes[0].buscar).not.toHaveBeenCalled();
    expect((await sinopse(id)).sinopse_status).toBe('pendente');
    expect(broker.nacks).toHaveLength(1);
  });
});
