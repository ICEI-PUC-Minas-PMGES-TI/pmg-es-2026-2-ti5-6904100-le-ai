import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil } from './massa';

const ROTA = '/internal/jobs/inatividade';
const TOKEN = process.env.SCHEDULER_TOKEN as string;
const INICIO = '2026-01-01';
/** Atividade no meio do dia: a contagem é por dia de calendário. */
const ATIVIDADE = '2026-01-01T15:30:00Z';

function dia(base: string, deslocamento: number): string {
  const data = new Date(`${base.slice(0, 10)}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + deslocamento);
  return data.toISOString().slice(0, 10);
}

/**
 * Job de inatividade RN-05 contra Postgres real, pela rota HTTP: limiares
 * 20/30/40, deduplicação semântica por `limiar_inatividade`, novo ciclo após
 * atividade e abandono automático de primeira leitura e de releitura.
 */
describe('job de inatividade RN-05 (integração)', () => {
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

  interface Semente {
    releitura?: boolean;
    ultimaAtividadeEm?: string;
  }

  /** Estante + ocorrência em andamento, como a fatia de leitura as grava. */
  async function leituraEmAndamento(semente: Semente = {}) {
    const usuarioId = novoUsuario();
    const livroId = await inserirLivro(pool);
    await inserirPerfil(pool, usuarioId);
    const releitura = semente.releitura ?? false;

    const {
      rows: [estante],
    } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.estante (usuario_id, livro_id, status, vezes_lido)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [usuarioId, livroId, releitura ? 'relendo' : 'lendo', releitura ? 1 : 0],
    );
    const {
      rows: [leitura],
    } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.leitura
         (estante_id, usuario_id, livro_id, status, releitura, data_inicio,
          pagina_atual, ultima_atividade_em)
       VALUES ($1, $2, $3, 'lendo', $4, $5, 42, $6) RETURNING id`,
      [
        estante.id,
        usuarioId,
        livroId,
        releitura,
        INICIO,
        semente.ultimaAtividadeEm ?? ATIVIDADE,
      ],
    );
    return { usuarioId, livroId, estanteId: estante.id, leituraId: leitura.id };
  }

  function executar(
    dataReferencia?: string,
    chave: string = randomUUID(),
    token: string | null = TOKEN,
  ) {
    const chamada = request(app.getHttpServer())
      .post(ROTA)
      .set('Idempotency-Key', chave);
    if (token !== null) {
      chamada.set('X-Scheduler-Token', token);
    }
    return chamada.send(dataReferencia ? { dataReferencia } : {});
  }

  function eventos(leituraId: string, tipo: string) {
    return contar(
      pool,
      'leitura.outbox_leitura',
      `tipo = $1 AND payload->>'leituraId' = $2`,
      [tipo, leituraId],
    );
  }

  function limiares(leituraId: string, onde = 'true') {
    return contar(
      pool,
      'leitura.limiar_inatividade',
      `leitura_id = $1 AND ${onde}`,
      [leituraId],
    );
  }

  describe('autenticação do agendador', () => {
    it('recusa sem X-Scheduler-Token com 401 e sem efeito', async () => {
      const { leituraId } = await leituraEmAndamento();

      const resposta = await executar(dia(INICIO, 20), randomUUID(), null);

      expect(resposta.status).toBe(401);
      expect(resposta.body.codigo).toBe('NAO_AUTENTICADO');
      expect(await limiares(leituraId)).toBe(0);
    });

    it('recusa token errado com 401', async () => {
      const resposta = await executar(
        dia(INICIO, 20),
        randomUUID(),
        `${TOKEN}x`,
      );
      expect(resposta.status).toBe(401);
    });

    it('não aceita JWT de leitor no lugar do token do agendador', async () => {
      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('Idempotency-Key', randomUUID())
        .set('Authorization', 'Bearer qualquer')
        .send({});
      expect(resposta.status).toBe(401);
    });
  });

  describe('entrada', () => {
    it('exige Idempotency-Key', async () => {
      const resposta = await request(app.getHttpServer())
        .post(ROTA)
        .set('X-Scheduler-Token', TOKEN)
        .send({});
      expect(resposta.status).toBe(400);
    });

    it('recusa dataReferencia fora do formato de data', async () => {
      const resposta = await executar('2026-02-30');
      expect(resposta.status).toBe(400);
      expect(resposta.body.campos[0].campo).toBe('dataReferencia');
    });

    it('sem leituras elegíveis responde 200 com contagens zeradas', async () => {
      const resposta = await executar('2026-03-01');
      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        dataReferencia: '2026-03-01',
        alertasDia20: 0,
        alertasDia30: 0,
        abandonosDia40: 0,
      });
    });

    it('sem dataReferencia usa a data corrente', async () => {
      const resposta = await executar();
      expect(resposta.status).toBe(200);
      expect(resposta.body.dataReferencia).toBe(
        new Date().toISOString().slice(0, 10),
      );
    });
  });

  describe('limiares', () => {
    it('dia 19 ainda não é risco', async () => {
      const { leituraId } = await leituraEmAndamento();

      const resposta = await executar(dia(INICIO, 19));

      expect(resposta.body.alertasDia20).toBe(0);
      expect(await limiares(leituraId)).toBe(0);
    });

    it('dia 20 registra um limiar de risco e um leitura.em_risco com o mesmo eventId', async () => {
      const { leituraId, usuarioId, livroId } = await leituraEmAndamento();

      const resposta = await executar(dia(INICIO, 20));

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        alertasDia20: 1,
        alertasDia30: 0,
        abandonosDia40: 0,
      });
      const {
        rows: [limiar],
      } = await pool.query(
        `SELECT l.tipo, l.limiar_dias, l.inatividade_versao, o.chave_negocio,
                o.payload, o.correlation_id
           FROM leitura.limiar_inatividade l
           JOIN leitura.outbox_leitura o ON o.event_id = l.event_id
          WHERE l.leitura_id = $1`,
        [leituraId],
      );
      expect(limiar).toMatchObject({
        tipo: 'risco',
        limiar_dias: 20,
        inatividade_versao: 1,
        chave_negocio: `leitura:${leituraId}:inatividade:1:20`,
      });
      expect(limiar.correlation_id).not.toBeNull();
      expect(limiar.payload).toMatchObject({
        destinatarioId: usuarioId,
        leituraId,
        inatividadeVersao: 1,
        limiarDias: 20,
        livro: { id: livroId, tipo: 'oficial' },
      });
      // Risco não muda a leitura.
      const {
        rows: [leitura],
      } = await pool.query('SELECT status FROM leitura.leitura WHERE id = $1', [
        leituraId,
      ]);
      expect(leitura.status).toBe('lendo');
    });

    it('dias 20, 30 e 40 em sequência: um fato por limiar', async () => {
      const { leituraId, estanteId } = await leituraEmAndamento();

      const d20 = await executar(dia(INICIO, 20));
      const d30 = await executar(dia(INICIO, 30));
      const d40 = await executar(dia(INICIO, 40));

      expect(d20.body.alertasDia20).toBe(1);
      expect(d30.body.alertasDia30).toBe(1);
      expect(d40.body.abandonosDia40).toBe(1);
      expect(await limiares(leituraId, `tipo = 'risco'`)).toBe(2);
      expect(await limiares(leituraId, `tipo = 'expiracao'`)).toBe(1);
      expect(await eventos(leituraId, 'leitura.em_risco')).toBe(2);
      expect(await eventos(leituraId, 'leitura.abandonada')).toBe(1);
      expect(await eventos(leituraId, 'leitura.expirada')).toBe(1);

      const {
        rows: [leitura],
      } = await pool.query(
        'SELECT status, incompleta, pagina_atual FROM leitura.leitura WHERE id = $1',
        [leituraId],
      );
      expect(leitura).toEqual({
        status: 'abandonado',
        incompleta: false,
        pagina_atual: 42,
      });
      const {
        rows: [estante],
      } = await pool.query(
        'SELECT status, vezes_lido FROM leitura.estante WHERE id = $1',
        [estanteId],
      );
      expect(estante).toEqual({ status: 'abandonado', vezes_lido: 0 });
    });

    it('releitura expirada volta a Lido como incompleta, sem nova conclusão', async () => {
      const { leituraId, estanteId } = await leituraEmAndamento({
        releitura: true,
      });

      const resposta = await executar(dia(INICIO, 40));

      expect(resposta.body.abandonosDia40).toBe(1);
      const {
        rows: [leitura],
      } = await pool.query(
        'SELECT status, incompleta, data_fim FROM leitura.leitura WHERE id = $1',
        [leituraId],
      );
      expect(leitura).toEqual({
        status: 'lido',
        incompleta: true,
        data_fim: null,
      });
      const {
        rows: [estante],
      } = await pool.query(
        'SELECT status, vezes_lido FROM leitura.estante WHERE id = $1',
        [estanteId],
      );
      expect(estante).toEqual({ status: 'lido', vezes_lido: 1 });
      expect(await eventos(leituraId, 'leitura.expirada')).toBe(1);
    });

    it('leitura que chega ao job já no dia 40 é expirada sem alertas de risco atrasados', async () => {
      const { leituraId } = await leituraEmAndamento();

      const resposta = await executar(dia(INICIO, 45));

      expect(resposta.body).toMatchObject({
        alertasDia20: 0,
        alertasDia30: 0,
        abandonosDia40: 1,
      });
      expect(await limiares(leituraId, `tipo = 'risco'`)).toBe(0);
      expect(await eventos(leituraId, 'leitura.em_risco')).toBe(0);
    });

    it('leitura que chega no dia 30 recebe só o segundo alerta, e o dia 20 nunca é emitido depois', async () => {
      const { leituraId } = await leituraEmAndamento();

      await executar(dia(INICIO, 31));
      await executar(dia(INICIO, 32));

      expect(await limiares(leituraId)).toBe(1);
      expect(await limiares(leituraId, 'limiar_dias = 30')).toBe(1);
    });

    it('leitura já encerrada não é tocada', async () => {
      const { leituraId } = await leituraEmAndamento();
      await pool.query(
        `UPDATE leitura.leitura SET status = 'abandonado' WHERE id = $1`,
        [leituraId],
      );

      const resposta = await executar(dia(INICIO, 40));

      expect(resposta.body.abandonosDia40).toBe(0);
      expect(await limiares(leituraId)).toBe(0);
    });
  });

  describe('reexecução', () => {
    it('outra Idempotency-Key no mesmo ciclo não gera segundo fato', async () => {
      const { leituraId } = await leituraEmAndamento();

      await executar(dia(INICIO, 20));
      const segunda = await executar(dia(INICIO, 20));
      const diaSeguinte = await executar(dia(INICIO, 21));

      expect(segunda.body.alertasDia20).toBe(0);
      expect(diaSeguinte.body.alertasDia20).toBe(0);
      expect(await limiares(leituraId)).toBe(1);
      expect(await eventos(leituraId, 'leitura.em_risco')).toBe(1);
    });

    it('dia 40 reexecutado não abandona nem expira de novo', async () => {
      const { leituraId } = await leituraEmAndamento();

      await executar(dia(INICIO, 40));
      const segunda = await executar(dia(INICIO, 41));

      expect(segunda.body.abandonosDia40).toBe(0);
      expect(await eventos(leituraId, 'leitura.abandonada')).toBe(1);
      expect(await eventos(leituraId, 'leitura.expirada')).toBe(1);
    });

    it('mesma Idempotency-Key e mesmo corpo devolvem a resposta original', async () => {
      await leituraEmAndamento();
      const chave = randomUUID();

      const primeira = await executar(dia(INICIO, 20), chave);
      const repeticao = await executar(dia(INICIO, 20), chave);

      expect(repeticao.status).toBe(200);
      expect(repeticao.body).toEqual(primeira.body);
      expect(repeticao.body.alertasDia20).toBe(1);
    });

    it('mesma Idempotency-Key com outra dataReferencia é 409', async () => {
      const chave = randomUUID();

      await executar(dia(INICIO, 20), chave);
      const conflito = await executar(dia(INICIO, 21), chave);

      expect(conflito.status).toBe(409);
      expect(conflito.body.codigo).toBe('CHAVE_IDEMPOTENCIA_CONFLITANTE');
    });
  });

  describe('novo ciclo', () => {
    it('atividade incrementa a versão e permite novos alertas após outros 20 dias', async () => {
      const { leituraId } = await leituraEmAndamento();
      await executar(dia(INICIO, 20));

      const novaAtividade = `${dia(INICIO, 25)}T10:00:00Z`;
      await pool.query(
        `UPDATE leitura.leitura
            SET inatividade_versao = inatividade_versao + 1,
                ultima_atividade_em = $2
          WHERE id = $1`,
        [leituraId, novaAtividade],
      );

      const antes = await executar(dia(novaAtividade, 19));
      const depois = await executar(dia(novaAtividade, 20));

      expect(antes.body.alertasDia20).toBe(0);
      expect(depois.body.alertasDia20).toBe(1);
      expect(await limiares(leituraId, 'inatividade_versao = 2')).toBe(1);
      const { rows } = await pool.query<{ chave_negocio: string }>(
        `SELECT chave_negocio FROM leitura.outbox_leitura
          WHERE tipo = 'leitura.em_risco' ORDER BY chave_negocio`,
      );
      expect(rows.map((linha) => linha.chave_negocio)).toEqual([
        `leitura:${leituraId}:inatividade:1:20`,
        `leitura:${leituraId}:inatividade:2:20`,
      ]);
    });
  });

  it('a falha de uma leitura não desfaz as outras', async () => {
    const saudavel = await leituraEmAndamento();
    const semLivro = await leituraEmAndamento();
    await pool.query(
      'DELETE FROM acervo.v_livro_referencia_v1 WHERE livro_id = $1',
      [semLivro.livroId],
    );

    const resposta = await executar(dia(INICIO, 20));

    expect(resposta.status).toBe(200);
    expect(resposta.body.alertasDia20).toBe(1);
    expect(await limiares(saudavel.leituraId)).toBe(1);
    expect(await limiares(semLivro.leituraId)).toBe(0);
  });
});
