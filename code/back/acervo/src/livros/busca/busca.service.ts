import { Injectable } from '@nestjs/common';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { normalizarIsbn13 } from '../../common/isbn';
import { resolverCapa } from '../capa';
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
   * `q` ou `assunto` é obrigatório: sem nenhum dos dois, a "busca" seria o
   * acervo inteiro, e a aterrissagem do Descobrir não lista nada (a aba é magra
   * no Período 1, por decisão).
   */
  async buscar(query: BuscaLivrosQueryDto): Promise<PaginaLivrosDto> {
    if (!query.q && !query.assunto) {
      throw new ErroDeValidacao([
        { campo: 'q', mensagem: 'Informe um texto de busca ou um assunto.' },
      ]);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? LIMITE_PADRAO;
    const criterios: CriteriosDeBusca = {
      q: query.q,
      isbn13: query.q ? normalizarIsbn13(query.q) : null,
      assuntoId: query.assunto,
      limit,
      offset: (page - 1) * limit,
    };

    // A contagem é separada da página: um `count(*) OVER ()` não devolve linha
    // quando a página passa da última, e o `totalItens` sairia 0.
    const [totalItens, linhas] = await Promise.all([
      this.repositorio.contar(criterios),
      this.repositorio.pagina(criterios),
    ]);

    return {
      itens: linhas.map(paraResumo),
      page,
      limit,
      totalItens,
      totalPaginas: Math.ceil(totalItens / limit),
    };
  }
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
