import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Tx } from '../../db/tipos';
import { AmqpConsumerService } from '../../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../../messaging/message-validator';
import { EXCHANGES } from '../../messaging/messaging.constants';
import paginaAbertaSchema from '../../messaging/schemas/livro.pagina_aberta.v1.schema.json';
import { DadosPaginaAberta, LIVRO_PAGINA_ABERTA } from '../outbox/eventos';
import {
  FonteDeSinopse,
  LivroParaSinopse,
  obterSinopse,
} from './dominio/fonte-de-sinopse';

export const FONTES_DE_SINOPSE = Symbol('FONTES_DE_SINOPSE');

/** Nomes da topologia, do catálogo canônico (`docs/mensageria/catalogo.md`). */
export const CONSUMIDOR_SINOPSE = {
  consumerName: 'acervo.sinopse',
  queue: 'leai.acervo.sinopse',
  exchange: EXCHANGES.acervo,
  routingKeys: [LIVRO_PAGINA_ABERTA.tipo],
} as const;

/**
 * Consumidor de `livro.pagina_aberta` (RF-ACV-18, RN-19).
 *
 * O runtime de P0-MSG entrega a mensagem validada e abre a transação do recibo;
 * aqui se faz o efeito com o mesmo `tx`. A linha do livro é travada e só a
 * sinopse `pendente` é buscada: uma entrega tardia ou duplicada não reescreve
 * `disponivel` nem `ausente`, que são terminais.
 *
 * Os três desfechos são gravados e **confirmados**, inclusive
 * `falha_transitoria`: ele já é o fim da política de retentativa por fonte, e uma
 * abertura da página depois de 10 minutos reenfileira. Só erro inesperado lança
 * e cai no retry e na DLQ do runtime. Toda transição grava `atualizado_em`, que é
 * o relógio das regras de reenfileiramento da `GET /livros/{id}`.
 */
@Injectable()
export class SinopseConsumer implements OnModuleInit {
  private readonly logger = new Logger(SinopseConsumer.name);

  constructor(
    private readonly consumidor: AmqpConsumerService,
    private readonly validador: MessageValidator,
    @Inject(FONTES_DE_SINOPSE)
    private readonly fontes: FonteDeSinopse[],
  ) {}

  onModuleInit(): void {
    this.validador.registerDataSchema(
      LIVRO_PAGINA_ABERTA.tipo,
      LIVRO_PAGINA_ABERTA.versao,
      paginaAbertaSchema,
    );
    this.consumidor.register(CONSUMIDOR_SINOPSE, (envelope, tx) =>
      this.processar(envelope, tx),
    );
  }

  async processar(envelope: MessageEnvelope, tx: Tx): Promise<void> {
    const { livroId } = envelope.data as unknown as DadosPaginaAberta;

    const resultado = await tx.execute(sql`
      SELECT id, isbn13, ol_work_key, ol_edition_key, sinopse_status
        FROM acervo.livro
       WHERE id = ${livroId} AND tipo = 'oficial' AND ativo
       FOR UPDATE
    `);
    const linha = (
      resultado as unknown as {
        rows: {
          id: string;
          isbn13: string;
          ol_work_key: string | null;
          ol_edition_key: string | null;
          sinopse_status: string;
        }[];
      }
    ).rows[0];
    if (!linha) {
      this.logger.warn(
        `Livro ${livroId} inexistente ou não oficial; evento ${envelope.eventId} descartado`,
      );
      return;
    }
    if (linha.sinopse_status !== 'pendente') return;

    const livro: LivroParaSinopse = {
      id: linha.id,
      isbn13: linha.isbn13,
      olWorkKey: linha.ol_work_key,
      olEditionKey: linha.ol_edition_key,
    };
    const desfecho = await obterSinopse(this.fontes, livro);
    const texto = desfecho.status === 'disponivel' ? desfecho.texto : null;

    // O CHECK `livro_sinopse_conteudo_status_ck` amarra os dois: texto só em
    // `disponivel`.
    await tx.execute(sql`
      UPDATE acervo.livro
         SET sinopse = ${texto},
             sinopse_status = ${desfecho.status},
             atualizado_em = now()
       WHERE id = ${livroId}
    `);

    this.logger.log(`Sinopse do livro ${livroId}: ${desfecho.status}`);
  }
}
