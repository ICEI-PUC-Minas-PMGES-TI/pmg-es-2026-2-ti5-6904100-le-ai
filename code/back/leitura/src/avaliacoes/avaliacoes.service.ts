import { Inject, Injectable } from '@nestjs/common';
import { NaoEncontrado, ServicoIndisponivel } from '../common/erros-de-negocio';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../common/idempotencia/idempotencia.constantes';
import {
  IdempotenciaService,
  RespostaIdempotente,
} from '../common/idempotencia/idempotencia.service';
import { ehFalhaDeContratoExterno } from '../common/pg-erros';
import { DRIZZLE, DrizzleDB } from '../db/drizzle.module';
import type { Tx } from '../db/tipos';
import { OutboxRepository } from '../outbox/outbox.repository';
import {
  AvaliacoesRepository,
  LivroDeReferencia,
  NotaGravada,
  ResenhaGravada,
} from './avaliacoes.repository';
import { MinhaAvaliacaoDto, NotaDto, ResenhaDto } from './dto/avaliacao.dto';
import {
  chaveDeNegocioDaNota,
  DadosNotaAlterada,
  NOTA_ALTERADA,
} from './eventos';
import { validarValorDaNota } from './regras';

/**
 * Nota e resenha do leitor para um livro (F-AVA). Pertencem ao **livro**, não à
 * leitura (RN-04.5): uma por usuário e livro, sem depender do status na
 * estante.
 *
 * Toda escrita roda dentro de `IdempotenciaService.executar`, com domínio,
 * evento na outbox e recibo na mesma transação (RNF-ERR-04, RNF-ERR-10).
 */
@Injectable()
export class AvaliacoesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly repositorio: AvaliacoesRepository,
    private readonly idempotencia: IdempotenciaService,
    private readonly outbox: OutboxRepository,
  ) {}

  async salvarNota(
    usuarioId: string,
    livroId: string,
    chave: string,
    valor: number,
  ): Promise<RespostaIdempotente<NotaDto>> {
    validarValorDaNota(valor);

    return this.comContratoExterno(() =>
      this.idempotencia.executar<NotaDto>(
        {
          subjectRef: usuarioId,
          operacao: operacaoNoCaminho(OPERACOES.SALVAR_NOTA, livroId),
          chave,
          payload: { valor },
        },
        async (tx) => {
          await this.exigirLivroAcessivel(tx, livroId, usuarioId);

          const gravada = await this.repositorio.salvarNota(
            tx,
            usuarioId,
            livroId,
            valor,
          );
          if (!gravada) {
            // Mesmo valor já salvo: nada gravado, nenhum evento.
            const atual = await this.repositorio.notaAtual(
              tx,
              usuarioId,
              livroId,
            );
            return { status: 200, corpo: paraNota(livroId, atual!) };
          }

          await this.gravarNotaAlterada(tx, {
            usuarioId,
            livroId,
            operacao: gravada.criada ? 'criada' : 'atualizada',
            nota: gravada.valor,
          });
          return { status: 200, corpo: paraNota(livroId, gravada) };
        },
      ),
    );
  }

  async excluirNota(
    usuarioId: string,
    livroId: string,
    chave: string,
  ): Promise<RespostaIdempotente<null>> {
    return this.comContratoExterno(() =>
      this.idempotencia.executar<null>(
        {
          subjectRef: usuarioId,
          operacao: operacaoNoCaminho(OPERACOES.EXCLUIR_NOTA, livroId),
          chave,
          payload: {},
        },
        async (tx) => {
          await this.exigirLivroAcessivel(tx, livroId, usuarioId);

          const removida = await this.repositorio.excluirNota(
            tx,
            usuarioId,
            livroId,
          );
          // Sem nota para remover: 204 sem evento. O efeito pedido — ficar sem
          // nota — já vale.
          if (removida) {
            await this.gravarNotaAlterada(tx, {
              usuarioId,
              livroId,
              operacao: 'excluida',
              nota: null,
            });
          }
          return { status: 204, corpo: null };
        },
      ),
    );
  }

  async minhaAvaliacao(
    usuarioId: string,
    livroId: string,
  ): Promise<MinhaAvaliacaoDto> {
    return this.comContratoExterno(async () => {
      await this.exigirLivroAcessivel(this.db, livroId, usuarioId);

      const [atual, resenha] = await Promise.all([
        this.repositorio.notaAtual(this.db, usuarioId, livroId),
        this.repositorio.resenhaAtual(this.db, usuarioId, livroId),
      ]);
      return {
        livroId,
        nota: atual ? paraNota(livroId, atual) : null,
        resenha: resenha ? paraResenha(resenha) : null,
      };
    });
  }

  /**
   * Livro inexistente, inativo ou pessoal de outra pessoa é 404, nunca 403:
   * conhecer o id não revela que o livro existe (RNF-SEC-06). Em livro pessoal
   * só o dono avalia (RN-03).
   */
  private async exigirLivroAcessivel(
    leitor: DrizzleDB | Tx,
    livroId: string,
    usuarioId: string,
  ): Promise<LivroDeReferencia> {
    const livro = await this.repositorio.livroDeReferencia(leitor, livroId);
    const acessivel =
      livro !== null &&
      livro.ativo &&
      (livro.tipo === 'oficial' ||
        (livro.tipo === 'pessoal' && livro.donoId === usuarioId));
    if (!acessivel) {
      throw new NaoEncontrado();
    }
    return livro;
  }

  private async gravarNotaAlterada(
    tx: Tx,
    dados: DadosNotaAlterada,
  ): Promise<void> {
    await this.outbox.inserir(tx, {
      ...NOTA_ALTERADA,
      chaveNegocio: chaveDeNegocioDaNota(dados.usuarioId, dados.livroId),
      payload: dados,
    });
  }

  /**
   * VIEW de outro serviço inacessível (GRANT faltando, VIEW ainda não criada) é
   * indisponibilidade de dependência: 503, nunca um 500 cru.
   */
  private async comContratoExterno<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      if (ehFalhaDeContratoExterno(erro)) {
        throw new ServicoIndisponivel();
      }
      throw erro;
    }
  }
}

function paraNota(livroId: string, nota: NotaGravada): NotaDto {
  return {
    livroId,
    valor: Number(nota.valor),
    criadoEm: nota.criadoEm.toISOString(),
    atualizadoEm: nota.atualizadoEm.toISOString(),
  };
}

function paraResenha(resenha: ResenhaGravada): ResenhaDto {
  return {
    id: resenha.id,
    usuarioId: resenha.usuarioId,
    livroId: resenha.livroId,
    texto: resenha.texto,
    spoiler: resenha.spoiler,
    criadoEm: resenha.criadoEm.toISOString(),
    atualizadoEm: resenha.atualizadoEm.toISOString(),
  };
}
