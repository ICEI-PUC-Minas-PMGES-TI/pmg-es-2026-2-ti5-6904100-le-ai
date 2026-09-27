import { Module } from '@nestjs/common';
import { LeiturasController } from './api/leituras.controller';
import { LeiturasRepository } from './infraestrutura/leituras.repository';
import { LeiturasService } from './aplicacao/leituras.service';

@Module({
  controllers: [LeiturasController],
  providers: [LeiturasService, LeiturasRepository],
  exports: [LeiturasService],
})
export class LeiturasModule {}
