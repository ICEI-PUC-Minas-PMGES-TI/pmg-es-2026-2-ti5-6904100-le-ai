# F-PERFIL — Perfil, privacidade e seguidores

**Período:** 1 · **Prioridade:** prioritaria
**Dono:** a definir · **Serviços afetados:** `identidade` (backend) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9 (RF-SOC-01..08) e RN-08. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2, §5.2, §2.5. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar o **núcleo social de identidade**: o perfil do leitor, sua **privacidade** e o **grafo de seguidores** — a peça que faz "ver amigos lendo" ser possível. Fecha os requisitos **Essenciais** de perfil e social do serviço `identidade`:

- **RF-SOC-01** editar o próprio perfil (nome de exibição, biografia, **avatar**, privacidade);
- **RF-SOC-02** visualizar o perfil de outro leitor; no Período 1, identidade, contadores, estante e resenhas são compostos com as features disponíveis. A exigência de listas conflita com F-LST no Período 2 e permanece pendência de baseline, sem ser declarada integralmente fechada aqui;
- **RF-SOC-03** buscar outro leitor **apenas por username exato**;
- **RF-SOC-04** definir o perfil como **público ou privado**;
- **RF-SOC-05** **seguir** um perfil público, com efeito imediato;
- **RF-SOC-06** **solicitar seguir** um perfil privado; o destinatário **aceita ou recusa**;
- **RF-SOC-07** deixar de seguir e remover um seguidor;
- **RF-SOC-08** visualizar suas próprias listas de **seguidores** e **seguidos**.

O controle de acesso de perfil privado (**RN-08**) é um dos três itens de **prioridade obrigatória de teste** (RNF-TST-01) e é validado **no servidor** em todo endpoint (RNF-SEC-03), incluindo listagem e busca.

RNF atendidos: **RNF-SEC-01/02/03** (controle de acesso e propriedade no servidor), **RNF-SEC-05** (IDs não sequenciais), **RNF-SEC-18** (rate limiting em seguir), **RNF-SEC-19/44** (descoberta só por username exato, sem enumeração/diretório), **RNF-SEC-20** (upload de avatar valida tipo/tamanho/dimensões), **RNF-DES-02** (listagens paginadas), **RNF-USA-04** (confirmação em ação destrutiva). Serviço de imagens: **Cloudinary** (P-09).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | tabelas `seguidor`/`solicitacao_seguir`; VIEWs `v_perfil_referencia_v1`/`v_seguimento_aceito_v1`; preset Cloudinary de avatar |
| Backend | não iniciado | `identidade`: perfil, privacidade, seguir/solicitar, listas, busca por username |
| Web | não iniciado | tela de perfil (próprio/de outro), edição, busca por username, seguidores/seguidos |
| Mobile | não iniciado | mesmas telas + upload de avatar direto ao Cloudinary |

## Especificação

### Backend / API — `identidade`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) o corpo de erro padrão + correlation-id e mensagens pt-BR (RNF-USA-05). Todo acesso a conteúdo restrito de perfil privado revalida **relação de seguidor aceita no servidor** (RNF-SEC-03), em **todos** os endpoints de conteúdo, inclusive listagens. A busca exata continua retornando apenas os campos públicos definidos em RN-08. IDs de recurso **não sequenciais** (SEC-05). Escritas aceitam `Idempotency-Key` conforme o [README do período](README.md#regras-de-implementação-compartilhadas).

