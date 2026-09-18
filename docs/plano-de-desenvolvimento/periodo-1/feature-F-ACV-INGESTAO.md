# F-ACV-INGESTAO — Ingestão do acervo (dump + assuntos)

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** Vicenzo Fonseca · **Serviços afetados:** `acervo` (base de dados) + **script utilitário de carga** (fora dos 4 serviços)

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2 (RF-ACV-13, 20), RN-12, RN-21, §10.1. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §2.1, §2.2, §4.1. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha.

## Objetivo

**Popular a base oficial** a partir do data dump do OpenLibrary, para que a busca e a página do livro tenham acervo real desde o início. Fecha os requisitos **Essenciais** de ingestão:

- **RF-ACV-13** carga inicial da base oficial a partir de **data dump externo**, com **normalização** de autor, editora e série (RN-12);
- **RF-ACV-20** associar **assuntos** aos livros oficiais na ingestão, **normalizados** conforme RN-21.

A ingestão é um **script utilitário de carga**, não um serviço (arquitetura §2.1) — pode ser escrito na linguagem mais conveniente (Python é natural para processar dumps grandes), sem virar stack de manutenção. Ele grava diretamente nas tabelas do schema `acervo`; a leitura desses dados é de [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) e [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md).

RNF atendidos: **RNF-DES-04** (acervo ≤20% do limite do plano Neon — carga dimensionada por filtragem do dump), **RNF-DES-05** (persistir só os campos necessários; o **índice de busca** é o custo dominante e entra no dimensionamento), **RNF-DES-03** (índices sobre título/autor/ISBN), **RNF-SEC-33** (dado externo validado/normalizado antes de persistir, nunca confiado por origem), **RNF-SEC-12** (carga por `COPY`/consulta parametrizada, sem concatenação).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra / Dados | em andamento | baseline do DER implantada em 16/09/2026; dados curados versionados em 18/09/2026 (30 assuntos, 104 sinônimos de editora, 208 mapeamentos de tag). Falta executar a carga e validar a capacidade contra RNF-DES-04 |
| Script de carga | implementado | `code/scripts/ingestao/` (Python): filtragem em streaming, normalização RN-12, mapeamento RN-21, `COPY` para staging com upsert e registro em `ingestao_execucao`. **Nunca executado contra o dump real** — ver pendências |
| Backend | não aplicável | carga inicial não é endpoint, consumidor ou fluxo de mensageria |
| Web | não aplicável | RF-ACV-13/20 são de sistema, sem UI |
| Mobile | não aplicável | idem |

## Especificação

### Infra / Dados — schema `acervo`

O modelo físico está versionado em `code/back/acervo/drizzle/0001_20260916110700_modelo_der.sql` e foi implantado no Neon em 16/09/2026. Isso entrega apenas a estrutura de dados; não implementa o script nem significa que o catálogo foi carregado. A baseline, reaproveitada por [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md), contém:

- `Livro` (edição — RN-01): ISBN-13 **único** (RN-02), `ol_edition_key` (id secundário de dedup — RN-02), título, ano, nº de páginas, **duas URLs de capa** (externa preenchida na ingestão, própria inicialmente ausente — RN-14.1), flag oficial/pessoal.
- `Autor`, `Editora`, `Serie` (com número de ordem opcional por livro), `Assunto` (conjunto curado), e as associações livro↔autor/editora/serie/assunto.
- **Índices** de busca sobre título, autor e ISBN (RNF-DES-03), dimensionados no custo de armazenamento (RNF-DES-05).
- **Identificadores externos:** persiste `ol_edition_key` para deduplicação da edição e `ol_work_key` como referência externa não única. `ol_work_key` não cria camada de obra; permite a F-ACV-NOTA replicar ratings de obra nas edições associadas.
- **Contrato entre schemas:** `v_livro_referencia_v1` expõe somente `livro_id`, tipo oficial/pessoal, `dono_id`, total de páginas, título, autor para exibição, capa resolvida e estado ativo. A VIEW implantada já contempla os dois tipos; [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md) implementará o ciclo de vida dos livros pessoais. `leitura` usa o contrato para validar página, tipo e dono; `social` usa livro/estado para snapshots e para ocultar atividade de alvo excluído. Nenhum consumidor lê as tabelas cruas de `acervo`.
- **Objetos já implantados relevantes à carga:** `ingestao_execucao` (`tipo=carga_inicial|recarga`), `sinonimo_editora`, `mapa_assunto_externo`, as tabelas de catálogo e associações, os índices de unicidade de ISBN-13/`ol_edition_key` e de consulta, `v_livro_referencia_v1` e `v_livro_recomendacao_v1`. O conjunto curado, os sinônimos e os mapeamentos ainda precisam ser populados por entregáveis versionados desta feature.

