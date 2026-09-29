# REQUISITOS

**Versão:** v1.8 — 29/09/2026
**Baseline:** fechada em 25/08/2026
**Status:** baseline fechada — público-alvo ampliado para leitores adultos em 29/09/2026 (ver Timeline)

Este documento é a **fonte de verdade** do projeto. Toda decisão de produto, modelo de dados e regra de negócio mora aqui. Arquivos de feature, specs OpenAPI, diagramas e código derivam deste documento — nunca o contrário.

Alterações após a baseline seguem o controle de mudança definido em `docs/orquestador/plano-de-projeto.md` §3. Nenhuma alteração é feita diretamente por agente.

---

## 1. Visão do produto

Aplicativo social de leitura, no modelo Skoob/Letterboxd, cujo objetivo é **aumentar a adesão à leitura entre leitores brasileiros adultos**.

A tese de produto é que o hábito de leitura se sustenta por três mecanismos: **registro** (ver o que já foi lido), **meta** (ter um alvo curto e alcançável) e **pertencimento** (ver amigos lendo). O aplicativo entrega os três. Funcionalidades que não servem a nenhum desses mecanismos são candidatas naturais a corte de escopo.

**Público-alvo primário:** leitores brasileiros com 18 anos ou mais, com uso predominante em dispositivo móvel. **O cadastro é permitido a partir dos 18 anos**, decisão tomada para evitar o tratamento de dados pessoais de menores de idade, que impõe exigências adicionais sob a LGPD.

**Idioma:** pt-BR. Internacionalização está fora de escopo.

---

## 2. Escopo e plataformas

| Plataforma | Tecnologia | Papel |
|---|---|---|
| Mobile | Flutter (nativo) | **Produto principal** — escopo funcional completo |
| Web | **Vue** (SPA) com **Tailwind CSS** | **Subconjunto** de funcionalidades |
| Backend | Microsserviços em **Spring + NestJS** (identidade/social em Spring, acervo/leitura em NestJS — Documento de Arquitetura §2.1); FastAPI descartado | Web services consumidos por ambos os clientes |

O professor vetou o uso de Flutter Web, portanto web e mobile são aplicações separadas com bases de código independentes, consumindo os mesmos serviços.

### 2.1 Escopo do cliente web

**Paridade funcional entre web e mobile não é exigida** (confirmado com o professor em 16/08/2026). O foco do projeto é o cliente móvel.

Cada requisito funcional carrega a coluna **Web** indicando se está no escopo da aplicação Vue. A web cobre **consulta, catálogo e conteúdo escrito** — onde teclado e tela grande ajudam — e deixa para o mobile o que é uso cotidiano e de sessão curta.

**Fora do escopo web:** desafios, gamificação e notificações.

Em caso de necessidade de corte de escopo, a redução recai sobre o cliente web antes de qualquer funcionalidade do cliente móvel.

---

## 3. Glossário do domínio

| Termo | Definição |
|---|---|
| **Livro** | Uma **edição** específica. Duas edições da mesma obra são dois registros `Livro` distintos, com ISBN, editora, nº de páginas e capa próprios. Não existe camada de "obra" no sistema. |
| **Livro oficial** | Livro pertencente à base oficial do aplicativo. Visível e utilizável por todos. Possui ISBN-13 único. Alimenta as páginas de autor, editora e série. |
| **Assunto** | Gênero literário normalizado do catálogo (Terror, Ficção científica, Romance etc.), pertencente a um conjunto curado e fechado. Um livro pode ter mais de um. |
| **Livro pessoal** | Livro cadastrado manualmente por um usuário. **Não possui ISBN.** Apenas o dono pode ler e editar seus dados e iniciar leituras nele. Não alimenta páginas de autor, editora ou série. |
| **Leitura** | Registro de uma passagem do usuário por um livro, com data de início, data de fim e página de parada. Um usuário pode ter várias leituras do mesmo livro ao longo do tempo. |
| **Releitura** | Leitura de um livro que o usuário já concluiu ao menos uma vez. |
| **Atualização de progresso** | Evento registrado pelo usuário durante uma leitura, informando **em qual página parou** e o tempo gasto. As páginas lidas são derivadas pelo sistema. |
| **Resenha** | Texto de opinião. É **do livro**, não da leitura: no máximo uma por usuário por livro, sempre editável. |
| **Nota** | Avaliação de 0 a 5 estrelas, com meia estrela, atribuída por um leitor. É **do livro**, não da leitura: uma por usuário por livro, sempre editável. |
| **Nota dos leitores** | Média das notas atribuídas pelos usuários do aplicativo a um livro. |
| **Nota geral** | Nota média do livro **importada da fonte externa** na ingestão. Existe independentemente de qualquer leitor do aplicativo ter avaliado o livro. |
| **Desafio** | Meta de leitura configurada pelo usuário, com unidade (páginas, minutos ou livros) e janela (diária, semanal, mensal ou anual). Um mesmo usuário pode ter **vários desafios ativos simultaneamente**. |
| **Atividade** | Evento do usuário publicado no feed de seus seguidores. |

---

## 4. Atores

| Ator | Descrição |
|---|---|
| **Visitante** | Não autenticado. Acesso apenas a cadastro, login e recuperação de senha. |
| **Leitor** | Usuário autenticado. Ator principal do sistema. |
| **Administrador** | Conta **fixa e única**, criada pelo grupo, com credenciais definidas em variável de ambiente (`.env`). Acesso ao painel de moderação. Não é um papel atribuível a usuários comuns e não há tela de criação de administradores. |
| **Sistema** | Processos automáticos: expiração de leituras, ingestão de livros, avaliação de desafios. |

---

## 5. Requisitos funcionais

**Prioridade:** `E` = Essencial (MVP, não negociável) · `D` = Desejável (entra se houver folga) · `O` = Opcional (primeiro a ser cortado)

O critério de priorização: é Essencial o que sustenta o ciclo mínimo de valor — *encontrar um livro → registrar leitura → acompanhar progresso → ver amigos fazendo o mesmo* — mais tudo o que a disciplina exige como demonstração técnica (mensageria, concorrência, tratamento de erro).

### 5.1 Conta e autenticação (AUT)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-AUT-01 | O visitante deve poder se cadastrar informando e-mail, **username único**, nome de exibição, data de nascimento e senha. | E | ✅ |
| RF-AUT-02 | O leitor deve poder autenticar-se informando **e-mail ou username** e senha. | E | ✅ |
| RF-AUT-03 | O sistema deve emitir token de acesso de curta duração e token de renovação, permitindo sessão persistente no cliente. | E | ✅ |
| RF-AUT-04 | O leitor deve poder solicitar recuperação de senha por e-mail, recebendo link com token de uso único e prazo de validade. | E | ✅ |
| RF-AUT-05 | O leitor deve poder alterar a própria senha informando a senha atual. | E | ✅ |
| RF-AUT-06 | O leitor deve poder encerrar a sessão, invalidando o token de renovação. | E | ✅ |
| RF-AUT-07 | O leitor deve poder solicitar a exclusão da própria conta, recuperá-la em até **30 dias** e, vencido o prazo, ter seus dados e conteúdos removidos definitivamente. | D | ✅ |
| RF-AUT-08 | O administrador deve autenticar-se pelo mesmo fluxo, com credenciais provisionadas por variável de ambiente. | E | ✅ |

> ℹ️ **P-02 decidida: Brevo.** Serviço de e-mail transacional para RF-AUT-04. Justificativa e consequências no Documento de Arquitetura §2.6.

**Fora de escopo:** login social/OAuth, autenticação de dois fatores, verificação obrigatória de e-mail no cadastro.

### 5.2 Acervo e catálogo (ACV)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-ACV-01 | O leitor deve poder buscar livros por **título, autor, editora ou ISBN**, com resultados paginados. | E | ✅ |
| RF-ACV-02 | O leitor deve poder filtrar resultados de busca por **assunto**. | E | ✅ |
| RF-ACV-03 | O leitor deve poder filtrar resultados de busca por autor, editora, série, ano de publicação e faixa de nº de páginas. | D | ✅ |
| RF-ACV-04 | O leitor deve poder visualizar a página de um livro com metadados, capa, **sinopse** e resenhas de outros leitores; **nota geral**, **nota dos leitores** e distribuição de notas aparecem quando as funcionalidades correspondentes estiverem disponíveis. | E | ✅ |
| RF-ACV-05 | O leitor deve poder **cadastrar um livro na base oficial informando o ISBN**; o sistema busca os metadados em fonte externa e cria o registro. | E | ✅ |
| RF-ACV-06 | Se o ISBN informado não for encontrado em nenhuma fonte externa, o sistema deve exibir mensagem de erro específica e oferecer o caminho de **cadastro pessoal**. | E | ✅ |
| RF-ACV-07 | Se o ISBN informado já existir na base oficial, o sistema deve bloquear o cadastro e direcionar o leitor à página do livro existente. | E | ✅ |
| RF-ACV-08 | O leitor deve poder **cadastrar um livro pessoal** informando manualmente título, autor, nº de páginas e, opcionalmente, sinopse e capa por upload de imagem. | E | ✅ |
| RF-ACV-09 | O leitor deve poder editar e excluir os livros pessoais que cadastrou. | E | ✅ |
| RF-ACV-10 | O leitor deve poder visualizar a **página de autor**, com biografia curta obtida da OpenLibrary, quando disponível, e lista de livros oficiais daquele autor. Na ausência de biografia na fonte, a seção não é exibida. | D | ✅ |
| RF-ACV-11 | O leitor deve poder visualizar a **página de editora**, com lista de livros oficiais daquela editora. | D | ✅ |
| RF-ACV-12 | O leitor deve poder visualizar a **página de série**, com os livros oficiais da série ordenados por número de ordem. | D | ✅ |
| RF-ACV-13 | O sistema deve permitir carga inicial da base oficial a partir de data dump externo, com normalização de autor, editora e série. | E | — |
| RF-ACV-14 | O sistema deve permitir recarga manual do data dump para atualizar a base oficial. | O | — |
| RF-ACV-15 | O sistema deve importar da fonte externa, quando disponível, a **nota geral** e a quantidade de avaliações que a originou, persistindo ambas junto ao livro oficial. | D | — |
| RF-ACV-16 | A página do livro deve exibir **nota geral** e **nota dos leitores** como indicadores distintos e rotulados, sem combiná-los em um único valor. | D | ✅ |
| RF-ACV-17 | O sistema deve armazenar a capa de um livro oficial em serviço próprio na primeira vez que o livro entra na estante de algum usuário, conforme RN-14. | D | — |
| RF-ACV-18 | O sistema deve obter e persistir a **sinopse** de um livro oficial **sob demanda**, na primeira vez que sua página é aberta, conforme RN-19. | E | ✅ |
| RF-ACV-19 | A página do livro deve permanecer utilizável quando a sinopse não estiver disponível, exibindo sua ausência sem mensagem de erro. | E | ✅ |
| RF-ACV-20 | O sistema deve associar **assuntos** aos livros oficiais na ingestão, normalizados conforme RN-21. | E | — |
| RF-ACV-21 | A página do livro deve exibir seus assuntos, cada um acionável como filtro de busca. | D | ✅ |
| RF-ACV-22 | O leitor deve poder informar assuntos ao cadastrar um livro pessoal, escolhendo-os do conjunto curado. | O | ✅ |

Páginas de autor, editora e série **não são perfis**: não têm dono, não recebem conteúdo de usuário e não são editáveis pela interface. São páginas de consulta e filtro, alimentadas exclusivamente pela base oficial curada.

### 5.3 Estante e leituras (EST)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-EST-01 | O sistema deve representar a relação do leitor com um livro em um dos status **Quero ler, Lendo, Lido, Relendo ou Abandonado**, conforme as transições de RN-04. | E | ✅ |
| RF-EST-02 | O leitor deve poder visualizar sua estante agrupada por status, com ordenação e paginação. | E | ✅ |
| RF-EST-03 | O leitor deve poder **iniciar uma leitura**, registrando a data de início (padrão: data atual, editável). | E | ✅ |
| RF-EST-04 | O leitor deve poder **finalizar uma leitura**, registrando a data de fim (padrão: data atual, editável). | E | ✅ |
| RF-EST-05 | O leitor deve poder **abandonar manualmente** uma leitura em andamento. | E | ✅ |
| RF-EST-06 | O leitor deve poder **iniciar uma releitura** de um livro com status Lido, gerando novo registro de leitura. | E | ✅ |
| RF-EST-07 | O leitor deve poder **retomar** uma primeira leitura abandonada, continuando da página registrada. | E | ✅ |
| RF-EST-08 | O sistema deve exibir na página do livro o **número de vezes que o leitor concluiu** aquele livro. | E | ✅ |
| RF-EST-09 | O leitor deve poder marcar e desmarcar livros como **favoritos**. | D | ✅ |
| RF-EST-10 | O leitor deve poder visualizar seu **histórico de leituras concluídas por ano**, pesquisar por **título ou autor em todo o histórico**, ver cada ocorrência finalizada de leitura ou releitura do livro encontrado e selecionar uma ocorrência para consultar, em modo somente leitura, suas **atualizações de progresso**. | D | ✅ |
| RF-EST-11 | O sistema deve **abandonar automaticamente** leituras sem atividade por 40 dias, conforme RN-05 e a máquina de estados de RN-04. | E | — |
| RF-EST-12 | O sistema deve **alertar o leitor** nos dias 20 e 30 de inatividade de uma leitura, conforme RN-05. | E | — |
| RF-EST-13 | O leitor deve poder **buscar por título e autor dentro da própria estante**, combinável com o filtro por status de RF-EST-02. A busca é restrita à estante do leitor e não retorna livros do acervo. | D | ✅ |

