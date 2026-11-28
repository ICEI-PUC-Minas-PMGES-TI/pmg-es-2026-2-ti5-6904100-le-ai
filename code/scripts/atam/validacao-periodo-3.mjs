// Validação em DES dos fluxos do Período 3 e do refinamento do card da estante (28/11/2026), com as
// contas de demonstração. Uso normal e leve: lê, cria um livro pessoal de teste e o apaga no fim,
// descarta no máximo uma sugestão do Caio e, só com a senha do administrador no arquivo de contas
// (LEAI_ADMIN_IDENTIFICADOR e LEAI_ADMIN_SENHA), suspende e reativa a Bia. Nada de token na saída.
import { randomUUID } from 'node:crypto';
import { URLS, req, gravar, lerContas } from './comum.mjs';
import { Sessao } from './sessao.mjs';

const resultado = { executadoEm: new Date().toISOString(), passos: [] };
function passo(feature, nome, ok, detalhe) {
  resultado.passos.push({ feature, nome, ok, detalhe });
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${feature} — ${nome}${detalhe ? `: ${JSON.stringify(detalhe)}` : ''}`);
}

const caio = await new Sessao('caio').login();
const bia = await new Sessao('bia').login();

// Refinamento: o item da estante traz livro.tipo.
{
  const r = await caio.chamar('GET', `${URLS.leitura}/estante`);
  const itens = r.json?.itens ?? [];
  const tipos = [...new Set(itens.map((i) => i.livro?.tipo))];
  passo('Refinamento', 'GET /estante traz livro.tipo', r.status === 200 && itens.length > 0 && itens.every((i) => ['oficial', 'pessoal'].includes(i.livro?.tipo)), { status: r.status, itens: itens.length, tipos });
}

// F-ACV-OPC: livro pessoal com assuntos, lido de volta e apagado.
{
  const a = await caio.chamar('GET', `${URLS.acervo}/assuntos`);
  const ids = (a.json?.itens ?? []).slice(0, 2).map((x) => x.id);
  passo('F-ACV-OPC', 'GET /assuntos', a.status === 200 && ids.length === 2, { status: a.status, total: a.json?.itens?.length });
  const c = await caio.chamar('POST', `${URLS.acervo}/livros/pessoal`, { titulo: 'Validacao DES P3', autor: 'Teste', paginas: 100, assuntos: ids });
  const livroId = c.json?.id;
  const lido = livroId ? await caio.chamar('GET', `${URLS.acervo}/livros/pessoal/${livroId}`) : null;
  const assuntosLidos = (lido?.json?.assuntos ?? []).map((x) => x.id);
  passo('F-ACV-OPC', 'criar livro pessoal com 2 assuntos e ler de volta', c.status === 201 && ids.every((id) => assuntosLidos.includes(id)), { criar: c.status, ler: lido?.status, assuntos: assuntosLidos.length });
  if (livroId) {
    const d = await caio.chamar('DELETE', `${URLS.acervo}/livros/pessoal/${livroId}`);
    passo('F-ACV-OPC', 'apagar o livro de teste', d.status === 204, { status: d.status });
  }
}

// F-REC-ALG: as duas seções e o descarte de uma sugestão.
{
  const r = await caio.chamar('GET', `${URLS.social}/recomendacoes/sugestoes`);
  const seguidos = r.json?.seguidos?.itens ?? [];
  const gosto = r.json?.gosto?.itens ?? [];
  passo('F-REC-ALG', 'GET /recomendacoes/sugestoes', r.status === 200 && r.json?.seguidos && r.json?.gosto, { status: r.status, seguidos: seguidos.length, gosto: gosto.length, motivos: [...seguidos, ...gosto].slice(0, 3).map((s) => s.motivo) });
  const alvo = (seguidos[0] ?? gosto[0])?.livro?.id;
  if (alvo) {
    const d = await caio.chamar('POST', `${URLS.social}/recomendacoes/sugestoes/${alvo}/descartar`);
    const depois = await caio.chamar('GET', `${URLS.social}/recomendacoes/sugestoes`);
    const ainda = [...(depois.json?.seguidos?.itens ?? []), ...(depois.json?.gosto?.itens ?? [])].some((s) => s.livro?.id === alvo);
    passo('F-REC-ALG', 'descartar uma sugestão e ela sumir', d.status === 204 && !ainda, { descartar: d.status, aindaAparece: ainda });
  } else {
    passo('F-REC-ALG', 'descartar uma sugestão', true, { observacao: 'nenhuma sugestão para o Caio; descarte não exercitado' });
  }
}

// F-STA-OPC: distribuição das notas nas estatísticas.
{
  const r = await caio.chamar('GET', `${URLS.leitura}/me/estatisticas`);
  const d = r.json?.distribuicaoNotas;
  passo('F-STA-OPC', 'GET /me/estatisticas traz distribuicaoNotas', r.status === 200 && 'distribuicaoNotas' in (r.json ?? {}), { status: r.status, distribuicao: d === null ? 'vazia (sem notas)' : Array.isArray(d?.faixas ?? d) ? 'com faixas' : typeof d });
}

// F-DSF-OPC: histórico de janelas de cada desafio.
{
  const r = await caio.chamar('GET', `${URLS.leitura}/desafios`);
  const desafios = r.json?.itens ?? r.json ?? [];
  passo('F-DSF-OPC', 'GET /desafios', r.status === 200, { status: r.status, desafios: Array.isArray(desafios) ? desafios.length : '?' });
  const id = Array.isArray(desafios) ? desafios[0]?.id : undefined;
  if (id) {
    const j = await caio.chamar('GET', `${URLS.leitura}/desafios/${id}/janelas`);
    passo('F-DSF-OPC', 'GET /desafios/{id}/janelas', j.status === 200, { status: j.status, janelas: (j.json?.itens ?? []).length });
  } else {
    passo('F-DSF-OPC', 'histórico de janelas', true, { observacao: 'o Caio não tem desafio; histórico não exercitado' });
  }
}

// F-GAM-OPC: calendário da sequência.
{
  const r = await caio.chamar('GET', `${URLS.leitura}/me/sequencia/calendario`);
  passo('F-GAM-OPC', 'GET /me/sequencia/calendario', r.status === 200, { status: r.status, mes: r.json?.mes, diasComLeitura: (r.json?.dias ?? []).length });
}

// F-NOT-OPC: preferências de notificação.
{
  const r = await caio.chamar('GET', `${URLS.social}/me/notificacoes/preferencias`);
  passo('F-NOT-OPC', 'GET /me/notificacoes/preferencias', r.status === 200, { status: r.status });
}

// F-MOD-OPC: suspender e reativar a Bia, só com o administrador no arquivo de contas.
{
  const contas = lerContas();
  if (!contas.LEAI_ADMIN_IDENTIFICADOR || !contas.LEAI_ADMIN_SENHA) {
    passo('F-MOD-OPC', 'suspender e reativar', true, { observacao: 'sem LEAI_ADMIN_IDENTIFICADOR/LEAI_ADMIN_SENHA no arquivo de contas; não exercitado' });
  } else {
    const l = await req('POST', `${URLS.identidade}/auth/login`, {
      corpo: { identificador: contas.LEAI_ADMIN_IDENTIFICADOR, senha: contas.LEAI_ADMIN_SENHA },
      headers: { 'Idempotency-Key': randomUUID() },
    });
    const token = l.json?.accessToken;
    const admin = (metodo, url, corpo) => req(metodo, url, { token, corpo, headers: { 'Idempotency-Key': randomUUID() } });
    const s = await admin('POST', `${URLS.social}/admin/usuarios/${bia.id}/suspender`, { motivo: 'Validação do Período 3 em DES' });
    const loginSuspensa = await req('POST', `${URLS.identidade}/auth/login`, {
      corpo: { identificador: 'leai.demo.bia', senha: contas.LEAI_DEMO_BIA_SENHA },
      headers: { 'Idempotency-Key': randomUUID() },
    });
    const r = await admin('POST', `${URLS.social}/admin/usuarios/${bia.id}/reativar`, { motivo: 'Fim da validação do Período 3' });
    const loginReativada = await req('POST', `${URLS.identidade}/auth/login`, {
      corpo: { identificador: 'leai.demo.bia', senha: contas.LEAI_DEMO_BIA_SENHA },
      headers: { 'Idempotency-Key': randomUUID() },
    });
    passo('F-MOD-OPC', 'suspender: login da conta suspensa é 403; reativar: login volta a 200',
      l.status === 200 && s.status < 300 && loginSuspensa.status === 403 && r.status < 300 && loginReativada.status === 200,
      { loginAdmin: l.status, suspender: s.status, loginSuspensa: loginSuspensa.status, reativar: r.status, loginReativada: loginReativada.status });
  }
}

const falhas = resultado.passos.filter((p) => !p.ok).length;
resultado.resumo = { passos: resultado.passos.length, falhas };
gravar('validacao-periodo-3-des.json', resultado);
console.log(`\n${resultado.passos.length} passos, ${falhas} falha(s).`);
