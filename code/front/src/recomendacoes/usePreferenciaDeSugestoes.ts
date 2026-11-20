import { ref } from 'vue'

import { novaChaveIdempotencia } from '../services/api'
import { perfilService } from '../services/perfil'

/**
 * Opt-out das sugestões (F-REC-ALG, configuracoes.md do Período 3). A tela pergunta pelo sim,
 * `Usar minhas leituras em sugestões`, e o contrato guarda o não, `optOutRecomendacao`: `usar` é
 * a negação dele.
 *
 * Sem botão de salvar: o toque move o `switch` na hora e grava. Enquanto grava, outro toque não
 * faz nada. Se falhar, o `switch` volta e `erro` liga; tentar de novo é tocar outra vez, com a
 * mesma chave se o destino for o mesmo. Até `GET /me/perfil` responder, o estado é desconhecido
 * (`usar` nulo) e o toque não faz nada; se a leitura falhar, continua assim.
 */
export function usePreferenciaDeSugestoes() {
  const usar = ref<boolean | null>(null)
  const salvando = ref(false)
  const erro = ref(false)
  let pendente: { valor: boolean; chave: string } | null = null

  async function carregar(): Promise<void> {
    try {
      const perfil = await perfilService.obterMeuPerfil()
      usar.value = perfil.optOutRecomendacao !== true
    } catch {
      // A linha fica com o skeleton do `switch` e não responde, sem erro desenhado (§4.5).
    }
  }

  async function alternar(): Promise<void> {
    if (usar.value === null || salvando.value) {
      return
    }
    const anterior = usar.value
    const novo = !anterior
    const chave = pendente?.valor === novo ? pendente.chave : novaChaveIdempotencia()
    pendente = { valor: novo, chave }
    usar.value = novo
    salvando.value = true
    try {
      const perfil = await perfilService.definirOptOutRecomendacao(!novo, chave)
      usar.value = perfil.optOutRecomendacao !== true
      erro.value = false
      pendente = null
    } catch {
      usar.value = anterior
      erro.value = true
    } finally {
      salvando.value = false
    }
  }

  return { usar, salvando, erro, carregar, alternar }
}
