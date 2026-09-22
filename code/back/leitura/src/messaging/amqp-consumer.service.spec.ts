import type { Channel, ConsumeMessage } from 'amqplib';
import { als } from '../common/als';
import type { DrizzleDB } from '../db/drizzle.module';
import {
  AmqpConsumerService,
  type MessageHandler,
} from './amqp-consumer.service';
import type { AmqpConnectionService } from './amqp-connection.service';
import {
  InvalidMessageError,
  type MessageEnvelope,
  type MessageValidator,
} from './message-validator';

type ValidatorLike = { parse: MessageValidator['parse'] };

class FastConsumer extends AmqpConsumerService {
  protected override retryDelays(): readonly number[] {
    return [1, 2, 3];
  }
}

const envelope: MessageEnvelope = {
  eventId: '01994c25-83cd-7d41-a9b4-1d9b71f34560',
  type: 'ping.teste',
  version: 1,
  occurredAt: '2026-09-16T12:00:00.000Z',
  correlationId: '16aa3308-daee-4638-b220-c306484f6a9c',
  businessKey: 'ping:01994c25-83cd-7d41-a9b4-1d9b71f34560',
  data: { mensagem: 'ping' },
};

const message = {} as ConsumeMessage;

function makeChannel(): jest.Mocked<Channel> {
  return {
    assertExchange: jest.fn().mockResolvedValue(undefined),
    assertQueue: jest.fn().mockResolvedValue(undefined),
    bindQueue: jest.fn().mockResolvedValue(undefined),
    prefetch: jest.fn().mockResolvedValue(undefined),
    consume: jest.fn().mockResolvedValue({ consumerTag: 'test' }),
    ack: jest.fn(),
    nack: jest.fn(),
  } as unknown as jest.Mocked<Channel>;
}

function makeDb(rows: unknown[] = [{ event_id: envelope.eventId }]) {
  const execute = jest.fn().mockResolvedValue({ rows });
  const tx = { execute };
  const transaction = jest.fn(
    async (callback: (tx: { execute: typeof execute }) => Promise<void>) =>
      callback(tx),
  );
  return { execute, transaction, tx } as unknown as DrizzleDB & {
    transaction: jest.Mock;
    tx: typeof tx;
  };
}

async function registeredConsumer(
  db: DrizzleDB,
  validator: ValidatorLike,
  handler: MessageHandler = async () => undefined,
) {
  const channel = makeChannel();
  const connection = {
    isEnabled: () => true,
    onConsumerReady: jest.fn(),
    getConsumerChannelIfReady: () => undefined,
  } as unknown as AmqpConnectionService;
  const consumer = new FastConsumer(
    connection,
    validator as unknown as MessageValidator,
    db,
  );
  consumer.onModuleInit();
  consumer.register(
    {
      consumerName: 'leitura.test',
      queue: 'leai.leitura.test',
      exchange: 'leai.events.identidade',
      routingKeys: ['ping.teste'],
    },
    handler,
  );
  const ready = (connection.onConsumerReady as jest.Mock).mock.calls[0][0] as (
    channel: Channel,
  ) => void;
  ready(channel);
  await new Promise<void>((resolve) => setImmediate(resolve));
  const callback = (channel.consume as jest.Mock).mock.calls[0][1] as (
    message: ConsumeMessage | null,
  ) => Promise<void> | undefined;
  return { channel, callback };
}

describe('AmqpConsumerService', () => {
  afterEach(() => {
    jest.useRealTimers();
    als.disable();
  });

  it('runs the handler with the same tx that records the receipt', async () => {
    const db = makeDb();
    const validator = { parse: jest.fn(() => envelope) };
    const handler = jest.fn(async () => undefined);
    const { channel, callback } = await registeredConsumer(
      db,
      validator,
      handler,
    );

    await callback(message);

    // Efeito e recibo na mesma transação (P0-MSG, "Consumo e recibo
    // transacional"): o handler escreve com este `tx`, nunca com o `db` global.
    expect(handler).toHaveBeenCalledWith(envelope, db.tx);
    expect(channel.ack).toHaveBeenCalledWith(message);
  });

  it('declares a durable queue and DLQ with dead-letter arguments', async () => {
    const { channel } = await registeredConsumer(makeDb(), {
      parse: jest.fn(() => envelope),
    });

    expect(channel.assertQueue).toHaveBeenNthCalledWith(
      2,
      'leai.leitura.test',
      expect.objectContaining({
        arguments: {
          'x-dead-letter-exchange': 'leai.dead-letter',
          'x-dead-letter-routing-key': 'leai.leitura.test',
        },
      }),
    );
    expect(channel.prefetch).toHaveBeenCalledWith(1);
  });

  it('ACKs a duplicate after the idempotent receipt check', async () => {
    const db = makeDb([]);
    const validator = { parse: jest.fn(() => envelope) };
    const { channel, callback } = await registeredConsumer(db, validator);

    await callback(message);

    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('sends invalid messages to the DLQ without opening a transaction', async () => {
    const db = makeDb();
    const validator = {
      parse: jest.fn(() => {
        throw new InvalidMessageError('schema inválido');
      }),
    };
    const { channel, callback } = await registeredConsumer(db, validator);

    await callback(message);

    expect(db.transaction).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });

  it('uses the documented retry schedule before DLQ', async () => {
    const db = makeDb();
    db.transaction
      .mockRejectedValueOnce(new Error('falha 1'))
      .mockRejectedValueOnce(new Error('falha 2'))
      .mockRejectedValueOnce(new Error('falha 3'))
      .mockRejectedValueOnce(new Error('falha 4'));
    const { channel, callback } = await registeredConsumer(db, {
      parse: jest.fn(() => envelope),
    });
    jest.useFakeTimers();
    const processing = callback(message);

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(5_000);
    await jest.advanceTimersByTimeAsync(15_000);
    await processing;

    expect(db.transaction).toHaveBeenCalledTimes(4);
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });
});
