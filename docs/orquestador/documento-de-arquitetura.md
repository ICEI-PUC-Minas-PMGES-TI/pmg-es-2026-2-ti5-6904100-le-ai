# Documento de Arquitetura de Software

**Versão:** v1.5 — 15/09/2026
**Status:** macroarquitetura fechada — alocação de stack por serviço decidida em 02/09/2026 (§2.1)

> **v1.4 (12/09/2026):** ambiente local passa a usar **Postgres local** — **removida a branch de banco por dev no Neon** (o Neon mantém só a branch de DES/HML). Decisão da equipe; reflexo em §6 e no plano §4.

> **v1.5 (15/09/2026):** decisões do grupo registradas em `REQUISITOS.md` v1.5: delta automático do acervo removido, projeções corrigíveis por sincronização offline, retenção de configurações/pausas de desafio, suspensão com ocultação e retenção técnica anonimizada sem prazo. Sem mudança de stacks ou fronteiras dos serviços.

> Este documento descreve **como o sistema é construído**. O *o que* mora em `docs/orquestador/REQUISITOS.md`, que continua sendo a fonte de verdade. Em caso de conflito, o `REQUISITOS.md` vence, e a divergência segue o controle de mudança do `docs/orquestador/plano-de-projeto.md` §3.

---

## 1. Visão geral da arquitetura

O sistema é um backend de **microsserviços** (RNF-ARQ-02) consumido por HTTP/JSON (RNF-ARQ-01) por dois clientes independentes: o aplicativo móvel em Flutter (produto principal) e a SPA web em Vue + Tailwind (subconjunto). Não há paridade funcional entre os clientes; o corte de escopo recai sobre a web antes do mobile.

São **quatro serviços de backend** — `identidade`, `acervo`, `leitura` e `social` —, um **broker de mensageria** para os fluxos assíncronos (RNF-ARQ-06), um **banco PostgreSQL único no Neon** com separação lógica por schema (RNF-ARQ-07), e um conjunto de **serviços de apoio gratuitos** (e-mail, imagens, push, agendador). Todos os serviços e o site estático são hospedados no Render em plano gratuito (RNF-ARQ-08).

A decomposição segue o ciclo de valor do produto (encontrar livro → registrar leitura → acompanhar progresso → ver amigos), mantendo na mesma fronteira tudo o que participa do mesmo caminho crítico, para não transformar operação de usuário em cadeia de chamadas síncronas entre serviços.

---

## 2. Decisões de tecnologia

Cada decisão registra a escolha, a justificativa e as consequências aceitas. As escolhas de macroarquitetura estão fechadas; os itens ainda pendentes estão explícitos no status e na §8.

### 2.1 P-11 — Frameworks de backend: Spring **e** NestJS

**Decisão.** O backend usa duas stacks: **Spring (Java)** e **NestJS (TypeScript)**. FastAPI foi descartado.

**Justificativa.** A equipe se divide naturalmente entre desenvolvedores fortes em Java e em TypeScript. Usar as duas stacks aproveita a força existente em vez de forçar uma linguagem única sobre metade do grupo, e atende bem à demonstração de heterogeneidade tecnológica esperada pela disciplina. FastAPI sai porque uma terceira linguagem não traz ganho proporcional ao custo; onde Python seria útil — a ingestão de dumps do OpenLibrary — o trabalho é um **script utilitário de carga**, não um serviço, e pode ser escrito na linguagem que for mais conveniente sem virar uma stack de manutenção.

**Consequências aceitas.**

- O contrato entre serviços passa a atravessar duas linguagens. Isso é neutralizado pela regra de que a integração é sempre por **HTTP/JSON + OpenAPI** (RNF-ARQ-03) e por **mensagens validadas por schema** (RNF-SEC-32) — nenhum serviço depende de tipo ou biblioteca do outro.
- Padrões transversais precisam ser implementados **duas vezes**: corpo de erro padronizado (RNF-ERR-01), log estruturado com `correlation-id` (RNF-OBS-01), health check (RNF-OBS-02), rate limiting (RNF-SEC-17/18). O documento trata cada um como contrato de comportamento (formato de saída), não como biblioteca compartilhada, para que as duas implementações fiquem equivalentes.
- Cada serviço declara sua stack no seu `AGENTS.md`, e a divisão vertical (um dev dono da feature de ponta a ponta) considera a linguagem do serviço tocado.

