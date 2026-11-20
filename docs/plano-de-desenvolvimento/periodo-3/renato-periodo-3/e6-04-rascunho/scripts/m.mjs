import * as a from './adb.mjs';
const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'abrir') { a.fecharApp(); a.abrirApp(); await a.espera(6000); }
if (cmd === 'ls') console.log(a.listar(args[0]).join('\n'));
if (cmd === 'tap') await a.tocar(new RegExp(args[0]), { indice: +(args[1] || 0) });
if (cmd === 'xy') await a.tocarXY(+args[0], +args[1]);
if (cmd === 'type') await a.digitar(args.join(' '));
if (cmd === 'foto') await a.foto(args[0]);
if (cmd === 'rolar') await a.rolar(+(args[0] || 800));
if (cmd === 'voltar') await a.voltar();
if (cmd === 'teclado') await a.esconderTeclado();
if (cmd === 'login') {
  const { senha } = await import('./api.mjs');
  const s = senha(args[0]); if (!s) throw new Error('sem senha');
  const campo = (re) => { const ns = a.nos(); const l = ns.find(n => re.test(n.texto + n.desc)); return ns.find(n => n.clicavel && n.y1 > l.y2 && n.x2 - n.x1 > 600); };
  const limpar = () => { a.sh('input keyevent KEYCODE_MOVE_END'); for (let i = 0; i < 4; i++) a.sh('input keyevent ' + Array(10).fill('67').join(' ')); };
  let c = campo(/^E-mail ou nome/); await a.tocarXY((c.x1 + c.x2) >> 1, (c.y1 + c.y2) >> 1, 600); limpar(); await a.digitar(`leai.demo.${args[0]}`);
  c = campo(/^Senha$/); await a.tocarXY(c.x1 + 300, (c.y1 + c.y2) >> 1, 600); limpar(); await a.digitar(s);
  await a.esconderTeclado();
  await a.tocar(/^Entrar$/, { ultimo: true, pausa: 5000 });
}
