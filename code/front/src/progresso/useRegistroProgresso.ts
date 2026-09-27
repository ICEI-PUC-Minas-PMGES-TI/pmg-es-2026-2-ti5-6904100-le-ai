import { ref } from 'vue'

import { ApiError, erroDoCliente, novaChaveIdempotencia } from '../services/api'
import {
  leituraService,
  type EditarProgressoEntrada,
  type ExclusaoProgresso,
  type LeituraService,
  type ProgressoComResumo,
} from '../services/leitura'
import { TEXTOS_DO_REGISTRO } from './textos'

export interface NovoProgresso {
  pagina: number
  minutos?: number
}

export type ErroDoCampo = Partial<Record<'pagina' | 'minutos', string>>

export type ResultadoDoProgresso = ProgressoComResumo | ExclusaoProgresso

type ServicoDeProgresso = Pick<LeituraService, 'registrarProgresso' | 'editarUltimoProgresso' | 'excluirTrechoProgresso'>

interface Intencao {
  assinatura: string
  chave: string
  registradoEmDispositivo: string
  fusoHorarioDispositivo: string
}

const CONFLITO = 409
const NAO_PROCESSAVEL = 422

function errosDosCampos(erro: ApiError): ErroDoCampo {
  const { pagina, minutos } = erro.campos ?? {}
  return Object.fromEntries(Object.entries({ pagina, minutos }).filter(([, mensagem]) => mensagem !== undefined))
}

export function useRegistroProgresso(servico: ServicoDeProgresso = leituraService) {
  const salvando = ref(false)
  const erro = ref<string | null>(null)
  const erroDoCampo = ref<ErroDoCampo>({})
  const precisaRecarregar = ref(false)
  const ultimoResultado = ref<ResultadoDoProgresso | null>(null)

  let intencao: Intencao | null = null

  function intencaoPara(assinatura: string): Intencao {
    if (intencao?.assinatura !== assinatura) {
      intencao = {
        assinatura,
        chave: novaChaveIdempotencia(),
        registradoEmDispositivo: new Date().toISOString(),
        fusoHorarioDispositivo: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    }
    return intencao
  }

  function registrarFalha(falha: ApiError): void {
    if (erroDoCliente(falha)) intencao = null
    if (falha.status === CONFLITO) {
      precisaRecarregar.value = true
      erro.value = TEXTOS_DO_REGISTRO.erroListaDesatualizada
      return
    }
    if (falha.status === NAO_PROCESSAVEL) {
      erroDoCampo.value = errosDosCampos(falha)
      if (Object.keys(erroDoCampo.value).length === 0) erro.value = falha.message
      return
    }
    erro.value = erroDoCliente(falha) ? falha.message : TEXTOS_DO_REGISTRO.erroEnvio
  }

  async function executar<T extends ResultadoDoProgresso>(
    assinatura: string,
    enviar: (atual: Intencao) => Promise<T>,
  ): Promise<T | null> {
    if (salvando.value) return null
    const atual = intencaoPara(assinatura)
    salvando.value = true
    limparErro()
    try {
      const resultado = await enviar(atual)
      intencao = null
      ultimoResultado.value = resultado
      return resultado
    } catch (falha) {
      if (!(falha instanceof ApiError)) throw falha
      registrarFalha(falha)
      return null
    } finally {
      salvando.value = false
    }
  }

  function registrar(leituraId: string, novo: NovoProgresso): Promise<ProgressoComResumo | null> {
    return executar(JSON.stringify(['registrar', leituraId, novo.pagina, novo.minutos]), (atual) =>
      servico.registrarProgresso(
        leituraId,
        {
          ...novo,
          registradoEmDispositivo: atual.registradoEmDispositivo,
          fusoHorarioDispositivo: atual.fusoHorarioDispositivo,
        },
        atual.chave,
      ),
    )
  }

  function editarUltimo(progressoId: string, entrada: EditarProgressoEntrada): Promise<ProgressoComResumo | null> {
    return executar(JSON.stringify(['editar', progressoId, entrada.pagina, entrada.minutos]), (atual) =>
      servico.editarUltimoProgresso(progressoId, entrada, atual.chave),
    )
  }

  function excluirTrecho(progressoId: string, ultimoProgressoIdConfirmado: string): Promise<ExclusaoProgresso | null> {
    return executar(JSON.stringify(['excluir', progressoId, ultimoProgressoIdConfirmado]), (atual) =>
      servico.excluirTrechoProgresso(progressoId, { ultimoProgressoIdConfirmado }, atual.chave),
    )
  }

  function limparErro(): void {
    erro.value = null
    erroDoCampo.value = {}
    precisaRecarregar.value = false
  }

  return {
    salvando,
    erro,
    erroDoCampo,
    precisaRecarregar,
    ultimoResultado,
    registrar,
    editarUltimo,
    excluirTrecho,
    limparErro,
  }
}
