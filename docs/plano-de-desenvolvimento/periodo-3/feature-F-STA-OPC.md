# F-STA-OPC — Distribuição de notas

**Período:** 3 · **Prioridade:** opcional
**Dono:** a definir · **Serviços afetados:** `leitura` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.8 (RF-STA-04), RN-06, RN-08. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Fechar o painel de estatísticas de [F-STA](../periodo-2/feature-F-STA.md) com o único indicador que faltava: **como o leitor distribui as notas que dá**. A média já existe (RF-STA-02) e esconde o formato — dois leitores com média 3,5 podem ter perfis opostos, um concentrado no meio e outro polarizado. Fecha o requisito **Opcional**:

- **RF-STA-04** visualizar a **distribuição das notas que o leitor atribuiu**.

O histograma é **derivado por agrupamento** das notas do próprio leitor, sem entidade nova, sem campo novo no DER e sem migration. É a mesma solução que [F-ACV-NOTA](../periodo-2/feature-F-ACV-NOTA.md) adotou para o histograma do livro, e evita um agregado que teria de ser mantido em sincronia com a `nota_media` de F-STA a cada criação, edição ou remoção de nota. Nenhum evento é criado: nota e estatística vivem no mesmo serviço `leitura`.

**Este é o histograma das notas que o leitor deu, não o de um livro.** A distribuição das notas **de um livro** é RF-ACV-04, pertence a [F-ACV-NOTA](../periodo-2/feature-F-ACV-NOTA.md), vive em `acervo` e aparece na página do livro. Dados diferentes, serviços diferentes, superfícies diferentes.

RNF atendidos: **RNF-SEC-02** (dados do próprio usuário), **RNF-SEC-03** (privacidade de perfil alheio verificada no servidor), **RNF-SEC-12** (consulta parametrizada), **RNF-DES-01** (leitura rápida sobre conjunto pequeno), **RNF-USA-03** (contraste do gráfico), **RNF-ERR-09** (cold start tratado como carregamento).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | **não aplicável** | nenhuma tabela ou campo novo — o histograma agrega as notas já persistidas por F-AVA |
| Backend | não iniciado | `leitura`: bloco de distribuição em `/me/estatisticas` e no recorte de perfil |
| Web | não iniciado | gráfico de distribuição no painel de estatísticas |
| Mobile | não iniciado | mesmo gráfico |

## Especificação

### Backend / API — `leitura`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). Só os dados do **próprio usuário** (SEC-02), salvo o recorte de perfil, que aplica RN-08. Leitura pura: a feature não tem escrita própria.

- **`GET /me/estatisticas`** (RF-STA-04) — o payload de [F-STA](../periodo-2/feature-F-STA.md) ganha o **bloco de distribuição**. Não se cria rota separada: é o mesmo painel, na mesma tela, e uma segunda chamada só somaria round-trip e um segundo cold start.
- **`GET /perfis/{usuarioId}/estatisticas`** — reaproveita a **mesma camada de cálculo** de `/me`, como [F-STA](../periodo-2/feature-F-STA.md) fixou, evitando fórmulas divergentes. Perfil público é visível a todos; privado exige o próprio usuário ou seguidor aceito (RN-08), verificado no servidor. Se a distribuição integra o DTO público é decisão do dono (ver Pendências).

**Escala e buckets (RN-06):** os valores permitidos são **0; 0,5; 1; 1,5; 2; 2,5; 3; 3,5; 4; 4,5; 5** — **onze** buckets, nem mais nem menos. O agrupamento é por valor exato; não há faixa, arredondamento nem colapso de meia estrela em estrela cheia, sob pena de o histograma contradizer a nota que o leitor vê no livro.

**Ausência × zero — a distinção que o endpoint precisa fazer (RN-06.3):**

- Leitor **sem nenhuma nota** → distribuição **vazia/ausente**. Onze zeros seriam um gráfico plano afirmando "avaliou tudo com nota nenhuma", que é falso; indicador ausente é exibido como ausente, jamais como zero.
- Leitor **com ao menos uma nota** → **todos os onze** buckets, inclusive os de contagem zero. Aqui o zero é informação real ("nunca dei 0,5") e omiti-lo deformaria o eixo do gráfico.

**Escopo do conjunto contado:** todas as notas do leitor, uma por livro (unicidade `(usuario, livro)` de RN-06). **Livro pessoal conta**, coerentemente com RN-03 e com a contagem das estatísticas — a nota é do leitor, e o que o histograma descreve é o critério dele, não o catálogo. Nota é **do livro, não da leitura** (RN-06): releitura não duplica bucket.

**Ciclo da nota:** criar, editar e **remover** nota (RN-06 — a nota é editável e removível) altera a distribuição **na hora**, porque ela é derivada da tabela e não de um agregado. Não há evento novo nem recálculo assíncrono a acionar, coerente com a regra de [F-STA](../periodo-2/feature-F-STA.md) de não criar evento de broker para comunicação interna ao próprio serviço.

**Modelo de dados:** **nenhuma tabela nova e nenhum campo novo**. O histograma agrega a `nota` do schema `leitura`, mantida por [F-AVA](../periodo-1/feature-F-AVA.md). Nenhuma leitura cruzada de outro schema: a distribuição não precisa de metadado de livro.

