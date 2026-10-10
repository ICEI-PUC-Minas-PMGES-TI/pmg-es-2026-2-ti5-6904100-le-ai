import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  EntidadeInvalida,
  EstadoInvalido,
  NaoEncontrado,
} from '../../common/erros-de-negocio';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../../common/idempotencia/idempotencia.constantes';
import {
  IdempotenciaService,
  type RespostaIdempotente,
} from '../../common/idempotencia/idempotencia.service';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.module';
import type { Tx } from '../../db/tipos';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  PAGINA_PADRAO,
} from '../../estante/api/dto/estante.dto';
import { dataLocal } from '../../progresso/dominio/progresso';
import type {
  ConsultaDesafiosDto,
  CriarDesafioEntradaDto,
  DesafioDto,
  EditarDesafioEntradaDto,
  PaginaDesafiosDto,
} from '../api/dto/desafios.dto';
import { alvoForaDoLimite, type Unidade } from '../dominio/desafio';
import {
  hoje,
  janelaQueContem,
  janelasAte,
  somarDias,
} from '../dominio/janelas';
import {
  type ConfiguracaoDesafio,
  type DesafioRegistro,
  DesafiosRepository,
} from '../infraestrutura/desafios.repository';

const DESAFIO_NAO_ENCONTRADO = 'Não encontramos este desafio.';

/**
 * Desafios de leitura (F-DSF, RF-DSF-01..04/06, RN-20).
 *
 * As janelas e as contribuições são sempre recompostas dos fatos atuais
 * (`recalcular`), chamado pelo consumidor de métricas, pela exclusão de trecho
 * de progresso, pelas escritas daqui e pela consulta — nunca um contador
 * incrementado por mensagem. Janelas e snapshots são materializados nesses
 * momentos, sem job (RN-20.9).
 */
