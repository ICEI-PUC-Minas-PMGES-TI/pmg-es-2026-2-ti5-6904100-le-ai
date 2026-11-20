import { Module, OnModuleInit } from '@nestjs/common';
import { MessageValidator } from '../../messaging/message-validator';
import { MessagingModule } from '../../messaging/messaging.module';
import lembreteSequenciaSchema from '../../messaging/schemas/lembrete.sequencia.v1.schema.json';
import {
  TIPO_LEMBRETE_SEQUENCIA,
  VERSAO_LEMBRETE_SEQUENCIA,
} from '../../sequencia/dominio/lembrete';
import { SequenciaModule } from '../../sequencia/sequencia.module';
import { SchedulerTokenGuard } from '../inatividade/api/scheduler-token.guard';
import { LembreteSequenciaController } from './api/lembrete-sequencia.controller';
import { LembreteSequenciaService } from './aplicacao/lembrete-sequencia.service';
import { LembreteSequenciaRepository } from './infraestrutura/lembrete-sequencia.repository';

/** Job diário do lembrete de sequência (F-GAM-OPC, RF-GAM-05). */
@Module({
  imports: [MessagingModule, SequenciaModule],
  controllers: [LembreteSequenciaController],
  providers: [
    LembreteSequenciaService,
    LembreteSequenciaRepository,
    SchedulerTokenGuard,
  ],
})
export class LembreteSequenciaModule implements OnModuleInit {
  constructor(private readonly validador: MessageValidator) {}

  onModuleInit(): void {
    this.validador.registerDataSchema(
      TIPO_LEMBRETE_SEQUENCIA,
      VERSAO_LEMBRETE_SEQUENCIA,
      lembreteSequenciaSchema,
    );
  }
}
