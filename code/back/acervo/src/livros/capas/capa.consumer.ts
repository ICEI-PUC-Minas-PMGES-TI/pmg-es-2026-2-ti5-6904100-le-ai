import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Tx } from '../../db/tipos';
import { AmqpConsumerService } from '../../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../../messaging/message-validator';
import { EXCHANGES } from '../../messaging/messaging.constants';
import leituraIniciadaSchema from '../../messaging/schemas/leitura.iniciada.v1.schema.json';
import adicionadoAEstanteSchema from '../../messaging/schemas/livro.adicionado_a_estante.v1.schema.json';
import type { CacheDeCapas } from './cache-de-capas.service';

export const CACHE_DE_CAPAS = Symbol('CACHE_DE_CAPAS');

export const LIVRO_ADICIONADO_A_ESTANTE = {
  tipo: 'livro.adicionado_a_estante',
  versao: 1,
} as const;
export const LEITURA_INICIADA = {
  tipo: 'leitura.iniciada',
  versao: 1,
} as const;

/** Nomes da topologia, do catálogo canônico (`docs/mensageria/catalogo.md`). */
export const CONSUMIDOR_CAPAS = {
  consumerName: 'acervo.capas',
  queue: 'leai.acervo.capas',
  exchange: EXCHANGES.leitura,
  routingKeys: [LIVRO_ADICIONADO_A_ESTANTE.tipo, LEITURA_INICIADA.tipo],
} as const;

/**
 * Consumidor do cache de capas (RF-ACV-17, RN-14).
 *
 * Ouve `livro.adicionado_a_estante` e também `leitura.iniciada`: iniciar a
 * leitura de um livro fora da estante põe o livro nela sem publicar o primeiro
 * evento (`garantirEstante` do `leitura`). Os dois trazem `livroId`, e o efeito
 * lê o estado atual do livro, então a ordem e a repetição não importam.
 *
 * **Só é registrado com a credencial do Cloudinary.** Sem ela, a partida
 * registra um aviso, a fila não é declarada e os eventos se perdem; o
 * `backfill:capas` recupera depois.
 */
@Injectable()
export class CapaConsumer implements OnModuleInit {
  private readonly logger = new Logger(CapaConsumer.name);

  constructor(
    private readonly consumidor: AmqpConsumerService,
    private readonly validador: MessageValidator,
    @Inject(CACHE_DE_CAPAS) private readonly cache: CacheDeCapas | null,
  ) {}

  onModuleInit(): void {
    if (!this.cache) {
      this.logger.warn(
        'Cache de capas desligado: sem CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET, a fila leai.acervo.capas não é criada e os eventos se perdem (o backfill:capas recupera)',
      );
      return;
    }
    this.validador.registerDataSchema(
      LIVRO_ADICIONADO_A_ESTANTE.tipo,
      LIVRO_ADICIONADO_A_ESTANTE.versao,
      adicionadoAEstanteSchema,
    );
    this.validador.registerDataSchema(
      LEITURA_INICIADA.tipo,
      LEITURA_INICIADA.versao,
      leituraIniciadaSchema,
    );
    this.consumidor.register(CONSUMIDOR_CAPAS, (envelope, tx) =>
      this.processar(envelope, tx),
    );
  }

  async processar(envelope: MessageEnvelope, tx: Tx): Promise<void> {
    if (!this.cache) return;
    const { livroId } = envelope.data as { livroId: string };
    const desfecho = await this.cache.cachear(tx, livroId);
    this.logger.debug(
      `Capa do livro ${livroId}: ${desfecho.tipo} (evento ${envelope.eventId})`,
    );
  }
}
