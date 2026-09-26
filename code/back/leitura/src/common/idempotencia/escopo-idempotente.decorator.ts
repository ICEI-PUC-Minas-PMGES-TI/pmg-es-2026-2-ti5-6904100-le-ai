import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { ErroDeValidacao } from '../erros-de-negocio';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CABECALHO_IDEMPOTENCIA = 'idempotency-key';

/** A chave recebida e a operação que ela protege. O ator vem do token. */
export interface EscopoIdempotente {
  chave: string;
  /** `MÉTODO /caminho/canônico`, gravado em `idempotencia_leitura.operacao`. */
  operacao: string;
}

/**
 * Operação canônica: método + caminho sem query, barras repetidas ou barra
 * final, em minúsculas.
 *
 * O contrato fixa o escopo da chave em `(ator, método, caminho canônico)`
 * (`docs/api/leitura.yaml`, `IdempotencyKey`). Por isso o id do recurso entra
 * na operação: a mesma chave em `/leituras/A/finalizar` e em
 * `/leituras/B/finalizar` são escopos distintos. Sem a canonicalização,
 * `/Leituras/A/` e `/leituras/a` virariam escopos diferentes e a repetição da
 * mesma escrita escaparia do replay.
 */
export function operacaoCanonica(metodo: string, caminho: string): string {
  const semQuery = caminho.split('?')[0];
  const normalizado = semQuery.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return `${metodo.toUpperCase()} ${(normalizado || '/').toLowerCase()}`;
}

/**
 * Extrai e valida o header `Idempotency-Key` e deriva a operação canônica.
 *
 * O contrato marca o header como **obrigatório** e `format: uuid` em toda
 * escrita de `leitura`. Ausente ou fora do formato é 400 com `campos`, não 500 —
 * e recusar antes de tocar o banco evita gravar recibo com chave inútil.
 */
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
