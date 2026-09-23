import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { isbn } from './massa';

/**
 * Rate limiting de `POST /livros/oficial` (RNF-SEC-18) com o pipeline real:
 * `trust proxy` lendo `X-Forwarded-For`, guard global de autenticação antes do
 * `RateLimitGuard` e o limite fixo do controller, `{ porIdentidade: 10,
 * porIp: 30, janelaSegundos: 60 }`.
 *
 * Arquivo próprio de propósito: o contador é memória do guard, e cada arquivo
 * sobe o seu app. Dentro dele, os dois casos usam IPs diferentes para a
 * contagem de um não vazar para o outro — o guard incrementa o IP antes da
 * identidade, então as 11 requisições do primeiro caso também contam no IP.
 */
describe('rate limiting (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  let sequencia = 0;

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });
  beforeEach(() => limpar(pool));

  /** ISBN válido e inédito a cada chamada: nenhuma resposta vira 409. */
  const proximoIsbn = () => {
    sequencia += 1;
    return isbn(`978${String(sequencia).padStart(9, '0')}`);
  };

  const solicitar = (usuario: string, ip: string) =>
    request(app.getHttpServer())
      .post('/livros/oficial')
      .set('Authorization', `Bearer ${tokenDe(usuario)}`)
      .set('Idempotency-Key', randomUUID())
      .set('X-Forwarded-For', ip)
      .send({ isbn: proximoIsbn() });

  function esperarLimite(resposta: request.Response) {
    expect(resposta.status).toBe(429);
    expect(resposta.body).toMatchObject({ codigo: 'MUITAS_REQUISICOES' });
    expect(Number(resposta.headers['retry-after'])).toBeGreaterThanOrEqual(1);
  }

  it('por identidade: 10 solicitações passam e a 11ª é 429 com Retry-After', async () => {
    const usuario = novoUsuario();
    const ip = '203.0.113.10';

    for (let i = 0; i < 10; i += 1) {
      expect((await solicitar(usuario, ip)).status).toBe(202);
    }
    esperarLimite(await solicitar(usuario, ip));

    // A recusada não criou solicitação.
    expect(await contar(pool, 'acervo.importacao_livro')).toBe(10);
  });

  it('por IP: 30 usuários distintos passam, o 31º é 429 e outro IP segue livre', async () => {
    const ip = '203.0.113.20';

    for (let i = 0; i < 30; i += 1) {
      expect((await solicitar(novoUsuario(), ip)).status).toBe(202);
    }
    esperarLimite(await solicitar(novoUsuario(), ip));

    expect((await solicitar(novoUsuario(), '203.0.113.30')).status).toBe(202);
    expect(await contar(pool, 'acervo.importacao_livro')).toBe(31);
  });
});
