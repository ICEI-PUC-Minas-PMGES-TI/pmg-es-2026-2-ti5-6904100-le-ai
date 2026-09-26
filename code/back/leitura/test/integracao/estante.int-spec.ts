import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil, inserirSeguimentoAceito } from './massa';

/**
 * Estante (F-EST, fatias B e B2) pela API, contra Postgres real: RN-04 na
 * adição/remoção, SEC-07, idempotência, outbox, paginação e RN-08 no perfil.
 */
describe('estante (integração)', () => {
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

  function adicionar(usuarioId: string, livroId: string, chave = randomUUID()) {
    return http()
      .post('/estante')
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`)
      .set('Idempotency-Key', chave)
      .send({ livroId });
  }

  function remover(usuarioId: string, livroId: string, chave = randomUUID()) {
    return http()
      .delete(`/estante/${livroId}`)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`)
      .set('Idempotency-Key', chave);
  }

  function consultar(usuarioId: string, caminho: string) {
    return http()
      .get(caminho)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`);
  }

  /** Vínculo direto no banco, com status e data de adição controlados. */
  async function inserirVinculo(
    usuarioId: string,
    livroId: string,
    status = 'quero_ler',
    adicionadoEm = new Date(),
    vezesLido = 0,
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.estante (usuario_id, livro_id, status, vezes_lido, adicionado_em)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [usuarioId, livroId, status, vezesLido, adicionadoEm],
    );
    return rows[0].id;
  }

  /** Ocorrência de leitura: em andamento ou abandonada (primeira leitura). */
  async function inserirLeitura(
    estanteId: string,
    usuarioId: string,
    livroId: string,
    status: 'lendo' | 'abandonado',
    paginaAtual = 0,
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.leitura
         (estante_id, usuario_id, livro_id, status, data_inicio, pagina_atual, ultima_atividade_em)
       VALUES ($1, $2, $3, $4, current_date, $5, now()) RETURNING id`,
      [estanteId, usuarioId, livroId, status, paginaAtual],
    );
    return rows[0].id;
  }

  describe('POST /estante', () => {
    it('adiciona como Quero ler e grava o evento na outbox', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool, { paginas: 320 });

      const resposta = await adicionar(usuario, livroId).expect(201);

      expect(resposta.body).toEqual({
        livroId,
        livro: {
          titulo: 'Livro de teste',
          autor: 'Autora de Teste',
          capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
        },
        status: 'QUERO_LER',
        vezesLido: 0,
        leituraEmAndamentoId: null,
        paginaAtual: null,
        totalPaginas: 320,
        percentualConcluido: null,
        adicionadoEm: expect.any(String),
      });
      expect(await contar(pool, 'leitura.leitura')).toBe(0);
      const { rows } = await pool.query(
        `SELECT tipo, chave_negocio, payload FROM leitura.outbox_leitura`,
      );
      expect(rows).toEqual([
        {
          tipo: 'livro.adicionado_a_estante',
          chave_negocio: `estante:${usuario}:${livroId}`,
          payload: { usuarioId: usuario, livroId },
        },
      ]);
    });

    it('repetir a chave com o mesmo corpo devolve o original sem novo vínculo ou evento', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);
      const chave = randomUUID();

      const primeira = await adicionar(usuario, livroId, chave).expect(201);
      const repeticao = await adicionar(usuario, livroId, chave).expect(201);

      expect(repeticao.body).toEqual(primeira.body);
      expect(await contar(pool, 'leitura.estante')).toBe(1);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(1);
    });

    it('a mesma chave com outro livro é 409', async () => {
      const usuario = novoUsuario();
      const chave = randomUUID();
      await adicionar(usuario, await inserirLivro(pool), chave).expect(201);

      const resposta = await adicionar(
        usuario,
        await inserirLivro(pool),
        chave,
      ).expect(409);

      expect(resposta.body.codigo).toBe('CHAVE_IDEMPOTENCIA_CONFLITANTE');
      expect(await contar(pool, 'leitura.estante')).toBe(1);
    });

    it('livro já na estante é 409 sem segundo evento', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);
      await adicionar(usuario, livroId).expect(201);

      const resposta = await adicionar(usuario, livroId).expect(409);

      expect(resposta.body.codigo).toBe('TRANSICAO_DE_LEITURA_INVALIDA');
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(1);
    });

    it('livro pessoal de terceiro é recusado (SEC-07)', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: novoUsuario(),
      });

      const resposta = await adicionar(usuario, livroId).expect(403);

      expect(resposta.body.codigo).toBe('LIVRO_PESSOAL_DE_TERCEIRO');
      expect(await contar(pool, 'leitura.estante')).toBe(0);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
    });

    it('o dono adiciona o próprio livro pessoal', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: usuario,
      });

      await adicionar(usuario, livroId).expect(201);
    });

    it('livro inexistente ou inativo é 404', async () => {
      const usuario = novoUsuario();
      const inativo = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: usuario,
        ativo: false,
      });

      await adicionar(usuario, randomUUID()).expect(404);
      await adicionar(usuario, inativo).expect(404);
    });

    it('corpo inválido, campo extra e chave ausente são 400', async () => {
      const usuario = novoUsuario();
      const token = `Bearer ${tokenDe(usuario)}`;

      await adicionar(usuario, 'nao-e-uuid').expect(400);
      await http()
        .post('/estante')
        .set('Authorization', token)
        .set('Idempotency-Key', randomUUID())
        .send({ livroId: randomUUID(), status: 'LIDO' })
        .expect(400);
      await http()
        .post('/estante')
        .set('Authorization', token)
        .send({ livroId: randomUUID() })
        .expect(400);
    });
  });

  describe('DELETE /estante/{livroId}', () => {
    it('remove Quero ler sem histórico e a repetição é 204', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);
      await adicionar(usuario, livroId).expect(201);
      const chave = randomUUID();

      await remover(usuario, livroId, chave).expect(204);
      await remover(usuario, livroId, chave).expect(204);

      expect(await contar(pool, 'leitura.estante')).toBe(0);
    });

    it('Quero ler com histórico de leitura é 409', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);
      const estanteId = await inserirVinculo(usuario, livroId);
      await inserirLeitura(estanteId, usuario, livroId, 'abandonado');

      const resposta = await remover(usuario, livroId).expect(409);

      expect(resposta.body.codigo).toBe('ESTANTE_COM_HISTORICO');
      expect(await contar(pool, 'leitura.estante')).toBe(1);
    });

    it('livro fora de Quero ler é 409', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);
      const estanteId = await inserirVinculo(usuario, livroId, 'lendo');
      await inserirLeitura(estanteId, usuario, livroId, 'lendo');

      await remover(usuario, livroId).expect(409);
      expect(await contar(pool, 'leitura.estante')).toBe(1);
    });

    it('livro fora da estante é 404 e a estante de outro leitor não é tocada', async () => {
      const dono = novoUsuario();
      const livroId = await inserirLivro(pool);
      await adicionar(dono, livroId).expect(201);

      await remover(novoUsuario(), livroId).expect(404);
      expect(await contar(pool, 'leitura.estante')).toBe(1);
    });
  });

  describe('GET /estante', () => {
    it('pagina, ordena, filtra e traz os totais por status', async () => {
      const usuario = novoUsuario();
      const base = Date.now();
      const titulos = ['Cem anos', 'Anna', 'Borges', 'Duna'];
      const ids: string[] = [];
      for (const [i, titulo] of titulos.entries()) {
        const livroId = await inserirLivro(pool, { titulo, paginas: 200 });
        ids.push(livroId);
        const status = i === 3 ? 'lendo' : 'quero_ler';
        const estanteId = await inserirVinculo(
          usuario,
          livroId,
          status,
          new Date(base + i * 1000),
        );
        if (status === 'lendo') {
          await inserirLeitura(estanteId, usuario, livroId, 'lendo', 50);
        }
      }
      await inserirVinculo(novoUsuario(), ids[0]);

      const recentes = await consultar(usuario, '/estante?limite=2').expect(
        200,
      );
      expect(
        recentes.body.itens.map((i: { livroId: string }) => i.livroId),
      ).toEqual([ids[3], ids[2]]);
      expect(recentes.body.paginacao).toEqual({
        page: 1,
        limite: 2,
        totalItens: 4,
        totalPaginas: 2,
      });
      expect(recentes.body.totaisPorStatus).toEqual({
        QUERO_LER: 3,
        LENDO: 1,
        LIDO: 0,
        RELENDO: 0,
        ABANDONADO: 0,
      });
      expect(recentes.body.itens[0]).toMatchObject({
        status: 'LENDO',
        leituraEmAndamentoId: expect.any(String),
        paginaAtual: 50,
        totalPaginas: 200,
        percentualConcluido: 25,
      });

      const segunda = await consultar(
        usuario,
        '/estante?limite=2&page=2',
      ).expect(200);
      expect(
        segunda.body.itens.map((i: { livroId: string }) => i.livroId),
      ).toEqual([ids[1], ids[0]]);

      const porTitulo = await consultar(
        usuario,
        '/estante?ordenacao=titulo_asc',
      ).expect(200);
      expect(
        porTitulo.body.itens.map((i: { livroId: string }) => i.livroId),
      ).toEqual([ids[1], ids[2], ids[0], ids[3]]);

      const antigos = await consultar(
        usuario,
        '/estante?ordenacao=adicionado_asc',
      ).expect(200);
      expect(antigos.body.itens[0].livroId).toBe(ids[0]);

      const lendo = await consultar(usuario, '/estante?status=LENDO').expect(
        200,
      );
      expect(lendo.body.itens).toHaveLength(1);
      expect(lendo.body.paginacao.totalItens).toBe(1);
      expect(lendo.body.totaisPorStatus.QUERO_LER).toBe(3);
    });

    it('traz o livro e ordena por autor e por progresso', async () => {
      const usuario = novoUsuario();
      const base = Date.now();
      const livros = [
        { titulo: 'Sem autor', autor: null, capaUrl: null, pagina: 150 },
        { titulo: 'Zeta', autor: 'Borges', capaUrl: undefined, pagina: 20 },
        { titulo: 'Alfa', autor: 'Borges', capaUrl: undefined, pagina: null },
        { titulo: 'Beta', autor: 'Assis', capaUrl: undefined, pagina: 100 },
      ];
      const ids: string[] = [];
      for (const [i, livro] of livros.entries()) {
        const livroId = await inserirLivro(pool, {
          titulo: livro.titulo,
          autor: livro.autor,
          capaUrl: livro.capaUrl,
          paginas: 200,
        });
        ids.push(livroId);
        const status = livro.pagina === null ? 'quero_ler' : 'lendo';
        const estanteId = await inserirVinculo(
          usuario,
          livroId,
          status,
          new Date(base + i * 1000),
        );
        if (livro.pagina !== null) {
          await inserirLeitura(
            estanteId,
            usuario,
            livroId,
            'lendo',
            livro.pagina,
          );
        }
      }
      const ordem = async (ordenacao: string) => {
        const resposta = await consultar(
          usuario,
          `/estante?ordenacao=${ordenacao}`,
        ).expect(200);
        return resposta.body.itens.map((i: { livroId: string }) => i.livroId);
      };

      const { body } = await consultar(usuario, '/estante').expect(200);
      const porLivro = new Map(
        body.itens.map((i: { livroId: string; livro: unknown }) => [
          i.livroId,
          i.livro,
        ]),
      );
      expect(porLivro.get(ids[0])).toEqual({
        titulo: 'Sem autor',
        autor: null,
        capaUrl: null,
      });
      expect(porLivro.get(ids[3])).toEqual({
        titulo: 'Beta',
        autor: 'Assis',
        capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
      });

      // Autor nulo por último nas duas direções; empate de autor por título.
      expect(await ordem('autor_asc')).toEqual([
        ids[3],
        ids[2],
        ids[1],
        ids[0],
      ]);
      expect(await ordem('autor_desc')).toEqual([
        ids[2],
        ids[1],
        ids[3],
        ids[0],
      ]);
      // Sem leitura em andamento por último nas duas direções.
      expect(await ordem('progresso_asc')).toEqual([
        ids[1],
        ids[3],
        ids[0],
        ids[2],
      ]);
      expect(await ordem('progresso_desc')).toEqual([
        ids[0],
        ids[3],
        ids[1],
        ids[2],
      ]);
    });

    it('limite acima de 50 é reduzido para 50', async () => {
      const resposta = await consultar(
        novoUsuario(),
        '/estante?limite=500',
      ).expect(200);

      expect(resposta.body.paginacao).toEqual({
        page: 1,
        limite: 50,
        totalItens: 0,
        totalPaginas: 0,
      });
    });

    it.each([
      'status=lendo',
      'ordenacao=editora_asc',
      'page=0',
      'limite=0',
      'limite=abc',
      'busca=duna',
    ])('parâmetro inválido (%s) é 400', async (query) => {
      const resposta = await consultar(
        novoUsuario(),
        `/estante?${query}`,
      ).expect(400);
      expect(resposta.body.codigo).toBe('REQUISICAO_INVALIDA');
    });

    it('sem token é 401', async () => {
      await http().get('/estante').expect(401);
      await http()
        .post('/estante')
        .set('Idempotency-Key', randomUUID())
        .send({ livroId: randomUUID() })
        .expect(401);
      await http().get(`/perfis/${randomUUID()}/estante`).expect(401);
      await http().get(`/livros/${randomUUID()}/conclusoes`).expect(401);
    });
  });

  describe('GET /perfis/{usuarioId}/estante (RN-08)', () => {
    async function perfilComLivro(
      privacidade: 'publico' | 'privado',
    ): Promise<string> {
      const dono = novoUsuario();
      await inserirPerfil(pool, dono, privacidade);
      await inserirVinculo(dono, await inserirLivro(pool));
      return dono;
    }

    it('perfil público é visível para qualquer autenticado', async () => {
      const dono = await perfilComLivro('publico');

      const resposta = await consultar(
        novoUsuario(),
        `/perfis/${dono}/estante`,
      ).expect(200);

      expect(resposta.body.itens).toHaveLength(1);
      expect(resposta.body.totaisPorStatus.QUERO_LER).toBe(1);
    });

    it('perfil privado exige seguimento aceito', async () => {
      const dono = await perfilComLivro('privado');
      const seguidor = novoUsuario();
      await inserirSeguimentoAceito(pool, seguidor, dono);

      const negado = await consultar(
        novoUsuario(),
        `/perfis/${dono}/estante`,
      ).expect(403);
      expect(negado.body.codigo).toBe('ACESSO_NEGADO');
      await consultar(seguidor, `/perfis/${dono}/estante`).expect(200);
    });

    it('o dono vê a própria estante privada', async () => {
      const dono = await perfilComLivro('privado');

      const resposta = await consultar(dono, `/perfis/${dono}/estante`).expect(
        200,
      );
      expect(resposta.body.itens).toHaveLength(1);
    });

    it('conta suspensa ou em exclusão (fora da VIEW) é 404, mesmo para seguidor', async () => {
      const dono = novoUsuario();
      await inserirVinculo(dono, await inserirLivro(pool));
      const seguidor = novoUsuario();
      await inserirSeguimentoAceito(pool, seguidor, dono);

      await consultar(seguidor, `/perfis/${dono}/estante`).expect(404);
    });

    it('aplica filtro e limite como a estante própria', async () => {
      const dono = await perfilComLivro('publico');

      const resposta = await consultar(
        novoUsuario(),
        `/perfis/${dono}/estante?status=LIDO&limite=99`,
      ).expect(200);

      expect(resposta.body.itens).toEqual([]);
      expect(resposta.body.paginacao.limite).toBe(50);
    });

    it('usuarioId fora do formato é 400', async () => {
      await consultar(novoUsuario(), '/perfis/abc/estante').expect(400);
    });
  });

  describe('GET /livros/{livroId}/conclusoes', () => {
    it('devolve vezesLido do leitor e 0 fora da estante', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);
      await inserirVinculo(usuario, livroId, 'lido', new Date(), 2);

      const lido = await consultar(
        usuario,
        `/livros/${livroId}/conclusoes`,
      ).expect(200);
      expect(lido.body).toEqual({ livroId, vezesLido: 2 });

      const outro = await consultar(
        novoUsuario(),
        `/livros/${livroId}/conclusoes`,
      ).expect(200);
      expect(outro.body).toEqual({ livroId, vezesLido: 0 });
    });

    it('livro inexistente ou pessoal de terceiro é 404', async () => {
      const usuario = novoUsuario();
      const alheio = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: novoUsuario(),
      });

      await consultar(usuario, `/livros/${randomUUID()}/conclusoes`).expect(
        404,
      );
      await consultar(usuario, `/livros/${alheio}/conclusoes`).expect(404);
    });
  });
});
