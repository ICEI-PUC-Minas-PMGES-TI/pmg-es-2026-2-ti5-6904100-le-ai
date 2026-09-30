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
   * rotas marcadas dividem os contadores de `ip:` e `sub:`: abrir páginas de
   * livro consumiria o limite do cadastro por ISBN.
   */
  escopo?: string;
}

/**
 * Marca a rota para o `RateLimitGuard` (RNF-SEC-18).
 *
 * O requisito nomeia "cadastro de livro por ISBN" ao lado das ações sociais, e é
 * só nessa rota que o limite se aplica em `acervo`: ela dispara busca em fonte
 * externa e criação de registro, que é o que vale a pena proteger de abuso.
 */
export const RateLimit = (configuracao: ConfiguracaoDeLimite) =>
  SetMetadata(RATE_LIMIT, configuracao);
