import { ref, shallowRef } from 'vue'

import { moderacaoService, type ModeracaoService, type RegistroDeModeracao } from '../services/moderacao'

export interface OpcoesDoRegistro {
  servico?: Pick<ModeracaoService, 'listarRegistros'>
}

/** Registro de auditoria (painel-de-moderacao.md §5.11): só leitura, da ação mais recente. */
export function useRegistroDeModeracao(opcoes: OpcoesDoRegistro = {}) {
  const servico = opcoes.servico ?? moderacaoService

  const estado = ref<'carregando' | 'pronta' | 'erro'>('carregando')
  const itens = shallowRef<RegistroDeModeracao[]>([])
  const proximoCursor = ref<string | null>(null)
  const temMais = ref(false)
  const carregandoMais = ref(false)
  const falhouMais = ref(false)

  async function carregar(): Promise<void> {
    estado.value = 'carregando'
    try {
      const pagina = await servico.listarRegistros()
      itens.value = pagina.itens
      proximoCursor.value = pagina.proximoCursor
      temMais.value = pagina.temMais
      estado.value = 'pronta'
    } catch {
      estado.value = 'erro'
    }
  }

  async function carregarMais(): Promise<void> {
    if (!temMais.value || carregandoMais.value) {
      return
    }
    carregandoMais.value = true
    falhouMais.value = false
    try {
      const pagina = await servico.listarRegistros(proximoCursor.value)
      itens.value = [...itens.value, ...pagina.itens]
      proximoCursor.value = pagina.proximoCursor
      temMais.value = pagina.temMais
    } catch {
      falhouMais.value = true
    } finally {
      carregandoMais.value = false
    }
  }

  return { estado, itens, temMais, carregandoMais, falhouMais, carregar, carregarMais }
}
