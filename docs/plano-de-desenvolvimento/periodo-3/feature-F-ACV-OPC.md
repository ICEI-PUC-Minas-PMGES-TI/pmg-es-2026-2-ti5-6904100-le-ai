# F-ACV-OPC — Extras de acervo

**Período:** 3 · **Prioridade:** opcional
**Dono:** Renato Douglas · **Serviços afetados:** `acervo` (backend) + **script utilitário de carga** (fora dos 4 serviços) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 (RF-ACV-14, 22), RN-03, RN-12, RN-14, RN-19, RN-21, §10.1, §10.2. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.1, §2.4, §4.1. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar os dois **extras de acervo** que sobraram das bandas Essencial e Desejável: manter a base oficial atualizável depois da carga inicial e deixar o livro pessoal classificável como o oficial. Fecha os requisitos **Opcionais**:

- **RF-ACV-14** **recarga manual do data dump** para atualizar a base oficial;
- **RF-ACV-22** informar **assuntos ao cadastrar um livro pessoal**, escolhidos do **conjunto curado**.

São dois escopos independentes reunidos por pertencerem ao mesmo serviço e à mesma banda de prioridade. A recarga **reaproveita o script** de [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) — não nasce um segundo carregador, nem um serviço novo (arquitetura §2.1). Os assuntos em livro pessoal **estendem** os endpoints já existentes de [F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md), sem tabela nova: a associação `livro↔assunto` já existe desde a ingestão.

RNF atendidos: **RNF-SEC-33** (dado externo validado e normalizado antes de persistir), **RNF-SEC-12** (`COPY`/consulta parametrizada), **RNF-SEC-06** (livro pessoal fora dos índices públicos), **RNF-SEC-02** (só o dono edita seu livro pessoal), **RNF-SEC-13** (validação por schema da entrada), **RNF-DES-04/05** (recarga não estoura o teto do plano nem infla o índice), **RNF-ARQ-05** (concorrência resolvida no banco).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado (sem migration) | `ingestao_execucao` já aceitava `recarga` e `livro_assunto` já aceitava livro pessoal; modo `recarga` no script (`carregar --tipo recarga`), validado só na amostra em Postgres descartável |
| Backend | implementado | `acervo`: `assuntos[]` em `POST`/`PATCH`/`GET /livros/pessoal`; `GET /assuntos` reaproveitado de F-ACV-BUSCA |
| Web | implementado | seletor de assuntos no formulário (criar e editar) e linha `Assuntos` na página do livro pessoal |
| Mobile | implementado | mesmo seletor e mesma linha |

## Especificação

### Script de carga — recarga manual (RF-ACV-14, RN-12, RN-21, §10.1)

A recarga é o **mesmo script utilitário** de [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md), executado manualmente em modo `recarga`. Não é endpoint nem serviço; atualização automática está fora do escopo.

- **Registro da execução:** cada rodada grava uma linha em `ingestao_execucao` com `tipo=recarga`, status e os totais de processados, descartados e inseridos, para que a recarga seja auditável e comparável à carga inicial.
- **Idempotência (RNF-ARQ-05):** upsert por **ISBN-13** e por **`ol_edition_key`** (RN-02). Reexecutar a mesma amostra **não duplica** livro, autor, editora, série nem assunto; a normalização e a tabela de sinônimos de editoras são as mesmas de RN-12, para que a recarga não crie variantes que a carga inicial já unificou.
- **Preservação do dado local — a regra que separa recarga de recarga destrutiva.** A recarga **atualiza metadados do catálogo oficial** e **não apaga**:
  - **livros pessoais** (RN-03) — não pertencem à base oficial e não entram no dump;
  - a **cópia própria da capa** (RN-14.6: permanente, sem expiração) — a URL externa pode ser atualizada, a própria não é descartada;
  - a **sinopse** já obtida sob demanda (RN-19.2) — não vem no dump e não é sobrescrita por ausência;
  - a **nota geral** importada por [F-ACV-NOTA](../periodo-2/feature-F-ACV-NOTA.md) e a **projeção da nota dos leitores**, que derivam de outra origem (RF-ACV-15, `nota.alterada`).
  Ausência de um campo no dump é tratada como **ausência de informação**, nunca como instrução de apagar.
