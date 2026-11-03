import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { limpar, prepararBanco } from './banco';
import {
  inserirAssunto,
  inserirAutor,
  inserirEditora,
  inserirLivroOficial,
  inserirLivroPessoal,
  inserirSerie,
  inserirSinonimoDeEditora,
  isbn,
} from './massa';

/**
 * Busca do acervo contra Postgres real: as extensões e os índices da migration
 * `0004`, a normalização sem acento, os quatro campos, o filtro, a paginação e a
 * ordem que mantém as edições de uma obra contíguas.
 */
describe('busca de livros oficiais (integração)', () => {
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
  /** ISBN novo a cada chamada, para os livros não colidirem na unicidade. */
  const novoIsbn = () => isbn(`978000${String(++sequencia).padStart(6, '0')}`);

  const buscar = (query: Record<string, string | number>) =>
    request(app.getHttpServer())
      .get('/livros')
      .query(query)
      .set('Authorization', `Bearer ${tokenDe(leitor)}`);

  const titulos = (corpo: { itens: { titulo: string }[] }) =>
    corpo.itens.map((item) => item.titulo);

  it('exige autenticação', async () => {
    const resposta = await request(app.getHttpServer()).get('/livros?q=a');
    expect(resposta.status).toBe(401);
  });

  it('devolve a forma exata de PaginaLivros', async () => {
    const autor = await inserirAutor(pool, 'Itamar Vieira Junior');
    const editora = await inserirEditora(pool, 'Todavia');
    const romance = await inserirAssunto(pool, 'Romance', 'romance');
    const id = await inserirLivroOficial(pool, novoIsbn(), 'Torto arado', {
      ano: 2019,
      editoraId: editora,
      autores: [autor],
      assuntos: [romance],
    });

    const resposta = await buscar({ q: 'torto' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      itens: [
        {
          id,
          titulo: 'Torto arado',
          autores: [{ id: autor, nome: 'Itamar Vieira Junior' }],
          editora: 'Todavia',
          anoPublicacao: 2019,
          paginas: 200,
          capa: {
            url: 'https://covers.openlibrary.org/b/id/1-L.jpg',
            origem: 'externa',
          },
          assuntos: [{ id: romance, nome: 'Romance' }],
        },
      ],
      page: 1,
      limit: 20,
      totalItens: 1,
      totalPaginas: 1,
    });
  });

  it('prefere a capa própria e traz nulos explícitos sem editora, ano e autor', async () => {
    const propria =
      'https://res.cloudinary.com/leai/image/upload/v1/capas/teste.jpg';
    await inserirLivroOficial(pool, novoIsbn(), 'Poemas esparsos', {
      capaPropria: propria,
    });

    const { body } = await buscar({ q: 'poemas' });

    expect(body.itens[0]).toMatchObject({
      autores: [],
      editora: null,
      anoPublicacao: null,
      capa: { url: propria, origem: 'propria' },
    });
  });

  describe('campos pesquisados', () => {
    it('casa por trecho do título, do autor, da editora e do assunto', async () => {
      const autor = await inserirAutor(pool, 'Conceição Evaristo');
      const editora = await inserirEditora(pool, 'Pallas');
      const contos = await inserirAssunto(pool, 'Contos', 'contos');
      await inserirLivroOficial(pool, novoIsbn(), 'Ponciá Vicêncio', {
        autores: [autor],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Becos da memória', {
        editoraId: editora,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Olhos d’água', {
        assuntos: [contos],
      });

      expect(titulos((await buscar({ q: 'vicen' })).body)).toEqual([
        'Ponciá Vicêncio',
      ]);
      expect(titulos((await buscar({ q: 'evaristo' })).body)).toEqual([
        'Ponciá Vicêncio',
      ]);
      expect(titulos((await buscar({ q: 'pallas' })).body)).toEqual([
        'Becos da memória',
      ]);
      expect(titulos((await buscar({ q: 'conto' })).body)).toEqual([
        'Olhos d’água',
      ]);
    });

    it('ignora acentos e maiúsculas dos dois lados', async () => {
      const autor = await inserirAutor(pool, 'Conceição Evaristo');
      await inserirLivroOficial(pool, novoIsbn(), 'Ponciá Vicêncio', {
        autores: [autor],
      });

      expect(titulos((await buscar({ q: 'CONCEICAO' })).body)).toEqual([
        'Ponciá Vicêncio',
      ]);
      expect(titulos((await buscar({ q: 'poncia vicencio' })).body)).toEqual([
        'Ponciá Vicêncio',
      ]);
    });

    it('casa ISBN-13 exato, inclusive com hífens', async () => {
      const alvo = isbn('978853591484');
      await inserirLivroOficial(pool, alvo, 'Dom Casmurro');
      await inserirLivroOficial(pool, novoIsbn(), 'Outro livro');

      const hifenizado = `${alvo.slice(0, 3)}-${alvo.slice(3, 5)}-${alvo.slice(5)}`;
      expect(titulos((await buscar({ q: alvo })).body)).toEqual([
        'Dom Casmurro',
      ]);
      expect(titulos((await buscar({ q: hifenizado })).body)).toEqual([
        'Dom Casmurro',
      ]);
    });

    it('não casa por semelhança: "guimaraes rossa" volta vazio', async () => {
      const autor = await inserirAutor(pool, 'João Guimarães Rosa');
      await inserirLivroOficial(pool, novoIsbn(), 'Grande sertão: veredas', {
        autores: [autor],
      });

      const { body } = await buscar({ q: 'guimaraes rossa' });
      expect(body).toMatchObject({ itens: [], totalItens: 0 });
      expect(titulos((await buscar({ q: 'guimaraes rosa' })).body)).toEqual([
        'Grande sertão: veredas',
      ]);
    });

    it('trata %, _ e \\ do texto como literais', async () => {
      await inserirLivroOficial(pool, novoIsbn(), '100% amor');
      await inserirLivroOficial(pool, novoIsbn(), 'Amor sem porcentagem');
      await inserirLivroOficial(pool, novoIsbn(), 'nome_de_arquivo');
      // Com `_` como curinga, "e_d" casaria também "eXd".
      await inserirLivroOficial(pool, novoIsbn(), 'nomeXde arquivo');
      await inserirLivroOficial(pool, novoIsbn(), 'barra \\ invertida');

      expect(titulos((await buscar({ q: '%' })).body)).toEqual(['100% amor']);
      expect(titulos((await buscar({ q: 'e_d' })).body)).toEqual([
        'nome_de_arquivo',
      ]);
      expect(titulos((await buscar({ q: '\\' })).body)).toEqual([
        'barra \\ invertida',
      ]);
    });

    it('ordena título antes de autor, editora e assunto', async () => {
      const autor = await inserirAutor(pool, 'Maria Lua');
      const editora = await inserirEditora(pool, 'Lua Nova');
      const assunto = await inserirAssunto(pool, 'Lua cheia', 'lua-cheia');
      await inserirLivroOficial(pool, novoIsbn(), 'Pelo assunto', {
        assuntos: [assunto],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Pela editora', {
        editoraId: editora,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Pelo autor', {
        autores: [autor],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'A lua');

      expect(titulos((await buscar({ q: 'lua' })).body)).toEqual([
        'A lua',
        'Pelo autor',
        'Pela editora',
        'Pelo assunto',
      ]);
    });

    it('casa palavra por palavra, sem depender da pontuação nem das palavras do meio', async () => {
      await inserirLivroOficial(pool, novoIsbn(), 'Grande sertão: veredas');
      await inserirLivroOficial(pool, novoIsbn(), 'O Senhor dos Anéis');
      await inserirLivroOficial(pool, novoIsbn(), 'Torto arado');

      expect(
        titulos((await buscar({ q: 'grande sertao veredas' })).body),
      ).toEqual(['Grande sertão: veredas']);
      expect(
        titulos((await buscar({ q: 'grande sertão - veredas' })).body),
      ).toEqual(['Grande sertão: veredas']);
      expect(titulos((await buscar({ q: 'senhor aneis' })).body)).toEqual([
        'O Senhor dos Anéis',
      ]);
      expect(titulos((await buscar({ q: 'torto   arado' })).body)).toEqual([
        'Torto arado',
      ]);
      // Todas as palavras no mesmo campo: nenhuma edição tem as duas.
      expect(titulos((await buscar({ q: 'torto veredas' })).body)).toEqual([]);
    });

    it('põe o título ou o autor idêntico ao texto antes de quem só o contém', async () => {
      const machado = await inserirAutor(pool, 'Machado de Assis');
      const estudiosa = await inserirAutor(pool, 'Estudiosa Qualquer');
      await inserirLivroOficial(
        pool,
        novoIsbn(),
        'Dom Casmurro e os discos voadores',
        {
          autores: [estudiosa],
        },
      );
      await inserirLivroOficial(pool, novoIsbn(), 'Dom Casmurro (Clássicos)', {
        autores: [machado],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Dom Casmurro', {
        autores: [machado],
      });
      await inserirLivroOficial(
        pool,
        novoIsbn(),
        'O mundo de Machado de Assis',
        {
          autores: [estudiosa],
        },
      );

      expect(titulos((await buscar({ q: 'dom casmurro' })).body)[0]).toBe(
        'Dom Casmurro',
      );
      // Mais curto antes, entre os que só contêm o texto.
      expect(titulos((await buscar({ q: 'dom casmurro' })).body)[1]).toBe(
        'Dom Casmurro (Clássicos)',
      );
      // As obras do autor antes do livro sobre ele.
      const porAutor = titulos((await buscar({ q: 'machado de assis' })).body);
      expect(porAutor.at(-1)).toBe('O mundo de Machado de Assis');
      expect(porAutor).toHaveLength(3);
    });

    it('casa ISBN-10, convertido para o ISBN-13 da edição', async () => {
      await inserirLivroOficial(pool, '9788535914849', 'Dom Casmurro');

      expect(titulos((await buscar({ q: '85-359-1484-6' })).body)).toEqual([
        'Dom Casmurro',
      ]);
    });

    it('caractere de controle no texto vira espaço, em vez de derrubar a busca', async () => {
      await inserirLivroOficial(pool, novoIsbn(), 'Torto arado');

      const resposta = await buscar({ q: 'torto\u0000arado' });
      expect(resposta.status).toBe(200);
      expect(titulos(resposta.body)).toEqual(['Torto arado']);
    });
  });

  describe('livro pessoal', () => {
    it('nunca aparece, nem pelo título nem pelo assunto', async () => {
      const romance = await inserirAssunto(pool, 'Romance', 'romance');
      await inserirLivroOficial(pool, novoIsbn(), 'Diário oficial', {
        assuntos: [romance],
      });
      const pessoal = await inserirLivroPessoal(
        pool,
        novoUsuario(),
        'Diário pessoal',
        [romance],
      );
      await pool.query(`UPDATE acervo.livro SET ativo = false WHERE id = $1`, [
        pessoal,
      ]);
      await inserirLivroPessoal(pool, novoUsuario(), 'Diário ativo', [romance]);

      expect(titulos((await buscar({ q: 'diario' })).body)).toEqual([
        'Diário oficial',
      ]);
      expect(titulos((await buscar({ assunto: romance })).body)).toEqual([
        'Diário oficial',
      ]);
      expect(titulos((await buscar({ q: 'autora pessoal' })).body)).toEqual([]);
    });
  });

  describe('filtro por assunto', () => {
    it('restringe a busca por texto e funciona sozinho, ordenado por título', async () => {
      const romance = await inserirAssunto(pool, 'Romance', 'romance');
      const poesia = await inserirAssunto(pool, 'Poesia', 'poesia');
      await inserirLivroOficial(pool, novoIsbn(), 'Vidas secas', {
        assuntos: [romance],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Vidas em verso', {
        assuntos: [poesia],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Água viva', {
        assuntos: [romance],
      });

      expect(
        titulos((await buscar({ q: 'vidas', assunto: romance })).body),
      ).toEqual(['Vidas secas']);
      expect(titulos((await buscar({ assunto: romance })).body)).toEqual([
        'Água viva',
        'Vidas secas',
      ]);
    });

    it('lista os assuntos por nome, sem acento pesando na ordem', async () => {
      const epico = await inserirAssunto(pool, 'Épico', 'epico');
      const drama = await inserirAssunto(pool, 'Drama', 'drama');
      const fantasia = await inserirAssunto(pool, 'Fantasia', 'fantasia');

      const resposta = await request(app.getHttpServer())
        .get('/assuntos')
        .set('Authorization', `Bearer ${tokenDe(leitor)}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        itens: [
          { id: drama, nome: 'Drama' },
          { id: epico, nome: 'Épico' },
          { id: fantasia, nome: 'Fantasia' },
        ],
      });
    });
  });

  describe('filtros avançados (RF-ACV-03)', () => {
    it('filtra por trecho do autor, sem acento, palavra por palavra no mesmo autor', async () => {
      const conceicao = await inserirAutor(pool, 'Conceição Evaristo');
      const outra = await inserirAutor(pool, 'Maria Conceição');
      const evaristo = await inserirAutor(pool, 'Paulo Evaristo');
      await inserirLivroOficial(pool, novoIsbn(), 'Ponciá Vicêncio', {
        autores: [conceicao],
      });
      // "conceicao" e "evaristo" em autores diferentes do mesmo livro não casam.
      await inserirLivroOficial(pool, novoIsbn(), 'Antologia a quatro mãos', {
        autores: [outra, evaristo],
      });

      expect(
        titulos((await buscar({ autor: 'conceicao evaristo' })).body),
      ).toEqual(['Ponciá Vicêncio']);
      expect(titulos((await buscar({ autor: 'EVARISTO' })).body)).toEqual([
        'Antologia a quatro mãos',
        'Ponciá Vicêncio',
      ]);
    });

    it('filtra pela editora e pelos sinônimos da curadoria', async () => {
      const companhia = await inserirEditora(pool, 'Companhia das Letras');
      const pallas = await inserirEditora(pool, 'Pallas');
      await inserirSinonimoDeEditora(pool, 'cia das letras', companhia);
      await inserirLivroOficial(pool, novoIsbn(), 'Torto arado', {
        editoraId: companhia,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Becos da memória', {
        editoraId: pallas,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Sem editora');

      expect(titulos((await buscar({ editora: 'companhia' })).body)).toEqual([
        'Torto arado',
      ]);
      expect(titulos((await buscar({ editora: 'Cia. das' })).body)).toEqual([
        'Torto arado',
      ]);
      expect(titulos((await buscar({ editora: 'pallas' })).body)).toEqual([
        'Becos da memória',
      ]);
    });

    it('filtra pela série', async () => {
      const serie = await inserirSerie(pool, 'Crônicas de Nárnia');
      await inserirLivroOficial(pool, novoIsbn(), 'O leão, a feiticeira', {
        serieId: serie,
        numeroSerie: 2,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Avulso');

      expect(titulos((await buscar({ serie: 'narnia' })).body)).toEqual([
        'O leão, a feiticeira',
      ]);
    });

    it('filtra por ano exato e por faixa de páginas, com cada lado sozinho', async () => {
      await inserirLivroOficial(pool, novoIsbn(), 'Curto 2019', {
        ano: 2019,
        paginas: 90,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Médio 2019', {
        ano: 2019,
        paginas: 150,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Longo 2020', {
        ano: 2020,
        paginas: 400,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Sem ano', { paginas: 150 });

      expect(titulos((await buscar({ ano: 2019 })).body)).toEqual([
        'Curto 2019',
        'Médio 2019',
      ]);
      expect(
        titulos((await buscar({ paginasMin: 100, paginasMax: 150 })).body),
      ).toEqual(['Médio 2019', 'Sem ano']);
      expect(titulos((await buscar({ paginasMin: 150 })).body)).toEqual([
        'Longo 2020',
        'Médio 2019',
        'Sem ano',
      ]);
      expect(titulos((await buscar({ paginasMax: 90 })).body)).toEqual([
        'Curto 2019',
      ]);
    });

    it('combina os filtros entre si, com o q e com o assunto', async () => {
      const autor = await inserirAutor(pool, 'Conceição Evaristo');
      const pallas = await inserirEditora(pool, 'Pallas');
      const romance = await inserirAssunto(pool, 'Romance', 'romance');
      await inserirLivroOficial(pool, novoIsbn(), 'Ponciá Vicêncio', {
        autores: [autor],
        editoraId: pallas,
        ano: 2017,
        paginas: 128,
        assuntos: [romance],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Becos da memória', {
        autores: [autor],
        editoraId: pallas,
        ano: 2017,
        paginas: 200,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Ponciá Vicêncio', {
        autores: [autor],
        editoraId: pallas,
        ano: 2003,
        paginas: 128,
        assuntos: [romance],
      });

      const combinados = {
        autor: 'evaristo',
        editora: 'pallas',
        ano: 2017,
        paginasMax: 150,
      };
      expect(titulos((await buscar(combinados)).body)).toEqual([
        'Ponciá Vicêncio',
      ]);
      expect(
        titulos((await buscar({ ...combinados, q: 'becos' })).body),
      ).toEqual([]);
      const comAssunto = await buscar({ autor: 'evaristo', assunto: romance });
      expect(comAssunto.body.totalItens).toBe(2);
    });

    it('nunca traz livro pessoal, mesmo só com filtros', async () => {
      await inserirLivroPessoal(pool, novoUsuario(), 'Diário pessoal');

      const resposta = await buscar({ paginasMin: 1 });

      expect(resposta.status).toBe(200);
      expect(resposta.body.totalItens).toBe(0);
    });
  });

  describe('paginação e edições', () => {
    it('pagina com o total verdadeiro, inclusive além da última página', async () => {
      for (let i = 1; i <= 5; i++) {
        await inserirLivroOficial(pool, novoIsbn(), `Crônica ${i}`);
      }

      const segunda = await buscar({ q: 'cronica', page: 2, limit: 2 });
      expect(segunda.body).toMatchObject({
        page: 2,
        limit: 2,
        totalItens: 5,
        totalPaginas: 3,
      });
      expect(segunda.body.itens).toHaveLength(2);

      const alem = await buscar({ q: 'cronica', page: 9, limit: 2 });
      expect(alem.body).toMatchObject({
        itens: [],
        totalItens: 5,
        totalPaginas: 3,
      });
    });

    it('mantém as edições de uma obra contíguas, a mais recente primeiro', async () => {
      const autora = await inserirAutor(pool, 'Clarice Lispector');
      const outra = await inserirAutor(pool, 'Outra Autora');
      await inserirLivroOficial(pool, novoIsbn(), 'A hora da estrela', {
        ano: 1977,
        autores: [autora],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'A hora da estrela', {
        ano: 1998,
        autores: [outra],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'A hora da estrela', {
        ano: 2020,
        autores: [autora],
      });

      const { body } = await buscar({ q: 'hora da estrela' });
      const porAutor = body.itens.map(
        (item: { autores: { nome: string }[]; anoPublicacao: number }) =>
          `${item.autores[0].nome} ${item.anoPublicacao}`,
      );

      const clarice = porAutor
        .map((texto: string, i: number) =>
          texto.startsWith('Clarice') ? i : -1,
        )
        .filter((i: number) => i >= 0);
      expect(clarice[1] - clarice[0]).toBe(1);
      expect(porAutor[clarice[0]]).toBe('Clarice Lispector 2020');
      expect(porAutor[clarice[1]]).toBe('Clarice Lispector 1977');
    });

    it('não agrupa livros sem autor de mesmo título', async () => {
      // Agrupados, o mais recente viria primeiro; separados, a ordem é pelo id.
      await inserirLivroOficial(pool, novoIsbn(), 'Poemas', {
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        ano: 2010,
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Poemas', {
        id: '00000000-0000-4000-8000-000000000001',
        ano: 2000,
      });

      const { body } = await buscar({ q: 'poemas' });
      expect(
        body.itens.map((item: { anoPublicacao: number }) => item.anoPublicacao),
      ).toEqual([2000, 2010]);
    });

    it('um grupo que atravessa a fronteira da página continua na seguinte', async () => {
      const autora = await inserirAutor(pool, 'Cecília Meireles');
      for (const ano of [1950, 1990, 2020]) {
        await inserirLivroOficial(pool, novoIsbn(), 'Ou isto ou aquilo', {
          ano,
          autores: [autora],
        });
      }
      await inserirLivroOficial(pool, novoIsbn(), 'Isto é outro livro');

      const anos = async (page: number) =>
        (await buscar({ q: 'isto', page, limit: 2 })).body.itens.map(
          (item: { titulo: string; anoPublicacao: number | null }) =>
            `${item.titulo} ${item.anoPublicacao}`,
        );

      const todas = [...(await anos(1)), ...(await anos(2))];
      expect(todas).toHaveLength(4);
      expect(new Set(todas).size).toBe(4);
      const grupo = todas.filter((t: string) => t.startsWith('Ou isto'));
      expect(grupo).toEqual([
        'Ou isto ou aquilo 2020',
        'Ou isto ou aquilo 1990',
        'Ou isto ou aquilo 1950',
      ]);
      const posicoes = todas
        .map((t: string, i: number) => (t.startsWith('Ou isto') ? i : -1))
        .filter((i: number) => i >= 0);
      expect(posicoes[2] - posicoes[0]).toBe(2);
    });
  });

  describe('validação', () => {
    it.each([
      [{}, 'q'],
      [{ q: '   ' }, 'q'],
      [{ q: 'a', limit: 51 }, 'limit'],
      [{ q: 'a', page: 0 }, 'page'],
      [{ q: 'a', page: '1000000000000000000' }, 'page'],
      [{ assunto: 'nao-e-uuid' }, 'assunto'],
      [{ q: 'a', ordem: 'titulo' }, 'ordem'],
      [{ autor: '  ' }, 'autor'],
      [{ ano: 'dois mil' }, 'ano'],
      [{ paginasMin: 0 }, 'paginasMin'],
      [{ paginasMin: 200, paginasMax: 100 }, 'paginasMax'],
    ])(
      '%j → 400 no campo %s',
      async (query: Record<string, string | number>, campo) => {
        const resposta = await buscar(query);
        expect(resposta.status).toBe(400);
        expect(resposta.body.codigo).toBe('REQUISICAO_INVALIDA');
        expect(
          resposta.body.campos.map((c: { campo: string }) => c.campo),
        ).toContain(campo);
      },
    );

    it('parâmetro fora do contrato responde em pt-BR', async () => {
      const resposta = await buscar({ q: 'a', ordem: 'titulo' });
      expect(resposta.body.campos).toContainEqual({
        campo: 'ordem',
        mensagem: 'Este campo não é aceito.',
      });
    });
  });
});
