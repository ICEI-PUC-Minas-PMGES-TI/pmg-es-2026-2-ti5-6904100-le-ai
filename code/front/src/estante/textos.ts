import type { OrdenacaoEstante, StatusEstante } from '../services/leitura'

export const ROTULO_DO_STATUS: Record<StatusEstante, string> = {
  QUERO_LER: 'Quero ler',
  LENDO: 'Lendo',
  LIDO: 'Lido',
  RELENDO: 'Relendo',
  ABANDONADO: 'Abandonado',
}

export const ROTULO_TODOS = 'Todos'

export const ORDEM_DOS_FILTROS: readonly StatusEstante[] = ['LENDO', 'QUERO_LER', 'LIDO', 'RELENDO', 'ABANDONADO']

export const ORDENACAO_PADRAO: OrdenacaoEstante = 'adicionado_desc'

export const ROTULO_DA_ORDENACAO: Record<OrdenacaoEstante, string> = {
  adicionado_desc: 'Adicionados recentemente',
  adicionado_asc: 'Adicionados há mais tempo',
  titulo_asc: 'Título, A a Z',
  titulo_desc: 'Título, Z a A',
  autor_asc: 'Autor, A a Z',
  autor_desc: 'Autor, Z a A',
  progresso_desc: 'Maior progresso',
  progresso_asc: 'Menor progresso',
}

export const TEXTOS_DA_ESTANTE = {
  titulo: 'Minha estante',
  vaziaTitulo: 'Sua estante está vazia',
  vaziaTexto: 'Busque um livro pelo título, autor ou ISBN e escolha em qual status ele entra.',
  vaziaBotaoPrimario: 'Buscar livros',
  vaziaBotaoTextual: 'Cadastrar por ISBN',
  erroTexto: 'Não foi possível carregar sua estante. Verifique sua conexão e tente de novo.',
  erroBotao: 'Tentar de novo',
  rotuloFiltros: 'Filtrar por status',
  rotuloOrdenacao: 'Ordenar por',
  rotuloGrade: 'Livros da estante',
  carregando: 'Carregando estante',
  progressoIniciado: 'Iniciada',
} as const

export type DestinoDoVazio = StatusEstante | 'descobrir'

export interface VazioDoFiltro {
  titulo: string
  texto: string
  botao?: { rotulo: string; destino: DestinoDoVazio }
}

export const VAZIO_DO_FILTRO: Record<StatusEstante, VazioDoFiltro> = {
  LENDO: {
    titulo: 'Nenhuma leitura em andamento',
    texto: 'Livros aparecem aqui quando você começa a ler.',
  },
  QUERO_LER: {
    titulo: 'Nenhum livro para ler depois',
    texto: 'Livros aparecem aqui quando você os adiciona como Quero ler.',
    botao: { rotulo: 'Buscar livros', destino: 'descobrir' },
  },
  LIDO: {
    titulo: 'Nenhum livro concluído',
    texto: 'Livros aparecem aqui quando você finaliza uma leitura.',
    botao: { rotulo: 'Ver o que está lendo', destino: 'LENDO' },
  },
  RELENDO: {
    titulo: 'Nenhuma releitura em andamento',
    texto: 'Releituras aparecem aqui quando você recomeça um livro que já concluiu.',
    botao: { rotulo: 'Ver livros lidos', destino: 'LIDO' },
  },
  ABANDONADO: {
    titulo: 'Nenhuma leitura abandonada',
    texto: 'Leituras aparecem aqui quando você as deixa de lado.',
  },
}

export const TEXTOS_DA_ESTANTE_DE_PERFIL = {
  carregando: 'Carregando estante',
  erroTexto: 'Não foi possível carregar a estante. Verifique sua conexão e tente de novo.',
} as const

export function textoEstanteDePerfilVazia(primeiroNome: string): string {
  return `${primeiroNome} ainda não adicionou livros à estante.`
}

export function textoVezesLido(vezes: number): string {
  return `Lido ${vezes} ${vezes === 1 ? 'vez' : 'vezes'}`
}

export function textoTotalDeLivros(total: number): string {
  return `${total} ${total === 1 ? 'livro' : 'livros'}`
}

export const ACOES_DE_LEITURA = {
  adicionarQueroLer: 'Adicionar como Quero ler',
  iniciarLeitura: 'Iniciar leitura',
  registrarProgresso: 'Registrar progresso',
  finalizarLeitura: 'Finalizar leitura',
  finalizarReleitura: 'Finalizar releitura',
  iniciarReleitura: 'Iniciar releitura',
  retomarLeitura: 'Retomar leitura',
  abandonarLeitura: 'Abandonar leitura',
  abandonarReleitura: 'Abandonar releitura',
  removerDaEstante: 'Remover da estante',
  cancelar: 'Cancelar',
  salvando: 'Salvando',
} as const

export const TEXTOS_DE_ACAO = {
  rotuloDataInicio: 'Data de início',
  rotuloDataFim: 'Data de fim',
  ajudaDataInicio: 'A data padrão é hoje. Você pode ajustar se começou antes.',
  ajudaDataFim: 'A data padrão é hoje. Você pode ajustar se terminou antes.',
  erroAoSalvar: 'Não foi possível salvar. Verifique sua conexão e tente de novo.',
} as const

export const CONFIRMACAO_ABANDONAR_LEITURA = {
  titulo: 'Abandonar esta leitura?',
  texto: (pagina: number) =>
    `A leitura fica salva na página ${pagina} e você pode retomá-la depois, continuando de onde parou.`,
} as const

export const CONFIRMACAO_ABANDONAR_RELEITURA = {
  titulo: 'Abandonar esta releitura?',
  texto:
    'A releitura será salva como incompleta e o livro volta para Lido. Ela não conta como nova conclusão e não pode ser retomada.',
} as const

export const CONFIRMACAO_REMOVER = {
  titulo: 'Remover da estante?',
  texto: 'O livro sai da sua lista de Quero ler. Você pode adicioná-lo de novo quando quiser.',
} as const

export function textoParouNaPagina(pagina: number, total: number): string {
  return `Parou na página ${pagina} de ${total}`
}

export function textoRetomada(pagina: number): string {
  return `Você volta para a página ${pagina}, onde parou.`
}

export const ERROS_DE_ACAO = {
  conflito: 'O status deste livro mudou em outro lugar. Feche e abra de novo para ver as ações atuais.',
  dataNoFuturo: 'Escolha uma data até hoje.',
} as const

export const ROTULO_FECHAR = 'Fechar'
export const ROTULO_VOLTAR_ACOES = 'Voltar para as ações'

export function textoProximaConclusao(numero: number): string {
  return `Esta será sua ${numero}ª conclusão deste livro.`
}

export function textoConcluido(dataPorExtenso: string, conclusoes: number): string {
  return `Concluído em ${dataPorExtenso} · ${conclusoes} ${conclusoes === 1 ? 'conclusão' : 'conclusões'}`
}

export function textoPaginaDe(pagina: number, total: number): string {
  return `Página ${pagina} de ${total}`
}

export const TEXTOS_DO_PAINEL = {
  erroAoAbrir: 'Não foi possível carregar as ações deste livro. Verifique sua conexão e tente de novo.',
  alterarStatus: 'Alterar status',
  adicionarNaEstante: 'Adicionar à estante',
  tentarDeNovo: 'Tentar de novo',
} as const
