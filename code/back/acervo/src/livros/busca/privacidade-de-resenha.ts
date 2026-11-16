/**
 * RN-08 na lista de resenhas de outros leitores da página do livro oficial
 * (F-ACV-BUSCA): a resenha aparece se o perfil do autor é público, ou se é
 * privado e o leitor o segue com seguimento aceito. A resenha do próprio leitor
 * nunca entra nessa lista.
 *
 * O `ResenhasRepository` continua filtrando no SQL, por causa do `LIMIT` e do
 * cursor, e aplica esta função em cada linha como guarda final. Assim a regra
 * fica testável sem banco e roda em produção.
 *
 * `privacidade` vem de `identidade.v_perfil_referencia_v1`, que já omite conta
 * suspensa e em exclusão. Autor ausente da VIEW chega como `null` e não aparece.
 */
export interface AcessoAResenhaDeOutroLeitor {
  leitorId: string;
  autorId: string;
  privacidade: string | null;
  segue: boolean;
}

export function podeVerResenhaDeOutroLeitor(
  acesso: AcessoAResenhaDeOutroLeitor,
): boolean {
  if (acesso.autorId === acesso.leitorId) return false;
  if (acesso.privacidade === 'publico') return true;
  if (acesso.privacidade === 'privado') return acesso.segue === true;
  return false;
}
