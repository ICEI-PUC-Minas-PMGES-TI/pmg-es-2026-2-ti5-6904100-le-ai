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
 * Palavra só de pontuação (`-`, `:`, `&`) sai quando há outra com letra ou
 * número, porque o leitor que digita "grande sertão - veredas" não está
 * procurando o hífen. Sem nenhuma palavra com letra, fica tudo: buscar `%` acha
 * "100% amor".
 */
export function palavrasDaBusca(q: string): string[] {
  const palavras = q.split(/\s+/).filter((palavra) => palavra !== '');
  const comLetra = palavras.filter((palavra) => /[\p{L}\p{N}]/u.test(palavra));
  return comLetra.length > 0 ? comLetra : palavras;
}
