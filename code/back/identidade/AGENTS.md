# AGENTS.md — Serviço `identidade`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Usuário, autenticação, perfil, privacidade, seguidores e solicitações de seguir. Requisitos: **AUT** e **SOC-01 a SOC-08**.

## Stack e dados

- **Stack:** **Spring (Java)** — decidido pela equipe em 02/09/2026 (arquitetura §2.1). Fixado no scaffolding P0-INFRA (12/09/2026): **JDK 21 LTS**, build **Maven** com wrapper (`mvnw`) e **Spring Boot 4.1.1**.
- **Schema:** `identidade`, no PostgreSQL único do Neon. Só este serviço cria migration das suas tabelas.
- Leitura por outros serviços apenas via **VIEW** exposta e mantida por este serviço (ex.: relação de seguir para a recomendação algorítmica em `social`).

> **Scaffolding concluído (P0-INFRA, 12/09/2026):** esqueleto Spring Boot executável com health, corpo de erro padrão, correlation-id, CORS restrito, cabeçalhos de segurança, config validada no boot e migration inicial do schema. Sem tabelas de domínio ainda.
>
> **P0-NAV (14/09/2026):** primeira tabela de domínio (`usuario`), Spring Security + JWT HS256, `POST /auth/register`, `POST /auth/login`, `GET /me`, rate limiting por IP e bloqueio progressivo por identidade. Ver "Pontos de atenção" abaixo, que estava desatualizado nesses itens.
>
> **Modelo físico do DER (16/09/2026):** `usuario` foi ampliada sem perder os
> usuários existentes; tabelas de autenticação, seguidores, exclusão,
> idempotência e outbox, além das VIEWs de contrato, foram versionadas. A
> existência da estrutura não significa que as features correspondentes estejam
> implementadas.

## Estrutura, comandos e ferramentas (P0-INFRA)

