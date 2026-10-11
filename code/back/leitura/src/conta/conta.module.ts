import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { ContaExcluidaConsumer } from './conta-excluida.consumer';

/** Limpeza da leitura na exclusão definitiva de conta (F-CONTA-2). */
@Module({
  imports: [MessagingModule],
  providers: [ContaExcluidaConsumer],
})
export class ContaModule {}
