/**
 * Palavras do texto de busca: cada uma precisa aparecer, por trecho, no mesmo
 * campo (título, autor, editora ou assunto).
 *
 * Casar palavra por palavra, e não o texto inteiro, é o que deixa
 * "grande sertao veredas" achar "Grande sertão: veredas" e "senhor aneis" achar
 * "O Senhor dos Anéis": a pontuação e as palavras do meio do título não precisam
 * ser digitadas. "guimaraes rossa" continua vazio, porque "rossa" não é trecho
 * de nada.
 *
 * - Pontuação nas pontas de uma palavra com letra sai ("casmurro." vira
 *   "casmurro"), e palavra só de pontuação (`-`, `:`, `&`) sai quando há outra
 *   com letra ou número. Sem nenhuma palavra com letra, fica tudo: buscar `%`
 *   acha "100% amor".
 * - Palavra repetida ou contida em outra sai: o campo que contém "senhor" já
 *   contém "o", e cada palavra é um `LIKE` a mais em cada campo.
 * - No máximo {@link MAXIMO_DE_PALAVRAS}, as mais longas, que são as que mais
 *   filtram: sem teto, 100 palavras de uma letra virariam 400 `LIKE`.
 */
export const MAXIMO_DE_PALAVRAS = 8;

const LETRA_OU_NUMERO = /[\p{L}\p{N}]/u;
const PONTUACAO_NAS_PONTAS = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

export function palavrasDaBusca(q: string): string[] {
  const brutas = q.split(/\s+/).filter((palavra) => palavra !== '');
  const comLetra = brutas
    .filter((palavra) => LETRA_OU_NUMERO.test(palavra))
    .map((palavra) => palavra.replace(PONTUACAO_NAS_PONTAS, ''));
  const candidatas = comLetra.length > 0 ? comLetra : brutas;

  const unicas = [...new Set(candidatas)];
  const minusculas = unicas.map((palavra) => palavra.toLowerCase());
  const necessarias = unicas.filter(
    (_palavra, i) =>
      !minusculas.some(
        (outra, j) =>
          j !== i &&
          outra.includes(minusculas[i]) &&
          // Duas iguais sem diferença de caixa: fica a primeira.
          (outra !== minusculas[i] || j < i),
      ),
  );

  return necessarias
    .map((palavra, ordem) => ({ palavra, ordem }))
    .sort((a, b) => b.palavra.length - a.palavra.length || a.ordem - b.ordem)
    .slice(0, MAXIMO_DE_PALAVRAS)
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ palavra }) => palavra);
}
