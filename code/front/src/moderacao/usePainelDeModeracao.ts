import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import { ApiError, novaChaveIdempotencia } from '../services/api'
import {
  moderacaoService,
  type DenunciaPendente,
  type ModeracaoService,
  type ResultadoModeracao,
} from '../services/moderacao'

const LIMITE_DO_COLD_START_MS = 3_000

export type EstadoDaFila = 'carregando' | 'pronta' | 'erro'
export type AcaoEmCurso = 'arquivar' | 'remover' | null

export interface OpcoesDoPainel {
  servico?: Pick<ModeracaoService, 'listarDenuncias' | 'arquivar' | 'remover'>
  /** Chamada quando uma ação fecha denúncias: o registro de auditoria ganhou uma linha. */
  aoResolver?: () => void
}

/**
 * Fila e ações do painel de moderação (painel-de-moderacao.md §5). A fila é por cursor e encolhe
 * a cada ação: as denúncias que o servidor fechou saem, e a seleção vai para a próxima.
 *
 * Remover repete a **mesma** chave até dar certo (RNF-ERR-04): depois de um 504 o servidor pode já
 * ter removido, e o reenvio não remove duas vezes (§5.5).
 */
export function usePainelDeModeracao(opcoes: OpcoesDoPainel = {}) {
  const servico = opcoes.servico ?? moderacaoService

  const estado = ref<EstadoDaFila>('carregando')
  const coldStart = ref(false)
  const fila = shallowRef<DenunciaPendente[]>([])
  const proximoCursor = ref<string | null>(null)
  const temMais = ref(false)
  const carregandoMais = ref(false)
  const falhouMais = ref(false)
  const selecionadaId = ref<string | null>(null)
  const acao = ref<AcaoEmCurso>(null)
  const coldStartDaAcao = ref(false)
  const naoConfirmada = ref(false)
  const erroDaAcao = ref<string | null>(null)
  const aviso = ref<{ texto: string; icone: 'arquivar' | 'remover' } | null>(null)

  const chavesDeRemocao = new Map<string, string>()
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let temporizadorDaAcao: ReturnType<typeof setTimeout> | undefined

  const selecionada = computed(() => fila.value.find((d) => d.id === selecionadaId.value) ?? null)

  function pararColdStart(): void {
    clearTimeout(temporizador)
    coldStart.value = false
  }

  function pararColdStartDaAcao(): void {
    clearTimeout(temporizadorDaAcao)
    coldStartDaAcao.value = false
  }

  async function carregar(): Promise<void> {
    estado.value = 'carregando'
    temporizador = setTimeout(() => (coldStart.value = true), LIMITE_DO_COLD_START_MS)
    try {
      const pagina = await servico.listarDenuncias()
      fila.value = pagina.itens
      proximoCursor.value = pagina.proximoCursor
      temMais.value = pagina.temMais
      selecionadaId.value = pagina.itens[0]?.id ?? null
      estado.value = 'pronta'
    } catch {
      estado.value = 'erro'
    } finally {
      pararColdStart()
    }
  }

  async function carregarMais(): Promise<void> {
    if (!temMais.value || carregandoMais.value) {
      return
    }
    carregandoMais.value = true
    falhouMais.value = false
    try {
      const pagina = await servico.listarDenuncias(proximoCursor.value)
      const vistas = new Set(fila.value.map((d) => d.id))
      fila.value = [...fila.value, ...pagina.itens.filter((d) => !vistas.has(d.id))]
      proximoCursor.value = pagina.proximoCursor
      temMais.value = pagina.temMais
      selecionadaId.value ??= fila.value[0]?.id ?? null
    } catch {
      falhouMais.value = true
    } finally {
      carregandoMais.value = false
    }
  }

  function selecionar(id: string): void {
    if (selecionadaId.value !== id) {
      selecionadaId.value = id
      naoConfirmada.value = false
      erroDaAcao.value = null
    }
  }

  /**
   * Tira da fila o que o servidor fechou e seleciona a próxima, na mesma posição. Se a página
   * carregada esvaziar e houver mais no servidor, a seguinte vem sozinha.
   */
  function tirarDaFila(ids: string[]): void {
    const fechadas = new Set(ids)
    const posicao = fila.value.findIndex((d) => d.id === selecionadaId.value)
    const restantes = fila.value.filter((d) => !fechadas.has(d.id))
    fila.value = restantes
    if (selecionadaId.value && fechadas.has(selecionadaId.value)) {
      selecionadaId.value = restantes[Math.min(Math.max(posicao, 0), restantes.length - 1)]?.id ?? null
    }
    naoConfirmada.value = false
    erroDaAcao.value = null
    opcoes.aoResolver?.()
    if (restantes.length === 0 && temMais.value) {
      void carregarMais()
    }
  }

  function atualizar(id: string, mudanca: Partial<DenunciaPendente>): void {
    fila.value = fila.value.map((d) => (d.id === id ? { ...d, ...mudanca } : d))
  }

  function tratarConflito(erro: ApiError, denuncia: DenunciaPendente): boolean {
    if (erro.status !== 409) {
      return false
    }
    if (erro.code === 'DENUNCIA_JA_RESOLVIDA') {
      tirarDaFila([denuncia.id])
      return true
    }
    if (erro.code === 'CONTEUDO_JA_EXCLUIDO') {
      chavesDeRemocao.delete(denuncia.id)
      atualizar(denuncia.id, { conteudo: null, remocaoNaoConfirmada: false })
      return true
    }
    if (erro.code === 'REMOCAO_EM_ANDAMENTO') {
      atualizar(denuncia.id, { remocaoNaoConfirmada: true })
      naoConfirmada.value = true
      return true
    }
    return false
  }

  async function executar(
    tipo: Exclude<AcaoEmCurso, null>,
    chamada: (denuncia: DenunciaPendente) => Promise<ResultadoModeracao>,
    aoConcluir: (denuncia: DenunciaPendente) => string,
  ): Promise<void> {
    const denuncia = selecionada.value
    if (!denuncia || acao.value) {
      return
    }
    acao.value = tipo
    erroDaAcao.value = null
    naoConfirmada.value = false
    temporizadorDaAcao = setTimeout(() => (coldStartDaAcao.value = true), LIMITE_DO_COLD_START_MS)
    try {
      const resultado = await chamada(denuncia)
      chavesDeRemocao.delete(denuncia.id)
      aviso.value = { texto: aoConcluir(denuncia), icone: tipo }
      tirarDaFila(resultado.denunciasFechadas.length > 0 ? resultado.denunciasFechadas : [denuncia.id])
    } catch (erro) {
      if (erro instanceof ApiError && tratarConflito(erro, denuncia)) {
        return
      }
      if (tipo === 'remover') {
        atualizar(denuncia.id, { remocaoNaoConfirmada: true })
        naoConfirmada.value = true
      } else {
        erroDaAcao.value = 'Não foi possível arquivar a denúncia. Verifique sua conexão e tente de novo.'
      }
    } finally {
      acao.value = null
      pararColdStartDaAcao()
    }
  }

  function arquivar(): Promise<void> {
    return executar(
      'arquivar',
      (d) => servico.arquivar(d.id, novaChaveIdempotencia()),
      (d) =>
        `Denúncia arquivada como improcedente. ${d.tipo === 'resenha' ? 'A resenha continua publicada.' : 'O comentário continua publicado.'}`,
    )
  }

  function remover(): Promise<void> {
    return executar(
      'remover',
      (d) => {
        const chave = chavesDeRemocao.get(d.id) ?? novaChaveIdempotencia()
        chavesDeRemocao.set(d.id, chave)
        return servico.remover(d.id, chave)
      },
      (d) =>
        d.tipo === 'resenha'
          ? 'Resenha removida. A denúncia saiu da fila.'
          : 'Comentário removido. A denúncia saiu da fila.',
    )
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      pararColdStart()
      pararColdStartDaAcao()
    })
  }

  return {
    estado,
    coldStart,
    fila,
    temMais,
    carregandoMais,
    falhouMais,
    selecionadaId,
    selecionada,
    acao,
    coldStartDaAcao,
    naoConfirmada,
    erroDaAcao,
    aviso,
    carregar,
    carregarMais,
    selecionar,
    arquivar,
    remover,
  }
}
