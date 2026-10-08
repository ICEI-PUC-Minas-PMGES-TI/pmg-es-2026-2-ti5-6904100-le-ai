import type { LocationQuery } from 'vue-router'

import type { FiltrosDaBusca } from '../services/acervo'

/**
 * Filtros avançados do Descobrir (RF-ACV-03, descobrir.md do Período 2). Autor, editora e série
 * são texto livre, sem autocompletar; `ano` é valor único; a faixa de páginas é fechada e cada lado
 * vale sozinho. Tudo aqui é puro: o composable guarda o estado e a tela desenha.
 */
export interface FiltrosAplicados extends FiltrosDaBusca {
  autor: string | null
  editora: string | null
  serie: string | null
  ano: number | null
  paginasMin: number | null
  paginasMax: number | null
}

export const SEM_FILTROS: Readonly<FiltrosAplicados> = Object.freeze({
  autor: null,
  editora: null,
  serie: null,
  ano: null,
  paginasMin: null,
  paginasMax: null,
})

/** Um chip por filtro; a faixa de páginas é um chip só. */
export type ChaveDoFiltro = 'autor' | 'editora' | 'serie' | 'ano' | 'paginas'

export interface ChipDeFiltro {
  chave: ChaveDoFiltro
  rotulo: string
}

/** Teto do contrato para os textos e limites que evitam o `400` do servidor. */
export const MAXIMO_DO_TEXTO = 200
export const DIGITOS_DO_ANO = 4
export const DIGITOS_DAS_PAGINAS = 5

export const MENSAGEM_FAIXA_INVERTIDA = 'O mínimo não pode ser maior que o máximo.'
export const MENSAGEM_PAGINAS_ZERO = 'Use um número de páginas maior que zero.'
export const MENSAGEM_ANO_ZERO = 'Use um ano maior que zero.'

export function temFiltros(filtros: FiltrosAplicados): boolean {
  return contarFiltros(filtros) > 0
}

/** O número do badge: a faixa conta 1, e o assunto não entra (já aparece ativo na faixa). */
export function contarFiltros(filtros: FiltrosAplicados): number {
  return chipsDosFiltros(filtros).length
}

export function rotuloDaFaixa(minimo: number | null, maximo: number | null): string | null {
  if (minimo !== null && maximo !== null) {
    return `${minimo} a ${maximo} páginas`
  }
  if (minimo !== null) {
    return `A partir de ${minimo} páginas`
  }
  return maximo !== null ? `Até ${maximo} páginas` : null
}

export function chipsDosFiltros(filtros: FiltrosAplicados): ChipDeFiltro[] {
  const chips: ChipDeFiltro[] = []
  if (filtros.autor) {
    chips.push({ chave: 'autor', rotulo: `Autor: ${filtros.autor}` })
  }
  if (filtros.editora) {
    chips.push({ chave: 'editora', rotulo: `Editora: ${filtros.editora}` })
  }
  if (filtros.serie) {
    chips.push({ chave: 'serie', rotulo: `Série: ${filtros.serie}` })
  }
  if (filtros.ano !== null) {
    chips.push({ chave: 'ano', rotulo: `Ano: ${filtros.ano}` })
  }
  const faixa = rotuloDaFaixa(filtros.paginasMin, filtros.paginasMax)
  if (faixa) {
    chips.push({ chave: 'paginas', rotulo: faixa })
  }
  return chips
}

/** Remover um chip tira só aquele filtro; o da faixa tira os dois lados. */
export function semFiltro(filtros: FiltrosAplicados, chave: ChaveDoFiltro): FiltrosAplicados {
  if (chave === 'paginas') {
    return { ...filtros, paginasMin: null, paginasMax: null }
  }
  return { ...filtros, [chave]: null }
}

export function filtrosIguais(a: FiltrosAplicados, b: FiltrosAplicados): boolean {
  return (
    a.autor === b.autor &&
    a.editora === b.editora &&
    a.serie === b.serie &&
    a.ano === b.ano &&
    a.paginasMin === b.paginasMin &&
    a.paginasMax === b.paginasMax
  )
}

function textoDaQuery(valor: unknown): string | null {
  if (typeof valor !== 'string') {
    return null
  }
  const aparado = valor.trim().slice(0, MAXIMO_DO_TEXTO)
  return aparado === '' ? null : aparado
}

function inteiroPositivoDaQuery(valor: unknown, digitos: number): number | null {
  if (typeof valor !== 'string' || !new RegExp(`^\\d{1,${digitos}}$`).test(valor)) {
    return null
  }
  const numero = Number(valor)
  return numero > 0 ? numero : null
}

/**
 * Lê os filtros da URL, que pode ter sido editada à mão: o que não é válido fica de fora em vez de
 * virar um `400`. Faixa invertida descarta os dois lados.
 */
