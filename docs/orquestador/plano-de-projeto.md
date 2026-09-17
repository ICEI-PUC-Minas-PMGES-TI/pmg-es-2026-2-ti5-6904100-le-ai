# Plano de Projeto — Trabalho Interdisciplinar

> **O que este arquivo é:** o processo de trabalho do grupo. Como organizamos o repositório, como dividimos tarefas, como usamos agentes, quais são os prazos e o que conta como "pronto".
>
> **O que este arquivo NÃO é:** decisão de produto, arquitetura ou tecnologia. Escopo, usuários, modelo de dados, divisão dos microsserviços e design tokens ficam nos documentos correspondentes do orquestrador. Este documento diz *como trabalhamos* e define o Definition of Done do processo; o `docs/orquestador/REQUISITOS.md` diz *o que construímos*.

---

## 1. Restrições do projeto

| Item | Definição |
|---|---|
| Mobile | App nativo em Flutter |
| Web | SPA em Vue + Tailwind CSS |
| Backend | Microsserviços em Spring e NestJS; identidade/social em Spring, acervo/leitura em NestJS (Documento de Arquitetura §2.1) |
| Banco | PostgreSQL no Neon |
| Repositório | Único, criado pela faculdade via GitHub Classroom |
| Equipe | 5 integrantes, todos atuando como full-stack |
| Duração | 04/08 a 01/12 (entrega final), apresentação em 15/12 |

---

## 2. Estrutura do repositório

A faculdade impõe a estrutura de alto nível do repositório. Neste repositório, a documentação fica em `docs/` e o código em `code/`. Se a faculdade alterar essa estrutura, adaptamos os nomes e mantemos a lógica — documentação em uma árvore, código em outra, um `AGENTS.md` por subprojeto.

```
/
├── AGENTS.md                       # contexto raiz para agentes (ver §7) — precisa ficar na raiz
├── CLAUDE.md                       # ponteiro para AGENTS.md — idem
├── README.md                       # entrada do repositório
├── docs/
│   ├── orquestador/                # FONTE REAL — os 4 documentos-mestre (ver §2.1)
│   │   ├── plano-de-projeto.md     # este arquivo
│   │   ├── REQUISITOS.md           # fonte de verdade do produto
│   │   ├── documento-de-arquitetura.md
│   │   └── documento-de-design.md
│   ├── README.md                   # capa/índice do documento da disciplina (SUMÁRIO)
│   ├── 1.apresentacao.md           # documentos da disciplina (1–8): DERIVADOS do orquestador
│   ├── 2.nosso_produto.md
│   ├── 3.requisitos.md
│   ├── 4.modelagem.md
│   ├── 5.wireframe.md
│   ├── 6.avaliacao_heuristica.md
│   ├── 7.solucao.md
│   ├── 8.avaliacao_arquitetura.md
│   ├── diagramas/                  # fontes .mmd dos diagramas (Mermaid)
│   ├── imagens/                    # figuras renderizadas (.png) dos documentos da disciplina
│   ├── evidencias/                 # evidências (avaliação heurística etc.)
│   ├── api/                        # specs OpenAPI: um .yaml por serviço (ver §8)
│   ├── mensageria/                 # catálogo e JSON Schemas dos eventos (ver §8)
│   ├── plano-de-desenvolvimento/       # features por período (ver §9) — FORA do orquestrador
│   │   ├── README.md                   # índice + tabela-mestre de features
│   │   ├── periodo-0/
│   │   │   └── feature-*.md
│   │   ├── periodo-1/
│   │   ├── periodo-2/
│   │   └── periodo-3/
├── code/                           # código (ver AGENTS.md raiz §4)
│   ├── mobile/                     # + AGENTS.md
│   ├── front/                      # + AGENTS.md
│   └── back/
│       ├── identidade/             # + AGENTS.md
│       ├── acervo/                 # + AGENTS.md
│       ├── leitura/                # + AGENTS.md
│       └── social/                 # + AGENTS.md
├── assets/
│   ├── atas/                       # atas de reunião semanais
│   └── contribuicao_semanal/       # relatórios individuais semanais
└── divulge/                        # apresentação e vídeo
```

