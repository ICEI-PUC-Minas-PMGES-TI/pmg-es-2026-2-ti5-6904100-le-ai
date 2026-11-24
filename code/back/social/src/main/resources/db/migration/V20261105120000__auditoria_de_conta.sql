-- F-MOD-OPC (Renato, 05/11/2026) — auditoria da suspensão e da reativação de conta.
-- Kayke: só `log_moderacao`, que é da moderação; nenhuma tabela do feed, das notificações ou das
-- recomendações muda. Nota datada em code/back/social/AGENTS.md.
--   * As ações de conta já cabiam nas CHECKs de 16/09. O motivo do admin vai em `detalhe`, que
--     existia e nunca era preenchida: obrigatório e com até 500 caracteres enquanto a linha não
--     for anonimizada (a CHECK de anonimização, de 18/10, já exige `detalhe` nulo).
--   * Um log por episódio: o `social` grava `criado_em` igual ao instante que o `identidade`
--     devolveu (`suspenso_em`/`reativado_em`), e o índice único segura a repetição, os dois
--     cliques e a retentativa depois de timeout. O predicado não colide com o de
--     `log_moderacao_remocao_uk`, que é só de `remover_conteudo`.

ALTER TABLE "log_moderacao"
  ADD CONSTRAINT log_moderacao_conta_coerente CHECK (
    acao NOT IN ('suspender_conta', 'reativar_conta') OR (
      alvo_tipo = 'usuario'
      AND (anonimizado_em IS NOT NULL
        OR (detalhe IS NOT NULL AND char_length(detalhe) BETWEEN 1 AND 500))
    )
  );

CREATE UNIQUE INDEX log_moderacao_conta_uk
  ON "log_moderacao" (alvo_id, acao, criado_em)
  WHERE alvo_tipo = 'usuario' AND alvo_id IS NOT NULL;
