import fs from 'node:fs';
import { req, login, AMB } from './api.mjs';
if (AMB !== 'des') throw new Error('AMB=des');
const ids = JSON.parse(fs.readFileSync('ids-des.json', 'utf8'));
const p = async (s, prom) => { const r = await prom; console.log(s, r.status, r.status >= 300 ? JSON.stringify(r.json).slice(0, 200) : ''); return r.json; };
const caio = (await login('caio')).accessToken, bia = (await login('bia')).accessToken;
const caioId = (await req('identidade', 'GET', '/me', { token: caio })).json.id;
const feed = (await req('social', 'GET', '/feed', { token: bia })).json.itens;
const ativ = feed.find(a => a.tipo === 'RESENHA_PUBLICADA' && a.autor.username === 'leai.demo.caio');
console.log('ativ', ativ?.id, ativ?.livro?.titulo);
ids.atividadeResenha = ativ.id;
await p('curtir', req('social', 'POST', `/atividades/${ativ.id}/curtir`, { token: bia }));
const c = await p('comentario bia', req('social', 'POST', `/atividades/${ativ.id}/comentarios`, { token: bia, corpo: { texto: 'Concordo sobre os capítulos curtos! O das dedicatórias é o meu preferido.' } }));
ids.comentarioBia = c.id;
const r = await p('resposta caio', req('social', 'POST', `/atividades/${ativ.id}/comentarios`, { token: caio, corpo: { texto: '@leai.demo.bia o capítulo "Das negativas" no fim também é ótimo, vale reler.', comentarioRespondidoId: c.id } }));
ids.respostaCaio = r.id;
for (const [livroId, msg] of [['9f2b5ccf-57ac-43aa-863e-c4a91201da35', 'Teatro curto e intenso, dá para ler numa tarde.'], ['efec633e-f996-4888-933d-ae6a996331d1', 'Um clássico do modernismo, diferente de tudo.']]) {
  await p('recomendacao', req('social', 'POST', '/recomendacoes', { token: bia, corpo: { livroId, destinatarios: [caioId], mensagem: msg } }));
}
fs.writeFileSync('ids-des.json', JSON.stringify(ids, null, 1));
