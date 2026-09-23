import { getCurrentScope, onScopeDispose, readonly, ref } from 'vue'

import { acervoService, type AcervoService } from '../services/acervo'
import { ApiError, novaChaveIdempotencia } from '../services/api'
import { normalizarIsbn13 } from './isbn'

/**
 * Estados de `cadastro-por-isbn.md` §4, mais `naoEncontrado`, que é a tela seguinte, e
 * `limitado`, o `429` de RNF-SEC-18 que o prompt não desenhou.
 */
export type FaseDoCadastroIsbn =
  | 'ocioso'
  | 'invalido'
  | 'buscando'
  | 'encontrado'
  | 'duplicata'
  | 'indisponivel'
  | 'naoEncontrado'
  | 'limitado'
  | 'semConexao'

export interface OpcoesDoCadastroIsbn {
  servico?: Pick<AcervoService, 'solicitarImportacao' | 'obterImportacao' | 'reprocessarImportacao'>
  /** Intervalo entre consultas do estado da importação. */
  intervaloDeConsultaMs?: number
  /** Depois disto no mesmo estado, a linha do cartão troca para "Ainda procurando." (§4.3). */
  aposEsteTempoEstaLentoMs?: number
  /** Depois disto sem resposta do `POST`, a linha vira a de cold start (§4.8, RNF-ERR-09). */
  aposEsteTempoEColdStartMs?: number
  /**
   * Teto do acompanhamento. O consumidor esgota a própria política bem antes disso; passar daqui
   * significa que a mensagem nem chegou a ser processada, e o pedido continua guardado.
   */
  limiteDoAcompanhamentoMs?: number
}

/**
 * Máquina de estados do cadastro por ISBN, fora do componente para ser testada sem montar tela
 * (porte de `cadastro_isbn_controller.dart`). O acompanhamento acontece **nesta** tela
 * (cadastro-por-isbn.md §10): `202`, depois consulta periódica da importação até ela sair de
 * `pendente`.
 */
