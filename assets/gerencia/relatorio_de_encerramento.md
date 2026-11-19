<!-- Artefato de Gerência de Projetos. RASCUNHO de 19/11/2026: compara o planejado no TAP nº 01, na
     Declaração de Escopo, na EAP, no orçamento e no plano de projeto com o que foi realizado, citando a
     fonte de cada número e de cada data. Não decide nada: o que depende do grupo ou de depois de 24/11
     está marcado com "A completar". Sem template da disciplina: estrutura de encerramento do PMBOK. -->

# Gerência de Projetos de Software

## Relatório de Encerramento do Projeto

> **Rascunho de 19/11/2026.** Cobre o projeto até esta data: Períodos 0 a 2 completos e o Período 3 até
> o congelamento de features (17/11/2026) e o merge dos testes de 19/11/2026. O que acontece depois de
> 24/11 (congelamento de código, release final, produção, pitch e entrega final) e o que só o grupo pode
> dizer (lições aprendidas, avaliação, horas, aceite) estão marcados e são completados no fechamento.
>
> **O que este documento é:** o balanço do projeto **Lê Ai** contra a sua linha de base: objetivos,
> escopo, prazo, custo, qualidade e riscos planejados × realizados, as lições aprendidas e a situação em
> que o produto é entregue.
>
> **O que este documento não é:** especificação de produto (`docs/orquestador/REQUISITOS.md`), processo
> de trabalho (`docs/orquestador/plano-de-projeto.md`) nem status de feature, que fica no arquivo de
> cada uma (`docs/plano-de-desenvolvimento/periodo-*/feature-*.md`).

| Campo | Conteúdo |
| --- | --- |
| **Projeto** | Lê Ai |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza |
| **Documentos de origem** | [TAP nº 01](../atas/TermoDeAberturaDoProjeto.pdf), [Declaração de Escopo](declaracao_de_escopo.md), [EAP](eap.md), [Matriz RACI](matriz_raci.md), [Orçamento](orcamento_do_projeto.md) e [plano de projeto](../../docs/orquestador/plano-de-projeto.md) |
| **Período do projeto** | 04/08/2026 a 15/12/2026 (TAP 3) |
| **Data de status** | 19/11/2026 |
| **Versão** | 0.1 (rascunho), de 19/11/2026, por Renato Douglas Nascimento Silva de Oliveira |

Convenções: datas e horas no horário de Brasília. "`desenvolvimento`" é a branch de trabalho e "`main`"
a que roda no ambiente de DES/HML (plano de projeto §4 e §5). Cada número traz a fonte entre parênteses
ou no cabeçalho da tabela.

---

## 1. Identificação do projeto e da equipe

| Campo | Conteúdo | Fonte |
| --- | --- | --- |
| Nome | Lê Ai: aplicativo social de leitura | TAP 1.1 |
| Tipo | Desenvolvimento de novo produto | TAP 1.4 |
| Cliente | Leitores brasileiros jovens, representados pela persona Marina Torres; aceite formal pelos patrocinadores | TAP 1.3 e 1.4 |
| Disciplina | Trabalho Interdisciplinar V, PUC Minas | `Previsoes-do-Cronograma-Le-Ai.xlsx`, aba Capa |
| Abertura | Reunião de *kickoff* em 23/08/2026, com o TAP nº 01 aprovado pelo grupo | [`ATA-2026-08-23.md`](../atas/ATA-2026-08-23.md) |

**Equipe** (TAP 5 e [`ATA-2026-08-23.md`](../atas/ATA-2026-08-23.md)). Os cinco atuam como
desenvolvedores full-stack; a frente indica só o foco principal.

| Nome | Papel no projeto |
| --- | --- |
| Vicenzo Fonseca de Mello Souza | Gerente do projeto e desenvolvedor full-stack |
| Henrique Moreira Gomes de Carvalho | Desenvolvedor full-stack, frente de aplicativo móvel (Flutter) |
| Renato Douglas Nascimento Silva de Oliveira | Desenvolvedor full-stack, frente de microsserviços e mensageria |
| Ana Luiza de Freitas Rodrigues | Desenvolvedora full-stack, frente de aplicação web (Vue) |
| Kayke Emanoel de Souza Santos | Desenvolvedor full-stack, frente de infraestrutura, CI/CD e banco de dados |

**Patrocinadores** (Declaração de Escopo §8): Prof. Artur Martins Mol, Prof. João Paulo Carneiro
Aramuni e Prof. Leonardo Vilela Cardoso.

