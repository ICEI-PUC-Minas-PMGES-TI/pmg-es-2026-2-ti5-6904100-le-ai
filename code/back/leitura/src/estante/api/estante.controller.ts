import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import {
  type EscopoIdempotente,
  Idempotente,
} from '../../common/idempotencia/escopo-idempotente.decorator';
import {
  AdicionarEstanteEntradaDto,
  type ConclusoesLivro,
  ConsultaEstanteDto,
  type ItemEstante,
  type PaginaEstante,
} from './dto/estante.dto';
import { EstanteService } from '../aplicacao/estante.service';

function uuidDe(campo: string): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () =>
      new ErroDeValidacao([
        { campo, mensagem: 'Informe um identificador válido.' },
      ]),
  });
}

@ApiTags('estante')
@ApiBearerAuth()
@Controller()
export class EstanteController {
  constructor(private readonly servico: EstanteService) {}

  @Post('estante')
  @ApiOperation({
    operationId: 'adicionarLivroEstante',
    summary: 'Adiciona um livro à estante como Quero ler',
  })
  @ApiCreatedResponse({ description: 'Livro adicionado como Quero ler.' })
  async adicionar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Idempotente() escopo: EscopoIdempotente,
    @Body() entrada: AdicionarEstanteEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ItemEstante> {
    const { status, corpo } = await this.servico.adicionar(
      usuario.id,
      entrada.livroId,
      escopo,
    );
    res.status(status);
    return corpo;
  }

  @Delete('estante/:livroId')
  @ApiOperation({
    operationId: 'removerLivroEstante',
    summary: 'Remove um livro em Quero ler sem histórico',
  })
  @ApiNoContentResponse({
    description: 'Vínculo removido ou repetição idempotente concluída.',
  })
  async remover(
    @Param('livroId', uuidDe('livroId')) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Idempotente() escopo: EscopoIdempotente,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const { status } = await this.servico.remover(usuario.id, livroId, escopo);
    res.status(status);
  }

  @Get('estante')
  @ApiOperation({
    operationId: 'listarMinhaEstante',
    summary: 'Lista a estante do leitor autenticado',
  })
  @ApiOkResponse({ description: 'Página da estante e totais por status.' })
  listarMinha(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: ConsultaEstanteDto,
  ): Promise<PaginaEstante> {
    return this.servico.listarMinha(usuario.id, consulta);
  }

  @Get('estante/:livroId')
  @ApiOperation({
    operationId: 'consultarItemEstante',
    summary: 'Consulta um livro na estante do leitor autenticado',
  })
  @ApiOkResponse({ description: 'Item da estante do livro.' })
  consultarItem(
    @Param('livroId', uuidDe('livroId')) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<ItemEstante> {
    return this.servico.consultarItem(usuario.id, livroId);
  }

  @Get('perfis/:usuarioId/estante')
  @ApiOperation({
    operationId: 'listarEstantePerfil',
    summary: 'Lista a estante autorizada de um perfil',
  })
  @ApiOkResponse({ description: 'Página autorizada da estante.' })
  listarDoPerfil(
    @Param('usuarioId', uuidDe('usuarioId')) usuarioId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: ConsultaEstanteDto,
  ): Promise<PaginaEstante> {
    return this.servico.listarDoPerfil(usuario.id, usuarioId, consulta);
  }

  @Get('livros/:livroId/conclusoes')
  @ApiTags('leituras')
  @ApiOperation({
    operationId: 'consultarConclusoesLivro',
    summary: 'Consulta quantas vezes o leitor concluiu o livro',
  })
  @ApiOkResponse({ description: 'Contagem de leituras finalizadas.' })
  consultarConclusoes(
    @Param('livroId', uuidDe('livroId')) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<ConclusoesLivro> {
    return this.servico.consultarConclusoes(usuario.id, livroId);
  }
}
