-- F-NOT-OPC (Kayke, 08/11/2026) — registro do push enviado por notificação e dispositivo.
-- Motivo: o envio FCM é idempotente por (notificação, dispositivo) (RNF-ERR-06). A reentrega do
-- mesmo evento não gera segundo push porque a chave composta já existe.
--   * Nenhuma outra tabela muda; `dispositivo_push` e `preferencia_notificacao` já existem desde a
--     baseline.
--   * A exclusão da conta apaga `notificacao` e `dispositivo_push`; as linhas daqui saem pelo
--     ON DELETE CASCADE.

CREATE TABLE "envio_push" (
  "notificacao_id" uuid NOT NULL REFERENCES "notificacao" ("id") ON DELETE CASCADE,
  "dispositivo_id" uuid NOT NULL REFERENCES "dispositivo_push" ("id") ON DELETE CASCADE,
  "enviado_em" timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT envio_push_pk PRIMARY KEY ("notificacao_id", "dispositivo_id")
);

CREATE INDEX envio_push_dispositivo_idx ON "envio_push" ("dispositivo_id");
