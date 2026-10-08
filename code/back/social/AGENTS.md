# AGENTS.md — Serviço `social`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Feed e atividades, curtidas de atividade, comentários, listas, recomendações (P2P e algorítmica), notificações e moderação. Requisitos: **SOC-09 a 15, LST, REC, NOT, MOD**.

## Stack e dados

- **Stack:** **Spring (Java)** — decidido pela equipe em 02/09/2026 (arquitetura §2.1). Fixado no scaffolding P0-INFRA (12/09/2026): **JDK 21 LTS**, build **Maven** com wrapper (`mvnw`) e **Spring Boot 4.1.1** — mesma stack e mesmas versões de `identidade`.
- **Schema:** `social`, no PostgreSQL único do Neon.
- **Recomendação algorítmica** é hospedada aqui, lendo **VIEWs** de `leitura` (estante, nota), `identidade` (seguir) e `acervo` (assunto) — nunca tabelas cruas. Calculada em tempo de consulta, sem estrutura derivada (`REQUISITOS.md` §10.7).
- **Feed guarda snapshot** no evento de atividade (nome do usuário, título e capa do livro no momento), em vez de hidratar por join a cada scroll.

> **Modelo físico do DER (16/09/2026):** as 15 tabelas e as VIEWs de contrato
> de `social` foram versionadas em Flyway. A existência da estrutura não
> significa que as features de domínio estejam implementadas.

## Estrutura, comandos e ferramentas (P0-INFRA)

Idêntica à de [`identidade`](../identidade/AGENTS.md) — os dois serviços Spring são o mesmo esqueleto com os nomes trocados, como `acervo` e `leitura` são do lado NestJS. O resumo:

