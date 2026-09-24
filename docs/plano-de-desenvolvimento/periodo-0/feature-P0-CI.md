# P0-CI — Pipeline CI/CD

**Período:** 0 · **Prioridade:** fundação
**Dono:** Kayke · **Serviços afetados:** transversal (todos os subprojetos de `code/`)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Processo: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §5. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §6. Em caso de conflito, o `REQUISITOS.md` ganha.

## Objetivo

Montar o pipeline de integração e entrega em **GitHub Actions** que sustenta o fluxo de branches do grupo (plano §5): manter `desenvolvimento` sempre testável e `main` sempre verde e deployável, com **CI rodando todos os testes a cada push** (RNF-TST-07) e **auditoria de dependências** que falha o build em vulnerabilidade alta/crítica (RNF-SEC-26).

O pipeline **filtra por caminho** para não rodar o que não mudou (plano §5, AGENTS §7) e gera o **APK do Flutter como artefato a cada merge em `main`** — o "release do software" que a disciplina cobra e que evita o "funciona na minha máquina" (plano §4). O portão obrigatório do fluxo é o **PR `desenvolvimento` → `main` com CI verde** (plano §5).

Requisitos atendidos: **RNF-TST-07** (CI roda testes a cada push; branch com teste falhando não integra), **RNF-SEC-25** (lockfile versionado, versões fixadas), **RNF-SEC-26** (auditoria de dependências na CI), **RNF-SEC-34** (deploy só de código versionado via pipeline — a parte de deploy fica em [P0-DEPLOY](feature-P0-DEPLOY.md), disparada por este pipeline).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | parcial | Os 6 workflows validados no GitHub (runs verdes em `push` e `pull_request`); branch protection ativa em `main`, mas **sem required status checks** — ver pendência abaixo |
| Backend | concluído | CI dos quatro serviços implementado e verde no GitHub; auditoria Maven específica permanece pendente |
| Web | concluído | `ci-front` executa lint, build, testes e auditoria com filtro por caminho e cache npm |
| Mobile | implementado | `ci-mobile` executa geração, analyze e testes; gera APK release em `main` |

## Especificação

### Infra — GitHub Actions

**Filtro por caminho** (plano §5; AGENTS §7): cada workflow declara `paths:` para só rodar quando o subprojeto correspondente muda. Mudança em `code/front/` não dispara o pipeline do Flutter; mudança em `docs/` **não roda nada**.

```yaml
# .github/workflows/ci-front.yml (exemplo do padrão; um análogo por área)
name: ci-front
on:
  push:
    paths: ["code/front/**", ".github/workflows/ci-front.yml"]
  pull_request:
    paths: ["code/front/**", ".github/workflows/ci-front.yml"]
jobs:
  build-test:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: code/front } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "lts/*", cache: "npm", cache-dependency-path: code/front/package-lock.json }
      - run: npm ci            # lockfile obrigatório (RNF-SEC-25)
      - run: npm run lint
      - run: npm run build
      - run: npm test
      - run: npm audit --audit-level=high   # falha em alta/crítica (RNF-SEC-26)
```

**Estrutura de workflows** (um por área, para o filtro por caminho funcionar de verdade):

| Workflow | Dispara em mudança de | Jobs |
|---|---|---|
| `ci-back-identidade` / `-acervo` / `-leitura` / `-social` | `code/back/<servico>/**` | lint · build · test · auditoria de dependências |
| `ci-front` | `code/front/**` | lint · build · test · `npm audit` |
| `ci-mobile` | `code/mobile/**` | `flutter analyze` · `flutter test` · auditoria a definir · (APK só em `main`) |

> Com a stack alocada (02/09/2026): `identidade` e `social` usam o caminho **Spring**; `acervo` e `leitura` usam o caminho **NestJS**. Os dois templates abaixo permanecem, um por stack.

**Backend — Spring:**
```yaml
- uses: actions/setup-java@v4
  with: { distribution: temurin, java-version: "21", cache: gradle }   # versão a fixar no AGENTS.md do serviço
- run: ./gradlew build            # compila + roda testes
- run: ./gradlew dependencyCheckAnalyze   # OU equivalente de auditoria (RNF-SEC-26)
```

