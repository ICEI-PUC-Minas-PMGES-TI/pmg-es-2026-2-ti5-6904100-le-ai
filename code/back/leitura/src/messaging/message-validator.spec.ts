import type { MessageProperties } from 'amqplib';
import { InvalidMessageError, MessageValidator } from './message-validator';

const eventId = '01994c25-83cd-7d41-a9b4-1d9b71f34560';
const correlationId = '16aa3308-daee-4638-b220-c306484f6a9c';

const properties: MessageProperties = {
  messageId: eventId,
  correlationId,
  type: 'leitura.iniciada',
  contentType: 'application/json',
  deliveryMode: 2,
  headers: {
    'x-event-version': 1,
    'x-business-key': `leitura:${eventId}:iniciada`,
  },
} as unknown as MessageProperties;

describe('MessageValidator', () => {
  it('validates an envelope and its AMQP headers with AJV', () => {
    const body = {
      eventId,
      type: 'leitura.iniciada',
      version: 1,
      occurredAt: '2026-09-16T12:00:00.000Z',
      correlationId,
      businessKey: `leitura:${eventId}:iniciada`,
      data: {},
    };

    expect(new MessageValidator().validateMessage(body, properties)).toEqual(
      body,
    );
  });

  it('rejects an invalid envelope before any domain handler', () => {
    expect(() =>
      new MessageValidator().validateMessage(
        { ...({} as object), type: 'leitura.iniciada' },
        properties,
      ),
    ).toThrow(InvalidMessageError);
  });
});