### 5.4 Progresso (PRG)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-PRG-01 | O leitor deve poder registrar uma atualização de progresso informando **em qual página parou** e, opcionalmente, **quanto tempo gastou**. | E | ✅ |
| RF-PRG-02 | O sistema deve calcular e exibir a **página atual** e o **percentual concluído** da leitura a partir das atualizações registradas. | E | ✅ |
| RF-PRG-03 | O leitor deve poder visualizar suas atualizações de progresso de uma leitura em andamento e excluir um registro intermediário **somente junto de todos os posteriores**, recalculando-se a página atual e os efeitos derivados (RN-17). | E | ✅ |
| RF-PRG-04 | O sistema deve rejeitar atualização cuja página informada seja **menor ou igual à página atual** da leitura ou **maior que o total de páginas** do livro. | E | ✅ |
| RF-PRG-05 | O leitor deve poder **iniciar uma sessão de leitura cronometrada** a partir de uma leitura em andamento, com o tempo medido pelo aplicativo. | D | ❌ |
| RF-PRG-06 | Durante a sessão ativa, o aplicativo deve operar em **modo de foco**, bloqueando o acesso a todas as demais áreas do aplicativo até que a sessão seja encerrada ou cancelada, conforme RN-16. O modo de foco **não é configurável nem contornável** pelo leitor. | D | ❌ |
| RF-PRG-07 | Ao encerrar a sessão, o leitor deve informar **em qual página parou**; o sistema deriva as páginas lidas e registra a atualização de progresso com o tempo cronometrado. | D | ❌ |
| RF-PRG-08 | O leitor deve poder **cancelar** uma sessão em andamento, sem registro de progresso. | D | ❌ |
| RF-PRG-09 | O sistema deve **recuperar sessão interrompida** por fechamento do aplicativo, falha ou desligamento do dispositivo, conforme RN-16. | D | ❌ |
| RF-PRG-10 | O leitor deve poder visualizar o tempo transcorrido durante a sessão. | D | ❌ |
| RF-PRG-11 | O leitor deve poder **pausar** a sessão, escolhendo a duração da pausa entre 5, 10 ou 15 minutos, e **retomá-la** antes de esgotado esse tempo. | D | ❌ |
| RF-PRG-12 | O sistema deve encerrar automaticamente a sessão cuja pausa se esgote sem retomada, preservando o tempo de leitura medido e solicitando a página na reabertura do aplicativo. | D | ❌ |

Há **duas formas de registrar progresso**. Ambas usam a mesma entrada de página — **a página em que o leitor parou**, valor absoluto — e diferem apenas na origem do tempo:

| Forma | Página | Tempo |
|---|---|---|
| **Manual** (RF-PRG-01) | Informada pelo leitor | Informado pelo leitor (opcional) |
| **Sessão cronometrada** (RF-PRG-05 a RF-PRG-10) | Informada pelo leitor ao encerrar | Medido pelo aplicativo |

**Páginas lidas** e **percentual concluído** são sempre valores **derivados**, calculados pelo sistema e apenas exibidos, nunca informados pelo leitor (RN-17). O percentual não é entrada porque o cálculo dos desafios depende de páginas e de minutos.

### 5.5 Avaliação e conteúdo (AVA)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-AVA-01 | O leitor deve poder atribuir a um livro uma **nota de 0 a 5 estrelas, com meia estrela**, editável a qualquer momento. | E | ✅ |
| RF-AVA-02 | O leitor deve poder escrever **uma resenha por livro**, editável a qualquer momento. | E | ✅ |
| RF-AVA-03 | O leitor deve poder marcar sua resenha como **contendo spoiler**; resenhas assim marcadas são exibidas ocultas, exigindo ação para revelar. | E | ✅ |
| RF-AVA-04 | O leitor deve poder excluir sua resenha. | E | ✅ |
| RF-AVA-05 | O leitor deve poder reagir a resenhas de outros com **curtida ou descurtida**, uma reação por resenha, inclusive em resenhas de livros pessoais a que tenha acesso. | D | ✅ |
| RF-AVA-06 | O leitor deve poder cadastrar **frases/trechos** de um livro, informando obrigatoriamente a **página de referência**, respeitando o limite de caracteres de RN-11. | D | ✅ |
| RF-AVA-07 | O leitor deve poder visualizar as frases cadastradas de um livro e excluir as suas. | D | ✅ |
| RF-AVA-08 | A resenha deve exibir a **contagem de curtidas e a contagem de descurtidas separadamente**, visíveis a todos os leitores que têm acesso à resenha. | D | ✅ |
| RF-AVA-09 | A resenha deve aceitar formatação em **Markdown**, conforme o subconjunto permitido em RN-13, com pré-visualização antes de publicar. | D | ✅ |

Resenhas **não recebem comentários** — apenas curtida/descurtida.

### 5.6 Listas (LST)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-LST-01 | O leitor deve poder criar listas de livros com título e descrição. | D | ✅ |
| RF-LST-02 | O leitor deve poder adicionar, remover e reordenar livros em suas listas. | D | ✅ |
| RF-LST-03 | O leitor deve poder editar e excluir suas listas. | D | ✅ |
| RF-LST-04 | O leitor deve poder visualizar listas de outros leitores, respeitando a privacidade do perfil. | D | ✅ |
| RF-LST-05 | O leitor deve poder adicionar **seus próprios livros pessoais** às suas listas, conforme RN-15. | D | ✅ |
| RF-LST-06 | Ao visualizar uma lista de outro leitor que contenha livro pessoal, o leitor deve poder abrir a página daquele livro em **modo consulta**, sem ação de adicionar à estante. | D | ✅ |

### 5.7 Desafios (DSF)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-DSF-01 | O leitor deve poder criar **um ou mais desafios simultâneos**, escolhendo unidade (**páginas, minutos ou livros**), janela (**diária, semanal, mensal ou anual**) e valor-alvo. | D | ❌ |
| RF-DSF-02 | O sistema deve atualizar o progresso dos desafios de páginas e de minutos a partir de cada **atualização de progresso** de leitura. | D | ❌ |
| RF-DSF-03 | O leitor deve poder visualizar o progresso de cada desafio na janela corrente. | D | ❌ |
| RF-DSF-04 | O leitor deve poder editar, pausar e excluir seus desafios. | D | ❌ |
| RF-DSF-05 | O sistema deve exibir o histórico de janelas concluídas de cada desafio com unidade, periodicidade e meta vigentes em cada período, indicando cumprimento ou não; períodos sem progresso aparecem como não cumpridos (RN-20). | O | ❌ |
| RF-DSF-06 | O sistema deve atualizar o progresso dos desafios de livros a partir de cada **leitura finalizada**. | D | ❌ |

### 5.8 Estatísticas (STA)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-STA-01 | O leitor deve poder visualizar totais de livros concluídos, páginas lidas e tempo de leitura, por ano e no acumulado. | D | ✅ |
| RF-STA-02 | O leitor deve poder visualizar médias: páginas por dia, dias por livro e nota média atribuída. | D | ✅ |
| RF-STA-03 | O leitor deve poder visualizar gráficos de evolução: páginas por mês e livros concluídos por mês. | D | ✅ |
| RF-STA-04 | O leitor deve poder visualizar a distribuição das notas que atribuiu. | O | ✅ |
| RF-STA-05 | O sistema deve recalcular as estatísticas de forma assíncrona a partir dos eventos de progresso e de conclusão de leitura. | D | — |

**Cálculo das médias (decisão incorporada em 15/09/2026):** páginas/dia e médias similares por dia usam somente os **dias com leitura registrada**, contados uma vez por data local. Registro manual e sessão cronometrada encerrada com progresso qualificam igualmente; sessão cancelada ou sem progresso não cria dia de leitura. **Dias por livro** usa todos os dias de calendário entre início e fim de cada leitura concluída, inclusive dias sem leitura e intervalos de abandono; releituras concluídas são ocorrências independentes. O contrato de F-STA explicita a contagem inclusiva das datas de início e fim. Sem denominador, a média é ausente.

### 5.9 Perfil e social (SOC)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-SOC-01 | O leitor deve poder editar seu perfil: nome de exibição, biografia, avatar e privacidade. | E | ✅ |
| RF-SOC-02 | O leitor deve poder visualizar o perfil de outro leitor, com estante, resenhas, listas e contadores. | E | ✅ |
| RF-SOC-03 | O leitor deve poder **buscar outro leitor apenas por username exato**. | E | ✅ |
| RF-SOC-04 | O leitor deve poder definir seu perfil como **público ou privado**. | E | ✅ |
| RF-SOC-05 | O leitor deve poder **seguir** um leitor de perfil público, com efeito imediato. | E | ✅ |
| RF-SOC-06 | O leitor deve poder **solicitar para seguir** um leitor de perfil privado; o destinatário aceita ou recusa. | E | ✅ |
| RF-SOC-07 | O leitor deve poder deixar de seguir e remover um seguidor. | E | ✅ |
| RF-SOC-08 | O leitor deve poder visualizar suas listas de seguidores e seguidos. | E | ✅ |
| RF-SOC-09 | O leitor deve poder visualizar um **feed cronológico** com as atividades dos leitores que segue. | E | ✅ |
| RF-SOC-10 | O sistema deve publicar como atividade: **início de leitura, retomada de leitura, conclusão de leitura, abandono de leitura e publicação de resenha**. | E | — |
| RF-SOC-11 | O leitor deve poder **curtir** atividades do feed. | E | ✅ |
| RF-SOC-12 | O leitor deve poder **comentar** atividades do feed e **responder** a comentários, conforme RN-10. | E | ✅ |
| RF-SOC-13 | O leitor deve poder editar e excluir seus comentários. | D | ✅ |
| RF-SOC-14 | Ao responder a uma resposta, o cliente deve pré-preencher a **menção `@username`** ao autor respondido, mantendo o comentário no mesmo nível de aninhamento. | E | ✅ |
| RF-SOC-15 | Menções `@username` devem ser resolvidas para o perfil correspondente e exibidas como link, quando o username existir. | D | ✅ |

Não há busca exploratória de pessoas, sugestão de perfis ou diretório de usuários — a descoberta é deliberada, por username exato. Esta é uma decisão de produto voltada à segurança do público adulto.

### 5.10 Notificações (NOT)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-NOT-01 | O sistema deve gerar notificação **in-app** para os eventos das funcionalidades implementadas nesta versão: novo seguidor, solicitação de seguir, solicitação aceita, curtida em atividade, comentário em atividade, resposta a comentário, **menção em comentário**, **recomendação de livro recebida**, **lembrete de sequência diária**, curtida em resenha, alerta de leitura em risco e leitura abandonada automaticamente. | E | ❌ |
| RF-NOT-02 | O leitor deve poder visualizar suas notificações em lista paginada, com indicação de não lidas. | E | ❌ |
| RF-NOT-03 | O leitor deve poder marcar notificações como lidas, individualmente e em lote. | E | ❌ |
| RF-NOT-04 | A notificação de **leitura em risco** deve conter ação direta de **abandonar a leitura**. | E | ❌ |
| RF-NOT-05 | O leitor deve poder habilitar ou desabilitar **individualmente cada tipo de notificação** de RF-NOT-01, sem agrupamento obrigatório em categorias. | O | ❌ |
| RF-NOT-06 | O sistema deve entregar notificações ao cliente em tempo real, sem necessidade de recarga manual. | D | ❌ |
| RF-NOT-07 | O sistema deve entregar notificações por **push** em dispositivo móvel. | O | — |

> ℹ️ **P-04 decidida: FCM em Android, in-app no iOS.** O sistema base é in-app; push é extensão do mesmo fluxo assíncrono e não exige remodelagem. Justificativa no Documento de Arquitetura §2.7.

**Preferências e repetição:** todos os tipos começam habilitados. Desabilitar um tipo impede novas notificações in-app e push daquele tipo, sem apagar as existentes; reabilitar não recupera as suprimidas. Retirar uma curtida de resenha e curtir novamente **não gera nova notificação** para o mesmo par resenha/reator. A deduplicação semântica independe de um novo `eventId`.

### 5.11 Moderação (MOD)

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-MOD-01 | O leitor deve poder **denunciar resenhas e comentários**, informando o motivo em **um único campo de texto livre**, sem enum de motivos nem descrição separada. Resenhas de livros pessoais são denunciáveis nas mesmas condições. | D | ✅ |
| RF-MOD-02 | O administrador deve poder visualizar um painel com as denúncias pendentes, ordenadas por data. | D | ✅ |
| RF-MOD-03 | O administrador deve poder **remover** o conteúdo denunciado ou **arquivar** a denúncia como improcedente. | D | ✅ |
| RF-MOD-04 | O administrador deve poder **suspender e reativar** a conta de um leitor. A suspensão bloqueia o acesso e oculta o perfil e seu conteúdo para os demais leitores, preservando os dados; a reativação restaura acesso e visibilidade sob RN-08. | O | ✅ |
| RF-MOD-05 | O sistema deve registrar em log de auditoria toda ação de moderação, com autor, alvo, ação e timestamp. | D | — |

Apenas resenhas e comentários são denunciáveis. Listas, frases, perfis e livros não possuem fluxo de denúncia; a possibilidade de remoção direta de trechos pela moderação permanece definida em RN-11.

### 5.12 Gamificação (GAM)

O escopo de gamificação é **sequência diária de leitura (*streak*)**, somada aos desafios e metas pessoais de §5.7. **Medalhas/conquistas e ranking de leitores não fazem parte do escopo** (ver §11).

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-GAM-01 | O sistema deve manter a **sequência diária** de leitura do leitor, incrementada em cada dia com registro de progresso, conforme RN-18. | D | ❌ |
| RF-GAM-02 | O leitor deve poder visualizar sua sequência atual e sua **maior sequência já alcançada**. | D | ❌ |
| RF-GAM-03 | O sistema deve zerar a sequência quando um dia se encerrar sem registro de progresso. | D | ❌ |
| RF-GAM-04 | O leitor deve poder visualizar quais dias recentes tiveram registro de progresso, em formato de calendário. | O | ❌ |
| RF-GAM-05 | O sistema deve notificar o leitor com sequência ativa que ainda não registrou progresso no dia corrente. | O | ❌ |