**Backend — NestJS:**
```yaml
- uses: actions/setup-node@v4
  with: { node-version: "lts/*", cache: npm }
- run: npm ci
- run: npm run lint && npm run build && npm test
- run: npm audit --audit-level=high
```

**Mobile — Flutter + APK como artefato** (plano §4):
```yaml
# .github/workflows/ci-mobile.yml
name: ci-mobile
on:
  push:
    paths: ["code/mobile/**", ".github/workflows/ci-mobile.yml"]
  pull_request:
    paths: ["code/mobile/**", ".github/workflows/ci-mobile.yml"]
jobs:
  analyze-test:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: code/mobile } }
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { channel: stable }        # versão a fixar no AGENTS.md do mobile
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test
  apk:
    needs: analyze-test
    if: github.ref == 'refs/heads/main'   # APK só a cada merge em main
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: code/mobile } }
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { channel: stable }
      - run: flutter pub get
      - run: flutter build apk --release
      - uses: actions/upload-artifact@v4
        with: { name: app-des-apk, path: code/mobile/build/app/outputs/flutter-apk/app-release.apk }
```

**Cache** de dependências (gradle/npm/pub) em todos os jobs, para o pipeline não ficar lento e o grupo não começar a ignorá-lo (plano §5).

### Portão de merge (plano §5)

- Commit direto em `desenvolvimento` é o padrão; CI roda a cada push.
- **`desenvolvimento` → `main` só por Pull Request com CI verde** — único portão obrigatório; ninguém commita direto em `main`. Configurar **branch protection** em `main` exigindo os checks de CI aplicáveis (status checks required).
- Review formal não é exigido; quem estiver de plantão faz o merge.

### Recorte Web implementado

- [x] `.github/workflows/ci-front.yml` é descoberto automaticamente pelo GitHub Actions.
- [x] `push` e `pull_request` em `code/front/**` executam somente o workflow Web; alterações apenas em `docs/**` não o disparam.
- [x] Alterações no próprio `.github/workflows/ci-front.yml` também disparam o workflow.
- [x] `workflow_dispatch` permite execução manual pelo botão **Run workflow** na aba Actions.
- [x] Node é carregado pelo `code/front/.nvmrc`, com cache npm baseado em `code/front/package-lock.json`.
- [x] O job executa `npm ci`, `npm run lint`, `npm run build`, `npm test` e `npm audit --audit-level=high` em `code/front`.
- [x] O workflow possui permissão mínima de leitura e cancela uma execução anterior da mesma referência.

### Recorte Backend NestJS implementado

- [x] `.github/workflows/ci-back-acervo.yml` monitora somente `code/back/acervo/**` e o próprio workflow.
- [x] `.github/workflows/ci-back-leitura.yml` monitora somente `code/back/leitura/**` e o próprio workflow.
- [x] Ambos os workflows aceitam `push`, `pull_request` e `workflow_dispatch`.
- [x] Node é carregado pelo `.nvmrc` de cada serviço, com cache npm baseado no respectivo `package-lock.json`.
- [x] Ambos executam `npm ci`, `npm run lint`, `npm run build`, `npm test` e `npm audit --audit-level=high` no diretório correto.
- [x] Ambos possuem permissão mínima de leitura e cancelam uma execução anterior da mesma referência.

### Recorte Backend Spring implementado

- [x] `.github/workflows/ci-back-identidade.yml` monitora `code/back/identidade/**` e o próprio workflow.
- [x] `.github/workflows/ci-back-social.yml` monitora `code/back/social/**` e o próprio workflow.
- [x] Ambos os workflows aceitam `push`, `pull_request` e `workflow_dispatch`.
- [x] Ambos usam Temurin Java 21, cache Maven, `chmod +x mvnw` e `./mvnw -B verify`.
- [x] O comando `verify` compila e executa os testes JUnit configurados em cada serviço.

### Recorte Mobile implementado

