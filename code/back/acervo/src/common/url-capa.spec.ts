import { ErroDeValidacao } from './erros-de-negocio';
import { validarUrlDeCapa } from './url-capa';

const CONFIG = { hostsPermitidos: ['res.cloudinary.com'], cloudName: 'leai' };
const VALIDA =
  'https://res.cloudinary.com/leai/image/upload/v1699999999/capas/abc.jpg';

describe('validarUrlDeCapa', () => {
  it('aceita URL do serviço de imagens e extrai o public_id', () => {
    expect(validarUrlDeCapa(VALIDA, CONFIG)).toEqual({
      url: VALIDA,
      assetId: 'capas/abc',
    });
  });

  it('ignora transformações ao extrair o public_id', () => {
    const comTransformacao =
      'https://res.cloudinary.com/leai/image/upload/w_400,c_fill/v1699999999/capas/abc.png';
    expect(validarUrlDeCapa(comTransformacao, CONFIG).assetId).toBe(
      'capas/abc',
    );
  });

  // A checagem de host é por igualdade exata justamente por causa deste caso:
  // `endsWith('res.cloudinary.com')` aceitaria o domínio do atacante.
  it('recusa host que apenas termina com o host permitido', () => {
    expect(() =>
      validarUrlDeCapa(
        'https://res.cloudinary.com.invasor.com/leai/image/upload/v1/capas/abc.jpg',
        CONFIG,
      ),
    ).toThrow(ErroDeValidacao);
  });

  it.each([
    [
      'http, não https',
      'http://res.cloudinary.com/leai/image/upload/v1/capas/abc.jpg',
    ],
    [
      'credencial embutida',
      'https://u:p@res.cloudinary.com/leai/image/upload/v1/capas/abc.jpg',
    ],
    [
      'porta explícita',
      'https://res.cloudinary.com:8443/leai/image/upload/v1/capas/abc.jpg',
    ],
    [
      'outro cloud name',
      'https://res.cloudinary.com/outro/image/upload/v1/capas/abc.jpg',
    ],
    [
      'extensão inesperada',
      'https://res.cloudinary.com/leai/image/upload/v1/capas/abc.svg',
    ],
    ['não é URL', 'capas/abc.jpg'],
    [
      'host arbitrário',
      'https://invasor.com/leai/image/upload/v1/capas/abc.jpg',
    ],
  ])('recusa %s', (_caso, url) => {
    expect(() => validarUrlDeCapa(url, CONFIG)).toThrow(ErroDeValidacao);
  });

  it('devolve o erro no campo capaUrl, para o cliente marcar o campo certo', () => {
    try {
      validarUrlDeCapa('https://invasor.com/x.jpg', CONFIG);
      fail('deveria ter lançado');
    } catch (erro) {
      expect((erro as ErroDeValidacao).extras).toEqual({
        campos: [expect.objectContaining({ campo: 'capaUrl' })],
      });
    }
  });
});
