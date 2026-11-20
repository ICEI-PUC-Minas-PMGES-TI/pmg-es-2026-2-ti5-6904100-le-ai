// Gera o HTML estático dos quatro contratos OpenAPI de docs/api/ (E6-05).
//
//   node code/scripts/openapi-html/gerar.mjs
//
// Saída: docs/api/html/<servico>.html (um arquivo por serviço, autossuficiente,
// abre com duplo clique e sem rede) e docs/api/html/index.html com os links.
// Ferramenta: Redoc via @redocly/cli build-docs, versão fixa no package.json e
// no package-lock.json desta pasta. Na primeira vez, instala com `npm ci`.
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVICOS = ['identidade', 'acervo', 'leitura', 'social'];

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, '..', '..', '..');
const specs = join(raiz, 'docs', 'api');
const saida = join(specs, 'html');

const versao = JSON.parse(readFileSync(join(aqui, 'package.json'), 'utf8')).devDependencies['@redocly/cli'];
const cli = join(aqui, 'node_modules', '@redocly', 'cli', 'bin', 'cli.js');

function instalada() {
  const pkg = join(aqui, 'node_modules', '@redocly', 'cli', 'package.json');
  return existsSync(cli) && existsSync(pkg) && JSON.parse(readFileSync(pkg, 'utf8')).version === versao;
}

if (!instalada()) {
  console.log(`Instalando @redocly/cli ${versao} (npm ci)...`);
  execSync('npm ci --no-audit --no-fund', { cwd: aqui, stdio: 'inherit' });
}

// Template com CSP: tudo o que o Redoc precisa já vem embutido (--inlineBundle).
// A CSP impede qualquer requisição externa, inclusive a do logo "API docs by" do
// rodapé, que o Redoc busca no CDN da Redocly. O template fica aqui, e não num
// .hbs versionado, para não variar com a conversão de fim de linha do Git.
const template = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; worker-src blob:">
  <title>{{title}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body { padding: 0; margin: 0; }</style>
  {{{redocHead}}}
</head>
<body>
  {{{redocHTML}}}
</body>
</html>
`;

const temp = mkdtempSync(join(tmpdir(), 'leai-openapi-html-'));
const arquivoTemplate = join(temp, 'template.hbs');
writeFileSync(arquivoTemplate, template);
mkdirSync(saida, { recursive: true });

const titulos = {};
try {
  for (const servico of SERVICOS) {
    const yaml = join(specs, `${servico}.yaml`);
    titulos[servico] = /^\s{2}title:\s*(.+)$/m.exec(readFileSync(yaml, 'utf8'))?.[1].trim() ?? servico;
    execFileSync(
      process.execPath,
      [
        cli,
        'build-docs',
        yaml,
        '--inlineBundle',
        '--openapi.showExtensions=true',
        '--template',
        arquivoTemplate,
        '--output',
        join(saida, `${servico}.html`),
      ],
      { stdio: 'inherit', env: { ...process.env, REDOCLY_TELEMETRY: 'off' } },
    );
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

const itens = SERVICOS.map(
  (s) => `      <li><a href="${s}.html">${titulos[s]}</a> <span>(<code>docs/api/${s}.yaml</code>)</span></li>`,
).join('\n');

writeFileSync(
  join(saida, 'index.html'),
  `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lê Ai - contratos HTTP</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 44rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #1f2328; background: #fff; }
    li { margin: .4rem 0; }
    span, p.nota { color: #59636e; }
  </style>
</head>
<body>
  <main>
    <h1>Lê Ai - contratos HTTP</h1>
    <p>Um contrato OpenAPI 3.0.3 por serviço. Cada página abre sem servidor e sem internet.
      O estado de cada operação aparece logo abaixo do título dela
      (<code>implementation-status</code> ou <code>contract-status</code>).</p>
    <ul>
${itens}
    </ul>
    <p class="nota">Gerado de <code>docs/api/*.yaml</code> por <code>node code/scripts/openapi-html/gerar.mjs</code>,
      com Redoc (<code>@redocly/cli</code> ${versao}). Não edite estes arquivos à mão: altere o YAML e gere de novo.</p>
  </main>
</body>
</html>
`,
);

console.log(`HTML gerado em ${saida}`);
