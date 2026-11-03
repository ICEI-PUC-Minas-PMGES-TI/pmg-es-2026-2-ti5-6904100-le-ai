import { Module } from '@nestjs/common';
import { SequenciaController } from './api/sequencia.controller';
import { SequenciaRepository } from './sequencia.repository';
import { SequenciaService } from './sequencia.service';

/** Sequência diária de leitura (F-GAM). */
@Module({
  controllers: [SequenciaController],
  providers: [SequenciaService, SequenciaRepository],
  exports: [SequenciaService],
})
export class SequenciaModule {}
