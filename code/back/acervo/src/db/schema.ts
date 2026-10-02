import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const acervoSchema = pgSchema(process.env.DB_SCHEMA ?? 'acervo');

const timestamps = {
  criadoEm: timestamp('criado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
  atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const editora = acervoSchema.table(
  'editora',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    nomeNormalizado: text('nome_normalizado').notNull(),
  },
  (table) => [
    uniqueIndex('editora_nome_normalizado_uidx').on(table.nomeNormalizado),
    check('editora_nome_nao_vazio_ck', sql`btrim(${table.nome}) <> ''`),
    check(
      'editora_nome_normalizado_nao_vazio_ck',
      sql`btrim(${table.nomeNormalizado}) <> ''`,
    ),
  ],
);

export const serie = acervoSchema.table(
  'serie',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    nomeNormalizado: text('nome_normalizado').notNull(),
  },
  (table) => [
    uniqueIndex('serie_nome_normalizado_uidx').on(table.nomeNormalizado),
    check('serie_nome_nao_vazio_ck', sql`btrim(${table.nome}) <> ''`),
    check(
      'serie_nome_normalizado_nao_vazio_ck',
      sql`btrim(${table.nomeNormalizado}) <> ''`,
    ),
  ],
);

export const livro = acervoSchema.table(
  'livro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    isbn13: text('isbn13'),
    olEditionKey: text('ol_edition_key'),
    olWorkKey: text('ol_work_key'),
    titulo: text('titulo').notNull(),
    autorInformado: text('autor_informado'),
    anoPublicacao: integer('ano_publicacao'),
    paginas: integer('paginas').notNull(),
    sinopse: text('sinopse'),
    sinopseStatus: text('sinopse_status').notNull().default('nao_consultada'),
    capaUrlExterna: text('capa_url_externa'),
    capaUrlPropria: text('capa_url_propria'),
    capaAssetId: text('capa_asset_id'),
    notaGeral: numeric('nota_geral', { precision: 2, scale: 1 }),
    notaGeralQtd: integer('nota_geral_qtd'),
    tipo: text('tipo').notNull(),
    donoId: uuid('dono_id'),
    editoraId: uuid('editora_id').references(() => editora.id, {
      onDelete: 'set null',
    }),
    serieId: uuid('serie_id').references(() => serie.id, {
      onDelete: 'set null',
    }),
    numeroSerie: integer('numero_serie'),
    ativo: boolean('ativo').notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('livro_isbn13_uidx')
      .on(table.isbn13)
      .where(sql`${table.isbn13} IS NOT NULL`),
    uniqueIndex('livro_ol_edition_key_uidx')
      .on(table.olEditionKey)
      .where(sql`${table.olEditionKey} IS NOT NULL`),
    index('livro_titulo_normalizado_idx')
      .on(sql`lower(${table.titulo})`)
      .where(sql`${table.tipo} = 'oficial' AND ${table.ativo}`),
    index('livro_editora_id_idx')
      .on(table.editoraId)
      .where(sql`${table.editoraId} IS NOT NULL`),
    index('livro_serie_id_numero_idx')
      .on(table.serieId, table.numeroSerie)
      .where(sql`${table.serieId} IS NOT NULL`),
    index('livro_ol_work_key_idx')
      .on(table.olWorkKey)
      .where(sql`${table.olWorkKey} IS NOT NULL`),
    index('livro_dono_id_idx')
      .on(table.donoId)
      .where(sql`${table.donoId} IS NOT NULL`),
    check('livro_tipo_ck', sql`${table.tipo} IN ('oficial', 'pessoal')`),
    check(
      'livro_sinopse_status_ck',
      sql`${table.sinopseStatus} IN ('nao_consultada', 'pendente', 'disponivel', 'ausente', 'falha_transitoria')`,
    ),
    check('livro_titulo_nao_vazio_ck', sql`btrim(${table.titulo}) <> ''`),
    check('livro_paginas_positivas_ck', sql`${table.paginas} > 0`),
    check(
      'livro_ano_publicacao_ck',
      sql`${table.anoPublicacao} IS NULL OR ${table.anoPublicacao} > 0`,
    ),
    check(
      'livro_numero_serie_ck',
      sql`${table.numeroSerie} IS NULL OR ${table.numeroSerie} > 0`,
    ),
    check(
      'livro_numero_serie_exige_serie_ck',
      sql`${table.numeroSerie} IS NULL OR ${table.serieId} IS NOT NULL`,
    ),
    check(
      'livro_sinopse_limite_ck',
      sql`${table.sinopse} IS NULL OR char_length(${table.sinopse}) <= 4000`,
    ),
    check(
      'livro_sinopse_conteudo_status_ck',
      sql`(${table.sinopseStatus} = 'disponivel') = (${table.sinopse} IS NOT NULL)`,
    ),
    check(
      'livro_nota_geral_ck',
      sql`${table.notaGeral} IS NULL OR (${table.notaGeral} >= 0 AND ${table.notaGeral} <= 5)`,
    ),
    check(
      'livro_nota_geral_qtd_ck',
      sql`${table.notaGeralQtd} IS NULL OR ${table.notaGeralQtd} >= 0`,
    ),
    check(
      'livro_nota_geral_par_ck',
      sql`(${table.notaGeral} IS NULL) = (${table.notaGeralQtd} IS NULL)`,
    ),
    check(
      'livro_isbn13_formato_ck',
      sql`${table.isbn13} IS NULL OR ${table.isbn13} ~ '^[0-9]{13}$'`,
    ),
    check(
      'livro_oficial_pessoal_ck',
      sql`(
        ${table.tipo} = 'oficial'
        AND ${table.isbn13} IS NOT NULL
        AND ${table.donoId} IS NULL
        AND ${table.autorInformado} IS NULL
        AND ${table.capaUrlExterna} IS NOT NULL
        AND btrim(${table.capaUrlExterna}) <> ''
        AND ${table.ativo}
      ) OR (
        ${table.tipo} = 'pessoal'
        AND ${table.isbn13} IS NULL
        AND ${table.olEditionKey} IS NULL
        AND ${table.olWorkKey} IS NULL
        AND ${table.donoId} IS NOT NULL
        AND ${table.autorInformado} IS NOT NULL
        AND btrim(${table.autorInformado}) <> ''
        AND ${table.capaUrlExterna} IS NULL
        AND ${table.editoraId} IS NULL
        AND ${table.serieId} IS NULL
        AND ${table.numeroSerie} IS NULL
        AND ${table.notaGeral} IS NULL
        AND ${table.notaGeralQtd} IS NULL
        AND ${table.sinopseStatus} IN ('disponivel', 'ausente')
      )`,
    ),
    check(
      'livro_capa_propria_asset_ck',
      sql`(${table.capaUrlPropria} IS NULL) = (${table.capaAssetId} IS NULL)`,
    ),
  ],
);

