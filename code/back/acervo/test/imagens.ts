/**
 * Imagens mínimas, montadas byte a byte, para os testes do cache de capas: o
 * bastante para os magic bytes, o fim do arquivo e o cabeçalho que o
 * `image-size` lê. Não são imagens decodificáveis por inteiro, e não precisam:
 * a validação do servidor não decodifica pixels.
 */

const ascii = (texto: string) => [...texto].map((c) => c.charCodeAt(0));
const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const be32 = (n: number) => [
  (n >>> 24) & 0xff,
  (n >> 16) & 0xff,
  (n >> 8) & 0xff,
  n & 0xff,
];
const le24 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
const le32 = (n: number) => [...le24(n), (n >>> 24) & 0xff];

export function jpeg(largura = 300, altura = 450): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([
    0xff, 0xd8,
    // APP0 JFIF
    0xff, 0xe0, ...be16(16), ...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    // SOF0: precisão, altura, largura, 3 componentes
    0xff, 0xc0, ...be16(17), 8, ...be16(altura), ...be16(largura), 3,
    1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
    0xff, 0xd9,
  ]);
}

export function png(largura = 300, altura = 450): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...be32(13), ...ascii('IHDR'), ...be32(largura), ...be32(altura),
    8, 6, 0, 0, 0, 0, 0, 0, 0,
    ...be32(0), ...ascii('IEND'), 0xae, 0x42, 0x60, 0x82,
  ]);
}

export function webp(largura = 300, altura = 450): Uint8Array<ArrayBuffer> {
  const vp8x = [
    ...ascii('VP8X'), ...le32(10), 0, 0, 0, 0,
    ...le24(largura - 1), ...le24(altura - 1),
  ];
  return Uint8Array.from([
    ...ascii('RIFF'), ...le32(4 + vp8x.length), ...ascii('WEBP'), ...vp8x,
  ]);
}

export function gif(largura = 300, altura = 450): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([
    ...ascii('GIF89a'), largura & 0xff, largura >> 8, altura & 0xff, altura >> 8,
    0, 0, 0, 0x3b,
  ]);
}
