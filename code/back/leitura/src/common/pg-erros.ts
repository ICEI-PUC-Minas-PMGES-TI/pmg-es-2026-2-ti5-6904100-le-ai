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
  /** Onde o erro nasceu: numa função PL/pgSQL, `PL/pgSQL function leitura.x() line 7 at RAISE`. */
  where?: string;
}

function extrair(erro: unknown): ErroDoPostgres | null {
  if (typeof erro !== 'object' || erro === null) {
    return null;
  }

  const candidato = erro as {
    code?: unknown;
    constraint?: unknown;
    where?: unknown;
    cause?: unknown;
  };
  if (typeof candidato.code === 'string') {
    return {
      code: candidato.code,
      constraint:
        typeof candidato.constraint === 'string'
          ? candidato.constraint
          : undefined,
      where: typeof candidato.where === 'string' ? candidato.where : undefined,
    };
  }

  return candidato.cause ? extrair(candidato.cause) : null;
}

export function codigoDoPostgres(erro: unknown): string | null {
  return extrair(erro)?.code ?? null;
}

/**
 * Erro levantado por uma função de trigger com o `ERRCODE` dado. O trigger
 * `frase_limite_trigger` levanta 23514, o mesmo código de um CHECK; só o campo
 * `where` do erro diz que ele veio da função, e não de uma constraint.
 */
export function ehErroDaFuncao(
  erro: unknown,
  codigo: string,
  funcao: string,
): boolean {
  const detalhe = extrair(erro);
  return detalhe?.code === codigo && (detalhe.where ?? '').includes(funcao);
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
 * Erro de acesso a contrato de outro schema (`acervo`, `identidade`).
 *
 * As VIEWs de contrato pertencem a outros serviços, e o `leitura` só as lê. GRANT
 * faltando ou VIEW ainda não criada é indisponibilidade de dependência, não erro
 * do cliente: vira 503, nunca um 500 cru.
 */
export function ehFalhaDeContratoExterno(erro: unknown): boolean {
  const codigo = codigoDoPostgres(erro);
  return codigo === PERMISSAO_INSUFICIENTE || codigo === RELACAO_INEXISTENTE;
}
