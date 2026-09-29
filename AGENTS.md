# AGENTS.md — Lê Ai

Contexto raiz para qualquer agente ou pessoa que trabalhe neste repositório. Reúne as instruções operacionais definidas em [`docs/orquestador/plano-de-projeto.md`](docs/orquestador/plano-de-projeto.md) (o **processo** — como trabalhamos) e em [`docs/orquestador/REQUISITOS.md`](docs/orquestador/REQUISITOS.md) (o **produto** — o que construímos). Este arquivo é um resumo de trabalho; em qualquer dúvida ou conflito, os documentos-fonte prevalecem.

> Ferramentas de agente (Claude Code, opencode + codex, etc.) procuram por `AGENTS.md`/`CLAUDE.md` **na raiz**. Por isso este arquivo e o `CLAUDE.md` ficam na raiz e não se movem — são a única exceção à regra de manter a raiz limpa. Todo o resto da documentação vive em `docs/`.

---

## 1. Fontes de verdade

| Documento | Papel | Em conflito |
|---|---|---|
| [`docs/orquestador/REQUISITOS.md`](docs/orquestador/REQUISITOS.md) | **Fonte de verdade** do produto: escopo, domínio, regras de negócio, requisitos funcionais e não funcionais, segurança, testes. | **Sempre vence.** |
| [`docs/orquestador/documento-de-arquitetura.md`](docs/orquestador/documento-de-arquitetura.md) | Como o sistema é construído: decomposição em serviços, dados, tecnologias, mensageria. Deriva do `REQUISITOS.md`. | Perde para `REQUISITOS.md`. |
| [`docs/orquestador/documento-de-design.md`](docs/orquestador/documento-de-design.md) | Linguagem visual e de interação: tokens, tipografia, componentes, prompts de protótipo. | Perde para `REQUISITOS.md`. |
| [`docs/orquestador/plano-de-projeto.md`](docs/orquestador/plano-de-projeto.md) | Processo de trabalho do grupo: repositório, branches, DoD, rituais, prazos. | — |

**Regra dura:** nenhum agente altera `docs/orquestador/*` por conta própria. Divergência entre requisito e implementação vira **pendência no arquivo da feature** e decisão do grupo (ver §6 e §7).

**Documentos da disciplina (`docs/1.` a `docs/8.` + `docs/README.md`) são DERIVADOS do orquestador**, não fonte. Toda mudança no orquestador que impacte um deles deve ser refletida nele na mesma passada — é parte da análise de impacto do controle de mudança. O mapa origem→destino e a regra completa estão no `docs/orquestador/plano-de-projeto.md` §2.1. Exceção: `docs/6.avaliacao_heuristica.md` é a avaliação de uma aplicação externa (exercício da disciplina) e não deriva do orquestador.

---

## 2. O produto em uma frase

Aplicativo social de leitura (modelo Skoob/Letterboxd) para **aumentar a adesão à leitura entre leitores brasileiros adultos**, sustentado por três mecanismos: **registro**, **meta** e **pertencimento**. Cadastro permitido a partir dos **18 anos** (LGPD). Idioma **pt-BR**; internacionalização fora de escopo. Funcionalidade que não serve a registro, meta ou pertencimento é candidata natural a corte.

---

## 3. Restrições técnicas

| Camada | Tecnologia |
|---|---|
| Mobile (produto principal) | **Flutter** nativo — escopo funcional completo |
| Web (subconjunto) | **Vue** (SPA) + **Tailwind CSS** — sem Flutter Web (vetado) |
| Backend | **Microsserviços** em **Spring (Java)** e **NestJS (TypeScript)**; FastAPI descartado |
| Banco | **PostgreSQL** único no **Neon** por ambiente, um **schema por serviço** (separação lógica). Um projeto de dev (São Paulo) e um de DES (Oregon), sem replicação — ver §7 |
| Mensageria | **RabbitMQ** (CloudAMQP) para os fluxos assíncronos; uma instância por ambiente — ver §7 |
| Hospedagem | **Render** (plano gratuito, região Oregon) para serviços e site estático |
| Imagens | **Cloudinary** (transformação por URL + cache de capas) |
| E-mail transacional | **Brevo** (recuperação de senha) |
| Push (Android) | **Firebase Cloud Messaging** — Firebase usado **só** para FCM; iOS fica em in-app |
| Agendador | **GitHub Actions** (`schedule`), fallback cron-job.org |

