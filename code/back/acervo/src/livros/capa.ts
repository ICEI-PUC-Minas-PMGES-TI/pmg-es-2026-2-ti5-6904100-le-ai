/**
 * Capa resolvida de um livro, no formato `Capa` do contrato (RN-14.4).
 *
 * A URL já sai resolvida do SQL, como nas VIEWs de contrato:
 * `coalesce(capa_url_propria, capa_url_externa)`. O que o contrato acrescenta é
 * a **origem**, para o cliente saber se a imagem é a cópia própria ou a da fonte
 * externa.
 *
 * Livro oficial sempre tem capa externa (CHECK `livro_oficial_pessoal_ck`), então
 * na prática o servidor nunca devolve `placeholder` para ele. O placeholder de
 * verdade é o do cliente, quando a imagem não carrega. O caso existe aqui porque
 * o contrato o prevê e porque a função não deve inventar uma URL.
 */
export type OrigemDaCapa = 'propria' | 'externa' | 'placeholder';

export interface Capa {
  url: string | null;
  origem: OrigemDaCapa;
}

export function resolverCapa(
  capaUrlPropria: string | null,
  capaUrlExterna: string | null,
): Capa {
  if (capaUrlPropria) {
    return { url: capaUrlPropria, origem: 'propria' };
  }
  if (capaUrlExterna) {
    return { url: capaUrlExterna, origem: 'externa' };
  }
  return { url: null, origem: 'placeholder' };
}