> O `docs/orquestador/documento-de-design.md` especifica o design system. Os tokens planejados ficam em `docs/design-system/`, e sua criação pertence ao período-0. Os **prompts de tela e os protótipos** ficam em `docs/design/`, agrupados por período e por feature, com as convenções de escrita em `docs/design/AGENTS.md`. As **fontes dos diagramas** (`.mmd`) ficam em `docs/diagramas/`, e `docs/imagens/` guarda as **figuras renderizadas** (`.png`) que os documentos da disciplina referenciam — fonte e figura andam em par: quem edita um `.mmd` regenera o `.png` correspondente na mesma passada (`mmdc -i docs/diagramas/<nome>.mmd -o docs/imagens/<nome>.png -b white -s 3`).

Regras:

- **`AGENTS.md` e `CLAUDE.md` ficam na raiz e não se movem.** As ferramentas procuram por eles ali; dentro de `docs/` elas não encontram. São a única exceção à regra de manter a raiz limpa.
- Todo o resto da documentação vive em `docs/`, inclusive este arquivo, o `REQUISITOS.md` e os arquivos de feature. `docs/` é entregável: quase todo artefato cobrado pela disciplina mora ali.
- Se a estrutura da faculdade divergir, ajustamos os caminhos aqui **e** nos `AGENTS.md` na mesma passada — caminho errado no `AGENTS.md` significa agente lendo o arquivo errado.
- Cada subprojeto de código tem seu próprio `AGENTS.md` com as convenções daquela stack.
- Referências a arquivos neste documento usam o caminho relativo à raiz, não o nome solto.

---

## 2.1. Orquestador e documentos da disciplina

Existem **duas árvores de documentação com papéis diferentes**, e confundi-las é o erro que esta seção existe para impedir.

| Árvore | O que é | Quem edita |
|---|---|---|
| **`docs/orquestador/`** | **A fonte real.** Os quatro documentos-mestre onde as decisões de fato moram e são discutidas: `REQUISITOS.md` (fonte de verdade do produto), `documento-de-arquitetura.md`, `documento-de-design.md` e este `plano-de-projeto.md`. | O grupo, diretamente. Mudança de requisito segue o controle de mudança da §3. |
| **`docs/` (raiz), arquivos `1.` a `8.`** | **Documentos derivados.** O documento no formato exigido pela disciplina (template PUC), com o `README.md` como capa/SUMÁRIO. Existem para a entrega; **não** são fonte. | Preenchidos e atualizados **a partir** do orquestador, nunca inventados. |

**Regra central:** os documentos da disciplina (`docs/1.` a `docs/8.`) são **projeções** do orquestador e precisam ser mantidos em sincronia com ele. Eles não guardam decisão nova — refletem, no formato da disciplina, o que o orquestador já decidiu.

### Propagação de impacto (obrigatória)

Toda alteração em um documento do orquestador que mude algo já projetado num documento da disciplina **tem que ser refletida nele na mesma passada**. Isto é uma extensão do passo 4 do controle de mudança da §3: quando a análise de impacto de uma mudança de requisito/arquitetura/design é feita, "documentos da disciplina afetados" entra na lista de impactos, ao lado de features, diagramas e specs OpenAPI.

Mapa de origem → destino, para saber o que atualizar:

| Documento da disciplina | Deriva principalmente de |
|---|---|
| `docs/README.md` (capa, resumo, ferramentas) | `docs/orquestador/REQUISITOS.md` §1 |
| `docs/1.apresentacao.md` (problema, objetivos, definições) | `docs/orquestador/REQUISITOS.md` §1, §3 |
| `docs/2.nosso_produto.md` (visão, produto, personas) | `docs/orquestador/REQUISITOS.md` §1, §4 |
| `docs/3.requisitos.md` (RF, RNF, restrições, mecanismos) | `docs/orquestador/REQUISITOS.md` §2, §5, §7, §8 + `docs/orquestador/documento-de-arquitetura.md` §2, §5 |
| `docs/4.modelagem.md` (visão geral, histórias, visão lógica, dados) | `docs/orquestador/documento-de-arquitetura.md` §1, §3, §4, §5 + `docs/orquestador/REQUISITOS.md` §3, §5 |
| `docs/5.wireframe.md` | `docs/orquestador/documento-de-design.md` + protótipos |
| `6.avaliacao_heuristica.md` | **exceção:** avaliação de aplicação externa, exercício da disciplina — **não deriva do orquestador** |
| `docs/7.solucao.md` (telas construídas) | telas reais do sistema (a partir do período-0) |
| `docs/8.avaliacao_arquitetura.md` (ATAM) | `docs/orquestador/documento-de-arquitetura.md` §5, §7 + `docs/orquestador/REQUISITOS.md` §7, §8 (cenários); medições a partir do sistema em DES |

