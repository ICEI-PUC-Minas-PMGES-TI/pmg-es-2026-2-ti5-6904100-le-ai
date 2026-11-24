// Cenário 6: spec OpenAPI exposto em runtime (DES) x YAML de docs/api/ no commit da versão em DES.
// Compara, por serviço, o conjunto de operações implementadas (método + caminho), o operationId
// e os códigos de status declarados. O YAML é lido por linhas (formato fixo do repositório, sem dependência).
import { execSync } from 'node:child_process';
import { URLS, req, gravar } from './comum.mjs';

const REF = process.env.LEAI_CONTRATO_REF ?? 'f1f5c7e';
const RUNTIME = {
  identidade: '/v3/api-docs',
  social: '/v3/api-docs',
  acervo: '/docs-json',
  leitura: '/docs-json',
};
const METODOS = ['get', 'post', 'put', 'patch', 'delete'];

function operacoesDoYaml(servico) {
  const linhas = execSync(`git show ${REF}:docs/api/${servico}.yaml`, { encoding: 'utf8' }).split(/\r?\n/);
  const ops = new Map();
  let emPaths = false, caminho = null, atual = null;
  for (const l of linhas) {
    if (/^paths:/.test(l)) { emPaths = true; continue; }
    if (emPaths && /^\S/.test(l)) { emPaths = false; continue; }
    if (!emPaths) continue;
    let m;
    if ((m = l.match(/^ {2}(\/\S*):\s*$/))) { caminho = m[1]; atual = null; continue; }
    if ((m = l.match(/^ {4}(get|post|put|patch|delete):\s*$/))) {
      atual = { metodo: m[1].toUpperCase(), caminho, operationId: null, implementado: false, status: [] };
      ops.set(`${atual.metodo} ${caminho}`, atual);
      continue;
    }
    if (!atual) continue;
    if ((m = l.match(/^ {6}operationId:\s*(\S+)/))) atual.operationId = m[1];
    if (/^ {6}x-(implementation|contract)-status:\s*implemented\b/.test(l)) atual.implementado = true;
    if ((m = l.match(/^ {8}'(\d{3})':/))) atual.status.push(m[1]);
  }
  return [...ops.values()];
}

function operacoesDoRuntime(spec) {
  const ops = [];
  for (const [caminho, item] of Object.entries(spec.paths ?? {})) {
    for (const metodo of METODOS) {
      const op = item[metodo];
      if (op) ops.push({ metodo: metodo.toUpperCase(), caminho, operationId: op.operationId ?? null, status: Object.keys(op.responses ?? {}) });
    }
  }
  return ops;
}

const saida = [`Cenário 6 - spec em runtime (DES, ${new Date().toISOString()}) x docs/api/*.yaml na ${REF}.`,
  'Comparação por (método, caminho) das operações marcadas implemented no YAML; depois operationId e códigos de status.',
  'status diferente = conjunto de códigos declarados difere; código de sucesso diferente = o 2xx declarado difere.', ''];
const totais = {};
for (const [servico, rota] of Object.entries(RUNTIME)) {
  const r = await req('GET', `${URLS[servico]}${rota}`);
  if (r.status !== 200 || !r.json) {
    saida.push(`== ${servico}: GET ${rota} -> ${r.status}; sem spec em runtime.`, '');
    totais[servico] = { runtime: null };
    continue;
  }
  gravar(`cenario-6-runtime-${servico}.json`, r.json);
  const yaml = operacoesDoYaml(servico);
  const impl = yaml.filter((o) => o.implementado);
  const run = operacoesDoRuntime(r.json);
  const runMap = new Map(run.map((o) => [`${o.metodo} ${o.caminho}`, o]));
  const yamlMap = new Map(yaml.map((o) => [`${o.metodo} ${o.caminho}`, o]));
  const faltaNoRuntime = impl.filter((o) => !runMap.has(`${o.metodo} ${o.caminho}`));
  const sobraNoRuntime = run.filter((o) => !yamlMap.has(`${o.metodo} ${o.caminho}`));
  const naoImplNoYamlMasNoRuntime = run.filter((o) => yamlMap.has(`${o.metodo} ${o.caminho}`) && !yamlMap.get(`${o.metodo} ${o.caminho}`).implementado);
  const opIdDiferente = [], statusDiferente = [], sucessoDiferente = [];
  for (const o of impl) {
    const rt = runMap.get(`${o.metodo} ${o.caminho}`);
    if (!rt) continue;
    if (rt.operationId !== o.operationId) opIdDiferente.push(`${o.metodo} ${o.caminho}: yaml=${o.operationId} runtime=${rt.operationId}`);
    const sy = new Set(o.status), sr = new Set(rt.status);
    const soYaml = [...sy].filter((s) => !sr.has(s)), soRun = [...sr].filter((s) => !sy.has(s));
    const sucessoY = [...sy].filter((s) => s.startsWith('2')).sort().join(',');
    const sucessoR = [...sr].filter((s) => s.startsWith('2')).sort().join(',');
    if (sucessoY !== sucessoR) sucessoDiferente.push(`${o.metodo} ${o.caminho}: yaml [${sucessoY}] runtime [${sucessoR}]`);
    if (soYaml.length || soRun.length) statusDiferente.push(`${o.metodo} ${o.caminho}: só no yaml [${soYaml.join(', ')}] só no runtime [${soRun.join(', ')}]`);
  }
  totais[servico] = {
    runtime: run.length, yaml: yaml.length, yamlImplementadas: impl.length,
    implementadasPresentesNoRuntime: impl.length - faltaNoRuntime.length,
    faltaNoRuntime: faltaNoRuntime.length, sobraNoRuntime: sobraNoRuntime.length,
    operationIdDiferente: opIdDiferente.length, statusDiferente: statusDiferente.length,
    codigoDeSucessoDiferente: sucessoDiferente.length,
    statusDiferenteSoPorErrosOmitidosNoRuntime: statusDiferente.length - sucessoDiferente.length,
  };
  saida.push(`== ${servico} (GET ${rota}): ${JSON.stringify(totais[servico])}`);
  for (const o of faltaNoRuntime) saida.push(`  implementada no YAML, ausente no runtime: ${o.metodo} ${o.caminho}`);
  for (const o of sobraNoRuntime) saida.push(`  no runtime, ausente do YAML: ${o.metodo} ${o.caminho}`);
  for (const o of naoImplNoYamlMasNoRuntime) saida.push(`  no runtime, mas não marcada implemented no YAML: ${o.metodo} ${o.caminho}`);
  for (const s of sucessoDiferente) saida.push(`  código de sucesso diferente: ${s}`);
  for (const s of opIdDiferente) saida.push(`  operationId diferente: ${s}`);
  for (const s of statusDiferente) saida.push(`  status diferente: ${s}`);
  saida.push('');
}
gravar('cenario-6-diferencas.txt', saida.join('\n'));
console.log(saida.slice(0, 3).join('\n'));
console.log(JSON.stringify(totais, null, 2));
