import { createHash } from 'node:crypto';

/**
 * Hash canônico do payload de uma escrita idempotente (RNF-ERR-04).
 *
 * `JSON.stringify` puro não serve: ele preserva a ordem de inserção das chaves,
 * então `{a:1,b:2}` e `{b:2,a:1}` — o mesmo pedido, serializado por dois
 * clientes diferentes — gerariam hashes diferentes e o replay viraria um 409
 * espúrio. Aqui as chaves são ordenadas recursivamente antes de serializar.
 *
 * `undefined` e uma chave ausente colapsam no mesmo valor, como no JSON; já
 * `null` é distinto de ausente, e precisa ser: num PATCH, `campo: null` limpa o
 * valor e o campo ausente o preserva.
 */
export function hashDoPayload(payload: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalizar(payload)).digest('hex')}`;
}

export function canonicalizar(valor: unknown): string {
  if (valor === null) {
    return 'null';
  }
  if (Array.isArray(valor)) {
    return `[${valor.map(canonicalizar).join(',')}]`;
  }
  if (typeof valor === 'object') {
    const entradas = Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([chave, v]) => `${JSON.stringify(chave)}:${canonicalizar(v)}`);
    return `{${entradas.join(',')}}`;
  }
  if (valor === undefined) {
    return 'null';
  }
  return JSON.stringify(valor);
}
