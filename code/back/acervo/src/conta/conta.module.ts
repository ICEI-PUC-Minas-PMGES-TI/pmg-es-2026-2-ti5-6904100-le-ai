import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { ContaExcluidaConsumer } from './conta-excluida.consumer';
import { RemocaoDeAsset } from './remocao-de-asset';

/** Limpeza do acervo na exclusão definitiva de conta (F-CONTA-2). */
@Module({
  imports: [MessagingModule],
  providers: [ContaExcluidaConsumer, RemocaoDeAsset],
})
export class ContaModule {}