### Script de carga (RF-ACV-13, RN-12, §10.1)

**Fronteira operacional:** esta feature cobre exclusivamente a **carga inicial em lote** do dump. O script é operado pelo grupo fora dos quatro serviços, filtra localmente e grava diretamente no schema `acervo` por `COPY`/SQL parametrizado. Não há rota HTTP, outbox, publicação, fila ou consumidor; portanto ela não depende de [P0-MSG](../periodo-0/feature-P0-MSG.md). O fluxo `livro.importacao_solicitada` pertence exclusivamente à importação **individual e on-line por ISBN** de [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md), não à carga ou recarga do dump.

- **Fonte:** data dump de edições do OpenLibrary (domínio público, CC0), na ordem de dezenas de GB — **exige filtragem prévia** processada **localmente em streaming** e carregada por **`COPY`** (§10.1). Nada do dump bruto vai ao Neon sem filtro.
- **Filtros aplicados no nível da EDIÇÃO** (ressalva §10.1: `language:por` de obra é pouco confiável): **edição em português**, com **ISBN-13**, com **total de páginas** e com **capa**. Livros sem ISBN-13, sem total de páginas ou sem capa são **descartados** (RN-12) — progresso por página exige total de páginas.
- **Normalização (RN-12):**
  - **Autor:** deduplicado pelo id da fonte quando disponível; senão por nome normalizado.
  - **Editora:** texto livre na origem → normalizar (minúsculas, remoção de pontuação e sufixos societários) + **tabela de sinônimos** mantida pelo grupo para as principais editoras brasileiras (ex.: "Intrinseca"/"Intrínseca"); a entidade `Editora` nasce da forma normalizada.
  - **Série:** texto livre → normalizada da mesma forma, número de ordem opcional.
  - **Capa:** URL externa **sempre persistida, nunca descartada** (RN-12, RN-14.1); a cópia própria é cache sob demanda (RN-14, não é desta feature).
  - **Sinopse:** **não** persistida na carga (RN-19.1 — sob demanda em [F-ACV-BUSCA](feature-F-ACV-BUSCA.md)).
  - **Nota geral:** **não** é desta feature — a importação de nota geral é RF-ACV-15 (**F-ACV-NOTA**, Período 2).
- **Assuntos (RF-ACV-20, RN-21):** a origem fornece tags livres e não normalizadas (dezenas por obra). A ingestão aplica uma **tabela de mapeamento** tag-externa → **assunto do conjunto curado e fechado (~30 gêneros definidos pelo grupo)**, **descartando o que não mapeia** (RN-21.3/4). Tag sem correspondência **não cria** assunto novo; livro sem assunto reconhecido fica sem assunto (estado válido). Recomendado ≤5 assuntos por livro (RN-21.2). Assuntos das tags livres da origem **não** são armazenados (RN-12).
- **Exclusões recomendadas (§10.1):** autopublicação (`Independently Published` e similares) com metadado pobre; não usar `publish_place` como filtro principal; `first_publish_year` refere-se à obra original, não à edição — janela de anos recentes exclui cânone de vestibular/ENEM, que entra por curadoria ou por [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md).
- **Segurança:** dado externo **validado e normalizado antes de persistir**, jamais confiado por origem (SEC-33); carga por `COPY`/parametrizado (SEC-12).

## Critérios de aceite

- [x] O script filtra o dump **no nível da edição** (português, ISBN-13, total de páginas, capa) e carrega por `COPY` em streaming, sem subir o dump bruto ao Neon. *Implementado e testado contra a amostra; a execução contra o dump real ainda não aconteceu.*
- [x] Autor, editora e série são **normalizados** (RN-12), com a **tabela de sinônimos** de editoras aplicada.
- [x] URL de capa **externa** é persistida em todo livro; sinopse e nota geral **não** são carregadas.
- [x] Assuntos são mapeados para o **conjunto curado (30)** pela tabela de mapeamento; tags sem correspondência são **descartadas** e não criam assunto novo (RN-21). O teto de 5 por livro é aplicado na fase de resolução.
- [x] Livros sem ISBN-13/páginas/capa são **descartados** (RN-12), com o motivo contabilizado por categoria.
- [ ] O acervo carregado respeita o **teto de 20%** do plano Neon (RNF-DES-04), com o índice de busca contabilizado (RNF-DES-05). *O script aceita `--limite` e mede dados e índice por tabela ao fim da carga; o número real depende da execução.*
- [x] Índices físicos de título/autor/ISBN e unicidade de ISBN-13/`ol_edition_key` estão versionados e implantados (RNF-DES-03); a eficácia com o volume real ainda será validada pela carga.
- [x] `v_livro_referencia_v1` está versionada e implantada com exatamente `livro_id`, `tipo`, `dono_id`, `paginas`, `titulo`, `autor_exibicao`, `capa_resolvida`, `ativo`, sem expor tabelas cruas.
- [x] Reexecutar a mesma amostra não duplica livro, autor, editora, série ou assunto; ISBN-13 e `ol_edition_key` sustentam a deduplicação. *Deduplicação em memória na fase 1 coberta por teste; o `ON CONFLICT DO NOTHING` da fase 3 só será exercitado contra banco real.*
- [x] A amostra reproduzível fornece ao menos livros oficiais suficientes para o seed transversal de RNF-TST-08, sem depender do dump completo. *14 edições aceitas e 8 descartadas, uma por motivo de descarte.*
- [ ] A base carregada é consultável por [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) **em DES**.

