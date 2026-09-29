import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { MessageValidator } from '../../messaging/message-validator';
import {
  type EventoOutbox,
  type LivroSnapshot,
  type UsuarioSnapshot,
  leituraAbandonada,
  leituraEmRisco,
  leituraExpirada,
  leituraFinalizada,
  leituraIniciada,
  leituraRetomada,
  livroAdicionadoAEstante,
  progressoRegistrado,
} from './eventos';

const SCHEMAS = join(__dirname, '../../messaging/schemas');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const usuarioId = '0f8fad5b-d9cb-469f-a165-70867728950e';
const leituraId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const livroId = '16aa3308-daee-4638-b220-c306484f6a9c';
const atualizacaoProgressoId = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

const usuario: UsuarioSnapshot = {
  id: usuarioId,
  username: 'ana',
  displayName: 'Ana Luiza',
  avatarUrl: null,
};
const livro: LivroSnapshot = {
  id: livroId,
  tipo: 'oficial',
  titulo: 'Dom Casmurro',
  autor: 'Machado de Assis',
  capaUrl: 'https://covers.example/dom-casmurro.jpg',
};

function carregar(nome: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SCHEMAS, nome), 'utf8')) as Record<
    string,
    unknown
  >;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(carregar('common-v1.schema.json'));

function schemaDe(tipo: string): ValidateFunction {
  const id = `https://leai.app/schemas/mensageria/${tipo}.v1.schema.json`;
  const existente = ajv.getSchema(id);
  if (existente) return existente;
  return ajv.compile(carregar(`${tipo}.v1.schema.json`));
}

function validar(evento: EventoOutbox<unknown>): void {
  const validate = schemaDe(evento.tipo);
  expect({ valido: validate(evento.payload), erros: validate.errors }).toEqual({
    valido: true,
    erros: null,
  });
  new MessageValidator().validateEnvelope({
    eventId: evento.eventId,
    type: evento.tipo,
    version: evento.versao,
    occurredAt: new Date().toISOString(),
    correlationId: '01994c25-83cd-7d41-a9b4-1d9b71f34560',
    businessKey: evento.chaveNegocio,
    data: evento.payload as Record<string, unknown>,
  });
}

const casos: Array<[string, () => EventoOutbox<unknown>, RegExp]> = [
  [
    'leitura.iniciada',
    () =>
      leituraIniciada({
        usuarioId,
        leituraId,
        livroId,
        releitura: false,
        usuario,
        livro,
      }),
    new RegExp(`^leitura:${leituraId}:iniciada$`),
  ],
  [
    'leitura.retomada',
    () =>
      leituraRetomada({
        usuarioId,
        leituraId,
        livroId,
        paginaRetomada: 42,
        usuario,
        livro,
      }),
    new RegExp(`^leitura:${leituraId}:retomada:(?<eventId>.+)$`),
  ],
  [
    'leitura.finalizada',
    () =>
      leituraFinalizada({
        usuarioId,
        leituraId,
        livroId,
        releitura: true,
        dataFim: '2026-09-24',
        finalizadaEm: '2026-09-25T02:30:00.000Z',
        finalizacaoFusoHorario: 'America/Sao_Paulo',
        finalizacaoDataLocal: '2026-09-24',
        usuario,
        livro,
      }),
    new RegExp(`^leitura:${leituraId}:finalizada$`),
  ],
  [
    'leitura.abandonada',
    () =>
      leituraAbandonada({
        usuarioId,
        leituraId,
        livroId,
        releitura: false,
        incompleta: true,
        paginaParada: 0,
        usuario,
        livro,
      }),
    new RegExp(`^leitura:${leituraId}:abandonada:(?<eventId>.+)$`),
  ],
  [
    'leitura.em_risco',
    () =>
      leituraEmRisco({
        destinatarioId: usuarioId,
        leituraId,
        inatividadeVersao: 3,
        limiarDias: 30,
        livro,
      }),
    new RegExp(`^leitura:${leituraId}:inatividade:3:30$`),
  ],
  [
    'leitura.expirada',
    () =>
      leituraExpirada({
        destinatarioId: usuarioId,
        leituraId,
        inatividadeVersao: 1,
        limiarDias: 40,
        livro,
      }),
    new RegExp(`^leitura:${leituraId}:inatividade:1:40$`),
  ],
  [
    'livro.adicionado_a_estante',
    () => livroAdicionadoAEstante({ usuarioId, livroId }),
    new RegExp(`^estante:${usuarioId}:${livroId}$`),
  ],
  [
    'progresso.registrado',
    () =>
      progressoRegistrado({
        atualizacaoProgressoId,
        usuarioId,
        leituraId,
        livroId,
        pagina: 120,
        paginasLidas: 20,
        minutos: 45,
        percentual: 42.5,
        registradoEm: '2026-09-25T02:30:00.000Z',
        fusoHorario: 'America/Sao_Paulo',
        dataLocal: '2026-09-24',
      }),
    new RegExp(`^progresso:${atualizacaoProgressoId}$`),
  ],
];

describe('catálogo de eventos de leitura', () => {
  it.each(casos)('%s: data v1 válido no schema e envelope', (tipo, criar) => {
    const evento = criar();
    expect(evento.tipo).toBe(tipo);
    expect(evento.versao).toBe(1);
    expect(evento.eventId).toMatch(UUID);
    validar(evento);
  });

  it.each(casos)('%s: businessKey exata', (_tipo, criar, formato) => {
    const evento = criar();
    const match = formato.exec(evento.chaveNegocio);
    expect(match).not.toBeNull();
    if (match?.groups?.eventId) {
      expect(match.groups.eventId).toBe(evento.eventId);
    }
  });

  it('gera eventId distinto a cada fato repetível', () => {
    const dados = {
      usuarioId,
      leituraId,
      livroId,
      paginaRetomada: 10,
      usuario,
      livro,
    };
    const a = leituraRetomada(dados);
    const b = leituraRetomada(dados);
    expect(a.eventId).not.toBe(b.eventId);
    expect(a.chaveNegocio).not.toBe(b.chaveNegocio);
  });

  it('o schema rejeita limiar fora do catálogo em leitura.em_risco', () => {
    const evento = leituraEmRisco({
      destinatarioId: usuarioId,
      leituraId,
      inatividadeVersao: 1,
      limiarDias: 20,
      livro,
    });
    const validate = schemaDe('leitura.em_risco');
    expect(validate({ ...evento.payload, limiarDias: 40 })).toBe(false);
  });

  it('o schema rejeita campo extra e minutos acima de 720 em progresso.registrado', () => {
    const evento = progressoRegistrado({
      atualizacaoProgressoId,
      usuarioId,
      leituraId,
      livroId,
      pagina: 10,
      paginasLidas: 10,
      minutos: 30,
      percentual: 5,
      registradoEm: '2026-09-25T02:30:00.000Z',
      fusoHorario: 'America/Sao_Paulo',
      dataLocal: '2026-09-24',
    });
    const validate = schemaDe('progresso.registrado');
    expect(validate({ ...evento.payload, minutos: 721 })).toBe(false);
    expect(validate({ ...evento.payload, paginaAnterior: 0 })).toBe(false);
  });
});
