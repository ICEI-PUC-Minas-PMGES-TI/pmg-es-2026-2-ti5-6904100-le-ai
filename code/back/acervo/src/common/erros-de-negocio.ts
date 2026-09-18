import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Falha esperada de regra de negócio, com código e mensagem próprios.
 *
 * Porte de `ErroDeNegocioException` do serviço `identidade`, pelo mesmo motivo
 * que ele existe lá: as mensagens genéricas por status HTTP não servem para
 * todo caso. "Este recurso conflita com um já existente" não ajuda quem tentou
 * cadastrar um ISBN que já está no acervo — a resposta útil é dizer isso e
 * devolver o id do livro para o cliente redirecionar (RF-ACV-07).
 *
 * O formato do corpo **não** muda: continua `{ codigo, mensagem, correlationId }`
 * (RNF-ERR-01). `extras` acrescenta campos que o contrato de `docs/api/acervo.yaml`
 * define para respostas específicas — `livroId` em `ErroLivroExistente`, `campos`
 * em `ErroValidacao` — e nada mais.
 *
 * **A mensagem é pública.** Ela vai inteira para o cliente, então nunca pode
 * conter stack trace, nome de tabela, SQL ou caminho de arquivo (RNF-SEC-22).
 */
export class ErroDeNegocio extends HttpException {
  constructor(
    status: number,
    readonly codigo: string,
    mensagem: string,
    readonly extras: Record<string, unknown> = {},
    readonly cabecalhos: Record<string, string> = {},
  ) {
    super(mensagem, status);
  }
}

/** Um campo rejeitado pela validação, no formato de `ErroValidacao.campos`. */
export interface CampoInvalido {
  campo: string;
  mensagem: string;
}

export class ErroDeValidacao extends ErroDeNegocio {
  constructor(
    campos: CampoInvalido[],
    mensagem = 'Os dados enviados são inválidos.',
  ) {
    super(HttpStatus.BAD_REQUEST, 'REQUISICAO_INVALIDA', mensagem, { campos });
  }
}

export class NaoAutenticado extends ErroDeNegocio {
  constructor(mensagem = 'É necessário autenticar-se para continuar.') {
    super(HttpStatus.UNAUTHORIZED, 'NAO_AUTENTICADO', mensagem);
  }
}

export class AcessoNegado extends ErroDeNegocio {
  constructor(mensagem = 'Você não tem permissão para esta ação.') {
    super(HttpStatus.FORBIDDEN, 'ACESSO_NEGADO', mensagem);
  }
}

export class NaoEncontrado extends ErroDeNegocio {
  constructor(mensagem = 'Não encontramos o que você procura.') {
    super(HttpStatus.NOT_FOUND, 'RECURSO_NAO_ENCONTRADO', mensagem);
  }
}

/**
 * ISBN-13 já existe na base oficial (RF-ACV-07, RN-02).
 *
 * O `livroId` no corpo é o que permite o cliente **direcionar o leitor à página
 * do livro existente**, que é o comportamento que o requisito pede — sem ele o
 * 409 seria um beco sem saída.
 */
export class LivroJaCadastrado extends ErroDeNegocio {
  constructor(readonly livroId: string) {
    super(
      HttpStatus.CONFLICT,
      'LIVRO_JA_CADASTRADO',
      'Este livro já está no acervo.',
      { livroId },
    );
  }
}

/**
 * Mesma `Idempotency-Key` reaproveitada com outro corpo (RNF-ERR-04).
 *
 * Diferente de repetir a chave com o mesmo corpo, que devolve a resposta
 * original sem novo efeito.
 */
export class ChaveIdempotenciaConflitante extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'CHAVE_IDEMPOTENCIA_CONFLITANTE',
      'Esta chave de idempotência já foi usada com outros dados. Gere uma nova chave.',
    );
  }
}

/** O estado atual do recurso não permite a operação. */
export class EstadoInvalido extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(HttpStatus.CONFLICT, 'ESTADO_INVALIDO', mensagem);
  }
}

/** Rate limiting de RNF-SEC-18. `Retry-After` faz parte do contrato do 429. */
export class LimiteExcedido extends ErroDeNegocio {
  constructor(segundosAteLiberar: number) {
    super(
      HttpStatus.TOO_MANY_REQUESTS,
      'MUITAS_REQUISICOES',
      'Muitas requisições em pouco tempo. Tente novamente em instantes.',
      {},
      { 'Retry-After': String(Math.max(1, Math.ceil(segundosAteLiberar))) },
    );
  }
}

export class ServicoIndisponivel extends ErroDeNegocio {
  constructor(
    mensagem = 'Serviço temporariamente indisponível. Tente novamente em instantes.',
  ) {
    super(HttpStatus.SERVICE_UNAVAILABLE, 'SERVICO_INDISPONIVEL', mensagem);
  }
}