**Sem paridade funcional entre web e mobile** — o corte de escopo recai sobre a web antes do mobile. Justificativas e consequências de cada escolha em [`docs/orquestador/documento-de-arquitetura.md`](docs/orquestador/documento-de-arquitetura.md) §2.

### Serviços de backend (4)

| Serviço | Domínio |
|---|---|
| `identidade` | Usuário, autenticação, perfil, privacidade, seguidores, solicitações |
| `acervo` | Livro, autor, editora, série, busca, ingestão, sinopse, capas, nota agregada |
| `leitura` | Estante, leitura, progresso, sessão, nota, resenha, frases, desafios, streak, estatísticas |
| `social` | Feed, atividades, comentários, listas, recomendações, notificações, moderação |

Alocação de stack por serviço **decidida pela equipe em 02/09/2026**: `identidade` e `social` em **Spring (Java)**; `acervo` e `leitura` em **NestJS (TypeScript)** — mantendo `acervo` e `leitura` na mesma stack, como a arquitetura recomendava. Registrada no `AGENTS.md` de cada serviço e na arquitetura §2.1. Os quatro serviços já estão **scaffoldados** (P0-INFRA): Nest em 11/09/2026 (Node 22, npm, Drizzle), Spring em 12/09/2026 (JDK 21, Maven, Spring Boot 4.1, Flyway). Versões, estrutura e comandos ficam nos `AGENTS.md` locais.

**Acesso entre schemas:** nenhum serviço lê a tabela crua de outro schema. Leitura entre schemas ocorre exclusivamente por **VIEW que o serviço dono expõe e mantém como contrato**, versionada junto do spec OpenAPI.

---

## 4. Estrutura do repositório

```
/
├── AGENTS.md                 # este arquivo — contexto raiz (não move)
├── CLAUDE.md                 # ponteiro para AGENTS.md (não move)
├── README.md                 # entrada do repositório
├── docs/                     # toda a documentação
│   ├── orquestador/          # FONTE REAL — os 4 documentos-mestre
│   │   ├── REQUISITOS.md     # fonte de verdade do produto
│   │   ├── plano-de-projeto.md
│   │   ├── documento-de-arquitetura.md
│   │   └── documento-de-design.md
│   ├── README.md             # capa/SUMÁRIO do documento da disciplina
│   ├── 1.apresentacao.md … 8.avaliacao_arquitetura.md  # docs da disciplina (DERIVADOS)
│   ├── api/                  # um spec OpenAPI por serviço
│   ├── mensageria/           # envelope, catálogo e JSON Schemas canônicos
│   ├── design/               # prompts de tela e protótipos — + AGENTS.md e CLAUDE.md
│   │   └── periodo-N/<FEATURE>/<tela>.md + prototipos/<tela>.html
│   └── ...
├── code/                     # código (equivale a src/ do guideline)
│   ├── mobile/               # Flutter — + AGENTS.md
│   ├── front/                # Vue + Tailwind — + AGENTS.md
│   ├── scripts/              # utilitários fora dos 4 serviços
│   │   └── ingestao/         # carga do dump OpenLibrary (Python) — + AGENTS.md
│   └── back/                 # microsserviços
│       ├── identidade/       # + AGENTS.md
│       ├── acervo/           # + AGENTS.md
│       ├── leitura/          # + AGENTS.md
│       └── social/           # + AGENTS.md
├── assets/                   # atas, contribuição semanal, artefatos
└── divulge/                  # apresentação e vídeo
```

Se a estrutura mudar, ajuste os caminhos **aqui, no plano e nos `AGENTS.md` locais** na mesma passada: caminho errado no `AGENTS.md` significa agente lendo o arquivo errado.

Cada subprojeto de código tem seu próprio `AGENTS.md`. Depois do scaffolding, ele registra linguagem/versão, estrutura, testes e comandos; enquanto o projeto não estiver iniciado, deve declarar as decisões pendentes e impedir que o agente as invente.

