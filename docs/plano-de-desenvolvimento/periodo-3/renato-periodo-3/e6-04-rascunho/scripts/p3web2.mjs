import { abrir, ir, foto } from './cap.mjs';
async function rolarAte(page, texto, folga = 40) {
  await page.getByText(texto).first().evaluate((el, f) => { const y = el.getBoundingClientRect().top + window.scrollY - f; window.scrollTo(0, y); document.querySelectorAll('main, [class*=overflow]').forEach(m => { if (m.scrollHeight > m.clientHeight) m.scrollTop += el.getBoundingClientRect().top - f; }); }, folga);
  await page.waitForTimeout(500);
}
let { browser, page } = await abrir({ conta: 'caio' });
await ir(page, '/perfil/estatisticas');
await rolarAte(page, 'Notas que você deu', 330);
await foto(page, 'p3-f-sta-opc-notas-web');
await browser.close();
({ browser, page } = await abrir({ conta: 'bia' }));
await ir(page, '/leitores/leai.demo.caio');
await rolarAte(page, 'Estatísticas do ano', 40);
await foto(page, 'p3-f-sta-opc-perfil-outro-web');
await browser.close();
