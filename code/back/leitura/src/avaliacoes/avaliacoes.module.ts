import { Module, OnModuleInit } from '@nestjs/common';
import { MessageValidator } from '../messaging/message-validator';
import { MessagingModule } from '../messaging/messaging.module';
import notaAlteradaSchema from '../messaging/schemas/nota.alterada.v1.schema.json';
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesRepository } from './avaliacoes.repository';
import { AvaliacoesService } from './avaliacoes.service';
import { NOTA_ALTERADA } from './eventos';

/** F-AVA: nota e resenha do leitor para um livro. */
@Module({
  imports: [MessagingModule],
  controllers: [AvaliacoesController],
  providers: [AvaliacoesService, AvaliacoesRepository],
})
export class AvaliacoesModule implements OnModuleInit {
  constructor(private readonly validador: MessageValidator) {}

  /** A outbox valida o `data` de cada evento contra o schema registrado aqui. */
  onModuleInit(): void {
    this.validador.registerDataSchema(
      NOTA_ALTERADA.tipo,
      NOTA_ALTERADA.versao,
      notaAlteradaSchema,
    );
  }
}
