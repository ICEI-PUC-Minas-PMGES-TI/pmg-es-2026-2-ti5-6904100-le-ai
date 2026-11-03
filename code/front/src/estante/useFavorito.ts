import { ref } from 'vue'

import { ApiError, erroDoCliente, novaChaveIdempotencia } from '../services/api'
import { leituraService, type LeituraService } from '../services/leitura'

type ServicoDeFavorito = Pick<LeituraService, 'consultarFavorito' | 'marcarFavorito' | 'desmarcarFavorito'>

export function useFavorito(servico: ServicoDeFavorito = leituraService) {
  const favorito = ref<boolean | null>(null)
  const salvando = ref(false)
  const falhou = ref(false)

  let pendente: { livroId: string; alvo: boolean; chave: string } | null = null

  function definir(valor: boolean | null): void {
    favorito.value = valor
    falhou.value = false
  }

  async function carregar(livroId: string): Promise<void> {
    favorito.value = null
    try {
      favorito.value = (await servico.consultarFavorito(livroId)).favorito
    } catch (erro) {
      if (!(erro instanceof ApiError)) throw erro
      favorito.value = null
    }
  }

  function chaveDa(livroId: string, alvo: boolean): string {
    if (pendente?.livroId !== livroId || pendente.alvo !== alvo) {
      pendente = { livroId, alvo, chave: novaChaveIdempotencia() }
    }
    return pendente.chave
  }

  async function alternar(livroId: string): Promise<boolean | null> {
    if (salvando.value || favorito.value === null) return null
    const anterior = favorito.value
    const alvo = !anterior
    const chave = chaveDa(livroId, alvo)

    favorito.value = alvo
    falhou.value = false
    salvando.value = true
    try {
      if (alvo) await servico.marcarFavorito(livroId, chave)
      else await servico.desmarcarFavorito(livroId, chave)
      pendente = null
      return alvo
    } catch (erro) {
      favorito.value = anterior
      if (!(erro instanceof ApiError)) throw erro
      if (erroDoCliente(erro)) pendente = null
      falhou.value = true
      return null
    } finally {
      salvando.value = false
    }
  }

  return { favorito, salvando, falhou, definir, carregar, alternar }
}
