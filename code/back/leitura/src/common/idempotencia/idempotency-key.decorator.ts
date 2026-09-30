import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { ErroDeValidacao } from '../erros-de-negocio';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CABECALHO_IDEMPOTENCIA = 'idempotency-key';

/**
 * Extrai e valida o header `Idempotency-Key`.
 *
 * O contrato marca o header como **obrigatório** e `format: uuid` em toda
 * escrita de `leitura`. Ausente ou fora do formato é 400 com `campos`, não 500 —
 * e recusar antes de tocar o banco evita gravar recibo com chave inútil.
 */
export const IdempotencyKey = createParamDecorator(
  (_dado: unknown, contexto: ExecutionContext): string => {
    const req = contexto.switchToHttp().getRequest<Request>();
    const bruto = req.headers[CABECALHO_IDEMPOTENCIA];
    const chave = Array.isArray(bruto) ? bruto[0] : bruto;

    if (!chave || !UUID.test(chave.trim())) {
      throw new ErroDeValidacao([
        {
          campo: 'Idempotency-Key',
          mensagem: 'Informe uma chave de idempotência no formato UUID.',
        },
      ]);
    }

    return chave.trim().toLowerCase();
  },
);
