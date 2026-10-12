/**
 * Números, datas e tempo das estatísticas (F-STA) em pt-BR: milhar com ponto,
 * decimal com vírgula (`3.818`, `20,4`).
 */

const INTEIRO = new Intl.NumberFormat('pt-BR')
const DECIMAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const NOTA = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

export const MESES_ABREVIADOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const

export function formatarInteiro(valor: number): string {
  return INTEIRO.format(valor)
}

/** Média com até uma casa: `20,4`, `20`. */
export function formatarDecimal(valor: number): string {
  return DECIMAL.format(valor)
}

/** A nota média sempre com uma casa, como a escala de estrelas: `4,0`, `4,2`. */
export function formatarNotaMedia(valor: number): string {
  return NOTA.format(valor)
}

export interface ParteDoTempo {
  numero: string
  unidade: 'h' | 'min'
}

/**
 * Tempo em partes para desenhar número e unidade em estilos diferentes:
 * `71 h 20 min`, `88 h 05 min` (com horas, os minutos têm dois dígitos),
 * `45 min`.
 */
export function partesDoTempo(minutos: number): ParteDoTempo[] {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return [{ numero: String(resto), unidade: 'min' }]
  return [
    { numero: formatarInteiro(horas), unidade: 'h' },
    { numero: String(resto).padStart(2, '0'), unidade: 'min' },
  ]
}

export function rotuloDoTempo(minutos: number): string {
  return partesDoTempo(minutos)
    .map((p) => `${p.numero} ${p.unidade}`)
    .join(' ')
}

export interface DataLocal {
  ano: number
  /** 1 a 12. */
  mes: number
  dia: number
}

const DATA_EM_SAO_PAULO = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Hoje no fuso padrão do serviço, o mesmo que o `leitura` usa para escolher o
 * ano corrente e cortar o eixo no mês de hoje.
 */
export function hojeEmSaoPaulo(agora: Date = new Date()): DataLocal {
  return lerData(DATA_EM_SAO_PAULO.format(agora))
}

/** `AAAA-MM-DD` em partes, sem passar por `Date` (que mudaria o dia pelo fuso). */
export function lerData(iso: string): DataLocal {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return { ano: ano!, mes: mes!, dia: dia! }
}

/** `1º de janeiro`, `29 de setembro`. */
export function diaEMes(data: Pick<DataLocal, 'mes' | 'dia'>): string {
  return `${data.dia === 1 ? '1º' : data.dia} de ${MESES[data.mes - 1]}`
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
