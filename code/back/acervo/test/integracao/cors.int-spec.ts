import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Pool } from 'pg';
import request from 'supertest';
import { prepararBanco } from './banco';

const PERMITIDA = 'https://leai.exemplo.invalid';
const LOCAL = 'http://localhost:5173';
const ESTRANHA = 'https://malicioso.exemplo.invalid';

/**
 * CORS restrito às origens de `CORS_ALLOWED_ORIGINS`, sem curinga (RNF-SEC-21),
 * no mesmo pipeline de produção (`configurarApp`). A lista tem duas origens,
 * separadas por vírgula e com espaço, como no Render.
 *
 * O `ConfigModule.forRoot` valida o ambiente quando o `AppModule` é carregado,
 * então a variável é definida antes do `import` dinâmico do app.
 */
describe('CORS (integração)', () => {
  let pool: Pool;
  let app: NestExpressApplication;
  const anterior = process.env.CORS_ALLOWED_ORIGINS;

  beforeAll(async () => {
    process.env.CORS_ALLOWED_ORIGINS = `${PERMITIDA}, ${LOCAL}`;
    pool = await prepararBanco();
    const { criarApp } = await import('./app');
    app = await criarApp();
  });
  afterAll(async () => {
    await app.close();
    await pool.end();
    if (anterior === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = anterior;
  });

  const http = () => request(app.getHttpServer());

  it('origem da lista recebe Access-Control-Allow-Origin', async () => {
    for (const origem of [PERMITIDA, LOCAL]) {
      const simples = await http().get('/health').set('Origin', origem);
      expect(simples.status).toBe(200);
      expect(simples.headers['access-control-allow-origin']).toBe(origem);

      const preflight = await http()
        .options('/livros')
        .set('Origin', origem)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization');
      expect(preflight.status).toBe(204);
      expect(preflight.headers['access-control-allow-origin']).toBe(origem);
    }
  });

  it('origem fora da lista não recebe o cabeçalho de CORS', async () => {
    const simples = await http().get('/health').set('Origin', ESTRANHA);
    // A resposta sai (CORS é o navegador que aplica), mas sem liberar a origem.
    expect(simples.status).toBe(200);
    expect(simples.headers['access-control-allow-origin']).toBeUndefined();

    const preflight = await http()
      .options('/livros')
      .set('Origin', ESTRANHA)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');
    expect(preflight.headers['access-control-allow-origin']).toBeUndefined();

    // Nem curinga, nem a origem refletida.
    const semOrigem = await http().get('/health');
    expect(semOrigem.headers['access-control-allow-origin']).toBeUndefined();
  });
});
