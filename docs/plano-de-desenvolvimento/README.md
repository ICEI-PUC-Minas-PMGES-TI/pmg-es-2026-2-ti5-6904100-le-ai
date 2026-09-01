# Plano de Desenvolvimento — Features por período

> **O que este documento é:** o mapa de **todas as features** do projeto, cada uma classificada em `prioritaria`/`desejavel`/`opcional` e alocada a um período (0–3). É a entrega "Plano de Desenvolvimento (features por período)" do `../orquestador/plano-de-projeto.md` §3 (marco de 25/08).
>
> **O que este documento NÃO é:** a especificação de cada feature. O detalhamento (endpoints, payloads, regras, critérios de aceite) vive em um arquivo por feature — `periodo-N/feature-*.md` — no template do `../orquestador/plano-de-projeto.md` §9. Os arquivos do período-0 já existem; os demais ainda estão em desenvolvimento e serão criados pela equipe no momento adequado.

## Fontes

Este documento é **derivado** e mantido em sincronia com o orquestador. Ele não decide escopo — projeta o que já está decidido:

- **`../orquestador/REQUISITOS.md` §5** — fonte de verdade dos 129 requisitos funcionais (RF), agrupados em 13 módulos, cada RF com prioridade `E`/`D`/`O`. Em caso de conflito, o `REQUISITOS.md` ganha.
- **`../orquestador/documento-de-arquitetura.md` §3** — os 4 serviços de backend e a que módulos cada um pertence.
- **`../orquestador/plano-de-projeto.md` §3** — o modelo de períodos, a regra prioridade→período e a regra de corte de escopo.

## Regra prioridade → período

A priorização de `REQUISITOS.md` §5 mapeia 1:1 nos períodos de desenvolvimento:

| Prioridade (REQUISITOS §5) | Disciplina | Período |
|---|---|---|
| `E` — Essencial (MVP, não negociável) | prioritária | **Período 1** |
| `D` — Desejável (entra se houver folga) | desejável | **Período 2** |
| `O` — Opcional (primeiro a ser cortado) | opcional | **Período 3** |

**Período 0** é a fundação (infra, CI, deploy em DES, navegabilidade) — não é guiado por RF; vem do `../orquestador/plano-de-projeto.md` §3 e do `../orquestador/documento-de-arquitetura.md` §8 ("itens a validar no período-0").

Regra de corte (`../orquestador/plano-de-projeto.md` §3): no fechamento de um período, o que não terminou **desce um nível** de prioridade e vai para o período seguinte; as `opcionais` são o colchão que absorve o atraso.

## Serviços (âncora de propriedade)

Cada feature pertence a um serviço, definido pela decomposição de `../orquestador/documento-de-arquitetura.md` §3:

| Serviço | Módulos de RF |
|---|---|
| **identidade** | AUT, SOC-01..08 |
| **acervo** | ACV |
| **leitura** | EST, PRG, AVA, DSF, STA, GAM |
| **social** | SOC-09..15, LST, REC, NOT, MOD |

## Tabela-mestre de features

Granularidade atual: features "maiores" — cerca de uma por módulo de RF, por banda de prioridade, dentro de um serviço. Um módulo cujos RFs cruzam bandas de prioridade vira mais de uma feature (uma por período). Poderemos granularizar mais adiante.

