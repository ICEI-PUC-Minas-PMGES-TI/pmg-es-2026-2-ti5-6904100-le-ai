# F-EST-2 — Favoritos, histórico e buscas

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.3 (RF-EST-09, 10, 13), RN-04 e RN-15. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Somar os três recursos que [F-EST](../periodo-1/feature-F-EST.md) adiou para o Período 2: **favoritos**, o **histórico pesquisável de leituras concluídas** e a **busca dentro da estante**. Fecha os requisitos **Desejáveis**:

- **RF-EST-09** marcar e desmarcar livros como **favoritos**;
- **RF-EST-10** visualizar o **histórico de leituras concluídas por ano**, pesquisar por **título ou autor** em todo o histórico, ver separadamente cada leitura/releitura finalizada do livro encontrado e consultar as atualizações de progresso da ocorrência selecionada em modo somente leitura;
- **RF-EST-13** **buscar por título e autor dentro da própria estante**, combinável com o filtro por status.

RF-EST-13 nasceu em 01/09/2026 (`REQUISITOS.md` v1.2), da prototipagem de [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) e [F-EST](../periodo-1/feature-F-EST.md): a lupa do header da estante não tinha escopo declarado e o protótipo a tratava como porta do acervo. Separadas as duas buscas, a do acervo virou a aba `Descobrir` e a da estante ficou sem requisito. **O desenho já existe:** [`estante.md`](../../design/periodo-1/F-EST/estante.md) traz o modo de busca do header e os artboards 4.9, 4.10 e 5.5. Em Período 1 o header da estante sai **sem lupa**; ela entra aqui.

RNF atendidos: **RNF-SEC-02** (propriedade da leitura e do progresso no servidor), **RNF-SEC-07** (recusar favoritar livro pessoal de outro), **RNF-DES-02** (histórico e progresso paginados), **RNF-ERR-04** (idempotência na escrita de favorito).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabela `favorito`; consultas pesquisáveis de estante e histórico sobre os dados já existentes |
| Backend | não iniciado | `leitura`: favoritos; histórico próprio por ocorrência; consulta somente leitura do progresso finalizado |
| Web | não iniciado | favorito; histórico pesquisável com ocorrências; progresso histórico somente leitura; busca na estante |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Valida **propriedade** (SEC-02) e consulta `v_livro_referencia_v1` para tipo/dono, sem ler tabela crua de `acervo`. Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`PUT /livros/{id}/favorito`** e **`DELETE /livros/{id}/favorito`** (RF-EST-09) — marca/desmarca o livro como favorito do usuário. O servidor **recusa favoritar livro pessoal de outro** (SEC-07, RN-15) — **completa** o check que [F-EST](../periodo-1/feature-F-EST.md) deixou explicitamente para esta feature (lá, "favoritos serão testados em F-EST-2"). Idempotente (RNF-ERR-04).
- **`GET /me/historico?ano=&q=&page=`** (RF-EST-10) — retorna uma ocorrência por leitura ou releitura **finalizada**, identificada por `leituraId`, com livro, autor, datas de início/fim, indicação de releitura e resumo de progresso. Sem `q`, agrupa as ocorrências pelo ano da data de fim; `ano` restringe a um ano. `q` pesquisa por **título ou autor em todo o histórico**, independentemente do ano, e pode ser combinado com `ano`. A resposta é paginada com teto do servidor (RNF-DES-02).
- O mesmo livro aparece **uma vez por conclusão**: duas conclusões no mesmo ano são duas ocorrências; conclusões em anos diferentes aparecem em seus respectivos anos. A pesquisa por `Torto Arado`, por exemplo, devolve todas as leituras/releituras finalizadas desse livro, da mais recente para a mais antiga. Conta apenas leitura finalizada (RN-04.4); releitura finalizada conta; releitura incompleta e leitura abandonada não entram (RN-04).
- **`GET /leituras/{id}/progresso?page=`** — F-PRG já entrega a consulta paginada para a leitura em andamento. Esta feature amplia a autorização de leitura para que o dono consulte também uma ocorrência **finalizada** selecionada no histórico. A resposta inclui o estado da leitura e os mesmos resumo e itens já definidos por F-PRG. Em leitura finalizada o recurso é **somente leitura**: `POST /leituras/{id}/progresso` continua recusado e `DELETE /progresso/{id}` recusa a mutação pelo estado da leitura. Conhecer o `leituraId` de terceiro não concede acesso (SEC-02).

**Modelagem (schema `leitura`):** `favorito` é relação própria (usuário, livro, única por par), independente da estante. Favoritar não cria estado Quero ler nem altera a máquina RN-04. O histórico e seu detalhamento são derivados de `leitura` e `atualizacao_progresso`, que já liga cada atualização à ocorrência correta; não há tabela nova para histórico nem cópia das atualizações.

Favoritos e histórico permanecem recursos do próprio usuário neste escopo; a feature não amplia RF-SOC-02 nem altera `v_estante_publica_v1`. Sem novo evento.

### Frontend Web (`code/front`)

