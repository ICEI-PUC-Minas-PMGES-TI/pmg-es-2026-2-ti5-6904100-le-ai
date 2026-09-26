import type { TipoAtividade } from '../services/social'

/**
 * Mapa fixo de tipo de atividade para verbo (feed.md §8), usado tanto no item do feed
 * (`ItemAtividade.vue`) quanto no resumo do modal de comentários (`ModalComentarios.vue`, Task 8):
 * "abandono não leva estilo diferente" e o texto tem que ser idêntico nos dois lugares.
 */
const VERBOS: Record<TipoAtividade, string> = {
  LEITURA_INICIADA: 'começou a ler',
  LEITURA_RETOMADA: 'retomou a leitura',
  LEITURA_FINALIZADA: 'terminou de ler',
  LEITURA_ABANDONADA: 'abandonou a leitura',
  RESENHA_PUBLICADA: 'publicou uma resenha',
}

export function verboDeAtividade(tipo: TipoAtividade): string {
  return VERBOS[tipo]
}
