import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { SequenciaService } from '../sequencia.service';
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
}
