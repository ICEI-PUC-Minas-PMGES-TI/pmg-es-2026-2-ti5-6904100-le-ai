/**
 * Normalização de autor e editora (RN-12) do lado TypeScript.
 *
 * É o espelho de `code/scripts/ingestao/leai_ingestao/normalizacao.py`: a carga
 * do dump e a importação por ISBN gravam nas mesmas tabelas, e uma editora que a
 * carga criou como `rocco` precisa ser a mesma que a importação encontra. As
 * duas linguagens não compartilham código, então a duplicação é consciente e os
 * dois conjuntos de teste usam os mesmos casos — ver
 * `normalizacao.spec.ts` e `tests/test_normalizacao.py`.
 *
 * As duas decisões não óbvias do Python valem aqui igualmente:
 * - editora **preserva acento**, porque RN-12 cita "Intrinseca"/"Intrínseca"
 *   como caso da tabela de sinônimos; se o acento sumisse, o exemplo da regra
 *   não existiria;
 * - palavra de ramo só sai do **início** ("Editora Rocco" é Rocco), porque no
 *   fim ela é parte da marca ("Globo Livros", "Universo dos Livros").
 */

// Formas societárias que aparecem nas pontas e não fazem parte da marca.
const SUFIXOS_SOCIETARIOS = new Set([
  'ltda',
  'limitada',
  'sa',
  's a',
  'eireli',
  'me',
  'epp',
  'mei',
  'inc',
  'ltd',
  'llc',
  'gmbh',
  'bv',
  'srl',
  'plc',
  'co',
]);

// Palavras de ramo que emolduram o nome sem identificar a editora.
const PALAVRAS_DE_RAMO = new Set([
  'editora',
  'editoras',
  'editorial',
  'edicoes',
  'edições',
  'edicao',
  'edição',
  'publishers',
  'publisher',
  'publishing',
  'publicacoes',
  'publicações',
  'press',
  'books',
  'book',
  'livros',
  'editores',
  'editor',
]);

// Equivalente ao `[^\w\s]` Unicode do Python: tudo que não é letra, dígito,
// sublinhado ou espaço vira separador.
const PONTUACAO = /[^\p{L}\p{N}_\s]/gu;
const ESPACOS = /\s+/g;

export function removerAcentos(texto: string): string {
  return texto.normalize('NFKD').replace(/\p{M}/gu, '');
}

/** Minúsculas, sem pontuação, espaços colapsados. Acentos preservados. */
export function normalizarNome(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto
    .toLocaleLowerCase('pt-BR')
    .replace(PONTUACAO, ' ')
    .replace(ESPACOS, ' ')
    .trim();
}

function removerNasPontas(tokens: string[], descartaveis: Set<string>) {
  let inicio = 0;
  let fim = tokens.length;
  while (inicio < fim && descartaveis.has(tokens[inicio])) inicio++;
  while (fim > inicio && descartaveis.has(tokens[fim - 1])) fim--;
  return tokens.slice(inicio, fim);
}

function removerNoInicio(tokens: string[], descartaveis: Set<string>) {
  let inicio = 0;
  while (inicio < tokens.length && descartaveis.has(tokens[inicio])) inicio++;
  return tokens.slice(inicio);
}

/**
 * Chave de `acervo.editora.nome_normalizado` (índice único) e de busca em
 * `acervo.sinonimo_editora.forma_externa`.
 */
export function normalizarEditora(texto: string | null | undefined): string {
  const base = normalizarNome(texto);
  if (!base) return '';

  const tokens = removerNasPontas(base.split(' '), SUFIXOS_SOCIETARIOS);
  const candidato = removerNoInicio(tokens, PALAVRAS_DE_RAMO);

  // "Editora" sozinha não vira string vazia: sem nada para identificar a
  // editora, é melhor manter o que veio do que inventar uma entidade anônima.
  return candidato.length > 0 ? candidato.join(' ') : tokens.join(' ');
}

/**
 * Chave de deduplicação do autor. Remove acentos — sem isso "José Saramago" e
 * "Jose Saramago" viram dois autores. Nunca é exibida: `autor.nome` guarda a
 * forma de exibição.
 */
export function normalizarNomeAutor(texto: string | null | undefined): string {
  return removerAcentos(normalizarNome(texto));
}

/**
 * Nomes que a fonte usa como marcador de "autor não identificado", sem acento e em minúsculas.
 * "Anônimo" fica de fora de propósito: é atribuição real de obra (As Mil e Uma Noites).
 */
const MARCADORES_DE_AUTOR_DESCONHECIDO = new Set([
  'unknown',
  'unknown author',
  'author unknown',
  'desconhecido',
  'autor desconhecido',
]);

/**
 * Nome de autor que dá para exibir (RNF-SEC-33). A OpenLibrary tem registros de autor que são só
 * marcador de catálogo, como `[author not identified]`: nome inteiro entre colchetes é a
 * convenção de catalogação para informação que não consta da obra. Um desses vinculado à edição
 * esconde o autor verdadeiro que a obra conhece, então ele é descartado e o plano B pela obra
 * entra (ex.: `9788532528421`, de Austin Kleon).
 */
export function nomeDeAutorUtilizavel(
  nome: string | null | undefined,
): boolean {
  const limpo = (nome ?? '').trim();
  if (!limpo || /^\[.*\]$/.test(limpo)) {
    return false;
  }
  return !MARCADORES_DE_AUTOR_DESCONHECIDO.has(normalizarNomeAutor(limpo));
}