- **`GET /me/perfil`** e **`PUT /me/perfil`** (RF-SOC-01) — edita nome de exibição, **biografia**, **avatar** e **privacidade** (`publico`/`privado`, RF-SOC-04). Biografia tratada como texto na renderização (escape — SEC-14). Avatar por **Cloudinary unsigned upload** (P-09): o cliente envia direto ao Cloudinary e manda a URL/ID; o servidor **valida tipo real, tamanho e dimensões** (SEC-20) e fixa pasta/tipos/tamanho no preset.
- **`GET /perfis/{username}`** (RF-SOC-02, RN-08) — retorna o perfil de outro leitor. **Nome, avatar e biografia são visíveis a todos**; estante, leituras, listas, estatísticas, resenhas e notas seguem RN-08 (públicos a todos **ou** só a seguidores aceitos, conforme a privacidade). O conteúdo de estante/resenha vem de `leitura` e listas de `social`; **este endpoint entrega a identidade + contadores**, e os clientes compõem o resto chamando os serviços donos, que **revalidam** a privacidade. Perfil privado a não-seguidor → identidade pública + indicação de conteúdo restrito (não `403` do perfil inteiro).
- **`GET /perfis?username=<exato>`** (RF-SOC-03, SEC-19) — busca **por username exato apenas**. Sem correspondência → vazio. **Proibida** enumeração por prefixo, listagem ou sugestão (SEC-19/44). Pode receber rate limiting defensivo, sem atribuí-lo a RNF-SEC-18, que trata ações sociais e cadastro por ISBN.
- **Seguir/solicitar:**
  - **`POST /perfis/{username}/seguir`** — perfil **público**: cria seguimento **imediato** (RF-SOC-05) e publica `seguidor.novo`. Perfil **privado**: cria **solicitação** pendente (RF-SOC-06) e publica `solicitacao.criada`.
  - **`POST /solicitacoes/{id}/aceitar`** / **`/recusar`** (RF-SOC-06) — o destinatário decide; aceitar cria o seguimento e publica `solicitacao.aceita`; recusar descarta.
  - **`GET /solicitacoes?page=`** — inbox paginada das solicitações recebidas pelo usuário autenticado, necessária para aceitar/recusar; limite imposto pelo servidor.
  - **`DELETE /perfis/{username}/seguir`** (RF-SOC-07) — deixar de seguir, com confirmação no cliente.
  - **`DELETE /seguidores/{username}`** (RF-SOC-07) — remover um seguidor (ação destrutiva → confirmação no cliente, RNF-USA-04).
  - Rate limiting em seguir/solicitar (SEC-18).
- **`GET /me/seguidores?page=`** e **`GET /me/seguidos?page=`** (RF-SOC-08) — listas próprias **paginadas** (RNF-DES-02), acessíveis somente ao usuário autenticado. Não há listagem dos seguidores/seguidos de terceiros, evitando transformar o grafo em diretório de usuários (SEC-19/44).

**Regras de RN-08 (matriz de privacidade):**

| Recurso | Público | Privado |
|---|---|---|
| Encontrado por username exato | Sim | Sim |
| Nome, avatar, biografia | Todos | Todos |
| Estante, leituras, listas, estatísticas, resenhas, notas | Todos | Só seguidores aceitos |
| Seguir | Imediato | Requer solicitação aceita |

Mudar de **público para privado não remove** seguidores existentes.

**Eventos produzidos** (§5.2, consumidos por [F-NOT](feature-F-NOT.md) via broker): `seguidor.novo`, `solicitacao.criada`, `solicitacao.aceita`. Publicados **após** a escrita confirmada (arquitetura §5.1). Cada payload versionado contém `destinatarioId`, os ids dos participantes, `eventId`, `occurredAt`, `correlationId` e uma chave de negócio estável: seguimento ou solicitação. O critério desta feature termina na publicação conforme o contrato; a criação da notificação é critério de F-NOT.

**VIEWs expostas por `identidade`** (arquitetura §4.2), com nomes distintos das tabelas:
- `v_perfil_referencia_v1` — id, username, nome de exibição, avatar e privacidade; permite distinguir perfil público de privado e montar snapshots sem ler `usuario`.
- `v_seguimento_aceito_v1` — pares seguidor → seguido **somente com seguimento aceito**.

`acervo`, `leitura` e `social` combinam os dois contratos para aplicar RN-08: conteúdo é visível se o perfil for público, se o solicitante for o próprio dono ou se houver seguimento aceito. As VIEWs são versionadas e documentadas junto do spec OpenAPI.

**Modelo de dados** (schema `identidade`): `seguidor` (seguidor, seguido, criado_em) e `solicitacao_seguir` (solicitante, alvo, status, timestamps). `usuario` ganha o campo de **privacidade** (coordenar com [F-AUT](feature-F-AUT.md)).

### Frontend Web (`code/front`)

- **Tela de perfil** (próprio e de outro), **edição** de perfil (nome, bio, avatar, privacidade), **busca por username exato**, e listas próprias de **seguidores/seguidos** — usando só os tokens de [P0-DS](../periodo-0/feature-P0-DS.md).
- Upload de avatar direto ao Cloudinary (unsigned preset). Botões de seguir/solicitar/deixar de seguir com estado correto por privacidade; inbox paginada para aceitar/recusar; **confirmação** ao deixar de seguir e ao remover seguidor (RNF-USA-04).
- Conteúdo restrito de perfil privado exibido como restrito (não como erro).

### App Flutter (`code/mobile`)

- Mesmas telas, com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md); upload de avatar direto ao Cloudinary. Alvo de demonstração Android.

## Critérios de aceite

