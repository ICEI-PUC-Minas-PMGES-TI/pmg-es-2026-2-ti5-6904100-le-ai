import { Module } from '@nestjs/common';
import { LeiturasController } from './api/leituras.controller';
import { LeiturasRepository } from './infraestrutura/leituras.repository';
import { LeiturasService } from './aplicacao/leituras.service';

/** `LeiturasService` é exportado: o job de inatividade abandona pelo mesmo método (RN-05). */
@Module({
  controllers: [LeiturasController],
  providers: [LeiturasService, LeiturasRepository],
  exports: [LeiturasService],
})
export class LeiturasModule {}
