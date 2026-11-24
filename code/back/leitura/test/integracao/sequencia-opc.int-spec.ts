import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { als } from '../../src/common/als';
import { DRIZZLE, type DrizzleDB } from '../../src/db/drizzle.module';
import { LembreteSequenciaService } from '../../src/jobs/lembrete-sequencia/aplicacao/lembrete-sequencia.service';
import { AmqpPublisherService } from '../../src/messaging/amqp-publisher.service';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { OutboxDispatcherService } from '../../src/messaging/outbox-dispatcher.service';
import { dataLocal } from '../../src/progresso/dominio/progresso';
import { eventIdDoLembrete } from '../../src/sequencia/dominio/lembrete';
import { SequenciaService } from '../../src/sequencia/sequencia.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { BrokerEmMemoria } from './broker-em-memoria';
import { inserirLivro, inserirPerfil } from './massa';

const SP = 'America/Sao_Paulo';
const TOKEN = process.env.SCHEDULER_TOKEN as string;
const FILA_DE_ESCUTA = 'teste.lembrete';

interface Calendario {
  mes: string;
  mesAtual: string;
  mesMaisAntigo: string;
  hoje: string;
  dias: string[];
}

/**
 * F-GAM-OPC contra Postgres real: o calendário (RF-GAM-04) lê os mesmos dias
 * que a sequência, e o job do lembrete (RF-GAM-05) grava `lembrete.sequencia`
 * na outbox uma vez por leitor e dia local.
 */
