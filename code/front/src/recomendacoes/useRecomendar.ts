import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import { ApiError, novaChaveIdempotencia } from '../services/api'
import {
  socialService,
  type CandidatoARecomendacao,
  type MotivoBloqueio,
  type ResultadoRecomendacao,
  type SocialService,
} from '../services/social'
import { contagem } from '../perfil/textos'

export const LIMITE_DA_MENSAGEM = 280
const LIMITE_DO_COLD_START_MS = 3_000
const HTTP_MUITAS_REQUISICOES = 429

export type EstadoDosLeitores = 'carregando' | 'pronta' | 'erro'
export type FalhaDoEnvio = 'conexao' | 'frequencia'

export type SituacaoDoLeitor =
  | { tipo: 'disponivel' }
  | { tipo: 'enviada' }
  | { tipo: 'indisponivel'; motivo: MotivoBloqueio }

export interface ResultadoDoEnvio {
  concluido: boolean
  /** Texto do aviso de confirmação, quando todos os escolhidos receberam. */
  aviso: string | null
}

export interface OpcoesDoRecomendar {
  servico?: Pick<SocialService, 'listarCandidatos' | 'recomendar'>
}

const SEGUNDA_FRASE: Record<MotivoBloqueio, string> = {
  JA_TEM_LIVRO: 'já tem esse livro em sua estante e não recebeu.',
  LIMITE_ATINGIDO: 'atingiu o limite de recomendações suas e não recebeu.',
  SEM_MUTUO: 'não segue mais você de volta e não recebeu.',
  JA_RECOMENDADO: 'já tem uma recomendação sua deste livro e não recebeu.',
}