- **Filtros e descartes** idênticos aos da carga inicial (edição em português, com ISBN-13, total de páginas e capa — RN-12). Livro já existente que passe a violar um filtro **não é removido**: pode estar em estante, leitura ou lista de alguém.
- **Assuntos:** reaplica a tabela de mapeamento de RN-21.3/4; tag sem correspondência continua sendo descartada e não cria assunto novo.
- **Segurança:** dado externo validado e normalizado antes de persistir (SEC-33); carga por `COPY`/parametrizado, sem concatenação (SEC-12). O dump bruto não sobe ao Neon (§10.1).
- **Operação:** executada manualmente pelo grupo, com a mesma filtragem local em streaming da carga inicial. O volume carregado e a fração do plano Neon consumida são registrados na Timeline, como em F-ACV-INGESTAO (RNF-DES-04/05).

### Backend / API — `acervo` (RF-ACV-22)

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`POST /livros/pessoal`** e **`PATCH /livros/pessoal/{id}`** ([F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md)) passam a aceitar **`assuntos[]`** — lista de **ids do conjunto curado** (RN-21.1/21.5). O servidor **rejeita** id inexistente e **rejeita texto livre**: o leitor escolhe, não cria (RN-21.4, SEC-13). Recomendado **no máximo 5** por livro (RN-21.2). Edição substitui o conjunto informado; lista vazia é estado válido.
- **Somente o dono** cadastra e edita os assuntos do seu livro pessoal, validado no servidor (RN-03, SEC-02). Terceiro que alcance o livro por `via=feed|lista` (RN-15) **vê** os assuntos em modo consulta e **não** os edita.
- **`GET /assuntos`** — expõe o **conjunto curado** para alimentar o seletor dos dois clientes. Se [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) já publicar essa listagem para o filtro de RF-ACV-02, esta feature **reusa** o endpoint em vez de criar um segundo; a decisão fica registrada na Timeline.
- **Isolamento do livro pessoal (RN-03, SEC-06):** os assuntos informados **não** alimentam contadores de catálogo, **não** entram nos índices de busca, nos filtros de RF-ACV-02/03 nem nas páginas de autor, editora e série. Servem à exibição na página do livro e, quando o dono a acessa, à leitura do próprio acervo — nunca à descoberta por terceiros.

**Modelo de dados** (schema `acervo`): sem entidade nova. Reaproveita `assunto` (conjunto curado) e a associação `livro_assunto` já criadas por [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md), agora aceitando livro com `tipo=pessoal`. Em `ingestao_execucao`, o valor `recarga` do campo de tipo passa a ser usado.

**Contratos:** nenhum novo. `v_livro_referencia_v1` não muda — assunto não faz parte do contrato mínimo entre schemas.

### Frontend Web (`code/front`)

- **Seletor de assuntos** no formulário de cadastro e de edição de livro pessoal: escolha múltipla a partir do conjunto curado, com aviso de recomendação de até 5. Sem campo de texto livre. A **página do livro pessoal** exibe os assuntos como rótulos, **não acionáveis como filtro** (ao contrário do livro oficial de RF-ACV-21). Usa só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).

### App Flutter (`code/mobile`)

- Mesmo seletor e mesma exibição, com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). Alvo de demonstração Android.

## Critérios de aceite

