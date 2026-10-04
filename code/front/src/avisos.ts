import { readonly, ref, type Component } from 'vue'

// O design não fixa a permanência; 6 s dá para ler duas linhas sem prender a tela.
export const DURACAO_DO_AVISO_MS = 6_000

export interface Aviso {
  id: number
  texto: string
  icone: Component
}

const atual = ref<Aviso | null>(null)
let proximoId = 0
let temporizador: ReturnType<typeof setTimeout> | undefined

export const aviso = readonly(atual)

export function mostrarAviso(texto: string, icone: Component): void {
  clearTimeout(temporizador)
  atual.value = { id: ++proximoId, texto, icone }
  temporizador = setTimeout(fecharAviso, DURACAO_DO_AVISO_MS)
}

export function fecharAviso(): void {
  clearTimeout(temporizador)
  atual.value = null
}