@Injectable()
export class DesafiosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: DesafiosRepository,
    private readonly idempotencia: IdempotenciaService,
  ) {}

  /** Materializa e recompõe todos os desafios do leitor, no `tx` de quem chama. */
  async recalcular(
    tx: Tx,
    usuarioId: string,
    agora = new Date(),
  ): Promise<void> {
    await this.repositorio.travar(tx, usuarioId);
    await this.materializar(tx, usuarioId, agora);
    await this.repositorio.recomporContribuicoes(tx, usuarioId, agora);
  }

  /**
   * Backfill (catálogo de mensageria): recompõe da fonte quem tem desafio.
   * Idempotente: rodar de novo só recalcula o mesmo estado.
   */
  async recalcularTodos(): Promise<number> {
    const usuarios = await this.repositorio.usuariosComDesafio(this.db);
    for (const usuarioId of usuarios) {
      await this.db.transaction((tx) => this.recalcular(tx, usuarioId));
    }
    return usuarios.length;
  }

  /** `POST /desafios` (RF-DSF-01): o já registrado na janela conta (RN-20.2). */
  criar(
    usuarioId: string,
    entrada: CriarDesafioEntradaDto,
    chave: string,
  ): Promise<RespostaIdempotente<DesafioDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.CRIAR_DESAFIO),
        chave,
        payload: entrada,
      },
      async (tx) => {
        exigirAlvo(entrada.unidade, entrada.valorAlvo);
        const agora = new Date();
        await this.repositorio.travar(tx, usuarioId);
        const criado = await this.repositorio.inserir(
          tx,
          usuarioId,
          {
            unidade: entrada.unidade,
            janela: entrada.janela,
            valorAlvo: entrada.valorAlvo,
            fusoHorario: entrada.fusoHorario,
          },
          agora,
        );
        await this.recalcular(tx, usuarioId, agora);
        return {
          status: HttpStatus.CREATED,
          corpo: await this.detalhar(tx, criado),
        };
      },
    );
  }

  /**
   * `PATCH /desafios/{id}` (RF-DSF-04, RN-20.7). Antes de trocar a
   * configuração, materializa e encerra os períodos decorridos com a antiga;
   * depois descarta só a janela corrente e cria a nova com a configuração
   * nova. As encerradas guardam unidade, periodicidade, alvo e fuso de quando
   * valeram. Sem mudança, a configuração fica como está; só recalcula para
   * responder com a janela corrente em dia.
   */
  editar(
    usuarioId: string,
    desafioId: string,
    entrada: EditarDesafioEntradaDto,
    chave: string,
  ): Promise<RespostaIdempotente<DesafioDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.EDITAR_DESAFIO, desafioId),
        chave,
        payload: entrada,
      },
      async (tx) => {
        const agora = new Date();
        await this.repositorio.travar(tx, usuarioId);
        const atual = await this.bloquear(tx, desafioId, usuarioId);
        const nova: ConfiguracaoDesafio = {
          unidade: entrada.unidade ?? atual.unidade,
          janela: entrada.janela ?? atual.janela,
          valorAlvo: entrada.valorAlvo ?? atual.valorAlvo,
          fusoHorario: entrada.fusoHorario,
        };
        exigirAlvo(nova.unidade, nova.valorAlvo);
        if (mesmaConfiguracao(atual, nova)) {
          await this.recalcular(tx, usuarioId, agora);
          return {
            status: HttpStatus.OK,
            corpo: await this.detalhar(tx, atual),
          };
        }

        await this.materializar(tx, usuarioId, agora);
        // Descartar e criar com o mesmo "hoje", o do fuso novo: com fusos em
        // dias diferentes, a corrente é a que contém o dia do leitor agora.
        const hojeNovo = hoje(nova.fusoHorario, agora);
        await this.repositorio.descartarNaoTerminadas(tx, atual.id, hojeNovo);
        const editado = await this.repositorio.atualizar(
          tx,
          atual.id,
          nova,
          agora,
        );
        await this.repositorio.criarJanelas(tx, atual.id, nova, [
          janelaQueContem(hojeNovo, nova.janela),
        ]);
        await this.recalcular(tx, usuarioId, agora);
        return {
          status: HttpStatus.OK,
          corpo: await this.detalhar(tx, editado),
        };
      },
    );
  }

  /**
   * `POST /desafios/{id}/pausar` (RF-DSF-04, RN-20.6): abre um intervalo de
   * pausa no instante do servidor. Fatos cuja ocorrência cair nele não contam
   * para este desafio, mesmo que cheguem depois da retomada.
   */
  pausar(
    usuarioId: string,
    desafioId: string,
    chave: string,
  ): Promise<RespostaIdempotente<DesafioDto>> {
    return this.alternarPausa(usuarioId, desafioId, chave, true);
  }

  /** `POST /desafios/{id}/retomar`: só conta o que ocorrer a partir de agora. */
  retomar(
    usuarioId: string,
    desafioId: string,
    chave: string,
  ): Promise<RespostaIdempotente<DesafioDto>> {
    return this.alternarPausa(usuarioId, desafioId, chave, false);
  }

  /** `DELETE /desafios/{id}`: o CASCADE leva janelas, contribuições e pausas. */
  excluir(
    usuarioId: string,
    desafioId: string,
    chave: string,
  ): Promise<RespostaIdempotente<undefined>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.EXCLUIR_DESAFIO, desafioId),
        chave,
        payload: {},
      },
      async (tx) => {
        await this.repositorio.travar(tx, usuarioId);
        if (!(await this.repositorio.excluir(tx, desafioId, usuarioId))) {
          throw new NaoEncontrado(DESAFIO_NAO_ENCONTRADO);
        }
        return { status: HttpStatus.NO_CONTENT, corpo: undefined };
      },
    );
  }

  /**
   * `GET /desafios` (RF-DSF-03, RNF-DES-02): cada desafio com a janela
   * corrente. Materializa antes de ler, para que uma janela recém-iniciada
   * apareça mesmo sem novo registro.
   */
  async listar(
    usuarioId: string,
    consulta: ConsultaDesafiosDto,
  ): Promise<PaginaDesafiosDto> {
    await this.db.transaction(async (tx) => {
      const agora = new Date();
      await this.repositorio.travar(tx, usuarioId);
      if ((await this.materializar(tx, usuarioId, agora)) > 0) {
        await this.repositorio.recomporContribuicoes(tx, usuarioId, agora);
      }
    });

    const page = consulta.page ?? PAGINA_PADRAO;
    const limite = Math.min(consulta.limite ?? LIMITE_PADRAO, LIMITE_MAXIMO);
    const { linhas, totalItens } = await this.repositorio.listarPagina(
      this.db,
      usuarioId,
      (page - 1) * limite,
      limite,
    );
    return {
      itens: await this.detalharVarios(this.db, linhas),
      paginacao: {
        page,
        limite,
        totalItens,
        totalPaginas: Math.ceil(totalItens / limite),
      },
    };
  }

  private alternarPausa(
    usuarioId: string,
    desafioId: string,
    chave: string,
    pausar: boolean,
  ): Promise<RespostaIdempotente<DesafioDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(
          pausar ? OPERACOES.PAUSAR_DESAFIO : OPERACOES.RETOMAR_DESAFIO,
          desafioId,
        ),
        chave,
        payload: {},
      },
      async (tx) => {
        const agora = new Date();
        await this.repositorio.travar(tx, usuarioId);
        const atual = await this.bloquear(tx, desafioId, usuarioId);
        if (atual.pausado === pausar) {
          throw new EstadoInvalido(
            pausar
              ? 'Este desafio já está pausado.'
              : 'Este desafio não está pausado.',
          );
        }
        // Fecha os períodos decorridos antes de a pausa começar a valer.
        await this.materializar(tx, usuarioId, agora);
        if (pausar) {
          await this.repositorio.abrirPausa(tx, atual.id, agora);
        } else {
          await this.repositorio.fecharPausa(tx, atual.id, agora);
        }
        const alterado = await this.repositorio.atualizar(
          tx,
          atual.id,
          { pausado: pausar },
          agora,
        );
        await this.repositorio.recomporContribuicoes(tx, usuarioId, agora);
        return {
          status: HttpStatus.OK,
          corpo: await this.detalhar(tx, alterado),
        };
      },
    );
  }

  /**
   * Cria as janelas que faltam até a corrente de cada desafio, com a
   * configuração vigente, e encerra as que já terminaram. A primeira é a que
   * contém o dia de criação (RN-20.2/20.9): nada antes dela é inventado.
   * Devolve quantas janelas foram criadas.
   */
  private async materializar(
    tx: Tx,
    usuarioId: string,
    agora: Date,
  ): Promise<number> {
    let criadas = 0;
    for (const item of await this.repositorio.paraMaterializar(tx, usuarioId)) {
      const hojeLocal = hoje(item.fusoHorario, agora);
      const aPartirDe = item.ultimoFim
        ? somarDias(item.ultimoFim, 1)
        : dataLocal(item.criadoEm, item.fusoHorario);
      criadas += await this.repositorio.criarJanelas(
        tx,
        item.id,
        item,
        janelasAte(aPartirDe, item.janela, hojeLocal),
      );
      await this.repositorio.encerrarDecorridas(tx, item.id, hojeLocal, agora);
    }
    return criadas;
  }

  private async bloquear(
    tx: Tx,
    desafioId: string,
    usuarioId: string,
  ): Promise<DesafioRegistro> {
    const atual = await this.repositorio.bloquearDoUsuario(
      tx,
      desafioId,
      usuarioId,
    );
    if (!atual) {
      throw new NaoEncontrado(DESAFIO_NAO_ENCONTRADO);
    }
    return atual;
  }

  private async detalhar(
    tx: Tx,
    registro: DesafioRegistro,
  ): Promise<DesafioDto> {
    const [dto] = await this.detalharVarios(tx, [registro]);
    return dto;
  }

  private async detalharVarios(
    executor: DrizzleDB | Tx,
    registros: readonly DesafioRegistro[],
  ): Promise<DesafioDto[]> {
    const ids = registros.map((registro) => registro.id);
    const [janelas, pausas] = await Promise.all([
      this.repositorio.janelasCorrentes(executor, ids),
      this.repositorio.pausasAbertas(executor, ids),
    ]);
    return registros.map((registro) => {
      const janela = janelas.get(registro.id);
      if (!janela) {
        // A materialização sempre cria a janela corrente antes da leitura.
        throw new Error(`Desafio ${registro.id} sem janela materializada.`);
      }
      return {
        id: registro.id,
        unidade: registro.unidade,
        janela: registro.janela,
        valorAlvo: registro.valorAlvo,
        fusoHorario: registro.fusoHorario,
        pausado: registro.pausado,
        pausadoDesde: pausas.get(registro.id)?.toISOString() ?? null,
        criadoEm: registro.criadoEm.toISOString(),
        janelaCorrente: {
          inicio: janela.inicio,
          fim: janela.fim,
          acumulado: janela.acumulado,
          cumprida: janela.cumprida,
        },
      };
    });
  }
}

function exigirAlvo(unidade: Unidade, valorAlvo: number): void {
  const motivo = alvoForaDoLimite(unidade, valorAlvo);
  if (motivo) {
    throw new EntidadeInvalida([{ campo: 'valorAlvo', mensagem: motivo }]);
  }
}

function mesmaConfiguracao(
  atual: ConfiguracaoDesafio,
  nova: ConfiguracaoDesafio,
): boolean {
  return (
    atual.unidade === nova.unidade &&
    atual.janela === nova.janela &&
    atual.valorAlvo === nova.valorAlvo &&
    atual.fusoHorario === nova.fusoHorario
  );
}
