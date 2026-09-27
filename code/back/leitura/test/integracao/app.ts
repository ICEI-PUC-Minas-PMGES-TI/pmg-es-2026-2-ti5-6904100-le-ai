import { randomUUID } from 'node:crypto';
import type { Type } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { configurarApp } from '../../src/configurar-app';

/**
 * App com o mesmo pipeline HTTP de produção, sobre o banco do fixture.
 *
 * `controllersDeTeste` acrescenta rotas que só existem no teste — é assim que
 * a infra comum (guard, idempotência, outbox) é exercitada antes de existir
 * rota de domínio que a use.
 */
export async function criarApp(
  controllersDeTeste: Type<unknown>[] = [],
): Promise<NestExpressApplication> {
  const modulo = await Test.createTestingModule({
    imports: [AppModule],
    controllers: controllersDeTeste,
  }).compile();
  const app = modulo.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configurarApp(app);
  await app.init();
  return app;
}

/**
 * Variações do token para os testes de recusa: outro segredo ou outro emissor.
 * Sem opções, o token sai exatamente como o `identidade` emite.
 */
export interface OpcoesDoToken {
  segredo?: string;
  issuer?: string;
}

/** Token no formato que o `identidade` emite (HS256, `sub`, `username`). */
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
