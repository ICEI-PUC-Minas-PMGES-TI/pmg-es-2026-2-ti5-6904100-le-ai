import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { als } from './als';

export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Lê o `X-Correlation-Id` recebido (ou gera um), coloca no contexto de log
 * (ALS) e o devolve no header da resposta (RNF-OBS-01/03). Registrado como
 * primeiro middleware, envolve o resto da requisição no contexto.
 */
export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers[CORRELATION_HEADER];
  const header = Array.isArray(incoming) ? incoming[0] : incoming;
  const correlationId = header && header.trim() ? header.trim() : randomUUID();

  (req as Request & { correlationId: string }).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  als.run({ correlationId }, () => next());
}
