# Prompt — F-MOD-OPC (Suspensão de conta)

> Escrito em 05/11/2026. Este arquivo é **autossuficiente**: o agente que o ler não terá a conversa que o gerou. Ele traz um prompt para cada etapa da feature. Para usar, diga ao agente: *"Leia `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/prompt-F-MOD-OPC.md` e execute a etapa N."* A etapa seguinte só começa quando a anterior registrou que terminou (ver "Andamento").

## Andamento

| Etapa | Situação | Saída |
|---|---|---|
| 1. Planejar | concluída em 05/11/2026, revisada em duas rodadas (15 + 9 achados) | [`plano-F-MOD-OPC.md`](plano-F-MOD-OPC.md) nesta pasta |
| 2. Realizar | concluída em 05/11/2026 | commits `feat(back)` e `feat(clientes)` na `renato-features` + [PR #61](https://github.com/ICEI-PUC-Minas-PMGES-TI/pmg-es-2026-2-ti5-6904100-le-ai/pull/61) |
| 3. Validar | validação e teste manual concluídos em 06/11/2026; débitos da feature fechados no mesmo dia; etapa 3b ampliada para a feature inteira (`7411f07..HEAD`) e revisada em 06/11/2026 por 5 agentes de contexto limpo: testes verdes em todas as camadas, nenhum achado alto, 4 médios e ~15 baixos, corrigidos no mesmo dia (commit `fix: correções da revisão da F-MOD-OPC`); **falta o OK do dono à migration `V20261106130000` do `identidade` antes de aplicá-la no dev**; DES só no fechamento de novembro | 4 validadores de contexto limpo, commit `fix` com as correções, teste manual em web e app; commit `fix: débitos da F-MOD-OPC` (`e566229`) e migration `0007` do `leitura` aplicada no dev |

Quem terminar uma etapa atualiza esta tabela (situação e data).

---

## Contexto comum a todas as etapas

**Quem é o dono:** Renato Douglas (git `RenatoDNS`). A feature é dele; `identidade` é do **Henrique Carvalho**, e `social` é compartilhado com o **Kayke** (feed, notificações, recomendações P2P) e o Henrique (listas).

**O que a feature entrega (RF-MOD-04):** o administrador suspende e reativa a conta de um leitor. Conta suspensa não autentica (login e renovação negados, refresh tokens revogados) e tem perfil e conteúdo ocultos aos demais leitores, **sem apagar nada**. Reativar restaura acesso e visibilidade sob RN-08. Toda ação vai para o log de auditoria de RF-MOD-05. O painel é **só web**; o mobile só trata a própria sessão suspensa (mensagem + logout, sem loop).

**Prazo:** congelamento de features em **17/11/2026**. Nada desta feature entra depois disso. Se a etapa 1 concluir que não cabe, ela propõe o corte (o que fica de fora e como registrar), em vez de esticar.

**Leitura obrigatória antes de qualquer etapa** (AGENTS.md §5.1):

1. `AGENTS.md` (raiz) e os locais: `code/back/identidade/AGENTS.md`, `code/back/social/AGENTS.md`, `code/front/AGENTS.md`, `code/mobile/AGENTS.md`.
2. `docs/orquestador/REQUISITOS.md`: §4 (ator Administrador), §5.11 (RF-MOD-04, RF-MOD-05), RN-08, RN-15, RN-23 (exclusão de conta, para a interação com exclusão pendente), RNF-SEC-01/04/30/35/36/37, RNF-ERR-04, RNF-USA-04/05, RNF-TST-02..06.
3. `docs/orquestador/documento-de-arquitetura.md` §3.1, §4.2 (nenhum serviço escreve no schema do outro; leitura entre schemas só por VIEW versionada), §7.
4. `docs/orquestador/documento-de-design.md` (tokens e componentes) — para web e mobile.
5. **O arquivo da feature:** `docs/plano-de-desenvolvimento/periodo-3/feature-F-MOD-OPC.md` (especificação, critérios de aceite, DoD e Pendências — inclusive a lista "a ratificar").
6. **A feature que esta estende:** `docs/plano-de-desenvolvimento/periodo-2/feature-F-MOD.md` e o plano dela, `docs/plano-de-desenvolvimento/periodo-2/renato-periodo-2/plano-F-MOD.md` (padrão do comando HTTP interno `social` → serviço dono, com `X-Moderacao-Token`, idempotência, timeout/retentativa, auditoria só após confirmação). **Reaproveitar esse padrão, não inventar outro** (item próprio do DoD).
7. Design P3: `docs/design/periodo-3/painel-de-moderacao/`, `docs/design/periodo-3/perfil-de-outro-leitor/` e `docs/design/periodo-3/login/` (prompt `.md` + `prototipos/*.html`). Protótipo é referência visual, não spec de pixel.
8. Features vizinhas que a suspensão toca: `periodo-1/feature-F-AUT.md` (admin fixo, refresh tokens, logout), `periodo-1/feature-F-PERFIL.md` (`v_perfil_referencia_v1`, RN-08), `periodo-2/feature-F-CONTA-2.md` (exclusão pendente), `periodo-2/feature-F-ACV-NOTA.md` (decisão: "a suspensão fica para a F-MOD-OPC" na média de nota dos leitores).

**Ferramentas:** o repositório tem índice CodeGraph (`.codegraph/`). Use `codegraph_explore` antes de grep/Read para achar e entender código.

**Regras que não se negociam:**

- Nenhum arquivo de `docs/orquestador/` é editado. Divergência vira pendência no arquivo da feature.
- Não editar `feature-*.md` de outro dono.
- Mudança em código de outro dono (`identidade`, partes do `social`, front/mobile alheios) é permitida, mas fica registrada com nota datada no `AGENTS.md` do serviço/cliente dele (o quê, por quê, onde, armadilhas), comentário no topo da migration, e listada no arquivo da feature e no PR.
- **Migration é revisada pelo Renato antes de ser aplicada** ao banco de dev (AGENTS.md §5.6). Nome com timestamp; cada serviço só recebe migration das próprias tabelas.
- Testes de integração em Postgres descartável (Docker/CI), **nunca no Neon**. O `.env` local nunca aponta para o DES.
- Commits: Conventional Commits, **só o assunto, em pt-BR acentuado, sem corpo**, **sem `Co-Authored-By` e sem rodapé de ferramenta**. PR também sem linha de atribuição.
- Branch de trabalho: `renato-features`. `git fetch` e `git pull --rebase` antes de começar; integrar a `origin/desenvolvimento` antes do PR. Não trocar de branch na pasta principal se houver outro agente trabalhando em outra worktree.
- Relatórios ao Renato: curtos e diretos, o essencial primeiro.

---

## Etapa 1 — Planejar

> **Prompt:** Você vai produzir o plano de implementação da F-MOD-OPC. Não escreva código nem migration nesta etapa. A saída é `docs/plano-de-desenvolvimento/periodo-3/renato-periodo-3/plano-F-MOD-OPC.md`, autossuficiente, no formato de `../../periodo-2/renato-periodo-2/plano-F-MOD.md` (Contexto · Decisões do dono · Dependências de outras pessoas · Pré-requisitos · Etapas por camada com os commits previstos · Contratos · Verificação · Riscos). Faça a leitura obrigatória do "Contexto comum" e siga os passos abaixo.

### 1.1 Levantar o que já existe (com caminho e linha)

Confira no código da `origin/desenvolvimento`, e registre no Contexto do plano:

- **`identidade`:** tabela `usuario` (já tem campo de suspensão? o DER o prevê para o P3), fluxo de login, emissão e renovação de token, armazenamento e revogação de refresh tokens, recuperação de senha (a suspensão não pode ser contornada por ela), como o papel `admin` chega no JWT, e se já existe algum endpoint `/interno/*` e como ele se autentica.
- **VIEWs que `identidade` expõe** (`v_perfil_referencia_v1`, `v_seguimento_aceito_v1` e as demais): quem as consome em cada um dos quatro serviços. A spec diz que as VIEWs públicas **omitem** contas suspensas; levante o efeito disso em cada consumidor (JOIN interno some com a linha; LEFT JOIN pode mostrar "autor nulo"; snapshot copiado em tabela local **não** é filtrado pela VIEW).
- **Inventário de ocultação** — a parte mais arriscada. Liste todo lugar onde perfil ou conteúdo de um leitor aparece para outro: perfil, busca de leitores, seguidores/seguindo, feed e atividades, comentários, resenhas na página do livro (o `acervo` lê resenhas do `leitura`), frases, listas, recomendações P2P, notificações, snapshots (`snap_*` no `social`), nota dos leitores e distribuição (F-ACV-NOTA), estatísticas públicas, desafios. Para cada um: como a suspensão o oculta (filtro na VIEW, filtro na consulta, nada a fazer) e de quem é o código.
- **`social`:** painel `/admin` da F-MOD (controllers, `SecurityConfig` com o papel `admin`, `ClienteDeLeitura` como modelo de cliente HTTP interno), `log_moderacao` (colunas atuais; a coluna de **motivo** não existe e a migration desta feature a acrescenta), `GET /admin/moderacao/logs`, payload da denúncia (para a marca de "autor suspenso").
- **Web:** painel de moderação, perfil de outro leitor, tela de login e o tratamento de 401/refresh no `session.ts`.
- **Mobile:** interceptador de refresh, logout e a tela de login.
- **Admin no teste manual:** a conta `admin` de dev tem credencial que o Renato pode não ter; na F-MOD o teste usou um token assinado localmente com `papel=admin`. Planeje como testar.

### 1.2 Fechar as decisões em aberto com o dono

Levante as decisões que a feature deixa "a ratificar" ou "a confirmar" (seção Pendências do arquivo da feature) e as que surgirem do levantamento. Pergunte ao Renato **em lotes curtos** (pergunta com opções e a recomendada primeiro), sem perguntar o que dá para decidir pelo código ou por um padrão já adotado na F-MOD. As conhecidas em 05/11/2026:

1. Motivo obrigatório também na **reativação**? (design sugere sim, até 500 code points como a denúncia.)
2. Suspender **não resolve** as denúncias pendentes do autor? (design: não resolve.)
3. No login, **suspensão prevalece** sobre exclusão pendente (F-CONTA-2)?
4. Logout forçado na **web** sem artboard: como aparece?
5. Marca de **autor suspenso** no payload da denúncia (fila e detalhe do painel).
6. Admin no **app** vê `Perfil não encontrado` para conta suspensa (o painel é só web)?
7. **Motivo no registro de auditoria** (decidido pelo Henrique em 11/10, a ratificar pelo dono): só o motivo do admin na suspensão/reativação; motivo de denúncia e conteúdo removido continuam fora (RNF-SEC-36).
8. Contratos: `GET /interno/usuarios/{id}/moderacao` (com data, hora e motivo) e data/hora na resposta de suspender.
9. Autenticação `social` → `identidade`: o mesmo segredo compartilhado da F-MOD (`X-Moderacao-Token`, agora também no `identidade`) ou outro? Lembrar que o comando precisa **revalidar** a autorização.
10. Notas de conta suspensa entram na **média dos leitores** e na distribuição (F-ACV-NOTA)?
11. Mensagem ao leitor suspenso: texto exato, sem permitir enumerar contas (só depois de credenciais corretas, como o design).

Registre as respostas na seção "Decisões do dono (data)" do plano.

### 1.3 Escrever o plano

- Ordem das camadas: **`identidade`** (migration, comandos internos, bloqueio de login/refresh/recuperação, revogação, VIEWs filtrando) → **`social`** (endpoints `/admin/usuarios/{id}/suspender|reativar`, cliente HTTP para o `identidade`, migration do motivo em `log_moderacao`, auditoria idempotente, ocultação no que é do `social`) → **demais serviços** que o inventário apontar → **web** → **mobile** → specs OpenAPI (`docs/api/identidade.yaml`, `docs/api/social.yaml`).
- Para cada camada: arquivos a criar/alterar, testes (unidade e integração em container), e o commit previsto (assunto pt-BR).
- Seção de **Dependências de outras pessoas**: cada arquivo alheio que muda, o dono e o aviso no `AGENTS.md` dele.
- **Ponto de parada:** a revisão das migrations pelo Renato.
- **Verificação:** comandos por camada antes de cada commit e o roteiro do teste manual (admin suspende → leitor perde o acesso no app e na web → conteúdo some para um terceiro → reativa → volta; idempotência; 403 para não-admin; `identidade` parado durante a suspensão não gera auditoria falsa).
- **Riscos** e o **plano de corte** caso não caiba até 17/11 (por exemplo: entregar backend + web e deixar a ocultação em algum consumidor menor como débito registrado).
- Estimativa em dias, contra o prazo de 17/11.

### 1.4 Revisar com contexto limpo e fechar

- Lance um agente novo (sem esta conversa) para revisar o plano contra o código e as fontes: só lê, aponta achados com caminho/linha e um veredito. Corrija o plano com os achados confirmados e anote no topo: "Plano de DD/MM, revisado com N achados".
- Atualize a tabela "Andamento" deste arquivo e o item 1 do `README.md` desta pasta.
- Não altere o `feature-F-MOD-OPC.md` nesta etapa (sessão de planejamento), salvo se o Renato pedir para registrar as decisões lá.
- Relatório final ao Renato: as decisões fechadas, a estimativa, o que precisa de aval dele e o link do plano.

---

## Etapa 2 — Realizar

> **Prompt:** Implemente a F-MOD-OPC seguindo `plano-F-MOD-OPC.md` desta pasta, que prevalece sobre este prompt nos detalhes. Faça a leitura obrigatória do "Contexto comum".

- Comece com `git fetch`, `renato-features` atualizada com a `origin/desenvolvimento`.
- Siga a ordem e os commits do plano. Antes de cada commit, rode a verificação da camada (testes unitários e de integração em container, lint, build, `flutter analyze`/`flutter test`, vitest).
- **Pare só na revisão das migrations:** mostre ao Renato o SQL das migrations de `identidade` e `social` e espere o OK antes de aplicar no banco de dev. Todo o resto segue sem pedir aprovação.
- Registre cada mudança em código alheio no `AGENTS.md` do dono, no mesmo commit.
- Ao terminar: atualize o `feature-F-MOD-OPC.md` (Status por camada, critérios e DoD marcados só com evidência, Pendências com decisões/divergências/débitos/código alheio, Timeline datada), atualize os specs OpenAPI, a tabela "Andamento" e o `README.md` desta pasta.
- Passe direto para a etapa 3 (validação) antes do push.

## Etapa 3 — Validar

> **Nota (decisão 9 do plano, 05/11/2026):** a validação roda **em paralelo à revisão do PR**, e não antes do push como o passo 4 abaixo descreve: o PR abre logo depois dos commits de entrega, com os testes automáticos verdes, e as correções dos validadores e da revisão do colega entram no mesmo PR, num commit `fix`.

> **Prompt:** Valide a F-MOD-OPC implementada na `renato-features` sem pedir aprovação ao Renato no meio; o que precisar do aval dele fica para o relatório final.

1. **Validação independente:** um agente de contexto limpo por camada (`identidade`, `social`, web, mobile), com prompt autossuficiente: fontes da verdade (requisito, arquivo da feature, plano), o que conferir (critérios de aceite e DoD da feature, ocultação do inventário, idempotência, autorização revalidada, RNF-SEC-36 no log), os comandos de teste. Eles **só leem e testam**: proibido editar, commitar ou trocar de branch. Relatam só achados confirmados, com caminho/linha e como reproduzir.
2. **Corrigir** os achados confirmados, com teste que cobre cada um, e rodar a verificação de novo.
3. **Teste manual** com os serviços locais (sem a extensão do Chrome):
   - web: Edge headless via `playwright-core` (numa pasta do scratchpad, `chromium.launch({ channel: 'msedge' })`), prints em 1440 e 390 px, claro e escuro;
   - mobile: emulador `Pixel_8_API_35` com `flutter run`, interação por `adb` + `uiautomator dump`;
   - contas: criar leitores próprios por `/auth/register` com e-mail `.invalid` (as contas seed não funcionam no dev); admin conforme o plano.
   - roteiro: o da seção Verificação do plano.
4. **Push e PR** para a `desenvolvimento` (`gh pr create --base desenvolvimento --head renato-features`), corpo no formato dos PRs anteriores do Renato (resumo, Backend, Web, Mobile, Decisões, avisos aos donos alheios, Testes, DES), destacando as migrations e os segredos novos do Render. Sem linha de atribuição.
5. **DES:** depois do merge na `main`, conferir o fluxo no DES (segredos no Render, migrations aplicadas no `le-ai-oregon`) e marcar os itens de DES da feature só com o fluxo testado lá.
6. Relatório final ao Renato: o que foi validado, os achados e correções, o que ficou como débito e o que depende dele.

---

## Etapa 3b — Revisar a correção dos débitos

> **Prompt:** Revise com contexto limpo o commit `e566229` (`fix: débitos da F-MOD-OPC`) da `renato-features`, que fechou os débitos listados em "Pendências" do `feature-F-MOD-OPC.md`. Faça a leitura obrigatória do "Contexto comum" e leia o plano. Não peça aprovação no meio.

- **O que o commit fez:** perfil web do admin (`PerfilDeOutroView.vue`, `ContaSuspensaDoAdmin.vue`, `GET /admin/usuarios?username=` no `social`); contagens sem a conta suspensa (curtidas de atividade no `social`, reações de resenha no `leitura` com a migration `0007` e a VIEW `v_resenha_publicacao_v1`, seguidores e seguidos no `identidade` por `v_seguimento_aceito_v1`); menção a conta oculta virando "um leitor" (`ServicoDeInteracao.textoVisivel`); reativação apagando as renovações revogadas (`ServicoDeSuspensao.reativar`); aviso de leitura descartada no app (`session_controller.dart`, `sessao_controller.dart`, `login_page.dart`); `MenuDeAcoes`/`FolhaAcoes` com `tom` e `larguraMinima`. Veja `git show e566229 --stat`.
- **O que conferir:** que cada débito está de fato fechado e volta ao normal na reativação; que nada do que já funcionava quebrou para quem não é admin nem suspenso (contagens, menções com posições certas, perfil do leitor comum, menu de quem não passa `tom`); desempenho das contagens novas (subconsultas por linha); a VIEW `0007` com as mesmas colunas; autorização do endpoint novo (só admin); as notas nos `AGENTS.md` dos donos e os specs OpenAPI.
- **Regras:** só ler e testar, sem editar, commitar nem trocar de branch. Testes de integração em Postgres descartável (Docker), **nunca o Neon**. Comandos por camada: `identidade`/`social` `./mvnw verify` com `DATABASE_URL_TESTE`; `leitura` `npm test` e `npm run test:integration`; web `npm run lint`, `npm run build`, `npm test`; mobile `flutter analyze`, `flutter test`. No Windows, o `npm run lint` do `leitura` acusa `␍` (checkout com CRLF) em todos os arquivos: isso não é achado.
- **Saída:** só achados confirmados, com caminho/linha, como reproduzir e gravidade. Atualize a tabela "Andamento" (linha da etapa 3) ao terminar e entregue o relatório curto ao Renato.