RF-GAM-05 depende de push para ser efetivo (P-04): notificação in-app só é vista por quem já abriu o aplicativo, e nesse caso o lembrete perde a função.

### 5.13 Recomendações (REC)

Duas fontes distintas de recomendação, apresentadas ao usuário em **uma única aba**.

#### Recomendação P2P — entre usuários

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-REC-01 | O leitor deve poder **recomendar um livro a um ou mais leitores** de uma só vez, somente entre perfis com **seguimento mútuo**. | D | ✅ |
| RF-REC-02 | O destinatário deve receber notificação da recomendação recebida (RF-NOT-01). | D | ❌ |
| RF-REC-03 | O leitor deve poder acompanhar uma **mensagem opcional** ao recomendar. | D | ✅ |
| RF-REC-04 | O leitor deve poder visualizar as recomendações que recebeu, com o livro, quem recomendou e a mensagem, quando houver. | D | ✅ |
| RF-REC-05 | Ao acionar uma recomendação recebida, o leitor deve ser levado à **página do livro**. | D | ✅ |
| RF-REC-06 | O sistema deve impedir recomendação de **livro pessoal**, por ser inacionável pelo destinatário (RN-15). | D | — |
| RF-REC-07 | O sistema deve impedir o envio quando o seguimento mútuo não existir, quando o destinatário já tiver o livro na estante ou quando o limite de RN-22 for atingido. | D | — |
| RF-REC-15 | O leitor deve poder **descartar** uma recomendação recebida, sem informar motivo e sem que o remetente seja notificado. | D | ✅ |
| RF-REC-16 | O sistema deve remover automaticamente as recomendações de um livro quando o destinatário o adicionar à estante. | D | — |
| RF-REC-17 | O sistema deve oferecer o **descarte em lote** das demais recomendações de um livro, conforme RN-22. | O | ✅ |

#### Recomendação algorítmica

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-REC-08 | O sistema deve sugerir livros **semelhantes aos que o leitor está lendo**, com base em atributos do acervo. | O | ✅ |
| RF-REC-09 | O sistema deve sugerir livros **a partir das leituras dos leitores que o usuário segue**, respeitando RN-08. | O | ✅ |
| RF-REC-10 | As sugestões devem excluir livros já presentes na estante do leitor e livros pessoais de terceiros. | O | — |
| RF-REC-11 | Cada sugestão deve exibir **o motivo** pelo qual foi sugerida. | O | ✅ |
| RF-REC-12 | O leitor deve poder **descartar** uma sugestão, que não deve reaparecer. | O | ✅ |

#### Aba unificada

| ID | Requisito | Pri | Web |
|---|---|---|---|
| RF-REC-13 | O aplicativo deve apresentar uma **aba Recomendações** reunindo as duas fontes em seções distintas e rotuladas. | D | ✅ |
| RF-REC-14 | A aba deve funcionar apresentando apenas as recomendações P2P quando a recomendação algorítmica não estiver disponível. | D | ✅ |

RF-REC-14 é o que garante que a aba não dependa da funcionalidade Opcional para existir.

As sugestões são calculadas em tempo de consulta sobre os dados existentes, sem estrutura derivada. Detalhamento em §10.7.

O fluxo completo da recomendação P2P está em RN-22; o resumo das decisões, em §10.8.

---

## 6. Regras de negócio

### RN-01 — Livro é edição

Cada registro `Livro` representa uma edição específica. Duas edições da mesma obra são registros independentes, com resenhas, notas e média próprias. Não existe entidade de obra, e a unificação de edições está fora de escopo.

*Consequência aceita:* a busca por um título popular retorna múltiplos resultados e as avaliações ficam distribuídas entre as edições. Mitigação de interface: agrupar visualmente resultados por título+autor na listagem de busca, sem alterar o modelo.

### RN-02 — Unicidade e identidade do livro

- **ISBN-13 é chave natural única** da base oficial. Não podem existir dois livros oficiais com o mesmo ISBN-13.
- Livro oficial armazena também o identificador da edição na fonte externa (`ol_edition_key` ou equivalente) como identificador secundário, para deduplicação na ingestão.
- **Livro pessoal não possui ISBN.** O campo é ausente, não vazio, e não participa de qualquer restrição de unicidade.

### RN-03 — Livro pessoal

| Aspecto | Comportamento |
|---|---|
| Edição e exclusão dos dados | Exclusivas do dono |
| Visualização da página do livro | Restrita ao dono; terceiros acessam **exatamente por duas vias**, feed e lista do dono (RN-15), sempre com privacidade e autorização revalidadas na página; conhecer o ID não concede acesso |
| Adicionar à estante e iniciar leitura | Exclusivos do dono, em **qualquer** status, inclusive Quero ler |
| Atividades no feed | Publicadas normalmente para os seguidores do dono |
| Nota do dono | Visível a terceiros, **sem média e sem contagem de avaliações** |
| Nota geral e nota dos leitores | Não se aplicam |
| Resenha do dono | Visível a terceiros; escrita exclusiva do dono |
| Curtir/descurtir e denunciar a resenha | Permitidos a terceiros, nas mesmas regras de um livro oficial |
| Estatísticas do dono | **Contam** normalmente |
| Páginas de autor, editora e série | **Não afetam** contadores nem listagens |
| Listas | Podem ser adicionados **apenas às listas do próprio dono** (RN-15) |
| Capa | Upload do próprio usuário |

### RN-04 — Máquina de estados da leitura

**Cadastro de ISBN, resumido:**
`ISBN informado` → existe na base oficial? → **bloqueia**, redireciona ao livro · encontrado em fonte externa? → **cria livro oficial** · não encontrado? → **erro + oferta de cadastro pessoal**

**Estados e transições da leitura:**

| De | Evento | Para | Efeitos |
|---|---|---|---|
| — | Adicionar à estante sem iniciar leitura | **Quero ler** | Cria o vínculo de estante sem criar leitura |
| Quero ler | Remover da estante | — | Remove o vínculo enquanto não houver histórico de leitura |
| Quero ler | Iniciar leitura | **Lendo** | Cria leitura com data de início |
| — | Iniciar leitura (livro nunca concluído) | **Lendo** | Cria leitura com data de início |
| — | Iniciar releitura (livro já concluído) | **Relendo** | Cria leitura marcada como releitura |
| Lendo / Relendo | Registrar progresso | mesmo estado | Atualiza página atual e zera o contador de inatividade |
| Lendo | Finalizar | **Lido** | Grava data de fim; incrementa nº de vezes lido |
| Relendo | Finalizar | **Lido** | Grava data de fim; incrementa nº de vezes lido |
| Lendo | Abandono (manual ou automático) | **Abandonado** | Grava página de parada; leitura fica retomável |
| Relendo | Abandono (manual ou automático) | **Lido** | Releitura salva como **incompleta**; **não** incrementa nº de vezes lido; **não** é retomável |
| Abandonado | Retomar | **Lendo** | Continua da página registrada; publica atividade "Voltou a ler" |

**Regras invariantes:**

1. Não pode haver mais de uma leitura em andamento por usuário e livro.
2. Páginas lidas em leituras abandonadas — primeira leitura ou releitura — **contam** nas estatísticas do usuário.
3. Releitura incompleta é preservada como histórico, mas não é retomável: para reler novamente, inicia-se uma nova releitura.
4. `nº de vezes lido` conta apenas leituras finalizadas.
5. Nota e resenha pertencem ao livro, não à leitura: sobrevivem a abandono e não são duplicadas por releitura.

### RN-05 — Inatividade e abandono automático

- **Atividade** de uma leitura é qualquer registro de progresso ou edição da leitura. Inatividade é contada em dias desde a última atividade — ou desde a data de início, se não houver nenhuma.
- **Dia 20:** notificação de leitura em risco, com ação direta de abandonar.
- **Dia 30:** segunda notificação de leitura em risco, com a mesma ação.
- **Dia 40:** abandono automático, conforme RN-04, com notificação ao leitor.
- A verificação roda em job diário agendado.

### RN-06 — Nota

Valores permitidos: 0; 0,5; 1; 1,5; 2; 2,5; 3; 3,5; 4; 4,5; 5. Uma nota por usuário por livro, editável e removível.

O livro exibe **dois indicadores distintos**, nunca combinados em um número único:

| Indicador | Origem | Disponibilidade |
|---|---|---|
| **Nota geral** | Importada da fonte externa na ingestão, junto com a quantidade de avaliações que a originou | Somente livros oficiais, e somente quando a fonte externa a fornece |
| **Nota dos leitores** | Média das notas atribuídas por usuários do aplicativo | Somente livros oficiais, e somente quando há ao menos uma avaliação |

Regras de exibição:

1. Um livro pode ter nota geral sem ter nota dos leitores — este é justamente o caso que motiva o indicador, evitando livro sem nenhuma referência de qualidade.
2. Um livro pode ter nota dos leitores sem ter nota geral, quando a fonte externa não fornece avaliação.
3. Indicador ausente é exibido como ausente, jamais como zero.
4. A nota geral é **somente leitura**: não é recalculada pelo aplicativo e não é afetada pelas avaliações dos usuários.
5. **Livro pessoal não possui nenhum dos dois indicadores.** Exibe apenas a nota individual do dono, sem média e sem contagem (RN-03).
6. A nota geral é atualizada apenas em recarga do data dump ou reimportação do livro.

### RN-07 — Resenha

No máximo uma resenha por usuário por livro, editável. Não depende de leitura concluída. Em livro pessoal, apenas o dono pode escrever resenha, mas ela recebe reações e denúncias como qualquer outra. Marcação de spoiler é opcional e reversível. Limite de 5.000 caracteres, contados sobre o texto cru, incluindo a marcação.

### RN-13 — Markdown em resenhas

A resenha é armazenada como **texto cru** e renderizada no cliente. Nenhum HTML é gerado ou persistido no servidor.

**Subconjunto permitido:** negrito, itálico, tachado, lista ordenada, lista não ordenada e citação em bloco.

**Explicitamente proibidos:** HTML embutido, links, imagens, blocos de código e tabelas. Link e imagem ficam de fora por serem vetores de spam e de hotlink de conteúdo arbitrário, sem valor para uma resenha de livro.

**Requisitos de renderização:**

1. O parser deve ser configurado com HTML embutido **desabilitado**.
2. A saída renderizada deve passar por sanitização antes de ser inserida no DOM, na aplicação web.
3. Marcação não suportada deve ser exibida como texto literal, jamais interpretada.
4. A mesma configuração de subconjunto deve valer nos dois clientes, para que a resenha renderize igual em web e mobile.

### RN-08 — Privacidade de perfil

| Recurso | Perfil público | Perfil privado |
|---|---|---|
| Encontrado por username exato | Sim | Sim |
| Nome, avatar, biografia | Visível a todos | Visível a todos |
| Estante, leituras, listas, estatísticas | Visível a todos | Somente seguidores aceitos |
| Resenhas e notas | Visível a todos | Somente seguidores aceitos |
| Seguir | Imediato | Requer solicitação aceita |

Alterar o perfil de público para privado **não remove** seguidores existentes.

**Suspensão (RF-MOD-04):** perfil e conteúdo de conta suspensa não são visíveis aos demais leitores, mesmo com seguimento aceito. Reativar não recria conteúdos nem desfaz o grafo social: restaura a visibilidade conforme a privacidade vigente. Consultas administrativas autorizadas continuam permitindo moderação e reativação.

### RN-09 — Feed

- O feed de um leitor contém atividades dos leitores que ele segue, em ordem cronológica decrescente.
- Atividades são geradas por: início de leitura, retomada, conclusão, abandono e publicação de resenha.
- Ao deixar de seguir alguém, as atividades daquele leitor deixam de aparecer no feed.
- Atividade cujo livro-alvo foi excluído deixa de ser exibida.

### RN-10 — Comentários e menções

Comentários existem apenas em atividades do feed, com aninhamento limitado a **um nível de resposta** (comentário → resposta). A decisão evita árvores profundas, ilegíveis em tela móvel, e dispensa consulta recursiva.

**Resposta a uma resposta** é permitida e é armazenada como **irmã**, sob o mesmo comentário-raiz, sem criar terceiro nível. O contexto de a quem se responde é preservado pela menção `@username` no início do texto, no modelo adotado por Instagram e YouTube.

Regras da menção:

1. A menção só é resolvida se o username existir; caso contrário permanece como texto comum.
2. Menção gera notificação ao usuário mencionado (RF-NOT-01).
3. Menção está sujeita a rate limiting (RNF-SEC-18), impedindo que se use o recurso para notificar em massa quem não segue o autor.
4. Menção a usuário de perfil privado gera notificação normalmente, mas o link só é navegável conforme RN-08.
5. Excluir um comentário-raiz remove suas respostas.

### RN-11 — Frases e trechos

Para respeitar limites de citação de obra protegida por direito autoral:

- Limite de **500 caracteres** por trecho.
- **Página de referência obrigatória.**
- Máximo de 10 trechos por usuário por livro.
- Trechos são passíveis de remoção direta pela moderação, embora não possuam fluxo de denúncia.

### RN-12 — Normalização de dados na ingestão

- **Autor:** deduplicado pelo identificador da fonte externa quando disponível; na ausência, por nome normalizado.
- **Editora:** a fonte externa fornece editora como **texto livre**, não como entidade. A ingestão normaliza (minúsculas, remoção de pontuação e de sufixos societários) e aplica tabela de sinônimos mantida pelo grupo para as principais editoras brasileiras. A entidade `Editora` é criada a partir da forma normalizada.
- **Série:** também texto livre na origem. Normalizada da mesma forma, com número de ordem opcional por livro.
- **Capa:** a URL da fonte externa é sempre persistida e **nunca descartada**. A cópia em armazenamento próprio é criada por cache sob demanda, conforme RN-14.
- **Assuntos:** persistidos na carga inicial, **normalizados** conforme RN-21. As tags livres da origem não são armazenadas.
- **Sinopse:** **não** é persistida na carga inicial; obtida sob demanda conforme RN-19.
- **Nota geral:** importada quando a fonte externa a fornece, junto com a quantidade de avaliações de origem. Nota externa fora da escala 0–5 deve ser convertida na ingestão. Ausência da nota é registrada como ausente, nunca como zero.
- Livros sem ISBN-13, sem total de páginas ou sem capa são **descartados** na carga inicial: progresso por página exige total de páginas.

