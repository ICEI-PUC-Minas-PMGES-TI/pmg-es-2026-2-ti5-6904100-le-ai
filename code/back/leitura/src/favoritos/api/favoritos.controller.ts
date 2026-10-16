import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Res,
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
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { IdempotencyKey } from '../../common/idempotencia/idempotency-key.decorator';
import { emMinusculas } from '../../common/minusculas.pipe';
import { PaginacaoQueryDto } from '../../perfis/dto/resenhas-do-perfil.dto';
import { FavoritosService } from '../aplicacao/favoritos.service';
import { FavoritoDto, PaginaFavoritosDto } from './dto/favorito.dto';

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

@ApiTags('favoritos')
@ApiBearerAuth()
@Controller()
export class FavoritosController {
  constructor(private readonly servico: FavoritosService) {}

  @Get('livros/:livroId/favorito')
  @ApiOperation({
    operationId: 'consultarFavorito',
    summary: 'Consulta se o livro é favorito do leitor',
    description:
      'Só do próprio leitor; livro não favoritado responde `favorito: false`.',
  })
  @ApiOkResponse({ type: FavoritoDto })
  consultar(
    @Param('livroId', livroIdValido, emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<FavoritoDto> {
    return this.servico.consultar(usuario.id, livroId);
  }

  @Put('livros/:livroId/favorito')
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOperation({
    operationId: 'marcarFavorito',
    summary: 'Marca o livro como favorito do leitor',
    description:
      'Independente da estante: não cria vínculo nem status de leitura. Livro pessoal de outro leitor é recusado (RN-15). Marcar de novo responde 200 sem duplicar.',
  })
  @ApiOkResponse({ type: FavoritoDto })
  async marcar(
    @Param('livroId', livroIdValido, emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<FavoritoDto> {
    const { status, corpo } = await this.servico.marcar(
      usuario.id,
      livroId,
      chave,
    );
    res.status(status);
    return corpo;
  }

  @Delete('livros/:livroId/favorito')
  @ApiHeader(CABECALHO_IDEMPOTENCIA)
  @ApiOperation({
    operationId: 'desmarcarFavorito',
    summary: 'Desmarca o livro como favorito do leitor',
    description:
      'Não altera a estante. Sem favorito para remover, responde 204 do mesmo jeito.',
  })
  @ApiNoContentResponse({ description: 'Favorito removido ou já ausente.' })
  async desmarcar(
    @Param('livroId', livroIdValido, emMinusculas) livroId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const { status } = await this.servico.desmarcar(usuario.id, livroId, chave);
    res.status(status);
  }

  @Get('me/favoritos')
  @ApiOperation({
    operationId: 'listarMeusFavoritos',
    summary: 'Lista os favoritos do leitor, dentro ou fora da estante',
    description:
      'Só do próprio leitor, do mais recente ao mais antigo. Livro fora da estante vem com `status` nulo. Livro inativo não aparece.',
  })
  @ApiOkResponse({ type: PaginaFavoritosDto })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: PaginacaoQueryDto,
  ): Promise<PaginaFavoritosDto> {
    return this.servico.listar(usuario.id, consulta);
  }
}
