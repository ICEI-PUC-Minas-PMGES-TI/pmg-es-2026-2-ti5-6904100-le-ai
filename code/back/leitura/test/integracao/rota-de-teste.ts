import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { IsNumber } from 'class-validator';
import type { Response } from 'express';
import { UsuarioAtual } from '../../src/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../src/auth/usuario-autenticado';
import { EntidadeInvalida } from '../../src/common/erros-de-negocio';
import {
  OPERACOES,
  operacaoNoCaminho,
} from '../../src/common/idempotencia/idempotencia.constantes';
import { IdempotenciaService } from '../../src/common/idempotencia/idempotencia.service';
import { IdempotencyKey } from '../../src/common/idempotencia/idempotency-key.decorator';
import { OutboxRepository } from '../../src/outbox/outbox.repository';

/** Evento que só existe no teste, com schema registrado pelo próprio teste. */
export const EVENTO_DE_TESTE = { tipo: 'teste.eco', versao: 1 } as const;

export const SCHEMA_DO_EVENTO_DE_TESTE = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['livroId', 'valor'],
  properties: {
    livroId: { type: 'string', format: 'uuid' },
    valor: { type: 'number', minimum: 0 },
  },
};

class EcoEntrada {
  @IsNumber()
  valor!: number;
}

/**
 * Rota que só existe nos testes da infra comum: passa pelo guard global, lê a
 * `Idempotency-Key`, grava um evento na outbox dentro da transação idempotente
 * e devolve 422 com `campos` quando `valor` passa de 5. É o caminho que toda
 * escrita de F-AVA, F-EST e F-PRG vai percorrer.
 *
 * `valor` negativo passa pela validação HTTP mas fura o schema do evento: é o
 * caso do produtor com bug, que precisa desfazer a transação inteira.
 */
@Controller('__teste')
export class RotaDeTeste {
  constructor(
    private readonly idempotencia: IdempotenciaService,
    private readonly outbox: OutboxRepository,
  ) {}

  @Post('eco/:livroId')
  async eco(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IdempotencyKey() chave: string,
    @Param('livroId', new ParseUUIDPipe()) livroId: string,
    @Body() corpo: EcoEntrada,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    if (corpo.valor > 5) {
      throw new EntidadeInvalida([
        { campo: 'valor', mensagem: 'Use um valor de até 5.' },
      ]);
    }

    const resposta = await this.idempotencia.executar(
      {
        subjectRef: usuario.id,
        operacao: operacaoNoCaminho(OPERACOES.SALVAR_NOTA, livroId),
        chave,
        payload: corpo,
      },
      async (tx) => {
        const eventId = await this.outbox.inserir(tx, {
          ...EVENTO_DE_TESTE,
          chaveNegocio: `eco:${livroId}`,
          payload: { livroId, valor: corpo.valor },
        });
        return { status: 201, corpo: { eventId, valor: corpo.valor } };
      },
    );

    res.status(resposta.status);
    return resposta.corpo;
  }
}