### RN-14 — Cache de capas de livros oficiais

A capa de um livro oficial é **cacheada sob demanda**, não na ingestão.

1. O livro persiste **duas URLs de capa**: a da **fonte externa**, sempre preenchida na ingestão e nunca descartada, e a da **cópia própria**, inicialmente ausente.
2. Na primeira vez que um livro oficial entra na estante de qualquer usuário, é publicado evento assíncrono que baixa a capa para o serviço de armazenamento de imagens e grava a URL da cópia própria.
3. O download é executado no máximo uma vez por livro: eventos subsequentes para um livro que já possui cópia própria são descartados pelo consumidor (idempotência, RNF-ERR-06).
4. **Ordem de resolução na exibição:** cópia própria, se existir → URL externa → imagem de *placeholder*.
5. Falha no download não é erro de usuário: o livro segue sendo exibido pela URL externa e o evento é reprocessado conforme a política de retentativa.
6. **Não há expiração por tempo.** A cópia própria é permanente. Descartá-la por inatividade removeria proteção justamente das capas menos acessadas, que são as mais expostas a indisponibilidade da origem, sem economia relevante de armazenamento.
7. Capas de livros pessoais não passam por este fluxo: são enviadas diretamente pelo dono.

**Contingência documentada, não implementada:** caso o armazenamento se aproxime do limite do plano gratuito, a evicção deve ocorrer por sinal de domínio — remover a cópia própria quando o livro deixar de constar em qualquer estante — e não por tempo desde o último acesso, métrica que o backend não observa por serem as imagens servidas diretamente pelo CDN.

### RN-22 — Recomendação P2P

**Envio**

1. Uma recomendação só pode ser enviada entre perfis com **seguimento mútuo**. O leitor pode selecionar **vários destinatários** de uma vez; o sistema gera uma recomendação independente por destinatário.
2. O envio admite **mensagem opcional**. Sem mensagem, a recomendação é apresentada apenas como "Fulano te recomendou *X*".
3. O envio é **bloqueado** quando o destinatário já possui o livro na estante, em qualquer status. A interface informa "Fulano já tem esse livro em sua estante" e não permite prosseguir.
4. **Limite de 50 recomendações ativas** de um remetente para um mesmo destinatário. Atingido o limite, novos envios para aquele destinatário são recusados até que recomendações existentes expirem, sejam descartadas ou removidas.
5. Livro pessoal não pode ser recomendado (RF-REC-06).

**Recebimento**

6. A recomendação **não possui aceitação nem recusa**. Ela permanece na lista de recomendações recebidas e, ao ser acionada, leva à página do livro.
7. Um mesmo livro pode ser recomendado por **vários remetentes**, gerando recomendações distintas que coexistem.
8. O recebimento gera notificação (RF-NOT-01).

**Remoção**

9. **Expiração:** toda recomendação tem prazo de **90 dias** a partir do envio, após o qual deixa de ser exibida.
10. **Adição à estante:** ao adicionar o livro à estante, em qualquer status, **todas** as recomendações daquele livro recebidas pelo leitor são removidas — a recomendação perdeu a finalidade.
11. **Descarte individual:** o leitor pode descartar qualquer recomendação recebida. O descarte não exige motivo e **não é comunicado ao remetente**.
12. **Descarte em lote:** ao descartar a **terceira** recomendação de um mesmo livro **na sessão corrente do cliente**, havendo outras pendentes daquele livro, o sistema pergunta "Deseja remover todas as recomendações atuais do livro *X*?". Em caso afirmativo, todas as demais daquele livro são descartadas.
13. Recusada a pergunta de RN-22.12, ela **não volta a ser exibida para aquele livro durante a sessão corrente do aplicativo**. Tanto a contagem de descartes quanto a supressão são estado local temporário: ao fechar e reabrir, a contagem volta a zero e a pergunta só volta a ser elegível após três novos descartes daquele livro.
14. Recomendação removida por qualquer via não é restaurável.
15. **Recomendações já enviadas permanecem** ainda que o seguimento mútuo se desfaça depois do envio. O seguimento mútuo é condição de envio (RN-22.1), não de permanência.

### RN-23 — Exclusão e recuperação de conta

1. Solicitar exclusão exige autenticação, reautenticação por senha, confirmação explícita e chave de idempotência.
2. A solicitação inicia uma janela de recuperação de **30 dias**. Durante esse prazo, os dados permanecem armazenados, mas conta, perfil e conteúdo ficam ocultos para os demais leitores.
3. Todos os tokens de renovação são revogados na solicitação. Um novo login válido em conta com exclusão pendente emite acesso restrito exclusivamente ao cancelamento da exclusão; nenhuma outra área do produto fica disponível.
4. Cancelar dentro do prazo restaura a conta e sua visibilidade sem recriar dados nem publicar evento de restauração.
5. Vencido o prazo, um job diário remove definitivamente identidade, dados e conteúdo nos quatro schemas. A remoção nos demais serviços é disparada por `conta.excluida`.
6. Username e e-mail permanecem reservados durante a janela de recuperação. Depois da exclusão definitiva, deixam de identificar uma conta existente.
7. A exclusão definitiva remove também projeções, importações solicitadas, tentativas de login, respostas idempotentes e assets associados. **Registros técnicos e de auditoria permanecem por prazo indeterminado, sem dados que identifiquem o leitor.** Referências pessoais, payloads, hashes correlacionáveis e texto livre identificável são removidos ou anonimizados; UUID opaco, sozinho, não é anonimização. Isso não autoriza reter o conteúdo da conta nem prolonga os 30 dias de recuperação. Validade de tokens e prazo de replay de idempotência continuam operacionais, distintos da retenção do registro anonimizado.

### RN-21 — Assuntos

Assunto é o gênero literário do livro, usado como **filtro de busca** (RF-ACV-02) e como principal insumo da recomendação algorítmica (§10.7).

1. O conjunto de assuntos é **curado e fechado**, com aproximadamente 30 gêneros definidos pelo grupo. Não é criado por usuários nem estendido automaticamente pela ingestão.
2. Um livro pode ter **mais de um assunto**, sem limite rígido; recomenda-se no máximo cinco por livro para preservar a utilidade do filtro.
3. A fonte externa fornece assuntos como **tags livres e não normalizadas**, frequentemente dezenas por obra, misturando gênero, tema, público e rótulos comerciais. A ingestão aplica uma **tabela de mapeamento** mantida pelo grupo, traduzindo tag externa para um assunto do conjunto curado e **descartando o que não mapeia**.
4. Tag externa sem correspondência **não cria** assunto novo. Livro sem nenhum assunto reconhecido fica sem assunto, estado válido.
5. Em **livro pessoal**, os assuntos são escolhidos pelo dono a partir do mesmo conjunto curado, e não afetam contadores de catálogo, coerentemente com RN-03.
6. Assunto integra o índice de busca por ser conjunto pequeno e de cardinalidade baixa, ao contrário da sinopse (RN-19.7).

### RN-20 — Desafios

**Unidades e janelas.** Qualquer unidade combina com qualquer janela, e o leitor pode manter vários desafios ativos ao mesmo tempo.

| Unidade | Origem do progresso | Evento |
|---|---|---|
| **Páginas** | Páginas lidas derivadas da atualização de progresso (RN-17.1) | `progresso.registrado` |
| **Minutos** | Tempo informado ou medido na atualização de progresso | `progresso.registrado` |
| **Livros** | Leituras finalizadas | `leitura.finalizada` |

| Janela | Delimitação |
|---|---|
| **Diária** | Dia de calendário |
| **Semanal** | Semana de calendário |
| **Mensal** | Mês de calendário |
| **Anual** | Ano de calendário |

**Regras:**

1. Janelas são de **calendário**, não períodos móveis contados a partir da criação do desafio, e seguem o fuso horário do dispositivo, como em RN-18.2.
2. Desafio criado no meio de uma janela **considera o que já foi registrado nela**. Um desafio anual criado em agosto conta as leituras do ano corrente desde janeiro. Sem isso, desafios de janela longa só fariam sentido se criados no primeiro dia do período.
3. **Livros** contam ao serem **finalizados**, não ao serem iniciados, e apenas leituras finalizadas — releitura finalizada conta; releitura incompleta ou leitura abandonada não contam (RN-04). O desafio usa o **dia local da ação de finalizar**, persistido com instante e fuso, nunca a data de fim editável informada pelo leitor.
4. Livros pessoais contam nos desafios, coerentemente com sua contagem nas estatísticas (RN-03).
5. Uma mesma atualização de progresso alimenta **todos** os desafios ativos compatíveis com sua unidade, simultaneamente.
6. Desafio pausado não acumula progresso e sua janela corrente não é avaliada enquanto estiver pausado. Registros feitos durante a pausa **não contam para aquele desafio**, mesmo se sincronizados ou recalculados depois; retomar só permite contar os registros a partir da retomada. Os intervalos de pausa são preservados para essa verificação, inclusive quando atravessam janelas.
7. Alterar unidade, janela ou valor-alvo de um desafio recalcula somente a janela corrente. Cada janela preserva **unidade, periodicidade, valor-alvo e fuso** vigentes: editar o desafio não modifica a configuração de períodos encerrados (RF-DSF-05). A correção por sincronização offline de RN-20.10 pode atualizar o resultado de um período encerrado, mas usa sua configuração histórica.
8. A janela é considerada cumprida quando o acumulado atinge o valor-alvo, ainda que o registro que a completou pertença a uma leitura iniciada em janela anterior.
9. O histórico inclui os períodos decorridos desde a janela de criação do desafio, **inclusive sem progresso**, com acumulado zero e resultado não cumprido. Não são criados períodos anteriores à janela de criação; o backfill da primeira janela continua obedecendo RN-20.2. A materialização pode ocorrer na consulta, no consumo ou antes de editar o desafio, sem exigir job adicional. A exposição do histórico é P3; os dados necessários ao recálculo offline são preservados desde P2.
10. Registros feitos offline são contabilizados nas **datas locais em que foram registrados**, ainda que a sincronização aconteça após o encerramento do período. O resultado e o cumprimento são recalculados idempotentemente com a configuração e as pausas daquele período. Edição/exclusão permitidas por RN-17 também corrigem os efeitos do fato sem mudar a configuração histórica.

### RN-19 — Sinopse

A sinopse é conteúdo essencial da página do livro: sustenta a decisão de "quero ler". Sua obtenção segue o mesmo padrão de cache sob demanda das capas (RN-14), e **não** é carregada em massa na ingestão.

1. A sinopse **não é persistida na carga inicial do data dump**. Persistir sinopse para todo o acervo custaria entre 500 e 1.500 bytes por livro, estourando o teto de armazenamento de RNF-DES-04 e ocupando espaço com livros que nunca serão abertos.
2. Na primeira vez que a página de um livro oficial é aberta, o sistema busca a sinopse na fonte externa e a **persiste**. Aberturas subsequentes usam o valor persistido.
3. **Ordem das fontes:** OpenLibrary (campo de descrição da obra ou da edição) → Google Books (`description`) → ausente.
4. Ausência de sinopse é estado válido e comum: a página do livro deve funcionar sem ela (RF-ACV-19). A cobertura nas fontes externas é irregular, especialmente em português.
5. A busca externa é assíncrona e não bloqueia a renderização da página: a sinopse aparece quando disponível.
6. A sinopse é armazenada como **texto puro**, com limite de 4.000 caracteres. Marcação recebida da fonte externa é removida na ingestão. A sinopse **não** aceita Markdown, ao contrário das resenhas.
7. A sinopse **não integra o índice de busca** (RF-ACV-01, RNF-DES-03). Indexar texto longo de todo o acervo multiplicaria o custo do índice, que já é o item dominante do dimensionamento (RNF-DES-05).
8. Em **livro pessoal**, a sinopse é digitada pelo dono, é opcional e não passa por busca externa.
9. Sinopse de livro oficial é dado do catálogo e **não é editável** por usuários.

### RN-18 — Sequência diária de leitura

1. Um dia **conta para a sequência** quando houver ao menos uma atualização de progresso registrada nele, com pelo menos uma página lida. Concluir, iniciar ou abandonar leitura não conta por si só — a sequência mede leitura efetiva, não interação com o aplicativo.
2. A sequência é **contada em dias de calendário no fuso horário do dispositivo** no momento do registro. A data local é derivada e persistida junto à atualização de progresso, para que a apuração não dependa do fuso de quem consulta.
3. A sequência **incrementa no máximo uma vez por dia**, independentemente de quantas atualizações sejam registradas.
4. A sequência **é zerada** quando um dia de calendário se encerra sem registro. Não há congelamento nem compensação por dias em que não houve leitura.
5. A sincronização de progresso realmente registrado offline **recompõe os dias e recalcula a sequência atual e a maior sequência**, mesmo após zeramento por falta de sincronização. Isso não permite criar registro manual retroativo nem alterar a data de captura de um progresso (RN-17).
6. A **maior sequência já alcançada** é preservada, ainda que a sequência atual seja zerada.
7. A sequência é medida em **dias com leitura**, nunca em tempo lido, justamente porque o tempo de sessão não é verificável pelo servidor (RN-16.7) e seria trivialmente manipulável.

### RN-17 — Registro de progresso

