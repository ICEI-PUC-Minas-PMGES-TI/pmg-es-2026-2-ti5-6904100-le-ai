import type { Frase } from '../services/leitura'

/** Textos das frases e trechos (frases-do-livro.md e adicionar-frase.md, seção 8). */

export const LIMITE_DO_TRECHO = 500

/** Caracteres Unicode (code points), como o servidor e o `char_length` do banco. */
export function contarCaracteres(texto: string): number {
  return [...texto].length
}

/** `14 frases`, `1 frase`, `0 frases`. */
export function rotuloDeFrases(total: number): string {
  return `${total} ${total === 1 ? 'frase' : 'frases'}`
}

/** `Página 57 · @marina.antunes`; a frase de quem olha diz `você`. */
export function referenciaDaFrase(frase: Pick<Frase, 'pagina' | 'minha' | 'autor'>): string {
  return `Página ${frase.pagina} · ${frase.minha ? 'você' : `@${frase.autor.username}`}`
}

/** Linha de cota do bloco do livro e do formulário. */
export function linhaDaCota(minhas: number, limite: number, noFormulario = false): string {
  if (minhas === 0) {
    return `Você ainda não guardou frases deste livro. Cabem até ${limite}.`
  }
  const base = `Você guardou ${minhas} de ${limite} frases deste livro.`
  return noFormulario && minhas === limite - 1 ? `${base} Esta é a última que cabe.` : base
}

export const TEXTOS_DAS_FRASES = {
  titulo: 'Frases e trechos',
  adicionar: 'Adicionar frase',
  verTodas: 'Ver todas as frases',
  limite: 'Você chegou ao limite de 10 frases por livro. Exclua uma das suas para guardar outra.',
  vazioTitulo: 'Nenhuma frase ainda',
  vazioTexto: 'Guarde um trecho que marcou você, com a página em que ele está.',
  vazioBotao: 'Adicionar a primeira',
  erroCarga: 'Não foi possível carregar as frases deste livro. Verifique sua conexão e tente de novo.',
  tentarDeNovo: 'Tentar de novo',
  excluirTitulo: 'Excluir esta frase?',
  excluirConsequencia: 'A frase sai desta lista e da página do livro. Não é possível desfazer.',
  excluirBotao: 'Excluir frase',
  excluirFalha: 'Não foi possível excluir a frase. Verifique sua conexão e tente de novo.',
  rotuloTrecho: 'Trecho',
  placeholderTrecho: 'Copie o trecho como está no livro.',
  ajudaTrecho: 'Até 500 caracteres.',
  rotuloPagina: 'Página',
  ajudaPagina: (total: number) => `Entre 1 e ${total}. É a página em que o trecho está.`,
  salvar: 'Salvar frase',
  salvando: 'Salvando',
  cancelar: 'Cancelar',
  erroTrechoVazio: 'Escreva o trecho que você quer guardar.',
  erroTrechoLongo: (excedente: number) => `Use até 500 caracteres. Tire ${excedente} para salvar.`,
  erroPaginaVazia: 'Informe a página em que o trecho está.',
  erroPaginaAcima: (total: number) => `O livro tem ${total} páginas. Informe uma página até ${total}.`,
  erroPaginaZero: 'Informe uma página a partir de 1.',
  erroEnvio: 'Não foi possível salvar a frase. Verifique sua conexão e tente de novo.',
  limiteNoEnvio: 'Você já guardou 10 frases deste livro. Exclua uma das suas para guardar esta.',
  verMinhas: 'Ver minhas frases',
  fechar: 'Fechar',
  naoSeraGuardado: 'O trecho que você escreveu não será guardado.',
  descartarTitulo: 'Descartar esta frase?',
  descartar: 'Descartar',
  continuar: 'Continuar escrevendo',
} as const

/** Erro do trecho, ou `null` quando ele vale (validação do cliente; o servidor confere de novo). */
export function erroDoTrecho(texto: string): string | null {
  if (texto.trim() === '') {
    return TEXTOS_DAS_FRASES.erroTrechoVazio
  }
  const total = contarCaracteres(texto)
  return total > LIMITE_DO_TRECHO ? TEXTOS_DAS_FRASES.erroTrechoLongo(total - LIMITE_DO_TRECHO) : null
}

/** Erro da página digitada, ou `null` quando ela está entre 1 e o total do livro. */
export function erroDaPagina(digitado: string, total: number): string | null {
  if (digitado.trim() === '') {
    return TEXTOS_DAS_FRASES.erroPaginaVazia
  }
  const pagina = Number(digitado)
  if (!Number.isInteger(pagina) || pagina < 1) {
    return TEXTOS_DAS_FRASES.erroPaginaZero
  }
  return pagina > total ? TEXTOS_DAS_FRASES.erroPaginaAcima(total) : null
}
