import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { limpar, prepararBanco } from './banco';
import {
  inserirAutor,
  inserirEditora,
  inserirLivroOficial,
  inserirLivroPessoal,
  inserirSerie,
  isbn,
} from './massa';

/**
 * Páginas de autor, editora e série (F-ACV-DESCOBERTA) contra Postgres real:
 * o cabeçalho, a ordem de cada página, a paginação estável, o vazio defensivo e
 * a exclusão de livro pessoal.
 */
describe('páginas de autor, editora e série (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  const leitor = novoUsuario();

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });
  beforeEach(() => limpar(pool));

  let sequencia = 0;
  const novoIsbn = () => isbn(`978001${String(++sequencia).padStart(6, '0')}`);

  const obter = (
    caminho: string,
    query: Record<string, string | number> = {},
  ) =>
    request(app.getHttpServer())
      .get(caminho)
      .query(query)
      .set('Authorization', `Bearer ${tokenDe(leitor)}`);

  const titulos = (livros: { itens: { titulo: string }[] }) =>
    livros.itens.map((item) => item.titulo);

  describe('autor', () => {
    it('devolve a forma exata, com biografia e livros', async () => {
      const autor = await inserirAutor(
        pool,
        'Conceição Evaristo',
        'Escritora mineira, nascida em 1946.',
      );
      const pallas = await inserirEditora(pool, 'Pallas');
      const id = await inserirLivroOficial(
        pool,
        novoIsbn(),
        'Ponciá Vicêncio',
        {
          autores: [autor],
          editoraId: pallas,
          ano: 2017,
        },
      );

      const resposta = await obter(`/autores/${autor}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        id: autor,
        nome: 'Conceição Evaristo',
        biografia: 'Escritora mineira, nascida em 1946.',
        livros: {
          itens: [
            {
              id,
              titulo: 'Ponciá Vicêncio',
              autores: [{ id: autor, nome: 'Conceição Evaristo' }],
              editora: 'Pallas',
              anoPublicacao: 2017,
              paginas: 200,
              capa: {
                url: 'https://covers.openlibrary.org/b/id/1-L.jpg',
                origem: 'externa',
              },
              assuntos: [],
            },
          ],
          page: 1,
          limit: 20,
          totalItens: 1,
          totalPaginas: 1,
        },
      });
    });

    it('sem biografia na fonte, devolve null', async () => {
      const autor = await inserirAutor(pool, 'Jeferson Tenório');

      const { body } = await obter(`/autores/${autor}`);

      expect(body.biografia).toBeNull();
    });

    it('ordena pelo ano mais recente do grupo, com as edições juntas e sem ano no fim', async () => {
      const autor = await inserirAutor(pool, 'Conceição Evaristo');
      const comAutor = (titulo: string, ano: number | null) =>
        inserirLivroOficial(pool, novoIsbn(), titulo, {
          autores: [autor],
          ano,
        });
      await comAutor('Ponciá Vicêncio', 2003);
      await comAutor('Becos da memória', 2017);
      await comAutor('Ponciá Vicêncio', 2018);
      await comAutor('Olhos d’água', 2014);
      await comAutor('Poemas da recordação', null);

      const { body } = await obter(`/autores/${autor}`);

      expect(
        body.livros.itens.map(
          (l: { titulo: string; anoPublicacao: number | null }) =>
            `${l.titulo} ${l.anoPublicacao}`,
        ),
      ).toEqual([
        'Ponciá Vicêncio 2018',
        'Ponciá Vicêncio 2003',
        'Becos da memória 2017',
        'Olhos d’água 2014',
        'Poemas da recordação null',
      ]);
      expect(body.livros.totalItens).toBe(5);
    });

    it('pagina sem repetir nem perder livro entre as páginas', async () => {
      const autor = await inserirAutor(pool, 'Machado de Assis');
      for (let i = 0; i < 5; i++) {
        await inserirLivroOficial(pool, novoIsbn(), `Conto ${i}`, {
          autores: [autor],
          ano: 1900,
        });
      }

      const primeira = await obter(`/autores/${autor}`, { limit: 2 });
      const segunda = await obter(`/autores/${autor}`, { limit: 2, page: 2 });
      const terceira = await obter(`/autores/${autor}`, { limit: 2, page: 3 });

      const todos = [
        ...titulos(primeira.body.livros),
        ...titulos(segunda.body.livros),
        ...titulos(terceira.body.livros),
      ];
      expect(todos).toHaveLength(5);
      expect(new Set(todos).size).toBe(5);
      expect(primeira.body.livros).toMatchObject({
        totalItens: 5,
        totalPaginas: 3,
      });
    });

    it('autor sem livro oficial responde 200 com a lista vazia', async () => {
      const autor = await inserirAutor(pool, 'Autor sem livros');

      const resposta = await obter(`/autores/${autor}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.livros).toEqual({
        itens: [],
        page: 1,
        limit: 20,
        totalItens: 0,
        totalPaginas: 0,
      });
    });
  });

  describe('editora', () => {
    it('lista só os livros da editora, pela ordem do ano do grupo', async () => {
      const pallas = await inserirEditora(pool, 'Pallas');
      const outra = await inserirEditora(pool, 'Todavia');
      await inserirLivroOficial(pool, novoIsbn(), 'Becos da memória', {
        editoraId: pallas,
        ano: 2006,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Ponciá Vicêncio', {
        editoraId: pallas,
        ano: 2017,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Torto arado', {
        editoraId: outra,
        ano: 2019,
      });

      const resposta = await obter(`/editoras/${pallas}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({ id: pallas, nome: 'Pallas' });
      expect(titulos(resposta.body.livros)).toEqual([
        'Ponciá Vicêncio',
        'Becos da memória',
      ]);
    });
  });

  describe('série', () => {
    it('ordena pelo número, com os sem número no fim por título, e lista os autores', async () => {
      const rowling = await inserirAutor(pool, 'J. K. Rowling');
      const tradutora = await inserirAutor(pool, 'Lia Wyler');
      const serie = await inserirSerie(pool, 'Harry Potter');
      const daSerie = (
        titulo: string,
        numeroSerie: number | null,
        autores = [rowling],
      ) =>
        inserirLivroOficial(pool, novoIsbn(), titulo, {
          serieId: serie,
          numeroSerie,
          autores,
        });
      await daSerie('Harry Potter e o prisioneiro de Azkaban', 3);
      await daSerie('Harry Potter e a pedra filosofal', 1, [
        rowling,
        tradutora,
      ]);
      await daSerie('Os contos de Beedle', null);
      await daSerie('Animais fantásticos', null);
      // Lacuna: não há o número 2, e nada aparece no lugar dele.

      const resposta = await obter(`/series/${serie}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        id: serie,
        nome: 'Harry Potter',
        autores: [
          { id: rowling, nome: 'J. K. Rowling' },
          { id: tradutora, nome: 'Lia Wyler' },
        ],
      });
      expect(
        resposta.body.livros.itens.map(
          (l: { titulo: string; numeroNaSerie: number | null }) =>
            `${l.numeroNaSerie} ${l.titulo}`,
        ),
      ).toEqual([
        '1 Harry Potter e a pedra filosofal',
        '3 Harry Potter e o prisioneiro de Azkaban',
        'null Animais fantásticos',
        'null Os contos de Beedle',
      ]);
    });

    it('série sem livro oficial responde 200 com a lista e os autores vazios', async () => {
      const serie = await inserirSerie(pool, 'Série vazia');

      const resposta = await obter(`/series/${serie}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        autores: [],
        livros: { itens: [], totalItens: 0 },
      });
    });
  });

  it('livro pessoal nunca aparece nas páginas', async () => {
    const autor = await inserirAutor(pool, 'Autora Pessoal');
    const pessoal = await inserirLivroPessoal(
      pool,
      novoUsuario(),
      'Diário pessoal',
    );
    // O CHECK impede editora e série em livro pessoal, mas não o vínculo de
    // autor: a exclusão precisa vir da consulta.
    await pool.query(
      `INSERT INTO acervo.livro_autor (livro_id, autor_id) VALUES ($1, $2)`,
      [pessoal, autor],
    );

    const { body } = await obter(`/autores/${autor}`);

    expect(body.livros.totalItens).toBe(0);
  });

  it.each(['autores', 'editoras', 'series'])(
    '/%s/{id} responde 404 para id inexistente e 400 para id malformado',
    async (recurso) => {
      const inexistente = await obter(
        `/${recurso}/00000000-0000-4000-8000-000000000000`,
      );
      expect(inexistente.status).toBe(404);
      expect(inexistente.body.codigo).toBe('RECURSO_NAO_ENCONTRADO');

      const malformado = await obter(`/${recurso}/nao-e-uuid`);
      expect(malformado.status).toBe(400);
      expect(malformado.body.campos).toEqual([
        { campo: 'id', mensagem: 'Informe um identificador válido.' },
      ]);
    },
  );

  it('recusa limit acima do teto', async () => {
    const autor = await inserirAutor(pool, 'Qualquer');
    const resposta = await obter(`/autores/${autor}`, { limit: 51 });
    expect(resposta.status).toBe(400);
  });

  it('exige autenticação', async () => {
    const autor = await inserirAutor(pool, 'Qualquer');
    const resposta = await request(app.getHttpServer()).get(
      `/autores/${autor}`,
    );
    expect(resposta.status).toBe(401);
  });
});
