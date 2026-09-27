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
import {
  EVENTO_DE_TESTE,
  RotaDeTeste,
  SCHEMA_DO_EVENTO_DE_TESTE,
} from './rota-de-teste';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Infra comum do `leitura` (fatia 0 de F-AVA), exercitada por uma rota que só
 * existe no teste: guard global, correlation-id, idempotência HTTP, 422 com
 * `campos`, validação do evento na outbox e o caminho outbox → despachante →
 * envelope válido no broker (RNF-TST-03 até o envelope).
 */
describe('infra comum do leitura (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let usuario: string;

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp([RotaDeTeste]);
    app
      .get(MessageValidator)
      .registerDataSchema(
        EVENTO_DE_TESTE.tipo,
        EVENTO_DE_TESTE.versao,
        SCHEMA_DO_EVENTO_DE_TESTE,
      );
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
  const eco = (
    livroId: string,
    corpo: object,
    opcoes: { chave?: string | null; token?: string | null } = {},
  ) => {
    let req = http().post(`/__teste/eco/${livroId}`).send(corpo);
    const token = opcoes.token === undefined ? tokenDe(usuario) : opcoes.token;
    if (token) req = req.set('Authorization', `Bearer ${token}`);
    const chave = opcoes.chave === undefined ? randomUUID() : opcoes.chave;
    if (chave) req = req.set('Idempotency-Key', chave);
    return req;
  };

  describe('autenticação', () => {
    it('/health continua público, sem token', async () => {
      const resposta = await http().get('/health');
      expect(resposta.status).toBe(200);
    });

    it.each([
      ['sem Authorization', null],
      ['Bearer lixo', 'lixo'],
      [
        'token assinado com outro segredo',
        tokenDe(novoUsuario(), 'leitora', {
          segredo: 'outro-segredo-qualquer-com-mais-de-32-caracteres',
        }),
      ],
      [
        'token de outro emissor',
        tokenDe(novoUsuario(), 'leitora', { issuer: 'impostor' }),
      ],
    ])('%s responde 401 sem tocar no banco', async (_caso, token) => {
      const resposta = await eco(randomUUID(), { valor: 1 }, { token });

      expect(resposta.status).toBe(401);
      expect(resposta.body).toMatchObject({ codigo: 'NAO_AUTENTICADO' });
      expect(resposta.body.correlationId).toMatch(UUID);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
      expect(await contar(pool, 'leitura.idempotencia_leitura')).toBe(0);
    });
  });

  describe('correlation-id', () => {
    it('troca um X-Correlation-Id malformado por um UUID e grava a escrita', async () => {
      const resposta = await eco(randomUUID(), { valor: 1 }).set(
        'X-Correlation-Id',
        'abc',
      );

      expect(resposta.status).toBe(201);
      const correlationId = resposta.headers['x-correlation-id'];
      expect(correlationId).toMatch(UUID);
      expect(
        await contar(pool, 'leitura.outbox_leitura', 'correlation_id = $1', [
          correlationId,
        ]),
      ).toBe(1);
    });

    it('preserva um X-Correlation-Id válido', async () => {
      const recebido = randomUUID();
      const resposta = await eco(randomUUID(), { valor: 1 }).set(
        'X-Correlation-Id',
        recebido,
      );

      expect(resposta.headers['x-correlation-id']).toBe(recebido);
    });
  });

  describe('idempotência', () => {
    it('mesma chave e mesmo corpo reproduzem a resposta sem novo efeito', async () => {
      const livroId = randomUUID();
      const chave = randomUUID();

      const primeira = await eco(livroId, { valor: 2 }, { chave });
      const repeticao = await eco(livroId, { valor: 2 }, { chave });

      expect(primeira.status).toBe(201);
      expect(repeticao.status).toBe(201);
      expect(repeticao.body).toEqual(primeira.body);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(1);
      expect(await contar(pool, 'leitura.idempotencia_leitura')).toBe(1);
    });

    it('mesma chave com outro corpo responde 409', async () => {
      const livroId = randomUUID();
      const chave = randomUUID();
      await eco(livroId, { valor: 2 }, { chave });

      const resposta = await eco(livroId, { valor: 3 }, { chave });

      expect(resposta.status).toBe(409);
      expect(resposta.body).toMatchObject({
        codigo: 'CHAVE_IDEMPOTENCIA_CONFLITANTE',
      });
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(1);
    });

    // O escopo do contrato é ator + método + caminho canônico: outro livro é
    // outra operação. É aqui que `leitura` difere do `acervo`.
    it('mesma chave em outro livro é outra operação', async () => {
      const chave = randomUUID();

      const primeiro = await eco(randomUUID(), { valor: 2 }, { chave });
      const segundo = await eco(randomUUID(), { valor: 2 }, { chave });

      expect(primeiro.status).toBe(201);
      expect(segundo.status).toBe(201);
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(2);
    });

    it('sem Idempotency-Key responde 400 com o campo', async () => {
      const resposta = await eco(randomUUID(), { valor: 1 }, { chave: null });

      expect(resposta.status).toBe(400);
      expect(resposta.body.campos).toEqual([
        expect.objectContaining({ campo: 'Idempotency-Key' }),
      ]);
    });
  });

  describe('erros', () => {
    it('campo fora do contrato responde 400 com campos', async () => {
      const resposta = await eco(randomUUID(), { valor: 1, extra: true });

      expect(resposta.status).toBe(400);
      expect(resposta.body.codigo).toBe('REQUISICAO_INVALIDA');
      expect(resposta.body.campos).toEqual([
        expect.objectContaining({ campo: 'extra' }),
      ]);
    });

    it('regra de negócio violada responde 422 com campos', async () => {
      const resposta = await eco(randomUUID(), { valor: 6 });

      expect(resposta.status).toBe(422);
      expect(resposta.body).toMatchObject({
        codigo: 'ENTIDADE_NAO_PROCESSAVEL',
        campos: [{ campo: 'valor', mensagem: 'Use um valor de até 5.' }],
      });
      expect(resposta.body.correlationId).toMatch(UUID);
    });

    it('evento fora do schema desfaz a transação inteira', async () => {
      const resposta = await eco(randomUUID(), { valor: -1 });

      expect(resposta.status).toBe(500);
      expect(resposta.body.codigo).toBe('ERRO_INTERNO');
      expect(await contar(pool, 'leitura.outbox_leitura')).toBe(0);
      expect(await contar(pool, 'leitura.idempotencia_leitura')).toBe(0);
    });
  });

  describe('outbox → despachante → broker', () => {
    it('publica um envelope válido e marca a linha como publicada', async () => {
      const livroId = randomUUID();
      const escrita = await eco(livroId, { valor: 4 });
      expect(escrita.status).toBe(201);

      const broker = new BrokerEmMemoria();
      await broker.canal.assertQueue('fila.teste');
      await broker.canal.bindQueue(
        'fila.teste',
        EXCHANGES.leitura,
        EVENTO_DE_TESTE.tipo,
      );
      const validador = app.get(MessageValidator);
      const despachante = new OutboxDispatcherService(
        app.get<DrizzleDB>(DRIZZLE),
        broker.conexao,
        new AmqpPublisherService(broker.conexao, validador),
      );

      await despachante.dispatchOnce();

      const [mensagem] = broker.filas.get('fila.teste') ?? [];
      expect(mensagem).toBeDefined();
      const envelope = validador.parse(mensagem);
      expect(envelope).toMatchObject({
        eventId: escrita.body.eventId,
        type: EVENTO_DE_TESTE.tipo,
        version: EVENTO_DE_TESTE.versao,
        businessKey: `eco:${livroId}`,
        data: { livroId, valor: 4 },
      });
      expect(() =>
        validador.validarDados(envelope.type, envelope.version, envelope.data),
      ).not.toThrow();
      expect(
        await contar(pool, 'leitura.outbox_leitura', "status = 'publicado'"),
      ).toBe(1);
    });
  });
});
