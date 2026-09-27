import { computed, ref } from 'vue'

import { leituraService, type LeituraService, type ResenhaDoPerfil } from '../services/leitura'

export const RESENHAS_POR_PAGINA = 5

/**
 * Resenhas de um perfil (RF-SOC-02, composição de F-AVA): a primeira página e as seguintes por
 * "Ver mais resenhas". A autorização de RN-08 é do servidor; quem usa só não mostra a seção
 * quando o perfil é restrito.
 */
export function useResenhasDoPerfil(opcoes: { servico?: LeituraService } = {}) {
  const servico = opcoes.servico ?? leituraService

  const estado = ref<'carregando' | 'pronta' | 'erro'>('carregando')
  const itens = ref<ResenhaDoPerfil[]>([])
  const pagina = ref(0)
  const totalPaginas = ref(0)
  const carregandoMais = ref(false)
  let usuarioId = ''

  const temMais = computed(() => pagina.value < totalPaginas.value)

  async function carregar(id: string = usuarioId): Promise<void> {
    usuarioId = id
    estado.value = 'carregando'
    try {
      const resposta = await servico.listarResenhasPerfil(id, 1, RESENHAS_POR_PAGINA)
      itens.value = resposta.itens
      pagina.value = 1
      totalPaginas.value = resposta.paginacao.totalPaginas
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
    try {
      const resposta = await servico.listarResenhasPerfil(usuarioId, pagina.value + 1, RESENHAS_POR_PAGINA)
      const vistos = new Set(itens.value.map((item) => item.id))
      itens.value = [...itens.value, ...resposta.itens.filter((item) => !vistos.has(item.id))]
      pagina.value += 1
      totalPaginas.value = resposta.paginacao.totalPaginas
    } catch {
      // Fica na página atual; o botão continua disponível para tentar de novo.
    } finally {
      carregandoMais.value = false
    }
  }

  return { estado, itens, temMais, carregandoMais, carregar, carregarMais }
}
