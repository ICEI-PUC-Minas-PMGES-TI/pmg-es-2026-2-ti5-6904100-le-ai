import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { VerificadorJwt } from './verificador-jwt.service';

/**
 * Global porque o `JwtAuthGuard` é registrado como `APP_GUARD` em `AppModule` e
 * precisa resolver o `VerificadorJwt` sem que cada módulo de domínio o importe.
 */
@Global()
@Module({
  providers: [VerificadorJwt, JwtAuthGuard],
  exports: [VerificadorJwt, JwtAuthGuard],
})
export class AuthModule {}
