import type { Ref } from 'vue'

import { mensagemDeErro, novaChaveIdempotencia } from '../services/api'
import { socialService, type Atividade } from '../services/social'

type ServicoDeCurtidas = Pick<typeof socialService, 'curtir' | 'descurtir'>

interface EstadoConfirmado {
  curtida: boolean
  total: number
}

/**
 * Curtir e descurtir com efeito na hora (RF-SOC-11), igual a `CurtidasOtimistas` do app. O último
 * toque vale.
 *
 * No toque, o item da lista inverte `curtidaPeloSolicitante` e soma ou subtrai 1 de
 * `totalCurtidas` (mínimo 0), e o botão não trava. Por atividade, guarda-se o último estado que o
 * servidor confirmou e permite-se uma única requisição em voo, cada uma com a própria
 * `Idempotency-Key`. Quando ela termina, se o item exibido ainda difere do confirmado (a pessoa
 * tocou de novo), a requisição que falta segue, até convergir: toques rápidos geram no máximo uma
 * requisição extra. Ao convergir, o item recebe o total confirmado, o que corrige o contador.
 *
 * Se uma requisição falha (inclusive `429`), o item volta ao último estado confirmado e `erro`
 * recebe a mensagem. `descartarPendentes` esquece as intenções em andamento: usado ao recarregar a
 * lista, em que o estado vindo do servidor vale e as respostas antigas não sobrescrevem nem
 * disparam novas requisições.
 */
export function useCurtidas(itens: Ref<Atividade[]>, erro: Ref<string | null>, servico: ServicoDeCurtidas = socialService) {
  const confirmados = new Map<string, EstadoConfirmado>()
  const emVoo = new Set<string>()
  let geracao = 0

  function exibida(id: string): Atividade | undefined {
    return itens.value.find((item) => item.id === id)
  }

  function atualizar(id: string, parcial: Pick<Atividade, 'curtidaPeloSolicitante' | 'totalCurtidas'>): void {
    itens.value = itens.value.map((item) => (item.id === id ? { ...item, ...parcial } : item))
  }

  async function convergir(id: string, minha: number): Promise<void> {
    try {
      for (;;) {
        const atual = exibida(id)
        const confirmado = confirmados.get(id)
        if (!atual || !confirmado) {
          return
        }
        if (atual.curtidaPeloSolicitante === confirmado.curtida) {
          if (atual.totalCurtidas !== confirmado.total) {
            atualizar(id, { curtidaPeloSolicitante: confirmado.curtida, totalCurtidas: confirmado.total })
          }
          return
        }
        const chave = novaChaveIdempotencia()
        if (atual.curtidaPeloSolicitante) {
          const estado = await servico.curtir(id, chave)
          if (minha !== geracao) {
            return
          }
          confirmados.set(id, { curtida: true, total: estado.totalCurtidas })
        } else {
          await servico.descurtir(id, chave)
          if (minha !== geracao) {
            return
          }
          confirmados.set(id, { curtida: false, total: Math.max(0, confirmado.total - 1) })
        }
      }
    } catch (falha) {
      if (minha !== geracao) {
        return
      }
      const confirmado = confirmados.get(id)
      if (exibida(id) && confirmado) {
        atualizar(id, { curtidaPeloSolicitante: confirmado.curtida, totalCurtidas: confirmado.total })
        erro.value = mensagemDeErro(falha)
      }
    } finally {
      if (minha === geracao) {
        emVoo.delete(id)
        confirmados.delete(id)
      }
    }
  }

  /** Inverte a curtida da atividade na hora e garante que o servidor acabe no estado exibido. */
  function alternar(id: string): void {
    const atual = exibida(id)
    if (!atual) {
      return
    }
    erro.value = null
    if (!confirmados.has(id)) {
      confirmados.set(id, { curtida: atual.curtidaPeloSolicitante, total: atual.totalCurtidas })
    }
    const curtida = !atual.curtidaPeloSolicitante
    atualizar(id, { curtidaPeloSolicitante: curtida, totalCurtidas: Math.max(0, atual.totalCurtidas + (curtida ? 1 : -1)) })
    if (!emVoo.has(id)) {
      emVoo.add(id)
      void convergir(id, geracao)
    }
  }

  /** Esquece as intenções pendentes; as respostas das requisições em voo passam a ser ignoradas. */
  function descartarPendentes(): void {
    geracao += 1
    confirmados.clear()
    emVoo.clear()
  }

  return { alternar, descartarPendentes }
}
