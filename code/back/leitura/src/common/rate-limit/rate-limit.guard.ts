import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { LimiteExcedido } from '../erros-de-negocio';
import { JanelaEmMemoria } from './janela-em-memoria';
import { ConfiguracaoDeLimite, RATE_LIMIT } from './rate-limit.decorator';

/**
 * Rate limiting por IP **e** por identidade (RNF-SEC-18).
 *
 * As duas metades existem porque protegem de coisas diferentes: o limite por
 * identidade impede uma conta de inundar o feed, e o por IP impede um cliente não
 * autenticado ou um script de saturar a rota. A mais restritiva vence.
 *
 * O limite por IP é deliberadamente mais folgado que o por identidade, pelo
 * mesmo motivo registrado no `identidade`: a rede de uma faculdade sai toda pelo
 * mesmo IP, e apertar demais transformaria uma turma inteira num único cliente
 * bloqueado.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly janela = new JanelaEmMemoria();

  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const configuracao = this.reflector.getAllAndOverride<ConfiguracaoDeLimite>(
      RATE_LIMIT,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!configuracao) {
      return true;
    }

    const req = contexto
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();

    const prefixo = configuracao.escopo ? `${configuracao.escopo}:` : '';
    const alvos: Array<[string, number]> = [
      [`${prefixo}ip:${req.ip ?? 'desconhecido'}`, configuracao.porIp],
    ];
    if (req.usuario) {
      alvos.push([
        `${prefixo}sub:${req.usuario.id}`,
        configuracao.porIdentidade,
      ]);
    }

    for (const [chave, limite] of alvos) {
      const espera = this.janela.registrar(
        chave,
        limite,
        configuracao.janelaSegundos,
      );
      if (espera !== null) {
        throw new LimiteExcedido(espera);
      }
    }

    return true;
  }
}
