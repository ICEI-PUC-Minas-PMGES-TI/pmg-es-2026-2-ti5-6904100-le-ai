/**
 * Edição do texto cru pela barra de formatação do editor de resenha (escrever-resenha.md §4.1),
 * sem DOM, para testar sem montar o editor. Cada operação recebe o texto e a seleção e devolve o
 * texto e a seleção novos. O mobile tem a mesma lógica em `markdown_edicao.dart`.
 */
export interface Edicao {
  texto: string
  inicio: number
  fim: number
}

export type Marca = '**' | '*' | '~~'
export type Prefixo = 'ul' | 'ol' | 'q'

const PADRAO_DA_MARCA: Record<Marca, RegExp> = {
  '**': /\*\*(?=\S)(.*?\S)\*\*/g,
  '*': /(?<![*\w])\*(?=[^\s*])(.*?[^\s*])\*(?![*\w])/g,
  '~~': /~~(?=\S)(.*?\S)~~/g,
}

const PADRAO_DO_PREFIXO: Record<Prefixo, RegExp> = {
  ul: /^- /,
  ol: /^\d+\. /,
  q: /^> /,
}

const QUALQUER_LISTA = /^(- |\d+\. )/

function limitesDaLinha(texto: string, posicao: number): { inicio: number; fim: number } {
  const inicio = texto.lastIndexOf('\n', posicao - 1) + 1
  const quebra = texto.indexOf('\n', posicao)
  return { inicio, fim: quebra === -1 ? texto.length : quebra }
}

/** O trecho marcado que contém a seleção, na linha dela, ou `null`. */
function trechoMarcado(e: Edicao, marca: Marca): { inicio: number; fim: number } | null {
  const linha = limitesDaLinha(e.texto, e.inicio)
  if (e.fim > linha.fim) return null
  const conteudo = e.texto.slice(linha.inicio, linha.fim)
  for (const achado of conteudo.matchAll(PADRAO_DA_MARCA[marca])) {
    const inicio = linha.inicio + (achado.index ?? 0)
    const fim = inicio + achado[0].length
    if (e.inicio >= inicio && e.fim <= fim) return { inicio, fim }
  }
  return null
}

/** O botão de negrito, itálico ou tachado fica ativo com o cursor dentro da formatação. */
export function marcaAtiva(e: Edicao, marca: Marca): boolean {
  return trechoMarcado(e, marca) !== null
}

/**
 * Negrito, itálico e tachado envolvem a seleção; sem seleção, inserem o par com o cursor no
 * meio. Com o cursor dentro da formatação, removem o par.
 */
export function alternarMarca(e: Edicao, marca: Marca): Edicao {
  const tamanho = marca.length
  const marcado = trechoMarcado(e, marca)
  if (marcado) {
    const texto =
      e.texto.slice(0, marcado.inicio) +
      e.texto.slice(marcado.inicio + tamanho, marcado.fim - tamanho) +
      e.texto.slice(marcado.fim)
    const ajustar = (posicao: number) =>
      Math.min(Math.max(posicao - tamanho, marcado.inicio), marcado.fim - 2 * tamanho)
    return { texto, inicio: ajustar(e.inicio), fim: ajustar(e.fim) }
  }
  const texto = e.texto.slice(0, e.inicio) + marca + e.texto.slice(e.inicio, e.fim) + marca + e.texto.slice(e.fim)
  return { texto, inicio: e.inicio + tamanho, fim: e.fim + tamanho }
}

function linhasDaSelecao(e: Edicao): { inicio: number; fim: number; linhas: string[] } {
  const inicio = limitesDaLinha(e.texto, e.inicio).inicio
  const fim = limitesDaLinha(e.texto, Math.max(e.inicio, e.fim)).fim
  return { inicio, fim, linhas: e.texto.slice(inicio, fim).split('\n') }
}

/** A linha do cursor começa com o prefixo da lista ou da citação. */
export function prefixoAtivo(e: Edicao, prefixo: Prefixo): boolean {
  const linha = limitesDaLinha(e.texto, e.inicio)
  return PADRAO_DO_PREFIXO[prefixo].test(e.texto.slice(linha.inicio, linha.fim))
}

/**
 * Lista com marcadores, lista numerada e citação põem o prefixo em cada linha selecionada (ou na
 * do cursor), com a lista numerada em sequência. Se todas já têm o prefixo, ele sai. Trocar o tipo
 * de lista troca o marcador.
 */
export function alternarPrefixo(e: Edicao, prefixo: Prefixo): Edicao {
  const { inicio, fim, linhas } = linhasDaSelecao(e)
  const padrao = PADRAO_DO_PREFIXO[prefixo]
  const todas = linhas.every((linha) => padrao.test(linha))
  const novas = linhas.map((linha, indice) => {
    if (todas) return linha.replace(padrao, '')
    const semLista = prefixo === 'q' ? linha.replace(padrao, '') : linha.replace(QUALQUER_LISTA, '')
    const marcador = prefixo === 'ul' ? '- ' : prefixo === 'ol' ? `${indice + 1}. ` : '> '
    return marcador + semLista
  })
  const bloco = novas.join('\n')
  const texto = e.texto.slice(0, inicio) + bloco + e.texto.slice(fim)
  if (e.inicio === e.fim && linhas.length === 1) {
    const diferenca = bloco.length - (fim - inicio)
    const cursor = Math.max(inicio, e.inicio + diferenca)
    return { texto, inicio: cursor, fim: cursor }
  }
  return { texto, inicio, fim: inicio + bloco.length }
}

/**
 * `Enter` dentro de uma lista continua com o próximo marcador; num item vazio, sai da lista.
 * Fora de lista, ou com seleção, devolve `null` e o `Enter` segue o normal.
 */
export function continuarLista(e: Edicao): Edicao | null {
  if (e.inicio !== e.fim) return null
  const linha = limitesDaLinha(e.texto, e.inicio)
  const antes = e.texto.slice(linha.inicio, e.inicio)
  const lista = /^(- |(\d+)\. )(.*)$/.exec(antes)
  if (!lista) return null
  if (lista[3].trim() === '' && e.texto.slice(e.inicio, linha.fim).trim() === '') {
    const texto = e.texto.slice(0, linha.inicio) + e.texto.slice(linha.fim)
    return { texto, inicio: linha.inicio, fim: linha.inicio }
  }
  const marcador = lista[2] ? `${Number(lista[2]) + 1}. ` : '- '
  const insercao = `\n${marcador}`
  const texto = e.texto.slice(0, e.inicio) + insercao + e.texto.slice(e.inicio)
  const cursor = e.inicio + insercao.length
  return { texto, inicio: cursor, fim: cursor }
}
