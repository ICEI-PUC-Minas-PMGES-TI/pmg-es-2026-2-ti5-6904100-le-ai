import { ref, type Ref } from 'vue'

import { novaChaveIdempotencia } from '../services/api'
import {
  leituraService,
  type EstadoDasReacoes,
  type LeituraService,
  type TipoDeReacao,
  type ViaDeAcesso,
} from '../services/leitura'

type ServicoDeReacao = Pick<LeituraService, 'reagir' | 'removerReacao'>

export const MENSAGEM_DE_FALHA = 'Não foi possível registrar sua reação. Tente de novo em alguns instantes.'

/** O que o toque em `tipo` faz com o estado exibido: troca a reação, ou retira a que já está ativa. */
export function aplicarToque(atual: EstadoDasReacoes, tipo: TipoDeReacao): EstadoDasReacoes {
  const alvo = atual.minhaReacao === tipo ? null : tipo
  const contagem = (qual: TipoDeReacao, total: number) =>
    Math.max(0, total - (atual.minhaReacao === qual ? 1 : 0) + (alvo === qual ? 1 : 0))
  return {
    minhaReacao: alvo,
    curtidas: contagem('curtida', atual.curtidas),
    descurtidas: contagem('descurtida', atual.descurtidas),
  }
}

/**
 * Curtir e descurtir a resenha com efeito na hora (RF-AVA-05/08), no molde de `useCurtidas` do
 * feed: o toque muda o estado exibido, o botão não trava e há uma só requisição em voo. Quando ela
 * termina, se a pessoa tocou de novo e o exibido difere do confirmado, a que falta segue até
 * convergir; ao convergir, as contagens passam a ser as do servidor.
 *
 * A chave de idempotência é por intenção, como em `useMinhaAvaliacao`: repetir "curtir" depois de
 * uma falha reusa a chave, e o servidor devolve a resposta guardada se a primeira chegou a gravar.
 * Depois do sucesso a chave é esquecida.
 *
 * Falha (inclusive `429`, `503` e timeout) volta ao último estado confirmado e preenche `erro`.
 */
export function useReacao(
  resenhaId: string,
  inicial: EstadoDasReacoes,
  opcoes: { via?: ViaDeAcesso; servico?: ServicoDeReacao } = {},
) {
  const servico = opcoes.servico ?? leituraService
  const estado: Ref<EstadoDasReacoes> = ref({ ...inicial })
  const erro = ref<string | null>(null)

  let confirmado: EstadoDasReacoes = { ...inicial }
  let emVoo = false
  const chaves = new Map<string, string>()

  function chaveDa(intencao: string): string {
    const atual = chaves.get(intencao)
    if (atual) {
      return atual
    }
    const chave = novaChaveIdempotencia()
    chaves.set(intencao, chave)
    return chave
  }

  async function convergir(): Promise<void> {
    emVoo = true
    try {
      while (estado.value.minhaReacao !== confirmado.minhaReacao) {
        const alvo = estado.value.minhaReacao
        const intencao = alvo ?? 'retirar'
        const resposta = alvo
          ? await servico.reagir(resenhaId, alvo, opcoes.via, chaveDa(intencao))
          : await servico.removerReacao(resenhaId, opcoes.via, chaveDa(intencao))
        chaves.delete(intencao)
        confirmado = resposta
      }
      estado.value = { ...confirmado }
    } catch {
      estado.value = { ...confirmado }
      erro.value = MENSAGEM_DE_FALHA
    } finally {
      emVoo = false
    }
  }

  function tocar(tipo: TipoDeReacao): void {
    erro.value = null
    estado.value = aplicarToque(estado.value, tipo)
    if (!emVoo) {
      void convergir()
    }
  }

  /** Estado novo vindo do servidor (a página recarregou): vale ele, sem requisição. */
  function redefinir(novo: EstadoDasReacoes): void {
    if (!emVoo) {
      confirmado = { ...novo }
      estado.value = { ...novo }
    }
  }

  return { estado, erro, tocar, redefinir }
}
