import {
  aplicarEvento,
  avaliarInatividade,
  EventoEstante,
  LIMIAR_EXPIRACAO_DIAS,
  LIMIARES_RISCO_DIAS,
  SnapshotEstante,
} from './maquina-estados';

const foraDaEstante: SnapshotEstante = {
  status: null,
  vezesLido: 0,
  leituraAtual: null,
  possuiHistorico: false,
};
const queroLer: SnapshotEstante = { ...foraDaEstante, status: 'quero_ler' };
const lendo: SnapshotEstante = {
  status: 'lendo',
  vezesLido: 0,
  leituraAtual: {
    status: 'lendo',
    releitura: false,
    incompleta: false,
    paginaAtual: 42,
  },
  possuiHistorico: true,
};
const lido: SnapshotEstante = {
  status: 'lido',
  vezesLido: 1,
  leituraAtual: {
    status: 'lido',
    releitura: false,
    incompleta: false,
    paginaAtual: 300,
  },
  possuiHistorico: true,
};
const relendo: SnapshotEstante = {
  status: 'relendo',
  vezesLido: 1,
  leituraAtual: {
    status: 'lendo',
    releitura: true,
    incompleta: false,
    paginaAtual: 10,
  },
  possuiHistorico: true,
};
const abandonado: SnapshotEstante = {
  status: 'abandonado',
  vezesLido: 0,
  leituraAtual: {
    status: 'abandonado',
    releitura: false,
    incompleta: false,
    paginaAtual: 42,
  },
  possuiHistorico: true,
};
const lidoComReleituraIncompleta: SnapshotEstante = {
  status: 'lido',
  vezesLido: 1,
  leituraAtual: {
    status: 'lido',
    releitura: true,
    incompleta: true,
    paginaAtual: 80,
  },
  possuiHistorico: true,
};

function sucesso(snapshot: SnapshotEstante, evento: EventoEstante) {
  const resultado = aplicarEvento(snapshot, evento);
  if (!resultado.ok) {
    throw new Error(`esperava sucesso, veio ${resultado.erro.codigo}`);
  }
  return resultado.transicao;
}

function falha(snapshot: SnapshotEstante, evento: EventoEstante) {
  const resultado = aplicarEvento(snapshot, evento);
  if (resultado.ok) throw new Error('esperava erro de transição');
  return resultado.erro;
}

describe('RN-04 — transições válidas', () => {
  it('— → adicionar → quero_ler, sem leitura, publica livro.adicionado_a_estante', () => {
    expect(sucesso(foraDaEstante, 'adicionar')).toEqual({
      statusEstante: 'quero_ler',
      deltaVezesLido: 0,
      leitura: null,
      eventoPublicado: 'livro.adicionado_a_estante',
    });
  });

  it('quero_ler sem histórico → remover → fora da estante, sem evento', () => {
    expect(sucesso(queroLer, 'remover')).toEqual({
      statusEstante: null,
      deltaVezesLido: 0,
      leitura: null,
      eventoPublicado: null,
    });
  });

  it.each([
    ['quero_ler', queroLer],
    ['fora da estante (livro nunca concluído)', foraDaEstante],
  ])('%s → iniciar → lendo, cria leitura não-releitura', (_, snapshot) => {
    expect(sucesso(snapshot, 'iniciar')).toEqual({
      statusEstante: 'lendo',
      deltaVezesLido: 0,
      leitura: { acao: 'criar', releitura: false },
      eventoPublicado: 'leitura.iniciada',
    });
  });

  it('lido → iniciarReleitura → relendo, cria leitura marcada como releitura', () => {
    expect(sucesso(lido, 'iniciarReleitura')).toEqual({
      statusEstante: 'relendo',
      deltaVezesLido: 0,
      leitura: { acao: 'criar', releitura: true },
      eventoPublicado: 'leitura.iniciada',
    });
  });

  it('lido com releitura incompleta anterior → iniciarReleitura → nova releitura', () => {
    expect(
      sucesso(lidoComReleituraIncompleta, 'iniciarReleitura').leitura,
    ).toEqual({
      acao: 'criar',
      releitura: true,
    });
  });

  it.each([
    ['lendo', lendo],
    ['relendo', relendo],
  ])(
    '%s → finalizar → lido, grava fim e incrementa vezesLido',
    (_, snapshot) => {
      expect(sucesso(snapshot, 'finalizar')).toEqual({
        statusEstante: 'lido',
        deltaVezesLido: 1,
        leitura: { acao: 'finalizar' },
        eventoPublicado: 'leitura.finalizada',
      });
    },
  );

  it('lendo → abandonar → abandonado, retomável, sem incrementar vezesLido', () => {
    expect(sucesso(lendo, 'abandonar')).toEqual({
      statusEstante: 'abandonado',
      deltaVezesLido: 0,
      leitura: { acao: 'abandonar', incompleta: false, retomavel: true },
      eventoPublicado: 'leitura.abandonada',
    });
  });

  it('relendo → abandonar → lido, releitura incompleta, não retomável, sem incremento', () => {
    expect(sucesso(relendo, 'abandonar')).toEqual({
      statusEstante: 'lido',
      deltaVezesLido: 0,
      leitura: { acao: 'abandonar', incompleta: true, retomavel: false },
      eventoPublicado: 'leitura.abandonada',
    });
  });

  it('abandonado (primeira leitura) → retomar → lendo, continua da página registrada', () => {
    expect(sucesso(abandonado, 'retomar')).toEqual({
      statusEstante: 'lendo',
      deltaVezesLido: 0,
      leitura: { acao: 'retomar', paginaAtual: 42 },
      eventoPublicado: 'leitura.retomada',
    });
  });
});

