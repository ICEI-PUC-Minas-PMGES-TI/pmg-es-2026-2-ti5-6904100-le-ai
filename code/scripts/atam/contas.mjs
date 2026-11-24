// Cria as contas de demonstração no DES (se não existirem) e monta os dados do plano da E6-03, seção 2.
// Senhas: geradas aqui e gravadas só no arquivo fora do repositório (ARQUIVO_CONTAS).
// Ids coletados vão para o arquivo de estado (LEAI_ESTADO_ATAM), também fora do repositório.
// Cada passo é idempotente pelo arquivo de estado: rodar de novo só completa o que faltou.
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { URLS, req, ARQUIVO_CONTAS, ARQUIVO_ESTADO, sleep } from './comum.mjs';
import { CONTAS, Sessao } from './sessao.mjs';

const estado = existsSync(ARQUIVO_ESTADO) ? JSON.parse(readFileSync(ARQUIVO_ESTADO, 'utf8')) : {};
const salvar = () => writeFileSync(ARQUIVO_ESTADO, JSON.stringify(estado, null, 2));
const log = (...a) => console.log(new Date().toISOString(), ...a);
const ok = (r, ...esperados) => {
  if (!esperados.includes(r.status)) throw new Error(`${r.metodo} ${r.url} -> ${r.status} ${r.texto.slice(0, 300)}`);
  return r.json;
};
const FUSO = 'America/Sao_Paulo';

// 1. Cadastro pelo /auth/register
mkdirSync(dirname(ARQUIVO_CONTAS), { recursive: true });
const lerArquivo = () => (existsSync(ARQUIVO_CONTAS) ? readFileSync(ARQUIVO_CONTAS, 'utf8') : '');
for (const [nome, c] of Object.entries(CONTAS)) {
  if (lerArquivo().includes(`${c.chave}=`)) continue;
  const senha = 'Le' + randomBytes(18).toString('base64url') + '9!';
  const r = await req('POST', `${URLS.identidade}/auth/register`, {
    corpo: { email: c.email, username: c.username, displayName: c.displayName, dataNascimento: '1995-01-01', senha },
    headers: { 'Idempotency-Key': randomUUID() },
  });
  if (r.status !== 201) throw new Error(`cadastro de ${nome}: ${r.status} ${r.texto.slice(0, 300)}`);
  appendFileSync(ARQUIVO_CONTAS, `${c.chave}=${senha}\n`);
  estado[`${nome}Id`] = r.json.id;
  salvar();
  log('cadastrada', c.username, r.json.id);
}

const marina = await new Sessao('marina').login();
const caio = await new Sessao('caio').login();
const bia = await new Sessao('bia').login();
Object.assign(estado, { marinaId: marina.id, caioId: caio.id, biaId: bia.id });
salvar();

// 2. Marina com perfil privado
if (!estado.marinaPrivada) {
  ok(await marina.chamar('PUT', `${URLS.identidade}/me/perfil`, {
    displayName: 'Marina Demo', biografia: 'Conta de demonstração do Lê Aí.', avatar: null, privacidade: 'privado',
  }), 200);
  estado.marinaPrivada = true; salvar(); log('marina privada');
}

// 3. Livros oficiais reais do acervo de DES
if (!estado.livros) {
  const vistos = new Map();
  for (const q of ['machado de assis', 'clarice lispector', 'jorge amado', 'graciliano ramos']) {
    const r = ok(await bia.chamar('GET', `${URLS.acervo}/livros?q=${encodeURIComponent(q)}&limit=20`), 200);
    for (const l of r.itens) {
      if (l.paginas >= 80 && l.paginas <= 900 && !vistos.has(l.id)) vistos.set(l.id, { id: l.id, titulo: l.titulo, paginas: l.paginas });
    }
  }
  estado.livros = [...vistos.values()].slice(0, 12);
  if (estado.livros.length < 10) throw new Error(`acervo de DES com poucos livros para a massa (${estado.livros.length})`);
  salvar(); log('livros:', estado.livros.map((l) => l.titulo).join(' | '));
}
const L = estado.livros;

