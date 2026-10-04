import { readonly, ref, type Component } from 'vue'

// O design não fixa a permanência; 6 s dá para ler duas linhas sem prender a tela.
export const DURACAO_DO_AVISO_MS = 6_000

export interface AcaoDoAviso {
  rotulo: string
  executar: () => void
}

export interface OpcoesDoAviso {
  icone?: Component
  tom?: 'confirmacao' | 'erro'
  acao?: AcaoDoAviso
}

export interface Aviso extends OpcoesDoAviso {
  id: number
  texto: string
}

const atual = ref<Aviso | null>(null)
let proximoId = 0
let temporizador: ReturnType<typeof setTimeout> | undefined

export const aviso = readonly(atual)

export function mostrarAviso(texto: string, opcoes: OpcoesDoAviso = {}): void {
  clearTimeout(temporizador)
  atual.value = { id: ++proximoId, texto, tom: 'confirmacao', ...opcoes }
  // Erro que some antes de ser lido não é acionável: ele fica até a pessoa agir ou fechar.
  if (atual.value.tom !== 'erro') {
    temporizador = setTimeout(fecharAviso, DURACAO_DO_AVISO_MS)
  }
}

export function fecharAviso(): void {
  clearTimeout(temporizador)
  atual.value = null
}
