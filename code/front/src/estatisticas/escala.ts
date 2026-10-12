/**
 * Eixo Y dos gráficos de colunas (F-STA, RF-STA-03): marcas redondas em passos
 * 1-2-5 e um domínio que deixa ar acima da coluna mais alta para o rótulo
 * direto.
 *
 * Exemplos do protótipo: 604 páginas → `0 200 400 600` (domínio ~650);
 * 2 livros → `0 1 2 3`; 5.150 páginas → `0 2.000 4.000 6.000`; 14 livros →
 * `0 5 10 15`; 214 páginas → `0 100 200`.
 */
export interface Escala {
  marcas: number[]
  /** Valor que corresponde ao topo da área do gráfico. */
  dominio: number
}

const MARCAS_DESEJADAS = 3
/** Folga mínima entre a coluna mais alta e o topo, em fração do passo. */
const FOLGA_MINIMA = 0.1
/** Acima disso, a última marca sobra demais e o eixo para na anterior. */
const SOBRA_MAXIMA = 0.5
/** Ar acima da coluna mais alta quando o eixo para abaixo dela. */
const AR_ACIMA = 1.08

/** O passo 1-2-5 seguinte: 1 → 2 → 5 → 10. */
function proximoPasso(passo: number): number {
  const base = 10 ** Math.floor(Math.log10(passo))
  const m = Math.round(passo / base)
  return (m === 1 ? 2 : m === 2 ? 5 : 10) * base
}

/** O passo 1-2-5 mais próximo, em escala logarítmica. */
function passoRedondo(alvo: number): number {
  const base = 10 ** Math.floor(Math.log10(alvo))
  const candidatos = [1, 2, 5, 10].map((m) => m * base)
  return candidatos.reduce((melhor, c) =>
    Math.abs(Math.log(c / alvo)) < Math.abs(Math.log(melhor / alvo)) ? c : melhor,
  )
}

/** Topo do eixo e domínio para um passo, com ar acima da coluna mais alta. */
function topoEDominio(maximo: number, passo: number): { topo: number; dominio: number } {
  const topo = Math.ceil(maximo / passo) * passo
  if (topo - maximo < passo * FOLGA_MINIMA) return { topo: topo + passo, dominio: topo + passo }
  if (topo - maximo > passo * SOBRA_MAXIMA) return { topo: topo - passo, dominio: maximo * AR_ACIMA }
  return { topo, dominio: topo }
}

export function escalaDoEixo(maximo: number): Escala {
  if (maximo <= 0) return { marcas: [0, 1], dominio: 1 }
  // Os valores são contagens: o passo nunca é fracionário.
  let passo = Math.max(1, passoRedondo(maximo / MARCAS_DESEJADAS))
  let eixo = topoEDominio(maximo, passo)
  // Nunca mais de quatro marcas (0 e três acima): 939 páginas vira 0/500/1.000, não 0 a 1.000 de 200 em 200.
  while (eixo.topo / passo > MARCAS_DESEJADAS) {
    passo = proximoPasso(passo)
    eixo = topoEDominio(maximo, passo)
  }
  const marcas: number[] = []
  for (let marca = 0; marca <= eixo.topo; marca += passo) marcas.push(marca)
  return { marcas, dominio: eixo.dominio }
}
