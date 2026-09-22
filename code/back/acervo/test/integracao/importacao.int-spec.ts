import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivroOficial, isbn } from './massa';

/**
 * `POST /livros/oficial` contra Postgres real: o que os testes unitários não
 * conseguem provar é a transação — solicitação, outbox e recibo de
 * idempotência entram juntos ou não entram.
 */
describe('importação por ISBN (integração)', () => {
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

  const solicitar = (usuario: string, chave: string, corpo: object) =>
    request(app.getHttpServer())
      .post('/livros/oficial')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', chave)
      .send(corpo);

  it('grava solicitação e outbox canônica na mesma transação e responde 202', async () => {
    const usuario = novoUsuario();
    const alvo = isbn('978853591484');

    const resposta = await solicitar(usuario, randomUUID(), { isbn: alvo });

    expect(resposta.status).toBe(202);
    const { importacaoId } = resposta.body as { importacaoId: string };
    expect(resposta.headers.location).toBe(
      `/livros/importacoes/${importacaoId}`,
    );

    const { rows: importacoes } = await pool.query(
      'SELECT estado, solicitante_id, isbn13 FROM acervo.importacao_livro',
    );
    expect(importacoes).toEqual([
      { estado: 'pendente', solicitante_id: usuario, isbn13: alvo },
    ]);

    const { rows: outbox } = await pool.query(
      'SELECT tipo, versao, chave_negocio, payload, status FROM acervo.outbox_acervo',
    );
    expect(outbox).toEqual([
      {
        tipo: 'livro.importacao_solicitada',
        versao: 1,
        chave_negocio: `importacao:${importacaoId}`,
        payload: { importacaoId, solicitanteId: usuario, isbn13: alvo },
        status: 'pendente',
      },
    ]);
  });

  it('falha na outbox desfaz a solicitação e o recibo de idempotência', async () => {
    await pool.query(`
      CREATE FUNCTION acervo.falhar_outbox() RETURNS trigger
        LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'outbox indisponível'; END $$;
      CREATE TRIGGER falhar_outbox BEFORE INSERT ON acervo.outbox_acervo
        FOR EACH ROW EXECUTE FUNCTION acervo.falhar_outbox();
    `);
    try {
      const resposta = await solicitar(novoUsuario(), randomUUID(), {
        isbn: isbn('978853591484'),
      });

      expect(resposta.status).toBeGreaterThanOrEqual(500);
      expect(await contar(pool, 'acervo.importacao_livro')).toBe(0);
      expect(await contar(pool, 'acervo.idempotencia_acervo')).toBe(0);
    } finally {
      await pool.query(`
        DROP TRIGGER falhar_outbox ON acervo.outbox_acervo;
        DROP FUNCTION acervo.falhar_outbox();
      `);
    }
  });

  it('replay da mesma chave devolve a mesma solicitação sem nova outbox', async () => {
    const usuario = novoUsuario();
    const chave = randomUUID();
    const corpo = { isbn: isbn('978853591484') };

    const primeira = await solicitar(usuario, chave, corpo);
    const segunda = await solicitar(usuario, chave, corpo);

    expect(segunda.status).toBe(202);
    expect(segunda.body).toEqual(primeira.body);
    expect(await contar(pool, 'acervo.importacao_livro')).toBe(1);
    expect(await contar(pool, 'acervo.outbox_acervo')).toBe(1);
  });

  it('mesma chave com outro corpo é conflito', async () => {
    const usuario = novoUsuario();
    const chave = randomUUID();

    await solicitar(usuario, chave, { isbn: isbn('978853591484') });
    const conflito = await solicitar(usuario, chave, {
      isbn: isbn('978857164411'),
    });

    expect(conflito.status).toBe(409);
    expect(await contar(pool, 'acervo.importacao_livro')).toBe(1);
  });

  it('corrida de duas requisições com a mesma chave cria uma solicitação só', async () => {
    const usuario = novoUsuario();
    const chave = randomUUID();
    const corpo = { isbn: isbn('978853591484') };

    const respostas = await Promise.all([
      solicitar(usuario, chave, corpo),
      solicitar(usuario, chave, corpo),
      solicitar(usuario, chave, corpo),
    ]);

    const sucesso = respostas.filter((r) => r.status === 202);
    expect(sucesso.length).toBeGreaterThanOrEqual(1);
    const ids = new Set(
      sucesso.map((r) => (r.body as { importacaoId: string }).importacaoId),
    );
    expect(ids.size).toBe(1);
    // Quem perde a corrida no índice único do recibo nunca vira 500: ou
    // devolve a mesma resposta, ou pede para repetir.
    for (const r of respostas) expect([202, 409]).toContain(r.status);
    expect(await contar(pool, 'acervo.importacao_livro')).toBe(1);
    expect(await contar(pool, 'acervo.outbox_acervo')).toBe(1);
  });

  it('ISBN já cadastrado responde 409 com o livroId existente (RF-ACV-07)', async () => {
    const alvo = isbn('978853591484');
    const livroId = await inserirLivroOficial(pool, alvo);

    const resposta = await solicitar(novoUsuario(), randomUUID(), {
      isbn: alvo,
    });

    expect(resposta.status).toBe(409);
    expect(resposta.body).toMatchObject({ livroId });
    expect(await contar(pool, 'acervo.outbox_acervo')).toBe(0);
  });

  it('só o solicitante consulta a importação', async () => {
    const dono = novoUsuario();
    const criada = await solicitar(dono, randomUUID(), {
      isbn: isbn('978853591484'),
    });
    const id = (criada.body as { importacaoId: string }).importacaoId;
    const consultar = (usuario: string, alvo = id) =>
      request(app.getHttpServer())
        .get(`/livros/importacoes/${alvo}`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    const propria = await consultar(dono);
    expect(propria.status).toBe(200);
    expect(propria.body).toMatchObject({
      importacaoId: id,
      status: 'pendente',
      permiteCadastroPessoal: false,
    });
    expect((await consultar(novoUsuario())).status).toBe(403);
    expect((await consultar(dono, randomUUID())).status).toBe(404);
  });

  it('replay de reprocessar com a mesma chave devolve o mesmo 202', async () => {
    const usuario = novoUsuario();
    const criada = await solicitar(usuario, randomUUID(), {
      isbn: isbn('978853591484'),
    });
    const id = (criada.body as { importacaoId: string }).importacaoId;
    await pool.query(
      `UPDATE acervo.importacao_livro
          SET estado = 'falha_transitoria', erro = 'openlibrary: timeout'
        WHERE id = $1`,
      [id],
    );
    const chave = randomUUID();
    const reprocessar = () =>
      request(app.getHttpServer())
        .post(`/livros/importacoes/${id}/reprocessar`)
        .set('Authorization', `Bearer ${tokenDe(usuario)}`)
        .set('Idempotency-Key', chave);

    const primeira = await reprocessar();
    const segunda = await reprocessar();

    expect(primeira.status).toBe(202);
    expect(segunda.status).toBe(202);
    expect(segunda.body).toEqual(primeira.body);
    // A solicitação original e um único reprocessamento.
    expect(await contar(pool, 'acervo.outbox_acervo')).toBe(2);
  });

  it('a máquina de estados da importação é garantida pelo banco', async () => {
    const criada = await solicitar(novoUsuario(), randomUUID(), {
      isbn: isbn('978853591484'),
    });
    const id = (criada.body as { importacaoId: string }).importacaoId;

    // `concluida` sem livro e `falha_transitoria` sem erro violam o CHECK.
    await expect(
      pool.query(
        `UPDATE acervo.importacao_livro SET estado = 'concluida' WHERE id = $1`,
        [id],
      ),
    ).rejects.toThrow(/importacao_livro_resultado_ck/);
    await expect(
      pool.query(
        `UPDATE acervo.importacao_livro SET estado = 'falha_transitoria' WHERE id = $1`,
        [id],
      ),
    ).rejects.toThrow(/importacao_livro_resultado_ck/);
    await expect(
      pool.query(
        `UPDATE acervo.importacao_livro SET estado = 'desconhecido' WHERE id = $1`,
        [id],
      ),
    ).rejects.toThrow(/importacao_livro_estado_ck/);
  });
});
