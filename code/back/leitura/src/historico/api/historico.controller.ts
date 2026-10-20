import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { HistoricoService } from '../aplicacao/historico.service';
import { ConsultaHistoricoDto, PaginaHistoricoDto } from './dto/historico.dto';

@ApiTags('historico')
@ApiBearerAuth()
@Controller()
export class HistoricoController {
  constructor(private readonly servico: HistoricoService) {}

  @Get('me/historico')
  @ApiOperation({
    operationId: 'listarMeuHistorico',
    summary:
      'Lista as leituras concluídas do leitor, uma ocorrência por conclusão',
    description:
      'Só do próprio leitor. Conta leitura e releitura finalizadas (RN-04.4); releitura incompleta e leitura abandonada ficam de fora. Ordena pela data de fim, da mais recente. `q` pesquisa título ou autor em todos os anos e combina com `ano`.',
  })
  @ApiOkResponse({ type: PaginaHistoricoDto })
  listar(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() consulta: ConsultaHistoricoDto,
  ): Promise<PaginaHistoricoDto> {
    return this.servico.listar(usuario.id, consulta);
  }
}