---

## 5. Regras para agentes (plano §7)

1. **Toda sessão de implementação começa com `docs/orquestador/REQUISITOS.md`, o arquivo da feature e os `AGENTS.md` raiz e local em contexto.** Backend, infraestrutura, dados e mensageria exigem também o Documento de Arquitetura; interface e interação exigem o Documento de Design.
2. **O agente atualiza o arquivo da feature ao final da sessão de implementação:** status, pendências, decisões. Sessão exclusivamente de pesquisa, auditoria ou revisão somente leitura entrega seu relatório e não altera a feature.
3. **O agente não edita arquivos de features que não são a dele.**
4. **O agente não altera nenhum arquivo de `docs/orquestador/` por conta própria.** Divergência vira pendência no arquivo da feature e decisão do grupo; alteração exige autorização humana explícita.
5. **Protótipo é referência visual, não especificação de pixel.** Viewport fixo no protótipo não significa layout fixo na implementação.
6. **Migration é o ponto de maior cuidado:** toda migration é revisada por humano antes de subir; cada feature só cria migration das tabelas do serviço que ela mexe; nome com timestamp.

Formato dos arquivos de agente: **Markdown puro**, sem sintaxe específica de ferramenta. O conteúdo vive em `AGENTS.md`; `CLAUDE.md` e nomes equivalentes apenas apontam para ele.

---

## 6. Fluxo de trabalho da feature

Cada feature que entrar em implementação deve ter **um arquivo** em `docs/plano-de-desenvolvimento/periodo-N/feature-*.md`, com dono registrado. Os arquivos dos períodos futuros são criados conforme o planejamento da equipe. Divisão **vertical**: cada dev é dono de uma feature de ponta a ponta (infra → backend → web → mobile).

Estrutura mínima do arquivo de feature: objetivo (referenciando a seção de `REQUISITOS.md`), tabela de status por camada, especificação por camada, critérios de aceite, Definition of Done, **pendências** e timeline. Pendência vive no arquivo da feature — **não há `PENDENCIAS.md` global**; a consolidação é gerada sob demanda por um agente que varre os arquivos.

**Mudança de requisito após a baseline** (`REQUISITOS.md` está fechado para baseline): quem detecta registra como pendência no arquivo da feature, **nunca edita o `REQUISITOS.md` na hora**; o grupo decide; se aprovada, entra no `REQUISITOS.md` com registro em `## Timeline` e análise de impacto (features, diagramas, specs, arquitetura). Detalhes no plano §3.

---

## 7. Branches, commits e releases

