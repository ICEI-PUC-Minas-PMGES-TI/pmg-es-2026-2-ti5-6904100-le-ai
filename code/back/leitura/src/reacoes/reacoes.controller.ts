import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UsuarioAtual } from '../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado';
import { ErroDeValidacao } from '../common/erros-de-negocio';
import { IdempotencyKey } from '../common/idempotencia/idempotency-key.decorator';
import { emMinusculas } from '../common/minusculas.pipe';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { ReacaoEntradaDto, ReacoesDto, ViaDeAcessoDto } from './dto/reacao.dto';
import { ReacoesService } from './reacoes.service';

const CABECALHO_IDEMPOTENCIA = {
  name: 'Idempotency-Key',
  required: true,
  description: 'Chave da intenção, reenviada igual numa nova tentativa.',
};

const resenhaIdValido = new ParseUUIDPipe({
  exceptionFactory: () =>
    new ErroDeValidacao([
      { campo: 'resenhaId', mensagem: 'Informe um identificador válido.' },
    ]),
});

@ApiTags('reacoes')
@ApiBearerAuth('bearerAuth')
@Controller('resenhas/:resenhaId/reacao')
export class ReacoesController {
  constructor(private readonly servico: ReacoesService) {}

  @Put()
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    porIdentidade: 60,
    porIp: 120,
    janelaSegundos: 60,
    escopo: 'reagir-resenha',
  })
  @ApiOperation({
    operationId: 'reagirResenha',
    summary: 'Curte ou descurte a resenha de outro leitor',
    description:
      'Uma reação por leitor e resenha, alternável (RF-AVA-05). A primeira curtida do par publica resenha.curtida para o autor; recurtir, alternar e descurtir não publicam.',
  })
  @ApiOkResponse({ type: ReacoesDto })
  async reagir(
    @Param('resenhaId', resenhaIdValido, emMinusculas) resenhaId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Body() entrada: ReacaoEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReacoesDto> {
    const { status, corpo } = await this.servico.reagir(
      usuario.id,
      resenhaId,
      chave,
      {
        tipo: entrada.tipo,
        via: entrada.via,
        referenciaId: entrada.referenciaId,
      },
    );
    res.status(status);
    return corpo;
  }

  @Delete()
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    porIdentidade: 60,
    porIp: 120,
    janelaSegundos: 60,
    escopo: 'remover-reacao-resenha',
  })
  @ApiOperation({
    operationId: 'removerReacaoResenha',
    summary: 'Retira a reação do leitor à resenha',
    description:
      'Revalida o acesso como o PUT. Sem reação ativa, responde 200 com o estado atual.',
  })
  @ApiOkResponse({ type: ReacoesDto })
  async retirar(
    @Param('resenhaId', resenhaIdValido, emMinusculas) resenhaId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Query() consulta: ViaDeAcessoDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReacoesDto> {
    const { status, corpo } = await this.servico.retirar(
      usuario.id,
      resenhaId,
      chave,
      { via: consulta.via, referenciaId: consulta.referenciaId },
    );
    res.status(status);
    return corpo;
  }
}
