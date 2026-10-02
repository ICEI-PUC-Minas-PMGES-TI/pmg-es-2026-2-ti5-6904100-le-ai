import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import {
  inserirAssunto,
  inserirAutor,
  inserirEditora,
  inserirLivroOficial,
  inserirLivroPessoal,
  inserirSerie,
  isbn,
} from './massa';

/**
 * Página do livro oficial contra Postgres real: a forma de `LivroOficialDetalhe`,
 * o disparo da sinopse com a outbox na mesma transação e as regras de
 * reenfileiramento, e as resenhas filtradas por RN-08 nas VIEWs de contrato
 * (tabelas no fixture).
 */
describe('página do livro oficial (integração)', () => {
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
  const novoIsbn = () => isbn(`978100${String(++sequencia).padStart(6, '0')}`);

  const abrir = (id: string, usuario = leitor) =>
    request(app.getHttpServer())
      .get(`/livros/${id}`)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);

  const resenhas = (id: string, query: Record<string, string | number> = {}) =>
    request(app.getHttpServer())
      .get(`/livros/${id}/resenhas`)
      .query(query)
      .set('Authorization', `Bearer ${tokenDe(leitor)}`);

  async function sinopse(id: string) {
    const { rows } = await pool.query<{ sinopse_status: string }>(
      'SELECT sinopse_status FROM acervo.livro WHERE id = $1',
      [id],
    );
    return rows[0].sinopse_status;
  }

  async function definirSinopse(
    id: string,
    status: string,
    minutosAtras = 0,
    texto: string | null = null,
  ) {
    await pool.query(
      `UPDATE acervo.livro
          SET sinopse_status = $2, sinopse = $3,
              atualizado_em = now() - make_interval(mins => $4)
        WHERE id = $1`,
      [id, status, texto, minutosAtras],
    );
  }

  const outboxDaSinopse = (id: string) =>
    contar(pool, 'acervo.outbox_acervo', 'tipo = $1 AND chave_negocio = $2', [
      'livro.pagina_aberta',
      `livro:${id}:sinopse`,
    ]);

  /** Perfil na VIEW de identidade; privacidade `publico` ou `privado`. */
  async function perfil(id: string, nome: string, privacidade = 'publico') {
    await pool.query(
      `INSERT INTO identidade.v_perfil_referencia_v1
       VALUES ($1, $2, $3, NULL, $4, false)`,
      [id, nome.toLowerCase().replace(/\s/g, '.'), nome, privacidade],
    );
  }

  async function resenha(
    livroId: string,
    autorId: string,
    texto: string,
    criadoEm = 'now()',
    spoiler = false,
  ) {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO leitura.v_resenha_publicacao_v1
       VALUES ($1, $2, $3, $4, $5, ${criadoEm}, ${criadoEm}, 0, 0)`,
      [id, autorId, livroId, texto, spoiler],
    );
    return id;
  }

  describe('GET /livros/{id}', () => {
    it('abre na hora com a forma exata e pede a sinopse na primeira abertura', async () => {
      const autor = await inserirAutor(pool, 'Itamar Vieira Junior');
      const alvo = novoIsbn();
      const id = await inserirLivroOficial(pool, alvo, 'Torto arado', {
        ano: 2019,
        autores: [autor],
      });

      const resposta = await abrir(id);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        id,
        titulo: 'Torto arado',
        autores: [{ id: autor, nome: 'Itamar Vieira Junior' }],
        editora: null,
        editoraId: null,
        anoPublicacao: 2019,
        paginas: 200,
        capa: {
          url: 'https://covers.openlibrary.org/b/id/1-L.jpg',
          origem: 'externa',
        },
        assuntos: [],
        serie: null,
        isbn: alvo,
        sinopse: { status: 'pendente', texto: null },
        resenhas: { itens: [], limit: 10, proximoCursor: null },
      });
      expect(await sinopse(id)).toBe('pendente');
      expect(await outboxDaSinopse(id)).toBe(1);
      const { rows } = await pool.query<{ payload: unknown }>(
        'SELECT payload FROM acervo.outbox_acervo',
      );
      expect(rows[0].payload).toEqual({ livroId: id });
    });

    it('a ficha traz editora e série com número, para os links (F-ACV-DESCOBERTA)', async () => {
      const editora = await inserirEditora(pool, 'Rocco');
      const serie = await inserirSerie(pool, 'Harry Potter');
      const id = await inserirLivroOficial(
        pool,
        novoIsbn(),
        'Harry Potter e a câmara secreta',
        { editoraId: editora, serieId: serie, numeroSerie: 2 },
      );
      const semNumero = await inserirLivroOficial(
        pool,
        novoIsbn(),
        'Animais fantásticos',
        { serieId: serie },
      );

      const { body } = await abrir(id);

      expect(body).toMatchObject({
        editora: 'Rocco',
        editoraId: editora,
        serie: { id: serie, nome: 'Harry Potter', numero: 2 },
      });
      expect((await abrir(semNumero)).body.serie).toEqual({
        id: serie,
        nome: 'Harry Potter',
        numero: null,
      });
    });

    it('cada assunto da página filtra a busca pelo próprio id (RF-ACV-21)', async () => {
      const romance = await inserirAssunto(pool, 'Romance', 'romance');
      const id = await inserirLivroOficial(pool, novoIsbn(), 'Vidas secas', {
        assuntos: [romance],
      });
      await inserirLivroOficial(pool, novoIsbn(), 'Outro livro');

      const { body } = await abrir(id);
      const [assunto] = body.assuntos as { id: string; nome: string }[];
      const busca = await request(app.getHttpServer())
        .get('/livros')
        .query({ assunto: assunto.id })
        .set('Authorization', `Bearer ${tokenDe(leitor)}`);

      expect(assunto).toEqual({ id: romance, nome: 'Romance' });
      expect(busca.status).toBe(200);
      expect(busca.body.itens.map((l: { id: string }) => l.id)).toEqual([id]);
    });

    it('reabrir não gera outro evento, nem em aberturas concorrentes', async () => {
      const id = await inserirLivroOficial(pool, novoIsbn(), 'Vidas secas');

      await Promise.all([abrir(id), abrir(id), abrir(id), abrir(id)]);
      await abrir(id);

      expect(await outboxDaSinopse(id)).toBe(1);
    });

    it('sinopse disponível vem com o texto; ausente, sem erro e sem novo pedido', async () => {
      const disponivel = await inserirLivroOficial(
        pool,
        novoIsbn(),
        'Com sinopse',
      );
      await definirSinopse(
        disponivel,
        'disponivel',
        0,
        'Duas irmãs no sertão.',
      );
      const ausente = await inserirLivroOficial(
        pool,
        novoIsbn(),
        'Sem sinopse',
      );
      await definirSinopse(ausente, 'ausente', 60 * 24);

      expect((await abrir(disponivel)).body.sinopse).toEqual({
        status: 'disponivel',
        texto: 'Duas irmãs no sertão.',
      });
      expect((await abrir(ausente)).body.sinopse).toEqual({
        status: 'ausente',
        texto: null,
      });
      expect(await contar(pool, 'acervo.outbox_acervo')).toBe(0);
    });

    it('reenfileira falha transitória só depois de 10 minutos', async () => {
      const id = await inserirLivroOficial(
        pool,
        novoIsbn(),
        'Fonte fora do ar',
      );

      await definirSinopse(id, 'falha_transitoria', 5);
      expect((await abrir(id)).body.sinopse.status).toBe('falha_transitoria');
      expect(await outboxDaSinopse(id)).toBe(0);

      await definirSinopse(id, 'falha_transitoria', 11);
      expect((await abrir(id)).body.sinopse.status).toBe('pendente');
      expect(await sinopse(id)).toBe('pendente');
      expect(await outboxDaSinopse(id)).toBe(1);
    });

    it('resgata pendente órfão só depois de 15 minutos', async () => {
      const id = await inserirLivroOficial(
        pool,
        novoIsbn(),
        'Mensagem perdida',
      );

      await definirSinopse(id, 'pendente', 10);
      await abrir(id);
      expect(await outboxDaSinopse(id)).toBe(0);

      await definirSinopse(id, 'pendente', 16);
      await abrir(id);
      expect(await outboxDaSinopse(id)).toBe(1);
    });

    it('livro pessoal, inexistente e id inválido não abrem aqui', async () => {
      const pessoal = await inserirLivroPessoal(pool, leitor, 'Meu caderno');

      expect((await abrir(pessoal)).status).toBe(404);
      expect((await abrir(randomUUID())).status).toBe(404);
      const invalido = await abrir('nao-e-uuid');
      expect(invalido.status).toBe(400);
      expect(invalido.body.campos).toEqual([
        { campo: 'id', mensagem: 'Informe um identificador válido.' },
      ]);
      expect(await contar(pool, 'acervo.outbox_acervo')).toBe(0);
    });

    it('abrir páginas não gasta o limite do cadastro por ISBN', async () => {
      const id = await inserirLivroOficial(pool, novoIsbn(), 'Muito visitado');
      for (let i = 0; i < 11; i++) {
        expect((await abrir(id)).status).toBe(200);
      }

      const cadastro = await request(app.getHttpServer())
        .post('/livros/oficial')
        .set('Authorization', `Bearer ${tokenDe(leitor)}`)
        .set('Idempotency-Key', randomUUID())
        .send({ isbn: novoIsbn() });

      expect(cadastro.status).toBe(202);
    });
  });

  describe('resenhas e RN-08', () => {
    it('mostra público e privado seguido; esconde privado não seguido, ausente da VIEW e a do próprio leitor', async () => {
      const id = await inserirLivroOficial(pool, novoIsbn(), 'Torto arado');
      const [publico, seguido, naoSeguido, suspenso] = [
        novoUsuario(),
        novoUsuario(),
        novoUsuario(),
        novoUsuario(),
      ];
      await perfil(publico, 'Marina Antunes');
      await perfil(seguido, 'Rafael Bittencourt', 'privado');
      await perfil(naoSeguido, 'Clara Menezes', 'privado');
      await perfil(leitor, 'Leitor Atual');
      await pool.query(
        'INSERT INTO identidade.v_seguimento_aceito_v1 VALUES ($1, $2)',
        [leitor, seguido],
      );
      await resenha(id, publico, 'Pública.', `now() - interval '1 minute'`);
      await resenha(
        id,
        seguido,
        'Do seguido.',
        `now() - interval '2 minutes'`,
        true,
      );
      await resenha(id, naoSeguido, 'Privada.');
      await resenha(id, suspenso, 'Sem perfil na VIEW.');
      await resenha(id, leitor, 'A minha.');

      const pagina = (await abrir(id)).body.resenhas;

      expect(pagina.itens.map((r: { texto: string }) => r.texto)).toEqual([
        'Pública.',
        'Do seguido.',
      ]);
      expect(pagina.itens[1]).toMatchObject({
        autorId: seguido,
        autorNome: 'Rafael Bittencourt',
        autorAvatarUrl: null,
        spoiler: true,
      });
      expect((await resenhas(id)).body.itens).toHaveLength(2);
    });

    it('pagina por cursor sem pular resenhas separadas por microssegundos', async () => {
      const id = await inserirLivroOficial(pool, novoIsbn(), 'Muitas resenhas');
      const autores = [novoUsuario(), novoUsuario(), novoUsuario()];
      for (const [i, autor] of autores.entries()) {
        await perfil(autor, `Autor ${i}`);
      }
      await resenha(id, autores[0], 'A', `'2026-09-20 10:00:00.000002+00'`);
      await resenha(id, autores[1], 'B', `'2026-09-20 10:00:00.000001+00'`);
      await resenha(id, autores[2], 'C', `'2026-09-19 10:00:00+00'`);

      const primeira = await resenhas(id, { limit: 1 });
      expect(primeira.body).toMatchObject({ limit: 1 });
      expect(
        primeira.body.itens.map((r: { texto: string }) => r.texto),
      ).toEqual(['A']);

      const segunda = await resenhas(id, {
        limit: 1,
        cursor: primeira.body.proximoCursor,
      });
      const terceira = await resenhas(id, {
        limit: 1,
        cursor: segunda.body.proximoCursor,
      });

      expect(segunda.body.itens.map((r: { texto: string }) => r.texto)).toEqual(
        ['B'],
      );
      expect(
        terceira.body.itens.map((r: { texto: string }) => r.texto),
      ).toEqual(['C']);
      expect(terceira.body.proximoCursor).toBeNull();
    });

    it('cursor forjado, limite acima de 50 e livro pessoal são recusados', async () => {
      const id = await inserirLivroOficial(pool, novoIsbn(), 'Livro');
      const pessoal = await inserirLivroPessoal(pool, leitor, 'Meu caderno');

      const forjado = await resenhas(id, { cursor: 'nao-e-cursor' });
      expect(forjado.status).toBe(400);
      expect(forjado.body.campos[0].campo).toBe('cursor');
      expect((await resenhas(id, { limit: 51 })).status).toBe(400);
      expect((await resenhas(pessoal)).status).toBe(404);
    });
  });
});
