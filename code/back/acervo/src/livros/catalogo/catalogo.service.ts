import { Injectable } from '@nestjs/common';
import { NaoEncontrado } from '../../common/erros-de-negocio';
import { textoPuro } from '../../common/texto-puro';
import { BuscaService, paraResumo } from '../busca/busca.service';
import { PaginacaoQueryDto } from '../busca/dto/busca.dto';
import { CatalogoRepository } from './catalogo.repository';
import {
  LIMITE_DA_BIOGRAFIA,
  LivroDaSerieResumoDto,
  PaginaDaEditoraDto,
  PaginaDaSerieDto,
  PaginaDoAutorDto,
} from './dto/catalogo.dto';

/**
 * Páginas de autor, editora e série (RF-ACV-10, RF-ACV-11, RF-ACV-12). Não são
 * perfis: só consulta sobre a base oficial curada.
 *
 * Os livros passam pelo `BuscaService.paginar`, com o mesmo agrupamento de
 * edições e a mesma exclusão de livro pessoal da busca (RNF-SEC-06). O
 * cabeçalho e a página saem em paralelo: o cold start do Neon pesa nas duas.
 */
@Injectable()
export class CatalogoService {
  constructor(
    private readonly repositorio: CatalogoRepository,
    private readonly busca: BuscaService,
  ) {}

  /**
   * Autor e editora listam do grupo de ano mais recente para o mais antigo,
   * com as edições de uma obra contíguas e os grupos sem ano no fim.
   */
  async autor(
    id: string,
    paginacao: PaginacaoQueryDto,
  ): Promise<PaginaDoAutorDto> {
    const [autor, livros] = await Promise.all([
      this.repositorio.autor(id),
      this.busca.paginar(
        { autorId: id, ordem: 'ano-do-grupo' },
        paginacao,
        paraResumo,
      ),
    ]);
    if (!autor) {
      throw new NaoEncontrado('Não encontramos este autor.');
    }
    return {
      id: autor.id,
      nome: autor.nome,
      biografia: biografiaExibivel(autor.biografia),
      livros,
    };
  }

  async editora(
    id: string,
    paginacao: PaginacaoQueryDto,
  ): Promise<PaginaDaEditoraDto> {
    const [editora, livros] = await Promise.all([
      this.repositorio.editora(id),
      this.busca.paginar(
        { editoraId: id, ordem: 'ano-do-grupo' },
        paginacao,
        paraResumo,
      ),
    ]);
    if (!editora) {
      throw new NaoEncontrado('Não encontramos esta editora.');
    }
    return { id: editora.id, nome: editora.nome, livros };
  }

  /** Série pelo número de ordem (RN-12); sem número, no fim, por título. */
  async serie(
    id: string,
    paginacao: PaginacaoQueryDto,
  ): Promise<PaginaDaSerieDto> {
    const [serie, autores, livros] = await Promise.all([
      this.repositorio.serie(id),
      this.repositorio.autoresDaSerie(id),
      this.busca.paginar(
        { serieId: id, ordem: 'serie' },
        paginacao,
        (linha): LivroDaSerieResumoDto => ({
          ...paraResumo(linha),
          numeroNaSerie: linha.numeroSerie ?? null,
        }),
      ),
    ]);
    if (!serie) {
      throw new NaoEncontrado('Não encontramos esta série.');
    }
    return { id: serie.id, nome: serie.nome, autores, livros };
  }
}

/**
 * A ingestão e a importação já gravam texto puro; repassar por `textoPuro` é a
 * defesa de quem lê, para o cliente nunca receber marcação nem string vazia,
 * que viraria uma seção de biografia sem texto.
 */
function biografiaExibivel(biografia: string | null): string | null {
  return biografia ? textoPuro(biografia, LIMITE_DA_BIOGRAFIA) : null;
}
