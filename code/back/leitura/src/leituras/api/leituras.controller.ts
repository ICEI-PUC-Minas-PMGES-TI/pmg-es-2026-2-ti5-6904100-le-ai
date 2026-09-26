import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import {
  type EscopoIdempotente,
  Idempotente,
} from '../../common/idempotencia/escopo-idempotente.decorator';
import type { RespostaIdempotente } from '../../common/idempotencia/idempotencia.service';
import {
  FinalizarLeituraEntradaDto,
  IniciarLeituraEntradaDto,
  LeituraDto,
} from './dto/leitura.dto';
import { LeiturasService } from '../aplicacao/leituras.service';

const CABECALHO_IDEMPOTENCIA = {
  name: 'Idempotency-Key',
  required: true,
  description:
    'UUID opaco; escopo ator + método + caminho canônico (RNF-ERR-04).',
};

const leituraIdValido = new ParseUUIDPipe({
  exceptionFactory: () =>
    new ErroDeValidacao([
      { campo: 'leituraId', mensagem: 'Informe um identificador válido.' },
    ]),
});

@ApiTags('leituras')
@ApiBearerAuth()
@Controller()
export class LeiturasController {
  constructor(private readonly servico: LeiturasService) {}

  @Post('leituras')
  @ApiOperation({
    operationId: 'iniciarLeitura',
    summary: 'Inicia a primeira leitura de um livro',
  })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiCreatedResponse({ type: LeituraDto })
  async iniciar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Idempotente() escopo: EscopoIdempotente,
    @Body() entrada: IniciarLeituraEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LeituraDto> {
    return responder(
      res,
      await this.servico.iniciar(usuario.id, entrada, escopo),
    );
  }

  @Post('releituras')
  @ApiOperation({
    operationId: 'iniciarReleitura',
    summary: 'Inicia uma releitura de livro já concluído',
  })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiCreatedResponse({ type: LeituraDto })
  async iniciarReleitura(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Idempotente() escopo: EscopoIdempotente,
    @Body() entrada: IniciarLeituraEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LeituraDto> {
    return responder(
      res,
      await this.servico.iniciarReleitura(usuario.id, entrada, escopo),
    );
  }

  @Get('leituras/:leituraId')
  @ApiOperation({
    operationId: 'detalharLeitura',
    summary: 'Consulta os detalhes de uma leitura própria',
  })
  @ApiOkResponse({ type: LeituraDto })
  detalhar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('leituraId', leituraIdValido) leituraId: string,
  ): Promise<LeituraDto> {
    return this.servico.detalhar(usuario.id, leituraId);
  }

  @Post('leituras/:leituraId/finalizar')
  @ApiOperation({
    operationId: 'finalizarLeitura',
    summary: 'Finaliza uma leitura ou releitura em andamento',
  })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOkResponse({ type: LeituraDto })
  async finalizar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('leituraId', leituraIdValido) leituraId: string,
    @Idempotente() escopo: EscopoIdempotente,
    @Body() entrada: FinalizarLeituraEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LeituraDto> {
    return responder(
      res,
      await this.servico.finalizar(usuario.id, leituraId, entrada, escopo),
    );
  }

  @Post('leituras/:leituraId/abandonar')
  @ApiOperation({
    operationId: 'abandonarLeitura',
    summary: 'Abandona manualmente uma leitura em andamento',
  })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOkResponse({ type: LeituraDto })
  async abandonar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('leituraId', leituraIdValido) leituraId: string,
    @Idempotente() escopo: EscopoIdempotente,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LeituraDto> {
    return responder(
      res,
      await this.servico.abandonar(usuario.id, leituraId, escopo),
    );
  }

  @Post('leituras/:leituraId/retomar')
  @ApiOperation({
    operationId: 'retomarLeitura',
    summary: 'Retoma uma primeira leitura abandonada',
  })
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOkResponse({ type: LeituraDto })
  async retomar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Param('leituraId', leituraIdValido) leituraId: string,
    @Idempotente() escopo: EscopoIdempotente,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LeituraDto> {
    return responder(
      res,
      await this.servico.retomar(usuario.id, leituraId, escopo),
    );
  }
}

/** O replay de idempotência devolve o status original, não o padrão da rota. */
function responder<T>(res: Response, resposta: RespostaIdempotente<T>): T {
  res.status(resposta.status);
  return resposta.corpo;
}
