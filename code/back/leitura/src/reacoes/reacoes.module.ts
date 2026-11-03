import { Module, OnModuleInit } from '@nestjs/common';
import { MessageValidator } from '../messaging/message-validator';
import { MessagingModule } from '../messaging/messaging.module';
import resenhaCurtidaSchema from '../messaging/schemas/resenha.curtida.v1.schema.json';
import { RESENHA_CURTIDA } from './eventos';
import { ReacoesController } from './reacoes.controller';
import { ReacoesRepository } from './reacoes.repository';
import { ReacoesService } from './reacoes.service';

/** F-AVA-2: curtir e descurtir resenhas. */
@Module({
  imports: [MessagingModule],
  controllers: [ReacoesController],
  providers: [ReacoesService, ReacoesRepository],
})
export class ReacoesModule implements OnModuleInit {
  constructor(private readonly validador: MessageValidator) {}

  /** A outbox valida o `data` de `resenha.curtida` contra o schema registrado aqui. */
  onModuleInit(): void {
    this.validador.registerDataSchema(
      RESENHA_CURTIDA.tipo,
      RESENHA_CURTIDA.versao,
      resenhaCurtidaSchema,
    );
  }
}
