-- Recibo técnico de consumo. A chave composta torna a confirmação idempotente
-- por consumidor sem depender de uma unicidade global do business key.
CREATE TABLE mensagem_processada (
  consumidor   text        NOT NULL,
  event_id     uuid        NOT NULL,
  processado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mensagem_processada_pk PRIMARY KEY (consumidor, event_id),
  CONSTRAINT mensagem_processada_consumidor_preenchido
    CHECK (btrim(consumidor) <> '')
);
