import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiUnprocessableEntityResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { SequenciaService } from '../sequencia.service';
import {
  CalendarioSequenciaDto,
  ConsultaCalendarioDto,
} from './calendario.dto';
import { SequenciaDto } from './sequencia.dto';

@ApiTags('sequencia')
@ApiBearerAuth()
@Controller()
export class SequenciaController {
  constructor(private readonly servico: SequenciaService) {}

  @Get('me/sequencia')
  @ApiOperation({
    operationId: 'consultarMinhaSequencia',
    summary: 'Consulta a sequência diária atual e a maior já alcançada',
    description:
      'Só do próprio leitor. Conta dias de calendário com ao menos um progresso, no fuso do dispositivo (RN-18). Sem progresso, zeros e `ultimoDiaComLeitura` nulo.',
  })
  @ApiOkResponse({ type: SequenciaDto })
  consultar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<SequenciaDto> {
    return this.servico.consultar(usuario.id);
  }

  @Get('me/sequencia/calendario')
  @ApiOperation({
    operationId: 'consultarCalendarioDaSequencia',
    summary: 'Lista os dias com leitura de um mês da janela recente',
    description:
      'Só do próprio leitor e somente leitura (RF-GAM-04, RN-17). Dias com ao menos um progresso com página lida, pela data local (RN-18). Janela: o mês corrente e os cinco anteriores, sem recuar antes do primeiro dia com leitura (RNF-DES-02). Mês fora dela é 422.',
  })
  @ApiOkResponse({ type: CalendarioSequenciaDto })
  @ApiUnprocessableEntityResponse({ description: 'Mês fora da janela.' })
  calendario(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: ConsultaCalendarioDto,
  ): Promise<CalendarioSequenciaDto> {
    return this.servico.calendario(usuario.id, consulta.mes);
  }
}
