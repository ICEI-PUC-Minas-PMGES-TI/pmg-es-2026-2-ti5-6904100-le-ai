import { abrir, ir, foto } from './cap.mjs';
const { browser, page } = await abrir({ conta: 'admin', filtrarModeracao: true });
await ir(page, '/moderacao');
await page.getByText('Registro de auditoria').first().click();
await page.waitForTimeout(1500);
await foto(page, process.argv[2]);
await browser.close();
