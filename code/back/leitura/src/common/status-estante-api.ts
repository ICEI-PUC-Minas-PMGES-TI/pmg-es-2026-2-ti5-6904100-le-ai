import type { StatusEstante } from '../leituras/dominio/maquina-estados';

/** `StatusEstante` do contrato: maiúsculo na API, minúsculo no banco. */
export const STATUS_ESTANTE_API = [
  'QUERO_LER',
  'LENDO',
  'LIDO',
  'RELENDO',
  'ABANDONADO',
] as const;
export type StatusEstanteApi = (typeof STATUS_ESTANTE_API)[number];

export function statusParaApi(status: StatusEstante): StatusEstanteApi {
  return status.toUpperCase() as StatusEstanteApi;
}

export function statusParaBanco(status: StatusEstanteApi): StatusEstante {
  return status.toLowerCase() as StatusEstante;
}
