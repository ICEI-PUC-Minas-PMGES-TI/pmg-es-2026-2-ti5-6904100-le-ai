-- Autor que a OpenLibrary cadastrou mais de uma vez (ou ligou a um homônimo).
-- O subcomando `unificar` da ingestão junta o duplicado ao canônico e grava a
-- chave dele aqui, a partir de `dados/autores_unificados.csv`. A carga do dump e
-- a importação por ISBN consultam a tabela antes de criar autor pela chave, para
-- o duplicado não voltar. Sem dado: quem popula é o `unificar`.
CREATE TABLE "acervo"."autor_chave_unificada" (
	"ol_author_key" text PRIMARY KEY NOT NULL,
	"autor_id" uuid NOT NULL,
	CONSTRAINT "autor_chave_unificada_formato_ck" CHECK ("acervo"."autor_chave_unificada"."ol_author_key" ~ '^OL[0-9]+A$')
);
--> statement-breakpoint
ALTER TABLE "acervo"."autor_chave_unificada" ADD CONSTRAINT "autor_chave_unificada_autor_id_autor_id_fk" FOREIGN KEY ("autor_id") REFERENCES "acervo"."autor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autor_chave_unificada_autor_id_idx" ON "acervo"."autor_chave_unificada" USING btree ("autor_id");