describe('RN-04 — transições inválidas', () => {
  const casos: Array<[string, SnapshotEstante, EventoEstante, string]> = [
    [
      'adicionar já na estante (quero_ler)',
      queroLer,
      'adicionar',
      'JA_NA_ESTANTE',
    ],
    ['adicionar já na estante (lendo)', lendo, 'adicionar', 'JA_NA_ESTANTE'],
    ['adicionar já na estante (lido)', lido, 'adicionar', 'JA_NA_ESTANTE'],
    [
      'adicionar já na estante (abandonado)',
      abandonado,
      'adicionar',
      'JA_NA_ESTANTE',
    ],
    ['remover fora da estante', foraDaEstante, 'remover', 'FORA_DA_ESTANTE'],
    [
      'remover quero_ler com histórico',
      { ...queroLer, possuiHistorico: true },
      'remover',
      'POSSUI_HISTORICO',
    ],
    ['remover lendo', lendo, 'remover', 'REMOCAO_NAO_PERMITIDA'],
    ['remover relendo', relendo, 'remover', 'REMOCAO_NAO_PERMITIDA'],
    ['remover lido', lido, 'remover', 'REMOCAO_NAO_PERMITIDA'],
    ['remover abandonado', abandonado, 'remover', 'REMOCAO_NAO_PERMITIDA'],
    [
      'iniciar com leitura em andamento (lendo)',
      lendo,
      'iniciar',
      'LEITURA_EM_ANDAMENTO',
    ],
    [
      'iniciar com leitura em andamento (relendo)',
      relendo,
      'iniciar',
      'LEITURA_EM_ANDAMENTO',
    ],
    ['iniciar livro já concluído', lido, 'iniciar', 'LIVRO_JA_CONCLUIDO'],
    [
      'iniciar livro abandonado (deve retomar)',
      abandonado,
      'iniciar',
      'LEITURA_ABANDONADA_RETOMAVEL',
    ],
    [
      'iniciarReleitura fora da estante',
      foraDaEstante,
      'iniciarReleitura',
      'LIVRO_NAO_CONCLUIDO',
    ],
    [
      'iniciarReleitura quero_ler',
      queroLer,
      'iniciarReleitura',
      'LIVRO_NAO_CONCLUIDO',
    ],
    [
      'iniciarReleitura abandonado nunca concluído',
      abandonado,
      'iniciarReleitura',
      'LIVRO_NAO_CONCLUIDO',
    ],
    [
      'iniciarReleitura com leitura em andamento (lendo)',
      lendo,
      'iniciarReleitura',
      'LEITURA_EM_ANDAMENTO',
    ],
    [
      'iniciarReleitura com leitura em andamento (relendo)',
      relendo,
      'iniciarReleitura',
      'LEITURA_EM_ANDAMENTO',
    ],
    [
      'finalizar fora da estante',
      foraDaEstante,
      'finalizar',
      'SEM_LEITURA_EM_ANDAMENTO',
    ],
    ['finalizar quero_ler', queroLer, 'finalizar', 'SEM_LEITURA_EM_ANDAMENTO'],
    ['finalizar lido', lido, 'finalizar', 'SEM_LEITURA_EM_ANDAMENTO'],
    [
      'finalizar abandonado',
      abandonado,
      'finalizar',
      'SEM_LEITURA_EM_ANDAMENTO',
    ],
    [
      'abandonar fora da estante',
      foraDaEstante,
      'abandonar',
      'SEM_LEITURA_EM_ANDAMENTO',
    ],
    ['abandonar quero_ler', queroLer, 'abandonar', 'SEM_LEITURA_EM_ANDAMENTO'],
    ['abandonar lido', lido, 'abandonar', 'SEM_LEITURA_EM_ANDAMENTO'],
    [
      'abandonar abandonado',
      abandonado,
      'abandonar',
      'SEM_LEITURA_EM_ANDAMENTO',
    ],
    ['retomar fora da estante', foraDaEstante, 'retomar', 'NADA_A_RETOMAR'],
    ['retomar quero_ler', queroLer, 'retomar', 'NADA_A_RETOMAR'],
    ['retomar lendo', lendo, 'retomar', 'NADA_A_RETOMAR'],
    ['retomar relendo', relendo, 'retomar', 'NADA_A_RETOMAR'],
    ['retomar lido', lido, 'retomar', 'NADA_A_RETOMAR'],
    [
      'retomar releitura incompleta',
      lidoComReleituraIncompleta,
      'retomar',
      'NADA_A_RETOMAR',
    ],
    [
      'estado inconsistente: lendo sem ocorrência em andamento',
      { ...lendo, leituraAtual: null },
      'finalizar',
      'SEM_LEITURA_EM_ANDAMENTO',
    ],
    [
      'estado inconsistente: abandonado sem ocorrência abandonada',
      { ...abandonado, leituraAtual: null },
      'retomar',
      'NADA_A_RETOMAR',
    ],
  ];

  it.each(casos)('%s', (_, snapshot, evento, codigo) => {
    const erro = falha(snapshot, evento);
    expect(erro.tipo).toBe('TRANSICAO_INVALIDA');
    expect(erro.codigo).toBe(codigo);
    expect(erro.evento).toBe(evento);
    expect(erro.statusAtual).toBe(snapshot.status);
    expect(erro.motivo.length).toBeGreaterThan(0);
  });
});