- **Marcar/desmarcar favorito** (na estante e na página do livro), busca local na estante e uma seção própria de histórico. O estado padrão agrupa ocorrências concluídas por ano; o campo `Pesquisar no histórico` busca título/autor em todos os anos e o filtro de ano pode restringir o resultado. Cada livro encontrado lista separadamente todas as conclusões, e selecionar uma abre `Atualizações de progresso` no modo histórico somente leitura, sem CTA de registro nem ação de exclusão. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); histórico e atualizações com paginação incremental. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Favoritar/desfavoritar funciona, é **owner-only** (SEC-02) e **idempotente** (RNF-ERR-04); o servidor **recusa favoritar livro pessoal de outro** (SEC-07, RN-15).
- [ ] O histórico agrupa por ano somente leituras **finalizadas** (RN-04.4) — releitura finalizada conta, incompleta/abandonada não —, paginado (RNF-DES-02).
- [ ] A pesquisa por título ou autor percorre todos os anos por padrão, combina com o filtro de ano e devolve todas as ocorrências finalizadas do livro, inclusive duas ou mais no mesmo ano.
- [ ] Selecionar uma ocorrência abre suas atualizações de progresso; leitura finalizada é somente leitura, sem registrar/excluir, e acesso com `leituraId` de terceiro é negado (SEC-02).
- [ ] Favoritar livro fora da estante não cria vínculo/status de leitura; a relação permanece independente.
- [ ] Favoritos e histórico funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: favorito; histórico próprio contando só finalizadas; duas conclusões do mesmo livro/ano; pesquisa por título/autor com e sem ano; progresso finalizado somente leitura; negação de leitura/progresso de terceiro (RNF-TST-02)
- [ ] Testes web/mobile cobrem favorito, histórico paginado, pesquisa, seleção de ocorrência, modo histórico sem ações e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com favorito, parâmetros do histórico, ocorrência retornada e consulta de progresso finalizado
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** garantir que favorito independente não altere silenciosamente a máquina de estados da estante.

## Pendências

- **Telas (design P2):** [`historico-de-leituras.md`](../../design/periodo-2/F-EST-2/historico-de-leituras.md) escrito em 27/09/2026, [protótipo](../../design/periodo-2/F-EST-2/prototipos/historico-de-leituras.html) exportado em 28/09/2026. Entrada pela Estante e favorito entram na edição consolidada de `docs/design/periodo-2/estante/`; favoritar na página do livro já está na edição consolidada [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md) (prompt de 28/09/2026: botão quadrado `Heart` na barra de ação, ao lado de `Alterar status` ou `Iniciar leitura`) e em ações de leitura fica em `docs/design/periodo-2/acoes-de-leitura/`; o modo histórico em `docs/design/periodo-2/atualizacoes-de-progresso/` (lotes futuros). **Conflito de contrato a decidir:** o protótipo lista os anos com conclusão e a contagem por ano (`2026 · 4 leituras`) nas pills do mobile e na coluna da web, e `GET /me/historico` não devolve isso.
- **Depende de** [F-EST](../periodo-1/feature-F-EST.md) (estante, máquina de estados e favorito adiado), [F-PRG](../periodo-1/feature-F-PRG.md) (modelo, endpoint e tela de atualizações), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Compartilha `leitura` com [F-EST](../periodo-1/feature-F-EST.md)/[F-PRG](../periodo-1/feature-F-PRG.md)/[F-AVA](../periodo-1/feature-F-AVA.md)** e será limpo por [F-CONTA-2](feature-F-CONTA-2.md) na exclusão — sinalizar no grupo antes de mexer no serviço (plano §6).
- Stack de `leitura` definida: **NestJS (TypeScript)** (arquitetura §2.1).
- **Alternativa a avaliar, sem mudar o desenho atual:** reutilizar uma única ação/componente de favorito nos pontos de entrada antes de duplicar estado entre telas.
- ~~**Prompts de tela a criar em `docs/design/periodo-2/F-EST-2/`:** `historico-de-leituras.md` e `atualizacoes-de-progresso.md` como edição~~ — desde 27/09/2026 as edições de telas já entregues são **consolidadas por tela** em `docs/design/periodo-2/<tela>/`; o histórico é tela nova e ficou em `F-EST-2/` (ver o item Telas acima).

## Timeline

### Revisão 01/09/2026: RF-EST-10 ampliado pelo grupo. O histórico passou a pesquisar título/autor em todos os anos, preservar uma ocorrência por conclusão e abrir as atualizações da ocorrência selecionada em modo somente leitura. Fechada a decisão anterior sobre múltiplas conclusões no mesmo ano: todas aparecem separadamente. A ampliação reutiliza `leitura` e `atualizacao_progresso`, sem tabela ou evento novo.

### Revisão 01/09/2026: múltiplas conclusões do mesmo livro no mesmo ano registradas como decisão de apresentação/consulta do dono da feature.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-EST-2 no [periodo-2/README.md](README.md), de RF-EST-09/10 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.3 e das RN-04/RN-08/RN-15. Completa o check SEC-07 de favoritar que [F-EST](../periodo-1/feature-F-EST.md) deixou para cá; naquele momento, a modelagem do favorito ficou como decisão a fixar.

### Revisão 28/08/2026: precisão de redação — o campo `favorito` foi **adiado** por [F-EST](../periodo-1/feature-F-EST.md) (não incluído no modelo da `estante`) e é adicionado nesta feature; substituído "reservado" por "adiado" na Modelagem e nas Pendências.

### Revisão 29/08/2026: favoritos e histórico foram limitados ao próprio leitor, como RF-EST-09/10, removendo ampliação não necessária para perfis/VIEW. Favorito virou relação independente e não cria Quero ler nem altera RN-04.
