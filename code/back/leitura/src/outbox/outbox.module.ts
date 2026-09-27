import { Global, Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { OutboxRepository } from './outbox.repository';

/**
 * Global porque toda feature de `leitura` que produz evento grava na mesma
 * outbox. O `MessageValidator` vem do `MessagingModule`, onde cada produtor
 * registra o schema do seu evento.
 */
@Global()
@Module({
  imports: [MessagingModule],
  providers: [OutboxRepository],
  exports: [OutboxRepository],
})
export class OutboxModule {}
