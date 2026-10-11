/**
 * Aritmética de datas de calendário `YYYY-MM-DD`, sem fuso: a data local já
 * foi resolvida no fuso do dispositivo (`dataLocal`). Usada pela sequência
 * (F-GAM) e pelas janelas dos desafios (F-DSF).
 */

const MS_POR_DIA = 86_400_000;

/** Dias corridos desde 1970-01-01: a diferença entre duas datas é exata. */
export function diaJuliano(data: string): number {
  const [ano, mes, dia] = data.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia) / MS_POR_DIA;
}

export function deDiaJuliano(dias: number): string {
  return new Date(dias * MS_POR_DIA).toISOString().slice(0, 10);
}

export function somarDias(data: string, dias: number): string {
  return deDiaJuliano(diaJuliano(data) + dias);
}

/** Dia da semana ISO 8601: segunda = 0, domingo = 6. */
export function diaDaSemanaIso(data: string): number {
  // 1970-01-01 foi uma quinta (3 na contagem ISO a partir de zero).
  return (((diaJuliano(data) + 3) % 7) + 7) % 7;
}
