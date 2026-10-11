import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const leituraSchema = pgSchema(process.env.DB_SCHEMA ?? 'leitura');

const criadoEm = () =>
  timestamp('criado_em', { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = () =>
  timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow();

export const estante = leituraSchema.table(
  'estante',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    livroId: uuid('livro_id').notNull(),
    status: text('status').notNull(),
    vezesLido: integer('vezes_lido').notNull().default(0),
    adicionadoEm: timestamp('adicionado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    atualizadoEm: atualizadoEm(),
  },
  (table) => [
    unique('estante_usuario_livro_uk').on(table.usuarioId, table.livroId),
    unique('estante_id_usuario_livro_uk').on(
      table.id,
      table.usuarioId,
      table.livroId,
    ),
    check(
      'estante_status_ck',
      sql`${table.status} in ('quero_ler', 'lendo', 'lido', 'relendo', 'abandonado')`,
    ),
    check('estante_vezes_lido_ck', sql`${table.vezesLido} >= 0`),
    index('estante_usuario_status_idx').on(table.usuarioId, table.status),
    index('estante_livro_idx').on(table.livroId),
  ],
);

export const leitura = leituraSchema.table(
  'leitura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    estanteId: uuid('estante_id').notNull(),
    usuarioId: uuid('usuario_id').notNull(),
    livroId: uuid('livro_id').notNull(),
    status: text('status').notNull(),
    releitura: boolean('releitura').notNull().default(false),
    incompleta: boolean('incompleta').notNull().default(false),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim'),
    finalizadaEm: timestamp('finalizada_em', { withTimezone: true }),
    finalizacaoFusoHorario: text('finalizacao_fuso_horario'),
    finalizacaoDataLocal: date('finalizacao_data_local'),
    paginaAtual: integer('pagina_atual').notNull().default(0),
    ultimaAtividadeEm: timestamp('ultima_atividade_em', {
      withTimezone: true,
    }).notNull(),
    inatividadeVersao: integer('inatividade_versao').notNull().default(1),
    criadoEm: criadoEm(),
  },
  (table) => [
    foreignKey({
      name: 'leitura_estante_usuario_livro_fk',
      columns: [table.estanteId, table.usuarioId, table.livroId],
      foreignColumns: [estante.id, estante.usuarioId, estante.livroId],
    }).onDelete('cascade'),
    uniqueIndex('leitura_em_andamento_usuario_livro_uk')
      .on(table.usuarioId, table.livroId)
      .where(sql`${table.status} = 'lendo'`),
    check(
      'leitura_status_ck',
      sql`${table.status} in ('lendo', 'lido', 'abandonado')`,
    ),
    check('leitura_pagina_atual_ck', sql`${table.paginaAtual} >= 0`),
    check('leitura_inatividade_versao_ck', sql`${table.inatividadeVersao} > 0`),
    check(
      'leitura_data_fim_ck',
      sql`${table.dataFim} is null or ${table.dataFim} >= ${table.dataInicio}`,
    ),
    check(
      'leitura_finalizacao_campos_ck',
      sql`(${table.finalizadaEm} is null and ${table.finalizacaoFusoHorario} is null and ${table.finalizacaoDataLocal} is null) or (${table.finalizadaEm} is not null and ${table.finalizacaoFusoHorario} is not null and ${table.finalizacaoDataLocal} is not null)`,
    ),
    check(
      'leitura_estado_ck',
      sql`(${table.status} = 'lendo' and ${table.dataFim} is null and ${table.finalizadaEm} is null and not ${table.incompleta}) or (${table.status} = 'abandonado' and not ${table.releitura} and not ${table.incompleta} and ${table.dataFim} is null and ${table.finalizadaEm} is null) or (${table.status} = 'lido' and ((${table.incompleta} and ${table.releitura} and ${table.dataFim} is null and ${table.finalizadaEm} is null) or (not ${table.incompleta} and ${table.dataFim} is not null and ${table.finalizadaEm} is not null)))`,
    ),
    index('leitura_estante_criado_idx').on(table.estanteId, table.criadoEm),
    index('leitura_usuario_data_fim_idx').on(table.usuarioId, table.dataFim),
    index('leitura_inatividade_idx').on(table.status, table.ultimaAtividadeEm),
    index('leitura_livro_idx').on(table.livroId),
  ],
);

export const limiarInatividade = leituraSchema.table(
  'limiar_inatividade',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leituraId: uuid('leitura_id')
      .notNull()
      .references(() => leitura.id, { onDelete: 'cascade' }),
    inatividadeVersao: integer('inatividade_versao').notNull(),
    limiarDias: integer('limiar_dias').notNull(),
    tipo: text('tipo').notNull(),
    eventId: uuid('event_id'),
    processadoEm: timestamp('processado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('limiar_inatividade_leitura_versao_dias_uk').on(
      table.leituraId,
      table.inatividadeVersao,
      table.limiarDias,
    ),
    uniqueIndex('limiar_inatividade_event_id_uk')
      .on(table.eventId)
      .where(sql`${table.eventId} is not null`),
    check(
      'limiar_inatividade_tipo_ck',
      sql`${table.tipo} in ('risco', 'expiracao')`,
    ),
    check(
      'limiar_inatividade_regra_ck',
      sql`(${table.limiarDias} in (20, 30) and ${table.tipo} = 'risco') or (${table.limiarDias} = 40 and ${table.tipo} = 'expiracao')`,
    ),
    check('limiar_inatividade_versao_ck', sql`${table.inatividadeVersao} > 0`),
  ],
);

