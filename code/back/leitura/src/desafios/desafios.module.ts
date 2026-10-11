import { Module } from '@nestjs/common';
import { DesafiosController } from './api/desafios.controller';
import { DesafiosService } from './aplicacao/desafios.service';
import { DesafiosRepository } from './infraestrutura/desafios.repository';

/** Desafios de leitura (F-DSF). */
@Module({
  controllers: [DesafiosController],
  providers: [DesafiosService, DesafiosRepository],
  exports: [DesafiosService],
})
export class DesafiosModule {}
