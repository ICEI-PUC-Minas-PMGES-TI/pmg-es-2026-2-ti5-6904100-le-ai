<!-- Artefato de Gerência de Projetos. DERIVADO: os valores nascem no Termo de Abertura de Projeto nº 01,
     item 4 (R$ 46.420,88), e as premissas e janelas na Declaração de Escopo (declaracao_de_escopo.md).
     Não decide custo, apenas distribui no tempo e acompanha o que já foi aprovado. Os números mês a mês
     vivem também em Previsoes-do-Orcamento-Le-Ai.xlsx; mudança aqui exige a mesma mudança lá. -->

# Gerência de Projetos de Software

## Orçamento do Projeto

> **O que este documento é:** o orçamento do projeto **Lê Ai**: como o custo foi estimado, a linha de
> base distribuída por mês, de onde vêm os recursos e o fluxo de caixa com o status orçado x realizado.
>
> **O que este documento não é:** controle de prazo, que está na
> [Previsões do Cronograma](Previsoes-do-Cronograma-Le-Ai.xlsx), nem escopo, que está na
> [Declaração de Escopo](declaracao_de_escopo.md).

| Campo | Conteúdo |
| --- | --- |
| **Projeto** | Lê Ai |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza |
| **Documento de origem** | Termo de Abertura de Projeto (TAP) nº 01, item 4, aprovado em 23/08/2026 |
| **Planilha** | [Previsoes-do-Orcamento-Le-Ai.xlsx](Previsoes-do-Orcamento-Le-Ai.xlsx) |
| **Data de status** | 26/10/2026 |
| **Versão** | 1.0, de 26/10/2026, por Renato Douglas Nascimento Silva de Oliveira |

---

## 1. Objetivos deste documento

Detalhar o orçamento do projeto **Lê Ai** e explicar como ele foi determinado: as bases das estimativas e
as premissas usadas, a estimativa de custo de cada recurso e de cada etapa da EAP, a linha de base
distribuída no tempo, os requisitos de recursos financeiros e o fluxo de caixa.

O ponto de partida é o custo estimado no Termo de Abertura do Projeto (TAP) nº 01, de **R$ 46.420,88**,
aprovado na reunião de abertura de 23/08/2026. Este documento não altera esse valor: ele o distribui por
mês e o acompanha. A planilha Previsoes-do-Orcamento-Le-Ai.xlsx traz os mesmos números mês a mês, com o
comparativo entre orçado e realizado na data de status de **26/10/2026**.

O orçamento é um **custo econômico de referência, e não um desembolso**. A hospedagem roda em planos
gratuitos, os notebooks são dos próprios integrantes e a orientação é prestada pela instituição. O
desembolso previsto e o realizado são de **R$ 0,00**, como fixa a restrição financeira da Declaração de
Escopo (§4.3).

---

## 2. Bases das estimativas

As estimativas são **paramétricas**: para cada recurso, quantidade multiplicada por custo unitário. Todas
as bases vêm do TAP nº 01, item 4, e da Declaração de Escopo.

| Base | Valor adotado | Origem |
| --- | --- | --- |
| Duração do projeto | 04/08/2026 a 15/12/2026: 18 semanas de esforço em 4,5 meses (agosto a novembro cheios e dezembro até o dia 15) | TAP 3 |
| Equipe | 5 integrantes full-stack, com média de 8 h semanais cada, o que dá 720 h | TAP 2.4 e 3.1 |
| Valor-hora da equipe | R$ 45,00 | TAP 4.1 |
| Hardware | 5 notebooks de uso próprio de R$ 4.500,00, com depreciação linear em 48 meses | TAP 4.2 |
| Rede e hospedagem | Equivalente dos planos pagos de Render e Neon: US$ 54,00 por mês | TAP 4.3 |
| Software de terceiros | Assistente de IA a US$ 20,00 por mês por integrante. IDEs, GitHub e ferramenta de design em licença gratuita ou educacional | TAP 4.4 |
| Câmbio | R$ 5,50 por US$, fixo durante todo o projeto | TAP 4.3 e 4.4 |
| Orientação docente | 3 professores, 1 h semanal cada, durante 18 semanas (54 h) a R$ 150,00/h | TAP 4.5 |
| Distribuição no tempo | 4 semanas de esforço por mês cheio e 2 em dezembro. Custos mensais (hardware, hospedagem e software) contam meio mês em dezembro | Este documento |

**Premissas.** Se alguma deixar de valer, torna-se risco ativo e aciona o controle de mudança (plano de
projeto, §3).

- A disponibilidade média de 8 h semanais por integrante se mantém do início ao fim, como premissa de
  execução da Declaração de Escopo (§5.2).
- Os planos gratuitos de Render, Neon, CloudAMQP, Cloudinary, Brevo e Firebase Cloud Messaging seguem
  disponíveis e suficientes até 15/12/2026.
