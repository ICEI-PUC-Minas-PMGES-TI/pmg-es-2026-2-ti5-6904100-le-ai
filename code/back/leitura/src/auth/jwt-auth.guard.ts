import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { NaoAutenticado } from '../common/erros-de-negocio';
import { PUBLICO } from './publico.decorator';
import { UsuarioAutenticado } from './usuario-autenticado';
import { VerificadorJwt } from './verificador-jwt.service';

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
