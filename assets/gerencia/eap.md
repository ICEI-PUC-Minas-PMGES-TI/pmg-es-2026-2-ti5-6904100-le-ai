<!-- Artefato de Gerência de Projetos. DERIVADO: decompõe a Declaração de Escopo (declaracao_de_escopo.md),
     que por sua vez deriva do TAP nº 01, de docs/orquestador/REQUISITOS.md, de
     docs/orquestador/plano-de-projeto.md §3 e de docs/plano-de-desenvolvimento/README.md.
     Não decide escopo, apenas decompõe o que já foi decidido. -->

# Gerência de Projetos de Software

## Estrutura Analítica do Projeto (EAP) do Lê Ai

> **O que este documento é:** a decomposição hierárquica orientada a entregas do projeto **Lê Ai**.
> Contém a representação hierárquica com códigos de conta, o **dicionário da EAP**, com a especificação
> e o critério de aceitação de cada pacote de trabalho, e a verificação de conformidade metodológica.
>
> **O que este documento não é:** cronograma nem lista de atividades. A EAP diz *o que será entregue*;
> as datas estão em [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §6 e em
> `docs/orquestador/plano-de-projeto.md` §3.

| Campo | Conteúdo |
| --- | --- |
| **Projeto** | Lê Ai |
| **Gerente do Projeto** | Vicenzo Fonseca de Mello Souza |
| **Método** | Decomposição *top-down* por fases do ciclo de vida, conforme o Quadro 1 de *Criar a estrutura analítica do projeto (EAP)* (SOTILLE et al., FGV, 2009) |
| **Base de escopo** | [`declaracao_de_escopo.md`](declaracao_de_escopo.md) v1.0 e `REQUISITOS.md` v1.4, com baseline de 25/08/2026 |
| **Pacotes de trabalho** | 71 |
| **Versão** | 1.0, de 14/09/2026 |

---

## 1. Premissas de construção

Como esta EAP foi montada, e o que isso implica ao lê-la:

1. **O nível 0 é o projeto.** O **nível 2 abre com o Gerenciamento do Projeto e fecha com o
   Encerramento**, e entre eles estão as fases do ciclo de vida, conforme a estratégia do Quadro 1 do guia.
2. **Os nós de nível 2 são, um a um, as nove etapas do ciclo de vida** declaradas em
   [`declaracao_de_escopo.md`](declaracao_de_escopo.md) §2. Essa correspondência é a âncora entre os dois
   documentos: se uma etapa mudar lá, muda aqui na mesma passada.
3. **A granularidade de parada nos períodos 1 a 3 é a *feature***, identificada pelo ID real de
   `docs/plano-de-desenvolvimento/README.md`. É a menor unidade que o projeto já controla de verdade,
   pois tem dono registrado, arquivo próprio, critérios de aceite e Definition of Done. Decompor abaixo
   disso, por camada de infraestrutura, backend, web e mobile, geraria cerca de 150 pacotes cujo custo
   de controle excederia o benefício.
4. **Testes não são pacote de trabalho.** O `plano-de-projeto.md` §3 é explícito ao afirmar que
   *"testes não são fase"*, pois eles constituem item do Definition of Done de cada feature. Criar um
   pacote chamado "Testes" duplicaria entrega já contada dentro de cada feature.
5. **O spec OpenAPI também não é pacote de trabalho**, pela mesma razão: é item do DoD da feature que
   alterou o serviço. O que constitui pacote é o *Swagger UI* agregado, entregue uma única vez em `P0-NAV`.
6. **Os releases de período são filhos do período** que os produz, e não de uma fase de entrega
   separada. É o que faz a soma dos filhos corresponder integralmente à entrega do pai.
7. **A EAP não é simétrica.** Ramos de naturezas diferentes param em níveis diferentes, o que o guia
   admite explicitamente (Xavier, 2009).

---

## 2. Representação hierárquica

A seguir, os códigos de conta. Componentes no nível mais baixo de cada ramo, isto é, sem filhos, são os
**pacotes de trabalho**, detalhados no dicionário da seção 3.

```
1 ......... Lê Ai
1.1 ....... Gerenciamento do Projeto
1.1.1 ..... Termo de Abertura do Projeto
1.1.2 ..... Declaração de Escopo
1.1.3 ..... Estrutura Analítica do Projeto
1.1.3.1 ... Representação Hierárquica da EAP
1.1.3.2 ... Dicionário da EAP
1.1.4 ..... Plano de Projeto
1.1.5 ..... Plano de Desenvolvimento
1.1.6 ..... Registro das Partes Interessadas
1.1.7 ..... Monitoramento e Controle
1.1.7.1 ... Atas de Reunião Semanais
1.1.7.2 ... Relatórios Individuais de Contribuição
1.1.7.3 ... Quadro Kanban do Projeto
1.2 ....... Concepção e Requisitos
1.2.1 ..... Lean Inception
1.2.2 ..... Documento de Requisitos em Baseline
1.2.3 ..... Diagramas de Modelagem
1.2.3.1 ... Diagrama de Visão Geral
1.2.3.2 ... Diagrama de Componentes
1.2.3.3 ... Modelo de Dados
1.2.4 ..... Documento de Arquitetura de Software (baseline)
1.2.5 ..... Product Backlog e Sprint Backlog
1.3 ....... Design e Prototipação
1.3.1 ..... Documento de Design
1.3.2 ..... Protótipos Navegáveis do Caminho Crítico
1.3.3 ..... Relatório de Avaliação Heurística
1.3.4 ..... Wireframes Documentados
1.4 ....... Período 0: Fundação Técnica
1.4.1 ..... P0-INFRA: Scaffolding do Monorepo e Serviços
1.4.2 ..... P0-CI: Pipeline de Integração e Entrega Contínuas
1.4.3 ..... P0-DEPLOY: Ambiente de Desenvolvimento (Render e Neon)
1.4.4 ..... P0-MSG: Mensageria e Integrações Base
1.4.5 ..... P0-DS: Design System Base
1.4.6 ..... P0-NAV: Navegabilidade, Shell de Autenticação e Documentação de API
1.5 ....... Período 1: Funcionalidades Prioritárias
1.5.1 ..... F-AUT: Autenticação e Conta
1.5.2 ..... F-PERFIL: Perfil, Privacidade e Seguidores
1.5.3 ..... F-ACV-BUSCA: Busca e Página do Livro
1.5.4 ..... F-ACV-CADASTRO: Cadastro de Livros (ISBN e Pessoal)
1.5.5 ..... F-ACV-INGESTAO: Ingestão do Acervo
1.5.6 ..... F-EST: Estante e Ciclo de Leitura
1.5.7 ..... F-PRG: Progresso Manual
1.5.8 ..... F-AVA: Nota e Resenha
1.5.9 ..... F-FEED: Feed e Interações Sociais
1.5.10 .... F-NOT: Notificações In-App
1.5.11 .... Release do Período 1
1.6 ....... Período 2: Funcionalidades Desejáveis
1.6.1 ..... F-CONTA-2: Exclusão de Conta
1.6.2 ..... F-SOCIAL-2: Comentários e Menções-Link
1.6.3 ..... F-ACV-DESCOBERTA: Filtros e Páginas de Autor, Editora e Série
1.6.4 ..... F-ACV-NOTA: Nota Geral e Cache de Capas
1.6.5 ..... F-EST-2: Favoritos, Histórico e Buscas
1.6.6 ..... F-SESSAO: Sessão de Leitura Cronometrada
1.6.7 ..... F-AVA-2: Reações, Markdown e Frases
1.6.8 ..... F-DSF: Desafios
1.6.9 ..... F-STA: Estatísticas
1.6.10 .... F-GAM: Sequência Diária
1.6.11 .... F-LST: Listas
1.6.12 .... F-REC-P2P: Recomendação entre Usuários
1.6.13 .... F-MOD: Moderação
1.6.14 .... F-NOT-2: Notificações em Tempo Real
1.6.15 .... Release do Período 2
1.7 ....... Período 3: Opcionais e Refino
1.7.1 ..... F-ACV-OPC: Extras de Acervo
1.7.2 ..... F-REC-ALG: Recomendação Algorítmica
1.7.3 ..... F-NOT-OPC: Preferências de Notificação e Push
1.7.4 ..... F-MOD-OPC: Suspensão de Conta
1.7.5 ..... F-GAM-OPC: Calendário e Lembrete de Sequência
1.7.6 ..... F-STA-OPC: Distribuição de Notas
1.7.7 ..... F-DSF-OPC: Histórico de Janelas de Desafio
1.7.8 ..... Refino das Pendências Acumuladas
1.7.9 ..... Release do Período 3
1.8 ....... Verificação e Homologação
1.8.1 ..... Relatório de Verificação Geral
1.8.2 ..... Avaliação da Arquitetura (ATAM)
1.8.3 ..... Release Final em Produção
1.9 ....... Encerramento
1.9.1 ..... Documento de Arquitetura de Software (versão final)
1.9.2 ..... Relatório de Encerramento
1.9.3 ..... Vídeo de Apresentação
1.9.4 ..... Pitch
1.9.5 ..... Apresentação Final
1.9.6 ..... Lições Aprendidas
```

### Resumo por ramo

| Código | Entrega de nível 2 | Pacotes de trabalho | Etapa correspondente na Declaração de Escopo |
| --- | --- | --- | --- |
| 1.1 | Gerenciamento do Projeto | 10 | Etapa 1 |
| 1.2 | Concepção e Requisitos | 7 | Etapa 2 |
| 1.3 | Design e Prototipação | 4 | Etapa 3 |
| 1.4 | Período 0: Fundação Técnica | 6 | Etapa 4 |
| 1.5 | Período 1: Funcionalidades Prioritárias | 11 | Etapa 5 |
| 1.6 | Período 2: Funcionalidades Desejáveis | 15 | Etapa 6 |
| 1.7 | Período 3: Opcionais e Refino | 9 | Etapa 7 |
| 1.8 | Verificação e Homologação | 3 | Etapa 8 |
| 1.9 | Encerramento | 6 | Etapa 9 |
| | **Total** | **71** | |

---

## 3. Dicionário da EAP

Apenas os **pacotes de trabalho**, isto é, as folhas, aparecem aqui. Nós agregadores ficam de fora,
conforme o guia. Marcos e atividades de cronograma também não entram.

### 3.0 Critério de aceitação padrão de feature (DoD)

Todas as features dos ramos 1.4 a 1.7 compartilham o **Definition of Done** de
`docs/orquestador/plano-de-projeto.md` §10, citado uma vez aqui e referenciado adiante como **“DoD”**:

1. Código nas camadas aplicáveis mergeado em `desenvolvimento`;
2. CI verde, contemplando lint, build e testes;
3. Testes automatizados dos casos de uso da feature, no mínimo no backend;
4. Spec OpenAPI do serviço atualizado em `docs/api/`;
5. Fluxo funcionando em DES/HML, e não apenas localmente;
6. Arquivo da feature atualizado quanto a status, pendências e timeline;
7. Divergência entre protótipo e implementação registrada, se houver.

### 3.1 Gerenciamento do Projeto

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação |
| --- | --- | --- | --- |
| 1.1.1 | Termo de Abertura do Projeto | Documento no template da disciplina, com identificação, objetivo, benefícios, qualidade esperada, escopo preliminar e contra-escopo, entregáveis, condições de início, prazo, custo e partes interessadas. | Aprovado na reunião de *kickoff* e assinado pelos cinco integrantes e pelos patrocinadores. |
| 1.1.2 | Declaração de Escopo | Documento no template da disciplina, com objetivo em uma frase, etapas do ciclo de vida, limites, restrições, premissas e marcos agendados, derivado do TAP e da baseline de requisitos. | Todos os campos do template preenchidos e coerentes com o TAP, e documento aprovado pelos patrocinadores. |
| 1.1.3.1 | Representação Hierárquica da EAP | Árvore de decomposição com códigos de conta, do nível 0 ao pacote de trabalho, cobrindo as nove etapas do ciclo de vida. | Nível 2 idêntico às etapas da Declaração de Escopo, com conformidade verificada contra os dez mandamentos. |
| 1.1.3.2 | Dicionário da EAP | Especificação e critério de aceitação de cada pacote de trabalho da representação hierárquica. | Todo pacote de trabalho tem uma linha, e nenhum nó agregador tem. |
| 1.1.4 | Plano de Projeto | Processo de trabalho, contemplando estrutura do repositório, fases e timebox, ambientes, branches e releases, divisão de trabalho, convenções para agentes, contratos de API, Definition of Done, rituais e riscos. | Publicado em `docs/orquestador/plano-de-projeto.md` e adotado pelos cinco integrantes. |
| 1.1.5 | Plano de Desenvolvimento | Tabela-mestre das 37 features, com ID, serviço, período, prioridade e RFs cobertos, acompanhada de um arquivo de especificação por feature e de um índice por período. | Os 130 RFs da baseline alocados, sem nenhum RF fora de período e nenhum em dois períodos. |
| 1.1.6 | Registro das Partes Interessadas | Detalhamento do item 5 do TAP, com nome, papel, interesse, influência e canal de comunicação de cada parte interessada. | Cobre equipe, patrocinadores, coordenação, usuários finais e fornecedores de serviço. |
| 1.1.7.1 | Atas de Reunião Semanais | Uma ata por semana em `assets/atas/`, com decisões, pendências e próximos passos, consolidada pelo plantão da semana. | Uma ata por semana de projeto, com decisões rastreáveis. |
| 1.1.7.2 | Relatórios Individuais de Contribuição | Um relatório semanal por integrante em `assets/contribuicao_semanal/`, montado a partir do histórico de commits e do status das features. | Um relatório por integrante em cada semana cobrada. |
| 1.1.7.3 | Quadro Kanban do Projeto | Quadro do GitHub Projects com as 37 features e seus estados, usado como painel de acompanhamento. | O estado do quadro reflete o status registrado nos arquivos de feature. |

### 3.2 Concepção e Requisitos

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação |
| --- | --- | --- | --- |
| 1.2.1 | Lean Inception | Visão de produto, personas, jornadas, revisão técnica e de negócio e sequenciador de funcionalidades. | Aprovada pelos patrocinadores na Entrega 1. |
| 1.2.2 | Documento de Requisitos em Baseline | Objetivo, escopo e plataformas, glossário, atores, 130 requisitos funcionais em 13 módulos com prioridade E, D ou O, regras de negócio, requisitos não funcionais, segurança OWASP e LGPD, estratégia de testes, integrações e itens fora de escopo. | Baseline declarada e fechada. A partir dela, alteração ocorre somente pelo controle de mudança do plano §3. |
| 1.2.3.1 | Diagrama de Visão Geral | Fonte Mermaid da visão geral da solução, contemplando clientes, serviços e dependências externas. | Fonte versionada em `docs/diagramas/`, com a figura correspondente referenciada no documento da disciplina. |
| 1.2.3.2 | Diagrama de Componentes | Fonte Mermaid da decomposição em componentes dos quatro microsserviços e de suas interfaces. | Consistente com a decomposição do Documento de Arquitetura. |
| 1.2.3.3 | Modelo de Dados | Fonte Mermaid do modelo de dados, com um schema por serviço e as VIEWs de contrato entre schemas. | Cobre as entidades dos 13 módulos, sem nenhuma leitura de tabela crua entre schemas. |
| 1.2.4 | Documento de Arquitetura de Software (baseline) | Decisões técnicas fechadas quanto a decomposição em serviços, alocação de stack, dados, mensageria, integrações e itens a validar no Período 0. | Decisões sem pendência bloqueante para o início do Período 0, entregues junto da Entrega 2. |
| 1.2.5 | Product Backlog e Sprint Backlog | Backlog de produto priorizado e recorte por sprint, no formato cobrado pela disciplina. | Rastreável até os RFs da baseline. |

### 3.3 Design e Prototipação

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação |
| --- | --- | --- | --- |
| 1.3.1 | Documento de Design | Linguagem visual e de interação, contemplando paleta, escala tipográfica, espaçamento, raio, elevação e componentes, com tokens em valores neutros, e não em classes de framework. | Tokens neutros o bastante para serem implementados nas duas stacks sem divergir. |
| 1.3.2 | Protótipos Navegáveis do Caminho Crítico | Protótipos das telas do caminho crítico e das funcionalidades prioritárias, com prompt de tela versionado ao lado de cada protótipo. | Caminho crítico navegável de ponta a ponta, com as violações da avaliação heurística corrigidas. |
| 1.3.3 | Relatório de Avaliação Heurística | Avaliação pelas heurísticas de Nielsen, com cenário, metodologia, avaliadores, problemas catalogados por severidade e evidências. | Entregue na Entrega 3, com os problemas classificados e as correções encaminhadas. |
| 1.3.4 | Wireframes Documentados | Wireframes das telas do caminho crítico no documento da disciplina, referenciando os protótipos correspondentes. | Uma entrada por tela do caminho crítico. |

### 3.4 Período 0: Fundação Técnica

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação |
| --- | --- | --- | --- |
| 1.4.1 | P0-INFRA: Scaffolding do Monorepo e Serviços | Estrutura `code/{mobile,front,back/{identidade,acervo,leitura,social}}`, com um `AGENTS.md` por subprojeto, `.env.example` e esqueleto de cada serviço contendo health check, corpo de erro padronizado e `correlation-id` no log estruturado. | Os seis subprojetos compilam e sobem localmente, e o health check responde em cada serviço. |
| 1.4.2 | P0-CI: Pipeline de Integração e Entrega Contínuas | GitHub Actions com filtro por caminho, lint, build e teste por serviço, e artefato APK do Flutter a cada merge em `main`. | Pipeline verde nos seis subprojetos, e mudança em `docs/` não dispara build. |
| 1.4.3 | P0-DEPLOY: Ambiente de Desenvolvimento (Render e Neon) | Quatro serviços e o site estático Vue publicados no Render, e projeto Neon único com um schema por serviço e branch única de DES. | Os cinco alvos acessíveis em DES, com banco conectado e migrações aplicadas. |
| 1.4.4 | P0-MSG: Mensageria e Integrações Base | RabbitMQ e CloudAMQP conectados com uma conexão por serviço, envelope e outbox definidos, e validação de viabilidade em plano gratuito do GitHub Actions `schedule`, do Cloudinary, do Brevo e do FCM. | Mensagem publicada e consumida de ponta a ponta em DES, com DLQ configurada e as quatro integrações validadas. |
| 1.4.5 | P0-DS: Design System Base | Tokens do Documento de Design materializados em `docs/design-system/tokens.json` e traduzidos para a configuração web (Tailwind e CSS vars) e para o `ThemeData` do Flutter. | O mesmo token produz o mesmo resultado visual nas duas stacks. |
| 1.4.6 | P0-NAV: Navegabilidade, Shell de Autenticação e Documentação de API | Cadastro e login mínimos ligando web e mobile ao serviço `identidade`, navegação entre as telas principais, e Swagger UI agregado com o scaffolding de `docs/api/`. | Navegação demonstrável em DES nos dois clientes, e Swagger UI subindo com os quatro specs. |

### 3.5 Período 1: Funcionalidades Prioritárias

O serviço dono está indicado entre parênteses. O critério de aceitação de todas é o **DoD** cumprido,
acrescido do critério específico.

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação específico |
| --- | --- | --- | --- |
| 1.5.1 | F-AUT: Autenticação e Conta (`identidade`) | Cadastro, login por e-mail ou username, tokens de acesso e renovação, recuperação de senha via Brevo, troca de senha, logout e login de administrador. | Senha armazenada apenas como hash, token de recuperação de uso único, e cadastro que barra menores de 18 anos. |
| 1.5.2 | F-PERFIL: Perfil, Privacidade e Seguidores (`identidade`) | Editar perfil, ver perfil de outro usuário, busca por username exato, perfil público ou privado, seguir e solicitar seguir, deixar de seguir e remover seguidor, e listas de seguidores e seguidos. | Controle de acesso a perfil privado (RN-08) validado no servidor e coberto por teste. |
| 1.5.3 | F-ACV-BUSCA: Busca e Página do Livro (`acervo`) | Busca paginada por título, autor, editora e ISBN, filtro por assunto, página do livro e sinopse sob demanda com fallback sem erro. | Busca paginada com limite imposto pelo servidor, e ausência de sinopse que não quebra a página. |
| 1.5.4 | F-ACV-CADASTRO: Cadastro de Livros (`acervo`) | Cadastro oficial por ISBN a partir de fonte externa, tratamento de ISBN inexistente e duplicado, e cadastro, edição e exclusão de livro pessoal. | Livro pessoal visível apenas ao dono e pelas vias previstas em RN-15. |
| 1.5.5 | F-ACV-INGESTAO: Ingestão do Acervo (`acervo`) | Carga inicial da base oficial a partir de *data dump*, com normalização (RN-12) e associação de assuntos (RN-21). | Carga reprodutível e idempotente, com acervo consultável em DES após a ingestão. |
| 1.5.6 | F-EST: Estante e Ciclo de Leitura (`leitura`) | Status na estante, estante por status, iniciar, finalizar, abandonar, reler e retomar, contagem de conclusões, abandono automático em 40 dias e alertas nos dias 20 e 30. | Máquina de estados de leitura (RN-04) e inatividade com abandono automático (RN-05) cobertas por teste, por serem prioridade obrigatória de testes. |
| 1.5.7 | F-PRG: Progresso Manual (`leitura`) | Registrar progresso por página e tempo, calcular página atual e percentual concluído, visualizar e excluir atualizações, e validar a página informada. | Página fora do intervalo do livro é rejeitada no servidor. |
| 1.5.8 | F-AVA: Nota e Resenha (`leitura`) | Nota de 0 a 5 com meia estrela, uma resenha por livro, marcação de *spoiler* e exclusão. | Propriedade do recurso validada no servidor, com uma resenha por par de usuário e livro. |
| 1.5.9 | F-FEED: Feed e Interações Sociais (`social`) | Feed cronológico, publicação de atividades de início, retomada, conclusão, abandono e resenha, curtir, comentar e responder (RN-10), e menção pré-preenchida ao responder. | Feed que respeita a privacidade de perfil, com listagem paginada. |
| 1.5.10 | F-NOT: Notificações In-App (`social`) | Geração de notificações in-app, lista paginada com não lidas, marcação de lidas individualmente e em lote, e ação de abandonar na notificação de leitura em risco. | Consumidor idempotente, com mensagem inválida encaminhada para DLQ. |
| 1.5.11 | Release do Período 1 | Tag `vX.Y.Z` e GitHub Release com as dez features prioritárias, specs OpenAPI atualizados e Documento de Arquitetura revisado. | Ambiente DES/HML rodando a versão da tag, com DoD cumprido nas dez features. |

### 3.6 Período 2: Funcionalidades Desejáveis

O critério de aceitação de todas é o **DoD** cumprido, acrescido do critério específico.

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação específico |
| --- | --- | --- | --- |
| 1.6.1 | F-CONTA-2: Exclusão de Conta (`identidade`) | Exclusão da própria conta e dos dados pessoais, em atendimento à LGPD. | Evento `conta.excluida` publicado somente após vencer a janela de recuperação de 30 dias. |
| 1.6.2 | F-SOCIAL-2: Comentários e Menções-Link (`social`) | Edição e exclusão dos próprios comentários, e resolução de menções `@username` para link de perfil. | Menção resolvida sem permitir HTML ou link arbitrário. |
| 1.6.3 | F-ACV-DESCOBERTA: Filtros e Páginas de Autor, Editora e Série (`acervo`) | Filtros avançados de busca, páginas de autor, editora e série, e assuntos exibidos e acionáveis como filtro. | Páginas de catálogo sem conteúdo de usuário nem dono, conforme o limite de escopo. |
| 1.6.4 | F-ACV-NOTA: Nota Geral e Cache de Capas (`acervo`) | Importação da nota geral externa, exibição da nota geral e da nota dos leitores como indicadores distintos, e cache de capas oficiais (RN-14). | Projeção consistente após *backfill* da fonte contratual, realizado antes de consumir novos eventos. |
| 1.6.5 | F-EST-2: Favoritos, Histórico e Buscas (`leitura`) | Favoritar e desfavoritar, histórico de ocorrências concluídas pesquisável por título e autor com consulta do progresso, e busca local na estante. | Histórico que preserva ocorrências de releitura como registros distintos. |
| 1.6.6 | F-SESSAO: Sessão de Leitura Cronometrada (`leitura`) | Sessão cronometrada com modo de foco (RN-16), pausa e retomada, cancelamento e recuperação de sessão interrompida, apenas no cliente mobile. | Sessão interrompida por fechamento do aplicativo é recuperada sem perda de tempo registrado. |
| 1.6.7 | F-AVA-2: Reações, Markdown e Frases (`leitura`) | Curtir e descurtir resenhas com contadores separados, Markdown com pré-visualização (RN-13), e frases ou trechos com página (RN-11). | Parser com HTML embutido desabilitado e sanitização antes do DOM. |
| 1.6.8 | F-DSF: Desafios (`leitura`) | Criação de desafios por páginas, minutos ou livros, com janela diária, semanal, mensal ou anual, atualização a cada progresso e a cada leitura finalizada, e ações de visualizar, editar, pausar e excluir. | Consumidor idempotente, com desafio atualizado na janela correta. Fora do cliente web. |
| 1.6.9 | F-STA: Estatísticas (`leitura`) | Totais e médias, gráficos de evolução, e recálculo assíncrono a partir dos eventos de progresso e conclusão. | Recálculo idempotente, com *backfill* executado antes de consumir eventos novos. |
| 1.6.10 | F-GAM: Sequência Diária (`leitura`) | Manutenção da sequência diária (RN-18), exibição da atual e da maior já alcançada, e zeramento em dia sem progresso. | Virada de dia tratada no fuso do usuário. Fora do cliente web. |
| 1.6.11 | F-LST: Listas (`social`) | Criar, editar e excluir listas, adicionar, remover e reordenar livros, ver listas de outros respeitando a privacidade, e livros pessoais em modo consulta (RN-15). | Lista de perfil privado invisível a quem não segue. |
| 1.6.12 | F-REC-P2P: Recomendação entre Usuários (`social`) | Recomendação de livro entre seguimento mútuo (RN-22), mensagem opcional, visualização e descarte das recebidas, remoção automática ao adicionar à estante, e aba Recomendações unificada. | Recomendação permitida apenas entre seguimento mútuo, validado no servidor. |
| 1.6.13 | F-MOD: Moderação (`social`) | Denúncia de resenhas e comentários, painel de denúncias, remoção e arquivamento, e log de auditoria. | Painel restrito à conta única de administrador, com toda ação registrada em log de auditoria. |
| 1.6.14 | F-NOT-2: Notificações em Tempo Real (`social`) | Entrega das notificações ao cliente em tempo real, sem recarga manual. | Notificação que chega ao cliente sem *refresh*, com degradação para *polling* que não quebra a lista in-app. |
| 1.6.15 | Release do Período 2 | Tag `vX.Y.Z` e GitHub Release com as catorze features desejáveis, testes das prioritárias verificados e specs OpenAPI atualizados. | Ambiente DES/HML rodando a versão da tag, com DoD cumprido nas catorze features. |

### 3.7 Período 3: Opcionais e Refino

O critério de aceitação das features é o **DoD** cumprido, acrescido do critério específico. As
opcionais constituem o colchão de corte: se o tempo apertar, são as primeiras a sair, e sair é decisão
registrada, não omissão.

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação específico |
| --- | --- | --- | --- |
| 1.7.1 | F-ACV-OPC: Extras de Acervo (`acervo`) | Recarga manual do *data dump* e informação de assuntos ao cadastrar livro pessoal. | Recarga que reaproveita o script de F-ACV-INGESTAO, sem duplicar registros. |
| 1.7.2 | F-REC-ALG: Recomendação Algorítmica (`social`) | Sugestões por similaridade e por quem o usuário segue (RN-08), com motivo exibido e descarte, além do descarte em lote das recomendações de um livro (RN-22). | Cálculo em tempo de consulta, sem tabela derivada nova, com motivo exibido em toda sugestão. |
| 1.7.3 | F-NOT-OPC: Preferências de Notificação e Push (`social`) | Configuração de categorias de notificação e entrega por push em Android via FCM. | Push apenas em Android, permanecendo o iOS com notificação in-app. |
| 1.7.4 | F-MOD-OPC: Suspensão de Conta (`social`) | Suspensão da conta de um leitor pelo administrador. | Comando autenticado e idempotente, com suspensão registrada em log de auditoria. |
| 1.7.5 | F-GAM-OPC: Calendário e Lembrete de Sequência (`leitura`) | Calendário de dias com progresso e lembrete de sequência ativa. | Leitura do dado que F-GAM já persiste, sem entidade nova. O lembrete depende de push em Android. |
| 1.7.6 | F-STA-OPC: Distribuição de Notas (`leitura`) | Visualização da distribuição das notas atribuídas pelo usuário. | Histograma derivado por agrupamento, sem entidade nova. |
| 1.7.7 | F-DSF-OPC: Histórico de Janelas de Desafio (`leitura`) | Histórico das janelas concluídas de cada desafio, com indicação de cumprimento. | Janela selada que preserva o alvo vigente à época, de modo que editar o desafio não reescreva o histórico. |
| 1.7.8 | Refino das Pendências Acumuladas | Resolução das pendências registradas nos arquivos de feature dos períodos anteriores e das divergências de baseline sinalizadas para o controle de mudança. | Nenhuma pendência bloqueante aberta no fechamento do período. |
| 1.7.9 | Release do Período 3 | Tag `vX.Y.Z` e GitHub Release com as opcionais concluídas, testes das desejáveis verificados e o refino aplicado. | Ambiente DES/HML rodando a versão da tag, com as opcionais cortadas registradas junto da decisão. |

### 3.8 Verificação e Homologação

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação |
| --- | --- | --- | --- |
| 1.8.1 | Relatório de Verificação Geral | Verificação ponta a ponta do sistema contra os requisitos da baseline, com o dono de cada feature respondendo pela sua, e registro das divergências encontradas. | Todo requisito Essencial verificado em DES/HML. Divergência sem correção torna-se decisão registrada. |
| 1.8.2 | Avaliação da Arquitetura (ATAM) | Cenários de qualidade, avaliação dos atributos, pontos de sensibilidade e *trade-offs*, com medições obtidas do sistema rodando em DES. | Cenários rastreáveis aos requisitos não funcionais e de segurança, com medições reais, e não estimadas. |
| 1.8.3 | Release Final em Produção | Congelamento de código, tag `vX.Y.Z` e implantação em PROD dos quatro serviços, do site estático e do APK. | Ambiente de produção acessível e estável a partir de 24/11, com release publicado no GitHub. |

### 3.9 Encerramento

| EAP | Pacote de trabalho | Especificação da entrega | Critério de aceitação |
| --- | --- | --- | --- |
| 1.9.1 | Documento de Arquitetura de Software (versão final) | Atualização do documento de 1.2.4 com a arquitetura como construída, incluindo o que mudou em relação à baseline e o HTML estático dos specs OpenAPI. | Reflete o sistema em produção, e não o planejado, com as divergências em relação à baseline justificadas. |
| 1.9.2 | Relatório de Encerramento | Consolidação do projeto, contemplando escopo entregue em comparação ao planejado, itens cortados e suas razões, esforço realizado e resultados. | Cobre os quatro períodos e reconcilia com a Declaração de Escopo. |
| 1.9.3 | Vídeo de Apresentação | Vídeo demonstrando o produto em funcionamento, no formato e na duração cobrados pela disciplina. | Publicado em `divulge/` e acessível aos avaliadores. |
| 1.9.4 | Pitch | Apresentação comercial curta do produto, contemplando problema, solução, diferencial e demonstração. | Preparado até 24/11 e ensaiado antes da apresentação. |
| 1.9.5 | Apresentação Final | Apresentação do projeto aos patrocinadores em 15/12, com o sistema rodando em produção. | Realizada na data prevista, com o sistema demonstrado ao vivo. |
| 1.9.6 | Lições Aprendidas | Registro do que funcionou, do que não funcionou e do que o grupo faria de forma diferente, organizado por fase do ciclo de vida. | Uma lição registrada por etapa do ciclo de vida, no mínimo. |

---

## 4. Conformidade com os dez mandamentos da EAP

| # | Mandamento | Como foi atendido |
| --- | --- | --- |
| I | Cobiçarás a EAP do próximo | Construída sobre o modelo do Quadro 1 do guia da disciplina e sobre a decomposição já existente no Plano de Desenvolvimento, em vez de partir do zero. |
| II | Explicitarás todas as entregas, inclusive as de gerenciamento | O ramo 1.1 cobre os artefatos de gerenciamento, e os ramos 1.2 a 1.9 cobrem as nove etapas do ciclo de vida. Trabalho que não contribua para nenhum elemento desta EAP não faz parte do projeto. |
| III | Não usarás os nomes em vão | Todo pacote é nomeado por substantivo que designa a **entrega**, e não o processo. Emprega-se "Relatório de Verificação Geral", e não "verificar"; "Release do Período 1", e não "fechar o período". |
| IV | Guardarás a descrição dos pacotes no dicionário | A seção 3 especifica os 71 pacotes de trabalho, com entrega e critério de aceitação. |
| V | Decomporás até o nível que permita planejamento e controle | Nos períodos, a parada é a *feature*, unidade que já dispõe de dono, arquivo, critérios de aceite e DoD, e que é onde o controle de fato acontece. |
| VI | Não decomporás em demasia | Não se desce ao nível de camada, isto é, infraestrutura, backend, web e mobile, nem ao nível de tarefa. Isso geraria cerca de 150 pacotes cujo custo de controle excederia o benefício em um projeto de 18 semanas. |
| VII | Honrarás o pai | Cada pacote é componente legítimo do nó do qual foi decomposto. O Swagger UI, por exemplo, fica sob `P0-NAV`, que o entrega, e não sob um ramo de documentação. |
| VIII | Decomporás de forma que a soma dos filhos corresponda ao pai (regra dos 100%) | O release de cada período é filho daquele período, para que a soma dos filhos esgote a entrega do pai. Os 130 RFs da baseline estão integralmente cobertos pelas 37 features dos ramos 1.4 a 1.7. |
| IX | Não decomporás em somente uma entrega | Nenhum nó tem filho único. O menor ramo decomposto é 1.8, com três pacotes, seguido de 1.1.3, com dois. |
| X | Não repetirás o mesmo elemento em mais de uma entrega | Nenhum código aparece sob dois pais. Onde o guia admite nomes próximos em ramos diferentes, o dicionário os distingue: **1.2.4** é o Documento de Arquitetura em *baseline*, com decisões fechadas na Entrega 2, e **1.9.1** é a versão final, com a arquitetura como construída na Entrega 6. Testes e specs OpenAPI não constituem pacote próprio justamente para não serem contados duas vezes, pois são item do DoD de cada feature. |

---

## 5. Controle de mudança

Esta EAP acompanha a Declaração de Escopo e segue o mesmo procedimento de
`docs/orquestador/plano-de-projeto.md` §3:

1. Quem detecta a divergência registra-a como **pendência no arquivo da feature** correspondente, e
   nunca edita o orquestrador nem esta EAP no momento em que a detecta.
2. O grupo decide na reunião semanal.
3. Se aprovada, a alteração entra na Declaração de Escopo e nesta EAP na mesma passada, com análise de
   impacto sobre features, diagramas, specs OpenAPI e documentos da disciplina afetados.

Corte de escopo não constitui mudança de EAP. O que não termina em um período **desce um nível de
prioridade e vai para o período seguinte**, movendo-se dentro da estrutura já prevista. Opcional
cortada permanece na EAP, com a decisão de corte registrada em seu arquivo de feature.

---

## Referências

- SOTILLE, Mauro A. et al. **Gerenciamento do escopo em projetos**. 2. ed. Rio de Janeiro: FGV, 2009.
- XAVIER, Carlos Magno da Silva. **Gerenciamento de projetos: como definir e controlar o escopo do projeto**. 2. ed. São Paulo: Saraiva, 2009.
- PROJECT MANAGEMENT INSTITUTE. **A guide to the project management body of knowledge (PMBoK)**. 4. ed. PMI Standard, ANSI, 2008.
- PROJECT MANAGEMENT INSTITUTE. **Practice standard for work breakdown structures**. 2. ed. Pennsylvania: PMI, 2006.
