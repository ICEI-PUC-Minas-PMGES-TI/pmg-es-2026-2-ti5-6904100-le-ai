import { req, login } from './api.mjs';
const caio = (await login('caio')).accessToken;
const fuso = 'America/Sao_Paulo';
const lidos = [['0087e9a9-4d90-44c7-a10f-94d08445b28b',5],['513a1914-c0af-4d69-ac93-071208aedcf1',4.5],['c6f144b6-48d0-4852-a7f1-98ccdaccc0bb',3.5],['5dab35e0-d737-49b8-b880-3fa922835d1b',3],['c19a75ef-93b5-4310-b5cb-02c650b00b11',4],['96d8d503-3dc7-49be-8a4a-4925693544d2',5]];
const ids = {};
for (const [livroId, nota] of lidos) {
  const l = await req('leitura', 'POST', '/leituras', { token: caio, corpo: { livroId } });
  console.log('leitura', l.status, JSON.stringify(l.json).slice(0, 160));
  const leituraId = l.json.id || l.json.leituraId;
  const f = await req('leitura', 'POST', `/leituras/${leituraId}/finalizar`, { token: caio, corpo: { fusoHorarioDispositivo: fuso } });
  console.log(' fim', f.status, f.status >= 300 ? JSON.stringify(f.json).slice(0,200) : '');
  const n = await req('leitura', 'PUT', `/livros/${livroId}/nota`, { token: caio, corpo: { valor: nota } });
  console.log(' nota', n.status, n.status >= 300 ? JSON.stringify(n.json).slice(0,200) : '');
}
const r = await req('leitura', 'PUT', `/livros/0087e9a9-4d90-44c7-a10f-94d08445b28b/resenha`, { token: caio, corpo: { texto: 'Releitura obrigatória. A narração de **Bentinho** é tão parcial que o livro vira um julgamento sem provas, e cada leitor sai com o seu veredito.', spoiler: false } });
console.log('resenha', r.status, JSON.stringify(r.json).slice(0, 200));
const l2 = await req('leitura', 'POST', '/leituras', { token: caio, corpo: { livroId: '88b5a785-e55f-4eaa-b3b3-5e4e5b8ea50d' } });
console.log('lendo', l2.status, JSON.stringify(l2.json).slice(0, 160));
const e = await req('leitura', 'POST', '/estante', { token: caio, corpo: { livroId: '0e96351a-2279-4697-abf4-9a18597bf44c' } });
console.log('estante', e.status, JSON.stringify(e.json).slice(0, 160));
