import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDB } from '../../db/drizzle.module';
import {
  vAtividadeLivroPessoal,
  vPerfilReferencia,
  vSeguimentoAceito,
} from '../../db/contratos-externos';
import { ServicoIndisponivel } from '../../common/erros-de-negocio';
import { ehFalhaDeContratoExterno } from '../../common/pg-erros';

/**
 * Vias de acesso de terceiro à página de um livro pessoal (RN-15).
 *
 * São **exatamente duas**, feed e lista do dono, e no Período 1 só a do feed
 * existe — F-LST entrega a de lista no Período 2. "Não existe terceira via:
 * conhecer ou informar diretamente o identificador não concede acesso."
 */
export type Via = 'feed';

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
  async terceiroPodeVer(pedido: PedidoDeAcesso): Promise<boolean> {
    if (pedido.via !== 'feed' || !pedido.referenciaId) {
      return false;
    }

    try {
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
            eq(vAtividadeLivroPessoal.atividadeId, pedido.referenciaId),
            eq(vAtividadeLivroPessoal.livroId, pedido.livroId),
            eq(vAtividadeLivroPessoal.donoId, pedido.donoId),
          ),
        )
        .limit(1);

      return linhas.length > 0;
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
}
