import { computed, getCurrentScope, onScopeDispose, ref } from 'vue'

import { ApiError, novaChaveIdempotencia } from '../services/api'
import { socialService, type CriarDenuncia, type SocialService } from '../services/social'

/** Limite do motivo (decisão do dono, 16/10/2026): 500 caracteres, contados em code points. */
export const LIMITE_DO_MOTIVO = 500
const LIMITE_DO_COLD_START_MS = 3_000
const HTTP_NAO_ENCONTRADO = 404
const HTTP_MUITAS_REQUISICOES = 429

export const MOTIVO_EM_BRANCO = 'Escreva o motivo da denúncia para continuar.'
export const MOTIVO_LONGO = 'O motivo passou do limite de 500 caracteres.'

/**
 * Conteúdo que se denuncia (RF-MOD-01), com o que o card do passo 1 mostra. `via` e
 * `referenciaId` só na resenha de livro pessoal (RN-15.4), como nas reações.
 */
export interface AlvoDaDenuncia {
  tipo: 'resenha' | 'comentario'
  id: string
  autorNome: string
  autorAvatarUrl: string | null
  livroTitulo: string
  texto: string
  spoiler?: boolean
  via?: 'feed' | 'lista'
  referenciaId?: string
}

/** `motivo` e `confirmar` são os dois passos; `indisponivel` é a recusa por falta de acesso. */
export type PassoDaDenuncia = 'motivo' | 'confirmar' | 'indisponivel' | 'descartar'
export type FalhaDaDenuncia = 'conexao' | 'frequencia'

export interface OpcoesDoDenunciar {
  servico?: Pick<SocialService, 'denunciar'>
}

/**
 * Estado da denúncia em dois passos no mesmo sheet ou dialog (denunciar.md §4): motivo, revisão
 * e envio. Tentar de novo depois de uma falha repete a **mesma** chave de idempotência
 * (RNF-ERR-04): se a primeira chegou, a moderação não recebe duas.
 */
export function useDenunciar(alvo: AlvoDaDenuncia, opcoes: OpcoesDoDenunciar = {}) {
  const servico = opcoes.servico ?? socialService

  const passo = ref<PassoDaDenuncia>('motivo')
  const motivo = ref('')
  const erroDoMotivo = ref<string | null>(null)
  const enviando = ref(false)
  const coldStart = ref(false)
  const falha = ref<FalhaDaDenuncia | null>(null)

  let limiteDoColdStart: ReturnType<typeof setTimeout> | undefined
  let chave: { payload: string; valor: string } | null = null

  const caracteres = computed(() => [...motivo.value].length)
  const excede = computed(() => caracteres.value > LIMITE_DO_MOTIVO)
  const escrito = computed(() => motivo.value.trim() !== '')

  function revisar(): boolean {
    if (!escrito.value) {
      erroDoMotivo.value = MOTIVO_EM_BRANCO
      return false
    }
    if (excede.value) {
      erroDoMotivo.value = MOTIVO_LONGO
      return false
    }
    erroDoMotivo.value = null
    falha.value = null
    passo.value = 'confirmar'
    return true
  }

  function voltarAoMotivo(): void {
    if (!enviando.value) {
      falha.value = null
      passo.value = 'motivo'
    }
  }

  /** O `X`, o `Esc` e o scrim: com motivo escrito, pergunta antes (denunciar.md §4.10). */
  function pedirFechar(): boolean {
    if (enviando.value) {
      return false
    }
    if (escrito.value && passo.value !== 'indisponivel' && passo.value !== 'descartar') {
      passo.value = 'descartar'
      return false
    }
    return true
  }

  function continuarEscrevendo(): void {
    passo.value = 'motivo'
  }

  function chaveDoEnvio(payload: string): string {
    if (chave?.payload !== payload) {
      chave = { payload, valor: novaChaveIdempotencia() }
    }
    return chave.valor
  }

  function pararColdStart(): void {
    clearTimeout(limiteDoColdStart)
    coldStart.value = false
  }

  /** `true` quando a denúncia foi registrada (ou já existia, pendente). */
  async function enviar(): Promise<boolean> {
    if (enviando.value) {
      return false
    }
    const dados: CriarDenuncia = {
      alvoTipo: alvo.tipo,
      alvoId: alvo.id,
      motivo: motivo.value.trim(),
      ...(alvo.via && alvo.referenciaId ? { via: alvo.via, referenciaId: alvo.referenciaId } : {}),
    }
    enviando.value = true
    falha.value = null
    limiteDoColdStart = setTimeout(() => {
      coldStart.value = true
    }, LIMITE_DO_COLD_START_MS)
    try {
      await servico.denunciar(dados, chaveDoEnvio(JSON.stringify(dados)))
      chave = null
      return true
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === HTTP_NAO_ENCONTRADO) {
        passo.value = 'indisponivel'
      } else {
        falha.value = erro instanceof ApiError && erro.status === HTTP_MUITAS_REQUISICOES ? 'frequencia' : 'conexao'
      }
      return false
    } finally {
      enviando.value = false
      pararColdStart()
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(pararColdStart)
  }

  return {
    passo,
    motivo,
    erroDoMotivo,
    enviando,
    coldStart,
    falha,
    caracteres,
    excede,
    escrito,
    revisar,
    voltarAoMotivo,
    pedirFechar,
    continuarEscrevendo,
    enviar,
  }
}
