/**
 * Regras puras das estatísticas do leitor (F-STA, RF-STA-01/02/03).
 *
 * Tudo parte dos baldes mensais: o ano é a soma dos seus meses e o acumulado,
 * a soma de todos. Dias com leitura somam sem contar duas vezes porque cada
 * data local cai num só mês.
 */

/** Um mês do leitor, como gravado em `estatistica_mensal`. */
export interface BaldeMensal {
  ano: number;
  mes: number;
  livrosConcluidos: number;
  paginasLidas: number;
  minutosLidos: number;
  diasComLeitura: number;
  diasEmLivrosConcluidos: number;
  notasQuantidade: number;
  notasSoma: number;
}

/** Período do painel: um ano de calendário ou o acumulado de toda a conta. */
export type Periodo = { tipo: 'ano'; ano: number } | { tipo: 'acumulado' };

export type Soma = Omit<BaldeMensal, 'ano' | 'mes'>;

/** Média com o que a compõe; sem denominador, `valor` é nulo (RF-STA-02). */
export interface Media {
  valor: number | null;
  numerador: number;
  denominador: number;
}

export interface Resumo {
  totais: Pick<Soma, 'livrosConcluidos' | 'paginasLidas' | 'minutosLidos'>;
  paginasPorDia: Media;
  diasPorLivro: Media;
  notaMedia: Media;
}

export interface AnoComRegistro {
  ano: number;
  livrosConcluidos: number;
}

export interface Ponto {
  ano: number;
  mes: number | null;
  paginasLidas: number;
  livrosConcluidos: number;
}

export interface Serie {
  granularidade: 'mes' | 'ano';
  pontos: Ponto[];
}

/** Mês de calendário de referência ("hoje"), para cortar a série no presente. */
export interface MesCorrente {
  ano: number;
  mes: number;
}

const PERIODO_ACUMULADO = 'acumulado';
const ANO = /^[1-9]\d{3}$/;

/**
 * `periodo` da consulta: um ano de quatro dígitos ou `acumulado`; ausente é o
 * ano corrente. Fora disso, `null` (o controller já recusa com 400).
 */
export function lerPeriodo(
  texto: string | undefined,
  anoCorrente: number,
): Periodo | null {
  if (texto === undefined) {
    return { tipo: 'ano', ano: anoCorrente };
  }
  if (texto === PERIODO_ACUMULADO) {
    return { tipo: 'acumulado' };
  }
  return ANO.test(texto) ? { tipo: 'ano', ano: Number(texto) } : null;
}

/** Baldes que pertencem ao período. */
export function doPeriodo(
  baldes: readonly BaldeMensal[],
  periodo: Periodo,
): BaldeMensal[] {
  return periodo.tipo === 'acumulado'
    ? [...baldes]
    : baldes.filter((b) => b.ano === periodo.ano);
}

export function somar(baldes: readonly BaldeMensal[]): Soma {
  const soma: Soma = {
    livrosConcluidos: 0,
    paginasLidas: 0,
    minutosLidos: 0,
    diasComLeitura: 0,
    diasEmLivrosConcluidos: 0,
    notasQuantidade: 0,
    notasSoma: 0,
  };
  for (const b of baldes) {
    soma.livrosConcluidos += b.livrosConcluidos;
    soma.paginasLidas += b.paginasLidas;
    soma.minutosLidos += b.minutosLidos;
    soma.diasComLeitura += b.diasComLeitura;
    soma.diasEmLivrosConcluidos += b.diasEmLivrosConcluidos;
    soma.notasQuantidade += b.notasQuantidade;
    soma.notasSoma += b.notasSoma;
  }
  return soma;
}

/** Razão arredondada a uma casa; sem denominador, ausente (nunca 0). */
export function media(numerador: number, denominador: number): Media {
  return {
    valor:
      denominador > 0 ? Math.round((numerador / denominador) * 10) / 10 : null,
    numerador,
    denominador,
  };
}

/**
 * Totais e médias do período (decisão do grupo, 15/09/2026): páginas por dia
 * divide só pelos dias com leitura registrada; dias por livro soma a duração
 * inclusiva de cada leitura concluída, releituras como ocorrências próprias.
 */
