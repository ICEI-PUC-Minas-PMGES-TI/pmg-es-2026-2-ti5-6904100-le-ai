import { ref, shallowRef } from 'vue'

import type { LeituraDoRegistro } from '../components/progresso/RegistrarProgresso.vue'
import type { EstadoDeLeitura } from '../estante/acoesDisponiveis'
import type { LivroDoPainel } from '../estante/usePainelDeAcoes'

function contextoDoRegistro(livro: LivroDoPainel | null, estado: EstadoDeLeitura): LeituraDoRegistro | null {
  const leitura = estado.leitura
  if (!livro || !leitura?.totalPaginas) return null
  return {
    leituraId: leitura.id,
    titulo: livro.titulo,
    autor: livro.autor,
    capaUrl: livro.capaUrl,
    paginaAtual: leitura.paginaAtual,
    totalPaginas: leitura.totalPaginas,
  }
}

export function useDialogoDeRegistro() {
  const contexto = shallowRef<LeituraDoRegistro | null>(null)
  const aberto = ref(false)

  function abrir(livro: LivroDoPainel | null, estado: EstadoDeLeitura): void {
    contexto.value = contextoDoRegistro(livro, estado)
    aberto.value = contexto.value !== null
  }

  function fechar(): void {
    aberto.value = false
  }

  return { contexto, aberto, abrir, fechar }
}
