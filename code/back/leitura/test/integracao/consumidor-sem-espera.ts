import { AmqpConsumerService } from '../../src/messaging/amqp-consumer.service';

/**
 * Consumidor genérico de P0-MSG com retry de 1 ms: o caminho até a DLQ é o de
 * produção, sem os `1/5/15 s` de espera real no teste.
 */
export class ConsumidorSemEspera extends AmqpConsumerService {
  protected override retryDelays(): readonly number[] {
    return [1, 1, 1];
  }
}