A divisão real do trabalho foi por feature, de ponta a ponta (plano de projeto §6). O dono de cada uma
está na tabela-mestre do [plano de desenvolvimento](../../docs/plano-de-desenvolvimento/README.md).

---

## 2. Objetivos do TAP × resultado alcançado

**Objetivo (TAP 1.5):** "Desenvolver e colocar em produção, até 15/12/2026, um aplicativo social de
leitura, mobile em Flutter, web em Vue e backend em microsserviços, com o propósito de aumentar a adesão
e a constância de leitura entre jovens brasileiros."

| Elemento do objetivo | Resultado em 19/11/2026 | Fonte |
| --- | --- | --- |
| Mobile em Flutter, web em Vue, backend em microsserviços | Os três existem: `code/mobile`, `code/front` e os quatro serviços `identidade`, `social` (Spring), `acervo` e `leitura` (NestJS), todos com CI verde | plano de testes §9.7 |
| Em DES (homologação) | A `main` roda o Período 2 (release `v0.2.1`, 03/11/2026). O Período 3 está só na `desenvolvimento` e chega ao DES no merge da `main` do fim de novembro | `gh release list`; `git log origin/main` |
| Em produção até 15/12 | > A completar após 24/11: deploy de produção a partir de tag (marco M8) e URL do ambiente. Virá do PR de fechamento, da tag final e do painel do Render. | — |
| Aumentar adesão e constância de leitura | Não medido: o projeto não previu métrica de uso com leitores reais | Declaração de Escopo §6 (marcos) |

**Requisitos de qualidade (TAP 1.7):**

| Requisito | Resultado em 19/11/2026 | Fonte |
| --- | --- | --- |
| Usabilidade: avaliação heurística dos protótipos antes do desenvolvimento | Feita. A ata de 11/09 registra a Entrega 3 (protótipos corrigidos e avaliação heurística) como entregue; o relatório está no repositório desde 15/09/2026 | [`ATA-2026-09-11.md`](../atas/ATA-2026-09-11.md); [`6.1.avaliacao_heuristica_leai.md`](../../docs/6.1.avaliacao_heuristica_leai.md) (`git log`) |
| Desempenho: telas principais em até 2 s no percentil 80, em rede móvel | Ainda não medido. O cenário 3 do ATAM (busca até 1 s no p95) também aguarda a medição em DES | [`8.avaliacao_arquitetura.md`](../../docs/8.avaliacao_arquitetura.md) §8.2 |
| Disponibilidade: ambientes acessíveis durante a avaliação | DES no ar com a `v0.2.1`. > A completar após 24/11: disponibilidade de PROD no período de avaliação. | `gh release list` |
| Segurança: hash de senha, token, recuperação de uso único, LGPD | Token e recuperação de uso único cobertos por casos automatizados (CT-AUT-08 a CT-AUT-12, CT-TRV-05). Hash de senha e LGPD sem caso dedicado no plano; a exclusão de conta (F-CONTA-2) tem casos próprios. A medição do ATAM de segurança em DES está pendente | plano de testes §9.6.1, §9.6.11 e §9.6.12; `8.avaliacao_arquitetura.md` §8.2 |
| Manutenibilidade: testes junto com a feature e CI verde como portão | 4.217 testes passando nos sete projetos em 19/11/2026, sem falha nem teste pulado; 722 casos de teste ligados a testes automatizados | plano de testes §9.7 |
| Portabilidade: Android e iOS; web nos navegadores atuais | Android: APK gerado pelo CI (plano de projeto §4). iOS: o build é resíduo aberto do Período 0 | [README do Período 0](../../docs/plano-de-desenvolvimento/periodo-0/README.md), "Situação ao fim do Período 1" |
| Custo operacional: tudo em planos gratuitos | Desembolso de R$ 0,00 até a última data de status do orçamento (26/10/2026); ver a seção 5 | `orcamento_do_projeto.md` §6 |

**Entregáveis (TAP 2.3):**