O leitor informa sempre **a página em que parou**, nunca quantas páginas leu. A entrada é absoluta nas duas formas de registro, o que elimina divergência entre elas e dispensa o leitor de fazer subtração.

1. **Páginas lidas em uma atualização** são derivadas: `página informada − página atual antes da atualização`. É esse valor derivado que alimenta desafios e estatísticas.
2. A página informada deve ser **maior que a página atual** e **não superior ao total do livro** (RF-PRG-04). Progresso não retrocede.
3. A **página atual** da leitura é a maior página informada até o momento.
4. Atualizações de progresso **não podem ser editadas**. Para corrigir um valor, o leitor exclui o registro (junto dos posteriores, conforme o item 6) e registra de novo.
5. O **percentual concluído** é derivado da página atual sobre o total do livro.
6. A exclusão da última atualização recalcula a página atual a partir das restantes, ou zero se nenhuma restar. Um registro intermediário só pode ser excluído **se todos os registros posteriores também forem excluídos**: remover do mais recente para trás ou confirmar a exclusão conjunta do trecho final, de forma atômica. Nunca se deixa um registro posterior apoiado numa base excluída. A confirmação informa quais registros serão removidos; cada efeito em desafios, estatísticas e sequência é recalculado.
7. A exclusão valida a ordem dentro da mesma transação/lock da leitura; a ordem é a de inserção dos progressos. Leituras finalizadas continuam com progresso somente para consulta. A fila offline preserva a ordem por leitura, a chave de idempotência e os metadados automáticos de captura; sincronizar depois não muda o dia em que a leitura ocorreu.

### RN-16 — Sessão de leitura cronometrada

1. A sessão é iniciada a partir de uma leitura com status **Lendo** ou **Relendo**. Não é possível iniciar sessão sem leitura em andamento.
2. **Uma sessão ativa por dispositivo**, no máximo. Iniciar nova sessão exige encerrar ou cancelar a anterior. Como o estado é local (RN-16.7), o escopo é o dispositivo e não a conta.
3. **Modo de foco:** enquanto a sessão está ativa, a navegação fica restrita à tela da sessão. Nenhuma outra área do aplicativo é acessível — estante, busca, feed, perfil, notificações e recomendações ficam indisponíveis. O objetivo é sustentar o hábito de leitura contínua, alinhado ao propósito do produto.
4. O modo de foco **não é opcional e não possui ajuste de preferência**. As únicas saídas são encerrar a sessão informando a página (RF-PRG-07) ou cancelá-la (RF-PRG-08).
5. Sair do aplicativo **não encerra a sessão**. Ao ser reaberto com sessão ativa, o aplicativo retorna diretamente à tela da sessão, em modo de foco, sem passar pela navegação normal (RF-PRG-09).
6. Ao encerrar, o leitor informa a **página em que parou** e o sistema registra uma atualização de progresso com essa página e o tempo medido, conforme RN-17.
7. A página informada segue as regras de RN-17. Página igual à página atual encerra a sessão **sem** registro de progresso, descartando o tempo medido.
8. Cancelar a sessão descarta o tempo medido e não gera atualização de progresso.
9. **Cronômetro e recuperação:** o estado da sessão é persistido **localmente no dispositivo**, não no servidor, como o par `tempo acumulado` + `instante de início do trecho corrente`. O cronômetro exibido é renderizado a partir desse par — `tempo acumulado + (instante atual − início do trecho)` —, e não por contador em memória. Assim o aplicativo restaura o estado correto ao ser reaberto, tenha sido fechado pelo leitor, encerrado pelo sistema operacional ou desligado junto com o dispositivo. O mesmo mecanismo vale para a pausa (RN-16.14).
10. Iniciar e cancelar sessão **não geram chamada ao servidor**. A única escrita remota do fluxo é a atualização de progresso resultante do encerramento. Sessão em andamento é, portanto, estado exclusivamente local: perde-se em reinstalação ou troca de aparelho, cenário aceito por indicar que a leitura foi interrompida há muito tempo.
11. **Duração máxima: 12 horas de tempo cronometrado**, desconsiderado o tempo em pausa. O limite é verificado pelo cliente na reabertura do aplicativo. Sessão que o exceda é apresentada como **expirada**, cabendo ao leitor informar a página ou descartá-la; o tempo registrado é limitado a 12 horas.
12. A sessão encerrada com registro conta como **atividade** da leitura, zerando o contador de inatividade (RN-05).
13. O tempo registrado por sessão cronometrada alimenta os desafios em minutos (RF-DSF-02) da mesma forma que o tempo informado manualmente.

**Pausa**

14. O leitor pode **pausar** a sessão, escolhendo a duração da pausa entre **5, 10 ou 15 minutos**. Ao pausar, o cronômetro da sessão **para** e um cronômetro de pausa é iniciado.
15. O tempo em pausa **não é contabilizado** como tempo de leitura: não entra na atualização de progresso nem nos desafios em minutos.
16. Retomar a sessão encerra a pausa e reinicia a contagem do tempo de leitura, acumulando com o tempo já medido.
17. **Não há limite de pausas** por sessão. A duração máxima de RN-16.11 continua sendo aferida sobre o tempo cronometrado, não sobre o tempo decorrido desde o início.
18. Esgotada a duração escolhida sem retomada, a sessão é **encerrada automaticamente**, preservando o tempo de leitura já medido. O tempo da pausa não é somado.
19. Sessão encerrada por pausa expirada fica **pendente de confirmação**: como não houve informe de página, o aplicativo a apresenta na reabertura para que o leitor informe a página em que parou ou descarte o registro, no mesmo fluxo da sessão expirada por duração máxima (RN-16.11).
20. O **modo de foco permanece ativo durante a pausa**. A pausa interrompe a contagem do tempo, não a restrição de navegação — do contrário seria um caminho para contornar RF-PRG-06.

### RN-15 — Livro pessoal em listas

O dono de um livro pessoal pode incluí-lo em suas próprias listas.

**Vias de acesso de terceiros à página de um livro pessoal.** São duas, e ambas exigem a mesma verificação de autorização no servidor:

| Via | Origem | Frequência esperada |
|---|---|---|
| **Feed de atividades** | Atividade do dono referenciando o livro (RF-SOC-10) | Principal |
| **Lista do dono** | Livro pessoal incluído em lista do próprio dono | Secundária |

Ambas estão sujeitas à privacidade do perfil do dono (RN-08). Não existe terceira via: conhecer ou informar diretamente o identificador não concede acesso, e busca, catálogo, filtros e páginas de autor, editora e série permanecem fechados a livros pessoais.

1. **Somente o dono** pode adicionar um livro pessoal a uma lista, e somente a listas de sua própria autoria. Nenhum leitor pode adicionar livro pessoal de outra pessoa a uma lista sua.
2. Para quem chega por qualquer das duas vias, a página do livro pessoal é acessível em **modo consulta**: metadados, capa, nota do dono e resenha do dono, conforme RN-03.
3. A página exibida a terceiros **não oferece** ação de adicionar à estante em qualquer status, marcar como favorito, iniciar leitura ou registrar progresso. A restrição é validada no servidor, não apenas ocultada na interface (RNF-SEC-02).
4. Terceiros com acesso **podem curtir, descurtir e denunciar** a resenha do dono, nas mesmas regras aplicadas a livros oficiais (RF-AVA-05, RF-AVA-08, RF-MOD-01). Conteúdo visível a terceiros não pode ficar fora do alcance da moderação.
5. A visibilidade **herda a privacidade do perfil do dono** (RN-08): se o perfil é privado, a atividade, a lista e, por consequência, a página do livro pessoal só são acessíveis a seguidores aceitos. A verificação deve ser refeita na página do livro, não apenas na via de origem.
6. Se o dono excluir o livro pessoal, ou remover as atividades e a inclusão em lista que o referenciam, o acesso de terceiros à página cessa imediatamente.
7. O livro pessoal continua **fora** da busca, das listagens de catálogo, dos filtros e das páginas de autor, editora e série (RNF-SEC-06). Feed e lista são vias de acesso, não de descoberta.

---

## 7. Requisitos não funcionais

### 7.1 Arquitetura e integração

| ID | Requisito |
|---|---|
| RNF-ARQ-01 | O backend deve ser implementado como **web services** independentes, consumidos por HTTP/JSON pelos clientes web e móvel. |
| RNF-ARQ-02 | O backend deve seguir arquitetura de **microsserviços**, com decomposição definida no Documento de Arquitetura. |
| RNF-ARQ-03 | Cada serviço deve publicar seu contrato em **OpenAPI**, versionado no repositório; a atualização do spec faz parte do Definition of Done da feature. |
| RNF-ARQ-04 | O sistema deve suportar **múltiplos clientes concorrentes** sobre o mesmo servidor, com serviços sem estado de sessão em memória. |
| RNF-ARQ-05 | Operações de escrita concorrentes sobre a mesma entidade devem ser resolvidas sem perda de dados, por controle de concorrência no banco. |
| RNF-ARQ-06 | O sistema deve utilizar **middleware de mensageria** para o processamento assíncrono definido em §7.2. |
| RNF-ARQ-07 | A persistência deve usar **PostgreSQL hospedado no Neon**, com estratégia de separação por serviço definida no Documento de Arquitetura. |
| RNF-ARQ-08 | Os serviços e o site estático devem ser hospedados no **Render**, em plano gratuito. |
| RNF-ARQ-09 | O sistema deve dispor de **agendador de tarefas** para os jobs diários, em serviço gratuito. |

### 7.2 Mensageria

Fluxos assíncronos definidos para esta versão:

| Fluxo | Evento(s) | Justificativa |
|---|---|---|
| **Notificações in-app** | `seguidor.novo`, `solicitacao.criada`, `solicitacao.aceita`, `atividade.curtida`, `atividade.comentada`, `comentario.respondido`, `usuario.mencionado`, `resenha.curtida`, `leitura.em_risco`, `leitura.expirada` | Fan-out para destinatários não pode bloquear a requisição de quem originou a ação |
| **Expiração de leituras** | `leitura.em_risco`, `leitura.expirada` | Processamento em lote diário, desacoplado do tráfego de usuário |
| **Ingestão de livros** | `livro.importacao_solicitada` | Depende de serviço de terceiro; exige retentativa com backoff |
| **Cache de capas** | `livro.adicionado_a_estante` | Download de imagem de terceiro não pode bloquear a adição à estante; exige retentativa (RN-14) |
| **Busca de sinopse** | `livro.pagina_aberta` | Consulta a terceiro não pode bloquear a renderização da página do livro (RN-19) |
| **Nota agregada** | `nota.alterada` | Atualização da projeção da nota dos leitores em `acervo` sem chamada síncrona a `leitura` |
| **Atividades do feed** | `leitura.iniciada`, `leitura.retomada`, `leitura.finalizada`, `leitura.abandonada`, `resenha.publicada`, `resenha.excluida` | `social` mantém a projeção do feed sem chamada síncrona a `leitura` |
| **Estatísticas, desafios e sequência** | `progresso.registrado`, `leitura.finalizada` | Recálculo assíncrono e efeitos idempotentes a partir dos fatos de leitura |
| **Exclusão definitiva de conta** | `conta.excluida` | Cada serviço remove os dados de seu próprio schema após o prazo de recuperação |
| **Recomendação P2P** | `recomendacao.recebida`, `livro.adicionado_a_estante` | Notifica o destinatário e remove recomendações quando o livro entra na estante |

**Não são assíncronos:** mudança de status na estante, registro de progresso, criação de nota e de resenha. Essas operações confirmam de forma síncrona ao autor; o evento é publicado **após** a escrita confirmada.

Fluxos candidatos a inclusão futura, cujo desenho já é compatível: lembrete de sequência diária e envio de e-mail transacional.

> ℹ️ **P-06 decidida: RabbitMQ (CloudAMQP).** Atende aos critérios de plano gratuito permanente, *dead-letter queue* nativa e cliente maduro nas duas linguagens. Justificativa e consequências no Documento de Arquitetura §2.3.

### 7.3 Tratamento de erros e resiliência

| ID | Requisito |
|---|---|
| RNF-ERR-01 | A API deve responder com códigos HTTP semanticamente corretos e corpo de erro padronizado, com código de erro interno, mensagem exibível e identificador de correlação. |
| RNF-ERR-02 | Os clientes devem tratar distintamente: erro de validação, erro de autenticação, erro de autorização, recurso inexistente, conflito, indisponibilidade e timeout. |
| RNF-ERR-03 | Os clientes devem aplicar **timeout** em toda requisição e **retentativa com backoff exponencial** para falhas transitórias, limitada a operações idempotentes. |
| RNF-ERR-04 | Operações de escrita devem aceitar **chave de idempotência**, garantindo que retentativa não produza registro duplicado. |
| RNF-ERR-05 | O aplicativo móvel deve detectar ausência de conectividade e **enfileirar localmente** registros de progresso, reenviando quando a conexão retornar. |
| RNF-ERR-06 | Consumidores de mensagem devem ser **idempotentes** e tolerar entrega duplicada. |
| RNF-ERR-07 | Mensagens que falharem após o número máximo de tentativas devem ser encaminhadas a **dead-letter queue**, sem bloquear a fila principal. |
| RNF-ERR-08 | Chamadas a APIs externas devem ter timeout, retentativa com backoff e **circuit breaker**, degradando para mensagem de erro clara ao usuário. |
| RNF-ERR-09 | Os clientes devem tratar a **hibernação do plano gratuito** do Render, exibindo estado de carregamento prolongado em vez de erro na primeira requisição. |
| RNF-ERR-10 | Falha em fluxo assíncrono não deve impedir a operação síncrona correspondente: produtor e evento devem ser gravados na mesma transação por **outbox transacional**, e a publicação deve ser reprocessada até confirmação do broker. |

RNF-ERR-05 e RNF-ERR-09 são as evidências principais para o requisito da disciplina sobre reenvio de mensagens e servidor indisponível.

### 7.4 Desempenho e capacidade

