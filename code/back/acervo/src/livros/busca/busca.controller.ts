import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BuscaService } from './busca.service';
import {
  BuscaLivrosQueryDto,
  ListaAssuntosDto,
  PaginaLivrosDto,
} from './dto/busca.dto';

@ApiTags('livros')
@ApiBearerAuth()
@Controller()
export class BuscaController {
  constructor(private readonly servico: BuscaService) {}

  @Get('assuntos')
  @ApiOperation({
    operationId: 'listarAssuntos',
    summary: 'Lista os assuntos do conjunto curado',
    description:
      'Assuntos para o filtro da busca (RF-ACV-02, RN-21), ordenados por nome, com teto de 100.',
  })
  @ApiOkResponse({ type: ListaAssuntosDto })
  listarAssuntos(): Promise<ListaAssuntosDto> {
    return this.servico.listarAssuntos();
  }

  @Get('livros')
  @ApiOperation({
    operationId: 'buscarLivrosOficiais',
    summary: 'Busca livros oficiais',
    description:
      'Busca por título, autor, editora, assunto ou ISBN-13, sem acento e por trecho, com filtros opcionais por assunto (RF-ACV-02) e por autor, editora, série, ano e faixa de páginas (RF-ACV-03), todos combináveis. Algum critério é obrigatório. Livro pessoal nunca aparece (RNF-SEC-06). As edições de mesmo título e autores chegam contíguas (RN-01).',
  })
  @ApiOkResponse({ type: PaginaLivrosDto })
  buscar(@Query() query: BuscaLivrosQueryDto): Promise<PaginaLivrosDto> {
    return this.servico.buscar(query);
  }
}