- **Runtime:** **JDK 21 LTS** (Temurin no CI). O `maven-enforcer-plugin` recusa o build em outro JDK.
- **Build:** **Maven** com wrapper — `mvnw` / `mvnw.cmd` / `.mvn/wrapper/maven-wrapper.properties` versionados, tipo `only-script` (**sem jar no repositório**). Ninguém precisa de Maven instalado.
- **Versões fixadas (RNF-SEC-25):** Maven não tem lockfile. O papel dele é feito por três coisas juntas: `spring-boot-starter-parent:4.1.1` (BOM que fixa toda a árvore transitiva), a única versão declarada à mão (`springdoc-openapi 3.1.1`, que está fora do BOM) e a regra `banDynamicVersions` do enforcer, que proíbe faixa de versão.
- **ORM/migrations:** **Flyway** (`flyway-core` + `flyway-database-postgresql` + o módulo `spring-boot-flyway`). Migrations em `src/main/resources/db/migration/V<timestamp>__<descricao>.sql` — SQL revisável, **cada uma revisada por humano** antes de subir (plano §5); só tabelas do schema `identidade`. `spring.flyway.default-schema` mantém a `flyway_schema_history` **dentro** do schema do serviço. Aplicadas no boot; `FLYWAY_ENABLED=false` sobe o serviço sem banco (dev). **Spring Data JPA** está no projeto, mas ainda sem nenhuma `@Entity` — `ddl-auto: none`, o Flyway é o dono do schema.
- **Config:** `application.yml` + `@ConfigurationProperties` validado (`config/AppProperties`) — não sobe com env inválida. O `.env` local é lido por `spring.config.import: optional:file:.env[.properties]`, **sem dependência de dotenv**; ele é interpretado como arquivo `.properties` (comentário só no início da linha, `\` é escape). `.env.example` versionado, `.env` nunca (RNF-SEC-11). As credenciais do Brevo ficam somente no `identidade`: `BREVO_API_KEY`, `BREVO_SMTP_KEY`, remetente e parâmetros SMTP; são opcionais até F-AUT ativar o envio.
- **Estrutura** (`src/main/java/br/com/leai/identidade/`):
  - `IdentidadeApplication.java` — bootstrap; `@EnableConfigurationProperties` para a config ser validada antes do pool de banco.
  - `common/` — `CorrelationIdFilter` (MDC + header, RNF-OBS-01/03); `SecurityHeadersFilter` (HSTS, nosniff, DENY, Referrer-Policy — RNF-SEC-24, mantido como filtro próprio mesmo depois do Security entrar, ver "Pontos de atenção"); `RateLimitFilter` (RNF-SEC-17, 60 req/min por IP em `/auth/**`, em memória); `CodigoErro` + `ErroResposta` + `EscritorDeErro` + `MapeadorErro` + `GlobalExceptionHandler` → corpo `{ codigo, mensagem, correlationId }` (RNF-ERR-01, pt-BR, sem stack trace); `ErroDeNegocioException`/`ServicoIndisponivelException`; `StandardErrorController` para o despacho `/error`, que o `@RestControllerAdvice` não alcança.
  - `config/` — `AppProperties` (contrato de env), `CorsConfig` (allowlist sem curinga, RNF-SEC-21, com recusa no corpo de erro padrão), `OpenApiConfig` (inclui o `securityScheme` `bearerAuth`), `SecurityConfig` (Spring Security + `oauth2-resource-server`, entrou em P0-NAV — ver "Pontos de atenção"), `JwtConfig`.
  - `usuario/` — `Usuario` (`@Entity`, primeira tabela de domínio do serviço) e `UsuarioRepositorio`.
  - **Pacotes de feature divididos por camada** (27/09/2026), no mesmo padrão do `social` (`feed/`, `notificacao/`): `controller/` (HTTP), `dto/` (requisição e resposta), `service/` (regra e orquestração), `validacao/` (validadores e Bean Validation), `model/` (tipos de domínio sem persistência) e `config/` (beans da feature). Classe nova entra na camada dela; membro chamado de outra camada precisa ser `public`. Testes espelham o pacote da classe testada, porque vários usam membros package-private; integração continua em `integracao/`.
  - `auth/` — `controller/`: `AutenticacaoController` (`register`/`login`/renovação/senha), `MeController`. `service/`: `ServicoDeAutenticacao`, `EmissorDeToken` (JWT HS256, 15 min), `GestorDeRenovacao`, `RecuperacaoDeSenha`, `ControleDeTentativas` (RNF-SEC-29, bloqueio progressivo por identidade, em memória), `ProvisionamentoDoAdmin`, `ContaAdministradora`, `RenovacaoReusadaException`. `dto/`: requisições e respostas. `validacao/`: `MaiorDeIdade`/`MaiorDeIdadeValidator` (RNF-SEC-43, Bean Validation) e `PoliticaDeSenha`. `model/`: `Papel`.
  - `email/` — `EmailNotificationService` envia o e-mail transacional de recuperação pela API do Brevo; falhas não são propagadas ao fluxo anti-enumeração.
  - `health/` — `GET /health` + `DatabaseHealthChecker` (`SELECT 1`) (RNF-OBS-02).
  - `perfil/` (F-PERFIL) — `GET/PUT /me/perfil`, `GET /perfis/{username}`, busca `GET /perfis?username=` exata. `controller/PerfilController`; `service/`: `ServicoDePerfil` e `RelacaoEntrePerfis` (`relacao` e `conteudoRestrito` de RN-08); `validacao/ValidadorDeAvatar` (só a URL do Cloudinary, nunca baixa); `config/LimitesDeUso`; `dto/`.
  - `seguimento/` (F-PERFIL) — seguir, pedir, aceitar, recusar, desfazer, caixa de pedidos e listas próprias `/me/seguidores` e `/me/seguidos`; contadores por `UPDATE` atômico; eventos na outbox. `controller/SeguimentoController`; `service/`: `ServicoDeSeguimento` e `EventosDeSeguimento`; `dto/`: `SolicitacaoResposta`, `ResultadoSeguir`, `Pagina`.
  - `seed/` — `SeedDeIdentidade` (massa de RNF-TST-08, ids compartilhados com o seed do `acervo`) e `ExecucaoDoSeed`, que só existe no perfil `seed`.
- **Comandos:** `./mvnw spring-boot:run` · `./mvnw verify` · `./mvnw test` · `./mvnw clean package` · `java -jar target/leai-identidade-0.0.1.jar`. Sempre **a partir desta pasta** — é onde o `.env` é procurado.
- **Seed (RNF-TST-08):** `SEED_SENHA=<12 a 72 caracteres> ./mvnw spring-boot:run -Dspring-boot.run.profiles=seed` aplica as migrations, grava `seed.ana` (público), `seed.bruno` (segue Ana e Duda), `seed.caio` (não segue ninguém, pedido pendente para Duda) e `seed.duda` (privada), e encerra. Rodar de novo restaura esse estado entre as quatro contas. Recusa o perfil `prod`. **O banco é o do `DATABASE_URL`: com o `.env` local, é o Neon de DES.**
- **Testes:** JUnit 5 + AssertJ + Mockito; classes em `src/test/java/**/*Test.java`, com `@DisplayName` em pt-BR. Testes unitários e de fatia (`@WebMvcTest`, MockMvc standalone) não tocam banco nem rede. **Integração com Postgres real** (RNF-TST-02) fica em `src/test/java/**/integracao/`, estendendo `IntegracaoComPostgres` (`@SpringBootTest` com porta aleatória, HTTP de verdade): só roda com `DATABASE_URL_TESTE` (JDBC; `DATABASE_USERNAME_TESTE`/`DATABASE_PASSWORD_TESTE` opcionais, padrão `postgres` e vazio) e cada subclasse declara `@EnabledIfEnvironmentVariable(named = "DATABASE_URL_TESTE", matches = ".+")`, porque condição do JUnit não é herdada. A base apaga e recria o schema a cada contexto e **recusa host que não seja `localhost`/`127.0.0.1`**: nunca apontar para o Neon. O CI sobe um `postgres:17-alpine` no job. Local: `DATABASE_URL_TESTE=jdbc:postgresql://localhost:5432/leai_teste ./mvnw verify`.
- **OpenAPI:** `springdoc-openapi` em runtime — spec em `/v3/api-docs`, Swagger UI em `/docs`; esqueleto commitado em [`docs/api/identidade.yaml`](../../../docs/api/identidade.yaml) (RNF-ARQ-03).
- **Log:** legível em dev (com o correlation-id no padrão); **JSON ECS** no perfil `prod` via `logging.structured.format.console` — recurso nativo do Boot, sem encoder extra. Todo o MDC entra no JSON.
- **Portas:** `identidade` em `8080`, `social` em `8081` — os dois sobem juntos em local.

### Armadilhas do Spring Boot 4.x (a maior parte do material na internet ainda é 3.x)

- `spring-boot-starter-web` **está deprecado** — use `spring-boot-starter-webmvc`.
- A autoconfiguração foi partida em módulos. `flyway-core` sozinho **não roda**: falta `org.springframework.boot:spring-boot-flyway`. O serviço sobe em silêncio, sem aplicar migration.
- `@WebMvcTest`/`MockMvc` saíram do `spring-boot-starter-test` — precisam de `spring-boot-starter-webmvc-test`.
- Pacotes que mudaram: `ErrorController` → `org.springframework.boot.webmvc.error`; `ValidationAutoConfiguration` → `org.springframework.boot.validation.autoconfigure`; os `HealthIndicator` → `org.springframework.boot.health.*`.
- `@MockBean` foi removido — use `@MockitoBean`.
- **Jackson 3** (`tools.jackson.*`), não mais `com.fasterxml.jackson.databind`.

## Pontos de atenção (ver `REQUISITOS.md` §8)

- **Senhas com bcrypt** (custo 12, via `PasswordEncoder` do próprio Spring Security — decidido em P0-NAV, 14/09/2026). **Token de acesso**: JWT HS256, 15 minutos, emitido por `EmissorDeToken`. Claim `papel` (`leitor` ou `admin`) sempre presente: é o que os outros serviços leem para restringir rota ao admin. **Renovação** (F-AUT): `GestorDeRenovacao`, token opaco de 256 bits, só o SHA-256 no banco, 30 dias, rotação atômica e detecção de reuso (token revogado reapresentado derruba todas as renovações do usuário). Logout, troca e redefinição de senha revogam renovações.
- **Recuperação de senha** (F-AUT): `RecuperacaoDeSenha`. O `forgot` não consulta a conta na requisição; agenda depois do commit o trabalho em `EnvioDeRecuperacao` (executor em processo, 3 tentativas com backoff, disjuntor, **não durável**). Token de 256 bits, 1h, uso único, só hash; link `<WEB_BASE_URL>/redefinir-senha#token=...` (fragmento, fora de log de acesso). Link inválido, vencido ou usado é sempre `410` com a mesma mensagem. Teto de 5 links por conta por hora.
- **Rotas públicas são listadas uma a uma** no `SecurityConfig`, não `/auth/**`: `/auth/password/change` exige token. Rota nova de `/auth` nasce protegida até entrar na lista.
- **Rate limiting ativo desde P0-NAV**: `RateLimitFilter` por IP (60 req/min em `/auth/**`, recusado antes da cadeia do Security) e `ControleDeTentativas` por identidade (RNF-SEC-29 — 5 falhas bloqueiam, com bloqueios progressivos de 1/5/15/30 min). Os dois em memória (tensiona RNF-ARQ-04 com mais de uma instância; aceitável enquanto o Render free roda uma só). Mensagens de login não revelam se e-mail/username existe (RNF-SEC-28). Cadastro/recuperação de senha (fora de login) ainda não tem rate limiting próprio — é F-AUT.
- **Privacidade de perfil** (RN-08): validação de relação de seguidor aceita em todos os endpoints, incluindo listagem e busca. Descoberta **só por username exato** — sem enumeração, listagem ou sugestão. Implementado em F-PERFIL: conta suspensa ou com exclusão pendente some de perfil, busca, caixa e listas; listas de seguidores e seguidos só do próprio dono.
- Conta de **administrador** fixa e única (F-AUT): `ProvisionamentoDoAdmin` cria ou atualiza a linha no arranque a partir de `ADMIN_EMAIL`/`ADMIN_PASSWORD`; o papel vem do id guardado em `ContaAdministradora`, não de coluna (sem migration). O ambiente manda na senha: trocá-la e reiniciar rotaciona a credencial; a conta não troca nem recupera senha pela API. Username `admin` reservado no cadastro. Só uma das variáveis, ou senha com menos de 16 caracteres, impede o serviço de subir.
- Publica eventos: `seguidor.novo`, `solicitacao.criada` e `solicitacao.aceita`, gravados na `outbox_identidade` na transação do fato; o runtime (dispatcher, confirms, retry) é de [P0-MSG](../../../docs/plano-de-desenvolvimento/periodo-0/feature-P0-MSG.md). Todo `type` novo precisa do schema em `resources/messaging/schemas` e do registro no `MessageValidator`, senão fica preso na outbox.
- **Spring Security entrou em P0-NAV (14/09/2026), antecipado de F-AUT.** Cadastro, login e `/me` precisam de hash de senha, emissão/validação de token e headers na mesma cadeia, então esperar F-AUT não fazia sentido. `SecurityHeadersFilter` **continua sendo filtro próprio**, não migrou para `HttpSecurity#headers`: o `headers()` do Security só cobre o que passa pela cadeia dele, e deixaria sem cabeçalho justamente a recusa de CORS e os erros do contêiner (decisão registrada, não pendência). Consequência de comportamento: rota protegida inexistente responde `401` em vez de `404` (o Security intercepta antes do dispatcher); rota pública inexistente continua `404`.
- Cadastro recusa menores de 18 anos (RNF-SEC-43), via `@MaiorDeIdade`/`MaiorDeIdadeValidator` (Bean Validation).
