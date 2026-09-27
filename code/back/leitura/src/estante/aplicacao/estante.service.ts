import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AcessoNegado,
  ErroDeNegocio,
  EstanteComHistorico,
  LivroNaoEncontrado,
  LivroPessoalDeTerceiro,
  NaoEncontrado,
  TransicaoDeLeituraInvalida,
} from '../../common/erros-de-negocio';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../../common/idempotencia/idempotencia.constantes';
import {
  IdempotenciaService,
  type RespostaIdempotente,
} from '../../common/idempotencia/idempotencia.service';
import { ehViolacaoDeUnicidade } from '../../common/pg-erros';
import {
  STATUS_ESTANTE,
  type ResultadoTransicao,
  type Transicao,
  type TransicaoInvalida,
  aplicarEvento,
} from '../../leituras/dominio/maquina-estados';
import { livroAdicionadoAEstante } from '../../leituras/dominio/eventos';
import { OutboxRepository } from '../../outbox/outbox.repository';
import { ReferenciasExternas } from '../../referencias/referencias-externas.service';
import {
  type ConclusoesLivro,
  type ConsultaEstanteDto,
  type ItemEstante,
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  PAGINA_PADRAO,
  type PaginaEstante,
  type TotaisEstante,
} from '../api/dto/estante.dto';
import { ORDENACAO_PADRAO } from '../dominio/estante';
import {
  statusParaApi,
  statusParaBanco,
} from '../../common/status-estante-api';
import {
  EstanteRepository,
  type LinhaEstante,
} from '../infraestrutura/estante.repository';

const UNICIDADE_ESTANTE = 'estante_usuario_livro_uk';
const PERCENTUAL_MAXIMO = 100;
const LIVRO_FORA_DA_ESTANTE = 'Este livro não está na sua estante.';

@Injectable()
export class EstanteService {
  constructor(
    private readonly repositorio: EstanteRepository,
    private readonly idempotencia: IdempotenciaService,
    private readonly referencias: ReferenciasExternas,
    private readonly outbox: OutboxRepository,
  ) {}

