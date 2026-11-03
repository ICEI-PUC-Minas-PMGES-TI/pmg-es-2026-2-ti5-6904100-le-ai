import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { emMinusculas } from '../../common/minusculas.pipe';
import { EstatisticasService } from '../aplicacao/estatisticas.service';
import {
  ConsultaEstatisticasDto,
  ConsultaEstatisticasPerfilDto,
  EstatisticasDto,
  EstatisticasPerfilDto,
  GraficosEstatisticasDto,
} from './dto/estatisticas.dto';

const idDoUsuario = new ParseUUIDPipe({
  exceptionFactory: () =>
    new ErroDeValidacao([
      { campo: 'usuarioId', mensagem: 'Informe um identificador válido.' },
    ]),
});

@ApiTags('estatisticas')
@ApiBearerAuth()
@Controller()
export class EstatisticasController {
  constructor(private readonly servico: EstatisticasService) {}

  @Get('me/estatisticas')
  @ApiOperation({
    operationId: 'consultarMinhasEstatisticas',
    summary: 'Consulta totais e médias de leitura de um ano ou do acumulado',
    description:
      'Só do próprio leitor. Recomposto de forma assíncrona a partir de `progresso.registrado` e `leitura.finalizada` (RF-STA-05). Médias sem denominador são nulas.',
  })
  @ApiOkResponse({ type: EstatisticasDto })
  consultar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: ConsultaEstatisticasDto,
  ): Promise<EstatisticasDto> {
    return this.servico.consultar(usuario.id, consulta.periodo);
  }

  @Get('me/estatisticas/graficos')
  @ApiOperation({
    operationId: 'consultarGraficosEstatisticas',
    summary: 'Séries de páginas e livros concluídos por mês ou por ano',
  })
  @ApiOkResponse({ type: GraficosEstatisticasDto })
  graficos(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: ConsultaEstatisticasDto,
  ): Promise<GraficosEstatisticasDto> {
    return this.servico.graficos(usuario.id, consulta.periodo);
  }

  @Get('perfis/:usuarioId/estatisticas')
  @ApiTags('perfis')
  @ApiOperation({
    operationId: 'consultarEstatisticasPerfil',
    summary: 'Consulta os totais do ano de um perfil autorizado',
  })
  @ApiOkResponse({ type: EstatisticasPerfilDto })
  doPerfil(
    @Param('usuarioId', idDoUsuario, emMinusculas) usuarioId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: ConsultaEstatisticasPerfilDto,
  ): Promise<EstatisticasPerfilDto> {
    return this.servico.doPerfil(usuario.id, usuarioId, consulta.ano);
  }
}
