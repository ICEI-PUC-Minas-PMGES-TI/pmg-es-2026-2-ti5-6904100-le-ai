import { ref } from 'vue'

/**
 * Aviso que precisa atravessar uma navegação: excluir a lista fecha o formulário e volta ao
 * índice, que mostra `Lista excluída.` (criar-lista.md §4.8). Singleton de módulo, como
 * `session.ts`; quem chega consome e limpa.
 */
const pendente = ref<string | null>(null)

export function deixarAviso(texto: string): void {
  pendente.value = texto
}

export function consumirAviso(): string | null {
  const texto = pendente.value
  pendente.value = null
  return texto
}
