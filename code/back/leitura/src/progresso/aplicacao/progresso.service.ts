import { createHash } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  ChaveIdempotenciaConflitante,
  EntidadeInvalida,
  EstadoInvalido,
  LeituraNaoEncontrada,
  LivroNaoEncontrado,
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
import { ehViolacaoDeUnicidade } from '../../common/pg-erros';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.module';
import { DesafiosService } from '../../desafios/aplicacao/desafios.service';
import type { Tx } from '../../db/tipos';
import {
  LIMITE_MAXIMO,
  LIMITE_PADRAO,
  PAGINA_PADRAO,
} from '../../estante/api/dto/estante.dto';
import { progressoRegistrado } from '../../leituras/dominio/eventos';
import { OutboxRepository } from '../../outbox/outbox.repository';
import {
  type Executor,
  ReferenciasExternas,
} from '../../referencias/referencias-externas.service';
import { SequenciaService } from '../../sequencia/sequencia.service';
import type {
  ConsultaProgressoDto,
  CriarProgressoEntradaDto,
  ExcluirProgressoEntradaDto,
  ExclusaoProgressoResultadoDto,
  PaginaProgressoDto,
  ProgressoComResumoDto,
  ProgressoDto,
} from '../api/dto/progresso.dto';
import {
  alcanceDaExclusao,
  dataLocal,
  type ProgressoInvalido,
  resumo,
  SEM_TEMPO,
  validarMinutos,
  validarNovaPagina,
} from '../dominio/progresso';
import {
  type LeituraDoProgresso,
  type ProgressoRegistro,
  ProgressoRepository,
} from '../infraestrutura/progresso.repository';

const STATUS_EM_ANDAMENTO = 'lendo';
const INDICE_CHAVE_DO_PROGRESSO = 'atualizacao_progresso_chave_idempotencia_uk';

class RegistroConcorrente extends Error {}

function ehDuplicataConcorrente(erro: unknown): boolean {
  return (
    erro instanceof RegistroConcorrente ||
    ehViolacaoDeUnicidade(erro, INDICE_CHAVE_DO_PROGRESSO)
  );
}

export function chaveDoProgresso(
  usuarioId: string,
  operacao: string,
  chave: string,
): string {
  return createHash('sha256')
    .update(`${usuarioId}:${operacao}:${chave}`)
    .digest('hex');
}