**Consequência prática:** ao terminar uma sessão que mexeu no orquestador, verifique a coluna de destino e atualize o(s) documento(s) da disciplina afetado(s), ou registre a pendência de atualização no arquivo da feature. Documento da disciplina desatualizado em relação ao orquestador é o mesmo tipo de dívida que spec OpenAPI desatualizado (§8). Como qualquer artefato, gerar/atualizar os documentos da disciplina pode ser delegado a um agente, que lê o orquestador e reescreve o derivado — mas o agente nunca inventa conteúdo que não esteja na fonte.

O agente **não** edita `docs/orquestador/*` por conta própria (mesma regra da §7 para o `REQUISITOS.md`); pode e deve manter os `docs/1.`–`8.` sincronizados com ele.

---

## 3. Fases e timebox (mapeado ao cronograma da disciplina)

As fases do guia de projeto mapeiam nas sprints da matéria. **A disciplina define 3 períodos de desenvolvimento** (Sprints 4, 5 e 6), mais o período-0.

**A tabela abaixo é piso, não teto.** Cada data é o mínimo que precisa estar pronto naquele momento — nada impede o grupo de chegar antes, e adiantar é desejável. Se as prioritárias fecharem em duas semanas em vez de três, começamos as desejáveis; se o período-0 fechar antes de 01/09, começamos a codificar feature. O único sentido em que as datas são rígidas é o contrário: não terminar depois delas.

| Data | Sprint | Fase do nosso processo | Entrega |
|---|---|---|---|
| 04/08 | S1 S1 | Tema e visão de produto | — |
| **11/08** | S1 S2 | Lean Inception finalizada | **Entrega 1 — 5 pts** |
| 18/08 | S2 S1 | **Requisitos** (`docs/orquestador/REQUISITOS.md` v1) + Doc. Arquitetura §1–4 inicial + Product/Sprint Backlog | — |
| 25/08 | S2 S2 | **Baseline dos requisitos** + **Diagramas** + Plano de Desenvolvimento (features por período) | — |
| **01/09** | S2 S3 | Termo de abertura, kickoff, Doc. Arquitetura final | **Entrega 2 — 15 pts** |
| 01/09 | S3 S1 | **Protótipos** (caminho crítico) + **período-0** (infra, CI, deploy DES, navegabilidade) | — |
| **08/09** | S3 S2 | Protótipos corrigidos + avaliação heurística | **Entrega 3 — 10 pts** |
| 15/09 | S4 S1 | **Período 1** — funcionalidades **prioritárias** + EAP | — |
| 22/09 | S4 S2 | Período 1 (continuação) | — |
| **29/09** | S4 S3 | Fechamento período 1 + release | **Entrega 4 — 15 pts** |
| 06/10 | S5 S1 | **Período 2** — funcionalidades **desejáveis** + testes das prioritárias | — |
| 20/10 | S5 S2 | Período 2 (semana de 13/10 sem aula — usar como folga real, não como prazo) | — |
| 27/10 | S5 S3 | Período 2 (continuação) | — |
| **03/11** | S5 S4 | Fechamento período 2 + release | **Entrega 5 — 15 pts** |
| 10/11 | S6 S1 | **Período 3** — opcionais/refino + testes das desejáveis + ATAM inicial | — |
| 17/11 | S6 S2 | **Verificação geral** do projeto + ATAM | — |
| 24/11 | S6 S3 | Congelamento de código + **deploy de produção** + pitch | — |
| **01/12** | S6 S4 | Doc. Arquitetura final, relatório de encerramento, vídeo | **Entrega 6 — 40 pts** |
| 15/12 | — | Apresentação | — |

Consequências que valem estar explícitas:

