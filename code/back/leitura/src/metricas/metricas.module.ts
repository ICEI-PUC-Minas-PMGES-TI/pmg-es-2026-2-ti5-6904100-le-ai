import { Module } from '@nestjs/common';
import { DesafiosModule } from '../desafios/desafios.module';
import { MessagingModule } from '../messaging/messaging.module';
import { SequenciaModule } from '../sequencia/sequencia.module';
import { MetricasConsumer } from './metricas.consumer';

/** Consumidor de métricas: sequência (F-GAM) e desafios (F-DSF); depois estatísticas. */
@Module({
  imports: [MessagingModule, SequenciaModule, DesafiosModule],
  providers: [MetricasConsumer],
})
export class MetricasModule {}
