# Documento de Arquitetura de Software

**Versão:** v1.8 — 25/10/2026
**Status:** macroarquitetura fechada — alocação de stack por serviço decidida em 02/09/2026 (§2.1); Período 2 implementado em `desenvolvimento`

> **v1.4 (12/09/2026):** ambiente local passa a usar **Postgres local** — **removida a branch de banco por dev no Neon** (o Neon mantém só a branch de DES/HML). Decisão da equipe; reflexo em §6 e no plano §4.

> **v1.5 (15/09/2026):** decisões do grupo registradas em `REQUISITOS.md` v1.5: delta automático do acervo removido, projeções corrigíveis por sincronização offline, retenção de configurações/pausas de desafio, suspensão com ocultação e retenção técnica anonimizada sem prazo. Sem mudança de stacks ou fronteiras dos serviços.

> **v1.6 (17/09/2026):** contratos executáveis do Período 1 consolidados: quatro OpenAPI com estado por operação, envelope/eventos em `docs/mensageria/`, topologia RabbitMQ, recibo transacional, retry/DLQ e baseline física de 59 tabelas/9 VIEWs. Sem mudança de requisito, stack ou fronteira de serviço.

> **v1.7 (25/09/2026):** banco e broker separados por ambiente, revisando a v1.4.
> - **DES/HML:** passa a ter projeto Neon e instância CloudAMQP próprios em **Oregon** (`aws-us-west-2`), a mesma região do Render. Com o banco em São Paulo, cada consulta do DES pagava cerca de 170 ms de ida e volta (RNF-DES-01).
> - **Desenvolvimento:** usa o projeto e a instância de **São Paulo**.
> - **Sem replicação** entre os dois. Reflexo em §1, §4.1 e §6 e no plano §4.
> - Autorizado pelo dono de P0-DEPLOY. Sem mudança de requisito, stack ou fronteira de serviço.

> **v1.8 (25/10/2026):** atualização de fechamento do Período 2, que registra o que as features construíram e decidiram.
> - **Contratos:** 117 operações HTTP, todas implementadas; 26 JSON Schemas; 11 filas de negócio; 62 tabelas e 10 VIEWs (§4.1, §5).
> - **Primeira chamada síncrona entre serviços:** `social` → `leitura` na moderação, com segredo de serviço (§3.2, §5.1).
> - **Tempo real das notificações** por SSE no `social` (§5.1).
> - **Nota dos leitores** calculada sobre a projeção individual (§3.2).
> - **Provedores:** cache de capas por upload assinado e pasta por ambiente (§2.5); e-mail do Brevo implementado (§2.6); push FCM ainda não implementado, previsto no Período 3 (§2.7).
> - **Agendador:** viabilidade do `schedule` confirmada na prática (§2.4).
> - Autorizado pelo Renato Douglas. Sem mudança de requisito, stack ou fronteira de serviço; as divergências que pedem decisão do grupo estão na §8.

> Este documento descreve **como o sistema é construído**. O *o que* mora em `docs/orquestador/REQUISITOS.md`, que continua sendo a fonte de verdade. Em caso de conflito, o `REQUISITOS.md` vence, e a divergência segue o controle de mudança do `docs/orquestador/plano-de-projeto.md` §3.

---

## 1. Visão geral da arquitetura

O sistema é um backend de **microsserviços** (RNF-ARQ-02) consumido por HTTP/JSON (RNF-ARQ-01) por dois clientes independentes: o aplicativo móvel em Flutter (produto principal) e a SPA web em Vue + Tailwind (subconjunto). Não há paridade funcional entre os clientes; o corte de escopo recai sobre a web antes do mobile.

São **quatro serviços de backend** — `identidade`, `acervo`, `leitura` e `social` —, um **broker de mensageria** para os fluxos assíncronos (RNF-ARQ-06), um **banco PostgreSQL único no Neon** por ambiente, com separação lógica por schema (RNF-ARQ-07), e um conjunto de **serviços de apoio gratuitos** (e-mail, imagens, agendador e, a partir do Período 3, push). Todos os serviços e o site estático são hospedados no Render em plano gratuito (RNF-ARQ-08).

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
- **Banco único PostgreSQL no Neon** por ambiente, com **um schema por serviço**. Separação **lógica**, não física.
- **Firebase é usado exclusivamente para FCM** (P-04). Nenhum dado de domínio vive no Firestore.

O acervo permanece no PostgreSQL — e não em banco de documentos — porque é o serviço **mais dependente de busca e filtro relacional** de todo o sistema (RF-ACV-01/02/03, RNF-DES-03), e porque a recomendação algorítmica (§10.7 do `REQUISITOS.md`) é especificada como junção entre estante, nota, seguidor e assunto, o que exige um mesmo mecanismo relacional. Ver §4.

### 2.3 P-06 — Broker de mensageria: RabbitMQ

**Decisão.** **RabbitMQ**, hospedado no **CloudAMQP** (plano gratuito *Little Lemur*).

**Justificativa.** Atende aos três critérios de `REQUISITOS.md` §7.2: plano gratuito permanente, suporte nativo a *dead-letter queue* (via dead-letter exchange, RNF-ERR-07) e cliente maduro nas duas linguagens (Spring AMQP no Java, `amqplib` no Node). É também o broker que melhor evidencia, para a disciplina, os requisitos de retentativa com backoff, idempotência e DLQ (RNF-ERR-03/06/07).

**Consequências aceitas.**