**Alocação de stack por serviço** — **decidida pela equipe em 02/09/2026**: `identidade` e `social` em **Spring (Java)**; `acervo` e `leitura` em **NestJS (TypeScript)**. Segue a recomendação de manter `acervo` e `leitura` na mesma stack, por serem os dois que mais trocam dados (nota agregada). A arquitetura não depende de qual serviço fica em qual stack; cada serviço declara a sua no respectivo `AGENTS.md`.

### 2.2 P-12 — Decomposição em microsserviços e estratégia de banco

Esta é a decisão estruturante e está detalhada na **§3** (serviços) e **§4** (dados). Resumo:

- **Quatro serviços:** `identidade`, `acervo`, `leitura`, `social`.
- **Banco único PostgreSQL no Neon**, com **um schema por serviço**. Separação **lógica**, não física.
- **Firebase é usado exclusivamente para FCM** (P-04). Nenhum dado de domínio vive no Firestore.

O acervo permanece no PostgreSQL — e não em banco de documentos — porque é o serviço **mais dependente de busca e filtro relacional** de todo o sistema (RF-ACV-01/02/03, RNF-DES-03), e porque a recomendação algorítmica (§10.7 do `REQUISITOS.md`) é especificada como junção entre estante, nota, seguidor e assunto, o que exige um mesmo mecanismo relacional. Ver §4.

### 2.3 P-06 — Broker de mensageria: RabbitMQ

**Decisão.** **RabbitMQ**, hospedado no **CloudAMQP** (plano gratuito *Little Lemur*).

**Justificativa.** Atende aos três critérios de `REQUISITOS.md` §7.2: plano gratuito permanente, suporte nativo a *dead-letter queue* (via dead-letter exchange, RNF-ERR-07) e cliente maduro nas duas linguagens (Spring AMQP no Java, `amqplib` no Node). É também o broker que melhor evidencia, para a disciplina, os requisitos de retentativa com backoff, idempotência e DLQ (RNF-ERR-03/06/07).

**Consequências aceitas.**

- O plano gratuito do CloudAMQP limita conexões simultâneas (na ordem de 20) e mensagens/mês. Com quatro serviços, cada um mantém **uma conexão e vários channels**, em vez de conexão por consumidor. É um risco de capacidade registrado, mitigável dentro do free tier no volume de uma demo.
- Todo consumidor é idempotente (RNF-ERR-06) e tolera entrega duplicada; mensagem que falhar após o máximo de tentativas vai para DLQ sem bloquear a fila principal (RNF-ERR-07).

### 2.4 P-08 — Agendador de jobs: GitHub Actions (`schedule`)

**Decisão.** **GitHub Actions com `schedule`** como agendador dos jobs diários. Fallback: **cron-job.org**.

**Justificativa.** Os Cron Jobs do Render são pagos e indisponíveis no free tier. O GitHub Actions já existe no repositório, é versionado e auditável, e o `schedule` cobre os jobs diários de verificação de inatividade de leituras (RN-05, RF-EST-11/12) e exclusão definitiva de contas após 30 dias (RN-23), tolerantes a imprecisão de horário. O job dispara uma chamada autenticada ao serviço responsável. O delta automático do acervo foi retirado do escopo nesta revisão; carga inicial e recarga manual continuam como script.

**Consequências aceitas / riscos.**

- O `schedule` do GitHub Actions só roda na branch default, pode atrasar alguns minutos em horário de pico e é **desativado automaticamente após ~60 dias de inatividade do repositório** — irrelevante durante o desenvolvimento ativo, mas a verificar antes da apresentação.
- **A viabilidade no repositório da faculdade (GitHub Classroom) não está confirmada.** Deve ser testada no **período-0**, não depois. Se as Actions estiverem restritas, migra-se para o cron-job.org sem mudança de desenho — o job continua sendo uma chamada HTTP a um endpoint.

### 2.5 P-09 — Armazenamento e transformação de imagens: Cloudinary

**Decisão.** **Cloudinary** para avatares, capas de livros pessoais e **cache de capas de livros oficiais** (RN-14).

