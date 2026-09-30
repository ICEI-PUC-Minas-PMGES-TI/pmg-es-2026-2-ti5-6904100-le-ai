/**
 * Validação do cliente para senha nova, comum a redefinir e alterar senha. Reforça a do servidor,
 * não substitui (RNF-SEC-13): a lista de senhas comuns só existe lá, e a mensagem dela chega no
 * erro da resposta. Mensagens de redefinir-senha.md e alterar-senha.md §8.
 */

export const SENHA_CURTA = 'Escolha uma senha com pelo menos 8 caracteres.'
export const SENHAS_DIFERENTES = 'As duas senhas precisam ser iguais.'

export function validarSenhaNova(nova: string, confirmacao: string): { nova: string; confirmacao: string } {
  const erroNova = nova.length < 8 ? SENHA_CURTA : ''
  const erroConfirmacao = !erroNova && nova !== confirmacao ? SENHAS_DIFERENTES : ''
  return { nova: erroNova, confirmacao: erroConfirmacao }
}
