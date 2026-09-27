import { createHash } from 'node:crypto';

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
