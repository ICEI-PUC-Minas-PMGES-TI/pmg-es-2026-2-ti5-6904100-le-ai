-- F-MOD-OPC (Renato, 06/11/2026) — intenção pendente de suspender ou reativar conta.
-- Kayke: só uma tabela nova da moderação; nada do feed, das notificações ou das recomendações
-- muda. Nota datada em code/back/social/AGENTS.md. Motivo: revisão do PR #61.
--   * O painel grava a intenção (admin, chave de idempotência, conta e motivo) ANTES de chamar o
--     `identidade`, com um id derivado do admin, da ação e da chave. É esse id que vai no
--     `X-Comando-Id`, e o `identidade` guarda o resultado por ele.
--   * A linha sai na mesma transação que grava o log e o recibo. Se a resposta se perdeu
--     (timeout), ela fica: a repetição com a mesma chave a conclui, e a próxima ação sobre a mesma
--     conta resolve a pendente antes (grava a auditoria original com o motivo daqui, ou a cancela
--     no `identidade` se ela nunca rodou).
--   * A exclusão da conta apaga as linhas dela (ConsumidorDeContaExcluida).

CREATE TABLE "comando_de_conta" (
  "id" uuid PRIMARY KEY,
  "admin_id" uuid NOT NULL,
  "acao" text NOT NULL,
  "chave" text NOT NULL,
  "usuario_id" uuid NOT NULL,
  "motivo" text NOT NULL,
  "criado_em" timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT comando_de_conta_acao_valida CHECK (acao IN ('suspender_conta', 'reativar_conta')),
  CONSTRAINT comando_de_conta_motivo_valido CHECK (char_length(motivo) BETWEEN 1 AND 500)
);

CREATE INDEX comando_de_conta_usuario_idx ON "comando_de_conta" (usuario_id, criado_em);
