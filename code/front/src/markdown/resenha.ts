import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

/**
 * Markdown da resenha (RN-13, RNF-SEC-15, F-AVA-2). A resenha continua gravada como texto cru e
 * é renderizada aqui, no cliente, com o subconjunto do RN-13: negrito, itálico, tachado, lista
 * ordenada, lista não ordenada e citação em bloco.
 *
 * - **HTML embutido desabilitado no parser** (`html: false` e as regras de HTML desligadas) **e**
 *   a saída sanitizada pelo DOMPurify, só com as tags do subconjunto, antes de entrar no DOM.
 * - Tudo o que não é do subconjunto (link, imagem, título, código, tabela, HTML, entidade) tem a
 *   regra desligada e aparece **como texto literal**, nunca interpretado.
 * - `Enter` simples quebra a linha (`breaks: true`), como nas resenhas gravadas antes do Markdown.
 * - O mobile usa o pacote `markdown` com a mesma configuração; os dois passam pelos mesmos casos
 *   de `docs/design-system/markdown-resenha-casos.json` (RN-13.4).
 */
export const REGRAS_FORA_DO_SUBCONJUNTO = [
  'link',
  'image',
  'autolink',
  'backticks',
  'code',
  'fence',
  'table',
  'heading',
  'lheading',
  'hr',
  'reference',
  'html_block',
  'html_inline',
  'entity',
] as const

const md = new MarkdownIt('default', { html: false, linkify: false, breaks: true, typographer: false })
md.disable([...REGRAS_FORA_DO_SUBCONJUNTO])

const TAGS_DO_SUBCONJUNTO = ['p', 'br', 'strong', 'em', 's', 'ul', 'ol', 'li', 'blockquote']

/** HTML da resenha, já sanitizado, para o `v-html` de `TextoDaResenha`. */
export function renderizarResenha(texto: string): string {
  return DOMPurify.sanitize(md.render(texto), {
    ALLOWED_TAGS: TAGS_DO_SUBCONJUNTO,
    ALLOWED_ATTR: ['start'],
  })
}

/** Trecho da árvore da resenha: o formato dos casos compartilhados com o mobile. */
export type Trecho =
  | { t: string }
  | { b: Trecho[] }
  | { i: Trecho[] }
  | { s: Trecho[] }
  | { br: true }

export type Bloco =
  | { p: Trecho[] }
  | { ul: Bloco[][] }
  | { ol: Bloco[][]; inicio: number }
  | { q: Bloco[] }

interface TokenDoParser {
  type: string
  content: string
  children: TokenDoParser[] | null
  attrGet(nome: string): string | null
}

function trechos(filhos: TokenDoParser[]): Trecho[] {
  const raiz: Trecho[] = []
  const pilha: Trecho[][] = [raiz]
  const atual = () => pilha[pilha.length - 1]
  const acrescentarTexto = (texto: string) => {
    const lista = atual()
    const ultimo = lista[lista.length - 1]
    if (ultimo && 't' in ultimo) {
      ultimo.t += texto
    } else if (texto) {
      lista.push({ t: texto })
    }
  }
  for (const token of filhos) {
    switch (token.type) {
      case 'text':
        acrescentarTexto(token.content)
        break
      case 'softbreak':
      case 'hardbreak':
        atual().push({ br: true })
        break
      case 'strong_open':
      case 'em_open':
      case 's_open': {
        const conteudo: Trecho[] = []
        const chave = token.type === 'strong_open' ? 'b' : token.type === 'em_open' ? 'i' : 's'
        atual().push({ [chave]: conteudo } as Trecho)
        pilha.push(conteudo)
        break
      }
      case 'strong_close':
      case 'em_close':
      case 's_close':
        pilha.pop()
        break
      default:
        // Com as regras fora do subconjunto desligadas, nada mais deveria chegar aqui; se chegar,
        // vira texto, nunca marcação.
        acrescentarTexto(token.content)
    }
  }
  return raiz
}

/** Árvore da resenha no formato dos casos compartilhados (RN-13.4). */
export function arvoreDaResenha(texto: string): Bloco[] {
  const raiz: Bloco[] = []
  const pilha: Bloco[][] = [raiz]
  const listas: Bloco[][][] = []
  for (const token of md.parse(texto, {}) as TokenDoParser[]) {
    const atual = pilha[pilha.length - 1]
    switch (token.type) {
      case 'paragraph_open':
        atual.push({ p: [] })
        break
      case 'inline': {
        const paragrafo = atual[atual.length - 1]
        if (paragrafo && 'p' in paragrafo) {
          paragrafo.p.push(...trechos(token.children ?? []))
        }
        break
      }
      case 'bullet_list_open':
      case 'ordered_list_open': {
        const itens: Bloco[][] = []
        atual.push(
          token.type === 'bullet_list_open'
            ? { ul: itens }
            : { ol: itens, inicio: Number(token.attrGet('start') ?? 1) },
        )
        listas.push(itens)
        break
      }
      case 'list_item_open': {
        const item: Bloco[] = []
        listas[listas.length - 1].push(item)
        pilha.push(item)
        break
      }
      case 'blockquote_open': {
        const blocos: Bloco[] = []
        atual.push({ q: blocos })
        pilha.push(blocos)
        break
      }
      case 'list_item_close':
      case 'blockquote_close':
        pilha.pop()
        break
      case 'bullet_list_close':
      case 'ordered_list_close':
        listas.pop()
        break
    }
  }
  return raiz
}

function textoDosTrechos(lista: Trecho[]): string {
  return lista
    .map((trecho) => {
      if ('t' in trecho) return trecho.t
      if ('br' in trecho) return '\n'
      return textoDosTrechos('b' in trecho ? trecho.b : 'i' in trecho ? trecho.i : trecho.s)
    })
    .join('')
}

function linhasDosBlocos(blocos: Bloco[]): string[] {
  return blocos.flatMap((bloco) => {
    if ('p' in bloco) return [textoDosTrechos(bloco.p)]
    if ('q' in bloco) return linhasDosBlocos(bloco.q)
    return ('ul' in bloco ? bloco.ul : bloco.ol).flatMap((item) => linhasDosBlocos(item))
  })
}

/**
 * Prévia sem marcação, para o feed e o card do perfil, que cortam o texto em poucas linhas
 * (decisão do dono, 07/10/2026): sem `**`, `>` nem `-`, com cada bloco e item numa linha.
 */
export function textoSemMarcacao(texto: string): string {
  return linhasDosBlocos(arvoreDaResenha(texto)).join('\n')
}

const FORA_DO_SUBCONJUNTO = [
  /!?\[[^\]\n]*\]\([^)\n]*\)/, // link e imagem
  /<\/?[a-zA-Z][^>\n]*>/, // HTML e endereço entre sinais
  /^ {0,3}#{1,6}\s/m, // título
  /`/, // código em linha e bloco de código
  /^\s*\|.*\|\s*$/m, // tabela
]

/** A faixa da pré-visualização só aparece quando há marcação que a resenha não interpreta. */
export function temMarcacaoForaDoSubconjunto(texto: string): boolean {
  return FORA_DO_SUBCONJUNTO.some((padrao) => padrao.test(texto))
}