export const autor = acervoSchema.table(
  'autor',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    nomeNormalizado: text('nome_normalizado').notNull(),
    olAuthorKey: text('ol_author_key'),
    biografia: text('biografia'),
  },
  (table) => [
    uniqueIndex('autor_ol_author_key_uidx')
      .on(table.olAuthorKey)
      .where(sql`${table.olAuthorKey} IS NOT NULL`),
    uniqueIndex('autor_nome_normalizado_sem_chave_uidx')
      .on(table.nomeNormalizado)
      .where(sql`${table.olAuthorKey} IS NULL`),
    index('autor_nome_normalizado_idx').on(table.nomeNormalizado),
    check('autor_nome_nao_vazio_ck', sql`btrim(${table.nome}) <> ''`),
    check(
      'autor_nome_normalizado_nao_vazio_ck',
      sql`btrim(${table.nomeNormalizado}) <> ''`,
    ),
    // F-ACV-DESCOBERTA: biografia curta da OpenLibrary (RF-ACV-10), cortada
    // pela ingestão e pela importação antes de gravar; vazia vira NULL.
    check(
      'autor_biografia_ck',
      sql`${table.biografia} IS NULL OR (char_length(${table.biografia}) <= 2000 AND btrim(${table.biografia}) <> '')`,
    ),
  ],
);