**Justificativa.** O fator decisivo é a **transformação de imagem sob demanda pela URL**. São necessárias miniaturas de avatar em três tamanhos e de capa em dois; sem transformação no provedor, esse redimensionamento viraria código de processamento de imagem rodando no container Render de 512 MB — o pior lugar para isso. O caso do cache de capas (RN-14) reforça a escolha: quando um livro oficial entra na estante de alguém, sua capa do OpenLibrary é baixada para o Cloudinary e passa a ser servida do domínio próprio nos tamanhos certos, garantindo justamente as capas de fato acessadas contra *link rot* na origem. O *unsigned upload preset* ainda permite ao cliente Flutter enviar avatar/capa pessoal direto ao Cloudinary, sem trafegar os bytes pela API.

**Consequências aceitas.**

- O *upload preset* sem restrição é vetor de abuso: a pasta de destino, os tipos permitidos e o tamanho máximo são fixados **no próprio preset**, somados à validação de tipo real, tamanho e dimensões no servidor (RNF-SEC-20).
- Os limites vigentes do plano gratuito devem ser confirmados no período-0. Cloudflare R2 foi descartado como equivalente porque é storage puro, sem transformação nativa — resolveria o armazenamento, mas não a razão pela qual o Cloudinary foi escolhido.

### 2.6 P-02 — E-mail transacional: Brevo

**Decisão.** **Brevo** para o e-mail transacional de recuperação de senha (RF-AUT-04).

**Justificativa.** O free tier de 300 e-mails/dia é folgado para o único fluxo transacional do sistema. Oferece API e SMTP, e o volume esperado (reset de senha) é baixo. O envio de e-mail permanece fluxo assíncrono candidato (§7.2 do `REQUISITOS.md`); seu processamento assíncrono ainda não está definido nem implementado.

**Consequências aceitas.**

- Requer verificação de remetente/domínio, fricção comum a todos os provedores. Como o trabalho não tem domínio próprio garantido, o remetente verificado do Brevo é usado; a mensagem deixa claro o nome da aplicação.
- O token de reset segue RNF-SEC-10: aleatório criptográfico, uso único, validade de 1 hora, armazenado como hash.

### 2.7 P-04 — Push notifications: FCM (Android), in-app (iOS)

**Decisão.** **Firebase Cloud Messaging (FCM)** para push em **Android**, via `firebase_messaging`. Em **iOS**, apenas **notificações in-app**. Firebase é usado **somente** para FCM.

**Justificativa.** Push em iOS exige conta paga no Apple Developer Program para emitir a chave APNs; restringir push a Android evita esse custo sem perda de escopo Essencial, já que RF-NOT-07 (push) e RF-GAM-05 (lembrete de streak, que depende de push) são **Opcionais**. O sistema base de notificações é in-app (RF-NOT-01, Essencial) e vale para as duas plataformas. Push é apenas um **consumidor adicional** do fluxo assíncrono de notificações já definido em §7.2 — não exige remodelagem do backend.

**Consequências aceitas.**

- **A demonstração de push deve ocorrer em Android.** Em iOS, o usuário recebe as mesmas notificações pela lista in-app (RF-NOT-02), sem entrega em segundo plano.
- Ter um projeto Firebase para o FCM **não** implica usar Firestore, Auth ou qualquer outro produto Firebase. O escopo do Firebase no sistema é a emissão de push, e nada mais.

---

## 3. Decomposição em serviços

### 3.1 Divisão proposta

| Serviço | Domínio | Requisitos |
|---|---|---|
| **identidade** | Usuário, autenticação, perfil, privacidade, seguidores, solicitações | AUT, SOC-01 a 08 |
| **acervo** | Livro, autor, editora, série, busca, ingestão, sinopse, capas, nota agregada | ACV |
| **leitura** | Estante, leitura, progresso, sessão, nota, resenha (com curtidas), frases, desafios, streak, estatísticas, histórico | EST, PRG, AVA, DSF, STA, GAM |
| **social** | Feed, atividades, curtidas de atividade, comentários, listas, recomendações, notificações, moderação | SOC-09 a 15, LST, REC, NOT, MOD |

`leitura` é o maior serviço, mas é o núcleo do produto e tudo ali gira em torno da mesma agregação (usuário + livro + leitura). Separar progresso de desafios criaria chamada síncrona entre serviços no caminho mais crítico do app, e por isso é mantido inteiro.

### 3.2 Ajustes de fronteira sobre o anexo original

Quatro pontos de acoplamento que a divisão deixa implícitos são fechados aqui:

