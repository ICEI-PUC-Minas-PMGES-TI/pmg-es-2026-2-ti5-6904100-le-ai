import { req, login } from './api.mjs';
const t = (await login('caio')).accessToken;
const ids = process.argv.slice(2);
for (const id of ids) {
  const l = await req('acervo', 'GET', `/livros/${id}`, { token: t });
  const r = await req('acervo', 'GET', `/livros/${id}/resenhas`, { token: t });
  const f = await req('leitura', 'GET', `/livros/${id}/frases`, { token: t });
  const rs = (r.json.itens || []).map(x => x.autor?.username || x.usuario?.username);
  const fs = (f.json.itens || []).map(x => x.autor?.username || x.usuario?.username);
  console.log(l.status, id.slice(0, 8), l.json.titulo, '| capa', !!l.json.capa?.url, '| nota', JSON.stringify(l.json.nota || l.json.notaGeral || '').slice(0, 80), '| resenhas', rs.join(','), '| frases', fs.join(','));
}
