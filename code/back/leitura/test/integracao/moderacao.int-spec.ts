import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { SUJEITO_MODERACAO } from '../../src/moderacao/moderacao.service';
import { criarApp, novoUsuario } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro } from './massa';

const TOKEN = process.env.MODERACAO_TOKEN as string;

describe('remoção pela moderação, comando interno (F-MOD, integração)', () => {
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

  async function resenha(autor: string, livroId: string): Promise<string> {
    const {
      rows: [linha],
    } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.resenha (usuario_id, livro_id, texto)
       VALUES ($1, $2, 'Conta o final.') RETURNING id`,
      [autor, livroId],
    );
    return linha.id;
  }

  function remover(
    resenhaId: string,
    chave: string = randomUUID(),
    token: string | null = TOKEN,
  ) {
    const chamada = request(app.getHttpServer())
      .post(`/internal/moderacao/resenhas/${resenhaId}/remocao`)
      .set('Idempotency-Key', chave);
    if (token !== null) {
      chamada.set('X-Moderacao-Token', token);
    }
    return chamada.send();
  }

  it('sem o token ou com o token errado é 401, e nada sai', async () => {
    const id = await resenha(novoUsuario(), await inserirLivro(pool));

    await remover(id, randomUUID(), null).expect(401);
    await remover(id, randomUUID(), 'x'.repeat(40)).expect(401);

    expect(await contar(pool, 'leitura.resenha')).toBe(1);
  });

  it('remove a resenha de qualquer autor, leva as reações e publica resenha.excluida', async () => {
    const autor = novoUsuario();
    const livroId = await inserirLivro(pool);
    const id = await resenha(autor, livroId);
    await pool.query(
      `INSERT INTO leitura.reacao_resenha (resenha_id, usuario_id, tipo, primeira_curtida_em)
       VALUES ($1, $2, 'curtida', now())`,
      [id, novoUsuario()],
    );

    const resposta = await remover(id).expect(200);

    expect(resposta.body).toEqual({ removida: true, autorId: autor, livroId });
    expect(await contar(pool, 'leitura.resenha')).toBe(0);
    expect(await contar(pool, 'leitura.reacao_resenha')).toBe(0);
    expect(
      await contar(
        pool,
        'leitura.outbox_leitura',
        `tipo = 'resenha.excluida' AND payload->>'resenhaId' = $1 AND payload->>'usuarioId' = $2`,
        [id, autor],
      ),
    ).toBe(1);
  });

  it('a mesma chave depois de um timeout repete removida: true, sem outro evento', async () => {
    const autor = novoUsuario();
    const livroId = await inserirLivro(pool);
    const id = await resenha(autor, livroId);
    const chave = randomUUID();

    const primeira = await remover(id, chave).expect(200);
    const repeticao = await remover(id, chave).expect(200);

    expect(repeticao.body).toEqual(primeira.body);
    expect(repeticao.body).toMatchObject({ removida: true });
    expect(
      await contar(pool, 'leitura.outbox_leitura', `tipo = 'resenha.excluida'`),
    ).toBe(1);
    expect(
      await contar(
        pool,
        'leitura.idempotencia_leitura',
        `subject_ref = $1 AND operacao = $2`,
        [SUJEITO_MODERACAO, `removerResenhaPelaModeracao:${id}`],
      ),
    ).toBe(1);
  });

  it('resenha que já não existe responde removida: false, sem evento', async () => {
    const resposta = await remover(randomUUID()).expect(200);

    expect(resposta.body).toEqual({
      removida: false,
      autorId: null,
      livroId: null,
    });
    expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
  });

  it('remove a frase de qualquer autor pela moderação, com replay pela mesma chave', async () => {
    const autor = novoUsuario();
    const livroId = await inserirLivro(pool);
    const {
      rows: [linha],
    } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.frase (usuario_id, livro_id, texto, pagina)
       VALUES ($1, $2, 'Trecho.', 1) RETURNING id`,
      [autor, livroId],
    );
    const chave = randomUUID();
    const remover = () =>
      request(app.getHttpServer())
        .post(`/internal/moderacao/frases/${linha.id}/remocao`)
        .set('X-Moderacao-Token', TOKEN)
        .set('Idempotency-Key', chave)
        .send();

    const primeira = await remover().expect(200);
    const repeticao = await remover().expect(200);

    expect(primeira.body).toEqual({ removida: true, autorId: autor, livroId });
    expect(repeticao.body).toEqual(primeira.body);
    expect(await contar(pool, 'leitura.frase')).toBe(0);
    await request(app.getHttpServer())
      .post(`/internal/moderacao/frases/${linha.id}/remocao`)
      .send()
      .expect(401);
  });

  // L-30 (E6-02): o `social` manda chave fixa por alvo. Dentro de 24 h ela
  // repete a resposta; depois, o recibo vence e a mesma chave é 409, sem
  // reexecutar a remoção nem publicar outro evento (feature-F-MOD.md).
  it.each([
    ['frase', 'frases', 'removerFrasePelaModeracao', 0],
    ['resenha', 'resenhas', 'removerResenhaPelaModeracao', 1],
  ])(
    'depois da janela de 24 h, a mesma chave fixa da %s é conflito e nada muda',
    async (_alvo, rota, operacao, eventosEsperados) => {
      const autor = novoUsuario();
      const livroId = await inserirLivro(pool);
      const id =
        rota === 'resenhas'
          ? await resenha(autor, livroId)
          : (
              await pool.query<{ id: string }>(
                `INSERT INTO leitura.frase (usuario_id, livro_id, texto, pagina)
                 VALUES ($1, $2, 'Trecho.', 1) RETURNING id`,
                [autor, livroId],
              )
            ).rows[0].id;
      const chave = randomUUID();
      const removerComAChaveFixa = () =>
        request(app.getHttpServer())
          .post(`/internal/moderacao/${rota}/${id}/remocao`)
          .set('X-Moderacao-Token', TOKEN)
          .set('Idempotency-Key', chave)
          .send();
      const recibo = async () =>
        (
          await pool.query(
            `SELECT status_http, resposta, replay_ate
               FROM leitura.idempotencia_leitura
              WHERE subject_ref = $1 AND operacao = $2`,
            [SUJEITO_MODERACAO, `${operacao}:${id}`],
          )
        ).rows;

      const primeira = await removerComAChaveFixa().expect(200);
      expect(primeira.body).toEqual({
        removida: true,
        autorId: autor,
        livroId,
      });
      await removerComAChaveFixa().expect(200);
      // O recibo "envelhece" 25 h; o CHECK exige replay_ate >= criado_em.
      await pool.query(
        `UPDATE leitura.idempotencia_leitura
            SET criado_em = criado_em - interval '25 hours',
                replay_ate = replay_ate - interval '25 hours'
          WHERE subject_ref = $1 AND operacao = $2`,
        [SUJEITO_MODERACAO, `${operacao}:${id}`],
      );
      const vencido = await recibo();

      const depois = await removerComAChaveFixa();

      expect(depois.status).toBe(409);
      expect(depois.body.codigo).toBe('CHAVE_IDEMPOTENCIA_CONFLITANTE');
      expect(await recibo()).toEqual(vencido);
      expect(vencido).toHaveLength(1);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(
        eventosEsperados,
      );
    },
  );

  it('id inválido é 400 e falta de chave é 400', async () => {
    await remover('nao-e-uuid').expect(400);
    await request(app.getHttpServer())
      .post(`/internal/moderacao/resenhas/${randomUUID()}/remocao`)
      .set('X-Moderacao-Token', TOKEN)
      .send()
      .expect(400);
  });
});
