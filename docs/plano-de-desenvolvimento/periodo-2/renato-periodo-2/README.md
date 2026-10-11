# Planejamento do Renato — Período 2

Pasta do **Renato Douglas** para centralizar os planos de implementação das features dele no Período 2: [F-AVA-2](../feature-F-AVA-2.md), [F-MOD](../feature-F-MOD.md) e [F-ACV-NOTA](../feature-F-ACV-NOTA.md), conforme a [divisão de 29/09/2026](../README.md#divisão-do-período-2-entre-5-pessoas).

Aqui ficam só a ordem de trabalho (este arquivo) e um plano por feature (`plano-F-*.md`, no formato de [`../../periodo-1/plano-F-AVA.md`](../../periodo-1/plano-F-AVA.md)). Status, pendências e timeline continuam no arquivo de cada feature, que prevalece sobre o que estiver aqui.

## Ordem de trabalho (07/10/2026, atualizada em 09/10/2026)

### 1. Conferir o Período 1 no DES — resolvido em parte

O bloqueio foi resolvido; o DES foi conferido em 07/10/2026 e não mudou desde então. A conferência mostrou:

- os quatro serviços respondem `/health` com 200, com partida a frio de 50 a 100 s no plano gratuito;
- `leai-acervo` e `leai-social` sobem, então o `JWT_SECRET` dos dois foi preenchido no Render;
- `GET /livros` responde 401 sem token, então o código do Período 1 está no ar.

Ninguém registrou ainda o teste do fluxo. Para fechar o item "Fluxo funcionando em DES/HML" do DoD da [F-AVA](../../periodo-1/feature-F-AVA.md) e da [F-ACV-BUSCA](../../periodo-1/feature-F-ACV-BUSCA.md), falta:

- testar busca, página do livro, nota e resenha no DES;
- conferir as filas `leai.social.feed` e `leai.acervo.sinopse` no `Le-ai-oregon`;
- medir a latência da busca (RNF-DES-01, ≤ 1 s p95);
- marcar o item nos dois arquivos de feature.

### 2. Decisões de grupo da F-AVA-2 — decididas pelo dono em 07/10/2026

O Renato decidiu como dono em 07/10, sem esperar o grupo; as decisões só precisam ser **comunicadas**. A lista completa, com as divergências que elas geram, está nas Pendências de [`../feature-F-AVA-2.md`](../feature-F-AVA-2.md#pendências). Em resumo: resenhas antigas viram Markdown sem migration; `Enter` simples quebra a linha; o feed e o card do perfil mostram a prévia sem marcação; frases seguem o RN-08; tachado só com `~~`; o limite conta code points com a marcação; e as ratificações de design seguem o protótipo.

Herdadas da [F-AVA](../../periodo-1/feature-F-AVA.md#pendências), ainda não comunicadas ao grupo:

- a correção do `common-v1` sem nova versão (26/09);
- o feed lendo as VIEWs do `leitura`, contra a arquitetura §3.2 item 4;
- as resenhas de livro pessoal no perfil só para o dono (RN-15);
- os componentes novos que precisam entrar no `documento-de-design.md`.

### 3. F-AVA-2 — Reações, Markdown e frases — concluída em 09/10/2026

Plano em [`plano-F-AVA-2.md`](plano-F-AVA-2.md); status, testes e débitos em [`../feature-F-AVA-2.md`](../feature-F-AVA-2.md). Três commits na `renato-features`, mergeados na `desenvolvimento` e enviados ao GitHub em 09/10, com a CI verde; no kanban, em `Em revisão (PR)`. A via lista deixou de ser pendência: o Henrique entregou a etapa 3 da F-LST em 08/10. Ficaram como débito a copy das duas curtidas (com o Kayke) e o DES, no merge de fechamento.

Para levar ao grupo:

- avisar o Kayke, o Vicenzo e o Henrique do código deles que a feature alterou (lista na feature);
- duas observações do teste manual: o `acervo` cai quando o Neon fecha uma conexão ociosa (Vicenzo) e, no app, o perfil aberto pelo feed não mostra resenhas nem estante (Kayke).

### 4. F-MOD — Moderação

Depende da F-AVA-2, porque remove resenha e frase pelo comando HTTP interno `social` → `leitura`; a F-AVA-2 está pronta desde 09/10. Ao planejar:

- o menu `DotsThree` de cada resenha ainda não existe: a F-AVA-2 usou botões para as reações (decisão 11), e é a F-MOD que abre o menu, com `Denunciar`;
- o trecho de três linhas do card da denúncia **não reaproveita `textoSemMarcacao`**: [`denunciar.md`](../../../design/periodo-2/F-MOD/denunciar.md) (linha 281) pede o itálico do original. Monte o trecho a partir de `arvoreDaResenha` (web e app), que já tem a formatação;
- o comando interno de remoção ainda não existe no `leitura`: as rotas de frase são só do autor (`DELETE /frases/{id}`).

Inclui o `Denunciar comentário` na tela de comentários do Kayke. O painel é só web. As decisões do dono (limite do motivo, denúncia repetida, conteúdo já excluído, espera do rate limit) estão nas Pendências de [`../feature-F-MOD.md`](../feature-F-MOD.md#pendências).

### 5. F-ACV-NOTA — Nota geral e cache de capas

É independente das outras duas e fica por último de propósito: se o período apertar, o [README do período](../README.md#alternativas-se-o-peso-ficar-torto) prevê devolvê-la ao Vicenzo. A F-ACV-DESCOBERTA já está na `desenvolvimento`; os campos de nota entram no mesmo `LivroOficialDetalhe` que ela ampliou (aviso nas Pendências de [`../feature-F-ACV-NOTA.md`](../feature-F-ACV-NOTA.md#pendências)). Pré-requisitos externos: conta e configuração do Cloudinary (P-09) e o formato concreto do `ol_dump_ratings`.

### 6. Tabelas para a matriz de remoção da F-CONTA-2

A [F-CONTA-2](../feature-F-CONTA-2.md) já foi entregue, e o consumidor de `conta.excluida` do `leitura` já remove `reacao_resenha` e `frase`. A F-AVA-2 não criou tabela nova (a VIEW `v_reacao_resenha_v1` não guarda dados). Falta avisar ao Henrique as tabelas novas da F-MOD e da F-ACV-NOTA, quando existirem, para entrarem nos consumidores de `conta.excluida`.

### Fora da sequência

- Contribuição semanal da semana de 30/09 a 06/10 (tarefa 7 de gerência) ainda não registrada em [`assets/contribuicao_semanal/renato.md`](../../../../assets/contribuicao_semanal/renato.md).
