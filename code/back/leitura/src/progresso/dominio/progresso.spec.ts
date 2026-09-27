import {
  MINUTOS_MAXIMOS,
  RegistroOrdenado,
  SEM_TEMPO,
  alcanceDaExclusao,
  dataLocal,
  paginasLidas,
  resumo,
  validarEdicaoDoUltimo,
  validarMinutos,
  validarNovaPagina,
} from './progresso';

describe('validarNovaPagina', () => {
  it('rejeita página igual à atual', () => {
    const resultado = validarNovaPagina(40, 200, 40);
    expect(resultado).toMatchObject({
      ok: false,
      erro: { tipo: 'PROGRESSO_INVALIDO', codigo: 'PAGINA_NAO_AVANCA' },
    });
  });

  it('rejeita página menor que a atual', () => {
    expect(validarNovaPagina(40, 200, 10)).toMatchObject({
      ok: false,
      erro: { codigo: 'PAGINA_NAO_AVANCA' },
    });
  });

  it('aceita a página imediatamente seguinte', () => {
    expect(validarNovaPagina(40, 200, 41)).toEqual({
      ok: true,
      paginasLidas: 1,
    });
  });

  it('aceita a página igual ao total', () => {
    expect(validarNovaPagina(40, 200, 200)).toEqual({
      ok: true,
      paginasLidas: 160,
    });
  });

  it('rejeita página acima do total', () => {
    const resultado = validarNovaPagina(40, 200, 201);
    expect(resultado).toMatchObject({
      ok: false,
      erro: { codigo: 'PAGINA_ACIMA_DO_TOTAL' },
    });
    if (!resultado.ok) expect(resultado.erro.motivo).toMatch(/total/);
  });

  it('aceita o primeiro registro a partir de zero', () => {
    expect(validarNovaPagina(0, 10, 1)).toEqual({ ok: true, paginasLidas: 1 });
  });

  it('rejeita qualquer página quando a leitura já está no total', () => {
    expect(validarNovaPagina(200, 200, 200)).toMatchObject({
      ok: false,
      erro: { codigo: 'PAGINA_NAO_AVANCA' },
    });
  });
});

describe('paginasLidas', () => {
  it('deriva a diferença entre a página informada e a anterior', () => {
    expect(paginasLidas(0, 25)).toBe(25);
    expect(paginasLidas(25, 30)).toBe(5);
  });
});

describe('validarEdicaoDoUltimo', () => {
  it('usa zero como base quando não há penúltimo', () => {
    expect(validarEdicaoDoUltimo(0, 100, 1)).toEqual({
      ok: true,
      paginasLidas: 1,
    });
    expect(validarEdicaoDoUltimo(0, 100, 0)).toMatchObject({
      ok: false,
      erro: { codigo: 'PAGINA_NAO_AVANCA' },
    });
  });

  it('permite corrigir para baixo desde que acima do penúltimo', () => {
    expect(validarEdicaoDoUltimo(30, 100, 31)).toEqual({
      ok: true,
      paginasLidas: 1,
    });
  });

  it('rejeita página igual à do penúltimo', () => {
    expect(validarEdicaoDoUltimo(30, 100, 30)).toMatchObject({
      ok: false,
      erro: { codigo: 'PAGINA_NAO_AVANCA' },
    });
  });

  it('aceita o total e rejeita acima dele', () => {
    expect(validarEdicaoDoUltimo(30, 100, 100)).toEqual({
      ok: true,
      paginasLidas: 70,
    });
    expect(validarEdicaoDoUltimo(30, 100, 101)).toMatchObject({
      ok: false,
      erro: { codigo: 'PAGINA_ACIMA_DO_TOTAL' },
    });
  });
});

describe('validarMinutos', () => {
  it.each([SEM_TEMPO, MINUTOS_MAXIMOS, 60])('aceita %i', (minutos) => {
    expect(validarMinutos(minutos)).toEqual({ ok: true });
  });

  it.each([SEM_TEMPO - 1, MINUTOS_MAXIMOS + 1, 1.5])(
    'rejeita %d',
    (minutos) => {
      expect(validarMinutos(minutos)).toMatchObject({
        ok: false,
        erro: { codigo: 'MINUTOS_FORA_DO_INTERVALO' },
      });
    },
  );
});

