import { statusParaApi } from '../../common/status-estante-api';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AcessoNegado,
  EntidadeInvalida,
  LeituraEmAndamento,
  LeituraNaoEncontrada,
  LivroNaoEncontrado,
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
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.module';
import type { Tx } from '../../db/tipos';
import { OutboxRepository } from '../../outbox/outbox.repository';
import {
  type Executor,
  ReferenciasExternas,
} from '../../referencias/referencias-externas.service';
import {
  aplicarEvento,
  type EventoEstante,
  type SnapshotEstante,
  type StatusEstante,
  type StatusLeitura,
  type Transicao,
} from '../dominio/maquina-estados';
import type {
  FinalizarLeituraEntradaDto,
  IniciarLeituraEntradaDto,
  LeituraDto,
} from '../api/dto/leitura.dto';
import {
  leituraAbandonada,
  leituraFinalizada,
  leituraIniciada,
  leituraRetomada,
  type UsuarioSnapshot,
} from '../dominio/eventos';
import {
  dataLocal,
  PERCENTUAL_MAXIMO,
} from '../../progresso/dominio/progresso';
import {
  type EstanteRegistro,
  type LeituraRegistro,
  LeiturasRepository,
} from '../infraestrutura/leituras.repository';

export const FUSO_HORARIO_PADRAO = 'America/Sao_Paulo';

const INDICE_LEITURA_EM_ANDAMENTO = 'leitura_em_andamento_usuario_livro_uk';

export interface OpcoesDeAbandono {
  automatico: boolean;
}

export interface AbandonoAplicado {
  leituraId: string;
  usuarioId: string;
  livroId: string;
  releitura: boolean;
  incompleta: boolean;
  paginaParada: number;
}

interface TransicaoAplicada {
  estante: EstanteRegistro;
  atual: LeituraRegistro;
  transicao: Transicao;
}

