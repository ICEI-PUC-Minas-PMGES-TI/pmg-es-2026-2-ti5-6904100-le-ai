import { ref } from 'vue'

import type { AcessoDeRecuperacao } from './services/auth'

/**
 * Acesso de recuperação da conta com exclusão pendente (F-CONTA-2, RN-23.3). **Só em memória**,
 * nunca no `localStorage`: o token vale 15 minutos e só cancela a exclusão, então recarregar a
 * página e entrar de novo custa pouco, e não deixa token restrito esquecido no navegador. É
 * descartado ao sair, ao recuperar a conta e ao expirar (recuperar-conta.md §9).
 */
const acesso = ref<AcessoDeRecuperacao | null>(null)

export function guardarAcessoDeRecuperacao(novo: AcessoDeRecuperacao): void {
  acesso.value = novo
}

export function descartarAcessoDeRecuperacao(): void {
  acesso.value = null
}

export function acessoDeRecuperacao(): AcessoDeRecuperacao | null {
  return acesso.value
}

const formatoDeData = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** `29 de outubro de 2026`: data sempre por extenso, nunca `29/10` (excluir-conta.md §8). */
export function dataPorExtenso(data: Date | string): string {
  return formatoDeData.format(typeof data === 'string' ? new Date(data) : data)
}

/** Data limite mostrada antes do pedido: hoje mais 30 dias, calculada no aparelho (§3). */
export function dataLimiteAPartirDeHoje(hoje: Date = new Date()): Date {
  return new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
}

/** Dias que faltam até a remoção, nunca menos de 1 enquanto a conta ainda não foi removida. */
export function diasAte(prevista: string, agora: Date = new Date()): number {
  const restante = new Date(prevista).getTime() - agora.getTime()
  return Math.max(1, Math.ceil(restante / (24 * 60 * 60 * 1000)))
}

/** `Faltam 23 dias` ou `Falta 1 dia` (recuperar-conta.md §8). */
export function textoDosDias(dias: number): string {
  return dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`
}
