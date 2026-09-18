import { Injectable } from '@nestjs/common';
import { outboxAcervo } from '../../db/schema';
import type { Tx } from '../../db/tipos';
import { getCorrelationId } from '../../common/als';

/**
 * Gravação na outbox transacional (RNF-ERR-10).
 *
 * Recebe `tx` e nunca o `db` global: o ponto inteiro da outbox é que o fato de
 * domínio e o evento entrem na **mesma transação**. Publicar depois do commit
 * não atende o requisito, porque uma queda entre os dois perderia o evento.
 *
 * Não há publisher aqui. O dispatcher que lê `status = 'pendente'`, publica com
 * confirm e marca `publicado` é de P0-MSG e ainda não existe — as linhas ficam
 * acumuladas até lá, que é exatamente o comportamento esperado de uma outbox.
 */
@Injectable()
export class OutboxRepository {
  async inserir(
    tx: Tx,
    evento: {
      tipo: string;
      versao: number;
      chaveNegocio: string;
      payload: unknown;
    },
  ): Promise<string> {
    const [linha] = await tx
      .insert(outboxAcervo)
      .values({
        tipo: evento.tipo,
        versao: evento.versao,
        chaveNegocio: evento.chaveNegocio,
        // `correlation_id` é `uuid NOT NULL` em linha viva
        // (`outbox_acervo_anonimizacao_ck`). O middleware de correlação garante
        // que o valor no ALS é sempre um UUID, mesmo quando o cliente manda lixo.
        correlationId: getCorrelationId() ?? null,
        payload: evento.payload as Record<string, unknown>,
      })
      .returning({ eventId: outboxAcervo.eventId });

    return linha.eventId;
  }
}
