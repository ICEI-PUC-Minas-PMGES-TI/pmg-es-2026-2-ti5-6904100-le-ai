// Calcula p50, p95, p99 e máximo a partir do cenario-3-latencias.json e grava cenario-3-resumo.txt.
// Percentil por nearest-rank: p(k) = valor ordenado na posição ceil(k/100 * n), base 1.
// Só entram no percentil as respostas 200; os demais status são contados à parte.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIR_EVIDENCIAS, gravar } from './comum.mjs';

const dados = JSON.parse(readFileSync(process.argv[2] ?? join(DIR_EVIDENCIAS, 'cenario-3-latencias.json'), 'utf8'));

export function percentil(valores, k) {
  const ord = [...valores].sort((a, b) => a - b);
  if (!ord.length) return null;
  return ord[Math.max(1, Math.ceil((k / 100) * ord.length)) - 1];
}
function estat(linhas) {
  const ok = linhas.filter((l) => l.status === 200).map((l) => l.ms);
  return {
    n: linhas.length,
    erros: linhas.length - ok.length,
    p50: percentil(ok, 50),
    p95: percentil(ok, 95),
    p99: percentil(ok, 99),
    max: ok.length ? Math.max(...ok) : null,
  };
}
const fmt = (s) => `n=${String(s.n).padStart(4)} erros=${s.erros} p50=${s.p50} ms p95=${s.p95} ms p99=${s.p99} ms max=${s.max} ms`;

const saida = [
  `Cenário 3 - ${dados.ambiente}, ${dados.medidoEm}. Teto global ${dados.tetoRps} req/s, ciclo fechado.`,
  `Percentil nearest-rank sobre as respostas 200. Linha de base da rede (mediana de 20 GET /health do acervo): ${dados.linhaDeBaseRede.medianaMs} ms.`,
  '',
];
for (const f of dados.fases) {
  const linhas = dados.requisicoes.filter((l) => l.fase === f.fase);
  const dur = f.segundos;
  saida.push(`Fase ${f.fase} (${f.clientes} cliente(s), ${dur} s, ${(linhas.length / dur).toFixed(1)} req/s): ${fmt(estat(linhas))}`);
  for (const tipo of ['titulo', 'autor', 'isbn', 'amplo']) {
    const lt = linhas.filter((l) => l.tipo === tipo);
    if (lt.length) saida.push(`    ${tipo.padEnd(6)} ${fmt(estat(lt))}`);
  }
}
saida.push('', 'Critério do cenário 3: p95 <= 1000 ms na fase C.');
const c = estat(dados.requisicoes.filter((l) => l.fase === 'C'));
saida.push(`Resultado: p95 da fase C = ${c.p95} ms -> ${c.p95 !== null && c.p95 <= 1000 ? 'atende' : 'não atende'} (medido no cliente, inclui a ida e volta Brasil-Oregon).`);
if (dados.complementoLeituras?.length) {
  saida.push('', 'Complemento (RNF-DES-01, fora do cenário 3): 30 leituras sequenciais por rota');
  for (const rota of [...new Set(dados.complementoLeituras.map((l) => l.rota))]) {
    saida.push(`    ${rota.padEnd(38)} ${fmt(estat(dados.complementoLeituras.filter((l) => l.rota === rota)))}`);
  }
}
saida.push('');
gravar('cenario-3-resumo.txt', saida.join('\n'));
console.log(saida.join('\n'));