| ID | Requisito |
|---|---|
| RNF-DES-01 | Requisições de leitura devem responder em até 1 s no percentil 95, desconsiderando hibernação de plano gratuito. |
| RNF-DES-02 | Toda listagem deve ser paginada, com limite máximo de itens por página imposto pelo servidor. |
| RNF-DES-03 | A busca de livros deve usar índices adequados sobre título, autor e ISBN. |
| RNF-DES-04 | O volume da base oficial deve respeitar o limite de armazenamento do plano gratuito do Neon, dimensionando a carga inicial por filtragem do data dump e por seleção dos campos persistidos. O acervo não deve consumir mais de **20% do limite** do plano, preservando margem para os dados de usuário, leitura, progresso, resenha e feed, que são o propósito do sistema. |
| RNF-DES-05 | A ingestão deve persistir apenas os campos necessários aos requisitos, descartando o restante do registro de origem. O custo dominante do acervo é o **índice de busca** (RNF-DES-03), estimado em três a cinco vezes o tamanho dos dados, e deve entrar no dimensionamento. |

### 7.5 Usabilidade e acessibilidade

| ID | Requisito |
|---|---|
| RNF-USA-01 | A interface móvel e a web devem seguir o design system definido no **Documento de Design**, com componentes consistentes entre plataformas. |
| RNF-USA-02 | A interface web deve ser responsiva. |
| RNF-USA-03 | Contraste de texto deve atender WCAG AA, conforme paletas definidas no Documento de Design §3.1. |
| RNF-USA-04 | Toda ação destrutiva deve exigir confirmação explícita. |
| RNF-USA-05 | Mensagens de erro devem ser em pt-BR e acionáveis, sem expor detalhes técnicos. |
| RNF-USA-06 | Os *design tokens* — cores, tipografia, espaçamento, raios e elevação — devem ser especificados no **Documento de Design §3**, materializados uma única vez em `docs/design-system/tokens.json` e traduzidos para a configuração do Tailwind na web e para o tema do Flutter no mobile, evitando divergência visual entre as plataformas. |

> ℹ️ **Documento de Design.** Toda decisão de linguagem visual e de interação — paleta, tipografia, espaçamento, raios, elevação, motion, componentes (botões, inputs, cards de livro, status pill, feed, modo de foco) e prompts de protótipo — mora no Documento de Design, que deriva deste arquivo. `REQUISITOS.md` continua sendo a fonte de verdade; em caso de conflito, este documento vence e a divergência segue o controle de mudança do `docs/orquestador/plano-de-projeto.md` §3.

### 7.6 Observabilidade

| ID | Requisito |
|---|---|
| RNF-OBS-01 | Os serviços devem emitir log estruturado com identificador de correlação propagado entre serviços e mensagens. |
| RNF-OBS-02 | Cada serviço deve expor endpoint de *health check*. |
| RNF-OBS-03 | Erros não tratados devem ser registrados com contexto suficiente para diagnóstico, sem dados sensíveis. |

---

## 8. Segurança

Requisitos organizados pelo **OWASP Top 10 (2021)**. Todos são **Essenciais**.

### A01 — Broken Access Control

| ID | Requisito |
|---|---|
| RNF-SEC-01 | Toda requisição a recurso protegido deve validar autenticação no servidor; ocultar elementos na interface não constitui controle de acesso. |
| RNF-SEC-02 | Toda operação sobre recurso de usuário deve validar **propriedade** do recurso no servidor: leitura, progresso, resenha, nota, lista, comentário, livro pessoal. |
| RNF-SEC-03 | O acesso a conteúdo de perfil privado deve validar relação de seguidor aceita, em todos os endpoints, incluindo os de listagem e busca. |
| RNF-SEC-04 | O painel de moderação e suas operações devem ser restritos à conta de administrador, com verificação no servidor. |
| RNF-SEC-05 | Identificadores de recurso não devem permitir acesso a recurso alheio por substituição direta (proteção contra IDOR); recomenda-se identificador não sequencial em recursos expostos. |
| RNF-SEC-06 | Livro pessoal não deve ser recuperável por busca, listagem de catálogo, filtro ou página de autor/editora/série por qualquer usuário que não seja o dono. Terceiros acessam **exatamente por duas vias**, feed e lista do dono (RN-15), com privacidade e autorização revalidadas no recurso-alvo; conhecer ou informar diretamente o identificador não concede acesso. |
| RNF-SEC-07 | O servidor deve recusar toda tentativa de adicionar à estante em qualquer status, favoritar ou iniciar leitura de livro pessoal de outro usuário, ainda que o identificador do livro seja conhecido. |

### A02 — Cryptographic Failures

| ID | Requisito |
|---|---|
| RNF-SEC-08 | Todo tráfego deve usar HTTPS/TLS, sem endpoint em texto claro. |
| RNF-SEC-09 | Senhas devem ser armazenadas com função de derivação de chave com sal, resistente a hardware dedicado (bcrypt, scrypt ou Argon2). Hash simples é proibido. |
| RNF-SEC-10 | Tokens de recuperação de senha devem ser aleatórios criptograficamente, de uso único, com validade máxima de 1 hora, e armazenados como hash. |
| RNF-SEC-11 | Segredos — credenciais de banco, do broker, do administrador, chaves de serviços — devem vir de variáveis de ambiente. É proibido versioná-los no repositório. |

### A03 — Injection

| ID | Requisito |
|---|---|
| RNF-SEC-12 | Todo acesso a banco deve usar consultas parametrizadas ou ORM; concatenação de entrada do usuário em SQL é proibida. |
| RNF-SEC-13 | Toda entrada deve ser validada no servidor por esquema explícito — tipo, tamanho, formato e faixa —, independentemente da validação no cliente. |
| RNF-SEC-14 | Conteúdo gerado por usuário (comentário, biografia, trecho, título de lista) deve ser tratado como texto na renderização, com escape adequado, prevenindo XSS na aplicação web. |
| RNF-SEC-15 | A resenha, por aceitar Markdown (RN-13), deve ser renderizada com HTML embutido desabilitado no parser e com sanitização da saída antes da inserção no DOM. Renderizar Markdown de usuário sem essas duas medidas reintroduz XSS. |
| RNF-SEC-16 | A aplicação web deve enviar cabeçalho `Content-Security-Policy` restritivo. |

### A04 — Insecure Design

| ID | Requisito |
|---|---|
| RNF-SEC-17 | Endpoints de autenticação, cadastro e recuperação de senha devem ter **rate limiting** por IP e por identidade. |
| RNF-SEC-18 | Ações sociais — seguir, curtir, comentar, mencionar, denunciar — e cadastro de livro por ISBN devem ter rate limiting, prevenindo abuso e spam. |
| RNF-SEC-19 | A descoberta de usuários deve ocorrer somente por username exato, sem enumeração por prefixo, listagem ou sugestão. |
| RNF-SEC-20 | Upload de imagem deve validar tipo real do arquivo, tamanho máximo e dimensões, rejeitando conteúdo não-imagem. |

### A05 — Security Misconfiguration

| ID | Requisito |
|---|---|
| RNF-SEC-21 | CORS deve permitir apenas as origens conhecidas dos clientes; curinga é proibido em produção. |
| RNF-SEC-22 | Respostas de erro não devem expor *stack trace*, versão de framework, estrutura de banco ou caminho de arquivo. |
| RNF-SEC-23 | Ambientes de desenvolvimento e produção devem ter configuração distinta, com modo de depuração desabilitado em produção. |
| RNF-SEC-24 | Cabeçalhos de segurança devem ser aplicados: `HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`. |

### A06 — Vulnerable and Outdated Components

| ID | Requisito |
|---|---|
| RNF-SEC-25 | Dependências devem ter versões fixadas por arquivo de lock versionado no repositório. |
| RNF-SEC-26 | O pipeline de CI deve executar auditoria de dependências, falhando em vulnerabilidade de severidade alta ou crítica. |

### A07 — Identification and Authentication Failures

| ID | Requisito |
|---|---|
| RNF-SEC-27 | Senha deve ter mínimo de 8 caracteres, com verificação contra lista de senhas comuns. |
| RNF-SEC-28 | Mensagens de erro de login e de recuperação de senha não devem revelar se o e-mail ou username existe. |
| RNF-SEC-29 | Tentativas de login sucessivas falhas devem sofrer bloqueio temporário progressivo por identidade. |
| RNF-SEC-30 | Token de acesso deve ter validade curta; token de renovação deve ser revogável e invalidado no logout e na alteração de senha. |
| RNF-SEC-31 | A conta de administrador deve exigir senha forte provisionada por ambiente, distinta de qualquer valor padrão. |

### A08 — Software and Data Integrity Failures

| ID | Requisito |
|---|---|
| RNF-SEC-32 | Mensagens consumidas do broker devem ser validadas por esquema antes do processamento. |
| RNF-SEC-33 | Dados provenientes de fonte externa devem ser validados e normalizados antes da persistência, jamais confiados por origem. |
| RNF-SEC-34 | Deploy deve ocorrer somente a partir de código versionado no repositório, por pipeline automatizado. |

### A09 — Security Logging and Monitoring Failures

| ID | Requisito |
|---|---|
| RNF-SEC-35 | Devem ser registrados: falhas de autenticação, falhas de autorização, alterações de senha, ações de moderação e ações administrativas. |
| RNF-SEC-36 | Logs não devem conter senha, token, hash de senha ou conteúdo integral de mensagem privada. |
| RNF-SEC-37 | Ações de moderação devem constar em log de auditoria consultável. |

### A10 — Server-Side Request Forgery

| ID | Requisito |
|---|---|
| RNF-SEC-38 | O cadastro por ISBN não deve aceitar URL do usuário. O ISBN deve ser validado por formato e dígito verificador, e a URL da fonte externa deve ser construída pelo servidor a partir de allowlist de domínios. |
| RNF-SEC-39 | Requisições a serviços externos devem ter timeout, limite de tamanho de resposta e proibição de seguir redirecionamentos para destinos fora da allowlist. |

### Privacidade e LGPD

| ID | Requisito |
|---|---|
| RNF-SEC-40 | O cadastro deve coletar o mínimo de dados pessoais necessários à finalidade do aplicativo. |
| RNF-SEC-41 | O leitor deve poder solicitar exclusão, recuperar a conta em até 30 dias e, vencido o prazo, ter dados pessoais e conteúdo removidos definitivamente (RF-AUT-07, RN-23). |
| RNF-SEC-42 | O aplicativo deve apresentar política de privacidade informando dados coletados, finalidade e retenção. |
| RNF-SEC-43 | O cadastro deve exigir declaração de idade e recusar usuários menores de 18 anos. |
| RNF-SEC-44 | Não devem ser coletados dados de localização precisa nem dados pessoais sensíveis, e não deve haver descoberta aberta de perfis. |

---

## 9. Estratégia de testes

| ID | Requisito |
|---|---|
| RNF-TST-01 | Cada serviço de backend deve ter **testes unitários** cobrindo regras de negócio, com prioridade obrigatória para a máquina de estados de leitura (RN-04), a regra de inatividade (RN-05) e o controle de acesso a perfil privado (RN-08). |
| RNF-TST-02 | Cada serviço deve ter **testes de integração** cobrindo endpoints com banco real ou container equivalente, incluindo casos de erro e de autorização negada. |
| RNF-TST-03 | Fluxos assíncronos devem ter teste de integração cobrindo publicação, consumo, idempotência em entrega duplicada e encaminhamento a dead-letter queue. |
| RNF-TST-04 | O aplicativo móvel deve ter testes unitários da camada de estado e de serviços, incluindo o comportamento de fila offline (RNF-ERR-05). |
| RNF-TST-05 | A aplicação web deve ter testes unitários de componentes com lógica e de serviços de acesso à API. |
| RNF-TST-06 | Os clientes devem ter teste do tratamento de indisponibilidade e timeout, com API simulada. |
| RNF-TST-07 | O pipeline de CI deve executar todos os testes a cada push na branch de desenvolvimento; branch com teste falhando não é integrada. |
| RNF-TST-08 | Deve existir massa de dados de teste reproduzível (seed) cobrindo os estados de leitura, perfis público e privado, e livros oficiais e pessoais. |

**Cobertura mínima:** 60% de linhas nos módulos de regra de negócio do backend. A meta é indicativa, não critério de aceite — cobertura das regras de RN-04 e RN-05 vale mais do que percentual global.

**Fora de escopo:** testes end-to-end automatizados, testes de carga, testes de segurança automatizados além da auditoria de dependências.

---

## 10. Integrações externas

### 10.1 Fonte de metadados de livros

| Fonte | Uso | Observações |
|---|---|---|
| **OpenLibrary — data dumps** | Carga inicial da base oficial | Dados em domínio público (CC0). Dump de edições na ordem de dezenas de GB descomprimido, muito acima do limite do plano gratuito do Neon: **exige filtragem prévia** (idioma português, com ISBN-13, com total de páginas, com capa), processada localmente em streaming e carregada por `COPY`. |
| **OpenLibrary — API REST** | Cadastro por ISBN (fonte primária) | Sem chave de API e sem custo. Exige `User-Agent` identificando a aplicação. Cobertura de ISBNs brasileiros é inconsistente. |
| **Google Books — API** | Cadastro por ISBN (fonte secundária) | Consultada quando a primária não retorna resultado. |
| **OpenLibrary — Covers** | Capas de livros oficiais | Referenciadas por URL, não armazenadas. Usar chave por `cover_id`, não por ISBN, evitando o limite de taxa daquele caminho. |

**Nota geral (RF-ACV-15):** o OpenLibrary publica avaliações em dump próprio (`ol_dump_ratings`) e a API do Google Books expõe `averageRating` e `ratingsCount` por volume. Em ambos os casos a cobertura é **esparsa** — a maioria dos títulos não tem avaliação alguma, e a escassez tende a ser maior justamente no catálogo em português. O indicador deve ser tratado como opcional por livro, nunca como campo obrigatório, e a interface precisa funcionar bem no caso de ausência. Quando a origem fornecer a avaliação no nível de obra, a mesma nota externa e sua contagem são replicadas nas edições associadas por `ol_work_key`; isso não cria entidade Obra nem combina as notas dos leitores, que continuam independentes por edição.