describe('RN-05 — inatividade', () => {
  const inicio = new Date('2026-01-01T12:00:00Z');
  const diasDepois = (base: Date, dias: number) =>
    new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);

  it('expõe os limiares nomeados 20/30 (risco) e 40 (expiração)', () => {
    expect(LIMIARES_RISCO_DIAS).toEqual([20, 30]);
    expect(LIMIAR_EXPIRACAO_DIAS).toBe(40);
  });

  it.each([
    [19, []],
    [20, [{ dias: 20, tipo: 'risco' }]],
    [29, [{ dias: 20, tipo: 'risco' }]],
    [
      30,
      [
        { dias: 20, tipo: 'risco' },
        { dias: 30, tipo: 'risco' },
      ],
    ],
    [
      39,
      [
        { dias: 20, tipo: 'risco' },
        { dias: 30, tipo: 'risco' },
      ],
    ],
    [
      40,
      [
        { dias: 20, tipo: 'risco' },
        { dias: 30, tipo: 'risco' },
        { dias: 40, tipo: 'expiracao' },
      ],
    ],
    [
      41,
      [
        { dias: 20, tipo: 'risco' },
        { dias: 30, tipo: 'risco' },
        { dias: 40, tipo: 'expiracao' },
      ],
    ],
  ])('%i dias sem atividade → limiares devidos %j', (dias, esperado) => {
    const ultimaAtividade = new Date('2026-03-10T23:30:00Z');
    const resultado = avaliarInatividade({
      dataInicio: inicio,
      ultimaAtividadeEm: ultimaAtividade,
      dataReferencia: diasDepois(ultimaAtividade, dias),
    });
    expect(resultado.diasInativo).toBe(dias);
    expect(resultado.limiaresDevidos).toEqual(esperado);
  });

  it('sem atividade registrada conta desde a data de início', () => {
    const resultado = avaliarInatividade({
      dataInicio: inicio,
      ultimaAtividadeEm: null,
      dataReferencia: diasDepois(inicio, 20),
    });
    expect(resultado.diasInativo).toBe(20);
    expect(resultado.limiaresDevidos).toEqual([{ dias: 20, tipo: 'risco' }]);
  });

  it('dia incompleto não conta (19 dias e 23h ainda é dia 19)', () => {
    const referencia = new Date(
      diasDepois(inicio, 20).getTime() - 60 * 60 * 1000,
    );
    expect(
      avaliarInatividade({
        dataInicio: inicio,
        ultimaAtividadeEm: null,
        dataReferencia: referencia,
      }).diasInativo,
    ).toBe(19);
  });

  it('referência anterior à atividade resulta em zero dias', () => {
    const resultado = avaliarInatividade({
      dataInicio: inicio,
      ultimaAtividadeEm: inicio,
      dataReferencia: diasDepois(inicio, -2),
    });
    expect(resultado).toEqual({ diasInativo: 0, limiaresDevidos: [] });
  });
});
