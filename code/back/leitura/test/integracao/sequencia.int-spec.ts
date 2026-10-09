import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import * as schema from '../../src/db/schema';
import { DRIZZLE, type DrizzleDB } from '../../src/db/drizzle.module';
import { ProgressoRegistradoConsumer } from '../../src/metricas/progresso-registrado.consumer';
import { AmqpPublisherService } from '../../src/messaging/amqp-publisher.service';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { OutboxDispatcherService } from '../../src/messaging/outbox-dispatcher.service';
import { dataLocal } from '../../src/progresso/dominio/progresso';
import { SequenciaService } from '../../src/sequencia/sequencia.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { BrokerEmMemoria } from './broker-em-memoria';
import { ConsumidorSemEspera } from './consumidor-sem-espera';
import { inserirLivro, inserirPerfil } from './massa';

const FILA = 'leai.leitura.metricas';
const SP = 'America/Sao_Paulo';
const DIA_MS = 86_400_000;

interface Sequencia {
  sequenciaAtual: number;
  maiorSequencia: number;
  ultimoDiaComLeitura: string | null;
}

/**
 * Sequência diária (F-GAM) contra Postgres real, pelo caminho de produção:
 * progresso pela API → outbox → despachante → broker → consumidor de métricas
 * → `GET /me/sequencia`. O broker é o em memória; o resto é o código real.
 */
