import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { correlationMiddleware } from './common/correlation.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  // Correlation-id primeiro, para envolver toda a requisição (RNF-OBS-01).
  app.use(correlationMiddleware);
  app.useLogger(app.get(Logger));

  // Cabeçalhos de segurança: HSTS, X-Content-Type-Options, X-Frame-Options,
  // Referrer-Policy (RNF-SEC-24). HTTPS é terminado pelo Render (RNF-SEC-08).
  app.use(helmet());

  // CORS restrito às origens conhecidas, sem curinga (RNF-SEC-21).
  const origins = (config.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins.length ? origins : false });

  // Validação de toda entrada por schema explícito (RNF-SEC-13).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Contrato OpenAPI em runtime (RNF-ARQ-03). Esqueleto por ora.
  const openApi = new DocumentBuilder()
    .setTitle(`Lê Ai — ${config.get<string>('SERVICE_NAME') ?? 'acervo'}`)
    .setDescription('Contrato do serviço acervo (esqueleto — P0-INFRA).')
    .setVersion('0.0.1')
    .build();
  const document = SwaggerModule.createDocument(app, openApi);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

void bootstrap();
