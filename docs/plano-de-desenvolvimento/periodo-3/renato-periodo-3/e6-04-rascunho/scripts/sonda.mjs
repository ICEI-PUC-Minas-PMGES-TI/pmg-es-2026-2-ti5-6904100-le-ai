import { abrir, ir } from './cap.mjs';
let { browser, page } = await abrir({ conta: 'caio' });
page.on('request', r => { if (/onrender|localhost:(3|8)/.test(r.url()) && r.resourceType() === 'fetch') console.log('req', r.method(), r.url()); });
await ir(page, '/livros/513a1914-c0af-4d69-ac93-071208aedcf1');
await browser.close();
({ browser, page } = await abrir({}));
await ir(page, '/cadastro');
console.log(await page.locator('input').evaluateAll(xs => xs.map(x => `${x.id}|${x.name}|${x.type}|${x.getAttribute('aria-label')}`)));
await browser.close();
