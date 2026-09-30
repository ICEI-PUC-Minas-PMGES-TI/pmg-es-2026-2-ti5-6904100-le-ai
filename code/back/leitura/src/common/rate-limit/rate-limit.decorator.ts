import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT = 'rate_limit';

export interface ConfiguracaoDeLimite {
  /** Requisições permitidas por identidade dentro da janela. */
  porIdentidade: number;
  /** Requisições permitidas por IP dentro da janela. */
  porIp: number;
  janelaSegundos: number;
  /**
   * Conta à parte. O guard é uma instância só por módulo, e sem escopo todas as
   * rotas marcadas dividem os contadores de `ip:` e `sub:`: salvar notas
   * consumiria o limite de publicar resenhas.
   */
  escopo?: string;
}

/**
 * Marca a rota para o `RateLimitGuard` (RNF-SEC-18).
 *
 * Em `leitura`, o limite vale nas escritas que viram atividade social ou evento
 * (nota e resenha): são as que um script poderia usar para inundar o feed. Cada
 * rota usa o próprio `escopo`.
 */
export const RateLimit = (configuracao: ConfiguracaoDeLimite) =>
  SetMetadata(RATE_LIMIT, configuracao);
