// Cenário 4a: GET /health em cada serviço, um de cada vez, com o tempo até a primeira resposta
// e um segundo GET logo depois, para comparação. Rodar com os serviços hibernados.
import { URLS, req, gravar } from './comum.mjs';

const saida = { medidoEm: new Date().toISOString(), ambiente: 'DES (Render, Oregon)', servicos: [] };
for (const s of ['identidade', 'acervo', 'leitura', 'social']) {
  const primeiro = await req('GET', `${URLS[s]}/health`, { timeoutMs: 180000 });
  const segundo = await req('GET', `${URLS[s]}/health`);
  const item = {
    servico: s,
    primeiro: { iniciadoEm: primeiro.iniciadoEm, ms: primeiro.ms, status: primeiro.status, erro: primeiro.erro, corpo: primeiro.json ?? primeiro.texto.slice(0, 200) },
    segundo: { iniciadoEm: segundo.iniciadoEm, ms: segundo.ms, status: segundo.status },
  };
  console.log(s, item.primeiro.status, item.primeiro.ms, 'ms ->', item.segundo.ms, 'ms');
  saida.servicos.push(item);
}
const nome = process.argv[2] ?? 'cenario-4-cold-start.json';
gravar(nome, saida);
