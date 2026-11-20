// Cenário 5: mensageria em ambiente LOCAL (Docker), nunca no DES.
// Pré-requisitos (ver README): containers atam-rabbit (RabbitMQ 4, AMQP 5673, gestão 15673) e atam-pg
// (Postgres 17, porta 55433, log_statement=all), identidade (18081, P0_PING_ENABLED=true) e acervo (18082)
// da v0.2.1 apontando para eles, e a fila atam.captura ligada a leai.events.identidade/ping.teste
// antes do boot do identidade, para guardar uma cópia do ping original.
// Uso: node cenario-5-mensageria.mjs <log do acervo>
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { gravar, sleep } from './comum.mjs';

const GESTAO = process.env.ATAM_RABBIT_GESTAO ?? 'http://localhost:15673';
const IDENTIDADE = process.env.ATAM_IDENTIDADE ?? 'http://localhost:18081';
const LOG_ACERVO = process.argv[2];
for (const u of [GESTAO, IDENTIDADE]) if (!['localhost', '127.0.0.1'].includes(new URL(u).hostname)) throw new Error(`só local: ${u}`);
if (!LOG_ACERVO) throw new Error('informe o caminho do log do acervo');

const AUTH = 'Basic ' + Buffer.from('guest:guest').toString('base64');
const agora = () => new Date().toISOString();
async function gestao(metodo, caminho, corpo) {
  const r = await fetch(`${GESTAO}/api${caminho}`, { method: metodo, headers: { Authorization: AUTH, 'content-type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const psql = (sql) => execSync(`docker exec atam-pg psql -U postgres -d leai_atam -At -F " | " -c "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
const fila = async (nome) => (await gestao('GET', `/queues/%2F/${encodeURIComponent(nome)}`))?.messages ?? 0;
const logAcervo = () => readFileSync(LOG_ACERVO, 'utf8').replace(/\x1b\[[0-9;]*m/g, '');
const linhasAcervo = (trecho) => logAcervo().split(/\r?\n/).filter((l) => l.includes(trecho));
async function publicar(envelope, props) {
  return gestao('POST', '/exchanges/%2F/leai.events.identidade/publish', {
    routing_key: 'ping.teste', payload: JSON.stringify(envelope), payload_encoding: 'string', properties: props,
  });
}
function propsDe(env) {
  return {
    message_id: env.eventId, correlation_id: env.correlationId, type: env.type, content_type: 'application/json', delivery_mode: 2,
    headers: { 'x-event-version': env.version, 'x-business-key': env.businessKey },
  };
}
async function esperar(cond, ms = 40000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { if (await cond()) return true; await sleep(250); }
  return false;
}

// 1. Ping original (Spring -> Nest), já consumido no boot: outbox, recibo e a cópia capturada
// A fila de captura também recebe as cópias publicadas nos passos seguintes; o ping original é o da
// linha mais recente de ping.teste na outbox do identidade (a do último boot).
const ultimoPing = psql("select event_id from identidade.outbox_identidade where tipo = 'ping.teste' order by criado_em desc limit 1");
const capturadas = (await gestao('POST', '/queues/%2F/atam.captura/get', { count: 500, ackmode: 'ack_requeue_false', encoding: 'auto' })) ?? [];
const copia = capturadas.find((m) => m.properties?.message_id === ultimoPing);
if (!copia) throw new Error(`ping ${ultimoPing} não está na fila atam.captura: suba o identidade com a fila já ligada`);
const original = JSON.parse(copia.payload);
const propsOriginais = copia.properties;
const r1 = [
  `Cenário 5.1 - ping.teste do identidade (Spring) ao acervo (NestJS), local (Docker), ${agora()}`,
  `Envelope publicado (cópia da fila atam.captura): ${JSON.stringify(original)}`,
  `Propriedades AMQP: ${JSON.stringify(propsOriginais)}`,
  `Outbox do identidade: ${psql(`select event_id, tipo, status, correlation_id, criado_em, publicado_em from identidade.outbox_identidade where event_id = '${original.eventId}'`)}`,
  `Recibo no acervo: ${psql(`select consumidor, event_id, processado_em from acervo.mensagem_processada where event_id = '${original.eventId}'`)}`,
  'Log do acervo com o mesmo correlationId:',
  ...linhasAcervo(original.correlationId),
  '',
];
gravar('cenario-5-ping.txt', r1.join('\n'));
console.log(r1.join('\n'));

// 2. eventId duplicado: republica o envelope idêntico, com as mesmas propriedades
const consumidasAntes = linhasAcervo(`consumida eventId=${original.eventId}`).length;
const pub2 = await publicar(original, propsDe(original));
await esperar(async () => linhasAcervo(`consumida eventId=${original.eventId}`).length > consumidasAntes, 15000);
const r2 = [
  `Cenário 5.2 - eventId duplicado, local (Docker), ${agora()}`,
  `Republicado o mesmo envelope (eventId ${original.eventId}): ${JSON.stringify(pub2)}`,
  `Entregas confirmadas (ack) pelo acervo para o eventId: ${linhasAcervo(`consumida eventId=${original.eventId}`).length}`,
  `Recibos em acervo.mensagem_processada para o eventId: ${psql(`select count(*) from acervo.mensagem_processada where event_id = '${original.eventId}'`)}`,
  `Mensagens na DLQ leai.p0.ping.dlq: ${await fila('leai.p0.ping.dlq')}`,
  'O handler só roda quando o INSERT do recibo devolve linha (ON CONFLICT DO NOTHING), na mesma transação: a segunda entrega é confirmada sem segundo efeito.',
  '',
];
gravar('cenario-5-duplicado.txt', r2.join('\n'));
console.log(r2.join('\n'));

// 3. Schema inválido: DLQ imediata, e a fila segue consumindo
const dlqAntes3 = await fila('leai.p0.ping.dlq');
const invalido = { ...original, eventId: randomUUID(), correlationId: randomUUID(), businessKey: `atam:${randomUUID()}`, occurredAt: agora(), data: { mensagem: 'pong' } };
await publicar(invalido, propsDe(invalido));
await esperar(async () => (await fila('leai.p0.ping.dlq')) > dlqAntes3, 20000);
const valido3 = { ...original, eventId: randomUUID(), correlationId: randomUUID(), businessKey: `atam:${randomUUID()}`, occurredAt: agora() };
await publicar(valido3, propsDe(valido3));
await esperar(async () => linhasAcervo(`consumida eventId=${valido3.eventId}`).length > 0, 15000);
const r3 = [
  `Cenário 5.3 - schema inválido, local (Docker), ${agora()}`,
  `Envelope inválido (data.mensagem = "pong", fora do ping.teste.v1): eventId ${invalido.eventId}`,
  `DLQ leai.p0.ping.dlq: ${dlqAntes3} -> ${await fila('leai.p0.ping.dlq')} (contagem da API de gestão, que se atualiza a cada ~5 s; o tempo até a DLQ não é medido aqui)`,
  `Recibos do inválido: ${psql(`select count(*) from acervo.mensagem_processada where event_id = '${invalido.eventId}'`)} (sem retentativa: nack sem requeue na validação)`,
  `Ping válido publicado em seguida (eventId ${valido3.eventId}): ${linhasAcervo(`consumida eventId=${valido3.eventId}`).join(' / ') || 'NÃO consumido'}`,
  '',
];
gravar('cenario-5-dlq-schema.txt', r3.join('\n'));
console.log(r3.join('\n'));

// 4. Falha técnica transitória: a tabela de recibos fica indisponível; retentativas em 1, 5 e 15 s e DLQ.
// Uma segunda mensagem publicada durante a espera mostra o custo do prefetch=1 (fila daquele consumidor parada).
const dlqAntes4 = await fila('leai.p0.ping.dlq');
const inicioLogPg = new Date(Date.now() - 1000).toISOString();
psql('ALTER TABLE acervo.mensagem_processada RENAME TO mensagem_processada_atam');
const a = { ...original, eventId: randomUUID(), correlationId: randomUUID(), businessKey: `atam:${randomUUID()}`, occurredAt: agora() };
const b = { ...original, eventId: randomUUID(), correlationId: randomUUID(), businessKey: `atam:${randomUUID()}`, occurredAt: agora() };
const tA = agora();
await publicar(a, propsDe(a));
await sleep(3000);
const tB = agora();
await publicar(b, propsDe(b));
await esperar(async () => linhasAcervo(`DLQ eventId=${a.eventId}`).length > 0, 40000);
psql('ALTER TABLE acervo.mensagem_processada_atam RENAME TO mensagem_processada');
const tRestaurada = agora();
await esperar(async () => linhasAcervo(`eventId=${b.eventId}`).length > 0, 40000);
await esperar(async () => (await fila('leai.p0.ping.dlq')) > dlqAntes4, 20000);
// Tentativas de A: cada erro do INSERT do recibo aparece no log do Postgres com o timestamp do servidor
const logPg = execSync(`docker logs --since ${inicioLogPg} atam-pg 2>&1`, { encoding: 'utf8', shell: 'bash' });
const erros = logPg.split(/\r?\n/).filter((l) => l.includes('ERROR') && l.includes('mensagem_processada'));
const ts = erros.map((l) => new Date(l.slice(0, 23).replace(' ', 'T') + 'Z').getTime());
const r4 = [
  `Cenário 5.4 - falha técnica transitória com retentativa e DLQ, local (Docker), ${agora()}`,
  'Falha provocada: ALTER TABLE acervo.mensagem_processada RENAME (o INSERT do recibo falha a cada tentativa); restaurada depois da DLQ.',
  `Mensagem A (eventId ${a.eventId}) publicada em ${tA}; mensagem B (eventId ${b.eventId}) publicada em ${tB}, durante a espera de A.`,
  `Erros do INSERT do recibo no log do Postgres (A e, depois da DLQ de A, B antes da restauração), ${erros.length} linha(s):`,
  ...erros.map((l) => `    ${l.slice(0, 160)}`),
  `Intervalos entre as tentativas de A (ms, relógio do Postgres): ${ts.slice(0, 4).map((t, i, arr) => (i ? t - arr[i - 1] : null)).filter((x) => x !== null).join(', ')}`,
  `Log do acervo para A: ${linhasAcervo(`eventId=${a.eventId}`).join(' / ')}`,
  `DLQ leai.p0.ping.dlq: ${dlqAntes4} -> ${await fila('leai.p0.ping.dlq')}`,
  `Tabela restaurada em ${tRestaurada}. Log do acervo para B: ${linhasAcervo(`eventId=${b.eventId}`).join(' / ')}`,
  `Recibo de B: ${psql(`select processado_em from acervo.mensagem_processada where event_id = '${b.eventId}'`)}`,
  'B só foi processada depois que A saiu para a DLQ: com prefetch=1, a retentativa no próprio consumidor segura a fila daquele consumidor durante a espera (~21 s).',
  '',
];
gravar('cenario-5-retry.txt', r4.join('\n'));
console.log(r4.join('\n'));
