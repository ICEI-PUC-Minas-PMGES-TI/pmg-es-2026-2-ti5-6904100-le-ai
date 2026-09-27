import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { als } from '../../src/common/als';
import { DRIZZLE, type DrizzleDB } from '../../src/db/drizzle.module';
import { TIPO_EVENTO } from '../../src/leituras/dominio/eventos';
import {
  dataNoFuso,
  LeiturasService,
} from '../../src/leituras/aplicacao/leituras.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil } from './massa';

const FUSO = 'America/Sao_Paulo';

interface LeituraResposta {
  id: string;
  livroId: string;
  status: string;
  dataInicio: string;
  dataFim: string | null;
  releitura: boolean;
  incompleta: boolean;
  retomavel: boolean;
  paginaAtual: number;
  totalPaginas: number | null;
  percentualConcluido: number | null;
  vezesLido: number;
  ultimaAtividadeEm: string;
  finalizadaEm: string | null;
  finalizacaoFusoHorario: string | null;
  finalizacaoDataLocal: string | null;
}

interface LinhaOutbox {
  tipo: string;
  chave_negocio: string;
  event_id: string;
  payload: Record<string, unknown>;
}

describe('ciclo de leitura (integração)', () => {
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

  async function leitora(): Promise<string> {
    const id = novoUsuario();
    await inserirPerfil(pool, id);
    return id;
  }

  function post(
    usuarioId: string,
    caminho: string,
    corpo?: object,
    chave: string = randomUUID(),
  ) {
    const req = request(app.getHttpServer())
      .post(caminho)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`)
      .set('Idempotency-Key', chave);
    return corpo ? req.send(corpo) : req;
  }

  async function iniciar(
    usuarioId: string,
    livroId: string,
  ): Promise<LeituraResposta> {
    const res = await post(usuarioId, '/leituras', { livroId }).expect(201);
    return res.body as LeituraResposta;
  }

  async function finalizar(
    usuarioId: string,
    leituraId: string,
    corpo: object = { fusoHorarioDispositivo: FUSO },
  ): Promise<LeituraResposta> {
    const res = await post(
      usuarioId,
      `/leituras/${leituraId}/finalizar`,
      corpo,
    ).expect(200);
    return res.body as LeituraResposta;
  }

  async function estanteDe(usuarioId: string, livroId: string) {
    const { rows } = await pool.query<{ status: string; vezes_lido: number }>(
      `SELECT status, vezes_lido FROM leitura.estante
        WHERE usuario_id = $1 AND livro_id = $2`,
      [usuarioId, livroId],
    );
    return rows[0];
  }

  async function outbox(leituraId?: string): Promise<LinhaOutbox[]> {
    const { rows } = await pool.query<LinhaOutbox>(
      `SELECT tipo, chave_negocio, event_id, payload FROM leitura.outbox_leitura
        WHERE $1::text IS NULL OR payload->>'leituraId' = $1
        ORDER BY criado_em, chave_negocio`,
      [leituraId ?? null],
    );
    return rows;
  }

  it('recusa sem token com 401', async () => {
    await request(app.getHttpServer())
      .post('/leituras')
      .set('Idempotency-Key', randomUUID())
      .send({ livroId: randomUUID() })
      .expect(401);
  });

  describe('primeira leitura', () => {
    it('livro fora da estante: cria estante em Lendo e emite só leitura.iniciada', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool, { paginas: 300 });

      const leitura = await iniciar(usuario, livroId);

      expect(leitura).toMatchObject({
        livroId,
        status: 'LENDO',
        releitura: false,
        incompleta: false,
        retomavel: false,
        paginaAtual: 0,
        totalPaginas: 300,
        percentualConcluido: 0,
        vezesLido: 0,
        dataFim: null,
        finalizadaEm: null,
      });
      expect(leitura.dataInicio).toBe(dataNoFuso(new Date(), FUSO));
      expect(await estanteDe(usuario, livroId)).toEqual({
        status: 'lendo',
        vezes_lido: 0,
      });

      const eventos = await outbox();
      expect(eventos).toHaveLength(1);
      expect(eventos[0].tipo).toBe(TIPO_EVENTO.LEITURA_INICIADA);
      expect(eventos[0].chave_negocio).toBe(`leitura:${leitura.id}:iniciada`);
      expect(eventos[0].payload).toMatchObject({
        usuarioId: usuario,
        leituraId: leitura.id,
        livroId,
        releitura: false,
        usuario: { id: usuario },
        livro: { id: livroId, tipo: 'oficial' },
      });
    });

    it('livro em Quero ler passa para Lendo com a data de início editada', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      await pool.query(
        `INSERT INTO leitura.estante (usuario_id, livro_id, status)
         VALUES ($1, $2, 'quero_ler')`,
        [usuario, livroId],
      );

      const res = await post(usuario, '/leituras', {
        livroId,
        dataInicio: '2026-01-10',
      }).expect(201);

      expect(res.body).toMatchObject({
        status: 'LENDO',
        dataInicio: '2026-01-10',
      });
      expect(await contar(pool, 'leitura.estante')).toBe(1);
    });

    it('recusa data de início no futuro com 422', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);

      const res = await post(usuario, '/leituras', {
        livroId,
        dataInicio: '2999-01-01',
      }).expect(422);

      expect(res.body.codigo).toBe('ENTIDADE_NAO_PROCESSAVEL');
      expect(await contar(pool, 'leitura.estante')).toBe(0);
    });

    it('finalizar: Lido, vezesLido +1, data de fim editável e data local da ação', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const iniciada = await iniciar(usuario, livroId);
      await pool.query(
        `UPDATE leitura.leitura SET data_inicio = '2026-01-01' WHERE id = $1`,
        [iniciada.id],
      );

      const antes = new Date();
      const lida = await finalizar(usuario, iniciada.id, {
        dataFim: '2026-02-01',
        fusoHorarioDispositivo: 'Asia/Tokyo',
      });

      expect(lida).toMatchObject({
        status: 'LIDO',
        dataFim: '2026-02-01',
        vezesLido: 1,
        retomavel: false,
        finalizacaoFusoHorario: 'Asia/Tokyo',
        finalizacaoDataLocal: dataNoFuso(new Date(), 'Asia/Tokyo'),
      });
      expect(
        new Date(lida.finalizadaEm as string).getTime(),
      ).toBeGreaterThanOrEqual(antes.getTime() - 1000);
      expect(await estanteDe(usuario, livroId)).toEqual({
        status: 'lido',
        vezes_lido: 1,
      });

      const [, finalizada] = await outbox(iniciada.id);
      expect(finalizada.tipo).toBe(TIPO_EVENTO.LEITURA_FINALIZADA);
      expect(finalizada.chave_negocio).toBe(
        `leitura:${iniciada.id}:finalizada`,
      );
      expect(finalizada.payload).toMatchObject({
        releitura: false,
        dataFim: '2026-02-01',
        finalizadaEm: lida.finalizadaEm,
        finalizacaoFusoHorario: 'Asia/Tokyo',
        finalizacaoDataLocal: lida.finalizacaoDataLocal,
      });
    });

    it('finalizar sem dataFim usa a data de hoje no fuso do dispositivo', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const iniciada = await iniciar(usuario, livroId);

      const lida = await finalizar(usuario, iniciada.id);

      expect(lida.dataFim).toBe(dataNoFuso(new Date(), FUSO));
    });

    it('recusa data de fim anterior ao início com 422, sem transição', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const iniciada = await iniciar(usuario, livroId);

      await post(usuario, `/leituras/${iniciada.id}/finalizar`, {
        dataFim: '2000-01-01',
        fusoHorarioDispositivo: FUSO,
      }).expect(422);

      expect(await estanteDe(usuario, livroId)).toMatchObject({
        status: 'lendo',
      });
    });

    it('recusa fuso horário inválido com 400 e campos', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const iniciada = await iniciar(usuario, livroId);

      const res = await post(usuario, `/leituras/${iniciada.id}/finalizar`, {
        fusoHorarioDispositivo: 'Lua/Base',
      }).expect(400);

      expect(res.body.campos).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ campo: 'fusoHorarioDispositivo' }),
        ]),
      );
    });

    it('abandonar: Abandonado retomável, grava página de parada', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool, { paginas: 200 });
      const iniciada = await iniciar(usuario, livroId);
      await pool.query(
        `UPDATE leitura.leitura SET pagina_atual = 42 WHERE id = $1`,
        [iniciada.id],
      );

      const res = await post(
        usuario,
        `/leituras/${iniciada.id}/abandonar`,
      ).expect(200);

      expect(res.body).toMatchObject({
        status: 'ABANDONADO',
        retomavel: true,
        incompleta: false,
        paginaAtual: 42,
        percentualConcluido: 21,
        vezesLido: 0,
      });
      expect(await estanteDe(usuario, livroId)).toEqual({
        status: 'abandonado',
        vezes_lido: 0,
      });
      const [, abandonada] = await outbox(iniciada.id);
      expect(abandonada.tipo).toBe(TIPO_EVENTO.LEITURA_ABANDONADA);
      expect(abandonada.chave_negocio).toBe(
        `leitura:${iniciada.id}:abandonada:${abandonada.event_id}`,
      );
      expect(abandonada.payload).toMatchObject({
        releitura: false,
        incompleta: false,
        paginaParada: 42,
      });
    });

    it('retomar: volta a Lendo da página registrada e abre novo ciclo de inatividade', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const iniciada = await iniciar(usuario, livroId);
      await pool.query(
        `UPDATE leitura.leitura SET pagina_atual = 42 WHERE id = $1`,
        [iniciada.id],
      );
      await post(usuario, `/leituras/${iniciada.id}/abandonar`).expect(200);

      const res = await post(
        usuario,
        `/leituras/${iniciada.id}/retomar`,
      ).expect(200);

      expect(res.body).toMatchObject({
        id: iniciada.id,
        status: 'LENDO',
        paginaAtual: 42,
        retomavel: false,
      });
      expect(await estanteDe(usuario, livroId)).toMatchObject({
        status: 'lendo',
      });
      const { rows } = await pool.query<{ inatividade_versao: number }>(
        `SELECT inatividade_versao FROM leitura.leitura WHERE id = $1`,
        [iniciada.id],
      );
      expect(rows[0].inatividade_versao).toBe(2);

      const retomada = (await outbox(iniciada.id)).find(
        (e) => e.tipo === TIPO_EVENTO.LEITURA_RETOMADA,
      );
      expect(retomada?.chave_negocio).toBe(
        `leitura:${iniciada.id}:retomada:${retomada?.event_id}`,
      );
      expect(retomada?.payload).toMatchObject({ paginaRetomada: 42 });
    });

    it('não inicia de novo uma leitura abandonada: exige retomar', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const iniciada = await iniciar(usuario, livroId);
      await post(usuario, `/leituras/${iniciada.id}/abandonar`).expect(200);

      const res = await post(usuario, '/leituras', { livroId }).expect(409);
      expect(res.body.codigo).toBe('TRANSICAO_DE_LEITURA_INVALIDA');
    });

    it('transições sem leitura em andamento respondem 409', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const iniciada = await iniciar(usuario, livroId);
      await finalizar(usuario, iniciada.id);

      for (const acao of ['finalizar', 'abandonar', 'retomar']) {
        const res = await post(usuario, `/leituras/${iniciada.id}/${acao}`, {
          fusoHorarioDispositivo: FUSO,
        });
        expect(res.status).toBe(409);
        expect(res.body.codigo).toBe('TRANSICAO_DE_LEITURA_INVALIDA');
      }
      expect(await estanteDe(usuario, livroId)).toEqual({
        status: 'lido',
        vezes_lido: 1,
      });
    });

    it('livro concluído não inicia primeira leitura: exige releitura', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      await finalizar(usuario, (await iniciar(usuario, livroId)).id);

      await post(usuario, '/leituras', { livroId }).expect(409);
    });
  });

  describe('releitura', () => {
    async function livroLido(usuario: string) {
      const livroId = await inserirLivro(pool);
      const primeira = await iniciar(usuario, livroId);
      await finalizar(usuario, primeira.id);
      return { livroId, primeira };
    }

    it('recusa reler livro nunca concluído', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);

      const res = await post(usuario, '/releituras', { livroId }).expect(409);
      expect(res.body.codigo).toBe('TRANSICAO_DE_LEITURA_INVALIDA');
    });

    it('inicia em Relendo e, ao finalizar, soma outra conclusão', async () => {
      const usuario = await leitora();
      const { livroId } = await livroLido(usuario);

      const res = await post(usuario, '/releituras', { livroId }).expect(201);
      const releitura = res.body as LeituraResposta;
      expect(releitura).toMatchObject({
        status: 'RELENDO',
        releitura: true,
        paginaAtual: 0,
        vezesLido: 1,
      });
      expect(await estanteDe(usuario, livroId)).toMatchObject({
        status: 'relendo',
      });
      const [iniciada] = await outbox(releitura.id);
      expect(iniciada.payload).toMatchObject({ releitura: true });

      const lida = await finalizar(usuario, releitura.id);
      expect(lida).toMatchObject({ status: 'LIDO', vezesLido: 2 });
    });

    it('abandonar releitura: Lido incompleta, não retomável e vezesLido inalterado', async () => {
      const usuario = await leitora();
      const { livroId } = await livroLido(usuario);
      const releitura = (
        await post(usuario, '/releituras', { livroId }).expect(201)
      ).body as LeituraResposta;

      const res = await post(
        usuario,
        `/leituras/${releitura.id}/abandonar`,
      ).expect(200);

      expect(res.body).toMatchObject({
        status: 'LIDO',
        incompleta: true,
        retomavel: false,
        dataFim: null,
        finalizadaEm: null,
        vezesLido: 1,
      });
      expect(await estanteDe(usuario, livroId)).toEqual({
        status: 'lido',
        vezes_lido: 1,
      });
      const abandonada = (await outbox(releitura.id)).find(
        (e) => e.tipo === TIPO_EVENTO.LEITURA_ABANDONADA,
      );
      expect(abandonada?.payload).toMatchObject({
        releitura: true,
        incompleta: true,
      });

      await post(usuario, `/leituras/${releitura.id}/retomar`).expect(409);
      await post(usuario, '/releituras', { livroId }).expect(201);
    });

    it('recusa releitura com outra em andamento', async () => {
      const usuario = await leitora();
      const { livroId } = await livroLido(usuario);
      await post(usuario, '/releituras', { livroId }).expect(201);

      const res = await post(usuario, '/releituras', { livroId }).expect(409);
      expect(res.body.codigo).toBe('LEITURA_EM_ANDAMENTO');
    });
  });

  describe('concorrência (RNF-ARQ-05)', () => {
    it('dois POST /leituras simultâneos: um 201 e um 409', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);

      const respostas = await Promise.all([
        post(usuario, '/leituras', { livroId }),
        post(usuario, '/leituras', { livroId }),
      ]);

      expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
      const recusada = respostas.find((r) => r.status === 409);
      expect(recusada?.body.codigo).toBe('LEITURA_EM_ANDAMENTO');
      expect(await contar(pool, 'leitura.leitura')).toBe(1);
      expect(await contar(pool, 'leitura.estante')).toBe(1);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(1);
    });
  });

  describe('autorização', () => {
    it('SEC-02: leitura de outro leitor responde 404 em consulta e transições', async () => {
      const dona = await leitora();
      const intrusa = await leitora();
      const livroId = await inserirLivro(pool);
      const leitura = await iniciar(dona, livroId);

      const consulta = await request(app.getHttpServer())
        .get(`/leituras/${leitura.id}`)
        .set('Authorization', `Bearer ${tokenDe(intrusa)}`)
        .expect(404);
      expect(consulta.body.codigo).toBe('LEITURA_NAO_ENCONTRADA');

      for (const acao of ['finalizar', 'abandonar', 'retomar']) {
        const res = await post(intrusa, `/leituras/${leitura.id}/${acao}`, {
          fusoHorarioDispositivo: FUSO,
        });
        expect(res.status).toBe(404);
      }
      expect(await estanteDe(dona, livroId)).toMatchObject({
        status: 'lendo',
      });
    });

    it('a dona consulta a própria leitura', async () => {
      const dona = await leitora();
      const livroId = await inserirLivro(pool);
      const leitura = await iniciar(dona, livroId);

      const res = await request(app.getHttpServer())
        .get(`/leituras/${leitura.id}`)
        .set('Authorization', `Bearer ${tokenDe(dona)}`)
        .expect(200);
      expect(res.body).toEqual(leitura);
    });

    it('SEC-07: recusa iniciar leitura de livro pessoal de outro leitor', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: novoUsuario(),
      });

      const res = await post(usuario, '/leituras', { livroId }).expect(403);
      expect(res.body.codigo).toBe('LIVRO_PESSOAL_DE_TERCEIRO');
      expect(await contar(pool, 'leitura.estante')).toBe(0);
    });

    it('o dono lê o próprio livro pessoal', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: usuario,
      });

      await post(usuario, '/leituras', { livroId }).expect(201);
    });

    it('livro inexistente responde 404', async () => {
      const usuario = await leitora();
      const res = await post(usuario, '/leituras', {
        livroId: randomUUID(),
      }).expect(404);
      expect(res.body.codigo).toBe('LIVRO_NAO_ENCONTRADO');
    });
  });

  describe('idempotência (RNF-ERR-04)', () => {
    it('mesma chave e corpo reproduzem status e corpo sem nova leitura', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const chave = randomUUID();

      const primeira = await post(usuario, '/leituras', { livroId }, chave);
      const repeticao = await post(usuario, '/leituras', { livroId }, chave);

      expect(primeira.status).toBe(201);
      expect(repeticao.status).toBe(201);
      expect(repeticao.body).toEqual(primeira.body);
      expect(await contar(pool, 'leitura.leitura')).toBe(1);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(1);
    });

    it('replay de abandono não gera segundo evento', async () => {
      const usuario = await leitora();
      const leitura = await iniciar(usuario, await inserirLivro(pool));
      const chave = randomUUID();

      const caminho = `/leituras/${leitura.id}/abandonar`;
      const primeira = await post(usuario, caminho, undefined, chave);
      const repeticao = await post(usuario, caminho, undefined, chave);

      expect(repeticao.status).toBe(200);
      expect(repeticao.body).toEqual(primeira.body);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(2);
    });

    it('mesma chave com outro corpo responde 409', async () => {
      const usuario = await leitora();
      const chave = randomUUID();
      await post(
        usuario,
        '/leituras',
        { livroId: await inserirLivro(pool) },
        chave,
      ).expect(201);

      const res = await post(
        usuario,
        '/leituras',
        { livroId: await inserirLivro(pool) },
        chave,
      ).expect(409);
      expect(res.body.codigo).toBe('CHAVE_IDEMPOTENCIA_CONFLITANTE');
      expect(await contar(pool, 'leitura.leitura')).toBe(1);
    });

    it('exige Idempotency-Key com 400', async () => {
      const usuario = await leitora();
      await request(app.getHttpServer())
        .post('/leituras')
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .send({ livroId: await inserirLivro(pool) })
        .expect(400);
    });
  });

  describe('abandono automático (contrato com o job RN-05)', () => {
    it('abandonarEmTransacao aplica a transição sem contar como atividade', async () => {
      const usuario = await leitora();
      const livroId = await inserirLivro(pool);
      const leitura = await iniciar(usuario, livroId);
      await pool.query(
        `UPDATE leitura.leitura
            SET ultima_atividade_em = '2026-01-01T12:00:00Z', pagina_atual = 7
          WHERE id = $1`,
        [leitura.id],
      );

      const servico = app.get(LeiturasService);
      const db = app.get<DrizzleDB>(DRIZZLE);
      const abandono = await als.run({ correlationId: randomUUID() }, () =>
        db.transaction((tx) =>
          servico.abandonarEmTransacao(tx, leitura.id, { automatico: true }),
        ),
      );

      expect(abandono).toEqual({
        leituraId: leitura.id,
        usuarioId: usuario,
        livroId,
        releitura: false,
        incompleta: false,
        paginaParada: 7,
      });
      const { rows } = await pool.query<{
        status: string;
        ultima_atividade_em: Date;
      }>(
        `SELECT status, ultima_atividade_em FROM leitura.leitura WHERE id = $1`,
        [leitura.id],
      );
      expect(rows[0].status).toBe('abandonado');
      expect(rows[0].ultima_atividade_em.toISOString()).toBe(
        '2026-01-01T12:00:00.000Z',
      );
      expect(await estanteDe(usuario, livroId)).toMatchObject({
        status: 'abandonado',
      });
    });
  });
});
