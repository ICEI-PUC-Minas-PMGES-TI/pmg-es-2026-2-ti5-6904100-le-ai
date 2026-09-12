-- Migration inicial do serviço `leitura` (P0-INFRA).
-- Cria/valida apenas o schema lógico do serviço no PostgreSQL único do Neon
-- (arquitetura §4.1). NENHUMA tabela de domínio entra aqui — elas chegam
-- com as features de EST/PRG/AVA/DSF/STA/GAM, cada migration revisada por
-- humano (plano §5).
CREATE SCHEMA IF NOT EXISTS "leitura";
