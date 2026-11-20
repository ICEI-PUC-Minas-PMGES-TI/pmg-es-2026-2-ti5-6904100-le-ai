import { chromium } from 'playwright-core';
import { URLS, login, req } from './api.mjs';
import { tokenAdmin } from './admin.mjs';
import { fileURLToPath } from 'node:url';
export const OUT = fileURLToPath(new URL('./out/', import.meta.url));
export async function abrir({ conta, escuro = false, largura = 1440, altura = 900, filtrarModeracao = false, soDemo = false } = {}) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura }, deviceScaleFactor: 1, colorScheme: escuro ? 'dark' : 'light', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  if (conta) {
    let sessao;
    if (conta === 'admin') { const a = await tokenAdmin(); sessao = { token: a.token, refreshToken: 'x', usuario: { id: a.sub, username: 'admin', displayName: a.displayName } }; }
    else { const s = await login(conta); const me = (await req('identidade', 'GET', '/me', { token: s.accessToken })).json; sessao = { token: s.accessToken, refreshToken: s.refreshToken, usuario: { id: me.id, username: me.username, displayName: me.displayName } }; }
    await ctx.addInitScript(([v]) => { if (!sessionStorage.getItem('__injetado')) { localStorage.setItem('le-ai-sessao', v); sessionStorage.setItem('__injetado', '1'); } }, [JSON.stringify(sessao)]);
  }
  if (filtrarModeracao) {
    const demo = (o) => JSON.stringify(o).includes('leai.demo.');
    await ctx.route(/\/admin\/(denuncias|moderacao\/logs)(\?|$)/, async (route) => {
      const r = await route.fetch(); const j = await r.json();
      if (Array.isArray(j.itens)) { j.itens = j.itens.filter(demo); j.temMais = false; j.proximoCursor = null; }
      await route.fulfill({ response: r, json: j });
    });
  }
  if (soDemo) {
    await ctx.route(/\/livros\/[^/]+\/resenhas(\?|$)/, async (route) => {
      const r = await route.fetch(); const j = await r.json();
      if (Array.isArray(j.itens)) j.itens = j.itens.filter(i => / Demo$/.test(i.autorNome || ''));
      await route.fulfill({ response: r, json: j });
    });
    await ctx.route(/acervo[^/]*\/livros\/[0-9a-f-]{36}(\?|$)/, async (route) => {
      const r = await route.fetch(); const j = await r.json();
      if (Array.isArray(j.resenhas?.itens)) j.resenhas.itens = j.resenhas.itens.filter(i => / Demo$/.test(i.autorNome || ''));
      await route.fulfill({ response: r, json: j });
    });
  }
  const page = await ctx.newPage();
  return { browser, ctx, page };
}
export async function ir(page, caminho) { await page.goto(URLS.web + caminho, { waitUntil: 'networkidle' }); await page.waitForTimeout(900); }
export async function foto(page, nome) { await page.waitForTimeout(700); await page.screenshot({ path: OUT + nome + '.png' }); console.log('foto', nome); }
export async function botoes(page) { return (await page.locator('button, a, [role=tab]').allInnerTexts()).map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' | '); }
