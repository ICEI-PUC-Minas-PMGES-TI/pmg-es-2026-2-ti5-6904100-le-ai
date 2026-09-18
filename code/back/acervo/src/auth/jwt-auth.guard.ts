import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { NaoAutenticado } from '../common/erros-de-negocio';
import { PUBLICO } from './publico.decorator';
import { UsuarioAutenticado } from './usuario-autenticado';
import { VerificadorJwt } from './verificador-jwt.service';

/**
 * Guard global: exige `Authorization: Bearer <token>` em toda rota que não
 * esteja marcada com `@Publico()`.
 *
 * Global e não por controller porque o custo do esquecimento é assimétrico: com
 * guard global, esquecer o decorator numa rota pública dá 401 e alguém reclama;
 * com guard por rota, esquecer numa rota protegida expõe dados.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verificador: VerificadorJwt,
  ) {}

  canActivate(contexto: ExecutionContext): boolean {
    const publico = this.reflector.getAllAndOverride<boolean>(PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (publico) {
      return true;
    }

    const req = contexto
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();

    const cabecalho = req.headers.authorization;
    if (!cabecalho?.startsWith('Bearer ')) {
      throw new NaoAutenticado();
    }

    req.usuario = this.verificador.verificar(
      cabecalho.slice('Bearer '.length).trim(),
    );
    return true;
  }
}
