-- Feita por F-AVA (Renato) em 27/09/2026, com revisao do dono do servico (Kayke).
-- Registro em code/back/social/AGENTS.md e em docs/mensageria/README.md (Historico).
--
-- 701 livros oficiais do acervo nao tem autor: acervo.v_livro_referencia_v1.autor_exibicao
-- sai NULL para eles, e o LivroSnapshot.autor do common-v1 passou a aceitar null
-- (26/09/2026). Sem esta migration, o INSERT da atividade falharia no NOT NULL, e o catch
-- de DataIntegrityViolationException do ConsumidorDeAtividade engoliria o erro: a
-- atividade sumiria sem ir para a DLQ.
--
-- O CHECK atividade_snap_livro_autor_preenchido (btrim(snap_livro_autor) <> '') nao muda:
-- com NULL ele passa, e texto vazio continua proibido.

ALTER TABLE "atividade" ALTER COLUMN snap_livro_autor DROP NOT NULL;
