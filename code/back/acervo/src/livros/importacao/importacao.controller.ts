import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { IdempotencyKey } from '../../common/idempotencia/idempotency-key.decorator';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import {
  ImportacaoAceitaDto,
  ImportacaoDto,
  SolicitarImportacaoDto,
} from './dto/importacao.dto';
import { ImportacaoService } from './importacao.service';

function idInvalido(): ErroDeValidacao {
  return new ErroDeValidacao([
    { campo: 'id', mensagem: 'Informe um identificador válido.' },
  ]);
}

@ApiTags('importacoes')
@ApiBearerAuth()
@Controller('livros')
export class ImportacaoController {
  constructor(private readonly servico: ImportacaoService) {}

  @Post('oficial')
  @UseGuards(RateLimitGuard)
  // RNF-SEC-18: a rota dispara busca externa e criação de registro, e é a única
  // de `acervo` que o requisito nomeia. Limite por identidade mais apertado que
  // por IP — ver a justificativa em `rate-limit.guard.ts`.
  @RateLimit({ porIdentidade: 10, porIp: 30, janelaSegundos: 60 })
  @ApiOperation({
    operationId: 'solicitarImportacaoPorIsbn',
    summary: 'Solicita a importação assíncrona de um livro oficial por ISBN-13',
    description:
      'Aceita somente ISBN-13 válido, nunca URL (RNF-SEC-38). ISBN novo cria a solicitação, grava a outbox de livro.importacao_solicitada na mesma transação e responde 202 sem aguardar as fontes externas. ISBN já existente responde 409 com livroId.',
  })
  @ApiResponse({ status: 202, type: ImportacaoAceitaDto })
  @ApiResponse({
    status: 409,
    description: 'ISBN já cadastrado; o corpo traz livroId.',
  })
  async solicitar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Body() entrada: SolicitarImportacaoDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ImportacaoAceitaDto> {
    const { status, corpo } = await this.servico.solicitar(
      usuario.id,
      chave,
      entrada.isbn,
    );
    res.status(status);
    if (corpo?.importacaoId) {
      res.setHeader('Location', `/livros/importacoes/${corpo.importacaoId}`);
    }
    return corpo;
  }

  @Get('importacoes/:id')
  @ApiOperation({
    operationId: 'obterImportacaoPorIsbn',
    summary: 'Consulta uma importação por ISBN',
    description:
      'Somente o solicitante consulta. nao_encontrado habilita o cadastro pessoal; falha_transitoria é indisponibilidade e não se confunde com ausência do livro.',
  })
  @ApiOkResponse({ type: ImportacaoDto })
  async obter(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: idInvalido }))
    id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<ImportacaoDto> {
    return this.servico.obter(id, usuario.id);
  }

  @Post('importacoes/:id/reprocessar')
  @UseGuards(RateLimitGuard)
  @RateLimit({ porIdentidade: 10, porIp: 30, janelaSegundos: 60 })
  @ApiOperation({
    operationId: 'reprocessarImportacaoPorIsbn',
    summary: 'Reprocessa uma importação com falha transitória',
    description:
      'Somente o solicitante reenfileira, e somente a partir de falha_transitoria. Mantém o mesmo importacaoId e o mesmo ISBN normalizado.',
  })
  @ApiResponse({ status: 202, type: ImportacaoAceitaDto })
  async reprocessar(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: idInvalido }))
    id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ImportacaoAceitaDto> {
    const { status, corpo } = await this.servico.reprocessar(
      id,
      usuario.id,
      chave,
    );
    res.status(status);
    return corpo;
  }
}
