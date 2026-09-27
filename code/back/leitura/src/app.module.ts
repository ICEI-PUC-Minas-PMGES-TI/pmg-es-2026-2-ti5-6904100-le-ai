import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env';
import { getCorrelationId } from './common/als';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { AuthModule } from './auth/auth.module';
import { AvaliacoesModule } from './avaliacoes/avaliacoes.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { IdempotenciaModule } from './common/idempotencia/idempotencia.module';
import { DrizzleModule } from './db/drizzle.module';
import { EstanteModule } from './estante/estante.module';
import { HealthModule } from './health/health.module';
import { InatividadeModule } from './jobs/inatividade/inatividade.module';
import { LeiturasModule } from './leituras/leituras.module';
import { MessagingModule } from './messaging/messaging.module';
import { OutboxModule } from './outbox/outbox.module';
import { PerfisModule } from './perfis/perfis.module';
import { ReferenciasModule } from './referencias/referencias.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        // Todo log dentro da requisição carrega o correlation-id (RNF-OBS-01).
        mixin: () => {
          const correlationId = getCorrelationId();
          return correlationId ? { correlationId } : {};
        },
        // Nunca logar dados sensíveis (RNF-SEC-36).
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.senha',
            '*.token',
            '*.hash',
          ],
          remove: true,
        },
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    DrizzleModule,
    AuthModule,
    IdempotenciaModule,
    HealthModule,
    MessagingModule,
    OutboxModule,
    ReferenciasModule,
    AvaliacoesModule,
    PerfisModule,
    EstanteModule,
    LeiturasModule,
    InatividadeModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // Guard global: rota nova nasce protegida. `/health` se libera com
    // `@Publico()` — o custo de esquecer o decorator é um 401, não um vazamento.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
