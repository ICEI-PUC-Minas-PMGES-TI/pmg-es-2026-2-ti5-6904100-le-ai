import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';

const CAPA =
  'https://res.cloudinary.com/leai/image/upload/v1726000000/capas/abc123.jpg';

/**
 * Livro pessoal contra Postgres real: CRUD do dono, CHECKs do banco e a
 * autorização RN-15 de terceiro com massa nas VIEWs externas.
 */
describe('livro pessoal (integração)', () => {
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

  const http = () => request(app.getHttpServer());
  const como = (usuario: string) => ({
    Authorization: `Bearer ${tokenDe(usuario)}`,
    'Idempotency-Key': randomUUID(),
  });

  async function criar(dono: string, corpo: object = {}) {
    const resposta = await http()
      .post('/livros/pessoal')
      .set(como(dono))
      .send({
        titulo: 'Diário de bordo',
        autor: 'Ana Leitora',
        paginas: 120,
        ...corpo,
      });
    expect(resposta.status).toBe(201);
    return resposta.body as { id: string };
  }

  /** Atividade ativa no feed + seguimento aceito: a via RN-15 completa. */
  async function publicarNoFeed(
    dono: string,
    livroId: string,
    seguidor?: string,
    privacidade: 'publico' | 'privado' = 'publico',
  ) {
    const atividadeId = randomUUID();
    await pool.query(
      `INSERT INTO social.v_atividade_livro_pessoal_v1 VALUES ($1, $2, $3)`,
      [atividadeId, dono, livroId],
    );
    await pool.query(
      `INSERT INTO identidade.v_perfil_referencia_v1
       VALUES ($1, 'ana', 'Ana Leitora', NULL, $2, false)`,
      [dono, privacidade],
    );
    if (seguidor) {
      await pool.query(
        `INSERT INTO identidade.v_seguimento_aceito_v1 VALUES ($1, $2)`,
        [seguidor, dono],
      );
    }
    return atividadeId;
  }

  /** Livro em lista ativa do dono + perfil do dono: a via RN-15 da lista. */
  async function publicarEmLista(
    dono: string,
    livroId: string,
    privacidade: 'publico' | 'privado' = 'publico',
    seguidor?: string,
  ) {
    const listaId = randomUUID();
    await pool.query(
      `INSERT INTO social.v_lista_livro_pessoal_v1 VALUES ($1, $2, $3)`,
      [listaId, dono, livroId],
    );
    await pool.query(
      `INSERT INTO identidade.v_perfil_referencia_v1
       VALUES ($1, 'ana', 'Ana Leitora', NULL, $2, false)`,
      [dono, privacidade],
    );
    if (seguidor) {
      await pool.query(
        `INSERT INTO identidade.v_seguimento_aceito_v1 VALUES ($1, $2)`,
        [seguidor, dono],
      );
    }
    return listaId;
  }

  it('cria sem ISBN, com capa do Cloudinary, e o dono abre em modo edição', async () => {
    const dono = novoUsuario();
    const { id } = await criar(dono, { sinopse: 'Anotações.', capaUrl: CAPA });

    const { rows } = await pool.query(
      `SELECT tipo, isbn13, dono_id, autor_informado, capa_url_propria, capa_asset_id,
              sinopse_status
         FROM acervo.livro WHERE id = $1`,
      [id],
    );
    expect(rows).toEqual([
      {
        tipo: 'pessoal',
        isbn13: null,
        dono_id: dono,
        autor_informado: 'Ana Leitora',
        capa_url_propria: CAPA,
        capa_asset_id: 'capas/abc123',
        sinopse_status: 'disponivel',
      },
    ]);

    const pagina = await http().get(`/livros/pessoal/${id}`).set(como(dono));
    expect(pagina.status).toBe(200);
    expect(pagina.body).toMatchObject({
      id,
      tipo: 'pessoal',
      donoId: dono,
      modoConsulta: false,
      notaDoDono: null,
      resenhaDoDono: null,
    });
  });

  it('recusa capa fora do Cloudinary do projeto', async () => {
    const resposta = await http()
      .post('/livros/pessoal')
      .set(como(novoUsuario()))
      .send({
        titulo: 'x',
        autor: 'y',
        paginas: 1,
        capaUrl: 'https://res.cloudinary.com/outro/image/upload/v1/a.jpg',
      });
    expect(resposta.status).toBe(400);
    expect(await contar(pool, 'acervo.livro')).toBe(0);
  });

  it('o banco recusa livro pessoal com ISBN ou sem dono', async () => {
    await expect(
      pool.query(
        `INSERT INTO acervo.livro (titulo, paginas, tipo, dono_id, autor_informado, isbn13, sinopse_status)
         VALUES ('x', 1, 'pessoal', $1, 'y', '9788535914849', 'ausente')`,
        [novoUsuario()],
      ),
    ).rejects.toThrow(/livro_oficial_pessoal_ck/);
    await expect(
      pool.query(
        `INSERT INTO acervo.livro (titulo, paginas, tipo, autor_informado, sinopse_status)
         VALUES ('x', 1, 'pessoal', 'y', 'ausente')`,
      ),
    ).rejects.toThrow(/livro_oficial_pessoal_ck/);
  });

  it('livro pessoal fica fora do contrato de recomendação e do catálogo', async () => {
    const { id } = await criar(novoUsuario());

    expect(
      await contar(pool, 'acervo.v_livro_recomendacao_v1', 'livro_id = $1', [
        id,
      ]),
    ).toBe(0);
    expect(
      await contar(
        pool,
        'acervo.v_livro_referencia_v1',
        "livro_id = $1 AND tipo = 'pessoal'",
        [id],
      ),
    ).toBe(1);
  });

  it('editar e excluir são exclusivos do dono', async () => {
    const dono = novoUsuario();
    const outro = novoUsuario();
    const { id } = await criar(dono);

    const editarOutro = await http()
      .patch(`/livros/pessoal/${id}`)
      .set(como(outro))
      .send({ titulo: 'Invadido' });
    expect(editarOutro.status).toBe(403);
    const excluirOutro = await http()
      .delete(`/livros/pessoal/${id}`)
      .set(como(outro));
    expect(excluirOutro.status).toBe(403);

    const editar = await http()
      .patch(`/livros/pessoal/${id}`)
      .set(como(dono))
      .send({ titulo: 'Diário revisto' });
    expect(editar.status).toBe(200);
    expect(editar.body).toMatchObject({ titulo: 'Diário revisto' });
  });

  it('excluir invalida a página para todos e o contrato marca inativo', async () => {
    const dono = novoUsuario();
    const seguidor = novoUsuario();
    const { id } = await criar(dono);
    const atividade = await publicarNoFeed(dono, id, seguidor);

    const excluir = await http()
      .delete(`/livros/pessoal/${id}`)
      .set(como(dono));
    expect(excluir.status).toBe(204);

    expect(
      (await http().get(`/livros/pessoal/${id}`).set(como(dono))).status,
    ).toBe(404);
    expect(
      (
        await http()
          .get(`/livros/pessoal/${id}?via=feed&referenciaId=${atividade}`)
          .set(como(seguidor))
      ).status,
    ).toBe(404);
    const { rows } = await pool.query(
      'SELECT ativo FROM acervo.v_livro_referencia_v1 WHERE livro_id = $1',
      [id],
    );
    expect(rows).toEqual([{ ativo: false }]);
  });

  it('replay de exclusão com a mesma chave não falha nem repete efeito', async () => {
    const dono = novoUsuario();
    const { id } = await criar(dono);
    const cabecalhos = como(dono);

    const primeira = await http()
      .delete(`/livros/pessoal/${id}`)
      .set(cabecalhos);
    const segunda = await http()
      .delete(`/livros/pessoal/${id}`)
      .set(cabecalhos);

    expect(primeira.status).toBe(204);
    expect(segunda.status).toBe(204);
  });

  /**
   * Renomeia uma VIEW externa durante `corpo` e devolve o nome no `finally`:
   * `limpar()` trunca pelo nome original, e um teste que falhe no meio não pode
   * quebrar os seguintes. O efeito é o mesmo da VIEW ainda não criada: 42P01.
   */
  async function semRelacao(tabela: string, corpo: () => Promise<void>) {
    const [schema, nome] = tabela.split('.');
    await pool.query(`ALTER TABLE ${tabela} RENAME TO ${nome}_fora`);
    try {
      await corpo();
    } finally {
      await pool.query(`ALTER TABLE ${schema}.${nome}_fora RENAME TO ${nome}`);
    }
  }

  it('dono abre a página com nota nula quando a VIEW de nota falha (degrada, não derruba)', async () => {
    const dono = novoUsuario();
    const { id } = await criar(dono);
    await pool.query(
      `INSERT INTO leitura.v_nota_publicacao_v1 VALUES ($1, $2, 4.5)`,
      [dono, id],
    );

    await semRelacao('leitura.v_nota_publicacao_v1', async () => {
      const pagina = await http().get(`/livros/pessoal/${id}`).set(como(dono));

      expect(pagina.status).toBe(200);
      expect(pagina.body).toMatchObject({
        id,
        modoConsulta: false,
        notaDoDono: null,
      });
    });
  });

  describe('terceiro (RN-15)', () => {
    it('seguidor com atividade válida do feed abre em modo consulta, com nota e resenha do dono', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      const atividade = await publicarNoFeed(dono, id, seguidor);
      await pool.query(
        `INSERT INTO leitura.v_nota_publicacao_v1 VALUES ($1, $2, 4.5)`,
        [dono, id],
      );
      await pool.query(
        `INSERT INTO leitura.v_resenha_publicacao_v1
         VALUES ($1, $2, $3, 'Muito bom.', false, now(), now(), 3, 0)`,
        [randomUUID(), dono, id],
      );

      const pagina = await http()
        .get(`/livros/pessoal/${id}?via=feed&referenciaId=${atividade}`)
        .set(como(seguidor));

      expect(pagina.status).toBe(200);
      expect(pagina.body).toMatchObject({
        modoConsulta: true,
        notaDoDono: { valor: 4.5 },
        resenhaDoDono: { texto: 'Muito bom.', autorNome: 'Ana Leitora' },
        dono: { nome: 'Ana Leitora', avatarUrl: null },
      });
    });

    it('sem nota nem resenha, o terceiro ainda sabe de quem é o livro', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      const atividade = await publicarNoFeed(dono, id, seguidor);

      const pagina = await http()
        .get(`/livros/pessoal/${id}?via=feed&referenciaId=${atividade}`)
        .set(como(seguidor));

      expect(pagina.status).toBe(200);
      expect(pagina.body).toMatchObject({
        modoConsulta: true,
        notaDoDono: null,
        resenhaDoDono: null,
        dono: { nome: 'Ana Leitora', avatarUrl: null },
      });
    });

    it('sem via, conhecer o id não concede acesso', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      await publicarNoFeed(dono, id, seguidor);

      const pagina = await http()
        .get(`/livros/pessoal/${id}`)
        .set(como(seguidor));
      expect(pagina.status).toBe(403);
    });

    it('não seguidor é negado mesmo com perfil público e atividade válida', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const atividade = await publicarNoFeed(dono, id);

      const pagina = await http()
        .get(`/livros/pessoal/${id}?via=feed&referenciaId=${atividade}`)
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(403);
    });

    it('atividade de outro livro do mesmo dono não serve de referência', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      const { id: outroLivro } = await criar(dono, { titulo: 'Outro' });
      const atividadeDoOutro = await publicarNoFeed(dono, outroLivro, seguidor);

      const pagina = await http()
        .get(`/livros/pessoal/${id}?via=feed&referenciaId=${atividadeDoOutro}`)
        .set(como(seguidor));
      expect(pagina.status).toBe(403);
    });

    it('seguidor aceito de perfil privado abre em modo consulta', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      const atividade = await publicarNoFeed(dono, id, seguidor, 'privado');

      const pagina = await http()
        .get(`/livros/pessoal/${id}?via=feed&referenciaId=${atividade}`)
        .set(como(seguidor));
      expect(pagina.status).toBe(200);
      expect(pagina.body).toMatchObject({ id, modoConsulta: true });
    });

    it('não seguidor de perfil privado é negado', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const atividade = await publicarNoFeed(dono, id, undefined, 'privado');

      const pagina = await http()
        .get(`/livros/pessoal/${id}?via=feed&referenciaId=${atividade}`)
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(403);
    });

    it('VIEW de seguimento indisponível responde 503, nunca 500 nem 403', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      const atividade = await publicarNoFeed(dono, id, seguidor);

      await semRelacao('identidade.v_seguimento_aceito_v1', async () => {
        const pagina = await http()
          .get(`/livros/pessoal/${id}?via=feed&referenciaId=${atividade}`)
          .set(como(seguidor));

        expect(pagina.status).toBe(503);
        expect(pagina.body).toMatchObject({ codigo: 'SERVICO_INDISPONIVEL' });
      });
    });

    it('referência forjada é negada', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      await publicarNoFeed(dono, id, seguidor);

      const pagina = await http()
        .get(`/livros/pessoal/${id}?via=feed&referenciaId=${randomUUID()}`)
        .set(como(seguidor));
      expect(pagina.status).toBe(403);
    });

    it('via desconhecida é pedido malformado', async () => {
      const { id } = await criar(novoUsuario());

      const pagina = await http()
        .get(`/livros/pessoal/${id}?via=busca&referenciaId=${randomUUID()}`)
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(400);
    });
  });

  describe('terceiro pela lista do dono (RN-15, RN-08)', () => {
    const pelaLista = (id: string, listaId: string) =>
      `/livros/pessoal/${id}?via=lista&referenciaId=${listaId}`;

    it('perfil público libera qualquer leitor, sem exigir seguimento', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const lista = await publicarEmLista(dono, id);

      const pagina = await http()
        .get(pelaLista(id, lista))
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(200);
      expect(pagina.body).toMatchObject({
        id,
        modoConsulta: true,
        dono: { nome: 'Ana Leitora' },
      });
    });

    it('seguidor aceito de perfil privado abre em modo consulta', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      const lista = await publicarEmLista(dono, id, 'privado', seguidor);

      const pagina = await http().get(pelaLista(id, lista)).set(como(seguidor));
      expect(pagina.status).toBe(200);
      expect(pagina.body).toMatchObject({ id, modoConsulta: true });
    });

    it('não seguidor de perfil privado é negado', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const lista = await publicarEmLista(dono, id, 'privado');

      const pagina = await http()
        .get(pelaLista(id, lista))
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(403);
    });

    it('lista que contém outro livro do mesmo dono não serve de referência', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const { id: outroLivro } = await criar(dono, { titulo: 'Outro' });
      const listaDoOutro = await publicarEmLista(dono, outroLivro);

      const pagina = await http()
        .get(pelaLista(id, listaDoOutro))
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(403);
    });

    it('lista de outra pessoa com o livro não serve de referência', async () => {
      const dono = novoUsuario();
      const outraPessoa = novoUsuario();
      const { id } = await criar(dono);
      await pool.query(
        `INSERT INTO identidade.v_perfil_referencia_v1
         VALUES ($1, 'ana', 'Ana Leitora', NULL, 'publico', false)`,
        [dono],
      );
      const listaAlheia = randomUUID();
      await pool.query(
        `INSERT INTO social.v_lista_livro_pessoal_v1 VALUES ($1, $2, $3)`,
        [listaAlheia, outraPessoa, id],
      );

      const pagina = await http()
        .get(pelaLista(id, listaAlheia))
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(403);
    });

    it('referência forjada é negada', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      await publicarEmLista(dono, id);

      const pagina = await http()
        .get(pelaLista(id, randomUUID()))
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(403);
    });

    it('id de atividade do feed não vale como lista, nem o inverso', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { id } = await criar(dono);
      const atividade = await publicarNoFeed(dono, id, seguidor);
      const lista = randomUUID();
      await pool.query(
        `INSERT INTO social.v_lista_livro_pessoal_v1 VALUES ($1, $2, $3)`,
        [lista, dono, id],
      );

      expect(
        (await http().get(pelaLista(id, atividade)).set(como(seguidor))).status,
      ).toBe(403);
      expect(
        (
          await http()
            .get(`/livros/pessoal/${id}?via=feed&referenciaId=${lista}`)
            .set(como(seguidor))
        ).status,
      ).toBe(403);
    });

    it('lista excluída ou livro retirado corta o acesso na hora (RN-15.6)', async () => {
      const dono = novoUsuario();
      const leitor = novoUsuario();
      const { id } = await criar(dono);
      const lista = await publicarEmLista(dono, id);

      expect(
        (await http().get(pelaLista(id, lista)).set(como(leitor))).status,
      ).toBe(200);

      // A VIEW de `social` só expõe itens de listas ativas: excluir a lista ou
      // retirar o livro tira a linha dela.
      await pool.query(
        'DELETE FROM social.v_lista_livro_pessoal_v1 WHERE lista_id = $1',
        [lista],
      );

      expect(
        (await http().get(pelaLista(id, lista)).set(como(leitor))).status,
      ).toBe(403);
    });

    it('dono suspenso ou em exclusão não libera, mesmo com lista válida', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const lista = await publicarEmLista(dono, id);
      await pool.query(
        'DELETE FROM identidade.v_perfil_referencia_v1 WHERE id = $1',
        [dono],
      );

      const pagina = await http()
        .get(pelaLista(id, lista))
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(403);
    });

    it('livro excluído é 404 também pela lista', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const lista = await publicarEmLista(dono, id);
      await http().delete(`/livros/pessoal/${id}`).set(como(dono));

      const pagina = await http()
        .get(pelaLista(id, lista))
        .set(como(novoUsuario()));
      expect(pagina.status).toBe(404);
    });

    it('o dono abre o próprio livro com via=lista em modo edição', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const lista = await publicarEmLista(dono, id);

      const pagina = await http().get(pelaLista(id, lista)).set(como(dono));
      expect(pagina.status).toBe(200);
      expect(pagina.body).toMatchObject({ id, modoConsulta: false });
    });

    it('a via da lista não libera escrita a terceiro (RN-15.3)', async () => {
      const dono = novoUsuario();
      const leitor = novoUsuario();
      const { id } = await criar(dono);
      await publicarEmLista(dono, id);

      const editar = await http()
        .patch(`/livros/pessoal/${id}`)
        .set(como(leitor))
        .send({ titulo: 'Invadido' });
      expect(editar.status).toBe(403);
    });

    it('VIEW de listas indisponível responde 503, nunca 500 nem 403', async () => {
      const dono = novoUsuario();
      const { id } = await criar(dono);
      const lista = await publicarEmLista(dono, id);

      await semRelacao('social.v_lista_livro_pessoal_v1', async () => {
        const pagina = await http()
          .get(pelaLista(id, lista))
          .set(como(novoUsuario()));

        expect(pagina.status).toBe(503);
        expect(pagina.body).toMatchObject({ codigo: 'SERVICO_INDISPONIVEL' });
      });
    });
  });
});
