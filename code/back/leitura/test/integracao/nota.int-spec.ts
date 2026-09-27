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
import { inserirLivro } from './massa';

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

interface LinhaDaOutbox {
  tipo: string;
  versao: number;
  chave_negocio: string;
  payload: Record<string, unknown>;
}

/**
 * Nota do leitor (F-AVA, RF-AVA-01, RN-06): `PUT`/`DELETE /livros/{id}/nota` e
 * `GET /livros/{id}/minha-avaliacao` contra Postgres real, com o evento
 * `nota.alterada` na outbox.
 */
describe('nota (integração)', () => {
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
  });

  const http = () => request(app.getHttpServer());
  const autorizado = (req: request.Test, quem = usuario) =>
    req.set('Authorization', `Bearer ${tokenDe(quem)}`);

  const salvar = (
    livroId: string,
    corpo: unknown,
    opcoes: { chave?: string; quem?: string } = {},
  ) =>
    autorizado(
      http()
        .put(`/livros/${livroId}/nota`)
        .set('Idempotency-Key', opcoes.chave ?? randomUUID())
        .send(corpo as object),
      opcoes.quem,
    );

  const excluir = (livroId: string, chave = randomUUID()) =>
    autorizado(
      http().delete(`/livros/${livroId}/nota`).set('Idempotency-Key', chave),
    );

  const minhaAvaliacao = (livroId: string, quem = usuario) =>
    autorizado(http().get(`/livros/${livroId}/minha-avaliacao`), quem);

  const eventos = async (): Promise<LinhaDaOutbox[]> => {
    const { rows } = await pool.query<LinhaDaOutbox>(
      `SELECT tipo, versao, chave_negocio, payload
         FROM leitura.outbox_leitura ORDER BY criado_em, event_id`,
    );
    return rows;
  };

  describe('PUT /livros/{id}/nota', () => {
    it('cria a nota com a forma exata do contrato e grava nota.alterada criada', async () => {
      const livroId = await inserirLivro(pool);

      const resposta = await salvar(livroId, { valor: 4.5 });

      expect(resposta.status).toBe(200);
      expect(Object.keys(resposta.body).sort()).toEqual(
        ['atualizadoEm', 'criadoEm', 'livroId', 'valor'].sort(),
      );
      expect(resposta.body).toMatchObject({ livroId, valor: 4.5 });
      expect(resposta.body.criadoEm).toMatch(ISO);
      expect(resposta.body.atualizadoEm).toMatch(ISO);
      expect(await eventos()).toEqual([
        {
          tipo: 'nota.alterada',
          versao: 1,
          chave_negocio: `nota:${usuario}:${livroId}`,
          payload: {
            usuarioId: usuario,
            livroId,
            operacao: 'criada',
            nota: 4.5,
          },
        },
      ]);
    });

    it('nota zero é válida e distinta de ausente', async () => {
      const livroId = await inserirLivro(pool);

      const resposta = await salvar(livroId, { valor: 0 });

      expect(resposta.status).toBe(200);
      expect(resposta.body.valor).toBe(0);
      const [evento] = await eventos();
      expect(evento.payload).toMatchObject({ operacao: 'criada', nota: 0 });
    });

    it('mudar o valor grava atualizada; repetir o mesmo valor não grava nada', async () => {
      const livroId = await inserirLivro(pool);
      await salvar(livroId, { valor: 2 });

      const atualizada = await salvar(livroId, { valor: 3.5 });
      const repetida = await salvar(livroId, { valor: 3.5 });

      expect(atualizada.status).toBe(200);
      expect(repetida.status).toBe(200);
      expect(repetida.body).toEqual(atualizada.body);
      expect((await eventos()).map((e) => e.payload.operacao)).toEqual([
        'criada',
        'atualizada',
      ]);
      expect(await contar(pool, 'leitura.nota')).toBe(1);
    });

    it('livro pessoal do próprio dono aceita nota (RN-03)', async () => {
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: usuario,
        autor: 'Eu mesma',
      });

      const resposta = await salvar(livroId, { valor: 5 });

      expect(resposta.status).toBe(200);
    });

    it.each([
      [
        'pessoal de outra pessoa',
        { tipo: 'pessoal' as const, donoId: randomUUID() },
      ],
      ['inativo', { tipo: 'pessoal' as const, ativo: false }],
    ])('livro %s responde 404, sem gravar', async (_caso, livro) => {
      const livroId = await inserirLivro(pool, {
        ...livro,
        donoId: 'donoId' in livro ? livro.donoId : usuario,
      });

      const resposta = await salvar(livroId, { valor: 4 });

      expect(resposta.status).toBe(404);
      expect(resposta.body.codigo).toBe('RECURSO_NAO_ENCONTRADO');
      expect(await contar(pool, 'leitura.nota')).toBe(0);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
    });

    it('livro inexistente responde 404', async () => {
      const resposta = await salvar(randomUUID(), { valor: 4 });
      expect(resposta.status).toBe(404);
    });

    it.each([5.5, -0.5, 4.3])(
      'valor %d fora da escala responde 422 com o campo',
      async (valor) => {
        const livroId = await inserirLivro(pool);

        const resposta = await salvar(livroId, { valor });

        expect(resposta.status).toBe(422);
        expect(resposta.body).toMatchObject({
          codigo: 'ENTIDADE_NAO_PROCESSAVEL',
          campos: [{ campo: 'valor' }],
        });
        expect(await contar(pool, 'leitura.nota')).toBe(0);
      },
    );

    it.each([
      ['texto', { valor: '4' }],
      ['nulo', { valor: null }],
      ['ausente', {}],
      ['com campo extra', { valor: 4, comentario: 'bom' }],
    ])('corpo %s responde 400', async (_caso, corpo) => {
      const livroId = await inserirLivro(pool);

      const resposta = await salvar(livroId, corpo);

      expect(resposta.status).toBe(400);
      expect(resposta.body.codigo).toBe('REQUISICAO_INVALIDA');
    });

    it('livroId malformado responde 400 no campo livroId', async () => {
      const resposta = await salvar('nao-e-uuid', { valor: 4 });

      expect(resposta.status).toBe(400);
      expect(resposta.body.campos).toEqual([
        expect.objectContaining({ campo: 'livroId' }),
      ]);
    });

    it('sem token responde 401', async () => {
      const livroId = await inserirLivro(pool);
      const resposta = await http()
        .put(`/livros/${livroId}/nota`)
        .set('Idempotency-Key', randomUUID())
        .send({ valor: 4 });
      expect(resposta.status).toBe(401);
    });

    it('mesma chave e corpo reproduzem a resposta sem segundo evento', async () => {
      const livroId = await inserirLivro(pool);
      const chave = randomUUID();

      const primeira = await salvar(livroId, { valor: 4 }, { chave });
      const repeticao = await salvar(livroId, { valor: 4 }, { chave });

      expect(repeticao.status).toBe(200);
      expect(repeticao.body).toEqual(primeira.body);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(1);
    });

    it('mesma chave com outro valor responde 409', async () => {
      const livroId = await inserirLivro(pool);
      const chave = randomUUID();
      await salvar(livroId, { valor: 4 }, { chave });

      const resposta = await salvar(livroId, { valor: 2 }, { chave });

      expect(resposta.status).toBe(409);
      expect(resposta.body.codigo).toBe('CHAVE_IDEMPOTENCIA_CONFLITANTE');
    });

    it('duas chaves criando a primeira nota ao mesmo tempo geram uma nota e um evento', async () => {
      const livroId = await inserirLivro(pool);

      const respostas = await Promise.all([
        salvar(livroId, { valor: 4 }),
        salvar(livroId, { valor: 4 }),
      ]);

      expect(respostas.map((r) => r.status)).toEqual([200, 200]);
      expect(await contar(pool, 'leitura.nota')).toBe(1);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(1);
    });
  });

  describe('DELETE /livros/{id}/nota', () => {
    it('remove a nota e grava nota.alterada excluida com nota nula', async () => {
      const livroId = await inserirLivro(pool);
      await salvar(livroId, { valor: 3 });

      const resposta = await excluir(livroId);

      expect(resposta.status).toBe(204);
      expect(resposta.text).toBe('');
      expect(await contar(pool, 'leitura.nota')).toBe(0);
      const ultimo = (await eventos()).at(-1);
      expect(ultimo?.payload).toEqual({
        usuarioId: usuario,
        livroId,
        operacao: 'excluida',
        nota: null,
      });
    });

    it('sem nota para remover responde 204 sem evento', async () => {
      const livroId = await inserirLivro(pool);

      const resposta = await excluir(livroId);

      expect(resposta.status).toBe(204);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
    });

    it('repetir a mesma chave não gera segundo evento', async () => {
      const livroId = await inserirLivro(pool);
      await salvar(livroId, { valor: 3 });
      const chave = randomUUID();

      await excluir(livroId, chave);
      const repeticao = await excluir(livroId, chave);

      expect(repeticao.status).toBe(204);
      expect(
        await contar(
          pool,
          'leitura.outbox_leitura',
          "payload->>'operacao' = 'excluida'",
        ),
      ).toBe(1);
    });

    it('livro pessoal de outra pessoa responde 404', async () => {
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: randomUUID(),
      });
      const resposta = await excluir(livroId);
      expect(resposta.status).toBe(404);
    });
  });

  describe('GET /livros/{id}/minha-avaliacao', () => {
    it('sem nota nem resenha devolve os dois nulos', async () => {
      const livroId = await inserirLivro(pool);

      const resposta = await minhaAvaliacao(livroId);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ livroId, nota: null, resenha: null });
    });

    it('devolve a nota salva e só a do próprio leitor', async () => {
      const livroId = await inserirLivro(pool);
      await salvar(livroId, { valor: 4.5 });
      const outra = novoUsuario();
      await salvar(livroId, { valor: 1 }, { quem: outra });

      const resposta = await minhaAvaliacao(livroId);

      expect(resposta.status).toBe(200);
      expect(resposta.body.nota).toMatchObject({ livroId, valor: 4.5 });
      expect(resposta.body.resenha).toBeNull();
    });

    it('livro pessoal de outra pessoa responde 404', async () => {
      const livroId = await inserirLivro(pool, {
        tipo: 'pessoal',
        donoId: randomUUID(),
      });
      const resposta = await minhaAvaliacao(livroId);
      expect(resposta.status).toBe(404);
    });
  });

  // RNF-TST-03 até o envelope: o que F-AVA grava sai do despachante como um
  // envelope que o validador aceita, com o `data` do schema canônico.
  it('nota.alterada sai do despachante como envelope válido', async () => {
    const livroId = await inserirLivro(pool);
    await salvar(livroId, { valor: 4 });

    const broker = new BrokerEmMemoria();
    await broker.canal.assertQueue('fila.nota');
    await broker.canal.bindQueue('fila.nota', EXCHANGES.leitura, 'nota.alterada');
    const validador = app.get(MessageValidator);
    await new OutboxDispatcherService(
      app.get<DrizzleDB>(DRIZZLE),
      broker.conexao,
      new AmqpPublisherService(broker.conexao, validador),
    ).dispatchOnce();

    const [mensagem] = broker.filas.get('fila.nota') ?? [];
    const envelope = validador.parse(mensagem);
    expect(envelope).toMatchObject({
      type: 'nota.alterada',
      version: 1,
      businessKey: `nota:${usuario}:${livroId}`,
      data: { usuarioId: usuario, livroId, operacao: 'criada', nota: 4 },
    });
  });
});
