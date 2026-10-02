import { Injectable } from '@nestjs/common';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { isbn13DeIsbn10, normalizarIsbn13 } from '../../common/isbn';
import { resolverCapa } from '../capa';
import { palavrasDaBusca } from './palavras-da-busca';
import {
  CriteriosDeBusca,
  BuscaRepository,
  LinhaDeLivroEncontrado,
} from './busca.repository';
import {
  BuscaLivrosQueryDto,
  LIMITE_PADRAO,
  ListaAssuntosDto,
  LivroOficialResumoDto,
  PaginaLivrosDto,
} from './dto/busca.dto';

@Injectable()
export class BuscaService {
  constructor(private readonly repositorio: BuscaRepository) {}

  async listarAssuntos(): Promise<ListaAssuntosDto> {
    return { itens: await this.repositorio.assuntos() };
  }

  /**
   * Algum critério é obrigatório: o `q`, o assunto ou um dos filtros de
   * RF-ACV-03. Sem nenhum, a "busca" seria o acervo inteiro, e a aterrissagem
   * do Descobrir não lista o acervo. O erro fica no campo `q`, onde o cliente
   * do Período 1 já o espera.
   */
  async buscar(query: BuscaLivrosQueryDto): Promise<PaginaLivrosDto> {
    if (!temCriterio(query)) {
      throw new ErroDeValidacao([
        {
          campo: 'q',
          mensagem: 'Informe um texto de busca, um assunto ou um filtro.',
        },
      ]);
    }
    if (
      query.paginasMin !== undefined &&
      query.paginasMax !== undefined &&
      query.paginasMin > query.paginasMax
    ) {
      throw new ErroDeValidacao([
        {
          campo: 'paginasMax',
          mensagem:
            'O número máximo de páginas deve ser maior ou igual ao mínimo.',
        },
      ]);
    }

    return this.paginar(
      {
        q: query.q,
        palavras: query.q ? palavrasDaBusca(query.q) : undefined,
        isbn13: query.q
          ? (normalizarIsbn13(query.q) ?? isbn13DeIsbn10(query.q))
          : null,
        assuntoId: query.assunto,
        autorPalavras: query.autor ? palavrasDaBusca(query.autor) : undefined,
        editoraPalavras: query.editora
          ? palavrasDaBusca(query.editora)
          : undefined,
        seriePalavras: query.serie ? palavrasDaBusca(query.serie) : undefined,
        ano: query.ano,
        paginasMin: query.paginasMin,
        paginasMax: query.paginasMax,
      },
      query,
      paraResumo,
    );
  }

  /**
   * Uma página de livros oficiais sob critérios já montados. A busca e as
   * páginas de autor, editora e série passam por aqui, com o mesmo agrupamento
   * de edições e a mesma exclusão de livro pessoal; cada uma escolhe a ordem e
   * o formato do item.
   */
  async paginar<T>(
    criterios: Omit<CriteriosDeBusca, 'limit' | 'offset'>,
    paginacao: { page?: number; limit?: number },
    mapear: (linha: LinhaDeLivroEncontrado) => T,
  ): Promise<Paginado<T>> {
    const page = paginacao.page ?? 1;
    const limit = paginacao.limit ?? LIMITE_PADRAO;
    const completos: CriteriosDeBusca = {
      ...criterios,
      limit,
      offset: (page - 1) * limit,
    };

    // A contagem é separada da página: um `count(*) OVER ()` não devolve linha
    // quando a página passa da última, e o `totalItens` sairia 0.
    const [totalItens, linhas] = await Promise.all([
      this.repositorio.contar(completos),
      this.repositorio.pagina(completos),
    ]);

    return {
      itens: linhas.map(mapear),
      page,
      limit,
      totalItens,
      totalPaginas: Math.ceil(totalItens / limit),
    };
  }
}

export interface Paginado<T> {
  itens: T[];
  page: number;
  limit: number;
  totalItens: number;
  totalPaginas: number;
}

function temCriterio(query: BuscaLivrosQueryDto): boolean {
  return [
    query.q,
    query.assunto,
    query.autor,
    query.editora,
    query.serie,
    query.ano,
    query.paginasMin,
    query.paginasMax,
  ].some((valor) => valor !== undefined && valor !== '');
}

export function paraResumo(
  linha: LinhaDeLivroEncontrado,
): LivroOficialResumoDto {
  return {
    id: linha.id,
    titulo: linha.titulo,
    autores: linha.autores,
    editora: linha.editora ?? null,
    anoPublicacao: linha.anoPublicacao ?? null,
    paginas: linha.paginas,
    capa: resolverCapa(linha.capaUrlPropria, linha.capaUrlExterna),
    assuntos: linha.assuntos,
  };
}
