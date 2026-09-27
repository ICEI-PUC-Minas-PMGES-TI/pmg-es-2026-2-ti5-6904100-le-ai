import { HttpException, HttpStatus } from '@nestjs/common';

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

export class RegraDeNegocioViolada extends ErroDeNegocio {
  constructor(mensagem: string) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'ENTIDADE_NAO_PROCESSAVEL',
      mensagem,
    );
  }
}

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
