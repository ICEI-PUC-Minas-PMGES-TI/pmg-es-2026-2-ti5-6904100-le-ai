# Planejamento do Renato — Período 3

Pasta do **Renato Douglas** para os planos das features dele no Período 3: [F-MOD-OPC](../feature-F-MOD-OPC.md) e [F-ACV-OPC](../feature-F-ACV-OPC.md). Segue o formato de [`../../periodo-2/renato-periodo-2/`](../../periodo-2/renato-periodo-2/README.md).

Aqui ficam a ordem de trabalho (este arquivo), os prompts de cada etapa (`prompt-F-*.md`) e um plano por feature (`plano-F-*.md`). Status, pendências e timeline continuam no arquivo de cada feature, que prevalece sobre o que estiver aqui.

**Prazos (`../README.md` e plano §3):** Período 3 a partir de 10/11/2026 · **congelamento de features em 17/11** · congelamento de código e deploy de produção em 24/11 · Entrega 6 em 01/12.

## Ordem de trabalho (05/11/2026)

### 0. Fechar o Período 2 — concluído em 05/11/2026

As três features do Período 2 ([F-AVA-2](../../periodo-2/feature-F-AVA-2.md), [F-MOD](../../periodo-2/feature-F-MOD.md) e [F-ACV-NOTA](../../periodo-2/feature-F-ACV-NOTA.md)) foram testadas e validadas em DES pelo dono depois das releases v0.2.0 e v0.2.1. Os itens de DES foram marcados nos três arquivos.

### 1. F-MOD-OPC — Suspensão de conta — a planejar

Feature maior e mais arriscada do período: dois serviços Spring (`social` e `identidade`, este do Henrique), migration nos dois e ocultação de conteúdo que atravessa feed, listas, notificações e recomendações de outros donos. Vem primeiro para ter folga até 17/11.

- Prompt das três etapas (planejar, realizar, validar): [`prompt-F-MOD-OPC.md`](prompt-F-MOD-OPC.md).
- Plano: `plano-F-MOD-OPC.md` (gerado pela etapa 1).

### 2. F-ACV-OPC — Extras de acervo — depois da F-MOD-OPC

Planejada só depois de a F-MOD-OPC estar implementada e validada. Ordem interna sugerida: (a) assuntos em livro pessoal (backend → web → mobile); (b) recarga manual do dump, por último, combinada com o grupo porque roda no Neon. Se o prazo apertar, (b) é o primeiro corte.
