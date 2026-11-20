import fs from 'node:fs';
import { abrir, ir, foto, botoes } from './cap.mjs';
import { req, login } from './api.mjs';
const ids = JSON.parse(fs.readFileSync('ids-des.json', 'utf8'));
const A = '513a1914-c0af-4d69-ac93-071208aedcf1';
const so = process.argv[2];
const caio = (await login('caio')).accessToken;
const pessoal = (await req('leitura', 'GET', '/estante', { token: caio })).json.itens.find(i => i.livro?.titulo?.includes('Sítio Azul'))?.livroId;
const livroA = (await req('acervo', 'GET', `/livros/${A}`, { token: caio })).json;
const autorId = livroA.autores?.[0]?.id;
const rotas = {
  'p1-f-aut-configuracoes-web': '/perfil/configuracoes',
  'p1-f-perfil-meu-perfil-web': '/perfil',
  'p1-f-perfil-outro-leitor-web': '/leitores/leai.demo.bia',
  'p1-f-perfil-conexoes-web': '/perfil/conexoes',
  'p1-f-acv-busca-descobrir-web': '/descobrir?q=machado%20de%20assis',
  'p1-f-acv-busca-livro-web': `/livros/${A}`,
  'p1-f-acv-cadastro-pagina-pessoal-web': `/livros/pessoal/${pessoal}`,
  'p1-f-est-estante-web': '/estante',
  'p1-f-prg-progresso-web': `/estante/leituras/${ids.leituraHora}/progresso`,
  'p1-f-ava-resenha-web': `/livros/${A}/resenha`,
  'p1-f-feed-feed-web': '/feed',
  'p2-f-conta-2-excluir-web': '/perfil/configuracoes/excluir-conta',
  'p2-f-acv-descoberta-autor-web': `/descobrir/autores/${autorId}`,
  'p2-f-est-2-historico-web': '/estante/historico',
  'p2-f-ava-2-frases-web': `/livros/${A}/frases`,
  'p2-f-sta-estatisticas-web': '/perfil/estatisticas',
  'p2-f-lst-listas-web': '/perfil/listas',
  'p2-f-lst-lista-web': `/perfil/listas/${ids.lista1}`,
  'p2-f-rec-p2p-recebidas-web': '/descobrir/recomendacoes',
};
const { browser, page } = await abrir({ conta: 'caio' });
for (const [nome, rota] of Object.entries(rotas)) {
  if (so && !nome.includes(so)) continue;
  await ir(page, rota);
  await page.waitForTimeout(1200);
  await foto(page, nome);
}
await browser.close();
const e = await abrir({ conta: 'caio', escuro: true });
if (!so || 'escuro'.includes(so)) { await ir(e.page, '/estante'); await e.page.waitForTimeout(1200); await foto(e.page, 'p1-f-est-estante-escuro-web'); }
await e.browser.close();
