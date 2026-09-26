/**
 * Formatação pt-BR dos números e datas que as telas de livro mostram, igual à do app
 * (`code/mobile/lib/features/livros/formatos.dart`).
 */
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** `4,5` e `4`, nunca `4.5` nem `4,0` (livro-pessoal.md §3). */
export function formatarNota(nota: number): string {
  return Number.isInteger(nota) ? String(nota) : nota.toFixed(1).replace('.', ',')
}

/** `12 de setembro de 2026`, sem zero à esquerda no dia. */
export function formatarData(iso: string): string {
  const data = new Date(iso)
  return `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}`
}

/** `8,2 MB`, com vírgula decimal (cadastro-pessoal.md §8). */
export function formatarMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/** `288 páginas`: todo número aparece com unidade. */
export function formatarPaginas(paginas: number): string {
  return paginas === 1 ? '1 página' : `${paginas} páginas`
}