1. **Curtida/descurtida de resenha fica em `leitura`, junto da resenha** (RF-AVA-05, RF-AVA-08) — não em `social`. A resenha mora em `leitura`; manter o contador transacional com ela evita compor "resenha + contagem" entre dois serviços em toda página de livro. `social` fica com a curtida de **atividade do feed** (RF-SOC-11), que é sua de fato.
2. **A nota dos leitores (agregada) é uma projeção em `acervo`**, alimentada pelo evento `nota.alterada` e passível de implementação como *materialized view* sobre dados locais dessa projeção. A página do livro lê a média localmente, sem acessar a tabela privada `leitura.nota` nem fazer chamada síncrona a `leitura` no caminho crítico.
3. **A recomendação algorítmica é hospedada em `social`** (§10.7 do `REQUISITOS.md`), lendo *views* expostas por `leitura` (estante, nota), `identidade` (seguir) e `acervo` (assunto). É onde já vivem as recomendações P2P e o feed.
4. **O feed guarda snapshot no evento de atividade** — nome do usuário, título e capa do livro no momento — em vez de hidratar por *join* a cada scroll. O feed é o caminho mais lido do app e não deve compor três serviços por requisição, ainda mais com o *cold start* do Render.

**Livro pessoal** permanece em `acervo` (é um "livro", com edição e página próprias), mas com trava explícita: fora dos índices de busca e das páginas de autor/editora/série (RNF-SEC-06), com verificação de dono e de privacidade do perfil do dono a cada acesso (RN-15).

### 3.3 Por que quatro, e não mais

O plano gratuito do Render **hiberna cada serviço após ~15 min de inatividade**, e a primeira chamada seguinte leva 30–60 s (tratado em RNF-ERR-09). Quatro serviços dormindo já é o teto razoável para uma demonstração; um quinto serviço (por exemplo, separar avaliação/conteúdo de `leitura`) só multiplicaria pontos de *cold start* sem ganho de coesão. A decomposição é mantida em quatro.

---

## 4. Estratégia de dados

### 4.1 Banco único, schema por serviço

A persistência usa **um projeto PostgreSQL no Neon** (RNF-ARQ-07), com **um schema por serviço**: `identidade`, `acervo`, `leitura`, `social`. A separação é **lógica**, não física — todos os schemas vivem no mesmo cluster.

Essa escolha preserva o encapsulamento de microsserviço **e** mantém possíveis as junções que os requisitos assumem (recomendação, nota agregada), que seriam inviáveis se os dados estivessem em bancos de paradigmas diferentes. É também o que respeita o teto de armazenamento do plano gratuito (RNF-DES-04): o acervo não deve consumir mais de 20% do limite, com o índice de busca dimensionado como custo dominante (RNF-DES-05).

### 4.2 Regra de acesso entre schemas

A separação lógica só se sustenta com uma disciplina de acesso:

> **Nenhum serviço lê a tabela crua de outro schema.** Leitura entre schemas ocorre exclusivamente por **VIEW que o serviço dono expõe e mantém como contrato** — estável e versionada junto do spec OpenAPI. A tabela é privada; a view é pública.

Sem essa regra, o schema por serviço degenera em banco compartilhado e a divisão em microsserviços perde o sentido. Com ela, o encapsulamento é preservado e os *joins* legítimos continuam possíveis dentro do mesmo cluster.

### 4.3 Escritas e concorrência

- Escritas concorrentes sobre a mesma entidade são resolvidas por controle de concorrência no banco, sem perda de dados (RNF-ARQ-05).
- Operações de escrita aceitam **chave de idempotência** (RNF-ERR-04); retentativa não duplica registro.
- Cada serviço só cria migration das tabelas do **seu** schema; migration é revisada por humano antes de subir (plano §5).
- Acesso sempre por consultas parametrizadas ou ORM (RNF-SEC-12).
- Cada schema produtor mantém uma **outbox transacional**. A alteração de domínio e o evento são gravados na mesma transação; um dispatcher publica com confirmação do broker e retry, fechando RNF-ERR-10 sem transformar falha de publicação em falha da operação síncrona.

