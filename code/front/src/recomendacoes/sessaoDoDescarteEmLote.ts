/**
 * Contador de descartes por livro e supressão da pergunta de descarte em lote (RN-22.12/13,
 * F-REC-ALG). Vivem só na memória do módulo: recarregar a página zera os dois, e o servidor não
 * guarda nenhum. A pergunta cabe a partir do terceiro descarte do mesmo livro, enquanto ela não
 * tiver sido recusada para ele nesta sessão.
 */
const DESCARTES_PARA_PERGUNTAR = 3

const descartesPorLivro = new Map<string, number>()
const recusados = new Set<string>()

/** Conta um descarte individual que o servidor confirmou e diz se a pergunta cabe agora. */
export function registrarDescarte(livroId: string): boolean {
  const total = (descartesPorLivro.get(livroId) ?? 0) + 1
  descartesPorLivro.set(livroId, total)
  return total >= DESCARTES_PARA_PERGUNTAR && !recusados.has(livroId)
}

/** `Agora não`, ou fechar sem escolher: a pergunta não volta para este livro nesta sessão. */
export function recusarPergunta(livroId: string): void {
  recusados.add(livroId)
}

/** Para os testes, que simulam uma sessão nova sem recarregar o módulo. */
export function zerarSessaoDoDescarteEmLote(): void {
  descartesPorLivro.clear()
  recusados.clear()
}
