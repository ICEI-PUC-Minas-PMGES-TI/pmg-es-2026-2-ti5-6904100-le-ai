import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import { NaoAutenticado } from '../common/erros-de-negocio';
import { UsuarioAutenticado } from './usuario-autenticado';

/**
 * Injeta o usuário do token no handler.
 *
 * Nunca aceite o id do solicitante pelo corpo ou pela query: propriedade e
 * autorização são validadas no servidor a partir da identidade provada pelo
 * token (RNF-SEC-02).
 */
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