describe('resumo', () => {
  it('calcula o percentual sem arredondar, como o serviço de leituras', () => {
    expect(resumo(1, 3, 45)).toEqual({
      paginaAtual: 1,
      totalPaginas: 3,
      percentualConcluido: (1 / 3) * 100,
      minutosTotais: 45,
    });
  });

  it('retorna zero sem registros e cem no total', () => {
    expect(resumo(0, 250, 0).percentualConcluido).toBe(0);
    expect(resumo(250, 250, 0).percentualConcluido).toBe(100);
  });

  it('limita o percentual a cem', () => {
    expect(resumo(300, 250, 0).percentualConcluido).toBe(100);
  });
});

describe('alcanceDaExclusao', () => {
  const registros: RegistroOrdenado[] = [
    { id: 'a', ordem: 1, pagina: 10 },
    { id: 'b', ordem: 2, pagina: 25 },
    { id: 'c', ordem: 3, pagina: 40 },
  ];

  it('remove apenas o último e recalcula a página pelo penúltimo', () => {
    expect(alcanceDaExclusao(registros, 'c', 'c')).toEqual({
      ok: true,
      idsRemovidos: ['c'],
      paginaAtual: 25,
    });
  });

  it('remove o intermediário junto com todos os posteriores', () => {
    expect(alcanceDaExclusao(registros, 'b', 'c')).toEqual({
      ok: true,
      idsRemovidos: ['b', 'c'],
      paginaAtual: 10,
    });
  });

  it('zera a página quando nenhum registro resta', () => {
    expect(alcanceDaExclusao(registros, 'a', 'c')).toEqual({
      ok: true,
      idsRemovidos: ['a', 'b', 'c'],
      paginaAtual: 0,
    });
  });

  it('usa a ordem de inserção mesmo com a entrada desordenada', () => {
    const desordenados = [registros[2], registros[0], registros[1]];
    expect(alcanceDaExclusao(desordenados, 'b', 'c')).toEqual({
      ok: true,
      idsRemovidos: ['b', 'c'],
      paginaAtual: 10,
    });
  });

  it('acusa conflito quando o último confirmado não é o último atual', () => {
    expect(alcanceDaExclusao(registros, 'b', 'b')).toMatchObject({
      ok: false,
      erro: { codigo: 'ULTIMO_PROGRESSO_DIVERGENTE' },
    });
  });

  it('acusa ausência quando o registro não pertence à leitura', () => {
    expect(alcanceDaExclusao(registros, 'x', 'c')).toMatchObject({
      ok: false,
      erro: { codigo: 'PROGRESSO_NAO_ENCONTRADO' },
    });
  });

  it('acusa ausência quando não há registros', () => {
    expect(alcanceDaExclusao([], 'a', 'a')).toMatchObject({
      ok: false,
      erro: { codigo: 'PROGRESSO_NAO_ENCONTRADO' },
    });
  });
});

describe('dataLocal', () => {
  const instante = new Date('2026-09-27T02:30:00.000Z');

  it('deriva o dia anterior em fuso a oeste de UTC', () => {
    expect(dataLocal(instante, 'America/Sao_Paulo')).toBe('2026-09-26');
  });

  it('mantém o dia em UTC', () => {
    expect(dataLocal(instante, 'UTC')).toBe('2026-09-27');
  });

  it('avança o dia em fuso a leste de UTC', () => {
    expect(dataLocal(new Date('2026-09-27T23:30:00.000Z'), 'Asia/Tokyo')).toBe(
      '2026-09-28',
    );
  });

  it('rejeita fuso IANA inválido', () => {
    expect(() => dataLocal(instante, 'Fuso/Inexistente')).toThrow(RangeError);
  });
});
