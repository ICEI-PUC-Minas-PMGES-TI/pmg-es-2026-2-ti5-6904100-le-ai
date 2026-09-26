/**
 * Texto puro para a sinopse de livro oficial (RN-19.6): marcação da fonte
 * externa removida e limite de 4.000 caracteres.
 *
 * A OpenLibrary costuma trazer Markdown de referência além de HTML: `([source][1])`
 * no meio do texto, a linha `[1]: https://…` no fim e separadores `----`. O
 * Google Books traz HTML (`<p>`, `<br>`, `<b>`). Tudo isso sai; parágrafos
 * continuam separados por uma linha em branco.
 *
 * Não é sanitização para o DOM: o cliente exibe a sinopse como texto. É só a
 * garantia de que o banco guarda texto, não marcação.
 */
export const LIMITE_DA_SINOPSE = 4_000;

const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
};

export function textoPuro(
  bruto: string,
  limite = LIMITE_DA_SINOPSE,
): string | null {
  const texto = decodificarEntidades(
    bruto
      .replace(/\r\n?/g, '\n')
      // Quebras e fim de bloco do HTML viram quebra de linha antes de as tags
      // saírem, para os parágrafos não colarem.
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n\n')
      .replace(/<[^>]*>/g, ''),
  )
    // Markdown de referência da OpenLibrary.
    .replace(/\(\s*\[[^\]]*\]\s*\[\d+\]\s*\)/g, '')
    .replace(/\[([^\]]+)\]\s*\[\d+\]/g, '$1')
    .replace(/^\s*\[\d+\]:\s*\S+.*$/gm, '')
    .replace(/^\s*[-=_*]{3,}\s*$/gm, '')
    // Link e ênfase em Markdown: fica o texto.
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (texto === '') {
    return null;
  }
  return cortar(texto, limite);
}

function decodificarEntidades(texto: string): string {
  return texto.replace(
    /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi,
    (original, corpo: string) => {
      if (corpo[0] === '#') {
        const codigo =
          corpo[1].toLowerCase() === 'x'
            ? Number.parseInt(corpo.slice(2), 16)
            : Number.parseInt(corpo.slice(1), 10);
        return Number.isFinite(codigo) && codigo > 0 && codigo <= 0x10ffff
          ? String.fromCodePoint(codigo)
          : original;
      }
      return ENTIDADES[corpo] ?? letraAcentuada(corpo) ?? original;
    },
  );
}

const MARCAS: Record<string, string> = {
  acute: '\u0301',
  grave: '\u0300',
  circ: '\u0302',
  tilde: '\u0303',
  uml: '\u0308',
  cedil: '\u0327',
};

/** `&eacute;`, `&Atilde;`, `&ccedil;`: a letra com a marca, preservando a caixa. */
function letraAcentuada(nome: string): string | null {
  const partes = /^([a-zA-Z])(acute|grave|circ|tilde|uml|cedil)$/.exec(nome);
  return partes ? `${partes[1]}${MARCAS[partes[2]]}`.normalize('NFC') : null;
}

/**
 * Corta na fronteira de palavra, com reticências, sem passar do limite. Conta
 * code points, como o `char_length` do CHECK do banco.
 */
function cortar(texto: string, limite: number): string {
  const letras = [...texto];
  if (letras.length <= limite) {
    return texto;
  }
  const inicio = letras.slice(0, limite - 1).join('');
  const espaco = inicio.search(/\s\S*$/);
  const corte = espaco > limite / 2 ? inicio.slice(0, espaco) : inicio;
  return `${corte.trimEnd()}…`;
}
