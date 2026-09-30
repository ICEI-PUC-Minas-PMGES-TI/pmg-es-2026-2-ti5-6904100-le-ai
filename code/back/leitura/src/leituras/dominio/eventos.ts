import { randomUUID } from 'node:crypto';
import { LIMIAR_EXPIRACAO_DIAS, LIMIARES_RISCO_DIAS } from './maquina-estados';

export const EVENTO_VERSAO_V1 = 1;

export const TIPO_EVENTO = {
  LEITURA_INICIADA: 'leitura.iniciada',
  LEITURA_RETOMADA: 'leitura.retomada',
  LEITURA_FINALIZADA: 'leitura.finalizada',
  LEITURA_ABANDONADA: 'leitura.abandonada',
  LEITURA_EM_RISCO: 'leitura.em_risco',
  LEITURA_EXPIRADA: 'leitura.expirada',
  LIVRO_ADICIONADO_A_ESTANTE: 'livro.adicionado_a_estante',
  PROGRESSO_REGISTRADO: 'progresso.registrado',
} as const;

export type TipoEvento = (typeof TIPO_EVENTO)[keyof typeof TIPO_EVENTO];

export { LIMIARES_RISCO_DIAS, LIMIAR_EXPIRACAO_DIAS };

export type LimiarRiscoDias = (typeof LIMIARES_RISCO_DIAS)[number];

export interface UsuarioSnapshot {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface LivroSnapshot {
  id: string;
  tipo: 'oficial' | 'pessoal';
  titulo: string;
  autor: string;
  capaUrl: string | null;
}

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
  dataFim: string;
  finalizadaEm: string;
  finalizacaoFusoHorario: string;
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

export interface DadosProgressoRegistrado {
  atualizacaoProgressoId: string;
  usuarioId: string;
  leituraId: string;
  livroId: string;
  pagina: number;
  paginasLidas: number;
  minutos: number;
  percentual: number;
  registradoEm: string;
  fusoHorario: string;
  dataLocal: string;
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

export function progressoRegistrado(
  dados: DadosProgressoRegistrado,
): EventoOutbox<DadosProgressoRegistrado> {
  return evento(
    TIPO_EVENTO.PROGRESSO_REGISTRADO,
    () => `progresso:${dados.atualizacaoProgressoId}`,
    dados,
  );
}