- [x] A recarga usa o **mesmo script** da carga inicial em modo `recarga` e registra a execução com totais em `ingestao_execucao` (RF-ACV-14). Evidência: `tests/test_carga_banco.py` (execuções `tipo=recarga`, `concluida`).
- [x] Reexecutar a recarga sobre a mesma amostra **não duplica** livro, autor, editora, série ou assunto (RN-02, RN-12, RNF-ARQ-05). Evidência: teste de idempotência (segunda rodada com 0 atualizados e contagens iguais).
- [x] A recarga **não apaga** livro pessoal, cópia própria da capa (RN-14.6), sinopse já obtida (RN-19.2) nem nota geral/projeção de nota; ausência no dump não é tratada como remoção. Evidência: teste de preservação, também depois do `notas`.
- [x] Livro já existente que deixe de passar nos filtros **não é removido** da base. Evidência: teste "livro fora dos filtros".
- [x] Cadastrar/editar livro pessoal aceita **`assuntos[]` do conjunto curado**; id inexistente e texto livre são rejeitados (RF-ACV-22, RN-21.1/21.4/21.5). Evidência: `test/integracao/assuntos-livro-pessoal.int-spec.ts` e teste manual da API no banco de dev.
- [x] Só o **dono** altera os assuntos do seu livro pessoal (RN-03, SEC-02); terceiro com via válida apenas visualiza. Evidência: integração (feed e lista) e teste manual (PATCH de outra conta: 403; consulta pela lista na web).
- [x] Assuntos de livro pessoal **não** aparecem em busca, filtros ou páginas de autor/editora/série, e não alteram contadores de catálogo (RN-03, SEC-06). Evidência: teste de isolamento com livro criado pela API com assunto (busca, filtro, `totalItens`, página de autor, `v_livro_recomendacao_v1`, `GET /assuntos`) e teste manual no dev.
- [x] Web e mobile mostram o seletor a partir do conjunto curado, sem campo livre. Evidência: testes dos clientes e teste manual (Edge e emulador).
- [ ] Recarga e assuntos em livro pessoal funcionam **em DES**. Desmarcado: o DES vem com o merge na `main`, no fechamento de novembro; a recarga real é pendência do grupo (decisão 4 do plano).

## Definition of Done

(plano §10)

- [ ] Script (modo recarga) + backend `acervo` + web + mobile mergeados em `desenvolvimento` — commits na `renato-features`; o PR é da etapa 4
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)) — o CI não roda o dump inteiro; valida a recarga contra a **amostra reproduzível** de RNF-TST-08. Confere-se no PR (etapa 4)
- [x] Testes unitários e de integração com banco real/container: recarga idempotente sobre a amostra, preservação de capa própria/sinopse/nota/livro pessoal, validação de `assuntos[]` contra o conjunto curado, rejeição de texto livre e de id inexistente, propriedade do livro pessoal e isolamento de busca/filtros (RNF-TST-02/08)
- [x] Testes assíncronos — **N/A**: nenhuma das duas partes usa mensageria; a recarga é execução local do script. Justificativa registrada aqui em vez de remover o item
- [x] Testes web/mobile cobrem o seletor de assuntos e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** com `assuntos[]` no livro pessoal e a listagem do conjunto curado
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md)) — desmarcado: vem com o merge na `main`, no fechamento de novembro
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver (ver Pendências)

**Item próprio:** registrar na Timeline o **volume real recarregado** e a variação de armazenamento no plano Neon (revalidação de RNF-DES-04/05), e documentar se `GET /assuntos` foi criado aqui ou reaproveitado de F-ACV-BUSCA.

## Pendências

