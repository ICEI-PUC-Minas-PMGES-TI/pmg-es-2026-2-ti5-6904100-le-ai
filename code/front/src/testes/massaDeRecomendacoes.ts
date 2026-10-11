import type { Pagina } from '../services/perfil'
import type { RecomendacaoRecebida } from '../services/social'

export function recomendacao(
  id: string,
  titulo: string,
  remetente: string,
  mensagem: string | null = null,
): RecomendacaoRecebida {
  const username = remetente.toLowerCase().replace(/\s+/g, '')
  return {
    id,
    remetente: { id: `u-${id}`, username, nomeExibicao: remetente, avatarUrl: null },
    livro: { id: `${id}-livro`, tipo: 'OFICIAL', titulo, autor: 'Autora Exemplo', capaUrl: null },
    mensagem,
    criadoEm: new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString(),
    expiraEm: new Date(Date.now() + 88 * 24 * 60 * 60_000).toISOString(),
  }
}

export function paginaDeRecomendacoes(
  items: RecomendacaoRecebida[],
  extra: Partial<Pagina<RecomendacaoRecebida>> = {},
): Pagina<RecomendacaoRecebida> {
  return { items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0, ...extra }
}
