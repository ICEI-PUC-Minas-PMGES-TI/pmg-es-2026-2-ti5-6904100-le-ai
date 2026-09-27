const base = process.env.DATABASE_URL_TESTE;
if (!base) {
  throw new Error(
    'DATABASE_URL_TESTE não definida. Suba um Postgres descartável e exporte, por exemplo:\n' +
      '  DATABASE_URL_TESTE=postgresql://postgres:teste@localhost:55432/leai_teste',
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
