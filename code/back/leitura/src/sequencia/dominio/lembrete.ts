import { createHash } from 'node:crypto';
import { diaJuliano } from '../../common/datas';
import { dataLocal } from '../../progresso/dominio/progresso';
import type { EstadoSequencia } from './sequencia';

/**
 * Lembrete de sequência (F-GAM-OPC, RF-GAM-05): regras puras da seleção e da
 * identidade do evento `lembrete.sequencia`.
 */

export const TIPO_LEMBRETE_SEQUENCIA = 'lembrete.sequencia';
export const VERSAO_LEMBRETE_SEQUENCIA = 1;

export interface LembreteDevido {
  /** Dia local corrente do leitor, que ainda não tem registro. */
  dataLocal: string;
  sequenciaAtual: number;
}

/** O `data` de `lembrete.sequencia.v1`. */
export interface DadosLembreteSequencia {
  destinatarioId: string;
  dataLocal: string;
  sequenciaAtual: number;
}

/**
 * Devido só para quem tem sequência **ativa** e ainda **não registrou** no dia
 * local corrente, calculado no último fuso do dispositivo (o mesmo critério do
 * zeramento, RN-18.4). As duas condições juntas dão: o último dia com leitura
 * é exatamente ontem. Hoje já registrado (ou "no futuro", depois de voltar
 * para um fuso atrás) não recebe; anteontem ou antes, a sequência já zerou e
 * RF-GAM-05 não se aplica.
 */
export function lembreteDevido(
  estado: EstadoSequencia,
  agora: Date,
): LembreteDevido | null {
  if (
    !estado.ultimoDia ||
    !estado.ultimoFusoHorario ||
    estado.sequenciaAtual <= 0
  ) {
    return null;
  }
  const hoje = dataLocal(agora, estado.ultimoFusoHorario);
  if (diaJuliano(estado.ultimoDia) !== diaJuliano(hoje) - 1) {
    return null;
  }
  return { dataLocal: hoje, sequenciaAtual: estado.sequenciaAtual };
}

/** Chave de negócio do catálogo: um lembrete por leitor e dia local. */
export function chaveDeNegocioDoLembrete(
  usuarioId: string,
  dataLocal: string,
): string {
  return `sequencia:${usuarioId.toLowerCase()}:lembrete:${dataLocal}`;
}

/** Namespace fixo do UUID v5 dos lembretes. Não mude: quebraria a deduplicação. */
const NAMESPACE_LEMBRETE = 'a3f1c2d4-6b7e-4c19-9f0a-5d2e8b4c7a61';

/**
 * `eventId` determinístico (UUID v5, RFC 9562) de `(usuarioId, dataLocal)`.
 * Reexecutar o job no mesmo dia gera o mesmo id, que colide na chave primária
 * da outbox: a deduplicação acontece já no produtor (RNF-ERR-06).
 */
export function eventIdDoLembrete(
  usuarioId: string,
  dataLocal: string,
): string {
  const namespace = Buffer.from(NAMESPACE_LEMBRETE.replace(/-/g, ''), 'hex');
  const nome = Buffer.from(
    chaveDeNegocioDoLembrete(usuarioId, dataLocal),
    'utf8',
  );
  const bytes = createHash('sha1')
    .update(Buffer.concat([namespace, nome]))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
