import { Module } from '@nestjs/common';
import { LeiturasModule } from '../../leituras/leituras.module';
import { InatividadeController } from './api/inatividade.controller';
import { InatividadeRepository } from './infraestrutura/inatividade.repository';
import { InatividadeService } from './aplicacao/inatividade.service';
import { SchedulerTokenGuard } from './api/scheduler-token.guard';

@Module({
  imports: [LeiturasModule],
  controllers: [InatividadeController],
  providers: [InatividadeService, InatividadeRepository, SchedulerTokenGuard],
})
export class InatividadeModule {}
