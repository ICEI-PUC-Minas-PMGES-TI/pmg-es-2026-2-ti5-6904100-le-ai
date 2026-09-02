# AGENTS.md — Serviço `leitura`

Complementa o [`AGENTS.md`](../../../AGENTS.md) da raiz (regras gerais) e o [`code/back/README.md`](../README.md) (visão dos serviços). Fonte de verdade: [`docs/orquestador/REQUISITOS.md`](../../../docs/orquestador/REQUISITOS.md); arquitetura: [`docs/orquestador/documento-de-arquitetura.md`](../../../docs/orquestador/documento-de-arquitetura.md).

## Domínio

Núcleo do produto. Estante, leitura, progresso, sessão cronometrada, nota, resenha (com curtidas), frases/trechos, desafios, sequência diária (streak), estatísticas e histórico. Requisitos: **EST, PRG, AVA, DSF, STA, GAM**. É o maior serviço, mantido inteiro porque tudo gira em torno da mesma agregação (usuário + livro + leitura).

## Stack e dados

- **Stack:** **NestJS (TypeScript)** — decidido pela equipe em 02/09/2026 (arquitetura §2.1); mesma stack que `acervo`. Versão do Node e gerenciador de pacote (pnpm/npm) a fixar no arranque do scaffolding (P0-INFRA).
- **Schema:** `leitura`, no PostgreSQL único do Neon. Expõe **VIEWs** de estante e nota consumidas pela recomendação em `social`; a nota agregada em `acervo` é alimentada por evento.
- **Curtida/descurtida de resenha fica aqui**, junto da resenha (não em `social`).

> Projeto **ainda não iniciado** — apenas a estrutura de pastas.

## Pontos de atenção (ver `REQUISITOS.md`) — prioridade de teste

- **Máquina de estados da leitura (RN-04)** — Quero ler / Lendo / Lido / Relendo / Abandonado, releitura, retomada. **Teste obrigatório e prioritário** (RNF-TST-01).
- **Inatividade e abandono automático (RN-05)** — alertas nos dias 20 e 30, abandono no dia 40, via job diário. **Teste obrigatório e prioritário.**
- **Registro de progresso (RN-17):** o leitor informa sempre a **página em que parou** (valor absoluto, monotônico); páginas lidas e percentual são **derivados**. Rejeitar página ≤ atual ou > total (RF-PRG-04).
- **Sessão cronometrada (RN-16):** estado local no dispositivo; o backend só recebe a atualização de progresso resultante do encerramento.
- **Desafios (RN-20)** e **streak (RN-18):** alimentados por `progresso.registrado` e `leitura.finalizada`.
- Nota (RN-06) e resenha (RN-07, Markdown por RN-13) pertencem ao **livro**, não à leitura.
- Publica eventos: `nota.alterada`, `leitura.em_risco`, `leitura.expirada`, `livro.adicionado_a_estante`, `resenha.curtida`, e os que originam atividades/notificações.
- **Fila offline** do cliente móvel (RNF-ERR-05) exige escrita **idempotente** com chave de idempotência (RNF-ERR-04).
