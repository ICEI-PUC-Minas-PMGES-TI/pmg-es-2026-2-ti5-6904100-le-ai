<!-- Artefato de Gerência de Projetos. DERIVADO: atribui responsabilidade sobre os pacotes de
     trabalho da EAP (eap.md), usando os papéis definidos em docs/orquestador/plano-de-projeto.md §6
     e as partes interessadas de declaracao_de_escopo.md §8.
     Não cria atividade nem papel: apenas distribui o que já foi decidido. -->

# Gerência de Projetos de Software

## Matriz de Responsabilidades (RACI) do Lê Ai

> **O que este documento é:** quem executa, quem aprova, quem é consultado e quem é informado em cada
> pacote de trabalho da [EAP](eap.md). Responde à pergunta *"de quem é isso?"* antes que ela vire
> conflito na reunião semanal.
>
> **O que este documento não é:** cronograma, alocação de horas nem organograma. *O que* será entregue
> está na [EAP](eap.md); *quando*, em [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §6; *como
> trabalhamos*, em `docs/orquestador/plano-de-projeto.md`.

| Campo | Conteúdo |
| --- | --- |
| **Projeto** | Lê Ai |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza |
| **Equipe do Projeto** | Ana Luiza de Freitas Rodrigues, Henrique Moreira Gomes de Carvalho, Kayke Emanoel de Souza Santos, Renato Douglas Nascimento Silva de Oliveira e Vicenzo Fonseca de Mello Souza |
| **Base de decomposição** | [`eap.md`](eap.md) v1.0, com 71 pacotes de trabalho |
| **Base de papéis** | `docs/orquestador/plano-de-projeto.md` §6 e [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §8 |
| **Linhas de atividade** | 44 |
| **Versão** | 1.0, de 21/09/2026 |

---

## 1. Papéis da matriz

As colunas não são cargos genéricos: são os papéis que o projeto de fato exerce. Os dois do meio
existem porque a divisão de trabalho é vertical e o fechamento da branch é rotativo, e nenhum dos dois
cabe em "equipe gerenciada".

| Papel | Quem é | Origem |
| --- | --- | --- |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza | [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §8 |
| **Dono da entrega** | Integrante registrado como dono do pacote de trabalho ou da feature no arquivo correspondente de `docs/plano-de-desenvolvimento/`. A divisão é vertical: o dono responde pela feature de ponta a ponta, de infraestrutura a back-end, web e mobile. | `plano-de-projeto.md` §6 |
| **Equipe de Desenvolvimento** | Os cinco integrantes, todos atuando como full-stack. Não há hierarquia entre eles; decisão de grupo é tomada na reunião semanal. | `plano-de-projeto.md` §6 |
| **Plantão da Semana** | Rotação semanal entre os cinco. O plantonista fecha `desenvolvimento` em `main` por PR, valida o deploy em DES/HML e consolida a ata da semana. | `plano-de-projeto.md` §6 e §12 |
| **Patrocinadores** | Prof. Artur Martins Mol, Prof. João Paulo Carneiro Aramuni e Prof. Leonardo Vilela Cardoso, que aprovam o escopo e avaliam as entregas. | [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §8 |

## 2. Convenção de preenchimento

Significado das siglas, conforme o template da disciplina, em hierarquia decrescente:

- **R** — Responsável pela execução.
- **A** — responsável pela Aprovação.
- **C** — deve ser Consultado.
- **I** — deve ser Informado.

Regras que esta matriz segue, e que precisam valer em qualquer alteração futura:

1. **Exatamente um `A` por linha.** Aprovação compartilhada é aprovação de ninguém.
2. **Pelo menos um `R` por linha.** Linha sem executor é atividade que não acontece.
3. **`A` nos Patrocinadores quando a entrega é avaliada pela disciplina**; `A` no Gerente do Projeto
   quando o trabalho é interno ao grupo.
4. **Mais de um `R` é permitido** quando a execução é genuinamente coletiva, como a Lean Inception e a
   apresentação final.
5. **O número no início de cada atividade é o código de conta da EAP.** Atividade sem código é rotina
   de processo do `plano-de-projeto.md` que não constitui pacote de trabalho.

Nas linhas de 1.5 a 1.7 a matriz descreve o fluxo de **qualquer uma das 37 features**, e não uma
feature específica: todas seguem o mesmo ciclo e o mesmo Definition of Done, de modo que 37 linhas
repetiriam o mesmo padrão sem acrescentar informação.

---

## 3. Matriz RACI

### 1.1 Gerenciamento do Projeto

| EAP | Atividade | Gerente | Dono | Equipe | Plantão | Patroc. |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| 1.1.1 | Elaborar o Termo de Abertura do Projeto e conduzir a reunião de *kickoff* | R | C | C | I | **A** |
| 1.1.2 | Elaborar a Declaração de Escopo | R | C | C | I | **A** |
| 1.1.3 | Elaborar a EAP e o dicionário da EAP | R | C | C | I | **A** |
| 1.1.4 | Definir o Plano de Projeto (branches, Definition of Done, rituais e prazos) | **A** | C | R | C | I |
| 1.1.5 | Definir o Plano de Desenvolvimento (37 features por período) | **A** | R | C | I | I |
| 1.1.6 | Manter o Registro das Partes Interessadas | R | I | C | I | **A** |
| 1.1.7.1 | Consolidar a ata da reunião semanal | **A** | I | C | R | I |
| 1.1.7.2 | Emitir o relatório individual de contribuição | **A** | I | R | C | I |
| 1.1.7.3 | Atualizar o quadro Kanban com o estado das features | **A** | R | C | C | I |
| — | Conduzir o controle de mudança de requisitos e a análise de impacto | **A** | R | C | I | C |

### 1.2 Concepção e Requisitos

| EAP | Atividade | Gerente | Dono | Equipe | Plantão | Patroc. |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| 1.2.1 | Realizar a Lean Inception e fechar a visão de produto | R | I | R | I | **A** |
| 1.2.2 | Elaborar o documento de requisitos e fechar a baseline | C | C | R | I | **A** |
| 1.2.3 | Elaborar os diagramas de modelagem (visão geral, componentes e dados) | C | R | C | I | **A** |
| 1.2.4 | Elaborar o Documento de Arquitetura de Software (baseline) | C | C | R | I | **A** |
| 1.2.5 | Manter o Product Backlog e o Sprint Backlog | **A** | R | C | C | I |

### 1.3 Design e Prototipação

| EAP | Atividade | Gerente | Dono | Equipe | Plantão | Patroc. |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| 1.3.1 | Elaborar o Documento de Design e os tokens de design | **A** | R | C | I | C |
| 1.3.2 | Construir os protótipos navegáveis do caminho crítico | C | R | C | I | **A** |
| 1.3.3 | Executar a avaliação heurística e emitir o relatório | C | I | R | I | **A** |
| 1.3.4 | Documentar os wireframes | **A** | R | C | I | C |

### 1.4 Período 0: Fundação Técnica

| EAP | Atividade | Gerente | Dono | Equipe | Plantão | Patroc. |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| 1.4.1 | P0-INFRA: scaffolding do monorepo e dos quatro serviços | **A** | R | C | I | I |
| 1.4.2 | P0-CI: pipeline de integração e entrega contínuas | **A** | R | C | C | I |
| 1.4.3 | P0-DEPLOY: ambiente DES/HML no Render e no Neon | **A** | R | C | C | I |
| 1.4.4 | P0-MSG: mensageria base (envelope, outbox, retry e DLQ) | **A** | R | C | I | I |
| 1.4.5 | P0-DS: design system base a partir do `tokens.json` | **A** | R | C | I | I |
| 1.4.6 | P0-NAV: navegabilidade, shell de autenticação e documentação de API | **A** | R | C | I | I |

### 1.5 a 1.7 Períodos 1 a 3: Desenvolvimento das features

Vale para qualquer uma das 37 features, conforme a regra 5 da seção 2.

| EAP | Atividade | Gerente | Dono | Equipe | Plantão | Patroc. |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| — | Alocar a feature a um dono e registrá-lo no arquivo do período | **A** | C | R | I | I |
| — | Especificar a feature (escopo, critérios de aceite e DoD) | **A** | R | C | I | I |
| — | Implementar a feature de ponta a ponta (back-end, web e mobile) | **A** | R | C | I | I |
| — | Criar a migration do serviço da feature e submetê-la à revisão humana | **A** | R | C | C | I |
| — | Atualizar o spec OpenAPI e o catálogo de mensageria do serviço | **A** | R | C | C | I |
| — | Escrever os testes automatizados dos casos de uso da feature | **A** | R | C | I | I |
| — | Fechar `desenvolvimento` em `main` por PR com CI verde | **A** | C | I | R | I |
| — | Validar o fluxo em DES/HML | **A** | C | C | R | I |
| — | Decidir o corte de escopo no fechamento do período | **A** | C | R | I | C |
| 1.5.11 / 1.6.15 / 1.7.9 | Publicar a tag e o release de fim de período | R | C | C | C | **A** |

### 1.8 Verificação e Homologação

| EAP | Atividade | Gerente | Dono | Equipe | Plantão | Patroc. |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| 1.8.1 | Emitir o relatório de verificação geral do projeto | R | C | C | I | **A** |
| 1.8.2 | Conduzir a avaliação da arquitetura (ATAM) | C | I | R | I | **A** |
| 1.8.3 | Congelar o código e publicar o release final em produção | **A** | C | C | R | I |

### 1.9 Encerramento

| EAP | Atividade | Gerente | Dono | Equipe | Plantão | Patroc. |
| --- | --- | :-: | :-: | :-: | :-: | :-: |
| 1.9.1 | Atualizar o Documento de Arquitetura (versão final) | **A** | C | R | I | C |
| 1.9.2 | Elaborar o relatório de encerramento | R | C | C | I | **A** |
| 1.9.3 | Produzir o vídeo de apresentação | C | R | C | I | **A** |
| 1.9.4 | Preparar o pitch | C | R | C | I | **A** |
| 1.9.5 | Realizar a apresentação final aos patrocinadores | R | C | R | I | **A** |
| 1.9.6 | Registrar as lições aprendidas | **A** | I | R | C | I |

---

## 4. Recursos humanos do projeto

Um integrante pode desempenhar mais de um papel, e cada papel admite um nível de proficiência
diferente, razão pela qual a tabela é detalhada por papel e não por pessoa. O nível de proficiência
refere-se à capacidade atual de desempenhar as atividades para as quais a pessoa é executora, e vale
`Suficiente` quando não há necessidade de qualificação, caso em que a capacitação é `NA`.

Os papéis abaixo derivam do que cada integrante efetivamente entregou, registrado em
`assets/contribuicao_semanal/`.

| Nome | Papel no projeto | Nível de Proficiência | Capacitação |
| --- | --- | --- | --- |
| Vicenzo Fonseca de Mello Souza | Gerente do projeto: escopo, prazo, comunicação e artefatos de gerência | Suficiente | NA |
| Vicenzo Fonseca de Mello Souza | Designer de interface: protótipos, telas e tokens de design | Suficiente | NA |
| Vicenzo Fonseca de Mello Souza | Desenvolvedor back-end: serviços NestJS (`acervo` e `leitura`) e deploy | Suficiente | NA |
| Renato Douglas Nascimento Silva de Oliveira | Analista de gerência de projetos: TAP, Declaração de Escopo, EAP e atas | Suficiente | NA |
| Renato Douglas Nascimento Silva de Oliveira | Analista de infraestrutura: banco no Neon e serviços no Render | Suficiente | NA |
| Renato Douglas Nascimento Silva de Oliveira | Desenvolvedor back-end: serviços Spring (`identidade` e `social`) | Suficiente | NA |
| Henrique Moreira Gomes de Carvalho | Desenvolvedor full-stack: Spring, Vue e Flutter na mesma feature | Suficiente | NA |
| Henrique Moreira Gomes de Carvalho | Responsável por segurança da aplicação: JWT, *rate limiting* e OWASP Top 10 | Suficiente | NA |
| Kayke Emanoel de Souza Santos | Desenvolvedor front-end web: Vue, Vite e Tailwind CSS | Suficiente | NA |
| Kayke Emanoel de Souza Santos | Engenheiro de CI/CD: pipelines dos seis subprojetos | Suficiente | NA |
| Ana Luiza de Freitas Rodrigues | Desenvolvedora mobile: Flutter, design system e temas | Suficiente | NA |
| Os cinco integrantes | Testador: testes automatizados dos casos de uso (mínimo: back-end) | Suficiente | NA |
| Os cinco integrantes | Desenvolvedor de mensageria: RabbitMQ, outbox, idempotência e DLQ | Insuficiente | Estudo dirigido de RabbitMQ e do padrão outbox a partir de P0-MSG, antes do consumo de eventos no Período 2 |
| Papel a designar pelo gerente | Avaliador de arquitetura: conduzir o ATAM (pacote 1.8.2) | Insuficiente | Estudo do método ATAM e do roteiro de `docs/8.avaliacao_arquitetura.md` até 10/11/2026 |

> **Pendência:** os níveis de proficiência e as capacitações são a única parte deste documento que não
> se apoia em registro do repositório. Foram inferidos do que já foi entregue no período 0 e dos
> papéis ainda sem histórico de execução. O grupo confirma ou corrige antes de coletar assinatura.

---

## 5. Rastreabilidade

| Conteúdo desta matriz | Origem |
| --- | --- |
| Atividades e códigos de conta | [`eap.md`](eap.md) §2 e §3 |
| Agrupamento em nove etapas | [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §2 |
| Gerente do Projeto e patrocinadores | [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §8 e TAP nº 01, itens 1.2 e 5 |
| Dono da entrega, plantão e ausência de hierarquia | `docs/orquestador/plano-de-projeto.md` §6 |
| Atividades de processo sem código de EAP | `docs/orquestador/plano-de-projeto.md` §3, §5 e §10 |
| Papéis da tabela de recursos humanos | `assets/contribuicao_semanal/` |

## 6. Controle de mudança

Esta matriz acompanha a EAP e segue o mesmo procedimento de
`docs/orquestador/plano-de-projeto.md` §3:

1. Quem detecta a divergência registra-a como pendência no arquivo da feature correspondente.
2. O grupo decide na reunião semanal.
3. Se aprovada, a alteração entra aqui e na [EAP](eap.md) na mesma passada.

Pacote de trabalho novo na EAP exige linha nova aqui; pacote removido tem sua linha removida. A
verificação é a regra 1 da seção 2: toda linha precisa de exatamente um `A`.

## Referências

- PROJECT MANAGEMENT INSTITUTE. **A guide to the project management body of knowledge (PMBoK)**. 4. ed. PMI Standard, ANSI, 2008.
- SOTILLE, Mauro A. et al. **Gerenciamento do escopo em projetos**. 2. ed. Rio de Janeiro: FGV, 2009.