- Não há reajuste de câmbio nem de valor-hora durante o projeto.
- Não há compra de equipamento: cada integrante usa a própria máquina.
- Não há custo depois de 15/12/2026, porque operação e manutenção estão fora do escopo (Declaração de
  Escopo §3.3).

**Limitações conhecidas da estimativa.**

- O equivalente de hospedagem considera apenas Render e Neon. CloudAMQP, Cloudinary, Brevo e FCM também
  são usados em plano gratuito e ficaram fora do valor de referência do TAP.
- Desde 25/09/2026 o projeto mantém dois ambientes de banco e de broker: desenvolvimento em São Paulo e
  DES em Oregon. Os dois estão em plano gratuito e não afetam o desembolso. O equivalente pago da linha
  de base não foi revisto, porque revisá-lo exige passar pelo controle de mudança.
- Não há apontamento de horas por integrante nem por atividade. O realizado usa a mesma base do orçado,
  como explicado em Fluxo de caixa do projeto.

---

## 3. Estimativas de custos das atividades e dos recursos

**Por recurso.** São os cinco itens de custo do TAP nº 01. As horas da equipe respondem por quase setenta
por cento do total.

| Item de custo | Quantidade | Custo unitário | Total (R$) | % |
| --- | --- | --- | ---: | ---: |
| 4.1 Recursos humanos | 720 h | R$ 45,00/h | 32.400,00 | 69,80 |
| 4.2 Hardware (depreciação) | 5 notebooks × 4,5 de 48 meses | R$ 4.500,00 | 2.109,38 | 4,54 |
| 4.3 Rede e hospedagem | 4,5 meses | US$ 54,00/mês (R$ 297,00) | 1.336,50 | 2,88 |
| 4.4 Software de terceiros | 5 assinaturas × 4,5 meses | US$ 20,00/mês (R$ 110,00) | 2.475,00 | 5,33 |
| 4.5 Orientação docente | 54 h | R$ 150,00/h | 8.100,00 | 17,45 |
| **Total** | **774 h** |  | **46.420,88** | **100,00** |

**Recursos humanos por etapa da EAP.** O gerenciamento é transversal e consome 10% das horas (72 h). As
648 h restantes se distribuem pelas semanas de esforço de cada etapa, a 36 h por semana para a equipe
inteira. As janelas são as da Declaração de Escopo (§2). O Encerramento ocupa três semanas de calendário,
mas conta duas de esforço: depois da entrega final de 01/12 resta só a preparação da apresentação de
15/12.

| Etapa (nível 2 da EAP) | Janela | Semanas | Horas | Custo (R$) |
| --- | --- | ---: | ---: | ---: |
| 1.1 Gerenciamento do Projeto | 04/08 a 15/12 | transversal | 72 | 3.240,00 |
| 1.2 Concepção e Requisitos | 04/08 a 01/09 | 4 | 144 | 6.480,00 |
| 1.3 Design e Prototipação | 01/09 a 08/09 | 1 | 36 | 1.620,00 |
| 1.4 Período 0: Fundação técnica | 08/09 a 15/09 | 1 | 36 | 1.620,00 |
| 1.5 Período 1: Funcionalidades prioritárias | 15/09 a 29/09 | 2 | 72 | 3.240,00 |
| 1.6 Período 2: Funcionalidades desejáveis | 29/09 a 03/11 | 5 | 180 | 8.100,00 |
| 1.7 Período 3: Opcionais e refino | 03/11 a 17/11 | 2 | 72 | 3.240,00 |
| 1.8 Verificação e Homologação | 17/11 a 24/11 | 1 | 36 | 1.620,00 |
| 1.9 Encerramento | 24/11 a 15/12 | 2 | 72 | 3.240,00 |
| **Total** |  | **18** | **720** | **32.400,00** |

Hardware, hospedagem, software e orientação dependem da duração do projeto, e não de uma atividade
específica. Por isso entram como custo indireto, distribuídos por mês na linha de base.

---

## 4. Linha de base dos custos

A linha de base é a soma das estimativas, de **R$ 46.420,88**, distribuída por mês. É contra ela que o
realizado é medido na planilha.

| Mês | RH | Hardware | Hospedagem | Software | Orientação | Total no mês | Acumulado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ago/26 | 7.200,00 | 468,75 | 297,00 | 550,00 | 1.800,00 | 10.315,75 | 10.315,75 |
| set/26 | 7.200,00 | 468,75 | 297,00 | 550,00 | 1.800,00 | 10.315,75 | 20.631,50 |
| out/26 | 7.200,00 | 468,75 | 297,00 | 550,00 | 1.800,00 | 10.315,75 | 30.947,25 |
| nov/26 | 7.200,00 | 468,75 | 297,00 | 550,00 | 1.800,00 | 10.315,75 | 41.263,00 |
| dez/26 | 3.600,00 | 234,38 | 148,50 | 275,00 | 900,00 | 5.157,88 | 46.420,88 |
| **Total** | **32.400,00** | **2.109,38** | **1.336,50** | **2.475,00** | **8.100,00** | **46.420,88** |  |