- O plano gratuito do CloudAMQP limita conexões simultâneas (na ordem de 20) e mensagens/mês. Com quatro serviços, cada um mantém **uma conexão e vários channels**, em vez de conexão por consumidor. É um risco de capacidade registrado, mitigável dentro do free tier no volume de uma demo.
- Todo consumidor é idempotente (RNF-ERR-06) e tolera entrega duplicada; mensagem que falhar após o máximo de tentativas vai para DLQ sem bloquear a fila principal (RNF-ERR-07).
- `identidade` e `social` usam `spring-boot-starter-amqp` e `networknt json-schema-validator`; `acervo` e `leitura` usam `amqplib`, `ajv` e `ajv-formats`. Os contratos permanecem JSON Schema neutro, sem pacote compartilhado entre stacks.
- `AMQP_ENABLED=false` permite subir local/teste sem broker; quando habilitado, `AMQP_URL` é obrigatório. Indisponibilidade do broker não desfaz operação síncrona já confirmada nem torna `/health` indisponível se API e banco estiverem saudáveis; a outbox preserva a publicação pendente.

### 2.4 P-08 — Agendador de jobs: GitHub Actions (`schedule`)

**Decisão.** **GitHub Actions com `schedule`** como agendador dos jobs diários. Fallback: **cron-job.org**.

**Justificativa.** Os Cron Jobs do Render são pagos e indisponíveis no free tier. O GitHub Actions já existe no repositório, é versionado e auditável, e o `schedule` cobre os jobs diários de verificação de inatividade de leituras (RN-05, RF-EST-11/12) e exclusão definitiva de contas após 30 dias (RN-23), tolerantes a imprecisão de horário. O job dispara uma chamada autenticada ao serviço responsável. O delta automático do acervo foi retirado do escopo nesta revisão; carga inicial e recarga manual continuam como script.

**Consequências aceitas / riscos.**

- O `schedule` do GitHub Actions só roda na branch default, pode atrasar (neste repositório, horas; ver abaixo) e é **desativado automaticamente após ~60 dias de inatividade do repositório** — irrelevante durante o desenvolvimento ativo, mas a verificar antes da apresentação.
- **A viabilidade no repositório da faculdade está confirmada na prática:** o `job-inatividade.yml` roda pelo `schedule` todo dia desde 30/09/2026, com sucesso. O atraso real ficou entre 4h18 e 8h44 sobre o cron das 06:00 UTC, tolerável para jobs diários. Se as Actions forem restritas, migra-se para o cron-job.org sem mudança de desenho — o job continua sendo uma chamada HTTP a um endpoint.

**Jobs existentes (25/10/2026).**

| Workflow | Chama | Dono |
|---|---|---|
| `job-inatividade.yml` | `POST /internal/jobs/inatividade` | `leitura` (RN-05) |
| `job-exclusao-conta.yml` | `POST /internal/jobs/exclusao-conta` | `identidade` (RN-23) |

Os dois autenticam com o segredo do agendador no header `X-Scheduler-Token`, comparado em tempo constante, e mandam `Idempotency-Key`. O `job-exclusao-conta.yml` só passa a rodar quando chegar à `main`.

**Exceção registrada:** a limpeza diária das recomendações vencidas (F-REC-P2P) é um `@Scheduled` dentro do `social`, às 04:30, e não um job do GitHub Actions. No Render gratuito, ela só roda se o serviço estiver acordado nesse horário. Ver §8.

### 2.5 P-09 — Armazenamento e transformação de imagens: Cloudinary

**Decisão.** **Cloudinary** para avatares, capas de livros pessoais e **cache de capas de livros oficiais** (RN-14).

**Justificativa.** O fator decisivo é a **transformação de imagem sob demanda pela URL**. São necessárias miniaturas de avatar em três tamanhos e de capa em dois; sem transformação no provedor, esse redimensionamento viraria código de processamento de imagem rodando no container Render de 512 MB — o pior lugar para isso. O caso do cache de capas (RN-14) reforça a escolha: quando um livro oficial entra na estante de alguém, sua capa do OpenLibrary é baixada para o Cloudinary e passa a ser servida do domínio próprio nos tamanhos certos, garantindo justamente as capas de fato acessadas contra *link rot* na origem. O *unsigned upload preset* ainda permite ao cliente Flutter enviar avatar/capa pessoal direto ao Cloudinary, sem trafegar os bytes pela API.

**Consequências aceitas.**

- O *upload preset* sem restrição é vetor de abuso: a pasta de destino, os tipos permitidos e o tamanho máximo são fixados **no próprio preset**, somados à validação de tipo real, tamanho e dimensões no servidor (RNF-SEC-20).
- Os limites vigentes do plano gratuito devem ser confirmados no período-0 (ainda em aberto em 25/10/2026, §8). Cloudflare R2 foi descartado como equivalente porque é storage puro, sem transformação nativa — resolveria o armazenamento, mas não a razão pela qual o Cloudinary foi escolhido.

**Como ficou implementado (25/10/2026).** Dev e DES usam o mesmo cloud.

| Uso | Quem envia | Como |
|---|---|---|
| Avatar | cliente | preset *unsigned* `leai_avatares`; o `identidade` valida a origem da URL (host, cloud, pasta e `publicId`) sem baixar a imagem |
| Capa de livro pessoal | cliente | preset *unsigned* `leai_capas`; o `acervo` valida a URL |
| Cache de capa oficial (RN-14) | `acervo` | upload **assinado** pelo servidor, ao consumir `livro.adicionado_a_estante` e `leitura.iniciada`, com `backfill:capas`; pasta por ambiente (`capas-oficiais-dev` e `capas-oficiais`), porque os dois ambientes compartilham o cloud e os ids de livro |
| Remoção na exclusão de conta | `identidade` e `acervo` | `destroy` assinado do avatar e das capas pessoais; a falha só vai para o log |

