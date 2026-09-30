CREATE TABLE "leitura"."mensagem_processada" (
  "consumidor" text NOT NULL,
  "event_id" uuid NOT NULL,
  "processado_em" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "mensagem_processada_pk" PRIMARY KEY ("consumidor", "event_id"),
  CONSTRAINT "mensagem_processada_consumidor_preenchido"
    CHECK (btrim("consumidor") <> '')
);
