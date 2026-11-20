import { abrir, ir, foto } from './cap.mjs';
const { browser, page } = await abrir({ conta: 'marina' });
await ir(page, '/perfil/solicitacoes'); await page.waitForTimeout(1000);
await foto(page, 'p1-f-perfil-solicitacoes-web');
await browser.close();