**Decisões de dados incorporadas em 15/09/2026:** `leitura` persiste instante/fuso/data local da ação de finalizar separadamente da data de fim editável. Janelas de desafio guardam configuração histórica e pausas são retidas para recálculo por captura offline. Edição/exclusão de progresso seguem RN-17 e recalculam efeitos no próprio serviço, sem novo serviço ou evento de broker apenas para comunicação interna. Eventos de progresso acionam leitura do estado atual do fato, evitando reaplicar payload anterior à sua correção/exclusão. Retenção de registros técnicos/auditoria é indeterminada após anonimização de RN-23; validade de tokens e replay HTTP não são estendidos.

**Visibilidade e recomendação:** contratos de identidade permitem revalidar suspensão, exclusão pendente e opt-out. Serviços ocultam conteúdo de conta suspensa em toda superfície, inclusive snapshots e notificações; a consulta administrativa autorizada ocorre pelo serviço dono, sem expor dados suspensos nas VIEWs públicas. Reativação restaura a visibilidade sob RN-08. O opt-out afeta apenas o uso das leituras como sinal para outras pessoas.

### 4.4 Firebase

Fora do PostgreSQL, o sistema usa o **Firebase apenas para FCM** (§2.7). Nenhuma entidade de domínio é persistida no Firestore ou em qualquer outro produto Firebase.

---

## 5. Comunicação e mensageria

### 5.1 Síncrono

Os clientes consomem os serviços por **HTTP/JSON**. Cada serviço publica seu contrato em **OpenAPI** (RNF-ARQ-03), versionado em `docs/api/<servico>.yaml` e agregado num Swagger UI único (plano §8). Operações que confirmam ao autor — status na estante, progresso, nota, resenha — são **síncronas**; o evento é publicado **depois** da escrita confirmada (§7.2 do `REQUISITOS.md`).

### 5.2 Assíncrono (RabbitMQ)

Os fluxos assíncronos de `REQUISITOS.md` §7.2 e seus serviços produtores/consumidores:

| Fluxo | Evento(s) | Produtor | Consumidor |
|---|---|---|---|
| **Notificações in-app** | `seguidor.novo`, `solicitacao.*`, `atividade.curtida`, `atividade.comentada`, `comentario.respondido`, `usuario.mencionado`, `resenha.curtida`, `leitura.em_risco`, `leitura.expirada` | identidade, leitura, social | social (+ FCM em Android) |
| **Expiração de leituras** | `leitura.em_risco`, `leitura.expirada` | leitura (job diário) | social |
| **Ingestão de livros** | `livro.importacao_solicitada` | acervo | acervo |
| **Cache de capas e remoção de recomendações** | `livro.adicionado_a_estante` | leitura | acervo, social |
| **Busca de sinopse** | `livro.pagina_aberta` | acervo | acervo |
| **Nota agregada** (§3.2) | `nota.alterada` | leitura | acervo |
| **Atividades do feed** | `leitura.iniciada`, `leitura.retomada`, `leitura.finalizada`, `leitura.abandonada`, `resenha.publicada`, `resenha.excluida` | leitura | social |
| **Estatísticas, desafios e streak** | `progresso.registrado`, `leitura.finalizada` | leitura | leitura |
| **Exclusão definitiva de conta** | `conta.excluida` | identidade | leitura, social, acervo |
| **Recomendação recebida** | `recomendacao.recebida` | social | social |

`livro.adicionado_a_estante` passa a ter dois consumidores: `acervo`, para cache de capa, e `social`, para remover recomendações recebidas do livro.

Todo consumidor é idempotente e tolera duplicação (RNF-ERR-06); falha após o máximo de tentativas vai para DLQ (RNF-ERR-07). Mensagens são validadas por schema antes do processamento (RNF-SEC-32).

Filas duráveis, *publisher confirms* e DLQ protegem mensagens já recebidas pelo broker. A janela anterior ao broker é coberta pela outbox transacional: o evento permanece no PostgreSQL até a confirmação da publicação, com retry seguro e observável.

### 5.3 Resiliência

Timeout e retentativa com backoff em toda chamada externa, com circuit breaker (RNF-ERR-03/08); fila offline no cliente móvel para registros de progresso (RNF-ERR-05), preservando a captura original para recompor desafios e streak, inclusive períodos encerrados; tratamento explícito da hibernação do Render, com estado de carregamento prolongado na primeira chamada (RNF-ERR-09).

---

## 6. Infraestrutura e implantação

