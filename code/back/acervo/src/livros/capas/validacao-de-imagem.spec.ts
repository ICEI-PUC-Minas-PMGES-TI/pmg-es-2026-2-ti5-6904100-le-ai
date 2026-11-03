import { gif, jpeg, png, webp } from '../../../test/imagens';
import { validarImagem } from './validacao-de-imagem';

describe('validarImagem (RNF-SEC-20)', () => {
  it.each([
    ['JPEG', jpeg(), 'jpg'],
    ['PNG', png(), 'png'],
    ['WebP', webp(), 'webp'],
  ])('aceita %s com as dimensões lidas', (_nome, bytes, formato) => {
    expect(validarImagem(bytes)).toEqual({
      valida: true,
      formato,
      largura: 300,
      altura: 450,
    });
  });

  it.each([
    ['GIF', gif(), 'formato não aceito'],
    [
      'HTML',
      new TextEncoder().encode('<!doctype html><html></html>'),
      'formato não aceito',
    ],
    ['vazio', new Uint8Array(), 'formato não aceito'],
    ['JPEG truncado', jpeg().slice(0, -2), 'arquivo truncado'],
    ['PNG truncado', png().slice(0, -12), 'arquivo truncado'],
    ['WebP truncado', webp().slice(0, -3), 'arquivo truncado'],
    ['pequena demais', jpeg(49, 300), 'dimensões fora do limite'],
    ['grande demais', png(300, 5001), 'dimensões fora do limite'],
  ])('recusa %s', (_caso, bytes, motivo) => {
    expect(validarImagem(bytes)).toEqual({ valida: false, motivo });
  });

  it('aceita os limites exatos de 50 e 5000 px', () => {
    expect(validarImagem(jpeg(50, 5000)).valida).toBe(true);
  });
});
