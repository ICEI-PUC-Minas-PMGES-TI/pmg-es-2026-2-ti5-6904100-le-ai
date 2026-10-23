import { GoogleBooksFonte } from './google-books.fonte';
import { HttpExterno } from './http-externo';
import { PoliticaDeResiliencia } from './politica-resiliencia';

const ISBN = '9788535914849';

function fonteCom(volumeInfo: Record<string, unknown>) {
  const http = {
    buscarJson: jest
      .fn()
      .mockResolvedValue({ totalItems: 1, items: [{ volumeInfo }] }),
  } as unknown as HttpExterno;
  return new GoogleBooksFonte(
    http,
    new PoliticaDeResiliencia({ esperasMs: [] }),
  );
}

describe('GoogleBooksFonte', () => {
  it('traz averageRating e ratingsCount como nota geral (F-ACV-NOTA)', async () => {
    const metadados = await fonteCom({
      title: 'Torto Arado',
      averageRating: 4.5,
      ratingsCount: 12,
    }).buscarPorIsbn(ISBN);

    expect(metadados?.notaGeral).toEqual({ valor: 4.5, quantidade: 12 });
  });

  it('sem avaliações, a nota fica ausente', async () => {
    const metadados = await fonteCom({ title: 'Torto Arado' }).buscarPorIsbn(
      ISBN,
    );

    expect(metadados?.notaGeral).toBeNull();
  });
});
