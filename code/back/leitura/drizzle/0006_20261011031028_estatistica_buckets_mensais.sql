-- F-STA: estatísticas em baldes mensais. O ano passa a ser a soma dos seus meses
-- e o acumulado a soma de todos, então `estatistica_anual` e `estatistica_usuario`
-- (da 0001, nunca preenchidas) saem. O mês ganha o que faltava para as médias do
-- painel por ano: dias com leitura, dias em leituras concluídas e soma/quantidade
-- das notas. Sem dado a migrar: as três tabelas estão vazias em todo ambiente, e
-- `npm run backfill:estatisticas` preenche o mês a partir do próprio schema.
-- Gerada pelo `db:generate`, sem os `DISABLE ROW LEVEL SECURITY` (RLS nunca foi
-- ligado nessas tabelas) e sem `CASCADE` (nada depende delas).
DROP TABLE "leitura"."estatistica_anual";--> statement-breakpoint
DROP TABLE "leitura"."estatistica_usuario";--> statement-breakpoint
ALTER TABLE "leitura"."estatistica_mensal" DROP CONSTRAINT "estatistica_mensal_totais_ck";--> statement-breakpoint
ALTER TABLE "leitura"."estatistica_mensal" ADD COLUMN "dias_com_leitura" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leitura"."estatistica_mensal" ADD COLUMN "dias_em_livros_concluidos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leitura"."estatistica_mensal" ADD COLUMN "notas_quantidade" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leitura"."estatistica_mensal" ADD COLUMN "notas_soma" numeric(10, 1) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leitura"."estatistica_mensal" ADD CONSTRAINT "estatistica_mensal_totais_ck" CHECK ("leitura"."estatistica_mensal"."livros_concluidos" >= 0 and "leitura"."estatistica_mensal"."paginas_lidas" >= 0 and "leitura"."estatistica_mensal"."minutos_lidos" >= 0 and "leitura"."estatistica_mensal"."dias_com_leitura" >= 0 and "leitura"."estatistica_mensal"."dias_em_livros_concluidos" >= 0 and "leitura"."estatistica_mensal"."notas_quantidade" >= 0 and "leitura"."estatistica_mensal"."notas_soma" >= 0);