export function listaDeNomes(nomes: string[]): string {
  if (nomes.length <= 1) {
    return nomes[0] ?? ''
  }
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

export function avisoDeEnviada(nomes: string[]): string {
  return nomes.length >= 3
    ? `Recomendação enviada para ${contagem(nomes.length, 'leitor', 'leitores')}.`
    : `Recomendação enviada para ${listaDeNomes(nomes)}.`
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim()
}

export function useRecomendar(livroId: string, opcoes: OpcoesDoRecomendar = {}) {
  const servico = opcoes.servico ?? socialService

  const estado = ref<EstadoDosLeitores>('carregando')
  const coldStart = ref(false)
  const candidatos = shallowRef<CandidatoARecomendacao[]>([])
  const selecionados = ref<string[]>([])
  const enviadas = ref<string[]>([])
  const bloqueadosNoEnvio = ref<Record<string, MotivoBloqueio>>({})
  const busca = ref('')
  const mensagem = ref('')
  const enviando = ref(false)
  const falha = ref<FalhaDoEnvio | null>(null)
  const avisoParcial = ref<string | null>(null)

  let limiteDoColdStart: ReturnType<typeof setTimeout> | undefined
  let chave: { payload: string; valor: string } | null = null

  const caracteres = computed(() => [...mensagem.value].length)
  const mensagemExcede = computed(() => caracteres.value > LIMITE_DA_MENSAGEM)
  const semMutuos = computed(() => estado.value === 'pronta' && candidatos.value.length === 0)
  const alterado = computed(() => selecionados.value.length > 0 || mensagem.value.trim() !== '')
  const podeEnviar = computed(() => selecionados.value.length > 0 && !mensagemExcede.value && !enviando.value)
  const podeConcluir = computed(() => enviadas.value.length > 0 && selecionados.value.length === 0)

  const filtrados = computed(() => {
    const termo = normalizar(busca.value.replace(/^@/, ''))
    if (!termo) {
      return candidatos.value
    }
    return candidatos.value.filter(
      ({ leitor }) => normalizar(leitor.nomeExibicao).includes(termo) || normalizar(leitor.username).includes(termo),
    )
  })

  function situacao(candidato: CandidatoARecomendacao): SituacaoDoLeitor {
    const id = candidato.leitor.id
    if (enviadas.value.includes(id)) {
      return { tipo: 'enviada' }
    }
    const noEnvio = bloqueadosNoEnvio.value[id]
    if (noEnvio) {
      return { tipo: 'indisponivel', motivo: noEnvio }
    }
    if (candidato.jaTemLivro) {
      return { tipo: 'indisponivel', motivo: 'JA_TEM_LIVRO' }
    }
    if (candidato.limiteAtingido) {
      return { tipo: 'indisponivel', motivo: 'LIMITE_ATINGIDO' }
    }
    return { tipo: 'disponivel' }
  }

  function alternar(candidato: CandidatoARecomendacao): void {
    if (situacao(candidato).tipo !== 'disponivel') {
      return
    }
    const id = candidato.leitor.id
    selecionados.value = selecionados.value.includes(id)
      ? selecionados.value.filter((outro) => outro !== id)
      : [...selecionados.value, id]
  }

  function pararColdStart(): void {
    clearTimeout(limiteDoColdStart)
    coldStart.value = false
  }

  async function carregar(): Promise<void> {
    estado.value = 'carregando'
    limiteDoColdStart = setTimeout(() => {
      coldStart.value = true
    }, LIMITE_DO_COLD_START_MS)
    try {
      candidatos.value = await servico.listarCandidatos(livroId)
      estado.value = 'pronta'
    } catch {
      estado.value = 'erro'
    } finally {
      pararColdStart()
    }
  }

  function nomeDe(id: string): string {
    return candidatos.value.find(({ leitor }) => leitor.id === id)?.leitor.nomeExibicao ?? ''
  }

  function chaveDoEnvio(payload: string): string {
    if (chave?.payload !== payload) {
      chave = { payload, valor: novaChaveIdempotencia() }
    }
    return chave.valor
  }

  function aplicarResultado({ resultados }: ResultadoRecomendacao): ResultadoDoEnvio {
    const criadas = resultados.filter((r) => r.status === 'CRIADA').map((r) => r.destinatarioId)
    const bloqueadas = resultados.filter((r) => r.status === 'BLOQUEADA' && r.motivo !== null)
    selecionados.value = []
    chave = null
    if (bloqueadas.length === 0) {
      return { concluido: true, aviso: avisoDeEnviada(criadas.map(nomeDe)) }
    }
    enviadas.value = [...enviadas.value, ...criadas]
    bloqueadosNoEnvio.value = {
      ...bloqueadosNoEnvio.value,
      ...Object.fromEntries(bloqueadas.map((r) => [r.destinatarioId, r.motivo!])),
    }
    const frases = criadas.length > 0 ? [`Recomendação enviada para ${listaDeNomes(criadas.map(nomeDe))}.`] : []
    for (const r of bloqueadas) {
      frases.push(`${nomeDe(r.destinatarioId)} ${SEGUNDA_FRASE[r.motivo!]}`)
    }
    avisoParcial.value = frases.join(' ')
    return { concluido: false, aviso: null }
  }

  async function enviar(): Promise<ResultadoDoEnvio> {
    if (!podeEnviar.value) {
      return { concluido: false, aviso: null }
    }
    const texto = mensagem.value.trim()
    const dados = {
      livroId,
      destinatarios: [...selecionados.value],
      ...(texto ? { mensagem: texto } : {}),
    }
    enviando.value = true
    falha.value = null
    avisoParcial.value = null
    try {
      return aplicarResultado(await servico.recomendar(dados, chaveDoEnvio(JSON.stringify(dados))))
    } catch (erro) {
      falha.value = erro instanceof ApiError && erro.status === HTTP_MUITAS_REQUISICOES ? 'frequencia' : 'conexao'
      return { concluido: false, aviso: null }
    } finally {
      enviando.value = false
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(pararColdStart)
  }

  return {
    estado,
    coldStart,
    candidatos,
    filtrados,
    selecionados,
    busca,
    mensagem,
    caracteres,
    mensagemExcede,
    semMutuos,
    alterado,
    podeEnviar,
    podeConcluir,
    enviando,
    falha,
    avisoParcial,
    situacao,
    alternar,
    carregar,
    enviar,
  }
}