No `leai_capas`, a pasta é dinâmica (`asset_folder`): não entra no `public_id` nem na URL. No `leai_avatares`, o `public_id` leva o prefixo `avatares/`, e o `identidade` recusa a URL sem ele. Nos dois presets, o servidor valida só a origem da URL, sem baixar a imagem: tipo e tamanho ficam limitados pelo preset. Só o cache de capa oficial confere os bytes no servidor (§8). As credenciais de API (`CLOUDINARY_API_KEY`/`SECRET`) existem só no `identidade` e no `acervo`; sem elas, a fila de cache de capas não é declarada, e o `backfill:capas` recupera o que ficou para trás.

### 2.6 P-02 — E-mail transacional: Brevo

**Decisão.** **Brevo** para o e-mail transacional de recuperação de senha (RF-AUT-04).

**Justificativa.** O free tier de 300 e-mails/dia é folgado para o único fluxo transacional do sistema. Oferece API e SMTP, e o volume esperado (reset de senha) é baixo. O envio de e-mail permanece fluxo assíncrono candidato (§7.2 do `REQUISITOS.md`). Na F-AUT ele foi implementado no `identidade` como envio assíncrono **em processo**, pela API transacional do Brevo: 3 tentativas, com backoff de 2 s e 8 s e disjuntor, sem evento e sem outbox. Não é durável: um e-mail em tentativa se perde se o serviço reiniciar. A prova de envio real em DES continua pendente.

**Consequências aceitas.**

- Requer verificação de remetente/domínio, fricção comum a todos os provedores. Como o trabalho não tem domínio próprio garantido, o remetente verificado do Brevo é usado; a mensagem deixa claro o nome da aplicação.
- O token de reset segue RNF-SEC-10: aleatório criptográfico, uso único, validade de 1 hora, armazenado como hash.

### 2.7 P-04 — Push notifications: FCM (Android), in-app (iOS)

**Decisão.** **Firebase Cloud Messaging (FCM)** para push em **Android**, via `firebase_messaging`. Em **iOS**, apenas **notificações in-app**. Firebase é usado **somente** para FCM.

**Justificativa.** Push em iOS exige conta paga no Apple Developer Program para emitir a chave APNs; restringir push a Android evita esse custo sem perda de escopo Essencial, já que RF-NOT-07 (push) e RF-GAM-05 (lembrete de streak, que depende de push) são **Opcionais**. O sistema base de notificações é in-app (RF-NOT-01, Essencial) e vale para as duas plataformas. Push é apenas um **consumidor adicional** do fluxo assíncrono de notificações já definido em §7.2 — não exige remodelagem do backend.

**Consequências aceitas.**

- **A demonstração de push deve ocorrer em Android.** Em iOS, o usuário recebe as mesmas notificações pela lista in-app (RF-NOT-02), sem entrega em segundo plano.
- Ter um projeto Firebase para o FCM **não** implica usar Firestore, Auth ou qualquer outro produto Firebase. O escopo do Firebase no sistema é a emissão de push, e nada mais.

**Situação em 25/10/2026:** o FCM ainda não está implementado. Existe só a tabela `social.dispositivo_push` da baseline, e o push entra com a F-NOT-OPC no Período 3. Enquanto isso, a entrega em tempo real das notificações in-app é feita por SSE (§5.1), nas duas plataformas, com o app aberto.

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

Cinco pontos de acoplamento que a divisão deixa implícitos são fechados aqui:

1. **Curtida/descurtida de resenha fica em `leitura`, junto da resenha** (RF-AVA-05, RF-AVA-08) — não em `social`. A resenha mora em `leitura`; manter o contador transacional com ela evita compor "resenha + contagem" entre dois serviços em toda página de livro. `social` fica com a curtida de **atividade do feed** (RF-SOC-11), que é sua de fato.
2. **A nota dos leitores (agregada) é uma projeção em `acervo`**, alimentada pelo evento `nota.alterada`. A página do livro lê a média localmente, sem acessar a tabela privada `leitura.nota` nem fazer chamada síncrona a `leitura` no caminho crítico. Como ficou na F-ACV-NOTA:
   - o consumidor usa o evento só como aviso: trava o livro com `pg_advisory_xact_lock`, relê a nota atual em `leitura.v_nota_publicacao_v1` e grava a projeção individual (`nota_leitor_projecao`) e o agregado (`nota_livro_agregada`). O `backfill:notas` e o consumidor de `conta.excluida` usam a mesma trava;
   - a página calcula média, contagem e distribuição sobre a projeção individual, numa consulta só, para arredondar uma vez. O agregado continua mantido, como contrato da F-CONTA-2, mas a página não o lê;
   - a consistência é eventual: com as retentativas do consumidor, a nota pode levar uns 22 s para aparecer, e os clientes reconsultam em silêncio depois da escrita.