describe('calendário e lembrete de sequência (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });
  beforeEach(() => limpar(pool));

  const http = () => request(app.getHttpServer());

  async function leitor(): Promise<string> {
    const usuario = novoUsuario();
    await inserirPerfil(pool, { id: usuario });
    return usuario;
  }

  /** Estado de F-GAM gravado direto: dias com leitura e a sequência. */
  async function semear(
    usuario: string,
    dias: string[],
    sequenciaAtual: number,
    fuso = SP,
  ): Promise<void> {
    for (const data of dias) {
      await pool.query(
        'INSERT INTO leitura.dia_leitura (usuario_id, data) VALUES ($1, $2)',
        [usuario, data],
      );
    }
    const ultimo = [...dias].sort().at(-1);
    await pool.query(
      `INSERT INTO leitura.sequencia_leitura
         (usuario_id, sequencia_atual, maior_sequencia, ultimo_dia,
          ultimo_fuso_horario, ultimo_fuso_registrado_em)
       VALUES ($1, $2, $2, $3, $4, now())`,
      [usuario, sequenciaAtual, ultimo, fuso],
    );
  }

  function calendario(usuario: string, mes?: string) {
    const chamada = http()
      .get('/me/sequencia/calendario')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);
    return mes ? chamada.query({ mes }) : chamada;
  }

  function somarMeses(mes: string, n: number): string {
    const [ano, numero] = mes.split('-').map(Number);
    const total = ano * 12 + numero - 1 + n;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
  }

  describe('GET /me/sequencia/calendario (RF-GAM-04)', () => {
    it('sem token é 401', async () => {
      await http().get('/me/sequencia/calendario').expect(401);
    });

    it('sem progresso: mês corrente, sem dias, e a janela fica só nele', async () => {
      const res = await calendario(await leitor()).expect(200);
      const corpo = res.body as Calendario;
      const hoje = dataLocal(new Date(), SP);
      expect(corpo).toEqual({
        mes: hoje.slice(0, 7),
        mesAtual: hoje.slice(0, 7),
        mesMaisAntigo: hoje.slice(0, 7),
        hoje,
        dias: [],
      });
    });

    it('devolve os dias do mês pedido, crescentes, e a janela de seis meses', async () => {
      const usuario = await leitor();
      const mesAtual = dataLocal(new Date(), SP).slice(0, 7);
      const anterior = somarMeses(mesAtual, -1);
      const antigo = somarMeses(mesAtual, -9);
      await semear(
        usuario,
        [`${anterior}-03`, `${anterior}-01`, `${mesAtual}-01`, `${antigo}-10`],
        1,
      );

      const corpo = (await calendario(usuario, anterior).expect(200))
        .body as Calendario;
      expect(corpo.mes).toBe(anterior);
      expect(corpo.dias).toEqual([`${anterior}-01`, `${anterior}-03`]);
      expect(corpo.mesMaisAntigo).toBe(somarMeses(mesAtual, -5));
      expect(corpo.mesAtual).toBe(mesAtual);
    });

    it('não recua antes do primeiro dia com leitura', async () => {
      const usuario = await leitor();
      const mesAtual = dataLocal(new Date(), SP).slice(0, 7);
      const anterior = somarMeses(mesAtual, -2);
      await semear(usuario, [`${anterior}-15`], 1);
      const corpo = (await calendario(usuario).expect(200)).body as Calendario;
      expect(corpo.mesMaisAntigo).toBe(anterior);
    });

    it('mês fora da janela é 422 com o campo; formato errado é 400 (RNF-DES-02)', async () => {
      const usuario = await leitor();
      const mesAtual = dataLocal(new Date(), SP).slice(0, 7);
      const res = await calendario(usuario, somarMeses(mesAtual, 1)).expect(
        422,
      );
      expect(res.body).toMatchObject({
        codigo: 'ENTIDADE_NAO_PROCESSAVEL',
        campos: [expect.objectContaining({ campo: 'mes' })],
      });
      await calendario(usuario, somarMeses(mesAtual, -1)).expect(422);
      await calendario(usuario, '2026-13').expect(400);
      await calendario(usuario, '2026-9').expect(400);
    });

    it('só o próprio leitor vê os seus dias (SEC-02)', async () => {
      const ana = await leitor();
      const bia = await leitor();
      const hoje = dataLocal(new Date(), SP);
      await semear(ana, [hoje], 1);
      const daBia = (await calendario(bia).expect(200)).body as Calendario;
      expect(daBia.dias).toEqual([]);
    });

    it('pelo caminho real: iniciar não marca o dia; o progresso com página marca', async () => {
      const usuario = await leitor();
      const livroId = await inserirLivro(pool, { paginas: 300 });
      const leitura = await http()
        .post('/leituras')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .set('Idempotency-Key', randomUUID())
        .send({ livroId })
        .expect(201);
      const leituraId = (leitura.body as { id: string }).id;
      expect(
        ((await calendario(usuario).expect(200)).body as Calendario).dias,
      ).toEqual([]);

      const agora = new Date();
      await http()
        .post(`/leituras/${leituraId}/progresso`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .set('Idempotency-Key', randomUUID())
        .send({
          pagina: 10,
          registradoEmDispositivo: agora.toISOString(),
          fusoHorarioDispositivo: SP,
        })
        .expect(201);
      // O consumidor de métricas recompõe a sequência; aqui, direto.
      const sequencia = app.get(SequenciaService);
      await app
        .get<DrizzleDB>(DRIZZLE)
        .transaction((tx) => sequencia.recalcular(tx, usuario));

      const corpo = (await calendario(usuario).expect(200)).body as Calendario;
      expect(corpo.dias).toEqual([dataLocal(agora, SP)]);
      const resumo = await http()
        .get('/me/sequencia')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .expect(200);
      expect(resumo.body).toMatchObject({
        sequenciaAtual: 1,
        ultimoDiaComLeitura: corpo.dias[0],
      });
    });
  });

  describe('job do lembrete (RF-GAM-05)', () => {
    // 25/09/2026 às 19h em São Paulo.
    const AGORA = new Date('2026-09-25T22:00:00Z');
    // Fora de uma requisição não há correlation-id, e a outbox o exige: o
    // agendador sempre chama pela rota, que o cria.
    const job = () => ({
      processar: (agora: Date) =>
        als.run({ correlationId: randomUUID() }, () =>
          app.get(LembreteSequenciaService).processar(agora),
        ),
    });

    async function lembretes(usuario?: string): Promise<number> {
      return usuario
        ? contar(
            pool,
            'leitura.outbox_leitura',
            "tipo = 'lembrete.sequencia' AND payload->>'destinatarioId' = $1",
            [usuario],
          )
        : contar(pool, 'leitura.outbox_leitura', "tipo = 'lembrete.sequencia'");
    }

    it('seleciona só sequência ativa sem registro no dia local corrente', async () => {
      const devido = await leitor();
      const jaLeuHoje = await leitor();
      const zerada = await leitor();
      const semNada = await leitor();
      await semear(devido, ['2026-09-23', '2026-09-24'], 2);
      await semear(jaLeuHoje, ['2026-09-24', '2026-09-25'], 2);
      await semear(zerada, ['2026-09-22', '2026-09-23'], 2);
      void semNada;

      const resultado = await job().processar(AGORA);

      expect(resultado).toEqual({
        instanteReferencia: AGORA.toISOString(),
        elegiveis: 1,
        lembretesPublicados: 1,
        jaLembrados: 0,
      });
      expect(await lembretes(devido)).toBe(1);
      expect(await lembretes()).toBe(1);

      const {
        rows: [linha],
      } = await pool.query<{
        event_id: string;
        chave_negocio: string;
        payload: unknown;
      }>(
        "SELECT event_id, chave_negocio, payload FROM leitura.outbox_leitura WHERE tipo = 'lembrete.sequencia'",
      );
      expect(linha).toEqual({
        event_id: eventIdDoLembrete(devido, '2026-09-25'),
        chave_negocio: `sequencia:${devido}:lembrete:2026-09-25`,
        payload: {
          destinatarioId: devido,
          dataLocal: '2026-09-25',
          sequenciaAtual: 2,
        },
      });
    });

    it('usa o último fuso registrado pelo dispositivo', async () => {
      // 22h UTC de 25/09 já é 26/09 em Tóquio; em São Paulo ainda é 25/09.
      const emToquio = await leitor();
      const emSaoPaulo = await leitor();
      await semear(emToquio, ['2026-09-25'], 1, 'Asia/Tokyo');
      await semear(emSaoPaulo, ['2026-09-25'], 1, SP);

      await job().processar(AGORA);

      expect(await lembretes(emToquio)).toBe(1);
      expect(await lembretes(emSaoPaulo)).toBe(0);
    });

    it('reexecutar no mesmo dia não gera segundo lembrete; o dia seguinte gera (RNF-ERR-06)', async () => {
      const usuario = await leitor();
      await semear(usuario, ['2026-09-24'], 5);

      await job().processar(AGORA);
      const segunda = await job().processar(
        new Date(AGORA.getTime() + 60 * 60 * 1000),
      );
      expect(segunda).toMatchObject({
        elegiveis: 1,
        lembretesPublicados: 0,
        jaLembrados: 1,
      });
      expect(await lembretes(usuario)).toBe(1);

      // No dia seguinte, com o progresso de 25/09, a sequência segue ativa.
      await pool.query(
        "INSERT INTO leitura.dia_leitura (usuario_id, data) VALUES ($1, '2026-09-25')",
        [usuario],
      );
      await pool.query(
        "UPDATE leitura.sequencia_leitura SET ultimo_dia = '2026-09-25', sequencia_atual = 6, maior_sequencia = 6 WHERE usuario_id = $1",
        [usuario],
      );
      await job().processar(new Date('2026-09-26T22:00:00Z'));
      expect(await lembretes(usuario)).toBe(2);
    });

    it('conta suspensa ou em exclusão (fora da VIEW de perfil) não recebe', async () => {
      const usuario = await leitor();
      await semear(usuario, ['2026-09-24'], 3);
      await pool.query(
        'DELETE FROM identidade.v_perfil_referencia_v1 WHERE id = $1',
        [usuario],
      );
      expect((await job().processar(AGORA)).elegiveis).toBe(0);
      expect(await lembretes()).toBe(0);
    });

    it('não altera a sequência nem os dias (RN-18)', async () => {
      const usuario = await leitor();
      await semear(usuario, ['2026-09-23', '2026-09-24'], 2);
      const antes = await pool.query(
        'SELECT * FROM leitura.sequencia_leitura WHERE usuario_id = $1',
        [usuario],
      );
      await job().processar(AGORA);
      const depois = await pool.query(
        'SELECT * FROM leitura.sequencia_leitura WHERE usuario_id = $1',
        [usuario],
      );
      expect(depois.rows).toEqual(antes.rows);
      expect(
        await contar(pool, 'leitura.dia_leitura', 'usuario_id = $1', [usuario]),
      ).toBe(2);
    });

    it('o despachante publica o envelope válido no exchange do leitura', async () => {
      const usuario = await leitor();
      await semear(usuario, ['2026-09-24'], 4);
      await job().processar(AGORA);

      const broker = new BrokerEmMemoria();
      await broker.canal.assertQueue(FILA_DE_ESCUTA);
      await broker.canal.bindQueue(
        FILA_DE_ESCUTA,
        EXCHANGES.leitura,
        'lembrete.sequencia',
      );
      const validador = app.get(MessageValidator);
      await new OutboxDispatcherService(
        app.get<DrizzleDB>(DRIZZLE),
        broker.conexao,
        new AmqpPublisherService(broker.conexao, validador),
      ).dispatchOnce();

      const [mensagem] = broker.filas.get(FILA_DE_ESCUTA) ?? [];
      expect(mensagem).toBeDefined();
      const envelope = JSON.parse(mensagem.content.toString()) as Record<
        string,
        unknown
      >;
      expect(envelope).toMatchObject({
        eventId: eventIdDoLembrete(usuario, '2026-09-25'),
        type: 'lembrete.sequencia',
        version: 1,
        businessKey: `sequencia:${usuario}:lembrete:2026-09-25`,
        data: {
          destinatarioId: usuario,
          dataLocal: '2026-09-25',
          sequenciaAtual: 4,
        },
      });
    });

    describe('POST /internal/jobs/lembrete-sequencia', () => {
      const ROTA = '/internal/jobs/lembrete-sequencia';

      it('sem o token do agendador é 401', async () => {
        await http()
          .post(ROTA)
          .set('Idempotency-Key', randomUUID())
          .send({})
          .expect(401);
        await http()
          .post(ROTA)
          .set('Idempotency-Key', randomUUID())
          .set('X-Scheduler-Token', 'x'.repeat(40))
          .send({})
          .expect(401);
      });

      it('sem Idempotency-Key é 400; campo extra é 400', async () => {
        await http()
          .post(ROTA)
          .set('X-Scheduler-Token', TOKEN)
          .send({})
          .expect(400);
        await http()
          .post(ROTA)
          .set('X-Scheduler-Token', TOKEN)
          .set('Idempotency-Key', randomUUID())
          .send({ instante: '2026-09-25T22:00:00Z' })
          .expect(400);
      });

      it('responde o resultado e repete a mesma resposta com a mesma chave', async () => {
        const chave = randomUUID();
        const primeira = await http()
          .post(ROTA)
          .set('X-Scheduler-Token', TOKEN)
          .set('Idempotency-Key', chave)
          .send({})
          .expect(200);
        expect(primeira.body).toMatchObject({
          elegiveis: 0,
          lembretesPublicados: 0,
          jaLembrados: 0,
        });
        const replay = await http()
          .post(ROTA)
          .set('X-Scheduler-Token', TOKEN)
          .set('Idempotency-Key', chave)
          .send({})
          .expect(200);
        expect(replay.body).toEqual(primeira.body);
      });
    });
  });
});
