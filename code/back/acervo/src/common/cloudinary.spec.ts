import { assinar } from './cloudinary';

describe('assinar (Cloudinary)', () => {
  it('confere com o exemplo da documentação do Cloudinary', () => {
    // https://cloudinary.com/documentation/authentication_signatures
    expect(
      assinar(
        {
          timestamp: 1315060510,
          public_id: 'sample_image',
          eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        },
        'abcd',
      ),
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('ordena os parâmetros pelo nome', () => {
    expect(assinar({ b: 2, a: 1 }, 's')).toBe(assinar({ a: 1, b: 2 }, 's'));
  });
});
