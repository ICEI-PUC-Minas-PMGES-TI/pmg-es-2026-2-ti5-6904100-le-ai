import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil, seguir } from './massa';

/**
 * `GET /perfis/{usuarioId}/resenhas` (composição de RF-SOC-02 por F-AVA) sob RN-08: a matriz
 * público, privado visto pelo dono, privado com seguidor, privado sem seguidor e perfil ausente.
 * Nas VIEWs reais, conta suspensa e em exclusão já não têm linha: aqui são o mesmo caso.
 */
describe('resenhas do perfil (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let autora: string;
  let leitora: string;

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });
  beforeEach(async () => {
    await limpar(pool);
    autora = novoUsuario();
    leitora = novoUsuario();
    await inserirPerfil(pool, { id: leitora });
  });

  const listar = (perfilId: string, quem: string, query = '') =>
    request(app.getHttpServer())
      .get(`/perfis/${perfilId}/resenhas${query}`)
      .set('Authorization', `Bearer ${tokenDe(quem)}`);

  async function resenhar(
    livroId: string,
    texto: string,
    opcoes: { criadoEm?: string; spoiler?: boolean; nota?: number } = {},
  ): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO leitura.resenha (usuario_id, livro_id, texto, spoiler, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, coalesce($5::timestamptz, now()), coalesce($5::timestamptz, now()))
       RETURNING id`,
      [
        autora,
        livroId,
        texto,
        opcoes.spoiler ?? false,
        opcoes.criadoEm ?? null,
      ],
    );
    if (opcoes.nota !== undefined) {
      await pool.query(
        'INSERT INTO leitura.nota (usuario_id, livro_id, valor) VALUES ($1, $2, $3)',
        [autora, livroId, opcoes.nota],
      );
    }
    return rows[0].id;
  }

  describe('RN-08', () => {
    it('perfil público: qualquer leitor vê, na forma exata do contrato', async () => {
      await inserirPerfil(pool, { id: autora, privacidade: 'publico' });
      const livroId = await inserirLivro(pool);
      const resenhaId = await resenhar(livroId, 'Bom demais.', {
        nota: 4.5,
        spoiler: true,
      });

      const resposta = await listar(autora, leitora);

      expect(resposta.status).toBe(200);
      expect(resposta.body.paginacao).toEqual({
        page: 1,
        limite: 20,
        totalItens: 1,
        totalPaginas: 1,
      });
      const [item] = resposta.body.itens;
      expect(Object.keys(item).sort()).toEqual(
        [
          'atualizadoEm',
          'criadoEm',
          'curtidas',
          'descurtidas',
          'id',
          'livro',
          'livroId',
          'minhaReacao',
          'nota',
          'spoiler',
          'texto',
          'usuarioId',
        ].sort(),
      );
      expect(item).toMatchObject({
        id: resenhaId,
        usuarioId: autora,
        livroId,
        texto: 'Bom demais.',
        spoiler: true,
        nota: 4.5,
        curtidas: 0,
        descurtidas: 0,
        minhaReacao: null,
        livro: {
          id: livroId,
          tipo: 'oficial',
          titulo: 'Torto Arado',
          autor: 'Itamar Vieira Junior',
          capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
        },
      });
    });

    it('perfil privado sem seguimento aceito responde 403', async () => {
      await inserirPerfil(pool, { id: autora, privacidade: 'privado' });
      await resenhar(await inserirLivro(pool), 'Só para quem me segue.');

      const resposta = await listar(autora, leitora);

      expect(resposta.status).toBe(403);
      expect(resposta.body.codigo).toBe('ACESSO_NEGADO');
    });

    it('perfil privado com seguimento aceito vê as resenhas', async () => {
      await inserirPerfil(pool, { id: autora, privacidade: 'privado' });
      await seguir(pool, leitora, autora);
      await resenhar(await inserirLivro(pool), 'Só para quem me segue.');

      const resposta = await listar(autora, leitora);

      expect(resposta.status).toBe(200);
      expect(resposta.body.itens).toHaveLength(1);
    });

    it('o próprio dono vê o perfil privado dele', async () => {
      await inserirPerfil(pool, { id: autora, privacidade: 'privado' });
      await resenhar(await inserirLivro(pool), 'Minha.');

      const resposta = await listar(autora, autora);

      expect(resposta.status).toBe(200);
      expect(resposta.body.itens).toHaveLength(1);
    });

    // Conta inexistente, suspensa ou em exclusão: sem linha na VIEW de perfil.
    it('perfil ausente da VIEW responde 404', async () => {
      await resenhar(await inserirLivro(pool), 'Não deveria aparecer.');

      const resposta = await listar(autora, leitora);

      expect(resposta.status).toBe(404);
    });
  });

  describe('conteúdo', () => {
    beforeEach(() =>
      inserirPerfil(pool, { id: autora, privacidade: 'publico' }),
    );

    // RN-15: terceiros só chegam ao livro pessoal pelo feed ou pela lista do dono.
    it('resenha de livro pessoal só aparece para o dono', async () => {
      await resenhar(await inserirLivro(pool), 'Oficial.');
      await resenhar(
        await inserirLivro(pool, {
          tipo: 'pessoal',
          donoId: autora,
          autor: 'Eu mesma',
        }),
        'Pessoal.',
      );

      const deTerceiro = await listar(autora, leitora);
      const doDono = await listar(autora, autora);

      expect(
        deTerceiro.body.itens.map((i: { texto: string }) => i.texto),
      ).toEqual(['Oficial.']);
      expect(deTerceiro.body.paginacao.totalItens).toBe(1);
      expect(doDono.body.itens).toHaveLength(2);
    });

    it('livro inativo não aparece', async () => {
      await resenhar(
        await inserirLivro(pool, {
          tipo: 'pessoal',
          donoId: autora,
          ativo: false,
        }),
        'De livro excluído.',
      );

      const resposta = await listar(autora, autora);

      expect(resposta.body.itens).toEqual([]);
    });

    it('livro sem autor e resenha sem nota vêm com nulos', async () => {
      await resenhar(await inserirLivro(pool, { autor: null }), 'Sem nota.');

      const [item] = (await listar(autora, leitora)).body.itens;

      expect(item.livro.autor).toBeNull();
      expect(item.nota).toBeNull();
    });

    it('mais recentes primeiro, paginado pelo limite', async () => {
      await resenhar(await inserirLivro(pool), 'Antiga.', {
        criadoEm: '2026-08-01T12:00:00Z',
      });
      await resenhar(await inserirLivro(pool), 'Nova.', {
        criadoEm: '2026-09-20T12:00:00Z',
      });
      await resenhar(await inserirLivro(pool), 'Meio.', {
        criadoEm: '2026-09-01T12:00:00Z',
      });

      const primeira = await listar(autora, leitora, '?limite=2');
      const segunda = await listar(autora, leitora, '?page=2&limite=2');

      expect(
        primeira.body.itens.map((i: { texto: string }) => i.texto),
      ).toEqual(['Nova.', 'Meio.']);
      expect(segunda.body.itens.map((i: { texto: string }) => i.texto)).toEqual(
        ['Antiga.'],
      );
      expect(segunda.body.paginacao).toEqual({
        page: 2,
        limite: 2,
        totalItens: 3,
        totalPaginas: 2,
      });
    });

    // Sem teto, `page=1e20` estourava o OFFSET do banco e virava 500.
    it.each([
      '?limite=51',
      '?page=0',
      '?limite=abc',
      '?page=10001',
      '?page=1e20',
    ])('%s responde 400', async (query) => {
      const resposta = await listar(autora, leitora, query);
      expect(resposta.status).toBe(400);
    });

    it('usuarioId malformado responde 400 no campo usuarioId', async () => {
      const resposta = await listar('nao-e-uuid', leitora);

      expect(resposta.status).toBe(400);
      expect(resposta.body.campos).toEqual([
        expect.objectContaining({ campo: 'usuarioId' }),
      ]);
    });

    it('sem token responde 401', async () => {
      const resposta = await request(app.getHttpServer()).get(
        `/perfis/${randomUUID()}/resenhas`,
      );
      expect(resposta.status).toBe(401);
    });
  });
});
