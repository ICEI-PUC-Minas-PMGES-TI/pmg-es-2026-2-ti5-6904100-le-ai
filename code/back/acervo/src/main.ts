import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { correlationMiddleware } from './common/correlation.middleware';
import { montarErroDeValidacao } from './common/validacao';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);

  // Sem isto, toda requisição chega com o IP do proxy do Render e o rate
  // limiting por IP (RNF-SEC-18) contaria o mundo inteiro como um cliente só.
  app.set('trust proxy', 1);

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
  // `forbidNonWhitelisted` honra o `additionalProperties: false` do contrato:
  // sem ele, campo extra é descartado em silêncio e o cliente nunca descobre
  // que enviou algo que o servidor ignorou. `exceptionFactory` devolve o corpo
  // de erro padrão com `campos`, em vez do formato próprio do Nest.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: montarErroDeValidacao,
    }),
  );

  // Contrato OpenAPI em runtime (RNF-ARQ-03), equivalente ao arquivo
  // versionado em `docs/api/acervo.yaml` (docs/api/README.md).
  const openApi = new DocumentBuilder()
    .setTitle(`Lê Ai — ${config.get<string>('SERVICE_NAME') ?? 'acervo'}`)
    .setDescription(
      'Contrato do serviço acervo. Cadastro por ISBN e livro pessoal entregues ' +
        'por F-ACV-CADASTRO; busca e página do livro seguem planejadas.',
    )
    .setVersion('0.1.0')
    // O documento de runtime precisa ficar equivalente ao arquivo versionado em
    // `docs/api/acervo.yaml`, que declara `bearerAuth` como segurança global.
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearerAuth',
    )
    .addSecurityRequirements('bearerAuth')
    .build();
  const document = SwaggerModule.createDocument(app, openApi);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

void bootstrap();