3. **A recomendação algorítmica é hospedada em `social`** (§10.7 do `REQUISITOS.md`), lendo *views* expostas por `leitura` (estante, nota), `identidade` (seguir) e `acervo` (assunto). É onde já vivem as recomendações P2P e o feed. A algorítmica é do Período 3 (F-REC-ALG) e ainda não existe; só a P2P está implementada.
4. **O feed guarda snapshot no evento de atividade** — nome do usuário, título e capa do livro no momento — em vez de hidratar por *join* a cada scroll. O feed é o caminho mais lido do app e não deve compor três serviços por requisição, ainda mais com o *cold start* do Render. **Divergência registrada na F-AVA, pendente de decisão do grupo:** o feed lê `leitura.v_resenha_publicacao_v1` e `leitura.v_nota_publicacao_v1` para mostrar a resenha e a nota atuais.
5. **A moderação remove conteúdo de `leitura` por chamada síncrona do `social`** (F-MOD). A denúncia e o painel vivem no `social`, mas a resenha e a frase são do `leitura`. O `social` chama `POST /internal/moderacao/{resenhas|frases}/{id}/remocao` no `leitura`, e o `leitura` publica `resenha.excluida` pela própria outbox. Foi escolhido HTTP direto, e não evento ou saga, porque o administrador precisa da confirmação da remoção. É a **única chamada síncrona entre serviços** do sistema (§5.1).

**Livro pessoal** permanece em `acervo` (é um "livro", com edição e página próprias), mas com trava explícita: fora dos índices de busca e das páginas de autor/editora/série (RNF-SEC-06), com verificação de dono e de privacidade do perfil do dono a cada acesso (RN-15).

### 3.3 Por que quatro, e não mais

O plano gratuito do Render **hiberna cada serviço após ~15 min de inatividade**, e a primeira chamada seguinte leva de 30 s a quase 3 min (tratado em RNF-ERR-09). Em DES foram medidos cerca de 165 s no `identidade` e de 50 a 100 s no `leitura`. Quatro serviços dormindo já é o teto razoável para uma demonstração; um quinto serviço (por exemplo, separar avaliação/conteúdo de `leitura`) só multiplicaria pontos de *cold start* sem ganho de coesão. A decomposição é mantida em quatro.

---

## 4. Estratégia de dados

### 4.1 Banco único, schema por serviço

A persistência usa, em cada ambiente, **um projeto PostgreSQL no Neon** (RNF-ARQ-07), com **um schema por serviço**: `identidade`, `acervo`, `leitura`, `social`. A separação é **lógica**, não física — todos os schemas de um ambiente vivem no mesmo cluster. Os ambientes de desenvolvimento e DES/HML têm projetos distintos e não replicados (§6).

A baseline física foi aplicada no Neon em 16/09/2026, com **59 tabelas de domínio e 9 VIEWs de contrato**. Flyway versiona `identidade`/`social`; Drizzle versiona `acervo`/`leitura`. Essa implantação não declara as features funcionais: código de domínio, clientes e mensageria seguem os status dos respectivos arquivos de feature.

**Situação em 25/10/2026: 62 tabelas e 10 VIEWs.** Sobre a baseline entraram as quatro tabelas de recibo `mensagem_processada` (P0-MSG), a `acervo.autor_chave_unificada` (F-ACV-INGESTAO) e a VIEW `leitura.v_reacao_resenha_v1` (F-AVA-2). Saíram `leitura.estatistica_anual` e `leitura.estatistica_usuario`, porque a F-STA passou a calcular tudo dos baldes mensais.

| Serviço | Tabelas | VIEWs |
|---|---|---|
| `identidade` | 10 | 2 |
| `acervo` | 17 | 2 |
| `leitura` | 19 | 4 |
| `social` | 16 | 2 |

As migrations posteriores à baseline estão no [`DER.md`](../diagramas/DER.md). A busca do `acervo` usa as extensões `pg_trgm` e `unaccent`, instaladas no schema `public` pela migration `0004`.

Essa escolha preserva o encapsulamento de microsserviço **e** mantém possíveis as junções que os requisitos assumem (recomendação, nota agregada), que seriam inviáveis se os dados estivessem em bancos de paradigmas diferentes. É também o que respeita o teto de armazenamento do plano gratuito (RNF-DES-04): o acervo não deve consumir mais de 20% do limite, com o índice de busca dimensionado como custo dominante (RNF-DES-05).

### 4.2 Regra de acesso entre schemas

A separação lógica só se sustenta com uma disciplina de acesso:

> **Nenhum serviço lê a tabela crua de outro schema.** Leitura entre schemas ocorre exclusivamente por **VIEW que o serviço dono expõe e mantém como contrato** — estável e versionada junto do spec OpenAPI. A tabela é privada; a view é pública.

Sem essa regra, o schema por serviço degenera em banco compartilhado e a divisão em microsserviços perde o sentido. Com ela, o encapsulamento é preservado e os *joins* legítimos continuam possíveis dentro do mesmo cluster.

Cada spec OpenAPI lista as VIEWs que o serviço expõe em `x-database-contracts`. Quem lê o quê, em 25/10/2026:

| Consumidor | VIEWs que lê |
|---|---|
| `acervo` | de `identidade`, perfil e seguimento; de `leitura`, estante, nota, reação e resenha; de `social`, `v_atividade_livro_pessoal_v1` e `v_lista_livro_pessoal_v1` (acesso ao livro pessoal, RN-15) |
| `leitura` | `acervo.v_livro_referencia_v1`; de `identidade`, perfil e seguimento; de `social`, `v_atividade_livro_pessoal_v1` e `v_lista_livro_pessoal_v1` (resenhas, reações e frases de livro pessoal, RN-15) |
| `social` | `acervo.v_livro_referencia_v1`; de `identidade`, perfil e seguimento; de `leitura`, `v_estante_publica_v1`, `v_nota_publicacao_v1` e `v_resenha_publicacao_v1` |
| `identidade` | nenhuma |

