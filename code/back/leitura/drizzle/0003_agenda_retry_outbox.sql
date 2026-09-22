ALTER TABLE "leitura"."outbox_leitura"
  ADD COLUMN "proxima_tentativa_em" timestamp with time zone;
