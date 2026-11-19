# Plano — E6-04: Telas reais no `7.solucao.md`

> **Plano de 19/11/2026, ainda não revisado.** Prompt: [`prompt-E6-04-capturas-de-tela.md`](prompt-E6-04-capturas-de-tela.md). Regras: [`prompt-E6-contexto-comum.md`](prompt-E6-contexto-comum.md). Este plano prevalece sobre o prompt nos detalhes.

> **Contas alinhadas com a E6-03 (19/11/2026), prevalece sobre o resto deste plano:** as contas de demonstração são as três do [`plano-E6-03-atam-em-des.md`](plano-E6-03-atam-em-des.md): `leai.demo.marina` (perfil privado), `leai.demo.caio` (público, com livro pessoal e lista) e `leai.demo.bia` (pública). Onde este plano diz `clara.demo` (leitora principal pública), use o Caio; `bruno.demo` (segundo leitor), a Bia; `davi.demo` (perfil privado), a Marina. Senhas no mesmo arquivo da E6-03, fora do repositório. Quem criar primeiro (E6-03 ou E6-04) cria as três.

## Resumo

- **93 figuras**: 38 do Período 1, 41 do Período 2 (2 delas no tema escuro) e 14 do Período 3.
- **De onde sai cada uma:**
  - **Períodos 1 e 2: do DES agora**, que roda a v0.2.1. Web em `https://leai-web.onrender.com`; app pelo APK `le-ai-v0.2.1-android.apk` no emulador.
  - **Período 3: local agora, contra o banco de dev.** Branch `renato-e6-04` (código da `desenvolvimento`), serviços e web locais, app por `flutter run`. Depois do merge da `main` no DES, as telas são refeitas lá só se der tempo (etapa 4, opcional).
