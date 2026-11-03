import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Tx } from '../../db/tipos';
import { AmqpConsumerService } from '../../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../../messaging/message-validator';
import { EXCHANGES } from '../../messaging/messaging.constants';
import notaAlteradaSchema from '../../messaging/schemas/nota.alterada.v1.schema.json';
import { NotaDosLeitoresRepository } from './nota-dos-leitores.repository';

export const NOTA_ALTERADA = { tipo: 'nota.alterada', versao: 1 } as const;

/** Nomes da topologia, do catálogo canônico (`docs/mensageria/catalogo.md`). */
export const CONSUMIDOR_NOTAS = {
  consumerName: 'acervo.notas',
  queue: 'leai.acervo.notas',
  exchange: EXCHANGES.leitura,
  routingKeys: [NOTA_ALTERADA.tipo],
} as const;

/**
 * Consumidor de `nota.alterada` (RF-ACV-16, RNF-ERR-06/07).
 *
 * Ignora o valor do evento: trava o livro e relê `v_nota_publicacao_v1`, e a
 * projeção fica igual ao estado atual da VIEW. Criação, edição, exclusão,
 * duplicação e entrega fora de ordem convergem do mesmo jeito. O agregado é
 * recalculado na mesma transação do recibo. Livro pessoal ou inexistente é
 * confirmado sem efeito (RN-06.5).
 */
@Injectable()
export class NotaDosLeitoresConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotaDosLeitoresConsumer.name);

  constructor(
    private readonly consumidor: AmqpConsumerService,
    private readonly validador: MessageValidator,
    private readonly notas: NotaDosLeitoresRepository,
  ) {}

  onModuleInit(): void {
    this.validador.registerDataSchema(
      NOTA_ALTERADA.tipo,
      NOTA_ALTERADA.versao,
      notaAlteradaSchema,
    );
    this.consumidor.register(CONSUMIDOR_NOTAS, (envelope, tx) =>
      this.processar(envelope, tx),
    );
  }

  async processar(envelope: MessageEnvelope, tx: Tx): Promise<void> {
    const { usuarioId, livroId } = envelope.data as {
      usuarioId: string;
      livroId: string;
    };
    if (!(await this.notas.sincronizar(tx, usuarioId, livroId))) {
      this.logger.debug(
        `Livro ${livroId} não é oficial; evento ${envelope.eventId} sem efeito`,
      );
    }
  }
}
