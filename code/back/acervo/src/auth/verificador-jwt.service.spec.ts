import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PinoLogger } from 'nestjs-pino';
import { NaoAutenticado } from '../common/erros-de-negocio';
import { VerificadorJwt } from './verificador-jwt.service';

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres';
const OUTRO_SEGREDO = 'outro-segredo-de-teste-com-32-caracteres!';
const ID = '3f1a5c2e-9b7d-4f6a-8c1e-2d4b6a8e0f31';

function logger(): PinoLogger {
  return {
    setContext: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  } as unknown as PinoLogger;
}

function comSegredo(segredo: string | undefined): VerificadorJwt {
  const config = { get: () => segredo } as unknown as ConfigService;
  return new VerificadorJwt(config, logger());
}

// Duas fábricas explícitas em vez de um parâmetro com valor padrão: em
// JavaScript, passar `undefined` a um parâmetro com padrão aciona o padrão, e
// o teste do segredo ausente acabaria verificando o caminho COM segredo.
const verificador = () => comSegredo(SEGREDO);

/** Token no mesmo formato que o `EmissorDeToken` do serviço `identidade` emite. */
function emitir(
  conteudo: Record<string, unknown> = {},
  opcoes: jwt.SignOptions = {},
  segredo = SEGREDO,
): string {
  return jwt.sign({ username: 'leitora', ...conteudo }, segredo, {
    algorithm: 'HS256',
    issuer: 'identidade',
    subject: ID,
    expiresIn: '15m',
    ...opcoes,
  });
}

describe('VerificadorJwt', () => {
  it('aceita token válido e devolve id e username', () => {
    expect(verificador().verificar(emitir())).toEqual({
      id: ID,
      username: 'leitora',
    });
  });

  it('recusa token expirado', () => {
    const token = emitir({}, { expiresIn: '-1m' });
    expect(() => verificador().verificar(token)).toThrow(NaoAutenticado);
  });

  it('recusa token assinado com outro segredo', () => {
    const token = emitir({}, {}, OUTRO_SEGREDO);
    expect(() => verificador().verificar(token)).toThrow(NaoAutenticado);
  });

  it('recusa token de outro emissor', () => {
    const token = emitir({}, { issuer: 'outro-servico' });
    expect(() => verificador().verificar(token)).toThrow(NaoAutenticado);
  });

  // Confusão de algoritmo: sem `algorithms: ['HS256']` explícito, um token com
  // `alg: none` seria aceito e qualquer pessoa se autenticaria como qualquer um.
  it('recusa token com alg none', () => {
    const semAssinatura = jwt.sign({ username: 'x' }, '', {
      algorithm: 'none',
      issuer: 'identidade',
      subject: ID,
    });
    expect(() => verificador().verificar(semAssinatura)).toThrow(
      NaoAutenticado,
    );
  });

  it('recusa token sem subject utilizável', () => {
    expect(() =>
      verificador().verificar(emitir({}, { subject: 'nao-e-uuid' })),
    ).toThrow(NaoAutenticado);
  });

  it('recusa token sem username', () => {
    const token = jwt.sign({}, SEGREDO, {
      algorithm: 'HS256',
      issuer: 'identidade',
      subject: ID,
      expiresIn: '15m',
    });
    expect(() => verificador().verificar(token)).toThrow(NaoAutenticado);
  });

  it('recusa lixo no lugar do token', () => {
    expect(() => verificador().verificar('nao.e.um.token')).toThrow(
      NaoAutenticado,
    );
  });

  // Sem segredo o serviço ainda sobe em desenvolvimento (o health precisa
  // responder), mas nenhuma rota autenticada pode passar.
  it('recusa tudo quando JWT_SECRET não está configurado', () => {
    expect(() => comSegredo(undefined).verificar(emitir())).toThrow(
      NaoAutenticado,
    );
  });

  it('avisa no boot quando JWT_SECRET está ausente', () => {
    const registro = logger();
    const config = { get: () => undefined } as unknown as ConfigService;
    new VerificadorJwt(config, registro).onModuleInit();
    expect(registro.warn).toHaveBeenCalled();
  });
});
