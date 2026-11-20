import { req, login } from './api.mjs';
const { accessToken: token } = await login(process.env.CONTA || 'caio');
for (const q of process.argv.slice(2)) {
  const r = await req('acervo', 'GET', `/livros?q=${encodeURIComponent(q)}`, { token });
  const itens = r.json.itens || r.json.dados || r.json;
  console.log('##', q, r.status, Array.isArray(itens) ? '' : JSON.stringify(r.json).slice(0, 300));
  if (Array.isArray(itens)) for (const l of itens) console.log(l.id, '|', l.titulo, '|', (l.autores||[]).map(a=>a.nome||a).join(','), '|capa', !!(l.capaUrl||l.capa), '|nota', l.notaMedia ?? l.nota?.media ?? '', '|pg', l.paginas ?? '');
}
