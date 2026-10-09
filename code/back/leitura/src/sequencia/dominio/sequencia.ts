import { dataLocal } from '../../progresso/dominio/progresso';

const MS_POR_DIA = 86_400_000;

/** O que se apura das datas locais com leitura de um leitor (RN-18). */
export interface Apuracao {
  /** Maior trecho de dias consecutivos já alcançado (RN-18.6). */
  maior: number;
  /** Trecho de dias consecutivos que termina no último dia com leitura. */
  atualAteUltimoDia: number;
  ultimoDia: string | null;
}

/** O que fica persistido em `sequencia_leitura` e basta para a consulta. */
export interface EstadoSequencia {
  sequenciaAtual: number;
  maiorSequencia: number;
  ultimoDia: string | null;
  ultimoFusoHorario: string | null;
}

function diaJuliano(data: string): number {
  const [ano, mes, dia] = data.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia) / MS_POR_DIA;
}

/**
 * Apura as sequências a partir das datas locais (`YYYY-MM-DD`) com leitura.
 *
 * Cada data conta uma vez, por mais atualizações que tenha (RN-18.3), e a
 * apuração é sempre recomposta das datas — nunca um contador incrementado por
 * mensagem —, de modo que captura offline tardia ou exclusão de progresso
 * recalculam a atual e a maior sem duplicar (RN-18.5).
 */
export function apurar(datas: readonly string[]): Apuracao {
  const dias = [...new Set(datas)].map(diaJuliano).sort((a, b) => a - b);
  if (dias.length === 0) {
    return { maior: 0, atualAteUltimoDia: 0, ultimoDia: null };
  }
  let maior = 1;
  let trecho = 1;
  for (let i = 1; i < dias.length; i++) {
    trecho = dias[i] - dias[i - 1] === 1 ? trecho + 1 : 1;
    maior = Math.max(maior, trecho);
  }
  const ultimo = new Date(dias[dias.length - 1] * MS_POR_DIA);
  return {
    maior,
    atualAteUltimoDia: trecho,
    ultimoDia: ultimo.toISOString().slice(0, 10),
  };
}

/**
 * Sequência atual no instante `agora` (RF-GAM-03, RN-18.4): zera quando já se
 * encerrou um dia de calendário sem leitura. O "hoje" é calculado no último
 * fuso registrado pelo dispositivo, nunca no fuso de quem consulta; ontem sem
 * leitura ainda não zera, porque o dia de hoje não terminou. Último dia "no
 * futuro" (o leitor voltou para um fuso atrás) segue vigente. A maior
 * sequência não depende do instante e fica preservada (RN-18.6).
 */
export function sequenciaVigente(estado: EstadoSequencia, agora: Date): number {
  if (!estado.ultimoDia || !estado.ultimoFusoHorario) return 0;
  const hoje = diaJuliano(dataLocal(agora, estado.ultimoFusoHorario));
  return diaJuliano(estado.ultimoDia) >= hoje - 1 ? estado.sequenciaAtual : 0;
}
