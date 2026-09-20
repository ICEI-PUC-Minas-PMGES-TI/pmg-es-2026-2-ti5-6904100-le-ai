-- A migration anterior criou a tabela sem qualificar o schema. Move a tabela
-- vazia para o schema do servico, preservando qualquer recibo que exista.
DO $$
BEGIN
  IF to_regclass('public.mensagem_processada') IS NOT NULL
     AND to_regclass('identidade.mensagem_processada') IS NULL THEN
    ALTER TABLE public.mensagem_processada SET SCHEMA identidade;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS identidade.mensagem_processada (
  consumidor   text        NOT NULL,
  event_id     uuid        NOT NULL,
  processado_em timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mensagem_processada_pk PRIMARY KEY (consumidor, event_id),
  CONSTRAINT mensagem_processada_consumidor_preenchido
    CHECK (btrim(consumidor) <> '')
);
