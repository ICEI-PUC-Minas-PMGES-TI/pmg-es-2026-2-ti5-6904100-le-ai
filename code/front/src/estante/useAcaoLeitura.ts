import { ref } from 'vue'

import { ApiError, erroDoCliente, novaChaveIdempotencia } from '../services/api'
import { leituraService, type Leitura, type LeituraService } from '../services/leitura'
import type { EstadoDeLeitura } from './acoesDisponiveis'
import { ERROS_DE_ACAO, TEXTOS_DE_ACAO } from './textos'

export type PedidoDeAcao =
  | { acao: 'adicionarQueroLer' | 'removerDaEstante'; livroId: string }
  | { acao: 'iniciarLeitura' | 'iniciarReleitura'; livroId: string; dataInicio: string }
  | { acao: 'finalizarLeitura' | 'finalizarReleitura'; leituraId: string; dataFim: string; fusoHorarioDispositivo: string }
  | { acao: 'abandonarLeitura' | 'abandonarReleitura' | 'retomarLeitura'; leituraId: string }

type ServicoDeAcoes = Pick<
  LeituraService,
  | 'adicionarEstante'
  | 'removerEstante'
  | 'iniciarLeitura'
  | 'iniciarReleitura'
  | 'finalizarLeitura'
  | 'abandonarLeitura'
  | 'retomarLeitura'
>

const CONFLITO = 409

function estadoDaLeitura(leitura: Leitura): EstadoDeLeitura {
  const status = leitura.releitura && leitura.incompleta ? 'LIDO' : leitura.status
  return { status, leitura }
}

async function enviar(servico: ServicoDeAcoes, pedido: PedidoDeAcao, chave: string): Promise<EstadoDeLeitura> {
  switch (pedido.acao) {
    case 'adicionarQueroLer':
      await servico.adicionarEstante(pedido.livroId, chave)
      return { status: 'QUERO_LER', leitura: null }
    case 'removerDaEstante':
      await servico.removerEstante(pedido.livroId, chave)
      return { status: null, leitura: null }
    case 'iniciarLeitura':
    case 'iniciarReleitura': {
      const entrada = { livroId: pedido.livroId, dataInicio: pedido.dataInicio }
      const leitura = pedido.acao === 'iniciarLeitura'
        ? await servico.iniciarLeitura(entrada, chave)
        : await servico.iniciarReleitura(entrada, chave)
      return estadoDaLeitura(leitura)
    }
    case 'finalizarLeitura':
    case 'finalizarReleitura':
      return estadoDaLeitura(
        await servico.finalizarLeitura(
          pedido.leituraId,
          { dataFim: pedido.dataFim, fusoHorarioDispositivo: pedido.fusoHorarioDispositivo },
          chave,
        ),
      )
    case 'abandonarLeitura':
    case 'abandonarReleitura':
      return estadoDaLeitura(await servico.abandonarLeitura(pedido.leituraId, chave))
    case 'retomarLeitura':
      return estadoDaLeitura(await servico.retomarLeitura(pedido.leituraId, chave))
  }
}

function mensagemDoErro(erro: ApiError): string {
  if (erro.status === CONFLITO) return ERROS_DE_ACAO.conflito
  if (erroDoCliente(erro)) return erro.message
  return TEXTOS_DE_ACAO.erroAoSalvar
}

export function useAcaoLeitura(servico: ServicoDeAcoes = leituraService) {
  const salvando = ref(false)
  const erro = ref<string | null>(null)
  const ultimoResultado = ref<EstadoDeLeitura | null>(null)

  let chave: string | null = null
  let intencaoDaChave: string | null = null

  function esquecerChave(): void {
    chave = null
    intencaoDaChave = null
  }

  async function executar(pedido: PedidoDeAcao): Promise<EstadoDeLeitura | null> {
    if (salvando.value) return null
    const intencao = JSON.stringify(pedido)
    if (chave === null || intencaoDaChave !== intencao) {
      chave = novaChaveIdempotencia()
      intencaoDaChave = intencao
    }

    salvando.value = true
    erro.value = null
    try {
      const estado = await enviar(servico, pedido, chave)
      esquecerChave()
      ultimoResultado.value = estado
      return estado
    } catch (falha) {
      if (!(falha instanceof ApiError)) throw falha
      if (erroDoCliente(falha)) esquecerChave()
      erro.value = mensagemDoErro(falha)
      return null
    } finally {
      salvando.value = false
    }
  }

  function limparErro(): void {
    erro.value = null
  }

  return { salvando, erro, ultimoResultado, executar, limparErro }
}
