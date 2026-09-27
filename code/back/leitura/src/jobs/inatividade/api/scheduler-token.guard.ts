import { createHash, timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { NaoAutenticado } from '../../../common/erros-de-negocio';

export const CABECALHO_SCHEDULER_TOKEN = 'x-scheduler-token';

function digest(valor: string): Buffer {
  return createHash('sha256').update(valor, 'utf8').digest();
}

@Injectable()
export class SchedulerTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(contexto: ExecutionContext): boolean {
    const esperado = this.config.get<string>('SCHEDULER_TOKEN');
    const bruto = contexto.switchToHttp().getRequest<Request>().headers[
      CABECALHO_SCHEDULER_TOKEN
    ];
    const recebido = Array.isArray(bruto) ? bruto[0] : bruto;

    if (
      !esperado ||
      !recebido ||
      !timingSafeEqual(digest(recebido), digest(esperado))
    ) {
      throw new NaoAutenticado();
    }
    return true;
  }
}
