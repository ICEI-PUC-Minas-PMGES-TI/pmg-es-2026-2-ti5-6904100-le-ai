import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import {
  acervoService,
  type AcervoService,
  type LivroOficialDetalhe,
  type ResenhaDoLivro,
  type SinopseDoLivro,
} from '../services/acervo'
import { ApiError } from '../services/api'

export type EstadoDaPagina = 'carregando' | 'pronta' | 'nao-encontrada' | 'erro'

/** Esperas entre as consultas da sinopse, cerca de 2 minutos no total, como no app. */
export const ESPERAS_DA_SINOPSE_MS = [2_000, 3_000, 5_000, 8_000, 13_000, 20_000, 30_000, 40_000]
/**
 * Quando reconsultar os indicadores depois de o leitor salvar, alterar ou remover a própria nota,
 * contado da escrita. O `acervo` consome `nota.alterada` de forma assíncrona: normalmente em
 * poucos segundos. Com as retentativas do consumidor (1, 5 e 15 s, em sequência) e a outbox da
 * `leitura` (1 s), a última tentativa começa uns 22 s depois da escrita; 25 s cobre o caso normal
 * dela e 40 s, uma tentativa lenta.
 */
export const RECARGAS_DAS_NOTAS_MS = [2_000, 6_000, 15_000, 25_000, 40_000]
const LIMITE_DO_COLD_START_MS = 3_000

export interface OpcoesDaPagina {
  servico?: Pick<AcervoService, 'obterLivroOficial' | 'listarResenhasDoLivro'>
}

/**
 * Estado da página do livro oficial (pagina-do-livro.md), no molde do `LivroOficialController` do
 * app.
 *
 * - **Polling da sinopse** com esperas crescentes, parando em `disponivel`, `ausente` ou
 *   `falha_transitoria`, no fim das esperas e quando a tela sai. Cada consulta aproveita **só a
 *   sinopse**: a `GET /livros/{id}` devolve de novo a primeira página de resenhas, e sobrescrever
 *   apagaria as já carregadas e os spoilers revelados.
 * - **Resenhas por cursor**, acumuladas. `resenhas: null` vira `resenhasIndisponiveis`, com
 *   "Tentar de novo"; a falha de "Ver todas as resenhas" vira `falhouMaisResenhas`, sem apagar as
 *   já carregadas.
 * - **Erro da página:** 404 e 400 (id que não é de livro) são "não encontrado"; 429 traz a
 *   mensagem do servidor em `mensagemDoErro`, porque "a conexão falhou" seria falso.
 * - **Troca de livro** na mesma rota recomeça tudo, e a resposta do livro anterior é descartada.
 * - **Recarga das notas** (`recarregarNotas`, F-ACV-NOTA): depois de uma escrita da própria nota,
 *   reconsulta o livro em silêncio nas `RECARGAS_DAS_NOTAS_MS` e troca só `notaGeral`,
 *   `notaDosLeitores` e `distribuicao`, pelo mesmo motivo do polling. A fonte continua o `acervo`:
 *   a nota local não entra na média.
 */
