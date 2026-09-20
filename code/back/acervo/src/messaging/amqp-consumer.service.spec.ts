import type { Channel, ConsumeMessage } from 'amqplib';
import { als } from '../common/als';
import type { DrizzleDB } from '../db/drizzle.module';
import { AmqpConsumerService } from './amqp-consumer.service';
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
  const transaction = jest.fn(
    async (callback: (tx: { execute: typeof execute }) => Promise<void>) =>
      callback({ execute }),
  );
  return { execute, transaction } as unknown as DrizzleDB & {
    transaction: jest.Mock;
  };
}

async function registeredConsumer(db: DrizzleDB, validator: ValidatorLike) {
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
      consumerName: 'acervo.p0.ping',
      queue: 'leai.p0.ping',
      exchange: 'leai.events.identidade',
      routingKeys: ['ping.teste'],
    },
    async () => undefined,
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

  it('declares the main queue and its DLQ with the documented topology', async () => {
    const db = makeDb();
    const validator = { parse: jest.fn(() => envelope) };
    const { channel } = await registeredConsumer(db, validator);

    expect(channel.assertQueue).toHaveBeenNthCalledWith(
      1,
      'leai.p0.ping.dlq',
      expect.objectContaining({ durable: true }),
    );
    expect(channel.assertQueue).toHaveBeenNthCalledWith(
      2,
      'leai.p0.ping',
      expect.objectContaining({
        arguments: {
          'x-dead-letter-exchange': 'leai.dead-letter',
          'x-dead-letter-routing-key': 'leai.p0.ping',
        },
      }),
    );
    expect(channel.prefetch).toHaveBeenCalledWith(1);
  });

  it('commits the receipt before ACK and propagates correlation-id to the handler', async () => {
    const db = makeDb();
    const validator = { parse: jest.fn(() => envelope) };
    const { channel } = await registeredConsumer(db, validator);
    const handler = jest.fn(async () => {
      expect(als.getStore()?.correlationId).toBe(envelope.correlationId);
    });
    const connection = {
      isEnabled: () => true,
      onConsumerReady: jest.fn(),
      getConsumerChannelIfReady: () => channel,
    } as unknown as AmqpConnectionService;
    const consumer = new FastConsumer(
      connection,
      validator as unknown as MessageValidator,
      db,
    );
    consumer.onModuleInit();
    consumer.register(
      {
        consumerName: 'acervo.p0.ping',
        queue: 'leai.p0.ping-2',
        exchange: 'leai.events.identidade',
        routingKeys: ['ping.teste'],
      },
      handler,
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    const secondCallback = (channel.consume as jest.Mock).mock.calls[1][1] as (
      message: ConsumeMessage | null,
    ) => Promise<void> | undefined;

    await secondCallback(message);

    expect(handler).toHaveBeenCalledWith(envelope);
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('ACKs duplicate delivery without executing the handler again', async () => {
    const db = makeDb([]);
    const validator = { parse: jest.fn(() => envelope) };
    const { channel, callback } = await registeredConsumer(db, validator);

    await callback(message);

    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('sends invalid messages directly to the DLQ', async () => {
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

  it('retries transient failures and sends the delivery to the DLQ after the third retry', async () => {
    const db = makeDb();
    db.transaction
      .mockRejectedValueOnce(new Error('falha 1'))
      .mockRejectedValueOnce(new Error('falha 2'))
      .mockRejectedValueOnce(new Error('falha 3'))
      .mockRejectedValueOnce(new Error('falha 4'));
    const validator = { parse: jest.fn(() => envelope) };
    const { channel, callback } = await registeredConsumer(db, validator);
    jest.useFakeTimers();
    const processing = callback(message);

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(1);
    await jest.advanceTimersByTimeAsync(2);
    await jest.advanceTimersByTimeAsync(3);
    await processing;

    expect(db.transaction).toHaveBeenCalledTimes(4);
    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
    expect(channel.ack).not.toHaveBeenCalled();
  });
});
