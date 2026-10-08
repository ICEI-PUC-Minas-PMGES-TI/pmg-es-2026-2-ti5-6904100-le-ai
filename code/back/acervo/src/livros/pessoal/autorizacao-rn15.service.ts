import { Inject, Injectable } from '@nestjs/common';
import { and, eq, exists, or } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import {
  vAtividadeLivroPessoal,
  vListaLivroPessoal,
  vPerfilReferencia,
  vSeguimentoAceito,
} from '../../db/contratos-externos';
import { ServicoIndisponivel } from '../../common/erros-de-negocio';
import { ehFalhaDeContratoExterno } from '../../common/pg-erros';

/**
 * Vias de acesso de terceiro à página de um livro pessoal (RN-15).
 *
 * São **exatamente duas**: o feed (F-FEED) e a lista do dono (F-LST). "Não
 * existe terceira via: conhecer ou informar diretamente o identificador não
 * concede acesso."
 */
export const VIAS = ['feed', 'lista'] as const;
export type Via = (typeof VIAS)[number];

export interface PedidoDeAcesso {
  livroId: string;
  donoId: string;
  solicitanteId: string;
  via?: string;
  referenciaId?: string;
}

@Injectable()
export class AutorizacaoRn15 {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * Decide se um terceiro abre o livro pessoal pela via informada. Via
   * desconhecida ou sem referência nega; o acesso por qualquer via é sempre
   * modo consulta (RN-15.2/3), e nenhuma escrita passa por aqui.
   */
  async terceiroPodeVer(pedido: PedidoDeAcesso): Promise<boolean> {
    if (!pedido.referenciaId) {
      return false;
    }

    try {
      if (pedido.via === 'feed') {
        return await this.viaFeed(pedido, pedido.referenciaId);
      }
      if (pedido.via === 'lista') {
        return await this.viaLista(pedido, pedido.referenciaId);
      }
      return false;
    } catch (erro) {
      // GRANT faltando no Neon ou VIEW de outro serviço ainda não criada é
      // indisponibilidade de dependência, não erro do cliente. Deixar vazar
      // como 500 esconderia um problema de infraestrutura atrás de "erro
      // inesperado" (RNF-ERR-01).
      if (ehFalhaDeContratoExterno(erro)) {
        throw new ServicoIndisponivel();
      }
      throw erro;
    }
  }

  /**
   * Verifica a via do feed inteira em **uma** consulta.
   *
   * Uma consulta e não três por dois motivos. O primeiro é correção: três
   * consultas separadas abrem janela entre elas, e a atividade pode ser
   * removida ou o seguimento desfeito no meio da verificação. O segundo é custo:
   * o Neon está do outro lado da rede e três idas e voltas por leitura de página
   * pesam.
   *
   * O JOIN prova, de uma vez, as quatro coisas que RN-15 exige:
   *
   * 1. a atividade existe e está **ativa** — a VIEW de `social` já filtra isso;
   * 2. ela pertence ao **dono do livro**;
   * 3. ela referencia o **mesmo livro** que está sendo aberto;
   * 4. o solicitante tem **seguimento aceito** com o dono.
   *
   * O item 4 vale **mesmo quando o perfil do dono é público**. Isso é mais
   * restritivo do que ler `privacidade` e liberar perfil público, e é
   * deliberado: RN-15.5 manda refazer a verificação na página do livro, e o
   * critério de aceite exige que não-seguidor não acesse. Uma regra só, sem
   * ramo condicional, é mais difícil de furar.
   */
  private async viaFeed(
    pedido: PedidoDeAcesso,
    atividadeId: string,
  ): Promise<boolean> {
    const linhas = await this.db
      .select({ atividadeId: vAtividadeLivroPessoal.atividadeId })
      .from(vAtividadeLivroPessoal)
      .innerJoin(
        vSeguimentoAceito,
        and(
          eq(vSeguimentoAceito.seguidoId, vAtividadeLivroPessoal.donoId),
          eq(vSeguimentoAceito.seguidorId, pedido.solicitanteId),
        ),
      )
      .innerJoin(
        vPerfilReferencia,
        eq(vPerfilReferencia.id, vAtividadeLivroPessoal.donoId),
      )
      .where(
        and(
          eq(vAtividadeLivroPessoal.atividadeId, atividadeId),
          eq(vAtividadeLivroPessoal.livroId, pedido.livroId),
          eq(vAtividadeLivroPessoal.donoId, pedido.donoId),
        ),
      )
      .limit(1);

    return linhas.length > 0;
  }

  /**
   * Verifica a via da lista em **uma** consulta, pelos mesmos motivos da via
   * do feed. O JOIN prova que:
   *
   * 1. a lista existe e está **ativa** — a VIEW de `social` só expõe listas
   *    ativas, então lista excluída ou livro retirado cortam o acesso na hora
   *    (RN-15.6);
   * 2. ela é do **dono do livro** e contém **esse livro**;
   * 3. o dono está em `v_perfil_referencia_v1` (suspenso ou em exclusão não
   *    libera);
   * 4. o perfil do dono é público **ou** o solicitante tem seguimento aceito.
   *
   * O item 4 **difere da via do feed**, e de propósito: o feed só existe entre
   * quem segue, enquanto a lista é recurso de perfil, e o RN-08 deixa listas de
   * perfil público visíveis a todos. Exigir seguimento aqui esconderia o livro
   * de uma lista que o próprio leitor já está vendo.
   */
  private async viaLista(
    pedido: PedidoDeAcesso,
    listaId: string,
  ): Promise<boolean> {
    const linhas = await this.db
      .select({ listaId: vListaLivroPessoal.listaId })
      .from(vListaLivroPessoal)
      .innerJoin(
        vPerfilReferencia,
        eq(vPerfilReferencia.id, vListaLivroPessoal.donoId),
      )
      .where(
        and(
          eq(vListaLivroPessoal.listaId, listaId),
          eq(vListaLivroPessoal.livroId, pedido.livroId),
          eq(vListaLivroPessoal.donoId, pedido.donoId),
          or(
            eq(vPerfilReferencia.privacidade, 'publico'),
            exists(
              this.db
                .select({ seguidoId: vSeguimentoAceito.seguidoId })
                .from(vSeguimentoAceito)
                .where(
                  and(
                    eq(vSeguimentoAceito.seguidoId, vListaLivroPessoal.donoId),
                    eq(vSeguimentoAceito.seguidorId, pedido.solicitanteId),
                  ),
                ),
            ),
          ),
        ),
      )
      .limit(1);

    return linhas.length > 0;
  }
}
