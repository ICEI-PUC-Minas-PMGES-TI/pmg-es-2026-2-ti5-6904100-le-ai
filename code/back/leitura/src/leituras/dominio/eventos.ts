import { randomUUID } from 'node:crypto';
import { LIMIAR_EXPIRACAO_DIAS, LIMIARES_RISCO_DIAS } from './maquina-estados';

/**
 * Catálogo dos eventos produzidos por F-EST.
 *
 * Tipos, `businessKey` e `data` v1 vêm da tabela "Eventos produzidos" de
 * `feature-F-EST.md` e dos schemas canônicos em `docs/mensageria/schemas/`
 * (cópia runtime em `src/messaging/schemas/`). Schema publicado é imutável.
 *
 * Cada builder devolve a linha de `outbox_leitura` sem o que é do dispatcher
 * (P0-MSG monta o envelope). O `eventId` é gerado aqui, e não pelo default do
 * banco, porque duas chaves de negócio (retomada/abandonada) o contêm.
 */

export const EVENTO_VERSAO_V1 = 1;

export const TIPO_EVENTO = {
  LEITURA_INICIADA: 'leitura.iniciada',
  LEITURA_RETOMADA: 'leitura.retomada',
  LEITURA_FINALIZADA: 'leitura.finalizada',
  LEITURA_ABANDONADA: 'leitura.abandonada',
  LEITURA_EM_RISCO: 'leitura.em_risco',
  LEITURA_EXPIRADA: 'leitura.expirada',
  LIVRO_ADICIONADO_A_ESTANTE: 'livro.adicionado_a_estante',
} as const;

export type TipoEvento = (typeof TIPO_EVENTO)[keyof typeof TIPO_EVENTO];

/** Limiares de inatividade (RF-EST-11/12, RN-05): a fonte é o domínio. */
export { LIMIARES_RISCO_DIAS, LIMIAR_EXPIRACAO_DIAS };

export type LimiarRiscoDias = (typeof LIMIARES_RISCO_DIAS)[number];

/** `common-v1.schema.json#/$defs/UsuarioSnapshot` (de `v_perfil_referencia_v1`). */
export interface UsuarioSnapshot {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** `common-v1.schema.json#/$defs/LivroSnapshot` (de `v_livro_referencia_v1`). */
export interface LivroSnapshot {
  id: string;
  tipo: 'oficial' | 'pessoal';
  titulo: string;
  autor: string;
  capaUrl: string | null;
}

/** Linha de outbox: `payload` é somente o `data` do envelope. */
export interface EventoOutbox<TData> {
  eventId: string;
  tipo: TipoEvento;
  versao: typeof EVENTO_VERSAO_V1;
  chaveNegocio: string;
  payload: TData;
}

interface DadosAtividadeBase {
  usuarioId: string;
  leituraId: string;
  livroId: string;
  usuario: UsuarioSnapshot;
  livro: LivroSnapshot;
}

export interface DadosLeituraIniciada extends DadosAtividadeBase {
  releitura: boolean;
}

export interface DadosLeituraRetomada extends DadosAtividadeBase {
  paginaRetomada: number;
}

export interface DadosLeituraFinalizada extends DadosAtividadeBase {
  releitura: boolean;
  /** `YYYY-MM-DD` */
  dataFim: string;
  /** ISO 8601 date-time */
  finalizadaEm: string;
  finalizacaoFusoHorario: string;
  /** `YYYY-MM-DD` */
  finalizacaoDataLocal: string;
}

export interface DadosLeituraAbandonada extends DadosAtividadeBase {
  releitura: boolean;
  incompleta: boolean;
  paginaParada: number;
}

interface DadosInatividadeBase {
  destinatarioId: string;
  leituraId: string;
  inatividadeVersao: number;
  livro: LivroSnapshot;
}

export interface DadosLeituraEmRisco extends DadosInatividadeBase {
  limiarDias: LimiarRiscoDias;
}

export interface DadosLeituraExpirada extends DadosInatividadeBase {
  limiarDias: typeof LIMIAR_EXPIRACAO_DIAS;
}

export interface DadosLivroAdicionadoAEstante {
  usuarioId: string;
  livroId: string;
}

function evento<TData>(
  tipo: TipoEvento,
  chaveNegocio: (eventId: string) => string,
  payload: TData,
): EventoOutbox<TData> {
  const eventId = randomUUID();
  return {
    eventId,
    tipo,
    versao: EVENTO_VERSAO_V1,
    chaveNegocio: chaveNegocio(eventId),
    payload,
  };
}

function chaveInatividade(
  leituraId: string,
  versao: number,
  limiarDias: number,
): string {
  return `leitura:${leituraId}:inatividade:${versao}:${limiarDias}`;
}

export function leituraIniciada(
  dados: DadosLeituraIniciada,
): EventoOutbox<DadosLeituraIniciada> {
  return evento(
    TIPO_EVENTO.LEITURA_INICIADA,
    () => `leitura:${dados.leituraId}:iniciada`,
    dados,
  );
}

export function leituraRetomada(
  dados: DadosLeituraRetomada,
): EventoOutbox<DadosLeituraRetomada> {
  return evento(
    TIPO_EVENTO.LEITURA_RETOMADA,
    (eventId) => `leitura:${dados.leituraId}:retomada:${eventId}`,
    dados,
  );
}

export function leituraFinalizada(
  dados: DadosLeituraFinalizada,
): EventoOutbox<DadosLeituraFinalizada> {
  return evento(
    TIPO_EVENTO.LEITURA_FINALIZADA,
    () => `leitura:${dados.leituraId}:finalizada`,
    dados,
  );
}

export function leituraAbandonada(
  dados: DadosLeituraAbandonada,
): EventoOutbox<DadosLeituraAbandonada> {
  return evento(
    TIPO_EVENTO.LEITURA_ABANDONADA,
    (eventId) => `leitura:${dados.leituraId}:abandonada:${eventId}`,
    dados,
  );
}

export function leituraEmRisco(
  dados: DadosLeituraEmRisco,
): EventoOutbox<DadosLeituraEmRisco> {
  return evento(
    TIPO_EVENTO.LEITURA_EM_RISCO,
    () =>
      chaveInatividade(
        dados.leituraId,
        dados.inatividadeVersao,
        dados.limiarDias,
      ),
    dados,
  );
}

export function leituraExpirada(
  dados: DadosLeituraExpirada,
): EventoOutbox<DadosLeituraExpirada> {
  return evento(
    TIPO_EVENTO.LEITURA_EXPIRADA,
    () =>
      chaveInatividade(
        dados.leituraId,
        dados.inatividadeVersao,
        dados.limiarDias,
      ),
    dados,
  );
}

export function livroAdicionadoAEstante(
  dados: DadosLivroAdicionadoAEstante,
): EventoOutbox<DadosLivroAdicionadoAEstante> {
  return evento(
    TIPO_EVENTO.LIVRO_ADICIONADO_A_ESTANTE,
    () => `estante:${dados.usuarioId}:${dados.livroId}`,
    dados,
  );
}
