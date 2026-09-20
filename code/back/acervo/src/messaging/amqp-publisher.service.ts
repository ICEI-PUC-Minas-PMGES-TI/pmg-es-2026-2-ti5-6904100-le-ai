import { Injectable } from '@nestjs/common';
import type { Options } from 'amqplib';
import { AmqpConnectionService } from './amqp-connection.service';
import { EXCHANGES } from './messaging.constants';
import { type MessageEnvelope, MessageValidator } from './message-validator';

@Injectable()
export class AmqpPublisherService {
  constructor(
    private readonly connection: AmqpConnectionService,
    private readonly validator: MessageValidator,
  ) {}

  async publish(envelope: MessageEnvelope): Promise<void> {
    this.validator.validateEnvelope(envelope);
    const channel = this.connection.getPublisherChannel();
    const options: Options.Publish = {
      persistent: true,
      contentType: 'application/json',
      messageId: envelope.eventId,
      correlationId: envelope.correlationId,
      type: envelope.type,
      headers: {
        'x-event-version': envelope.version,
        'x-business-key': envelope.businessKey,
      },
    };
    await new Promise<void>((resolve, reject) => {
      channel.publish(
        EXCHANGES.acervo,
        envelope.type,
        Buffer.from(JSON.stringify(envelope), 'utf8'),
        options,
        (error) => (error ? reject(error) : resolve()),
      );
    });
  }
}