export const assunto = acervoSchema.table(
  'assunto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nome: text('nome').notNull(),
    slug: text('slug').notNull(),
  },
  (table) => [
    uniqueIndex('assunto_slug_uidx').on(table.slug),
    index('assunto_nome_normalizado_idx').on(sql`lower(${table.nome})`),
    check('assunto_nome_nao_vazio_ck', sql`btrim(${table.nome}) <> ''`),
    check(
      'assunto_slug_formato_ck',
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);

export const livroAutor = acervoSchema.table(
  'livro_autor',
  {
    livroId: uuid('livro_id')
      .notNull()
      .references(() => livro.id, { onDelete: 'cascade' }),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => autor.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({
      name: 'livro_autor_pk',
      columns: [table.livroId, table.autorId],
    }),
    index('livro_autor_autor_id_idx').on(table.autorId),
  ],
);

export const livroAssunto = acervoSchema.table(
  'livro_assunto',
  {
    livroId: uuid('livro_id')
      .notNull()
      .references(() => livro.id, { onDelete: 'cascade' }),
    assuntoId: uuid('assunto_id')
      .notNull()
      .references(() => assunto.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({
      name: 'livro_assunto_pk',
      columns: [table.livroId, table.assuntoId],
    }),
    index('livro_assunto_assunto_id_idx').on(table.assuntoId),
  ],
);

export const notaLeitorProjecao = acervoSchema.table(
  'nota_leitor_projecao',
  {
    usuarioId: uuid('usuario_id').notNull(),
    livroId: uuid('livro_id')
      .notNull()
      .references(() => livro.id, { onDelete: 'cascade' }),
    valor: numeric('valor', { precision: 2, scale: 1 }).notNull(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'nota_leitor_projecao_pk',
      columns: [table.usuarioId, table.livroId],
    }),
    index('nota_leitor_projecao_livro_id_idx').on(table.livroId),
    check(
      'nota_leitor_projecao_valor_ck',
      sql`${table.valor} >= 0 AND ${table.valor} <= 5 AND mod(${table.valor} * 2, 1) = 0`,
    ),
  ],
);

export const notaLivroAgregada = acervoSchema.table(
  'nota_livro_agregada',
  {
    livroId: uuid('livro_id')
      .primaryKey()
      .references(() => livro.id, { onDelete: 'cascade' }),
    media: numeric('media', { precision: 3, scale: 2 }).notNull(),
    quantidade: integer('quantidade').notNull(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'nota_livro_agregada_media_ck',
      sql`${table.media} >= 0 AND ${table.media} <= 5`,
    ),
    check('nota_livro_agregada_quantidade_ck', sql`${table.quantidade} > 0`),
  ],
);

export const importacaoLivro = acervoSchema.table(
  'importacao_livro',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    solicitanteId: uuid('solicitante_id').notNull(),
    isbn13: text('isbn13').notNull(),
    estado: text('estado').notNull().default('pendente'),
    livroId: uuid('livro_id').references(() => livro.id, {
      onDelete: 'restrict',
    }),
    erro: text('erro'),
    ...timestamps,
  },
  (table) => [
    index('importacao_livro_solicitante_id_idx').on(table.solicitanteId),
    index('importacao_livro_isbn13_idx').on(table.isbn13),
    index('importacao_livro_estado_criado_em_idx').on(
      table.estado,
      table.criadoEm,
    ),
    check(
      'importacao_livro_isbn13_formato_ck',
      sql`${table.isbn13} ~ '^[0-9]{13}$'`,
    ),
    check(
      'importacao_livro_estado_ck',
      sql`${table.estado} IN ('pendente', 'concluida', 'nao_encontrado', 'falha_transitoria')`,
    ),
    check(
      'importacao_livro_resultado_ck',
      sql`(
        ${table.estado} = 'pendente'
        AND ${table.livroId} IS NULL
        AND ${table.erro} IS NULL
      ) OR (
        ${table.estado} = 'concluida'
        AND ${table.livroId} IS NOT NULL
        AND ${table.erro} IS NULL
      ) OR (
        ${table.estado} = 'nao_encontrado'
        AND ${table.livroId} IS NULL
      ) OR (
        ${table.estado} = 'falha_transitoria'
        AND ${table.livroId} IS NULL
        AND ${table.erro} IS NOT NULL
        AND btrim(${table.erro}) <> ''
      )`,
    ),
  ],
);

