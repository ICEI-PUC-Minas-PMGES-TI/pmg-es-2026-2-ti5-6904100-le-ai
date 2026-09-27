import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MessageProperties } from 'amqplib';
import { InvalidMessageError, MessageValidator } from './message-validator';

const eventId = '01994c25-83cd-7d41-a9b4-1d9b71f34560';
const correlationId = '16aa3308-daee-4638-b220-c306484f6a9c';

const properties: MessageProperties = {
  messageId: eventId,
  correlationId,
  type: 'leitura.iniciada',
  contentType: 'application/json',
  deliveryMode: 2,
  headers: {
    'x-event-version': 1,
    'x-business-key': `leitura:${eventId}:iniciada`,
  },
} as unknown as MessageProperties;

describe('MessageValidator', () => {
  it('validates an envelope and its AMQP headers with AJV', () => {
    const body = {
      eventId,
      type: 'leitura.iniciada',
      version: 1,
      occurredAt: '2026-09-16T12:00:00.000Z',
      correlationId,
      businessKey: `leitura:${eventId}:iniciada`,
      data: {},
    };

    expect(new MessageValidator().validateMessage(body, properties)).toEqual(
      body,
    );
  });

  it('rejects an invalid envelope before any domain handler', () => {
    expect(() =>
      new MessageValidator().validateMessage(
        { ...({} as object), type: 'leitura.iniciada' },
        properties,
      ),
    ).toThrow(InvalidMessageError);
  });
});

describe('MessageValidator — schema de data', () => {
  // Lido direto da fonte canônica: o teste prova que o `$ref` relativo para o
  // `common-v1` resolve, sem depender de uma cópia runtime deste evento.
  const resenhaPublicada = JSON.parse(
    readFileSync(
      join(
        __dirname,
        '../../../../../docs/mensageria/schemas/resenha.publicada.v1.schema.json',
      ),
      'utf8',
    ),
  ) as object;

  const dados = (livro: Record<string, unknown> = {}) => ({
    usuarioId: correlationId,
    resenhaId: eventId,
    livroId: eventId,
    atualizacao: false,
    usuario: {
      id: correlationId,
      username: 'leitora',
      displayName: 'Leitora',
      avatarUrl: null,
    },
    livro: {
      id: eventId,
      tipo: 'oficial',
      titulo: 'Torto Arado',
      autor: 'Itamar Vieira Junior',
      capaUrl: null,
      ...livro,
    },
  });

  const validador = () => {
    const v = new MessageValidator();
    v.registerDataSchema('resenha.publicada', 1, resenhaPublicada);
    return v;
  };

  it('aceita data válido, resolvendo o $ref para o common-v1', () => {
    expect(() =>
      validador().validarDados('resenha.publicada', 1, dados()),
    ).not.toThrow();
  });

  // Livro oficial sem autor: `autor_exibicao` sai NULL da VIEW do acervo.
  it('aceita livro sem autor (autor null)', () => {
    expect(() =>
      validador().validarDados('resenha.publicada', 1, dados({ autor: null })),
    ).not.toThrow();
  });

  it('recusa autor vazio: ausência é null, nunca texto vazio', () => {
    expect(() =>
      validador().validarDados('resenha.publicada', 1, dados({ autor: '' })),
    ).toThrow(InvalidMessageError);
  });

  it('recusa data fora do contrato', () => {
    const semUsuario: Record<string, unknown> = { ...dados() };
    delete semUsuario.usuario;
    expect(() =>
      validador().validarDados('resenha.publicada', 1, semUsuario),
    ).toThrow(InvalidMessageError);
  });

  it('recusa evento sem schema registrado', () => {
    expect(() =>
      new MessageValidator().validarDados('resenha.publicada', 1, dados()),
    ).toThrow(InvalidMessageError);
  });
});