@Injectable()
export class ProgressoService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: ProgressoRepository,
    private readonly referencias: ReferenciasExternas,
    private readonly outbox: OutboxRepository,
    private readonly idempotencia: IdempotenciaService,
    private readonly sequencia: SequenciaService,
    private readonly desafios: DesafiosService,
  ) {}

  async registrar(
    usuarioId: string,
    leituraId: string,
    entrada: CriarProgressoEntradaDto,
    chave: string,
  ): Promise<RespostaIdempotente<ProgressoComResumoDto>> {
    const operacao = operacaoNoCaminho(
      OPERACOES.REGISTRAR_PROGRESSO,
      leituraId,
    );
    const executar = () =>
      this.idempotencia.executar<ProgressoComResumoDto>(
        { subjectRef: usuarioId, operacao, chave, payload: entrada },
        (tx) =>
          this.registrarEmTransacao(
            tx,
            usuarioId,
            leituraId,
            entrada,
            chaveDoProgresso(usuarioId, operacao, chave),
          ),
      );

    try {
      return await executar();
    } catch (erro) {
      if (!ehDuplicataConcorrente(erro)) {
        throw erro;
      }
    }
    try {
      return await executar();
    } catch (erro) {
      if (ehDuplicataConcorrente(erro)) {
        throw new ChaveIdempotenciaConflitante();
      }
      throw erro;
    }
  }

  async listar(
    usuarioId: string,
    leituraId: string,
    consulta: ConsultaProgressoDto,
  ): Promise<PaginaProgressoDto> {
    const alvo = await this.repositorio.buscarLeituraDoUsuario(
      this.db,
      leituraId,
      usuarioId,
    );
    if (!alvo) {
      throw new LeituraNaoEncontrada();
    }
    const page = consulta.page ?? PAGINA_PADRAO;
    const limite = Math.min(consulta.limite ?? LIMITE_PADRAO, LIMITE_MAXIMO);

    const [{ linhas, totalItens }, totalPaginas, minutosTotais] =
      await Promise.all([
        this.repositorio.listarPagina(
          this.db,
          leituraId,
          (page - 1) * limite,
          limite,
        ),
        this.totalDePaginas(this.db, alvo.livroId),
        this.repositorio.somarMinutos(this.db, leituraId),
      ]);

    return {
      itens: linhas.map(paraDto),
      paginacao: {
        page,
        limite,
        totalItens,
        totalPaginas: Math.ceil(totalItens / limite),
      },
      resumo: resumo(alvo.paginaAtual, totalPaginas, minutosTotais),
      somenteLeitura: !emAndamento(alvo),
    };
  }

  excluirTrecho(
    usuarioId: string,
    progressoId: string,
    entrada: ExcluirProgressoEntradaDto,
    chave: string,
  ): Promise<RespostaIdempotente<ExclusaoProgressoResultadoDto>> {
    return this.idempotencia.executar(
      {
        subjectRef: usuarioId,
        operacao: operacaoNoCaminho(
          OPERACOES.EXCLUIR_TRECHO_PROGRESSO,
          progressoId,
        ),
        chave,
        payload: entrada,
      },
      async (tx) => {
        const { alvo, registros } = await this.bloquearSequencia(
          tx,
          usuarioId,
          progressoId,
        );
        const alcance = alcanceDaExclusao(
          registros,
          progressoId,
          entrada.ultimoProgressoIdConfirmado.toLowerCase(),
        );
        if (!alcance.ok) {
          throw alcance.erro.codigo === 'PROGRESSO_NAO_ENCONTRADO'
            ? new NaoEncontrado(alcance.erro.motivo)
            : new EstadoInvalido(alcance.erro.motivo);
        }
        const totalPaginas = await this.totalDePaginas(tx, alvo.livroId);

        const datasRemovidas = await this.repositorio.excluir(
          tx,
          alcance.idsRemovidos,
        );
        await this.repositorio.registrarAtividade(
          tx,
          alvo.id,
          alcance.paginaAtual,
        );
        // A exclusão não publica evento (F-PRG): os dias e a sequência do
        // leitor (F-GAM) e as contribuições aos desafios (F-DSF, RN-20.10) se
        // recompõem aqui, na mesma transação.
        await this.sequencia.recalcular(tx, usuarioId);
        await this.desafios.recalcular(tx, usuarioId, datasRemovidas);

        return {
          status: HttpStatus.OK,
          corpo: {
            idsRemovidos: alcance.idsRemovidos,
            resumo: resumo(
              alcance.paginaAtual,
              totalPaginas,
              await this.repositorio.somarMinutos(tx, alvo.id),
            ),
          },
        };
      },
    );
  }

  private async registrarEmTransacao(
    tx: Tx,
    usuarioId: string,
    leituraId: string,
    entrada: CriarProgressoEntradaDto,
    chaveIdempotencia: string,
  ): Promise<RespostaIdempotente<ProgressoComResumoDto>> {
    const alvo = await this.repositorio.bloquearLeituraDoUsuario(
      tx,
      leituraId,
      usuarioId,
    );
    if (!alvo) {
      throw new LeituraNaoEncontrada();
    }
    if (await this.repositorio.existeChave(tx, chaveIdempotencia)) {
      throw new RegistroConcorrente();
    }
    exigirEmAndamento(alvo);
    const totalPaginas = await this.totalDePaginas(tx, alvo.livroId);

    const validacao = validarNovaPagina(
      alvo.paginaAtual,
      totalPaginas,
      entrada.pagina,
    );
    if (!validacao.ok) {
      throw paginaRecusada(validacao.erro);
    }
    const minutos = entrada.minutos ?? SEM_TEMPO;
    exigirMinutos(minutos);

    const registradoEm = new Date(entrada.registradoEmDispositivo);
    const fuso = entrada.fusoHorarioDispositivo;
    const progresso = await this.repositorio.inserir(tx, {
      leituraId: alvo.id,
      ordem: (await this.repositorio.maiorOrdem(tx, alvo.id)) + 1,
      pagina: entrada.pagina,
      paginasLidas: validacao.paginasLidas,
      minutos,
      registradoEmDispositivo: registradoEm,
      fusoHorarioDispositivo: fuso,
      dataLocal: dataLocal(registradoEm, fuso),
      chaveIdempotencia,
    });
    await this.repositorio.registrarAtividade(tx, alvo.id, progresso.pagina);

    const resumoAtual = resumo(
      progresso.pagina,
      totalPaginas,
      await this.repositorio.somarMinutos(tx, alvo.id),
    );
    await this.outbox.inserir(
      tx,
      progressoRegistrado({
        atualizacaoProgressoId: progresso.id,
        usuarioId,
        leituraId: alvo.id,
        livroId: alvo.livroId,
        pagina: progresso.pagina,
        paginasLidas: progresso.paginasLidas,
        minutos: progresso.minutos,
        percentual: resumoAtual.percentualConcluido,
        registradoEm: progresso.registradoEmDispositivo.toISOString(),
        fusoHorario: progresso.fusoHorarioDispositivo,
        dataLocal: progresso.dataLocal,
      }),
    );

    return {
      status: HttpStatus.CREATED,
      corpo: { progresso: paraDto(progresso), resumo: resumoAtual },
    };
  }

  private async bloquearSequencia(
    tx: Tx,
    usuarioId: string,
    progressoId: string,
  ): Promise<{ alvo: LeituraDoProgresso; registros: ProgressoRegistro[] }> {
    const leituraId = await this.repositorio.buscarLeituraIdDoProgresso(
      tx,
      progressoId,
      usuarioId,
    );
    const alvo =
      leituraId &&
      (await this.repositorio.bloquearLeituraDoUsuario(
        tx,
        leituraId,
        usuarioId,
      ));
    if (!alvo) {
      throw new NaoEncontrado('Não encontramos este progresso.');
    }
    exigirEmAndamento(alvo);
    const registros = await this.repositorio.listarDaLeitura(tx, alvo.id);
    if (!registros.some((registro) => registro.id === progressoId)) {
      throw new NaoEncontrado('Não encontramos este progresso.');
    }
    return { alvo, registros };
  }

  private async totalDePaginas(
    executor: Executor,
    livroId: string,
  ): Promise<number> {
    const livro = await this.referencias.buscarLivro(livroId, executor);
    if (!livro) {
      throw new LivroNaoEncontrado();
    }
    return livro.paginas;
  }
}