- **Requisitos têm até 2 semanas.** Em 25/08, no mais tardar, o `docs/orquestador/REQUISITOS.md` atinge a **baseline**: completo o suficiente para prototipar e planejar o desenvolvimento em cima dele. Não é um documento imutável — é um documento com controle de mudança (ver abaixo). A expectativa é que mude poucas vezes.
- **Protótipos têm até 1 semana.** Não dá para prototipar todas as telas de web + mobile nesse tempo. Prototipamos o caminho crítico e as telas das funcionalidades prioritárias; o resto sai direto do design system. Se sobrar tempo, prototipamos mais — mas nunca às custas de começar o período-0.
- **Período-0 acontece dentro da Sprint 3**, porque a disciplina já pede "código parcial com navegabilidade" em 01/09. Escrever isso já com CI e deploy em DES é o mesmo trabalho, feito uma vez só.
- **Testes não são fase.** A disciplina cobra testes nas Sprints 5 e 6, mas escrevê-los junto com a feature (§10) transforma essas cobranças em checkpoint, não em mutirão.
- **40 dos 100 pontos estão na última entrega.** Nenhuma feature nova entra depois de 17/11 — esse é o único limite que não se antecipa nem se estica.

### Adiantamento

Terminar antes é o resultado desejado, não uma folga para parar. Quando um período fecha cedo:

1. Fechamos o período de verdade primeiro: DoD de todas as features cumprido, tag criada, deploy em DES validado. Período "quase pronto" não libera o próximo.
2. Puxamos features do período seguinte, na ordem de prioridade já definida no Plano de Desenvolvimento — não escolhemos a feature mais divertida.
3. Se não houver o que puxar, o tempo vai para o que sempre fica para trás: testes, atualização dos specs OpenAPI, diagramas, Documento de Arquitetura, pendências acumuladas.

O que **não** fazemos com tempo adiantado é aumentar escopo por conta própria. Feature nova só entra pelo controle de mudança de requisitos.

### Mudança de requisitos após a baseline

Imprevisto vai acontecer, e alterar o `docs/orquestador/REQUISITOS.md` é um caminho previsto — só não é um caminho silencioso, porque tudo depende dele. O procedimento:

1. Quem detectou registra a divergência como **pendência no arquivo da feature** onde ela apareceu. Nunca edita o `docs/orquestador/REQUISITOS.md` na hora, e nunca deixa o agente editar.
2. O grupo decide na reunião semanal (ou no chat, se for urgente e pequeno).
3. Se aprovada, a alteração entra no `docs/orquestador/REQUISITOS.md` com registro no `## Timeline` do arquivo, no formato `## Alteração DD/MM: ...`.
4. Quem fez a alteração verifica o impacto: quais features já implementadas ou já especificadas mudam de comportamento, quais diagramas, specs OpenAPI, schemas/catálogo de mensageria e documentos da disciplina precisam de atualização, e se o Documento de Arquitetura é afetado. Cada impacto vira pendência no arquivo da feature correspondente.

O passo 4 é o que dá o custo real da mudança — e é justamente por isso que ele desencoraja mudanças de conveniência sem bloquear as necessárias.

### Corte de escopo

Toda feature é classificada em `prioritaria`, `desejavel` ou `opcional` no Plano de Desenvolvimento — a mesma classificação que a disciplina usa. Regra de fechamento de período: o que não terminou desce um nível de prioridade e vai para o período seguinte; as `opcionais` são o colchão que absorve o atraso. Nunca atrasamos uma entrega para caber escopo.

---

## 4. Ambientes

| Ambiente | Origem | Propósito |
|---|---|---|
| Local | máquina do dev | desenvolvimento; banco Postgres local do dev |
| **DES/HML** | branch `main` | ambiente rodando de verdade a cada merge; é o que demonstramos e o que vale como "release" da sprint |
| **PROD** | tag `vX.Y.Z` | só a partir de 24/11 |

- Hospedagem: Render (ou equivalente), conectado ao repo da faculdade. Detalhes de provisionamento vão para `docs/orquestador/REQUISITOS.md` / Documento de Arquitetura.
- Banco: um projeto Neon com **uma branch fixa para DES/HML** — **não há branch de banco por dev** (decisão da equipe em 12/09/2026); o desenvolvimento local usa Postgres local. Isolamento entre serviços (schema ou database por serviço) é decisão de `docs/orquestador/REQUISITOS.md`.
- Mobile em DES: APK gerado como artefato do CI a cada merge em `main`. Nada de "funciona na minha máquina".
- Segredos: `.env.example` versionado, `.env` nunca. Variáveis reais só no painel do provedor e no GitHub Secrets.

