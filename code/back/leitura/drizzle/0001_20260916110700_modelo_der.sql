CREATE SCHEMA IF NOT EXISTS "leitura";
--> statement-breakpoint
CREATE TABLE "leitura"."atualizacao_progresso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leitura_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"pagina" integer NOT NULL,
	"paginas_lidas" integer NOT NULL,
	"minutos" integer NOT NULL,
	"registrado_em_dispositivo" timestamp with time zone NOT NULL,
	"fuso_horario_dispositivo" text NOT NULL,
	"data_local" date NOT NULL,
	"chave_idempotencia" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "atualizacao_progresso_leitura_ordem_uk" UNIQUE("leitura_id","ordem"),
	CONSTRAINT "atualizacao_progresso_chave_idempotencia_uk" UNIQUE("chave_idempotencia"),
	CONSTRAINT "atualizacao_progresso_ordem_ck" CHECK ("leitura"."atualizacao_progresso"."ordem" > 0),
	CONSTRAINT "atualizacao_progresso_pagina_ck" CHECK ("leitura"."atualizacao_progresso"."pagina" > 0),
	CONSTRAINT "atualizacao_progresso_paginas_lidas_ck" CHECK ("leitura"."atualizacao_progresso"."paginas_lidas" > 0),
	CONSTRAINT "atualizacao_progresso_minutos_ck" CHECK ("leitura"."atualizacao_progresso"."minutos" >= 0),
	CONSTRAINT "atualizacao_progresso_atualizado_ck" CHECK ("leitura"."atualizacao_progresso"."atualizado_em" >= "leitura"."atualizacao_progresso"."criado_em")
);
--> statement-breakpoint
CREATE TABLE "leitura"."contribuicao_desafio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"janela_id" uuid NOT NULL,
	"origem_tipo" text NOT NULL,
	"origem_id" uuid NOT NULL,
	"valor" integer NOT NULL,
	"ocorrido_em" timestamp with time zone NOT NULL,
	"data_local" date NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contribuicao_desafio_origem_uk" UNIQUE("janela_id","origem_tipo","origem_id"),
	CONSTRAINT "contribuicao_desafio_origem_tipo_ck" CHECK ("leitura"."contribuicao_desafio"."origem_tipo" in ('progresso', 'leitura_finalizada')),
	CONSTRAINT "contribuicao_desafio_valor_ck" CHECK ("leitura"."contribuicao_desafio"."valor" > 0)
);
--> statement-breakpoint
CREATE TABLE "leitura"."desafio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"unidade" text NOT NULL,
	"janela" text NOT NULL,
	"valor_alvo" integer NOT NULL,
	"fuso_horario" text NOT NULL,
	"pausado" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "desafio_unidade_ck" CHECK ("leitura"."desafio"."unidade" in ('paginas', 'minutos', 'livros')),
	CONSTRAINT "desafio_janela_ck" CHECK ("leitura"."desafio"."janela" in ('diaria', 'semanal', 'mensal', 'anual')),
	CONSTRAINT "desafio_valor_alvo_ck" CHECK ("leitura"."desafio"."valor_alvo" > 0)
);
--> statement-breakpoint
CREATE TABLE "leitura"."dia_leitura" (
	"usuario_id" uuid NOT NULL,
	"data" date NOT NULL,
	CONSTRAINT "dia_leitura_pk" PRIMARY KEY("usuario_id","data")
);
--> statement-breakpoint
CREATE TABLE "leitura"."estante" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"status" text NOT NULL,
	"vezes_lido" integer DEFAULT 0 NOT NULL,
	"adicionado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estante_usuario_livro_uk" UNIQUE("usuario_id","livro_id"),
	CONSTRAINT "estante_id_usuario_livro_uk" UNIQUE("id","usuario_id","livro_id"),
	CONSTRAINT "estante_status_ck" CHECK ("leitura"."estante"."status" in ('quero_ler', 'lendo', 'lido', 'relendo', 'abandonado')),
	CONSTRAINT "estante_vezes_lido_ck" CHECK ("leitura"."estante"."vezes_lido" >= 0)
);
--> statement-breakpoint
CREATE TABLE "leitura"."estatistica_anual" (
	"usuario_id" uuid NOT NULL,
	"ano" integer NOT NULL,
	"livros_concluidos" integer DEFAULT 0 NOT NULL,
	"paginas_lidas" integer DEFAULT 0 NOT NULL,
	"minutos_lidos" integer DEFAULT 0 NOT NULL,
	"recalculado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estatistica_anual_pk" PRIMARY KEY("usuario_id","ano"),
	CONSTRAINT "estatistica_anual_ano_ck" CHECK ("leitura"."estatistica_anual"."ano" between 1 and 9999),
	CONSTRAINT "estatistica_anual_totais_ck" CHECK ("leitura"."estatistica_anual"."livros_concluidos" >= 0 and "leitura"."estatistica_anual"."paginas_lidas" >= 0 and "leitura"."estatistica_anual"."minutos_lidos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "leitura"."estatistica_mensal" (
	"usuario_id" uuid NOT NULL,
	"ano" integer NOT NULL,
	"mes" integer NOT NULL,
	"livros_concluidos" integer DEFAULT 0 NOT NULL,
	"paginas_lidas" integer DEFAULT 0 NOT NULL,
	"minutos_lidos" integer DEFAULT 0 NOT NULL,
	"recalculado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estatistica_mensal_pk" PRIMARY KEY("usuario_id","ano","mes"),
	CONSTRAINT "estatistica_mensal_ano_ck" CHECK ("leitura"."estatistica_mensal"."ano" between 1 and 9999),
	CONSTRAINT "estatistica_mensal_mes_ck" CHECK ("leitura"."estatistica_mensal"."mes" between 1 and 12),
	CONSTRAINT "estatistica_mensal_totais_ck" CHECK ("leitura"."estatistica_mensal"."livros_concluidos" >= 0 and "leitura"."estatistica_mensal"."paginas_lidas" >= 0 and "leitura"."estatistica_mensal"."minutos_lidos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "leitura"."estatistica_usuario" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"livros_concluidos" integer DEFAULT 0 NOT NULL,
	"paginas_lidas" integer DEFAULT 0 NOT NULL,
	"minutos_lidos" integer DEFAULT 0 NOT NULL,
	"dias_com_leitura" integer DEFAULT 0 NOT NULL,
	"dias_em_livros_concluidos" integer DEFAULT 0 NOT NULL,
	"nota_media" numeric(2, 1),
	"recalculado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estatistica_usuario_totais_ck" CHECK ("leitura"."estatistica_usuario"."livros_concluidos" >= 0 and "leitura"."estatistica_usuario"."paginas_lidas" >= 0 and "leitura"."estatistica_usuario"."minutos_lidos" >= 0 and "leitura"."estatistica_usuario"."dias_com_leitura" >= 0 and "leitura"."estatistica_usuario"."dias_em_livros_concluidos" >= 0),
	CONSTRAINT "estatistica_usuario_nota_media_ck" CHECK ("leitura"."estatistica_usuario"."nota_media" is null or ("leitura"."estatistica_usuario"."nota_media" >= 0 and "leitura"."estatistica_usuario"."nota_media" <= 5))
);
--> statement-breakpoint
CREATE TABLE "leitura"."favorito" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorito_usuario_livro_uk" UNIQUE("usuario_id","livro_id")
);
--> statement-breakpoint
CREATE TABLE "leitura"."frase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"pagina" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "frase_texto_ck" CHECK (char_length("leitura"."frase"."texto") between 1 and 500),
	CONSTRAINT "frase_pagina_ck" CHECK ("leitura"."frase"."pagina" > 0)
);
--> statement-breakpoint
CREATE TABLE "leitura"."idempotencia_leitura" (
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
	CONSTRAINT "idempotencia_leitura_operacao_ck" CHECK (char_length("leitura"."idempotencia_leitura"."operacao") > 0),
	CONSTRAINT "idempotencia_leitura_status_http_ck" CHECK ("leitura"."idempotencia_leitura"."status_http" between 100 and 599),
	CONSTRAINT "idempotencia_leitura_replay_ck" CHECK ("leitura"."idempotencia_leitura"."replay_ate" >= "leitura"."idempotencia_leitura"."criado_em"),
	CONSTRAINT "idempotencia_leitura_anonimizacao_ck" CHECK ("leitura"."idempotencia_leitura"."anonimizado_em" is null or ("leitura"."idempotencia_leitura"."subject_ref" is null and "leitura"."idempotencia_leitura"."chave" is null and "leitura"."idempotencia_leitura"."payload_hash" is null and "leitura"."idempotencia_leitura"."resposta" is null))
);
--> statement-breakpoint
CREATE TABLE "leitura"."janela_desafio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"desafio_id" uuid NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"unidade" text NOT NULL,
	"periodicidade" text NOT NULL,
	"valor_alvo" integer NOT NULL,
	"fuso_horario" text NOT NULL,
	"acumulado" integer DEFAULT 0 NOT NULL,
	"cumprida" boolean DEFAULT false NOT NULL,
	"encerrada_em" timestamp with time zone,
	"recalculada_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "janela_desafio_periodo_uk" UNIQUE("desafio_id","inicio","fim"),
	CONSTRAINT "janela_desafio_unidade_ck" CHECK ("leitura"."janela_desafio"."unidade" in ('paginas', 'minutos', 'livros')),
	CONSTRAINT "janela_desafio_periodicidade_ck" CHECK ("leitura"."janela_desafio"."periodicidade" in ('diaria', 'semanal', 'mensal', 'anual')),
	CONSTRAINT "janela_desafio_periodo_ck" CHECK ("leitura"."janela_desafio"."fim" >= "leitura"."janela_desafio"."inicio"),
	CONSTRAINT "janela_desafio_valor_alvo_ck" CHECK ("leitura"."janela_desafio"."valor_alvo" > 0),
	CONSTRAINT "janela_desafio_acumulado_ck" CHECK ("leitura"."janela_desafio"."acumulado" >= 0),
	CONSTRAINT "janela_desafio_cumprida_ck" CHECK ("leitura"."janela_desafio"."cumprida" = ("leitura"."janela_desafio"."acumulado" >= "leitura"."janela_desafio"."valor_alvo"))
);
--> statement-breakpoint
CREATE TABLE "leitura"."leitura" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estante_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"status" text NOT NULL,
	"releitura" boolean DEFAULT false NOT NULL,
	"incompleta" boolean DEFAULT false NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"finalizada_em" timestamp with time zone,
	"finalizacao_fuso_horario" text,
	"finalizacao_data_local" date,
	"pagina_atual" integer DEFAULT 0 NOT NULL,
	"ultima_atividade_em" timestamp with time zone NOT NULL,
	"inatividade_versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leitura_status_ck" CHECK ("leitura"."leitura"."status" in ('lendo', 'lido', 'abandonado')),
	CONSTRAINT "leitura_pagina_atual_ck" CHECK ("leitura"."leitura"."pagina_atual" >= 0),
	CONSTRAINT "leitura_inatividade_versao_ck" CHECK ("leitura"."leitura"."inatividade_versao" > 0),
	CONSTRAINT "leitura_data_fim_ck" CHECK ("leitura"."leitura"."data_fim" is null or "leitura"."leitura"."data_fim" >= "leitura"."leitura"."data_inicio"),
	CONSTRAINT "leitura_finalizacao_campos_ck" CHECK (("leitura"."leitura"."finalizada_em" is null and "leitura"."leitura"."finalizacao_fuso_horario" is null and "leitura"."leitura"."finalizacao_data_local" is null) or ("leitura"."leitura"."finalizada_em" is not null and "leitura"."leitura"."finalizacao_fuso_horario" is not null and "leitura"."leitura"."finalizacao_data_local" is not null)),
	CONSTRAINT "leitura_estado_ck" CHECK (("leitura"."leitura"."status" = 'lendo' and "leitura"."leitura"."data_fim" is null and "leitura"."leitura"."finalizada_em" is null and not "leitura"."leitura"."incompleta") or ("leitura"."leitura"."status" = 'abandonado' and not "leitura"."leitura"."releitura" and not "leitura"."leitura"."incompleta" and "leitura"."leitura"."data_fim" is not null and "leitura"."leitura"."finalizada_em" is null) or ("leitura"."leitura"."status" = 'lido' and "leitura"."leitura"."data_fim" is not null and (("leitura"."leitura"."incompleta" and "leitura"."leitura"."releitura" and "leitura"."leitura"."finalizada_em" is null) or (not "leitura"."leitura"."incompleta" and "leitura"."leitura"."finalizada_em" is not null))))
);
--> statement-breakpoint
CREATE TABLE "leitura"."limiar_inatividade" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leitura_id" uuid NOT NULL,
	"inatividade_versao" integer NOT NULL,
	"limiar_dias" integer NOT NULL,
	"tipo" text NOT NULL,
	"event_id" uuid,
	"processado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "limiar_inatividade_leitura_versao_dias_uk" UNIQUE("leitura_id","inatividade_versao","limiar_dias"),
	CONSTRAINT "limiar_inatividade_tipo_ck" CHECK ("leitura"."limiar_inatividade"."tipo" in ('risco', 'expiracao')),
	CONSTRAINT "limiar_inatividade_regra_ck" CHECK (("leitura"."limiar_inatividade"."limiar_dias" in (20, 30) and "leitura"."limiar_inatividade"."tipo" = 'risco') or ("leitura"."limiar_inatividade"."limiar_dias" = 40 and "leitura"."limiar_inatividade"."tipo" = 'expiracao')),
	CONSTRAINT "limiar_inatividade_versao_ck" CHECK ("leitura"."limiar_inatividade"."inatividade_versao" > 0)
);
--> statement-breakpoint
CREATE TABLE "leitura"."nota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"valor" numeric(2, 1) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nota_usuario_livro_uk" UNIQUE("usuario_id","livro_id"),
	CONSTRAINT "nota_valor_ck" CHECK ("leitura"."nota"."valor" >= 0 and "leitura"."nota"."valor" <= 5 and mod("leitura"."nota"."valor", 0.5) = 0)
);
--> statement-breakpoint
CREATE TABLE "leitura"."outbox_leitura" (
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
	CONSTRAINT "outbox_leitura_tipo_ck" CHECK (char_length("leitura"."outbox_leitura"."tipo") > 0),
	CONSTRAINT "outbox_leitura_versao_ck" CHECK ("leitura"."outbox_leitura"."versao" > 0),
	CONSTRAINT "outbox_leitura_status_ck" CHECK ("leitura"."outbox_leitura"."status" in ('pendente', 'publicado')),
	CONSTRAINT "outbox_leitura_tentativas_ck" CHECK ("leitura"."outbox_leitura"."tentativas" >= 0),
	CONSTRAINT "outbox_leitura_publicacao_ck" CHECK (("leitura"."outbox_leitura"."status" = 'pendente' and "leitura"."outbox_leitura"."publicado_em" is null) or ("leitura"."outbox_leitura"."status" = 'publicado' and "leitura"."outbox_leitura"."publicado_em" is not null)),
	CONSTRAINT "outbox_leitura_anonimizacao_ck" CHECK ("leitura"."outbox_leitura"."anonimizado_em" is null or ("leitura"."outbox_leitura"."chave_negocio" is null and "leitura"."outbox_leitura"."correlation_id" is null and "leitura"."outbox_leitura"."payload" is null))
);
--> statement-breakpoint
CREATE TABLE "leitura"."pausa_desafio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"desafio_id" uuid NOT NULL,
	"inicio_em" timestamp with time zone NOT NULL,
	"fim_em" timestamp with time zone,
	CONSTRAINT "pausa_desafio_periodo_ck" CHECK ("leitura"."pausa_desafio"."fim_em" is null or "leitura"."pausa_desafio"."fim_em" > "leitura"."pausa_desafio"."inicio_em")
);
--> statement-breakpoint
CREATE TABLE "leitura"."reacao_resenha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resenha_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"primeira_curtida_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reacao_resenha_resenha_usuario_uk" UNIQUE("resenha_id","usuario_id"),
	CONSTRAINT "reacao_resenha_tipo_ck" CHECK ("leitura"."reacao_resenha"."tipo" in ('curtida', 'descurtida'))
);
--> statement-breakpoint
CREATE TABLE "leitura"."resenha" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"livro_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"spoiler" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resenha_usuario_livro_uk" UNIQUE("usuario_id","livro_id"),
	CONSTRAINT "resenha_texto_ck" CHECK (char_length("leitura"."resenha"."texto") between 1 and 5000)
);
--> statement-breakpoint
CREATE TABLE "leitura"."sequencia_leitura" (
	"usuario_id" uuid PRIMARY KEY NOT NULL,
	"sequencia_atual" integer DEFAULT 0 NOT NULL,
	"maior_sequencia" integer DEFAULT 0 NOT NULL,
	"ultimo_dia" date,
	"ultimo_fuso_horario" text,
	"ultimo_fuso_registrado_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sequencia_leitura_valores_ck" CHECK ("leitura"."sequencia_leitura"."sequencia_atual" >= 0 and "leitura"."sequencia_leitura"."maior_sequencia" >= "leitura"."sequencia_leitura"."sequencia_atual"),
	CONSTRAINT "sequencia_leitura_ultimo_registro_ck" CHECK (("leitura"."sequencia_leitura"."ultimo_dia" is null and "leitura"."sequencia_leitura"."ultimo_fuso_horario" is null and "leitura"."sequencia_leitura"."ultimo_fuso_registrado_em" is null) or ("leitura"."sequencia_leitura"."ultimo_dia" is not null and "leitura"."sequencia_leitura"."ultimo_fuso_horario" is not null and "leitura"."sequencia_leitura"."ultimo_fuso_registrado_em" is not null))
);
--> statement-breakpoint
ALTER TABLE "leitura"."atualizacao_progresso" ADD CONSTRAINT "atualizacao_progresso_leitura_id_leitura_id_fk" FOREIGN KEY ("leitura_id") REFERENCES "leitura"."leitura"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leitura"."contribuicao_desafio" ADD CONSTRAINT "contribuicao_desafio_janela_id_janela_desafio_id_fk" FOREIGN KEY ("janela_id") REFERENCES "leitura"."janela_desafio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leitura"."janela_desafio" ADD CONSTRAINT "janela_desafio_desafio_id_desafio_id_fk" FOREIGN KEY ("desafio_id") REFERENCES "leitura"."desafio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leitura"."leitura" ADD CONSTRAINT "leitura_estante_usuario_livro_fk" FOREIGN KEY ("estante_id","usuario_id","livro_id") REFERENCES "leitura"."estante"("id","usuario_id","livro_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leitura"."limiar_inatividade" ADD CONSTRAINT "limiar_inatividade_leitura_id_leitura_id_fk" FOREIGN KEY ("leitura_id") REFERENCES "leitura"."leitura"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leitura"."pausa_desafio" ADD CONSTRAINT "pausa_desafio_desafio_id_desafio_id_fk" FOREIGN KEY ("desafio_id") REFERENCES "leitura"."desafio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leitura"."reacao_resenha" ADD CONSTRAINT "reacao_resenha_resenha_id_resenha_id_fk" FOREIGN KEY ("resenha_id") REFERENCES "leitura"."resenha"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "atualizacao_progresso_data_local_idx" ON "leitura"."atualizacao_progresso" USING btree ("data_local","leitura_id");--> statement-breakpoint
CREATE INDEX "contribuicao_desafio_data_idx" ON "leitura"."contribuicao_desafio" USING btree ("janela_id","data_local");--> statement-breakpoint
CREATE INDEX "contribuicao_desafio_origem_idx" ON "leitura"."contribuicao_desafio" USING btree ("origem_tipo","origem_id");--> statement-breakpoint
CREATE INDEX "desafio_usuario_idx" ON "leitura"."desafio" USING btree ("usuario_id","criado_em");--> statement-breakpoint
CREATE INDEX "dia_leitura_data_idx" ON "leitura"."dia_leitura" USING btree ("data");--> statement-breakpoint
CREATE INDEX "estante_usuario_status_idx" ON "leitura"."estante" USING btree ("usuario_id","status");--> statement-breakpoint
CREATE INDEX "estante_livro_idx" ON "leitura"."estante" USING btree ("livro_id");--> statement-breakpoint
CREATE INDEX "favorito_livro_idx" ON "leitura"."favorito" USING btree ("livro_id");--> statement-breakpoint
CREATE INDEX "frase_usuario_livro_idx" ON "leitura"."frase" USING btree ("usuario_id","livro_id");--> statement-breakpoint
CREATE INDEX "frase_livro_idx" ON "leitura"."frase" USING btree ("livro_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotencia_leitura_subject_operacao_chave_uk" ON "leitura"."idempotencia_leitura" USING btree ("subject_ref","operacao","chave") WHERE "leitura"."idempotencia_leitura"."subject_ref" is not null and "leitura"."idempotencia_leitura"."chave" is not null;--> statement-breakpoint
CREATE INDEX "idempotencia_leitura_replay_idx" ON "leitura"."idempotencia_leitura" USING btree ("replay_ate");--> statement-breakpoint
CREATE INDEX "janela_desafio_corrente_idx" ON "leitura"."janela_desafio" USING btree ("desafio_id","encerrada_em");--> statement-breakpoint
CREATE UNIQUE INDEX "leitura_em_andamento_usuario_livro_uk" ON "leitura"."leitura" USING btree ("usuario_id","livro_id") WHERE "leitura"."leitura"."status" = 'lendo';--> statement-breakpoint
CREATE INDEX "leitura_estante_criado_idx" ON "leitura"."leitura" USING btree ("estante_id","criado_em");--> statement-breakpoint
CREATE INDEX "leitura_usuario_data_fim_idx" ON "leitura"."leitura" USING btree ("usuario_id","data_fim");--> statement-breakpoint
CREATE INDEX "leitura_inatividade_idx" ON "leitura"."leitura" USING btree ("status","ultima_atividade_em");--> statement-breakpoint
CREATE INDEX "leitura_livro_idx" ON "leitura"."leitura" USING btree ("livro_id");--> statement-breakpoint
CREATE UNIQUE INDEX "limiar_inatividade_event_id_uk" ON "leitura"."limiar_inatividade" USING btree ("event_id") WHERE "leitura"."limiar_inatividade"."event_id" is not null;--> statement-breakpoint
CREATE INDEX "nota_livro_idx" ON "leitura"."nota" USING btree ("livro_id");--> statement-breakpoint
CREATE INDEX "outbox_leitura_dispatch_idx" ON "leitura"."outbox_leitura" USING btree ("status","criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "pausa_desafio_aberta_uk" ON "leitura"."pausa_desafio" USING btree ("desafio_id") WHERE "leitura"."pausa_desafio"."fim_em" is null;--> statement-breakpoint
CREATE INDEX "pausa_desafio_periodo_idx" ON "leitura"."pausa_desafio" USING btree ("desafio_id","inicio_em");--> statement-breakpoint
CREATE INDEX "reacao_resenha_contagem_idx" ON "leitura"."reacao_resenha" USING btree ("resenha_id","ativa","tipo");--> statement-breakpoint
CREATE INDEX "reacao_resenha_usuario_idx" ON "leitura"."reacao_resenha" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "resenha_livro_criado_idx" ON "leitura"."resenha" USING btree ("livro_id","criado_em");--> statement-breakpoint
CREATE VIEW "leitura"."v_estante_publica_v1" AS (select
    "leitura"."estante"."usuario_id" as usuario_id,
    "leitura"."estante"."livro_id" as livro_id,
    "leitura"."estante"."status" as status,
    "leitura"."estante"."vezes_lido" as vezes_lido
  from "leitura"."estante");--> statement-breakpoint
CREATE VIEW "leitura"."v_nota_publicacao_v1" AS (select
    "leitura"."nota"."usuario_id" as usuario_id,
    "leitura"."nota"."livro_id" as livro_id,
    "leitura"."nota"."valor" as valor
  from "leitura"."nota");--> statement-breakpoint
CREATE VIEW "leitura"."v_resenha_publicacao_v1" AS (select
    "leitura"."resenha"."id" as resenha_id,
    "leitura"."resenha"."usuario_id" as usuario_id,
    "leitura"."resenha"."livro_id" as livro_id,
    "leitura"."resenha"."texto" as texto,
    "leitura"."resenha"."spoiler" as spoiler,
    "leitura"."resenha"."criado_em" as criado_em,
    "leitura"."resenha"."atualizado_em" as atualizado_em,
    count("leitura"."reacao_resenha"."id") filter (where "leitura"."reacao_resenha"."ativa" and "leitura"."reacao_resenha"."tipo" = 'curtida') as curtidas,
    count("leitura"."reacao_resenha"."id") filter (where "leitura"."reacao_resenha"."ativa" and "leitura"."reacao_resenha"."tipo" = 'descurtida') as descurtidas
  from "leitura"."resenha"
  left join "leitura"."reacao_resenha" on "leitura"."reacao_resenha"."resenha_id" = "leitura"."resenha"."id"
  group by "leitura"."resenha"."id");
