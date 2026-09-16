CREATE SCHEMA IF NOT EXISTS "acervo";
--> statement-breakpoint
CREATE TABLE "acervo"."assunto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "assunto_nome_nao_vazio_ck" CHECK (btrim("acervo"."assunto"."nome") <> ''),
	CONSTRAINT "assunto_slug_formato_ck" CHECK ("acervo"."assunto"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "acervo"."autor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"ol_author_key" text,
	"biografia" text,
	CONSTRAINT "autor_nome_nao_vazio_ck" CHECK (btrim("acervo"."autor"."nome") <> ''),
	CONSTRAINT "autor_nome_normalizado_nao_vazio_ck" CHECK (btrim("acervo"."autor"."nome_normalizado") <> '')
);
--> statement-breakpoint
CREATE TABLE "acervo"."editora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	CONSTRAINT "editora_nome_nao_vazio_ck" CHECK (btrim("acervo"."editora"."nome") <> ''),
	CONSTRAINT "editora_nome_normalizado_nao_vazio_ck" CHECK (btrim("acervo"."editora"."nome_normalizado") <> '')
);
--> statement-breakpoint
CREATE TABLE "acervo"."idempotencia_acervo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_ref" uuid,
	"operacao" text NOT NULL,
	"chave" text,
	"payload_hash" text,
	"status_http" integer NOT NULL,
	"resposta" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"replay_ate" timestamp with time zone NOT NULL,
	"anonimizado_em" timestamp with time zone,
	CONSTRAINT "idempotencia_acervo_operacao_nao_vazia_ck" CHECK (btrim("acervo"."idempotencia_acervo"."operacao") <> ''),
	CONSTRAINT "idempotencia_acervo_status_http_ck" CHECK ("acervo"."idempotencia_acervo"."status_http" BETWEEN 100 AND 599),
	CONSTRAINT "idempotencia_acervo_replay_ck" CHECK ("acervo"."idempotencia_acervo"."replay_ate" >= "acervo"."idempotencia_acervo"."criado_em"),
	CONSTRAINT "idempotencia_acervo_anonimizacao_ck" CHECK ((
        "acervo"."idempotencia_acervo"."anonimizado_em" IS NULL
        AND "acervo"."idempotencia_acervo"."subject_ref" IS NOT NULL
        AND "acervo"."idempotencia_acervo"."chave" IS NOT NULL
        AND btrim("acervo"."idempotencia_acervo"."chave") <> ''
        AND "acervo"."idempotencia_acervo"."payload_hash" IS NOT NULL
        AND btrim("acervo"."idempotencia_acervo"."payload_hash") <> ''
        AND "acervo"."idempotencia_acervo"."resposta" IS NOT NULL
      ) OR (
        "acervo"."idempotencia_acervo"."anonimizado_em" IS NOT NULL
        AND "acervo"."idempotencia_acervo"."anonimizado_em" >= "acervo"."idempotencia_acervo"."criado_em"
        AND "acervo"."idempotencia_acervo"."subject_ref" IS NULL
        AND "acervo"."idempotencia_acervo"."chave" IS NULL
        AND "acervo"."idempotencia_acervo"."payload_hash" IS NULL
        AND "acervo"."idempotencia_acervo"."resposta" IS NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "acervo"."importacao_livro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"isbn13" text NOT NULL,
	"estado" text DEFAULT 'pendente' NOT NULL,
	"livro_id" uuid,
	"erro" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "importacao_livro_isbn13_formato_ck" CHECK ("acervo"."importacao_livro"."isbn13" ~ '^[0-9]{13}$'),
	CONSTRAINT "importacao_livro_estado_ck" CHECK ("acervo"."importacao_livro"."estado" IN ('pendente', 'concluida', 'nao_encontrado', 'falha_transitoria')),
	CONSTRAINT "importacao_livro_resultado_ck" CHECK ((
        "acervo"."importacao_livro"."estado" = 'pendente'
        AND "acervo"."importacao_livro"."livro_id" IS NULL
        AND "acervo"."importacao_livro"."erro" IS NULL
      ) OR (
        "acervo"."importacao_livro"."estado" = 'concluida'
        AND "acervo"."importacao_livro"."livro_id" IS NOT NULL
        AND "acervo"."importacao_livro"."erro" IS NULL
      ) OR (
        "acervo"."importacao_livro"."estado" = 'nao_encontrado'
        AND "acervo"."importacao_livro"."livro_id" IS NULL
      ) OR (
        "acervo"."importacao_livro"."estado" = 'falha_transitoria'
        AND "acervo"."importacao_livro"."livro_id" IS NULL
        AND "acervo"."importacao_livro"."erro" IS NOT NULL
        AND btrim("acervo"."importacao_livro"."erro") <> ''
      ))
);
--> statement-breakpoint
CREATE TABLE "acervo"."ingestao_execucao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"status" text DEFAULT 'em_execucao' NOT NULL,
	"total_processados" integer DEFAULT 0 NOT NULL,
	"total_descartados" integer DEFAULT 0 NOT NULL,
	"total_inseridos" integer DEFAULT 0 NOT NULL,
	"iniciado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizado_em" timestamp with time zone,
	CONSTRAINT "ingestao_execucao_tipo_ck" CHECK ("acervo"."ingestao_execucao"."tipo" IN ('carga_inicial', 'recarga')),
	CONSTRAINT "ingestao_execucao_status_ck" CHECK ("acervo"."ingestao_execucao"."status" IN ('em_execucao', 'concluida', 'falha')),
	CONSTRAINT "ingestao_execucao_totais_ck" CHECK ("acervo"."ingestao_execucao"."total_processados" >= 0
        AND "acervo"."ingestao_execucao"."total_descartados" >= 0
        AND "acervo"."ingestao_execucao"."total_inseridos" >= 0
        AND "acervo"."ingestao_execucao"."total_descartados" + "acervo"."ingestao_execucao"."total_inseridos" <= "acervo"."ingestao_execucao"."total_processados"),
	CONSTRAINT "ingestao_execucao_finalizacao_ck" CHECK ((
        "acervo"."ingestao_execucao"."status" = 'em_execucao' AND "acervo"."ingestao_execucao"."finalizado_em" IS NULL
      ) OR (
        "acervo"."ingestao_execucao"."status" IN ('concluida', 'falha')
        AND "acervo"."ingestao_execucao"."finalizado_em" IS NOT NULL
        AND "acervo"."ingestao_execucao"."finalizado_em" >= "acervo"."ingestao_execucao"."iniciado_em"
      ))
);
--> statement-breakpoint
CREATE TABLE "acervo"."livro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"isbn13" text,
	"ol_edition_key" text,
	"ol_work_key" text,
	"titulo" text NOT NULL,
	"autor_informado" text,
	"ano_publicacao" integer,
	"paginas" integer NOT NULL,
	"sinopse" text,
	"sinopse_status" text DEFAULT 'nao_consultada' NOT NULL,
	"capa_url_externa" text,
	"capa_url_propria" text,
	"capa_asset_id" text,
	"nota_geral" numeric(2, 1),
	"nota_geral_qtd" integer,
	"tipo" text NOT NULL,
	"dono_id" uuid,
	"editora_id" uuid,
	"serie_id" uuid,
	"numero_serie" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "livro_tipo_ck" CHECK ("acervo"."livro"."tipo" IN ('oficial', 'pessoal')),
	CONSTRAINT "livro_sinopse_status_ck" CHECK ("acervo"."livro"."sinopse_status" IN ('nao_consultada', 'pendente', 'disponivel', 'ausente', 'falha_transitoria')),
	CONSTRAINT "livro_titulo_nao_vazio_ck" CHECK (btrim("acervo"."livro"."titulo") <> ''),
	CONSTRAINT "livro_paginas_positivas_ck" CHECK ("acervo"."livro"."paginas" > 0),
	CONSTRAINT "livro_ano_publicacao_ck" CHECK ("acervo"."livro"."ano_publicacao" IS NULL OR "acervo"."livro"."ano_publicacao" > 0),
	CONSTRAINT "livro_numero_serie_ck" CHECK ("acervo"."livro"."numero_serie" IS NULL OR "acervo"."livro"."numero_serie" > 0),
	CONSTRAINT "livro_numero_serie_exige_serie_ck" CHECK ("acervo"."livro"."numero_serie" IS NULL OR "acervo"."livro"."serie_id" IS NOT NULL),
	CONSTRAINT "livro_sinopse_limite_ck" CHECK ("acervo"."livro"."sinopse" IS NULL OR char_length("acervo"."livro"."sinopse") <= 4000),
	CONSTRAINT "livro_sinopse_conteudo_status_ck" CHECK (("acervo"."livro"."sinopse_status" = 'disponivel') = ("acervo"."livro"."sinopse" IS NOT NULL)),
	CONSTRAINT "livro_nota_geral_ck" CHECK ("acervo"."livro"."nota_geral" IS NULL OR ("acervo"."livro"."nota_geral" >= 0 AND "acervo"."livro"."nota_geral" <= 5)),
	CONSTRAINT "livro_nota_geral_qtd_ck" CHECK ("acervo"."livro"."nota_geral_qtd" IS NULL OR "acervo"."livro"."nota_geral_qtd" >= 0),
	CONSTRAINT "livro_nota_geral_par_ck" CHECK (("acervo"."livro"."nota_geral" IS NULL) = ("acervo"."livro"."nota_geral_qtd" IS NULL)),
	CONSTRAINT "livro_isbn13_formato_ck" CHECK ("acervo"."livro"."isbn13" IS NULL OR "acervo"."livro"."isbn13" ~ '^[0-9]{13}$'),
	CONSTRAINT "livro_oficial_pessoal_ck" CHECK ((
        "acervo"."livro"."tipo" = 'oficial'
        AND "acervo"."livro"."isbn13" IS NOT NULL
        AND "acervo"."livro"."dono_id" IS NULL
        AND "acervo"."livro"."autor_informado" IS NULL
        AND "acervo"."livro"."capa_url_externa" IS NOT NULL
        AND btrim("acervo"."livro"."capa_url_externa") <> ''
        AND "acervo"."livro"."ativo"
      ) OR (
        "acervo"."livro"."tipo" = 'pessoal'
        AND "acervo"."livro"."isbn13" IS NULL
        AND "acervo"."livro"."ol_edition_key" IS NULL
        AND "acervo"."livro"."ol_work_key" IS NULL
        AND "acervo"."livro"."dono_id" IS NOT NULL
        AND "acervo"."livro"."autor_informado" IS NOT NULL
        AND btrim("acervo"."livro"."autor_informado") <> ''
        AND "acervo"."livro"."capa_url_externa" IS NULL
        AND "acervo"."livro"."editora_id" IS NULL
        AND "acervo"."livro"."serie_id" IS NULL
        AND "acervo"."livro"."numero_serie" IS NULL
        AND "acervo"."livro"."nota_geral" IS NULL
        AND "acervo"."livro"."nota_geral_qtd" IS NULL
        AND "acervo"."livro"."sinopse_status" IN ('disponivel', 'ausente')
      )),
	CONSTRAINT "livro_capa_propria_asset_ck" CHECK (("acervo"."livro"."capa_url_propria" IS NULL) = ("acervo"."livro"."capa_asset_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "acervo"."livro_assunto" (
	"livro_id" uuid NOT NULL,
	"assunto_id" uuid NOT NULL,
	CONSTRAINT "livro_assunto_pk" PRIMARY KEY("livro_id","assunto_id")
);
--> statement-breakpoint
CREATE TABLE "acervo"."livro_autor" (
	"livro_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	CONSTRAINT "livro_autor_pk" PRIMARY KEY("livro_id","autor_id")
);
--> statement-breakpoint
CREATE TABLE "acervo"."mapa_assunto_externo" (
	"tag_externa" text PRIMARY KEY NOT NULL,
	"assunto_id" uuid NOT NULL,
	CONSTRAINT "mapa_assunto_externo_tag_externa_nao_vazia_ck" CHECK (btrim("acervo"."mapa_assunto_externo"."tag_externa") <> '')
);
--> statement-breakpoint
CREATE TABLE "acervo"."nota_leitor_projecao" (
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"valor" numeric(2, 1) NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nota_leitor_projecao_pk" PRIMARY KEY("usuario_id","livro_id"),
	CONSTRAINT "nota_leitor_projecao_valor_ck" CHECK ("acervo"."nota_leitor_projecao"."valor" >= 0 AND "acervo"."nota_leitor_projecao"."valor" <= 5 AND mod("acervo"."nota_leitor_projecao"."valor" * 2, 1) = 0)
);
--> statement-breakpoint
CREATE TABLE "acervo"."nota_livro_agregada" (
	"livro_id" uuid PRIMARY KEY NOT NULL,
	"media" numeric(3, 2) NOT NULL,
	"quantidade" integer NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nota_livro_agregada_media_ck" CHECK ("acervo"."nota_livro_agregada"."media" >= 0 AND "acervo"."nota_livro_agregada"."media" <= 5),
	CONSTRAINT "nota_livro_agregada_quantidade_ck" CHECK ("acervo"."nota_livro_agregada"."quantidade" > 0)
);
--> statement-breakpoint
CREATE TABLE "acervo"."outbox_acervo" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"versao" integer NOT NULL,
	"chave_negocio" text,
	"correlation_id" uuid,
	"payload" jsonb,
	"status" text DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"publicado_em" timestamp with time zone,
	"anonimizado_em" timestamp with time zone,
	CONSTRAINT "outbox_acervo_tipo_nao_vazio_ck" CHECK (btrim("acervo"."outbox_acervo"."tipo") <> ''),
	CONSTRAINT "outbox_acervo_versao_ck" CHECK ("acervo"."outbox_acervo"."versao" > 0),
	CONSTRAINT "outbox_acervo_status_ck" CHECK ("acervo"."outbox_acervo"."status" IN ('pendente', 'publicado')),
	CONSTRAINT "outbox_acervo_tentativas_ck" CHECK ("acervo"."outbox_acervo"."tentativas" >= 0),
	CONSTRAINT "outbox_acervo_publicacao_ck" CHECK ((
        "acervo"."outbox_acervo"."status" = 'pendente' AND "acervo"."outbox_acervo"."publicado_em" IS NULL
      ) OR (
        "acervo"."outbox_acervo"."status" = 'publicado'
        AND "acervo"."outbox_acervo"."publicado_em" IS NOT NULL
        AND "acervo"."outbox_acervo"."publicado_em" >= "acervo"."outbox_acervo"."criado_em"
      )),
	CONSTRAINT "outbox_acervo_anonimizacao_ck" CHECK ((
        "acervo"."outbox_acervo"."anonimizado_em" IS NULL
        AND "acervo"."outbox_acervo"."chave_negocio" IS NOT NULL
        AND btrim("acervo"."outbox_acervo"."chave_negocio") <> ''
        AND "acervo"."outbox_acervo"."correlation_id" IS NOT NULL
        AND "acervo"."outbox_acervo"."payload" IS NOT NULL
      ) OR (
        "acervo"."outbox_acervo"."anonimizado_em" IS NOT NULL
        AND "acervo"."outbox_acervo"."anonimizado_em" >= "acervo"."outbox_acervo"."criado_em"
        AND "acervo"."outbox_acervo"."chave_negocio" IS NULL
        AND "acervo"."outbox_acervo"."correlation_id" IS NULL
        AND "acervo"."outbox_acervo"."payload" IS NULL
      ))
);
--> statement-breakpoint
CREATE TABLE "acervo"."serie" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	CONSTRAINT "serie_nome_nao_vazio_ck" CHECK (btrim("acervo"."serie"."nome") <> ''),
	CONSTRAINT "serie_nome_normalizado_nao_vazio_ck" CHECK (btrim("acervo"."serie"."nome_normalizado") <> '')
);
--> statement-breakpoint
CREATE TABLE "acervo"."sinonimo_editora" (
	"forma_externa" text PRIMARY KEY NOT NULL,
	"editora_id" uuid NOT NULL,
	CONSTRAINT "sinonimo_editora_forma_externa_nao_vazia_ck" CHECK (btrim("acervo"."sinonimo_editora"."forma_externa") <> '')
);
--> statement-breakpoint
ALTER TABLE "acervo"."importacao_livro" ADD CONSTRAINT "importacao_livro_livro_id_livro_id_fk" FOREIGN KEY ("livro_id") REFERENCES "acervo"."livro"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."livro" ADD CONSTRAINT "livro_editora_id_editora_id_fk" FOREIGN KEY ("editora_id") REFERENCES "acervo"."editora"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."livro" ADD CONSTRAINT "livro_serie_id_serie_id_fk" FOREIGN KEY ("serie_id") REFERENCES "acervo"."serie"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."livro_assunto" ADD CONSTRAINT "livro_assunto_livro_id_livro_id_fk" FOREIGN KEY ("livro_id") REFERENCES "acervo"."livro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."livro_assunto" ADD CONSTRAINT "livro_assunto_assunto_id_assunto_id_fk" FOREIGN KEY ("assunto_id") REFERENCES "acervo"."assunto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."livro_autor" ADD CONSTRAINT "livro_autor_livro_id_livro_id_fk" FOREIGN KEY ("livro_id") REFERENCES "acervo"."livro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."livro_autor" ADD CONSTRAINT "livro_autor_autor_id_autor_id_fk" FOREIGN KEY ("autor_id") REFERENCES "acervo"."autor"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."mapa_assunto_externo" ADD CONSTRAINT "mapa_assunto_externo_assunto_id_assunto_id_fk" FOREIGN KEY ("assunto_id") REFERENCES "acervo"."assunto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."nota_leitor_projecao" ADD CONSTRAINT "nota_leitor_projecao_livro_id_livro_id_fk" FOREIGN KEY ("livro_id") REFERENCES "acervo"."livro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."nota_livro_agregada" ADD CONSTRAINT "nota_livro_agregada_livro_id_livro_id_fk" FOREIGN KEY ("livro_id") REFERENCES "acervo"."livro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acervo"."sinonimo_editora" ADD CONSTRAINT "sinonimo_editora_editora_id_editora_id_fk" FOREIGN KEY ("editora_id") REFERENCES "acervo"."editora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assunto_slug_uidx" ON "acervo"."assunto" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "assunto_nome_normalizado_idx" ON "acervo"."assunto" USING btree (lower("nome"));--> statement-breakpoint
CREATE UNIQUE INDEX "autor_ol_author_key_uidx" ON "acervo"."autor" USING btree ("ol_author_key") WHERE "acervo"."autor"."ol_author_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "autor_nome_normalizado_sem_chave_uidx" ON "acervo"."autor" USING btree ("nome_normalizado") WHERE "acervo"."autor"."ol_author_key" IS NULL;--> statement-breakpoint
CREATE INDEX "autor_nome_normalizado_idx" ON "acervo"."autor" USING btree ("nome_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "editora_nome_normalizado_uidx" ON "acervo"."editora" USING btree ("nome_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotencia_acervo_ledger_uidx" ON "acervo"."idempotencia_acervo" USING btree ("subject_ref","operacao","chave") WHERE "acervo"."idempotencia_acervo"."anonimizado_em" IS NULL;--> statement-breakpoint
CREATE INDEX "idempotencia_acervo_replay_ate_idx" ON "acervo"."idempotencia_acervo" USING btree ("replay_ate") WHERE "acervo"."idempotencia_acervo"."anonimizado_em" IS NULL;--> statement-breakpoint
CREATE INDEX "importacao_livro_solicitante_id_idx" ON "acervo"."importacao_livro" USING btree ("solicitante_id");--> statement-breakpoint
CREATE INDEX "importacao_livro_isbn13_idx" ON "acervo"."importacao_livro" USING btree ("isbn13");--> statement-breakpoint
CREATE INDEX "importacao_livro_estado_criado_em_idx" ON "acervo"."importacao_livro" USING btree ("estado","criado_em");--> statement-breakpoint
CREATE INDEX "ingestao_execucao_status_iniciado_em_idx" ON "acervo"."ingestao_execucao" USING btree ("status","iniciado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "livro_isbn13_uidx" ON "acervo"."livro" USING btree ("isbn13") WHERE "acervo"."livro"."isbn13" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "livro_ol_edition_key_uidx" ON "acervo"."livro" USING btree ("ol_edition_key") WHERE "acervo"."livro"."ol_edition_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "livro_titulo_normalizado_idx" ON "acervo"."livro" USING btree (lower("titulo")) WHERE "acervo"."livro"."tipo" = 'oficial' AND "acervo"."livro"."ativo";--> statement-breakpoint
CREATE INDEX "livro_editora_id_idx" ON "acervo"."livro" USING btree ("editora_id") WHERE "acervo"."livro"."editora_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "livro_serie_id_numero_idx" ON "acervo"."livro" USING btree ("serie_id","numero_serie") WHERE "acervo"."livro"."serie_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "livro_ol_work_key_idx" ON "acervo"."livro" USING btree ("ol_work_key") WHERE "acervo"."livro"."ol_work_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "livro_dono_id_idx" ON "acervo"."livro" USING btree ("dono_id") WHERE "acervo"."livro"."dono_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "livro_assunto_assunto_id_idx" ON "acervo"."livro_assunto" USING btree ("assunto_id");--> statement-breakpoint
CREATE INDEX "livro_autor_autor_id_idx" ON "acervo"."livro_autor" USING btree ("autor_id");--> statement-breakpoint
CREATE INDEX "mapa_assunto_externo_assunto_id_idx" ON "acervo"."mapa_assunto_externo" USING btree ("assunto_id");--> statement-breakpoint
CREATE INDEX "nota_leitor_projecao_livro_id_idx" ON "acervo"."nota_leitor_projecao" USING btree ("livro_id");--> statement-breakpoint
CREATE INDEX "outbox_acervo_pendente_idx" ON "acervo"."outbox_acervo" USING btree ("criado_em") WHERE "acervo"."outbox_acervo"."status" = 'pendente';--> statement-breakpoint
CREATE UNIQUE INDEX "serie_nome_normalizado_uidx" ON "acervo"."serie" USING btree ("nome_normalizado");--> statement-breakpoint
CREATE INDEX "sinonimo_editora_editora_id_idx" ON "acervo"."sinonimo_editora" USING btree ("editora_id");--> statement-breakpoint
CREATE VIEW "acervo"."v_livro_recomendacao_v1" AS (
    SELECT
      l.id AS livro_id,
      l.titulo,
      (
        SELECT string_agg(a.nome, ', ' ORDER BY a.nome)
        FROM "acervo"."livro_autor" la
        JOIN "acervo"."autor" a ON a.id = la.autor_id
        WHERE la.livro_id = l.id
      ) AS autor_exibicao,
      coalesce(l.capa_url_propria, l.capa_url_externa) AS capa_resolvida,
      l.serie_id,
      s.nome AS serie_nome,
      la.assunto_id,
      a.nome AS assunto_nome
    FROM "acervo"."livro" l
    LEFT JOIN "acervo"."serie" s ON s.id = l.serie_id
    LEFT JOIN "acervo"."livro_assunto" la ON la.livro_id = l.id
    LEFT JOIN "acervo"."assunto" a ON a.id = la.assunto_id
    WHERE l.tipo = 'oficial' AND l.ativo
  );--> statement-breakpoint
CREATE VIEW "acervo"."v_livro_referencia_v1" AS (
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
          FROM "acervo"."livro_autor" la
          JOIN "acervo"."autor" a ON a.id = la.autor_id
          WHERE la.livro_id = l.id
        )
      END AS autor_exibicao,
      coalesce(l.capa_url_propria, l.capa_url_externa) AS capa_resolvida,
      l.ativo
    FROM "acervo"."livro" l
  );
