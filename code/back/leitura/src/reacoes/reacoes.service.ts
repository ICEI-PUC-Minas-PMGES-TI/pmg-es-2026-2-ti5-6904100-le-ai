import { Injectable } from '@nestjs/common';
import { urlOuNulo } from '../avaliacoes/regras';
import { comContratoExterno } from '../common/contrato-externo';
import {
  AcessoNegado,
  NaoEncontrado,
  ReacaoPropria,
} from '../common/erros-de-negocio';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../common/idempotencia/idempotencia.constantes';
import {
  IdempotenciaService,
  RespostaIdempotente,
} from '../common/idempotencia/idempotencia.service';
import type { Tx } from '../db/tipos';
import { OutboxRepository } from '../outbox/outbox.repository';
import {
  type LivroReferencia,
  type PerfilReferencia,
  ReferenciasExternas,
} from '../referencias/referencias-externas.service';
import type { ReacoesDto } from './dto/reacao.dto';
import {
  chaveDeNegocioDaResenhaCurtida,
  DadosResenhaCurtida,
  RESENHA_CURTIDA,
} from './eventos';
import { ReacoesRepository, ResenhaAlvo } from './reacoes.repository';
import { mudancaAoReagir, type TipoDeReacao, type Via } from './regras';

export interface ViaInformada {
  via?: Via;
  referenciaId?: string;
}

interface Alvo {
  resenha: ResenhaAlvo;
  livro: LivroReferencia;
  reator: PerfilReferencia;
}

/**
 * Curtir e descurtir resenha de outro leitor (F-AVA-2, RF-AVA-05/08). Uma reação por leitor e
 * resenha, alternável; retirar não apaga a linha.
 *
 * O acesso é revalidado no servidor a cada escrita, no PUT e no DELETE: livro oficial sob
 * RN-08, livro pessoal só pela via do feed ou da lista (RN-15). Qualquer falha de acesso é
 * 404, como o resto do `leitura`: conhecer o id não revela a resenha.
 */
@Injectable()
export class ReacoesService {
  constructor(
    private readonly repositorio: ReacoesRepository,
    private readonly referencias: ReferenciasExternas,
    private readonly idempotencia: IdempotenciaService,
    private readonly outbox: OutboxRepository,
  ) {}

  async reagir(
    usuarioId: string,
    resenhaId: string,
    chave: string,
    entrada: ViaInformada & { tipo: TipoDeReacao },
  ): Promise<RespostaIdempotente<ReacoesDto>> {
    const via = normalizarVia(entrada);
    return comContratoExterno(() =>
      this.idempotencia.executar<ReacoesDto>(
        {
          subjectRef: usuarioId,
          operacao: operacaoNoCaminho(OPERACOES.REAGIR_RESENHA, resenhaId),
          chave,
          payload: { tipo: entrada.tipo, ...via },
        },
        async (tx) => {
          const alvo = await this.exigirAcesso(tx, usuarioId, resenhaId, via);
          const primeiraCurtida = await this.gravar(
            tx,
            resenhaId,
            usuarioId,
            entrada.tipo,
          );
          if (primeiraCurtida) {
            await this.publicarCurtida(tx, alvo);
          }
          return {
            status: 200,
            corpo: await this.repositorio.estado(tx, resenhaId, usuarioId),
          };
        },
      ),
    );
  }

  async retirar(
    usuarioId: string,
    resenhaId: string,
    chave: string,
    entrada: ViaInformada,
  ): Promise<RespostaIdempotente<ReacoesDto>> {
    const via = normalizarVia(entrada);
    return comContratoExterno(() =>
      this.idempotencia.executar<ReacoesDto>(
        {
          subjectRef: usuarioId,
          operacao: operacaoNoCaminho(
            OPERACOES.REMOVER_REACAO_RESENHA,
            resenhaId,
          ),
          chave,
          payload: via,
        },
        async (tx) => {
          await this.exigirAcesso(tx, usuarioId, resenhaId, via);
          // Sem reação ativa para retirar: 200 com o estado atual, sem nada gravado.
          await this.repositorio.retirar(tx, resenhaId, usuarioId);
          return {
            status: 200,
            corpo: await this.repositorio.estado(tx, resenhaId, usuarioId),
          };
        },
      ),
    );
  }

