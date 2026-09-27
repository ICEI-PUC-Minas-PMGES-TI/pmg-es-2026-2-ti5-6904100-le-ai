import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PinoLogger } from 'nestjs-pino';
import { NaoAutenticado } from '../common/erros-de-negocio';
import { UsuarioAutenticado } from './usuario-autenticado';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class VerificadorJwt implements OnModuleInit {
  private readonly segredo: string | undefined;

  constructor(
    config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.segredo = config.get<string>('JWT_SECRET');
    this.logger.setContext(VerificadorJwt.name);
  }

  onModuleInit(): void {
    if (!this.segredo) {
      this.logger.warn(
        'JWT_SECRET ausente: todas as rotas autenticadas responderão 401.',
      );
    }
  }

  verificar(token: string): UsuarioAutenticado {
    if (!this.segredo) {
      throw new NaoAutenticado();
    }

    let conteudo: jwt.JwtPayload;
    try {
      conteudo = jwt.verify(token, this.segredo, {
        algorithms: ['HS256'],
        issuer: 'identidade',
        clockTolerance: 5,
      }) as jwt.JwtPayload;
    } catch (erro) {
      this.logger.debug(
        { motivo: erro instanceof Error ? erro.message : 'desconhecido' },
        'Token recusado',
      );
      throw new NaoAutenticado();
    }

    const id = conteudo.sub;
    const username = conteudo.username;

    if (typeof id !== 'string' || !UUID.test(id)) {
      throw new NaoAutenticado();
    }
    if (typeof username !== 'string' || !username.trim()) {
      throw new NaoAutenticado();
    }

    return { id: id.toLowerCase(), username };
  }
}
