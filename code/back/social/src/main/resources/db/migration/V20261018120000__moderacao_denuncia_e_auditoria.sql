-- F-MOD (Renato, 18/10/2026): denúncia, remoção e auditoria da moderação.
--
-- As duas tabelas vêm do baseline (V20260916024928) e estavam vazias em dev e no DES em
-- 18/10/2026, por isso `denuncia.alvo_autor_id` já nasce NOT NULL.
--
-- Por que as colunas novas: a moderação apaga o conteúdo (comentário, resenha, frase), e o
-- consumidor de `conta.excluida` só achava denúncias e logs pelas linhas que ainda existiam.
-- Sem o autor gravado aqui, a exclusão de conta posterior deixaria o motivo e o alvo sem
-- anonimizar (RN-23.7). O livro e o dono da atividade servem à aba de auditoria e ao fechamento
-- das denúncias dos comentários de uma atividade removida.

ALTER TABLE "denuncia"
  ADD COLUMN alvo_autor_id         uuid NOT NULL,
  ADD COLUMN alvo_livro_id         uuid,
  ADD COLUMN atividade_id          uuid,
  ADD COLUMN atividade_autor_id    uuid,
  -- Remoção pedida ao `leitura` e ainda não confirmada: enquanto existir, arquivar é recusado.
  ADD COLUMN remocao_solicitada_em timestamptz,
  ADD CONSTRAINT denuncia_motivo_limite CHECK (char_length(motivo) <= 500),
  ADD CONSTRAINT denuncia_remocao_so_pendente CHECK (
    remocao_solicitada_em IS NULL OR estado = 'pendente'
  );

-- Uma denúncia pendente por leitor e alvo: a repetida devolve a existente.
CREATE UNIQUE INDEX denuncia_pendente_por_denunciante_uk
  ON "denuncia" (denunciante_id, alvo_tipo, alvo_id) WHERE estado = 'pendente';
CREATE INDEX denuncia_alvo_autor_idx ON "denuncia" (alvo_autor_id);
CREATE INDEX denuncia_atividade_idx ON "denuncia" (atividade_id) WHERE atividade_id IS NOT NULL;
CREATE INDEX denuncia_atividade_autor_idx
  ON "denuncia" (atividade_autor_id) WHERE atividade_autor_id IS NOT NULL;

ALTER TABLE "log_moderacao"
  ADD COLUMN alvo_autor_id      uuid,
  ADD COLUMN alvo_livro_id      uuid,
  ADD COLUMN atividade_autor_id uuid,
  DROP CONSTRAINT log_moderacao_anonimizacao_coerente,
  ADD CONSTRAINT log_moderacao_anonimizacao_coerente CHECK (
    (anonimizado_em IS NULL AND alvo_id IS NOT NULL) OR
    (anonimizado_em IS NOT NULL AND anonimizado_em >= criado_em
      AND alvo_id IS NULL AND denuncia_id IS NULL AND detalhe IS NULL
      AND alvo_autor_id IS NULL AND alvo_livro_id IS NULL AND atividade_autor_id IS NULL)
  );

-- Um único log de remoção por alvo: dois cliques, ou o reenvio depois de um timeout, não
-- duplicam a auditoria.
CREATE UNIQUE INDEX log_moderacao_remocao_uk
  ON "log_moderacao" (alvo_tipo, alvo_id)
  WHERE acao = 'remover_conteudo' AND alvo_id IS NOT NULL;
CREATE INDEX log_moderacao_alvo_autor_idx
  ON "log_moderacao" (alvo_autor_id) WHERE alvo_autor_id IS NOT NULL;
CREATE INDEX log_moderacao_atividade_autor_idx
  ON "log_moderacao" (atividade_autor_id) WHERE atividade_autor_id IS NOT NULL;
