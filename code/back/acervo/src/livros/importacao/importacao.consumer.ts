import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Tx } from '../../db/tipos';
import { AmqpConsumerService } from '../../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../../messaging/message-validator';
import { EXCHANGES } from '../../messaging/messaging.constants';
import importacaoSolicitadaSchema from '../../messaging/schemas/livro.importacao_solicitada.v1.schema.json';
import {
  DadosImportacaoSolicitada,
  LIVRO_IMPORTACAO_SOLICITADA,
} from '../outbox/eventos';
import { ConvergenciaRepository } from './convergencia.repository';
import type { FonteDeMetadados } from './dominio/fonte-metadados';
import { ProcessadorImportacao } from './dominio/processador-importacao';

export const FONTES_DE_METADADOS = Symbol('FONTES_DE_METADADOS');

/** Nomes da topologia, do catálogo canônico (`docs/mensageria/catalogo.md`). */
export const CONSUMIDOR_IMPORTACAO = {
  consumerName: 'acervo.importacao',
  queue: 'leai.acervo.importacao',
  exchange: EXCHANGES.acervo,
  routingKeys: [LIVRO_IMPORTACAO_SOLICITADA.tipo],
} as const;

/**
 * Acionador do consumidor de domínio de `livro.importacao_solicitada`.
 *
 * O runtime de P0-MSG entrega a mensagem já validada (envelope e `data`) e
 * abre a transação que grava o recibo; aqui só se faz o efeito, com o mesmo
 * `tx`. Os três desfechos do processador — `concluida`, `nao_encontrado` e
 * `falha_transitoria` — são estados de negócio gravados e **confirmados**:
 * `falha_transitoria` já é o fim da política de retentativa por fonte e habilita
 * o `reprocessar`, então não lança. Só erro inesperado (banco, bug) lança,
 * desfaz efeito e recibo, e cai no retry `1/5/15 s` e na DLQ do runtime.
 */
@Injectable()
export class ImportacaoConsumer implements OnModuleInit {
  private readonly logger = new Logger(ImportacaoConsumer.name);

  constructor(
    private readonly consumidor: AmqpConsumerService,
    private readonly validador: MessageValidator,
    @Inject(FONTES_DE_METADADOS)
    private readonly fontes: FonteDeMetadados[],
  ) {}

  onModuleInit(): void {
    this.validador.registerDataSchema(
      LIVRO_IMPORTACAO_SOLICITADA.tipo,
      LIVRO_IMPORTACAO_SOLICITADA.versao,
      importacaoSolicitadaSchema,
    );
    this.consumidor.register(CONSUMIDOR_IMPORTACAO, (envelope, tx) =>
      this.processar(envelope, tx),
    );
  }

  async processar(envelope: MessageEnvelope, tx: Tx): Promise<void> {
    const dados = envelope.data as unknown as DadosImportacaoSolicitada;

    // Trava a linha: duas entregas da mesma importação (eventos distintos após
    // um `reprocessar`, por exemplo) não consultam as fontes em paralelo. E só
    // `pendente` é processada — uma entrega tardia não reescreve desfecho.
    const resultado = await tx.execute(sql`
      SELECT estado FROM acervo.importacao_livro
       WHERE id = ${dados.importacaoId}
       FOR UPDATE
    `);
    const linha = (resultado as unknown as { rows: { estado: string }[] })
      .rows[0];
    if (!linha) {
      // Sem linha não há o que convergir, e insistir não faz aparecer. Confirma
      // e registra, em vez de gastar três retentativas e ocupar a DLQ.
      this.logger.warn(
        `Importação ${dados.importacaoId} inexistente; evento ${envelope.eventId} descartado`,
      );
      return;
    }
    if (linha.estado !== 'pendente') return;

    const desfecho = await new ProcessadorImportacao(
      this.fontes,
      new ConvergenciaRepository(tx),
    ).processar(dados);

    this.logger.log(
      `Importação ${dados.importacaoId} encerrada como ${desfecho.estado}`,
    );
  }
}
