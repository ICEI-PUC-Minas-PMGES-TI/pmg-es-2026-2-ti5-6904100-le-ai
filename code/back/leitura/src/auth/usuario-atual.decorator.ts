import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { NaoAutenticado } from '../common/erros-de-negocio';
import { UsuarioAutenticado } from './usuario-autenticado';

export const UsuarioAtual = createParamDecorator(
  (_dado: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const req = contexto
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();

    if (!req.usuario) {
      throw new NaoAutenticado();
    }
    return req.usuario;
  },
);
