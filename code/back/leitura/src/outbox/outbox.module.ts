import { Global, Module } from '@nestjs/common';
import { OutboxRepository } from './outbox.repository';

/**
 * Global: toda escrita de `leitura` que produz evento grava a outbox na própria
 * transação. A publicação é do `MessagingModule` (`OutboxDispatcherService`).
 */
@Global()
@Module({
  providers: [OutboxRepository],
  exports: [OutboxRepository],
})
export class OutboxModule {}
