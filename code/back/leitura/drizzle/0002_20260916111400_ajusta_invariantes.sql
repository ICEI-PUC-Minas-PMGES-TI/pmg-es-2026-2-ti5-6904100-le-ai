ALTER TABLE "leitura"."idempotencia_leitura" DROP CONSTRAINT "idempotencia_leitura_anonimizacao_ck";--> statement-breakpoint
ALTER TABLE "leitura"."leitura" DROP CONSTRAINT "leitura_estado_ck";--> statement-breakpoint
ALTER TABLE "leitura"."outbox_leitura" DROP CONSTRAINT "outbox_leitura_publicacao_ck";--> statement-breakpoint
ALTER TABLE "leitura"."outbox_leitura" DROP CONSTRAINT "outbox_leitura_anonimizacao_ck";--> statement-breakpoint
ALTER TABLE "leitura"."idempotencia_leitura" ADD CONSTRAINT "idempotencia_leitura_anonimizacao_ck" CHECK (("leitura"."idempotencia_leitura"."anonimizado_em" is null and "leitura"."idempotencia_leitura"."subject_ref" is not null and "leitura"."idempotencia_leitura"."chave" is not null and btrim("leitura"."idempotencia_leitura"."chave") <> '' and "leitura"."idempotencia_leitura"."payload_hash" is not null and btrim("leitura"."idempotencia_leitura"."payload_hash") <> '' and "leitura"."idempotencia_leitura"."resposta" is not null) or ("leitura"."idempotencia_leitura"."anonimizado_em" is not null and "leitura"."idempotencia_leitura"."anonimizado_em" >= "leitura"."idempotencia_leitura"."criado_em" and "leitura"."idempotencia_leitura"."subject_ref" is null and "leitura"."idempotencia_leitura"."chave" is null and "leitura"."idempotencia_leitura"."payload_hash" is null and "leitura"."idempotencia_leitura"."resposta" is null));--> statement-breakpoint
ALTER TABLE "leitura"."leitura" ADD CONSTRAINT "leitura_estado_ck" CHECK (("leitura"."leitura"."status" = 'lendo' and "leitura"."leitura"."data_fim" is null and "leitura"."leitura"."finalizada_em" is null and not "leitura"."leitura"."incompleta") or ("leitura"."leitura"."status" = 'abandonado' and not "leitura"."leitura"."releitura" and not "leitura"."leitura"."incompleta" and "leitura"."leitura"."data_fim" is null and "leitura"."leitura"."finalizada_em" is null) or ("leitura"."leitura"."status" = 'lido' and (("leitura"."leitura"."incompleta" and "leitura"."leitura"."releitura" and "leitura"."leitura"."data_fim" is null and "leitura"."leitura"."finalizada_em" is null) or (not "leitura"."leitura"."incompleta" and "leitura"."leitura"."data_fim" is not null and "leitura"."leitura"."finalizada_em" is not null))));--> statement-breakpoint
ALTER TABLE "leitura"."outbox_leitura" ADD CONSTRAINT "outbox_leitura_publicacao_ck" CHECK (("leitura"."outbox_leitura"."status" = 'pendente' and "leitura"."outbox_leitura"."publicado_em" is null) or ("leitura"."outbox_leitura"."status" = 'publicado' and "leitura"."outbox_leitura"."publicado_em" is not null and "leitura"."outbox_leitura"."publicado_em" >= "leitura"."outbox_leitura"."criado_em"));--> statement-breakpoint
ALTER TABLE "leitura"."outbox_leitura" ADD CONSTRAINT "outbox_leitura_anonimizacao_ck" CHECK (("leitura"."outbox_leitura"."anonimizado_em" is null and "leitura"."outbox_leitura"."chave_negocio" is not null and btrim("leitura"."outbox_leitura"."chave_negocio") <> '' and "leitura"."outbox_leitura"."correlation_id" is not null and "leitura"."outbox_leitura"."payload" is not null) or ("leitura"."outbox_leitura"."anonimizado_em" is not null and "leitura"."outbox_leitura"."anonimizado_em" >= "leitura"."outbox_leitura"."criado_em" and "leitura"."outbox_leitura"."status" = 'publicado' and "leitura"."outbox_leitura"."chave_negocio" is null and "leitura"."outbox_leitura"."correlation_id" is null and "leitura"."outbox_leitura"."payload" is null));--> statement-breakpoint
ALTER TABLE "leitura"."reacao_resenha" ADD CONSTRAINT "reacao_resenha_primeira_curtida_ck" CHECK ("leitura"."reacao_resenha"."tipo" <> 'curtida' or "leitura"."reacao_resenha"."primeira_curtida_em" is not null);
--> statement-breakpoint
CREATE FUNCTION "leitura"."validar_limite_frases"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.usuario_id::text || ':' || NEW.livro_id::text, 0)
  );

  IF (
    SELECT count(*)
    FROM "leitura"."frase"
    WHERE usuario_id = NEW.usuario_id
      AND livro_id = NEW.livro_id
      AND id <> NEW.id
  ) >= 10 THEN
    RAISE EXCEPTION 'limite de 10 frases por usuario e livro excedido'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "frase_limite_trigger"
BEFORE INSERT OR UPDATE OF usuario_id, livro_id ON "leitura"."frase"
FOR EACH ROW EXECUTE FUNCTION "leitura"."validar_limite_frases"();
