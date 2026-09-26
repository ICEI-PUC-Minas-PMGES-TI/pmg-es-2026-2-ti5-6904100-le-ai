import { operacaoCanonica } from './escopo-idempotente.decorator';

const LEITURA = '3f1a5c2e-9b7d-4f6a-8c1e-2d4b6a8e0f31';

describe('operacaoCanonica', () => {
  it('junta método e caminho', () => {
    expect(operacaoCanonica('post', '/estante')).toBe('POST /estante');
  });

  // A query não identifica o efeito de uma escrita; se entrasse, o mesmo
  // pedido reenviado com outro parâmetro de rastreio escaparia do replay.
  it('descarta a query', () => {
    expect(operacaoCanonica('POST', '/estante?origem=feed')).toBe(
      'POST /estante',
    );
  });

  it('ignora barra final e barras repetidas', () => {
    expect(operacaoCanonica('POST', `//leituras//${LEITURA}/finalizar/`)).toBe(
      `POST /leituras/${LEITURA}/finalizar`,
    );
  });

  it('não distingue maiúsculas no caminho, como o UUID do recurso', () => {
    expect(
      operacaoCanonica('POST', `/leituras/${LEITURA.toUpperCase()}/abandonar`),
    ).toBe(`POST /leituras/${LEITURA}/abandonar`);
  });

  // O id do recurso faz parte do escopo: a mesma chave em outra leitura é
  // outra operação, não um conflito.
  it('mantém recursos diferentes em escopos diferentes', () => {
    expect(operacaoCanonica('POST', '/leituras/a/finalizar')).not.toBe(
      operacaoCanonica('POST', '/leituras/b/finalizar'),
    );
  });

  it('mantém métodos diferentes em escopos diferentes', () => {
    expect(operacaoCanonica('POST', '/estante/x')).not.toBe(
      operacaoCanonica('DELETE', '/estante/x'),
    );
  });

  it('caminho raiz continua válido', () => {
    expect(operacaoCanonica('POST', '/')).toBe('POST /');
  });
});
