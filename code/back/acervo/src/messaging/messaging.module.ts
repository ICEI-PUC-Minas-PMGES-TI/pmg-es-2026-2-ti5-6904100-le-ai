import { Module } from '@nestjs/common';
import { AmqpConnectionService } from './amqp-connection.service';
import { AmqpConsumerService } from './amqp-consumer.service';
import { AmqpPublisherService } from './amqp-publisher.service';
import { MessageValidator } from './message-validator';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { PingConsumerService } from './ping-consumer.service';

@Module({
  providers: [
    AmqpConnectionService,
    AmqpConsumerService,
    AmqpPublisherService,
    MessageValidator,
    OutboxDispatcherService,
    PingConsumerService,
  ],
  exports: [AmqpPublisherService, AmqpConsumerService],
})
export class MessagingModule {}
