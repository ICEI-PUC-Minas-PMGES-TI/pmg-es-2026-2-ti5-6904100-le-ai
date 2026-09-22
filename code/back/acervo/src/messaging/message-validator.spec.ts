import type { ConsumeMessage } from 'amqplib';
import { MessageValidator } from './message-validator';

const eventId = '01994c25-83cd-7d41-a9b4-1d9b71f34560';
const correlationId = '16aa3308-daee-4638-b220-c306484f6a9c';

function message(
  overrides: Partial<ConsumeMessage['properties']> = {},
): ConsumeMessage {
  const envelope = {
    eventId,
    type: 'ping.teste',
    version: 1,
    occurredAt: '2026-09-16T12:00:00.000Z',
    correlationId,
    businessKey: `ping:${eventId}`,
    data: { mensagem: 'ping' },
  };
  return {
    content: Buffer.from(JSON.stringify(envelope)),
    fields: {
      consumerTag: 'test-consumer',
      deliveryTag: 1,
      redelivered: false,
      exchange: '',
      routingKey: '',
    },
    properties: {
      messageId: eventId,
      correlationId,
      type: 'ping.teste',
      contentType: 'application/json',
      deliveryMode: 2,
      headers: { 'x-event-version': 1, 'x-business-key': `ping:${eventId}` },
      ...overrides,
    } as ConsumeMessage['properties'],
  };
}

describe('MessageValidator', () => {
  it('accepts the canonical ping envelope and headers', () => {
    expect(new MessageValidator().parse(message())).toMatchObject({
      eventId,
      type: 'ping.teste',
      version: 1,
    });
  });

  it('rejects divergent AMQP headers', () => {
    expect(() =>
      new MessageValidator().parse(message({ type: 'other.event' })),
    ).toThrow('Headers AMQP divergem');
  });
});
