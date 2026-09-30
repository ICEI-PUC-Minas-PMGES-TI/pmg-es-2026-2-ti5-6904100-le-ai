import { Injectable } from '@nestjs/common';
import { getCorrelationId } from '../common/als';
import { outboxLeitura } from '../db/schema';
import type { Tx } from '../db/tipos';
import { MessageValidator } from '../messaging/message-validator';

/** Um evento a gravar: o `data` exato do schema do catálogo, sem envelope. */
export interface EventoDaOutbox {
  eventId?: string;
  tipo: string;
  versao: number;
  chaveNegocio: string;
  payload: unknown;
}

/**
 * Gravação na outbox transacional (RNF-ERR-10), compartilhada pelas features de
 * `leitura` (F-AVA, F-EST, F-PRG).
 *
 * Recebe `tx` e nunca o `db` global: o ponto inteiro da outbox é que o fato de
 * domínio e o evento entrem na **mesma transação**. Publicar depois do commit
 * não atende o requisito, porque uma queda entre os dois perderia o evento. O
 * despachante de P0-MSG (`OutboxDispatcherService`) lê as linhas pendentes,
 * monta o envelope e publica.
 *
 * O `data` é validado contra o schema registrado **antes** do INSERT. Evento
 * fora do contrato é bug do produtor: falhar aqui desfaz a transação e vira um
 * 500 visível no nosso log, em vez de a mensagem cair na DLQ do serviço de
 * outra pessoa. Quem monta o evento limpa o que vem de fora antes (URL de capa
 * malformada vira `null`, por exemplo), para dado estranho não virar 500.
 */
@Injectable()
export class OutboxRepository {
  constructor(private readonly validador: MessageValidator) {}

  async inserir(tx: Tx, evento: EventoDaOutbox): Promise<string> {
    this.validador.validarDados(evento.tipo, evento.versao, evento.payload);

    const [linha] = await tx
      .insert(outboxLeitura)
      .values({
        eventId: evento.eventId,
        tipo: evento.tipo,
        versao: evento.versao,
        chaveNegocio: evento.chaveNegocio,
        // `correlation_id` é `uuid NOT NULL` em linha viva
        // (`outbox_leitura_anonimizacao_ck`). O middleware de correlação
        // garante que o valor no ALS é sempre um UUID, mesmo quando o cliente
        // manda lixo.
        correlationId: getCorrelationId() ?? null,
        payload: evento.payload as Record<string, unknown>,
      })
      .returning({ eventId: outboxLeitura.eventId });

    return linha.eventId;
  }
}
