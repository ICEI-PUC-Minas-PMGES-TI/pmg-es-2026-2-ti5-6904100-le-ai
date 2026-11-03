import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Tx } from '../db/tipos';
import { AmqpConsumerService } from '../messaging/amqp-consumer.service';
import {
  MessageValidator,
  type MessageEnvelope,
} from '../messaging/message-validator';
import { NotaDosLeitoresRepository } from '../livros/notas/nota-dos-leitores.repository';
import { EXCHANGES } from '../messaging/messaging.constants';
import contaExcluidaSchema from '../messaging/schemas/conta.excluida.v1.schema.json';
import { RemocaoDeAsset } from './remocao-de-asset';

export const CONTA_EXCLUIDA = { tipo: 'conta.excluida', versao: 1 } as const;

/** Nomes da topologia, do catálogo canônico (`docs/mensageria/catalogo.md`). */
export const CONSUMIDOR_CONTA = {
  consumerName: 'acervo.conta',
  queue: 'leai.acervo.conta',
  exchange: EXCHANGES.identidade,
  routingKeys: [CONTA_EXCLUIDA.tipo],
} as const;

type Linhas<T> = { rows: T[] };

/**
 * Consumidor de `conta.excluida` (F-CONTA-2, RN-23.5 e 23.7): remove do schema
 * `acervo` o que é da conta excluída e anonimiza os registros técnicos.
 *
 * - livros **pessoais** do dono, com as capas no Cloudinary (o CASCADE leva
 *   autores, assuntos, projeções e agregados do próprio livro). Livro oficial
 *   nunca é afetado;
 * - `nota_leitor_projecao` do leitor, recalculando `nota_livro_agregada` dos
 *   livros em que ele votou. Os livros são travados antes de apagar, com a
 *   mesma trava e na mesma ordem do consumidor de `nota.alterada` (F-ACV-NOTA),
 *   sem deadlock entre os dois;
 * - `importacao_livro` que ele solicitou (o livro oficial importado fica);
 * - recibos de idempotência dele, anonimizados;
 * - eventos que o citam: os pendentes saem, para não republicar dado de quem
 *   foi excluído, e os publicados são anonimizados.
 *
 * Tudo no `tx` do recibo de `mensagem_processada`: entrega repetida não tem
 * efeito (RNF-ERR-06), e erro cai no retry e na DLQ do runtime (RNF-ERR-07).
 * As capas são apagadas antes do commit; se a transação falhar, a reentrega
 * tenta de novo e o Cloudinary responde "not found", que conta como sucesso.
 */
@Injectable()
export class ContaExcluidaConsumer implements OnModuleInit {
  private readonly logger = new Logger(ContaExcluidaConsumer.name);

  constructor(
    private readonly consumidor: AmqpConsumerService,
    private readonly validador: MessageValidator,
    private readonly remocaoDeAsset: RemocaoDeAsset,
    private readonly notas: NotaDosLeitoresRepository,
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
    const { usuarioId } = envelope.data as { usuarioId: string };

    const capas = (await tx.execute(sql`
      SELECT capa_asset_id
        FROM acervo.livro
       WHERE tipo = 'pessoal' AND dono_id = ${usuarioId}
         AND capa_asset_id IS NOT NULL
    `)) as unknown as Linhas<{ capa_asset_id: string }>;
    for (const { capa_asset_id } of capas.rows) {
      await this.remocaoDeAsset.apagar(capa_asset_id);
    }

    const votados = (await tx.execute(sql`
      SELECT livro_id FROM acervo.nota_leitor_projecao
       WHERE usuario_id = ${usuarioId}
    `)) as unknown as Linhas<{ livro_id: string }>;
    const livros = votados.rows.map((linha) => linha.livro_id);
    if (livros.length > 0) {
      // Trava, apaga e recalcula do zero o agregado dos livros afetados; livro
      // sem nenhuma nota restante fica sem linha (o CHECK exige quantidade > 0).
      await this.notas.travar(tx, livros);
      await tx.execute(sql`
        DELETE FROM acervo.nota_leitor_projecao
         WHERE usuario_id = ${usuarioId}
      `);
      await this.notas.recalcularAgregados(tx, livros);
    }

    await tx.execute(sql`
      DELETE FROM acervo.importacao_livro WHERE solicitante_id = ${usuarioId}
    `);
    await tx.execute(sql`
      DELETE FROM acervo.livro
       WHERE tipo = 'pessoal' AND dono_id = ${usuarioId}
    `);

    await tx.execute(sql`
      UPDATE acervo.idempotencia_acervo
         SET subject_ref = NULL, chave = NULL, payload_hash = NULL,
             resposta = NULL, anonimizado_em = now()
       WHERE subject_ref = ${usuarioId} AND anonimizado_em IS NULL
    `);

    // A outbox não tem coluna de usuário: a busca é textual.
    const padrao = `%${usuarioId}%`;
    await tx.execute(sql`
      DELETE FROM acervo.outbox_acervo
       WHERE status = 'pendente'
         AND (payload::text LIKE ${padrao} OR chave_negocio LIKE ${padrao})
    `);
    await tx.execute(sql`
      UPDATE acervo.outbox_acervo
         SET chave_negocio = NULL, correlation_id = NULL, payload = NULL,
             anonimizado_em = now()
       WHERE status = 'publicado' AND anonimizado_em IS NULL
         AND (payload::text LIKE ${padrao} OR chave_negocio LIKE ${padrao})
    `);

    this.logger.log(
      `Dados da conta excluída removidos do acervo (evento ${envelope.eventId})`,
    );
  }
}
