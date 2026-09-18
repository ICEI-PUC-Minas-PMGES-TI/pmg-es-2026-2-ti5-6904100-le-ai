import { JanelaEmMemoria } from './janela-em-memoria';

describe('JanelaEmMemoria', () => {
  let agora: number;
  const janela = () => new JanelaEmMemoria(() => agora);

  beforeEach(() => {
    agora = 1_000_000;
  });

  it('libera enquanto está dentro do limite', () => {
    const j = janela();
    expect(j.registrar('ip:1', 3, 60)).toBeNull();
    expect(j.registrar('ip:1', 3, 60)).toBeNull();
    expect(j.registrar('ip:1', 3, 60)).toBeNull();
  });

  it('bloqueia ao passar do limite e informa a espera em segundos', () => {
    const j = janela();
    for (let i = 0; i < 3; i += 1) j.registrar('ip:1', 3, 60);
    expect(j.registrar('ip:1', 3, 60)).toBe(60);
  });

  it('libera de novo quando a janela expira', () => {
    const j = janela();
    for (let i = 0; i < 4; i += 1) j.registrar('ip:1', 3, 60);
    agora += 60_001;
    expect(j.registrar('ip:1', 3, 60)).toBeNull();
  });

  // As duas metades de RNF-SEC-18 contam separado: estourar por IP não pode
  // bloquear a identidade e vice-versa.
  it('conta chaves independentes separadamente', () => {
    const j = janela();
    for (let i = 0; i < 4; i += 1) j.registrar('ip:1', 3, 60);
    expect(j.registrar('sub:abc', 3, 60)).toBeNull();
  });

  it('arredonda a espera para cima, nunca para zero', () => {
    const j = janela();
    for (let i = 0; i < 3; i += 1) j.registrar('ip:1', 3, 60);
    agora += 59_500;
    expect(j.registrar('ip:1', 3, 60)).toBe(1);
  });
});
