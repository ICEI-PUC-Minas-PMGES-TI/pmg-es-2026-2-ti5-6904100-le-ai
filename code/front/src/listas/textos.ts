import { contagem } from '../perfil/textos'
import type { Privacidade } from '../services/perfil'

/**
 * Textos das telas de F-LST (docs/design/periodo-2/F-LST/*.md §8). Todo número com unidade.
 *
 * **Sem pronome de gênero**, como em `perfil/textos.ts`: os protótipos escrevem "as listas dela",
 * mas o produto não sabe o gênero de ninguém; as frases usam o nome.
 */

export function contagemDeLivros(valor: number): string {
  return contagem(valor, 'livro', 'livros')
}

export function contagemDeListas(valor: number): string {
  return contagem(valor, 'lista', 'listas')
}

const DATA_POR_EXTENSO = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

/** `7 livros · atualizada em 12 de setembro de 2026` (lista.md §3). */
export function linhaDeContagem(quantidade: number, atualizadaEm: string): string {
  return `${contagemDeLivros(quantidade)} · atualizada em ${DATA_POR_EXTENSO.format(new Date(atualizadaEm))}`
}

/** Linha de visibilidade da lista (lista.md §4, criar-lista.md §3). */
export function visibilidadeDaLista(privacidade: Privacidade): string {
  return privacidade === 'privado'
    ? 'Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.'
    : 'Seu perfil é público: qualquer leitor pode ver esta lista.'
}

/** Linha de visibilidade do índice (listas-do-leitor.md §8). */
export function visibilidadeDasListas(privacidade: Privacidade): string {
  return privacidade === 'privado'
    ? 'Seu perfil é privado: só quem você aceitou como seguidor vê suas listas.'
    : 'Seu perfil é público: qualquer leitor pode ver suas listas.'
}

/**
 * Texto da confirmação de exclusão (criar-lista.md §4.8). O protótipo só escreve o caso com vários
 * livros; com um ou nenhum, "a ordem dos 1 livro" não se lê.
 */
export function textoDaExclusao(quantidade: number): string {
  if (quantidade === 0) {
    return 'A lista sai do seu perfil. Não dá para desfazer.'
  }
  if (quantidade === 1) {
    return 'A lista sai do seu perfil. O livro continua na sua estante e no acervo. Não dá para desfazer.'
  }
  return `A lista e a ordem dos ${contagemDeLivros(quantidade)} saem do seu perfil. Os livros continuam na sua estante e no acervo. Não dá para desfazer.`
}

/** Bloco de restrição (RN-08): `Só quem Beatriz aceita como seguidor vê as listas.` */
export function textoDeListasRestritas(nome: string | null): string {
  return nome ? `Só quem ${nome} aceita como seguidor vê as listas.` : 'Só seguidores aceitos veem estas listas.'
}

/** Conta como o servidor (`char_length`): code points, não unidades UTF-16. */
export function caracteres(texto: string): number {
  return [...texto].length
}
