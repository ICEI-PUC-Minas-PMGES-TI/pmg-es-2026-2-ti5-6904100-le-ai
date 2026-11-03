import { Module } from '@nestjs/common';
import { FavoritosController } from './api/favoritos.controller';
import { FavoritosService } from './aplicacao/favoritos.service';
import { FavoritosRepository } from './infraestrutura/favoritos.repository';

@Module({
  controllers: [FavoritosController],
  providers: [FavoritosService, FavoritosRepository],
  exports: [FavoritosService],
})
export class FavoritosModule {}
