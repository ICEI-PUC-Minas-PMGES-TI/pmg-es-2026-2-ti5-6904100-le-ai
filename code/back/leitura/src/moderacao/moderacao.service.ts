import { Injectable } from '@nestjs/common';
import {
  chaveDeNegocioDaResenhaExcluida,
  RESENHA_EXCLUIDA,
} from '../avaliacoes/eventos';
import { AvaliacoesRepository } from '../avaliacoes/avaliacoes.repository';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../common/idempotencia/idempotencia.constantes';
import {
  IdempotenciaService,
  type RespostaIdempotente,
} from '../common/idempotencia/idempotencia.service';
import { OutboxRepository } from '../outbox/outbox.repository';
import type { RemocaoDto } from './dto/remocao.dto';

/**
 * Sujeito fixo dos recibos da moderação: o comando vem do `social`, não de um leitor. Vizinho do
 * `SUJEITO_AGENDADOR` (`...0001`) do job de inatividade.
 */
export const SUJEITO_MODERACAO = '00000000-0000-0000-0000-000000000002';

const STATUS_OK = 200;

/**
 * Remoção de conteúdo pela moderação (F-MOD), comandada pelo `social` (HTTP interno autenticado
 * e idempotente). O `social` manda uma chave **fixa por alvo**: se a primeira chamada apagou e a
 * resposta se perdeu num timeout, a repetição recebe o mesmo `removida: true`, e não um
 * `removida: false` que esconderia a remoção da auditoria.
 *
 * O recibo guarda `autorId`; o consumidor de `conta.excluida` o anonimiza (RN-23.7).
 */
@Injectable()
export class ModeracaoService {
  constructor(
    private readonly avaliacoes: AvaliacoesRepository,
    private readonly idempotencia: IdempotenciaService,
    private readonly outbox: OutboxRepository,
  ) {}

  /**
   * Apaga a resenha e publica o mesmo `resenha.excluida` da exclusão pelo autor: o feed remove a
   * atividade, e as reações saem pelo CASCADE.
   */
  removerResenha(
    resenhaId: string,
    chave: string,
  ): Promise<RespostaIdempotente<RemocaoDto>> {
    return this.idempotencia.executar<RemocaoDto>(
      {
        subjectRef: SUJEITO_MODERACAO,
        operacao: operacaoNoCaminho(
          OPERACOES.REMOVER_RESENHA_MODERACAO,
          resenhaId,
        ),
        chave,
        payload: {},
      },
      async (tx) => {
        const removida = await this.avaliacoes.excluirResenhaPorId(
          tx,
          resenhaId,
        );
        if (!removida) {
          return {
            status: STATUS_OK,
            corpo: { removida: false, autorId: null, livroId: null },
          };
        }
        await this.outbox.inserir(tx, {
          ...RESENHA_EXCLUIDA,
          chaveNegocio: chaveDeNegocioDaResenhaExcluida(resenhaId),
          payload: {
            usuarioId: removida.usuarioId,
            resenhaId,
            livroId: removida.livroId,
          },
        });
        return {
          status: STATUS_OK,
          corpo: {
            removida: true,
            autorId: removida.usuarioId,
            livroId: removida.livroId,
          },
        };
      },
    );
  }
}
