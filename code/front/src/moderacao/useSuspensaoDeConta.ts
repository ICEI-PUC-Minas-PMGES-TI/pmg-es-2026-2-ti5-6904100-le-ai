import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'

import { ApiError, novaChaveIdempotencia } from '../services/api'
import { moderacaoService, type ContaModerada, type ModeracaoService } from '../services/moderacao'

/** Mesmo limite do motivo da denúncia, contado em code points (decisão 5 da F-MOD-OPC). */
export const LIMITE_DO_MOTIVO_DA_CONTA = 500
const LIMITE_DO_COLD_START_MS = 3_000
const HTTP_TEMPO_ESGOTADO = 504

export type AcaoSobreConta = 'suspender' | 'reativar'
/** `naoConfirmada`: timeout, o servidor pode já ter aplicado; `erro`: a mensagem do servidor. */
export type FalhaDaConta = { tipo: 'naoConfirmada' } | { tipo: 'erro'; mensagem: string }

export interface OpcoesDaSuspensao {
  servico?: Pick<ModeracaoService, 'suspenderConta' | 'reativarConta'>
}

/**
 * Suspender e reativar a conta do autor (F-MOD-OPC, painel-de-moderacao.md §7). Sem estado
 * otimista: só a confirmação do servidor conta. A falha mantém o motivo e a **mesma** chave de
 * idempotência enquanto o motivo não muda, para o reenvio não aplicar duas vezes; a chave só é
 * descartada no sucesso.
 */
export function useSuspensaoDeConta(
  acao: AcaoSobreConta,
  usuarioId: () => string,
  opcoes: OpcoesDaSuspensao = {},
) {
  const servico = opcoes.servico ?? moderacaoService

  const motivo = ref('')
  const enviando = ref(false)
  const coldStart = ref(false)
  const falha = ref<FalhaDaConta | null>(null)

  let temporizador: ReturnType<typeof setTimeout> | undefined
  let chave: { payload: string; valor: string } | null = null

  const caracteres = computed(() => [...motivo.value].length)
  const excede = computed(() => caracteres.value > LIMITE_DO_MOTIVO_DA_CONTA)
  const podeConfirmar = computed(() => motivo.value.trim() !== '' && !excede.value && !enviando.value)

  function chaveDoEnvio(payload: string): string {
    if (chave?.payload !== payload) {
      chave = { payload, valor: novaChaveIdempotencia() }
    }
    return chave.valor
  }

  function pararColdStart(): void {
    clearTimeout(temporizador)
    coldStart.value = false
  }

  /** A conta como o servidor confirmou, ou `null` se não confirmou. */
  async function confirmar(): Promise<ContaModerada | null> {
    if (!podeConfirmar.value) {
      return null
    }
    const texto = motivo.value.trim()
    const id = usuarioId()
    enviando.value = true
    falha.value = null
    temporizador = setTimeout(() => (coldStart.value = true), LIMITE_DO_COLD_START_MS)
    try {
      const chamar = acao === 'suspender' ? servico.suspenderConta : servico.reativarConta
      const conta = await chamar(id, texto, chaveDoEnvio(`${acao}:${id}:${texto}`))
      chave = null
      return conta
    } catch (erro) {
      const tempoEsgotado =
        erro instanceof ApiError
        && (erro.status === HTTP_TEMPO_ESGOTADO || erro.code === 'TEMPO_LIMITE_EXCEDIDO')
      falha.value = tempoEsgotado
        ? { tipo: 'naoConfirmada' }
        : {
            tipo: 'erro',
            mensagem: erro instanceof ApiError
              ? erro.message
              : 'Não foi possível acessar o servidor. Tente novamente.',
          }
      return null
    } finally {
      enviando.value = false
      pararColdStart()
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(pararColdStart)
  }

  return { motivo, enviando, coldStart, falha, caracteres, excede, podeConfirmar, confirmar }
}