Valores em R$. **Reserva de contingência: R$ 0,00. Reserva gerencial: R$ 0,00.** Como o projeto não tem
de onde desembolsar, a resposta a risco é de escopo, e não de dinheiro. O que não termina num período
desce um nível de prioridade e vai para o seguinte, e as 7 features opcionais servem de colchão. As datas
não se movem para caber escopo (Declaração de Escopo §4.2). O orçamento total, portanto, é igual à linha
de base.

Qualquer alteração da linha de base segue o controle de mudança do plano de projeto (§3): a divergência
vira pendência, o grupo decide e a alteração aprovada é propagada para este documento, para a planilha e
para o TAP na mesma passada.

---

## 5. Requisitos de recursos financeiros do projeto

O requisito de recursos financeiros é de **R$ 0,00 em todos os meses**. A tabela mostra quem provê cada
recurso.

| Recurso | Quem provê | Desembolso do projeto |
| --- | --- | ---: |
| Horas da equipe | Os cinco integrantes, como atividade da disciplina | R$ 0,00 |
| Notebooks | Máquinas próprias dos integrantes | R$ 0,00 |
| Hospedagem, banco, broker, imagens, e-mail e push | Planos gratuitos de Render, Neon, CloudAMQP, Cloudinary, Brevo e FCM | R$ 0,00 |
| Assistentes de IA | Valor de referência: o projeto não contrata nem paga assinatura | R$ 0,00 |
| Repositório, CI e agendador | GitHub (via GitHub Classroom) e GitHub Actions | R$ 0,00 |
| Orientação docente | PUC Minas, pela carga horária dos professores | R$ 0,00 |

Três situações criariam um requisito financeiro, e qualquer uma delas passa pelo controle de mudança
antes de qualquer gasto:

- Estouro do limite de um plano gratuito. O mais sensível é o armazenamento do Neon, de 500 MB. Na carga
  do acervo de 24/09/2026, o schema acervo ficou em cerca de 11 MB, ou seja, 2,2% do plano.
- Notificação push em iOS, que exige conta paga no Apple Developer Program e está fora do escopo.
- Publicação nas lojas de aplicativos, também fora do escopo.

---

## 6. Fluxo de caixa do projeto

O fluxo de caixa separa o custo econômico (orçado e realizado) do desembolso. Os meses depois da data de
status ficam em branco no realizado.

| Mês | Custo orçado | Custo realizado | Acumulado orçado | Acumulado realizado | Desembolso orçado | Desembolso realizado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ago/26 | 10.315,75 | 10.315,75 | 10.315,75 | 10.315,75 | 0,00 | 0,00 |
| set/26 | 10.315,75 | 10.315,75 | 20.631,50 | 20.631,50 | 0,00 | 0,00 |
| out/26 | 10.315,75 | 10.315,75 | 30.947,25 | 30.947,25 | 0,00 | 0,00 |
| nov/26 | 10.315,75 |  | 41.263,00 |  | 0,00 |  |
| dez/26 | 5.157,88 |  | 46.420,88 |  | 0,00 |  |
| **Total** | **46.420,88** | **30.947,25** |  |  | **0,00** | **0,00** |

Valores em R$. **Status em 26/10/2026:** realizado de **R$ 30.947,25**, ou 66,7% da linha de base, com
desvio de R$ 0,00 e índice de desempenho de custo (CPI) de 1,00. Restam **R$ 15.473,63** para novembro e
dezembro. O desembolso realizado é de R$ 0,00.

O CPI de 1,00 é consequência da premissa adotada, e não uma medição. Sem apontamento de horas, o
realizado repete a base do orçado. O controle de esforço da equipe é feito pelo relatório semanal de
contribuição e pelo quadro Kanban, e o controle de prazo pela Previsões do Cronograma. Se o grupo passar
a registrar horas, o desvio real entra na aba Realizado da planilha, mês a mês.

---

## 7. Controle de versões

| Versão | Data | Autor | Notas da revisão |
| --- | --- | --- | --- |
| 1.0 | 26/10/2026 | Renato Douglas Nascimento Silva de Oliveira | Versão inicial: linha de base do TAP nº 01 distribuída por mês e status em 26/10/2026. |

---

## 8. Aprovação

| Nome | Papel no projeto | Assinatura | Data |
| --- | --- | --- | --- |
| Vicenzo Fonseca de Mello Souza | Gerente do Projeto | | |
| Ana Luiza de Freitas Rodrigues | Equipe do Projeto | | |
| Henrique Moreira Gomes de Carvalho | Equipe do Projeto | | |
| Kayke Emanoel de Souza Santos | Equipe do Projeto | | |
| Renato Douglas Nascimento Silva de Oliveira | Equipe do Projeto | | |