Se nenhuma fonte retornar o ISBN, o fluxo termina em erro com oferta de cadastro pessoal (RF-ACV-06). A indisponibilidade das fontes externas não deve impedir o uso do restante do aplicativo.

**Cobertura de nota geral — medida em 16/08/2026 (P-14 encerrada).** Amostra de 100 obras em português:

| Fonte | Resultado |
|---|---|
| OpenLibrary — obras com nota | 100% |
| OpenLibrary — mediana de avaliações por obra | 213 |
| OpenLibrary — obras com menos de 5 avaliações | 0 |
| Google Books | **não medido** — 69% das consultas bloqueadas por cota, 31% sem ISBN-13 em português |

**Conclusão: RF-ACV-15 e RF-ACV-16 permanecem no escopo.** A nota geral do OpenLibrary tem cobertura e volume de avaliações suficientes para ser exibida como indicador significativo, e não como ruído.

**Duas ressalvas sobre a medição:**

1. **A amostra não é aleatória.** `search.json` sem parâmetro de ordenação retorna por relevância, que nesta consulta ampla correlaciona fortemente com popularidade. Foram medidas, portanto, as obras em português mais proeminentes — não uma amostra uniforme do acervo. A cobertura real do universo é seguramente inferior a 100%. A ressalva é atenuada pelo fato de que os filtros de ingestão desta seção também enviesam o acervo em direção a obras populares e recentes, de modo que a população medida se aproxima da que será efetivamente carregada.
2. **A cobertura do Google Books permanece desconhecida**, assim como sua taxa de acerto por ISBN, que valida a fonte secundária de RF-ACV-05. A medição exigiria chave de API ou amostra menor distribuída ao longo de dias.

**Viabilidade da fonte — medida em 16/08/2026 (P-07 encerrada).** Amostragem de 100 obras via `search.json` e `/works/{key}/editions.json`, avaliando cada obra pelo filtro desta seção (edição em português com ISBN-13, total de páginas e capa):

| Métrica | Resultado |
|---|---|
| Obras com alguma edição em português | 423.274 |
| Obras com original publicado entre 2015 e 2025 | 73.756 |
| Obras com `publish_place: Brazil` | 15.565 |
| **Taxa de aproveitamento na amostra** | **54%** |
| Rejeitadas por falta de total de páginas | 10% |
| Rejeitadas por `language:por` sem edição em português real | 26% |

**Conclusão: a fonte tem acervo suficiente para o produto.** Cobertura de português não é fator limitante. O dimensionamento da carga inicial passa a ser questão de arquitetura, não de requisito, e está tratado em RNF-DES-04.

**Ressalvas registradas para a implementação da ingestão:**

1. `language:por` no nível de obra é pouco confiável — 26% da amostra não tinha edição em português real. O filtro precisa ser aplicado no nível da **edição**.
2. O corpus mistura mercados brasileiro e português: cerca de 13% da amostra vinha de editoras portuguesas. Não é motivo de exclusão, mas afeta a curadoria das páginas de editora.
3. `publish_place` é campo mal preenchido e **não deve ser usado como filtro principal**: excluiria Rocco e Intrínseca, as editoras mais frequentes da amostra.
4. `first_publish_year` refere-se à obra original, não à edição em português. Uma janela de anos recentes exclui todo o cânone de vestibular e ENEM, leitura central do público-alvo — esse acervo exige curadoria manual ou entrada via RF-ACV-05.
5. Autopublicação (`Independently Published` e similares) apareceu com frequência alta e metadado pobre; recomenda-se exclusão na ingestão.
6. Variação de grafia de editora foi confirmada na amostra (ex.: "Intrinseca" sem acento), validando a necessidade da tabela de sinônimos.

### 10.2 Agendamento

Jobs diários: verificação de inatividade de leituras (RN-05) e exclusão definitiva de contas cujo prazo de 30 dias venceu (RN-23). **Atualização automática/delta do acervo está fora de escopo**: permanecem carga inicial e recarga manual do dump, além do cadastro individual por ISBN e dos caches sob demanda já especificados.

Cron Jobs do Render são recurso pago e **não estão disponíveis** no plano gratuito. Candidatos: **GitHub Actions com `schedule`** (preferido — já existe repositório, é versionado e auditável), Cloudflare Workers Cron Triggers, cron-job.org.

> ℹ️ **P-08 decidida: GitHub Actions (`schedule`), fallback cron-job.org.** Viabilidade no repositório da faculdade a validar no período-0. Detalhes no Documento de Arquitetura §2.4.

### 10.3 Serviços de apoio

| Serviço | Uso | Status |
|---|---|---|
| Armazenamento de imagens | Avatares e capas de livros pessoais | ✅ **P-09 decidida:** Cloudinary — ver §10.4 |
| E-mail transacional | Recuperação de senha | ✅ **P-02 decidida:** Brevo |
| Broker de mensageria | §7.2 | ✅ **P-06 decidida:** RabbitMQ (CloudAMQP) |
| Push móvel | RF-NOT-07 | ✅ **P-04 decidida:** FCM em Android, in-app no iOS — ver §10.5 |

**Validações operacionais do período-0:** confirmar os limites vigentes dos planos gratuitos de Cloudinary, CloudAMQP e Brevo e testar a emissão de push FCM em dispositivo Android real.

---

### 10.4 Serviço de imagens — histórico da decisão

> ℹ️ **P-09 decidida: Cloudinary.** Decisão registrada no Documento de Arquitetura §2.5. A análise abaixo é o que fundamentou a escolha.

**Recomendação: Cloudinary.** O critério decisivo não é o tamanho do plano gratuito, é a **transformação de imagem sob demanda pela URL**. São necessárias miniaturas de avatar em três tamanhos e de capa em dois; sem transformação no serviço, esse redimensionamento vira código rodando em container Render de 512 MB de RAM — o pior lugar possível para processar imagem. Segundo motivo: *unsigned upload preset* permite ao cliente Flutter enviar direto ao Cloudinary, sem que os bytes trafeguem pela API.

**Cuidado associado:** upload preset sem restrição é vetor de abuso. Fixar pasta de destino, tipos permitidos e tamanho máximo no próprio preset, além do previsto em RNF-SEC-20.

**Alternativas:** Supabase Storage, se houver preferência por concentrar serviços em um fornecedor. Cloudflare R2 foi descartado: não oferece transformação nativa e o produto de imagens da Cloudflare é pago.

**Validação operacional do período-0:** confirmar os limites vigentes do plano gratuito do Cloudinary, que mudam com frequência.

### 10.5 Push notifications — histórico da decisão

> ℹ️ **P-04 decidida: FCM em Android, in-app no iOS.** Decisão registrada no Documento de Arquitetura §2.7. A análise abaixo é o que fundamentou a escolha.

**Recomendação: FCM (Firebase Cloud Messaging) direto**, via `firebase_messaging`. É gratuito sem teto prático e é o caminho nativo do Flutter. OneSignal simplifica a configuração inicial, mas insere um intermediário e, no Android, opera sobre FCM de todo modo.

**Fundamento da decisão:** push em **iOS exige conta paga no Apple Developer Program** para emissão da chave APNs. A demonstração de push ocorre em Android; no iOS, permanecem as notificações in-app.

**Escopo:** push é extensão do fluxo assíncrono de notificações já definido em §7.2. Sua inclusão não exige remodelagem do backend, apenas um consumidor adicional.

### 10.6 Persistência das capas externas — decisão registrada

**Decidido (16/08/2026): cache sob demanda, sem expiração por tempo.** Regra completa em RN-14; requisito em RF-ACV-17.

**Descartado — download em massa na ingestão:** cerca de 50 mil livros a aproximadamente 50 KB por capa resultariam em algo em torno de 2,5 GB, acima de qualquer plano gratuito de armazenamento de imagem, e a maioria dessas capas nunca seria exibida a ninguém.

**Descartado — cache com TTL por inatividade:** removeria a cópia própria justamente das capas menos acessadas, que são as mais expostas a link rot na origem, protegendo o que não corre risco e desprotegendo o que corre. Além disso, "último acesso" não é observável pelo backend, já que as imagens são servidas diretamente pelo CDN do provedor; medi-lo exigiria proxiar as imagens pela API, anulando o ganho do CDN. A economia em disputa é de dezenas de megabytes, sem pressão real de armazenamento que a justifique.

**Dimensionamento esperado:** algumas centenas de capas em uso efetivo, na ordem de 15 a 30 MB.

**Observação secundária:** re-hospedar capa de terceiro é posição um pouco mais frágil em direito autoral do que referenciar a origem. Pouco relevante em trabalho acadêmico, mas cabe registro caso haja seção de riscos.

### 10.7 Recomendação algorítmica — decisão registrada

**Decidido (16/08/2026): recomendação calculada em tempo de consulta, sem estrutura derivada.** As sugestões são produzidas por consulta direta sobre os dados que o sistema já mantém — estante, leituras, notas, seguidores e assuntos. Nenhuma tabela nova é criada.

**Descartado — grafo de similaridade livro–livro materializado.** A alternativa avaliada consistia em derivar e persistir uma tabela de arestas livro–livro, com pontuação de similaridade recalculada em lote. Foi descartada por não compensar o esforço no porte deste projeto: o ganho de desempenho aparece apenas em volumes que o sistema não alcançará, e o custo inclui tabela adicional, job de recálculo, agendamento e invalidação. A decisão registra explicitamente que o sistema **não tem pretensão de escalar** além do uso previsto.

**Composição das sugestões:**

| Seção | Origem | Consulta |
|---|---|---|
| **Quem você segue leu** | Leituras concluídas por leitores seguidos, com nota alta | Junção entre `seguidor`, `usuario_livro` e `nota`, com piso mínimo de leitores e de nota média |
| **Do seu gosto** | Assuntos, autores e séries mais frequentes na estante do leitor | Junção entre a estante do leitor e o acervo por assunto (RN-21), autor e série |

As duas seções são consultas paginadas com limite fixo de resultados, apoiadas nos índices já exigidos por RNF-DES-03.

**Exclusões aplicadas em ambas as seções (RF-REC-10):** livros já presentes na estante do leitor, livros pessoais de terceiros e sugestões descartadas (RF-REC-12).

**Privacidade.** O sinal social considera apenas leitores que o usuário segue com solicitação aceita, o que satisfaz RN-08 por construção. A atribuição exibida na sugestão ("N pessoas que você segue leram") exige a mesma verificação, e a identificação de quem leu está sujeita a RN-08.

**Livro pessoal fica fora de ambos os sistemas** (RF-REC-06, RF-REC-10): terceiros não podem adicioná-lo à estante (RN-15), portanto recomendá-lo é sugerir algo inacionável.

**Assuntos são o insumo principal.** Sem a normalização definida em RN-21, a seção "Do seu gosto" fica restrita a autor e série e degenera em "mais livros do mesmo autor", informação que o leitor já obtém na página do autor.

**Opt-out aprovado, incorporado em 15/09/2026:** o leitor pode impedir o uso de suas leituras nas recomendações de outras pessoas, por `opt_out_recomendacao` em seu perfil. F-REC-ALG entrega a configuração em web/mobile e o filtro server-side do sinal social, consumindo o campo pelo contrato de `identidade`. A opção não oculta o perfil nem desativa as recomendações recebidas pelo próprio leitor.

**Terminologia.** O pedido original mencionou "leituras dos seguidores". O sinal forte é o inverso — **quem o usuário segue** —, por ser escolha deliberada do usuário. RF-REC-09 está redigido nesse sentido.

### 10.8 Recomendação P2P — decisão registrada

**P-17 encerrada (16/08/2026).** Fluxo especificado em RN-22 e nos requisitos RF-REC-01 a RF-REC-07, RF-REC-15 a RF-REC-17.

Resumo das decisões, no modelo de compartilhamento de conteúdo em redes sociais, e não de solicitação a ser respondida:

| Ponto | Decisão |
|---|---|
| Destinatários | Vários por envio, apenas com seguimento mútuo |
| Mensagem | Opcional |
| Aceitar/recusar | **Não existe** — a recomendação apenas fica disponível e leva à página do livro |
| Livro já na estante | Envio bloqueado, com aviso |
| Limite | 50 ativas por par remetente–destinatário |
| Descarte | Sem motivo, sem aviso ao remetente |
| Expiração | 90 dias |
| Adição à estante | Remove todas as recomendações daquele livro |
| Descarte em lote | Oferecido ao terceiro descarte do mesmo livro |

**Consequências de implementação registradas:**

- A ausência de aceitação elimina qualquer máquina de estados: a recomendação existe ou não existe. As quatro vias de remoção — expiração, adição à estante, descarte individual e descarte em lote — convergem para a mesma operação.
- A expiração de 90 dias pode ser aplicada por filtro na consulta, com remoção física em rotina periódica, sem exigir precisão de horário.
- A contagem de três descartes e a supressão da pergunta de descarte em lote (RN-22.12/13) são estado do cliente, não do servidor, e ambas se perdem ao reiniciar o aplicativo.
- O limite de RN-22.4 conta recomendações **ativas**, não o total já enviado historicamente.

### 10.9 Sessão cronometrada — decisão registrada (P-18)

**P-18 encerrada (16/08/2026).** Decisões registradas:

- **Modo de foco** obrigatório e não contornável; sair do aplicativo não encerra a sessão, e a reabertura retorna à tela da sessão (RN-16.3 a RN-16.5). Permanece fora do escopo do cliente web, por ser inaplicável a uma aba de navegador.
- **Duração máxima: 12 horas** de tempo cronometrado (RN-16.11).
- **Pausa** com duração escolhida entre 5, 10 ou 15 minutos, sem limite de ocorrências, com encerramento automático se não houver retomada (RN-16.14 a RN-16.20).

