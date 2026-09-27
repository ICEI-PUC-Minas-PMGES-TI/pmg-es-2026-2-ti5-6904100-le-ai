import { Module } from '@nestjs/common';
import { AmqpConnectionService } from './amqp-connection.service';
import { AmqpConsumerService } from './amqp-consumer.service';
import { AmqpPublisherService } from './amqp-publisher.service';
import { MessageValidator } from './message-validator';
import { OutboxDispatcherService } from './outbox-dispatcher.service';

@Module({
  providers: [
    AmqpConnectionService,
    AmqpConsumerService,
    AmqpPublisherService,
    MessageValidator,
    OutboxDispatcherService,
  ],
  exports: [AmqpPublisherService, AmqpConsumerService, MessageValidator],
})
export class MessagingModule {}
