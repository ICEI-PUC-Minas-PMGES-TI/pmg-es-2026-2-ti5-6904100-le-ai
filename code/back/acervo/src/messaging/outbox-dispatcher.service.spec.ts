import type { DrizzleDB } from '../db/drizzle.module';
import { AmqpConnectionService } from './amqp-connection.service';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import type { AmqpPublisherService } from './amqp-publisher.service';

const row = {
  event_id: '01994c25-83cd-7d41-a9b4-1d9b71f34560',
  tipo: 'ping.teste',
  versao: 1,
  chave_negocio: 'ping:01994c25-83cd-7d41-a9b4-1d9b71f34560',
  correlation_id: '16aa3308-daee-4638-b220-c306484f6a9c',
  payload: { mensagem: 'ping' },
  tentativas: 0,
  criado_em: new Date('2026-09-16T12:00:00.000Z'),
  proxima_tentativa_em: null,
};

function makeDb() {
  const execute = jest
    .fn()
    .mockResolvedValueOnce({ rows: [row] })
    .mockResolvedValueOnce({ rows: [] });
  const transaction = jest.fn(
    async (callback: (tx: { execute: typeof execute }) => Promise<void>) =>
      callback({ execute }),
  );
  return { execute, transaction } as unknown as DrizzleDB & {
    transaction: jest.Mock;
  };
}

describe('OutboxDispatcherService', () => {
  it('marks an outbox row as published only after publisher success', async () => {
    const db = makeDb();
    const publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    const connection = { isEnabled: () => true };
    const service = new OutboxDispatcherService(
      db,
      connection as unknown as AmqpConnectionService,
      publisher as unknown as AmqpPublisherService,
    );

    await service.dispatchOnce();

    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: row.event_id, type: row.tipo }),
    );
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed outbox row pending and increments its retry schedule', async () => {
    const db = makeDb();
    const publisher = {
      publish: jest.fn().mockRejectedValue(new Error('broker indisponível')),
    };
    const connection = { isEnabled: () => true };
    const service = new OutboxDispatcherService(
      db,
      connection as unknown as AmqpConnectionService,
      publisher as unknown as AmqpPublisherService,
    );

    await service.dispatchOnce();

    expect(db.execute).toHaveBeenCalledTimes(2);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });
});
