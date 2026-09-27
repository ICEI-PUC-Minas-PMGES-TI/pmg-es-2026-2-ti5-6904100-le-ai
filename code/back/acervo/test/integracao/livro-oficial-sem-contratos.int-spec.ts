import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { prepararBanco } from './banco';
import { inserirLivroOficial, isbn } from './massa';

/**
 * A VIEW de resenhas de `leitura` fora do ar. Arquivo próprio porque o caso
 * exige `DROP TABLE` da tabela que faz papel de VIEW no fixture, e o `limpar()`
 * dos outros arquivos faz TRUNCATE nela; o próximo `prepararBanco` recria tudo.
 */
describe('página do livro sem os contratos de leitura (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let livroId: string;
  const leitor = novoUsuario();

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
    await pool.query('DROP TABLE leitura.v_resenha_publicacao_v1');
    livroId = await inserirLivroOficial(pool, isbn('978200000001'), 'Livro');
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  it('a página abre com resenhas null', async () => {
    const resposta = await request(app.getHttpServer())
      .get(`/livros/${livroId}`)
      .set('Authorization', `Bearer ${tokenDe(leitor)}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      id: livroId,
      sinopse: { status: 'pendente', texto: null },
      resenhas: null,
    });
  });

  it('a rota de resenhas responde 503', async () => {
    const resposta = await request(app.getHttpServer())
      .get(`/livros/${livroId}/resenhas`)
      .set('Authorization', `Bearer ${tokenDe(leitor)}`);

    expect(resposta.status).toBe(503);
    expect(resposta.body.codigo).toBe('SERVICO_INDISPONIVEL');
  });
});
