import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Falha esperada de regra de negócio, com código e mensagem próprios.
 *
 * Mesma classe do `acervo` (porte de `ErroDeNegocioException` do `identidade`):
 * as mensagens genéricas por status HTTP não servem para todo caso, e o cliente
 * precisa saber, por exemplo, qual campo tirou a nota da escala.
 *
 * O formato do corpo **não** muda: continua `{ codigo, mensagem, correlationId }`
 * (RNF-ERR-01). `extras` acrescenta campos que o contrato de
 * `docs/api/leitura.yaml` define para respostas específicas — `campos` no 400 e
 * no 422 — e nada mais.
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

/** Um campo rejeitado, no formato de `Erro.campos` do contrato. */
export interface CampoInvalido {
  campo: string;
  mensagem: string;
}

/**
 * 400: corpo malformado — tipo errado, campo faltando ou sobrando, UUID
 * inválido, `Idempotency-Key` ausente.
 */
export class ErroDeValidacao extends ErroDeNegocio {
  constructor(
    campos: CampoInvalido[],
    mensagem = 'Os dados enviados são inválidos.',
  ) {
    super(HttpStatus.BAD_REQUEST, 'REQUISICAO_INVALIDA', mensagem, { campos });
  }
}

/**
 * 422: dado bem formado que fere uma regra de negócio (`EntidadeInvalida` no
 * contrato). A fronteira com o 400 é esta: o corpo foi entendido, mas o valor
 * não é aceito — nota fora de 0..5 ou do passo de 0,5, resenha vazia ou acima
 * de 5.000 caracteres.
 */
export class EntidadeInvalida extends ErroDeNegocio {
  constructor(
    campos: CampoInvalido[],
    mensagem = 'Não foi possível processar os dados enviados.',
  ) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'ENTIDADE_NAO_PROCESSAVEL',
      mensagem,
      { campos },
    );
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

export class LivroNaoEncontrado extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.NOT_FOUND,
      'LIVRO_NAO_ENCONTRADO',
      'Não encontramos este livro.',
    );
  }
}

export class LivroPessoalDeTerceiro extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      'LIVRO_PESSOAL_DE_TERCEIRO',
      'Este livro pessoal pertence a outro leitor.',
    );
  }
}

export class LeituraNaoEncontrada extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.NOT_FOUND,
      'LEITURA_NAO_ENCONTRADA',
      'Não encontramos esta leitura.',
    );
  }
}

export class TransicaoDeLeituraInvalida extends ErroDeNegocio {
  constructor(
    mensagem = 'Esta leitura não pode realizar essa ação no estado atual.',
  ) {
    super(HttpStatus.CONFLICT, 'TRANSICAO_DE_LEITURA_INVALIDA', mensagem);
  }
}

export class LeituraEmAndamento extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'LEITURA_EM_ANDAMENTO',
      'Você já tem uma leitura em andamento deste livro.',
    );
  }
}

export class EstanteComHistorico extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'ESTANTE_COM_HISTORICO',
      'Só é possível remover livros em Quero ler que ainda não têm leituras.',
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

/** RF-AVA-05: só se reage à resenha de outro leitor. */
export class ReacaoPropria extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'REACAO_PROPRIA',
      'Você não pode reagir à sua própria resenha.',
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
