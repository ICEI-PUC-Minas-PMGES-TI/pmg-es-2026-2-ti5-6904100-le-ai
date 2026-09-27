const MINUTOS_POR_HORA = 60

export function rotuloPaginaDeTotal(pagina: number, totalPaginas: number): string {
  return `Página ${pagina} de ${totalPaginas}`
}

export function rotuloPaginas(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'página' : 'páginas'}`
}

export function rotuloRegistros(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'registro' : 'registros'}`
}

export function rotuloTempo(minutos: number): string {
  const horas = Math.floor(minutos / MINUTOS_POR_HORA)
  const resto = minutos % MINUTOS_POR_HORA
  if (horas === 0) return `${resto} min`
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

export const TEXTOS_DO_REGISTRO = {
  titulo: 'Registrar progresso',
  tituloEdicao: 'Editar progresso',
  ajudaPaginaEdicao: (minima: number, maxima: number, paginaAnterior: number) =>
    `Entre ${minima} e ${maxima}. O registro anterior é da página ${paginaAnterior}.`,
  rotuloPagina: 'Página em que parou',
  ajudaPagina: (minima: number, maxima: number) =>
    `Entre ${minima} e ${maxima}. Informe onde você parou, não quantas páginas leu.`,
  rotuloTempo: 'Tempo gasto',
  sufixoHoras: 'h',
  sufixoMinutos: 'min',
  ajudaTempo: 'Opcional. Ajuda a calcular sua média de leitura.',
  derivado: (paginasLidas: number) => `Você leu ${rotuloPaginas(paginasLidas)}`,
  erroPaginaBaixa: (paginaAtual: number) => `Você já está na página ${paginaAtual}. Informe uma página maior.`,
  erroPaginaAlta: (totalPaginas: number) =>
    `O livro tem ${totalPaginas} páginas. Informe uma página até ${totalPaginas}.`,
  erroPaginaAusente: 'Informe a página em que parou, em número inteiro.',
  erroTempoInvalido: 'Informe o tempo em horas e minutos inteiros.',
  erroTempoMaximo: 'Informe até 12 horas de leitura por registro.',
  erroEnvio: 'Não foi possível salvar. Verifique sua conexão e tente de novo.',
  erroListaDesatualizada: 'Suas atualizações mudaram em outro lugar. Recarregamos a lista para você conferir.',
  avisoOffline: 'Registro salvo no aparelho. Será enviado quando você voltar a ficar online.',
  botaoSalvar: 'Salvar',
  botaoSalvarEdicao: 'Salvar alterações',
  botaoSalvando: 'Salvando',
  botaoCancelar: 'Cancelar',
} as const

export const ROTULO_VER_ATUALIZACOES = 'Ver atualizações'

export const TEXTOS_DAS_ATUALIZACOES = {
  titulo: 'Progresso',
  iniciada: 'Iniciada',
  iniciadaEm: (dataPorExtenso: string) => `Iniciada em ${dataPorExtenso}`,
  rotuloLidas: 'Lidas',
  rotuloTempo: 'Tempo',
  rotuloRegistros: 'Registros',
  tituloSecao: 'Atualizações',
  itemPagina: (pagina: number) => `página ${pagina}`,
  itemDetalhe: (paginasLidas: number, minutos: number) =>
    minutos === 0 ? rotuloPaginas(paginasLidas) : `${rotuloPaginas(paginasLidas)} · ${rotuloTempo(minutos)}`,
  cabecalhoData: 'Data',
  cabecalhoPagina: 'Página',
  cabecalhoPaginasLidas: 'Páginas lidas',
  cabecalhoTempo: 'Tempo',
  avisoRitmo: (paginasLidas: number, minutos: number, paginaAnterior: number) =>
    `${rotuloPaginas(paginasLidas)} ${minutos === 0 ? 'de uma vez' : `em ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`}. Se você digitou errado, exclua este registro para voltar à página ${paginaAnterior}.`,
  confirmacaoTitulo: 'Excluir esta atualização?',
  confirmacaoTexto: (paginaAtual: number, percentual: number) =>
    `Sua página atual volta para ${paginaAtual} e o percentual para ${Math.round(percentual)}%. Os outros registros não mudam.`,
  confirmacaoBotao: 'Excluir atualização',
  botaoCancelar: 'Cancelar',
  rotuloExcluir: (pagina: number) => `Excluir a atualização da página ${pagina}`,
  rotuloEditar: (pagina: number) => `Editar a atualização da página ${pagina}`,
  confirmacaoAlcance: (quantidade: number) =>
    quantidade === 2
      ? 'Esta atualização e a seguinte serão excluídas.'
      : `Esta atualização e as ${quantidade - 1} seguintes serão excluídas.`,
  vazioTitulo: 'Nenhuma atualização ainda',
  vazioTexto: 'Registre em qual página você parou para acompanhar seu progresso.',
  vazioBotao: 'Registrar progresso',
  erroTexto: 'Não foi possível carregar suas atualizações. Verifique sua conexão e tente de novo.',
  erroBotao: 'Tentar de novo',
} as const
