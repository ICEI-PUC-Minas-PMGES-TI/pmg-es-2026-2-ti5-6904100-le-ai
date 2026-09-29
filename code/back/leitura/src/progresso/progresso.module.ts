import { Module, OnModuleInit } from '@nestjs/common';
import { EVENTO_VERSAO_V1, TIPO_EVENTO } from '../leituras/dominio/eventos';
import { MessageValidator } from '../messaging/message-validator';
import { MessagingModule } from '../messaging/messaging.module';
import progressoRegistradoSchema from '../messaging/schemas/progresso.registrado.v1.schema.json';
import { ProgressoController } from './api/progresso.controller';
import { ProgressoService } from './aplicacao/progresso.service';
import { ProgressoRepository } from './infraestrutura/progresso.repository';

@Module({
  imports: [MessagingModule],
  controllers: [ProgressoController],
  providers: [ProgressoService, ProgressoRepository],
})
export class ProgressoModule implements OnModuleInit {
  constructor(private readonly validador: MessageValidator) {}

  onModuleInit(): void {
    this.validador.registerDataSchema(
      TIPO_EVENTO.PROGRESSO_REGISTRADO,
      EVENTO_VERSAO_V1,
      progressoRegistradoSchema,
    );
  }
}
