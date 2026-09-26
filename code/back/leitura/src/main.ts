import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);

  configurarApp(app);

  // Contrato OpenAPI em runtime (RNF-ARQ-03), equivalente ao arquivo
  // versionado em `docs/api/leitura.yaml`, que declara `bearerAuth` como
  // segurança global.
  const openApi = new DocumentBuilder()
    .setTitle(`Lê Ai — ${config.get<string>('SERVICE_NAME') ?? 'leitura'}`)
    .setDescription('Contrato do serviço leitura.')
    .setVersion('0.1.0')
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
