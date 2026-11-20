// Cenário 4b, parte de API (RNF-ERR-04): o mesmo registro de progresso enviado duas vezes com a mesma
// Idempotency-Key, como faz o reenvio da fila offline do app, gera um registro só. Escrita normal da Marina no DES.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { URLS, gravar, ARQUIVO_ESTADO } from './comum.mjs';
import { Sessao } from './sessao.mjs';

const e = JSON.parse(readFileSync(ARQUIVO_ESTADO, 'utf8'));
const marina = await new Sessao('marina').login();
const url = `${URLS.leitura}/leituras/${e.marinaLeituraAndamento}/progresso`;
const listar = async () => (await marina.chamar('GET', `${url}?page=1&limite=50`)).json;

const antes = await listar();
const paginaAtual = antes?.resumo?.paginaAtual ?? Math.max(0, ...(antes?.itens ?? []).map((p) => p.pagina ?? 0));
const chave = randomUUID();
const corpo = { pagina: paginaAtual + 5, minutos: 10, registradoEmDispositivo: new Date().toISOString(), fusoHorarioDispositivo: 'America/Sao_Paulo' };
const r1 = await marina.chamar('POST', url, corpo, { 'Idempotency-Key': chave });
const r2 = await marina.chamar('POST', url, corpo, { 'Idempotency-Key': chave });
const depois = await listar();
const id = (r) => r.json?.progresso?.id ?? r.json?.id ?? null;
const resultado = {
  medidoEm: new Date().toISOString(),
  ambiente: 'DES (Render/Neon Oregon), v0.2.1',
  rota: 'POST /leituras/{leituraId}/progresso',
  leituraId: e.marinaLeituraAndamento,
  pagina: corpo.pagina,
  primeiro: { status: r1.status, progressoId: id(r1), correlationId: r1.correlationId, ms: r1.ms },
  repeticaoComAMesmaChave: { status: r2.status, progressoId: id(r2), correlationId: r2.correlationId, ms: r2.ms },
  mesmaResposta: r1.status === r2.status && r1.texto === r2.texto,
  registrosAntes: antes?.itens?.length ?? null,
  registrosDepois: depois?.itens?.length ?? null,
  registrosComAPagina: (depois?.itens ?? []).filter((p) => p.pagina === corpo.pagina).length,
};
resultado.passou = resultado.mesmaResposta && resultado.registrosDepois === resultado.registrosAntes + 1 && resultado.registrosComAPagina === 1;
gravar('cenario-4-idempotencia.json', resultado);
console.log(JSON.stringify(resultado, null, 2));
