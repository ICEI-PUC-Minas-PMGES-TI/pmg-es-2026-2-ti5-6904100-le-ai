import { HttpException, HttpStatus } from '@nestjs/common';
import { ErroDeNegocio } from './erros-de-negocio';

export interface MappedError {
  status: number;
  codigo: string;
  mensagem: string;
  /**
   * Campos que o contrato define para respostas específicas — `campos` no 400
   * e no 422. Mesclados no corpo sem
   * alterar `{ codigo, mensagem, correlationId }` (RNF-ERR-01).
   */
  extras?: Record<string, unknown>;
  /** Cabeçalhos exigidos pelo contrato, como `Retry-After` no 429. */
  cabecalhos?: Record<string, string>;
}

/**
 * Mapa status HTTP → código interno + mensagem exibível em pt-BR (RNF-USA-05).
 * As mensagens NUNCA expõem stack trace, framework, estrutura de banco ou
 * caminho de arquivo (RNF-SEC-22).
 */
const BY_STATUS: Record<number, { codigo: string; mensagem: string }> = {
  [HttpStatus.BAD_REQUEST]: {
    codigo: 'REQUISICAO_INVALIDA',
    mensagem: 'Os dados enviados são inválidos.',
  },
  [HttpStatus.UNAUTHORIZED]: {
    codigo: 'NAO_AUTENTICADO',
    mensagem: 'É necessário autenticar-se para continuar.',
  },
  [HttpStatus.FORBIDDEN]: {
    codigo: 'ACESSO_NEGADO',
    mensagem: 'Você não tem permissão para esta ação.',
  },
  [HttpStatus.NOT_FOUND]: {
    codigo: 'RECURSO_NAO_ENCONTRADO',
    mensagem: 'Não encontramos o que você procura.',
  },
  [HttpStatus.CONFLICT]: {
    codigo: 'CONFLITO',
    mensagem: 'Este recurso conflita com um já existente.',
  },
  [HttpStatus.PAYLOAD_TOO_LARGE]: {
    codigo: 'CORPO_MUITO_GRANDE',
    mensagem: 'Os dados enviados passam do tamanho permitido.',
  },
  [HttpStatus.UNPROCESSABLE_ENTITY]: {
    codigo: 'ENTIDADE_NAO_PROCESSAVEL',
    mensagem: 'Não foi possível processar os dados enviados.',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    codigo: 'MUITAS_REQUISICOES',
    mensagem:
      'Muitas requisições em pouco tempo. Tente novamente em instantes.',
  },
  [HttpStatus.SERVICE_UNAVAILABLE]: {
    codigo: 'SERVICO_INDISPONIVEL',
    mensagem:
      'Serviço temporariamente indisponível. Tente novamente em instantes.',
  },
  [HttpStatus.GATEWAY_TIMEOUT]: {
    codigo: 'TEMPO_ESGOTADO',
    mensagem: 'A operação demorou mais que o esperado. Tente novamente.',
  },
};

export function mapError(exception: unknown): MappedError {
  // Antes do ramo de HttpException: ErroDeNegocio É uma HttpException, e o
  // mapa por status descartaria o código e a mensagem próprios dela.
  if (exception instanceof ErroDeNegocio) {
    return {
      status: exception.getStatus(),
      codigo: exception.codigo,
      mensagem: exception.message,
      extras: exception.extras,
      cabecalhos: exception.cabecalhos,
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const known = BY_STATUS[status];
    if (known) {
      return { status, ...known };
    }
    return {
      status,
      codigo: 'ERRO_HTTP',
      mensagem: 'Não foi possível concluir a operação.',
    };
  }

  // Erro do leitor de corpo do Express (body-parser): corpo acima do limite (413),
  // codificação não suportada (415). Não é HttpException, mas traz o status certo.
  const doCorpo = erroDoLeitorDeCorpo(exception);
  if (doCorpo !== null) {
    return {
      status: doCorpo,
      ...(BY_STATUS[doCorpo] ?? BY_STATUS[HttpStatus.BAD_REQUEST]),
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    codigo: 'ERRO_INTERNO',
    mensagem: 'Ocorreu um erro inesperado. Tente novamente mais tarde.',
  };
}

function erroDoLeitorDeCorpo(exception: unknown): number | null {
  if (typeof exception !== 'object' || exception === null) {
    return null;
  }
  const { type, status } = exception as { type?: unknown; status?: unknown };
  const doBodyParser =
    typeof type === 'string' &&
    /^(entity|request|encoding|charset|parameters)\./.test(type);
  return doBodyParser &&
    typeof status === 'number' &&
    status >= 400 &&
    status < 500
    ? status
    : null;
}