- [x] `.github/workflows/ci-mobile.yml` monitora somente `code/mobile/**` e o próprio workflow.
- [x] O workflow aceita `push`, `pull_request` e `workflow_dispatch`, com permissão mínima e cancelamento de execução anterior.
- [x] Flutter é fixado em `3.47.4` na stable, com cache do SDK, Pub e Gradle.
- [x] O job `analyze-test` executa `flutter pub get`, `dart run tool/generate_tokens.dart --check`, `flutter analyze` e `flutter test`.
- [x] O job `apk` depende do `analyze-test`, executa somente em `main`, gera `flutter build apk --release` e publica `app-des-apk` por 7 dias.

### Auditoria de dependências (RNF-SEC-26)

- Backend e web rodam auditoria e **falham em severidade alta/crítica**. O mecanismo equivalente para dependências Flutter deve ser definido no scaffolding antes de RNF-SEC-26 ser marcado como atendido no mobile.
- Lockfile versionado e versões fixadas (RNF-SEC-25) — `npm ci`/`pub get`/lock do gradle, nunca resolução flutuante.

## Critérios de aceite

- [x] Push em `code/front/**` roda só `ci-front`; push em `code/mobile/**` roda só `ci-mobile`; push só em `docs/**` não dispara nenhum pipeline. (verificado em 17/09/2026: os commits só de documentação em `desenvolvimento` não geraram nenhum run)
- [x] Cada workflow roda lint, build e testes do seu subprojeto (RNF-TST-07). (runs verdes dos 6 workflows em `push` e `pull_request`)
- [ ] Um teste falhando **impede** a integração (o check fica vermelho no PR). — **não vale hoje:** o check fica vermelho, mas nada bloqueia o merge enquanto não houver required status checks (ver pendência).
- [ ] Auditoria de dependências roda e falha o build em vulnerabilidade alta/crítica; o mecanismo aplicável ao Flutter está definido (RNF-SEC-26).
- [x] Merge em `main` produz o **APK** como artefato baixável do run. (artefato `app-des-apk` publicado nos builds de 13/09 e 15/09)
- [~] `main` tem branch protection exigindo CI verde; PR é o único caminho para `main`. — **PR é obrigatório** (1 aprovação, `enforce_admins` ativo, sem force push nem deleção); **exigência de CI verde não está ativa**.
- [x] Cache de dependências ativo em todos os jobs.

## Definition of Done

(plano §10)

- [x] Workflows mergeados em `desenvolvimento` e promovidos a `main`
- [x] CI verde (o próprio pipeline se auto-valida) — runs verdes dos 6 workflows em `main`, `desenvolvimento` e branch de feature
- [ ] Testes automatizados dos casos de uso da feature — **N/A de teste de aplicação**: a "prova" desta feature é o pipeline passar/reprovar corretamente (validar com um PR de teste que quebra um teste de propósito) — **não executado**; só faz sentido depois que o required status check estiver ativo
- [ ] Spec OpenAPI do serviço atualizado em `docs/api/` — **N/A**: feature de pipeline, não expõe API. Justificativa registrada aqui em vez de remover o item.
- [x] Fluxo funcionando em DES/HML — o disparo do deploy a partir de `main` é validado junto de [P0-DEPLOY](feature-P0-DEPLOY.md): os 5 serviços respondem em DES
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver (N/A)

## Pendências

