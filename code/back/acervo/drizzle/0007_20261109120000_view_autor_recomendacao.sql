CREATE VIEW "acervo"."v_livro_autor_recomendacao_v1" AS (
    SELECT la.livro_id, la.autor_id
    FROM "acervo"."livro_autor" la
    JOIN "acervo"."livro" l ON l.id = la.livro_id
    WHERE l.tipo = 'oficial' AND l.ativo
  );