function emAndamento(alvo: LeituraDoProgresso): boolean {
  return alvo.status === STATUS_EM_ANDAMENTO;
}

function exigirEmAndamento(alvo: LeituraDoProgresso): void {
  if (!emAndamento(alvo)) {
    throw new EstadoInvalido(
      'Só é possível alterar o progresso de uma leitura em andamento.',
    );
  }
}

function exigirMinutos(minutos: number): void {
  const resultado = validarMinutos(minutos);
  if (!resultado.ok) {
    throw new EntidadeInvalida([
      { campo: 'minutos', mensagem: resultado.erro.motivo },
    ]);
  }
}

function paginaRecusada(erro: ProgressoInvalido): EntidadeInvalida {
  return new EntidadeInvalida([{ campo: 'pagina', mensagem: erro.motivo }]);
}

function paraDto(registro: ProgressoRegistro): ProgressoDto {
  return {
    id: registro.id,
    leituraId: registro.leituraId,
    posicao: registro.ordem,
    pagina: registro.pagina,
    paginaAnterior: registro.pagina - registro.paginasLidas,
    paginasLidas: registro.paginasLidas,
    minutos: registro.minutos,
    registradoEmDispositivo: registro.registradoEmDispositivo.toISOString(),
    fusoHorarioDispositivo: registro.fusoHorarioDispositivo,
    dataLocal: registro.dataLocal,
    criadoEm: registro.criadoEm.toISOString(),
  };
}
