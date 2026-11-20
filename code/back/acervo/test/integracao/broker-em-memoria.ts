import type { ConsumeMessage, Options } from 'amqplib';
import type { AmqpConnectionService } from '../../src/messaging/amqp-connection.service';

type Callback = (mensagem: ConsumeMessage | null) => unknown;

/**
 * Broker AMQP mínimo para os testes de integração: guarda o que o publisher
 * real publica e entrega ao consumidor real pelas bindings que ele declarou.
 * Não simula rede, redelivery automático nem TTL — só o suficiente para provar
 * que envelope, headers e roteamento produzidos por um lado são aceitos pelo
 * outro, e o que cada entrega terminou com `ack` ou `nack`.
 *
 * Dead-letter como o RabbitMQ (L-15, 16/11/2026): guarda os `arguments` de cada
 * fila e o `requeue` de cada `nack`. Com `requeue=false`, a mensagem vai pela
 * `x-dead-letter-exchange` da fila de origem, com a `x-dead-letter-routing-key`
 * (ou a chave original), e chega na fila ligada a ela (a `.dlq`). Com
 * `requeue=true` (o padrão do amqplib), volta para a fila de origem.
 */
export class BrokerEmMemoria {
  private readonly bindings: {
    exchange: string;
    chave: string;
    fila: string;
  }[] = [];
  private readonly consumidores = new Map<string, Callback>();
  /** Fila de onde saiu cada mensagem entregue, para o dead-letter do `nack`. */
  private readonly origem = new WeakMap<ConsumeMessage, string>();
  readonly filas = new Map<string, ConsumeMessage[]>();
  /** `arguments` de cada fila declarada (`x-dead-letter-exchange` e afins). */
  readonly argumentos = new Map<string, Record<string, unknown>>();
  readonly acks: ConsumeMessage[] = [];
  readonly nacks: ConsumeMessage[] = [];
  /** O `requeue` de cada `nack`, na mesma ordem de `nacks`. */
  readonly requeues: boolean[] = [];

  readonly canal = {
    assertExchange: async () => undefined,
    assertQueue: async (fila: string, opcoes?: Options.AssertQueue) => {
      if (!this.filas.has(fila)) this.filas.set(fila, []);
      if (opcoes?.arguments) this.argumentos.set(fila, opcoes.arguments);
    },
    bindQueue: async (fila: string, exchange: string, chave: string) => {
      this.bindings.push({ exchange, chave, fila });
    },
    prefetch: async () => undefined,
    consume: async (fila: string, callback: Callback) => {
      this.consumidores.set(fila, callback);
      return { consumerTag: fila };
    },
    ack: (mensagem: ConsumeMessage) => this.acks.push(mensagem),
    nack: (mensagem: ConsumeMessage, _todasAte = false, requeue = true) => {
      this.nacks.push(mensagem);
      this.requeues.push(requeue);
      const fila = this.origem.get(mensagem);
      if (fila === undefined) return;
      if (requeue) {
        this.filas.get(fila)?.push(mensagem);
        return;
      }
      const argumentos = this.argumentos.get(fila) ?? {};
      const dlx = argumentos['x-dead-letter-exchange'];
      if (typeof dlx !== 'string') return; // sem DLX, o broker descarta
      const chave = argumentos['x-dead-letter-routing-key'];
      this.rotear(
        dlx,
        typeof chave === 'string' ? chave : mensagem.fields.routingKey,
        mensagem,
      );
    },
    publish: (
      exchange: string,
      chave: string,
      conteudo: Buffer,
      opcoes: Options.Publish,
      confirmado: (erro: Error | null) => void,
    ) => {
      const mensagem = {
        content: conteudo,
        fields: { exchange, routingKey: chave, redelivered: false },
        properties: {
          ...opcoes,
          deliveryMode: opcoes.persistent ? 2 : 1,
          headers: opcoes.headers ?? {},
        },
      } as unknown as ConsumeMessage;
      this.rotear(exchange, chave, mensagem);
      confirmado(null);
      return true;
    },
  };

  readonly conexao = {
    isEnabled: () => true,
    onPublisherReady: () => undefined,
    onConsumerReady: (pronto: (canal: unknown) => void) => pronto(this.canal),
    getPublisherChannel: () => this.canal,
    getConsumerChannelIfReady: () => this.canal,
  } as unknown as AmqpConnectionService;

  private rotear(exchange: string, chave: string, mensagem: ConsumeMessage) {
    for (const b of this.bindings) {
      if (b.exchange === exchange && b.chave === chave) {
        this.filas.get(b.fila)?.push(mensagem);
      }
    }
  }

  /** Entrega tudo que está na fila ao consumidor e espera terminar. */
  async entregar(fila: string): Promise<void> {
    const pendentes = this.filas.get(fila) ?? [];
    this.filas.set(fila, []);
    const consumidor = this.consumidores.get(fila);
    if (!consumidor) throw new Error(`fila ${fila} sem consumidor`);
    for (const m of pendentes) this.origem.set(m, fila);
    await Promise.all(pendentes.map((m) => consumidor(m)));
  }

  /** Reentrega a mesma mensagem, como o broker faz após queda do consumidor. */
  async reentregar(fila: string, mensagem: ConsumeMessage): Promise<void> {
    this.origem.set(mensagem, fila);
    await this.consumidores.get(fila)?.(mensagem);
  }
}
