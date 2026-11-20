import { abrir, ir, foto, botoes } from './cap.mjs';
const { browser, page } = await abrir({ conta: 'caio' });
await ir(page, '/estante/adicionar/pessoal');
await page.getByLabel('Título').fill('Contos do Bairro Novo');
await page.getByLabel('Autor').fill('R. Almeida');
await page.getByLabel('Número de páginas').fill('212');
await page.getByLabel('Sinopse').fill('Coletânea de contos de uma oficina de escrita, impressa por conta própria.');
await page.getByText('Escolher assuntos').click();
await page.waitForTimeout(800);
for (const a of ['Conto', 'Crônica', 'Memórias']) { await page.getByRole('checkbox', { name: a, exact: true }).or(page.getByRole('option', { name: a, exact: true })).or(page.getByText(a, { exact: true })).first().click(); await page.waitForTimeout(200); }
await foto(page, 'x-assuntos-escolhidos');
console.log(await botoes(page));
const conc = page.getByRole('button', { name: /Concluir|Aplicar|Confirmar|Pronto|Salvar/ });
console.log('conc', await conc.allInnerTexts());
await browser.close();
