import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/configurar-app';

export async function criarApp(): Promise<NestExpressApplication> {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = modulo.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configurarApp(app);
  await app.init();
  return app;
}

export interface OpcoesDoToken {
  segredo?: string;
  issuer?: string;
}

export function tokenDe(
  usuarioId: string,
  username = 'leitora',
  opcoes: OpcoesDoToken = {},
): string {
  const segredo = opcoes.segredo ?? (process.env.JWT_SECRET as string);
  return jwt.sign({ username }, segredo, {
    algorithm: 'HS256',
    issuer: opcoes.issuer ?? 'identidade',
    subject: usuarioId,
    expiresIn: '15m',
  });
}

export function novoUsuario(): string {
  return randomUUID();
}