## Definition of Done

(plano §10)

- [ ] Script de carga mergeado em `desenvolvimento` — implementado em `vicenzo-features`, ainda não mergeado
- [x] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)) — `ci-scripts-ingestao.yml` confere os dados curados e roda a suíte contra a **amostra reproduzível**, sem baixar dump (RNF-TST-08)
- [ ] Testes unitários e de integração contra banco real/container: normalização de editora/autor/série (RN-12), mapeamento de assuntos (RN-21), descarte de registro inválido, deduplicação em recarga da amostra e contrato da VIEW (RNF-TST-02/08) — **70 testes unitários entregues**; a parte que exige banco real segue pendente
- [ ] Teste operacional da amostra cobre registro de `ingestao_execucao`, totais coerentes, falha sem carga parcial silenciosa e reexecução idempotente; testes de broker são **N/A**, pois o dump não usa mensageria — totais e motivos de descarte cobertos por teste; `ingestao_execucao` e a transação única da carga exigem banco
- [ ] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** — não há endpoint de ingestão, mas `v_livro_referencia_v1` é documentada como contrato entre schemas; os endpoints ficam em [F-ACV-BUSCA](feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md)
- [ ] Fluxo funcionando em DES/HML — acervo carregado na branch de DES ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver (N/A — sem UI)

**Itens próprios:** ~~versionar a **tabela de sinônimos de editoras** e a **tabela de mapeamento de assuntos** (entregáveis desta feature) e o **conjunto curado de ~30 assuntos**~~ — **feito (18/09/2026):** `code/scripts/ingestao/dados/{assuntos,sinonimos_editora,mapa_assunto}.csv`, com conferência de consistência no CI. Falta registrar em Timeline o **volume real carregado** e a fração do plano Neon consumida (validação de RNF-DES-04).

## Pendências

- **Depende de** [P0-INFRA](../periodo-0/feature-P0-INFRA.md) (schema `acervo`, Drizzle e runner) e [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md) (branch Neon de DES). A baseline física já foi implantada, mas a carga em DES ainda depende do ambiente operacional. **Não depende de P0-MSG nem produz `livro.importacao_solicitada`.**
- **Dependências entre features:** [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) depende desta feature para catálogo oficial, assuntos e volume de teste; [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md) reutiliza o mesmo modelo e normalização, mas sua importação individual é um fluxo separado; [F-ACV-NOTA](../periodo-2/feature-F-ACV-NOTA.md) reutiliza `ol_work_key`; [F-ACV-OPC](../periodo-3/feature-F-ACV-OPC.md) estende o mesmo script com `tipo=recarga`.
- **Conjunto curado de assuntos (~30)** e as **tabelas de mapeamento/sinônimos** precisam ser definidos pelo grupo — bloqueiam a qualidade da normalização, não o começo do script.
- **Recarga manual do dump** (RF-ACV-14) fica fora e está alocada a **F-ACV-OPC** (Período 3).
- **Decisão encerrada em 15/09/2026:** delta/atualização automática removido do escopo. Permanecem carga inicial e recarga manual em F-ACV-OPC; `ingestao_execucao.tipo` não possui delta.
- **Importação de nota geral** (RF-ACV-15) é **F-ACV-NOTA** (Período 2).
- ~~Linguagem do script (Python recomendado) e ambiente de execução a fixar no arranque.~~ — **fechado em 18/09/2026:** Python 3.11+, em `code/scripts/ingestao/`, executado à mão a partir da máquina de alguém do grupo. Não é job agendado e não sobe no Render.
- **A carga nunca foi executada contra o dump real.** O script está implementado e testado contra a amostra versionada, mas os três dumps (edições, autores, obras) somam dezenas de GB e o download não cabia na sessão em que ele foi escrito. O roteiro completo está em `code/scripts/ingestao/README.md`. Enquanto isso não acontecer, o acervo em DES continua vazio e **F-ACV-BUSCA não tem o que buscar**.
- **Duplicação consciente das funções de normalização.** As regras de RN-12 e RN-21 existem em Python (o script) e em TypeScript (o importador por ISBN de F-ACV-CADASTRO), porque são linguagens diferentes. Os **dados** não estão duplicados: os CSV são a fonte versionada e as tabelas `assunto`, `sinonimo_editora` e `mapa_assunto_externo` são a fonte de runtime dos dois lados. O que pode divergir são as funções — slug, sufixos societários, dígito verificador — e os dois conjuntos de teste usam os mesmos casos de propósito.
- **Conjunto curado, sinônimos e mapeamento entram como proposta do dono**, não como decisão do grupo. RN-21.1 diz que os ~30 gêneros são definidos pelo grupo; os arquivos versionados precisam de ratificação. Mudar um slug depois da carga exige migração dos vínculos em `livro_assunto`.
- **A conferência dos dados curados é a primeira coisa a rodar.** `python -m leai_ingestao conferir` valida os três CSV entre si sem tocar o banco: slug que não deriva do nome violaria o CHECK, tag fora da forma normalizada nunca casaria em runtime, e mapeamento apontando para assunto inexistente violaria a FK — os três só apareceriam no meio de uma carga de horas.

