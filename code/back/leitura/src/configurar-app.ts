import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { correlationMiddleware } from './common/correlation.middleware';
import { montarErroDeValidacao } from './common/validacao';

export function configurarApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  app.use(correlationMiddleware);
  app.useLogger(app.get(Logger));

  app.use(helmet());

  const origins = (config.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins.length ? origins : false });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: montarErroDeValidacao,
    }),
  );
}
