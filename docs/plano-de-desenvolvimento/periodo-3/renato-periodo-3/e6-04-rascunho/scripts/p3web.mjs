import { abrir, ir, foto, botoes } from './cap.mjs';
let { browser, page } = await abrir({ conta: 'caio' });
await ir(page, '/livros/pessoal/7f274d8c-b412-4284-8fc2-55d7079c76d6');
await foto(page, 'p3-f-acv-opc-pagina-pessoal-web');
await ir(page, '/perfil/estatisticas');
const card = page.getByText('Notas que você deu').first();
if (await card.count()) { await card.scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -120)); }
await foto(page, 'p3-f-sta-opc-notas-web');
await ir(page, '/estante/adicionar/pessoal');
console.log(await botoes(page));
console.log((await page.locator('label').allInnerTexts()).join(' | '));
await browser.close();
({ browser, page } = await abrir({ conta: 'bia' }));
await ir(page, '/leitores/leai.demo.caio');
await foto(page, 'x-perfil-caio-bia');
console.log(await botoes(page));
await browser.close();
