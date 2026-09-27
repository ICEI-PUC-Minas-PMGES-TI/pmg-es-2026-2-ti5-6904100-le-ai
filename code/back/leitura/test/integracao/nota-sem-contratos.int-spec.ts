import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { prepararBanco } from './banco';

/**
 * VIEW de livro do `acervo` inacessível: indisponibilidade de dependência, 503
 * e nunca 500. Arquivo próprio porque derruba a tabela que faz papel de VIEW,
 * e o `limpar()` dos outros testes faz TRUNCATE nela.
 */
describe('nota sem o contrato do acervo (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;

  beforeAll(async () => {
    pool = await prepararBanco();
    await pool.query('DROP TABLE acervo.v_livro_referencia_v1');
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  const token = () => `Bearer ${tokenDe(novoUsuario())}`;

  it('PUT da nota responde 503', async () => {
    const resposta = await request(app.getHttpServer())
      .put(`/livros/${randomUUID()}/nota`)
      .set('Authorization', token())
      .set('Idempotency-Key', randomUUID())
      .send({ valor: 4 });

    expect(resposta.status).toBe(503);
    expect(resposta.body.codigo).toBe('SERVICO_INDISPONIVEL');
  });

  it('GET de minha-avaliacao responde 503', async () => {
    const resposta = await request(app.getHttpServer())
      .get(`/livros/${randomUUID()}/minha-avaliacao`)
      .set('Authorization', token());

    expect(resposta.status).toBe(503);
  });
});