export const atualizacaoProgresso = leituraSchema.table(
  'atualizacao_progresso',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leituraId: uuid('leitura_id')
      .notNull()
      .references(() => leitura.id, { onDelete: 'cascade' }),
    ordem: integer('ordem').notNull(),
    pagina: integer('pagina').notNull(),
    paginasLidas: integer('paginas_lidas').notNull(),
    minutos: integer('minutos').notNull(),
    registradoEmDispositivo: timestamp('registrado_em_dispositivo', {
      withTimezone: true,
    }).notNull(),
    fusoHorarioDispositivo: text('fuso_horario_dispositivo').notNull(),
    dataLocal: date('data_local').notNull(),
    chaveIdempotencia: text('chave_idempotencia').notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (table) => [
    unique('atualizacao_progresso_leitura_ordem_uk').on(
      table.leituraId,
      table.ordem,
    ),
    unique('atualizacao_progresso_chave_idempotencia_uk').on(
      table.chaveIdempotencia,
    ),
    check('atualizacao_progresso_ordem_ck', sql`${table.ordem} > 0`),
    check('atualizacao_progresso_pagina_ck', sql`${table.pagina} > 0`),
    check(
      'atualizacao_progresso_paginas_lidas_ck',
      sql`${table.paginasLidas} > 0`,
    ),
    check('atualizacao_progresso_minutos_ck', sql`${table.minutos} >= 0`),
    check(
      'atualizacao_progresso_atualizado_ck',
      sql`${table.atualizadoEm} >= ${table.criadoEm}`,
    ),
    index('atualizacao_progresso_data_local_idx').on(
      table.dataLocal,
      table.leituraId,
    ),
  ],
);

export const favorito = leituraSchema.table(
  'favorito',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    livroId: uuid('livro_id').notNull(),
    criadoEm: criadoEm(),
  },
  (table) => [
    unique('favorito_usuario_livro_uk').on(table.usuarioId, table.livroId),
    index('favorito_livro_idx').on(table.livroId),
  ],
);

export const nota = leituraSchema.table(
  'nota',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    livroId: uuid('livro_id').notNull(),
    valor: numeric('valor', {
      precision: 2,
      scale: 1,
      mode: 'number',
    }).notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (table) => [
    unique('nota_usuario_livro_uk').on(table.usuarioId, table.livroId),
    check(
      'nota_valor_ck',
      sql`${table.valor} >= 0 and ${table.valor} <= 5 and mod(${table.valor}, 0.5) = 0`,
    ),
    index('nota_livro_idx').on(table.livroId),
  ],
);

export const resenha = leituraSchema.table(
  'resenha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    livroId: uuid('livro_id').notNull(),
    texto: text('texto').notNull(),
    spoiler: boolean('spoiler').notNull().default(false),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (table) => [
    unique('resenha_usuario_livro_uk').on(table.usuarioId, table.livroId),
    check(
      'resenha_texto_ck',
      sql`char_length(${table.texto}) between 1 and 5000`,
    ),
    index('resenha_livro_criado_idx').on(table.livroId, table.criadoEm),
  ],
);

