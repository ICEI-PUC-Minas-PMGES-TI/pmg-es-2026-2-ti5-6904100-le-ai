/**
 * Leitura dos códigos de erro do PostgreSQL por baixo do Drizzle.
 *
 * O Drizzle embrulha o erro do driver e põe o original em `cause` — é o mesmo
 * cuidado que `src/health/drizzle.health.ts` já tem ao logar a causa real. Quem
 * checar `err.code` direto não encontra nada e trata uma violação de unicidade
 * como erro interno.
 */

/** Violação de constraint única. */
export const VIOLACAO_DE_UNICIDADE = '23505';
/** Violação de CHECK: sempre bug nosso, nunca erro do cliente. */
export const VIOLACAO_DE_CHECK = '23514';
/** Permissão insuficiente — típico de GRANT faltando em schema de outro serviço. */
export const PERMISSAO_INSUFICIENTE = '42501';
/** Relação inexistente — VIEW de contrato de outro schema ainda não criada. */
export const RELACAO_INEXISTENTE = '42P01';

interface ErroDoPostgres {
  code?: string;
  constraint?: string;
}

function extrair(erro: unknown): ErroDoPostgres | null {
  if (typeof erro !== 'object' || erro === null) {
    return null;
  }

  const candidato = erro as {
    code?: unknown;
    constraint?: unknown;
    cause?: unknown;
  };
  if (typeof candidato.code === 'string') {
    return {
      code: candidato.code,
      constraint:
        typeof candidato.constraint === 'string'
          ? candidato.constraint
          : undefined,
    };
  }

  return candidato.cause ? extrair(candidato.cause) : null;
}

export function codigoDoPostgres(erro: unknown): string | null {
  return extrair(erro)?.code ?? null;
}

export function ehViolacaoDeUnicidade(
  erro: unknown,
  constraint?: string,
): boolean {
  const detalhe = extrair(erro);
  if (detalhe?.code !== VIOLACAO_DE_UNICIDADE) {
    return false;
  }
  return constraint === undefined || detalhe.constraint === constraint;
}

/**
 * Erro de acesso a contrato de outro schema (`leitura`, `social`, `identidade`).
 *
 * As VIEWs de contrato pertencem a outros serviços, e o `acervo` só as lê. GRANT
 * faltando ou VIEW ainda não criada é indisponibilidade de dependência, não erro
 * do cliente: vira 503, nunca um 500 cru.
 */
export function ehFalhaDeContratoExterno(erro: unknown): boolean {
  const codigo = codigoDoPostgres(erro);
  return codigo === PERMISSAO_INSUFICIENTE || codigo === RELACAO_INEXISTENTE;
}

const BANCO_INDISPONIVEL = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '57P01',
  '57P02',
  '57P03',
  '53300',
]);

/** Erros de rede do Node que o `pg` repassa com o `code` do sistema. */
const REDE_INDISPONIVEL = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

/**
 * Banco fora do ar ou recusando conexão: indisponibilidade, 503, e não 500.
 *
 * Falhas de conexão da classe `08` (mas não o `08P01`, violação de protocolo,
 * que costuma ser bug nosso), `57P01` a `57P03` (desligando ou iniciando, como o
 * Neon acordando), `53300` (conexões esgotadas) e as falhas de rede. O `pg`
 * também lança sem código quando o pool esgota a espera por conexão.
 */
export function ehBancoIndisponivel(erro: unknown): boolean {
  const codigo = codigoDoPostgres(erro);
  if (codigo !== null) {
    return BANCO_INDISPONIVEL.has(codigo) || REDE_INDISPONIVEL.has(codigo);
  }
  return mensagens(erro).some(
    (mensagem) =>
      mensagem.includes('timeout exceeded when trying to connect') ||
      mensagem.includes('Connection terminated'),
  );
}

function mensagens(erro: unknown, profundidade = 0): string[] {
  if (!(erro instanceof Error) || profundidade > 3) {
    return [];
  }
  return [erro.message, ...mensagens(erro.cause, profundidade + 1)];
}