async function naEstante(s, livroId) {
  const r = await s.chamar('POST', `${URLS.leitura}/estante`, { livroId });
  if (![201, 409].includes(r.status)) ok(r, 201);
}
async function iniciar(s, livroId, chave) {
  if (estado[chave]) return estado[chave];
  const r = ok(await s.chamar('POST', `${URLS.leitura}/leituras`, { livroId, dataInicio: '2026-11-01' }), 201);
  estado[chave] = r.id; salvar(); return r.id;
}
async function progresso(s, leituraId, pagina, minutos = 30) {
  return ok(await s.chamar('POST', `${URLS.leitura}/leituras/${leituraId}/progresso`, {
    pagina, minutos, registradoEmDispositivo: new Date().toISOString(), fusoHorarioDispositivo: FUSO,
  }), 201);
}

// 4. Estante da Marina: 8 livros (L0..L7), todos começam em Quero ler
if (!estado.marinaEstante) {
  for (const l of L.slice(0, 8)) await naEstante(marina, l.id);
  estado.marinaEstante = true; salvar(); log('estante da marina');
}
// leitura em andamento (L0) com 3 progressos
if (!estado.marinaProgressos) {
  const id = await iniciar(marina, L[0].id, 'marinaLeituraAndamento');
  estado.marinaProgressos = [];
  for (const p of [20, 45, 70]) {
    const r = await progresso(marina, id, Math.min(p, L[0].paginas - 1));
    estado.marinaProgressos.push(r?.progresso?.id ?? r?.id ?? null);
  }
  salvar(); log('leitura em andamento', id);
}
// leitura concluída (L1) com nota e resenha
if (!estado.marinaConcluida) {
  const id = await iniciar(marina, L[1].id, 'marinaLeituraConcluida');
  const st = (await marina.chamar('GET', `${URLS.leitura}/leituras/${id}`)).json?.status;
  if (st !== 'lido') {
    await progresso(marina, id, Math.floor(L[1].paginas / 2), 120);
    ok(await marina.chamar('POST', `${URLS.leitura}/leituras/${id}/finalizar`, { fusoHorarioDispositivo: FUSO }), 200);
  }
  ok(await marina.chamar('PUT', `${URLS.leitura}/livros/${L[1].id}/nota`, { valor: 4.5 }), 200);
  const r = ok(await marina.chamar('PUT', `${URLS.leitura}/livros/${L[1].id}/resenha`, {
    texto: 'Resenha de demonstração da Marina: releitura que valeu cada página.', spoiler: false,
  }), 200, 201);
  estado.marinaResenhaId = r?.id ?? null;
  estado.marinaConcluida = true; salvar(); log('leitura concluída com nota e resenha');
}
// segunda leitura em andamento (L2)
if (!estado.marinaLeitura2Ok) {
  const id = await iniciar(marina, L[2].id, 'marinaLeitura2');
  await progresso(marina, id, Math.min(30, L[2].paginas - 1));
  estado.marinaLeitura2Ok = true; salvar();
}
// abandonada (L3)
if (!estado.marinaAbandonada) {
  const id = await iniciar(marina, L[3].id, 'marinaLeituraAbandonada');
  const r = await marina.chamar('POST', `${URLS.leitura}/leituras/${id}/abandonar`, { fusoHorarioDispositivo: FUSO });
  if (![200, 409].includes(r.status)) log('abandonar:', r.status, r.texto.slice(0, 200));
  estado.marinaAbandonada = true; salvar();
}
// frase (L0)
if (!estado.marinaFrase) {
  const r = ok(await marina.chamar('POST', `${URLS.leitura}/livros/${L[0].id}/frases`, { texto: 'Frase de demonstração guardada pela Marina.', pagina: 12 }), 201);
  estado.marinaFrase = r.id; salvar(); log('frase');
}
// desafio
if (!estado.marinaDesafio) {
  const r = await marina.chamar('POST', `${URLS.leitura}/desafios`, { unidade: 'livros', janela: 'anual', valorAlvo: 12, fusoHorario: FUSO });
  if (r.status === 201) estado.marinaDesafio = r.json.id;
  else { log('desafio:', r.status, r.texto.slice(0, 200)); estado.marinaDesafio = 'existente'; }
  salvar();
}
// livro pessoal da Marina e lista com 1 oficial e 1 pessoal
if (!estado.livroPessoalMarina) {
  const r = ok(await marina.chamar('POST', `${URLS.acervo}/livros/pessoal`, { titulo: 'Caderno de Viagem da Marina (demo)', autor: 'Marina Demo', paginas: 120 }), 201);
  estado.livroPessoalMarina = r.id; salvar(); log('livro pessoal marina', r.id);
}
if (!estado.listaMarina) {
  const r = ok(await marina.chamar('POST', `${URLS.social}/listas`, { titulo: 'Favoritos de novembro (demo)', descricao: 'Lista de demonstração.', livroId: L[1].id }), 201);
  estado.listaMarina = r.id; salvar();
  ok(await marina.chamar('POST', `${URLS.social}/listas/${r.id}/livros`, { livroId: estado.livroPessoalMarina }), 200, 201);
  log('lista marina', r.id);
}

