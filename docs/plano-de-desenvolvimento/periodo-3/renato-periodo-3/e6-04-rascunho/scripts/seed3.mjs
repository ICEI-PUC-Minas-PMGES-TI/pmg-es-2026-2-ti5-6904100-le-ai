import { req, login } from './api.mjs';
const caio = (await login('caio')).accessToken, bia = (await login('bia')).accessToken;
const p = (s, r) => { console.log(s, r.status, JSON.stringify(r.json).slice(0, 300)); return r.json; };
const pes = p('pessoal', await req('acervo', 'POST', '/livros/pessoal', { token: caio, corpo: { titulo: 'Crônicas da Rua do Ouvidor', autor: 'L. Martins', paginas: 184, sinopse: 'Edição independente de crônicas sobre o centro do Rio de Janeiro, comprada numa feira de livros.', assuntos: ['ffde9d62-e3e4-4095-9d1c-b41961f18348','a5ed3764-95f4-4ab8-987a-211538f290a2','de903d0a-e3bb-4d0f-ab7f-ca36f88f801b'] } }));
p('estante pessoal', await req('leitura', 'POST', '/estante', { token: caio, corpo: { livroId: pes.id } }));
p('desafio diario', await req('leitura', 'POST', '/desafios', { token: caio, corpo: { unidade: 'paginas', janela: 'diaria', valorAlvo: 20, fusoHorario: 'America/Sao_Paulo' } }));
p('desafio anual', await req('leitura', 'POST', '/desafios', { token: caio, corpo: { unidade: 'livros', janela: 'anual', valorAlvo: 24, fusoHorario: 'America/Sao_Paulo' } }));
const feed = p('feed bia', await req('social', 'GET', '/feed', { token: bia }));
