import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { IdempotencyKey } from '../../common/idempotencia/idempotency-key.decorator';
import type { RespostaIdempotente } from '../../common/idempotencia/idempotencia.service';
import { emMinusculas } from '../../common/minusculas.pipe';
import { DesafiosService } from '../aplicacao/desafios.service';
import {
  ConsultaDesafiosDto,
  CriarDesafioEntradaDto,
  DesafioDto,
  EditarDesafioEntradaDto,
  PaginaDesafiosDto,
} from './dto/desafios.dto';

const CABECALHO_IDEMPOTENCIA = {
  name: 'Idempotency-Key',
  required: true,
  description:
    'UUID opaco; chave ator + método + caminho canônico (RNF-ERR-04).',
};

const idDoDesafio = new ParseUUIDPipe({
  exceptionFactory: () =>
    new ErroDeValidacao([
      { campo: 'desafioId', mensagem: 'Informe um identificador válido.' },
    ]),
});

@ApiTags('desafios')
@ApiBearerAuth()
@Controller('desafios')
export class DesafiosController {
  constructor(private readonly servico: DesafiosService) {}

  @Post()
  @ApiOperation({ operationId: 'criarDesafio', summary: 'Cria um desafio' })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiCreatedResponse({ type: DesafioDto })
  async criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Body() entrada: CriarDesafioEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DesafioDto> {
    return responder(res, await this.servico.criar(usuario.id, entrada, chave));
  }

  @Get()
  @ApiOperation({
    operationId: 'listarDesafios',
    summary: 'Lista os desafios com o progresso da janela corrente',
  })
  @ApiOkResponse({ type: PaginaDesafiosDto })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: ConsultaDesafiosDto,
  ): Promise<PaginaDesafiosDto> {
    return this.servico.listar(usuario.id, consulta);
  }

  @Patch(':desafioId')
  @ApiOperation({ operationId: 'editarDesafio', summary: 'Edita um desafio' })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOkResponse({ type: DesafioDto })
  async editar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('desafioId', idDoDesafio, emMinusculas) desafioId: string,
    @IdempotencyKey() chave: string,
    @Body() entrada: EditarDesafioEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DesafioDto> {
    return responder(
      res,
      await this.servico.editar(usuario.id, desafioId, entrada, chave),
    );
  }

  @Post(':desafioId/pausar')
  @ApiOperation({ operationId: 'pausarDesafio', summary: 'Pausa um desafio' })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOkResponse({ type: DesafioDto })
  async pausar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('desafioId', idDoDesafio, emMinusculas) desafioId: string,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DesafioDto> {
    return responder(
      res,
      await this.servico.pausar(usuario.id, desafioId, chave),
    );
  }

  @Post(':desafioId/retomar')
  @ApiOperation({
    operationId: 'retomarDesafio',
    summary: 'Retoma um desafio pausado',
  })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOkResponse({ type: DesafioDto })
  async retomar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('desafioId', idDoDesafio, emMinusculas) desafioId: string,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DesafioDto> {
    return responder(
      res,
      await this.servico.retomar(usuario.id, desafioId, chave),
    );
  }

  @Delete(':desafioId')
  @ApiOperation({ operationId: 'excluirDesafio', summary: 'Exclui um desafio' })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiNoContentResponse({
    description: 'Desafio excluído ou repetição idempotente concluída.',
  })
  async excluir(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('desafioId', idDoDesafio, emMinusculas) desafioId: string,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const { status } = await this.servico.excluir(usuario.id, desafioId, chave);
    res.status(status);
  }
}

function responder<T>(res: Response, resposta: RespostaIdempotente<T>): T {
  res.status(resposta.status);
  return resposta.corpo;
}