Se os serviços passarem a usar roles de banco separados, cada consumidor vai precisar de `GRANT USAGE` no schema e `GRANT SELECT` na VIEW, e esse GRANT não pode ir na migration do consumidor, porque os objetos são do dono do schema.

### 4.3 Escritas e concorrência

- Escritas concorrentes sobre a mesma entidade são resolvidas por controle de concorrência no banco, sem perda de dados (RNF-ARQ-05).
- Operações de escrita aceitam **chave de idempotência** (RNF-ERR-04); retentativa não duplica registro.
- Cada serviço só cria migration das tabelas do **seu** schema; migration é revisada por humano antes de subir (plano §5).
- Acesso sempre por consultas parametrizadas ou ORM (RNF-SEC-12).
- Cada schema produtor mantém uma **outbox transacional**. A alteração de domínio e o evento são gravados na mesma transação; um dispatcher publica com confirmação do broker e retry, fechando RNF-ERR-10 sem transformar falha de publicação em falha da operação síncrona.
- Cada schema consumidor recebe por migration incremental a tabela técnica `mensagem_processada(consumidor, event_id, processado_em)`, com chave primária `(consumidor, event_id)`. Efeito de domínio e recibo são gravados na mesma transação. As migrations da baseline já aplicada não são reescritas e toda nova migration mantém revisão humana obrigatória.
- Recálculos de um agregado (nota dos leitores, desafios) não são incrementais: releem o estado atual do fato e são serializados por `pg_advisory_xact_lock` na chave do agregado, na mesma ordem em consumidores, backfills e exclusão de conta.

**Decisões de dados incorporadas em 15/09/2026:** `leitura` persiste instante/fuso/data local da ação de finalizar separadamente da data de fim editável. Janelas de desafio guardam configuração histórica e pausas são retidas para recálculo por captura offline. Edição/exclusão de progresso seguem RN-17 e recalculam efeitos no próprio serviço, sem novo serviço ou evento de broker apenas para comunicação interna. Eventos de progresso acionam leitura do estado atual do fato, evitando reaplicar payload anterior à sua correção/exclusão. Retenção de registros técnicos/auditoria é indeterminada após anonimização de RN-23; validade de tokens e replay HTTP não são estendidos.

**Visibilidade e recomendação:** contratos de identidade permitem revalidar suspensão, exclusão pendente e opt-out. Serviços ocultam conteúdo de conta suspensa em toda superfície, inclusive snapshots e notificações; a consulta administrativa autorizada ocorre pelo serviço dono, sem expor dados suspensos nas VIEWs públicas. Reativação restaura a visibilidade sob RN-08. O opt-out afeta apenas o uso das leituras como sinal para outras pessoas.

### 4.4 Firebase

Fora do PostgreSQL, o sistema usa o **Firebase apenas para FCM** (§2.7). Nenhuma entidade de domínio é persistida no Firestore ou em qualquer outro produto Firebase.

---

## 5. Comunicação e mensageria

### 5.1 Síncrono

Os clientes consomem os serviços por **HTTP/JSON**. Cada serviço publica seu contrato em **OpenAPI 3.0.3** (RNF-ARQ-03), versionado em `docs/api/<servico>.yaml` e agregado num Swagger UI único (plano §8). Cada operação identifica se está implementada ou planejada; existir no spec não significa existir no runtime. Em 17/09/2026, os quatro contratos consolidados somavam 66 operações. **Em 25/10/2026 são 117, todas implementadas:** 24 em `identidade`, 15 em `acervo`, 45 em `leitura` e 33 em `social`. Operações que confirmam ao autor — status na estante, progresso, nota, resenha — são **síncronas**; o evento é publicado **depois** da escrita confirmada (§7.2 do `REQUISITOS.md`).

**Rotas internas.** Não são chamadas pelos clientes e não usam o JWT do usuário; cada uma exige um segredo de serviço num header próprio, comparado em tempo constante:

| Rota | Serviço | Chamada por | Header |
|---|---|---|---|
| `POST /internal/jobs/inatividade` | `leitura` | GitHub Actions (§2.4) | `X-Scheduler-Token` |
| `POST /internal/jobs/exclusao-conta` | `identidade` | GitHub Actions (§2.4) | `X-Scheduler-Token` |
| `POST /internal/moderacao/{resenhas\|frases}/{id}/remocao` | `leitura` | `social` | `X-Moderacao-Token` |

**Chamada síncrona entre serviços.** A remoção pela moderação (§3.2, item 5) é a única. O cliente do `social` usa uma `Idempotency-Key` fixa por alvo, timeout de conexão de 5 s e de leitura de 60 s, por causa do *cold start* do `leitura`. Só repete uma vez, depois de 2 s, em falha de conexão ou 502/503/504; um timeout de leitura não se repete, e a denúncia continua pendente para o administrador tentar de novo. A chamada fica fora de qualquer transação. Isso diverge do backoff de RNF-ERR-08 (§8).

**Tempo real das notificações (F-NOT-2).** O `social` expõe `GET /notificacoes/tempo-real` em **SSE** (`text/event-stream`), autenticado pelo mesmo JWT das outras rotas, no header. O canal abre com o total de não lidas, empurra cada notificação nova depois do commit e manda um *heartbeat* a cada 25 s, abaixo do corte de conexão ociosa do proxy do Render. O canal fecha quando o JWT expira. Os canais ficam em memória, porque cada serviço roda numa instância só; um *backplane* só seria preciso para escalar. O app reconecta com backoff exponencial de 1 a 30 s. A web não tem notificações (§2.1 do `REQUISITOS.md`), e o canal ainda não foi validado no Render.

