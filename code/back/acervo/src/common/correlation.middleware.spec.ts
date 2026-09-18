import { ehCorrelationIdValido } from './correlation.middleware';

describe('ehCorrelationIdValido', () => {
  // A regra existe por causa de `outbox_acervo.correlation_id`, que é
  // `uuid NOT NULL`: um header fora do formato derrubaria a transação do 202.
  it('aceita UUID', () => {
    expect(ehCorrelationIdValido('16aa3308-daee-4638-b220-c306484f6a9c')).toBe(
      true,
    );
  });

  it('aceita UUID em maiúsculas e com espaços em volta', () => {
    expect(
      ehCorrelationIdValido('  16AA3308-DAEE-4638-B220-C306484F6A9C '),
    ).toBe(true);
  });

  it.each([
    'abc',
    '',
    '16aa3308daee4638b220c306484f6a9c',
    "'; DROP TABLE livro; --",
  ])('recusa %p', (valor) => {
    expect(ehCorrelationIdValido(valor)).toBe(false);
  });

  it('recusa ausente', () => {
    expect(ehCorrelationIdValido(undefined)).toBe(false);
  });
});
