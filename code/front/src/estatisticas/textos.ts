import type { PeriodoEstatisticas, PontoEstatistica } from '../services/leitura'
import { capitalizar, type DataLocal, diaEMes, formatarInteiro, lerData, MESES, MESES_ABREVIADOS } from './formatos'

/**
 * Copy das estatísticas (F-STA), do protótipo `F-STA/prototipos/estatisticas.html`
 * e da copy completa do prompt (§8). Zero em-dash, número sempre com unidade.
 *
 * O "desde" diz o primeiro registro de leitura, não a entrada na conta: a data
 * que o `leitura` devolve é a do primeiro progresso ou fim de leitura (decisão
 * do dono, 12/10/2026).
 */

export type Medida = 'paginas' | 'livros'

export function rotuloPaginas(valor: number): string {
  return `${formatarInteiro(valor)} ${valor === 1 ? 'página' : 'páginas'}`
}

export function rotuloLivros(valor: number): string {
  return `${formatarInteiro(valor)} ${valor === 1 ? 'livro' : 'livros'}`
}

export function rotuloDaMedida(medida: Medida, valor: number): string {
  return medida === 'paginas' ? rotuloPaginas(valor) : rotuloLivros(valor)
}

export const TEXTOS_DAS_ESTATISTICAS = {
  titulo: 'Estatísticas',
  periodo: 'Período',
  acumulado: 'Acumulado',
  totais: 'Totais',
  livrosConcluidos: 'Livros concluídos',
  paginasLidas: 'Páginas lidas',
  tempoDeLeitura: 'Tempo de leitura',
  ajudaDosTotais:
    'Páginas lidas incluem as leituras que você abandonou. O tempo soma as sessões cronometradas e o tempo que você informou nos registros.',
  medias: 'Médias',
  paginasPorDia: 'Páginas por dia',
  ajudaPaginasPorDia: 'Só conta os dias em que você registrou leitura.',
  unidadePaginasPorDia: 'páginas por dia',
  diasPorLivro: 'Dias por livro',
  ajudaDiasPorLivro: 'Do início ao fim de cada leitura concluída, com os dias sem leitura.',
  unidadeDiasPorLivro: 'dias por livro',
  notaMedia: 'Nota média',
  unidadeNotaMedia: 'estrelas',
  verComoTabela: 'Ver como tabela',
  verComoGrafico: 'Ver como gráfico',
  rodape: 'Um registro novo pode levar alguns instantes para aparecer aqui.',
  vazioTitulo: 'Suas estatísticas começam no primeiro registro',
  vazioTexto:
    'Registre em que página você parou em qualquer livro da estante. Páginas, tempo e médias passam a ser contados a partir daí.',
  vazioAcao: 'Ir para a estante',
  erro: 'Não foi possível carregar suas estatísticas. Verifique sua conexão e tente de novo.',
  tentarDeNovo: 'Tentar de novo',
  carregando: 'Carregando estatísticas',
  ateHoje: 'até hoje',
} as const

/** Rótulo do período no seletor e nas frases: `2026` ou `Acumulado`. */
export function rotuloDoPeriodo(periodo: PeriodoEstatisticas): string {
  return periodo === 'acumulado' ? TEXTOS_DAS_ESTATISTICAS.acumulado : String(periodo)
}

/**
 * O intervalo exato que os números cobrem:
 * - ano corrente: `De 1º de janeiro a 29 de setembro de 2026`;
 * - ano fechado: `De 1º de janeiro a 31 de dezembro de 2025`;
 * - ano do primeiro registro: `De 12 de novembro a 31 de dezembro de 2023, desde o seu primeiro registro`;
 * - acumulado: `Desde 12 de novembro de 2023, seu primeiro registro`.
 */
export function linhaDoPeriodo(
  periodo: PeriodoEstatisticas,
  hoje: DataLocal,
  primeiroRegistro: string | null,
): string {
  const primeiro = primeiroRegistro ? lerData(primeiroRegistro) : null
  if (periodo === 'acumulado') {
    return primeiro ? `Desde ${diaEMes(primeiro)} de ${primeiro.ano}, seu primeiro registro` : ''
  }
  const doPrimeiroAno = primeiro !== null && primeiro.ano === periodo
  const inicio = doPrimeiroAno ? primeiro : { mes: 1, dia: 1 }
  const fim = periodo === hoje.ano ? hoje : { mes: 12, dia: 31 }
  const linha = `De ${diaEMes(inicio)} a ${diaEMes(fim)} de ${periodo}`
  return doPrimeiroAno ? `${linha}, desde o seu primeiro registro` : linha
}