- ~~**Web / Backend NestJS / Backend Spring / Mobile:** executar o primeiro workflow no GitHub para validar o ambiente Actions e os checks.~~ — **feito (verificado em 17/09/2026):** os 6 workflows já rodaram no GitHub, todos verdes, em `push` e `pull_request`, incluindo `main`, `desenvolvimento` e branch de feature. O `ci-mobile` publicou o artefato `app-des-apk` em `main`.
- **`main` sem required status checks — pendência aberta e a mais relevante desta feature.** A branch protection existe e exige PR com 1 aprovação, com `enforce_admins` ativo e sem force push nem deleção, mas `required_status_checks` está desligado (`contexts` e `checks` vazios). Consequência: **um PR com CI vermelho pode ser mergeado em `main` desde que alguém aprove** — o "portão obrigatório" do plano §5 hoje é só o PR, não o CI verde. Adicionar como checks obrigatórios `ci-front`, `ci-mobile` e os quatro `ci-back-*`; como os workflows filtram por caminho, marcar cada check como obrigatório só vale se estiver configurado para não travar PR que não toca aquele subprojeto (usar os checks aplicáveis ou jobs de convergência). Decisão de configuração do repositório, não de código.
- **Depende de [P0-INFRA](feature-P0-INFRA.md):** stack alocada em 02/09/2026 — `identidade`/`social` em Spring, `acervo`/`leitura` em NestJS; cada job de backend usa o caminho da sua stack.
- **Depende de [P0-DEPLOY](feature-P0-DEPLOY.md)** para o gancho de deploy a partir de `main` (RNF-SEC-34).
- ~~Confirmar se o repositório do **GitHub Classroom** permite Actions sem restrição.~~ — **confirmado na prática (17/09/2026):** dezenas de runs executaram sem bloqueio nem estrangulamento de minutos. O `schedule` continua a ser validado por [P0-MSG](feature-P0-MSG.md), que é um gatilho diferente e pode ser desativado por inatividade do repositório.
- Ferramenta de auditoria do Spring a fixar (OWASP Dependency-Check, `gradle`/`mvn` plugin, ou equivalente).

## Timeline

### Verificação 17/09/2026: auditoria do estado real no GitHub. Os 6 workflows (`ci-front`, `ci-mobile`, `ci-back-identidade`, `ci-back-acervo`, `ci-back-leitura`, `ci-back-social`) já rodaram e estão **todos verdes**, em `push` e `pull_request`, cobrindo `main`, `desenvolvimento` e branch de feature — o que encerra as quatro pendências de "executar o primeiro run" e a dúvida sobre restrição de Actions no GitHub Classroom. O filtro por caminho está comprovado: os commits só de documentação não dispararam nenhum run. O artefato `app-des-apk` foi publicado em `main`. **Divergência encontrada:** a branch protection de `main` exige PR com 1 aprovação, mas **não** exige status checks — o portão de "CI verde" do plano §5 não está efetivamente ativo. Registrada como pendência aberta; é configuração de repositório e não foi alterada por conta própria.

### Web concluída em 12/09/2026: criado `.github/workflows/ci-front.yml` com gatilhos de `push`, `pull_request`, `workflow_dispatch`, filtro por `code/front/**`, Node via `.nvmrc`, cache npm, lint, build, testes e auditoria de dependências. Backend, mobile, branch protection e validação do primeiro run no GitHub permanecem pendentes.

### Backend NestJS concluído em 12/09/2026: criados `ci-back-acervo.yml` e `ci-back-leitura.yml` com filtros por serviço, Node 22 via `.nvmrc`, cache npm, lint, build, testes e auditoria de dependências. Os workflows Spring aguardam a criação de `identidade` e `social` com seus respectivos `mvnw`.

### Backend Spring concluído em 12/09/2026: criados `ci-back-identidade.yml` e `ci-back-social.yml` com Temurin Java 21, cache Maven, `mvnw` e `./mvnw -B verify`. Os dois serviços Spring já possuem `pom.xml`, wrapper e testes no scaffolding P0-INFRA; permanece pendente apenas a auditoria Maven específica e a validação do primeiro run no GitHub.

### Mobile concluído em 13/09/2026: criado `.github/workflows/ci-mobile.yml` com Flutter 3.47.4, cache do SDK/Pub/Gradle, verificação dos artefatos gerados, análise estática e testes. Em `main`, o job dependente gera o APK release e publica o artefato `app-des-apk`; permanece pendente a validação do primeiro run, branch protection e definição da auditoria Flutter.

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-CI no [periodo-0/README.md](README.md), do [`plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §5 e dos RNF de teste/segurança (RNF-TST-07, RNF-SEC-25/26/34). Jobs de backend mantidos como template duplo (Spring/Nest) enquanto a stack por serviço é pendência.
