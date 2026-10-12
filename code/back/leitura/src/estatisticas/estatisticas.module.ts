import { Module } from '@nestjs/common';
import { EstatisticasController } from './api/estatisticas.controller';
import { EstatisticasService } from './aplicacao/estatisticas.service';
import { EstatisticasRepository } from './infraestrutura/estatisticas.repository';

/** Estatísticas de leitura (F-STA). */
@Module({
  controllers: [EstatisticasController],
  providers: [EstatisticasService, EstatisticasRepository],
  exports: [EstatisticasService],
})
export class EstatisticasModule {}
