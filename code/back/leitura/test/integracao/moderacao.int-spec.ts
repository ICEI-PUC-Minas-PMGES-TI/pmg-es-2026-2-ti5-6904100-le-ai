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

  it('id inválido é 400 e falta de chave é 400', async () => {
    await remover('nao-e-uuid').expect(400);
    await request(app.getHttpServer())
      .post(`/internal/moderacao/resenhas/${randomUUID()}/remocao`)
      .set('X-Moderacao-Token', TOKEN)
      .send()
      .expect(400);
  });
});