export function useLivroOficial(opcoes: OpcoesDaPagina = {}) {
  const servico = opcoes.servico ?? acervoService

  const estado = ref<EstadoDaPagina>('carregando')
  const coldStart = ref(false)
  const livro = shallowRef<LivroOficialDetalhe | null>(null)
  const sinopse = ref<SinopseDoLivro>({ status: 'pendente', texto: null })
  const sinopseDemorou = ref(false)
  const resenhas = shallowRef<ResenhaDoLivro[]>([])
  const proximoCursor = ref<string | null>(null)
  const resenhasIndisponiveis = ref(false)
  const carregandoResenhas = ref(false)
  const falhouMaisResenhas = ref(false)
  const mensagemDoErro = ref<string | null>(null)

  let livroId = ''
  let geracao = 0
  let consultas = 0
  let proximaConsulta: ReturnType<typeof setTimeout> | undefined
  let limiteDoColdStart: ReturnType<typeof setTimeout> | undefined
  let recargasDasNotas: ReturnType<typeof setTimeout>[] = []
  let rodadaDasNotas = 0
  let consultasDasNotas = 0
  let ultimaConsultaAplicada = 0

  const temMaisResenhas = computed(() => proximoCursor.value !== null)

  async function carregar(id: string = livroId): Promise<void> {
    livroId = id
    const minha = ++geracao
    clearTimeout(proximaConsulta)
    clearTimeout(limiteDoColdStart)
    cancelarRecargasDasNotas()
    estado.value = 'carregando'
    coldStart.value = false
    carregandoResenhas.value = false
    falhouMaisResenhas.value = false
    mensagemDoErro.value = null
    limiteDoColdStart = setTimeout(() => {
      if (minha === geracao && estado.value === 'carregando') {
        coldStart.value = true
      }
    }, LIMITE_DO_COLD_START_MS)
    try {
      const detalhe = await servico.obterLivroOficial(id)
      if (minha !== geracao) {
        return
      }
      livro.value = detalhe
      sinopse.value = detalhe.sinopse
      sinopseDemorou.value = false
      resenhasIndisponiveis.value = detalhe.resenhas === null
      resenhas.value = detalhe.resenhas?.itens ?? []
      proximoCursor.value = detalhe.resenhas?.proximoCursor ?? null
      estado.value = 'pronta'
      consultas = 0
      agendarSinopse(minha)
    } catch (erro) {
      if (minha !== geracao) {
        return
      }
      if (!(erro instanceof ApiError)) {
        estado.value = 'erro'
        throw erro
      }
      estado.value = erro.status === 404 || erro.status === 400 ? 'nao-encontrada' : 'erro'
      // A mensagem do servidor só quando o corpo seguiu o contrato; um 429 do proxy vem sem ele.
      mensagemDoErro.value =
        erro.status !== 429
          ? null
          : erro.code === 'MUITAS_REQUISICOES'
            ? erro.message
            : 'Muitas requisições em pouco tempo. Tente novamente em instantes.'
    } finally {
      if (minha === geracao) {
        clearTimeout(limiteDoColdStart)
        coldStart.value = false
      }
    }
  }

  /** "Ver todas as resenhas" e o "Tentar de novo" das resenhas indisponíveis. */
  async function carregarResenhas(): Promise<void> {
    if (carregandoResenhas.value) {
      return
    }
    const continuacao = !resenhasIndisponiveis.value
    if (continuacao && proximoCursor.value === null) {
      return
    }
    const minha = geracao
    carregandoResenhas.value = true
    falhouMaisResenhas.value = false
    try {
      const pagina = await servico.listarResenhasDoLivro(livroId, continuacao ? proximoCursor.value : null)
      if (minha !== geracao) {
        return
      }
      const vistas = new Set(resenhas.value.map((resenha) => resenha.id))
      resenhas.value = continuacao
        ? [...resenhas.value, ...pagina.itens.filter((resenha) => !vistas.has(resenha.id))]
        : pagina.itens
      proximoCursor.value = pagina.proximoCursor
      resenhasIndisponiveis.value = false
    } catch (erro) {
      if (minha === geracao) {
        if (continuacao) {
          falhouMaisResenhas.value = true
        } else {
          resenhasIndisponiveis.value = true
        }
      }
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    } finally {
      if (minha === geracao) {
        carregandoResenhas.value = false
      }
    }
  }

  function agendarSinopse(minha: number): void {
    clearTimeout(proximaConsulta)
    if (sinopse.value.status !== 'pendente' && sinopse.value.status !== 'nao_consultada') {
      return
    }
    const espera = ESPERAS_DA_SINOPSE_MS[consultas]
    if (espera === undefined) {
      sinopseDemorou.value = true
      return
    }
    consultas += 1
    proximaConsulta = setTimeout(() => void consultarSinopse(minha), espera)
  }

  async function consultarSinopse(minha: number): Promise<void> {
    try {
      const detalhe = await servico.obterLivroOficial(livroId)
      if (minha !== geracao) {
        return
      }
      sinopse.value = detalhe.sinopse
    } catch (erro) {
      // Uma consulta perdida não é erro de tela: a próxima espera tenta de novo.
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    }
    if (minha === geracao) {
      agendarSinopse(minha)
    }
  }

  /**
   * Depois de o leitor salvar, alterar ou remover a própria nota. Uma nova escrita recomeça as
   * esperas; trocar de livro e sair da tela cancelam. Falha de consulta não é erro de tela.
   */
  function recarregarNotas(): void {
    cancelarRecargasDasNotas()
    const minha = geracao
    const rodada = ++rodadaDasNotas
    recargasDasNotas = RECARGAS_DAS_NOTAS_MS.map((espera) =>
      setTimeout(() => void consultarNotas(minha, rodada), espera),
    )
  }

  async function consultarNotas(minha: number, rodada: number): Promise<void> {
    const consulta = ++consultasDasNotas
    try {
      const detalhe = await servico.obterLivroOficial(livroId)
      const atual = livro.value
      // Uma resposta mais antiga que chega depois de uma mais nova não volta a nota para trás.
      if (minha !== geracao || rodada !== rodadaDasNotas || !atual || consulta < ultimaConsultaAplicada) {
        return
      }
      ultimaConsultaAplicada = consulta
      const { notaGeral, notaDosLeitores, distribuicao } = detalhe
      livro.value = { ...atual, notaGeral, notaDosLeitores, distribuicao }
    } catch (erro) {
      if (!(erro instanceof ApiError)) {
        throw erro
      }
    }
  }

  function cancelarRecargasDasNotas(): void {
    recargasDasNotas.forEach(clearTimeout)
    recargasDasNotas = []
    rodadaDasNotas += 1
  }

  function descartar(): void {
    geracao += 1
    clearTimeout(proximaConsulta)
    clearTimeout(limiteDoColdStart)
    cancelarRecargasDasNotas()
  }

  if (getCurrentScope()) {
    onScopeDispose(descartar)
  }

  return {
    estado,
    coldStart,
    livro,
    sinopse,
    sinopseDemorou,
    resenhas,
    resenhasIndisponiveis,
    carregandoResenhas,
    falhouMaisResenhas,
    mensagemDoErro,
    temMaisResenhas,
    carregar,
    carregarResenhas,
    recarregarNotas,
    descartar,
  }
}