**Consequência da pausa sobre o cronômetro.** Com pausa, o tempo deixa de ser derivável de um único instante de início: o estado local passa a ser `tempo acumulado` mais `início do trecho corrente` (RN-16.9). É a única complexidade adicional, e ela é necessária para que o tempo em pausa não seja contado como leitura.

**Sessões encerradas sem informe de página.** Tanto a expiração por duração máxima quanto o encerramento por pausa não retomada produzem sessão com tempo medido e sem página informada. Ambas convergem para o mesmo fluxo de confirmação na reabertura do aplicativo (RN-16.19), evitando dois tratamentos distintos para o mesmo estado.

**Observação sobre confiabilidade do tempo medido.** Com o instante de início mantido no dispositivo (RN-16.7), o tempo de sessão não é verificável pelo servidor e depende do relógio do aparelho. Isso é aceitável para desafios, sequência diária e estatísticas pessoais, todos individuais. Foi um dos motivos para a sequência ser medida em dias com leitura, e não em tempo lido (RN-18.7), e para o descarte de ranking competitivo (§11).

**Observação de projeto sobre o modo de foco.** A restrição de navegação é intencional e coerente com o objetivo de incentivo à leitura, no mesmo espírito de aplicativos de foco. Dois efeitos colaterais ficam registrados como consequências aceitas: o leitor não consegue consultar a própria estante nem uma resenha durante a sessão, usos plausíveis com o livro em mãos; e o bloqueio vale **dentro** do aplicativo, já que o sistema operacional sempre permite alternar de aplicativo — a restrição opera como compromisso, não como impedimento físico. Nenhum dos dois altera a decisão.

---

## 11. Fora de escopo

Registrado explicitamente para evitar reabertura de discussão:

- Camada de obra e unificação de edições
- Login social e autenticação de dois fatores
- Mensagem direta entre usuários
- Grupos, clubes de leitura e fóruns
- Medalhas e conquistas
- Ranking de leitores, global ou restrito a quem se segue
- Perfis de autor e de editora como entidades com dono ou conteúdo de usuário
- Integração com e-books, leitura no app e sincronização com dispositivos de leitura
- Internacionalização e múltiplos idiomas
- Aplicativo desktop
- Monetização
- Atualização automática/delta do acervo (apenas carga inicial e recarga manual do dump)

---

## 12. Timeline

### v1.8 — Alteração 29/09/2026: progresso sem edição

- **RF-PRG-03/RN-17:** por decisão da dona do projeto, reverte a parte de v1.5 (15/09/2026) que permitia editar a última atualização de progresso. O leitor visualiza as atualizações e exclui; um registro intermediário só é excluído junto de todos os posteriores, recalculando a página atual e os efeitos derivados. Para corrigir um valor, exclui-se e registra-se de novo.
- **Impacto:** F-PRG (OpenAPI de `leitura` sem `PATCH /progresso/{progressoId}`); sem mudança de dados.

### v1.7 — Alteração 29/09/2026: tempo opcional no progresso manual

- **RF-PRG-01:** o tempo gasto passa a ser opcional, conforme o protótipo; ausente é registrado como 0 (não informado), e o resumo do progresso expõe o total de minutos da leitura.
- **Aviso de ritmo:** o limiar fica em 40 páginas acima da média de páginas lidas por registro do leitor naquela leitura, calculado no cliente.
- **Impacto:** F-PRG (OpenAPI de `leitura`, schema `progresso.registrado.v1` com `minutos` a partir de 0); sem mudança de dados.

### v1.6 — Alteração 29/09/2026: público-alvo ampliado para leitores adultos

- **Autorização:** mudança solicitada após a avaliação dos professores, que questionaram a limitação do público à faixa de 18 a 30 anos.
- O público-alvo passa a abranger leitores brasileiros com 18 anos ou mais, sem limite máximo de idade.
- A regra de cadastro não muda: pessoas com 18 anos completos podem se cadastrar e menores de 18 anos continuam sendo recusados, conforme RNF-SEC-43.
- **Impacto:** visão do produto, Documento de Design, documentos da disciplina, declaração de escopo, prompts de protótipo, apresentação do repositório e metadados descritivos. Não há impacto em código, modelo de dados, arquitetura, contratos OpenAPI, mensageria ou testes automatizados.

### v1.5 — Alteração 15/09/2026: decisões do grupo após revisão do DER

- **Autorização:** decisões debatidas pelo grupo e comunicadas pelo solicitante nesta data para atualização do DER e de suas fontes.
- Desafios preservam configuração por período e incluem períodos sem progresso. Conclusões contam no dia da ação; sincronização offline recompõe desafios e streak pela data de captura. Pausas excluem somente os fatos ocorridos durante seus intervalos.
- RF-PRG-03/RN-17 passam a permitir edição apenas do último progresso e exclusão de um intermediário somente com todos os posteriores. As correções recalculam os efeitos derivados.
- Médias diárias usam dias com leitura registrada; dias/livro usa toda a duração entre início e fim, inclusive abandono. Opt-out de recomendações aprovado; contador e supressão de descarte em lote são temporários por sessão.
- Denúncia usa motivo textual único. Suspensão oculta conteúdo e admite reativação. Preferências são individuais por tipo; recurtir a mesma resenha não renotifica. Biografia de autor vem da OpenLibrary e é omitida na ausência.
- Registros técnicos/auditoria anonimizados têm retenção indeterminada, preservando a exclusão de dados pessoais e conteúdo. Delta automático do acervo removido do escopo.
- **Impacto:** arquitetura §2.4/§4/§5, documentos derivados 3 e 4, DER por schema e features F-PRG, F-EST, F-DSF/OPC, F-GAM, F-STA, F-PERFIL, F-REC-ALG/P2P, F-AVA-2, F-NOT-OPC, F-MOD/OPC, F-CONTA-2, F-ACV-DESCOBERTA/INGESTAO/OPC. Contratos OpenAPI de domínio serão implementados nas features; os specs de scaffold não passam a prometer endpoints inexistentes. A divergência dos protótipos de progresso fica registrada em F-PRG.

### v1.4 — 02/09/2026

- **Alocação de stack por serviço decidida** (encerra pendência da baseline): `identidade` e `social` em **Spring (Java)**; `acervo` e `leitura` em **NestJS (TypeScript)** — mantendo `acervo` e `leitura` na mesma stack, como a arquitetura recomendava.
- **Impacto:** registrada no Documento de Arquitetura §2.1 (P-11) e no `AGENTS.md` de cada serviço; pendências correlatas fechadas nas features de P0 (INFRA, CI, MSG, DEPLOY) e nas features de produto que citavam a stack pendente. Sem mudança de requisito, dados ou decomposição.

### v1.3 — 01/09/2026

- **RF-EST-10 ampliado:** o histórico geral continua restrito a leituras e releituras finalizadas, mas passa a aceitar pesquisa por título ou autor em todos os anos. O resultado preserva cada ocorrência concluída do mesmo livro, permitindo selecionar uma delas e consultar suas atualizações de progresso em modo somente leitura.
- **Impacto:** F-EST-2 passa a combinar `q`, ano e paginação em `GET /me/historico`; o retorno identifica cada ocorrência por `leituraId`. `GET /leituras/{id}/progresso` passa a aceitar consulta do dono também para leitura finalizada, sem permitir exclusão, novo progresso ou alteração de status. A tela de histórico ganha pesquisa e detalhamento por ocorrência; a tela de atualizações de progresso ganha um estado histórico somente leitura.
- **Sem mudança de dados ou arquitetura:** `leitura` já é histórica e `atualizacao_progresso` já pertence a uma ocorrência de leitura. Leituras abandonadas e releituras incompletas permanecem fora do histórico geral de concluídas. O spec OpenAPI de `leitura` deverá refletir os novos parâmetros e o modo de consulta quando F-EST-2 for implementada.

### v1.2 — 01/09/2026

- Exclusão de conta ganhou janela de recuperação de 30 dias, login restrito e remoção definitiva por job após o prazo.
- Outbox transacional foi aprovada como garantia durável de RNF-ERR-10.
- Eventos de feed, progresso/conclusão, exclusão de resenha/conta e recomendação P2P foram incorporados aos fluxos assíncronos definidos.
- Nota geral no nível de obra passou a ser replicada nas edições associadas, sem introduzir entidade Obra.

- **RF-EST-13 criado:** busca por título e autor **dentro da estante** do leitor, combinável com o filtro por status. Desejável, web e mobile. Surgiu da prototipagem de F-ACV-BUSCA e F-EST: o `documento-de-design.md` §5.1 punha uma lupa no header da estante sem declarar o escopo dela, e o protótipo a tratava como porta do acervo. Na web isso virava um campo de busca dentro de "Minha estante" que devolvia o catálogo inteiro, e no mobile a aba `Estante` ficava ativa numa tela de resultados de acervo. Separadas as duas buscas, a da estante ficou sem requisito que a amparasse.
- **Impacto:** serviço `leitura` ganha parâmetro de busca no endpoint de estante, com índice e paginação sob RNF-DES-02, e o spec OpenAPI de `leitura` precisa refletir isso. Registrado como pendência em `feature-F-EST.md`.
- **Fora desta alteração:** RF-ACV-01/02 não mudaram. A busca do acervo continua exatamente como estava; o que mudou foi **onde ela mora na interface**, e isso é `documento-de-design.md` §5.7, não requisito.

### v1.1 — 26/08/2026

- Baseline marcada como fechada, mantendo explícitas as pendências de alocação de stack por serviço, opt-out de recomendações e garantia durável de RNF-ERR-10.
- Backend consolidado em Spring + NestJS, com FastAPI descartado.
- IDs normalizados sem sufixos: RF-ACV renumerados posicionalmente para 01–22 e RNF-SEC para 01–44, com todas as referências atualizadas.
- Lista de desejados unificada ao status **Quero ler**; RF-EST-10 a RF-EST-12 renumerados posicionalmente, preservando favoritos em RF-EST-09.
- Acesso de terceiros a livro pessoal restrito às duas vias já definidas, feed e lista do dono, com autorização e privacidade revalidadas no recurso-alvo e sem acesso direto por ID.
- Mensageria consolidada em seis fluxos definidos, incluindo `nota.alterada`; estatísticas, desafios, sequência diária e e-mail permanecem candidatos futuros.
- Serviços de apoio P-02, P-04, P-06 e P-09 marcados como decididos, separados das validações operacionais do período-0.

### v1.0 — 22/08/2026

Versão inicial consolidada. Reúne a definição de escopo, o modelo de domínio, as regras de negócio, os requisitos não funcionais, a segurança e a estratégia de testes. Substitui as versões de trabalho anteriores.

**Escopo e plataformas**

- Cadastro permitido a partir dos **18 anos**, evitando o tratamento de dados pessoais de menores sob a LGPD
- **Sem paridade funcional** entre web e mobile: o cliente móvel em Flutter é o produto principal; a web em **Vue com Tailwind** cobre um subconjunto. Corte de escopo recai sobre a web antes do mobile
- Excluídos do escopo: camada de obra, login social, mensagem direta, clubes de leitura, **medalhas e conquistas**, **ranking de leitores**

**Modelo do acervo**

- **Livro = Edição**: duas edições da mesma obra são registros independentes. Não há camada de obra
- **ISBN-13** como chave natural da base oficial; **livro pessoal não possui ISBN**
- **Livro pessoal** visível a terceiros por duas vias — feed de atividades e listas do dono —, sempre sujeito à privacidade do perfil, e inacionável por quem não é o dono
- **Assuntos normalizados** a partir de conjunto curado e fechado, com filtro de busca por gênero **Essencial**
- **Sinopse** e **capas** obtidas por cache sob demanda, não na carga inicial, preservando o teto de armazenamento
- **Nota geral** (externa) e **nota dos leitores** exibidas como indicadores distintos, nunca combinados
- Fontes externas validadas em campo: OpenLibrary confirmado como suficiente, com 54% de aproveitamento sobre 423 mil obras em português

**Leitura**

- Máquina de estados completa, incluindo releitura, retomada e **abandono automático após 40 dias**, com alertas nos dias 20 e 30
- Releitura abandonada não conta no número de vezes lido e não é retomável
- Progresso registrado sempre pela **página em que o leitor parou**, valor absoluto e monotônico; páginas lidas e percentual são derivados
- **Sessão de leitura cronometrada** com **modo de foco obrigatório**, limite de 12 horas e pausas de 5, 10 ou 15 minutos. Estado mantido no dispositivo, sem chamada ao servidor
- Nota e resenha pertencem ao livro, não à leitura

**Social e conteúdo**

- Perfis públicos ou privados, com descoberta **apenas por username exato**
- Resenhas em **Markdown** com subconjunto restrito, sem HTML, links ou imagens
- Comentários com **um nível de aninhamento** e respostas por menção `@username`
- **Recomendação P2P** no modelo de conteúdo compartilhado, sem aceitação ou recusa, com expiração em 90 dias e quatro vias de remoção
- **Recomendação algorítmica** calculada em tempo de consulta; grafo de similaridade materializado avaliado e descartado por não compensar no porte do projeto
- Gamificação limitada à **sequência diária de leitura**, medida em dias com leitura efetiva e nunca em tempo lido

**Requisitos não funcionais**

- Seis fluxos assíncronos definidos: notificações, expiração de leituras, ingestão de livros, cache de capas, busca de sinopse e nota agregada
- Resiliência com timeout, retentativa com backoff, idempotência, dead-letter queue e **fila offline no cliente móvel**
- Segurança organizada pelo **OWASP Top 10 (2021)**, com 44 requisitos, mais privacidade e LGPD
- Testes unitários e de integração, com prioridade obrigatória para a máquina de estados de leitura, a regra de inatividade e o controle de acesso a perfil privado
