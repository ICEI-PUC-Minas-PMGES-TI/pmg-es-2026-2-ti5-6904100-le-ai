import type { OcorrenciaDaLista } from './useHistorico'

export interface GrupoDoAno {
  ano: number
  ocorrencias: OcorrenciaDaLista[]
}

export interface GrupoDoLivro {
  livroId: string
  livro: OcorrenciaDaLista['livro']
  ocorrencias: OcorrenciaDaLista[]
}

export function anoDaConclusao(ocorrencia: OcorrenciaDaLista): number {
  return Number(ocorrencia.dataFim.slice(0, 4))
}

export function agruparPorAno(ocorrencias: OcorrenciaDaLista[]): GrupoDoAno[] {
  const grupos: GrupoDoAno[] = []
  for (const ocorrencia of ocorrencias) {
    const ano = anoDaConclusao(ocorrencia)
    const ultimo = grupos.at(-1)
    if (ultimo?.ano === ano) ultimo.ocorrencias.push(ocorrencia)
    else grupos.push({ ano, ocorrencias: [ocorrencia] })
  }
  return grupos
}

export function agruparPorLivro(ocorrencias: OcorrenciaDaLista[]): GrupoDoLivro[] {
  const grupos = new Map<string, GrupoDoLivro>()
  for (const ocorrencia of ocorrencias) {
    const grupo = grupos.get(ocorrencia.livro.id)
    if (grupo) grupo.ocorrencias.push(ocorrencia)
    else grupos.set(ocorrencia.livro.id, { livroId: ocorrencia.livro.id, livro: ocorrencia.livro, ocorrencias: [ocorrencia] })
  }
  return [...grupos.values()]
}
