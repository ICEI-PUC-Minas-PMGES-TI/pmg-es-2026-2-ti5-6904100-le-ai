import { abrir, ir, foto, botoes } from './cap.mjs';
const so = process.argv[2] || '';
const quer = (n) => !so || n.includes(so);
async function abrirThread(page) {
  await ir(page, '/feed');
  const item = page.locator('article, li').filter({ hasText: 'publicou uma resenha' }).filter({ hasText: 'Caio Demo' }).first();
  await item.scrollIntoViewIfNeeded();
  await item.getByRole('button').nth(1).click();
  await page.waitForTimeout(1200);
  await page.getByText('Ver 1 resposta').click();
  await page.waitForTimeout(1200);
}
// Bia: thread, comentário próprio, denúncia
{
  const { browser, page } = await abrir({ conta: 'bia' });
  if (quer('p1-f-feed-comentarios-web')) { await abrirThread(page); await foto(page, 'p1-f-feed-comentarios-web'); }
  if (quer('p2-f-social-2-comentario-web')) {
    await abrirThread(page);
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('button', { name: /Ações|Mais|opções/i }).first().click().catch(async () => { await dlg.locator('button').filter({ hasText: '' }).nth(1).click(); });
    await page.waitForTimeout(700);
    await foto(page, 'p2-f-social-2-comentario-web');
    console.log(await botoes(page));
  }
  if (quer('p2-f-mod-denunciar-web')) {
    await abrirThread(page);
    const dlg = page.getByRole('dialog');
    const menus = dlg.getByRole('button', { name: /Ações|Mais|opções/i });
    console.log('menus', await menus.count(), await menus.evaluateAll(b => b.map(x => x.getAttribute('aria-label'))));
    await menus.last().click();
    await page.waitForTimeout(600);
    await page.getByRole('menuitem', { name: /Denunciar/ }).click();
    await page.waitForTimeout(800);
    const d2 = page.getByRole('dialog').last();
    await d2.locator('textarea').fill('Demonstração: o comentário revela o final do livro sem aviso.');
    await page.waitForTimeout(400);
    await foto(page, 'p2-f-mod-denunciar-web');
  }
  await browser.close();
}
// sem sessão: login e cadastro
if (quer('p1-f-aut')) {
  const { browser, page } = await abrir({});
  if (quer('p1-f-aut-login-web')) { await ir(page, '/login'); await foto(page, 'p1-f-aut-login-web'); }
  if (quer('p1-f-aut-cadastro-web')) {
    await ir(page, '/cadastro');
    console.log((await page.locator('label').allInnerTexts()).join(' | '));
    const i = page.locator('input');
    await i.nth(0).fill('helena@exemplo.invalid'); await i.nth(1).fill('helena.leitora'); await i.nth(2).fill('Helena Duarte');
    await i.nth(3).fill('1995-04-12'); await i.nth(4).fill('demonstracao-sem-envio');

    await i.nth(5).fill('demonstracao-sem-envio');
    console.log(await i.evaluateAll(xs => xs.map(x => x.value.length)));
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await foto(page, 'p1-f-aut-cadastro-web');
  }
  await browser.close();
}
// Caio
{
  const A = '513a1914-c0af-4d69-ac93-071208aedcf1';
  const { browser, page } = await abrir({ conta: 'caio', soDemo: true });
  if (quer('p1-f-perfil-buscar-web')) {
    await ir(page, '/perfil/buscar');
    await page.locator('input').first().fill('leai.demo.bia'); await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    await foto(page, 'p1-f-perfil-buscar-web');
  }
  if (quer('p1-f-acv-busca-livro-web')) {
    await ir(page, `/livros/${A}`);
    await page.getByRole('heading', { name: /Resenhas/ }).first().evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => window.scrollBy(0, -90));
    await foto(page, 'p1-f-acv-busca-livro-web');
  }
  if (quer('p2-f-acv-nota-notas-web')) { await ir(page, `/livros/${A}`); await foto(page, 'p2-f-acv-nota-notas-web'); }
  if (quer('p1-f-est-acoes-web')) {
    await ir(page, '/livros/88b5a785-e55f-4eaa-b3b3-5e4e5b8ea50d');
    await page.getByText('Alterar status').first().click();
    await page.waitForTimeout(800);
    await foto(page, 'p1-f-est-acoes-web');
  }
  if (quer('p1-f-prg-progresso-web')) { await ir(page, '/estante'); await page.getByText('A Hora Da Estrela').first().click(); await page.waitForTimeout(1500); await page.getByText('Alterar status').first().click(); await page.waitForTimeout(600); await page.getByText('Ver atualizações').click(); await page.waitForTimeout(1500); await page.evaluate(() => window.scrollTo(0, 0)); await foto(page, 'p1-f-prg-progresso-web'); }
  if (quer('p2-f-ava-2-markdown-web')) {
    await ir(page, `/livros/${A}/resenha`);
    await page.getByText('Visualizar').first().click();
    await page.waitForTimeout(800);
    await foto(page, 'p2-f-ava-2-markdown-web');
  }
  if (quer('p2-f-lst-adicionar-web')) {
    await ir(page, `/livros/${A}`);
    await page.getByText('Adicionar à lista').first().click().catch(async () => { await page.getByRole('button', { name: /Mais|Ações/ }).first().click(); await page.getByText('Adicionar à lista').click(); });
    await page.waitForTimeout(1200);
    await foto(page, 'p2-f-lst-adicionar-web');
  }
  if (quer('p2-f-rec-p2p-recomendar-web')) {
    await ir(page, '/livros/c196fb51-0e71-4e87-a52d-61efff9ce80b');
    await page.getByText('Recomendar a um leitor').first().click();
    await page.waitForTimeout(1500);
    const dlg = page.getByRole('dialog');
    await dlg.getByText('Bia Demo').first().click();
    await page.waitForTimeout(400);
    await dlg.locator('textarea').fill('Leitura rápida e cheia de personagens marcantes.').catch(() => console.log('sem textarea'));
    await page.waitForTimeout(400);
    await foto(page, 'p2-f-rec-p2p-recomendar-web');
  }
  if (quer('p2-f-est-2-favoritos-web')) {
    await ir(page, '/estante');
    await page.getByRole('button', { name: /Favoritos/ }).first().click().catch(async () => page.getByText(/Favoritos/).first().click());
    await page.waitForTimeout(1500);
    await foto(page, 'p2-f-est-2-favoritos-web');
  }
  if (quer('p2-f-acv-descoberta-filtros-web')) {
    await ir(page, '/descobrir?q=machado%20de%20assis');
    await ir(page, '/descobrir');
    await page.getByText('Filtros').first().click();
    await page.waitForTimeout(800);
    await page.locator('#filtros-painel-autor').fill('Machado de Assis');
    await page.locator('#filtros-painel-paginas-min').fill('200');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    await page.waitForTimeout(2500);
    await foto(page, 'p2-f-acv-descoberta-filtros-web');
    console.log((await page.locator('label, legend').allInnerTexts()).join(' | '));
  }
  if (quer('p1-f-acv-cadastro-isbn-web')) {
    await ir(page, '/estante/adicionar');
    await page.locator('input').first().fill('9788594318619');
    await page.waitForTimeout(3000);
    await foto(page, 'p1-f-acv-cadastro-isbn-web');
    console.log(await botoes(page));
  }
  if (quer('p1-f-acv-cadastro-pessoal-web')) {
    await ir(page, '/estante/adicionar/pessoal');
    await page.getByLabel('Título').fill('Contos do Bairro Novo');
    await page.getByLabel('Autor').fill('R. Almeida');
    await page.getByLabel('Número de páginas').fill('212');
    await page.getByLabel('Sinopse').fill('Coletânea de contos de uma oficina de escrita, impressa por conta própria.');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await foto(page, 'p1-f-acv-cadastro-pessoal-web');
  }
  await browser.close();
}
