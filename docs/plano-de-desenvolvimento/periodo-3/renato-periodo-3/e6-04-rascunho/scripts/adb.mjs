import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const OUT = fileURLToPath(new URL('./out/', import.meta.url));
const env = { ...process.env, MSYS_NO_PATHCONV: '1' };
export const adb = (...a) => execFileSync('adb', a, { env, maxBuffer: 64 * 1024 * 1024 });
export const sh = (cmd) => adb('shell', cmd).toString();
export const espera = (ms) => new Promise(r => setTimeout(r, ms));
export function nos() {
  sh('uiautomator dump /sdcard/ui.xml >/dev/null');
  const xml = adb('shell', 'cat /sdcard/ui.xml').toString();
  const lista = [];
  for (const m of xml.matchAll(/<node [^>]*>/g)) {
    const n = m[0];
    const at = (k) => (n.match(new RegExp(` ${k}="([^"]*)"`)) || [])[1] || '';
    const b = at('bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!b) continue;
    lista.push({ texto: at('text'), desc: at('content-desc'), classe: at('class'), clicavel: at('clickable') === 'true', foco: at('focused') === 'true', x1: +b[1], y1: +b[2], x2: +b[3], y2: +b[4] });
  }
  return lista;
}
const rotulo = (n) => (n.desc + ' ' + n.texto).replace(/&#10;/g, ' ').replace(/\s+/g, ' ').trim();
export function listar(filtro) { return nos().map(n => `${rotulo(n)} @${n.x1},${n.y1},${n.x2},${n.y2}${n.clicavel ? ' [c]' : ''}`).filter(s => !s.startsWith('@') && (!filtro || s.includes(filtro))); }
export function achar(re, { indice = 0, ultimo = false } = {}) {
  const ns = nos().filter(n => re.test(rotulo(n)));
  if (!ns.length) return null;
  return ultimo ? ns[ns.length - 1] : ns[indice];
}
export async function tocar(re, opcoes = {}) {
  for (let t = 0; t < (opcoes.tentativas ?? 8); t++) {
    const n = achar(re, opcoes);
    if (n) { const x = Math.round((n.x1 + n.x2) / 2), y = Math.round((n.y1 + n.y2) / 2); sh(`input tap ${x} ${y}`); await espera(opcoes.pausa ?? 1200); return n; }
    await espera(1000);
  }
  throw new Error('não achei ' + re);
}
export async function tocarXY(x, y, pausa = 1000) { sh(`input tap ${x} ${y}`); await espera(pausa); }
export async function digitar(texto) {
  for (let i = 0; i < texto.length; i += 4) {
    const parte = texto.slice(i, i + 4).replace(/ /g, '%s').replace(/([\\'"`$&|;<>()*?!#~])/g, '\\$1');
    sh(`input text '${parte.replace(/'/g, "'\\''")}'`);
  }
  await espera(400);
}
export async function rolar(dy = 800, x = 540, y0 = 1600) { sh(`input swipe ${x} ${y0} ${x} ${y0 - dy} 600`); await espera(1000); }
export async function voltar() { sh('input keyevent 4'); await espera(1000); }
export async function esconderTeclado() { const n = nos().some(n => n.foco); sh('input keyevent 111'); await espera(500); }
export async function foto(nome) { await espera(700); const png = adb('exec-out', 'screencap', '-p'); fs.writeFileSync(OUT + nome + '.png', png); console.log('foto', nome); }
export function abrirApp() { sh('monkey -p br.com.leai.mobile -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1'); }
export function fecharApp() { sh('am force-stop br.com.leai.mobile'); }
