# F-EST-2 — Favoritos, histórico e busca na estante

**Período:** 2 · **Prioridade:** desejavel
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.3 (RF-EST-09, 10, 13), RN-04 e RN-15. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Somar os três recursos que [F-EST](../periodo-1/feature-F-EST.md) adiou para o Período 2: **favoritos**, o **histórico de leituras por ano** e a **busca dentro da estante**. Fecha os requisitos **Desejáveis**:

- **RF-EST-09** marcar e desmarcar livros como **favoritos**;
- **RF-EST-10** visualizar o **histórico de leituras por ano**, com os livros concluídos em cada ano;
- **RF-EST-13** **buscar por título e autor dentro da própria estante**, combinável com o filtro por status.

RF-EST-13 nasceu em 01/09/2026 (`REQUISITOS.md` v1.2), da prototipagem de [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) e [F-EST](../periodo-1/feature-F-EST.md): a lupa do header da estante não tinha escopo declarado e o protótipo a tratava como porta do acervo. Separadas as duas buscas, a do acervo virou a aba `Descobrir` e a da estante ficou sem requisito. **O desenho já existe:** [`estante.md`](../../design/periodo-1/F-EST/estante.md) traz o modo de busca do header e os artboards 4.9, 4.10 e 5.5. Em Período 1 o header da estante sai **sem lupa**; ela entra aqui.

RNF atendidos: **RNF-SEC-02** (propriedade no servidor), **RNF-SEC-07** (recusar favoritar livro pessoal de outro), **RNF-DES-02** (histórico paginado), **RNF-ERR-04** (idempotência na escrita de favorito).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabela `favorito`; consulta de histórico por ano; índice para a busca por título e autor na estante |
| Backend | não iniciado | `leitura`: favoritos e histórico próprios por ano |
| Web | não iniciado | marcar favorito; aba/seção de histórico por ano; campo de busca no header da estante |
| Mobile | não iniciado | mesmas telas |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Valida **propriedade** (SEC-02) e consulta `v_livro_referencia_v1` para tipo/dono, sem ler tabela crua de `acervo`. Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`PUT /livros/{id}/favorito`** e **`DELETE /livros/{id}/favorito`** (RF-EST-09) — marca/desmarca o livro como favorito do usuário. O servidor **recusa favoritar livro pessoal de outro** (SEC-07, RN-15) — **completa** o check que [F-EST](../periodo-1/feature-F-EST.md) deixou explicitamente para esta feature (lá, "favoritos serão testados em F-EST-2"). Idempotente (RNF-ERR-04).
- **`GET /me/historico`** (RF-EST-10) — retorna os livros **concluídos** do usuário **agrupados por ano** (das datas de fim das leituras), paginado (RNF-DES-02). Conta **apenas leituras finalizadas** (RN-04.4); **releitura finalizada conta**; releitura incompleta e leitura abandonada **não** contam (RN-04). Um mesmo livro concluído em anos diferentes aparece em cada ano correspondente.

**Modelagem (schema `leitura`):** `favorito` é relação própria (usuário, livro, única por par), independente da estante. Favoritar não cria estado Quero ler nem altera a máquina RN-04. O histórico é derivado das leituras finalizadas, sem tabela nova.

Favoritos e histórico permanecem recursos do próprio usuário neste escopo; a feature não amplia RF-SOC-02 nem altera `v_estante_publica_v1`. Sem novo evento.

### Frontend Web (`code/front`)

- **Marcar/desmarcar favorito** (na estante e na página do livro) e uma seção própria de histórico por ano. Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).

### App Flutter (`code/mobile`)

- Mesmas telas com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); histórico com paginação incremental. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Favoritar/desfavoritar funciona, é **owner-only** (SEC-02) e **idempotente** (RNF-ERR-04); o servidor **recusa favoritar livro pessoal de outro** (SEC-07, RN-15).
- [ ] O histórico agrupa por ano os livros **concluídos**, contando só leituras **finalizadas** (RN-04.4) — releitura finalizada conta, incompleta/abandonada não —, paginado (RNF-DES-02).
- [ ] Favoritar livro fora da estante não cria vínculo/status de leitura; a relação permanece independente.
- [ ] Favoritos e histórico funcionam **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: favoritar/desfavoritar com propriedade e recusa de livro pessoal de terceiro, idempotência e histórico próprio contando só finalizadas (RNF-TST-02)
- [ ] Testes web/mobile cobrem estado do favorito, histórico paginado e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com favorito e histórico próprios
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** garantir que favorito independente não altere silenciosamente a máquina de estados da estante.

## Pendências

- **Depende de** [F-EST](../periodo-1/feature-F-EST.md) (estante, máquina de estados e favorito adiado), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Compartilha `leitura` com [F-EST](../periodo-1/feature-F-EST.md)/[F-PRG](../periodo-1/feature-F-PRG.md)/[F-AVA](../periodo-1/feature-F-AVA.md)** e será limpo por [F-CONTA-2](feature-F-CONTA-2.md) na exclusão — sinalizar no grupo antes de mexer no serviço (plano §6).
- Stack de `leitura` ainda pendente (P0-INFRA).
- **Decisão do dono:** definir se duas conclusões/releituras do mesmo livro no mesmo ano aparecem como duas ocorrências históricas ou uma entrada consolidada; o modelo suporta ambas sem migration nova.
- **Alternativa a avaliar, sem mudar o desenho atual:** reutilizar uma única ação/componente de favorito nos pontos de entrada antes de duplicar estado entre telas.

## Timeline

### Revisão 01/09/2026: múltiplas conclusões do mesmo livro no mesmo ano registradas como decisão de apresentação/consulta do dono da feature.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-EST-2 no [periodo-2/README.md](README.md), de RF-EST-09/10 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.3 e das RN-04/RN-08/RN-15. Completa o check SEC-07 de favoritar que [F-EST](../periodo-1/feature-F-EST.md) deixou para cá; naquele momento, a modelagem do favorito ficou como decisão a fixar.

### Revisão 28/08/2026: precisão de redação — o campo `favorito` foi **adiado** por [F-EST](../periodo-1/feature-F-EST.md) (não incluído no modelo da `estante`) e é adicionado nesta feature; substituído "reservado" por "adiado" na Modelagem e nas Pendências.

### Revisão 29/08/2026: favoritos e histórico foram limitados ao próprio leitor, como RF-EST-09/10, removendo ampliação não necessária para perfis/VIEW. Favorito virou relação independente e não cria Quero ler nem altera RN-04.
