import { ref } from 'vue'

import { perfilService, type Privacidade } from '../services/perfil'

/**
 * Privacidade do próprio perfil, para as linhas de visibilidade de F-LST (a lista segue o
 * perfil, RN-08). O `social` não devolve a privacidade do dono, então vem do `identidade`, uma vez
 * por sessão de página. Sem resposta, a linha some: melhor não dizer nada do que dizer errado.
 */
const privacidade = ref<Privacidade | null>(null)
let pedido: Promise<void> | null = null

export function useMinhaPrivacidade() {
  if (!pedido) {
    pedido = perfilService
      .obterMeuPerfil()
      .then((perfil) => {
        privacidade.value = perfil.privacidade
      })
      .catch(() => {
        pedido = null
      })
  }
  return privacidade
}

/** Depois de editar o perfil, ou entre testes. */
export function esquecerMinhaPrivacidade(): void {
  privacidade.value = null
  pedido = null
}
