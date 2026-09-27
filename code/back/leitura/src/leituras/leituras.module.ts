import { Module, OnModuleInit } from '@nestjs/common';
import { MessageValidator } from '../messaging/message-validator';
import { MessagingModule } from '../messaging/messaging.module';
import leituraAbandonadaSchema from '../messaging/schemas/leitura.abandonada.v1.schema.json';
import leituraEmRiscoSchema from '../messaging/schemas/leitura.em_risco.v1.schema.json';
import leituraExpiradaSchema from '../messaging/schemas/leitura.expirada.v1.schema.json';
import leituraFinalizadaSchema from '../messaging/schemas/leitura.finalizada.v1.schema.json';
import leituraIniciadaSchema from '../messaging/schemas/leitura.iniciada.v1.schema.json';
import leituraRetomadaSchema from '../messaging/schemas/leitura.retomada.v1.schema.json';
import livroAdicionadoAEstanteSchema from '../messaging/schemas/livro.adicionado_a_estante.v1.schema.json';
import { LeiturasController } from './api/leituras.controller';
import { LeiturasRepository } from './infraestrutura/leituras.repository';
import { LeiturasService } from './aplicacao/leituras.service';
import { EVENTO_VERSAO_V1, TIPO_EVENTO } from './dominio/eventos';

const SCHEMAS_DOS_EVENTOS: ReadonlyArray<[string, object]> = [
  [TIPO_EVENTO.LEITURA_INICIADA, leituraIniciadaSchema],
  [TIPO_EVENTO.LEITURA_RETOMADA, leituraRetomadaSchema],
  [TIPO_EVENTO.LEITURA_FINALIZADA, leituraFinalizadaSchema],
  [TIPO_EVENTO.LEITURA_ABANDONADA, leituraAbandonadaSchema],
  [TIPO_EVENTO.LEITURA_EM_RISCO, leituraEmRiscoSchema],
  [TIPO_EVENTO.LEITURA_EXPIRADA, leituraExpiradaSchema],
  [TIPO_EVENTO.LIVRO_ADICIONADO_A_ESTANTE, livroAdicionadoAEstanteSchema],
];

@Module({
  imports: [MessagingModule],
  controllers: [LeiturasController],
  providers: [LeiturasService, LeiturasRepository],
  exports: [LeiturasService],
})
export class LeiturasModule implements OnModuleInit {
  constructor(private readonly validador: MessageValidator) {}

  onModuleInit(): void {
    for (const [tipo, schema] of SCHEMAS_DOS_EVENTOS) {
      this.validador.registerDataSchema(tipo, EVENTO_VERSAO_V1, schema);
    }
  }
}
