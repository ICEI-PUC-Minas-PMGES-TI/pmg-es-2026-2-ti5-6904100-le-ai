import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { als } from './als';

export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * O correlation-id precisa ser UUID, não qualquer string.
 *
 * Não é preciosismo de formato: `outbox_acervo.correlation_id` é `uuid NOT NULL`
 * quando a linha não está anonimizada (CHECK `outbox_acervo_anonimizacao_ck`).
 * Um cliente mandando `X-Correlation-Id: abc` faria o INSERT da outbox falhar
 * com `invalid input syntax for type uuid` e derrubaria a transação inteira do
 * `202` de `POST /livros/oficial` — um erro 500 causado por um header.
 *
 * Header fora do formato é substituído por um id gerado, em silêncio: o id é
 * de rastreio, e recusar a requisição por causa dele seria pior do que ignorá-lo.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ehCorrelationIdValido(valor: string | undefined): boolean {
  return typeof valor === 'string' && UUID.test(valor.trim());
}

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
  const correlationId = ehCorrelationIdValido(header)
    ? (header as string).trim().toLowerCase()
    : randomUUID();

  (req as Request & { correlationId: string }).correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  als.run({ correlationId }, () => next());
}