| Componente | Provedor | Plano | Observação |
|---|---|---|---|
| Serviços de backend (×4) | Render | gratuito | hibernam após ~15 min; *cold start* tratado em RNF-ERR-09 |
| Site estático (web Vue) | Render | gratuito | build da SPA |
| Banco de dados | Neon (PostgreSQL) | gratuito | um projeto, schema por serviço, branch única de DES/HML (sem branch por dev) |
| Mensageria | CloudAMQP (RabbitMQ) | gratuito | limite de conexões — uma por serviço |
| Imagens | Cloudinary | gratuito | transformação por URL + cache de capas |
| E-mail transacional | Brevo | gratuito | 300 e-mails/dia |
| Push (Android) | Firebase Cloud Messaging | gratuito | somente FCM |
| Agendador de jobs | GitHub Actions (`schedule`) | gratuito | fallback cron-job.org; validar no repo da faculdade |
| CI/CD | GitHub Actions | gratuito | lint, build, testes, deploy a partir de `main` |

Ambientes conforme o plano §4: local (Postgres local), DES/HML (branch `main`, deploy a cada merge), PROD (tag `vX.Y.Z`, a partir de 24/11). Deploy só a partir de código versionado, por pipeline automatizado (RNF-SEC-34). Segredos por variável de ambiente e GitHub Secrets, nunca versionados (RNF-SEC-11).

---

## 7. Transversais (aplicados nos quatro serviços)

- **Segurança:** controle de acesso validado no servidor em todo recurso protegido (RNF-SEC-01 a 07); HTTPS/TLS (RNF-SEC-08); senhas com Argon2/bcrypt/scrypt (RNF-SEC-09); tokens de acesso curtos e renovação revogável (RNF-SEC-30); rate limiting em auth e ações sociais (RNF-SEC-17/18); CORS restrito às origens conhecidas (RNF-SEC-21); validação por schema de toda entrada (RNF-SEC-13); proteção contra IDOR por identificador não sequencial (RNF-SEC-05).
- **Observabilidade:** log estruturado com `correlation-id` propagado entre serviços e mensagens (RNF-OBS-01); health check por serviço (RNF-OBS-02); log de falhas de auth, autorização e ações de moderação (RNF-SEC-35).
- **Erros:** corpo de erro padronizado com código interno, mensagem exibível e id de correlação (RNF-ERR-01); códigos HTTP semânticos; mensagens em pt-BR sem detalhe técnico (RNF-USA-05).
- **Testes:** unitários das regras de negócio, com prioridade obrigatória para a máquina de estados de leitura (RN-04), a regra de inatividade (RN-05) e o controle de acesso a perfil privado (RN-08); integração com banco real; testes dos fluxos assíncronos incluindo idempotência e DLQ (RNF-TST-01 a 08).

---

## 8. Rastreabilidade das pendências

| Pendência | Decisão | Requisitos afetados | Seção |
|---|---|---|---|
| P-11 | Spring + NestJS; identidade/social em Spring, acervo/leitura em NestJS (02/09/2026) | RNF-ARQ-02 | §2.1 |
| P-12 | 4 serviços; PostgreSQL/Neon, schema por serviço | RNF-ARQ-02, RNF-ARQ-07 | §2.2, §3, §4 |
| P-06 | RabbitMQ (CloudAMQP) | §7.2, RNF-ARQ-06 | §2.3, §5.2 |
| P-08 | GitHub Actions `schedule` (fallback cron-job.org) | RNF-ARQ-09, RF-EST-11/12, RN-23 | §2.4 |
| P-09 | Cloudinary | RF-ACV-08, RF-ACV-17, RF-SOC-01, RN-14 | §2.5 |
| P-02 | Brevo | RF-AUT-04 | §2.6 |
| P-04 | FCM (Android) + in-app (iOS) | RF-NOT-07 | §2.7 |

Nenhuma decisão remove requisito do escopo. As duas que o `REQUISITOS.md` marcava como capazes de retornar por controle de mudança — P-04 e P-09 — foram resolvidas **dentro** do escopo: push restrito a Android mantém RF-NOT-07 (Opcional), e o Cloudinary atende RF-ACV-08/17 e RF-SOC-01.

### Itens a validar ou decidir no período-0

- Viabilidade do GitHub Actions `schedule` no repositório do GitHub Classroom (P-08).
- Limites vigentes dos planos gratuitos de Cloudinary, CloudAMQP, Brevo e Neon.
- Emissão de push FCM em dispositivo Android real de demonstração (P-04).
