import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { PaginacaoQueryDto } from '../busca/dto/busca.dto';
import { CatalogoService } from './catalogo.service';
import {
  PaginaDaEditoraDto,
  PaginaDaSerieDto,
  PaginaDoAutorDto,
} from './dto/catalogo.dto';

/**
 * Páginas de catálogo de F-ACV-DESCOBERTA. Só leem o próprio schema, sem fonte
 * externa: ficam sem rate limit próprio, atrás do guard global de JWT.
 */
@ApiTags('catalogo')
@ApiBearerAuth()
@Controller()
export class CatalogoController {
  constructor(private readonly servico: CatalogoService) {}

  @Get('autores/:id')
  @ApiOperation({
    operationId: 'obterAutor',
    summary: 'Obtém a página de um autor',
    description:
      'Nome, biografia curta da OpenLibrary (null quando a fonte não tem) e os livros oficiais ativos do autor, paginados, do grupo de ano mais recente para o mais antigo (RF-ACV-10). Livro pessoal nunca aparece (RNF-SEC-06).',
  })
  @ApiOkResponse({ type: PaginaDoAutorDto })
  obterAutor(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => idInvalido() }))
    id: string,
    @Query() query: PaginacaoQueryDto,
  ): Promise<PaginaDoAutorDto> {
    return this.servico.autor(id, query);
  }

  @Get('editoras/:id')
  @ApiOperation({
    operationId: 'obterEditora',
    summary: 'Obtém a página de uma editora',
    description:
      'Nome canônico e os livros oficiais ativos da editora, paginados, na mesma ordem da página de autor (RF-ACV-11). Livro pessoal nunca aparece (RNF-SEC-06).',
  })
  @ApiOkResponse({ type: PaginaDaEditoraDto })
  obterEditora(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => idInvalido() }))
    id: string,
    @Query() query: PaginacaoQueryDto,
  ): Promise<PaginaDaEditoraDto> {
    return this.servico.editora(id, query);
  }

  @Get('series/:id')
  @ApiOperation({
    operationId: 'obterSerie',
    summary: 'Obtém a página de uma série',
    description:
      'Nome, autores e os livros oficiais ativos da série, paginados, pelo número de ordem; sem número, no fim, por título (RF-ACV-12). Livro pessoal nunca aparece (RNF-SEC-06).',
  })
  @ApiOkResponse({ type: PaginaDaSerieDto })
  obterSerie(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => idInvalido() }))
    id: string,
    @Query() query: PaginacaoQueryDto,
  ): Promise<PaginaDaSerieDto> {
    return this.servico.serie(id, query);
  }
}

function idInvalido(): ErroDeValidacao {
  return new ErroDeValidacao([
    { campo: 'id', mensagem: 'Informe um identificador válido.' },
  ]);
}
