import { req, login } from './api.mjs';
for (const c of ['caio', 'marina', 'bia']) {
  const t = (await login(c)).accessToken;
  const e = await req('leitura', 'GET', '/estante', { token: t });
  const itens = e.json.itens || e.json;
  console.log('##', c, 'estante', e.status, Array.isArray(itens) ? itens.map(i => `${i.livro?.titulo}[${i.status}]`).join('; ') : JSON.stringify(e.json).slice(0, 200));
  const l = await req('social', 'GET', '/me/listas', { token: t }); console.log(' listas', JSON.stringify(l.json).slice(0, 300));
  const s = await req('identidade', 'GET', '/me/seguidos', { token: t }); console.log(' seguidos', JSON.stringify(s.json).slice(0, 300));
  const d = await req('leitura', 'GET', '/desafios', { token: t }); console.log(' desafios', JSON.stringify(d.json).slice(0, 200));
}
