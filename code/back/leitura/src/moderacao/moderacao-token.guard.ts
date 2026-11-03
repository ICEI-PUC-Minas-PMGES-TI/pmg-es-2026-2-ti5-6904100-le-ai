import { createHash, timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  NaoAutenticado,
  ServicoIndisponivel,
} from '../common/erros-de-negocio';

export const CABECALHO_MODERACAO_TOKEN = 'x-moderacao-token';

function digest(valor: string): Buffer {
  return createHash('sha256').update(valor, 'utf8').digest();
}

/**
 * Autentica o comando interno da moderação (F-MOD): só o `social` conhece o `MODERACAO_TOKEN`,
 * então toda remoção passa pela auditoria dele. Mesma comparação em tempo constante do
 * `SchedulerTokenGuard`. Sem o segredo configurado, 503: o serviço sobe, mas a remoção fica
 * indisponível em vez de aceitar qualquer chamada.
 */
@Injectable()
export class ModeracaoTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(contexto: ExecutionContext): boolean {
    const esperado = this.config.get<string>('MODERACAO_TOKEN');
    if (!esperado) {
      throw new ServicoIndisponivel();
    }
    const bruto = contexto.switchToHttp().getRequest<Request>().headers[
      CABECALHO_MODERACAO_TOKEN
    ];
    const recebido = Array.isArray(bruto) ? bruto[0] : bruto;

    if (!recebido || !timingSafeEqual(digest(recebido), digest(esperado))) {
      throw new NaoAutenticado();
    }
    return true;
  }
}
