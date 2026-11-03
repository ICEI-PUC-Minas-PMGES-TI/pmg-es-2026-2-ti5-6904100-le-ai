# F-MOD — Moderação

**Período:** 2 · **Prioridade:** desejavel
**Dono:** Renato Douglas · **Serviços afetados:** `social` (backend) + `leitura` (remoção de resenha/frase) + web + mobile

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.11 (RF-MOD-01, 02, 03, 05), RN-11, RN-15. Arquitetura: [`../../orquestador/documento-de-arquitetura.md`](../../orquestador/documento-de-arquitetura.md) §3.1, §4.2. Processo e template: [`../../orquestador/plano-de-projeto.md`](../../orquestador/plano-de-projeto.md) §9. Regras compartilhadas do projeto: [`../periodo-1/README.md#regras-de-implementação-compartilhadas`](../periodo-1/README.md#regras-de-implementação-compartilhadas). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Entregar a **moderação de conteúdo** — a denúncia pelos leitores e o painel do administrador. Fecha os requisitos **Desejáveis**:

- **RF-MOD-01** denunciar resenhas e comentários com **um campo obrigatório de motivo em texto livre**, sem enum nem descrição separada; livros pessoais seguem RN-15.4;
- **RF-MOD-02** o administrador visualiza um painel com as **denúncias pendentes**, ordenadas por data;
- **RF-MOD-03** o administrador **remove** o conteúdo denunciado ou **arquiva** a denúncia como improcedente;
- **RF-MOD-05** o sistema registra em **log de auditoria** toda ação de moderação (autor, alvo, ação, timestamp).

RNF atendidos: **RNF-SEC-04** (painel e operações restritos ao **administrador**, no servidor), **RNF-SEC-18** (rate limiting na denúncia), **RNF-SEC-35/37** (log de auditoria de ações de moderação, consultável), **RNF-SEC-36** (sem dado sensível excedente no log), **RNF-DES-02** (painel paginado), **RNF-USA-04** (confirmação na remoção).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | implementado | Migration `V20261018120000__moderacao_denuncia_e_auditoria` no `social`, revisada pelo Renato e aplicada no banco de dev em 18/10: contexto na denúncia e no log (`alvo_autor_id`, `alvo_livro_id`, `atividade_id`, `atividade_autor_id`, `remocao_solicitada_em`), limite de 500 no motivo, uma denúncia pendente por leitor e alvo e um log de remoção por alvo. `denuncia` e `log_moderacao` vêm do baseline. Segredo novo `MODERACAO_TOKEN` (no `leitura` e no `social`) e `LEITURA_BASE_URL` no `social` |
| Backend | implementado | `social`: `POST /denuncias`; painel em `/admin` (fila e registro por cursor, arquivar, remover comentário e resenha, remover frase), papel `admin` lido do token no `SecurityConfig`, primeiro cliente HTTP do serviço (`ClienteDeLeitura`). `leitura`: comando interno de remoção de resenha e frase com `X-Moderacao-Token`, papel no `VerificadorJwt` (o admin lista todas as frases) e o token fora do log |
| Web | implementado | Denúncia de resenha (página do livro e livro pessoal) e de comentário, painel com fila, detalhe e registro de auditoria, remoção de frase pelo admin, item `Moderação` na sidebar e linha em Configurações abaixo de 768px |
| Mobile | implementado | Denúncia de resenha (livro oficial e pessoal) e de comentário. O painel é só web |

## Especificação

### Backend / API — `social`

Herda de [P0-INFRA](../periodo-0/feature-P0-INFRA.md) corpo de erro padrão + correlation-id e mensagens pt-BR. Acesso a dados por ORM/consulta parametrizada (SEC-12). IDs não sequenciais (SEC-05). Escritas aceitam `Idempotency-Key` conforme as [regras compartilhadas](../periodo-1/README.md#regras-de-implementação-compartilhadas).

- **`POST /denuncias`** (RF-MOD-01) — alvo `resenha | comentario` (id), `motivo` textual obrigatório, não vazio, e contexto `via/referenciaId` para livro pessoal. Sem enum ou descrição separada. Servidor comprova acesso atual sob RN-08/RN-15; conhecer id não autoriza denúncia. Rate limiting, limite de texto no schema e escape na renderização (SEC-13/14/18).
- **Painel do administrador (RF-MOD-02)** — `GET /admin/denuncias?page=` lista as **pendentes ordenadas por data** (paginado — RNF-DES-02). **Restrito ao administrador, verificado no servidor** (SEC-04; a conta admin vem de [F-AUT](../periodo-1/feature-F-AUT.md), RF-AUT-08). O painel exibe o conteúdo denunciado: comentário local + resenha via `v_resenha_publicacao_v1`.
- **Ação de moderação (RF-MOD-03)** — `POST /admin/denuncias/{id}/remover` ou `/arquivar` (admin, SEC-04):
  - **arquivar** → marca a denúncia como improcedente;
  - **remover comentário** → `social` remove diretamente (e suas respostas, RN-10.5);
  - **remover resenha** → `social` chama comando HTTP interno autenticado e idempotente em `leitura`; após confirmação, a atividade associada é removida. Timeout mantém a denúncia pendente para retry, sem estado local falso.
- **Remoção direta de frase (RN-11):** `DELETE /admin/frases/{id}` é restrito ao admin e usa o mesmo contrato autorizado com `leitura`. Não exige denúncia prévia e sempre gera auditoria.
- **Auditoria (RF-MOD-05, SEC-35/37):** toda ação é gravada com autor, alvo, ação e timestamp, sem dado sensível excedente (SEC-36). **`GET /admin/moderacao/logs?page=`** permite consulta paginada, restrita ao admin.

**Escopo da denúncia:** apenas resenhas e comentários (RF-MOD-01). Listas, frases, perfis e livros não têm fluxo de denúncia; frases usam a remoção direta de RN-11.

**Modelo de dados** (schema `social`): `denuncia` (denunciante, alvo tipo+id, motivo textual, estado, timestamps) e `log_moderacao` (admin, alvo, ação, timestamp). Auditoria permanece sem prazo; na exclusão definitiva da conta, referências e texto identificáveis são removidos/anonimizados. `denuncia_id` é FK opcional com SET NULL ao remover a denúncia, preservando a linha anônima de auditoria (RN-23).

**Contratos consumidos para autorização:** `v_resenha_publicacao_v1`, `v_perfil_referencia_v1`/`v_seguimento_aceito_v1`, `v_atividade_livro_pessoal_v1` e `v_lista_livro_pessoal_v1`. Comentário é validado localmente contra a visibilidade da atividade.

### Frontend Web (`code/front`)

- **Denunciar** resenha/comentário com confirmação explícita; painel admin de denúncias/logs. Ao visualizar frases, a conta admin recebe remoção direta com confirmação; não se cria nova listagem administrativa. Guarda de rota não substitui verificação server-side.

### App Flutter (`code/mobile`)

- **Denunciar** resenha/comentário com `ThemeData` de [P0-DS](../periodo-0/feature-P0-DS.md). O **painel de moderação** é da web (admin) — o mobile não o expõe. Alvo de demonstração Android.

## Critérios de aceite

- [x] Denúncia usa somente motivo textual obrigatório; a auditoria anonimizada permanece após exclusão da conta, sem referência pessoal nem cópia do conteúdo removido.

- [x] Denunciar resenha/comentário exige acesso atual ao alvo; resenha de livro pessoal exige via válida de RN-15; rate limiting ativo (SEC-18).
- [x] Enviar denúncia exige confirmação explícita no cliente (RNF-USA-04).
- [x] O painel de pendentes por data é **restrito ao admin**, verificado no servidor (RF-MOD-02, SEC-04); paginado (RNF-DES-02).
- [x] Remover comentário o apaga (e as respostas, RN-10.5); **remover resenha** aciona a **remoção autorizada em `leitura`**; arquivar marca improcedente (RF-MOD-03); remoção pede confirmação (RNF-USA-04).
- [x] Resenha removida deixa de aparecer em atividade associada; frase pode ser removida diretamente pelo admin sem denúncia (RN-11).
- [x] Toda ação é registrada no log e consultável por `GET /admin/moderacao/logs`, somente pelo admin, sem dado sensível excedente (RF-MOD-05, SEC-35/36/37).
- [x] Não-admin recebe `403` no painel/ações; ocultar na interface não substitui a checagem (SEC-01/04).
- [ ] Denúncia e moderação funcionam **em DES**.

## Definition of Done

(plano §10)

- [x] Código (backend `social` + remoção em `leitura`, web, mobile de denúncia) mergeado em `desenvolvimento`: PR #55, aprovado pelo Vicenzo, mergeado em 22/10/2026 (`d561906`)
- [x] CI verde ([P0-CI](../periodo-0/feature-P0-CI.md)): checks do PR #55 verdes
- [x] Testes unitários e de integração com banco real/container: visibilidade do alvo, via RN-15 válida/forjada, autorização admin, remover comentário/resenha/frase, ocultação da atividade, arquivar, consultar auditoria e rate limiting (RNF-TST-02)
- [x] Teste da remoção cross-service de resenha/frase cobre comando autorizado, idempotência e falha sem estado local falso (RNF-TST-02; RNF-TST-03 se o contrato aprovado for assíncrono)
- [x] Testes web/mobile cobrem denúncia; web cobre painel/log admin; ambos tratam indisponibilidade/timeout com API simulada (RNF-TST-04/05/06)
- [x] **Specs OpenAPI**: `docs/api/social.yaml` com denúncia, painel e auditoria; `docs/api/leitura.yaml` com remoção administrativa de resenha/frase
- [ ] Fluxo funcionando em DES/HML ([P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md))
- [x] Arquivo da feature atualizado: status, pendências, timeline
- [x] Divergência protótipo × implementação registrada, se houver

**Item próprio:** fixar com `leitura` um contrato único de remoção de resenha/frase por moderação, incluindo revalidação, retorno idempotente e auditoria em `social`.

## Pendências

- **Decisões do dono (16/10/2026), a comunicar ao grupo; não esperam resposta:**
  1. O motivo tem até 500 caracteres, contados em code points, como a resenha. O mock do protótipo virou o limite.
  2. Repetir a denúncia pendente sobre o mesmo alvo devolve a existente, com 200, sem trocar o motivo.
  3. Remover um conteúdo fecha **todas** as denúncias pendentes dele, inclusive as das respostas de um comentário-raiz e as dos comentários da atividade de uma resenha, que saem pelo CASCADE. Arquivar fecha **só** a denúncia escolhida.
  4. Conteúdo que o autor excluiu depois da denúncia aparece indisponível no painel, só com `Arquivar denúncia`; remover responde 409 `CONTEUDO_JA_EXCLUIDO`.
  5. A lista de pendentes não traz total, como o protótipo.
  6. `social` → `leitura` por segredo compartilhado (`X-Moderacao-Token`), e não pelo token do admin: só o `social` consegue remover, então toda remoção passa pela auditoria.
  7. O log grava o `sub` do admin e não guarda motivo nem trecho do conteúdo (RNF-SEC-36); o painel mostra o autor como "Administrador".
  8. O administrador vê todas as frases de um livro, inclusive as de perfil privado que não segue: frase visível a seguidores não pode ficar fora da moderação (RN-11, RN-15.4).
  9. Abaixo de 768px, o admin chega ao painel por uma linha `Moderação` em Configurações.
- **Decisões técnicas da revisão do plano (16/10/2026):** chave de idempotência fixa por alvo no comando ao `leitura` (o reenvio depois de um timeout recebe o mesmo `removida: true`); timeout de leitura de 60 s e uma retentativa só em falha de conexão ou 503; o painel acorda o `leitura` ao abrir; a remoção de resenha chama o `leitura` fora da transação do recibo e, enquanto espera, a marca `remocao_solicitada_em` segura o arquivamento (409 `REMOCAO_EM_ANDAMENTO`); recibos de idempotência mínimos, sem motivo nem `autorId` no `social`.
- **Divergências registradas:**
  - **Paginação por cursor** no painel e no registro (`?cursor=`), no lugar do `?page=` da especificação: a fila encolhe a cada ação, e uma página numerada pularia denúncias.
  - **Linha `Moderação` em Configurações** abaixo de 768px, sem design (`painel-de-moderacao.md` deixou o caminho em aberto).
  - **Retentativa única** no `ClienteDeLeitura`: a arquitetura pede retentativa com backoff (RNF-ERR-08); com a partida a frio de até um minuto do Render, uma retentativa curta só em falha de conexão ou 503, e o reenvio do admin na mesma chave, cobrem o caso sem segurar a requisição por minutos.
  - **Colunas novas** em `denuncia` e `log_moderacao`, além do DER do baseline, para a anonimização de RN-23.7 alcançar o conteúdo já removido e para a aba de auditoria mostrar o alvo como o protótipo.
  - **"Ver no feed"** leva ao feed, não à atividade: a web não tem rota de atividade. O link só aparece quando o admin vê a atividade.
  - **Repetir a remoção de uma frase** que a moderação já removeu responde 204 de novo, sem outro log, por 24 horas; depois, ou se a autora a excluiu, 409.
  - **Componentes que nascem aqui** (card do conteúdo denunciado, denúncia em dois passos, bloco `Seu motivo`, destrutivo com ícone, estado indisponível, sheet sobre sheet, quinto item da sidebar, fila e detalhe, item da fila, etiqueta de tipo em outline, tabela de registro, estado de ação não confirmada) ficam para incorporar ao `documento-de-design.md`, sem edição de `docs/orquestador` aqui.
- **Débitos:**
  - **DES:** a F-MOD entra no DES no merge de fechamento do Período 2, e a migration do `social` roda no deploy. Resolvidos em 22/10/2026: `MODERACAO_TOKEN` (o mesmo valor) em `leai-leitura` e `leai-social` no painel do Render, `LEITURA_BASE_URL` no `leai-social` e `social.denuncia` vazia no `le-ai-oregon`. Continuam abertos "Denúncia e moderação funcionam em DES" e "Fluxo funcionando em DES/HML", que dependem do deploy no merge de fechamento para a `main`.
  - **Notificações `RESENHA_CURTIDA`** continuam depois que a moderação remove a resenha; a notificação abre a página do livro, sem a resenha.
  - **Login do admin no teste manual:** a conta `admin` de dev existe com credencial que o Renato não tinha em mãos; o teste do painel usou um token assinado localmente com `papel=admin`. Trocar `ADMIN_PASSWORD` no `.env` local redefine a senha da conta compartilhada.
- **Código de outras pessoas alterado** (registrado no `AGENTS.md` de cada serviço e cliente; avisar os donos no PR):
  - Henrique: `ConsumidorDeContaExcluida` do `social` (anonimiza e apaga também por `alvo_autor_id` e `atividade_autor_id`; o teste dele ganhou o caso e o segundo log do mesmo comentário virou arquivamento), consumidor de `conta.excluida` do `leitura` (recibos da moderação), `session.ts`, `ConfiguracoesView.vue` e `MenuDeAcoes.vue` (prop `discreto`).
  - Kayke: `ComentarioItem.vue` e `ModalComentarios.vue` (menu também no comentário de outra pessoa; o `escolher` passou a tratar cada ação pelo id), `comentario_item.dart` e `folha_comentarios.dart` (menu e o `ScaffoldMessenger` próprio da folha), `SecurityConfig` e `IntegracaoComPostgres` do `social`.
  - Vicenzo: `SidebarNavegacao.vue` (quinto item) e `router.dart` do app (o `social` chega ao livro aberto pelo Feed).
  - Dono do job de inatividade: o `X-Scheduler-Token` também saía no log do `leitura`; agora está no `redact`.
- **Telas (design P2):** entrada `Denunciar resenha` no menu `DotsThree` de cada resenha de terceiro da [`pagina-do-livro.md`](../../design/periodo-2/pagina-do-livro/pagina-do-livro.md) ([protótipo](../../design/periodo-2/pagina-do-livro/prototipos/pagina-do-livro.html)), prompt escrito em 28/09/2026, protótipo exportado em 29/09/2026. [`denunciar.md`](../../design/periodo-2/F-MOD/denunciar.md) ([protótipo](../../design/periodo-2/F-MOD/prototipos/denunciar.html)) (W+M, confirmação em segundo passo) e [`painel-de-moderacao.md`](../../design/periodo-2/F-MOD/painel-de-moderacao.md) ([protótipo](../../design/periodo-2/F-MOD/prototipos/painel-de-moderacao.html)) (só web, entrada pelo item `Moderação` da sidebar visível só ao admin, registro de auditoria como aba), prompts escritos e protótipos exportados em 29/09/2026. O item `Denunciar comentário` no `DotsThree` de cada comentário de outro leitor entra na edição consolidada [`comentarios.md`](../../design/periodo-2/comentarios/comentarios.md) ([protótipo](../../design/periodo-2/comentarios/prototipos/comentarios.html)) (lote 5, prompt escrito e protótipo exportado em 29/09/2026); falta artboard do dialog de denúncia sobre o dialog de comentários na web. Contratos a confirmar: limite do motivo (mock 500), total de pendentes, destino de outras denúncias do mesmo conteúdo removido, denúncia repetida, conteúdo excluído pelo autor e espera do rate limit. Lote 7, prompt escrito e protótipo exportado em 29/09/2026: `Denunciar` da resenha do dono ativo, no `DotsThree` da resenha, na edição [`livro-pessoal.md`](../../design/periodo-2/livro-pessoal/livro-pessoal.md) ([protótipo](../../design/periodo-2/livro-pessoal/prototipos/livro-pessoal.html)).
- **F-AVA-2 pronta (09/10/2026):** frases (`leitura.frase`, `GET`/`POST /livros/{id}/frases`, `DELETE /frases/{id}` só do autor) e reações estão implementadas no backend, na web e no app. O comando interno de remoção de resenha e frase pela moderação continua desta feature. O menu `DotsThree` das resenhas ainda não existe (as reações são botões) e entra aqui com `Denunciar`. O trecho do card da denúncia preserva o itálico (`denunciar.md`), então não usa `textoSemMarcacao`, que tira toda a marcação; use `arvoreDaResenha` de `code/front/src/markdown/resenha.ts` e `lib/features/avaliacao/markdown_resenha.dart`.
- **Depende de** [F-AUT](../periodo-1/feature-F-AUT.md) (admin), [F-PERFIL](../periodo-1/feature-F-PERFIL.md) (RN-08), [F-FEED](../periodo-1/feature-F-FEED.md) (comentários/via feed), [F-LST](feature-F-LST.md) (via lista), [F-AVA](../periodo-1/feature-F-AVA.md)/[F-AVA-2](feature-F-AVA-2.md) (resenhas/frases), [P0-INFRA](../periodo-0/feature-P0-INFRA.md), [P0-DS](../periodo-0/feature-P0-DS.md), [P0-DEPLOY](../periodo-0/feature-P0-DEPLOY.md), [P0-CI](../periodo-0/feature-P0-CI.md).
- **Decisão do grupo incorporada em 15/09/2026:** motivo em textbox único; permanece definir o limite de caracteres no schema de entrada. Auditoria anonimizada tem retenção indeterminada.
- **Alternativa avaliada e adotada:** comando HTTP interno autenticado/idempotente para remoção; não criar evento ou saga para um comando administrativo que precisa de resposta.
- **Fronteira:** **suspender conta** (RF-MOD-04) é Opcional → **F-MOD-OPC** (Período 3).
- **Compartilha `social`** com as demais features sociais — sinalizar no grupo (plano §6).
- Stack definida (arquitetura §2.1): `social` em Spring, `leitura` em NestJS.

## Timeline

### 22/10/2026: merge na `desenvolvimento`

- PR #55 aprovado pelo Vicenzo e mergeado às 22:16 (`d561906`), com os checks do PR verdes.
- Antes do merge, `12c8b0c` atualizou dompurify, markdown-it, vite e vitest no front, pelo `npm audit`.
- O `SeedIntegracaoTest.idempotente` do `identidade` falha só na CI (push de `da4e7fa`); passa localmente e é do dono do `identidade`.
- Débitos de DES resolvidos: `MODERACAO_TOKEN`, `LEITURA_BASE_URL` e a `social.denuncia` vazia no `le-ai-oregon`.

### 18 a 21/10/2026: implementação, testes e teste manual. Quatro commits na `renato-features`, mais o merge da `desenvolvimento` (F-EST-2), para o PR:

- `59b2136` **denunciar resenhas e comentários:** migration do `social`, `POST /denuncias` com o porte da regra de acesso de `reacoes` (RN-08, RN-15.4), rate limit, consumidor de conta excluída por `alvo_autor_id`; diálogo em dois passos na web e folha no app, menus na página do livro, no livro pessoal e nos comentários.
- `7bd5a48` **painel de moderação:** papel `admin` no `social`, painel e registro por cursor, arquivar e remover, `ClienteDeLeitura` com chave fixa por alvo e a marca de remoção não confirmada; comando interno do `leitura` com `X-Moderacao-Token` e o redact do log; painel na web com sidebar, Configurações e guarda de rota.
- `22f8d5e` **remoção de frases pela moderação:** comando interno de frase, `DELETE /admin/frases/{id}`, papel no `VerificadorJwt` do `leitura` para o admin ver todas as frases, e o modo admin de `Frases e trechos` na web.
- `196a9e2` **fix:** o aviso de denúncia enviada ficava atrás da folha de comentários no app; a folha ganhou `ScaffoldMessenger` próprio. Achado no teste manual.

Testes, todos passando depois do merge da `desenvolvimento`: `social` 230 no `verify`; `leitura` 290 unitários e 358 de integração; web 1013, com lint e `vue-tsc` limpos; app 844, com `flutter analyze` limpo. Teste manual com os quatro serviços locais sobre o banco e o broker de dev: pela API, denúncia de resenha (criada, repetida, própria, motivo vazio) e de comentário, 403 do leitor no painel, fila com conteúdo e contexto, remoção de comentário e de resenha (a resenha some do `leitura`, a atividade sai do feed, o reenvio na mesma chave repete e outra chave dá 409), remoção direta de frase e o registro; o token não aparece no log do `leitura`. Na web (Edge automatizado, 1440 e 390px, claro e escuro): menu da resenha, os dois passos, motivo em branco, aviso, sheet no celular, painel, registro, frases do admin com a frase de perfil privado e a linha em Configurações. No app (emulador Pixel 8): denúncia de comentário, empilhada sobre a folha, e de resenha na página do livro.

### Revisão 15/09/2026: motivo textual e retenção anônima sem prazo aprovados; DER e critérios atualizados. Implementação não iniciada.

### Revisão 01/09/2026: remoção cross-service fechada por HTTP interno autenticado/idempotente; mobile corrigido no escopo; limites de denúncia ficaram para o dono.

### Criação 28/08/2026: arquivo criado a partir do escopo de F-MOD no [periodo-2/README.md](README.md), de RF-MOD-01/02/03/05 do [`REQUISITOS.md`](../../orquestador/REQUISITOS.md) §5.11 e das RN-11/RN-15. Painel restrito ao admin e auditoria fixados; a remoção cross-service de resenha registrada como pendência de baseline; suspensão de conta adiada ao Período 3.

### Revisão 29/08/2026: denúncia passou a exigir visibilidade server-side do alvo; foram declarados consulta do log, remoção direta de frases e ocultação da atividade de resenha removida. Mobile de denúncia foi incluído no DoD sem antecipar suspensão de conta.

### Dono 29/09/2026: feature atribuída a **Renato Douglas** na [divisão do Período 2](README.md#divisão-do-período-2-entre-5-pessoas).