export const reacaoResenha = leituraSchema.table(
  'reacao_resenha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resenhaId: uuid('resenha_id')
      .notNull()
      .references(() => resenha.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id').notNull(),
    tipo: text('tipo').notNull(),
    ativa: boolean('ativa').notNull().default(true),
    primeiraCurtidaEm: timestamp('primeira_curtida_em', { withTimezone: true }),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (table) => [
    unique('reacao_resenha_resenha_usuario_uk').on(
      table.resenhaId,
      table.usuarioId,
    ),
    check(
      'reacao_resenha_tipo_ck',
      sql`${table.tipo} in ('curtida', 'descurtida')`,
    ),
    check(
      'reacao_resenha_primeira_curtida_ck',
      sql`${table.tipo} <> 'curtida' or ${table.primeiraCurtidaEm} is not null`,
    ),
    index('reacao_resenha_contagem_idx').on(
      table.resenhaId,
      table.ativa,
      table.tipo,
    ),
    index('reacao_resenha_usuario_idx').on(table.usuarioId),
  ],
);

export const frase = leituraSchema.table(
  'frase',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    livroId: uuid('livro_id').notNull(),
    texto: text('texto').notNull(),
    pagina: integer('pagina').notNull(),
    criadoEm: criadoEm(),
  },
  (table) => [
    check('frase_texto_ck', sql`char_length(${table.texto}) between 1 and 500`),
    check('frase_pagina_ck', sql`${table.pagina} > 0`),
    index('frase_usuario_livro_idx').on(table.usuarioId, table.livroId),
    index('frase_livro_idx').on(table.livroId),
  ],
);

export const desafio = leituraSchema.table(
  'desafio',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').notNull(),
    unidade: text('unidade').notNull(),
    janela: text('janela').notNull(),
    valorAlvo: integer('valor_alvo').notNull(),
    fusoHorario: text('fuso_horario').notNull(),
    pausado: boolean('pausado').notNull().default(false),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (table) => [
    check(
      'desafio_unidade_ck',
      sql`${table.unidade} in ('paginas', 'minutos', 'livros')`,
    ),
    check(
      'desafio_janela_ck',
      sql`${table.janela} in ('diaria', 'semanal', 'mensal', 'anual')`,
    ),
    check('desafio_valor_alvo_ck', sql`${table.valorAlvo} > 0`),
    index('desafio_usuario_idx').on(table.usuarioId, table.criadoEm),
  ],
);

export const janelaDesafio = leituraSchema.table(
  'janela_desafio',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    desafioId: uuid('desafio_id')
      .notNull()
      .references(() => desafio.id, { onDelete: 'cascade' }),
    inicio: date('inicio').notNull(),
    fim: date('fim').notNull(),
    unidade: text('unidade').notNull(),
    periodicidade: text('periodicidade').notNull(),
    valorAlvo: integer('valor_alvo').notNull(),
    fusoHorario: text('fuso_horario').notNull(),
    acumulado: integer('acumulado').notNull().default(0),
    cumprida: boolean('cumprida').notNull().default(false),
    encerradaEm: timestamp('encerrada_em', { withTimezone: true }),
    recalculadaEm: timestamp('recalculada_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('janela_desafio_periodo_uk').on(
      table.desafioId,
      table.inicio,
      table.fim,
    ),
    check(
      'janela_desafio_unidade_ck',
      sql`${table.unidade} in ('paginas', 'minutos', 'livros')`,
    ),
    check(
      'janela_desafio_periodicidade_ck',
      sql`${table.periodicidade} in ('diaria', 'semanal', 'mensal', 'anual')`,
    ),
    check('janela_desafio_periodo_ck', sql`${table.fim} >= ${table.inicio}`),
    check('janela_desafio_valor_alvo_ck', sql`${table.valorAlvo} > 0`),
    check('janela_desafio_acumulado_ck', sql`${table.acumulado} >= 0`),
    check(
      'janela_desafio_cumprida_ck',
      sql`${table.cumprida} = (${table.acumulado} >= ${table.valorAlvo})`,
    ),
    index('janela_desafio_corrente_idx').on(table.desafioId, table.encerradaEm),
  ],
);

