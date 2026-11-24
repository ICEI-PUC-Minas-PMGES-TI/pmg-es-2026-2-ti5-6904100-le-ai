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

    // Sem normalizar, o mesmo livro sairia com outra chave de negócio no evento.
    it('id do livro em maiúsculas sai em minúsculas na resposta e no evento', async () => {
      const livroId = await inserirLivro(pool);

      const resposta = await salvar(livroId.toUpperCase(), { valor: 2 });

      expect(resposta.status).toBe(200);
      expect(resposta.body.livroId).toBe(livroId);
      const [evento] = await eventos();
      expect(evento.chave_negocio).toBe(`nota:${usuario}:${livroId}`);
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

    // Remover tem de continuar possível depois que o livro fica inativo (RN-06).
    it('livro que ficou inativo: remove a nota e grava o evento', async () => {
      const livroId = await inserirLivro(pool);
      await salvar(livroId, { valor: 3 });
      await pool.query(
        'UPDATE acervo.v_livro_referencia_v1 SET ativo = false WHERE livro_id = $1',
        [livroId],
      );

      const resposta = await excluir(livroId);

      expect(resposta.status).toBe(204);
      expect(await contar(pool, 'leitura.nota')).toBe(0);
      expect((await eventos()).at(-1)?.payload).toMatchObject({
        operacao: 'excluida',
      });
    });

    // O DELETE não confere o livro: apaga só o que é do leitor, e ele não tem nota ali.
    it.each([
      [
        'pessoal de outra pessoa',
        { tipo: 'pessoal' as const, donoId: randomUUID() },
      ],
      ['inexistente', null],
    ])('livro %s responde 204 sem evento', async (_caso, livro) => {
      const livroId = livro ? await inserirLivro(pool, livro) : randomUUID();

      const resposta = await excluir(livroId);

      expect(resposta.status).toBe(204);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
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

  // L-02 (E6-02): o ciclo de leitura é dirigido só por HTTP, pela máquina de
  // estados de F-EST, sem tocar nela. Nota e resenha não têm chave para a
  // leitura (RN-04.5), e nenhuma transição pode apagá-las ou duplicá-las.
  describe('RN-04: a avaliação é do livro, não da leitura', () => {
    const FUSO = 'America/Sao_Paulo';

    beforeEach(() => inserirPerfil(pool, { id: usuario }));

    const comando = (caminho: string, corpo?: object) =>
      autorizado(
        http().post(caminho).set('Idempotency-Key', randomUUID()),
      ).send(corpo);

    const iniciar = async (
      livroId: string,
      rota: 'leituras' | 'releituras' = 'leituras',
    ): Promise<string> => {
      const resposta = await comando(`/${rota}`, { livroId }).expect(201);
      return resposta.body.id as string;
    };

    const finalizar = (leituraId: string) =>
      comando(`/leituras/${leituraId}/finalizar`, {
        fusoHorarioDispositivo: FUSO,
      }).expect(200);

    const resenhar = (livroId: string, texto: string) =>
      autorizado(
        http()
          .put(`/livros/${livroId}/resenha`)
          .set('Idempotency-Key', randomUUID())
          .send({ texto, spoiler: false }),
      ).expect(200);

    const exclusoesPublicadas = () =>
      contar(
        pool,
        'leitura.outbox_leitura',
        `tipo = 'resenha.excluida' OR payload->>'operacao' = 'excluida'`,
      );

    it('abandonar não apaga a nota nem a resenha', async () => {
      const livroId = await inserirLivro(pool);
      const leituraId = await iniciar(livroId);
      await salvar(livroId, { valor: 4 }).expect(200);
      await resenhar(livroId, 'Parei no meio, mas o começo é ótimo.');
      const antes = (await minhaAvaliacao(livroId)).body;

      const abandono = await comando(`/leituras/${leituraId}/abandonar`);

      expect(abandono.status).toBe(200);
      expect(abandono.body.status).toBe('ABANDONADO');
      const depois = await minhaAvaliacao(livroId);
      expect(depois.status).toBe(200);
      expect(depois.body).toEqual(antes);
      expect(depois.body.nota).toMatchObject({ valor: 4 });
      expect(depois.body.resenha).toMatchObject({
        texto: 'Parei no meio, mas o começo é ótimo.',
      });
      expect(await contar(pool, 'leitura.nota')).toBe(1);
      expect(await contar(pool, 'leitura.resenha')).toBe(1);
      expect(await exclusoesPublicadas()).toBe(0);
    });

    it('releitura concluída não duplica nota nem resenha, e a avaliação continua a mesma', async () => {
      const livroId = await inserirLivro(pool);
      await finalizar(await iniciar(livroId));
      await salvar(livroId, { valor: 3.5 }).expect(200);
      await resenhar(livroId, 'Primeira leitura.');
      const antes = (await minhaAvaliacao(livroId)).body;

      const releituraId = await iniciar(livroId, 'releituras');
      // Durante a releitura o leitor regrava a mesma nota: continua uma linha só.
      await salvar(livroId, { valor: 3.5 }).expect(200);
      const lida = await finalizar(releituraId);

      expect(lida.body).toMatchObject({ status: 'LIDO', vezesLido: 2 });
      expect((await minhaAvaliacao(livroId)).body).toEqual(antes);
      expect(await contar(pool, 'leitura.nota')).toBe(1);
      expect(await contar(pool, 'leitura.resenha')).toBe(1);
      expect(await exclusoesPublicadas()).toBe(0);
      expect(
        await contar(pool, 'leitura.outbox_leitura', `tipo = 'nota.alterada'`),
      ).toBe(1);
      expect(
        await contar(
          pool,
          'leitura.outbox_leitura',
          `tipo = 'resenha.publicada'`,
        ),
      ).toBe(1);

      // Uma segunda releitura, abandonada, também não mexe na avaliação.
      const segunda = await iniciar(livroId, 'releituras');
      await comando(`/leituras/${segunda}/abandonar`).expect(200);
      expect((await minhaAvaliacao(livroId)).body).toEqual(antes);
      expect(await contar(pool, 'leitura.nota')).toBe(1);
      expect(await contar(pool, 'leitura.resenha')).toBe(1);
    });
  });

  // L-36 (E6-02): decisão 4 da F-MOD-OPC. A suspensão tira a conta da VIEW de
  // perfil (no fixture, uma tabela), mas a nota dela continua publicada para a
  // média dos leitores no `acervo`. Se a VIEW passar a filtrar, este teste cai
  // e a decisão tem de ser revista junto.
  it('nota de conta suspensa continua na VIEW de publicação de notas (decisão 4 da F-MOD-OPC)', async () => {
    const livroId = await inserirLivro(pool);
    await inserirPerfil(pool, { id: usuario, username: 'suspensa' });
    await salvar(livroId, { valor: 2.5 }).expect(200);
    const naView = () =>
      pool.query<{ usuario_id: string; valor: string }>(
        `SELECT usuario_id, valor::text AS valor
           FROM leitura.v_nota_publicacao_v1 WHERE livro_id = $1`,
        [livroId],
      );

    await pool.query(
      'DELETE FROM identidade.v_perfil_referencia_v1 WHERE id = $1',
      [usuario],
    );

    expect((await naView()).rows).toEqual([
      { usuario_id: usuario, valor: '2.5' },
    ]);
    expect(await contar(pool, 'leitura.nota')).toBe(1);
  });

  // RNF-TST-03 até o envelope: o que F-AVA grava sai do despachante como um
  // envelope que o validador aceita, com o `data` do schema canônico.
  it('nota.alterada sai do despachante como envelope válido', async () => {
    const livroId = await inserirLivro(pool);
    await salvar(livroId, { valor: 4 });

    const broker = new BrokerEmMemoria();
    await broker.canal.assertQueue('fila.nota');
    await broker.canal.bindQueue(
      'fila.nota',
      EXCHANGES.leitura,
      'nota.alterada',
    );
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
