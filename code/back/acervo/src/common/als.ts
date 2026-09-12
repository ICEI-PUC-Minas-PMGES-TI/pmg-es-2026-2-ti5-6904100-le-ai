import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  correlationId: string;
}

/**
 * Contexto por requisição, propagado pela cadeia assíncrona. Guarda o
 * correlation-id para que log e corpo de erro o incluam sem carregá-lo
 * manualmente por toda parte (RNF-OBS-01). Também será a origem do id
 * propagado nas mensagens em P0-MSG.
 */
export const als = new AsyncLocalStorage<RequestContext>();

export function getCorrelationId(): string | undefined {
  return als.getStore()?.correlationId;
}
