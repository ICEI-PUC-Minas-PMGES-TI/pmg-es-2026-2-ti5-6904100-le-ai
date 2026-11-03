import { createHash } from 'node:crypto';

/**
 * Assinatura das chamadas autenticadas da Upload API do Cloudinary: os
 * parâmetros em ordem alfabética, `chave=valor` unidos por `&`, o segredo no
 * fim e SHA-1 em hexadecimal. `file`, `api_key`, `resource_type` e `cloud_name`
 * não entram, e quem chama não os passa.
 *
 * Usada pela remoção de capa na exclusão de conta (`destroy`) e pelo upload do
 * cache de capas oficiais.
 */
export function assinar(
  parametros: Record<string, string | number>,
  segredo: string,
): string {
  const base = Object.keys(parametros)
    .sort()
    .map((chave) => `${chave}=${parametros[chave]}`)
    .join('&');
  return createHash('sha1')
    .update(base + segredo)
    .digest('hex');
}
