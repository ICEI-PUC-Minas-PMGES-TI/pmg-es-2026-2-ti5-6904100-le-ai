-- Pendencia registrada em docs/plano-de-desenvolvimento/periodo-1/feature-F-FEED.md:
-- a baseline (V20260916024928) guarda a raiz e o usuario respondido, mas nao o
-- comentario-alvo em si. docs/api/social.yaml exige Comentario.comentarioRespondidoId
-- como o alvo contextual da resposta, mesmo quando o alvo e outra resposta.

ALTER TABLE "comentario" ADD COLUMN comentario_respondido_id uuid;

-- Mesma forma da FK composta de comentario_raiz_id: garante que o alvo pertence a
-- mesma atividade. ON DELETE SET NULL, e nao CASCADE: o alvo e so uma referencia de
-- contexto, apagar o comentario-alvo (fora do escopo do Periodo 1) nao deveria apagar
-- quem respondeu a ele.
ALTER TABLE "comentario" ADD CONSTRAINT comentario_respondido_mesma_atividade_fk
  FOREIGN KEY (comentario_respondido_id, atividade_id)
  REFERENCES "comentario" (id, atividade_id) ON DELETE SET NULL;