export const contribuicaoDesafio = leituraSchema.table(
  'contribuicao_desafio',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    janelaId: uuid('janela_id')
      .notNull()
      .references(() => janelaDesafio.id, { onDelete: 'cascade' }),
    origemTipo: text('origem_tipo').notNull(),
    origemId: uuid('origem_id').notNull(),
    valor: integer('valor').notNull(),
    ocorridoEm: timestamp('ocorrido_em', { withTimezone: true }).notNull(),
    dataLocal: date('data_local').notNull(),
    criadoEm: criadoEm(),
  },
  (table) => [
    unique('contribuicao_desafio_origem_uk').on(
      table.janelaId,
      table.origemTipo,
      table.origemId,
    ),
    check(
      'contribuicao_desafio_origem_tipo_ck',
      sql`${table.origemTipo} in ('progresso', 'leitura_finalizada')`,
    ),
    check('contribuicao_desafio_valor_ck', sql`${table.valor} > 0`),
    index('contribuicao_desafio_data_idx').on(table.janelaId, table.dataLocal),
    index('contribuicao_desafio_origem_idx').on(
      table.origemTipo,
      table.origemId,
    ),
  ],
);

export const pausaDesafio = leituraSchema.table(
  'pausa_desafio',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    desafioId: uuid('desafio_id')
      .notNull()
      .references(() => desafio.id, { onDelete: 'cascade' }),
    inicioEm: timestamp('inicio_em', { withTimezone: true }).notNull(),
    fimEm: timestamp('fim_em', { withTimezone: true }),
  },
  (table) => [
    check(
      'pausa_desafio_periodo_ck',
      sql`${table.fimEm} is null or ${table.fimEm} > ${table.inicioEm}`,
    ),
    uniqueIndex('pausa_desafio_aberta_uk')
      .on(table.desafioId)
      .where(sql`${table.fimEm} is null`),
    index('pausa_desafio_periodo_idx').on(table.desafioId, table.inicioEm),
  ],
);

export const sequenciaLeitura = leituraSchema.table(
  'sequencia_leitura',
  {
    usuarioId: uuid('usuario_id').primaryKey(),
    sequenciaAtual: integer('sequencia_atual').notNull().default(0),
    maiorSequencia: integer('maior_sequencia').notNull().default(0),
    ultimoDia: date('ultimo_dia'),
    ultimoFusoHorario: text('ultimo_fuso_horario'),
    ultimoFusoRegistradoEm: timestamp('ultimo_fuso_registrado_em', {
      withTimezone: true,
    }),
    atualizadoEm: atualizadoEm(),
  },
  (table) => [
    check(
      'sequencia_leitura_valores_ck',
      sql`${table.sequenciaAtual} >= 0 and ${table.maiorSequencia} >= ${table.sequenciaAtual}`,
    ),
    check(
      'sequencia_leitura_ultimo_registro_ck',
      sql`(${table.ultimoDia} is null and ${table.ultimoFusoHorario} is null and ${table.ultimoFusoRegistradoEm} is null) or (${table.ultimoDia} is not null and ${table.ultimoFusoHorario} is not null and ${table.ultimoFusoRegistradoEm} is not null)`,
    ),
  ],
);

export const diaLeitura = leituraSchema.table(
  'dia_leitura',
  {
    usuarioId: uuid('usuario_id').notNull(),
    data: date('data').notNull(),
  },
  (table) => [
    primaryKey({
      name: 'dia_leitura_pk',
      columns: [table.usuarioId, table.data],
    }),
    index('dia_leitura_data_idx').on(table.data),
  ],
);

export const estatisticaAnual = leituraSchema.table(
  'estatistica_anual',
  {
    usuarioId: uuid('usuario_id').notNull(),
    ano: integer('ano').notNull(),
    livrosConcluidos: integer('livros_concluidos').notNull().default(0),
    paginasLidas: integer('paginas_lidas').notNull().default(0),
    minutosLidos: integer('minutos_lidos').notNull().default(0),
    recalculadoEm: timestamp('recalculado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'estatistica_anual_pk',
      columns: [table.usuarioId, table.ano],
    }),
    check('estatistica_anual_ano_ck', sql`${table.ano} between 1 and 9999`),
    check(
      'estatistica_anual_totais_ck',
      sql`${table.livrosConcluidos} >= 0 and ${table.paginasLidas} >= 0 and ${table.minutosLidos} >= 0`,
    ),
  ],
);

export const estatisticaMensal = leituraSchema.table(
  'estatistica_mensal',
  {
    usuarioId: uuid('usuario_id').notNull(),
    ano: integer('ano').notNull(),
    mes: integer('mes').notNull(),
    livrosConcluidos: integer('livros_concluidos').notNull().default(0),
    paginasLidas: integer('paginas_lidas').notNull().default(0),
    minutosLidos: integer('minutos_lidos').notNull().default(0),
    recalculadoEm: timestamp('recalculado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'estatistica_mensal_pk',
      columns: [table.usuarioId, table.ano, table.mes],
    }),
    check('estatistica_mensal_ano_ck', sql`${table.ano} between 1 and 9999`),
    check('estatistica_mensal_mes_ck', sql`${table.mes} between 1 and 12`),
    check(
      'estatistica_mensal_totais_ck',
      sql`${table.livrosConcluidos} >= 0 and ${table.paginasLidas} >= 0 and ${table.minutosLidos} >= 0`,
    ),
  ],
);

