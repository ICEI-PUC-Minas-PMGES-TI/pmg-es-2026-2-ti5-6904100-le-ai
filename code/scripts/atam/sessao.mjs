// Sessões das contas de demonstração: um login por conta por execução, renovação por /auth/refresh.
import { randomUUID } from 'node:crypto';
import { URLS, req, lerContas } from './comum.mjs';

export const CONTAS = {
  marina: { username: 'leai.demo.marina', email: 'marina@demo.leai.invalid', displayName: 'Marina Demo', chave: 'LEAI_DEMO_MARINA_SENHA' },
  caio: { username: 'leai.demo.caio', email: 'caio@demo.leai.invalid', displayName: 'Caio Demo', chave: 'LEAI_DEMO_CAIO_SENHA' },
  bia: { username: 'leai.demo.bia', email: 'bia@demo.leai.invalid', displayName: 'Bia Demo', chave: 'LEAI_DEMO_BIA_SENHA' },
};

export class Sessao {
  constructor(nome) {
    this.nome = nome;
    this.conta = CONTAS[nome];
  }

  async login() {
    const senha = lerContas()[this.conta.chave];
    if (!senha) throw new Error(`Senha de ${this.nome} ausente no arquivo de contas`);
    const r = await req('POST', `${URLS.identidade}/auth/login`, {
      corpo: { identificador: this.conta.username, senha },
      headers: { 'Idempotency-Key': randomUUID() },
    });
    if (r.status !== 200) throw new Error(`login de ${this.nome}: ${r.status} ${r.texto.slice(0, 200)}`);
    this.token = r.json.accessToken;
    this.refresh = r.json.refreshToken;
    this.id = JSON.parse(Buffer.from(this.token.split('.')[1], 'base64url')).sub;
    return this;
  }

  async renovar() {
    const r = await req('POST', `${URLS.identidade}/auth/refresh`, {
      corpo: { refreshToken: this.refresh },
      headers: { 'Idempotency-Key': randomUUID() },
    });
    if (r.status !== 200) throw new Error(`refresh de ${this.nome}: ${r.status}`);
    this.token = r.json.accessToken;
    this.refresh = r.json.refreshToken;
  }

  // Chamada autenticada; métodos de escrita levam Idempotency-Key nova, salvo se informada.
  async chamar(metodo, url, corpo, headers = {}) {
    const h = { ...headers };
    if (metodo !== 'GET' && !h['Idempotency-Key']) h['Idempotency-Key'] = randomUUID();
    let r = await req(metodo, url, { token: this.token, corpo, headers: h });
    if (r.status === 401 && this.refresh) {
      await this.renovar();
      r = await req(metodo, url, { token: this.token, corpo, headers: h });
    }
    return r;
  }
}
