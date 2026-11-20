// Utilitários comuns dos scripts de medição da E6-03 (ATAM).
// Lê as URLs de LEAI_DES_* (padrão: DES no Render) e as senhas de um arquivo fora do repositório.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const URLS = {
  identidade: process.env.LEAI_DES_IDENTIDADE ?? 'https://leai-identidade.onrender.com',
  acervo: process.env.LEAI_DES_ACERVO ?? 'https://leai-acervo.onrender.com',
  leitura: process.env.LEAI_DES_LEITURA ?? 'https://leai-leitura.onrender.com',
  social: process.env.LEAI_DES_SOCIAL ?? 'https://leai-social.onrender.com',
  web: process.env.LEAI_DES_WEB ?? 'https://leai-web.onrender.com',
};

for (const u of Object.values(URLS)) {
  const host = new URL(u).hostname;
  if (!(host.endsWith('.onrender.com') || host === 'localhost' || host === '127.0.0.1')) {
    throw new Error(`URL recusada (só *.onrender.com ou localhost): ${u}`);
  }
}

export const ARQUIVO_CONTAS =
  process.env.LEAI_CONTAS_DEMO ?? join(homedir(), '.leai', 'contas-demo-des.env');

// Ids coletados na sessão dos donos (sem token nem senha), fora do repositório.
export const ARQUIVO_ESTADO =
  process.env.LEAI_ESTADO_ATAM ?? join(homedir(), '.leai', 'atam-estado.json');

const aqui =dirname(fileURLToPath(import.meta.url));
export const DIR_EVIDENCIAS =
  process.env.LEAI_EVIDENCIAS ?? join(aqui, '..', '..', '..', 'docs', 'evidencias', 'atam');

export function lerContas() {
  const txt = readFileSync(ARQUIVO_CONTAS, 'utf8');
  const env = {};
  for (const linha of txt.split(/\r?\n/)) {
    const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

export function gravar(nome, conteudo) {
  mkdirSync(DIR_EVIDENCIAS, { recursive: true });
  const texto = typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo, null, 2) + '\n';
  if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(texto)) {
    throw new Error(`Evidência ${nome} parece conter token JWT; não gravada.`);
  }
  writeFileSync(join(DIR_EVIDENCIAS, nome), texto);
}

// Requisição com medição de tempo. Nunca devolve o Authorization.
export async function req(metodo, url, { token, corpo, headers = {}, timeoutMs = 120000 } = {}) {
  const h = { Accept: 'application/json', ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (corpo !== undefined) h['Content-Type'] = 'application/json';
  const inicio = performance.now();
  const iniciadoEm = new Date().toISOString();
  let res, texto = '', erro = null;
  try {
    res = await fetch(url, {
      method: metodo,
      headers: h,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    texto = await res.text();
  } catch (e) {
    erro = String(e?.message ?? e);
  }
  const ms = Math.round((performance.now() - inicio) * 10) / 10;
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* corpo não JSON */ }
  return {
    metodo,
    url,
    iniciadoEm,
    ms,
    status: res?.status ?? null,
    correlationId: res?.headers.get('x-correlation-id') ?? null,
    erro,
    json,
    texto,
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
