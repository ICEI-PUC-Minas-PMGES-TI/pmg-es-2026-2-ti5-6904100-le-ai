import { Injectable } from '@nestjs/common';
import { outboxLeitura } from '../db/schema';
import type { Tx } from '../db/tipos';
import { getCorrelationId } from '../common/als';
import type { EventoOutbox } from '../leituras/dominio/eventos';

@Injectable()
export class OutboxRepository {
  async gravar(tx: Tx, evento: EventoOutbox<unknown>): Promise<void> {
    await tx.insert(outboxLeitura).values({
      eventId: evento.eventId,
      tipo: evento.tipo,
      versao: evento.versao,
      chaveNegocio: evento.chaveNegocio,
      correlationId: getCorrelationId() ?? null,
      payload: evento.payload as Record<string, unknown>,
    });
  }
}
