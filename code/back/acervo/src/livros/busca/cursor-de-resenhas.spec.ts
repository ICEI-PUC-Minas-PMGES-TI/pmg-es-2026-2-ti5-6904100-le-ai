import { ErroDeValidacao } from '../../common/erros-de-negocio';
import { codificarCursor, decodificarCursor } from './cursor-de-resenhas';

const ID = '0f8a2aef-ade3-4e27-b0f7-894d9080205d';
const cru = (conteudo: unknown) =>
  Buffer.from(JSON.stringify(conteudo)).toString('base64url');

describe('cursor das resenhas', () => {
  it('volta a posição que foi codificada, com os microssegundos', () => {
    const posicao = { criadoEm: '2026-09-26T18:04:05.123456Z', id: ID };
    expect(decodificarCursor(codificarCursor(posicao))).toEqual(posicao);
  });

  it.each([
    ['base64 que não é JSON', 'nao-e-json'],
    ['sem microssegundos', cru({ c: '2026-09-26T18:04:05.123Z', i: ID })],
    ['id que não é UUID', cru({ c: '2026-09-26T18:04:05.123456Z', i: '1' })],
    ['mês 13', cru({ c: '2026-13-01T00:00:00.000000Z', i: ID })],
    ['hora 99', cru({ c: '2026-09-26T99:99:99.000000Z', i: ID })],
    ['30 de fevereiro', cru({ c: '2026-02-30T00:00:00.000000Z', i: ID })],
    ['ano zero', cru({ c: '0000-01-01T00:00:00.000000Z', i: ID })],
  ])('%s vira 400 no campo cursor', (_caso, cursor) => {
    expect(() => decodificarCursor(cursor)).toThrow(ErroDeValidacao);
  });
});
