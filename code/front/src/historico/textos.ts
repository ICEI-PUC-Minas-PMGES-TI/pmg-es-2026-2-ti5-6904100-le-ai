import { formatarData } from '../livros/formatos'

export function textoLeiturasConcluidas(total: number): string {
  return `${total} ${total === 1 ? 'leitura concluída' : 'leituras concluídas'}`
}

function livros(total: number): string {
  return `${total} ${total === 1 ? 'livro' : 'livros'}`
}

export function dataPorExtenso(data: string): string {
  return formatarData(`${data}T00:00:00`)
}

const MS_POR_DIA = 86_400_000

export function duracaoEmDias(dataInicio: string, dataFim: string): number {
  return Math.round((Date.parse(`${dataFim}T00:00:00Z`) - Date.parse(`${dataInicio}T00:00:00Z`)) / MS_POR_DIA) + 1
}

export function textoDuracao(dias: number): string {
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

export const TEXTOS_DO_HISTORICO = {
  rotuloPesquisa: 'Pesquisar no histórico',
  placeholder: 'Título ou autor',
  ajudaPesquisa: 'Busca em todos os anos.',
  limparPesquisa: 'Limpar pesquisa',
  rotuloAnos: 'Ano',
  todosOsAnos: 'Todos os anos',
  leitura: 'Leitura',
  releitura: 'Releitura',
  cabecalhoLivro: 'Livro',
  cabecalhoTipo: 'Tipo',
  cabecalhoInicio: 'Início',
  cabecalhoConclusao: 'Conclusão',
  cabecalhoDuracao: 'Duração',
  carregando: 'Carregando histórico',
  erroTexto: 'Não foi possível carregar seu histórico. Verifique sua conexão e tente de novo.',
  erroBotao: 'Tentar de novo',
  vazioTitulo: 'Nenhuma leitura concluída ainda',
  vazioTexto:
    'Quando você finalizar um livro, ele entra aqui com a data de conclusão. Releituras finalizadas também contam.',
  vazioBotao: 'Ver minha estante',
  semResultadoTitulo: 'Nenhuma leitura concluída com esse nome',
  semResultadoTexto: 'A pesquisa olha o título e o autor de tudo o que você já concluiu, em todos os anos.',
  semResultadoNoAno: (ano: number) => `Nada com esse nome em ${ano}.`,
  pesquisarEmTodosOsAnos: 'Pesquisar em todos os anos',
} as const

export function textoLeiturasDoAno(total: number): string {
  return `${total} ${total === 1 ? 'leitura' : 'leituras'}`
}

export function textoContagem(
  totais: { livros: number; leituras: number },
  filtro: { ano?: number; q?: string },
): string {
  if (!filtro.q) return filtro.ano ? `${textoLeiturasConcluidas(totais.leituras)} em ${filtro.ano}` : textoLeiturasConcluidas(totais.leituras)
  const escopo = filtro.ano ? `${livros(totais.livros)} em ${filtro.ano}` : `${livros(totais.livros)} no seu histórico`
  return totais.leituras === 0 ? escopo : `${escopo}, ${textoLeiturasConcluidas(totais.leituras)}`
}

export function textoConcluido(dataFim: string, duracaoDias: number): string {
  return `Concluído em ${dataPorExtenso(dataFim)} · ${textoDuracao(duracaoDias)}`
}