export const sinonimoEditora = acervoSchema.table(
  'sinonimo_editora',
  {
    formaExterna: text('forma_externa').primaryKey(),
    editoraId: uuid('editora_id')
      .notNull()
      .references(() => editora.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('sinonimo_editora_editora_id_idx').on(table.editoraId),
    check(
      'sinonimo_editora_forma_externa_nao_vazia_ck',
      sql`btrim(${table.formaExterna}) <> ''`,
    ),
  ],
);

export const mapaAssuntoExterno = acervoSchema.table(
  'mapa_assunto_externo',
  {
    tagExterna: text('tag_externa').primaryKey(),
    assuntoId: uuid('assunto_id')
      .notNull()
      .references(() => assunto.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('mapa_assunto_externo_assunto_id_idx').on(table.assuntoId),
    check(
      'mapa_assunto_externo_tag_externa_nao_vazia_ck',
      sql`btrim(${table.tagExterna}) <> ''`,
    ),
  ],
);

export const ingestaoExecucao = acervoSchema.table(
  'ingestao_execucao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: text('tipo').notNull(),
    status: text('status').notNull().default('em_execucao'),
    totalProcessados: integer('total_processados').notNull().default(0),
    totalDescartados: integer('total_descartados').notNull().default(0),
    totalInseridos: integer('total_inseridos').notNull().default(0),
    iniciadoEm: timestamp('iniciado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    finalizadoEm: timestamp('finalizado_em', { withTimezone: true }),
  },
  (table) => [
    index('ingestao_execucao_status_iniciado_em_idx').on(
      table.status,
      table.iniciadoEm,
    ),
    check(
      'ingestao_execucao_tipo_ck',
      sql`${table.tipo} IN ('carga_inicial', 'recarga')`,
    ),
    check(
      'ingestao_execucao_status_ck',
      sql`${table.status} IN ('em_execucao', 'concluida', 'falha')`,
    ),
    check(
      'ingestao_execucao_totais_ck',
      sql`${table.totalProcessados} >= 0
        AND ${table.totalDescartados} >= 0
        AND ${table.totalInseridos} >= 0
        AND ${table.totalDescartados} + ${table.totalInseridos} <= ${table.totalProcessados}`,
    ),
    check(
      'ingestao_execucao_finalizacao_ck',
      sql`(
        ${table.status} = 'em_execucao' AND ${table.finalizadoEm} IS NULL
      ) OR (
        ${table.status} IN ('concluida', 'falha')
        AND ${table.finalizadoEm} IS NOT NULL
        AND ${table.finalizadoEm} >= ${table.iniciadoEm}
      )`,
    ),
  ],
);

export const idempotenciaAcervo = acervoSchema.table(
  'idempotencia_acervo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectRef: uuid('subject_ref'),
    operacao: text('operacao').notNull(),
    chave: text('chave'),
    payloadHash: text('payload_hash'),
    statusHttp: integer('status_http').notNull(),
    resposta: jsonb('resposta'),
    criadoEm: timestamp('criado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    replayAte: timestamp('replay_ate', { withTimezone: true }).notNull(),
    anonimizadoEm: timestamp('anonimizado_em', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idempotencia_acervo_ledger_uidx')
      .on(table.subjectRef, table.operacao, table.chave)
      .where(sql`${table.anonimizadoEm} IS NULL`),
    index('idempotencia_acervo_replay_ate_idx')
      .on(table.replayAte)
      .where(sql`${table.anonimizadoEm} IS NULL`),
    check(
      'idempotencia_acervo_operacao_nao_vazia_ck',
      sql`btrim(${table.operacao}) <> ''`,
    ),
    check(
      'idempotencia_acervo_status_http_ck',
      sql`${table.statusHttp} BETWEEN 100 AND 599`,
    ),
    check(
      'idempotencia_acervo_replay_ck',
      sql`${table.replayAte} >= ${table.criadoEm}`,
    ),
    check(
      'idempotencia_acervo_anonimizacao_ck',
      sql`(
        ${table.anonimizadoEm} IS NULL
        AND ${table.subjectRef} IS NOT NULL
        AND ${table.chave} IS NOT NULL
        AND btrim(${table.chave}) <> ''
        AND ${table.payloadHash} IS NOT NULL
        AND btrim(${table.payloadHash}) <> ''
        AND ${table.resposta} IS NOT NULL
      ) OR (
        ${table.anonimizadoEm} IS NOT NULL
        AND ${table.anonimizadoEm} >= ${table.criadoEm}
        AND ${table.subjectRef} IS NULL
        AND ${table.chave} IS NULL
        AND ${table.payloadHash} IS NULL
        AND ${table.resposta} IS NULL
      )`,
    ),
  ],
);

export const outboxAcervo = acervoSchema.table(
  'outbox_acervo',
  {
    eventId: uuid('event_id').primaryKey().defaultRandom(),
    tipo: text('tipo').notNull(),
    versao: integer('versao').notNull(),
    chaveNegocio: text('chave_negocio'),
    correlationId: uuid('correlation_id'),
    payload: jsonb('payload'),
    status: text('status').notNull().default('pendente'),
    tentativas: integer('tentativas').notNull().default(0),
    criadoEm: timestamp('criado_em', { withTimezone: true })
      .notNull()
      .defaultNow(),
    proximaTentativaEm: timestamp('proxima_tentativa_em', {
      withTimezone: true,
    }),
    publicadoEm: timestamp('publicado_em', { withTimezone: true }),
    anonimizadoEm: timestamp('anonimizado_em', { withTimezone: true }),
  },
  (table) => [
    index('outbox_acervo_pendente_idx')
      .on(table.criadoEm)
      .where(sql`${table.status} = 'pendente'`),
    check('outbox_acervo_tipo_nao_vazio_ck', sql`btrim(${table.tipo}) <> ''`),
    check('outbox_acervo_versao_ck', sql`${table.versao} > 0`),
    check(
      'outbox_acervo_status_ck',
      sql`${table.status} IN ('pendente', 'publicado')`,
    ),
    check('outbox_acervo_tentativas_ck', sql`${table.tentativas} >= 0`),
    check(
      'outbox_acervo_publicacao_ck',
      sql`(
        ${table.status} = 'pendente' AND ${table.publicadoEm} IS NULL
      ) OR (
        ${table.status} = 'publicado'
        AND ${table.publicadoEm} IS NOT NULL
        AND ${table.publicadoEm} >= ${table.criadoEm}
      )`,
    ),
    check(
      'outbox_acervo_anonimizacao_ck',
      sql`(
        ${table.anonimizadoEm} IS NULL
        AND ${table.chaveNegocio} IS NOT NULL
        AND btrim(${table.chaveNegocio}) <> ''
        AND ${table.correlationId} IS NOT NULL
        AND ${table.payload} IS NOT NULL
      ) OR (
        ${table.anonimizadoEm} IS NOT NULL
        AND ${table.anonimizadoEm} >= ${table.criadoEm}
        AND ${table.chaveNegocio} IS NULL
        AND ${table.correlationId} IS NULL
        AND ${table.payload} IS NULL
      )`,
    ),
  ],
);

export const livroReferenciaView = acervoSchema.view('v_livro_referencia_v1', {
  livroId: uuid('livro_id'),
  tipo: text('tipo'),
  donoId: uuid('dono_id'),
  paginas: integer('paginas'),
  titulo: text('titulo'),
  autorExibicao: text('autor_exibicao'),
  capaResolvida: text('capa_resolvida'),
  ativo: boolean('ativo'),
}).as(sql`
    SELECT
      l.id AS livro_id,
      l.tipo,
      l.dono_id,
      l.paginas,
      l.titulo,
      CASE
        WHEN l.tipo = 'pessoal' THEN l.autor_informado
        ELSE (
          SELECT string_agg(a.nome, ', ' ORDER BY a.nome)
          FROM ${livroAutor} la
          JOIN ${autor} a ON a.id = la.autor_id
          WHERE la.livro_id = l.id
        )
      END AS autor_exibicao,
      coalesce(l.capa_url_propria, l.capa_url_externa) AS capa_resolvida,
      l.ativo
    FROM ${livro} l
  `);

// Uma linha por livro-assunto; livros oficiais sem assunto aparecem uma vez
// com assunto_id/assunto_nome nulos para preservar sua elegibilidade.
export const livroRecomendacaoView = acervoSchema.view(
  'v_livro_recomendacao_v1',
  {
    livroId: uuid('livro_id'),
    titulo: text('titulo'),
    autorExibicao: text('autor_exibicao'),
    capaResolvida: text('capa_resolvida'),
    serieId: uuid('serie_id'),
    serieNome: text('serie_nome'),
    assuntoId: uuid('assunto_id'),
    assuntoNome: text('assunto_nome'),
  },
).as(sql`
    SELECT
      l.id AS livro_id,
      l.titulo,
      (
        SELECT string_agg(a.nome, ', ' ORDER BY a.nome)
        FROM ${livroAutor} la
        JOIN ${autor} a ON a.id = la.autor_id
        WHERE la.livro_id = l.id
      ) AS autor_exibicao,
      coalesce(l.capa_url_propria, l.capa_url_externa) AS capa_resolvida,
      l.serie_id,
      s.nome AS serie_nome,
      la.assunto_id,
      a.nome AS assunto_nome
    FROM ${livro} l
    LEFT JOIN ${serie} s ON s.id = l.serie_id
    LEFT JOIN ${livroAssunto} la ON la.livro_id = l.id
    LEFT JOIN ${assunto} a ON a.id = la.assunto_id
    WHERE l.tipo = 'oficial' AND l.ativo
  `);
