import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { getCorrelationId } from './als';
import { mapError } from './error-codes';

/**
 * Handler global de exceções. Toda resposta de erro tem a mesma forma
 * (RNF-ERR-01): `{ codigo, mensagem, correlationId }`, com código HTTP
 * semântico e mensagem em pt-BR sem detalhe técnico (RNF-SEC-22).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { correlationId?: string }>();

    const correlationId =
      req?.correlationId ?? getCorrelationId() ?? 'desconhecido';
    const { status, codigo, mensagem, extras, cabecalhos } =
      mapError(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // 5xx: registra o erro real (com stack) no log; nunca na resposta.
      this.logger.error({ err: exception, correlationId }, 'Erro não tratado');
    } else {
      this.logger.warn({ correlationId, codigo, status }, mensagem);
    }

    for (const [nome, valor] of Object.entries(cabecalhos ?? {})) {
      res.setHeader(nome, valor);
    }

    // `codigo`, `mensagem` e `correlationId` vêm por último de propósito: os
    // extras nunca podem sobrescrever o corpo de erro padrão (RNF-ERR-01).
    res.status(status).json({ ...extras, codigo, mensagem, correlationId });
  }
}