export const estatisticaUsuario = leituraSchema.table(
  'estatistica_usuario',
  {
    usuarioId: uuid('usuario_id').primaryKey(),
    livrosConcluidos: integer('livros_concluidos').notNull().default(0),
    paginasLidas: integer('paginas_lidas').notNull().default(0),
    minutosLidos: integer('minutos_lidos').notNull().default(0),
    diasComLeitura: integer('dias_com_leitura').notNull().default(0),
    diasEmLivrosConcluidos: integer('dias_em_livros_concluidos')
      .notNull()
      .default(0),
    notaMedia: numeric('nota_media', {
      precision: 2,
      scale: 1,
      mode: 'number',
    }),
    recalculadoEm: timestamp('recalculado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'estatistica_usuario_totais_ck',
      sql`${table.livrosConcluidos} >= 0 and ${table.paginasLidas} >= 0 and ${table.minutosLidos} >= 0 and ${table.diasComLeitura} >= 0 and ${table.diasEmLivrosConcluidos} >= 0`,
    ),
    check(
      'estatistica_usuario_nota_media_ck',
      sql`${table.notaMedia} is null or (${table.notaMedia} >= 0 and ${table.notaMedia} <= 5)`,
    ),
  ],
);

export const idempotenciaLeitura = leituraSchema.table(
  'idempotencia_leitura',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectRef: uuid('subject_ref'),
    operacao: text('operacao').notNull(),
    chave: text('chave'),
    payloadHash: text('payload_hash'),
    statusHttp: integer('status_http').notNull(),
    resposta: jsonb('resposta'),
    criadoEm: criadoEm(),
    replayAte: timestamp('replay_ate', { withTimezone: true }).notNull(),
    anonimizadoEm: timestamp('anonimizado_em', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idempotencia_leitura_subject_operacao_chave_uk')
      .on(table.subjectRef, table.operacao, table.chave)
      .where(
        sql`${table.subjectRef} is not null and ${table.chave} is not null`,
      ),
    check(
      'idempotencia_leitura_operacao_ck',
      sql`char_length(${table.operacao}) > 0`,
    ),
    check(
      'idempotencia_leitura_status_http_ck',
      sql`${table.statusHttp} between 100 and 599`,
    ),
    check(
      'idempotencia_leitura_replay_ck',
      sql`${table.replayAte} >= ${table.criadoEm}`,
    ),
    check(
      'idempotencia_leitura_anonimizacao_ck',
      sql`(${table.anonimizadoEm} is null and ${table.subjectRef} is not null and ${table.chave} is not null and btrim(${table.chave}) <> '' and ${table.payloadHash} is not null and btrim(${table.payloadHash}) <> '' and ${table.resposta} is not null) or (${table.anonimizadoEm} is not null and ${table.anonimizadoEm} >= ${table.criadoEm} and ${table.subjectRef} is null and ${table.chave} is null and ${table.payloadHash} is null and ${table.resposta} is null)`,
    ),
    index('idempotencia_leitura_replay_idx').on(table.replayAte),
  ],
);

