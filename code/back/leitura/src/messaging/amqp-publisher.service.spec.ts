import type { ConfirmChannel } from 'amqplib';
import { AmqpPublisherService } from './amqp-publisher.service';
import type { AmqpConnectionService } from './amqp-connection.service';
import {
  type MessageEnvelope,
  type MessageValidator,
} from './message-validator';

const envelope: MessageEnvelope = {
  eventId: '01994c25-83cd-7d41-a9b4-1d9b71f34560',
  type: 'leitura.iniciada',
  version: 1,
  occurredAt: '2026-09-16T12:00:00.000Z',
  correlationId: '16aa3308-daee-4638-b220-c306484f6a9c',
  businessKey: 'leitura:01994c25-83cd-7d41-a9b4-1d9b71f34560:iniciada',
  data: {},
};

describe('AmqpPublisherService', () => {
  it('publishes a persistent envelope with the canonical headers', async () => {
    const channel = {
      publish: jest.fn(
        (
          _exchange: string,
          _routingKey: string,
          _body: Buffer,
          _options: unknown,
          callback: (error?: Error | null) => void,
        ) => callback(null),
      ),
    } as unknown as ConfirmChannel;
    const connection = {
      getPublisherChannel: () => channel,
    } as unknown as AmqpConnectionService;
    const validator = {
      validateEnvelope: jest.fn(),
    } as unknown as MessageValidator;

    await new AmqpPublisherService(connection, validator).publish(envelope);

    expect(validator.validateEnvelope).toHaveBeenCalledWith(envelope);
    const [exchange, routingKey, body, options, confirm] = (
      channel.publish as jest.Mock
    ).mock.calls[0];
    expect(exchange).toBe('leai.events.leitura');
    expect(routingKey).toBe(envelope.type);
    expect(body).toBeDefined();
    expect(options).toEqual(
      expect.objectContaining({
        persistent: true,
        messageId: envelope.eventId,
        correlationId: envelope.correlationId,
        type: envelope.type,
        contentType: 'application/json',
      }),
    );
    expect(confirm).toEqual(expect.any(Function));
  });
});
