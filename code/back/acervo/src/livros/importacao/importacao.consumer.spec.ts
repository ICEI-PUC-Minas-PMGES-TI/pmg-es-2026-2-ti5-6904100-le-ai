import type { Tx } from '../../db/tipos';
import type { AmqpConsumerService } from '../../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../../messaging/message-validator';
import type { FonteDeMetadados } from './dominio/fonte-metadados';
import {
  CONSUMIDOR_IMPORTACAO,
  ImportacaoConsumer,
} from './importacao.consumer';

const DADOS = {
  importacaoId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
  solicitanteId: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
  isbn13: '9788535914849',
};

const ENVELOPE: MessageEnvelope = {
  eventId: '01994c25-83cd-7d41-a9b4-1d9b71f34560',
  type: 'livro.importacao_solicitada',
  version: 1,
  occurredAt: '2026-09-22T12:00:00.000Z',
  correlationId: '16aa3308-daee-4638-b220-c306484f6a9c',
  businessKey: `importacao:${DADOS.importacaoId}`,
  data: DADOS,
};

function txComEstado(estado: string | null) {
  const execute = jest
    .fn()
    .mockResolvedValueOnce({ rows: estado ? [{ estado }] : [] })
    .mockResolvedValue({ rows: [] });
  return { tx: { execute } as unknown as Tx, execute };
}

function consumidor(fontes: FonteDeMetadados[] = []) {
  const register = jest.fn();
  const validador = new MessageValidator();
  const consumer = new ImportacaoConsumer(
    { register } as unknown as AmqpConsumerService,
    validador,
    fontes,
  );
  return { consumer, register, validador };
}

describe('ImportacaoConsumer', () => {
  it('registra fila, exchange e routing key do catálogo canônico', () => {
    const { consumer, register } = consumidor();

    consumer.onModuleInit();

    expect(register).toHaveBeenCalledWith(
      {
        consumerName: 'acervo.importacao',
        queue: 'leai.acervo.importacao',
        exchange: 'leai.events.acervo',
        routingKeys: ['livro.importacao_solicitada'],
      },
      expect.any(Function),
    );
    expect(CONSUMIDOR_IMPORTACAO.queue).toBe('leai.acervo.importacao');
  });

  it('registra o schema de data: `data` com campo extra vai para a DLQ', () => {
    const { consumer, validador } = consumidor();
    consumer.onModuleInit();

    const mensagem = (data: object) =>
      ({
        content: Buffer.from(JSON.stringify({ ...ENVELOPE, data })),
        properties: {
          messageId: ENVELOPE.eventId,
          correlationId: ENVELOPE.correlationId,
          type: ENVELOPE.type,
          contentType: 'application/json',
          deliveryMode: 2,
          headers: {
            'x-event-version': 1,
            'x-business-key': ENVELOPE.businessKey,
          },
        },
      }) as never;

    expect(validador.parse(mensagem(DADOS)).data).toEqual(DADOS);
    expect(() => validador.parse(mensagem({ ...DADOS, url: 'x' }))).toThrow();
  });

  it('não consulta fontes quando a importação já saiu de pendente', async () => {
    const fonte = { nome: 'openlibrary', buscarPorIsbn: jest.fn() };
    const { consumer } = consumidor([fonte]);
    const { tx, execute } = txComEstado('concluida');

    await consumer.processar(ENVELOPE, tx);

    expect(fonte.buscarPorIsbn).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('confirma sem efeito quando a importação não existe', async () => {
    const fonte = { nome: 'openlibrary', buscarPorIsbn: jest.fn() };
    const { consumer } = consumidor([fonte]);
    const { tx } = txComEstado(null);

    await expect(consumer.processar(ENVELOPE, tx)).resolves.toBeUndefined();
    expect(fonte.buscarPorIsbn).not.toHaveBeenCalled();
  });

  it('marca nao_encontrado sem lançar quando nenhuma fonte conhece o ISBN', async () => {
    const fonte = {
      nome: 'openlibrary',
      buscarPorIsbn: jest.fn().mockResolvedValue(null),
    };
    const { consumer } = consumidor([fonte]);
    const { tx, execute } = txComEstado('pendente');

    await expect(consumer.processar(ENVELOPE, tx)).resolves.toBeUndefined();

    expect(fonte.buscarPorIsbn).toHaveBeenCalledWith(DADOS.isbn13);
    // Trava da linha + UPDATE de estado, os dois no `tx` recebido.
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
