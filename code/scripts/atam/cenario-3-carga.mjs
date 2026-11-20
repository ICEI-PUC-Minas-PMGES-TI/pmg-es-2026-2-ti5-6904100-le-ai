// Cenário 3: busca de livros sob carga leve no DES.
// Ciclo fechado (cada cliente faz uma requisição por vez) com teto GLOBAL de 10 req/s.
// Fases: A = 1 cliente por 30 s, B = 5 clientes por 60 s, C = 10 clientes por 60 s.
// Saída bruta: cenario-3-latencias.json (uma linha por requisição). O p95 sai do p95.mjs.
import { URLS, gravar, sleep, req } from './comum.mjs';
import { Sessao } from './sessao.mjs';

const TETO_RPS = 10;
const FASES = [
  { fase: 'A', clientes: 1, segundos: 30 },
  { fase: 'B', clientes: 5, segundos: 60 },
  { fase: 'C', clientes: 10, segundos: 60 },
];
// Candidatas: títulos, autores e ISBN-13 reais do acervo de DES (os ISBN foram lidos no Neon le-ai-oregon,
// só leitura) e um termo amplo como pior caso. A descoberta abaixo confirma que cada uma retorna resultado.
const CANDIDATAS = [
  { tipo: 'titulo', q: 'dom casmurro' },
  { tipo: 'titulo', q: 'vidas secas' },
  { tipo: 'titulo', q: 'capitaes da areia' },
  { tipo: 'autor', q: 'machado de assis' },
  { tipo: 'autor', q: 'clarice lispector' },
  { tipo: 'autor', q: 'jorge amado' },
  { tipo: 'isbn', q: '9788506004234' },
  { tipo: 'isbn', q: '9788508040841' },
  { tipo: 'isbn', q: '9788500714900' },
  { tipo: 'amplo', q: 'amor' },
];
const url = (q) => `${URLS.acervo}/livros?q=${encodeURIComponent(q)}&limit=20`;

const bia = await new Sessao('bia').login();

// Aquecimento: /health abaixo de 2 s
for (;;) {
  const h = await req('GET', `${URLS.acervo}/health`, { timeoutMs: 180000 });
  console.log('health', h.status, h.ms);
  if (h.status === 200 && h.ms < 2000) break;
}
// Descoberta das consultas
const consultas = [];
for (const c of CANDIDATAS) {
  const r = await bia.chamar('GET', url(c.q));
  const total = r.json?.totalItens ?? 0;
  console.log('descoberta', c.tipo, c.q, r.status, total);
  if (r.status === 200 && total > 0) consultas.push({ ...c, totalItens: total, primeiro: r.json.itens[0]?.titulo });
}
gravar('cenario-3-consultas.json', { medidoEm: new Date().toISOString(), rota: 'GET /livros?q=<termo>&limit=20', consultas });
// 20 buscas descartadas
for (let i = 0; i < 20; i++) await bia.chamar('GET', url(consultas[i % consultas.length].q));

// Linha de base da rede: mediana de 20 GET /health
const health = [];
for (let i = 0; i < 20; i++) health.push((await req('GET', `${URLS.acervo}/health`)).ms);
const ord = [...health].sort((a, b) => a - b);
const medianaHealth = (ord[9] + ord[10]) / 2;
console.log('mediana /health', medianaHealth);

// Limitador global: cada início de requisição reserva um intervalo de 1000/TETO ms
let proximo = 0;
async function vez() {
  const agora = performance.now();
  const t = Math.max(agora, proximo);
  proximo = t + 1000 / TETO_RPS;
  if (t > agora) await sleep(t - agora);
}

const linhas = [];
let k = 0;
for (const { fase, clientes, segundos } of FASES) {
  const fim = performance.now() + segundos * 1000;
  const inicioFase = new Date().toISOString();
  await Promise.all(Array.from({ length: clientes }, async (_, cliente) => {
    while (performance.now() < fim) {
      await vez();
      if (performance.now() >= fim) break;
      const c = consultas[k++ % consultas.length];
      const r = await bia.chamar('GET', url(c.q));
      linhas.push({ fase, cliente, tipo: c.tipo, q: c.q, inicio: r.iniciadoEm, ms: r.ms, status: r.status, correlationId: r.correlationId, erro: r.erro });
    }
  }));
  const n = linhas.filter((l) => l.fase === fase).length;
  console.log(`fase ${fase}: ${n} requisições desde ${inicioFase}`);
}

// Complemento (RNF-DES-01, fora do cenário 3): 30 leituras sequenciais de 3 rotas
const marina = await new Sessao('marina').login();
const caio = await new Sessao('caio').login();
const complemento = [];
const rotas = [
  { nome: 'GET /estante (Marina)', s: marina, u: `${URLS.leitura}/estante` },
  { nome: 'GET /feed (Caio)', s: caio, u: `${URLS.social}/feed?page=0&size=20` },
  { nome: 'GET /perfis/{marinaId}/estante (Caio)', s: caio, u: `${URLS.leitura}/perfis/${marina.id}/estante` },
];
for (const rt of rotas) {
  await rt.s.chamar('GET', rt.u); // aquece a rota
  for (let i = 0; i < 30; i++) {
    const r = await rt.s.chamar('GET', rt.u);
    complemento.push({ rota: rt.nome, inicio: r.iniciadoEm, ms: r.ms, status: r.status, correlationId: r.correlationId });
  }
}

gravar('cenario-3-latencias.json', {
  medidoEm: new Date().toISOString(),
  ambiente: 'DES (Render/Neon/CloudAMQP Oregon), cliente no Brasil',
  tetoRps: TETO_RPS,
  fases: FASES,
  linhaDeBaseRede: { rota: 'GET /health (acervo)', amostrasMs: health, medianaMs: medianaHealth },
  requisicoes: linhas,
  complementoLeituras: complemento,
});
console.log('ok', linhas.length, 'buscas');