describe('sequência diária (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let broker: BrokerEmMemoria;
  let despachante: OutboxDispatcherService;
  let falhasForcadas: number;

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
    falhasForcadas = 0;
    broker = new BrokerEmMemoria();
    const db = drizzle(pool, { schema });
    const validador = app.get(MessageValidator);
    const consumidor = new ConsumidorSemEspera(broker.conexao, validador, db);
    const sequencia = app.get(SequenciaService);
    // Falha transitória sob demanda, para provar o retry do runtime.
    const instavel = {
      recalcular: async (
        ...args: Parameters<SequenciaService['recalcular']>
      ) => {
        if (falhasForcadas > 0) {
          falhasForcadas--;
          throw new Error('banco indisponível por um instante');
        }
        return sequencia.recalcular(...args);
      },
    } as unknown as SequenciaService;
    new ProgressoRegistradoConsumer(
      consumidor,
      validador,
      instavel,
    ).onModuleInit();
    consumidor.onModuleInit();
    await new Promise<void>((resolve) => setImmediate(resolve));
    despachante = new OutboxDispatcherService(
      app.get<DrizzleDB>(DRIZZLE),
      broker.conexao,
      new AmqpPublisherService(broker.conexao, validador),
    );
  });

  const http = () => request(app.getHttpServer());

  /** Instante `dias` atrás, ao meio-dia de São Paulo (longe da virada). */
  function diasAtras(dias: number): Date {
    const hoje = dataLocal(new Date(), SP);
    return new Date(Date.parse(`${hoje}T15:00:00.000Z`) - dias * DIA_MS);
  }

  async function leitor(): Promise<string> {
    const usuario = novoUsuario();
    await inserirPerfil(pool, { id: usuario });
    return usuario;
  }

  async function iniciarLeitura(usuario: string): Promise<string> {
    const livroId = await inserirLivro(pool, { paginas: 1000 });
    const res = await http()
      .post('/leituras')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', randomUUID())
      .send({ livroId })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  async function progresso(
    usuario: string,
    leituraId: string,
    pagina: number,
    instante: Date,
    fuso = SP,
  ): Promise<string> {
    const res = await http()
      .post(`/leituras/${leituraId}/progresso`)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        pagina,
        registradoEmDispositivo: instante.toISOString(),
        fusoHorarioDispositivo: fuso,
      })
      .expect(201);
    return (res.body as { progresso: { id: string } }).progresso.id;
  }

  /** Despacha a outbox e entrega ao consumidor de métricas. */
  async function processar(): Promise<void> {
    await despachante.dispatchOnce();
    await broker.entregar(FILA);
  }

  async function sequencia(usuario: string): Promise<Sequencia> {
    const res = await http()
      .get('/me/sequencia')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .expect(200);
    return res.body as Sequencia;
  }

  describe('GET /me/sequencia', () => {
    it('sem token é 401', async () => {
      await http().get('/me/sequencia').expect(401);
    });

    it('sem progresso, zeros e último dia nulo', async () => {
      expect(await sequencia(await leitor())).toEqual({
        sequenciaAtual: 0,
        maiorSequencia: 0,
        ultimoDiaComLeitura: null,
      });
    });

    it('só mostra a sequência do próprio leitor (SEC-02)', async () => {
      const ana = await leitor();
      const bia = await leitor();
      const leituraDaAna = await iniciarLeitura(ana);
      await progresso(ana, leituraDaAna, 10, diasAtras(1));
      await progresso(ana, leituraDaAna, 20, diasAtras(0));
      await processar();

      expect((await sequencia(ana)).sequenciaAtual).toBe(2);
      expect((await sequencia(bia)).sequenciaAtual).toBe(0);
    });
  });

  it('vários progressos no mesmo dia contam uma vez (RN-18.3)', async () => {
    const usuario = await leitor();
    const leituraId = await iniciarLeitura(usuario);
    await progresso(usuario, leituraId, 10, diasAtras(0));
    await progresso(usuario, leituraId, 20, diasAtras(0));
    await progresso(usuario, leituraId, 30, diasAtras(0));
    await processar();

    expect(await sequencia(usuario)).toEqual({
      sequenciaAtual: 1,
      maiorSequencia: 1,
      ultimoDiaComLeitura: dataLocal(diasAtras(0), SP),
    });
    expect(
      await contar(pool, 'leitura.dia_leitura', 'usuario_id = $1', [usuario]),
    ).toBe(1);
  });

  it('dias seguidos somam; um dia vazio zera a atual e preserva a maior (RN-18.4, 18.6)', async () => {
    const usuario = await leitor();
    const leituraId = await iniciarLeitura(usuario);
    await progresso(usuario, leituraId, 10, diasAtras(6));
    await progresso(usuario, leituraId, 20, diasAtras(5));
    await progresso(usuario, leituraId, 30, diasAtras(4));
    await processar();

    // O último dia com leitura foi há 4 dias: dias vazios já se encerraram.
    expect(await sequencia(usuario)).toMatchObject({
      sequenciaAtual: 0,
      maiorSequencia: 3,
    });

    await progresso(usuario, leituraId, 40, diasAtras(1));
    await processar();
    expect(await sequencia(usuario)).toMatchObject({
      sequenciaAtual: 1,
      maiorSequencia: 3,
    });
  });

  it('captura offline sincronizada depois recompõe os dias, mesmo após zerar (RN-18.5)', async () => {
    const usuario = await leitor();
    const leituraId = await iniciarLeitura(usuario);
    await progresso(usuario, leituraId, 10, diasAtras(2));
    await progresso(usuario, leituraId, 30, diasAtras(0));
    await processar();
    // O dia de ontem ficou vazio: a atual é só hoje.
    expect(await sequencia(usuario)).toMatchObject({
      sequenciaAtual: 1,
      maiorSequencia: 1,
    });

    // O progresso de ontem estava na fila offline e chega agora.
    const outraLeitura = await iniciarLeitura(usuario);
    await progresso(usuario, outraLeitura, 15, diasAtras(1));
    await processar();
    expect(await sequencia(usuario)).toMatchObject({
      sequenciaAtual: 3,
      maiorSequencia: 3,
    });
  });

  it('captura antiga não troca o último fuso conhecido', async () => {
    const usuario = await leitor();
    const leituraId = await iniciarLeitura(usuario);
    await progresso(usuario, leituraId, 10, diasAtras(0), 'Asia/Tokyo');
    // Chega depois, mas foi capturada antes, em São Paulo.
    const outra = await iniciarLeitura(usuario);
    await progresso(usuario, outra, 5, diasAtras(3), SP);
    await processar();

    const { rows } = await pool.query<{ ultimo_fuso_horario: string }>(
      'SELECT ultimo_fuso_horario FROM leitura.sequencia_leitura WHERE usuario_id = $1',
      [usuario],
    );
    expect(rows[0].ultimo_fuso_horario).toBe('Asia/Tokyo');
  });

  it('excluir trecho de progresso recalcula na mesma transação', async () => {
    const usuario = await leitor();
    const leituraId = await iniciarLeitura(usuario);
    await progresso(usuario, leituraId, 10, diasAtras(1));
    const deHoje = await progresso(usuario, leituraId, 20, diasAtras(0));
    await processar();
    expect((await sequencia(usuario)).sequenciaAtual).toBe(2);

    await http()
      .delete(`/progresso/${deHoje}`)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', randomUUID())
      .send({ ultimoProgressoIdConfirmado: deHoje })
      .expect(200);

    expect(await sequencia(usuario)).toMatchObject({
      sequenciaAtual: 1,
      maiorSequencia: 1,
      ultimoDiaComLeitura: dataLocal(diasAtras(1), SP),
    });
  });

  it('mensagem atrasada de progresso já excluído não o ressuscita', async () => {
    const usuario = await leitor();
    const leituraId = await iniciarLeitura(usuario);
    const unico = await progresso(usuario, leituraId, 10, diasAtras(0));
    // Excluído antes de o evento ser entregue.
    await http()
      .delete(`/progresso/${unico}`)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', randomUUID())
      .send({ ultimoProgressoIdConfirmado: unico })
      .expect(200);
    await processar();

    expect(broker.acks).toHaveLength(1);
    expect(await sequencia(usuario)).toEqual({
      sequenciaAtual: 0,
      maiorSequencia: 0,
      ultimoDiaComLeitura: null,
    });
    expect(
      await contar(pool, 'leitura.dia_leitura', 'usuario_id = $1', [usuario]),
    ).toBe(0);
  });

  it('backfill recompõe quem tinha progresso antes do consumidor', async () => {
    const usuario = await leitor();
    const leituraId = await iniciarLeitura(usuario);
    await progresso(usuario, leituraId, 10, diasAtras(1));
    await progresso(usuario, leituraId, 20, diasAtras(0));
    // Nenhuma entrega: o evento se perdeu sem fila acumuladora.
    expect((await sequencia(usuario)).sequenciaAtual).toBe(0);

    expect(await app.get(SequenciaService).recalcularTodos()).toBe(1);
    expect((await sequencia(usuario)).sequenciaAtual).toBe(2);
    // Rodar de novo não muda nada.
    await app.get(SequenciaService).recalcularTodos();
    expect(await sequencia(usuario)).toMatchObject({
      sequenciaAtual: 2,
      maiorSequencia: 2,
    });
  });

  describe('consumo (RNF-ERR-06/07, RNF-TST-03)', () => {
    /** Publica como o despachante do leitura publica. */
    function publicar(data: Record<string, unknown>) {
      const envelope = {
        eventId: randomUUID(),
        type: 'progresso.registrado',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: randomUUID(),
        businessKey: `progresso:${String(data.atualizacaoProgressoId)}`,
        data,
      };
      broker.canal.publish(
        EXCHANGES.leitura,
        'progresso.registrado',
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

    it('reentrega do mesmo eventId não repete efeito', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      await progresso(usuario, leituraId, 10, diasAtras(0));
      await despachante.dispatchOnce();
      const [mensagem] = broker.filas.get(FILA) ?? [];

      await broker.entregar(FILA);
      await broker.reentregar(FILA, mensagem);

      expect(broker.acks).toHaveLength(2);
      expect(
        await contar(pool, 'leitura.mensagem_processada', 'consumidor = $1', [
          'leitura.metricas',
        ]),
      ).toBe(1);
      expect((await sequencia(usuario)).sequenciaAtual).toBe(1);
    });

    it('falha transitória é retentada e o efeito acontece uma vez', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      await progresso(usuario, leituraId, 10, diasAtras(0));
      falhasForcadas = 2;

      await processar();

      expect(broker.acks).toHaveLength(1);
      expect(broker.nacks).toHaveLength(0);
      expect((await sequencia(usuario)).sequenciaAtual).toBe(1);
    });

    it('falha persistente vai para a DLQ sem recibo', async () => {
      const usuario = await leitor();
      const leituraId = await iniciarLeitura(usuario);
      await progresso(usuario, leituraId, 10, diasAtras(0));
      falhasForcadas = 99;

      await processar();

      expect(broker.nacks).toHaveLength(1);
      expect(await contar(pool, 'leitura.mensagem_processada')).toBe(0);
      expect(
        await contar(pool, 'leitura.sequencia_leitura', 'usuario_id = $1', [
          usuario,
        ]),
      ).toBe(0);
    });

    it('data fora do schema vai para a DLQ sem efeito', async () => {
      const usuario = await leitor();
      publicar({ usuarioId: usuario, dataLocal: 'ontem' });

      await broker.entregar(FILA);

      expect(broker.nacks).toHaveLength(1);
      expect(await contar(pool, 'leitura.sequencia_leitura')).toBe(0);
    });
  });
});