| ID | Feature | Serviço | Período | Prioridade | RFs | Dono |
|---|---|---|---|---|---|---|
| P0-INFRA | Scaffolding do monorepo e serviços | — | 0 | fundação | — | a definir |
| P0-CI | Pipeline CI/CD | — | 0 | fundação | — | a definir |
| P0-DEPLOY | Deploy em DES (Render + Neon) | — | 0 | fundação | — | a definir |
| P0-MSG | Mensageria e integrações base | — | 0 | fundação | — | a definir |
| P0-DS | Design system base | — | 0 | fundação | — | a definir |
| P0-NAV | Navegabilidade + shell de auth + docs de API | — | 0 | fundação | — | a definir |
| F-AUT | Autenticação e conta | identidade | 1 | prioritaria | RF-AUT-01..06, 08 | a definir |
| F-PERFIL | Perfil, privacidade e seguidores | identidade | 1 | prioritaria | RF-SOC-01..08 | a definir |
| F-ACV-BUSCA | Busca e página do livro | acervo | 1 | prioritaria | RF-ACV-01, 02, 04, 18, 19 | a definir |
| F-ACV-CADASTRO | Cadastro de livros (ISBN + pessoal) | acervo | 1 | prioritaria | RF-ACV-05, 06, 07, 08, 09 | a definir |
| F-ACV-INGESTAO | Ingestão do acervo (dump + assuntos) | acervo | 1 | prioritaria | RF-ACV-13, 20 | a definir |
| F-EST | Estante e ciclo de leitura | leitura | 1 | prioritaria | RF-EST-01..08, 11, 12 | a definir |
| F-PRG | Progresso manual | leitura | 1 | prioritaria | RF-PRG-01..04 | a definir |
| F-AVA | Nota e resenha | leitura | 1 | prioritaria | RF-AVA-01..04 | a definir |
| F-FEED | Feed e interações sociais | social | 1 | prioritaria | RF-SOC-09, 10, 11, 12, 14 | a definir |
| F-NOT | Notificações in-app | social | 1 | prioritaria | RF-NOT-01..04 | a definir |
| F-CONTA-2 | Exclusão de conta | identidade | 2 | desejavel | RF-AUT-07 | a definir |
| F-SOCIAL-2 | Comentários (edição) e menções-link | social | 2 | desejavel | RF-SOC-13, 15 | a definir |
| F-ACV-DESCOBERTA | Filtros e páginas de autor/editora/série | acervo | 2 | desejavel | RF-ACV-03, 10, 11, 12, 21 | a definir |
| F-ACV-NOTA | Nota geral e cache de capas | acervo | 2 | desejavel | RF-ACV-15, 16, 17 | a definir |
| F-EST-2 | Favoritos e histórico | leitura | 2 | desejavel | RF-EST-09, 10 | a definir |
| F-SESSAO | Sessão de leitura cronometrada (mobile) | leitura | 2 | desejavel | RF-PRG-05..12 | a definir |
| F-AVA-2 | Reações, Markdown e frases | leitura | 2 | desejavel | RF-AVA-05, 06, 07, 08, 09 | a definir |
| F-DSF | Desafios | leitura | 2 | desejavel | RF-DSF-01, 02, 03, 04, 06 | a definir |
| F-STA | Estatísticas | leitura | 2 | desejavel | RF-STA-01, 02, 03, 05 | a definir |
| F-GAM | Sequência diária (streak) | leitura | 2 | desejavel | RF-GAM-01, 02, 03 | a definir |
| F-LST | Listas | social | 2 | desejavel | RF-LST-01..06 | a definir |
| F-REC-P2P | Recomendação entre usuários + aba unificada | social | 2 | desejavel | RF-REC-01..07, 13, 14, 15, 16 | a definir |
| F-MOD | Moderação | social | 2 | desejavel | RF-MOD-01, 02, 03, 05 | a definir |
| F-NOT-2 | Notificações em tempo real | social | 2 | desejavel | RF-NOT-06 | a definir |
| F-ACV-OPC | Extras de acervo (recarga dump, assuntos em livro pessoal) | acervo | 3 | opcional | RF-ACV-14, 22 | a definir |
| F-REC-ALG | Recomendação algorítmica + descarte em lote | social | 3 | opcional | RF-REC-08..12, 17 | a definir |
| F-NOT-OPC | Preferências de notificação + push (FCM Android) | social | 3 | opcional | RF-NOT-05, 07 | a definir |
| F-MOD-OPC | Suspensão de conta | social | 3 | opcional | RF-MOD-04 | a definir |
| F-GAM-OPC | Calendário e lembrete de streak (push) | leitura | 3 | opcional | RF-GAM-04, 05 | a definir |
| F-STA-OPC | Distribuição de notas | leitura | 3 | opcional | RF-STA-04 | a definir |
| F-DSF-OPC | Histórico de janelas de desafio | leitura | 3 | opcional | RF-DSF-05 | a definir |

## Índices por período

- [Período 0 — Fundação](periodo-0/README.md)
- [Período 1 — Prioritárias](periodo-1/README.md)
- [Período 2 — Desejáveis](periodo-2/README.md)
- [Período 3 — Opcionais e refino](periodo-3/README.md)

## Cobertura

Os 129 RFs de `../orquestador/REQUISITOS.md` §5 estão todos alocados: **54 Essenciais** (Período 1), **60 Desejáveis** (Período 2), **15 Opcionais** (Período 3). Nenhum RF fica sem período; nenhum aparece em dois. Os RFs de sistema/backend sem UI (ex.: RF-EST-11/12, RF-STA-05, RF-SOC-10) ficam junto da feature de negócio a que servem.

## Próximo passo

Os [Período 0](periodo-0/README.md), [Período 1](periodo-1/README.md) e [Período 2](periodo-2/README.md) já têm **todas** as features detalhadas (14/14 no Período 2), e o [Período 3](periodo-3/README.md) tem **5 das 7** (F-ACV-OPC, F-REC-ALG, F-NOT-OPC, F-MOD-OPC e F-GAM-OPC), com a tabela de contratos transversais do período já consolidada. Os próximos passos são detalhar as duas opcionais restantes — **F-STA-OPC** e **F-DSF-OPC** — e **consolidar a tabela de contratos transversais do Período 2**, usando o template de `../orquestador/plano-de-projeto.md` §9, sem antecipar decisões ainda em desenvolvimento.
