import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioAtual } from '../../auth/usuario-atual.decorator';
import { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import {
  LivroOficialDetalheDto,
  PaginaResenhasDto,
  ResenhasQueryDto,
} from './dto/livro-oficial.dto';
import { LivroOficialService } from './livro-oficial.service';

@ApiTags('livros')
@ApiBearerAuth()
@Controller('livros')
export class LivroOficialController {
  constructor(private readonly servico: LivroOficialService) {}

  @Get(':id')
  @UseGuards(RateLimitGuard)
  // A abertura dispara consulta a fonte externa: sem limite, um script que
  // abrisse o acervo inteiro geraria milhares de consultas à OpenLibrary. Mais
  // folgado que o do cadastro, porque o polling da sinopse também chama esta
  // rota, e em escopo próprio para não gastar o limite do cadastro. O teto por
  // IP é bem maior que o por identidade: uma turma inteira atrás do NAT da
  // faculdade sai pelo mesmo IP, e cada abertura soma até 7 consultas de
  // polling no primeiro minuto.
  @RateLimit({
    porIdentidade: 60,
    porIp: 600,
    janelaSegundos: 60,
    escopo: 'pagina-do-livro',
  })
  @ApiOperation({
    operationId: 'obterLivroOficial',
    summary: 'Obtém a página de um livro oficial',
    description:
      'Metadados, capa, sinopse e a primeira página de resenhas de outros leitores, filtradas por RN-08. A primeira abertura troca a sinopse para pendente e grava livro.pagina_aberta na outbox; a resposta nunca espera a fonte externa. resenhas vem null quando os contratos de leitura ou identidade estão indisponíveis.',
  })
  @ApiOkResponse({ type: LivroOficialDetalheDto })
  obter(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => idInvalido() }))
    id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<LivroOficialDetalheDto> {
    return this.servico.obter(id, usuario.id);
  }

  @Get(':id/resenhas')
  @ApiOperation({
    operationId: 'listarResenhasDoLivro',
    summary: 'Lista as próximas resenhas autorizadas de um livro oficial',
    description:
      'Cursor opaco, da mais recente para a mais antiga, com o filtro de RN-08 no servidor e sem a resenha do próprio solicitante.',
  })
  @ApiOkResponse({ type: PaginaResenhasDto })
  listarResenhas(
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => idInvalido() }))
    id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Query() query: ResenhasQueryDto,
  ): Promise<PaginaResenhasDto> {
    return this.servico.listarResenhas(id, usuario.id, query);
  }
}

function idInvalido(): ErroDeValidacao {
  return new ErroDeValidacao([
    { campo: 'id', mensagem: 'Informe um identificador válido.' },
  ]);
}