- **Decisões do dono (06/11/2026), no [`plano-F-ACV-OPC.md`](renato-periodo-3/plano-F-ACV-OPC.md):** o teto de 5 assuntos é só aviso do cliente (o servidor aceita até 100, o tamanho do conjunto; RN-21.2 diz "recomendado"); design P3 ratificado (texto e não chip, ordem alfabética, fechar sem `Concluir` descarta, texto do aviso, assuntos também no modo consulta); recarga atualiza título, ano, capa externa, editora e série, substitui os assuntos só quando o livro mapeia ao menos um e só acrescenta autores; **páginas de livro existente não mudam** (o `leitura` lê o total ao vivo; divergência pequena da decisão 3, registrada); a recarga não mexe em `ol_work_key` (decisão 9).
- **Recarga real (volume real recarregado):** pendência do **grupo** no fechamento (decisão 4): baixar os dumps, rodar em dev e depois em DES com o roteiro "Recarga (RF-ACV-14)" do `code/scripts/ingestao/README.md`, rodar `notas` em seguida e registrar aqui o volume e a fração do plano Neon (item próprio do DoD, desmarcado). Nenhuma etapa desta feature rodou a recarga no Neon.
- **Decisão do Renato (07/11/2026), achado da etapa 3:** livro importado pelo Google Books, sem `ol_work_key`, cujo ISBN apareça no dump fica **intacto** na recarga (nem título, capa externa e editora mudam, e ele não perde assunto; só recebe acréscimo, como na carga inicial). É a mesma regra da decisão 9. Implementado com `AND l.ol_work_key IS NOT NULL` em `SQL_LIVRO_ATUALIZAR` e em `SQL_LIVRO_ASSUNTO_SUBSTITUIR`, e o teste de preservação passou a conferir a linha inteira do livro do Google.
- **Divergências protótipo × implementação (pequenas):** web: espaço vertical de 16 px entre as linhas de chips do seletor (protótipo) em vez de `space-2` do `.md`; `Concluir` desabilitado com a opacidade de 60% do `BotaoPrimario`; durante a carga o foco vai para o título do painel e passa à busca quando a lista chega. Mobile: o foco não vai para a busca ao abrir a folha (o teclado cobriria os chips, mesmo critério dos filtros do Descobrir); 12 px entre os chips do formulário para completar o alvo de 48 px do `X`; contagem do título escondida também na falha.
- **Código alheio alterado (Vicenzo, com nota datada nos `AGENTS.md`):** `acervo` (livro pessoal: DTO, controller, service, repository; teste novo `assuntos-livro-pessoal.int-spec.ts`), web (`LivroPessoalFormView.vue`, `LivroPessoalView.vue`, `services/acervo.ts`), mobile (`livro_pessoal_form_page.dart`, `livro_pessoal_page.dart`, `acervo_service.dart`) e script (`carga.py`, `cli.py`, `README.md`, `tests/test_carga_banco.py`). Do Henrique, só um caso novo em `consumo-conta-excluida.int-spec.ts` (o CASCADE leva os assuntos). A `v_livro_recomendacao_v1` não mudou.
- **Débito alheio visto no teste (não desta feature):** a página do livro pessoal no app estoura ~37 px na horizontal em telas de 320 dp mesmo sem assuntos, e a linha `Páginas` estoura com fonte a partir de 1,3x. A linha `Assuntos` foi corrigida nesta feature; o resto é da página do Vicenzo.
- **Telas (design P3):** lote 4, prompts de edição escritos em 11/10/2026: [`cadastro-pessoal.md`](../../design/periodo-3/cadastro-pessoal/cadastro-pessoal.md) ([protótipo](../../design/periodo-3/cadastro-pessoal/prototipos/cadastro-pessoal.html)) (W+M, campo opcional `Assuntos` entre `Número de páginas` e `Sinopse`, em criar e editar, seletor com os 31 assuntos curados e busca que só filtra; acima de 5 só avisa; falha ao carregar não impede salvar) e [`livro-pessoal.md`](../../design/periodo-3/livro-pessoal/livro-pessoal.md) ([protótipo](../../design/periodo-3/livro-pessoal/prototipos/livro-pessoal.html)) (W+M, linha `Assuntos` na ficha em texto, não clicável, para o dono e no modo consulta; some quando vazia). A ratificar: texto e não chip, ordem alfabética, fechar o seletor sem `Concluir` descarta, texto do aviso. Contratos a confirmar: `GET /assuntos` reaproveitado ou novo, erro de assunto inexistente, `assuntos[]` na leitura do livro pessoal também no modo consulta. RF-ACV-14 (recarga do dump) não tem tela. Protótipos exportados em 21/10/2026.
- **Depende de** [F-ACV-INGESTAO](../periodo-1/feature-F-ACV-INGESTAO.md) (script, tabelas, conjunto curado, tabelas de mapeamento e de sinônimos), [F-ACV-CADASTRO](../periodo-1/feature-F-ACV-CADASTRO.md) (endpoints de livro pessoal), [F-ACV-BUSCA](../periodo-1/feature-F-ACV-BUSCA.md) (exibição na página do livro), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md). Não depende de mensageria.
- **Decisão encerrada em 15/09/2026:** atualização automática removida; esta feature mantém somente a recarga manual já planejada.
- **Assuntos de livro pessoal na recomendação algorítmica:** [F-REC-ALG](feature-F-REC-ALG.md) exclui livro pessoal de terceiros (RF-REC-10); resta ao grupo decidir se os assuntos do livro pessoal **do próprio leitor** contam como sinal de gosto na seção "Do seu gosto". Não decidir aqui.
- **Compartilha `acervo`** com as demais features de acervo — sinalizar no grupo antes de mexer (plano §6).
- Stack de `acervo` definida: **NestJS (TypeScript)** (arquitetura §2.1).

