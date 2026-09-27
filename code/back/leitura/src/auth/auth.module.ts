import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { VerificadorJwt } from './verificador-jwt.service';

@Global()
@Module({
  providers: [VerificadorJwt, JwtAuthGuard],
  exports: [VerificadorJwt, JwtAuthGuard],
})
export class AuthModule {}