export function filtrosDaQuery(query: LocationQuery): FiltrosAplicados {
  const filtros: FiltrosAplicados = {
    autor: textoDaQuery(query.autor),
    editora: textoDaQuery(query.editora),
    serie: textoDaQuery(query.serie),
    ano: inteiroPositivoDaQuery(query.ano, DIGITOS_DO_ANO),
    paginasMin: inteiroPositivoDaQuery(query.paginasMin, DIGITOS_DAS_PAGINAS),
    paginasMax: inteiroPositivoDaQuery(query.paginasMax, DIGITOS_DAS_PAGINAS),
  }
  if (filtros.paginasMin !== null && filtros.paginasMax !== null && filtros.paginasMin > filtros.paginasMax) {
    return { ...filtros, paginasMin: null, paginasMax: null }
  }
  return filtros
}

/** Para `router.replace`: `undefined` tira a chave da URL. */
export function filtrosParaQuery(filtros: FiltrosAplicados): Record<keyof FiltrosAplicados, string | undefined> {
  const texto = (valor: string | number | null) => (valor === null ? undefined : String(valor))
  return {
    autor: texto(filtros.autor),
    editora: texto(filtros.editora),
    serie: texto(filtros.serie),
    ano: texto(filtros.ano),
    paginasMin: texto(filtros.paginasMin),
    paginasMax: texto(filtros.paginasMax),
  }
}

/** O que está digitado no formulário, antes de aplicar. */
export interface RascunhoDosFiltros {
  autor: string
  editora: string
  serie: string
  ano: string
  paginasMin: string
  paginasMax: string
}

export function rascunhoDe(filtros: FiltrosAplicados): RascunhoDosFiltros {
  const texto = (valor: string | number | null) => (valor === null ? '' : String(valor))
  return {
    autor: texto(filtros.autor),
    editora: texto(filtros.editora),
    serie: texto(filtros.serie),
    ano: texto(filtros.ano),
    paginasMin: texto(filtros.paginasMin),
    paginasMax: texto(filtros.paginasMax),
  }
}

export function rascunhoPreenchido(rascunho: RascunhoDosFiltros): boolean {
  return Object.values(rascunho).some((valor) => valor.trim() !== '')
}

/** Máscara dos campos numéricos: só dígitos, até `digitos` deles (ano e páginas aceitam só inteiros). */
export function soDigitos(digitos: number) {
  return (bruto: string, cursor: number) => {
    const antes = bruto.slice(0, cursor).replace(/\D/g, '')
    const valor = bruto.replace(/\D/g, '').slice(0, digitos)
    return { valor, cursor: Math.min(antes.length, valor.length) }
  }
}

export interface ErrosDosFiltros {
  ano?: string
  paginasMin?: string
  paginasMax?: string
  /** Faixa invertida: uma mensagem só, abaixo do par, com os dois campos em `rubi`. */
  faixa?: string
}

function numeroDoRascunho(valor: string): number | null {
  const aparado = valor.trim()
  return aparado === '' ? null : Number(aparado)
}

/** Validação do cliente (descobrir.md): com erro, nada vai ao servidor. */
export function validarRascunho(rascunho: RascunhoDosFiltros): ErrosDosFiltros {
  const erros: ErrosDosFiltros = {}
  const ano = numeroDoRascunho(rascunho.ano)
  const minimo = numeroDoRascunho(rascunho.paginasMin)
  const maximo = numeroDoRascunho(rascunho.paginasMax)
  if (ano !== null && !(Number.isInteger(ano) && ano > 0)) {
    erros.ano = MENSAGEM_ANO_ZERO
  }
  if (minimo !== null && !(Number.isInteger(minimo) && minimo > 0)) {
    erros.paginasMin = MENSAGEM_PAGINAS_ZERO
  }
  if (maximo !== null && !(Number.isInteger(maximo) && maximo > 0)) {
    erros.paginasMax = MENSAGEM_PAGINAS_ZERO
  }
  if (!erros.paginasMin && !erros.paginasMax && minimo !== null && maximo !== null && minimo > maximo) {
    erros.faixa = MENSAGEM_FAIXA_INVERTIDA
  }
  return erros
}

export function temErros(erros: ErrosDosFiltros): boolean {
  return Object.keys(erros).length > 0
}

/** Só chamar com o rascunho já validado. */
export function filtrosDoRascunho(rascunho: RascunhoDosFiltros): FiltrosAplicados {
  const texto = (valor: string) => {
    const aparado = valor.trim().slice(0, MAXIMO_DO_TEXTO)
    return aparado === '' ? null : aparado
  }
  return {
    autor: texto(rascunho.autor),
    editora: texto(rascunho.editora),
    serie: texto(rascunho.serie),
    ano: numeroDoRascunho(rascunho.ano),
    paginasMin: numeroDoRascunho(rascunho.paginasMin),
    paginasMax: numeroDoRascunho(rascunho.paginasMax),
  }
}