export function useCadastroIsbn(opcoes: OpcoesDoCadastroIsbn = {}) {
  const servico = opcoes.servico ?? acervoService
  const intervalo = opcoes.intervaloDeConsultaMs ?? 2_000
  const lentoAos = opcoes.aposEsteTempoEstaLentoMs ?? 8_000
  const coldStartAos = opcoes.aposEsteTempoEColdStartMs ?? 3_000
  const limite = opcoes.limiteDoAcompanhamentoMs ?? 90_000

  const fase = ref<FaseDoCadastroIsbn>('ocioso')
  const lento = ref(false)
  const coldStart = ref(false)
  const livroId = ref<string | null>(null)
  /** ISBN normalizado do último envio, para a tela de não encontrado conferir. */
  const isbn = ref<string | null>(null)
  const mensagemDoServidor = ref<string | null>(null)

  let importacaoId: string | null = null
  let reprocessavel = false
  // A chave é da intenção "buscar este ISBN": reenviar o mesmo ISBN reaproveita, e o servidor
  // devolve a mesma solicitação em vez de criar outra (RNF-ERR-04).
  let chave: string | null = null
  let isbnDaChave: string | null = null

  let consulta: ReturnType<typeof setTimeout> | undefined
  let lentidao: ReturnType<typeof setTimeout> | undefined
  let coldStartTimer: ReturnType<typeof setTimeout> | undefined
  let consultasFeitas = 0
  let descartado = false
  // Cada espera nova invalida as respostas atrasadas da anterior (ex.: "Cadastrar outro ISBN"
  // no meio de uma consulta em voo).
  let geracao = 0

  async function buscar(bruto: string): Promise<void> {
    const normalizado = normalizarIsbn13(bruto)
    if (normalizado === null) {
      fase.value = 'invalido'
      return
    }
    isbn.value = normalizado
    if (isbnDaChave !== normalizado) {
      chave = novaChaveIdempotencia()
      isbnDaChave = normalizado
    }

    const minha = iniciarEspera()
    coldStartTimer = setTimeout(() => {
      coldStart.value = true
    }, coldStartAos)

    try {
      const resultado = await servico.solicitarImportacao(normalizado, chave!)
      if (minha !== geracao) {
        return
      }
      clearTimeout(coldStartTimer)
      coldStart.value = false
      if (resultado.tipo === 'aceita') {
        importacaoId = resultado.importacaoId
        acompanhar(minha)
      } else {
        livroId.value = resultado.livroId
        encerrar('duplicata')
      }
    } catch (erro) {
      if (minha !== geracao) {
        return
      }
      clearTimeout(coldStartTimer)
      coldStart.value = false
      const status = erro instanceof ApiError ? erro.status : 0
      mensagemDoServidor.value = erro instanceof ApiError ? erro.message : null
      if (status === 400) {
        encerrar('invalido')
      } else if (status === 429) {
        encerrar('limitado')
      } else {
        // O pedido não foi aceito: não dá para dizer "seu pedido foi guardado".
        encerrar('semConexao')
      }
    }
  }

  /**
   * `Tentar de novo` do estado indisponível: reprocessa uma `falha_transitoria`, ou só retoma o
   * acompanhamento quando a importação ainda estava `pendente`.
   */
  async function tentarDeNovo(): Promise<void> {
    if (importacaoId === null) {
      return
    }
    const minha = iniciarEspera()
    if (reprocessavel) {
      try {
        await servico.reprocessarImportacao(importacaoId, novaChaveIdempotencia())
        reprocessavel = false
      } catch (erro) {
        if (minha !== geracao) {
          return
        }
        mensagemDoServidor.value = erro instanceof ApiError ? erro.message : null
        encerrar(erro instanceof ApiError && erro.status === 429 ? 'limitado' : 'indisponivel')
        return
      }
    }
    if (minha === geracao) {
      acompanhar(minha)
    }
  }

  /** `Cadastrar outro ISBN`: volta à aterrissagem. */
  function recomecar(): void {
    geracao++
    cancelarTimers()
    livroId.value = null
    importacaoId = null
    mensagemDoServidor.value = null
    lento.value = false
    coldStart.value = false
    fase.value = 'ocioso'
  }

  /** A pessoa editou o campo: sai do erro de validação ou da mensagem anterior. */
  function campoAlterado(): void {
    if (fase.value === 'invalido' || fase.value === 'semConexao' || fase.value === 'limitado') {
      fase.value = 'ocioso'
    }
  }

  function iniciarEspera(): number {
    geracao++
    cancelarTimers()
    lento.value = false
    coldStart.value = false
    mensagemDoServidor.value = null
    fase.value = 'buscando'
    lentidao = setTimeout(() => {
      lento.value = true
    }, lentoAos)
    return geracao
  }

  function acompanhar(minha: number): void {
    consultasFeitas = 0
    agendarConsulta(minha)
  }

  function agendarConsulta(minha: number): void {
    clearTimeout(consulta)
    consulta = setTimeout(() => void consultar(minha), intervalo)
  }

  async function consultar(minha: number): Promise<void> {
    if (descartado || minha !== geracao || importacaoId === null) {
      return
    }
    try {
      const importacao = await servico.obterImportacao(importacaoId)
      if (descartado || minha !== geracao) {
        return
      }
      switch (importacao.status) {
        case 'concluida':
          livroId.value = importacao.livroId
          encerrar('encontrado')
          return
        case 'nao_encontrado':
          encerrar('naoEncontrado')
          return
        case 'falha_transitoria':
          reprocessavel = true
          encerrar('indisponivel')
          return
        default:
          break
      }
    } catch {
      // Falha ao consultar não muda o estado da importação no servidor; continua tentando até o
      // teto do acompanhamento.
      if (descartado || minha !== geracao) {
        return
      }
    }
    // Contado em consultas, não em relógio: o intervalo é fixo, e o teste avança o tempo
    // simulado sem depender de `Date.now()`.
    consultasFeitas++
    if (consultasFeitas >= Math.floor(limite / intervalo)) {
      reprocessavel = false
      encerrar('indisponivel')
      return
    }
    agendarConsulta(minha)
  }

  function encerrar(nova: FaseDoCadastroIsbn): void {
    cancelarTimers()
    lento.value = false
    fase.value = nova
  }

  function cancelarTimers(): void {
    clearTimeout(consulta)
    clearTimeout(lentidao)
    clearTimeout(coldStartTimer)
  }

  function descartar(): void {
    descartado = true
    cancelarTimers()
  }

  if (getCurrentScope()) {
    onScopeDispose(descartar)
  }

  return {
    fase: readonly(fase),
    lento: readonly(lento),
    coldStart: readonly(coldStart),
    livroId: readonly(livroId),
    isbn: readonly(isbn),
    mensagemDoServidor: readonly(mensagemDoServidor),
    buscar,
    tentarDeNovo,
    recomecar,
    campoAlterado,
    descartar,
  }
}
