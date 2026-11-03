-- F-AVA-2: reação ativa de cada leitor a cada resenha, para o `acervo` devolver a
-- reação de quem está vendo junto das resenhas da página do livro. Só cria a VIEW:
-- nenhuma tabela muda. Escrita à mão, porque o snapshot anterior não tinha
-- `outbox_leitura.proxima_tentativa_em` (coluna criada pela 0003) e o `db:generate`
-- repetiria o ADD COLUMN; o snapshot desta migration já traz a coluna.
CREATE VIEW "leitura"."v_reacao_resenha_v1" AS (select
    "leitura"."reacao_resenha"."resenha_id" as resenha_id,
    "leitura"."reacao_resenha"."usuario_id" as usuario_id,
    "leitura"."reacao_resenha"."tipo" as tipo
  from "leitura"."reacao_resenha"
  where "leitura"."reacao_resenha"."ativa");
