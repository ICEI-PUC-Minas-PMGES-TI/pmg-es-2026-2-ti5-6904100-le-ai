import { Module } from '@nestjs/common';
import { HistoricoController } from './api/historico.controller';
import { HistoricoService } from './aplicacao/historico.service';
import { HistoricoRepository } from './infraestrutura/historico.repository';

@Module({
  controllers: [HistoricoController],
  providers: [HistoricoService, HistoricoRepository],
})
export class HistoricoModule {}
