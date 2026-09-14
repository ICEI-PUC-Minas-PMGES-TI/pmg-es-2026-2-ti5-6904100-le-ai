<!-- Artefato de Gerência de Projetos. DERIVADO: o conteúdo nasce no Termo de Abertura de Projeto nº 01
     (assets/atas/TermoDeAberturaDoProjeto.pdf), em docs/orquestador/REQUISITOS.md, em
     docs/orquestador/plano-de-projeto.md e em docs/plano-de-desenvolvimento/README.md.
     Não decide escopo, apenas projeta o que já foi decidido. Ver a rastreabilidade na seção 7. -->

# Gerência de Projetos de Software

## Declaração de Escopo

> **O que este documento é:** a fronteira do projeto **Lê Ai**, ou seja, o que será feito, o que não
> será, sob que restrições e premissas, e contra quais marcos a entrega é medida. É o documento que a
> [EAP](eap.md) decompõe.
>
> **O que este documento não é:** especificação de produto, que está em
> `docs/orquestador/REQUISITOS.md`, nem processo de trabalho, que está em
> `docs/orquestador/plano-de-projeto.md`.

| Campo | Conteúdo |
| --- | --- |
| **Projeto** | Lê Ai |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza |
| **Documento de origem** | Termo de Abertura de Projeto (TAP) nº 01, aprovado em 23/08/2026 |
| **Baseline de requisitos** | `docs/orquestador/REQUISITOS.md` v1.4, baseline fechada em 25/08/2026 |
| **Período** | de 04/08/2026 a 15/12/2026 |
| **Versão** | 1.0, de 14/09/2026 |

---

## 1. Objetivo do projeto (em uma frase)

Desenvolver e colocar em produção, até 15/12/2026, um aplicativo social de leitura, composto por
aplicativo móvel em Flutter, aplicação web em Vue e backend em microsserviços, com o propósito de
aumentar a adesão e a constância de leitura entre jovens brasileiros de 18 a 30 anos.

---

## 2. Escopo do projeto/produto (etapas do ciclo de vida e objetivo de cada uma)

O ciclo de vida do projeto tem **nove etapas**. Elas são exatamente os nós de nível 2 da
[EAP](eap.md), o que garante que toda entrega declarada aqui tenha um pacote de trabalho
correspondente lá.

| # | Etapa do ciclo de vida | Objetivo da etapa | Janela |
| --- | --- | --- | --- |
| 1 | **Gerenciamento do Projeto** | Manter escopo, prazo e comunicação sob controle, por meio do TAP, desta Declaração de Escopo, da EAP e de seu dicionário, do plano de projeto, do plano de desenvolvimento, do registro de partes interessadas e do monitoramento semanal (atas, relatórios de contribuição e quadro Kanban). | de 04/08 a 15/12 (transversal) |
| 2 | **Concepção e Requisitos** | Converter a ideia de produto em requisitos verificáveis e em uma arquitetura decidida, por meio da Lean Inception, do documento de requisitos até a baseline, dos diagramas de modelagem, do Documento de Arquitetura de Software e dos backlogs. | de 04/08 a 01/09 |
| 3 | **Design e Prototipação** | Definir a linguagem visual e de interação e validar as telas do caminho crítico antes de codificar, por meio do Documento de Design, dos protótipos navegáveis, da avaliação heurística e dos wireframes documentados. | de 01/09 a 08/09 |
| 4 | **Período 0: Fundação técnica** | Entregar a base sobre a qual toda funcionalidade roda, com código parcial navegável já implantado: scaffolding dos seis subprojetos, pipeline de CI/CD, deploy em DES (Render e Neon), mensageria e integrações, design system e shell de navegação e autenticação. | dentro da Sprint 3, com alvo em 01/09 |
| 5 | **Período 1: Funcionalidades prioritárias** | Entregar o MVP não negociável, que corresponde ao ciclo mínimo de valor (encontrar um livro, registrar a leitura, acompanhar o progresso e ver amigos fazendo o mesmo), em 10 features Essenciais distribuídas pelos quatro serviços e pelos clientes móvel e web aplicáveis. | de 15/09 a 29/09 |
| 6 | **Período 2: Funcionalidades desejáveis** | Ampliar o produto além do MVP e consolidar os testes das prioritárias, em 14 features Desejáveis: sessão cronometrada, desafios, estatísticas, sequência diária, listas, recomendação entre usuários, moderação e notificações em tempo real. | de 06/10 a 03/11 |
| 7 | **Período 3: Opcionais e refino** | Absorver o colchão de escopo e refinar, por meio de 7 features Opcionais, dos testes das desejáveis, das pendências acumuladas e do ATAM inicial. Nenhuma feature nova entra depois de 17/11. | de 10/11 a 17/11 |
| 8 | **Verificação e Homologação** | Provar que o sistema atende ao que foi especificado e colocá-lo em produção, por meio da verificação geral, da avaliação de arquitetura (ATAM), do congelamento de código, do deploy em produção e do release final. | de 17/11 a 24/11 |
| 9 | **Encerramento** | Formalizar o fim do projeto e transferir o conhecimento, por meio do relatório de encerramento, do Documento de Arquitetura final, do vídeo, do pitch, da apresentação e das lições aprendidas. | de 24/11 a 15/12 |

