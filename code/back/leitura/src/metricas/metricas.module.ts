import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { SequenciaModule } from '../sequencia/sequencia.module';
import { ProgressoRegistradoConsumer } from './progresso-registrado.consumer';

/** Consumidor de métricas: sequência (F-GAM); depois desafios e estatísticas. */
@Module({
  imports: [MessagingModule, SequenciaModule],
  providers: [ProgressoRegistradoConsumer],
})
export class MetricasModule {}
