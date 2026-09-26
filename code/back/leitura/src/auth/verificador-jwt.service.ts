import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PinoLogger } from 'nestjs-pino';
import { NaoAutenticado } from '../common/erros-de-negocio';
import { UsuarioAutenticado } from './usuario-autenticado';

/**
 * Valida o token de acesso emitido por `identidade` (RF-AUT-03).
 *
 * `leitura` só **verifica**; quem emite é o `identidade`, com HS256 e segredo
 * compartilhado (`JwtConfig` do serviço Spring). A chave HMAC são os bytes UTF-8
 * crus de `JWT_SECRET`, sem base64 — por isso o segredo entra aqui como string,
 * sem transformação nenhuma. O mesmo valor precisa estar nos dois serviços.
 *
 * Todas as opções de verificação são explícitas de propósito. `algorithms`
 * trava a confusão de algoritmo: sem ele, um token com `alg: none` ou assinado
 * com uma chave pública seria aceito.
 *
 * O que **não** está aqui é revogação: o token de renovação rotativo e revogável
 * é de F-AUT. Aqui vale a expiração curta de 15 minutos do emissor.
 */
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
      // Em produção o boot nem chega aqui: o schema de env recusa a
      // configuração. Em desenvolvimento e teste o serviço sobe sem o segredo
      // para o health continuar respondendo, mas toda rota autenticada devolve
      // 401 — e isso precisa ser dito em voz alta, senão vira uma hora de
      // depuração de "por que meu token válido dá 401".
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
        // Render e Neon são máquinas diferentes; alguns segundos de deriva não
        // podem invalidar um token recém-emitido.
        clockTolerance: 5,
      }) as jwt.JwtPayload;
    } catch (erro) {
      // O motivo real (expirado, assinatura inválida, emissor errado) fica só
      // no log: dizer ao cliente qual foi entrega informação a quem está
      // sondando (RNF-SEC-22).
      this.logger.debug(
        { motivo: erro instanceof Error ? erro.message : 'desconhecido' },
        'Token recusado',
      );
      throw new NaoAutenticado();
    }

    const id = conteudo.sub;
    const username = conteudo.username;

    // O emissor põe o id do usuário no `subject` e o username em claim própria.
    // Um token bem assinado mas sem essas claims não identifica ninguém.
    if (typeof id !== 'string' || !UUID.test(id)) {
      throw new NaoAutenticado();
    }
    if (typeof username !== 'string' || !username.trim()) {
      throw new NaoAutenticado();
    }

    return { id: id.toLowerCase(), username };
  }
}
