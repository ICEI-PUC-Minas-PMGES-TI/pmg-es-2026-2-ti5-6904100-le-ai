export function caminhoDoProgresso(leituraId: string): string {
  return `/estante/leituras/${encodeURIComponent(leituraId)}/progresso`
}
