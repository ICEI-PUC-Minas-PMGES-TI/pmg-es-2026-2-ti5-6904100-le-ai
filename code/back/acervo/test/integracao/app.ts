import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/configurar-app';

/** App com o mesmo pipeline HTTP de produção, sobre o banco do fixture. */
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

/** Token no formato que o `identidade` emite (HS256, `sub`, `username`). */
export function tokenDe(usuarioId: string, username = 'leitora'): string {
  return jwt.sign({ username }, process.env.JWT_SECRET as string, {
    algorithm: 'HS256',
    issuer: 'identidade',
    subject: usuarioId,
    expiresIn: '15m',
  });
}

export function novoUsuario(): string {
  return randomUUID();
}
