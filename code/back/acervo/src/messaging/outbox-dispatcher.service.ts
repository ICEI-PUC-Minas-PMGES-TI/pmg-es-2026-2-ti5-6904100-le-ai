import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.module';
import { AmqpConnectionService } from './amqp-connection.service';
import { AmqpPublisherService } from './amqp-publisher.service';
import { type MessageEnvelope } from './message-validator';

interface OutboxRow {
  event_id: string;
  tipo: string;
  versao: number;
  chave_negocio: string;
  correlation_id: string;
  payload: Record<string, unknown>;
  tentativas: number;
  criado_em: Date;
  proxima_tentativa_em: Date | null;
}

@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private readonly nextAttemptAt = new Map<string, number>();

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly connection: AmqpConnectionService,
    private readonly publisher: AmqpPublisherService,
  ) {}

  onModuleInit(): void {
    if (!this.connection.isEnabled()) return;
    this.connection.onPublisherReady(() => this.start());
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async dispatchOnce(): Promise<void> {
    if (!this.connection.isEnabled()) return;
    await this.db.transaction(async (tx) => {
      const result = await tx.execute(sql`
        SELECT event_id, tipo, versao, chave_negocio, correlation_id,
               payload, tentativas, criado_em, proxima_tentativa_em
          FROM acervo.outbox_acervo
         WHERE status = 'pendente'
         ORDER BY criado_em
         LIMIT 50
         FOR UPDATE SKIP LOCKED
      `);
      const rows = (result as unknown as { rows: OutboxRow[] }).rows;
      for (const row of rows) {
        if (
          (row.proxima_tentativa_em?.getTime() ?? 0) > Date.now() ||
          (this.nextAttemptAt.get(row.event_id) ?? 0) > Date.now()
        ) {
          continue;
        }
        try {
          const envelope: MessageEnvelope = {
            eventId: row.event_id,
            type: row.tipo,
            version: row.versao,
            occurredAt: new Date(row.criado_em).toISOString(),
            correlationId: row.correlation_id,
            businessKey: row.chave_negocio,
            data: row.payload,
          };
          await this.publisher.publish(envelope);
          await tx.execute(sql`
             UPDATE acervo.outbox_acervo
                SET status = 'publicado', publicado_em = now(),
                    proxima_tentativa_em = NULL
             WHERE event_id = ${row.event_id} AND status = 'pendente'
          `);
          this.nextAttemptAt.delete(row.event_id);
        } catch (error) {
          const attempts = row.tentativas + 1;
          const delay = Math.min(
            60_000,
            1_000 * 2 ** Math.min(attempts - 1, 5),
          );
          this.nextAttemptAt.set(row.event_id, Date.now() + delay);
          await tx.execute(sql`
            UPDATE acervo.outbox_acervo
               SET tentativas = tentativas + 1,
                   proxima_tentativa_em = now() + make_interval(secs => ${delay / 1000})
             WHERE event_id = ${row.event_id} AND status = 'pendente'
          `);
          this.logger.warn(
            `Falha ao publicar ${row.event_id}; tentativa ${attempts}: ${this.errorMessage(error)}`,
          );
        }
      }
    });
  }

  private start(): void {
    if (this.timer) return;
    void this.dispatchOnce();
    this.timer = setInterval(() => void this.dispatchOnce(), 1_000);
    this.timer.unref();
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
