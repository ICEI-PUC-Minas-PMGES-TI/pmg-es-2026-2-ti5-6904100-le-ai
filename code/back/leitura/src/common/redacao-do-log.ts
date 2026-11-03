/**
 * O que nunca vai para o log (RNF-SEC-36): credenciais do leitor, os segredos entre serviços (o
 * do agendador, F-EST, e o da moderação, F-MOD) e campos sensíveis em qualquer objeto logado.
 * O `pino-http` loga os cabeçalhos da requisição, então cabeçalho com segredo precisa estar aqui.
 */
export const REDACAO_DO_LOG = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["x-scheduler-token"]',
    'req.headers["x-moderacao-token"]',
    '*.password',
    '*.senha',
    '*.token',
    '*.hash',
  ],
  remove: true,
};
