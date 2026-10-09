import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tx } from '../db/tipos';
import { DesafiosService } from '../desafios/aplicacao/desafios.service';
import { EVENTO_VERSAO_V1, TIPO_EVENTO } from '../leituras/dominio/eventos';
import { AmqpConsumerService } from '../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../messaging/message-validator';
import { EXCHANGES } from '../messaging/messaging.constants';
import leituraFinalizadaSchema from '../messaging/schemas/leitura.finalizada.v1.schema.json';
import progressoRegistradoSchema from '../messaging/schemas/progresso.registrado.v1.schema.json';
import { SequenciaService } from '../sequencia/sequencia.service';

/**
 * Consumidor de métricas do `leitura` (catálogo: `docs/mensageria/catalogo.md`).
 * É um só para os efeitos de progresso e finalização: sequência (F-GAM) e
 * desafios (F-DSF); estatísticas (F-STA) entram aqui também.
 */
export const CONSUMIDOR_METRICAS = {
  consumerName: 'leitura.metricas',
  queue: 'leai.leitura.metricas',
  exchange: EXCHANGES.leitura,
  routingKeys: [
    TIPO_EVENTO.PROGRESSO_REGISTRADO,
    TIPO_EVENTO.LEITURA_FINALIZADA,
  ],
} as const;

/**
 * Efeitos de `progresso.registrado` e `leitura.finalizada` (RNF-ARQ-06):
 * recompõem sequência e desafios do leitor a partir do estado atual, no `tx`
 * do recibo de `mensagem_processada` — entrega repetida não tem efeito
 * (RNF-ERR-06), e erro cai no retry e na DLQ do runtime (RNF-ERR-07). Como os
 * efeitos leem o estado atual em vez de somar o `data`, mensagem atrasada de
 * um progresso já excluído não o ressuscita.
 */
@Injectable()
export class MetricasConsumer implements OnModuleInit {
  constructor(
    private readonly consumidor: AmqpConsumerService,
    private readonly validador: MessageValidator,
    private readonly sequencia: SequenciaService,
    private readonly desafios: DesafiosService,
  ) {}

  onModuleInit(): void {
    this.validador.registerDataSchema(
      TIPO_EVENTO.PROGRESSO_REGISTRADO,
      EVENTO_VERSAO_V1,
      progressoRegistradoSchema,
    );
    this.validador.registerDataSchema(
      TIPO_EVENTO.LEITURA_FINALIZADA,
      EVENTO_VERSAO_V1,
      leituraFinalizadaSchema,
    );
    this.consumidor.register(CONSUMIDOR_METRICAS, (envelope, tx) =>
      this.processar(envelope, tx),
    );
  }

  async processar(envelope: MessageEnvelope, tx: Tx): Promise<void> {
    // O `parse` do runtime não valida o `data` (SEC-32): valida aqui, antes
    // de qualquer efeito.
    this.validador.validarDados(envelope.type, envelope.version, envelope.data);
    const { usuarioId } = envelope.data as { usuarioId: string };
    // A sequência só depende de progresso (RN-18.1); finalizar não cria dia.
    if (envelope.type === TIPO_EVENTO.PROGRESSO_REGISTRADO) {
      await this.sequencia.recalcular(tx, usuarioId);
    }
    await this.desafios.recalcular(tx, usuarioId);
  }
}
