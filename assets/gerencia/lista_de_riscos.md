<!-- Artefato de Gerência de Projetos. Consolida os riscos do plano de projeto
     (docs/orquestador/plano-de-projeto.md §13), do orçamento (orcamento_do_projeto.md §5) e os
     registrados em ata no template da disciplina. Não cria processo novo: cada medida cita o que o projeto já pratica. -->

# Gerência de Projetos de Software

## Lista de Riscos do Projeto

> **O que este documento é:** os dez riscos do **Lê Ai**, com probabilidade, impacto, risco resultante,
> medidas de prevenção (evitar que o risco ocorra) e de contingência (o que fazer se ocorrer).
>
> **O que este documento não é:** o balanço do que de fato ocorreu, que fica nas atas e no relatório
> de encerramento, nem o processo de trabalho, que fica em `docs/orquestador/plano-de-projeto.md`.

| Campo | Conteúdo |
| --- | --- |
| **Projeto** | Lê Ai |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza |
| **Fontes** | `docs/orquestador/plano-de-projeto.md` §13, [`orcamento_do_projeto.md`](orcamento_do_projeto.md) §5 e as atas de 06/10 e 30/10/2026 |
| **Planilha** | [`Lista-de-Riscos-Le-Ai.xlsx`](Lista-de-Riscos-Le-Ai.xlsx), template da disciplina preenchido |
| **Versão** | 1.0, de 20/11/2026, por Renato Douglas Nascimento Silva de Oliveira |

---

## 1. Como o risco é classificado

Probabilidade e impacto em três níveis (Baixo, Médio, Alto). O risco resultante segue a regra do
template:

| Probabilidade × Impacto | Baixo | Médio | Alto |
| --- | --- | --- | --- |
| **Baixo** | Baixo | Médio | Médio |
| **Médio** | Médio | Médio | Alto |
| **Alto** | Médio | Alto | Alto |

Na planilha, a coluna **Risco** é calculada por fórmula a partir das duas colunas anteriores, que só
aceitam os três níveis.

## 2. Riscos

