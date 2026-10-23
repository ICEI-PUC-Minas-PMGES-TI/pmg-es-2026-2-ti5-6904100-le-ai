/**
 * Token de acesso de mentira, com o formato de um JWT e o claim `papel` (F-MOD). A assinatura não
 * vale nada: o cliente lê o papel sem verificá-la, e quem decide é o servidor.
 */
export function tokenComPapel(papel: 'admin' | 'leitor', extras: Record<string, unknown> = {}): string {
  const base64url = (valor: object) =>
    btoa(JSON.stringify(valor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return [base64url({ alg: 'HS256', typ: 'JWT' }), base64url({ sub: 'u1', papel, ...extras }), 'assinatura'].join('.')
}
