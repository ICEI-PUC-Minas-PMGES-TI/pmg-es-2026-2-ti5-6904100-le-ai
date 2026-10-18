import { Writable } from 'node:stream';
import pino from 'pino';
import { REDACAO_DO_LOG } from './redacao-do-log';

describe('redação do log (RNF-SEC-36)', () => {
  it('tira o token da moderação, o do agendador e o bearer dos cabeçalhos logados', () => {
    const linhas: string[] = [];
    const destino = new Writable({
      write(pedaco: Buffer, _codificacao, pronto) {
        linhas.push(pedaco.toString('utf8'));
        pronto();
      },
    });
    const log = pino({ redact: REDACAO_DO_LOG }, destino);

    log.info({
      req: {
        headers: {
          authorization: 'Bearer segredo-do-leitor',
          'x-moderacao-token': 'segredo-da-moderacao',
          'x-scheduler-token': 'segredo-do-agendador',
          'idempotency-key': 'fica',
        },
      },
    });

    const linha = linhas.join('');
    expect(linha).not.toContain('segredo');
    expect(linha).toContain('idempotency-key');
  });
});
