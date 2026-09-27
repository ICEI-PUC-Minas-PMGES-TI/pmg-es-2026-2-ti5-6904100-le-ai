import { LIMITE_DA_SINOPSE, textoPuro } from './texto-puro';

describe('textoPuro', () => {
  it('tira o HTML e mantém os parágrafos', () => {
    expect(
      textoPuro(
        '<p>Primeiro <b>parágrafo</b>.</p><p>Segundo<br>com quebra.</p>',
      ),
    ).toBe('Primeiro parágrafo.\n\nSegundo\ncom quebra.');
  });

  it('decodifica entidades nomeadas e numéricas', () => {
    expect(
      textoPuro(
        'Tom &amp; Jerry &#8212; &#x201C;cl&aacute;ssico&#x201D; &Eacute; &ccedil; &xyz;',
      ),
    ).toBe('Tom & Jerry — “clássico” É ç &xyz;');
  });

  it('tira também o HTML que vinha escapado, sem comer o sinal de menor', () => {
    expect(
      textoPuro('&lt;p&gt;Um &lt;b&gt;clássico&lt;/b&gt;.&lt;/p&gt;'),
    ).toBe('Um clássico.');
    expect(textoPuro('Se 5 &lt; 7 e 9 &gt; 3, então...')).toBe(
      'Se 5 < 7 e 9 > 3, então...',
    );
  });

  it('remove caractere de controle e mantém a quebra de linha', () => {
    expect(textoPuro('Um\u0000 livro\u0007.\nFim &#1;.')).toBe(
      'Um livro.\nFim .',
    );
  });

  it('remove o Markdown de referência da OpenLibrary', () => {
    const bruto = [
      'Um romance sobre duas irmãs. ([source][1])',
      '',
      '----------',
      'Contém o [prefácio][2] da autora.',
      '',
      '  [1]: https://www.skoob.com.br/livro/123',
      '  [2]: https://exemplo.org/prefacio',
    ].join('\n');

    expect(textoPuro(bruto)).toBe(
      'Um romance sobre duas irmãs.\n\nContém o prefácio da autora.',
    );
  });

  it('reduz link e ênfase em Markdown ao texto', () => {
    expect(textoPuro('Leia a [resenha](https://x.org) do **clássico**.')).toBe(
      'Leia a resenha do clássico.',
    );
  });

  it('colapsa espaços e linhas em branco demais', () => {
    expect(textoPuro('  a  \t b \n\n\n\n c  ')).toBe('a b\n\nc');
  });

  it('texto que só tinha marcação vira null', () => {
    expect(textoPuro('<p> </p>\n----\n[1]: https://x.org')).toBeNull();
  });

  it('corta em 4.000 na fronteira de palavra, com reticências dentro do limite', () => {
    const texto = textoPuro('palavra '.repeat(1_000)) as string;
    expect([...texto].length).toBeLessThanOrEqual(LIMITE_DA_SINOPSE);
    expect(texto.endsWith('palavra…')).toBe(true);
  });

  it('conta code points, não unidades UTF-16', () => {
    const texto = textoPuro('😀'.repeat(20), 10) as string;
    expect([...texto]).toHaveLength(10);
  });
});
