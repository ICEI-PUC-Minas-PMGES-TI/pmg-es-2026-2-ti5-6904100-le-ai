-- F-MOD-OPC (Renato, 06/11/2026): curtidas e descurtidas de resenha deixam de contar a reação de
-- conta suspensa ou com exclusão pendente (fora de identidade.v_perfil_referencia_v1), como o resto
-- do conteúdo dela. A reação continua gravada e volta a contar na reativação. Só a VIEW muda, com
-- as mesmas colunas; o acervo (página do livro) e o social (moderação, feed) a leem.
DROP VIEW "leitura"."v_resenha_publicacao_v1";--> statement-breakpoint
CREATE VIEW "leitura"."v_resenha_publicacao_v1" AS (select
    "leitura"."resenha"."id" as resenha_id,
    "leitura"."resenha"."usuario_id" as usuario_id,
    "leitura"."resenha"."livro_id" as livro_id,
    "leitura"."resenha"."texto" as texto,
    "leitura"."resenha"."spoiler" as spoiler,
    "leitura"."resenha"."criado_em" as criado_em,
    "leitura"."resenha"."atualizado_em" as atualizado_em,
    count("leitura"."reacao_resenha"."id") filter (where "leitura"."reacao_resenha"."ativa" and "leitura"."reacao_resenha"."tipo" = 'curtida' and exists (select 1 from "identidade"."v_perfil_referencia_v1" p where p.id = "leitura"."reacao_resenha"."usuario_id")) as curtidas,
    count("leitura"."reacao_resenha"."id") filter (where "leitura"."reacao_resenha"."ativa" and "leitura"."reacao_resenha"."tipo" = 'descurtida' and exists (select 1 from "identidade"."v_perfil_referencia_v1" p where p.id = "leitura"."reacao_resenha"."usuario_id")) as descurtidas
  from "leitura"."resenha"
  left join "leitura"."reacao_resenha" on "leitura"."reacao_resenha"."resenha_id" = "leitura"."resenha"."id"
  group by "leitura"."resenha"."id");