/** Anúncio para leitor de tela quando todos os números mudam de uma vez (§9). */
export function anuncioDoPeriodo(periodo: PeriodoEstatisticas, linha: string): string {
  const intervalo = linha ? `, ${linha.charAt(0).toLowerCase()}${linha.slice(1)}` : ''
  return periodo === 'acumulado' ? `Mostrando o acumulado${intervalo}` : `Mostrando ${periodo}${intervalo}`
}

/** Ajuda da nota média, com a quantidade de notas que a compõe. */
export function ajudaDaNota(periodo: PeriodoEstatisticas, quantidade: number): string {
  const quando = periodo === 'acumulado' ? 'já deu' : `deu em ${periodo}`
  if (quantidade === 0) return `Média das notas que você ${quando}.`
  if (quantidade === 1) return `A única nota que você ${quando}.`
  return `Média das ${formatarInteiro(quantidade)} notas que você ${quando}.`
}

const EM = (periodo: PeriodoEstatisticas) => (periodo === 'acumulado' ? '' : ` em ${periodo}`)

/** Frases no lugar da média sem denominador: nunca `0`, nunca traço. */
export const MEDIA_AUSENTE = {
  paginasPorDia: (periodo: PeriodoEstatisticas) => `Sem dias com leitura${EM(periodo)}`,
  diasPorLivro: (periodo: PeriodoEstatisticas) => `Sem leituras concluídas${EM(periodo)}`,
  notaMedia: (periodo: PeriodoEstatisticas) =>
    periodo === 'acumulado' ? 'Nenhuma nota dada ainda' : `Nenhuma nota dada em ${periodo}`,
}

export function tituloDoGrafico(medida: Medida, granularidade: 'mes' | 'ano'): string {
  const base = medida === 'paginas' ? 'Páginas' : 'Livros concluídos'
  return `${base} por ${granularidade === 'mes' ? 'mês' : 'ano'}`
}

/**
 * Subtítulo com o total da série: `3.818 páginas de janeiro a setembro`,
 * `5.150 páginas em 2025`, `13.538 páginas desde 2023`.
 */
export function subtituloDoGrafico(
  medida: Medida,
  pontos: readonly PontoEstatistica[],
  periodo: PeriodoEstatisticas,
): string {
  const total = rotuloDaMedida(medida, somaDaMedida(medida, pontos))
  if (pontos.length === 0) return total
  const primeiro = pontos[0]!
  const ultimo = pontos[pontos.length - 1]!
  if (periodo === 'acumulado') return `${total} desde ${primeiro.ano}`
  if (primeiro.mes === 1 && ultimo.mes === 12) return `${total} em ${periodo}`
  if (primeiro.mes === ultimo.mes) return `${total} em ${MESES[primeiro.mes! - 1]}`
  return `${total} de ${MESES[primeiro.mes! - 1]} a ${MESES[ultimo.mes! - 1]}`
}

/** Linha no lugar do gráfico quando o período não tem nada desta medida. */
export function graficoSemDados(medida: Medida, periodo: PeriodoEstatisticas): string {
  const quando = periodo === 'acumulado' ? '' : ` em ${periodo}`
  return medida === 'livros' ? `Nenhum livro concluído${quando}.` : `Nenhuma página registrada${quando}.`
}

export function valorDoPonto(medida: Medida, ponto: PontoEstatistica): number {
  return medida === 'paginas' ? ponto.paginasLidas : ponto.livrosConcluidos
}

export function somaDaMedida(medida: Medida, pontos: readonly PontoEstatistica[]): number {
  return pontos.reduce((soma, p) => soma + valorDoPonto(medida, p), 0)
}

/** O ponto ainda está em andamento: mês corrente, ou ano corrente no acumulado. */
export function pontoEmAndamento(ponto: PontoEstatistica, hoje: DataLocal): boolean {
  return ponto.ano === hoje.ano && (ponto.mes === null || ponto.mes === hoje.mes)
}

/** `jul` no eixo do ano; `2025` no acumulado. */
export function marcaDoEixoX(ponto: PontoEstatistica): string {
  return ponto.mes === null ? String(ponto.ano) : MESES_ABREVIADOS[ponto.mes - 1]!
}

/** Nome do ponto por extenso: `Julho de 2026` ou `2025`. */
export function nomeDoPonto(ponto: PontoEstatistica): string {
  return ponto.mes === null ? String(ponto.ano) : `${capitalizar(MESES[ponto.mes - 1]!)} de ${ponto.ano}`
}

