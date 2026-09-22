export const EXCHANGES = {
  identidade: 'leai.events.identidade',
  acervo: 'leai.events.acervo',
  leitura: 'leai.events.leitura',
  social: 'leai.events.social',
  deadLetter: 'leai.dead-letter',
} as const;

export const PING_QUEUE = 'leai.p0.ping';
export const PING_DLQ = `${PING_QUEUE}.dlq`;
export const PING_TYPE = 'ping.teste';
export const PING_CONSUMER = 'acervo.p0.ping';

export const RETRY_DELAYS_MS = [1_000, 5_000, 15_000] as const;

export function deadLetterArguments(queue: string): Record<string, string> {
  return {
    'x-dead-letter-exchange': EXCHANGES.deadLetter,
    'x-dead-letter-routing-key': queue,
  };
}