### 2.1 Escopo do produto por camada

O que as etapas 4 a 8 constroem:

**Backend, composto por 4 microsserviços**

- `identidade` (Spring): usuário, autenticação, perfil, privacidade e seguidores.
- `acervo` (NestJS): livro, autor, editora, série, busca, ingestão, sinopse, capas e nota agregada.
- `leitura` (NestJS): estante, leitura, progresso, sessão, nota, resenha, frases, desafios, sequência diária e estatísticas.
- `social` (Spring): feed, atividades, comentários, listas, recomendações, notificações e moderação.
- Mensageria (RabbitMQ) para os fluxos assíncronos: notificações, cache de capas, e-mail e busca de sinopse.
- PostgreSQL único no Neon, com separação lógica por schema e leitura entre schemas apenas por VIEW de contrato.
- Integração com bases externas de livros (Open Library e Google Books) para ingestão do acervo.

**Aplicativo móvel em Flutter, que é o produto principal, com escopo funcional completo**

- Cadastro, autenticação, perfil e configurações de privacidade.
- Busca e catálogo de livros, autores, editoras e séries, além do cadastro de livro pessoal.
- Estante, registro de leituras, progresso, releitura e histórico.
- Notas, resenhas e frases.
- Desafios de leitura, sequência diária, estatísticas e gamificação.
- Feed social, seguidores, listas, recomendações e notificações in-app.

**Aplicação web em Vue e Tailwind, com subconjunto funcional**

- Consulta e catálogo, estante, resenhas, listas, perfil e feed.

**Infraestrutura e processo**

- Repositório único, integração contínua e implantação nos ambientes de desenvolvimento e de produção.
- Documentação de engenharia e artefatos de processo (etapas 1, 2, 3 e 9).

---

## 3. Limites do projeto (o que não será feito)

Registrado explicitamente para evitar reabertura de discussão. Qualquer item abaixo só entra no projeto
pelo controle de mudança de `docs/orquestador/plano-de-projeto.md` §3.

### 3.1 Limites de plataforma e distribuição

| Não será feito | Razão |
| --- | --- |
| Internacionalização e múltiplos idiomas | O produto é entregue somente em português do Brasil |
| Flutter Web | Vetado pela disciplina; web e mobile são bases de código independentes |
| Paridade funcional entre web e mobile | Desafios, gamificação, registro de progresso e notificações ficam fora da aplicação web |
| Notificações push em iOS | Exigem conta paga no Apple Developer Program; em iOS há apenas notificações in-app |
| Publicação nas lojas (Google Play e App Store) | Fora do escopo acadêmico |
| Aplicativo desktop | Fora do escopo |

### 3.2 Limites de produto

| Não será feito | Razão |
| --- | --- |
| Camada de "obra" unificando edições de um mesmo título | Cada edição é um registro independente |
| Login social (OAuth) e autenticação de dois fatores | Complexidade sem retorno para os três mecanismos do produto |
| Verificação obrigatória de e-mail no cadastro | Gera atrito no caminho crítico |
| Mensagem direta entre usuários | Não serve a registro, meta ou pertencimento |
| Grupos, clubes de leitura e fóruns | Fora do escopo |
| Medalhas, conquistas e ranking de leitores, global ou entre seguidos | A gamificação limita-se à sequência diária |
| Busca exploratória de pessoas, sugestão de perfis ou diretório de usuários | A busca de perfil é apenas por username exato |
| Perfis de autor e de editora como entidades com dono ou conteúdo de usuário | São páginas de catálogo, não entidades sociais |
| Comentários em resenhas | Resenhas recebem apenas curtida e descurtida |
| Leitura de e-books no app e sincronização com dispositivos de leitura | O produto registra a leitura; não distribui conteúdo |
| Importação de dados de outras plataformas de leitura | Fora do escopo |
| Painel de moderação com múltiplos moderadores | Existe uma única conta de administrador, fixa e criada pela equipe |
| HTML, links, imagens, código e tabelas em resenhas | Markdown restrito por RN-13, por razões de segurança |

### 3.3 Limites de negócio e de operação

