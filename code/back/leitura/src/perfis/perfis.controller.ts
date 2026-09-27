import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioAtual } from '../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../auth/usuario-autenticado';
import { ErroDeValidacao } from '../common/erros-de-negocio';
import { emMinusculas } from '../common/minusculas.pipe';
import {
  PaginaResenhasPerfilDto,
  PaginacaoQueryDto,
} from './dto/resenhas-do-perfil.dto';
import { PerfisService } from './perfis.service';

@ApiTags('perfis')
@ApiBearerAuth('bearerAuth')
@Controller('perfis/:usuarioId')
export class PerfisController {
  constructor(private readonly servico: PerfisService) {}

  @Get('resenhas')
  @ApiOperation({
    operationId: 'listarResenhasPerfil',
    summary: 'Lista as resenhas autorizadas de um perfil',
    description:
      'RN-08: próprio usuário e perfis públicos; privado exige seguimento aceito. Livro pessoal só para o dono (RN-15).',
  })
  @ApiOkResponse({ type: PaginaResenhasPerfilDto })
  async resenhas(
    @Param(
      'usuarioId',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new ErroDeValidacao([
            {
              campo: 'usuarioId',
              mensagem: 'Informe um identificador válido.',
            },
          ]),
      }),
      emMinusculas,
    )
    usuarioId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() query: PaginacaoQueryDto,
  ): Promise<PaginaResenhasPerfilDto> {
    return this.servico.resenhas(
      usuario.id,
      usuarioId,
      query.page,
      query.limite,
    );
  }
}
