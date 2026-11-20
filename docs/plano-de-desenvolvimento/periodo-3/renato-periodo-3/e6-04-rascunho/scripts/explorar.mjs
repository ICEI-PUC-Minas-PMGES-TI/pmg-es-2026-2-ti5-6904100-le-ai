import { abrir, ir, foto, botoes } from './cap.mjs';
const [conta, caminho, nome] = process.argv.slice(2);
const { browser, page } = await abrir({ conta: conta === '-' ? null : conta, filtrarModeracao: true });
await ir(page, caminho);
await foto(page, nome || 'explorar');
console.log(await botoes(page));
await browser.close();
