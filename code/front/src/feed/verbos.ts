import type { TipoAtividade } from '../services/social'

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