### 5.2 Assíncrono (RabbitMQ)

Os fluxos assíncronos de `REQUISITOS.md` §7.2 e seus serviços produtores/consumidores:

| Fluxo | Evento(s) | Produtor | Consumidor |
|---|---|---|---|
| **Notificações in-app** | `seguidor.novo`, `solicitacao.*`, `atividade.curtida`, `atividade.comentada`, `comentario.respondido`, `usuario.mencionado`, `resenha.curtida`, `recomendacao.recebida`, `leitura.em_risco`, `leitura.expirada` | identidade, leitura, social | social (FCM em Android previsto no Período 3) |
| **Expiração de leituras** | `leitura.em_risco`, `leitura.expirada` | leitura (job diário) | social |
| **Ingestão de livros** | `livro.importacao_solicitada` | acervo | acervo |
| **Cache de capas e remoção de recomendações** | `livro.adicionado_a_estante` (e `leitura.iniciada`, só para o cache) | leitura | acervo, social |
| **Busca de sinopse** | `livro.pagina_aberta` | acervo | acervo |
| **Nota agregada** (§3.2) | `nota.alterada` | leitura | acervo |
| **Atividades do feed** | `leitura.iniciada`, `leitura.retomada`, `leitura.finalizada`, `leitura.abandonada`, `resenha.publicada`, `resenha.excluida` | leitura | social |
| **Estatísticas, desafios e streak** | `progresso.registrado`, `leitura.finalizada` | leitura | leitura |
| **Exclusão definitiva de conta** | `conta.excluida` | identidade | leitura, social, acervo |
| **Recomendação recebida** | `recomendacao.recebida` | social | social |

`livro.adicionado_a_estante` passa a ter dois consumidores: `acervo`, para cache de capa, e `social`, para remover recomendações recebidas do livro. O cache de capas ouve também `leitura.iniciada`, porque iniciar a leitura de um livro fora da estante o põe nela sem publicar `livro.adicionado_a_estante`.

`resenha.excluida` também sai da remoção pela moderação (§3.2, item 5). Fica planejado só `lembrete.sequencia`, do Período 3 (F-GAM-OPC), ainda sem schema.

#### Contrato canônico

Os contratos assíncronos ficam em `docs/mensageria/`: `README.md`, catálogo e JSON Schemas Draft 2020-12. O conjunto inicial possuía **22 schemas**: envelope, tipos comuns, `ping.teste` e 19 eventos de negócio produzidos no Período 1. **Em 25/10/2026 são 26**, com os quatro eventos do Período 2: `usuario.mencionado`, `recomendacao.recebida`, `conta.excluida` e `resenha.curtida`. Eventos de períodos futuros recebem schema quando sua feature produtora entrar; não se cria fila acumuladora antes de existir consumidor.

O consumidor novo recupera, por backfill, o que aconteceu antes da sua fila existir. Na prática ficaram três regimes:

- **Backfill antes ou junto do binding:** `leai.leitura.metricas`.
- **Backfill depois de o serviço subir:** `leai.acervo.notas` e `leai.acervo.capas`. O runtime declara a fila na partida, e evento publicado antes disso se perde; por isso `backfill:notas` e `backfill:capas` rodam depois do deploy em cada ambiente.
- **Sem backfill:** `leai.social.recomendacoes`. A rotina diária de limpeza do `social` reconcilia o intervalo.

Todo evento usa o envelope v1:

```json
{
  "eventId": "uuid",
  "type": "leitura.iniciada",
  "version": 1,
  "occurredAt": "2026-09-16T12:00:00Z",
  "correlationId": "uuid",
  "businessKey": "leitura:<leituraId>:iniciada",
  "data": {}
}
```

`eventId` identifica a entrega técnica; `businessKey` identifica o fato/agregado, mas não impõe unicidade genérica. A outbox persiste somente `data`, e o dispatcher monta o envelope. O par `(type, version)` seleciona o schema; schema publicado é imutável e alteração incompatível cria nova versão. Header AMQP e corpo divergentes tornam a mensagem inválida.

#### Topologia e entrega

| Exchange | Tipo | Eventos do domínio |
|---|---|---|
| `leai.events.identidade` | `topic` | identidade |
| `leai.events.acervo` | `topic` | acervo |
| `leai.events.leitura` | `topic` | leitura |
| `leai.events.social` | `topic` | social |
| `leai.dead-letter` | `direct` | DLQs |

A routing key é o `type` exato. Cada fila possui `<fila>.dlq` ligada a `leai.dead-letter` pela routing key do nome da fila. `leai.p0.ping`/`.dlq` existem apenas para a prova técnica entre stacks. As filas de negócio em 25/10/2026:

| Fila | Exchange(s) | Routing keys | Período |
|---|---|---|---|
| `leai.acervo.importacao` | `leai.events.acervo` | `livro.importacao_solicitada` | 1 |
| `leai.acervo.sinopse` | `leai.events.acervo` | `livro.pagina_aberta` | 1 |
| `leai.social.feed` | `leai.events.leitura` | os quatro `leitura.*` do feed, `resenha.publicada`, `resenha.excluida` | 1 |
| `leai.social.notificacoes` | `identidade`, `social` e `leitura` | os eventos de notificação da tabela acima | 1 (ampliada no 2) |
| `leai.acervo.notas` | `leai.events.leitura` | `nota.alterada` | 2 |
| `leai.acervo.capas` | `leai.events.leitura` | `livro.adicionado_a_estante`, `leitura.iniciada` | 2 |
| `leai.leitura.metricas` | `leai.events.leitura` | `progresso.registrado`, `leitura.finalizada` | 2 |
| `leai.social.recomendacoes` | `leai.events.leitura` | `livro.adicionado_a_estante` | 2 |
| `leai.acervo.conta`, `leai.leitura.conta`, `leai.social.conta` | `leai.events.identidade` | `conta.excluida` | 2 |

