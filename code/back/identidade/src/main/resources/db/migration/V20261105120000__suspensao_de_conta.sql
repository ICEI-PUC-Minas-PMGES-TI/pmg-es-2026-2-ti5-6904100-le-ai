-- F-MOD-OPC (Renato, 05/11/2026) — suspensão de conta pela moderação.
-- Henrique: migration no schema do `identidade`, escrita pelo dono da F-MOD-OPC com aviso no
-- grupo e nota datada em code/back/identidade/AGENTS.md. O que muda:
--   * `usuario` ganha as datas da suspensão vigente e da última reativação. A coluna `suspenso`
--     (de 15/09) continua sendo a flag que as VIEWs e os serviços filtram; a CHECK nova amarra
--     a flag à data, então quem grava `suspenso = true` por SQL (testes) grava `suspenso_em` junto.
--   * VIEW `v_conta_moderacao_v1`: contrato lido só pelo pacote `moderacao` do `social`, para o
--     painel do admin ver a conta suspensa (as VIEWs públicas a omitem). Sem a exclusão pendente.
-- Quem escreve as colunas novas é só o `ServicoDeSuspensao` (rotas /internal/moderacao/...).

ALTER TABLE usuario
  ADD COLUMN suspenso_em timestamptz,
  ADD COLUMN reativado_em timestamptz;

-- Defensivo: nenhum código gravava `suspenso` até aqui, mas uma linha marcada à mão ganha data
-- para a CHECK abaixo passar.
UPDATE usuario SET suspenso_em = now() WHERE suspenso AND suspenso_em IS NULL;

ALTER TABLE usuario
  ADD CONSTRAINT usuario_suspensao_coerente CHECK (suspenso = (suspenso_em IS NOT NULL));

CREATE VIEW v_conta_moderacao_v1 AS
SELECT
  id,
  username,
  nome_exibicao,
  avatar_url,
  privacidade,
  suspenso,
  suspenso_em
FROM usuario
WHERE exclusao_solicitada_em IS NULL;

COMMENT ON VIEW v_conta_moderacao_v1 IS
  'Contrato v1 da conta para a moderacao (F-MOD-OPC). Inclui contas suspensas e omite as em '
  'exclusao pendente. Lida so pelo pacote moderacao do social; nao usar para exibir a leitores.';
