import crypto from 'node:crypto';
import { lerEnv, req, login } from './api.mjs';
const segredo = lerEnv('C:/Users/Renato/Documents/Dev/GitHub/le-ai-e6-04/code/back/identidade/.env').JWT_SECRET;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export async function tokenAdmin() {
  const caio = (await login('caio')).accessToken;
  const perfil = await req('identidade', 'GET', '/perfis/admin', { token: caio });
  const sub = perfil.json.id;
  const agora = Math.floor(Date.now() / 1000);
  const corpo = b64({ iss: 'identidade', sub, iat: agora, exp: agora + 3600, username: 'admin', papel: 'admin' });
  const cab = b64({ alg: 'HS256' });
  const assin = crypto.createHmac('sha256', Buffer.from(segredo, 'utf8')).update(`${cab}.${corpo}`).digest('base64url');
  return { token: `${cab}.${corpo}.${assin}`, sub, displayName: perfil.json.displayName };
}
if (process.argv[2] === 'teste') {
  const { token, sub } = await tokenAdmin();
  const r = await req('social', 'GET', '/admin/denuncias', { token });
  console.log('admin', sub, r.status, JSON.stringify(r.json).slice(0, 1500));
}