export function resumir(
  baldes: readonly BaldeMensal[],
  periodo: Periodo,
): Resumo {
  const soma = somar(doPeriodo(baldes, periodo));
  return {
    totais: {
      livrosConcluidos: soma.livrosConcluidos,
      paginasLidas: soma.paginasLidas,
      minutosLidos: soma.minutosLidos,
    },
    paginasPorDia: media(soma.paginasLidas, soma.diasComLeitura),
    diasPorLivro: media(soma.diasEmLivrosConcluidos, soma.livrosConcluidos),
    notaMedia: media(soma.notasSoma, soma.notasQuantidade),
  };
}

/**
 * Mês com registro de leitura: progresso ou leitura concluída. Nota sozinha
 * não abre ano no seletor nem estica o eixo dos gráficos.
 */
function temRegistro(b: BaldeMensal): boolean {
  return b.diasComLeitura > 0 || b.livrosConcluidos > 0;
}

/** Anos do seletor, do mais recente ao mais antigo, com os livros do ano. */
export function anosComRegistro(
  baldes: readonly BaldeMensal[],
): AnoComRegistro[] {
  const anos = new Set(baldes.filter(temRegistro).map((b) => b.ano));
  return [...anos]
    .sort((a, b) => b - a)
    .map((ano) => ({
      ano,
      livrosConcluidos: somar(baldes.filter((b) => b.ano === ano))
        .livrosConcluidos,
    }));
}

/**
 * Série dos gráficos (RF-STA-03). Num ano, um ponto por mês: começa no
 * primeiro mês com registro se for o primeiro ano do leitor e termina no mês
 * corrente se for o ano corrente; meses sem leitura ficam no eixo com zero.
 * No acumulado, um ponto por ano, do primeiro com registro até o corrente.
 */
export function serie(
  baldes: readonly BaldeMensal[],
  periodo: Periodo,
  corrente: MesCorrente,
): Serie {
  const comRegistro = baldes.filter(temRegistro);
  if (periodo.tipo === 'acumulado') {
    if (comRegistro.length === 0) {
      return { granularidade: 'ano', pontos: [] };
    }
    const primeiro = Math.min(...comRegistro.map((b) => b.ano));
    const ultimo = Math.max(corrente.ano, ...comRegistro.map((b) => b.ano));
    const pontos: Ponto[] = [];
    for (let ano = primeiro; ano <= ultimo; ano++) {
      pontos.push(
        ponto(
          ano,
          null,
          baldes.filter((b) => b.ano === ano),
        ),
      );
    }
    return { granularidade: 'ano', pontos };
  }

  const { ano } = periodo;
  const doAno = baldes.filter((b) => b.ano === ano);
  const mesesComRegistro = doAno.filter(temRegistro).map((b) => b.mes);
  const primeiroAno =
    comRegistro.length > 0 ? Math.min(...comRegistro.map((b) => b.ano)) : null;
  const inicio =
    ano === primeiroAno && mesesComRegistro.length > 0
      ? Math.min(...mesesComRegistro)
      : 1;
  // Um progresso em fuso adiantado pode cair no mês seguinte ao de Brasília:
  // o eixo nunca corta um mês que tem registro.
  const fim =
    ano === corrente.ano
      ? Math.max(corrente.mes, ...mesesComRegistro)
      : ano > corrente.ano
        ? Math.max(0, ...mesesComRegistro)
        : 12;
  const pontos: Ponto[] = [];
  for (let mes = inicio; mes <= fim; mes++) {
    pontos.push(
      ponto(
        ano,
        mes,
        doAno.filter((b) => b.mes === mes),
      ),
    );
  }
  return { granularidade: 'mes', pontos };
}

function ponto(
  ano: number,
  mes: number | null,
  baldes: readonly BaldeMensal[],
): Ponto {
  const soma = somar(baldes);
  return {
    ano,
    mes,
    paginasLidas: soma.paginasLidas,
    livrosConcluidos: soma.livrosConcluidos,
  };
}
