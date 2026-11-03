-- F-ACV-DESCOBERTA: biografia curta da OpenLibrary (RF-ACV-10). A ingestão e a
-- importação por ISBN cortam o texto em 2000 caracteres e gravam NULL quando a
-- fonte não tem biografia; o CHECK impede que uma string vazia vire seção vazia.
ALTER TABLE "acervo"."autor" ADD CONSTRAINT "autor_biografia_ck" CHECK ("acervo"."autor"."biografia" IS NULL OR (char_length("acervo"."autor"."biografia") <= 2000 AND btrim("acervo"."autor"."biografia") <> ''));
--> statement-breakpoint
-- Filtro `serie` de GET /livros (RF-ACV-03): casa por trecho sobre o nome
-- normalizado, como título, autor e editora na `0004`. Fora do schema.ts pelo
-- mesmo motivo: o drizzle-kit não conhece operator class de extensão.
-- Tudo qualificado: o search_path do serviço é só `acervo`.
CREATE INDEX "serie_nome_busca_trgm_idx" ON "acervo"."serie"
  USING gin ("acervo"."f_busca_normalizar"("nome") public.gin_trgm_ops);
