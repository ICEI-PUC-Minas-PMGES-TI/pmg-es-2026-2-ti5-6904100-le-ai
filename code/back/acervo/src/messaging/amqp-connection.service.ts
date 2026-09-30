import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { EXCHANGES } from './messaging.constants';

export type ConsumerReadyHandler = (channel: amqp.Channel) => void;
export type PublisherReadyHandler = (channel: amqp.ConfirmChannel) => void;

@Injectable()
export class AmqpConnectionService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AmqpConnectionService.name);
  private readonly enabled: boolean;
  private readonly url?: string;
  private connection?: amqp.ChannelModel;
  private publisherChannel?: amqp.ConfirmChannel;
  private consumerChannel?: amqp.Channel;
  private reconnectTimer?: NodeJS.Timeout;
  private connecting = false;
  private closing = false;
  private readonly publisherReadyHandlers: PublisherReadyHandler[] = [];
  private readonly consumerReadyHandlers: ConsumerReadyHandler[] = [];

  constructor(config: ConfigService) {
    this.enabled =
      config.get<boolean>('AMQP_ENABLED') ??
      process.env.AMQP_ENABLED === 'true';
    this.url = config.get<string>('AMQP_URL') ?? process.env.AMQP_URL;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  onPublisherReady(handler: PublisherReadyHandler): void {
    this.publisherReadyHandlers.push(handler);
    if (this.publisherChannel) handler(this.publisherChannel);
  }

  onConsumerReady(handler: ConsumerReadyHandler): void {
    this.consumerReadyHandlers.push(handler);
    if (this.consumerChannel) handler(this.consumerChannel);
  }

  getPublisherChannel(): amqp.ConfirmChannel {
    if (!this.publisherChannel)
      throw new Error('Canal AMQP de publicação indisponível');
    return this.publisherChannel;
  }

  getConsumerChannelIfReady(): amqp.Channel | undefined {
    return this.consumerChannel;
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) return;
    if (!this.url)
      throw new Error('AMQP_URL é obrigatório quando AMQP_ENABLED=true');
    void this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    await this.connection?.close().catch(() => undefined);
  }

  private async connect(): Promise<void> {
    if (this.connecting || this.closing || !this.url) return;
    this.connecting = true;
    try {
      const connection = await amqp.connect(this.url);
      const publisher = await connection.createConfirmChannel();
      const consumer = await connection.createChannel();
      await publisher.assertExchange(EXCHANGES.acervo, 'topic', {
        durable: true,
        autoDelete: false,
      });
      await publisher.assertExchange(EXCHANGES.deadLetter, 'direct', {
        durable: true,
        autoDelete: false,
      });

      this.connection = connection;
      this.publisherChannel = publisher;
      this.consumerChannel = consumer;
      connection.on('error', (error) =>
        this.logger.warn(`AMQP: ${error.message}`),
      );
      connection.on('close', () => this.handleDisconnect());
      publisher.on('error', (error) =>
        this.logger.warn(`AMQP publisher: ${error.message}`),
      );
      consumer.on('error', (error) =>
        this.logger.warn(`AMQP consumer: ${error.message}`),
      );

      for (const handler of this.publisherReadyHandlers) handler(publisher);
      for (const handler of this.consumerReadyHandlers) handler(consumer);
    } catch (error) {
      this.logger.warn(
        `Não foi possível conectar ao RabbitMQ: ${this.errorMessage(error)}`,
      );
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private handleDisconnect(): void {
    this.publisherChannel = undefined;
    this.consumerChannel = undefined;
    this.connection = undefined;
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.closing || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, 5_000);
    this.reconnectTimer.unref();
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