export const outboxLeitura = leituraSchema.table(
  'outbox_leitura',
  {
    eventId: uuid('event_id').primaryKey().defaultRandom(),
    tipo: text('tipo').notNull(),
    versao: integer('versao').notNull(),
    chaveNegocio: text('chave_negocio'),
    correlationId: uuid('correlation_id'),
    payload: jsonb('payload'),
    status: text('status').notNull().default('pendente'),
    tentativas: integer('tentativas').notNull().default(0),
    criadoEm: criadoEm(),
    proximaTentativaEm: timestamp('proxima_tentativa_em', {
      withTimezone: true,
    }),
    publicadoEm: timestamp('publicado_em', { withTimezone: true }),
    anonimizadoEm: timestamp('anonimizado_em', { withTimezone: true }),
  },
  (table) => [
    check('outbox_leitura_tipo_ck', sql`char_length(${table.tipo}) > 0`),
    check('outbox_leitura_versao_ck', sql`${table.versao} > 0`),
    check(
      'outbox_leitura_status_ck',
      sql`${table.status} in ('pendente', 'publicado')`,
    ),
    check('outbox_leitura_tentativas_ck', sql`${table.tentativas} >= 0`),
    check(
      'outbox_leitura_publicacao_ck',
      sql`(${table.status} = 'pendente' and ${table.publicadoEm} is null) or (${table.status} = 'publicado' and ${table.publicadoEm} is not null and ${table.publicadoEm} >= ${table.criadoEm})`,
    ),
    check(
      'outbox_leitura_anonimizacao_ck',
      sql`(${table.anonimizadoEm} is null and ${table.chaveNegocio} is not null and btrim(${table.chaveNegocio}) <> '' and ${table.correlationId} is not null and ${table.payload} is not null) or (${table.anonimizadoEm} is not null and ${table.anonimizadoEm} >= ${table.criadoEm} and ${table.status} = 'publicado' and ${table.chaveNegocio} is null and ${table.correlationId} is null and ${table.payload} is null)`,
    ),
    index('outbox_leitura_dispatch_idx').on(table.status, table.criadoEm),
  ],
);

export const vEstantePublicaV1 = leituraSchema.view('v_estante_publica_v1', {
  usuarioId: uuid('usuario_id').notNull(),
  livroId: uuid('livro_id').notNull(),
  status: text('status').notNull(),
  vezesLido: integer('vezes_lido').notNull(),
}).as(sql`select
    ${estante.usuarioId} as usuario_id,
    ${estante.livroId} as livro_id,
    ${estante.status} as status,
    ${estante.vezesLido} as vezes_lido
  from ${estante}`);

export const vResenhaPublicacaoV1 = leituraSchema.view(
  'v_resenha_publicacao_v1',
  {
    resenhaId: uuid('resenha_id').notNull(),
    usuarioId: uuid('usuario_id').notNull(),
    livroId: uuid('livro_id').notNull(),
    texto: text('texto').notNull(),
    spoiler: boolean('spoiler').notNull(),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull(),
    curtidas: bigint('curtidas', { mode: 'number' }).notNull(),
    descurtidas: bigint('descurtidas', { mode: 'number' }).notNull(),
  },
).as(sql`select
    ${resenha.id} as resenha_id,
    ${resenha.usuarioId} as usuario_id,
    ${resenha.livroId} as livro_id,
    ${resenha.texto} as texto,
    ${resenha.spoiler} as spoiler,
    ${resenha.criadoEm} as criado_em,
    ${resenha.atualizadoEm} as atualizado_em,
    count(${reacaoResenha.id}) filter (where ${reacaoResenha.ativa} and ${reacaoResenha.tipo} = 'curtida') as curtidas,
    count(${reacaoResenha.id}) filter (where ${reacaoResenha.ativa} and ${reacaoResenha.tipo} = 'descurtida') as descurtidas
  from ${resenha}
  left join ${reacaoResenha} on ${reacaoResenha.resenhaId} = ${resenha.id}
  group by ${resenha.id}`);

/**
 * Reação ativa de cada leitor a cada resenha (F-AVA-2). O `acervo` lê esta VIEW para devolver,
 * junto das resenhas da página do livro, a reação de quem está vendo (`minhaReacao`). Reação
 * retirada (`ativa = false`) não aparece, igual às contagens de `v_resenha_publicacao_v1`.
 */
export const vReacaoResenhaV1 = leituraSchema.view('v_reacao_resenha_v1', {
  resenhaId: uuid('resenha_id').notNull(),
  usuarioId: uuid('usuario_id').notNull(),
  tipo: text('tipo').notNull(),
}).as(sql`select
    ${reacaoResenha.resenhaId} as resenha_id,
    ${reacaoResenha.usuarioId} as usuario_id,
    ${reacaoResenha.tipo} as tipo
  from ${reacaoResenha}
  where ${reacaoResenha.ativa}`);

export const vNotaPublicacaoV1 = leituraSchema.view('v_nota_publicacao_v1', {
  usuarioId: uuid('usuario_id').notNull(),
  livroId: uuid('livro_id').notNull(),
  valor: numeric('valor', {
    precision: 2,
    scale: 1,
    mode: 'number',
  }).notNull(),
}).as(sql`select
    ${nota.usuarioId} as usuario_id,
    ${nota.livroId} as livro_id,
    ${nota.valor} as valor
  from ${nota}`);
