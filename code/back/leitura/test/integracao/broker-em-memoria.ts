import type { ConsumeMessage, Options } from 'amqplib';
import type { AmqpConnectionService } from '../../src/messaging/amqp-connection.service';

type Callback = (mensagem: ConsumeMessage | null) => unknown;

export class BrokerEmMemoria {
  private readonly bindings: {
    exchange: string;
    chave: string;
    fila: string;
  }[] = [];
  private readonly consumidores = new Map<string, Callback>();
  readonly filas = new Map<string, ConsumeMessage[]>();
  readonly acks: ConsumeMessage[] = [];
  readonly nacks: ConsumeMessage[] = [];

  readonly canal = {
    assertExchange: async () => undefined,
    assertQueue: async (fila: string) => {
      if (!this.filas.has(fila)) this.filas.set(fila, []);
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
    nack: (mensagem: ConsumeMessage) => this.nacks.push(mensagem),
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
      for (const b of this.bindings) {
        if (b.exchange === exchange && b.chave === chave) {
          this.filas.get(b.fila)?.push(mensagem);
        }
      }
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

  async entregar(fila: string): Promise<void> {
    const pendentes = this.filas.get(fila) ?? [];
    this.filas.set(fila, []);
    const consumidor = this.consumidores.get(fila);
    if (!consumidor) throw new Error(`fila ${fila} sem consumidor`);
    await Promise.all(pendentes.map((m) => consumidor(m)));
  }

  async reentregar(fila: string, mensagem: ConsumeMessage): Promise<void> {
    await this.consumidores.get(fila)?.(mensagem);
  }
}
