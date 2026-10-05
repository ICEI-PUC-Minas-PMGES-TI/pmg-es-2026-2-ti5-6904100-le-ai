import { onBeforeUnmount, ref, watchEffect } from 'vue'

/**
 * Rótulo do link de retorno da web que só a tela conhece (`Listas de Rafael`, `Perfil de
 * Beatriz`: o nome vem da resposta, não da rota). Sem ele, vale `meta.voltarComRotulo`. Singleton
 * de módulo, como `session.ts`; a tela que define limpa ao sair.
 */
const rotulo = ref<string | null>(null)

export function rotuloVoltarDaTela() {
  return rotulo
}

/** Liga o rótulo ao valor reativo da tela enquanto ela estiver montada. */
export function usarRotuloVoltar(fonte: () => string | null): void {
  watchEffect(() => {
    rotulo.value = fonte()
  })
  onBeforeUnmount(() => {
    rotulo.value = null
  })
}