| Não será feito | Razão |
| --- | --- |
| Monetização, publicidade e integração com comércio eletrônico de livros | Fora do escopo acadêmico |
| Suporte, manutenção evolutiva ou operação do sistema após 15/12/2026 | O projeto encerra na apresentação |

---

## 4. Restrições (o que restringe/condiciona o projeto)

### 4.1 Técnicas

| Restrição | Definição |
| --- | --- |
| Mobile | App nativo em **Flutter**, com escopo funcional completo |
| Web | SPA em **Vue e Tailwind CSS**; o **Flutter Web foi vetado pelo professor** |
| Backend | **Microsserviços** em Spring (Java) e NestJS (TypeScript). Os serviços `identidade` e `social` usam Spring; `acervo` e `leitura` usam NestJS. O FastAPI foi descartado |
| Banco | **PostgreSQL único no Neon**, com um schema por serviço. Nenhum serviço lê tabela crua de outro schema |
| Mensageria | **RabbitMQ**, hospedado no CloudAMQP |
| Hospedagem | **Render**, em plano gratuito. Admite-se a latência inicial característica do *cold start* |
| Serviços de apoio | Cloudinary (capas), Brevo (e-mail transacional), Firebase Cloud Messaging (push em Android) e GitHub Actions `schedule` (agendador) |
| Repositório | **Único**, criado pela faculdade via GitHub Classroom |

### 4.2 Organizacionais e de prazo

| Restrição | Definição |
| --- | --- |
| Equipe | 5 integrantes, todos atuando como full-stack, sem hierarquia entre si |
| Disponibilidade | Média de **8 h semanais por integrante**, totalizando 720 h de esforço em 18 semanas |
| Calendário | Definido pela disciplina. As seis entregas avaliadas somam 100 pontos, dos quais **40 estão na última** |
| Congelamento de features | **17/11/2026**. Nenhuma feature nova entra depois dessa data |
| Produção | Ambiente de PROD apenas a partir de **24/11/2026**. Até lá, o ambiente DES/HML é o que vale como release |
| Portão de qualidade | A promoção de `desenvolvimento` para `main` ocorre sempre por pull request com CI verde. Ninguém commita direto em `main` |
| Corte de escopo | O que não termina em um período desce um nível de prioridade e vai para o seguinte. **Nunca se atrasa uma entrega para caber escopo** |

### 4.3 Financeiras

| Restrição | Definição |
| --- | --- |
| Desembolso | **R$ 0,00**. O sistema inteiro tem de caber nos limites dos planos gratuitos |
| Custo estimado (valor de referência, não desembolsado) | **R$ 46.420,88**, somando 720 h de equipe, depreciação de hardware, equivalente dos planos pagos de Render e Neon, assinaturas de assistentes de IA e 54 h de orientação docente |

### 4.4 Legais e de conformidade

| Restrição | Definição |
| --- | --- |
| LGPD | Tratamento de dados pessoais conforme a Lei Geral de Proteção de Dados |
| Idade | Cadastro restrito a **maiores de 18 anos** |
| Idioma | Apenas **pt-BR** |
| Segurança | Orientada pelo OWASP Top 10 (2021). Os requisitos de segurança de `REQUISITOS.md` §8 são todos Essenciais |

---

## 5. Premissas (condições para iniciar o projeto)

### 5.1 Condições de início (TAP 2.4)

1. Aprovação do Termo de Abertura pelos patrocinadores na reunião de *kickoff*. **Atendida em 23/08/2026.**
2. Documento de requisitos congelado em baseline. **Atendida em 25/08/2026.**
3. Documento de Arquitetura de Software com as decisões técnicas fechadas. **Atendida em 01/09/2026.**
4. Repositório único criado via GitHub Classroom, com acesso dos cinco integrantes e dos professores. **Atendida.**
5. Contas provisionadas nos serviços de plano gratuito: Neon, Render, broker de mensageria, e-mail transacional e Firebase Cloud Messaging. **Atendida.**
6. Equipe de cinco integrantes alocada, com disponibilidade média de 8 horas semanais por integrante. **Atendida.**

### 5.2 Premissas de execução

Assumidas como verdadeiras ao longo do projeto. Se alguma delas deixar de valer, torna-se risco ativo e
aciona o controle de mudança.

- Os planos gratuitos de Render, Neon, CloudAMQP, Cloudinary, Brevo e FCM permanecem disponíveis e
  suficientes para os limites de uso do projeto até 15/12/2026.
- As bases externas Open Library e Google Books permanecem acessíveis e com termos compatíveis com o
  uso acadêmico.
- Os cinco integrantes permanecem alocados durante todo o período. Ausência pontual é absorvida pela
  divisão vertical de features, não por realocação de escopo.
- Os patrocinadores, na figura dos professores orientadores, mantêm a disponibilidade de
  aproximadamente 1 h semanal de orientação.