**Eventos:** **nenhum**, nem produzido nem consumido. A feature não entra na matriz de mensageria.

### Frontend Web (`code/front`)

- **Gráfico de distribuição** no painel de estatísticas, ao lado da nota média de [F-STA](../periodo-2/feature-F-STA.md) — os dois se leem juntos. Onze colunas na ordem da escala, com a contagem legível e o estado **vazio** tratado como mensagem de ausência, não como gráfico zerado. Paleta e contraste WCAG AA de [P0-DS](../periodo-0/feature-P0-DS.md) (RNF-USA-03); cold start é carregamento (RNF-ERR-09). Na seção de estatísticas de perfil alheio, exibe o que o DTO público devolver.

### App Flutter (`code/mobile`)

- Mesmo gráfico com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md), adaptado à largura do telefone sem cortar buckets nem exigir rolagem horizontal. Alvo de demonstração Android.

## Critérios de aceite

- [ ] A distribuição usa exatamente os **onze valores** de RN-06 (0 a 5, passo 0,5), sem faixa e sem arredondamento (RF-STA-04).
- [ ] Leitor **sem notas** recebe distribuição **ausente/vazia**, nunca onze zeros (RN-06.3).
- [ ] Leitor **com** notas recebe **todos** os onze buckets, inclusive os de contagem zero.
- [ ] A soma das contagens é igual ao número de livros que o leitor avaliou; **livro pessoal conta** (RN-03) e releitura não duplica bucket (RN-06).
- [ ] Criar, editar e **remover** nota altera a distribuição imediatamente, sem aguardar recálculo ou evento.
- [ ] A distribuição é coerente com a **nota média** exibida no mesmo painel (RF-STA-02) — as duas saem do mesmo conjunto.
- [ ] Só o próprio leitor vê a sua por `/me` (SEC-02); o recorte de perfil respeita RN-08 no servidor e reaproveita a mesma camada de cálculo (SEC-03).
- [ ] O gráfico atende contraste WCAG AA e trata o estado vazio sem erro (RNF-USA-03).
- [ ] Nenhuma tabela ou campo novo é criado para a feature.
- [ ] A distribuição funciona **em DES**, na web e no app.

## Definition of Done

(plano §10)

- [ ] Código (backend `leitura`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container: os onze buckets, leitor sem notas, buckets de contagem zero, soma conferindo com o total avaliado, livro pessoal contando, ciclo criar/editar/remover nota, coerência com a média e RN-08 em perfil público/privado (RNF-TST-02)
- [ ] Testes assíncronos — **N/A**: a feature não produz nem consome evento; a distribuição é derivada em consulta. Justificativa registrada aqui em vez de remover o item
- [ ] Testes web/mobile cobrem render do gráfico, estado vazio e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `leitura` atualizado em `docs/api/leitura.yaml`** com o bloco de distribuição em `/me/estatisticas` e no recorte de perfil
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** registrar na Timeline a decisão sobre o **DTO público** (se a distribuição aparece no perfil alheio) e o formato escolhido para o gráfico — contagem, percentual ou ambos —, para que web e mobile não divirjam na leitura do mesmo dado.

## Pendências

- **Depende de** [F-STA](../periodo-2/feature-F-STA.md) (painel, camada de cálculo compartilhada e endpoint de perfil), [F-AVA](../periodo-1/feature-F-AVA.md) (notas), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (RN-08), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md). Não depende de mensageria.
- **Decisões do dono:** se a distribuição entra no **DTO público** do perfil sob RN-08 — F-STA já registrou os campos do DTO público como decisão do dono, e esta feature não a antecipa; e se o gráfico apresenta contagem absoluta, percentual ou os dois.
- **Alternativa a avaliar, sem mudar o desenho atual:** persistir os onze buckets junto dos agregados de `estatistica_usuario` e mantê-los pelo mesmo recálculo de RF-STA-05. Só compensa se a medição em DES mostrar custo real da agregação; exigiria acrescentar o campo ao DER **antes** da migration, e passa a demandar sincronia com o ciclo da nota que hoje é automática.
- **Fronteira:** a distribuição de notas **de um livro** (RF-ACV-04) é de [F-ACV-NOTA](../periodo-2/feature-F-ACV-NOTA.md), em `acervo`, derivada da projeção de notas dos leitores. Não confundir os dois histogramas nem tentar reaproveitar um para o outro.
- **Compartilha `leitura`** com as demais features de leitura — sinalizar no grupo (plano §6). As notas que alimentam a distribuição são limpas por [F-CONTA-2](../periodo-2/feature-F-CONTA-2.md) na exclusão de conta.
- Stack de `leitura` ainda pendente (P0-INFRA).

## Timeline

### Criação 01/09/2026: arquivo criado a partir do escopo de F-STA-OPC no [periodo-3/README.md](README.md), de RF-STA-04 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.8 e das RN-06/RN-08. Histograma fixado como derivação por agrupamento das notas do próprio leitor, sem entidade, campo ou evento novo, espelhando a solução de F-ACV-NOTA para o histograma do livro; a distinção entre distribuição ausente e buckets de contagem zero foi fixada por RN-06.3. A entrada no DTO público do perfil e o formato do gráfico ficaram como decisões do dono, e a persistência dos buckets permaneceu apenas como alternativa a avaliar.