// 5. Caio: livro pessoal na estante e numa lista pública; outra lista sem ele; resenha no L1; segue a Marina
if (!estado.livroPessoalCaio) {
  const r = ok(await caio.chamar('POST', `${URLS.acervo}/livros/pessoal`, { titulo: 'Memórias do Sítio Azul (demo)', autor: 'Caio Demo', paginas: 200 }), 201);
  estado.livroPessoalCaio = r.id; salvar(); log('livro pessoal caio', r.id);
}
if (!estado.caioEstante) {
  await naEstante(caio, estado.livroPessoalCaio);
  await naEstante(caio, L[1].id);
  await naEstante(caio, L[4].id);
  estado.caioEstante = true; salvar();
}
if (!estado.listaCaio) {
  const r = ok(await caio.chamar('POST', `${URLS.social}/listas`, { titulo: 'Escritos de casa (demo)', livroId: estado.livroPessoalCaio }), 201);
  estado.listaCaio = r.id; salvar(); log('lista caio', r.id);
}
if (!estado.listaCaioSemLivro) {
  const r = ok(await caio.chamar('POST', `${URLS.social}/listas`, { titulo: 'Clássicos (demo)', livroId: L[4].id }), 201);
  estado.listaCaioSemLivro = r.id; salvar();
}
if (!estado.caioResenha) {
  ok(await caio.chamar('PUT', `${URLS.leitura}/livros/${L[1].id}/nota`, { valor: 4 }), 200);
  ok(await caio.chamar('PUT', `${URLS.leitura}/livros/${L[1].id}/resenha`, { texto: 'Resenha de demonstração do Caio sobre o mesmo livro.', spoiler: false }), 200, 201);
  estado.caioResenha = true; salvar(); log('resenha caio');
}
if (!estado.caioSegueMarina) {
  const r = await caio.chamar('POST', `${URLS.identidade}/perfis/${CONTAS.marina.username}/seguir`);
  if (![201, 409].includes(r.status)) ok(r, 201);
  const sols = ok(await marina.chamar('GET', `${URLS.identidade}/solicitacoes?page=0&size=20`), 200);
  const sol = sols.items.find((s) => JSON.stringify(s).includes(CONTAS.caio.username));
  if (sol) ok(await marina.chamar('POST', `${URLS.identidade}/solicitacoes/${sol.id}/aceitar`), 204);
  estado.caioSegueMarina = true; salvar(); log('caio segue marina');
}

// 6. Bia: 2 livros na estante, sem seguir ninguém
if (!estado.biaEstante) {
  await naEstante(bia, L[5].id);
  await naEstante(bia, L[8].id);
  estado.biaEstante = true; salvar(); log('estante bia');
}

// 7. Atividade da Marina no feed do Caio (gerada por evento; espera até 60 s)
for (let i = 0; i < 12 && !estado.atividadeMarina; i++) {
  const f = await caio.chamar('GET', `${URLS.social}/feed?page=0&size=20`);
  const a = f.json?.itens?.find((x) => x.autor?.id === estado.marinaId || x.autor?.username === CONTAS.marina.username);
  if (a) { estado.atividadeMarina = a.id; salvar(); log('atividade da marina', a.id, a.tipo); break; }
  if (i === 0) log('feed do caio:', f.status, JSON.stringify(f.json).slice(0, 300));
  await sleep(5000);
}
if (!estado.atividadeMarina) log('AVISO: nenhuma atividade da Marina no feed do Caio');

if (!lerArquivo().includes('PRONTO=1')) appendFileSync(ARQUIVO_CONTAS, 'PRONTO=1\n');
log('massa pronta');
