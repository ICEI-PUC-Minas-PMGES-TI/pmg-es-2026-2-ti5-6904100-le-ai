import { abrir, ir, foto, botoes } from './cap.mjs';
const { browser, page } = await abrir({ conta: 'admin', filtrarModeracao: true });
await ir(page, '/moderacao');
await page.getByText('Teste de demonstração: a resenha comenta').first().click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /Arquivar como improcedente/ }).click();
await page.waitForTimeout(800);
await foto(page, 'x-arquivar-dialogo');
console.log(await botoes(page));
const conf = page.getByRole('dialog').getByRole('button', { name: /Arquivar/ });
if (await conf.count()) { await conf.last().click(); await page.waitForTimeout(1500); }
await page.getByRole('tab', { name: /Registro de auditoria/ }).click().catch(async () => page.getByText('Registro de auditoria').click());
await page.waitForTimeout(1500);
await foto(page, 'p2-f-mod-registro-web');
await browser.close();