  adicionar(
    usuarioId: string,
    livroId: string,
    chave: string,
  ): Promise<RespostaIdempotente<ItemEstante>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.ADICIONAR_LIVRO_ESTANTE),
        chave,
        payload: { livroId },
      },
      async (tx) => {
        const livro = await this.referencias.buscarLivroAcessivel(
          livroId,
          usuarioId,
          tx,
        );
        const { snapshot } = await this.repositorio.travarSnapshot(
          tx,
          usuarioId,
          livroId,
        );
        const transicao = exigirTransicao(aplicarEvento(snapshot, 'adicionar'));

        const vinculo = await this.repositorio
          .inserir(tx, usuarioId, livroId, transicao.statusEstante!)
          .catch((erro: unknown) => {
            if (ehViolacaoDeUnicidade(erro, UNICIDADE_ESTANTE)) {
              exigirTransicao(
                aplicarEvento(
                  { ...snapshot, status: 'quero_ler' },
                  'adicionar',
                ),
              );
            }
            throw erro;
          });
        await this.outbox.inserir(
          tx,
          livroAdicionadoAEstante({ usuarioId, livroId }),
        );

        return {
          status: HttpStatus.CREATED,
          corpo: paraItem({
            ...vinculo,
            leituraEmAndamentoId: null,
            ultimaLeitura: null,
            paginaAtual: null,
            totalPaginas: livro.paginas,
            livro: {
              titulo: livro.snapshot.titulo,
              autor: livro.snapshot.autor,
              capaUrl: livro.snapshot.capaUrl,
            },
          }),
        };
      },
    );
  }

  remover(
    usuarioId: string,
    livroId: string,
    chave: string,
  ): Promise<RespostaIdempotente<undefined>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.REMOVER_LIVRO_ESTANTE, livroId),
        chave,
        payload: {},
      },
      async (tx) => {
        const { vinculo, snapshot } = await this.repositorio.travarSnapshot(
          tx,
          usuarioId,
          livroId,
        );
        exigirTransicao(aplicarEvento(snapshot, 'remover'));
        await this.repositorio.remover(tx, vinculo!.id);
        return { status: HttpStatus.NO_CONTENT, corpo: undefined };
      },
    );
  }

  listarMinha(
    usuarioId: string,
    consulta: ConsultaEstanteDto,
  ): Promise<PaginaEstante> {
    return this.listar(usuarioId, consulta);
  }

  async listarDoPerfil(
    solicitanteId: string,
    usuarioId: string,
    consulta: ConsultaEstanteDto,
  ): Promise<PaginaEstante> {
    if (solicitanteId !== usuarioId) {
      const perfil = await this.referencias.buscarPerfil(usuarioId);
      if (!perfil) {
        throw new NaoEncontrado('Não encontramos este perfil.');
      }
      if (
        perfil.privacidade === 'privado' &&
        !(await this.referencias.existeSeguimentoAceito(
          solicitanteId,
          usuarioId,
        ))
      ) {
        throw new AcessoNegado('Este perfil é privado.');
      }
    }
    return this.listar(usuarioId, consulta);
  }

  async consultarItem(
    usuarioId: string,
    livroId: string,
  ): Promise<ItemEstante> {
    const linha = await this.repositorio.buscarItem(usuarioId, livroId);
    if (!linha) {
      throw new NaoEncontrado(LIVRO_FORA_DA_ESTANTE);
    }
    return paraItem(linha);
  }

  async consultarConclusoes(
    usuarioId: string,
    livroId: string,
  ): Promise<ConclusoesLivro> {
    try {
      await this.referencias.buscarLivroAcessivel(livroId, usuarioId);
    } catch (erro) {
      if (erro instanceof LivroPessoalDeTerceiro) {
        throw new LivroNaoEncontrado();
      }
      throw erro;
    }
    return {
      livroId,
      vezesLido: await this.repositorio.buscarVezesLido(usuarioId, livroId),
    };
  }

  private async listar(
    usuarioId: string,
    consulta: ConsultaEstanteDto,
  ): Promise<PaginaEstante> {
    const page = consulta.page ?? PAGINA_PADRAO;
    const limite = Math.min(consulta.limite ?? LIMITE_PADRAO, LIMITE_MAXIMO);

    const [{ linhas, totalItens }, contagens] = await Promise.all([
      this.repositorio.listar(usuarioId, {
        status: consulta.status && statusParaBanco(consulta.status),
        ordenacao: consulta.ordenacao ?? ORDENACAO_PADRAO,
        offset: (page - 1) * limite,
        limite,
      }),
      this.repositorio.contarPorStatus(usuarioId),
    ]);

    return {
      itens: linhas.map(paraItem),
      paginacao: {
        page,
        limite,
        totalItens,
        totalPaginas: Math.ceil(totalItens / limite),
      },
      totaisPorStatus: Object.fromEntries(
        STATUS_ESTANTE.map((status) => [
          statusParaApi(status),
          contagens.get(status) ?? 0,
        ]),
      ) as TotaisEstante,
    };
  }
}

function exigirTransicao(resultado: ResultadoTransicao): Transicao {
  if (!resultado.ok) {
    throw erroDaTransicao(resultado);
  }
  return resultado.transicao;
}

function erroDaTransicao({ erro }: { erro: TransicaoInvalida }): ErroDeNegocio {
  switch (erro.codigo) {
    case 'FORA_DA_ESTANTE':
      return new NaoEncontrado(LIVRO_FORA_DA_ESTANTE);
    case 'POSSUI_HISTORICO':
    case 'REMOCAO_NAO_PERMITIDA':
      return new EstanteComHistorico();
    default:
      return new TransicaoDeLeituraInvalida(erro.motivo);
  }
}

function paraItem(linha: LinhaEstante): ItemEstante {
  const emAndamento = linha.leituraEmAndamentoId !== null;
  const paginaAtual = emAndamento ? linha.paginaAtual : null;
  return {
    livroId: linha.livroId,
    livro: linha.livro,
    status: statusParaApi(linha.status),
    vezesLido: linha.vezesLido,
    leituraEmAndamentoId: linha.leituraEmAndamentoId,
    ultimaLeituraId: linha.ultimaLeitura?.id ?? null,
    retomavel:
      linha.ultimaLeitura?.status === 'abandonado' &&
      !linha.ultimaLeitura.releitura,
    paginaAtual,
    totalPaginas: linha.totalPaginas,
    percentualConcluido:
      paginaAtual !== null && linha.totalPaginas
        ? Math.min(
            PERCENTUAL_MAXIMO,
            (paginaAtual / linha.totalPaginas) * PERCENTUAL_MAXIMO,
          )
        : null,
    adicionadoEm: linha.adicionadoEm.toISOString(),
  };
}
