import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { ErroDeValidacao } from '../erros-de-negocio';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CABECALHO_IDEMPOTENCIA = 'idempotency-key';

export interface EscopoIdempotente {
  chave: string;
  operacao: string;
}

export function operacaoCanonica(metodo: string, caminho: string): string {
  const semQuery = caminho.split('?')[0];
  const normalizado = semQuery.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return `${metodo.toUpperCase()} ${(normalizado || '/').toLowerCase()}`;
}

export const Idempotente = createParamDecorator(
  (_dado: unknown, contexto: ExecutionContext): EscopoIdempotente => {
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

    return {
      chave: chave.trim().toLowerCase(),
      operacao: operacaoCanonica(req.method, req.originalUrl),
    };
  },
);