## Timeline

### Implementação 18/09/2026: script de carga implementado em Python, em `code/scripts/ingestao/`, fora dos quatro serviços como a arquitetura §2.1 exige — sem HTTP, sem outbox e sem dependência de [P0-MSG](../periodo-0/feature-P0-MSG.md). O pipeline tem três fases porque o dump de edições não é autossuficiente: a edição referencia autor e obra por chave, mas o nome do autor vive em `ol_dump_authors` e os assuntos vivem na obra, em `ol_dump_works`. `filtrar` aplica RN-12 no nível da **edição** (§10.1 mediu 26% de falso positivo em `language:por` de obra), exigindo português, ISBN-13 com dígito verificador, total de páginas e capa, e excluindo autopublicação; `resolver` lê os dumps de autores e obras uma vez cada, guardando só as chaves necessárias e já traduzindo as tags livres para o conjunto curado, que nunca chegam ao banco (RN-12); `carregar` faz `COPY` para staging temporário e upsert com `ON CONFLICT DO NOTHING` em uma transação só, deduplicando por ISBN-13 e `ol_edition_key` (RNF-SEC-12). Entregues os três dados curados versionados: 30 assuntos (RN-21.1), 104 sinônimos de editora e 208 mapeamentos de tag externa — os CSV são a fonte versionada e as tabelas do schema são a fonte de runtime, lidas também pelo importador por ISBN de F-ACV-CADASTRO. Duas decisões de normalização ficaram travadas por teste: editora **preserva acento**, porque RN-12 cita "Intrinseca"/"Intrínseca" como caso da tabela de sinônimos e remover acento tornaria o exemplo da regra sem sentido; e palavra de ramo só é removida do início, porque no fim ela é parte da marca ("Globo Livros", "Universo dos Livros"). `psycopg` é extra opcional e só `carga.py` o importa, o que permite rodar a suíte inteira sem banco. Novo `ci-scripts-ingestao.yml` confere os dados curados e roda 70 testes contra a amostra reproduzível de 14 edições aceitas e 8 descartadas, uma por motivo (RNF-TST-08), sem baixar dump. **A carga contra o dump real não foi executada** e continua como pendência principal. Status, critérios, DoD e pendências atualizados.

### Alinhamento 17/09/2026: status corrigido para registrar a baseline física de `acervo` versionada e implantada sem declarar o script implementado. Fixada a fronteira operacional entre carga inicial direta por script, sem HTTP/mensageria/P0-MSG, e importação individual por ISBN de F-ACV-CADASTRO; testes e dependências cruzadas foram alinhados ao DER implantado.

### Revisão 15/09/2026: grupo removeu delta automático; DER e fronteira de ingestão atualizados, sem novo job. Implementação não iniciada.

### Revisão 01/09/2026: `ol_work_key` incorporado como identificador externo não único para associar ratings por obra às edições, sem criar entidade Obra.

### Revisão 28/08/2026: contrato `v_livro_referencia_v1`, deduplicação da carga e teste de integração foram explicitados. Recarga manual permaneceu em F-ACV-OPC e o delta diário sem feature foi registrado separadamente como pendência.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-ACV-INGESTAO no [periodo-1/README.md](README.md), de RF-ACV-13/20 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2, das RN-12/RN-21 e da análise de fonte externa §10.1. Ingestão fixada como script utilitário (não serviço); nota geral e recarga do dump explicitamente adiadas aos Períodos 2/3.
