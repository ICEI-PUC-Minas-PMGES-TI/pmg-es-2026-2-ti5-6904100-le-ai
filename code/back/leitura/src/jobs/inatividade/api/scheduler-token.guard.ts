import { createHash, timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { NaoAutenticado } from '../../../common/erros-de-negocio';

export const CABECALHO_SCHEDULER_TOKEN = 'x-scheduler-token';

function digest(valor: string): Buffer {
  return createHash('sha256').update(valor, 'utf8').digest();
}

/**
 * Autenticação do agendador (`schedulerToken` em `docs/api/leitura.yaml`).
 *
 * A rota é `@Publico()` para o guard JWT global; este guard é quem a protege.
 * Sem `SCHEDULER_TOKEN` configurado, toda chamada é recusada. A comparação é
 * feita sobre os digests SHA-256, de tamanho fixo, com `timingSafeEqual`: nem o
 * tempo de resposta nem o tamanho do segredo vazam.
 */
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
