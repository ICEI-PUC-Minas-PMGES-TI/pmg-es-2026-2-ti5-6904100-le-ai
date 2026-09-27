import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { DRIZZLE, type DrizzleDB } from '../../src/db/drizzle.module';
import { AmqpPublisherService } from '../../src/messaging/amqp-publisher.service';
import { MessageValidator } from '../../src/messaging/message-validator';
import { EXCHANGES } from '../../src/messaging/messaging.constants';
import { OutboxDispatcherService } from '../../src/messaging/outbox-dispatcher.service';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { BrokerEmMemoria } from './broker-em-memoria';
import { inserirLivro, inserirPerfil } from './massa';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

interface LinhaDaOutbox {
  tipo: string;
  chave_negocio: string;
  payload: Record<string, unknown>;
}

/**
 * Resenha do leitor (F-AVA, RF-AVA-02..04, RN-07): `PUT`/`DELETE
 * /livros/{id}/resenha` contra Postgres real, com `resenha.publicada` só na
 * criação e `resenha.excluida` na exclusão física.
 */
describe('resenha (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let usuario: string;

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
    usuario = novoUsuario();
    await inserirPerfil(pool, {
      id: usuario,
      username: 'leitora',
      nomeExibicao: 'Leitora de Teste',
      avatarUrl: 'https://res.cloudinary.com/leai/image/upload/avatares/a.jpg',
    });
  });

  const http = () => request(app.getHttpServer());

  const salvar = (
    livroId: string,
    corpo: unknown,
    opcoes: { chave?: string; quem?: string } = {},
  ) =>
    http()
      .put(`/livros/${livroId}/resenha`)
      .set('Authorization', `Bearer ${tokenDe(opcoes.quem ?? usuario)}`)
      .set('Idempotency-Key', opcoes.chave ?? randomUUID())
      .send(corpo as object);

  const excluir = (livroId: string, chave = randomUUID()) =>
    http()
      .delete(`/livros/${livroId}/resenha`)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', chave);

  const eventos = async (tipo?: string): Promise<LinhaDaOutbox[]> => {
    const { rows } = await pool.query<LinhaDaOutbox>(
      `SELECT tipo, chave_negocio, payload FROM leitura.outbox_leitura
        WHERE $1::text IS NULL OR tipo = $1
        ORDER BY criado_em, event_id`,
      [tipo ?? null],
    );
    return rows;
  };

  describe('criação', () => {
    it('cria a resenha com a forma exata do contrato e publica resenha.publicada', async () => {
      const livroId = await inserirLivro(pool);

      const resposta = await salvar(livroId, {
        texto: 'A troca de narradora é o melhor do livro.',
        spoiler: false,
      });

      expect(resposta.status).toBe(200);
      expect(Object.keys(resposta.body).sort()).toEqual(
        [
          'atualizadoEm',
          'criadoEm',
          'id',
          'livroId',
          'spoiler',
          'texto',
          'usuarioId',
        ].sort(),
      );
      expect(resposta.body).toMatchObject({
        usuarioId: usuario,
        livroId,
        texto: 'A troca de narradora é o melhor do livro.',
        spoiler: false,
      });
      expect(resposta.body.criadoEm).toMatch(ISO);

      const [evento] = await eventos();
      expect(evento).toEqual({
        tipo: 'resenha.publicada',
        chave_negocio: `resenha:${resposta.body.id}:publicada`,
        payload: {
          usuarioId: usuario,
          resenhaId: resposta.body.id,
          livroId,
          atualizacao: false,
          usuario: {
            id: usuario,
            username: 'leitora',
            displayName: 'Leitora de Teste',
            avatarUrl:
              'https://res.cloudinary.com/leai/image/upload/avatares/a.jpg',
          },
          livro: {
            id: livroId,
            tipo: 'oficial',
            titulo: 'Torto Arado',
            autor: 'Itamar Vieira Junior',
            capaUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
          },
        },
      });
    });

    // Os 701 livros oficiais sem autor do acervo: `autor: null`, nunca texto inventado.
    it('livro sem autor publica autor nulo, e capa malformada vira nula', async () => {
      const livroId = await inserirLivro(pool, {
        autor: null,
        capa: 'capa sem protocolo.jpg',
      });

      const resposta = await salvar(livroId, { texto: 'Bom.', spoiler: false });

      expect(resposta.status).toBe(200);
      const [evento] = await eventos();
      expect(evento.payload.livro).toMatchObject({
        autor: null,
        capaUrl: null,
      });
    });

    it('livro pessoal do dono publica com o autor informado e tipo pessoal', async () => {
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: usuario,
        autor: 'Marina Albuquerque',
        capa: null,
      });
      await pool.query(
        'UPDATE identidade.v_perfil_referencia_v1 SET avatar_url = NULL WHERE id = $1',
        [usuario],
      );

      const resposta = await salvar(livroId, {
        texto: 'Cartas.',
        spoiler: true,
      });

      expect(resposta.status).toBe(200);
      const [evento] = await eventos();
      expect(evento.payload.livro).toMatchObject({
        tipo: 'pessoal',
        autor: 'Marina Albuquerque',
      });
      expect(evento.payload.usuario).toMatchObject({ avatarUrl: null });
    });

    it('o texto é guardado cru, com HTML e tudo', async () => {
      const livroId = await inserirLivro(pool);
      const texto = '<b>ótimo</b> & <script>alert(1)</script>';

      const resposta = await salvar(livroId, { texto, spoiler: false });

      expect(resposta.body.texto).toBe(texto);
      const { rows } = await pool.query<{ texto: string }>(
        'SELECT texto FROM leitura.resenha',
      );
      expect(rows[0].texto).toBe(texto);
    });
  });

  describe('edição', () => {
    it('editar texto e spoiler não publica de novo', async () => {
      const livroId = await inserirLivro(pool);
      const criada = await salvar(livroId, { texto: 'Primeira.', spoiler: false });

      const editada = await salvar(livroId, { texto: 'Segunda.', spoiler: true });
      const desmarcada = await salvar(livroId, { texto: 'Segunda.', spoiler: false });

      expect(editada.status).toBe(200);
      expect(editada.body.id).toBe(criada.body.id);
      expect(editada.body).toMatchObject({ texto: 'Segunda.', spoiler: true });
      expect(desmarcada.body.spoiler).toBe(false);
      expect(await eventos('resenha.publicada')).toHaveLength(1);
      expect(await contar(pool, 'leitura.resenha')).toBe(1);
    });
  });

  describe('limites (RN-07)', () => {
    it.each([
      ['1 caractere', 'a'],
      ['5.000 caracteres', 'a'.repeat(5000)],
      ['5.000 emojis de um code point', '😀'.repeat(5000)],
      ['2.500 emojis compostos (5.000 code points)', '👍🏽'.repeat(2500)],
    ])('aceita %s', async (_caso, texto) => {
      const livroId = await inserirLivro(pool);
      const resposta = await salvar(livroId, { texto, spoiler: false });
      expect(resposta.status).toBe(200);
    });

    it.each([
      ['5.001 caracteres', 'a'.repeat(5001)],
      ['2.501 emojis compostos (5.002 code points)', '👍🏽'.repeat(2501)],
      ['só espaços', '   \n  '],
    ])('recusa %s com 422 no campo texto', async (_caso, texto) => {
      const livroId = await inserirLivro(pool);

      const resposta = await salvar(livroId, { texto, spoiler: false });

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        codigo: 'ENTIDADE_NAO_PROCESSAVEL',
        campos: [{ campo: 'texto' }],
      });
      expect(await contar(pool, 'leitura.resenha')).toBe(0);
    });

    it.each([
      ['texto numérico', { texto: 5, spoiler: false }],
      ['sem spoiler', { texto: 'Bom.' }],
      ['spoiler em texto', { texto: 'Bom.', spoiler: 'sim' }],
      ['campo extra', { texto: 'Bom.', spoiler: false, nota: 4 }],
    ])('corpo com %s responde 400', async (_caso, corpo) => {
      const livroId = await inserirLivro(pool);
      const resposta = await salvar(livroId, corpo);
      expect(resposta.status).toBe(400);
    });
  });

  describe('acesso', () => {
    it.each([
      ['pessoal de outra pessoa', { tipo: 'pessoal' as const, donoId: randomUUID() }],
      ['inativo', { ativo: false }],
    ])('livro %s responde 404, sem gravar', async (_caso, livro) => {
      const livroId = await inserirLivro(pool, livro);

      const resposta = await salvar(livroId, { texto: 'Bom.', spoiler: false });

      expect(resposta.status).toBe(404);
      expect(await contar(pool, 'leitura.resenha')).toBe(0);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
    });

    // A VIEW de perfil já omite conta suspensa ou em exclusão: sem linha, não publica.
    it('conta fora da VIEW de perfil responde 403, sem gravar', async () => {
      const livroId = await inserirLivro(pool);
      const semPerfil = novoUsuario();

      const resposta = await salvar(
        livroId,
        { texto: 'Bom.', spoiler: false },
        { quem: semPerfil },
      );

      expect(resposta.status).toBe(403);
      expect(await contar(pool, 'leitura.resenha')).toBe(0);
    });
  });

  describe('exclusão', () => {
    it('exclui fisicamente e publica resenha.excluida', async () => {
      const livroId = await inserirLivro(pool);
      const criada = await salvar(livroId, { texto: 'Bom.', spoiler: false });

      const resposta = await excluir(livroId);

      expect(resposta.status).toBe(204);
      expect(await contar(pool, 'leitura.resenha')).toBe(0);
      const [evento] = await eventos('resenha.excluida');
      expect(evento).toEqual({
        tipo: 'resenha.excluida',
        chave_negocio: `resenha:${criada.body.id}:excluida`,
        payload: { usuarioId: usuario, resenhaId: criada.body.id, livroId },
      });
    });

    it('sem resenha para excluir responde 204 sem evento', async () => {
      const livroId = await inserirLivro(pool);

      const resposta = await excluir(livroId);

      expect(resposta.status).toBe(204);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
    });

    it('recriar depois de excluir gera novo id e nova publicação', async () => {
      const livroId = await inserirLivro(pool);
      const primeira = await salvar(livroId, { texto: 'Um.', spoiler: false });
      await excluir(livroId);

      const segunda = await salvar(livroId, { texto: 'Dois.', spoiler: false });

      expect(segunda.body.id).not.toBe(primeira.body.id);
      const publicadas = await eventos('resenha.publicada');
      expect(publicadas.map((e) => e.payload.resenhaId)).toEqual([
        primeira.body.id,
        segunda.body.id,
      ]);
    });
  });

  describe('idempotência', () => {
    it('mesma chave e corpo reproduzem a resposta sem segunda publicação', async () => {
      const livroId = await inserirLivro(pool);
      const chave = randomUUID();
      const corpo = { texto: 'Bom.', spoiler: false };

      const primeira = await salvar(livroId, corpo, { chave });
      const repeticao = await salvar(livroId, corpo, { chave });

      expect(repeticao.status).toBe(200);
      expect(repeticao.body).toEqual(primeira.body);
      expect(await eventos('resenha.publicada')).toHaveLength(1);
    });

    it('mesma chave com outro texto responde 409', async () => {
      const livroId = await inserirLivro(pool);
      const chave = randomUUID();
      await salvar(livroId, { texto: 'Um.', spoiler: false }, { chave });

      const resposta = await salvar(
        livroId,
        { texto: 'Outro.', spoiler: false },
        { chave },
      );

      expect(resposta.status).toBe(409);
    });

    it('duas chaves criando a primeira resenha ao mesmo tempo geram uma resenha e uma publicação', async () => {
      const livroId = await inserirLivro(pool);

      const respostas = await Promise.all([
        salvar(livroId, { texto: 'Bom.', spoiler: false }),
        salvar(livroId, { texto: 'Bom.', spoiler: false }),
      ]);

      expect(respostas.map((r) => r.status)).toEqual([200, 200]);
      expect(await contar(pool, 'leitura.resenha')).toBe(1);
      expect(await eventos('resenha.publicada')).toHaveLength(1);
    });
  });

  it('minha-avaliacao devolve a resenha do leitor', async () => {
    const livroId = await inserirLivro(pool);
    const criada = await salvar(livroId, { texto: 'Bom.', spoiler: true });

    const resposta = await http()
      .get(`/livros/${livroId}/minha-avaliacao`)
      .set('Authorization', `Bearer ${tokenDe(usuario)}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      livroId,
      nota: null,
      resenha: criada.body,
    });
  });

  // RNF-TST-03 até o envelope: o consumidor é F-FEED, na fila leai.social.feed.
  it('resenha.publicada e resenha.excluida saem do despachante como envelopes válidos', async () => {
    const livroId = await inserirLivro(pool, { autor: null });
    await salvar(livroId, { texto: 'Bom.', spoiler: false });
    await excluir(livroId);

    const broker = new BrokerEmMemoria();
    await broker.canal.assertQueue('fila.feed');
    for (const chave of ['resenha.publicada', 'resenha.excluida']) {
      await broker.canal.bindQueue('fila.feed', EXCHANGES.leitura, chave);
    }
    const validador = app.get(MessageValidator);
    await new OutboxDispatcherService(
      app.get<DrizzleDB>(DRIZZLE),
      broker.conexao,
      new AmqpPublisherService(broker.conexao, validador),
    ).dispatchOnce();

    const mensagens = broker.filas.get('fila.feed') ?? [];
    const envelopes = mensagens.map((m) => validador.parse(m));
    expect(envelopes.map((e) => e.type)).toEqual([
      'resenha.publicada',
      'resenha.excluida',
    ]);
    for (const envelope of envelopes) {
      expect(() =>
        validador.validarDados(envelope.type, envelope.version, envelope.data),
      ).not.toThrow();
    }
  });
});
