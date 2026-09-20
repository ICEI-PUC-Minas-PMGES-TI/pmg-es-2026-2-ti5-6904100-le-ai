import { type ErrorObject, type ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { ConsumeMessage, MessageProperties } from 'amqplib';
import envelopeSchema from './schemas/envelope-v1.schema.json';

export interface MessageEnvelope {
  eventId: string;
  type: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  businessKey: string;
  data: Record<string, unknown>;
}

export class InvalidMessageError extends Error {
  readonly permanent = true;

  constructor(message: string) {
    super(message);
    this.name = 'InvalidMessageError';
  }
}

export class MessageValidator {
  private readonly envelope: ValidateFunction;

  constructor() {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    this.envelope = ajv.compile(envelopeSchema);
  }

  validateMessage(
    body: unknown,
    properties: MessageProperties,
  ): MessageEnvelope {
    if (!this.envelope(body)) {
      throw new InvalidMessageError(this.errors(this.envelope.errors));
    }
    const envelope = body as MessageEnvelope;
    const headers = properties.headers ?? {};
    if (
      properties.messageId !== envelope.eventId ||
      properties.correlationId !== envelope.correlationId ||
      properties.type !== envelope.type ||
      properties.contentType !== 'application/json' ||
      properties.deliveryMode !== 2 ||
      headers['x-event-version'] !== envelope.version ||
      headers['x-business-key'] !== envelope.businessKey
    ) {
      throw new InvalidMessageError('Headers AMQP divergem do envelope');
    }
    return envelope;
  }

  parse(message: ConsumeMessage): MessageEnvelope {
    let body: unknown;
    try {
      body = JSON.parse(message.content.toString('utf8')) as unknown;
    } catch {
      throw new InvalidMessageError('Corpo da mensagem não é JSON válido');
    }
    return this.validateMessage(body, message.properties);
  }

  validateEnvelope(envelope: MessageEnvelope): void {
    if (!this.envelope(envelope)) {
      throw new InvalidMessageError(this.errors(this.envelope.errors));
    }
  }

  private errors(errors: ErrorObject[] | null | undefined): string {
    return (
      errors?.map((error) => error.message ?? 'inválido').join('; ') ??
      'Mensagem inválida'
    );
  }
}
