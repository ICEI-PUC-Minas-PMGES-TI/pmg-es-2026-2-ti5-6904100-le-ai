import { type ErrorObject, type ValidateFunction } from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { ConsumeMessage, MessageProperties } from 'amqplib';
import commonSchema from './schemas/common-v1.schema.json';
import envelopeSchema from './schemas/envelope-v1.schema.json';

export interface MessageEnvelope {
  eventId: string;
  type: string;
  version: number;
  occurredAt: string;
  correlationId: string;
  businessKey: string;
  data: Record<string, unknown>;
}

export class InvalidMessageError extends Error {
  readonly permanent = true;

  constructor(message: string) {
    super(message);
    this.name = 'InvalidMessageError';
  }
}

export class MessageValidator {
  private readonly ajv: Ajv2020;
  private readonly envelope: ValidateFunction;
  private readonly dataSchemas = new Map<string, ValidateFunction>();

  constructor() {
    this.ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(this.ajv);
    // Os eventos de `leitura` referenciam `UsuarioSnapshot` e `LivroSnapshot`
    // por `$ref: "common-v1.schema.json#/$defs/..."`. O `$ref` é relativo ao
    // `$id` do schema do evento (`https://leai.app/schemas/mensageria/...`) e
    // resolve para o `$id` do common, registrado aqui uma vez.
    this.ajv.addSchema(commonSchema);
    this.envelope = this.ajv.compile(envelopeSchema);
  }

  /**
   * Registra o schema de `data` de um `(type, version)`, com a cópia runtime
   * do schema canônico de `docs/mensageria/schemas/`. Quem produz o evento
   * registra o seu no próprio `onModuleInit`, sem editar este arquivo.
   */
  registerDataSchema(type: string, version: number, schema: object): void {
    this.dataSchemas.set(`${type}:${version}`, this.ajv.compile(schema));
  }

  /**
   * Valida o `data` de um evento contra o schema registrado. Usado pelo
   * produtor antes de gravar na outbox: evento fora do contrato é bug nosso e
   * não pode chegar à DLQ do serviço de outra pessoa.
   */
  validarDados(type: string, version: number, data: unknown): void {
    const validador = this.dataSchemas.get(`${type}:${version}`);
    if (!validador) {
      throw new InvalidMessageError(
        `Schema não registrado para ${type} v${version}`,
      );
    }
    if (!validador(data)) {
      throw new InvalidMessageError(this.errors(validador.errors));
    }
  }

  validateMessage(
    body: unknown,
    properties: MessageProperties,
  ): MessageEnvelope {
    if (!this.envelope(body)) {
      throw new InvalidMessageError(this.errors(this.envelope.errors));
    }
    const envelope = body as MessageEnvelope;
    const headers = properties.headers ?? {};
    if (
      properties.messageId !== envelope.eventId ||
      properties.correlationId !== envelope.correlationId ||
      properties.type !== envelope.type ||
      properties.contentType !== 'application/json' ||
      properties.deliveryMode !== 2 ||
      headers['x-event-version'] !== envelope.version ||
      headers['x-business-key'] !== envelope.businessKey
    ) {
      throw new InvalidMessageError('Headers AMQP divergem do envelope');
    }
    return envelope;
  }

  parse(message: ConsumeMessage): MessageEnvelope {
    let body: unknown;
    try {
      body = JSON.parse(message.content.toString('utf8')) as unknown;
    } catch {
      throw new InvalidMessageError('Corpo da mensagem não é JSON válido');
    }
    return this.validateMessage(body, message.properties);
  }

  validateEnvelope(envelope: MessageEnvelope): void {
    if (!this.envelope(envelope)) {
      throw new InvalidMessageError(this.errors(this.envelope.errors));
    }
  }

  private errors(errors: ErrorObject[] | null | undefined): string {
    return (
      errors?.map((error) => error.message ?? 'inválido').join('; ') ??
      'Mensagem inválida'
    );
  }
}
