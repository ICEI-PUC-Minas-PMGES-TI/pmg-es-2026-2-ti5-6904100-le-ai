import { dataLocal } from '../../progresso/dominio/progresso';

const MS_POR_DIA = 86_400_000;

export const PERIODICIDADES = ['diaria', 'semanal', 'mensal', 'anual'] as const;
export type Periodicidade = (typeof PERIODICIDADES)[number];

/** Período de calendário fechado nas duas pontas, em datas `YYYY-MM-DD`. */
export interface Periodo {
  inicio: string;
  fim: string;
}

function emDias(data: string): number {
  const [ano, mes, dia] = data.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia) / MS_POR_DIA;
}

function deDias(dias: number): string {
  return new Date(dias * MS_POR_DIA).toISOString().slice(0, 10);
}

export function somarDias(data: string, dias: number): string {
  return deDias(emDias(data) + dias);
}

/** Dia de calendário de `agora` no fuso do dispositivo (RN-20.1). */
export function hoje(fusoIana: string, agora: Date): string {
  return dataLocal(agora, fusoIana);
}

/**
 * A materialização está em dia quando a janela mais recente já alcança o hoje
 * do fuso: a materialização encerra as anteriores ao criar a corrente, então
 * não há o que criar nem o que encerrar.
 */
export function emDia(
  ultimoFim: string | null,
  fusoIana: string,
  agora: Date,
): boolean {
  return ultimoFim !== null && ultimoFim >= hoje(fusoIana, agora);
}

/**
 * Janela de calendário que contém `data` (RN-20.1): nunca um período móvel
 * contado da criação. A semana é a ISO 8601, de segunda a domingo — RN-20 não
 * fixa o início, e a decisão do dono (09/10/2026) aguarda ratificação do grupo.
 */
export function janelaQueContem(
  data: string,
  periodicidade: Periodicidade,
): Periodo {
  const [ano, mes] = data.split('-').map(Number);
  switch (periodicidade) {
    case 'diaria':
      return { inicio: data, fim: data };
    case 'semanal': {
      const dias = emDias(data);
      // getUTCDay: domingo = 0. Na ISO, segunda é o primeiro dia.
      const desdeSegunda = (new Date(dias * MS_POR_DIA).getUTCDay() + 6) % 7;
      return {
        inicio: deDias(dias - desdeSegunda),
        fim: deDias(dias - desdeSegunda + 6),
      };
    }
    case 'mensal':
      return {
        inicio: deDias(Date.UTC(ano, mes - 1, 1) / MS_POR_DIA),
        // Dia 0 do mês seguinte é o último deste.
        fim: deDias(Date.UTC(ano, mes, 0) / MS_POR_DIA),
      };
    case 'anual':
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
  }
}

/**
 * Janelas a materializar, em ordem, da que contém `aPartirDe` até a que contém
 * `hojeLocal` (RN-20.9): períodos decorridos entram mesmo sem progresso, e
 * nada além da janela corrente é criado. `aPartirDe` depois de hoje (o leitor
 * voltou para um fuso atrás) não gera nada.
 */
export function janelasAte(
  aPartirDe: string,
  periodicidade: Periodicidade,
  hojeLocal: string,
): Periodo[] {
  const janelas: Periodo[] = [];
  let atual = janelaQueContem(aPartirDe, periodicidade);
  while (atual.inicio <= hojeLocal) {
    janelas.push(atual);
    atual = janelaQueContem(somarDias(atual.fim, 1), periodicidade);
  }
  return janelas;
}
