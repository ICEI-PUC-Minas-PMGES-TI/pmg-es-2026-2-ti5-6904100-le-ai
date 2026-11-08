# Planejamento do Renato — Período 3

Pasta do **Renato Douglas** para os planos das features dele no Período 3: [F-MOD-OPC](../feature-F-MOD-OPC.md) e [F-ACV-OPC](../feature-F-ACV-OPC.md). Segue o formato de [`../../periodo-2/renato-periodo-2/`](../../periodo-2/renato-periodo-2/README.md).

Aqui ficam a ordem de trabalho (este arquivo), os prompts de cada etapa (`prompt-F-*.md`) e um plano por feature (`plano-F-*.md`). Status, pendências e timeline continuam no arquivo de cada feature, que prevalece sobre o que estiver aqui.

**Prazos (`../README.md` e plano §3):** Período 3 a partir de 10/11/2026 · **congelamento de features em 17/11** · congelamento de código e deploy de produção em 24/11 · Entrega 6 em 01/12.

## Ordem de trabalho (05/11/2026)

### 0. Fechar o Período 2 — concluído em 05/11/2026

As três features do Período 2 ([F-AVA-2](../../periodo-2/feature-F-AVA-2.md), [F-MOD](../../periodo-2/feature-F-MOD.md) e [F-ACV-NOTA](../../periodo-2/feature-F-ACV-NOTA.md)) foram testadas e validadas em DES pelo dono depois das releases v0.2.0 e v0.2.1. Os itens de DES foram marcados nos três arquivos.

### 1. F-MOD-OPC — Suspensão de conta — concluída, mergeada na `desenvolvimento` em 06/11/2026

Feature maior e mais arriscada do período: dois serviços Spring (`social` e `identidade`, este do Henrique), migration nos dois e ocultação de conteúdo que atravessa feed, listas, notificações e recomendações de outros donos. Vem primeiro para ter folga até 17/11.

- Prompt das três etapas (planejar, realizar, validar): [`prompt-F-MOD-OPC.md`](prompt-F-MOD-OPC.md).
- Plano: [`plano-F-MOD-OPC.md`](plano-F-MOD-OPC.md), de 05/11/2026, revisado em duas rodadas (15 + 9 achados).
- Implementada em 05 e 06/11/2026: [PR #61](https://github.com/ICEI-PUC-Minas-PMGES-TI/pmg-es-2026-2-ti5-6904100-le-ai/pull/61) para a `desenvolvimento`, validado por quatro agentes de contexto limpo e pelo teste manual (web no Edge, app no emulador) contra os serviços locais e o banco de dev. Débitos da feature fechados em 06/11 (commit `e566229`); a etapa 3b revisou a feature inteira com contexto limpo no mesmo dia e as correções entraram no commit `a43abef`; migrations aplicadas no dev; segredos já no Render. O Vicenzo aprovou depois de duas rodadas de revisão e o PR foi mergeado na `desenvolvimento` em 06/11/2026 às 22:44 (`1281aa1`); as migrations `V20261106200000__comando_de_conta` da revisão foram aplicadas no dev logo depois. O DES vem com o merge da `main`, no fechamento de novembro. Status em [`feature-F-MOD-OPC.md`](../feature-F-MOD-OPC.md).

### 2. F-ACV-OPC — Extras de acervo — em revisão no PR #62 para a `desenvolvimento`

Prompt das quatro etapas, cada uma com um agente de contexto limpo (planejar, revisar o plano, realizar e revisar, revisão independente e PR): [`prompt-F-ACV-OPC.md`](prompt-F-ACV-OPC.md), de 06/11/2026.

- Plano: [`plano-F-ACV-OPC.md`](plano-F-ACV-OPC.md), de 06/11/2026, revisado no mesmo dia por um agente de contexto limpo com 12 achados (veredito: aprovar com ajustes), mais a decisão 9 do dono.
- Implementada em 06 e 07/11/2026 (etapa 3), sem migration: (a) assuntos do conjunto curado no livro pessoal (`acervo`, web e app) e (b) recarga manual do dump no script, validada só na amostra em Postgres descartável. Quatro validadores de contexto limpo; os achados entraram no commit `98c9690`. Teste manual na web (Edge) e no app (emulador) contra o banco de dev. Status em [`feature-F-ACV-OPC.md`](../feature-F-ACV-OPC.md).
- Revisão independente (etapa 4) em 07/11/2026: quatro revisores de contexto limpo, um por camada. `acervo` sem achados; os achados baixos da web (foco e alvo de toque do seletor, largura do `Concluir`), do mobile (rótulo repetido, vão entre chips, rodapé em 320 dp) e do script (dois testes que faltavam, passo `biografias` no roteiro) foram corrigidos com teste no commit `e5874da`. Testes: `acervo` 392 + 189 de integração, script 143 (17 de banco), web 1118, mobile 951.
- **[PR #62](https://github.com/ICEI-PUC-Minas-PMGES-TI/pmg-es-2026-2-ti5-6904100-le-ai/pull/62)** aberto para a `desenvolvimento` em 07/11/2026, sem migration; card #31 em "Em revisão (PR)". Falta a revisão do PR e o merge. A execução real da recarga em dev e DES é pendência do grupo (decisão 4); o DES vem com o merge da `main`, no fechamento de novembro.