`leai.leitura.metricas` é um consumidor só para desafios, estatísticas e sequência (F-DSF, F-STA e F-GAM). `leai.social.notificacoes` é uma fila ligada a três exchanges.

O dispatcher busca até 50 linhas pendentes por ciclo de 1 segundo, usa `SKIP LOCKED`, publica mensagem persistente e marca `publicado` somente após *publisher confirm*. Falha incrementa `tentativas`, mantém a linha pendente e usa backoff limitado a 60 segundos; outbox não é descartada por quantidade de tentativas.

Todo consumidor valida envelope, versão e `data` antes do domínio. Schema/versão inválida ou erro permanente vai diretamente à DLQ. Erro transitório mantém a entrega não confirmada e tenta novamente após 1, 5 e 15 segundos, com `prefetch=1` por channel; após a tentativa inicial e as três retentativas, envia `nack(requeue=false)`. O redrive é manual após correção da causa. Efeito e recibo transacionais tornam entrega duplicada um ACK sem novo efeito.

Filas duráveis, *publisher confirms* e DLQ protegem mensagens já recebidas pelo broker. A janela anterior ao broker é coberta pela outbox transacional: o evento permanece no PostgreSQL até a confirmação da publicação, com retry seguro e observável.

### 5.3 Resiliência

Timeout e retentativa com backoff em toda chamada externa, com circuit breaker (RNF-ERR-03/08); fila offline no cliente móvel para registros de progresso (RNF-ERR-05), preservando a captura original para recompor desafios e streak, inclusive períodos encerrados; tratamento explícito da hibernação do Render, com estado de carregamento prolongado na primeira chamada (RNF-ERR-09). As chamadas a provedores externos de metadados e capas (OpenLibrary, Google Books) passam por um cliente HTTP único no `acervo`, com allowlist de hosts (SSRF), timeout, limite de tamanho lido em *streaming*, backoff de 1, 5 e 15 s e circuit breaker.

---

## 6. Infraestrutura e implantação

| Componente | Provedor | Plano | Observação |
|---|---|---|---|
| Serviços de backend (×4) | Render | gratuito | região Oregon; hibernam após ~15 min; *cold start* tratado em RNF-ERR-09; runtime Node para `acervo` e `leitura` e Docker para `identidade` e `social` (`render.yaml`) |
| Site estático (web Vue) | Render | gratuito | build da SPA |
| Banco de dados | Neon (PostgreSQL) | gratuito | um projeto por ambiente, schema por serviço, sem branch por dev: DES/HML `le-ai-oregon` em `aws-us-west-2` (Oregon, junto do Render) e desenvolvimento `le-ai` em `aws-sa-east-1` (São Paulo); sem replicação entre eles |
| Mensageria | CloudAMQP (RabbitMQ) | gratuito | uma instância por ambiente: DES/HML `Le-ai-oregon` (Oregon) e desenvolvimento `Le-ai` (São Paulo); limite de conexões — uma por serviço |
| Imagens | Cloudinary | gratuito | transformação por URL + cache de capas; um cloud para os dois ambientes, com pasta de capas por ambiente (§2.5) |
| E-mail transacional | Brevo | gratuito | 300 e-mails/dia |
| Push (Android) | Firebase Cloud Messaging | gratuito | somente FCM; ainda não implementado (Período 3) |
| Agendador de jobs | GitHub Actions (`schedule`) | gratuito | fallback cron-job.org; funcionando no repo da faculdade desde 30/09/2026 |
| CI/CD | GitHub Actions | gratuito | lint, build, testes, deploy a partir de `main` |

Ambientes conforme o plano §4:
- **local:** banco e broker de desenvolvimento, em São Paulo; testes de integração em Postgres descartável;
- **DES/HML:** branch `main`, deploy a cada merge, com banco e broker próprios em Oregon;
- **PROD:** tag `vX.Y.Z`, a partir de 24/11.

As migrations aplicadas localmente só alteram o banco de desenvolvimento; o DES/HML as recebe no deploy da `main`. Deploy só a partir de código versionado, por pipeline automatizado (RNF-SEC-34). Segredos por variável de ambiente e GitHub Secrets, nunca versionados (RNF-SEC-11).

---

## 7. Transversais (aplicados nos quatro serviços)

