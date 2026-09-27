import { Module } from '@nestjs/common';
import { EstanteController } from './api/estante.controller';
import { EstanteRepository } from './infraestrutura/estante.repository';
import { EstanteService } from './aplicacao/estante.service';

@Module({
  controllers: [EstanteController],
  providers: [EstanteService, EstanteRepository],
})
export class EstanteModule {}
