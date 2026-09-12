-- Migration inicial do serviço `acervo` (P0-INFRA).
-- Cria/valida apenas o schema lógico do serviço no PostgreSQL único do Neon
-- (arquitetura §4.1). NENHUMA tabela de domínio entra aqui — elas chegam
-- com as features de ACV, cada migration revisada por humano (plano §5).
CREATE SCHEMA IF NOT EXISTS "acervo";
