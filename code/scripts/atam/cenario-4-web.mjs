// Cenário 4a (web): login da Marina na web de DES com os serviços possivelmente hibernados.
// Edge headless via playwright-core, instalado FORA do repositório: PW_DIR aponta para a pasta que tem
// node_modules/playwright-core. Tira um print a cada ~5 s (esperando 700 ms antes de cada um) até sair
// da tela de login ou até 300 s, e grava a linha do tempo em cenario-4-web-cold-start.json.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { URLS, lerContas, gravar, sleep } from './comum.mjs';
import { CONTAS } from './sessao.mjs';

const PW_DIR = process.env.PW_DIR;
if (!PW_DIR) throw new Error('defina PW_DIR (pasta com node_modules/playwright-core, fora do repositório)');
const { chromium } = createRequire(join(PW_DIR, 'x.js'))('playwright-core');
const DIR_PRINTS = process.env.ATAM_PRINTS ?? join(PW_DIR, 'prints');
mkdirSync(DIR_PRINTS, { recursive: true });

const AVISO = 'O servidor está iniciando';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const linha = [];
const t0 = Date.now();
await page.goto(`${URLS.web}/login`, { waitUntil: 'networkidle', timeout: 120000 });
await page.getByLabel('E-mail ou nome de usuário').fill(CONTAS.marina.username);
await page.getByLabel('Senha', { exact: true }).fill(lerContas()[CONTAS.marina.chave]);
const tClique = Date.now();
await page.getByRole('button', { name: 'Entrar' }).click();
for (let i = 0; ; i++) {
  await sleep(700);
  const texto = await page.locator('body').innerText();
  const arquivo = `cenario-4-web-cold-start-${String(i).padStart(2, '0')}.png`;
  await page.screenshot({ path: join(DIR_PRINTS, arquivo) });
  const item = {
    print: arquivo,
    segundosDesdeOClique: Math.round((Date.now() - tClique) / 100) / 10,
    url: page.url().replace(URLS.web, ''),
    avisoDeInicializacao: texto.includes(AVISO),
    botaoEntrando: texto.includes('Entrando'),
    mensagemDeErro: /erro|falha|tente novamente|indispon/i.test(texto) ? texto.match(/[^\n]*(erro|falha|tente novamente|indispon)[^\n]*/i)?.[0] ?? true : null,
  };
  linha.push(item);
  console.log(JSON.stringify(item));
  if (!item.url.startsWith('/login') || Date.now() - tClique > 300000) break;
  await sleep(4300);
}
await browser.close();
gravar('cenario-4-web-cold-start.json', {
  medidoEm: new Date(t0).toISOString(),
  ambiente: 'DES (Render, Oregon), web estática + identidade; Edge headless no Brasil',
  aviso: AVISO,
  segundosAteSairDoLogin: linha.at(-1).url.startsWith('/login') ? null : linha.at(-1).segundosDesdeOClique,
  linhaDoTempo: linha,
});
