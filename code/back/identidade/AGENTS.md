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

## Estrutura, comandos e ferramentas (P0-INFRA)

- **Runtime:** **JDK 21 LTS** (Temurin no CI). O `maven-enforcer-plugin` recusa o build em outro JDK.
- **Build:** **Maven** com wrapper — `mvnw` / `mvnw.cmd` / `.mvn/wrapper/maven-wrapper.properties` versionados, tipo `only-script` (**sem jar no repositório**). Ninguém precisa de Maven instalado.
- **Versões fixadas (RNF-SEC-25):** Maven não tem lockfile. O papel dele é feito por três coisas juntas: `spring-boot-starter-parent:4.1.1` (BOM que fixa toda a árvore transitiva), a única versão declarada à mão (`springdoc-openapi 3.1.1`, que está fora do BOM) e a regra `banDynamicVersions` do enforcer, que proíbe faixa de versão.
- **ORM/migrations:** **Flyway** (`flyway-core` + `flyway-database-postgresql` + o módulo `spring-boot-flyway`). Migrations em `src/main/resources/db/migration/V<timestamp>__<descricao>.sql` — SQL revisável, **cada uma revisada por humano** antes de subir (plano §5); só tabelas do schema `identidade`. `spring.flyway.default-schema` mantém a `flyway_schema_history` **dentro** do schema do serviço. Aplicadas no boot; `FLYWAY_ENABLED=false` sobe o serviço sem banco (dev). **Spring Data JPA** está no projeto, mas ainda sem nenhuma `@Entity` — `ddl-auto: none`, o Flyway é o dono do schema.
- **Config:** `application.yml` + `@ConfigurationProperties` validado (`config/AppProperties`) — não sobe com env inválida. O `.env` local é lido por `spring.config.import: optional:file:.env[.properties]`, **sem dependência de dotenv**; ele é interpretado como arquivo `.properties` (comentário só no início da linha, `\` é escape). `.env.example` versionado, `.env` nunca (RNF-SEC-11).
- **Estrutura** (`src/main/java/br/com/leai/identidade/`):
  - `IdentidadeApplication.java` — bootstrap; `@EnableConfigurationProperties` para a config ser validada antes do pool de banco.
  - `common/` — `CorrelationIdFilter` (MDC + header, RNF-OBS-01/03); `SecurityHeadersFilter` (HSTS, nosniff, DENY, Referrer-Policy — RNF-SEC-24, mantido como filtro próprio mesmo depois do Security entrar, ver "Pontos de atenção"); `RateLimitFilter` (RNF-SEC-17, 60 req/min por IP em `/auth/**`, em memória); `CodigoErro` + `ErroResposta` + `EscritorDeErro` + `MapeadorErro` + `GlobalExceptionHandler` → corpo `{ codigo, mensagem, correlationId }` (RNF-ERR-01, pt-BR, sem stack trace); `ErroDeNegocioException`/`ServicoIndisponivelException`; `StandardErrorController` para o despacho `/error`, que o `@RestControllerAdvice` não alcança.
  - `config/` — `AppProperties` (contrato de env), `CorsConfig` (allowlist sem curinga, RNF-SEC-21, com recusa no corpo de erro padrão), `OpenApiConfig` (inclui o `securityScheme` `bearerAuth`), `SecurityConfig` (Spring Security + `oauth2-resource-server`, entrou em P0-NAV — ver "Pontos de atenção"), `JwtConfig`.
  - `usuario/` — `Usuario` (`@Entity`, primeira tabela de domínio do serviço) e `UsuarioRepositorio`.
  - `auth/` — `AutenticacaoController` (`register`/`login`), `MeController`, `ServicoDeAutenticacao`, `EmissorDeToken` (JWT HS256, 15 min), `ControleDeTentativas` (RNF-SEC-29, bloqueio progressivo por identidade, em memória), DTOs de requisição/resposta e `MaiorDeIdade`/`MaiorDeIdadeValidator` (RNF-SEC-43, Bean Validation).
  - `health/` — `GET /health` + `DatabaseHealthChecker` (`SELECT 1`) (RNF-OBS-02).
- **Comandos:** `./mvnw spring-boot:run` · `./mvnw verify` · `./mvnw test` · `./mvnw clean package` · `java -jar target/leai-identidade-0.0.1.jar`. Sempre **a partir desta pasta** — é onde o `.env` é procurado.
- **Testes:** JUnit 5 + AssertJ + Mockito; classes em `src/test/java/**/*Test.java`, com `@DisplayName` em pt-BR. Mínimo atual: health (200 e 503), handler de erro, correlation-id e validação de config. **Nenhum teste toca banco ou rede** — nada de `@SpringBootTest` aqui, para o CI não depender de infraestrutura.
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

- **Senhas com bcrypt** (custo 12, via `PasswordEncoder` do próprio Spring Security — decidido em P0-NAV, 14/09/2026). **Token de acesso**: JWT HS256, 15 minutos, emitido por `EmissorDeToken`. **Renovação revogável (refresh token) ainda não existe** — RF-AUT-03 ficou pela metade de propósito (só `accessToken`); é escopo de F-AUT.
- Token de recuperação de senha: aleatório criptográfico, uso único, validade 1h, armazenado como hash. E-mail transacional por **Brevo**; processamento assíncrono permanece candidato, ainda não definido. **Ainda não implementado** — é F-AUT (recuperação/troca de senha).
- **Rate limiting ativo desde P0-NAV**: `RateLimitFilter` por IP (60 req/min em `/auth/**`, recusado antes da cadeia do Security) e `ControleDeTentativas` por identidade (RNF-SEC-29 — 5 falhas bloqueiam, com bloqueios progressivos de 1/5/15/30 min). Os dois em memória (tensiona RNF-ARQ-04 com mais de uma instância; aceitável enquanto o Render free roda uma só). Mensagens de login não revelam se e-mail/username existe (RNF-SEC-28). Cadastro/recuperação de senha (fora de login) ainda não tem rate limiting próprio — é F-AUT.
- **Privacidade de perfil** (RN-08): validação de relação de seguidor aceita em todos os endpoints, incluindo listagem e busca. Descoberta **só por username exato** — sem enumeração, listagem ou sugestão. **Ainda não implementado.**
- Conta de **administrador** fixa e única, provisionada por variável de ambiente. **Ainda não implementada** — é F-AUT.
- Publica eventos: `seguidor.novo`, `solicitacao.*`. **Spring AMQP ainda não entrou** — mensageria é [P0-MSG](../../../docs/plano-de-desenvolvimento/periodo-0/feature-P0-MSG.md).
- **Spring Security entrou em P0-NAV (14/09/2026), antecipado de F-AUT.** Cadastro, login e `/me` precisam de hash de senha, emissão/validação de token e headers na mesma cadeia, então esperar F-AUT não fazia sentido. `SecurityHeadersFilter` **continua sendo filtro próprio**, não migrou para `HttpSecurity#headers`: o `headers()` do Security só cobre o que passa pela cadeia dele, e deixaria sem cabeçalho justamente a recusa de CORS e os erros do contêiner (decisão registrada, não pendência). Consequência de comportamento: rota protegida inexistente responde `401` em vez de `404` (o Security intercepta antes do dispatcher); rota pública inexistente continua `404`.
- Cadastro recusa menores de 18 anos (RNF-SEC-43), via `@MaiorDeIdade`/`MaiorDeIdadeValidator` (Bean Validation).