- [ ] Editar perfil altera nome/bio/avatar/privacidade; avatar passa por validação de tipo/tamanho/dimensões no servidor (SEC-20).
- [ ] Perfil privado só mostra estante/resenhas/notas/listas/estatísticas a **seguidor aceito**; a checagem é **server-side** em todos os endpoints, inclusive busca e listagem (RN-08, SEC-03).
- [ ] Busca encontra leitor **só por username exato**; prefixo/parcial não retorna nada e não há sugestão (SEC-19/44).
- [ ] Seguir perfil público é **imediato**; perfil privado gera **solicitação** que o destinatário aceita/recusa.
- [ ] Solicitações recebidas possuem inbox paginada e só o destinatário aceita/recusa.
- [ ] Deixar de seguir e remover seguidor funcionam e pedem confirmação (RNF-USA-04).
- [ ] Listas próprias de seguidores/seguidos são paginadas e owner-only; perfis de terceiros não expõem o grafo como diretório (RNF-DES-02, SEC-19/44).
- [ ] `seguidor.novo`, `solicitacao.criada` e `solicitacao.aceita` são publicados após a escrita com payload versionado e destinatário correto; a geração da notificação é aceita em [F-NOT](feature-F-NOT.md).
- [ ] `v_perfil_referencia_v1` expõe privacidade e identidade pública; `v_seguimento_aceito_v1` expõe apenas seguimentos aceitos, sem colisão com nomes de tabelas.
- [ ] Repetir uma escrita com a mesma `Idempotency-Key` não repete seguimento, solicitação ou decisão (RNF-ERR-04).
- [ ] Seed reproduzível cobre perfil público, privado, seguidor aceito, solicitação pendente e não-seguidor (RNF-TST-08).
- [ ] Mudar de público para privado **não** remove seguidores.
- [ ] Fluxo perfil→seguir/solicitar→aceitar→listas funciona **em DES**.

## Definition of Done

(plano §10)

- [ ] Código (backend `identidade`, web, mobile) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md))
- [ ] Testes unitários e de integração com banco real/container, **com prioridade obrigatória para RN-08 (RNF-TST-01 e RNF-TST-02)**: seguir público/privado, inbox paginada e exclusiva do destinatário, aceitar/recusar, deixar de seguir/remover, listas próprias, busca exata, idempotência e negativa de conteúdo privado por não-seguidor
- [ ] Teste de publisher cobre schema/publicação de `seguidor.novo`, `solicitacao.criada` e `solicitacao.aceita`, inclusive repetição sem segundo efeito (RNF-TST-03)
- [ ] Testes web/mobile cobrem estado dos botões, conteúdo restrito e indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [ ] **Spec OpenAPI de `identidade` atualizado em `docs/api/identidade.yaml`** com perfil/seguidores/solicitações e as VIEWs `v_perfil_referencia_v1`/`v_seguimento_aceito_v1` documentadas como contratos
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** publicar as duas VIEWs versionadas como contratos estáveis — delas dependem [F-FEED](feature-F-FEED.md), `acervo`, `leitura` e a recomendação futura.

## Pendências

- **Depende de** [F-AUT](feature-F-AUT.md)/[P0-NAV](../periodo-0/feature-P0-NAV.md) (sessão e modelo `usuario`), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md) e [P0-MSG](../periodo-0/feature-P0-MSG.md) (broker para os eventos; Cloudinary/P-09 para avatar).
- **Compartilha o serviço `identidade` com [F-AUT](feature-F-AUT.md)** — alinhar o campo de privacidade e contadores no `usuario` antes de mexer (plano §6).
- **Divergência de baseline em RF-SOC-02:** estante/resenhas vêm de `leitura` ([F-EST](feature-F-EST.md)/[F-AVA](feature-F-AVA.md)), mas listas pertencem a F-LST no Período 2. No Período 1, o perfil compõe identidade, contadores, estante e resenhas disponíveis; RF-SOC-02 não é marcado integralmente fechado até o grupo resolver a alocação das listas pelo controle de mudança.
- Definir o **preset Cloudinary de avatar** (pasta/tipos/tamanho) com [P0-MSG](../periodo-0/feature-P0-MSG.md).
- Stack do serviço `identidade` ainda pendente (Spring vs NestJS — P0-INFRA).

## Timeline

### Revisão 28/08/2026: VIEWs receberam nomes não conflitantes e contratos mínimos de privacidade/seguimento; eventos, idempotência, inbox e listas próprias owner-only foram fechados sem dependência circular com F-NOT e sem criar diretório de usuários. A divergência de listas em RF-SOC-02 foi registrada como pendência de baseline.

### Criação 27/08/2026: arquivo criado a partir do escopo de F-PERFIL no [periodo-1/README.md](README.md), de RF-SOC-01..08 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.9, da RN-08 e da arquitetura §3.1/§4.2/§5.2. Relação de seguimento fixada como contrato de saída de `identidade`; composição de RF-SOC-02 com `leitura`/`social` registrada como pendência de amadurecimento.