/** Primeira linha do balão: `Julho de 2026`; no mês corrente, `Setembro de 2026, até hoje`. */
export function tituloDoBalao(ponto: PontoEstatistica, hoje: DataLocal): string {
  const nome = nomeDoPonto(ponto)
  return pontoEmAndamento(ponto, hoje) ? `${nome}, ${TEXTOS_DAS_ESTATISTICAS.ateHoje}` : nome
}

/** Valor do balão: `604 páginas`, `2 livros`; mês sem livro, `0 livros concluídos`. */
export function valorDoBalao(medida: Medida, ponto: PontoEstatistica): string {
  const valor = valorDoPonto(medida, ponto)
  if (medida === 'livros' && valor === 0) return '0 livros concluídos'
  return rotuloDaMedida(medida, valor)
}

/** Nome da linha na tabela: `Janeiro` ou `2025`. */
export function nomeNaTabela(ponto: PontoEstatistica): string {
  return ponto.mes === null ? String(ponto.ano) : capitalizar(MESES[ponto.mes - 1]!)
}

/**
 * Resumo do gráfico para leitor de tela (§9): `Gráfico de colunas, páginas por
 * mês em 2026, de janeiro a setembro. Maior valor: julho, 604 páginas.`
 */
export function resumoDoGrafico(
  medida: Medida,
  pontos: readonly PontoEstatistica[],
  periodo: PeriodoEstatisticas,
): string {
  const granularidade = pontos[0]?.mes === null ? 'ano' : 'mes'
  const titulo = tituloDoGrafico(medida, granularidade).toLowerCase()
  const maior = pontoDeMaiorValor(medida, pontos)
  const pontoMaior = maior
    ? ` Maior valor: ${maior.mes === null ? maior.ano : MESES[maior.mes - 1]}, ${rotuloDaMedida(medida, valorDoPonto(medida, maior))}.`
    : ''
  return `Gráfico de colunas, ${titulo} ${intervaloDaSerie(pontos, periodo)}.${pontoMaior}`
}

/** `em 2026, de janeiro a setembro`, `em 2025`, `desde 2023`. */
function intervaloDaSerie(pontos: readonly PontoEstatistica[], periodo: PeriodoEstatisticas): string {
  const primeiro = pontos[0]
  const ultimo = pontos[pontos.length - 1]
  if (!primeiro || !ultimo) return periodo === 'acumulado' ? '' : `em ${periodo}`
  if (periodo === 'acumulado') return `desde ${primeiro.ano}`
  if (primeiro.mes === 1 && ultimo.mes === 12) return `em ${periodo}`
  if (primeiro.mes === ultimo.mes) return `em ${MESES[primeiro.mes! - 1]} de ${periodo}`
  return `em ${periodo}, de ${MESES[primeiro.mes! - 1]} a ${MESES[ultimo.mes! - 1]}`
}

/** O primeiro ponto com o maior valor (o rótulo direto vai só nele); nulo sem valor. */
export function pontoDeMaiorValor(
  medida: Medida,
  pontos: readonly PontoEstatistica[],
): PontoEstatistica | null {
  return pontos.reduce<PontoEstatistica | null>((maior, p) => {
    const valor = valorDoPonto(medida, p)
    if (valor === 0) return maior
    return maior === null || valor > valorDoPonto(medida, maior) ? p : maior
  }, null)
}

/** Leitura de cada mês: `Julho de 2026, 604 páginas`. */
export function leituraDoPonto(medida: Medida, ponto: PontoEstatistica, hoje: DataLocal): string {
  return `${tituloDoBalao(ponto, hoje)}, ${valorDoBalao(medida, ponto)}`
}

/** Blocos `Estatísticas do ano` do Meu perfil e do perfil de outro leitor. */
export const TEXTOS_DO_BLOCO = {
  titulo: 'Estatísticas do ano',
  verEstatisticas: 'Ver estatísticas',
  ateHoje: (ano: number) => `${ano}, até hoje`,
  livrosConcluidos: (valor: number) => (valor === 1 ? 'livro concluído' : 'livros concluídos'),
  paginasLidas: (valor: number) => (valor === 1 ? 'página lida' : 'páginas lidas'),
  deLeitura: 'de leitura',
  vazioProprio: 'Suas estatísticas começam no primeiro registro de progresso.',
  vazioDeOutro: (nome: string, ano: number) => `${nome} ainda não registrou leituras em ${ano}.`,
  erroProprio: TEXTOS_DAS_ESTATISTICAS.erro,
  erroDeOutro: (nome: string) =>
    `Não foi possível carregar as estatísticas de ${nome}. Verifique sua conexão e tente de novo.`,
  carregando: 'Carregando estatísticas do ano',
}