| Entregável | Situação em 19/11/2026 | Fonte |
| --- | --- | --- |
| 1. App Flutter com o escopo completo, em produção | Funcional até o Período 3 na `desenvolvimento`; produção pendente | seções 3 e 9 |
| 2. Web em Vue com o subconjunto, em produção | Idem | seções 3 e 9 |
| 3. Backend em microsserviços com mensageria, PostgreSQL e OpenAPI | Quatro serviços, quatro contratos OpenAPI em `docs/api/` e o HTML estático deles em `docs/api/html/` (19/11/2026) | [`docs/api/README.md`](../../docs/api/README.md) |
| 4. Documentação de engenharia | Requisitos, Documento de Arquitetura (v1.8, 25/10/2026), diagramas, protótipos e avaliação heurística no repositório. > A completar após 24/11: Documento de Arquitetura final. | cabeçalho do `docs/orquestador/documento-de-arquitetura.md` |
| 5. Artefatos de processo | TAP, Declaração de Escopo, EAP, RACI, orçamento, previsões do cronograma, plano de desenvolvimento, atas e contribuição semanal entregues. O **registro de partes interessadas** continua planejado e não foi feito | [`assets/gerencia/README.md`](README.md), "Artefatos ainda planejados" |
| 6. Encerramento: releases, ATAM, relatório, vídeo e pitch | Releases `v0.1.0`, `v0.2.0` e `v0.2.1`; este rascunho. > A completar após 24/11: release final, ATAM com medições, vídeo e pitch. | `gh release list` |

---

## 3. Escopo: planejado × entregue

**Planejado.** O plano de desenvolvimento aloca os **130 RFs** do `REQUISITOS.md` (54 essenciais, 61
desejáveis e 15 opcionais) em **37 features**: 6 de fundação (Período 0), 10 prioritárias (Período 1),
14 desejáveis (Período 2) e 7 opcionais (Período 3)
([`docs/plano-de-desenvolvimento/README.md`](../../docs/plano-de-desenvolvimento/README.md), "Cobertura"
e tabela-mestre). A ata de abertura fala em 129 requisitos funcionais
([`ATA-2026-08-23.md`](../atas/ATA-2026-08-23.md), "Backlog do produto"); este relatório usa o número do
plano de desenvolvimento.

**Entregue, por período:**

