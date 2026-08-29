# F-ACV-INGESTAO — Ingestão do acervo (dump + assuntos)

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `acervo` (base de dados) + **script utilitário de carga** (fora dos 4 serviços)

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
| Infra | não iniciado | tabelas de catálogo, índices e VIEW `v_livro_referencia_v1` no schema `acervo` |
| Backend | não aplicável | ingestão é script de carga, não endpoint (ver DoD) |
| Web | não aplicável | RF-ACV-13/20 são de sistema, sem UI |
| Mobile | não aplicável | idem |

## Especificação

### Infra / Dados — schema `acervo`

Modelo mínimo do catálogo oficial (schema `acervo`, migration revisada por humano — plano §5), reaproveitado por [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md):

- `Livro` (edição — RN-01): ISBN-13 **único** (RN-02), `ol_edition_key` (id secundário de dedup — RN-02), título, ano, nº de páginas, **duas URLs de capa** (externa preenchida na ingestão, própria inicialmente ausente — RN-14.1), flag oficial/pessoal.
- `Autor`, `Editora`, `Serie` (com número de ordem opcional por livro), `Assunto` (conjunto curado), e as associações livro↔autor/editora/serie/assunto.
- **Índices** de busca sobre título, autor e ISBN (RNF-DES-03), dimensionados no custo de armazenamento (RNF-DES-05).
- **Contrato entre schemas:** `v_livro_referencia_v1` expõe somente `livro_id`, tipo oficial/pessoal, `dono_id`, total de páginas, título, autor para exibição, capa resolvida e estado ativo. `leitura` usa o contrato para validar página, tipo e dono; `social` usa livro/estado para snapshots e para ocultar atividade de alvo excluído. [F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md) completa o mesmo contrato para livros pessoais. Nenhum consumidor lê as tabelas cruas de `acervo`.

### Script de carga (RF-ACV-13, RN-12, §10.1)

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

- [ ] O script filtra o dump **no nível da edição** (português, ISBN-13, total de páginas, capa) e carrega por `COPY` em streaming, sem subir o dump bruto ao Neon.
- [ ] Autor, editora e série são **normalizados** (RN-12), com a **tabela de sinônimos** de editoras aplicada.
- [ ] URL de capa **externa** é persistida em todo livro; sinopse e nota geral **não** são carregadas.
- [ ] Assuntos são mapeados para o **conjunto curado (~30)** pela tabela de mapeamento; tags sem correspondência são **descartadas** e não criam assunto novo (RN-21).
- [ ] Livros sem ISBN-13/páginas/capa são **descartados** (RN-12).
- [ ] O acervo carregado respeita o **teto de 20%** do plano Neon (RNF-DES-04), com o índice de busca contabilizado (RNF-DES-05).
- [ ] Índices de busca (título/autor/ISBN) criados (RNF-DES-03).
- [ ] `v_livro_referencia_v1` existe com os campos mínimos, nome distinto das tabelas e sem expor dados desnecessários.
- [ ] Reexecutar a mesma amostra não duplica livro, autor, editora, série ou assunto; ISBN-13 e `ol_edition_key` sustentam a deduplicação.
- [ ] A amostra reproduzível fornece ao menos livros oficiais suficientes para o seed transversal de RNF-TST-08, sem depender do dump completo.
- [ ] A base carregada é consultável por [F-ACV-BUSCA](feature-F-ACV-BUSCA.md) **em DES**.

## Definition of Done

(plano §10)

- [ ] Script de carga + migrations do schema `acervo` mergeados em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)) — o CI não roda o dump inteiro; valida o script contra uma **amostra reproduzível** (RNF-TST-08)
- [ ] Testes unitários e de integração contra banco real/container: normalização de editora/autor/série (RN-12), mapeamento de assuntos (RN-21), descarte de registro inválido, deduplicação em recarga da amostra e contrato da VIEW (RNF-TST-02/08)
- [ ] **Spec OpenAPI de `acervo` atualizado em `docs/api/acervo.yaml`** — não há endpoint de ingestão, mas `v_livro_referencia_v1` é documentada como contrato entre schemas; os endpoints ficam em [F-ACV-BUSCA](feature-F-ACV-BUSCA.md)/[F-ACV-CADASTRO](feature-F-ACV-CADASTRO.md)
- [ ] Fluxo funcionando em DES/HML — acervo carregado na branch de DES ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver (N/A — sem UI)

**Itens próprios:** versionar a **tabela de sinônimos de editoras** e a **tabela de mapeamento de assuntos** (entregáveis desta feature) e o **conjunto curado de ~30 assuntos**; registrar em Timeline o **volume real carregado** e a fração do plano Neon consumida (validação de RNF-DES-04).

## Pendências

- **Depende de** [P0-INFRA](../periodo-0/feature-P0-INFRA.md) (schema `acervo`, ferramenta de migration) e [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md) (branch Neon de DES). Não depende de mensageria.
- **Conjunto curado de assuntos (~30)** e as **tabelas de mapeamento/sinônimos** precisam ser definidos pelo grupo — bloqueiam a qualidade da normalização, não o começo do script.
- **Recarga manual do dump** (RF-ACV-14) fica fora e está alocada a **F-ACV-OPC** (Período 3).
- **Delta diário de ingestão:** consta no `REQUISITOS.md` §10.2 e na arquitetura §2.4, mas não possui feature no mapa dos períodos 2/3. Registrar para decisão e alocação pelo grupo; não presumir que F-ACV-OPC o cobre, pois ela trata recarga manual.
- **Importação de nota geral** (RF-ACV-15) é **F-ACV-NOTA** (Período 2).
- Linguagem do script (Python recomendado) e ambiente de execução (rodar localmente / job) a fixar no arranque.

## Timeline

### Revisão 28/08/2026: contrato `v_livro_referencia_v1`, deduplicação da carga e teste de integração foram explicitados. Recarga manual permaneceu em F-ACV-OPC e o delta diário sem feature foi registrado separadamente como pendência.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-ACV-INGESTAO no [periodo-1/README.md](README.md), de RF-ACV-13/20 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.2, das RN-12/RN-21 e da análise de fonte externa §10.1. Ingestão fixada como script utilitário (não serviço); nota geral e recarga do dump explicitamente adiadas aos Períodos 2/3.
