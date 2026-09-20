import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Channel, ConsumeMessage } from 'amqplib';
import { als } from '../common/als';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.module';
import { AmqpConnectionService } from './amqp-connection.service';
import {
  deadLetterArguments,
  EXCHANGES,
  RETRY_DELAYS_MS,
} from './messaging.constants';
import {
  InvalidMessageError,
  type MessageEnvelope,
  MessageValidator,
} from './message-validator';

export interface ConsumerDefinition {
  consumerName: string;
  queue: string;
  exchange: string;
  routingKeys: readonly string[];
}

export type MessageHandler = (
  envelope: MessageEnvelope,
) => Promise<void> | void;

interface Registration {
  definition: ConsumerDefinition;
  handler: MessageHandler;
}

@Injectable()
export class AmqpConsumerService implements OnModuleInit {
  private readonly logger = new Logger(AmqpConsumerService.name);
  private readonly registrations: Registration[] = [];
  private readonly startedChannels = new Map<Channel, Set<string>>();
  private readonly startingQueues = new Map<Channel, Set<string>>();

  constructor(
    private readonly connection: AmqpConnectionService,
    private readonly validator: MessageValidator,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  onModuleInit(): void {
    if (!this.connection.isEnabled()) return;
    this.connection.onConsumerReady(
      (channel) => void this.startOnChannel(channel),
    );
  }

  register(definition: ConsumerDefinition, handler: MessageHandler): void {
    this.registrations.push({ definition, handler });
    const channel = this.connection.getConsumerChannelIfReady();
    if (channel) void this.startOnChannel(channel);
  }

  protected retryDelays(): readonly number[] {
    return RETRY_DELAYS_MS;
  }

  private async startOnChannel(channel: Channel): Promise<void> {
    const started = this.startedChannels.get(channel) ?? new Set<string>();
    this.startedChannels.set(channel, started);
    const starting = this.startingQueues.get(channel) ?? new Set<string>();
    this.startingQueues.set(channel, starting);

    await channel.assertExchange(EXCHANGES.deadLetter, 'direct', {
      durable: true,
      autoDelete: false,
    });

    for (const registration of this.registrations) {
      const queue = registration.definition.queue;
      if (started.has(queue) || starting.has(queue)) continue;
      starting.add(queue);
      try {
        await this.startRegistration(channel, registration);
        started.add(queue);
      } finally {
        starting.delete(queue);
      }
    }
  }

  private async startRegistration(
    channel: Channel,
    registration: Registration,
  ): Promise<void> {
    const { definition } = registration;
    await channel.assertExchange(definition.exchange, 'topic', {
      durable: true,
      autoDelete: false,
    });
    const deadLetterQueue = `${definition.queue}.dlq`;
    await channel.assertQueue(deadLetterQueue, {
      durable: true,
      autoDelete: false,
    });
    await channel.bindQueue(
      deadLetterQueue,
      EXCHANGES.deadLetter,
      definition.queue,
    );
    await channel.assertQueue(definition.queue, {
      durable: true,
      autoDelete: false,
      arguments: deadLetterArguments(definition.queue),
    });
    for (const routingKey of definition.routingKeys) {
      await channel.bindQueue(
        definition.queue,
        definition.exchange,
        routingKey,
      );
    }
    await channel.prefetch(1);
    await channel.consume(definition.queue, (message) => {
      if (message) return this.handle(channel, registration, message);
      return undefined;
    });
  }

  private async handle(
    channel: Channel,
    registration: Registration,
    message: ConsumeMessage,
  ): Promise<void> {
    let envelope: MessageEnvelope;
    try {
      envelope = this.validator.parse(message);
    } catch (error) {
      if (error instanceof InvalidMessageError) {
        channel.nack(message, false, false);
        return;
      }
      throw error;
    }

    try {
      await this.withCorrelationId(envelope, () =>
        this.processOnce(registration, envelope),
      );
      channel.ack(message);
      this.logger.log(
        `Mensagem consumida eventId=${envelope.eventId} correlationId=${envelope.correlationId}`,
      );
    } catch (error) {
      await this.retry(channel, registration, message, envelope, error);
    }
  }

  private async retry(
    channel: Channel,
    registration: Registration,
    message: ConsumeMessage,
    envelope: MessageEnvelope,
    firstFailure: unknown,
  ): Promise<void> {
    let failure = firstFailure;
    for (const delay of this.retryDelays()) {
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
      try {
        await this.withCorrelationId(envelope, () =>
          this.processOnce(registration, envelope),
        );
        channel.ack(message);
        this.logger.log(
          `Mensagem consumida após retry eventId=${envelope.eventId} correlationId=${envelope.correlationId}`,
        );
        return;
      } catch (error) {
        failure = error;
      }
    }

    this.logger.error(
      `Mensagem enviada à DLQ eventId=${envelope.eventId} correlationId=${envelope.correlationId}: ${this.errorMessage(failure)}`,
    );
    channel.nack(message, false, false);
  }

  private async processOnce(
    registration: Registration,
    envelope: MessageEnvelope,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const result = await tx.execute(sql`
        INSERT INTO acervo.mensagem_processada (consumidor, event_id, processado_em)
        VALUES (${registration.definition.consumerName}, ${envelope.eventId}, now())
        ON CONFLICT (consumidor, event_id) DO NOTHING
        RETURNING event_id
      `);
      const rows = (result as unknown as { rows: unknown[] }).rows;
      if (rows.length === 1) await registration.handler(envelope);
    });
  }

  private async withCorrelationId<T>(
    envelope: MessageEnvelope,
    operation: () => Promise<T>,
  ): Promise<T> {
    return als.run({ correlationId: envelope.correlationId }, operation);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
