import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { correlationMiddleware } from './common/correlation.middleware';
import { montarErroDeValidacao } from './common/validacao';

/**
 * Pipeline HTTP do serviço: proxy, correlation-id, log, cabeçalhos de
 * segurança, CORS e validação. Separado do `bootstrap` para que os testes de
 * integração subam exatamente o mesmo pipeline que produção.
 */
export function configurarApp(app: NestExpressApplication): void {
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
}
