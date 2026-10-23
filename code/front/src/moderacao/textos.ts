import { formatarData } from '../livros/formatos'
import type { DenunciaPendente, RegistroDeModeracao } from '../services/moderacao'

/** Copy e formatos do painel de moderação (painel-de-moderacao.md §5 e §8). */

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const dois = (numero: number) => String(numero).padStart(2, '0')

/** `27 set, 21:08`, a data do item da fila. */
export function dataCurta(iso: string): string {
  const data = new Date(iso)
  return `${data.getDate()} ${MESES[data.getMonth()]!.slice(0, 3)}, ${dois(data.getHours())}:${dois(data.getMinutes())}`
}

/** `27 de setembro de 2026, às 21:08`. */
export function dataComHora(iso: string): string {
  const data = new Date(iso)
  return `${data.getDate()} de ${MESES[data.getMonth()]} de ${data.getFullYear()}, às ${dois(data.getHours())}:${dois(data.getMinutes())}`
}

/** `29/09/2026 10:12`, a coluna do registro. */
export function dataDoRegistro(iso: string): string {
  const data = new Date(iso)
  return `${dois(data.getDate())}/${dois(data.getMonth() + 1)}/${data.getFullYear()} ${dois(data.getHours())}:${dois(data.getMinutes())}`
}

export const CONTA_EXCLUIDA = 'conta excluída'

const VERBOS: Record<string, string> = {
  leitura_iniciada: 'começou a ler',
  leitura_retomada: 'retomou a leitura',
  leitura_concluida: 'terminou de ler',
  leitura_abandonada: 'abandonou a leitura',
  resenha_publicada: 'publicou uma resenha de',
}

export function nomeDoAutor(denuncia: DenunciaPendente): string {
  return denuncia.autor?.nomeExibicao ?? CONTA_EXCLUIDA
}

/** `Letícia Nakamura · Torto Arado` ou `Gustavo Lemes · atividade de Paula Nascimento`. */
export function lugarDaDenuncia(denuncia: DenunciaPendente): string {
  if (denuncia.tipo === 'comentario') {
    return denuncia.atividade ? `atividade de ${denuncia.atividade.autorNome}` : 'atividade removida'
  }
  return denuncia.livro?.titulo ?? 'livro indisponível'
}

/** Linha de lugar do card completo. */
export function linhaDoCard(denuncia: DenunciaPendente): string {
  const publicado = denuncia.conteudo?.publicadoEm
  if (denuncia.tipo === 'resenha') {
    const livro = denuncia.livro?.titulo
    const base = livro ? `Resenha de ${livro}` : 'Resenha'
    return publicado ? `${base} · publicada em ${formatarData(publicado)}` : base
  }
  const atividade = denuncia.atividade
  const base = atividade
    ? `Comentário na atividade ${atividade.autorNome} ${VERBOS[atividade.tipo] ?? 'publicou'} ${atividade.livroTitulo}`
    : 'Comentário'
  return publicado ? `${base} · ${dataCurta(publicado)}` : base
}

export function quemDenunciou(denuncia: DenunciaPendente): string {
  const quem = denuncia.denunciante ? `@${denuncia.denunciante.username}` : CONTA_EXCLUIDA
  return `Recebida em ${dataComHora(denuncia.criadoEm)}, de ${quem}`
}

export function consequenciaDaRemocao(denuncia: DenunciaPendente): string {
  const fim = 'A remoção não pode ser desfeita e fica no registro de auditoria.'
  if (denuncia.tipo === 'resenha') {
    return `A resenha sai da página do livro, do perfil de quem escreveu e do feed. ${fim}`
  }
  const respostas = denuncia.conteudo?.respostas ?? 0
  if (respostas > 0) {
    const quantas = respostas === 1 ? 'a 1 resposta' : `as ${respostas} respostas`
    return `O comentário e ${quantas} a ele saem da atividade para todos os leitores. ${fim}`
  }
  return `O comentário sai da atividade para todos os leitores. ${fim}`
}

function pessoa(username: string | null, anonimizado: boolean): string {
  return username && !anonimizado ? `@${username}` : CONTA_EXCLUIDA
}

/** `Removeu comentário`, `Arquivou denúncia`, `Removeu frase, sem denúncia`. */
export function acaoDoRegistro(registro: RegistroDeModeracao): string {
  if (registro.acao === 'arquivar_denuncia') {
    return 'Arquivou denúncia'
  }
  const alvo = { resenha: 'resenha', comentario: 'comentário', frase: 'frase' }[registro.alvoTipo]
  return registro.comDenuncia ? `Removeu ${alvo}` : `Removeu ${alvo}, sem denúncia`
}

/** `Comentário de @tiago na atividade de @rafa`, `Resenha de conta excluída em Quarto de Despejo`. */
export function alvoDoRegistro(registro: RegistroDeModeracao): string {
  const autor = pessoa(registro.alvoAutor, registro.anonimizado)
  const livro = registro.livroTitulo && !registro.anonimizado ? ` em ${registro.livroTitulo}` : ''
  if (registro.alvoTipo === 'comentario') {
    const dono = registro.atividadeAutor || registro.anonimizado
      ? ` na atividade de ${pessoa(registro.atividadeAutor, registro.anonimizado)}`
      : ''
    return `Comentário de ${autor}${dono}`
  }
  return `${registro.alvoTipo === 'resenha' ? 'Resenha' : 'Frase'} de ${autor}${livro}`
}
