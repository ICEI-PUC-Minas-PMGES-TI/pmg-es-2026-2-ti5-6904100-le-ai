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
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { IdempotencyKey } from '../../common/idempotencia/idempotency-key.decorator';
import {
  LivroPessoalAtualizacaoDto,
  LivroPessoalDetalheDto,
  LivroPessoalEntradaDto,
} from './dto/livro-pessoal.dto';
import { VIAS, Via } from './autorizacao-rn15.service';
import { LivroPessoalService } from './livro-pessoal.service';

const CAMPOS_ATUALIZAVEIS = [
  'titulo',
  'autor',
  'paginas',
  'sinopse',
  'capaUrl',
];

@ApiTags('livros-pessoais')
@ApiBearerAuth()
@Controller('livros/pessoal')
export class LivroPessoalController {
  constructor(private readonly servico: LivroPessoalService) {}

  @Post()
  @ApiOperation({
    operationId: 'criarLivroPessoal',
    summary: 'Cria um livro pessoal (RF-ACV-08)',
    description:
      'Cria um livro sem ISBN, pertencente ao usuário autenticado. O livro fica fora da busca, do catálogo e das páginas de autor, editora e série (RN-03, RNF-SEC-06).',
  })
  @ApiCreatedResponse({ type: LivroPessoalDetalheDto })
  async criar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Body() entrada: LivroPessoalEntradaDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LivroPessoalDetalheDto> {
    const { status, corpo } = await this.servico.criar(
      usuario.id,
      chave,
      entrada,
    );
    res.status(status);
    if (corpo?.id) {
      res.setHeader('Location', `/livros/pessoal/${corpo.id}`);
    }
    return corpo;
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'obterLivroPessoal',
    summary: 'Obtém um livro pessoal com autorização RN-15',
    description:
      'O dono acessa diretamente. Terceiro só acessa em modo consulta, por uma de duas vias: via=feed com referenciaId de uma atividade ativa do dono que referencia o mesmo livro, com seguimento aceito; ou via=lista com referenciaId de uma lista ativa do dono que contém o livro, com perfil do dono público ou seguimento aceito (RN-08). Conhecer o id não concede acesso.',
  })
  @ApiQuery({ name: 'via', required: false, enum: [...VIAS] })
  @ApiQuery({ name: 'referenciaId', required: false, format: 'uuid' })
  @ApiOkResponse({ type: LivroPessoalDetalheDto })
  async obter(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => idInvalido() }))
    id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query('via') via?: string,
    @Query('referenciaId') referenciaId?: string,
  ): Promise<LivroPessoalDetalheDto> {
    // Formato errado é 400; via ausente é 403. São coisas diferentes: uma é
    // pedido malformado, a outra é ausência de autorização.
    if (via !== undefined && !VIAS.includes(via as Via)) {
      throw new ErroDeValidacao([
        { campo: 'via', mensagem: 'Informe a via feed ou lista.' },
      ]);
    }
    if (referenciaId !== undefined && !UUID.test(referenciaId)) {
      throw new ErroDeValidacao([
        { campo: 'referenciaId', mensagem: 'Informe um identificador válido.' },
      ]);
    }

    return this.servico.obter(id, usuario.id, { via, referenciaId });
  }

  @Patch(':id')
  @ApiOperation({
    operationId: 'atualizarLivroPessoal',
    summary: 'Atualiza um livro pessoal do próprio usuário (RF-ACV-09)',
    description:
      'Propriedade validada no servidor (RNF-SEC-02). Campo ausente é preservado; campo enviado como null é limpo.',
  })
  @ApiOkResponse({ type: LivroPessoalDetalheDto })
  async atualizar(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => idInvalido() }))
    id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Body() entrada: LivroPessoalAtualizacaoDto,
    @Req() req: Request,
  ): Promise<LivroPessoalDetalheDto> {
    // O corpo cru é a única fonte que distingue "campo ausente" de "campo
    // enviado como null" — depois do ValidationPipe os dois viram `undefined`.
    const presentes = new Set(
      Object.keys((req.body ?? {}) as Record<string, unknown>).filter((campo) =>
        CAMPOS_ATUALIZAVEIS.includes(campo),
      ),
    );

    // O contrato exige `minProperties: 1`: corpo vazio não é atualização.
    if (presentes.size === 0) {
      throw new ErroDeValidacao([
        {
          campo: 'corpo',
          mensagem: 'Informe ao menos um campo para atualizar.',
        },
      ]);
    }

    const { corpo } = await this.servico.atualizar(
      id,
      usuario.id,
      chave,
      entrada,
      presentes,
    );
    return corpo;
  }

  @Delete(':id')
  @ApiOperation({
    operationId: 'excluirLivroPessoal',
    summary: 'Exclui um livro pessoal do próprio usuário (RF-ACV-09)',
    description:
      'Exclusivo do dono. Após a exclusão o livro fica inativo em v_livro_referencia_v1 e todo acesso de terceiro cessa imediatamente (RN-15.6). A confirmação explícita ocorre no cliente (RNF-USA-04).',
  })
  @ApiNoContentResponse({
    description: 'Livro pessoal excluído; resposta sem corpo.',
  })
  @ApiResponse({ status: 403, description: 'Usuário não é o dono do livro.' })
  async excluir(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => idInvalido() }))
    id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.servico.excluir(id, usuario.id, chave);
    res.status(204);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function idInvalido(): ErroDeValidacao {
  return new ErroDeValidacao([
    { campo: 'id', mensagem: 'Informe um identificador válido.' },
  ]);
}
