import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Publico } from '../auth/publico.decorator';
import { ErroDeValidacao } from '../common/erros-de-negocio';
import { IdempotencyKey } from '../common/idempotencia/idempotency-key.decorator';
import { emMinusculas } from '../common/minusculas.pipe';
import { RemocaoDto } from './dto/remocao.dto';
import { ModeracaoService } from './moderacao.service';
import { ModeracaoTokenGuard } from './moderacao-token.guard';

const idValido = (campo: string) =>
  new ParseUUIDPipe({
    exceptionFactory: () =>
      new ErroDeValidacao([
        { campo, mensagem: 'Informe um identificador válido.' },
      ]),
  });

/**
 * Comando interno da moderação (F-MOD): só o `social` chama, com o `X-Moderacao-Token`. Contrato
 * em `docs/api/leitura.yaml`, tag `interno`.
 */
@ApiTags('interno')
@Controller('internal/moderacao')
export class ModeracaoController {
  constructor(private readonly servico: ModeracaoService) {}

  @Post('resenhas/:resenhaId/remocao')
  @Publico()
  @UseGuards(ModeracaoTokenGuard)
  @ApiHeader({ name: 'X-Moderacao-Token', required: true })
  @ApiOperation({ operationId: 'removerResenhaPelaModeracao' })
  @ApiOkResponse({ type: RemocaoDto })
  async removerResenha(
    @Param('resenhaId', idValido('resenhaId'), emMinusculas) resenhaId: string,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RemocaoDto> {
    const resposta = await this.servico.removerResenha(resenhaId, chave);
    res.status(resposta.status);
    return resposta.corpo;
  }

  @Post('frases/:fraseId/remocao')
  @Publico()
  @UseGuards(ModeracaoTokenGuard)
  @ApiHeader({ name: 'X-Moderacao-Token', required: true })
  @ApiOperation({ operationId: 'removerFrasePelaModeracao' })
  @ApiOkResponse({ type: RemocaoDto })
  async removerFrase(
    @Param('fraseId', idValido('fraseId'), emMinusculas) fraseId: string,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RemocaoDto> {
    const resposta = await this.servico.removerFrase(fraseId, chave);
    res.status(resposta.status);
    return resposta.corpo;
  }
}
