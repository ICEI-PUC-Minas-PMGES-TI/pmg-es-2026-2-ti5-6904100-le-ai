import { Module } from '@nestjs/common';
import { PerfisController } from './perfis.controller';
import { PerfisRepository } from './perfis.repository';
import { PerfisService } from './perfis.service';

/** Projeções autorizadas de `leitura` para a composição do perfil (RF-SOC-02). */
@Module({
  controllers: [PerfisController],
  providers: [PerfisService, PerfisRepository],
})
export class PerfisModule {}
