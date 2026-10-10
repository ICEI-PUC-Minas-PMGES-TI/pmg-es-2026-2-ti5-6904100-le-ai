import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { inserirLivro, inserirPerfil, seguir } from './massa';

/**
 * Frases e trechos (F-AVA-2, RF-AVA-06/07, RN-11): `GET`/`POST /livros/{id}/frases` e
 * `DELETE /frases/{id}` contra Postgres real. Texto de até 500 caracteres, página de 1 ao total
 * do livro, no máximo 10 por leitor e livro, RN-08 por autor e livro pessoal só do dono.
 */
describe('frases (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let leitora: string;
  let outra: string;

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
    leitora = novoUsuario();
    outra = novoUsuario();
    await inserirPerfil(pool, {
      id: leitora,
      username: 'leitora',
      nomeExibicao: 'Leitora',
    });
    await inserirPerfil(pool, {
      id: outra,
      username: 'outra',
      nomeExibicao: 'Outra Leitora',
    });
  });

  const http = () => request(app.getHttpServer());
  const cadastrar = (
    livroId: string,
    corpo: Record<string, unknown>,
    opcoes: { quem?: string; chave?: string } = {},
  ) =>
    http()
      .post(`/livros/${livroId}/frases`)
      .set('Authorization', `Bearer ${tokenDe(opcoes.quem ?? leitora)}`)
      .set('Idempotency-Key', opcoes.chave ?? randomUUID())
      .send(corpo);
  const listar = (livroId: string, quem = leitora, consulta = '') =>
    http()
      .get(`/livros/${livroId}/frases${consulta}`)
      .set('Authorization', `Bearer ${tokenDe(quem)}`);
  const excluir = (fraseId: string, quem = leitora) =>
    http()
      .delete(`/frases/${fraseId}`)
      .set('Authorization', `Bearer ${tokenDe(quem)}`)
      .set('Idempotency-Key', randomUUID());

  describe('cadastrar', () => {
    it('guarda a frase com a página e devolve a forma do contrato', async () => {
      const livroId = await inserirLivro(pool, { paginas: 264 });

      const resposta = await cadastrar(livroId, {
        texto: 'Sem saber, eu já era da terra.',
        pagina: 57,
      });

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        livroId,
        texto: 'Sem saber, eu já era da terra.',
        pagina: 57,
        minha: true,
        autor: { id: leitora, username: 'leitora', nome: 'Leitora' },
      });
      expect(await contar(pool, 'leitura.frase')).toBe(1);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
    });

    it('página fora do livro, zero ou ausente é recusada', async () => {
      const livroId = await inserirLivro(pool, { paginas: 264 });

      const acima = await cadastrar(livroId, { texto: 'Trecho.', pagina: 265 });
      expect(acima.status).toBe(422);
      expect(acima.body.campos).toEqual([
        {
          campo: 'pagina',
          mensagem: 'O livro tem 264 páginas. Informe uma página até 264.',
        },
      ]);
      expect(
        (await cadastrar(livroId, { texto: 'Trecho.', pagina: 0 })).status,
      ).toBe(422);
      expect((await cadastrar(livroId, { texto: 'Trecho.' })).status).toBe(400);
      expect(
        (await cadastrar(livroId, { texto: 'Trecho.', pagina: 2.5 })).status,
      ).toBe(400);
    });

    it('texto conta code points: 500 emojis passam, 501 não; só espaços é 422', async () => {
      const livroId = await inserirLivro(pool);

      expect(
        (await cadastrar(livroId, { texto: '📚'.repeat(500), pagina: 1 }))
          .status,
      ).toBe(201);
      const longo = await cadastrar(livroId, {
        texto: 'a'.repeat(501),
        pagina: 1,
      });
      expect(longo.status).toBe(422);
      expect(longo.body.campos[0].mensagem).toBe(
        'O trecho passou do limite em 1 caractere.',
      );
      expect(
        (await cadastrar(livroId, { texto: ' \u200B ', pagina: 1 })).status,
      ).toBe(422);
    });

    it('a 11ª frase do leitor no livro é 422 LIMITE_DE_FRASES', async () => {
      const livroId = await inserirLivro(pool);
      for (let i = 1; i <= 10; i += 1) {
        expect(
          (await cadastrar(livroId, { texto: `Trecho ${i}.`, pagina: i }))
            .status,
        ).toBe(201);
      }

      const resposta = await cadastrar(livroId, {
        texto: 'Mais um.',
        pagina: 11,
      });

      expect(resposta.status).toBe(422);
      expect(resposta.body.codigo).toBe('LIMITE_DE_FRASES');
      // A cota é por leitor: outra pessoa ainda guarda no mesmo livro.
      expect(
        (
          await cadastrar(
            livroId,
            { texto: 'Meu.', pagina: 1 },
            { quem: outra },
          )
        ).status,
      ).toBe(201);
    });

    it('com 9 guardadas, duas simultâneas deixam só uma passar', async () => {
      const livroId = await inserirLivro(pool);
      for (let i = 1; i <= 9; i += 1) {
        await cadastrar(livroId, { texto: `Trecho ${i}.`, pagina: i });
      }

      const respostas = await Promise.all([
        cadastrar(livroId, { texto: 'A.', pagina: 10 }),
        cadastrar(livroId, { texto: 'B.', pagina: 10 }),
      ]);

      expect(respostas.map((r) => r.status).sort()).toEqual([201, 422]);
      expect(await contar(pool, 'leitura.frase')).toBe(10);
    });

    it('livro pessoal de outra pessoa, inativo ou inexistente é 404; conta sem perfil é 403', async () => {
      const pessoalDaOutra = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: outra,
      });
      const inativo = await inserirLivro(pool, { ativo: false });
      for (const livroId of [pessoalDaOutra, inativo, randomUUID()]) {
        expect(
          (await cadastrar(livroId, { texto: 'X.', pagina: 1 })).status,
        ).toBe(404);
      }
      const livroId = await inserirLivro(pool);
      expect(
        (
          await cadastrar(
            livroId,
            { texto: 'X.', pagina: 1 },
            { quem: novoUsuario() },
          )
        ).status,
      ).toBe(403);
    });

    it('mesma chave repete a resposta; com outro corpo é 409', async () => {
      const livroId = await inserirLivro(pool);
      const chave = randomUUID();

      const primeira = await cadastrar(
        livroId,
        { texto: 'Trecho.', pagina: 3 },
        { chave },
      );
      const repetida = await cadastrar(
        livroId,
        { texto: 'Trecho.', pagina: 3 },
        { chave },
      );
      const outroCorpo = await cadastrar(
        livroId,
        { texto: 'Outro.', pagina: 3 },
        { chave },
      );

      expect(repetida.status).toBe(201);
      expect(repetida.body).toEqual(primeira.body);
      expect(outroCorpo.status).toBe(409);
      expect(await contar(pool, 'leitura.frase')).toBe(1);
    });
  });

  describe('listar', () => {
    it('mostra as frases de todos, mais recentes primeiro, com a cota de quem pede', async () => {
      const livroId = await inserirLivro(pool);
      await cadastrar(
        livroId,
        { texto: 'Da outra.', pagina: 5 },
        { quem: outra },
      );
      await cadastrar(livroId, { texto: 'Minha.', pagina: 9 });

      const resposta = await listar(livroId);

      expect(resposta.status).toBe(200);
      expect(
        resposta.body.itens.map((f: { texto: string }) => f.texto),
      ).toEqual(['Minha.', 'Da outra.']);
      expect(
        resposta.body.itens.map((f: { minha: boolean }) => f.minha),
      ).toEqual([true, false]);
      expect(resposta.body).toMatchObject({
        minhasFrases: 1,
        limitePorLivro: 10,
        paginacao: { page: 1, limite: 20, totalItens: 2, totalPaginas: 1 },
      });
    });

    it('frase de autor privado só aparece para quem o segue (RN-08)', async () => {
      const livroId = await inserirLivro(pool);
      await pool.query(
        `UPDATE identidade.v_perfil_referencia_v1 SET privacidade = 'privado' WHERE id = $1`,
        [outra],
      );
      await cadastrar(
        livroId,
        { texto: 'Privada.', pagina: 1 },
        { quem: outra },
      );

      expect((await listar(livroId)).body.itens).toHaveLength(0);
      expect((await listar(livroId, outra)).body.itens).toHaveLength(1);
      await seguir(pool, leitora, outra);
      expect((await listar(livroId)).body.itens).toHaveLength(1);
    });

    it('conta fora da VIEW de perfil some da lista', async () => {
      const livroId = await inserirLivro(pool);
      await cadastrar(livroId, { texto: 'Some.', pagina: 1 }, { quem: outra });
      await pool.query(
        'DELETE FROM identidade.v_perfil_referencia_v1 WHERE id = $1',
        [outra],
      );

      expect((await listar(livroId)).body.itens).toHaveLength(0);
    });

    it('livro pessoal: só o dono lista', async () => {
      const pessoal = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: leitora,
      });
      await cadastrar(pessoal, { texto: 'Do meu caderno.', pagina: 2 });

      expect((await listar(pessoal)).body.itens).toHaveLength(1);
      expect((await listar(pessoal, outra)).status).toBe(404);
    });

    it('pagina com teto de 50', async () => {
      const livroId = await inserirLivro(pool);
      for (let i = 1; i <= 3; i += 1) {
        await cadastrar(livroId, { texto: `T${i}.`, pagina: i });
      }

      const primeira = await listar(livroId, leitora, '?page=1&limite=2');
      const segunda = await listar(livroId, leitora, '?page=2&limite=2');

      expect(primeira.body.itens).toHaveLength(2);
      expect(segunda.body.itens.map((f: { texto: string }) => f.texto)).toEqual(
        ['T1.'],
      );
      expect(primeira.body.paginacao.totalPaginas).toBe(2);
      expect((await listar(livroId, leitora, '?limite=51')).status).toBe(400);
    });
  });

  describe('excluir', () => {
    it('exclui a própria; a de outra pessoa ou inexistente é 404', async () => {
      const livroId = await inserirLivro(pool);
      const minha = await cadastrar(livroId, { texto: 'Minha.', pagina: 1 });
      const daOutra = await cadastrar(
        livroId,
        { texto: 'Dela.', pagina: 1 },
        { quem: outra },
      );

      expect((await excluir(daOutra.body.id)).status).toBe(404);
      expect((await excluir(randomUUID())).status).toBe(404);
      expect((await excluir(minha.body.id)).status).toBe(204);
      expect(await contar(pool, 'leitura.frase')).toBe(1);
    });

    it('excluir libera a cota', async () => {
      const livroId = await inserirLivro(pool);
      const ids: string[] = [];
      for (let i = 1; i <= 10; i += 1) {
        ids.push(
          (await cadastrar(livroId, { texto: `T${i}.`, pagina: i })).body.id,
        );
      }

      await excluir(ids[0]);

      expect(
        (await cadastrar(livroId, { texto: 'Cabe de novo.', pagina: 1 }))
          .status,
      ).toBe(201);
    });
  });
});