- **Runtime:** **JDK 21 LTS** (Temurin no CI). O `maven-enforcer-plugin` recusa o build em outro JDK.
- **Build:** **Maven** com wrapper — `mvnw` / `mvnw.cmd` / `.mvn/wrapper/maven-wrapper.properties` versionados, tipo `only-script` (**sem jar no repositório**).
- **Versões fixadas (RNF-SEC-25):** o BOM `spring-boot-starter-parent:4.1.1` faz o papel do lockfile, mais `springdoc-openapi 3.1.1` declarado à mão (está fora do BOM) e a regra `banDynamicVersions` do enforcer.
- **ORM/migrations:** **Flyway** (`flyway-core` + `flyway-database-postgresql` + o módulo `spring-boot-flyway`), migrations em `src/main/resources/db/migration/V<timestamp>__<descricao>.sql`, só do schema `social`, cada uma revisada por humano (plano §5). `spring.flyway.default-schema` mantém a `flyway_schema_history` dentro do schema do serviço. **Spring Data JPA** presente, ainda sem `@Entity`; `ddl-auto: none`.
- **Config:** `application.yml` + `config/AppProperties` validado — não sobe com env inválida. `.env` local lido por `spring.config.import: optional:file:.env[.properties]` (formato `.properties`, não dotenv). `.env.example` versionado, `.env` nunca (RNF-SEC-11).
- **Estrutura** (`src/main/java/br/com/leai/social/`): `SocialApplication`, `common/` (correlation-id, cabeçalhos de segurança, corpo de erro padrão, `/error`), `config/` (env, CORS, OpenAPI), `health/`.
- **Comandos:** `./mvnw spring-boot:run` · `./mvnw verify` · `./mvnw test` · `./mvnw clean package` · `java -jar target/leai-social-0.0.1.jar`. Sempre **a partir desta pasta** — é onde o `.env` é procurado.
- **Testes:** JUnit 5 + AssertJ + Mockito, `@DisplayName` em pt-BR, **sem banco e sem rede**.
- **OpenAPI:** spec em `/v3/api-docs`, Swagger UI em `/docs`; esqueleto commitado em [`docs/api/social.yaml`](../../../docs/api/social.yaml).
- **Log:** legível em dev; **JSON ECS** no perfil `prod` (`logging.structured.format.console`), com o MDC — e portanto o `correlationId` — dentro do JSON.
- **Porta:** `8081` (o `identidade` fica na `8080`, para os dois subirem juntos em local).
- **Armadilhas do Boot 4.x** (starter `webmvc`, módulo `spring-boot-flyway`, `spring-boot-starter-webmvc-test`, pacotes movidos, Jackson 3): a lista está no [`AGENTS.md` do `identidade`](../identidade/AGENTS.md#armadilhas-do-spring-boot-4x-a-maior-parte-do-material-na-internet-ainda-é-3x).

## Mudanças feitas por outras features

### 27/09/2026 — F-AVA (Renato): autor nulo no feed e spoiler escondido

Feitas por F-AVA com autorização do Renato e **mergeadas na `desenvolvimento` em 27/09/2026 por decisão dele**, para F-AVA fechar a sprint. **A revisão do Kayke continua pendente**; qualquer ajuste entra num commit novo. Motivo e decisão em [`docs/mensageria/README.md`](../../../docs/mensageria/README.md) (Histórico) e no [plano de F-AVA](../../../docs/plano-de-desenvolvimento/periodo-1/plano-F-AVA.md), fatia 2.4.

- **Por quê:** 701 livros oficiais do acervo não têm autor. `LivroSnapshot.autor` do `common-v1` passou a aceitar `null` (26/09), e os eventos `resenha.publicada` e `leitura.*` desses livros chegam com `autor: null`.
- **Migration** `V20260927002000__snap_livro_autor_anulavel.sql`: só `DROP NOT NULL` em `atividade.snap_livro_autor`. O CHECK `atividade_snap_livro_autor_preenchido` não mudou: aceita `NULL` e continua proibindo texto vazio.
- **`Atividade.java`:** a coluna `snap_livro_autor` perdeu o `nullable = false`.
- **Cópia do schema:** `src/main/resources/messaging/schemas/common-v1.schema.json` igual à de `docs/mensageria`.
- **Contrato:** `LivroSnapshot.autor` anulável em `docs/api/social.yaml`.
- **Web (`ItemAtividade.vue`):** a linha do autor some quando ele vem vazio, e a resenha com spoiler fica **fora do DOM** até "Mostrar mesmo assim" (RF-AVA-03; antes o texto aparecia aberto no feed). Na validação de 27/09, o texto da resenha passou de `font-serif` (Georgia/Times do Tailwind) para `font-editorial` (Newsreader, a fonte do design). Achado sem mexer: o botão "Ler resenha" logo abaixo não faz nada.
- **Teste:** `ConsumidorDeAtividadeIntegracaoTest.livroSemAutorGravaAtividade` confere que a linha foi gravada.
- **Armadilha que continua aberta:** o `catch (DataIntegrityViolationException)` de `ConsumidorDeAtividade.criarAtividade` existe para o replay (`atividade_event_id_unico`, `atividade_fato_unico`), mas engole **qualquer** violação de integridade: um NOT NULL ou CHECK furado faz a atividade sumir sem erro e sem ir para a DLQ. Sugestão: estreitar o `catch` para as duas unicidades.
- **Flyway no banco de dev:** a migration é aplicada na próxima vez que alguém subir o `social` local a partir da `desenvolvimento`. Migration nova no `social` precisa de versão maior que `V20260927002000`, ou o Flyway recusa a ordem.
- **Ordem dos eventos:** o despachante do `leitura` segura só a linha que falhou, então um `resenha.excluida` pode chegar antes do `resenha.publicada` da mesma resenha. Hoje o `excluida` vira no-op e o `publicada` cria a atividade depois. É raro; fica registrado.

### 08/10/2026 — F-CONTA-2 (Henrique): consumidor de `conta.excluida`

Previsto na [divisão do Período 2](../../../docs/plano-de-desenvolvimento/periodo-2/README.md#o-que-ainda-cruza-entre-pessoas): o dono da F-CONTA-2 escreve os consumidores da exclusão nos três serviços. Avisar o Kayke.

- **`conta/service/ConsumidorDeContaExcluida`**, fila `leai.social.conta` no exchange do `identidade`. Apaga o que é da conta excluída: atividades (o CASCADE leva curtidas e comentários de outros nelas), comentários (leva as respostas abaixo dos comentários-raiz dela), menções, curtidas, listas, recomendações enviadas e recebidas, sugestões descartadas, notificações para ela ou com ela como ator ou autor da atividade, preferências e dispositivos. Apaga também as denúncias feitas por ela ou contra o conteúdo que some. Anonimiza o `log_moderacao` desse conteúdo, os recibos de idempotência dela e os eventos da outbox que a citam; os pendentes saem.
- **Constantes** em `MessagingConstants` (`CONTA_*`, `EVENTO_CONTA_EXCLUIDA`), schema no `MessageValidator` e cópia de `conta.excluida.v1.schema.json`.
- **Sem migration.** Matriz completa no [arquivo da F-CONTA-2](../../../docs/plano-de-desenvolvimento/periodo-2/feature-F-CONTA-2.md#etapa-3-consumidores).
- **Testes:** `ConsumidorDeContaExcluidaIntegracaoTest` e `ContaExcluidaSchemaTest`.

## Pontos de atenção (ver `REQUISITOS.md`)

- É o **consumidor** do fluxo de **notificações in-app** (fan-out); adiciona FCM em Android (arquitetura §5.2). Curtida de **atividade de feed** fica aqui; curtida de **resenha** fica em `leitura`. **Spring AMQP já entrou** (runtime de [P0-MSG](../../../docs/plano-de-desenvolvimento/periodo-0/feature-P0-MSG.md), 19/09): o `social` consome pelas filas `leai.social.feed` (F-FEED) e `leai.social.notificacoes` (F-NOT), declaradas em `messaging/MessagingConstants.java`. FCM ainda não entrou.
- **Comentários (RN-10):** um nível de aninhamento; resposta a resposta é irmã, com menção `@username`. Menção resolve só se o username existir; sujeita a rate limiting.
- **Recomendação P2P (RN-22):** só entre seguimento mútuo; sem aceitar/recusar; expira em 90 dias; limite de 50 ativas por par; quatro vias de remoção convergem para a mesma operação. Livro pessoal não é recomendável.
- **Moderação (RF-MOD):** apenas resenhas e comentários são denunciáveis; painel restrito ao administrador (verificação no servidor); toda ação em **log de auditoria**.
- Todo consumidor de mensagem é **idempotente** e valida schema; falha após o máximo de tentativas vai para **DLQ**.
- **Rate limiting** em ações sociais — seguir, curtir, comentar, mencionar, denunciar (RNF-SEC-18).
- **Spring Security já entrou** (F-FEED): `SecurityConfig` valida o JWT HS256 emitido pelo `identidade` como resource server, com `JWT_SECRET` obrigatório (`AppProperties`, 32+ caracteres; sem ele o serviço não sobe). Os cabeçalhos de segurança continuam no `SecurityHeadersFilter` próprio, e o CORS no `CorsConfig`.