- **`desenvolvimento`** — branch de trabalho; todo mundo commita direto. CI roda lint, build e testes a cada push.
- **`main`** — sempre verde e deployável; merge dispara deploy em DES/HML. **`desenvolvimento` → `main` sempre por PR com CI verde** (único portão obrigatório). **Ninguém commita direto em `main`.**
- **`feat/<slug>`** — opcional, para isolar refatoração grande, experimento ou mudança que quebra a build pela metade. Manter curta.
- **Tags** `vX.Y.Z` ao fim de cada período → GitHub Release (o artefato "Release do software" da disciplina).
- `git pull --rebase` antes de começar e antes de subir. Quem quebrou a `desenvolvimento` conserta ou reverte na hora.
- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:` — alimenta o relatório de contribuição semanal.
- **CI filtra por caminho:** mudança em `code/front/` não roda o pipeline do Flutter; mudança em `docs/` não roda nada.

**Ambientes:** **local** · **DES/HML** (branch `main`, deploy a cada merge — é o que vale como "release" da sprint) · **PROD** (tag `vX.Y.Z`, só a partir de 24/11). Segredos por variável de ambiente e GitHub Secrets: `.env.example` versionado, `.env` **nunca**.

**Dois bancos e dois brokers, um par por ambiente** (desde 25/09/2026):

| | Local (dev) | DES/HML (Render) |
|---|---|---|
| Neon | projeto `le-ai`, São Paulo (`aws-sa-east-1`) | projeto `le-ai-oregon`, Oregon (`aws-us-west-2`), junto do Render |
| CloudAMQP | instância `Le-ai`, São Paulo | instância `Le-ai-oregon`, Oregon |

- **Os dados não são replicados:** o que se grava num ambiente não aparece no outro. Copiar de um para o outro é operação manual e completa, combinada com o grupo.
- **Migrations:** as que você aplica localmente só alteram o banco de dev. O DES as recebe no deploy da `main`.
- **O `.env` local nunca aponta para o DES.**
- **Testes de integração** rodam em Postgres descartável (Docker ou CI), nunca no Neon.
- Detalhes em [`P0-DEPLOY`](docs/plano-de-desenvolvimento/periodo-0/feature-P0-DEPLOY.md#ambientes-de-dados-desde-25092026).

---

## 8. Definition of Done (obrigatório para toda feature)

- [ ] Código nas camadas aplicáveis mergeado em `desenvolvimento`
- [ ] CI verde (lint, build, testes)
- [ ] Testes automatizados dos casos de uso da feature (mínimo: backend)
- [ ] **Spec OpenAPI do serviço atualizado em `docs/api/`** (um spec por serviço, nunca por feature)
- [ ] Se produz ou consome evento, **catálogo/schema em `docs/mensageria/` atualizado e testado**
- [ ] Fluxo funcionando **em DES/HML**, não só localmente
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

Uma feature pode acrescentar itens no próprio arquivo; nunca remover destes. Features de produto usam `prioritaria` | `desejavel` | `opcional`; `fundacao` é a categoria especial do período-0. O que não termina desce um nível e vai para o período seguinte; as opcionais são o colchão. **Nunca atrasamos entrega para caber escopo.**

---

## 9. Segurança e qualidade — não negociável

O `REQUISITOS.md` §8 organiza a segurança pelo **OWASP Top 10 (2021)**; todos os itens são Essenciais. Ao escrever qualquer código, respeite pelo menos:

- **Controle de acesso no servidor** em todo recurso protegido; ocultar na interface **não** é controle de acesso. Validar **propriedade** do recurso (leitura, progresso, resenha, nota, lista, comentário, livro pessoal) e privacidade de perfil (RN-08).
- **Nunca concatenar entrada em SQL** — consultas parametrizadas ou ORM. Validar toda entrada no servidor por schema explícito.
- **Segredos só em variável de ambiente**, jamais versionados.
- **Senhas** com Argon2/bcrypt/scrypt; tokens de acesso curtos e renovação revogável.
- **Rate limiting** em auth e ações sociais; **CORS** restrito às origens conhecidas.
- Resenha aceita **Markdown** (subconjunto restrito, sem HTML/links/imagens): parser com HTML embutido desabilitado **e** sanitização antes do DOM.
- Consumidores de mensagem **idempotentes**; mensagens validadas por schema; falha vai para **DLQ**.
- Todo serviço: **erro padronizado** com `correlation-id`, **log estruturado**, **health check**.

**Testes:** prioridade obrigatória para a máquina de estados de leitura (RN-04), a inatividade/abandono automático (RN-05) e o controle de acesso a perfil privado (RN-08).

---

## 10. Contratos de integração

- Cada serviço expõe seu spec em runtime (`/v3/api-docs` no Spring, `@nestjs/swagger` no Nest) e **commita** em `docs/api/<servico>.yaml`. Atualizar é item do DoD.
- **Um spec por serviço**, nunca por feature. A feature atualiza o spec do serviço que mexeu.
- Um Swagger UI único agregará todos os specs quando `docs/api/` e `docker-compose.docs.yml` forem criados no período-0 (`docker compose -f docker-compose.docs.yml up` → `localhost:8080`).

Contratos assíncronos:

- Envelope, catálogo e schemas JSON canônicos ficam em `docs/mensageria/`.
- P0-MSG possui transporte, topologia, dispatcher, recibo, retry e DLQ; a feature produtora possui o schema de `data` e a gravação domínio+outbox.
- Um arquivo por `(type, version)`; schema publicado é imutável e mudança incompatível cria nova versão.
- Evento sem consumidor atual não cria fila acumuladora; a feature consumidora futura faz backfill antes de ativar o binding.
