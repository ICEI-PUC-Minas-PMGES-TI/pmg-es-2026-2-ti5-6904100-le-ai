import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { prepararBanco } from './banco';
import { inserirLivro, inserirPerfil } from './massa';

/**
 * VIEW da via do feed do `social` inacessível: indisponibilidade de dependência, 503 e nunca
 * 500. Arquivo próprio porque derruba a tabela que faz papel de VIEW, e o `limpar()` dos
 * outros testes faz TRUNCATE nela.
 */
describe('reação sem o contrato do social (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;

  beforeAll(async () => {
    pool = await prepararBanco();
    await pool.query('DROP TABLE social.v_atividade_livro_pessoal_v1');
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('reagir pelo feed responde 503', async () => {
    const dona = novoUsuario();
    const leitora = novoUsuario();
    await inserirPerfil(pool, { id: dona });
    await inserirPerfil(pool, { id: leitora });
    const livroId = await inserirLivro(pool, { tipo: 'pessoal', donoId: dona });
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.resenha (usuario_id, livro_id, texto)
       VALUES ($1, $2, 'Meu diário.') RETURNING id`,
      [dona, livroId],
    );

    const resposta = await request(app.getHttpServer())
      .put(`/resenhas/${rows[0].id}/reacao`)
      .set('Authorization', `Bearer ${tokenDe(leitora)}`)
      .set('Idempotency-Key', randomUUID())
      .send({ tipo: 'curtida', via: 'feed', referenciaId: randomUUID() });

    expect(resposta.status).toBe(503);
    expect(resposta.body.codigo).toBe('SERVICO_INDISPONIVEL');
  });
});
