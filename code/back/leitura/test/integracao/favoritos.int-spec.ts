import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil } from './massa';

interface ItemEstante {
  livroId: string;
  status: string;
  favorito?: boolean;
}

interface PaginaEstante {
  itens: ItemEstante[];
  paginacao: { totalItens: number };
  totalFavoritos?: number;
}

describe('favoritos e busca na estante (integração)', () => {
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

  function escrever(
    metodo: 'put' | 'delete' | 'post',
    usuarioId: string,
    caminho: string,
    chave: string = randomUUID(),
  ) {
    return request(app.getHttpServer())
      [metodo](caminho)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`)
      .set('Idempotency-Key', chave);
  }

  function get(usuarioId: string, caminho: string) {
    return request(app.getHttpServer())
      .get(caminho)
      .set('Authorization', `Bearer ${tokenDe(usuarioId)}`);
  }

  async function estante(
    usuarioId: string,
    consulta = '',
  ): Promise<PaginaEstante> {
    const res = await get(usuarioId, `/estante${consulta}`).expect(200);
    return res.body as PaginaEstante;
  }

  describe('marcar e desmarcar', () => {
    it('é idempotente e não duplica a relação', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);

      const primeira = await escrever(
        'put',
        usuario,
        `/livros/${livroId}/favorito`,
      ).expect(200);
      expect(primeira.body).toEqual({
        livroId,
        favorito: true,
        favoritadoEm: expect.any(String),
      });
      const segunda = await escrever(
        'put',
        usuario,
        `/livros/${livroId}/favorito`,
      ).expect(200);
      expect(segunda.body).toEqual(primeira.body);
      expect(await contar(pool, 'leitura.favorito')).toBe(1);

      await escrever('delete', usuario, `/livros/${livroId}/favorito`).expect(
        204,
      );
      await escrever('delete', usuario, `/livros/${livroId}/favorito`).expect(
        204,
      );
      expect(await contar(pool, 'leitura.favorito')).toBe(0);

      const consulta = await get(usuario, `/livros/${livroId}/favorito`).expect(
        200,
      );
      expect(consulta.body).toEqual({
        livroId,
        favorito: false,
        favoritadoEm: null,
      });
    });

    it('reenviar a mesma chave repete a resposta sem refazer o efeito', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);
      const chave = randomUUID();

      const original = await escrever(
        'put',
        usuario,
        `/livros/${livroId}/favorito`,
        chave,
      ).expect(200);
      await escrever('delete', usuario, `/livros/${livroId}/favorito`).expect(
        204,
      );
      const repetida = await escrever(
        'put',
        usuario,
        `/livros/${livroId}/favorito`,
        chave,
      ).expect(200);

      expect(repetida.body).toEqual(original.body);
      expect(await contar(pool, 'leitura.favorito')).toBe(0);
    });

    it('recusa livro pessoal de outra pessoa e livro inativo', async () => {
      const usuario = novoUsuario();
      const pessoalDeOutra = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: novoUsuario(),
      });
      const inativo = await inserirLivro(pool, { ativo: false });
      const meuPessoal = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: usuario,
      });

      await escrever(
        'put',
        usuario,
        `/livros/${pessoalDeOutra}/favorito`,
      ).expect(403);
      await escrever('put', usuario, `/livros/${inativo}/favorito`).expect(404);
      await escrever('put', usuario, `/livros/${meuPessoal}/favorito`).expect(
        200,
      );
      expect(await contar(pool, 'leitura.favorito')).toBe(1);
    });

    it('favoritar fora da estante não cria vínculo nem leitura', async () => {
      const usuario = novoUsuario();
      const livroId = await inserirLivro(pool);

      await escrever('put', usuario, `/livros/${livroId}/favorito`).expect(200);

      expect(await contar(pool, 'leitura.estante')).toBe(0);
      expect(await contar(pool, 'leitura.leitura')).toBe(0);
      await get(usuario, `/estante/${livroId}`).expect(404);
    });
  });

  describe('GET /me/favoritos', () => {
    it('lista dentro e fora da estante, só do próprio leitor', async () => {
      const usuario = novoUsuario();
      const outra = novoUsuario();
      const naEstante = await inserirLivro(pool, { titulo: 'Na Estante' });
      const fora = await inserirLivro(pool, { titulo: 'Fora' });
      await escrever('post', usuario, '/estante')
        .send({ livroId: naEstante })
        .expect(201);
      await escrever('put', usuario, `/livros/${naEstante}/favorito`).expect(
        200,
      );
      await escrever('put', usuario, `/livros/${fora}/favorito`).expect(200);

      const res = await get(usuario, '/me/favoritos').expect(200);
      expect(res.body).toMatchObject({
        itens: [
          {
            livro: { id: fora, titulo: 'Fora', tipo: 'oficial' },
            status: null,
          },
          { livro: { id: naEstante }, status: 'QUERO_LER' },
        ],
        paginacao: { page: 1, totalItens: 2, totalPaginas: 1 },
      });

      const daOutra = await get(outra, '/me/favoritos').expect(200);
      expect((daOutra.body as { itens: unknown[] }).itens).toEqual([]);
    });
  });

  describe('estante', () => {
    it('marca o favorito no item e conta favoritos de dentro e de fora', async () => {
      const usuario = novoUsuario();
      const favorito = await inserirLivro(pool);
      const comum = await inserirLivro(pool, { titulo: 'Comum' });
      const fora = await inserirLivro(pool, { titulo: 'Fora' });
      for (const livroId of [favorito, comum]) {
        await escrever('post', usuario, '/estante')
          .send({ livroId })
          .expect(201);
      }
      await escrever('put', usuario, `/livros/${favorito}/favorito`).expect(
        200,
      );
      await escrever('put', usuario, `/livros/${fora}/favorito`).expect(200);

      const pagina = await estante(usuario);
      const porLivro = new Map(
        pagina.itens.map((item) => [item.livroId, item.favorito]),
      );
      expect(porLivro).toEqual(
        new Map([
          [favorito, true],
          [comum, false],
        ]),
      );
      expect(pagina.totalFavoritos).toBe(2);
    });

    it('busca por título ou autor, combinada com o status', async () => {
      const usuario = novoUsuario();
      await inserirPerfil(pool, { id: usuario });
      const torto = await inserirLivro(pool, {
        titulo: 'Torto Arado',
        autor: 'Itamar Vieira Junior',
      });
      const salvar = await inserirLivro(pool, {
        titulo: 'Salvar o Fogo',
        autor: 'Itamar Vieira Junior',
      });
      const outro = await inserirLivro(pool, {
        titulo: '100% Real',
        autor: 'Outra Autora',
      });
      for (const livroId of [torto, salvar, outro]) {
        await escrever('post', usuario, '/estante')
          .send({ livroId })
          .expect(201);
      }
      await escrever('post', usuario, '/leituras')
        .send({ livroId: salvar })
        .expect(201);

      const porTitulo = await estante(usuario, '?q=TORTO');
      expect(porTitulo.itens.map((item) => item.livroId)).toEqual([torto]);
      expect(porTitulo.paginacao.totalItens).toBe(1);

      const porAutor = await estante(usuario, '?q=itamar');
      expect(porAutor.itens).toHaveLength(2);

      const comStatus = await estante(usuario, '?q=itamar&status=LENDO');
      expect(comStatus.itens.map((item) => item.livroId)).toEqual([salvar]);

      const literal = await estante(usuario, '?q=%25');
      expect(literal.itens.map((item) => item.livroId)).toEqual([outro]);

      const sublinhado = await estante(usuario, '?q=_');
      expect(sublinhado.itens).toEqual([]);
    });

    it('a estante de outro perfil não revela favoritos', async () => {
      const dona = novoUsuario();
      const livroId = await inserirLivro(pool);
      await escrever('post', dona, '/estante').send({ livroId }).expect(201);
      await escrever('put', dona, `/livros/${livroId}/favorito`).expect(200);

      const res = await get(dona, `/perfis/${dona}/estante`).expect(200);
      const pagina = res.body as PaginaEstante;
      expect(pagina.itens[0]).not.toHaveProperty('favorito');
      expect(pagina).not.toHaveProperty('totalFavoritos');
    });
  });
});
