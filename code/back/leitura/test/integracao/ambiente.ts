/**
 * Ambiente dos testes de integração. Roda antes de qualquer import do app,
 * porque `schema.ts` lê `DB_SCHEMA` no carregamento do módulo.
 *
 * `DATABASE_URL_TESTE` aponta para um Postgres descartável — o container local
 * (`docker run ... postgres:17-alpine`) ou o service container do CI. **Nunca**
 * para o Neon: o fixture derruba e recria os schemas a cada arquivo de teste.
 *
 * Localmente, use um banco próprio para o `leitura` (por exemplo
 * `leai_teste_leitura`): o fixture do `acervo` recria os mesmos schemas.
 */
const base = process.env.DATABASE_URL_TESTE;
if (!base) {
  throw new Error(
    'DATABASE_URL_TESTE não definida. Suba um Postgres descartável e exporte, por exemplo:\n' +
      '  DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste_leitura',
  );
}
if (/neon\.tech|\.render\.com/i.test(base)) {
  throw new Error('DATABASE_URL_TESTE aponta para banco gerenciado; recusado.');
}

const separador = base.includes('?') ? '&' : '?';
process.env.DATABASE_URL = `${base}${separador}options=-csearch_path%3Dleitura`;
process.env.DB_SCHEMA = 'leitura';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.AMQP_ENABLED = 'false';
process.env.JWT_SECRET = 'segredo-de-integracao-com-mais-de-32-caracteres';
process.env.SCHEDULER_TOKEN = 'token-do-agendador-de-integracao-com-32-chars';
