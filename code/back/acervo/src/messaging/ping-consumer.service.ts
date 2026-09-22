import { Injectable, OnModuleInit } from '@nestjs/common';
import { AmqpConsumerService } from './amqp-consumer.service';
import { EXCHANGES, PING_CONSUMER, PING_QUEUE } from './messaging.constants';

@Injectable()
export class PingConsumerService implements OnModuleInit {
  constructor(private readonly consumer: AmqpConsumerService) {}

  onModuleInit(): void {
    this.consumer.register(
      {
        consumerName: PING_CONSUMER,
        queue: PING_QUEUE,
        exchange: EXCHANGES.identidade,
        routingKeys: ['ping.teste'],
      },
      async () => undefined,
    );
  }
}
