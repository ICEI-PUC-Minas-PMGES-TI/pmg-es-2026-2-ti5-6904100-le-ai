import { Module } from '@nestjs/common';
import { EstanteController } from './api/estante.controller';
import { EstanteRepository } from './infraestrutura/estante.repository';
import { EstanteService } from './aplicacao/estante.service';

/** Estante do leitor e do perfil (F-EST: RF-EST-01/02/08, RN-04, RN-08). */
@Module({
  controllers: [EstanteController],
  providers: [EstanteService, EstanteRepository],
})
export class EstanteModule {}
