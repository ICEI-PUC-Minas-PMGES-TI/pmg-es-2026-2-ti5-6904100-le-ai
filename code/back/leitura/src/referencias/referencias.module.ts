import { Global, Module } from '@nestjs/common';
import { ReferenciasExternas } from './referencias-externas.service';

/** Global: estante, leituras e o job de inatividade leem os mesmos contratos. */
@Global()
@Module({
  providers: [ReferenciasExternas],
  exports: [ReferenciasExternas],
})
export class ReferenciasModule {}
