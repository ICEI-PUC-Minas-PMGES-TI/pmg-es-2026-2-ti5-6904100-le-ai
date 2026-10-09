import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Tx } from '../db/tipos';
import { EVENTO_VERSAO_V1, TIPO_EVENTO } from '../leituras/dominio/eventos';
import { AmqpConsumerService } from '../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../messaging/message-validator';
import { EXCHANGES } from '../messaging/messaging.constants';
import progressoRegistradoSchema from '../messaging/schemas/progresso.registrado.v1.schema.json';
import { SequenciaService } from '../sequencia/sequencia.service';

/**
 * Consumidor de métricas do `leitura` (catálogo: `docs/mensageria/catalogo.md`).
 * É um só para os efeitos de progresso: hoje a sequência (F-GAM); desafios
 * (F-DSF) e estatísticas (F-STA) entram aqui, acrescentando
 * `leitura.finalizada` às routing keys.
 */
export const CONSUMIDOR_METRICAS = {
  consumerName: 'leitura.metricas',
  queue: 'leai.leitura.metricas',
  exchange: EXCHANGES.leitura,
  routingKeys: [TIPO_EVENTO.PROGRESSO_REGISTRADO],
} as const;

/**
 * Efeito de `progresso.registrado` (RNF-ARQ-06): recompõe a sequência do
 * leitor a partir dos progressos atuais, no `tx` do recibo de
 * `mensagem_processada` — entrega repetida não tem efeito (RNF-ERR-06), e erro
 * cai no retry e na DLQ do runtime (RNF-ERR-07). Como o efeito lê o estado
 * atual em vez de somar o `data`, mensagem atrasada de um progresso já excluído
 * não o ressuscita.
 */
@Injectable()
export class ProgressoRegistradoConsumer implements OnModuleInit {
  constructor(
    private readonly consumidor: AmqpConsumerService,
    private readonly validador: MessageValidator,
    private readonly sequencia: SequenciaService,
  ) {}

  onModuleInit(): void {
    this.validador.registerDataSchema(
      TIPO_EVENTO.PROGRESSO_REGISTRADO,
      EVENTO_VERSAO_V1,
      progressoRegistradoSchema,
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
    await this.sequencia.recalcular(tx, usuarioId);
  }
}
