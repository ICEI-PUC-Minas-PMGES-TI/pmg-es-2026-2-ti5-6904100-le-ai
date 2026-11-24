import { watch } from 'vue'

import { useSession } from '../session'

/**
 * Contador de descartes por livro e supressão da pergunta de descarte em lote (RN-22.12/13,
 * F-REC-ALG). Vivem só na memória do módulo: recarregar a página zera os dois, e o servidor não
 * guarda nenhum. A pergunta cabe a partir do terceiro descarte do mesmo livro, enquanto ela não
 * tiver sido recusada para ele nesta sessão.
 *
 * A sessão do cliente acaba também no logout: sair, entrar com outra conta (ou com a mesma) e
 * a sessão encerrada por outra aba zeram os dois, para a conta seguinte não herdar contagem nem
 * recusa. A renovação do token não muda o usuário e não zera nada.
 */
const DESCARTES_PARA_PERGUNTAR = 3

const descartesPorLivro = new Map<string, number>()
const recusados = new Set<string>()

const { usuario } = useSession()
watch(
  () => usuario.value?.id ?? null,
  () => zerarSessaoDoDescarteEmLote(),
  { flush: 'sync' },
)

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

/** Sessão nova: troca de usuário na aba e os testes, que não recarregam o módulo. */
export function zerarSessaoDoDescarteEmLote(): void {
  descartesPorLivro.clear()
  recusados.clear()
}
