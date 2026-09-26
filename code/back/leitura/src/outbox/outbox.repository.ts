import { Injectable } from '@nestjs/common';
import { outboxLeitura } from '../db/schema';
import type { Tx } from '../db/tipos';
import { getCorrelationId } from '../common/als';
import type { EventoOutbox } from '../leituras/dominio/eventos';

/**
 * Gravação na outbox transacional (RNF-ERR-10).
 *
 * Recebe `tx` e nunca o `db` global: o ponto inteiro da outbox é que o fato de
 * domínio e o evento entrem na **mesma transação**. Publicar depois do commit
 * não atende o requisito, porque uma queda entre os dois perderia o evento.
 *
 * Não há publisher aqui: o `OutboxDispatcherService` de P0-MSG lê as linhas
 * `pendente`, monta o envelope v1 e publica com confirm. Por isso `payload`
 * guarda **somente** o `data` do envelope.
 *
 * O `eventId` vem pronto do builder de `leituras/dominio/eventos.ts`, e não do default
 * do banco, porque as chaves de negócio de retomada e abandono o contêm.
 */
@Injectable()
export class OutboxRepository {
  async gravar(tx: Tx, evento: EventoOutbox<unknown>): Promise<void> {
    await tx.insert(outboxLeitura).values({
      eventId: evento.eventId,
      tipo: evento.tipo,
      versao: evento.versao,
      chaveNegocio: evento.chaveNegocio,
      // `correlation_id` é `uuid NOT NULL` em linha viva
      // (`outbox_leitura_anonimizacao_ck`). O middleware de correlação garante
      // que o valor no ALS é sempre um UUID, mesmo quando o cliente manda lixo.
      // Fora de requisição HTTP (job sem ALS) o CHECK recusa a linha: quem
      // grava fora de requisição precisa abrir um contexto de correlação.
      correlationId: getCorrelationId() ?? null,
      payload: evento.payload as Record<string, unknown>,
    });
  }
}