| Id. | Categoria | Descrição do risco | Prob. | Impacto | Risco | Medidas de prevenção (contramedidas) | Medidas de contingência (mitigação) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Escopo e cronograma | O escopo de 37 features não caber nos quatro períodos até o congelamento de features (17/11/2026), comprometendo a entrega final de 40 pontos. | Alto | Médio | **Alto** | Classificar cada feature em prioritária, desejável ou opcional; congelar features em 17/11; acompanhar o andamento no quadro Kanban e na reunião semanal. | Descer as opcionais de nível no fechamento do período, sem mover as datas; cortar a web antes do mobile, já que não há paridade funcional entre os dois. |
| R2 | Requisitos | Requisitos mudarem demais depois da baseline de 25/08/2026, gerando retrabalho em features já entregues. | Médio | Médio | **Médio** | Baseline do `REQUISITOS.md` em 25/08; controle de mudança com análise de impacto (plano de projeto §3), que deixa o custo visível antes da decisão. | Registrar a mudança como pendência no arquivo da feature; o grupo decide; se aprovada, refletir no `REQUISITOS.md` e nos documentos derivados na mesma passada. |
| R3 | Técnico (integração) | Duas features alterarem o mesmo microsserviço ou contrato (API, evento ou VIEW) e quebrarem a integração entre serviços. | Médio | Alto | **Alto** | Specs OpenAPI e JSON Schemas de eventos versionados; leitura entre schemas só por VIEW mantida pelo dono; aviso no grupo e nota no `AGENTS.md` do serviço antes de mexer em código de outro dono. | Revisão no PR pelo dono do serviço; reverter a mudança que quebrou o contrato; testes de contrato na CI apontam o ponto da quebra. |
| R4 | Processo (qualidade) | A branch `desenvolvimento` ou a `main` ficar quebrada, travando o trabalho dos cinco integrantes ou o deploy em DES. | Médio | Alto | **Alto** | CI com lint, build e testes a cada push; merge `desenvolvimento` → `main` só por PR com CI verde e uma aprovação; mudança arriscada em branch `feat/`. | Quem quebrou conserta ou reverte na hora; correção na `main` por PR dedicado (como o PR #59, que corrigiu a `main` em 41 minutos). |
| R5 | Infraestrutura (deploy) | Falha de deploy ou de integração no ambiente de DES descoberta tarde, perto de uma entrega. | Médio | Alto | **Alto** | Período 0 entregou as três peças (serviços, web e APK) em DES antes de qualquer feature; deploy em DES a cada merge na `main`; validar em DES antes do fechamento. | Release de correção no mesmo dia (como a `v0.2.1`, PR #60, quando o APK de DES não alcançava os serviços do Render). |
| R6 | Fornecedor (planos gratuitos) | Estouro de limite ou mudança de condição de um plano gratuito (Neon, Render, CloudAMQP, Cloudinary, Brevo), já que o desembolso previsto é R$ 0,00. | Baixo | Alto | **Médio** | Medir o uso de cada plano (acervo com cerca de 11 MB, 2,2% dos 500 MB do Neon); manter só os dados necessários; cache de capas no Cloudinary. | Reduzir a carga do acervo ou limpar dados; migrar para outro provedor gratuito equivalente; se houver gasto, levá-lo ao controle de mudança, como o orçamento §5 exige. |
| R7 | Dependência externa | Conta ou credencial de serviço externo indisponível na hora da integração (projeto do FCM na conta oficial, Brevo, dump do OpenLibrary). | Médio | Médio | **Médio** | Cada conta externa com dono definido; credenciais só por variável de ambiente e GitHub Secrets; Firebase usado apenas para o FCM. | Manter a notificação in-app quando o push não estiver disponível (já é o caminho do iOS); adiar a integração para a feature opcional correspondente. |
| R8 | Equipe | Indisponibilidade de um integrante (provas, outras disciplinas, saúde) numa divisão vertical em que cada feature tem um único dono de ponta a ponta. | Médio | Alto | **Alto** | Arquivo da feature atualizado ao fim de toda sessão (status, pendências e decisões); plantão da semana; ata semanal com pendências e próximos passos. | Redistribuir a feature na reunião semanal a partir do arquivo da feature; rebaixar a feature a opcional se não houver quem assuma. |
| R9 | Segurança e LGPD | Vulnerabilidade em dependências ou exposição de dados pessoais dos usuários (segredos versionados, dados de conta excluída retidos). | Médio | Alto | **Alto** | Segredos só em variáveis de ambiente e GitHub Secrets (`.env` nunca versionado); cadastro a partir de 18 anos; alertas de dependências na CI; exclusão de conta propagada por evento a todos os serviços. | Corrigir os alertas na `desenvolvimento` e conferir de novo depois do merge na `main` (como os 44 alertas da ata de 30/10 e os advisories do npm audit fechados no PR #59); rotacionar o segredo exposto; remover os dados retidos e registrar o incidente em ata. |
| R10 | Ferramentas (agentes de IA) | Agentes de IA gerarem código fora do requisito, alterarem arquivos que não são da sua feature ou perderem o contexto entre sessões. | Médio | Médio | **Médio** | `AGENTS.md` na raiz e em cada subprojeto; `REQUISITOS.md` como fonte de verdade; agente não edita `docs/orquestador` nem features de outros; migration revisada por humano. | Revisão no PR e reversão do que saiu do requisito; retomar a sessão pelo arquivo da feature, que registra o estado de cada uma. |

**Resumo:** seis riscos altos (R1, R3, R4, R5, R8 e R9) e quatro médios (R2, R6, R7 e R10).

## 3. Rastreabilidade

| Risco | Origem |
| --- | --- |
| R1 | Plano de projeto §13: "Escopo não caber" e "40 pts na última entrega" |
| R2 | Plano de projeto §13: "Requisitos mudam demais durante o desenvolvimento" |
| R3 | Plano de projeto §13: "Conflito em serviço compartilhado por 2 features" |
| R4 | Plano de projeto §13: "`main` quebrada" e "`desenvolvimento` quebrada travando os 5" |
| R5 | Plano de projeto §13: "Deploy descoberto tarde" |
| R6 | Orçamento §5: estouro de um plano gratuito |
| R7 | Conta do FCM pendente: [`ATA-2026-10-06.md`](../atas/ATA-2026-10-06.md) e `docs/plano-de-desenvolvimento/periodo-3/feature-F-NOT-OPC.md` |
| R8 | Divisão vertical do plano de projeto §6; não estava no §13 |
| R9 | Alertas de dependências: [`ATA-2026-10-30.md`](../atas/ATA-2026-10-30.md) e advisories do `npm audit` no PR #59; LGPD no `REQUISITOS.md` |
| R10 | Plano de projeto §13: "Sessão de agente perdida" |

Fora da lista, por estarem vencidos: "Requisitos se estendem além de 25/08" e "Prototipagem consumir
mais de 1 semana" (plano de projeto §13): a baseline fechou em 25/08 e a Entrega 3 consta como
entregue na [ata de 11/09](../atas/ATA-2026-09-11.md).

## 4. Controle de mudança

Risco novo, alterado ou encerrado começa neste `.md` e é repetido na planilha na mesma passada; os dois
precisam bater. O que de fato ocorreu vai para a ata da semana e, no fechamento, para o relatório de
encerramento.

| Versão | Data | Autor | Notas da revisão |
| --- | --- | --- | --- |
| 1.0 | 20/11/2026 | Renato Douglas Nascimento Silva de Oliveira | Versão inicial, com dez riscos no template da disciplina. |
