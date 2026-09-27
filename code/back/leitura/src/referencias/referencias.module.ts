import { Global, Module } from '@nestjs/common';
import { ReferenciasExternas } from './referencias-externas.service';

@Global()
@Module({
  providers: [ReferenciasExternas],
  exports: [ReferenciasExternas],
})
export class ReferenciasModule {}