  /** `true` quando esta escrita é a primeira curtida do par, e só então há notificação. */
  private async gravar(
    tx: Tx,
    resenhaId: string,
    usuarioId: string,
    tipo: TipoDeReacao,
  ): Promise<boolean> {
    if (
      await this.repositorio.criarSeNaoExiste(tx, resenhaId, usuarioId, tipo)
    ) {
      return tipo === 'curtida';
    }
    const atual = await this.repositorio.travar(tx, resenhaId, usuarioId);
    const mudanca = mudancaAoReagir(atual, tipo);
    if (mudanca.gravar) {
      await this.repositorio.atualizar(
        tx,
        resenhaId,
        usuarioId,
        tipo,
        mudanca.primeiraCurtida,
      );
    }
    return mudanca.primeiraCurtida;
  }

  /**
   * Na ordem: a resenha existe; o livro dela está ativo; ela é de outro leitor (422 se for a
   * própria); o autor está na VIEW de perfil; quem reage também está (403, como ao publicar
   * resenha, porque é dele o `autorAcao` do evento); e quem reage tem acesso à resenha.
   */
  private async exigirAcesso(
    tx: Tx,
    usuarioId: string,
    resenhaId: string,
    via: ViaInformada,
  ): Promise<Alvo> {
    const resenha = await this.repositorio.resenha(tx, resenhaId);
    if (!resenha) {
      throw new NaoEncontrado();
    }
    const livro = await this.referencias.buscarLivro(resenha.livroId, tx);
    if (!livro?.ativo) {
      throw new NaoEncontrado();
    }
    if (resenha.autorId === usuarioId) {
      throw new ReacaoPropria();
    }
    const autor = await this.referencias.buscarPerfil(resenha.autorId, tx);
    if (!autor) {
      throw new NaoEncontrado();
    }
    const reator = await this.referencias.buscarPerfil(usuarioId, tx);
    if (!reator) {
      throw new AcessoNegado();
    }

    const liberado =
      livro.tipo === 'oficial'
        ? autor.privacidade === 'publico' ||
          (await this.referencias.existeSeguimentoAceito(
            usuarioId,
            resenha.autorId,
            tx,
          ))
        : await this.liberadoPelaVia(tx, usuarioId, resenha, livro, via);
    if (!liberado) {
      throw new NaoEncontrado();
    }
    return { resenha, livro, reator };
  }

  /** Livro pessoal: só o dono escreve resenha (RN-07), e terceiros chegam pelo feed ou pela lista. */
  private async liberadoPelaVia(
    tx: Tx,
    usuarioId: string,
    resenha: ResenhaAlvo,
    livro: LivroReferencia,
    { via, referenciaId }: ViaInformada,
  ): Promise<boolean> {
    if (!via || !referenciaId || livro.donoId !== resenha.autorId) {
      return false;
    }
    const pedido = {
      referenciaId,
      livroId: livro.id,
      donoId: resenha.autorId,
      solicitanteId: usuarioId,
    };
    return via === 'feed'
      ? this.repositorio.viaFeed(tx, pedido)
      : this.repositorio.viaLista(tx, pedido);
  }

  private async publicarCurtida(tx: Tx, alvo: Alvo): Promise<void> {
    const { resenha, livro, reator } = alvo;
    const dados: DadosResenhaCurtida = {
      destinatarioId: resenha.autorId,
      resenhaId: resenha.id,
      autorAcao: {
        ...reator.snapshot,
        avatarUrl: urlOuNulo(reator.snapshot.avatarUrl),
      },
      livro: {
        ...livro.snapshot,
        autor: livro.snapshot.autor ?? null,
        capaUrl: urlOuNulo(livro.snapshot.capaUrl),
      },
    };
    await this.outbox.inserir(tx, {
      ...RESENHA_CURTIDA,
      chaveNegocio: chaveDeNegocioDaResenhaCurtida(
        resenha.id,
        reator.snapshot.id,
      ),
      payload: dados,
    });
  }
}

/** Via e referência entram no hash da chave: a mesma chave por outra via é outro pedido (409). */
function normalizarVia({ via, referenciaId }: ViaInformada): ViaInformada {
  return {
    ...(via ? { via } : {}),
    ...(referenciaId ? { referenciaId: referenciaId.toLowerCase() } : {}),
  };
}
