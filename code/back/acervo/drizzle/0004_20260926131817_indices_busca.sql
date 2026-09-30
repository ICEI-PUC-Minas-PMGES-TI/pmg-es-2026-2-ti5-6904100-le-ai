-- F-ACV-BUSCA: busca por trecho, sem acento e sem maiúsculas (RF-ACV-01, RNF-DES-03).
-- Fora do schema.ts de propósito, como mensagem_processada: o drizzle-kit não
-- conhece extensão, função nem índice com operator class de extensão.
-- Tudo qualificado: o search_path do serviço é só `acervo`, e o PG 17 restringe
-- o search_path em ANALYZE e REINDEX.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
--> statement-breakpoint
-- IMMUTABLE com o dicionário explícito: o unaccent sozinho é STABLE e não pode
-- entrar em índice. A busca normaliza o termo pela mesma função.
CREATE FUNCTION "acervo"."f_busca_normalizar"(texto text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
  RETURN lower(public.unaccent('public.unaccent'::regdictionary, texto));
--> statement-breakpoint
CREATE INDEX "livro_titulo_busca_trgm_idx" ON "acervo"."livro"
  USING gin ("acervo"."f_busca_normalizar"("titulo") public.gin_trgm_ops)
  WHERE "tipo" = 'oficial' AND "ativo";
--> statement-breakpoint
CREATE INDEX "autor_nome_busca_trgm_idx" ON "acervo"."autor"
  USING gin ("acervo"."f_busca_normalizar"("nome") public.gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "editora_nome_busca_trgm_idx" ON "acervo"."editora"
  USING gin ("acervo"."f_busca_normalizar"("nome") public.gin_trgm_ops);
