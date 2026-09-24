import { drizzle } from 'drizzle-orm/node-postgres';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { SEED_ACERVO, semear } from '../../src/db/seed';
import { criarApp, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';

/** O seed de RNF-TST-08 roda sem violar CHECK, é idempotente e serve a RN-15. */
describe('seed de acervo (integração)', () => {
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

  it('rodar duas vezes não duplica nada', async () => {
    await semear(drizzle(pool));
    await semear(drizzle(pool));

    expect(await contar(pool, 'acervo.livro', "tipo = 'oficial'")).toBe(3);
    expect(await contar(pool, 'acervo.livro', "tipo = 'pessoal'")).toBe(3);
    expect(await contar(pool, 'acervo.livro', 'NOT ativo')).toBe(1);
    expect(await contar(pool, 'acervo.autor')).toBe(2);
    expect(await contar(pool, 'acervo.livro_autor')).toBe(3);
  });

  it('as referências fixas cobrem acesso válido, forjado e livro excluído', async () => {
    await semear(drizzle(pool));
    // O que o seed de F-FEED e o de F-PERFIL gravam do lado deles.
    await pool.query(
      'INSERT INTO social.v_atividade_livro_pessoal_v1 VALUES ($1, $2, $3)',
      [
        SEED_ACERVO.atividadeValida,
        SEED_ACERVO.dono,
        SEED_ACERVO.livroPessoalNoFeed,
      ],
    );
    await pool.query(
      `INSERT INTO identidade.v_perfil_referencia_v1
       VALUES ($1, 'ana', 'Ana Leitora', NULL, 'publico', false)`,
      [SEED_ACERVO.dono],
    );
    await pool.query(
      'INSERT INTO identidade.v_seguimento_aceito_v1 VALUES ($1, $2)',
      [SEED_ACERVO.seguidor, SEED_ACERVO.dono],
    );
    const abrir = (usuario: string, livro: string, referencia: string) =>
      request(app.getHttpServer())
        .get(`/livros/pessoal/${livro}?via=feed&referenciaId=${referencia}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    const valida = await abrir(
      SEED_ACERVO.seguidor,
      SEED_ACERVO.livroPessoalNoFeed,
      SEED_ACERVO.atividadeValida,
    );
    expect(valida.status).toBe(200);
    expect(valida.body).toMatchObject({ modoConsulta: true });

    const forjada = await abrir(
      SEED_ACERVO.seguidor,
      SEED_ACERVO.livroPessoalNoFeed,
      SEED_ACERVO.atividadeForjada,
    );
    expect(forjada.status).toBe(403);

    const naoSeguidor = await abrir(
      SEED_ACERVO.naoSeguidor,
      SEED_ACERVO.livroPessoalNoFeed,
      SEED_ACERVO.atividadeValida,
    );
    expect(naoSeguidor.status).toBe(403);

    const excluido = await abrir(
      SEED_ACERVO.dono,
      SEED_ACERVO.livroPessoalExcluido,
      SEED_ACERVO.atividadeValida,
    );
    expect(excluido.status).toBe(404);
  });
});