- **Recomendação:** fechar tudo até 27/11 sem esperar o grupo. O DES só recebe o Período 3 com o merge da `main` no fechamento de novembro, que não tem data e pode cair depois do prazo.
- **Estimativa:** ≈ 26,5 h (≈ 29,5 h com a etapa 4 opcional), das quais ≈ 23,5 h na etapa 2 (ver [Estimativa](#estimativa)).

## Decisões já fechadas pelo Renato (19/11/2026)

1. **DES em uso normal e leve.** Liberado criar 2 ou 3 contas de demonstração `.invalid` pelo `/auth/register` e usar o app normalmente para gerar os dados das capturas. Proibido no DES: carga pesada, apagar dados e mudar configuração (Render, Neon `le-ai-oregon`, CloudAMQP `Le-ai-oregon`).
2. **As contas são as mesmas da E6-03 (ATAM).** Não criar um conjunto próprio. O plano da E6-03 (`plano-E6-03-atam-em-des.md`) ainda não existia quando este foi escrito, então os nomes abaixo são proposta: **alinhar com a E6-03**. Se o plano da E6-03 já tiver os nomes quando a etapa 2 começar, valem os dele, e esta seção é corrigida no mesmo commit do Andamento. A senha nunca vai para o repositório.
3. **O DES roda a v0.2.1 até o merge da `main`.** O plano separa o que sai do DES agora, o que sai do ambiente local e o que precisa esperar o merge.
4. **Sem PR.** O Renato autorizou o merge direto das tarefas E6 na `desenvolvimento`. A etapa final é commit, push da `renato-e6-04` e merge direto pelo orquestrador.

## Pendências para o Renato

Até que o Renato diga outra coisa, a etapa 2 segue as recomendadas, como na E6-02.

1. **De onde saem as telas do Período 3**
   - **(a) Recomendada:** local agora, contra o banco de dev, com o código da `desenvolvimento` congelado em 24/11. Fecha antes de 01/12 sem depender do grupo. A legenda e o status declaram a origem: "ambiente local, banco de dev, `desenvolvimento` em `<commit>`".
   - (b) Esperar o merge da `main` e capturar no DES. Mais uniforme, mas o prazo fica na mão do grupo.
   - (c) Fazer (a) e refazer no DES se o merge sair até 28/11. É a etapa 4 opcional: custa ≈ 3 h e só troca a origem declarada.
2. **Admin para o painel de moderação**, que só existe na web
   - **(a) Recomendada:** capturar o painel do Período 2 (F-MOD) e o do Período 3 (F-MOD-OPC) **localmente, contra o dev**. A sessão de admin sai de um token assinado com o `JWT_SECRET` do `.env` local, com `papel=admin` e o `sub` da conta `admin` do dev, como no teste manual da F-MOD-OPC (`plano-F-MOD-OPC.md`, "Admin no teste manual"). Não precisa de nenhuma credencial do DES nem de ação de admin no DES. Não se mexe em `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
   - (b) Ler `ADMIN_EMAIL`/`ADMIN_PASSWORD` do `leai-identidade` pelo MCP do Render, só em memória, e capturar o painel no DES.
   - (c) O Renato faz login como admin no DES e o agente só captura.
3. **Tema escuro**
   - **(a) Recomendada:** só 2 telas de exemplo, a estante na web e a página do livro no app.
   - (b) Nenhuma.
   - (c) Escuro em todas, o que dobra o número de figuras.
4. **Links para os protótipos no `7.solucao.md`**
   - **(a) Recomendada:** ficam numa coluna "Protótipo" da tabela-resumo de cada período.
   - (b) Saem.
5. **Onde guardar a senha das contas de demonstração** (alinhar com a E6-03)
   - **(a) Recomendada:** num arquivo fora do repositório, `%USERPROFILE%\.leai\contas-demo.txt`, criado por quem criar as contas primeiro (E6-03 ou E6-04). O relatório final diz onde ele está, e o Renato copia para o gerenciador de senhas dele.
   - (b) O Renato escolhe a senha e a passa na sessão.
6. **A denúncia de demonstração no DES depois da captura.** Hoje ela só é criada se a pendência 2 ficar com (b) ou (c).
   - **(a) Recomendada:** o admin a arquiva. Arquivar não apaga nada, e o painel do grupo fica limpo.
   - (b) Fica pendente.

## Origem de cada grupo de telas

| Grupo | Onde | Quando | Depende de |
|---|---|---|---|
| Períodos 1 e 2, web | DES (`leai-web.onrender.com`, v0.2.1), Edge headless com `playwright-core` | etapa 2, de 20 a 23/11 | só das contas de demonstração no DES (já liberadas) |
| Períodos 1 e 2, app | DES, APK `le-ai-v0.2.1-android.apk` (`gh release download v0.2.1 -p '*.apk'`) no `Pixel_8_API_35` | etapa 2, de 20 a 23/11 | idem |
| Painel de moderação (F-MOD, Período 2) | **local, contra o dev** (pendência 2a) | junto com o Período 3 | token de admin local |
| Período 3, web e app | **local, contra o dev** (pendência 1a): worktree `renato-e6-04` sobre a `origin/desenvolvimento`, os quatro serviços e o Vite locais e `flutter run -d emulator-5554` com as `--dart-define` de `code/mobile/AGENTS.md` (`10.0.2.2`) | 24 e 25/11, depois do congelamento de código | contas espelho no dev |
| Período 3 no DES | DES depois do merge da `main` | só se o merge sair até 28/11 (etapa 4, opcional) | grupo |

O que **não** dá para capturar em lugar nenhum:

- **F-GAM-OPC** (calendário e lembrete) e **F-REC-ALG** (recomendação algorítmica) não foram iniciadas e ficaram fora do congelamento de 17/11. Ficam numa nota sem figura, como a F-ACV-INGESTAO no §7.1.
- **F-NOT-2** não tem tela nova. O item novo chega sem recarregar, e um print não mostra isso. Fica na tabela com o motivo.
- O **push da F-NOT-OPC** precisa do `google-services.json`, que está no `.gitignore`. Sem ele, o app roda sem push. Só a tela de preferências é capturada; a notificação na bandeja do Android não.

## Inventário de telas

Legenda: **W** é a rota da web e **M** é o caminho no app, a partir da barra inferior (Estante, Descobrir, Feed, Perfil). A coluna "Estado" diz o que precisa aparecer. As contas são as da seção [Roteiro de dados](#roteiro-de-dados).

### Período 1 (38 figuras, DES)

| Feature | Tela | W | M | Estado | Cortes |
|---|---|---|---|---|---|
| F-AUT | Login | `/login` | tela inicial sem sessão | campos vazios | — |
| F-AUT | Cadastro | `/cadastro` | Login › Criar conta | preenchido com dados fictícios, **sem enviar** | — |
| F-AUT | Configurações | `/perfil/configuracoes` | Perfil › Configurações | conta da Clara | recuperar e redefinir senha (precisam do e-mail), alterar senha e política de privacidade (formulário ou texto simples) |
| F-PERFIL | Meu perfil | `/perfil` | aba Perfil | Clara com bio, contadores e atividade | — |
| F-PERFIL | Perfil de outro leitor | `/leitores/bruno.demo` | Perfil › Buscar › Bruno | Bruno público, com o botão Seguindo | editar perfil (formulário) |
| F-PERFIL | Buscar leitor | `/perfil/buscar` | Perfil › Buscar leitor | termo "demo", **só contas de demonstração** no resultado | — |
| F-PERFIL | Seguidores e seguidos | `/perfil/conexoes` | Perfil › Seguidores | Clara com Bruno e Davi | — |
| F-PERFIL | Solicitações de seguir | `/perfil/solicitacoes` | Perfil › Solicitações | conta do **Davi** (privado), com o pedido da Clara | — |
| F-ACV-BUSCA | Descobrir com busca | `/descobrir?q=<termo>` | aba Descobrir › busca | resultados com capa | filtro por assunto (vai na F-ACV-DESCOBERTA) |
| F-ACV-BUSCA | Página do livro | `/livros/<id>` | resultado › livro | livro A com sinopse, nota e resenhas das contas de demonstração | — |
| F-ACV-CADASTRO | Cadastro por ISBN | `/estante/adicionar` | Estante › Adicionar | ISBN digitado com prévia | ISBN não encontrado (estado de erro) |
| F-ACV-CADASTRO | Cadastro de livro pessoal | `/estante/adicionar/pessoal` | — (só W) | formulário preenchido | M (mesmo formulário) |
| F-ACV-CADASTRO | Página do livro pessoal | `/livros/pessoal/<id>` | Estante › livro pessoal | livro P da Clara | — |
| F-EST | Estante por status | `/estante` | aba Estante | Clara com livros em Lendo, Quero ler, Lido e Abandonado | — |
| F-EST | Ações de leitura | menu de ações na página do livro | folha de ações do livro | livro em Lendo, menu aberto | cada ação isolada |
| F-PRG | Progresso | `/estante/leituras/<id>/progresso` | livro em Lendo › Progresso | 3 ou mais atualizações registradas | diálogo de registrar (aparece no fluxo) |
| F-AVA | Avaliar e escrever resenha | `/livros/<id>/resenha` | livro › Escrever resenha | nota de 4 estrelas e texto | — |
| F-FEED | Feed | `/feed` | aba Feed | Clara vendo a atividade de Bruno e Davi | — |
| F-FEED | Comentários e respostas | item do feed com a thread aberta | item › comentários | comentário do Bruno e resposta da Clara | — |
| F-NOT | Notificações | — (fora do escopo web) | sino do cabeçalho | Clara com seguidor novo, comentário, curtida e recomendação | — |

Contagem: 18 telas com W e M (36 figuras), 1 só na web (cadastro de livro pessoal) e 1 só no app (notificações): 38 figuras.

### Período 2 (41 figuras: 39 do DES e 2 locais)

| Feature | Tela | W | M | Estado | Cortes |
|---|---|---|---|---|---|
| F-CONTA-2 | Excluir conta | `/perfil/configuracoes/excluir-conta` | Configurações › Excluir conta | formulário **sem confirmar** | exclusão solicitada e recuperar conta: exigiriam pedir a exclusão de uma conta de demonstração. Sem figura, com o motivo |
| F-SOCIAL-2 | Comentário próprio e menção | thread com o menu do próprio comentário aberto e uma `@menção` como link | idem | comentário da Clara mencionando `@bruno.demo` | editar em linha |
| F-ACV-DESCOBERTA | Filtros avançados | `/descobrir` com o painel de filtros | Descobrir › Filtros | 2 filtros aplicados | — |
| F-ACV-DESCOBERTA | Página de autor | `/descobrir/autores/<id>` | página do livro › autor | autor do livro A | editora e série (mesmo layout) |
| F-ACV-NOTA | Nota geral e nota dos leitores | `/livros/<id>`, rolada até o bloco de notas | idem | livro A com as notas das 3 contas | — |
| F-EST-2 | Favoritos e busca na estante | `/estante` com o filtro Favoritos e um termo | idem | 2 favoritos | — |
| F-EST-2 | Histórico de leituras | `/estante/historico` | Estante › Histórico | releitura e livro abandonado | — |
| F-SESSAO | Modo de foco | — | livro em Lendo › Iniciar sessão | cronômetro rodando | — |
| F-SESSAO | Encerrar sessão | — | Modo de foco › Encerrar | página final preenchida | sessão pendente (só aparece depois de matar o app) |
| F-AVA-2 | Resenha em Markdown com pré-visualização | `/livros/<id>/resenha`, aba de pré-visualização | idem | negrito, itálico e lista | — |
| F-AVA-2 | Frases do livro | `/livros/<id>/frases` | livro › Frases | 2 ou 3 frases de contas diferentes | curtidas: aparecem nas resenhas da página do livro (F-ACV-BUSCA) |
| F-DSF | Desafios | — (fora do escopo web) | Perfil › Desafios | 1 desafio de livros e 1 de páginas, com progresso | — |
| F-DSF | Criar desafio | — | Desafios › Novo | formulário preenchido | editar (mesmo formulário) |
| F-STA | Estatísticas | `/perfil/estatisticas` | Perfil › Estatísticas | Clara com livros lidos e páginas | bloco no perfil (aparece no Meu perfil) |
| F-GAM | Sequência diária | — (fora do escopo web) | Perfil, rolado até o bloco | sequência ativa (ver o roteiro, dia 1 a 4) | — |
| F-LST | Listas do leitor | `/perfil/listas` | Perfil › Listas | 2 listas | — |
| F-LST | Lista | `/perfil/listas/<id>` | lista › abrir | 4 livros com capa | criar e editar (formulário) |
| F-LST | Adicionar à lista | diálogo na página do livro | folha na página do livro | as 2 listas, uma marcada | — |
| F-REC-P2P | Recomendar a um leitor | diálogo na página do livro | livro › Recomendar | Bruno escolhido e mensagem curta | — |
| F-REC-P2P | Recomendações recebidas | `/descobrir/recomendacoes` | Descobrir › Recomendações | Clara com 2 recebidas | — |
| F-MOD | Denunciar resenha ou comentário | diálogo de denúncia (W) | folha de denúncia (M) | aberto sobre um comentário do Bruno, **sem enviar** | — |
| F-MOD | Painel de moderação | `/moderacao` (fila e detalhe) | — (só web) | **local, contra o dev** (pendência 2a), só com denúncias entre contas de demonstração | — |
| F-MOD | Registro de auditoria | aba Registro do painel | — | **local, contra o dev**, com 1 arquivamento | — |
| F-NOT-2 | — | — | — | sem figura: não há tela nova (ver acima) | — |
| Tema escuro | Estante (W) e página do livro (M) | `/estante` | livro A | mesmo estado das figuras claras | — |

Contagem: 16 telas com W e M (32 figuras), 5 só no app (sessão 2, desafios 2, sequência 1), 2 só na web (painel e registro, locais) e 2 no tema escuro: 41 figuras. Se a contagem real da etapa 2 der diferente, vale a dela, registrada no relatório.

### Período 3 (14 figuras, local contra o dev)

Estão na `desenvolvimento`: F-MOD-OPC (#61), F-ACV-OPC (#62), F-STA-OPC (#63), F-DSF-OPC (#64) e F-NOT-OPC (#65).

| Feature | Tela | W | M | Estado |
|---|---|---|---|---|
| F-MOD-OPC | Suspender conta | `/leitores/davi.demo` como admin, diálogo `Suspender conta` com motivo | — | motivo fictício |
| F-MOD-OPC | Conta suspensa vista pelo admin | `/leitores/davi.demo` com `Reativar conta` | — | Davi suspenso |
| F-MOD-OPC | Painel e registro com a suspensão | `/moderacao`, aba Registro | — | linha de suspensão com o motivo |
| F-MOD-OPC | Login de conta suspensa | `/login` com o banner `Conta suspensa` | idem no app | Davi suspenso, credenciais corretas. **Reativar logo depois** |
| F-ACV-OPC | Assuntos no livro pessoal | formulário do livro pessoal com o seletor de assuntos | idem | 3 assuntos escolhidos |
| F-ACV-OPC | Assuntos na página do livro pessoal | `/livros/pessoal/<id>` | idem | chips de assunto |
| F-STA-OPC | Distribuição das notas dadas | `/perfil/estatisticas`, card `Notas que você deu` | Perfil › Estatísticas | Clara com 5 notas ou mais |
| F-STA-OPC | Histograma no perfil de outro leitor | `/leitores/clara.demo` como Bruno | — | — |
| F-DSF-OPC | Histórico de janelas do desafio | — | Desafios › menu do card › Ver histórico | desafio diário criado no dia 1, com janelas concluídas |
| F-NOT-OPC | Preferências de notificação | — | Configurações › Notificações | um tipo desligado |

Contagem: 4 telas só na web (suspender, conta suspensa, painel, histograma no perfil alheio), 2 só no app (histórico do desafio, preferências) e 4 com W e M (login, formulário com assuntos, página do livro pessoal, distribuição de notas): 14 figuras.

## Convenções

- **Nome:** `docs/imagens/solucao/<periodo>-<feature>-<tela>-<web|mobile>.png`, tudo em minúsculas, sem acento e com hífen. Exemplos: `p1-f-aut-login-web.png` e `p2-f-lst-lista-mobile.png`. No tema escuro, `-escuro` antes do cliente, como em `p1-f-est-estante-escuro-web.png`.
- **Web:** viewport de 1440 × 900, `deviceScaleFactor` 1, só a área visível (sem `fullPage`). Se a tela precisar de rolagem para mostrar o essencial, role até o bloco antes do print. Espere ~700 ms depois de cada navegação para a transição de cor terminar.
- **App:** `adb exec-out screencap -p` no Pixel 8 (1080 × 2400), reduzido para 540 px de largura. Barra de status do emulador em modo demo (`adb shell settings put global sysui_demo_allowed 1` e `am broadcast -a com.android.systemui.demo -e command clock -e hhmm 1000`), para não aparecer hora nem notificação do sistema.
- **Tema:** claro como padrão; escuro só nas 2 telas da pendência 3.
- **Compressão:** PNG com paleta, pelo `sharp` (`png({ palette: true, quality: 80 })`) na mesma pasta do scratchpad do `playwright-core`. Meta: até ~300 KB por imagem e até ~20 MB no total. Confira com `git diff --stat` antes do commit.
- **Layout no Markdown**, por período:
  - a tabela-resumo atual continua (feature, telas, clientes, requisitos), com a coluna "Protótipo" (pendência 4);
  - depois, uma subseção por feature (`### 7.1.1. F-AUT — Autenticação e conta`), com uma tabela de duas colunas por tela, `Web` e `Mobile` lado a lado (`<img src="imagens/solucao/..." width="...">`; web com ~480 px e app com ~200 px de largura);
  - abaixo de cada par, 1 ou 2 frases sobre o que a tela faz, com o RF (ex.: "Estante agrupada por status, com o ciclo de leitura. RF-EST-01, RF-EST-02.");
  - telas de um cliente só deixam a outra célula com "— (fora do escopo web)" ou "— (só web)".
- **Status do `7.solucao.md`:** data, origem e versão (DES v0.2.1 para os Períodos 1 e 2; ambiente local com banco de dev e `desenvolvimento` em `<commit>` para o Período 3 e o painel do Período 2). Sem o modelo comentado no fim.

## Roteiro de dados

### Contas (proposta: alinhar com a E6-03)

| Conta | Perfil | Papel nas telas | Papel na E6-03 (prompt da E6-03, etapa 1) |
|---|---|---|---|
| `clara.demo`, "Clara Moreira", `clara.demo@leai-demo.invalid` | público | leitora principal: estante cheia, resenhas, frases, listas, desafios, sessão, livro pessoal com capa e recomendações recebidas | leitor com livro pessoal |
| `bruno.demo`, "Bruno Sales", `bruno.demo@leai-demo.invalid` | público | segundo leitor: segue a Clara, comenta com menção, curte, recomenda e escreve resenha | leitor público |
| `davi.demo`, "Davi Prado", `davi.demo@leai-demo.invalid` | **privado** | recebe o pedido de seguir da Clara (tela de solicitações), aceita e passa a aparecer no feed; no Período 3, é a conta suspensa (só no dev) | leitor com perfil privado |

- Nomes fictícios, datas de nascimento fictícias de maior de idade e e-mails `.invalid`.
- O nome de usuário aceita `^[A-Za-z0-9._]{3,30}$` (`CadastroRequisicao.java`).
- Senha: uma só para as três, gerada na hora, guardada conforme a pendência 5, **nunca no repositório**.
- Sem avatar enviado: a inicial é suficiente e evita foto de pessoa real.
- Capa do livro pessoal: imagem simples feita na hora (cor sólida com o título), enviada pelo próprio fluxo do app (Cloudinary, preset unsigned).

### Como criar

- Pela **UI do DES** (web, que é mais rápida) ou pela API do DES com as mesmas chamadas que a UI faz (`POST /auth/register` no `leai-identidade`, depois as rotas de cada serviço com o token do leitor). **Nada direto no banco.**
- Volume pequeno: cerca de 15 livros na estante da Clara, 5 no Bruno e 3 no Davi, umas 60 ações no total, espaçadas. É uso normal e leve.
- Antes de começar: `GET /health` em cada serviço, para acordar o cold start do Render.

### Roteiro (DES)

1. Cadastrar as 3 contas e deixar o Davi privado.
2. **Livros:** escolher pelo Descobrir 4 ou 5 livros com capa e sinopse, de preferência clássicos de domínio público, como *Dom Casmurro*. O livro A é o que vai nas figuras da página do livro. **Antes de escolher, confirmar que nenhum tem resenha, frase ou comentário de colega no DES.** Se tiver, trocar de livro.
3. **Clara:**
   - ~15 livros na estante: Lendo (3), Quero ler (5), Lido (5, com nota em todos), Abandonado (1) e uma releitura;
   - 2 favoritos;
   - 3 ou mais registros de progresso no livro em Lendo;
   - resenha no livro A em Markdown, e 1 frase;
   - livro pessoal por ISBN não encontrado › pessoal, com capa;
   - 2 listas com 4 livros;
   - 2 desafios, um de livros e um de páginas, mais **1 desafio diário de páginas** (gera janelas concluídas para a F-DSF-OPC);
   - uma sessão cronometrada no app;
   - pedido para seguir o Davi.
4. **Bruno:** segue a Clara; nota e resenha no livro A; curte a resenha da Clara; comenta numa atividade dela; recomenda 2 livros à Clara; 1 frase no livro A.
5. **Davi:** aceita o pedido da Clara (a tela de solicitações é capturada **antes**); nota no livro A; segue a Clara.
6. **Clara:** responde ao comentário do Bruno mencionando `@bruno.demo`, o que gera a notificação no Bruno e a thread da F-SOCIAL-2.
7. **Sequência e desafio diário:** registrar progresso da Clara em **pelo menos 3 dias seguidos**, de 20 a 23/11, e só depois capturar o bloco de sequência e o histórico do desafio. É uma ação por dia.
8. **Denúncia (F-MOD):** só se a pendência 2 ficar com (b) ou (c). A Clara denuncia um comentário do Bruno, o admin o captura no painel e arquiva (pendência 6).

### Roteiro (dev, para o Período 3 e o painel do Período 2)

- **Contas espelho** no dev, com os mesmos nomes, pelo `/auth/register` local, que grava no banco de dev (São Paulo, `le-ai`). Lá não há os dados do DES.
- Refazer só o necessário para o Período 3, em versão menor: Clara com 5 notas ou mais e um livro pessoal com assuntos; Bruno seguindo a Clara; Davi como alvo da suspensão; uma denúncia da Clara a um comentário do Bruno. O desafio diário da Clara é criado no dev **no dia 1** (20/11), para ter janelas concluídas em 24/11.
- **Admin:** token assinado com o `JWT_SECRET` do `.env` local (`papel=admin`, `sub` da conta `admin` do dev), injetado na sessão da web pelo `playwright-core`. Não mexer em `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- Fluxo da F-MOD-OPC: suspender o Davi, capturar o painel, o perfil e o login, e **reativar o Davi no fim**.
- O `.env` local continua apontando para o dev; **nunca para o DES**.

### Dados pessoais

- Só contas de demonstração aparecem nas figuras.
- Nos lugares em que contas reais do DES podem aparecer (busca de leitor, resenhas e frases de livros populares, fila do painel), a imagem é refeita ou a tela é filtrada. A validação da etapa 2 confere cada figura.

## Etapas

### Etapa 2 — Capturar e escrever (20 a 25/11)

1. `git fetch` e worktree: `git worktree add -b renato-e6-04 ../le-ai-e6-04 origin/desenvolvimento`. A pasta principal continua na `renato-features`.
2. Conferir se o plano da E6-03 já fixou as contas. Se sim, usar as dele e ajustar este plano. Se não, criar as propostas aqui e avisar no relatório.
3. Scratchpad: `npm i playwright-core sharp` e um script por grupo de telas, com login, navegação, espera e `page.screenshot`.
4. Emulador `Pixel_8_API_35` com o APK da v0.2.1, caneta desligada (`MSYS_NO_PATHCONV=1 adb shell settings put secure stylus_handwriting_enabled 0`), texto em pedaços de 4 caracteres e navegação por `uiautomator dump`.
5. Montar os dados no DES (roteiro acima) e capturar os Períodos 1 e 2. Olhar **cada** imagem com a ferramenta Read e refazer as que tiverem skeleton, toast de erro, teclado aberto sem querer ou dado de outra pessoa.
6. Em 24 ou 25/11, depois do congelamento de código: `git merge origin/desenvolvimento` na worktree, subir os serviços e o Vite locais e o app por `flutter run`, montar os dados no dev e capturar o Período 3 e o painel do Período 2.
7. Comprimir e escrever o `docs/7.solucao.md`: status, subseções 7.1, 7.2 e **7.3 (Período 3)**, notas sem figura e o modelo comentado removido. Conferir o SUMÁRIO em `docs/README.md` se as subseções mudarem.
8. **Validação por agentes de contexto limpo**, que só leem: cada link de imagem abre? A imagem mostra a tela da legenda? O RF está certo, conferido no `REQUISITOS.md`? Aparece algum dado pessoal real? Corrigir os achados.
9. Commit na `renato-e6-04`: `docs: telas reais do sistema na seção de solução`, sem push ainda.

### Etapa 3 — Revisão independente e entrega (26 e 27/11)

1. Um agente de contexto limpo revisa a cobertura (toda linha de §7.1, §7.2 e §7.3 tem figura ou motivo), as legendas, os links, o tamanho total (`git diff --stat origin/desenvolvimento`) e a ausência de dado pessoal.
2. As correções entram em `docs: correções da revisão das telas da solução`.
3. `git merge origin/desenvolvimento` na worktree, **commit, push da `renato-e6-04` e merge direto na `desenvolvimento` pelo orquestrador**, sem PR (decisão de 19/11).
4. Fechamento, conforme o contexto comum:
   - Andamento e README na `renato-features`;
   - contribuição semanal (Semana 3 ou 4);
   - Kanban (sem card, perguntar no relatório).

### Etapa 4 — Período 3 no DES (opcional)

Só se o merge da `main` chegar ao DES até 28/11 e o Renato quiser (pendência 1c). Usa as contas do DES:

- montar o pouco que falta no DES, com a suspensão e a reativação do Davi pelo admin, o que depende da pendência 2;
- refazer as 14 figuras do Período 3;
- trocar a origem declarada no status;
- commit, push e merge direto pelo orquestrador.

Se não der, as figuras locais ficam, com a origem declarada.

## Estimativa

| Parte | Horas |
|---|---|
| Worktree, scripts do `playwright-core` e do `sharp`, emulador com o APK | 2 |
| Contas e dados no DES (inclui as 3 visitas diárias de 1 minuto) | 3 |
| Capturas web dos Períodos 1 e 2 (~39) | 3 |
| Capturas no app dos Períodos 1 e 2 (~38), navegação por `adb` | 5 |
| Revisão das imagens e refações | 1,5 |
| Ambiente local, contas espelho e dados no dev | 2 |
| Capturas do Período 3 e do painel do Período 2 (16) | 2,5 |
| Compressão e escrita do `7.solucao.md` | 2,5 |
| Validação por agentes e correções | 2 |
| **Etapa 2** | **≈ 23,5** |
| Etapa 3 (revisão, correções e entrega) | 3 |
| Etapa 4 (opcional) | 3 |
| **Total** | **≈ 26,5, ou ≈ 29,5 com a etapa 4** |

## Riscos

- **Cold start do Render** (até 1 minuto): fazer o health check antes de cada lote e refazer a imagem que pegar o carregamento.
- **Livros do acervo do DES:** não se sabe, sem tocar no DES, quais livros têm capa. Escolher na etapa 2, com uma busca normal.
- **Telas da v0.2.1 contra o código final:** algumas telas do Período 1 e 2 mudaram no Período 3. Exemplos: Configurações no app ganha `Notificações`, e o perfil de outro leitor ganha o histograma de notas. As figuras dos Períodos 1 e 2 mostram a v0.2.1, e o status diz isso. As telas que mudaram aparecem de novo no §7.3.
- **Banco de dev compartilhado:** as contas espelho e a suspensão do Davi são visíveis para o grupo no dev. Reativar o Davi e avisar no relatório.
- **Tamanho no repositório:** se passar de ~20 MB, reduzir as larguras.
