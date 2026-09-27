import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import {
  TIPO_EVENTO,
  EVENTO_VERSAO_V1,
} from '../../src/leituras/dominio/eventos';
import { MessageValidator } from '../../src/messaging/message-validator';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil } from './massa';

const FUSO = 'America/Sao_Paulo';
const TOTAL = 300;

interface Resumo {
  paginaAtual: number;
  totalPaginas: number;
  percentualConcluido: number;
  minutosTotais: number;
}

interface Progresso {
  id: string;
  leituraId: string;
  posicao: number;
  pagina: number;
  paginaAnterior: number;
  paginasLidas: number;
  minutos: number;
  registradoEmDispositivo: string;
  fusoHorarioDispositivo: string;
  dataLocal: string;
  criadoEm: string;
  atualizadoEm: string | null;
}

describe('progresso manual (integração)', () => {
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

  function autenticado(
    metodo: 'post' | 'get' | 'patch' | 'delete',
    usuarioId: string,
    caminho: string,
    chave: string = randomUUID(),
  ) {
    const req = request(app.getHttpServer())
      [metodo](caminho)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`);
    return metodo === 'get' ? req : req.set('Idempotency-Key', chave);
  }

  function corpo(pagina: number, extras: object = {}) {
    return {
      pagina,
      minutos: 30,
      registradoEmDispositivo: '2026-09-20T02:30:00.000Z',
      fusoHorarioDispositivo: FUSO,
      ...extras,
    };
  }

  async function leituraEmAndamento(
    paginas = TOTAL,
  ): Promise<{ usuario: string; leituraId: string }> {
    const usuario = novoUsuario();
    await inserirPerfil(pool, { id: usuario });
    const livroId = await inserirLivro(pool, { paginas });
    const res = await autenticado('post', usuario, '/leituras')
      .send({ livroId })
      .expect(201);
    return { usuario, leituraId: (res.body as { id: string }).id };
  }

  async function registrar(
    usuario: string,
    leituraId: string,
    pagina: number,
  ): Promise<{ progresso: Progresso; resumo: Resumo }> {
    const res = await autenticado(
      'post',
      usuario,
      `/leituras/${leituraId}/progresso`,
    )
      .send(corpo(pagina))
      .expect(201);
    return res.body as { progresso: Progresso; resumo: Resumo };
  }

  async function leituraNoBanco(leituraId: string) {
    const { rows } = await pool.query<{
      pagina_atual: number;
      inatividade_versao: number;
    }>(
      'SELECT pagina_atual, inatividade_versao FROM leitura.leitura WHERE id = $1',
      [leituraId],
    );
    return rows[0];
  }

  describe('registrar', () => {
    it('cria o registro, deriva páginas lidas, zera a inatividade e grava a outbox', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const antes = await leituraNoBanco(leituraId);

      await registrar(usuario, leituraId, 40);
      const { progresso, resumo } = await registrar(usuario, leituraId, 100);

      expect(progresso).toMatchObject({
        leituraId,
        posicao: 2,
        pagina: 100,
        paginaAnterior: 40,
        paginasLidas: 60,
        minutos: 30,
        registradoEmDispositivo: '2026-09-20T02:30:00.000Z',
        fusoHorarioDispositivo: FUSO,
        dataLocal: '2026-09-19',
        atualizadoEm: null,
      });
      expect(resumo).toEqual({
        paginaAtual: 100,
        totalPaginas: TOTAL,
        percentualConcluido: (100 / TOTAL) * 100,
        minutosTotais: 60,
      });
      expect(await leituraNoBanco(leituraId)).toEqual({
        pagina_atual: 100,
        inatividade_versao: antes.inatividade_versao + 2,
      });

      const { rows } = await pool.query<{
        chave_negocio: string;
        payload: Record<string, unknown>;
      }>(
        `SELECT chave_negocio, payload FROM leitura.outbox_leitura
          WHERE tipo = $1 AND payload->>'atualizacaoProgressoId' = $2`,
        [TIPO_EVENTO.PROGRESSO_REGISTRADO, progresso.id],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].chave_negocio).toBe(`progresso:${progresso.id}`);
      expect(rows[0].payload).toMatchObject({
        usuarioId: usuario,
        leituraId,
        pagina: 100,
        paginasLidas: 60,
        minutos: 30,
        percentual: resumo.percentualConcluido,
        registradoEm: '2026-09-20T02:30:00.000Z',
        fusoHorario: FUSO,
        dataLocal: '2026-09-19',
      });
      expect(() =>
        app
          .get(MessageValidator)
          .validarDados(
            TIPO_EVENTO.PROGRESSO_REGISTRADO,
            EVENTO_VERSAO_V1,
            rows[0].payload,
          ),
      ).not.toThrow();
    });

    it('recusa página que não avança ou supera o total com 422', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      await registrar(usuario, leituraId, 50);

      for (const pagina of [50, 10, TOTAL + 1]) {
        const res = await autenticado(
          'post',
          usuario,
          `/leituras/${leituraId}/progresso`,
        )
          .send(corpo(pagina))
          .expect(422);
        expect(res.body.campos[0].campo).toBe('pagina');
      }
      expect(await contar(pool, 'leitura.atualizacao_progresso')).toBe(1);
    });

    it('tempo é opcional: ausente ou zero grava 0 e a outbox continua válida', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const semMinutos: Record<string, unknown> = corpo(10);
      delete semMinutos.minutos;

      const semTempo = await autenticado(
        'post',
        usuario,
        `/leituras/${leituraId}/progresso`,
      )
        .send(semMinutos)
        .expect(201);
      expect(semTempo.body.progresso.minutos).toBe(0);
      expect(semTempo.body.resumo.minutosTotais).toBe(0);

      const zero = await autenticado(
        'post',
        usuario,
        `/leituras/${leituraId}/progresso`,
      )
        .send(corpo(20, { minutos: 0 }))
        .expect(201);
      expect(zero.body.progresso.minutos).toBe(0);

      const { resumo } = await registrar(usuario, leituraId, 30);
      expect(resumo.minutosTotais).toBe(30);

      const { rows } = await pool.query<{ payload: Record<string, unknown> }>(
        `SELECT payload FROM leitura.outbox_leitura
          WHERE tipo = $1 AND payload->>'atualizacaoProgressoId' = $2`,
        [TIPO_EVENTO.PROGRESSO_REGISTRADO, semTempo.body.progresso.id],
      );
      expect(rows[0].payload.minutos).toBe(0);
      expect(() =>
        app
          .get(MessageValidator)
          .validarDados(
            TIPO_EVENTO.PROGRESSO_REGISTRADO,
            EVENTO_VERSAO_V1,
            rows[0].payload,
          ),
      ).not.toThrow();
    });

    it('recusa corpo malformado com 400', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      for (const extras of [
        { minutos: -1 },
        { minutos: 721 },
        { minutos: 1.5 },
        { fusoHorarioDispositivo: 'Marte/Olympus' },
        { registradoEmDispositivo: 'ontem' },
        { extra: true },
      ]) {
        await autenticado('post', usuario, `/leituras/${leituraId}/progresso`)
          .send(corpo(10, extras))
          .expect(400);
      }
    });

    it('leitura de outra pessoa é 404', async () => {
      const { leituraId } = await leituraEmAndamento();
      const intrusa = novoUsuario();
      await autenticado('post', intrusa, `/leituras/${leituraId}/progresso`)
        .send(corpo(10))
        .expect(404);
      await autenticado(
        'get',
        intrusa,
        `/leituras/${leituraId}/progresso`,
      ).expect(404);
    });

    it('leitura encerrada não recebe progresso e é listada somente para leitura', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const { progresso } = await registrar(usuario, leituraId, 20);
      await autenticado('post', usuario, `/leituras/${leituraId}/abandonar`)
        .send()
        .expect(200);

      await autenticado('post', usuario, `/leituras/${leituraId}/progresso`)
        .send(corpo(30))
        .expect(409);
      await autenticado('patch', usuario, `/progresso/${progresso.id}`)
        .send({ minutos: 5 })
        .expect(409);
      await autenticado('delete', usuario, `/progresso/${progresso.id}`)
        .send({ ultimoProgressoIdConfirmado: progresso.id })
        .expect(409);

      const lista = await autenticado(
        'get',
        usuario,
        `/leituras/${leituraId}/progresso`,
      ).expect(200);
      expect(lista.body.somenteLeitura).toBe(true);
      expect(lista.body.itens).toHaveLength(1);
    });

    it('mesma chave e corpo reproduzem a resposta; corpo diferente é 409', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const chave = randomUUID();
      const caminho = `/leituras/${leituraId}/progresso`;

      const primeira = await autenticado('post', usuario, caminho, chave)
        .send(corpo(10))
        .expect(201);
      const replay = await autenticado('post', usuario, caminho, chave)
        .send(corpo(10))
        .expect(201);
      expect(replay.body).toEqual(primeira.body);

      await autenticado('post', usuario, caminho, chave)
        .send(corpo(20))
        .expect(409);
      expect(await contar(pool, 'leitura.atualizacao_progresso')).toBe(1);
      expect(
        await contar(pool, 'leitura.outbox_leitura', 'tipo = $1', [
          TIPO_EVENTO.PROGRESSO_REGISTRADO,
        ]),
      ).toBe(1);
    });

    it('mesma chave enviada em paralelo cria um único registro', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const chave = randomUUID();
      const caminho = `/leituras/${leituraId}/progresso`;

      const respostas = await Promise.all(
        [1, 2, 3].map(() =>
          autenticado('post', usuario, caminho, chave).send(corpo(10)),
        ),
      );
      expect(respostas.map((res) => res.status)).toEqual([201, 201, 201]);
      expect(await contar(pool, 'leitura.atualizacao_progresso')).toBe(1);
    });

    it('POSTs concorrentes não partem da mesma página anterior', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const caminho = `/leituras/${leituraId}/progresso`;

      const respostas = await Promise.all(
        [1, 2, 3, 4].map(() =>
          autenticado('post', usuario, caminho).send(corpo(50)),
        ),
      );
      expect(respostas.map((res) => res.status).sort()).toEqual([
        201, 422, 422, 422,
      ]);

      const paralelas = await Promise.all(
        [60, 70, 80].map((pagina) =>
          autenticado('post', usuario, caminho).send(corpo(pagina)),
        ),
      );
      const { rows } = await pool.query<{
        ordem: number;
        pagina: number;
        paginas_lidas: number;
      }>(
        `SELECT ordem, pagina, paginas_lidas FROM leitura.atualizacao_progresso
          WHERE leitura_id = $1 ORDER BY ordem`,
        [leituraId],
      );
      const criadas = paralelas.filter((res) => res.status === 201).length;
      expect(rows).toHaveLength(1 + criadas);
      expect(rows.map((linha) => linha.ordem)).toEqual(
        rows.map((_, indice) => indice + 1),
      );
      let anterior = 0;
      for (const linha of rows) {
        expect(linha.pagina).toBeGreaterThan(anterior);
        expect(linha.paginas_lidas).toBe(linha.pagina - anterior);
        anterior = linha.pagina;
      }
      expect((await leituraNoBanco(leituraId)).pagina_atual).toBe(anterior);
    });
  });

  describe('listar', () => {
    it('pagina do mais recente ao mais antigo com teto de 50 e resumo fixo', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      await pool.query(
        `INSERT INTO leitura.atualizacao_progresso
           (leitura_id, ordem, pagina, paginas_lidas, minutos,
            registrado_em_dispositivo, fuso_horario_dispositivo, data_local,
            chave_idempotencia)
         SELECT $1, n, n, 1, 5, now(), $2, current_date, gen_random_uuid()::text
           FROM generate_series(1, 60) AS n`,
        [leituraId, FUSO],
      );
      await pool.query(
        'UPDATE leitura.leitura SET pagina_atual = 60 WHERE id = $1',
        [leituraId],
      );

      const primeira = await autenticado(
        'get',
        usuario,
        `/leituras/${leituraId}/progresso?limite=500`,
      ).expect(200);
      expect(primeira.body.paginacao).toEqual({
        page: 1,
        limite: 50,
        totalItens: 60,
        totalPaginas: 2,
      });
      expect(primeira.body.itens).toHaveLength(50);
      expect(primeira.body.itens[0].posicao).toBe(60);
      expect(primeira.body.somenteLeitura).toBe(false);

      const segunda = await autenticado(
        'get',
        usuario,
        `/leituras/${leituraId}/progresso?page=2&limite=50`,
      ).expect(200);
      expect(segunda.body.itens).toHaveLength(10);
      expect(segunda.body.resumo).toEqual(primeira.body.resumo);
      expect(segunda.body.resumo.paginaAtual).toBe(60);
      expect(segunda.body.resumo.minutosTotais).toBe(300);
    });
  });

  describe('editar o último', () => {
    it('corrige página e minutos preservando captura, fuso e data local', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      await registrar(usuario, leituraId, 40);
      const { progresso } = await registrar(usuario, leituraId, 100);
      const antes = await leituraNoBanco(leituraId);

      const res = await autenticado(
        'patch',
        usuario,
        `/progresso/${progresso.id}`,
      )
        .send({ pagina: 80, minutos: 15 })
        .expect(200);

      expect(res.body.progresso).toMatchObject({
        id: progresso.id,
        posicao: 2,
        pagina: 80,
        paginaAnterior: 40,
        paginasLidas: 40,
        minutos: 15,
        registradoEmDispositivo: progresso.registradoEmDispositivo,
        fusoHorarioDispositivo: progresso.fusoHorarioDispositivo,
        dataLocal: progresso.dataLocal,
        criadoEm: progresso.criadoEm,
      });
      expect(res.body.progresso.atualizadoEm).not.toBeNull();
      expect(res.body.resumo).toMatchObject({
        paginaAtual: 80,
        minutosTotais: 45,
      });
      expect(await leituraNoBanco(leituraId)).toEqual({
        pagina_atual: 80,
        inatividade_versao: antes.inatividade_versao + 1,
      });
      expect(
        await contar(pool, 'leitura.outbox_leitura', 'tipo = $1', [
          TIPO_EVENTO.PROGRESSO_REGISTRADO,
        ]),
      ).toBe(2);
    });

    it('recusa intermediário com 409 e página fora da faixa com 422', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const primeiro = await registrar(usuario, leituraId, 40);
      const ultimo = await registrar(usuario, leituraId, 100);

      await autenticado('patch', usuario, `/progresso/${primeiro.progresso.id}`)
        .send({ minutos: 10 })
        .expect(409);
      for (const pagina of [40, 20, TOTAL + 1]) {
        await autenticado('patch', usuario, `/progresso/${ultimo.progresso.id}`)
          .send({ pagina })
          .expect(422);
      }
      await autenticado('patch', usuario, `/progresso/${ultimo.progresso.id}`)
        .send({})
        .expect(400);
      expect((await leituraNoBanco(leituraId)).pagina_atual).toBe(100);
    });

    it('único registro aceita qualquer página a partir de 1', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const { progresso } = await registrar(usuario, leituraId, 100);

      const res = await autenticado(
        'patch',
        usuario,
        `/progresso/${progresso.id}`,
      )
        .send({ pagina: 1 })
        .expect(200);
      expect(res.body.progresso.paginasLidas).toBe(1);
    });

    it('progresso de outra pessoa é 404', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const { progresso } = await registrar(usuario, leituraId, 10);
      await autenticado('patch', novoUsuario(), `/progresso/${progresso.id}`)
        .send({ minutos: 5 })
        .expect(404);
      await autenticado('delete', novoUsuario(), `/progresso/${progresso.id}`)
        .send({ ultimoProgressoIdConfirmado: progresso.id })
        .expect(404);
    });
  });

  describe('excluir trecho final', () => {
    it('remove o registro e os posteriores de uma vez e recalcula a página', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      await registrar(usuario, leituraId, 10);
      const alvo = await registrar(usuario, leituraId, 20);
      const ultimo = await registrar(usuario, leituraId, 30);
      const antes = await leituraNoBanco(leituraId);

      const res = await autenticado(
        'delete',
        usuario,
        `/progresso/${alvo.progresso.id}`,
      )
        .send({ ultimoProgressoIdConfirmado: ultimo.progresso.id })
        .expect(200);

      expect(res.body).toEqual({
        idsRemovidos: [alvo.progresso.id, ultimo.progresso.id],
        resumo: {
          paginaAtual: 10,
          totalPaginas: TOTAL,
          percentualConcluido: (10 / TOTAL) * 100,
          minutosTotais: 30,
        },
      });
      expect(await leituraNoBanco(leituraId)).toEqual({
        pagina_atual: 10,
        inatividade_versao: antes.inatividade_versao + 1,
      });
      expect(await contar(pool, 'leitura.atualizacao_progresso')).toBe(1);
    });

    it('409 quando o último confirmado não é mais o último, sem apagar nada', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const alvo = await registrar(usuario, leituraId, 10);
      const visto = await registrar(usuario, leituraId, 20);
      await registrar(usuario, leituraId, 30);

      await autenticado('delete', usuario, `/progresso/${alvo.progresso.id}`)
        .send({ ultimoProgressoIdConfirmado: visto.progresso.id })
        .expect(409);
      expect(await contar(pool, 'leitura.atualizacao_progresso')).toBe(3);
      expect((await leituraNoBanco(leituraId)).pagina_atual).toBe(30);
    });

    it('volta à página zero quando não sobra registro', async () => {
      const { usuario, leituraId } = await leituraEmAndamento();
      const primeiro = await registrar(usuario, leituraId, 10);
      const ultimo = await registrar(usuario, leituraId, 20);

      const res = await autenticado(
        'delete',
        usuario,
        `/progresso/${primeiro.progresso.id}`,
      )
        .send({ ultimoProgressoIdConfirmado: ultimo.progresso.id })
        .expect(200);
      expect(res.body.resumo).toEqual({
        paginaAtual: 0,
        totalPaginas: TOTAL,
        percentualConcluido: 0,
        minutosTotais: 0,
      });
      expect((await leituraNoBanco(leituraId)).pagina_atual).toBe(0);

      const novo = await registrar(usuario, leituraId, 5);
      expect(novo.progresso).toMatchObject({ posicao: 1, paginasLidas: 5 });
    });
  });
});
