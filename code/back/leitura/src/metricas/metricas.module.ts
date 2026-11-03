import { Module } from '@nestjs/common';
import { DesafiosModule } from '../desafios/desafios.module';
import { EstatisticasModule } from '../estatisticas/estatisticas.module';
import { MessagingModule } from '../messaging/messaging.module';
import { SequenciaModule } from '../sequencia/sequencia.module';
import { MetricasConsumer } from './metricas.consumer';

/** Consumidor de métricas: sequência (F-GAM), desafios (F-DSF) e estatísticas (F-STA). */
@Module({
  imports: [
    MessagingModule,
    SequenciaModule,
    DesafiosModule,
    EstatisticasModule,
  ],
  providers: [MetricasConsumer],
})
export class MetricasModule {}
