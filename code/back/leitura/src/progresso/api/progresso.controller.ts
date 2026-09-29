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
  ApiHeader,
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
import { ProgressoService } from '../aplicacao/progresso.service';
import {
  ConsultaProgressoDto,
  CriarProgressoEntradaDto,
  ExcluirProgressoEntradaDto,
  ExclusaoProgressoResultadoDto,
  PaginaProgressoDto,
  ProgressoComResumoDto,
} from './dto/progresso.dto';

const CABECALHO_IDEMPOTENCIA = {
  name: 'Idempotency-Key',
  required: true,
  description:
    'UUID opaco; chave ator + método + caminho canônico (RNF-ERR-04).',
};

function idValido(campo: string): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () =>
      new ErroDeValidacao([
        { campo, mensagem: 'Informe um identificador válido.' },
      ]),
  });
}

@ApiTags('progresso')
@ApiBearerAuth()
@Controller()
export class ProgressoController {
  constructor(private readonly servico: ProgressoService) {}

  @Post('leituras/:leituraId/progresso')
  @ApiOperation({
    operationId: 'registrarProgresso',
    summary: 'Registra uma atualização manual de progresso',
  })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiCreatedResponse({ type: ProgressoComResumoDto })
  async registrar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('leituraId', idValido('leituraId'), emMinusculas) leituraId: string,
    @IdempotencyKey() chave: string,
    @Body() entrada: CriarProgressoEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ProgressoComResumoDto> {
    return responder(
      res,
      await this.servico.registrar(usuario.id, leituraId, entrada, chave),
    );
  }

  @Get('leituras/:leituraId/progresso')
  @ApiOperation({
    operationId: 'listarProgressos',
    summary: 'Lista as atualizações de progresso de uma leitura',
  })
  @ApiOkResponse({ type: PaginaProgressoDto })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('leituraId', idValido('leituraId'), emMinusculas) leituraId: string,
    @Query() consulta: ConsultaProgressoDto,
  ): Promise<PaginaProgressoDto> {
    return this.servico.listar(usuario.id, leituraId, consulta);
  }

  @Delete('progresso/:progressoId')
  @ApiOperation({
    operationId: 'excluirTrechoProgresso',
    summary: 'Exclui uma atualização e o trecho posterior confirmado',
  })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOkResponse({ type: ExclusaoProgressoResultadoDto })
  async excluirTrecho(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('progressoId', idValido('progressoId'), emMinusculas)
    progressoId: string,
    @IdempotencyKey() chave: string,
    @Body() entrada: ExcluirProgressoEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ExclusaoProgressoResultadoDto> {
    return responder(
      res,
      await this.servico.excluirTrecho(usuario.id, progressoId, entrada, chave),
    );
  }
}

function responder<T>(res: Response, resposta: RespostaIdempotente<T>): T {
  res.status(resposta.status);
  return resposta.corpo;
}
