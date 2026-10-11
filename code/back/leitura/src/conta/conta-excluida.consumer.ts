import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Tx } from '../db/tipos';
import { AmqpConsumerService } from '../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../messaging/message-validator';
import { EXCHANGES } from '../messaging/messaging.constants';
import contaExcluidaSchema from '../messaging/schemas/conta.excluida.v1.schema.json';

export const CONTA_EXCLUIDA = { tipo: 'conta.excluida', versao: 1 } as const;

/** Nomes da topologia, do catálogo canônico (`docs/mensageria/catalogo.md`). */
export const CONSUMIDOR_CONTA = {
  consumerName: 'leitura.conta',
  queue: 'leai.leitura.conta',
  exchange: EXCHANGES.identidade,
  routingKeys: [CONTA_EXCLUIDA.tipo],
} as const;

/**
 * Consumidor de `conta.excluida` (F-CONTA-2, RN-23.5 e 23.7): remove do schema
 * `leitura` tudo o que é da conta excluída e anonimiza os registros técnicos.
 *
 * - reações da conta às resenhas de outros; resenhas da conta, que levam pelo
 *   CASCADE as reações de outros leitores a elas (decisão do dono, 07/10/2026);
 * - frases, favoritos e notas;
 * - estante, que leva pelo CASCADE leituras, progresso e limiares;
 * - desafios, que levam janelas, contribuições e pausas;
 * - sequência, dias de leitura e estatísticas;
 * - recibos de idempotência dela, anonimizados;
 * - eventos que a citam: os pendentes saem (o CHECK só anonimiza publicado, e
 *   publicá-los republicaria conteúdo excluído) e os publicados são anonimizados.
 *
 * Tudo no `tx` do recibo de `mensagem_processada`: entrega repetida não tem
 * efeito (RNF-ERR-06), e erro cai no retry e na DLQ do runtime (RNF-ERR-07).
 */
@Injectable()
export class ContaExcluidaConsumer implements OnModuleInit {
  private readonly logger = new Logger(ContaExcluidaConsumer.name);

  constructor(
    private readonly consumidor: AmqpConsumerService,
    private readonly validador: MessageValidator,
  ) {}

  onModuleInit(): void {
    this.validador.registerDataSchema(
      CONTA_EXCLUIDA.tipo,
      CONTA_EXCLUIDA.versao,
      contaExcluidaSchema,
    );
    this.consumidor.register(CONSUMIDOR_CONTA, (envelope, tx) =>
      this.processar(envelope, tx),
    );
  }

  async processar(envelope: MessageEnvelope, tx: Tx): Promise<void> {
    // O `parse` do runtime deste serviço valida envelope e headers, mas não o
    // `data` (até aqui só havia produtor). Para um evento que apaga dados, a
    // validação do schema (SEC-32) vem antes de qualquer efeito; a falha cai
    // no retry e na DLQ como qualquer erro do consumidor.
    this.validador.validarDados(envelope.type, envelope.version, envelope.data);
    const { usuarioId } = envelope.data as { usuarioId: string };

    // A ordem respeita as FKs: o que depende da estante sai antes dela.
    for (const tabela of [
      'reacao_resenha',
      'resenha',
      'frase',
      'favorito',
      'nota',
      'estante',
      'desafio',
      'sequencia_leitura',
      'dia_leitura',
      'estatistica_usuario',
      'estatistica_mensal',
      'estatistica_anual',
    ]) {
      await tx.execute(sql`
        DELETE FROM ${sql.identifier('leitura')}.${sql.identifier(tabela)}
         WHERE usuario_id = ${usuarioId}
      `);
    }

    await tx.execute(sql`
      UPDATE leitura.idempotencia_leitura
         SET subject_ref = NULL, chave = NULL, payload_hash = NULL,
             resposta = NULL, anonimizado_em = now()
       WHERE subject_ref = ${usuarioId} AND anonimizado_em IS NULL
    `);

    // A outbox não tem coluna de usuário: a busca é textual.
    const padrao = `%${usuarioId}%`;
    await tx.execute(sql`
      DELETE FROM leitura.outbox_leitura
       WHERE status = 'pendente'
         AND (payload::text LIKE ${padrao} OR chave_negocio LIKE ${padrao})
    `);
    await tx.execute(sql`
      UPDATE leitura.outbox_leitura
         SET chave_negocio = NULL, correlation_id = NULL, payload = NULL,
             anonimizado_em = now()
       WHERE status = 'publicado' AND anonimizado_em IS NULL
         AND (payload::text LIKE ${padrao} OR chave_negocio LIKE ${padrao})
    `);

    this.logger.log(
      `Dados da conta excluída removidos da leitura (evento ${envelope.eventId})`,
    );
  }
}