## Timeline

### Implementação 06 e 07/11/2026 (etapa 3): (a) e (b) implementadas, sem migration, validadas e testadas à mão. Commits na `renato-features`: `35984bc` (`acervo` + web + mobile + contrato + notas), `887d77c` (recarga no script), `98c9690` (ajustes da validação). `GET /assuntos` **reaproveitado** de F-ACV-BUSCA, sem rota nova (item próprio do DoD). Testes: `acervo` 392 unitários e 189 de integração em Postgres descartável; script 142 (16 de banco, nenhum pulado); web 1115; mobile 947. Quatro validadores de contexto limpo (um por camada): `acervo` sem achados; script com duas lacunas no roteiro do README (contagem de antes; `conferir` e `semear` antes de filtrar), corrigidas; web com três achados de acessibilidade (foco fora do seletor enquanto a lista carrega, sem-resultado não anunciado, reenvio com o mesmo 400 sem levar o foco), corrigidos com teste; mobile com a linha `Assuntos` estourando em 320–360 dp, corrigida com teste. Teste manual contra o banco de dev com contas próprias (`.invalid`): API (400 de id inexistente e de texto livre, 403 do PATCH de outra conta e do GET sem via, isolamento na busca e no filtro), web no Edge headless (1440 e 390 px, claro e escuro: criar com a busca do seletor, 6 assuntos com aviso, Esc descarta, esvaziar some a linha, `/assuntos` em 503 não impede salvar, leitor B pela lista pública vê a linha sem ação de editar) e app no emulador `Pixel_8_API_35` (criar com a busca, aviso no 6º, voltar descarta, esvaziar some a linha). A recarga foi validada só na amostra em Postgres descartável, nunca no Neon.

### Revisão 15/09/2026: delta removido pelo grupo; recarga manual preservada. Planejamento atualizado; implementação não iniciada.

### Criação 01/09/2026: arquivo criado a partir do escopo de F-ACV-OPC no [periodo-3/README.md](README.md), de RF-ACV-14/22 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 e das RN-03/RN-12/RN-14/RN-19/RN-21. Recarga fixada como modo do script existente, com regra explícita de preservação do dado local; assuntos em livro pessoal fixados como extensão dos endpoints de F-ACV-CADASTRO, restritos ao conjunto curado e fora dos índices públicos. O delta diário de ingestão foi mantido como pendência separada, sem ser absorvido por esta feature.