| Período | Planejado | Entregue em 19/11/2026 | Fonte |
| --- | --- | --- | --- |
| 0. Fundação | 6 frentes (P0-INFRA, P0-CI, P0-DEPLOY, P0-MSG, P0-DS, P0-NAV) | As 6 em DES, validadas pelos responsáveis (ata de 22/09). P0-DEPLOY e P0-NAV concluídas; as outras quatro com resíduos registrados (build iOS, *required status checks* na `main`, auditoria do Maven, componentes do design system além do piloto, provas de integração da mensageria), nenhum bloqueando feature | [`ATA-2026-09-22.md`](../atas/ATA-2026-09-22.md); [README do Período 0](../../docs/plano-de-desenvolvimento/periodo-0/README.md) |
| 1. Prioritárias | 10 features | As 10, na `main` em 29/09/2026 (PR #45, `v0.1.0`). Nada desceu de prioridade | [README do Período 1](../../docs/plano-de-desenvolvimento/periodo-1/README.md), "Fechamento do Período 1" |
| 2. Desejáveis | 14 features | As 14, mergeadas na `desenvolvimento` até 25/10/2026 (o último, PR #57, às 22:09) e na `main` em 03/11/2026 (PR #58, `v0.2.0` e `v0.2.1`) | [README do Período 2](../../docs/plano-de-desenvolvimento/periodo-2/README.md), "Situação em 25/10/2026"; `gh pr list --state merged` |
| 3. Opcionais | 7 features | 5 mergeadas na `desenvolvimento`: F-MOD-OPC (PR #61, 06/11), F-ACV-OPC (#62, 08/11), F-STA-OPC (#63, 08/11), F-NOT-OPC (#65, 15/11) e F-DSF-OPC (#64, 16/11). F-REC-ALG e F-GAM-OPC estão "não iniciado" nos arquivos de feature e não tiveram PR até 19/11 | `gh pr list --state merged`; arquivos de feature do [Período 3](../../docs/plano-de-desenvolvimento/periodo-3/README.md) |

Os horários de merge dos PRs do Período 3 (`gh pr view <n> --json mergedAt`): #61 em 06/11 22:44, #62 em
08/11 00:35, #63 em 08/11 17:48, #65 em 15/11 21:41 e #64 em 16/11 19:41. Todos antes do congelamento de
features de 17/11 (plano de projeto §3).

**Cortado ou fora do entregue:**

| Item | O que aconteceu | Fonte |
| --- | --- | --- |
| F-REC-ALG (Henrique) e F-GAM-OPC (Vicenzo), opcionais | Não iniciadas até o congelamento de 17/11. A regra de corte prevê que as opcionais absorvam o atraso. > A completar com o grupo: confirmar o corte, quem decidiu, quando e por quê (pergunta 4 da seção 8). | arquivos das duas features; plano de projeto §3, "Corte de escopo" |
| Delta automático de ingestão | Removido do escopo pelo grupo em 15/09/2026; fica só a carga inicial e a recarga manual | [README do Período 1](../../docs/plano-de-desenvolvimento/periodo-1/README.md), "Pendências de consistência da baseline" |
| Registro de partes interessadas (TAP 2.3, item 5) | Não elaborado | [`assets/gerencia/README.md`](README.md) |

**Mudanças de escopo registradas depois da baseline:**

- **15/09/2026:** decisões do grupo levadas ao `REQUISITOS.md` v1.5, entre elas a remoção do delta do
  acervo e a suspensão com ocultação de conteúdo (cabeçalho do `documento-de-arquitetura.md`, nota da v1.5).
- **25/09/2026:** um par de banco e broker por ambiente (dev em São Paulo, DES em Oregon), revisando a
  decisão de 12/09 (plano de projeto §4).
- **29/09/2026:** público-alvo de 18 a 30 anos para 18 anos ou mais (commit "docs: alteração de 18-30
  anos para 18 anos ou mais", de 29/09/2026; o TAP 1.3 ainda diz 18 a 30).
- **06/10/2026:** a conta do Firebase Cloud Messaging saiu do Período 0 e passou para a F-NOT-OPC
  ([`ATA-2026-10-06.md`](../atas/ATA-2026-10-06.md)).

---

## 4. Cronograma: marcos planejados × datas reais

Marcos da Declaração de Escopo §6, derivados do plano de projeto §3. A regra do projeto é que a data é
piso, não teto: atrasar o marco não é permitido, e o que não cabe é cortado (plano de projeto §3).

| Marco | Data planejada | Data real e evidência | Desvio |
| --- | --- | --- | --- |
| **M1** Lean Inception (Entrega 1) | 11/08/2026 | Sem registro no repositório: o primeiro commit é de 25/08/2026. > A completar com o grupo: data de entrega no Canvas. | — |
| **M2** Baseline dos requisitos e Plano de Desenvolvimento | 25/08/2026 | Baseline do `REQUISITOS.md` v1.4 fechada em 25/08/2026 (Declaração de Escopo, cabeçalho). As 37 features já estavam distribuídas por período no quadro em 23/08 ([`ATA-2026-08-23.md`](../atas/ATA-2026-08-23.md), "Backlog do produto"); o `README.md` do plano de desenvolvimento entrou no repositório em 29/08 e foi completado em 01/09 (`git log`) | sem desvio; o registro no repositório veio depois |
| **M3** TAP e *kickoff*, Doc. de Arquitetura, Período 0 (Entrega 2) | 01/09/2026 | *Kickoff* e aprovação do TAP em 23/08/2026 ([`ATA-2026-08-23.md`](../atas/ATA-2026-08-23.md)); três assinaturas em 24/08 e a última das cinco em 12/09 ([`README.md`](README.md)). Período 0: P0-NAV na `main` em 15/09 (PR #38), DER aplicado em 16/09 (PR #39), frentes validadas em DES na ata de 22/09. > A completar com o grupo: situação do Documento de Arquitetura em 01/09 (o cabeçalho registra a v1.4 em 12/09 e a v1.5 em 15/09). | TAP aprovado antes do prazo; assinaturas completas em 12/09 (+11 dias); Período 0 validado em DES em 22/09 (+21 dias) |
| **M4** Protótipos e avaliação heurística (Entrega 3) | 08/09/2026 | Registrada como entregue na ata de 11/09/2026; relatório da avaliação heurística no repositório em 15/09/2026 (`git log` de `docs/6.1.avaliacao_heuristica_leai.md`). > A completar com o grupo: data de entrega no Canvas. | data de entrega não registrada; relatório no repositório 7 dias depois do marco |
| **M5** Fechamento do Período 1 (Entrega 4) | 29/09/2026 | PR #45 mergeado na `main` em 29/09/2026 23:12; tag `v0.1.0` no commit `1eb1fc7` (29/09 23:12) e release publicada em 30/09/2026 00:11. Declaração de Escopo e EAP de 14/09/2026. Validação dos fluxos em DES não registrada nos arquivos (README do Período 1, "Fechamento") | merge e tag no prazo; release publicada 11 min depois do fim do dia; validação em DES não registrada |
| **M6** Fechamento do Período 2 (Entrega 5) | 03/11/2026 | PR #58 na `main` em 03/11/2026 18:35; correções do CI (#59, 19:16) e do APK de DES (#60, 20:16); releases `v0.2.0` (19:49) e `v0.2.1` (20:31). Validação em DES registrada só em parte (seção 6) | merge e releases no prazo; validação em DES parcial |
| **M7** Congelamento de features e verificação geral | 17/11/2026 | 5 das 7 opcionais na `desenvolvimento` até 16/11 (seção 3). Testes das desejáveis: plano de testes final em 16/11 (PR #66) e testes das lacunas da área do Renato em 19/11 (`c872dab`). ATAM inicial: cenários definidos, medições ainda não feitas. > A completar após 24/11: verificação geral e ATAM medido. | features no prazo, com 2 opcionais não iniciadas |
| **M8** Congelamento de código e produção | 24/11/2026 | > A completar após 24/11: data do congelamento, tag e deploy de PROD. | — |
| **M9** Entrega final (Entrega 6) | 01/12/2026 | > A completar após 24/11: data e conteúdo da entrega. | — |
| **M10** Apresentação | 15/12/2026 | > A completar após 24/11. | — |

Datas e horas dos PRs por `gh pr view <n> --json mergedAt`; das releases, por `gh release list`
(`publishedAt`); das tags, por `git log -1 <tag>`.

**Controle de cronograma durante o projeto.** As previsões de 05/10/2026
(`Previsoes-do-Cronograma-Le-Ai.xlsx`) registravam P0-CI e P0-MSG com variação de 23 dias úteis sobre o
término original de 08/09 (SPI 0,30), com um item aberto em P0-CI e dois em P0-MSG; as releases dos Períodos 1 e 2 e os
marcos M7 a M10 estavam sem variação. As features do Período 2 tinham término previsto entre 07/10 e
03/11, antes ou no prazo.

---

## 5. Custos: orçamento previsto × realizado

**Previsto** ([`orcamento_do_projeto.md`](orcamento_do_projeto.md) §3 e §4, a partir do TAP 4):

| Item de custo | Base | Orçado (R$) |
| --- | --- | ---: |
| 4.1 Recursos humanos | 720 h × R$ 45,00/h | 32.400,00 |
| 4.2 Hardware (depreciação) | 5 notebooks próprios, 4,5 de 48 meses | 2.109,38 |
| 4.3 Rede e hospedagem | equivalente pago de Render e Neon, US$ 54,00/mês × 4,5 meses | 1.336,50 |
| 4.4 Software de terceiros | 5 assinaturas de IA, US$ 20,00/mês × 4,5 meses | 2.475,00 |
| 4.5 Orientação docente | 54 h × R$ 150,00/h | 8.100,00 |
| **Total** | | **46.420,88** |

O orçamento é **custo econômico de referência, não desembolso**: o desembolso previsto é de R$ 0,00
(`orcamento_do_projeto.md` §1 e §5).

**Realizado.** Regra adotada para este relatório (decisão do grupo representada pelo Renato, 19/11/2026):
custo realizado de recursos humanos = horas registradas × R$ 45,00/h; infraestrutura a custo zero, porque
roda em planos gratuitos.

| Componente | Realizado | Fonte e observação |
| --- | --- | --- |
| Desembolso | **R$ 0,00** até 26/10/2026, última data de status do orçamento. Não há registro de gasto no repositório até 19/11/2026 | `orcamento_do_projeto.md` §6; planilha `Previsoes-do-Orcamento-Le-Ai.xlsx`, aba Realizado |
| Infraestrutura (Render, Neon, CloudAMQP, Cloudinary, Brevo, FCM, GitHub Actions) | **R$ 0,00**: planos gratuitos | `orcamento_do_projeto.md` §5 |
| Horas da equipe | **Não verificáveis.** Nenhuma das cinco contribuições semanais registra horas: elas listam o que foi feito, sem tempo ([`assets/contribuicao_semanal/`](../contribuicao_semanal/)). O orçamento já registrava a ausência de apontamento (§2, "Limitações", e §6) | ver abaixo |
| Custo econômico acumulado | R$ 30.947,25 em 26/10/2026 (66,7% da linha de base), com CPI 1,00 **por premissa**: sem apontamento de horas, o realizado repete o orçado | `orcamento_do_projeto.md` §6 |

**Estimativas de horas que existem no repositório.** São só do Renato, e são **estimativas de esforço
planejado (agente e conferência), não horas medidas**: a E6-01 (plano de testes das desejáveis) estimou
cerca de 11,5 h, mais 1 a 2 h por opcional inventariada (o plano final inventariou 5), e a E6-02 (testes das lacunas) cerca de 55 h, nos planos dessas tarefas (pasta de
planejamento do Renato, mantida fora da `desenvolvimento`). Somados os números fixos, 66,5 h × R$ 45,00 = R$ 2.992,50
**estimados** (piso, sem o acréscimo por opcional), para duas tarefas de uma pessoa. As features F-MOD-OPC e F-ACV-OPC foram estimadas em
8 dias cada, sem conversão em horas. Nenhuma dessas estimativas permite calcular o custo realizado do
projeto.

> A completar com o grupo: horas declaradas por integrante e por mês, de agosto a novembro (pergunta 5
> da seção 8). Com elas, o custo de RH realizado passa a ser estimativa declarada × R$ 45,00/h, no lugar
> da premissa de 8 h semanais.
>
> A completar após 24/11: realizado de novembro e dezembro na planilha (aba Realizado) e no fluxo de caixa
> do orçamento, com a data de status do encerramento.

---

## 6. Qualidade

**Testes e CI** ([`docs/9.plano_de_testes.md`](../../docs/9.plano_de_testes.md)):

| Indicador | Valor | Fonte |
| --- | --- | --- |
| Casos de teste no plano, ligados a testes automatizados | 190 em 30/10/2026 (prioritárias e transversais) → **722** em 19/11/2026 (prioritárias, desejáveis, opcionais integradas e transversais) | [`ATA-2026-10-30.md`](../atas/ATA-2026-10-30.md); plano de testes §9.7 |
| Testes executados no CI | 3.751 em 30/10/2026 → **4.217** em 19/11/2026, nos sete projetos, todos passando, nenhum pulado | ata de 30/10; plano de testes §9.7 |
| Por projeto (19/11/2026, exceto `identidade`) | `identidade` 242 (execução de 06/11), `social` 359, `acervo` 600, `leitura` 678, web 1.157, mobile 1.036, ingestão 145 | plano de testes §9.7 |
| Lacunas conhecidas | 44 registradas (L-01 a L-44), cada uma com dono, e a situação de cada uma na tabela | plano de testes §9.8 |
| Cobertura de linhas | Não coletada no CI | plano de testes §9.7 |

Riscos de teste reconhecidos no próprio plano (§9.9): sem testes *end-to-end*; mensageria testada sem o
RabbitMQ real; fontes externas sempre simuladas; validação em DES das desejáveis ainda pendente em várias
features.

**Avaliação heurística:** feita sobre os protótipos do caminho crítico (Entrega 3), em
[`6.1.avaliacao_heuristica_leai.md`](../../docs/6.1.avaliacao_heuristica_leai.md).

**ATAM:** os seis cenários e a especificação do atributo de segurança estão em
[`8.avaliacao_arquitetura.md`](../../docs/8.avaliacao_arquitetura.md). As medições em DES (acesso não
autorizado, latência p95 da busca, *cold start*, fila offline, protocolo de mensageria) ainda não foram
feitas.

> A completar após 24/11: resultado do ATAM com as medições em DES e a conclusão da avaliação.

**Definition of Done** (plano de projeto §10). Os itens de código, CI, testes e contratos são conferidos
no merge de cada feature. O item "fluxo funcionando em DES" só pode ser cumprido depois que o período
chega à `main`. Nos arquivos de feature, a validação em DES depois da `v0.2.0` aparece registrada para
F-ACV-NOTA, F-AVA-2 e F-MOD (05/11/2026); a F-REC-P2P registra validação em DES em 11/10/2026, antes de o
período chegar à `main` (README do Período 2, "Situação em 25/10/2026").

> A completar com o grupo: validação em DES das demais features do Período 2 e das opcionais do
> Período 3, depois do merge da `main` de novembro.

**Segurança das dependências:** em 30/10/2026 o GitHub apontava 44 alertas de dependências na `main`, que
ainda tinha o código de 29/09; as correções já estavam na `desenvolvimento`
([`ATA-2026-10-30.md`](../atas/ATA-2026-10-30.md)). O merge de 03/11 corrigiu também os *advisories*
altos do `leitura` (PR #59).

> A completar após 24/11: alertas de dependências na `main` depois do merge final.

---

## 7. Riscos: previstos × ocorridos

Riscos do plano de projeto §13 e o que aconteceu até 19/11/2026.

| Risco previsto | Ocorreu? | O que aconteceu e como foi tratado | Fonte |
| --- | --- | --- | --- |
| Requisitos se estendem além de 25/08 | Não | Baseline v1.4 fechada em 25/08/2026 | Declaração de Escopo, cabeçalho |
| Requisitos mudam demais | Em parte | Mudanças pontuais pelo controle de mudança: v1.5 em 15/09, público-alvo em 29/09 (seção 3) | seção 3 |
| Prototipagem consome mais de 1 semana | Sem registro | A Entrega 3 consta como entregue na ata de 11/09 | `ATA-2026-09-11.md` |
| Deploy descoberto tarde | Sim, uma vez | O APK de DES não alcançava os serviços do Render; descoberto no fechamento do Período 2 e corrigido no mesmo dia (PR #60, `v0.2.1`) | PR #60; `gh release list` |
| `main` quebrada | Sim, uma vez | Depois do merge do Período 2 (PR #58), dois workflows falharam na `main` (`identidade`, por um teste dependente de ordem, e `leitura`, por *advisories* do `npm audit`); corrigidos no PR #59 em 41 minutos. A proteção da `main` não exige os checks de CI (resíduo de P0-CI) | descrição do PR #59; README do Período 0; plano de projeto §5 |
| Conflito em serviço compartilhado | Mitigado | Features que mexeram no código de outro dono deixaram nota datada no `AGENTS.md` do serviço e passaram por revisão no PR (por exemplo, a F-MOD-OPC no `identidade`, do Henrique, e a F-ACV-OPC no livro pessoal do `acervo`, do Vicenzo) | `code/back/identidade/AGENTS.md` (nota de 05/11/2026); `code/back/acervo/AGENTS.md` ("Mudanças feitas pelo Renato (F-ACV-OPC)"); `feature-F-ACV-OPC.md`, Pendências |
| Sessão de agente perdida | Sem registro | O arquivo de feature foi mantido como estado de cada feature | arquivos de feature |
| Escopo não caber | Sim, no Período 3 | Duas opcionais não iniciadas até o congelamento; as opcionais funcionaram como colchão e as datas não se moveram | seção 3 |
| `desenvolvimento` quebrada travando os cinco | Sem registro | — | — |
| 40 pontos na última entrega | Em andamento | Congelamento de features em 17/11 respeitado pelos merges (seção 3). > A completar após 24/11. | plano de projeto §3 |

**Riscos que não estavam no plano e ocorreram:**

| Risco | O que aconteceu e como foi tratado | Fonte |
| --- | --- | --- |
| Atraso das frentes de fundação | A mensageria (P0-MSG) foi adiada em 11/09 e ganhou dono só em 22/09; P0-CI e P0-MSG tinham variação de 23 dias úteis em 05/10. Nenhum resíduo bloqueou as features do Período 1 | `ATA-2026-09-11.md`; `ATA-2026-09-22.md`; `Previsoes-do-Cronograma-Le-Ai.xlsx`; README do Período 0 |
| Dependência de conta externa | A conta do FCM, pendente desde 22/09, passou para a F-NOT-OPC; em 19/11 o projeto Firebase existe só para o ambiente local, e faltam o projeto na conta oficial do grupo e as credenciais de produção | `ATA-2026-10-06.md`; `feature-F-NOT-OPC.md`, Status |
| Vulnerabilidades em dependências | 44 alertas na `main` em 30/10; correções na `desenvolvimento` e no PR #59 | `ATA-2026-10-30.md`; PR #59 |

Risco previsto no orçamento (§5), não no plano de projeto: estouro de um plano gratuito. Sem registro de
estouro até 19/11. A última medição é a da carga de 24/09/2026: cerca de 11 MB no schema `acervo`, 2,2%
dos 500 MB do Neon (`orcamento_do_projeto.md` §5). A recarga real do acervo, que mediria de novo, está
pendente (`feature-F-ACV-OPC.md`, Pendências).

> A completar com o grupo: riscos vividos que não estão em ata (pergunta 7 da seção 8).
>
> A completar após 24/11: riscos do congelamento de código, da produção e do pitch.

---

## 8. Lições aprendidas

> A completar com o grupo. O conteúdo desta seção vem das respostas às perguntas abaixo; nada é escrito
> sem elas.
>
> 1. **O que funcionou bem** no processo (divisão vertical com dono de ponta a ponta, arquivo de
>    feature, CI, uso de agentes)? Um ou dois exemplos concretos.
> 2. **O que vocês fariam diferente?** O que atrasou ou gerou retrabalho (por exemplo, P0-MSG adiada em
>    11/09, CI quebrado na `main` depois do merge do Período 2, validação em DES só no fechamento)?
> 3. **Assistentes de IA e agentes:** onde ajudaram, onde atrapalharam, e que cuidado vocês
>    recomendariam a outro grupo?
> 4. **F-REC-ALG e F-GAM-OPC:** foram cortadas no congelamento de 17/11? Quem decidiu, quando e por quê?
> 5. **Horas:** cada um consegue declarar quantas horas dedicou ao projeto por mês (agosto a novembro)?
>    Entra como estimativa declarada, não como medição.
> 6. **Avaliação do grupo:** de 1 a 5, como avaliam a comunicação, a divisão do trabalho e o
>    cumprimento dos prazos? Algum comentário que deva constar?
> 7. **Riscos não registrados:** houve algum problema que não está em ata (indisponibilidade de alguém,
>    limite de plano gratuito, conflito em código compartilhado, perda de trabalho)?
> 8. **Continuidade:** que recomendação deixariam a quem continuasse o produto? O que fariam a seguir?

---

## 9. Situação final

**Em 19/11/2026:**

| Item | Situação | Fonte |
| --- | --- | --- |
| Última release | `v0.2.1` (Período 2, correção do APK), publicada em 03/11/2026 | `gh release list` |
| DES/HML (`main`) | Período 2, commit `f1f5c7e` de 03/11/2026 | `git log origin/main` |
| `desenvolvimento` | Períodos 0 a 2, as 5 opcionais mergeadas, o plano de testes final e os testes das lacunas da área do Renato; CI verde com 4.217 testes | seção 3; plano de testes §9.7 |
| PROD | Não existe ainda: previsto a partir de tag em 24/11 | plano de projeto §4 |

> A completar após 24/11: tag e release final, data do deploy de PROD, URLs dos ambientes, APK da
> release e situação de cada feature no fechamento.

**Pendências conhecidas em 19/11/2026** (cada uma com dono no documento citado):

- Recarga real do acervo (F-ACV-OPC): pendência do grupo no fechamento, em dev e em DES
  (`feature-F-ACV-OPC.md`, Pendências).
- Projeto Firebase na conta oficial do grupo e credenciais de produção da F-NOT-OPC
  (`feature-F-NOT-OPC.md`, Status).
- Validação em DES das features do Período 2 e das opcionais (seção 6).
- Medições do ATAM em DES (seção 6).
- Lacunas de teste em aberto, com dono (plano de testes §9.8).
- Gerência: consolidar as duas versões assinadas do TAP num arquivo canônico, confirmar os níveis de
  proficiência da RACI e elaborar o registro de partes interessadas
  ([`assets/gerencia/README.md`](README.md)).

**Recomendações para continuidade.**

> A completar com o grupo (pergunta 8 da seção 8).

---

## 10. Aceite e assinaturas

> Pendência da etapa de fechamento: definir quem assina (equipe e patrocinadores, como na Declaração de
> Escopo §8) e gerar o `.docx`/`.pdf` a partir deste `.md`.

| Nome | Papel no projeto | Assinatura | Data |
| --- | --- | --- | --- |
| Vicenzo Fonseca de Mello Souza | Gerente do Projeto | | |
| Ana Luiza de Freitas Rodrigues | Equipe do Projeto | | |
| Henrique Moreira Gomes de Carvalho | Equipe do Projeto | | |
| Kayke Emanoel de Souza Santos | Equipe do Projeto | | |
| Renato Douglas Nascimento Silva de Oliveira | Equipe do Projeto | | |
| Prof. Artur Martins Mol | Patrocinador | | |
| Prof. João Paulo Carneiro Aramuni | Patrocinador | | |
| Prof. Leonardo Vilela Cardoso | Patrocinador | | |

---

## Controle de versões

| Versão | Data | Autor | Notas da revisão |
| --- | --- | --- | --- |
| 0.1 | 19/11/2026 | Renato Douglas Nascimento Silva de Oliveira | Rascunho: Períodos 0 a 2 e Período 3 até 19/11/2026; marcadores do que fica para depois de 24/11 e do que depende do grupo. |