- O calendário da disciplina não sofre alteração que comprima as janelas dos períodos 1 a 3.
- Cada integrante dispõe de máquina própria e ambiente de desenvolvimento local funcional, incluindo
  PostgreSQL local.

---

## 6. Marcos agendados e entregas

Derivado de `docs/orquestador/plano-de-projeto.md` §3. Cada data é **piso, não teto**: representa o
mínimo que precisa estar pronto naquele momento. Adiantar é desejável; atrasar, não.

| Id. do Marco | Data | Marco | Entregáveis previstos |
| --- | --- | --- | --- |
| **M1** | 11/08/2026 | Lean Inception finalizada (**Entrega 1**, 5 pts) | Canvas da Lean Inception, visão de produto e sequenciador de funcionalidades |
| **M2** | 25/08/2026 | Baseline dos requisitos | Documento de requisitos em baseline (130 RFs em 13 módulos), diagramas de modelagem e Plano de Desenvolvimento com as 37 features distribuídas por período |
| **M3** | 01/09/2026 | Termo de abertura e *kickoff* (**Entrega 2**, 15 pts) | TAP nº 01 assinado, ata de *kickoff*, Documento de Arquitetura final e Período 0 (infraestrutura, CI, deploy em DES e navegabilidade) |
| **M4** | 08/09/2026 | Protótipos e avaliação heurística (**Entrega 3**, 10 pts) | Protótipos navegáveis do caminho crítico corrigidos, relatório de avaliação heurística e wireframes documentados |
| **M5** | 29/09/2026 | Fechamento do Período 1 (**Entrega 4**, 15 pts) | 10 features prioritárias em DES, tag e GitHub Release do Período 1, specs OpenAPI atualizados, Declaração de Escopo e EAP |
| **M6** | 03/11/2026 | Fechamento do Período 2 (**Entrega 5**, 15 pts) | 14 features desejáveis em DES, testes das prioritárias verificados, tag e GitHub Release do Período 2 |
| **M7** | 17/11/2026 | Congelamento de features e verificação geral | 7 features opcionais concluídas ou cortadas, testes das desejáveis, verificação geral do sistema e ATAM inicial |
| **M8** | 24/11/2026 | Congelamento de código e produção | Deploy em produção a partir de tag `vX.Y.Z` e pitch preparado |
| **M9** | 01/12/2026 | Entrega final (**Entrega 6**, 40 pts) | Documento de Arquitetura final, relatório de encerramento, vídeo e release final |
| **M10** | 15/12/2026 | Apresentação | Apresentação do projeto aos patrocinadores, lições aprendidas e encerramento formal |

---

## 7. Rastreabilidade

Nenhum campo deste documento foi decidido aqui. A origem de cada seção é a seguinte:

| Seção | Fonte |
| --- | --- |
| Projeto e Gerente do Projeto | TAP nº 01, itens 1.1 e 1.2 |
| 1. Objetivo | TAP nº 01, item 1.5 |
| 2. Escopo e etapas do ciclo de vida | TAP nº 01, item 2.1; `docs/orquestador/plano-de-projeto.md` §3; `docs/plano-de-desenvolvimento/README.md` |
| 3. Limites | TAP nº 01, item 2.2; `docs/orquestador/REQUISITOS.md` §11, §2.1, §5.1, §5.5, §5.9, §5.11 e §5.12 |
| 4. Restrições | `docs/orquestador/plano-de-projeto.md` §1, §3, §4 e §5; `docs/orquestador/REQUISITOS.md` §1, §2 e §8; TAP nº 01, itens 3 e 4 |
| 5. Premissas | TAP nº 01, item 2.4; `docs/orquestador/plano-de-projeto.md` §13 |
| 6. Marcos | `docs/orquestador/plano-de-projeto.md` §3 |

**Controle de mudança.** Alteração nesta Declaração de Escopo segue o mesmo procedimento de
`docs/orquestador/plano-de-projeto.md` §3: a divergência é registrada como pendência, o grupo decide e
a alteração aprovada é propagada para a [EAP](eap.md) e para os documentos afetados na mesma passada.

---

## 8. Aprovação

> Bloco de aprovação acrescentado ao template da disciplina, no mesmo formato do item 5 do TAP nº 01.

| Nome | Papel no projeto | Assinatura |
| --- | --- | --- |
| Vicenzo Fonseca de Mello Souza | Gerente do projeto | |
| Prof. Artur Martins Mol | Patrocinador. Aprova escopo e avalia as entregas | |
| Prof. João Paulo Carneiro Aramuni | Patrocinador. Aprova escopo e avalia as entregas | |
| Prof. Leonardo Vilela Cardoso | Patrocinador. Aprova escopo e avalia as entregas | |
