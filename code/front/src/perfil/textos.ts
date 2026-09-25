/**
 * Textos derivados das telas de F-PERFIL. Os modais usam o primeiro nome da pessoa, não o
 * username (seguidores-e-seguidos.md §8), e todo número aparece com unidade.
 *
 * **Sem pronome de gênero.** Os protótipos escrevem "ele" e "ela" a partir do nome, mas o
 * produto não sabe o gênero de ninguém, e adivinhar pelo nome erra com gente real. As frases
 * usam "essa pessoa" e o nome.
 */
export function primeiroNome(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName
}

export function contagem(valor: number, singular: string, plural: string): string {
  return `${valor} ${valor === 1 ? singular : plural}`
}

const MINUTO = 60_000
const HORA = 60 * MINUTO
const DIA = 24 * HORA
const SEMANA = 7 * DIA
const MES = 30 * DIA
const ANO = 365 * DIA

/** `há 2 horas`, `há 3 dias`, `há 1 semana` (solicitacoes-de-seguir.md §3). */
export function tempoDeEspera(iso: string, agora: Date = new Date()): string {
  const passado = Math.max(0, agora.getTime() - new Date(iso).getTime())
  const faixas: [number, string, string][] = [
    [ANO, 'ano', 'anos'],
    [MES, 'mês', 'meses'],
    [SEMANA, 'semana', 'semanas'],
    [DIA, 'dia', 'dias'],
    [HORA, 'hora', 'horas'],
    [MINUTO, 'minuto', 'minutos'],
  ]
  for (const [tamanho, singular, plural] of faixas) {
    if (passado >= tamanho) {
      return `há ${contagem(Math.floor(passado / tamanho), singular, plural)}`
    }
  }
  return 'agora'
}
