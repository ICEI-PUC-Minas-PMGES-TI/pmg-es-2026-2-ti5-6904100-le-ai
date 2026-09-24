import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { criarApp, novoUsuario, tokenDe } from './app';
import { contar, limpar, prepararBanco } from './banco';
import { isbn } from './massa';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Guard global de autenticação contra o app inteiro: toda rota sem
 * `@Publico()` recusa token ausente, malformado, assinado com outro segredo ou
 * de outro emissor, sempre com o mesmo 401 — o motivo real fica só no log
 * (RNF-SEC-22).
 */
describe('autenticação (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;

  beforeAll(async () => {
    pool = await prepararBanco();
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });
  beforeEach(() => limpar(pool));

  const http = () => request(app.getHttpServer());

  /** `undefined` = sem header `Authorization`. */
  const credenciais: Array<[string, () => string | undefined]> = [
    ['sem Authorization', () => undefined],
    ['Bearer lixo', () => 'Bearer lixo'],
    [
      'token assinado com outro segredo',
      () =>
        `Bearer ${tokenDe(novoUsuario(), 'leitora', {
          segredo: 'outro-segredo-qualquer-com-mais-de-32-caracteres',
        })}`,
    ],
    [
      'token de outro emissor',
      () =>
        `Bearer ${tokenDe(novoUsuario(), 'leitora', { issuer: 'impostor' })}`,
    ],
  ];

  const rotas: Array<[string, (autorizacao?: string) => request.Test]> = [
    [
      'GET /livros/pessoal/:id',
      (autorizacao) => {
        const req = http().get(`/livros/pessoal/${randomUUID()}`);
        return autorizacao ? req.set('Authorization', autorizacao) : req;
      },
    ],
    [
      'POST /livros/oficial',
      (autorizacao) => {
        const req = http()
          .post('/livros/oficial')
          .set('Idempotency-Key', randomUUID())
          .send({ isbn: isbn('978853591484') });
        return autorizacao ? req.set('Authorization', autorizacao) : req;
      },
    ],
  ];

  describe.each(rotas)('%s', (_rota, chamar) => {
    it.each(credenciais)(
      '%s responde 401 NAO_AUTENTICADO com correlationId',
      async (_caso, autorizacao) => {
        const resposta = await chamar(autorizacao());

        expect(resposta.status).toBe(401);
        expect(resposta.body).toMatchObject({ codigo: 'NAO_AUTENTICADO' });
        const { correlationId } = resposta.body as { correlationId: string };
        expect(correlationId).toMatch(UUID);
        expect(resposta.headers['x-correlation-id']).toBe(correlationId);
        // Recusado no guard: nada chega ao efeito.
        expect(await contar(pool, 'acervo.importacao_livro')).toBe(0);
        expect(await contar(pool, 'acervo.idempotencia_acervo')).toBe(0);
      },
    );
  });

  it('/health continua público, sem token', async () => {
    const resposta = await http().get('/health');
    expect(resposta.status).toBe(200);
  });
});