---

## 5. Branches, commits e releases

Duas branches permanentes. Produção não precisa de branch — precisa de tag.

```
desenvolvimento  ──►  main  ──►  tag vX.Y.Z
 (trabalho + CI)    (deploy DES/HML)  (deploy PROD)

 feat/<slug>  ──┘   (opcional, quando fizer sentido)
```

- **`desenvolvimento`** — branch de trabalho. Todo mundo commita aqui direto. CI roda lint, build e testes a cada push.
- **`main`** — sempre verde e sempre deployável. Merge aqui dispara deploy em DES/HML.
- **`feat/<slug>`** — **opcional**. Quem quiser isolar algo específico da feature em que está atuando pode criar uma; não é obrigatório e não é o fluxo padrão. Casos em que costuma valer a pena: refatoração que toca muitos arquivos, experimento que pode não dar certo, mudança que quebra a build enquanto está pela metade. Se criar, mantenha curta — branch longa é o que gera conflito.
- **Tags** — uma versão progressiva `vX.Y.Z` no fim de cada período, criando um GitHub Release. É literalmente o artefato "Release do software" que a disciplina pede em quase toda sprint.

Regras de merge:

- Commit direto em `desenvolvimento` é o padrão. Como a divisão é vertical (§6), os arquivos alterados por cada pessoa são majoritariamente diferentes e o conflito é raro.
- **`desenvolvimento` → `main` sempre por PR, com CI verde.** É o único portão obrigatório do fluxo, e é o que garante que o ambiente de DES nunca fique quebrado. Review formal não é exigido; quem estiver de plantão faz o merge.
- Ninguém commita direto em `main`.
- Se você quebrou a `desenvolvimento`, conserta ou reverte antes de sair — os outros 4 estão em cima dela.
- `git pull --rebase` antes de começar a trabalhar e antes de subir. Com todo mundo na mesma branch, isso mantém o histórico legível e evita merge commit a cada push.
- Commits em Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. Isso alimenta o relatório de contribuição semanal (§12) quase sem trabalho extra.
- **Migrations:** nome com timestamp, e cada feature só cria migration das tabelas do serviço que ela mexe. Migration é sempre revisada por humano antes de subir — é o único ponto onde o custo de um erro do agente é alto.

CI deve filtrar por caminho: mudança em `code/front/` não roda o pipeline do Flutter, e mudança em `docs/` não roda nada. Sem isso o pipeline fica lento e o grupo começa a ignorar.

---

## 6. Divisão de trabalho

**Divisão vertical:** cada dev é dono de uma feature de ponta a ponta — infra (se houver), backend, web e mobile. Ninguém fica esperando o backend de outra pessoa, e a feature inteira cabe em uma sessão de agente.

- Volume por pessoa varia conforme disponibilidade da semana; não há hierarquia entre os 5.
- O dono da feature é registrado no arquivo dela e é quem responde por ela na verificação final.
- **Onde a divisão vertical vaza:** duas features diferentes podem tocar o mesmo serviço. Quando isso acontece, quem chegar primeiro define a estrutura, e o contrato OpenAPI (§8) é o que evita retrabalho. Sinalizar no grupo antes de mexer em serviço que já tem dono de outra feature.
- Rotação de plantão semanal: uma pessoa por semana fica responsável por fechar `desenvolvimento` → `main`, verificar o deploy em DES e consolidar a ata.

---

## 7. Convenções para agentes

Usamos ferramentas variadas (Claude Code, opencode + codex, Claude Design, outras). A convenção precisa ser agnóstica.

- **`AGENTS.md` é o padrão.** Um na raiz do repositório com as regras gerais do projeto — não dentro de `docs/`, senão as ferramentas não encontram —, um em cada subprojeto de código com as convenções daquela stack (versão da linguagem, estrutura de pastas, padrão de teste, comandos de build).
- **`CLAUDE.md`** na raiz é apenas um arquivo de uma linha apontando para `AGENTS.md` (ou um symlink). Ferramentas que leem outro nome recebem o mesmo tratamento — o conteúdo vive num lugar só.
- Formato: Markdown puro, sem sintaxe específica de ferramenta.

