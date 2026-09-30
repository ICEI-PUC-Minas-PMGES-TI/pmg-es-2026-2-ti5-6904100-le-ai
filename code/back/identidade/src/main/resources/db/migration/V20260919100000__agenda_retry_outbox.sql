ALTER TABLE identidade.outbox_identidade
  ADD COLUMN proxima_tentativa_em timestamptz;
