// Cenário 5.5: broker fora durante uma escrita que gera evento (outbox, RNF-ERR-10). Só LOCAL (Docker).
// Mesmo ambiente do cenario-5-mensageria.mjs. Para o container atam-rabbit, faz um "seguir" no identidade
// local (grava seguidor.novo na outbox na transação do fato), confere a resposta e a outbox pendente,
// religa o broker e mede quando a linha passa a publicada.
import { execSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { req, gravar, sleep } from './comum.mjs';

const ID = process.env.ATAM_IDENTIDADE ?? 'http://localhost:18081';
if (!['localhost', '127.0.0.1'].includes(new URL(ID).hostname)) throw new Error(`só local: ${ID}`);
const psql = (sql) => execSync(`docker exec atam-pg psql -U postgres -d leai_atam -At -F " | " -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
const agora = () => new Date().toISOString();
const sufixo = randomBytes(3).toString('hex');
const senha = 'Atam' + randomBytes(12).toString('base64url') + '7!';

async function cadastrar(nome) {
  const r = await req('POST', `${ID}/auth/register`, {
    corpo: { email: `${nome}.${sufixo}@atam.invalid`, username: `${nome}_${sufixo}`, displayName: nome, dataNascimento: '1995-01-01', senha },
    headers: { 'Idempotency-Key': randomUUID() },
  });
  if (r.status !== 201) throw new Error(`cadastro ${nome}: ${r.status} ${r.texto}`);
  return r.json;
}
const a = await cadastrar('leitora');
const b = await cadastrar('autor');
const login = await req('POST', `${ID}/auth/login`, { corpo: { identificador: a.username, senha }, headers: { 'Idempotency-Key': randomUUID() } });
const token = login.json.accessToken;

const linhas = [`Cenário 5.5 - broker fora durante uma escrita, local (Docker), ${agora()}`];
execSync('docker stop atam-rabbit');
linhas.push(`${agora()} docker stop atam-rabbit`);
await sleep(2000);
const seguir = await req('POST', `${ID}/perfis/${b.username}/seguir`, { token, headers: { 'Idempotency-Key': randomUUID() } });
linhas.push(`${seguir.iniciadoEm} POST /perfis/{username}/seguir com o broker parado -> HTTP ${seguir.status} em ${seguir.ms} ms, corpo ${seguir.texto}`);
const sel = "select event_id, tipo, status, criado_em, publicado_em from identidade.outbox_identidade where tipo = 'seguidor.novo' order by criado_em desc limit 1";
await sleep(3000);
linhas.push(`${agora()} outbox com o broker parado: ${psql(sel)}`);
linhas.push(`${agora()} seguimento gravado: ${psql(`select count(*) from identidade.seguidor s join identidade.usuario u on u.id = s.seguidor_id where u.username = '${a.username}'`)} linha(s)`);
execSync('docker start atam-rabbit');
const religado = Date.now();
linhas.push(`${agora()} docker start atam-rabbit`);
let estado = '';
for (let i = 0; i < 240; i++) {
  estado = psql(sel);
  if (estado.includes('publicado')) break;
  await sleep(500);
}
linhas.push(`${agora()} outbox depois da volta do broker: ${estado}`);
linhas.push(`Tempo do docker start até a linha publicada (polling de 500 ms, inclui a subida do RabbitMQ e a reconexão): ~${Math.round((Date.now() - religado) / 1000)} s`);
linhas.push('');
gravar('cenario-5-broker-fora.txt', linhas.join('\n'));
console.log(linhas.join('\n'));
