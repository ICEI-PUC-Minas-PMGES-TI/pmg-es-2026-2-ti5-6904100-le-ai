import { EntidadeInvalida } from '../common/erros-de-negocio';

/**
 * RN-06: onze valores permitidos, de 0 a 5 em passos de 0,5. Nota zero é
 * válida e distinta de nota ausente.
 *
 * Chega aqui um número já validado pelo DTO (texto, nulo ou ausente é 400).
 * Número fora da escala é regra de negócio: 422 com `campos`.
 */
export function validarValorDaNota(valor: number): void {
  if (valor < 0 || valor > 5 || !Number.isInteger(valor * 2)) {
    throw new EntidadeInvalida([
      { campo: 'valor', mensagem: 'Use uma nota de 0 a 5, em passos de 0,5.' },
    ]);
  }
}