@Injectable()
export class LeiturasService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: LeiturasRepository,
    private readonly referencias: ReferenciasExternas,
    private readonly outbox: OutboxRepository,
    private readonly idempotencia: IdempotenciaService,
  ) {}

  iniciar(
    usuarioId: string,
    entrada: IniciarLeituraEntradaDto,
    chave: string,
  ): Promise<RespostaIdempotente<LeituraDto>> {
    return this.iniciarOcorrencia(usuarioId, entrada, chave, 'iniciar');
  }

  iniciarReleitura(
    usuarioId: string,
    entrada: IniciarLeituraEntradaDto,
    chave: string,
  ): Promise<RespostaIdempotente<LeituraDto>> {
    return this.iniciarOcorrencia(
      usuarioId,
      entrada,
      chave,
      'iniciarReleitura',
    );
  }

  async detalhar(usuarioId: string, leituraId: string): Promise<LeituraDto> {
    const encontrada = await this.repositorio.buscarLeituraDoUsuario(
      this.db,
      leituraId,
      usuarioId,
    );
    if (!encontrada) {
      throw new LeituraNaoEncontrada();
    }
    return this.montarResposta(
      this.db,
      encontrada.leitura,
      encontrada.vezesLido,
    );
  }

  finalizar(
    usuarioId: string,
    leituraId: string,
    entrada: FinalizarLeituraEntradaDto,
    chave: string,
  ): Promise<RespostaIdempotente<LeituraDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.FINALIZAR_LEITURA, leituraId),
        chave,
        payload: entrada,
      },
      async (tx) => {
        const alvo = await this.leituraPropria(tx, leituraId, usuarioId);
        const agora = new Date();
        const fuso = entrada.fusoHorarioDispositivo;
        const hojeNoFuso = dataLocal(agora, fuso);
        const dataFim = entrada.dataFim ?? hojeNoFuso;
        if (dataFim < alvo.dataInicio) {
          throw new EntidadeInvalida([
            {
              campo: 'dataFim',
              mensagem: 'A data de fim não pode ser anterior à data de início.',
            },
          ]);
        }
        if (dataFim > hojeNoFuso) {
          throw new EntidadeInvalida([
            {
              campo: 'dataFim',
              mensagem: 'A data de fim não pode estar no futuro.',
            },
          ]);
        }

        const { estante, transicao } = await this.transicionar(
          tx,
          alvo,
          'finalizar',
        );
        const leitura = await this.repositorio.atualizarLeitura(tx, alvo.id, {
          status: 'lido',
          dataFim,
          finalizadaEm: agora,
          finalizacaoFusoHorario: fuso,
          finalizacaoDataLocal: hojeNoFuso,
          ultimaAtividadeEm: agora,
        });
        const atualizada = await this.aplicarNaEstante(tx, estante, transicao);

        const livro = await this.snapshotDoLivro(tx, leitura.livroId);
        await this.outbox.inserir(
          tx,
          leituraFinalizada({
            usuarioId,
            leituraId: leitura.id,
            livroId: leitura.livroId,
            releitura: leitura.releitura,
            dataFim,
            finalizadaEm: agora.toISOString(),
            finalizacaoFusoHorario: fuso,
            finalizacaoDataLocal: hojeNoFuso,
            usuario: await this.snapshotDoUsuario(tx, usuarioId),
            livro: livro.snapshot,
          }),
        );

        return {
          status: HttpStatus.OK,
          corpo: this.paraDto(leitura, atualizada.vezesLido, livro.paginas),
        };
      },
    );
  }

  abandonar(
    usuarioId: string,
    leituraId: string,
    chave: string,
  ): Promise<RespostaIdempotente<LeituraDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.ABANDONAR_LEITURA, leituraId),
        chave,
        payload: {},
      },
      async (tx) => {
        await this.leituraPropria(tx, leituraId, usuarioId);
        await this.abandonarEmTransacao(tx, leituraId, { automatico: false });
        return {
          status: HttpStatus.OK,
          corpo: await this.detalharEmTransacao(tx, leituraId, usuarioId),
        };
      },
    );
  }

  async abandonarEmTransacao(
    tx: Tx,
    leituraId: string,
    opcoes: OpcoesDeAbandono,
  ): Promise<AbandonoAplicado> {
    const alvo = await this.repositorio.buscarLeitura(tx, leituraId);
    if (!alvo) {
      throw new LeituraNaoEncontrada();
    }

    const { estante, atual, transicao } = await this.transicionar(
      tx,
      alvo,
      'abandonar',
    );
    const mudanca = transicao.leitura;
    const incompleta = mudanca?.acao === 'abandonar' && mudanca.incompleta;
    const paginaParada = atual.paginaAtual;

    await this.repositorio.atualizarLeitura(tx, alvo.id, {
      status: incompleta ? 'lido' : 'abandonado',
      incompleta,
      ...(opcoes.automatico ? {} : { ultimaAtividadeEm: new Date() }),
    });
    await this.aplicarNaEstante(tx, estante, transicao);

    const abandono: AbandonoAplicado = {
      leituraId: alvo.id,
      usuarioId: alvo.usuarioId,
      livroId: alvo.livroId,
      releitura: alvo.releitura,
      incompleta,
      paginaParada,
    };
    await this.outbox.inserir(
      tx,
      leituraAbandonada({
        ...abandono,
        usuario: await this.snapshotDoUsuario(tx, alvo.usuarioId),
        livro: (await this.snapshotDoLivro(tx, alvo.livroId)).snapshot,
      }),
    );
    return abandono;
  }

  retomar(
    usuarioId: string,
    leituraId: string,
    chave: string,
  ): Promise<RespostaIdempotente<LeituraDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(OPERACOES.RETOMAR_LEITURA, leituraId),
        chave,
        payload: {},
      },
      async (tx) => {
        const alvo = await this.leituraPropria(tx, leituraId, usuarioId);
        const { estante, transicao } = await this.transicionar(
          tx,
          alvo,
          'retomar',
        );
        const mudanca = transicao.leitura;
        const paginaRetomada =
          mudanca?.acao === 'retomar' ? mudanca.paginaAtual : alvo.paginaAtual;

        const leitura = await this.emAndamentoUnica(() =>
          this.repositorio.atualizarLeitura(tx, alvo.id, {
            status: 'lendo',
            ultimaAtividadeEm: new Date(),
            novoCicloDeInatividade: true,
          }),
        );
        const atualizada = await this.aplicarNaEstante(tx, estante, transicao);

        const livro = await this.snapshotDoLivro(tx, leitura.livroId);
        await this.outbox.inserir(
          tx,
          leituraRetomada({
            usuarioId,
            leituraId: leitura.id,
            livroId: leitura.livroId,
            paginaRetomada,
            usuario: await this.snapshotDoUsuario(tx, usuarioId),
            livro: livro.snapshot,
          }),
        );

        return {
          status: HttpStatus.OK,
          corpo: this.paraDto(leitura, atualizada.vezesLido, livro.paginas),
        };
      },
    );
  }

  private iniciarOcorrencia(
    usuarioId: string,
    entrada: IniciarLeituraEntradaDto,
    chave: string,
    evento: Extract<EventoEstante, 'iniciar' | 'iniciarReleitura'>,
  ): Promise<RespostaIdempotente<LeituraDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(
          evento === 'iniciar'
            ? OPERACOES.INICIAR_LEITURA
            : OPERACOES.INICIAR_RELEITURA,
        ),
        chave,
        payload: entrada,
      },
      async (tx) => {
        const livro = await this.referencias.buscarLivroAcessivel(
          entrada.livroId,
          usuarioId,
          tx,
        );
        const agora = new Date();
        const dataInicio =
          entrada.dataInicio ?? dataLocal(agora, FUSO_HORARIO_PADRAO);
        if (dataInicio > dataLocal(agora, FUSO_HORARIO_PADRAO)) {
          throw new EntidadeInvalida([
            {
              campo: 'dataInicio',
              mensagem: 'A data de início não pode estar no futuro.',
            },
          ]);
        }

        await this.repositorio.garantirEstante(tx, usuarioId, livro.id);
        const estante = await this.repositorio.bloquearEstante(
          tx,
          usuarioId,
          livro.id,
        );
        if (!estante) {
          throw new LivroNaoEncontrado();
        }
        const atual = await this.repositorio.bloquearLeituraMaisRecente(
          tx,
          estante.id,
        );
        const transicao = this.exigirTransicao(
          this.snapshot(estante, atual),
          evento,
        );
        const releitura =
          transicao.leitura?.acao === 'criar' && transicao.leitura.releitura;

        const leitura = await this.emAndamentoUnica(() =>
          this.repositorio.inserirLeitura(tx, {
            estanteId: estante.id,
            usuarioId,
            livroId: livro.id,
            releitura,
            dataInicio,
            ultimaAtividadeEm: agora,
          }),
        );
        const atualizada = await this.aplicarNaEstante(tx, estante, transicao);

        await this.outbox.inserir(
          tx,
          leituraIniciada({
            usuarioId,
            leituraId: leitura.id,
            livroId: livro.id,
            releitura,
            usuario: await this.snapshotDoUsuario(tx, usuarioId),
            livro: livro.snapshot,
          }),
        );

        return {
          status: HttpStatus.CREATED,
          corpo: this.paraDto(leitura, atualizada.vezesLido, livro.paginas),
        };
      },
    );
  }

  private async transicionar(
    tx: Tx,
    alvo: LeituraRegistro,
    evento: EventoEstante,
  ): Promise<TransicaoAplicada> {
    const estante = await this.repositorio.bloquearEstantePorId(
      tx,
      alvo.estanteId,
    );
    const atual = estante
      ? await this.repositorio.bloquearLeituraMaisRecente(tx, estante.id)
      : null;
    if (!estante || atual?.id !== alvo.id) {
      throw new TransicaoDeLeituraInvalida();
    }
    const transicao = this.exigirTransicao(
      this.snapshot(estante, atual),
      evento,
    );
    return { estante, atual, transicao };
  }

  private snapshot(
    estante: EstanteRegistro,
    atual: LeituraRegistro | null,
  ): SnapshotEstante {
    return {
      status: estante.status,
      vezesLido: estante.vezesLido,
      leituraAtual: atual && {
        status: atual.status as StatusLeitura,
        releitura: atual.releitura,
        incompleta: atual.incompleta,
        paginaAtual: atual.paginaAtual,
      },
      possuiHistorico: atual !== null,
    };
  }

  private exigirTransicao(
    snapshot: SnapshotEstante,
    evento: EventoEstante,
  ): Transicao {
    const resultado = aplicarEvento(snapshot, evento);
    if (resultado.ok) {
      return resultado.transicao;
    }
    if (resultado.erro.codigo === 'LEITURA_EM_ANDAMENTO') {
      throw new LeituraEmAndamento();
    }
    throw new TransicaoDeLeituraInvalida(resultado.erro.motivo);
  }

  private aplicarNaEstante(
    tx: Tx,
    estante: EstanteRegistro,
    transicao: Transicao,
  ): Promise<EstanteRegistro> {
    const status = transicao.statusEstante ?? estante.status;
    return this.repositorio.atualizarEstante(
      tx,
      estante.id,
      status,
      transicao.deltaVezesLido,
    );
  }

  private async emAndamentoUnica<T>(escrita: () => Promise<T>): Promise<T> {
    try {
      return await escrita();
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro, INDICE_LEITURA_EM_ANDAMENTO)) {
        throw new LeituraEmAndamento();
      }
      throw erro;
    }
  }

  private async leituraPropria(
    tx: Tx,
    leituraId: string,
    usuarioId: string,
  ): Promise<LeituraRegistro> {
    const encontrada = await this.repositorio.buscarLeituraDoUsuario(
      tx,
      leituraId,
      usuarioId,
    );
    if (!encontrada) {
      throw new LeituraNaoEncontrada();
    }
    return encontrada.leitura;
  }

  private async detalharEmTransacao(
    tx: Tx,
    leituraId: string,
    usuarioId: string,
  ): Promise<LeituraDto> {
    const encontrada = await this.repositorio.buscarLeituraDoUsuario(
      tx,
      leituraId,
      usuarioId,
    );
    if (!encontrada) {
      throw new LeituraNaoEncontrada();
    }
    return this.montarResposta(tx, encontrada.leitura, encontrada.vezesLido);
  }

  private async montarResposta(
    executor: Executor,
    leitura: LeituraRegistro,
    vezesLido: number,
  ): Promise<LeituraDto> {
    const livro = await this.referencias.buscarLivro(leitura.livroId, executor);
    return this.paraDto(leitura, vezesLido, livro?.paginas ?? null);
  }

  private async snapshotDoLivro(tx: Tx, livroId: string) {
    const livro = await this.referencias.buscarLivro(livroId, tx);
    if (!livro) {
      throw new LivroNaoEncontrado();
    }
    return livro;
  }

  private async snapshotDoUsuario(
    tx: Tx,
    usuarioId: string,
  ): Promise<UsuarioSnapshot> {
    const perfil = await this.referencias.buscarPerfil(usuarioId, tx);
    if (!perfil) {
      throw new AcessoNegado('Sua conta não está disponível para esta ação.');
    }
    return perfil.snapshot;
  }

  private paraDto(
    leitura: LeituraRegistro,
    vezesLido: number,
    totalPaginas: number | null,
  ): LeituraDto {
    return {
      id: leitura.id,
      livroId: leitura.livroId,
      status: statusParaApi(statusVisivel(leitura)),
      dataInicio: leitura.dataInicio,
      dataFim: leitura.dataFim,
      releitura: leitura.releitura,
      incompleta: leitura.incompleta,
      retomavel: leitura.status === 'abandonado' && !leitura.releitura,
      paginaAtual: leitura.paginaAtual,
      totalPaginas,
      percentualConcluido: totalPaginas
        ? Math.min(
            PERCENTUAL_MAXIMO,
            (leitura.paginaAtual / totalPaginas) * PERCENTUAL_MAXIMO,
          )
        : null,
      vezesLido,
      ultimaAtividadeEm: leitura.ultimaAtividadeEm.toISOString(),
      finalizadaEm: leitura.finalizadaEm?.toISOString() ?? null,
      finalizacaoFusoHorario: leitura.finalizacaoFusoHorario,
      finalizacaoDataLocal: leitura.finalizacaoDataLocal,
    };
  }
}

function statusVisivel(leitura: LeituraRegistro): StatusEstante {
  if (leitura.status === 'lendo' && leitura.releitura) {
    return 'relendo';
  }
  return leitura.status as StatusEstante;
}
