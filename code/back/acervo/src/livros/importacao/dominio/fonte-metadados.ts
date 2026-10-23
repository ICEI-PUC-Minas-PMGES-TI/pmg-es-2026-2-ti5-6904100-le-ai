/**
 * Porta das fontes externas de metadados por ISBN (§10.1).
 *
 * Duas fontes, em ordem fixa: **OpenLibrary** como primária (sem chave de API,
 * exige `User-Agent` identificando a aplicação) e **Google Books** como
 * secundária, consultada apenas quando a primária não retorna resultado.
 *
 * A distinção que atravessa todo este módulo: **ausência não é falha**. A fonte
 * dizer "não conheço este ISBN" é uma resposta, e leva a `nao_encontrado` com
 * oferta de cadastro pessoal (RF-ACV-06). A fonte não responder é outra coisa, e
 * leva a `falha_transitoria`, que é reprocessável. Confundir as duas ou
 * ofereceria cadastro pessoal para um livro que existe, ou faria o leitor
 * esperar por um livro que nunca vai aparecer.
 */

/**
 * Autor como a fonte o conhece. RN-12 deduplica pela chave da fonte quando ela
 * existe (OpenLibrary) e pelo nome normalizado quando não existe (Google Books).
 * A biografia só a OpenLibrary tem (RF-ACV-10), ainda bruta: quem persiste a
 * saneia.
 */
export interface AutorExterno {
  nome: string;
  olAuthorKey: string | null;
  biografia?: string | null;
}

/**
 * Nota geral da fonte (RF-ACV-15): o valor de 0 a 5 com 1 casa e quantas
 * avaliações o originaram. Só existe com ao menos uma avaliação (RN-06.3).
 */
export interface NotaExterna {
  valor: number;
  quantidade: number;
}

export interface MetadadosLivro {
  isbn13: string;
  titulo: string;
  autores: AutorExterno[];
  editora: string | null;
  anoPublicacao: number | null;
  paginas: number | null;
  capaUrl: string | null;
  olEditionKey: string | null;
  olWorkKey: string | null;
  /** Ausente ou `null` quando a fonte não tem nota; nunca vira zero (RN-06.3). */
  notaGeral?: NotaExterna | null;
}

/**
 * Dado externo validado e normalizado antes de persistir (RNF-SEC-33): valor
 * finito de 0 a 5, arredondado a 1 casa, e contagem inteira de 1 para cima.
 * Qualquer outra coisa é ausência, e não um erro que derrube a importação.
 */
export function notaExterna(
  valor: unknown,
  quantidade: unknown,
): NotaExterna | null {
  if (
    typeof valor !== 'number' ||
    !Number.isFinite(valor) ||
    valor < 0 ||
    valor > 5 ||
    typeof quantidade !== 'number' ||
    !Number.isInteger(quantidade) ||
    quantidade < 1
  ) {
    return null;
  }
  return { valor: Math.round((valor + Number.EPSILON) * 10) / 10, quantidade };
}

export interface FonteDeMetadados {
  readonly nome: string;
  /** `null` significa "esta fonte não conhece o ISBN", não "deu erro". */
  buscarPorIsbn(isbn13: string): Promise<MetadadosLivro | null>;
}

/**
 * A fonte não respondeu, respondeu 5xx, estourou o timeout ou o circuito está
 * aberto. Distinto de devolver `null`.
 */
export class FonteIndisponivel extends Error {
  constructor(
    readonly fonte: string,
    motivo: string,
  ) {
    super(`${fonte}: ${motivo}`);
    this.name = 'FonteIndisponivel';
  }
}
