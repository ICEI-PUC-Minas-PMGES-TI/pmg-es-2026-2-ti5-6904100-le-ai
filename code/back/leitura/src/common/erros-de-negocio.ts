import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Falha esperada de regra de negócio, com código e mensagem próprios.
 *
 * Porte de `ErroDeNegocio` do serviço `acervo`, pelo mesmo motivo: as mensagens
 * genéricas por status HTTP não servem para todo caso. "Este recurso conflita
 * com um já existente" não ajuda quem tentou finalizar uma leitura já
 * abandonada — a resposta útil diz qual regra de RN-04 barrou a ação.
 *
 * O formato do corpo **não** muda: continua `{ codigo, mensagem, correlationId }`
 * (RNF-ERR-01). `extras` acrescenta campos que o contrato de
 * `docs/api/leitura.yaml` define para respostas específicas — `campos` em
 * `Erro` — e nada mais.
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
  ) {
    super(mensagem, status);
  }
}

/** Um campo rejeitado pela validação, no formato de `Erro.campos`. */
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
 * Livro inexistente em `v_livro_referencia_v1` ou inativo (livro pessoal
 * excluído). Os dois casos respondem igual: distinguir diria a um terceiro que
 * aquele id já existiu.
 */
export class LivroNaoEncontrado extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.NOT_FOUND,
      'LIVRO_NAO_ENCONTRADO',
      'Não encontramos este livro.',
    );
  }
}

/**
 * Livro pessoal de outro leitor (SEC-07, RN-15): não entra na estante nem ganha
 * leitura, mesmo em Quero ler.
 */
export class LivroPessoalDeTerceiro extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      'LIVRO_PESSOAL_DE_TERCEIRO',
      'Este livro pessoal pertence a outro leitor.',
    );
  }
}

/**
 * Leitura inexistente **ou de outro leitor** (SEC-02). Responder 403 para a
 * leitura alheia confirmaria que o id existe.
 */
export class LeituraNaoEncontrada extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.NOT_FOUND,
      'LEITURA_NAO_ENCONTRADA',
      'Não encontramos esta leitura.',
    );
  }
}

/** O estado atual da leitura não admite o evento pedido (RN-04). */
export class TransicaoDeLeituraInvalida extends ErroDeNegocio {
  constructor(
    mensagem = 'Esta leitura não pode realizar essa ação no estado atual.',
  ) {
    super(HttpStatus.CONFLICT, 'TRANSICAO_DE_LEITURA_INVALIDA', mensagem);
  }
}

/**
 * Já existe leitura em andamento para o mesmo usuário e livro (RN-04,
 * invariante 1). É o que o índice parcial `leitura_em_andamento_usuario_livro_uk`
 * devolve quando duas requisições concorrentes tentam iniciar (RNF-ARQ-05).
 */
export class LeituraEmAndamento extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'LEITURA_EM_ANDAMENTO',
      'Você já tem uma leitura em andamento deste livro.',
    );
  }
}

/** Só sai da estante o livro em Quero ler que nunca teve leitura (RN-04). */
export class EstanteComHistorico extends ErroDeNegocio {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'ESTANTE_COM_HISTORICO',
      'Só é possível remover livros em Quero ler que ainda não têm leituras.',
    );
  }
}

/** Dados bem formados que violam uma regra de negócio (422 do contrato). */
export class RegraDeNegocioViolada extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'ENTIDADE_NAO_PROCESSAVEL',
      mensagem,
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

export class ServicoIndisponivel extends ErroDeNegocio {
  constructor(
    mensagem = 'Serviço temporariamente indisponível. Tente novamente em instantes.',
  ) {
    super(HttpStatus.SERVICE_UNAVAILABLE, 'SERVICO_INDISPONIVEL', mensagem);
  }
}
