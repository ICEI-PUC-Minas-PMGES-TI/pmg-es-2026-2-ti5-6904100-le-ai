export const VIOLACAO_DE_UNICIDADE = '23505';
export const VIOLACAO_DE_CHECK = '23514';
export const PERMISSAO_INSUFICIENTE = '42501';
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

export function ehFalhaDeContratoExterno(erro: unknown): boolean {
  const codigo = codigoDoPostgres(erro);
  return codigo === PERMISSAO_INSUFICIENTE || codigo === RELACAO_INEXISTENTE;
}
