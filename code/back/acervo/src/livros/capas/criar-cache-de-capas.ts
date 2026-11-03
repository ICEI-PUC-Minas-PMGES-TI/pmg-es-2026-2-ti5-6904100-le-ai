import type { Env } from '../../config/env';
import { HttpExterno } from '../importacao/dominio/http-externo';
import { PoliticaDeResiliencia } from '../importacao/dominio/politica-resiliencia';
import { CacheDeCapas } from './cache-de-capas.service';
import { EnvioDeCapa } from './envio-de-capa';

export type ConfiguracaoDoCache = Pick<
  Env,
  | 'CLOUDINARY_CLOUD_NAME'
  | 'CLOUDINARY_API_KEY'
  | 'CLOUDINARY_API_SECRET'
  | 'CLOUDINARY_PASTA_CAPAS_OFICIAIS'
  | 'CAPA_HOSTS_PERMITIDOS'
  | 'CAPAS_DOWNLOAD_HOSTS'
  | 'CAPAS_DOWNLOAD_TIMEOUT_MS'
  | 'CAPAS_DOWNLOAD_LIMITE_BYTES'
  | 'FONTES_USER_AGENT'
>;

const lista = (valor: string) =>
  valor
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * Monta o cache de capas a partir da configuração, para o módulo e para o
 * backfill. Sem `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` devolve `null`:
 * o consumidor não é registrado e a fila não existe.
 */
export function criarCacheDeCapas(
  config: ConfiguracaoDoCache,
  opcoes: { fetch?: typeof globalThis.fetch } = {},
): CacheDeCapas | null {
  if (!config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) {
    return null;
  }
  const http = new HttpExterno({
    hostsPermitidos: lista(config.CAPAS_DOWNLOAD_HOSTS),
    timeoutMs: config.CAPAS_DOWNLOAD_TIMEOUT_MS,
    limiteRespostaBytes: config.CAPAS_DOWNLOAD_LIMITE_BYTES,
    userAgent: config.FONTES_USER_AGENT,
    permitirSufixo: true,
    fetch: opcoes.fetch,
  });
  const envio = new EnvioDeCapa({
    cloudName: config.CLOUDINARY_CLOUD_NAME,
    apiKey: config.CLOUDINARY_API_KEY,
    apiSecret: config.CLOUDINARY_API_SECRET,
    pasta: config.CLOUDINARY_PASTA_CAPAS_OFICIAIS,
    hostsPermitidos: lista(config.CAPA_HOSTS_PERMITIDOS),
    fetch: opcoes.fetch,
  });
  // Só o circuit breaker: a retentativa é do runtime (1/5/15 s e a DLQ).
  return new CacheDeCapas(
    http,
    envio,
    new PoliticaDeResiliencia({ esperasMs: [] }),
    new PoliticaDeResiliencia({ esperasMs: [] }),
  );
}
