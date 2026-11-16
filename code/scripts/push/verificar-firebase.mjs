#!/usr/bin/env node
// Confere, antes de qualquer deploy, se as duas credenciais do Firebase (app Android e
// conta de serviço do social) pertencem ao mesmo projeto e ao applicationId do app.
// Sem dependências: node >= 18.
//
// Uso:
//   node code/scripts/push/verificar-firebase.mjs <google-services.json> <conta-de-servico.json>
//   ... --env      imprime a linha FIREBASE_CREDENTIALS_JSON pronta para o .env do social
//   ... --render   imprime o JSON em uma linha, para colar no segredo do Render/GitHub

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const GRADLE = resolve(RAIZ, 'mobile/android/app/build.gradle.kts');
const CAMPOS_DA_CONTA = ['type', 'project_id', 'private_key', 'client_email'];

function falhar(mensagem) {
  console.error(`✗ ${mensagem}`);
  process.exit(1);
}

function lerJson(caminho, rotulo) {
  try {
    return JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    return falhar(`${rotulo} (${caminho}): ${erro.message}`);
  }
}

const argumentos = process.argv.slice(2);
const opcoes = argumentos.filter((a) => a.startsWith('--'));
const [caminhoServicos, caminhoConta] = argumentos.filter((a) => !a.startsWith('--'));
if (!caminhoServicos || !caminhoConta) {
  falhar('uso: verificar-firebase.mjs <google-services.json> <conta-de-servico.json> [--env|--render]');
}

const applicationId = /applicationId\s*=\s*"([^"]+)"/.exec(readFileSync(GRADLE, 'utf8'))?.[1];
if (!applicationId) falhar(`applicationId não encontrado em ${GRADLE}`);

const servicos = lerJson(caminhoServicos, 'google-services.json');
const conta = lerJson(caminhoConta, 'conta de serviço');

const pacotes = (servicos.client ?? []).map((c) => c.client_info?.android_client_info?.package_name);
const projetoDoApp = servicos.project_info?.project_id;
const faltando = CAMPOS_DA_CONTA.filter((campo) => !conta[campo]);

if (!pacotes.includes(applicationId)) {
  falhar(`google-services.json registra ${pacotes.join(', ') || 'nenhum app'}; o applicationId é ${applicationId}`);
}
if (faltando.length > 0) falhar(`conta de serviço sem os campos: ${faltando.join(', ')}`);
if (conta.type !== 'service_account') falhar(`conta de serviço com type "${conta.type}"`);
if (!conta.private_key.includes('BEGIN PRIVATE KEY')) falhar('private_key não parece uma chave PEM');
if (projetoDoApp !== conta.project_id) {
  falhar(`projetos diferentes: app em "${projetoDoApp}", conta de serviço em "${conta.project_id}"`);
}

const umaLinha = JSON.stringify(conta);
if (opcoes.includes('--env')) {
  // O .env do social é lido como .properties: a barra invertida precisa ser dobrada.
  console.log(`FIREBASE_CREDENTIALS_JSON=${umaLinha.replaceAll('\\', '\\\\')}`);
} else if (opcoes.includes('--render')) {
  console.log(umaLinha);
} else {
  console.log(`✓ projeto ${conta.project_id}, applicationId ${applicationId}, conta ${conta.client_email}`);
}
