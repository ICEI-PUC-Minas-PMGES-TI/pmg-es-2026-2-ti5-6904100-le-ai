import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import {
  inserirAssunto,
  inserirAutor,
  inserirLivroOficial,
  isbn,
} from './massa';

const FORA_DA_LISTA = 'Escolha os assuntos da lista do Lê Ai.';
const INEXISTENTE =
  'Um dos assuntos escolhidos não está mais na lista do Lê Ai. Revise e salve de novo.';

/**
 * `assuntos[]` no livro pessoal (RF-ACV-22, F-ACV-OPC) contra Postgres real:
 * validação contra o conjunto curado, substituição, idempotência com a lista em
 * outra ordem, propriedade, leitura em modo consulta e o isolamento do livro
 * pessoal **criado pela API com assuntos** (RN-03, RNF-SEC-06).
 */
describe('assuntos do livro pessoal (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let romance: string;
  let fantasia: string;
  let historia: string;

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
    romance = await inserirAssunto(pool, 'Romance', 'romance');
    fantasia = await inserirAssunto(pool, 'Fantasia', 'fantasia');
    historia = await inserirAssunto(
      pool,
      'História e Memórias',
      'historia-e-memorias',
    );
  });

  const http = () => request(app.getHttpServer());
  const como = (usuario: string, chave: string = randomUUID()) => ({
    Authorization: `Bearer ${tokenDe(usuario)}`,
    'Idempotency-Key': chave,
  });
  const nomes = (corpo: { assuntos: { nome: string }[] }) =>
    corpo.assuntos.map((a) => a.nome);

  function criar(dono: string, corpo: object = {}, chave?: string) {
    return http()
      .post('/livros/pessoal')
      .set(como(dono, chave))
      .send({
        titulo: 'Diário de bordo',
        autor: 'Ana Leitora',
        paginas: 120,
        ...corpo,
      });
  }

  const editar = (id: string, dono: string, corpo: object, chave?: string) =>
    http().patch(`/livros/pessoal/${id}`).set(como(dono, chave)).send(corpo);

  const vinculos = (livroId: string) =>
    contar(pool, 'acervo.livro_assunto', 'livro_id = $1', [livroId]);

  async function publicarNoFeed(
    dono: string,
    livroId: string,
    seguidor: string,
  ) {
    const atividadeId = randomUUID();
    await pool.query(
      `INSERT INTO social.v_atividade_livro_pessoal_v1 VALUES ($1, $2, $3)`,
      [atividadeId, dono, livroId],
    );
    await pool.query(
      `INSERT INTO identidade.v_perfil_referencia_v1
       VALUES ($1, 'ana', 'Ana Leitora', NULL, 'publico', false)`,
      [dono],
    );
    await pool.query(
      `INSERT INTO identidade.v_seguimento_aceito_v1 VALUES ($1, $2)`,
      [seguidor, dono],
    );
    return atividadeId;
  }

  describe('criar', () => {
    it('grava os assuntos e devolve em ordem alfabética', async () => {
      const resposta = await criar(novoUsuario(), {
        assuntos: [romance, historia],
      });

      expect(resposta.status).toBe(201);
      expect(resposta.body.assuntos).toEqual([
        { id: historia, nome: 'História e Memórias' },
        { id: romance, nome: 'Romance' },
      ]);
      expect(await vinculos(resposta.body.id)).toBe(2);
    });

    it('sem assuntos continua como antes, com a lista vazia na resposta', async () => {
      const resposta = await criar(novoUsuario());

      expect(resposta.status).toBe(201);
      expect(resposta.body.assuntos).toEqual([]);
      expect(await vinculos(resposta.body.id)).toBe(0);
    });

    it('ignora repetidos, inclusive o mesmo id em maiúsculas', async () => {
      const resposta = await criar(novoUsuario(), {
        assuntos: [romance, romance.toUpperCase(), fantasia],
      });

      expect(resposta.status).toBe(201);
      expect(nomes(resposta.body)).toEqual(['Fantasia', 'Romance']);
    });

    it('aceita mais de 5 (o aviso é só do cliente) e recusa mais de 100', async () => {
      const ids: string[] = [romance, fantasia, historia];
      for (let i = 0; i < 4; i++) {
        ids.push(await inserirAssunto(pool, `Extra ${i}`, `extra-${i}`));
      }
      const aceito = await criar(novoUsuario(), { assuntos: ids });
      expect(aceito.status).toBe(201);
      expect(aceito.body.assuntos).toHaveLength(7);

      const demais = Array.from({ length: 101 }, () => randomUUID());
      const recusado = await criar(novoUsuario(), { assuntos: demais });
      expect(recusado.status).toBe(400);
      expect(recusado.body.campos).toEqual([
        { campo: 'assuntos', mensagem: 'Escolha no máximo 100 assuntos.' },
      ]);
    });
  });

  describe('rejeições (RN-21.4)', () => {
    it('id fora do conjunto curado: 400 no campo e nada gravado', async () => {
      const dono = novoUsuario();
      const resposta = await criar(dono, { assuntos: [romance, randomUUID()] });

      expect(resposta.status).toBe(400);
      expect(resposta.body.codigo).toBe('REQUISICAO_INVALIDA');
      expect(resposta.body.campos).toEqual([
        { campo: 'assuntos', mensagem: INEXISTENTE },
      ]);
      expect(await contar(pool, 'acervo.livro', 'dono_id = $1', [dono])).toBe(
        0,
      );
      expect(
        await contar(pool, 'acervo.idempotencia_acervo', 'subject_ref = $1', [
          dono,
        ]),
      ).toBe(0);
    });

    it.each([
      ['texto livre', ['Romance']],
      ['número', [42]],
      ['não-array', 'Romance'],
    ])('%s: 400 com a mensagem em pt-BR', async (_caso, assuntos) => {
      const resposta = await criar(novoUsuario(), { assuntos });

      expect(resposta.status).toBe(400);
      expect(resposta.body.campos).toEqual([
        { campo: 'assuntos', mensagem: FORA_DA_LISTA },
      ]);
    });
  });

  describe('editar', () => {
    it('substitui, preserva quando ausente e esvazia com [] e com null', async () => {
      const dono = novoUsuario();
      const { body } = await criar(dono, { assuntos: [romance] });

      const trocado = await editar(body.id, dono, {
        assuntos: [fantasia, historia],
      });
      expect(trocado.status).toBe(200);
      expect(nomes(trocado.body)).toEqual(['Fantasia', 'História e Memórias']);

      const soTitulo = await editar(body.id, dono, { titulo: 'Outro' });
      expect(nomes(soTitulo.body)).toEqual(['Fantasia', 'História e Memórias']);
      expect(await vinculos(body.id)).toBe(2);

      const vazio = await editar(body.id, dono, { assuntos: [] });
      expect(vazio.body.assuntos).toEqual([]);
      expect(await vinculos(body.id)).toBe(0);

      await editar(body.id, dono, { assuntos: [romance] });
      const nulo = await editar(body.id, dono, { assuntos: null });
      expect(nulo.status).toBe(200);
      expect(nulo.body.assuntos).toEqual([]);
      expect(await vinculos(body.id)).toBe(0);
    });

    it('id inexistente no PATCH não muda nada', async () => {
      const dono = novoUsuario();
      const { body } = await criar(dono, { assuntos: [romance] });

      const resposta = await editar(body.id, dono, {
        titulo: 'Não deve gravar',
        assuntos: [fantasia, randomUUID()],
      });

      expect(resposta.status).toBe(400);
      expect(resposta.body.campos[0].campo).toBe('assuntos');
      const atual = await http()
        .get(`/livros/pessoal/${body.id}`)
        .set(como(dono));
      expect(atual.body.titulo).toBe('Diário de bordo');
      expect(nomes(atual.body)).toEqual(['Romance']);
    });

    it('livro inativo: 404', async () => {
      const dono = novoUsuario();
      const { body } = await criar(dono);
      await pool.query(`UPDATE acervo.livro SET ativo = false WHERE id = $1`, [
        body.id,
      ]);

      const resposta = await editar(body.id, dono, { assuntos: [romance] });
      expect(resposta.status).toBe(404);
    });
  });

  describe('idempotência', () => {
    it('a mesma chave com a lista em outra ordem ou caixa é replay, não 409', async () => {
      const dono = novoUsuario();
      const chave = randomUUID();
      const primeira = await criar(
        dono,
        { assuntos: [romance, fantasia] },
        chave,
      );
      const outraOrdem = await criar(
        dono,
        { assuntos: [fantasia, romance] },
        chave,
      );
      const outraCaixa = await criar(
        dono,
        { assuntos: [fantasia.toUpperCase(), romance] },
        chave,
      );

      expect(primeira.status).toBe(201);
      expect(outraOrdem.status).toBe(201);
      expect(outraCaixa.status).toBe(201);
      expect(outraOrdem.body.id).toBe(primeira.body.id);
      expect(outraCaixa.body.id).toBe(primeira.body.id);
      expect(await contar(pool, 'acervo.livro', 'dono_id = $1', [dono])).toBe(
        1,
      );

      const outroConjunto = await criar(dono, { assuntos: [romance] }, chave);
      expect(outroConjunto.status).toBe(409);
    });
  });

  describe('propriedade e leitura (RN-03, RN-15)', () => {
    it('terceiro que vê o livro pelo feed recebe os assuntos e não consegue editá-los', async () => {
      const dono = novoUsuario();
      const seguidor = novoUsuario();
      const { body } = await criar(dono, { assuntos: [romance] });
      const atividade = await publicarNoFeed(dono, body.id, seguidor);

      const lido = await http()
        .get(`/livros/pessoal/${body.id}`)
        .query({ via: 'feed', referenciaId: atividade })
        .set(como(seguidor));
      expect(lido.status).toBe(200);
      expect(lido.body.modoConsulta).toBe(true);
      expect(nomes(lido.body)).toEqual(['Romance']);

      const escrita = await editar(body.id, seguidor, { assuntos: [fantasia] });
      expect(escrita.status).toBe(403);
      expect(await vinculos(body.id)).toBe(1);
      const { rows } = await pool.query(
        `SELECT assunto_id FROM acervo.livro_assunto WHERE livro_id = $1`,
        [body.id],
      );
      expect(rows).toEqual([{ assunto_id: romance }]);
    });

    it('terceiro pela lista vê os assuntos; sem via, 403', async () => {
      const dono = novoUsuario();
      const outro = novoUsuario();
      const { body } = await criar(dono, { assuntos: [historia, romance] });
      const listaId = randomUUID();
      await pool.query(
        `INSERT INTO social.v_lista_livro_pessoal_v1 VALUES ($1, $2, $3)`,
        [listaId, dono, body.id],
      );
      await pool.query(
        `INSERT INTO identidade.v_perfil_referencia_v1
         VALUES ($1, 'ana', 'Ana Leitora', NULL, 'publico', false)`,
        [dono],
      );

      const pelaLista = await http()
        .get(`/livros/pessoal/${body.id}`)
        .query({ via: 'lista', referenciaId: listaId })
        .set(como(outro));
      expect(pelaLista.status).toBe(200);
      expect(nomes(pelaLista.body)).toEqual(['História e Memórias', 'Romance']);

      const semVia = await http()
        .get(`/livros/pessoal/${body.id}`)
        .set(como(outro));
      expect(semVia.status).toBe(403);
    });
  });

  describe('isolamento (RN-03, RNF-SEC-06)', () => {
    it('o livro pessoal com assunto não aparece em busca, filtro, contagem, página de autor nem na VIEW de recomendação', async () => {
      const leitor = novoUsuario();
      const autor = await inserirAutor(pool, 'Ana Leitora');
      await inserirLivroOficial(pool, isbn('978000000001'), 'Romance oficial', {
        assuntos: [romance],
        autores: [autor],
      });
      const assuntosAntes = await http().get('/assuntos').set(como(leitor));

      const { body } = await criar(novoUsuario(), {
        titulo: 'Romance pessoal',
        assuntos: [romance],
      });
      await pool.query(
        `INSERT INTO acervo.livro_autor (livro_id, autor_id) VALUES ($1, $2)`,
        [body.id, autor],
      );

      const buscar = (query: Record<string, string>) =>
        http().get('/livros').query(query).set(como(leitor));
      const porTexto = await buscar({ q: 'romance' });
      const porFiltro = await buscar({ assunto: romance });
      const titulos = (corpo: { itens: { titulo: string }[] }) =>
        corpo.itens.map((i) => i.titulo);

      expect(titulos(porTexto.body)).toEqual(['Romance oficial']);
      expect(titulos(porFiltro.body)).toEqual(['Romance oficial']);
      expect(porFiltro.body.totalItens).toBe(1);

      const pagina = await http().get(`/autores/${autor}`).set(como(leitor));
      expect(pagina.body.livros.totalItens).toBe(1);

      expect(
        await contar(pool, 'acervo.v_livro_recomendacao_v1', 'livro_id = $1', [
          body.id,
        ]),
      ).toBe(0);

      const assuntosDepois = await http().get('/assuntos').set(como(leitor));
      expect(assuntosDepois.body).toEqual(assuntosAntes.body);
    });
  });
});
