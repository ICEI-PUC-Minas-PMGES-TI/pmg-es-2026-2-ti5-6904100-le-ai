import { PhArrowsClockwise, PhBookmarkSimple, PhBookOpen, PhCheck, PhPauseCircle } from '@phosphor-icons/vue'
import type { Component } from 'vue'

import type { StatusEstante } from '../services/leitura'

export interface AparenciaDoStatus {
  icone: Component
  peso: 'regular' | 'bold'
  classe: string
}

export const APARENCIA_DO_STATUS: Record<StatusEstante, AparenciaDoStatus> = {
  QUERO_LER: { icone: PhBookmarkSimple, peso: 'regular', classe: 'border border-linha text-tinta' },
  LENDO: { icone: PhBookOpen, peso: 'regular', classe: 'bg-musgo-fundo text-musgo' },
  LIDO: { icone: PhCheck, peso: 'bold', classe: 'bg-musgo text-papel' },
  RELENDO: { icone: PhArrowsClockwise, peso: 'regular', classe: 'bg-musgo-fundo text-broto' },
  ABANDONADO: { icone: PhPauseCircle, peso: 'regular', classe: 'border border-linha text-grafite' },
}
