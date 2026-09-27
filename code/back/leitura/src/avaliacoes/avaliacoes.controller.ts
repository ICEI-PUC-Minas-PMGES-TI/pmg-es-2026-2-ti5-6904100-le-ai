import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UsuarioAtual } from '../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado';
import { ErroDeValidacao } from '../common/erros-de-negocio';
import { emMinusculas } from '../common/minusculas.pipe';
import { IdempotencyKey } from '../common/idempotencia/idempotency-key.decorator';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import { AvaliacoesService } from './avaliacoes.service';
import {
  MinhaAvaliacaoDto,
  NotaDto,
  NotaEntradaDto,
  ResenhaDto,
  ResenhaEntradaDto,
} from './dto/avaliacao.dto';

/** Escritas exigem a chave (RNF-ERR-04); o contrato versionado declara o mesmo cabeçalho. */
const CABECALHO_IDEMPOTENCIA = {
  name: 'Idempotency-Key',
  required: true,
  description: 'Chave da intenção, reenviada igual numa nova tentativa.',
};

const livroIdValido = new ParseUUIDPipe({
  exceptionFactory: () =>
    new ErroDeValidacao([
      { campo: 'livroId', mensagem: 'Informe um identificador válido.' },
    ]),
});

@ApiTags('avaliacoes')
@ApiBearerAuth('bearerAuth')
@Controller('livros/:livroId')
export class AvaliacoesController {
  constructor(private readonly servico: AvaliacoesService) {}

  @Put('nota')
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    porIdentidade: 60,
    porIp: 120,
    janelaSegundos: 60,
    escopo: 'salvar-nota',
  })
  @ApiOperation({
    operationId: 'salvarNota',
    summary: 'Cria ou atualiza a nota do leitor para o livro',
    description:
      'Uma nota por usuário e livro, de 0 a 5 em passos de 0,5 (RN-06). Mesmo valor responde 200 sem gravar e sem evento.',
  })
  @ApiOkResponse({ type: NotaDto })
  async salvarNota(
    @Param('livroId', livroIdValido, emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Body() entrada: NotaEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<NotaDto> {
    const { status, corpo } = await this.servico.salvarNota(
      usuario.id,
      livroId,
      chave,
      entrada.valor,
    );
    res.status(status);
    return corpo;
  }

  @Delete('nota')
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    porIdentidade: 60,
    porIp: 120,
    janelaSegundos: 60,
    escopo: 'excluir-nota',
  })
  @ApiOperation({
    operationId: 'excluirNota',
    summary: 'Remove a nota do leitor para o livro',
    description:
      'A confirmação é do cliente (RNF-USA-04). Sem nota para remover, responde 204 sem evento.',
  })
  @ApiNoContentResponse({ description: 'Nota removida ou já ausente.' })
  async excluirNota(
    @Param('livroId', livroIdValido, emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.servico.excluirNota(usuario.id, livroId, chave);
    res.status(204);
  }

  @Put('resenha')
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    porIdentidade: 30,
    porIp: 120,
    janelaSegundos: 60,
    escopo: 'salvar-resenha',
  })
  @ApiOperation({
    operationId: 'salvarResenha',
    summary: 'Cria ou atualiza a resenha do leitor para o livro',
    description:
      'Uma resenha por usuário e livro, texto cru de até 5.000 caracteres (RN-07). Só a criação publica resenha.publicada.',
  })
  @ApiOkResponse({ type: ResenhaDto })
  async salvarResenha(
    @Param('livroId', livroIdValido, emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Body() entrada: ResenhaEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ResenhaDto> {
    const { status, corpo } = await this.servico.salvarResenha(
      usuario.id,
      livroId,
      chave,
      { texto: entrada.texto, spoiler: entrada.spoiler },
    );
    res.status(status);
    return corpo;
  }

  @Delete('resenha')
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    porIdentidade: 30,
    porIp: 120,
    janelaSegundos: 60,
    escopo: 'excluir-resenha',
  })
  @ApiOperation({
    operationId: 'excluirResenha',
    summary: 'Exclui fisicamente a resenha do leitor',
    description:
      'A confirmação irreversível é do cliente (RNF-USA-04). Sem resenha, responde 204 sem evento.',
  })
  @ApiNoContentResponse({ description: 'Resenha removida ou já ausente.' })
  async excluirResenha(
    @Param('livroId', livroIdValido, emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.servico.excluirResenha(usuario.id, livroId, chave);
    res.status(204);
  }

  @Get('minha-avaliacao')
  @ApiOperation({
    operationId: 'consultarMinhaAvaliacao',
    summary: 'Consulta a nota e a resenha atuais do leitor',
    description: 'Nota e resenha ausentes são nulas, nunca valores inventados.',
  })
  @ApiOkResponse({ type: MinhaAvaliacaoDto })
  async minhaAvaliacao(
    @Param('livroId', livroIdValido, emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<MinhaAvaliacaoDto> {
    return this.servico.minhaAvaliacao(usuario.id, livroId);
  }
}