Regras de uso:

1. Toda sessão de implementação começa com `docs/orquestador/REQUISITOS.md`, o arquivo da feature e os `AGENTS.md` raiz e local em contexto. Tarefas de backend, infraestrutura, dados ou mensageria incluem também o Documento de Arquitetura; tarefas visuais ou de interação incluem o Documento de Design.
2. O agente atualiza o arquivo da feature **ao final da sessão de implementação**: status, pendências, decisões tomadas. Sessões exclusivamente de pesquisa, auditoria ou revisão somente leitura entregam o relatório solicitado e não alteram a feature.
3. O agente não edita arquivos de features que não são a dele.
4. O agente não altera nenhum arquivo de `docs/orquestador/` por conta própria. Divergência vira pendência no arquivo da feature e decisão do grupo; edição do orquestrador exige autorização humana explícita.
5. Protótipo é referência visual, não especificação de pixel. Viewport fixo no protótipo não significa layout fixo na implementação.

---

## 8. Contratos de integração

Mesmo com divisão vertical, os contratos existem — e não são cerimônia prévia, são **subproduto do DoD**.

### 8.1 HTTP

- Cada serviço expõe seu spec em runtime: `/v3/api-docs` no Spring e pelo endpoint configurado com `@nestjs/swagger` no NestJS.
- O spec é **commitado** em `docs/api/<servico>.yaml`. Atualizar é item obrigatório do Definition of Done da feature.
- Granularidade: **um spec por serviço**, nunca por feature. A feature atualiza o spec do serviço que ela mexeu.

### Documentação centralizada

Um único Swagger UI lê todos os specs e oferece um dropdown para trocar de serviço:

```yaml
# docker-compose.docs.yml
services:
  api-docs:
    image: swaggerapi/swagger-ui
    ports:
      - "8080:8080"
    volumes:
      - ./docs/api:/usr/share/nginx/html/specs:ro
    environment:
      URLS: >
        [
          {"url":"/specs/service1.yaml","name":"service1"},
          {"url":"/specs/service2.yaml","name":"service2"}
        ]
      URLS_PRIMARY_NAME: service1
```

`docker compose -f docker-compose.docs.yml up` → `localhost:8080` com todos os contratos do projeto. Como os specs vêm do repositório, funciona offline e sem subir os serviços.

Para a entrega final, gerar o HTML estático dos specs e anexar ao Documento de Arquitetura.

Por que isso importa mesmo sendo a mesma pessoa nas 3 camadas: você escreve o backend na segunda e consome no Flutter na quinta. O spec é a sua própria memória — e a do agente, que para de adivinhar formato de payload.

### 8.2 Mensageria

- Envelope, catálogo e schemas canônicos ficam em `docs/mensageria/`, neutros entre Java e TypeScript.
- P0-MSG possui transporte, topologia, dispatcher, recibo, retry e DLQ; a feature produtora possui o schema de `data` e a gravação domínio+outbox.
- Granularidade: um arquivo por `(type, version)`. Schema publicado é imutável; mudança incompatível cria nova versão.
- A feature que produz ou passa a consumir evento atualiza catálogo/schema e testes de contrato na mesma passada. Evento futuro não cria fila acumuladora; o consumidor executa backfill antes do binding.
- A cópia runtime de um schema deve ser comparada no CI com a fonte canônica para impedir divergência.

---

## 9. Arquivo de feature

Um arquivo por feature em `docs/plano-de-desenvolvimento/periodo-N/`. Estrutura mínima:

