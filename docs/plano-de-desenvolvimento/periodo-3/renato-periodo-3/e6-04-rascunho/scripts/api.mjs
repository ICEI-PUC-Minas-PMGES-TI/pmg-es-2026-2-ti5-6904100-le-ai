import fs from 'node:fs';
import crypto from 'node:crypto';
export const AMB = process.env.AMB || 'dev';
export const URLS = AMB === 'des' ? {
  identidade: 'https://leai-identidade.onrender.com', acervo: 'https://leai-acervo.onrender.com',
  leitura: 'https://leai-leitura.onrender.com', social: 'https://leai-social.onrender.com', web: 'https://leai-web.onrender.com',
} : {
  identidade: 'http://localhost:8080', acervo: 'http://localhost:3000', leitura: 'http://localhost:3001',
  social: 'http://localhost:8081', web: 'http://localhost:5173',
};
export function lerEnv(arq) {
  const o = {}; if (!fs.existsSync(arq)) return o;
  for (const l of fs.readFileSync(arq, 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) o[m[1]] = m[2].trim(); }
  return o;
}
export const ARQ_SENHAS = AMB === 'des' ? 'C:/Users/Renato/.leai/contas-demo-des.env' : 'C:/Users/Renato/.leai/contas-demo-dev.env';
export function senha(conta) { return lerEnv(ARQ_SENHAS)[`LEAI_DEMO_${conta.toUpperCase()}_SENHA`]; }
export async function req(svc, metodo, caminho, { token, corpo, idem } = {}) {
  const h = { 'content-type': 'application/json' };
  if (token) h.authorization = `Bearer ${token}`;
  if (idem !== false && metodo !== 'GET') h['idempotency-key'] = crypto.randomUUID();
  const r = await fetch(URLS[svc] + caminho, { method: metodo, headers: h, body: corpo ? JSON.stringify(corpo) : undefined });
  const txt = await r.text(); let json; try { json = JSON.parse(txt); } catch { json = txt; }
  return { status: r.status, json };
}
export async function login(conta) {
  const r = await req('identidade', 'POST', '/auth/login', { corpo: { identificador: `leai.demo.${conta}`, senha: senha(conta) } });
  if (r.status !== 200) throw new Error(`login ${conta}: ${r.status} ${JSON.stringify(r.json).slice(0,200)}`);
  return r.json;
}
