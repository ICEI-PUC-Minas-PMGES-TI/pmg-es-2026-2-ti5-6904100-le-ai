// Cenários 1 (perfil privado) e 2 (IDOR e livro pessoal) do ATAM, contra o DES.
// Pré-requisito: contas.mjs já rodou (arquivo de estado com os ids coletados na sessão dos donos).
// Os códigos de negação aceitos vêm do contrato da versão em DES (docs/api/*.yaml no commit CONTRATO_REF):
// para cada rota, os 403/404 que o contrato declara. Sem token, o esperado é 401.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { URLS, req, gravar, ARQUIVO_ESTADO } from './comum.mjs';
import { Sessao, CONTAS } from './sessao.mjs';

const CONTRATO_REF = process.env.LEAI_CONTRATO_REF ?? 'f1f5c7e';
const e = JSON.parse(readFileSync(ARQUIVO_ESTADO, 'utf8'));
const L = e.livros;

const contratos = {};
function codigosDeclarados(servico, caminho, metodo) {
  contratos[servico] ??= execSync(`git show ${CONTRATO_REF}:docs/api/${servico}.yaml`, { encoding: 'utf8' }).split(/\r?\n/);
  const linhas = contratos[servico];
  const iPath = linhas.findIndex((l) => l === `  ${caminho}:`);
  if (iPath < 0) return null; // rota inexistente no contrato
  let i = iPath + 1;
  while (i < linhas.length && !/^ {2}\//.test(linhas[i]) && linhas[i] !== `    ${metodo.toLowerCase()}:`) i++;
  if (i >= linhas.length || /^ {2}\//.test(linhas[i])) return null; // método inexistente
  const codigos = [];
  for (i++; i < linhas.length && !/^ {2}\//.test(linhas[i]) && !/^ {4}(get|post|put|patch|delete):/.test(linhas[i]); i++) {
    const m = linhas[i].match(/^\s+'(\d{3})':/);
    if (m) codigos.push(Number(m[1]));
  }
  return codigos;
}

// Marcas de conteúdo protegido da Marina: se aparecerem na resposta a quem não pode ver, é vazamento.
const PROTEGIDO = [
  'Resenha de demonstração da Marina',
  'Favoritos de novembro (demo)',
  'Caderno de Viagem da Marina',
  'Frase de demonstração guardada pela Marina',
  e.marinaLeituraAndamento,
  e.marinaLeituraConcluida,
  e.listaMarina,
  e.livroPessoalMarina,
].filter(Boolean);

const marina = await new Sessao('marina').login();
const caio = await new Sessao('caio').login();
const bia = await new Sessao('bia').login();
const sessoes = { bia, caio, marina, 'sem token': null };

const registros = [];
// tipo: 'negado' (status ∈ 403/404 do contrato e nenhum conteúdo protegido), 'permitido' (2xx),
// 'sem-token' (401), 'livre' (registra e avalia por função própria).
async function tentar(cenario, papel, servico, metodo, caminhoContrato, caminhoReal, tipo, { corpo, avaliar } = {}) {
  const s = sessoes[papel];
  const url = `${URLS[servico]}${caminhoReal}`;
  const r = s ? await s.chamar(metodo, url, corpo) : await req(metodo, url, { corpo });
  const declarados = codigosDeclarados(servico, caminhoContrato, metodo);
  const negacaoContrato = declarados ? declarados.filter((c) => c === 403 || c === 404) : [];
  const contemProtegido = PROTEGIDO.some((m) => r.texto.includes(m));
  let esperado, passou;
  if (tipo === 'negado') {
    esperado = negacaoContrato.length ? negacaoContrato : [403, 404];
    passou = esperado.includes(r.status) && !contemProtegido;
  } else if (tipo === 'sem-token') {
    esperado = [401];
    passou = r.status === 401 && !contemProtegido;
  } else if (tipo === 'permitido') {
    esperado = [200, 201];
    passou = esperado.includes(r.status);
  } else {
    esperado = 'ver avaliação';
    passou = avaliar(r);
  }
  if (avaliar && tipo !== 'livre') passou = passou && avaliar(r);
  const item = {
    cenario, papel, metodo, rota: `${servico} ${caminhoReal}`, rotaContrato: `${metodo} ${caminhoContrato}`,
    codigosDeclaradosNoContrato: declarados, tipo, esperado, status: r.status, passou,
    contemConteudoProtegido: contemProtegido, correlationId: r.correlationId, ms: r.ms,
    trecho: r.texto.slice(0, 240),
  };
  registros.push(item);
  console.log(`${passou ? 'OK ' : 'FALHA'} c${cenario} ${papel.padEnd(9)} ${metodo} ${servico}${caminhoReal} -> ${r.status}`);
  return r;
}

const mId = e.marinaId;
const um = CONTAS.marina.username;

// ---------- Cenário 1: perfil privado ----------
for (const papel of ['bia', 'caio', 'sem token']) {
  const tipo = papel === 'bia' ? 'negado' : papel === 'caio' ? 'permitido' : 'sem-token';
  await tentar(1, papel, 'leitura', 'GET', '/perfis/{usuarioId}/estante', `/perfis/${mId}/estante`, tipo,
    papel === 'caio' ? { avaliar: (r) => (r.json?.itens?.length ?? 0) > 0 } : {});
  await tentar(1, papel, 'leitura', 'GET', '/perfis/{usuarioId}/resenhas', `/perfis/${mId}/resenhas`, tipo,
    papel === 'caio' ? { avaliar: (r) => r.texto.includes('Resenha de demonstração da Marina') } : {});
  await tentar(1, papel, 'leitura', 'GET', '/perfis/{usuarioId}/estatisticas', `/perfis/${mId}/estatisticas`, tipo);
  await tentar(1, papel, 'social', 'GET', '/perfis/{usuarioId}/listas', `/perfis/${mId}/listas`, tipo,
    papel === 'caio' ? { avaliar: (r) => r.texto.includes(e.listaMarina) } : {});
  await tentar(1, papel, 'social', 'GET', '/listas/{listaId}', `/listas/${e.listaMarina}`, tipo);
  await tentar(1, papel, 'social', 'GET', '/listas/{listaId}/livros', `/listas/${e.listaMarina}/livros`, tipo);
  if (e.atividadeMarina) {
    await tentar(1, papel, 'social', 'GET', '/atividades/{atividadeId}', `/atividades/${e.atividadeMarina}`, tipo);
  }
}
// Feed da Bia: não pode trazer atividade da Marina
await tentar(1, 'bia', 'social', 'GET', '/feed', '/feed?page=0&size=50', 'livre', {
  avaliar: (r) => r.status === 200 && !(r.json?.itens ?? []).some((a) => a.autor?.id === mId),
});
// Perfil e busca por username: encontram a Marina, mas sem conteúdo (conteudoRestrito: true)
await tentar(1, 'bia', 'identidade', 'GET', '/perfis/{username}', `/perfis/${um}`, 'livre', {
  avaliar: (r) => r.status === 200 && r.json?.conteudoRestrito === true && !PROTEGIDO.some((m) => r.texto.includes(m)),
});
await tentar(1, 'caio', 'identidade', 'GET', '/perfis/{username}', `/perfis/${um}`, 'livre', {
  avaliar: (r) => r.status === 200 && r.json?.conteudoRestrito === false,
});
await tentar(1, 'bia', 'identidade', 'GET', '/perfis', `/perfis?username=${um}`, 'livre', {
  avaliar: (r) => r.status === 200 && Array.isArray(r.json) && r.json.length === 1 && r.json[0].conteudoRestrito === true,
});
// Lista de seguidores de terceiro: a v0.2.1 não tem rota de leitura (só DELETE /seguidores/{username}, do próprio usuário)
await tentar(1, 'bia', 'identidade', 'GET', '/seguidores/{username}', `/seguidores/${um}`, 'livre', {
  avaliar: (r) => r.status >= 400 && !r.texto.includes(CONTAS.caio.username),
});
// Resenhas do livro oficial resenhado pelos dois: a da Marina não aparece para a Bia; aparece para o Caio
const rotaRes = `/livros/${L[1].id}/resenhas`;
await tentar(1, 'bia', 'acervo', 'GET', '/livros/{id}/resenhas', rotaRes, 'livre', {
  avaliar: (r) => r.status === 200 && !r.texto.includes('Resenha de demonstração da Marina') && r.texto.includes('Resenha de demonstração do Caio'),
});
await tentar(1, 'caio', 'acervo', 'GET', '/livros/{id}/resenhas', rotaRes, 'livre', {
  avaliar: (r) => r.status === 200 && r.texto.includes('Resenha de demonstração da Marina'),
});

// ---------- Cenário 2: IDOR e livro pessoal ----------
const lpc = e.livroPessoalCaio;
const lpm = e.livroPessoalMarina;
const P = '/livros/pessoal/{id}';
await tentar(2, 'bia', 'acervo', 'GET', P, `/livros/pessoal/${lpc}`, 'negado');
await tentar(2, 'bia', 'acervo', 'GET', P, `/livros/pessoal/${lpc}?via=lista&referenciaId=${e.listaCaio}`, 'permitido', {
  avaliar: (r) => r.json?.id === lpc,
});
await tentar(2, 'bia', 'acervo', 'GET', P, `/livros/pessoal/${lpc}?via=lista&referenciaId=${e.listaCaioSemLivro}`, 'negado');
await tentar(2, 'bia', 'acervo', 'GET', P, `/livros/pessoal/${lpc}?via=feed&referenciaId=${e.atividadeMarina ?? crypto.randomUUID()}`, 'negado');
await tentar(2, 'bia', 'acervo', 'GET', P, `/livros/pessoal/${lpc}?via=feed&referenciaId=${crypto.randomUUID()}`, 'negado');
await tentar(2, 'bia', 'acervo', 'GET', P, `/livros/pessoal/${lpm}?via=lista&referenciaId=${e.listaMarina}`, 'negado');
await tentar(2, 'caio', 'acervo', 'GET', P, `/livros/pessoal/${lpm}?via=lista&referenciaId=${e.listaMarina}`, 'permitido', {
  avaliar: (r) => r.json?.id === lpm,
});
await tentar(2, 'bia', 'leitura', 'POST', '/estante', '/estante', 'negado', { corpo: { livroId: lpc } });
await tentar(2, 'bia', 'leitura', 'PUT', '/livros/{livroId}/favorito', `/livros/${lpc}/favorito`, 'negado');
await tentar(2, 'bia', 'leitura', 'POST', '/leituras', '/leituras', 'negado', { corpo: { livroId: lpc } });
await tentar(2, 'bia', 'acervo', 'GET', '/livros', `/livros?q=${encodeURIComponent('Memórias do Sítio Azul')}&limit=50`, 'livre', {
  avaliar: (r) => r.status === 200 && !r.texto.includes(lpc),
});
// IDOR em recursos da Marina
await tentar(2, 'bia', 'leitura', 'GET', '/leituras/{leituraId}', `/leituras/${e.marinaLeituraAndamento}`, 'negado');
await tentar(2, 'bia', 'leitura', 'POST', '/leituras/{leituraId}/progresso', `/leituras/${e.marinaLeituraAndamento}/progresso`, 'negado', {
  corpo: { pagina: 99, minutos: 1, registradoEmDispositivo: new Date().toISOString(), fusoHorarioDispositivo: 'America/Sao_Paulo' },
});
const progMarina = (await marina.chamar('GET', `${URLS.leitura}/leituras/${e.marinaLeituraAndamento}/progresso`)).json;
const ultimoProg = progMarina?.itens?.[0]?.id;
await tentar(2, 'bia', 'leitura', 'DELETE', '/progresso/{progressoId}', `/progresso/${ultimoProg}`, 'negado', {
  corpo: { ultimoProgressoIdConfirmado: ultimoProg },
});
await tentar(2, 'bia', 'social', 'PATCH', '/listas/{listaId}', `/listas/${e.listaMarina}`, 'negado', { corpo: { titulo: 'alterado pela Bia' } });

// Conferência pelo dono: nada mudou
const depoisProg = (await marina.chamar('GET', `${URLS.leitura}/leituras/${e.marinaLeituraAndamento}/progresso`)).json;
const depoisLista = (await marina.chamar('GET', `${URLS.social}/listas/${e.listaMarina}`)).json;
const conferencia = {
  progressosAntes: progMarina?.itens?.length ?? null,
  progressosDepois: depoisProg?.itens?.length ?? null,
  ultimoProgressoAntes: ultimoProg ?? null,
  ultimoProgressoDepois: depoisProg?.itens?.[0]?.id ?? null,
  tituloListaDepois: depoisLista?.titulo ?? null,
};
conferencia.nadaMudou = conferencia.progressosAntes === conferencia.progressosDepois
  && conferencia.ultimoProgressoAntes === conferencia.ultimoProgressoDepois
  && conferencia.tituloListaDepois === 'Favoritos de novembro (demo)';
console.log('conferência do dono:', JSON.stringify(conferencia));

const meta = { medidoEm: new Date().toISOString(), ambiente: 'DES (Render/Neon/CloudAMQP Oregon)', contrato: CONTRATO_REF };
for (const c of [1, 2]) {
  const regs = registros.filter((r) => r.cenario === c);
  const naoAut = regs.filter((r) => r.tipo === 'negado' || r.tipo === 'sem-token');
  const resumo = {
    tentativasNaoAutorizadas: naoAut.length,
    negadas: naoAut.filter((r) => r.passou).length,
    vazamentos: regs.filter((r) => r.contemConteudoProtegido && r.papel !== 'caio' && r.papel !== 'marina').length,
    controlesEVerificacoes: regs.length - naoAut.length,
    controlesEVerificacoesOk: regs.filter((r) => r.tipo !== 'negado' && r.tipo !== 'sem-token' && r.passou).length,
  };
  gravar(`cenario-${c}-acessos.json`, { ...meta, resumo, ...(c === 2 ? { conferenciaDoDono: conferencia } : {}), registros: regs });
  const linhas = regs.map((r) => `${r.passou ? 'ok   ' : 'FALHA'} | ${r.papel.padEnd(9)} | ${r.tipo.padEnd(9)} | ${String(r.status).padEnd(3)} | esperado ${Array.isArray(r.esperado) ? r.esperado.join('/') : r.esperado} | ${r.metodo} ${r.rota}`);
  gravar(`cenario-${c}-resumo.txt`, [
    `Cenário ${c} - ${meta.ambiente}, ${meta.medidoEm}. Códigos de negação conforme docs/api na ${CONTRATO_REF}.`,
    `Tentativas não autorizadas: ${resumo.tentativasNaoAutorizadas}; negadas: ${resumo.negadas}; vazamentos: ${resumo.vazamentos}.`,
    `Controles positivos e verificações de conteúdo: ${resumo.controlesEVerificacoesOk}/${resumo.controlesEVerificacoes} ok.`,
    ...(c === 2 ? [`Conferência do dono depois das tentativas: ${JSON.stringify(conferencia)}`] : []),
    '',
    ...linhas,
    '',
  ].join('\n'));
  console.log(`cenário ${c}:`, JSON.stringify(resumo));
}