```markdown
# <ID> — <Nome da feature>

**Período:** N · **Prioridade:** prioritaria | desejavel | opcional
**Dono:** <nome> · **Serviços afetados:** service1, service2

## Objetivo
O que essa feature entrega, para qual usuário, e qual requisito de
`REQUISITOS.md` ela atende (referenciar a seção).

> `REQUISITOS.md` é a fonte de verdade. Em caso de conflito, ele ganha.

## Status
| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado / em andamento / pronto | |
| Backend | | |
| Web | | |
| Mobile | | |

## Especificação
### Infra
### Backend / API
Endpoints, payloads, regras de negócio, validações, erros.
### Frontend Web
### App Flutter

## Critérios de aceite
- [ ] ...

## Definition of Done
(ver §10 — marcar aqui)

## Pendências
Itens abertos desta feature. Quando o grupo precisar de uma visão geral,
pedimos a um agente para varrer os arquivos de feature e sumarizar.

## Timeline
### Criação DD/MM/AAAA: ...
```

No período-0, a prioridade especial `fundacao` identifica trabalho estrutural anterior às features de produto. Sem `PENDENCIAS.md` global: pendência vive no arquivo da feature, e a consolidação é gerada sob demanda. Isso evita um arquivo único disputado por 5 pessoas e por agentes.

---

## 10. Definition of Done

Este plano define o Definition of Done do processo; `docs/orquestador/REQUISITOS.md` fornece as obrigações de produto, segurança e testes que também se aplicam. Para toda feature:

- [ ] Código nas camadas aplicáveis mergeado em `desenvolvimento`
- [ ] CI verde (lint, build, testes)
- [ ] Testes automatizados dos casos de uso da feature (mínimo: backend)
- [ ] Spec OpenAPI do serviço atualizado em `docs/api/`
- [ ] Se produz ou consome evento, catálogo/schema em `docs/mensageria/` atualizado e testado
- [ ] Fluxo funcionando **em DES/HML**, não só localmente
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Se o protótipo divergiu da implementação, a divergência está registrada

Feature específica pode acrescentar itens no próprio arquivo. Nunca remover destes.

---

## 11. Design system

O `docs/orquestador/documento-de-design.md` especifica os tokens como valores neutros — paleta, escala tipográfica, espaçamento, raio, elevação — e **não** como classes de framework. A feature P0-DS materializa esses valores em `docs/design-system/tokens.json`, que será a fonte canônica consumida pelas duas stacks.

Motivo: o design system será implementado duas vezes (na stack web e no `ThemeData` do Flutter). Se os tokens forem neutros, o agente traduz para os dois lados sem divergir. Se forem classes CSS, mobile e web derivam.

O mesmo documento alimenta os prompts do Claude Design e as duas implementações, e é a origem do `5.wireframe.md` da disciplina.

---

## 12. Rituais e artefatos da disciplina

A disciplina cobra semanalmente, e isso precisa custar pouco:

- **Ata semanal** (`assets/atas/ATA-AAAA-MM-DD.md`): decisões, pendências, próximos passos. Responsabilidade do plantão da semana.
- **Relatório de contribuição individual** (`assets/contribuicao_semanal/<nome>/AAAA-MM-DD.md`): cada um gera o seu a partir do histórico de commits/PRs e do status das suas features. Como os commits seguem Conventional Commits e as features têm dono, um agente monta o rascunho em minutos.
- **Fechamento de período:** tag + GitHub Release + atualização do Documento de Arquitetura + planejamento do período seguinte.

---

## 13. Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Requisitos se estendem além de 25/08 | Baseline em 25/08 vale como marco; o que não foi decidido entra como pendência e é resolvido no período-0, não trava a prototipagem |
| Requisitos mudam demais durante o desenvolvimento | Controle de mudança com análise de impacto (§3) — o custo fica visível antes da decisão |
| Prototipagem consumir mais de 1 semana | Só caminho crítico e telas prioritárias |
| Deploy descoberto tarde | Período-0 entrega as 3 peças em DES antes de qualquer feature |
| `main` quebrada | PR com CI verde obrigatório no merge `desenvolvimento` → `main`; ninguém commita direto |
| Conflito em serviço compartilhado por 2 features | Spec OpenAPI e schema de evento versionados + aviso no grupo antes de mexer |
| Sessão de agente perdida | Arquivo da feature atualizado ao final de toda sessão |
| Escopo não caber | Classificação prioritaria/desejavel/opcional e desce de nível no fechamento do período |
| `desenvolvimento` quebrada travando os 5 | Quem quebrou conserta ou reverte na hora; mudança arriscada vai para branch `feat/` |
| 40 pts na última entrega | Congelamento de features em 17/11 |
