# P0-CI — Pipeline CI/CD

**Período:** 0 · **Prioridade:** fundação
**Dono:** a definir · **Serviços afetados:** transversal (todos os subprojetos de `code/`)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Processo: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §5. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §6. Em caso de conflito, o `REQUISITOS.md` ganha.

## Objetivo

Montar o pipeline de integração e entrega em **GitHub Actions** que sustenta o fluxo de branches do grupo (plano §5): manter `desenvolvimento` sempre testável e `main` sempre verde e deployável, com **CI rodando todos os testes a cada push** (RNF-TST-07) e **auditoria de dependências** que falha o build em vulnerabilidade alta/crítica (RNF-SEC-26).

O pipeline **filtra por caminho** para não rodar o que não mudou (plano §5, AGENTS §7) e gera o **APK do Flutter como artefato a cada merge em `main`** — o "release do software" que a disciplina cobra e que evita o "funciona na minha máquina" (plano §4). O portão obrigatório do fluxo é o **PR `desenvolvimento` → `main` com CI verde** (plano §5).

Requisitos atendidos: **RNF-TST-07** (CI roda testes a cada push; branch com teste falhando não integra), **RNF-SEC-25** (lockfile versionado, versões fixadas), **RNF-SEC-26** (auditoria de dependências na CI), **RNF-SEC-34** (deploy só de código versionado via pipeline — a parte de deploy fica em [P0-DEPLOY](feature-P0-DEPLOY.md), disparada por este pipeline).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | `.github/workflows/` inexistente |
| Backend | não iniciado | jobs de lint/build/test por serviço (Spring e Nest) |
| Web | não iniciado | job de lint/build/test do Vue |
| Mobile | não iniciado | job de analyze/test + build do APK |

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

### Auditoria de dependências (RNF-SEC-26)

- Backend e web rodam auditoria e **falham em severidade alta/crítica**. O mecanismo equivalente para dependências Flutter deve ser definido no scaffolding antes de RNF-SEC-26 ser marcado como atendido no mobile.
- Lockfile versionado e versões fixadas (RNF-SEC-25) — `npm ci`/`pub get`/lock do gradle, nunca resolução flutuante.

## Critérios de aceite

- [ ] Push em `code/front/**` roda só `ci-front`; push em `code/mobile/**` roda só `ci-mobile`; push só em `docs/**` não dispara nenhum pipeline.
- [ ] Cada workflow roda lint, build e testes do seu subprojeto (RNF-TST-07).
- [ ] Um teste falhando **impede** a integração (o check fica vermelho no PR).
- [ ] Auditoria de dependências roda e falha o build em vulnerabilidade alta/crítica; o mecanismo aplicável ao Flutter está definido (RNF-SEC-26).
- [ ] Merge em `main` produz o **APK** como artefato baixável do run.
- [ ] `main` tem branch protection exigindo CI verde; PR é o único caminho para `main`.
- [ ] Cache de dependências ativo em todos os jobs.

## Definition of Done

(plano §10)

- [ ] Workflows mergeados em `desenvolvimento`
- [ ] CI verde (o próprio pipeline se auto-valida)
- [ ] Testes automatizados dos casos de uso da feature — **N/A de teste de aplicação**: a "prova" desta feature é o pipeline passar/reprovar corretamente (validar com um PR de teste que quebra um teste de propósito)
- [ ] Spec OpenAPI do serviço atualizado em `docs/api/` — **N/A**: feature de pipeline, não expõe API. Justificativa registrada aqui em vez de remover o item.
- [ ] Fluxo funcionando em DES/HML — o disparo do deploy a partir de `main` é validado junto de [P0-DEPLOY](feature-P0-DEPLOY.md)
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver (N/A)

## Pendências

- **Depende de [P0-INFRA](feature-P0-INFRA.md):** stack alocada em 02/09/2026 — `identidade`/`social` em Spring, `acervo`/`leitura` em NestJS; cada job de backend usa o caminho da sua stack.
- **Depende de [P0-DEPLOY](feature-P0-DEPLOY.md)** para o gancho de deploy a partir de `main` (RNF-SEC-34).
- Confirmar se o repositório do **GitHub Classroom** permite Actions sem restrição (mesma validação de [P0-MSG](feature-P0-MSG.md) para o `schedule`); se houver limite de minutos, priorizar caminho por filtro.
- Ferramenta de auditoria do Spring a fixar (OWASP Dependency-Check, `gradle`/`mvn` plugin, ou equivalente).

## Timeline

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-CI no [periodo-0/README.md](README.md), do [`plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §5 e dos RNF de teste/segurança (RNF-TST-07, RNF-SEC-25/26/34). Jobs de backend mantidos como template duplo (Spring/Nest) enquanto a stack por serviço é pendência.
