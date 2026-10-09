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
  UseGuards,
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
import { UsuarioAtual } from '../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado';
import { ErroDeValidacao } from '../common/erros-de-negocio';
import { IdempotencyKey } from '../common/idempotencia/idempotency-key.decorator';
import { emMinusculas } from '../common/minusculas.pipe';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../common/rate-limit/rate-limit.guard';
import {
  LIMITE_PADRAO,
  PaginacaoQueryDto,
} from '../perfis/dto/resenhas-do-perfil.dto';
import { FraseDto, FraseEntradaDto, PaginaFrasesDto } from './dto/frase.dto';
import { FrasesService } from './frases.service';

const CABECALHO_IDEMPOTENCIA = {
  name: 'Idempotency-Key',
  required: true,
  description: 'Chave da intenção, reenviada igual numa nova tentativa.',
};

const idValido = (campo: string) =>
  new ParseUUIDPipe({
    exceptionFactory: () =>
      new ErroDeValidacao([
        { campo, mensagem: 'Informe um identificador válido.' },
      ]),
  });

@ApiTags('frases')
@ApiBearerAuth('bearerAuth')
@Controller()
export class FrasesController {
  constructor(private readonly servico: FrasesService) {}

  @Get('livros/:livroId/frases')
  @ApiOperation({
    operationId: 'listarFrases',
    summary: 'Lista as frases do livro que o leitor pode ver',
    description:
      'RN-08 por autor; livro pessoal só para o dono. Mais recentes primeiro. Traz a cota do leitor (minhasFrases de limitePorLivro).',
  })
  @ApiOkResponse({ type: PaginaFrasesDto })
  async listar(
    @Param('livroId', idValido('livroId'), emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: PaginacaoQueryDto,
  ): Promise<PaginaFrasesDto> {
    return this.servico.listar(
      usuario.id,
      livroId,
      consulta.page ?? 1,
      consulta.limite ?? LIMITE_PADRAO,
    );
  }

  @Post('livros/:livroId/frases')
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    porIdentidade: 20,
    porIp: 120,
    janelaSegundos: 60,
    escopo: 'cadastrar-frase',
  })
  @ApiOperation({
    operationId: 'cadastrarFrase',
    summary: 'Guarda um trecho do livro com a página',
    description:
      'Até 500 caracteres, página de 1 ao total do livro e no máximo 10 por leitor e livro (RN-11, 422 LIMITE_DE_FRASES).',
  })
  @ApiCreatedResponse({ type: FraseDto })
  async cadastrar(
    @Param('livroId', idValido('livroId'), emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Body() entrada: FraseEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FraseDto> {
    const { status, corpo } = await this.servico.cadastrar(
      usuario.id,
      livroId,
      chave,
      { texto: entrada.texto, pagina: entrada.pagina },
    );
    res.status(status);
    return corpo;
  }

  @Delete('frases/:fraseId')
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @UseGuards(RateLimitGuard)
  @RateLimit({
    porIdentidade: 30,
    porIp: 120,
    janelaSegundos: 60,
    escopo: 'excluir-frase',
  })
  @ApiOperation({
    operationId: 'excluirFrase',
    summary: 'Exclui a própria frase',
    description:
      'A confirmação é do cliente (RNF-USA-04). Frase inexistente ou de outra pessoa é 404.',
  })
  @ApiNoContentResponse({ description: 'Frase excluída.' })
  async excluir(
    @Param('fraseId', idValido('fraseId'), emMinusculas) fraseId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.servico.excluir(usuario.id, fraseId, chave);
    res.status(204);
  }
}
