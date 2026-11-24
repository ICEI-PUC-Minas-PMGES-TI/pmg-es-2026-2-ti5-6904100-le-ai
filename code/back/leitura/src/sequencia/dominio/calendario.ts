import { deDiaJuliano, diaJuliano } from '../../common/datas';
import { dataLocal } from '../../progresso/dominio/progresso';

/**
 * Calendário da sequência (F-GAM-OPC, RF-GAM-04): só leitura derivada dos dias
 * que F-GAM já persiste em `dia_leitura`. Aqui ficam as regras puras da janela.
 */

/** Mês corrente e os cinco anteriores (RNF-DES-02: "dias recentes"). */
export const JANELA_MESES = 6;

/**
 * Fuso de quem nunca registrou progresso: sem fuso do dispositivo, o produto é
 * brasileiro. Com progresso, vale o último fuso, como na sequência (RN-18.4).
 */
export const FUSO_PADRAO = 'America/Sao_Paulo';

const MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

export interface JanelaDoCalendario {
  /** Dia corrente no fuso que apura a sequência. */
  hoje: string;
  mesAtual: string;
  mesMaisAntigo: string;
}

export function ehMesValido(mes: string): boolean {
  return MES.test(mes);
}

export function mesDe(data: string): string {
  return data.slice(0, 7);
}

/** `AAAA-MM` mais `n` meses (negativo recua). */
export function somarMeses(mes: string, n: number): string {
  const [ano, numero] = mes.split('-').map(Number);
  const total = ano * 12 + (numero - 1) + n;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return `${String(novoAno).padStart(4, '0')}-${String(novoMes).padStart(2, '0')}`;
}

/** Primeiro e último dia do mês, para o filtro do banco. */
export function intervaloDoMes(mes: string): { de: string; ate: string } {
  const de = `${mes}-01`;
  const ate = deDiaJuliano(diaJuliano(`${somarMeses(mes, 1)}-01`) - 1);
  return { de, ate };
}

/**
 * A janela do leitor no instante `agora`. O limite para trás é o mais recente
 * entre o início da janela e o mês do primeiro dia com leitura: antes disso
 * não há o que mostrar. Sem nenhum dia, só o mês corrente. Um primeiro dia
 * "no futuro" (o leitor voltou para um fuso atrás) não passa do mês corrente.
 */
export function janelaDoCalendario(
  agora: Date,
  fuso: string | null,
  primeiroDia: string | null,
): JanelaDoCalendario {
  const hoje = dataLocal(agora, fuso ?? FUSO_PADRAO);
  const mesAtual = mesDe(hoje);
  const inicioDaJanela = somarMeses(mesAtual, -(JANELA_MESES - 1));
  const primeiroMes = primeiroDia ? mesDe(primeiroDia) : mesAtual;
  const limitado = primeiroMes > mesAtual ? mesAtual : primeiroMes;
  return {
    hoje,
    mesAtual,
    mesMaisAntigo: limitado > inicioDaJanela ? limitado : inicioDaJanela,
  };
}

export function dentroDaJanela(
  mes: string,
  janela: JanelaDoCalendario,
): boolean {
  return mes >= janela.mesMaisAntigo && mes <= janela.mesAtual;
}
