import fs from 'node:fs'; import crypto from 'node:crypto';
import { req, ARQ_SENHAS, lerEnv, AMB } from './api.mjs';
if (AMB !== 'dev') throw new Error('só dev');
const contas = { marina: ['Marina Demo', '1994-05-10'], caio: ['Caio Demo', '1990-08-21'], bia: ['Bia Demo', '1997-02-03'] };
const env = lerEnv(ARQ_SENHAS);
for (const [c, [nome, nasc]] of Object.entries(contas)) {
  const k = `LEAI_DEMO_${c.toUpperCase()}_SENHA`;
  if (!env[k]) env[k] = crypto.randomBytes(15).toString('base64url') + 'a9';
  const r = await req('identidade', 'POST', '/auth/register', { corpo: { email: `${c}@demo.leai.invalid`, username: `leai.demo.${c}`, displayName: nome, dataNascimento: nasc, senha: env[k] } });
  console.log(c, r.status, r.status >= 300 ? JSON.stringify(r.json).slice(0, 200) : '');
}
fs.writeFileSync(ARQ_SENHAS, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
