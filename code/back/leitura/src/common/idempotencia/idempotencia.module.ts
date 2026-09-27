import { Global, Module } from '@nestjs/common';
import { IdempotenciaService } from './idempotencia.service';

@Global()
@Module({
  providers: [IdempotenciaService],
  exports: [IdempotenciaService],
})
export class IdempotenciaModule {}