- **Segurança:** controle de acesso validado no servidor em todo recurso protegido (RNF-SEC-01 a 07); HTTPS/TLS (RNF-SEC-08); senhas com Argon2/bcrypt/scrypt (RNF-SEC-09); tokens de acesso curtos e renovação revogável (RNF-SEC-30); rate limiting em auth e ações sociais (RNF-SEC-17/18); CORS restrito às origens conhecidas (RNF-SEC-21); validação por schema de toda entrada (RNF-SEC-13); proteção contra IDOR por identificador não sequencial (RNF-SEC-05).
- **Autenticação entre clientes e serviços:** o `identidade` emite o JWT de acesso (HS256, 15 min) e o *refresh token* (30 dias, revogável); os outros três serviços validam o mesmo token com o `JWT_SECRET` compartilhado, sem chamar o `identidade`. O papel de administrador vai na claim `papel`. As rotas internas usam segredos de serviço próprios (§5.1).
- **Estado em memória:** rate limiting, contagem de tentativas de login e canais SSE vivem na memória do processo. Não é estado de sessão (RNF-ARQ-04), e funciona porque cada serviço roda numa instância só; escalar horizontalmente exigiria mover esse estado.
- **Observabilidade:** log estruturado com `correlation-id` propagado entre serviços e mensagens (RNF-OBS-01); health check por serviço (RNF-OBS-02); log de falhas de auth, autorização e ações de moderação (RNF-SEC-35).
- **Erros:** corpo de erro padronizado com código interno, mensagem exibível e id de correlação (RNF-ERR-01); códigos HTTP semânticos; mensagens em pt-BR sem detalhe técnico (RNF-USA-05).
- **Testes:** unitários das regras de negócio, com prioridade obrigatória para a máquina de estados de leitura (RN-04), a regra de inatividade (RN-05) e o controle de acesso a perfil privado (RN-08); integração com banco real; testes dos fluxos assíncronos incluindo idempotência e DLQ (RNF-TST-01 a 08).

---

## 8. Rastreabilidade das pendências

| Pendência | Decisão | Requisitos afetados | Seção |
|---|---|---|---|
| P-11 | Spring + NestJS; identidade/social em Spring, acervo/leitura em NestJS (02/09/2026) | RNF-ARQ-02 | §2.1 |
| P-12 | 4 serviços; PostgreSQL/Neon, schema por serviço | RNF-ARQ-02, RNF-ARQ-07 | §2.2, §3, §4 |
| P-06 | RabbitMQ (CloudAMQP), envelope/schema v1, outbox+confirm, recibo transacional, retry e DLQ | §7.2, RNF-ARQ-06, RNF-ERR-06/07/10, RNF-SEC-32 | §2.3, §4.3, §5.2 |
| P-08 | GitHub Actions `schedule` (fallback cron-job.org) | RNF-ARQ-09, RF-EST-11/12, RN-23 | §2.4 |
| P-09 | Cloudinary | RF-ACV-08, RF-ACV-17, RF-SOC-01, RN-14 | §2.5 |
| P-02 | Brevo | RF-AUT-04 | §2.6 |
| P-04 | FCM (Android) + in-app (iOS) | RF-NOT-07 | §2.7 |

Nenhuma decisão remove requisito do escopo. As duas que o `REQUISITOS.md` marcava como capazes de retornar por controle de mudança — P-04 e P-09 — foram resolvidas **dentro** do escopo: push restrito a Android mantém RF-NOT-07 (Opcional), e o Cloudinary atende RF-ACV-08/17 e RF-SOC-01.

### Itens a validar ou decidir no período-0

Situação em 25/10/2026:

| Item | Situação |
|---|---|
| Viabilidade do GitHub Actions `schedule` no repositório do GitHub Classroom (P-08) | **confirmada na prática:** `job-inatividade.yml` roda todo dia desde 30/09/2026; os arquivos de P0-MSG e F-EST ainda a registram como não confirmada |
| Limites vigentes dos planos gratuitos de Cloudinary, CloudAMQP, Brevo e Neon | **em aberto:** nenhum arquivo registra a conferência. Medido só o tamanho do acervo no Neon, cerca de 11 MB |
| Emissão de push FCM em dispositivo Android real de demonstração (P-04) | **adiada** para o Período 3, com a F-NOT-OPC |

### Divergências e itens abertos no fechamento do Período 2

Registrados nos arquivos das features. Os que pedem decisão do grupo não foram resolvidos aqui:

| Item | Origem | Situação |
|---|---|---|
| O feed lê VIEWs do `leitura` para resenha e nota, contra o snapshot da §3.2, item 4 | F-AVA | decisão do grupo pendente |
| A chamada `social` → `leitura` na moderação usa uma retentativa só e timeout de 60 s, e não o backoff de RNF-ERR-08 | F-MOD | divergência registrada, por causa do *cold start* |
| Limpeza diária de recomendações em `@Scheduled` no próprio `social`, e não no GitHub Actions (§2.4) | F-REC-P2P | no Render gratuito, só roda se o serviço estiver acordado às 04:30 |
| `garantirEstante` põe o livro na estante sem publicar `livro.adicionado_a_estante`; as recomendações desse livro não são removidas por evento | F-ACV-NOTA (lacuna do `leitura`) | o cache de capas contorna ouvindo `leitura.iniciada`; a limpeza diária remove as recomendações |
| E-mail de recuperação de senha sem prova de envio real em DES | F-AUT | pendente |
| Avatar e capa pessoal sobem direto ao Cloudinary pelo preset, e o servidor valida só a origem da URL, não o tipo real, o tamanho e as dimensões da imagem (§2.5, RNF-SEC-20) | F-PERFIL e F-ACV-CADASTRO | limites fixados no preset; registrado nas features |
| Canal SSE sem validação no Render | F-NOT-2 | pendente, depende do merge na `main` |
| O dispatcher começa a publicar antes de as filas serem declaradas, e um evento publicado nesse intervalo se perde | F-ACV-BUSCA (defeito do runtime de P0-MSG) | só acontece com backlog na primeira subida; correção sugerida: esperar a topologia dos consumidores antes de despachar |
| Uma queda de rede derruba o processo do `acervo` e do `leitura` quando o driver `pg` emite erro sem ouvinte | F-ACV-DESCOBERTA | levado a P0-INFRA; no Render, cada oscilação de rede reiniciaria o serviço |
