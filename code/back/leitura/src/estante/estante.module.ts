import { Module } from '@nestjs/common';
import { FavoritosModule } from '../favoritos/favoritos.module';
import { EstanteController } from './api/estante.controller';
import { EstanteRepository } from './infraestrutura/estante.repository';
import { EstanteService } from './aplicacao/estante.service';

@Module({
  imports: [FavoritosModule],
  controllers: [EstanteController],
  providers: [EstanteService, EstanteRepository],
})
export class EstanteModule {}
