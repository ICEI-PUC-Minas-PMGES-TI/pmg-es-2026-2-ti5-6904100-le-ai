# Configurações (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Configurações`, o que foi gerado por `docs/design/periodo-1/F-AUT/configuracoes.md` e já editado por `docs/design/periodo-2/configuracoes/configuracoes.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/configuracoes/configuracoes.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-REC-ALG.md, ../../../plano-de-desenvolvimento/periodo-3/feature-F-NOT-OPC.md
**Requisitos que entram:** F-REC-ALG: opt-out de recomendação aprovado em 15/09/2026 (`REQUISITOS.md` §10.7, campo `opt_out_recomendacao` do perfil em `identidade`; sem RF próprio), o leitor impede que suas leituras entrem no sinal, na contagem e na atribuição das sugestões de outros leitores (RF-REC-08 a 12) · F-NOT-OPC: RF-NOT-05 (habilitar ou desabilitar cada tipo de notificação; aqui entra só a **entrada** para a tela de preferências)
**Não funcionais:** RNF-SEC-02 (só o dono lê e altera a própria configuração), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (mensagem em pt-BR e acionável), RNF-ERR-09 (cold start tratado como carregamento)
**Regras de negócio:** RN-08 (privacidade de perfil: o opt-out **não** é privacidade de perfil e não muda quem vê o quê)
**Versão web:** sim para o opt-out, que a decisão de §10.7 entrega em web e mobile. Não para a entrada `Notificações`: RF-NOT-05 tem a coluna Web negativa em `REQUISITOS.md` §5.10, e notificações estão fora do escopo do cliente web (`REQUISITOS.md` §2.1).
**Destino desenhado em outro prompt:** a tela de preferências de notificação, tela nova do Período 3 em [`../F-NOT-OPC/preferencias-de-notificacao.md`](../F-NOT-OPC/preferencias-de-notificacao.md), com canvas próprio. Aqui só existe a entrada até ela. O `switch` usado nesta edição nasceu naquele prompt e é reaproveitado com o mesmo desenho.

---

## 1. O que muda e por quê

Duas features do Período 3 mexem nas Configurações, e as duas mudanças entram juntas nesta edição.

- **F-NOT-OPC, só no mobile: a linha `Notificações`.** Uma **segunda linha no grupo `Conta`**, abaixo de `Alterar senha`, que abre a tela `Preferências de notificação` empilhada sobre as Configurações. Fica em `Conta` porque a preferência é guardada na conta do leitor, no servidor, e vale em qualquer aparelho em que ele entrar. A linha tem **o mesmo desenho das linhas que já existem**: rótulo em `tinta`, `CaretRight` à direita, sem ícone e sem `switch`. Os `switch` por tipo moram na tela de destino. Na web nada entra, porque o cliente web não tem notificações.
- **F-REC-ALG, no mobile e na web: o opt-out das sugestões.** Uma configuração que responde à pergunta "os livros que eu leio podem ajudar a sugerir leituras para quem me segue?". Ligada, que é o padrão, as leituras do leitor contam nas sugestões algorítmicas de quem o segue (a subseção que diz `N pessoas que você segue leram`). Desligada, elas deixam de contar no sinal, na contagem e na atribuição dessas sugestões. **Ela não esconde o perfil, não muda quem vê a estante e não desliga as sugestões que o próprio leitor recebe.** No mobile ela é uma **linha com `switch`** no topo do grupo `Privacidade e dados`, acima de `Política de privacidade`. Na web ela é um **item novo da coluna esquerda**, `Leituras em sugestões`, entre `Alterar senha` e `Política de privacidade`, que abre na coluna direita um painel curto com a explicação e o mesmo `switch`.

**A frase do `switch` é positiva.** O campo do contrato se chama `opt_out_recomendacao`, mas a interface pergunta pelo sim: `Usar minhas leituras em sugestões`, ligado por padrão. Desligar é o opt-out. Um `switch` que, ligado, significa "não use" obrigaria o leitor a resolver uma negação dupla.

**Salvar não pede botão**, como na tela de preferências de notificação: o toque move o `switch` na hora e grava. Enquanto grava, a linha não aceita outro toque e nada muda de aparência. Se a gravação falhar, o `switch` volta para onde estava e a linha diz o motivo, em vermelho, abaixo da descrição. Nada fica com cara de salvo sem ter sido salvo.

**O que deixa de valer do prompt original e da edição do Período 2.** Na seção 10 do Período 1, que a edição do Período 2 manteve:

- "sem preferências de notificação por tipo" deixa de valer **apenas na medida desta edição**: entra uma linha de navegação até a tela que tem as preferências. Continua proibido desenhar `switch` de tipo de notificação nesta tela.
- "sem `switch` em linha" deixa de valer **apenas para a linha `Usar minhas leituras em sugestões`**. Nenhuma outra linha ganha `switch`.

Continua valendo todo o resto: sem seletor de tema ou idioma, **sem privacidade de perfil aqui** (público ou privado continua em `Editar perfil`, e o opt-out não é isso), sem lista de aparelhos, sem linhas de suporte, sem toast.

O canvas continua simulando um arquivo de Figma. Os artboards existentes são alterados no lugar, sem mudar de posição. Os **artboards novos entram no fim de cada linha**, depois dos que já existem: na linha mobile, na linha web e na linha do modo escuro.

### Dados dos artboards alterados e novos

(Os dados dos Períodos 1 e 2 continuam valendo para o que não mudou: `Marina Beltrão`, `@marinableu`, `marina.beltrao@gmail.com`, badge `3` no sino, política na `Versão 1.1, de 29 de setembro de 2026`.)

**Grupo `Conta`, mobile:** duas linhas, `Alterar senha` e `Notificações`, nesta ordem.

**Grupo `Privacidade e dados`, mobile:** três linhas, `Usar minhas leituras em sugestões` (com `switch`), `Política de privacidade` e `Excluir conta`, nesta ordem.

**Coluna esquerda, web:** quatro itens, `Alterar senha`, `Leituras em sugestões`, `Política de privacidade` e `Excluir conta`, nesta ordem. Não existe item `Notificações` na web.

**Estado da configuração:** nos artboards alterados, `Usar minhas leituras em sugestões` está **ligado**, o padrão. Os artboards novos mostram o desligado e a falha.

---

## 2. Contexto do design

```
Produto: Lê Ai, aplicativo social de leitura brasileiro, no modelo Skoob e
Letterboxd. Público com 18 anos ou mais, interface em pt-BR, uso predominante em
celular. A interface reforça três mecanismos: registro (o que já foi lido),
meta (alvo curto e alcançável) e pertencimento (ver amigos lendo).

Personalidade: editorial e contemporâneo brasileiro, calmo mas com calor
social, sério com leitura e leve com o resto. Não é sebo de faculdade, não é
biblioteca antiga, não é dashboard de produtividade, não é app de café
artesanal.

Dials: DESIGN_VARIANCE 5, MOTION_INTENSITY 4, VISUAL_DENSITY 4. Layout
previsível em toda navegação principal. Duas exceções em todo o produto: o
modo de foco opera em 1 / 1 / 1, e a página do livro sobe a variance para 7.
Nenhuma das duas é esta tela.

CORES, MODO CLARO
papel            #F4F2EC   fundo da tela
papel-elevado    #EDE9DE   superfície elevada: card, sheet, container
linha            #DFD9C9   divisor de 1px e contorno suave
tinta            #171512   texto primário, preto quente, nunca #000000
grafite          #5C544B   texto secundário e label
grafite-suave    #8A8175   texto terciário, metadado, placeholder
musgo            #3E5C42   ACENTO ÚNICO: CTA, link, ícone ativo, progresso
musgo-vivo       #4E7455   hover e press do acento
musgo-fundo      #E4EAE0   tint de badge, chip e área ativa de menu
broto            #8AA274   progresso de desafio e sequência diária
rubi             #B4322A   ação destrutiva e erro
rubi-fundo       #F6E1DE   tint de erro
ambar            #D4A537   alerta
ambar-fundo      #F7ECD1   tint de alerta
capa-placeholder #DED4BC   capa de livro ainda não carregada

CORES, MODO ESCURO
noite                 #141311   fundo da tela, preto quente, nunca #000000
noite-elevada         #1D1B18   superfície elevada
linha-noite           #2A2724   divisor
papel-suave           #EDE9E0   texto primário
grafite-claro         #B8AFA2   texto secundário
grafite-fundo-escuro  #7C7466   texto terciário e placeholder
musgo-claro           #8FB27A   acento primário
musgo-fundo-escuro    #243026   tint de badge e chip ativo
broto-vivo            #A5C285   progresso e sequência
rubi-claro            #E56354   ação destrutiva e erro
rubi-fundo-escuro     #3A1F1D   tint de erro
ambar-claro           #E8BC5A   alerta
ambar-fundo-escuro    #332816   tint de alerta
capa-placeholder-noite #3A342A  capa não carregada

Regra do acento: musgo é a cor de ação em toda a interface. Nenhuma tela usa
azul, roxo ou rosa em CTA. rubi só em contexto destrutivo e de erro, ambar só
em alerta, broto só em progresso e gamificação. Sem gradiente de acento, sem
gradiente em texto, sem sombra preta pura.

TIPOGRAFIA
Space Grotesk (500, 600, 700) no display.
Manrope (400, 500, 600, 700) em toda a interface.
Newsreader (400, 500, regular e italic) APENAS em três lugares do produto:
  corpo da resenha renderizada, frases e trechos do livro, e sinopse na
  página do livro. Fora desses três, serifa não aparece.
JetBrains Mono (400, 500) em números, com numeral tabular.

ESCALA (nome, tamanho / entrelinha, peso)
display-hero  40 / 44   1.05   600
display       32 / 36   1.1    600
title-lg      24 / 28   1.2    600
title         20 / 24   1.25   600
title-sm      17 / 22   1.3    600
body-lg       17 / 26   1.5    400
body          15 / 22   1.45   400
body-strong   15 / 22   1.45   600
caption       13 / 18   1.3    500
label         12 / 16   1.2    600, tracking 0.02em
overline      11 / 14   1.2    700, tracking 0.08em, uppercase, uso racionado
num-display   36 / 40   1      500, JetBrains Mono
num-inline    15 / 22   1.45   500, JetBrains Mono, numeral tabular

ESPAÇAMENTO (múltiplos de 4)
space-1 4, space-2 8, space-3 12, space-4 16, space-5 20, space-6 24,
space-8 32, space-10 40, space-12 48, space-16 64, space-24 96.
Padding lateral da tela: space-5 no mobile, space-8 na web a partir de 768px.
Gap entre seções: space-6.

RAIO
radius-sm 6, radius 12, radius-md 16, radius-lg 20, radius-xl 24,
radius-full pill.
Botão primário é sempre pill. Botão secundário, textual e destrutivo são
radius 12. Capa de livro é a exceção declarada do sistema: retângulo de canto
vivo, sem raio nenhum.

ELEVAÇÃO (sempre tingida no hue de tinta, nunca preto puro)
elev-0  nenhuma
elev-1  0 1px 2px rgba(23,21,18,0.06), 0 1px 3px rgba(23,21,18,0.04)
elev-2  0 4px 12px rgba(23,21,18,0.08), 0 2px 4px rgba(23,21,18,0.04)
elev-3  0 12px 32px rgba(23,21,18,0.12), 0 4px 8px rgba(23,21,18,0.04)
No modo escuro os mesmos shadows ficam com metade da opacidade: a hierarquia
vem da cor de superfície e do divisor linha-noite.

MOTION
dur-instant 100ms, dur-fast 180ms, dur-base 260ms, dur-slow 420ms.
ease-out     cubic-bezier(0.16, 1, 0.3, 1)   elemento entrando na tela
ease-in-out  cubic-bezier(0.4, 0, 0.2, 1)    movimento contínuo
ease-in      cubic-bezier(0.4, 0, 1, 1)      elemento saindo
Todo motion respeita prefers-reduced-motion: sob reduce, a transição vira
estática. Zero loop infinito, zero parallax, zero scroll hijack. Botão
responde ao press com scale(0.98), sem ripple de Material.
Carregamento é skeleton estático com um único fade de entrada. Não existe
spinner girando no sistema.

ÍCONES
Phosphor Icons, família única em todo o produto. Peso regular como padrão de
tema, fill apenas para indicar estado ativo. Tamanhos: 16px inline em label,
20px em botão e em campo, 24px em barra de navegação e em card, 32px em ação
principal isolada. Nenhum ícone desenhado à mão, nenhum SVG decorativo
inline, nenhum emoji.

MARCA
Lockup horizontal: símbolo (folha sobre livro aberto) seguido do texto
"Lê Ai", os dois na mesma cor única, musgo sobre fundo claro e musgo-claro
no escuro. Texto em Space Grotesk 600, tracking -0.015em. Gap de space-3
entre símbolo e texto. Mínimo de 24px de altura. Nunca recolorido, nunca com
dois matizes, nunca com sombra.

FORMULÁRIO
Label acima do campo, sempre, no token label, cor grafite (grafite-claro no
escuro), com space-2 de gap. Placeholder nunca substitui label.
Campo com 48px de altura no mobile e 44px na web, radius 12, borda de 1px
linha, fundo papel-elevado, texto digitado em body tinta.
Foco: borda de 1.5px musgo, sem outline padrão do browser, transição
dur-fast.
Erro: borda de 1.5px rubi, mensagem abaixo em caption rubi, space-2 de gap.
Helper abaixo do campo em caption grafite, visível o tempo todo, não só
depois do erro.
Botão médio: padding de 12 vertical e 20 horizontal, 48px de altura no mobile
e 40px na web, texto em uma linha.

SOBREPOSIÇÃO (bottom sheet e dialog)
Abaixo de 768px: bottom sheet ancorado embaixo, largura total, fundo papel no
claro e noite-elevada no escuro, radius-lg só no topo, padding space-6,
elev-3. Alça de 32 x 4px em linha (linha-noite no escuro), centralizada,
space-5 acima do conteúdo. O padding inferior soma a área segura.
Scrim: #171512 a 40% no claro e preto a 60% no escuro.
O sheet sobe em dur-slow com ease-out e sai em dur-base com ease-in. Foco
preso dentro enquanto aberto; Esc e toque no scrim fecham; o foco volta ao
elemento que abriu.
A partir de 768px: dialog centrado, 480px de largura, radius-xl nos quatro
cantos, sem alça, entra em dur-base com deslize curto de 16px e fade.
Confirmação destrutiva: título em title-sm, consequência em body grafite
nomeando o que se perde, foco inicial em Cancelar, nunca no destrutivo. No
mobile os botões empilham em largura total, destrutivo em cima; na web ficam
lado a lado, alinhados à direita, Cancelar primeiro. Destrutivo é sempre
outline rubi (rubi-claro no escuro), nunca preenchido.

MODO ESCURO
Cidadão de primeira classe e lock de página inteira: nenhuma seção inverte no
meio da rolagem. Superfície elevada fica MAIS CLARA que o fundo, nunca mais
escura.

CONTRASTE
WCAG AA no corpo, AAA no título quando possível. grafite-suave e
grafite-fundo-escuro passam apenas em tamanho grande: nunca carregam texto de
corpo nem informação essencial.
```

---

## 3. O que permanece intocado

Tudo o que vem a seguir fica **exatamente como está no canvas**:

- **O shell inteiro.** Barra inferior do mobile com quatro itens (`Estante`, `Descobrir`, `Feed`, `Perfil`) e **Perfil** ativo; sidebar da web com os mesmos quatro itens e **Perfil** ativo em `musgo-fundo`. **A marca no topo da sidebar fica como está desenhada neste canvas.** O bloco MARCA da seção 2 é contexto do sistema, não instrução para trocar a marca desta tela. Nenhum quinto item de navegação.
- **O header mobile:** `ArrowLeft`, título `Configurações` em `display` `tinta` e o sino `Bell` com o badge `3`.
- **O header de conteúdo da web:** retorno textual `Perfil` e título `Configurações` em `display` `tinta`, sem sino.
- **O bloco de identificação:** `Marina Beltrão`, `@marinableu` e `marina.beltrao@gmail.com`, sem avatar, com o divisor abaixo.
- **Os títulos dos dois grupos**, `Conta` e `Privacidade e dados`, e o desenho dos títulos. Nenhum grupo novo entra.
- **As linhas `Alterar senha`, `Política de privacidade` e `Excluir conta`**, com o mesmo desenho: 56px, rótulo em `body` `tinta`, `CaretRight` 20px `grafite-suave`, divisor de 1px `linha`. `Excluir conta` continua a última linha do grupo `Privacidade e dados`, sem `rubi`.
- **O botão `Sair da conta`**, outline `rubi` com `SignOut`, e a linha `Lê Ai · versão 1.0.0` abaixo dele. O botão continua sendo **a única ação destrutiva desta tela**.
- **Os modais `Sair da conta?`**, com a mesma copy, os mesmos botões e o mesmo scrim, no mobile e na web.
- **O estado `Saindo`**, com a mesma copy e sem spinner.
- **A política de privacidade inteira**, na versão 1.1 que a edição do Período 2 escreveu: a linha de versão, os quatro títulos e os quatro textos, palavra por palavra. **Os artboards `Configurações · Política de privacidade` e `Configurações · Escuro, política de privacidade` não mudam em nada**, porque são uma tela empilhada que não mostra os grupos.
- **O layout de duas colunas da web**, com a coluna esquerda de 320px, a coluna direita de no máximo 720px e o gap `space-12`. Na aterrissagem da web o item aberto continua sendo `Política de privacidade`.
- **A ordem e a posição dos artboards** que já existem em cada linha.

---

## 4. Artboards que mudam

### Os elementos novos, descritos uma vez

**Linha `Notificações`, mobile.** Idêntica às outras linhas de navegação: 56px de altura, padding lateral `space-5`, rótulo `Notificações` em `body` `tinta` à esquerda e `CaretRight` (Phosphor, `regular`, 20px, `grafite-suave`) à direita, com divisor de 1px `linha` entre ela e `Alterar senha`. Sem ícone de sino, sem contagem, sem badge, sem `switch`. Tocar abre `Preferências de notificação`, empilhada, do canvas próprio.

**Linha `Usar minhas leituras em sugestões`, mobile.** É a única linha da tela que tem um controle em vez de levar a outra tela:

- Altura mínima de 72px, padding lateral `space-5`, padding vertical `space-3`, fundo `papel`. A linha inteira é a área tocável e alterna o `switch`.
- **Sem ícone à esquerda**, como as outras linhas das Configurações.
- No meio, ocupando a largura que sobra, o rótulo `Usar minhas leituras em sugestões` em `body` `tinta` e, `space-1` abaixo, a descrição em `caption` `grafite`, sempre visível, em até três linhas, sem corte: `Os livros que você lê ajudam a sugerir leituras para quem segue você. Seu perfil continua como está.`
- `space-4` de gap. À direita, centralizado na altura da linha, o `switch` (seção 7), no lugar onde as outras linhas têm o `CaretRight`. **Sem `CaretRight` nesta linha**: ela não leva a lugar nenhum.
- Divisor de 1px `linha` entre ela e `Política de privacidade`, como entre as outras linhas.

**Item `Leituras em sugestões`, web.** Idêntico aos outros itens da coluna esquerda: 44px de altura, `radius` 12, padding lateral `space-4`, rótulo em `body-strong`, com o mesmo tratamento de inativo, `hover` com fundo `linha` em `dur-fast` e aberto com fundo `musgo-fundo` e texto `musgo`. Ele entra **entre `Alterar senha` e `Política de privacidade`**, com o mesmo gap entre itens. **O item não mostra o estado** (nada de `switch` ou de `Ligado` na coluna esquerda): o estado mora no painel. Clicar abre o painel na coluna direita.

**Painel `Leituras em sugestões`, web.** O conteúdo da coluna direita quando o item está aberto, na mesma largura máxima de 720px em que a política aparece:

- Título `Leituras em sugestões` em `title-lg` `tinta`, alinhado ao topo da coluna, como os títulos de bloco da política estão alinhados.
- `space-3` abaixo, parágrafo em `body` `grafite`, no máximo 640px de largura: `Quando alguém que segue você abre Descobrir, uma das sugestões é a de livros que pessoas que ela segue leram. Seus livros lidos entram nessa conta.`
- `space-6` abaixo, a linha de controle, com divisor de 1px `linha` acima e abaixo: rótulo `Usar minhas leituras em sugestões` em `body-strong` `tinta`, descrição em `caption` `grafite` `Desligado, suas leituras deixam de contar nas sugestões de outros leitores.`, `switch` à direita. Altura mínima de 72px, padding vertical `space-3`, sem padding lateral (a linha se alinha com o texto do painel). A linha inteira é clicável e alterna.
- `space-4` abaixo, nota em `caption` `grafite`: `Isso não muda quem vê seu perfil e não desliga as sugestões que você recebe. Para deixar o perfil privado, use Editar perfil.` A expressão `Editar perfil` é um link textual em `musgo`, sublinhado no hover, que leva à edição do perfil.
- Nada além disso no painel: sem ilustração, sem botão `Salvar`, sem segundo controle.

### 4.1 `Configurações · Padrão`

- Entra a linha `Notificações` no fim do grupo `Conta`, abaixo de `Alterar senha`.
- Entra a linha `Usar minhas leituras em sugestões`, **ligada**, no topo do grupo `Privacidade e dados`, acima de `Política de privacidade`.
- O grupo `Privacidade e dados`, o botão `Sair da conta` e a linha de versão descem o que for preciso. A tela deve continuar cabendo acima da barra inferior em 844px; se não couber, **a linha de versão e, depois dela, o botão de sair passam da dobra** e a tela rola. Nada é comprimido: nenhuma linha perde altura e nenhuma descrição perde linha.

### 4.2 `Configurações · Confirmar saída`

A tela ao fundo, sob o scrim, ganha as duas linhas de 4.1, com o `switch` ligado. O modal não muda.

### 4.3 `Configurações · Saindo`

As duas linhas entram com o mesmo desenho de 4.1, enquanto o botão mostra `Saindo`. O `switch` aparece ligado e **desabilitado**: trilho e botão a 40% de opacidade, sem resposta ao toque, porque a sessão está sendo encerrada.

### 4.4 `Configurações · Política de privacidade`

**Não muda.** É a tela empilhada da política, sem os grupos.

### 4.5 `Configurações · Carregando`

- A linha `Notificações` aparece normalmente: ela não espera dado.
- A linha `Usar minhas leituras em sugestões` aparece com o rótulo e a descrição reais, porque são fixos, e **no lugar do `switch` um retângulo de 52 x 32px em `capa-placeholder` com `radius-full`**, estático, que entra no mesmo fade único de `dur-base` do skeleton de identificação. O estado da configuração vem de `GET /me`, a mesma chamada do bloco de identificação, e a tela não afirma ligado nem desligado antes de ler.
- Enquanto o skeleton está ali, a linha não responde ao toque.
- Se `GET /me` falhar, a regra do Período 1 continua: o bloco de identificação mantém o skeleton e o resto da tela segue utilizável. **A linha de sugestões também mantém o skeleton do `switch` e não responde ao toque**, e nada de erro é desenhado nela. Não há artboard próprio para isso.

### 4.6 `Configurações · Web, padrão, política aberta`

- Entra o item `Leituras em sugestões`, inativo, entre `Alterar senha` e `Política de privacidade`.
- `Política de privacidade` continua aberto, e a coluna direita continua mostrando a política.

### 4.7 `Configurações · Web, confirmar saída`

Ao fundo, a coluna esquerda com o item `Leituras em sugestões`, inativo. O dialog não muda.

### 4.8 `Configurações · Web, item em hover`

Entra o item `Leituras em sugestões`, inativo. O hover continua sobre `Alterar senha`, e `Política de privacidade` continua aberto.

### 4.9 `Configurações · Escuro, padrão`

As duas linhas de 4.1 no tratamento escuro das outras linhas: rótulos em `papel-suave`, descrição em `grafite-claro`, `CaretRight` de `Notificações` em `grafite-fundo-escuro`, divisores em `linha-noite`. O `switch` ligado com trilho `musgo-claro` e botão em `noite`.

### 4.10 `Configurações · Escuro, confirmar saída`

A tela ao fundo ganha as duas linhas, no tratamento escuro de 4.9. O modal não muda.

### 4.11 `Configurações · Escuro, política de privacidade`

**Não muda.**

### 4.12 `Configurações · Escuro, web política aberta`

Entra o item `Leituras em sugestões`, inativo, com rótulo no mesmo tom dos outros itens inativos no escuro e hover em `linha-noite`. A política continua aberta na coluna direita.

---

## 5. Artboards novos

Os novos entram **no fim de cada linha**, depois dos existentes, na ordem abaixo. Rótulo acima de cada artboard no formato `Configurações · <estado>`.

### Linha mobile (390 x 844), depois de `Configurações · Carregando`

#### 5.1 `Configurações · Sugestões desligado`

O mesmo artboard de 4.1, com `Usar minhas leituras em sugestões` **desligado**:

- `switch` com trilho em `papel-elevado`, contorno de 2px `grafite-suave` e botão de 16px em `grafite-suave` encostado à esquerda.
- Rótulo e descrição **não mudam** com o estado: a descrição explica o que a configuração faz, nos dois lados. Nenhum aviso aparece, nenhuma cor muda na linha.
- Todo o resto como em 4.1.

#### 5.2 `Configurações · Falha ao salvar sugestões`

A leitora tocou para desligar e o servidor não respondeu.

- O `switch` **voltou para ligado**: ele mudou na hora do toque e voltou quando a gravação falhou, com o mesmo deslize de `dur-fast`.
- Abaixo da descrição, dentro da mesma linha e no alinhamento do texto, `space-2` de gap, a mensagem em `caption` `rubi`, com `Warning` (Phosphor, `regular`, 16px, `rubi`) à esquerda: `Não foi possível salvar. Verifique sua conexão e tente de novo.` A linha cresce para caber a mensagem, e o que está abaixo desce.
- **Tentar de novo é tocar no `switch` outra vez.** Não há botão extra. A mensagem some quando o próximo toque salva.
- Este é também o estado **sem conexão ao salvar**: não existe fila offline desta configuração.
- Nada de banner no topo, nada de toast. As outras linhas continuam utilizáveis.

### Linha web (1440 x 900), depois de `Configurações · Web, item em hover`

#### 5.3 `Configurações · Web, sugestões aberto`

- Sidebar expandida com `Perfil` ativo.
- Coluna esquerda com a identificação, os quatro itens e o botão de sair. **`Leituras em sugestões` aberto**, em `musgo-fundo` com texto `musgo`; `Política de privacidade` inativo.
- Coluna direita com o painel `Leituras em sugestões` descrito na seção 4, `switch` **ligado**.

#### 5.4 `Configurações · Web, sugestões desligado`

O mesmo de 5.3, com o `switch` **desligado**. Nenhum outro elemento muda: o parágrafo, a descrição da linha e a nota são os mesmos nos dois estados.

#### 5.5 `Configurações · Web, falha ao salvar sugestões`

O mesmo de 5.3, depois de um clique para desligar que falhou: `switch` de volta em ligado, e abaixo da descrição da linha, `space-2` de gap, a mesma mensagem de 5.2 em `caption` `rubi` com `Warning` de 16px. A nota abaixo da linha desce. Sem toast, sem dialog.

### Linha do modo escuro, depois de `Configurações · Escuro, web política aberta`

#### 5.6 `Configurações · Escuro, sugestões desligado`

O estado 5.1 no escuro. Fundo `noite`. `switch` desligado com trilho em `noite-elevada`, contorno de 2px `grafite-fundo-escuro` e botão em `grafite-claro`. Rótulos em `papel-suave`, descrições em `grafite-claro`, divisores em `linha-noite`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com `Perfil` ativo em `musgo-claro`.

#### 5.7 `Configurações · Escuro, web sugestões aberto`

O estado 5.3 no escuro. Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Item aberto com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Título do painel e rótulo da linha em `papel-suave`, parágrafo, descrição e nota em `grafite-claro`, link `Editar perfil` em `musgo-claro`, divisores em `linha-noite`. `switch` ligado com trilho `musgo-claro` e botão em `noite`.

Nos dois, os shadows ficam com **metade da opacidade**, e a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

| Componente | Origem |
|---|---|
| Linha de navegação de grupo (56px, `CaretRight`) | prompts de Configurações do Período 1, reaproveitada sem mudança para `Notificações` |
| Item da coluna esquerda da web | prompts de Configurações do Período 1, reaproveitado sem mudança para `Leituras em sugestões` |
| `switch` | nasceu em `docs/design/periodo-3/F-NOT-OPC/preferencias-de-notificacao.md`, incorporação pendente; reaproveitado aqui com o mesmo desenho |
| Mensagem de erro dentro da linha, com `Warning` 16px | a mesma de `preferencias-de-notificacao.md` |
| Skeleton estático em `capa-placeholder` | documento-de-design §3.6 (carregamento) |
| Link textual em `musgo` | documento-de-design §3.1 (acento) |

**O `switch`, transcrito para que este prompt seja autocontido:**

- Trilho de 52 x 32px, `radius-full`.
- **Ligado:** trilho preenchido em `musgo`; botão circular de 24px em `papel`, encostado à direita com 4px de folga.
- **Desligado:** trilho com fundo `papel-elevado` e contorno de 2px `grafite-suave`; botão circular de 16px em `grafite-suave`, encostado à esquerda com 8px de folga.
- **Escuro:** ligado com trilho `musgo-claro` e botão em `noite`; desligado com trilho em `noite-elevada`, contorno de 2px `grafite-fundo-escuro` e botão em `grafite-claro`.
- A diferença entre ligado e desligado **não depende só da cor**: muda a posição e o tamanho do botão, e o trilho passa de contorno para preenchido.
- Ao tocar, o botão desliza em `dur-fast` com `ease-in-out`. Sob `prefers-reduced-motion`, troca de lado sem deslizar. Sem sombra no botão, sem mola.

**Componentes que nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **A linha de configuração com `switch` e sem ícone**, variante da linha de preferência de `preferencias-de-notificacao.md`: rótulo, descrição sempre visível de até três linhas e `switch` no lugar do `CaretRight`, dentro de um grupo de linhas de navegação.
2. **O painel de configuração da coluna direita da web**: título `title-lg`, parágrafo explicativo, uma linha de controle entre divisores e uma nota com link.

Decisões desta edição para o grupo ratificar:

- `Notificações` no grupo `Conta`, e não num grupo novo.
- Frase positiva no `switch` (`Usar minhas leituras em sugestões`, ligado por padrão), com o campo do contrato invertido (`opt_out_recomendacao` falso quando ligado).
- No mobile a configuração fica na própria lista; na web ela ganha um item e um painel.
- Sem confirmação ao desligar nem ao religar: a ação é reversível a qualquer momento e não apaga nada.
- Enquanto `GET /me` não responde, o `switch` fica em skeleton e a linha não aceita toque.

Contratos a confirmar com o dono de F-REC-ALG: `GET /me` passar a devolver `opt_out_recomendacao` e a gravação aceitar só esse campo, sem exigir o resto do perfil, para que o `switch` grave sozinho.

---

## 8. Copy nova ou alterada

| Onde | Texto que entra | Texto que sai |
|---|---|---|
| Linha nova do grupo `Conta`, mobile | `Notificações` | nada, o elemento não existia |
| Linha nova do grupo `Privacidade e dados`, mobile, rótulo | `Usar minhas leituras em sugestões` | nada, o elemento não existia |
| A mesma linha, descrição | `Os livros que você lê ajudam a sugerir leituras para quem segue você. Seu perfil continua como está.` | nada |
| Item novo da coluna esquerda, web | `Leituras em sugestões` | nada |
| Painel web, título | `Leituras em sugestões` | nada |
| Painel web, parágrafo | `Quando alguém que segue você abre Descobrir, uma das sugestões é a de livros que pessoas que ela segue leram. Seus livros lidos entram nessa conta.` | nada |
| Painel web, rótulo da linha | `Usar minhas leituras em sugestões` | nada |
| Painel web, descrição da linha | `Desligado, suas leituras deixam de contar nas sugestões de outros leitores.` | nada |
| Painel web, nota | `Isso não muda quem vê seu perfil e não desliga as sugestões que você recebe. Para deixar o perfil privado, use Editar perfil.` | nada |
| Erro ao salvar, mobile e web | `Não foi possível salvar. Verifique sua conexão e tente de novo.` | nada |
| Rótulo acessível do `switch` | `Usar minhas leituras em sugestões`, estado `ligado` ou `desligado` | nada |

Nenhuma outra copy é substituída. Zero em-dash. Zero emoji.

---

## 9. Acessibilidade e interação do que muda

- **Alvo de toque** de 48px no mínimo: a linha `Notificações` tem 56px, a linha de sugestões tem 72px, e as duas são tocáveis por inteiro.
- **A linha `Notificações` é anunciada como navegação**, `Notificações, abre uma tela`.
- **A linha de sugestões é um único controle para o leitor de tela**, com papel de `switch`, o rótulo como nome, a descrição como dica e o estado `ligado` ou `desligado`. Na web, a linha do painel é um `switch` acessível, ativado por clique, `Espaço` ou `Enter`.
- **O erro é anunciado** quando aparece, como região viva educada, e fica associado à linha.
- **Durante a gravação** a linha é anunciada como ocupada e ignora toques repetidos.
- **Foco de teclado visível na web** no item novo e na linha do painel, com contorno de 2px `musgo` e offset de 2px. Ordem de tabulação na coluna esquerda: `Alterar senha`, `Leituras em sugestões`, `Política de privacidade`, `Excluir conta`, `Sair da conta`; depois, no painel, a linha com o `switch` e o link `Editar perfil`.
- **O `switch` passa 3:1 como componente de interface** nos dois temas: contorno `grafite-suave` sobre `papel` no desligado, `musgo` preenchido no ligado; no escuro, `grafite-fundo-escuro` e `musgo-claro` sobre `noite`. A diferença entre os estados também é de forma e posição, não só de cor.
- **Contraste WCAG AA** nos textos: rótulo em `tinta`, descrição em `grafite`, erro em `rubi` sobre `papel`; no escuro, `papel-suave`, `grafite-claro` e `rubi-claro` sobre `noite`.
- **Aumento de fonte do sistema:** a descrição quebra em mais linhas e a linha cresce, sem corte e sem o `switch` sair da linha.
- `prefers-reduced-motion` respeitado: o deslize do `switch` e o hover dos itens viram troca instantânea.

---

## 10. O que não fazer nesta edição

**Regras da edição**

- **Não redesenhe o que não foi citado.** Header, identificação, títulos de grupo, linhas existentes, botão de sair, modais, política e skeleton ficam como estão.
- **Não reordene os artboards existentes.** Os novos entram no fim de cada linha.
- **Não crie grupo novo** para nenhuma das duas mudanças, nem título de seção novo.
- **Não ponha `switch` de tipo de notificação nesta tela.** A linha `Notificações` só navega; os controles moram em `Preferências de notificação`, outro canvas. Não desenhe essa tela aqui.
- **Não ponha ícone, contagem ou badge na linha `Notificações`.**
- **Não ponha `switch` em nenhuma outra linha** além de `Usar minhas leituras em sugestões`.
- **Não escreva o `switch` como negação** (`Não usar minhas leituras`, `Ocultar minhas leituras`). A frase é positiva e ligada por padrão.
- **Não trate a configuração como privacidade de perfil.** Sem `Lock`, sem `Perfil privado`, sem mexer em quem vê a estante. Público e privado continuam em `Editar perfil`.
- **Não ponha botão `Salvar`** nem pergunta de confirmação para ligar ou desligar.
- **Não use toast** para confirmar que salvou nem para o erro. O `switch` na posição nova é a confirmação; o erro fica na linha.
- **Não mostre o estado na coluna esquerda da web.** O item é só navegação.
- **Não pinte nada de `rubi`** além da mensagem de erro e do botão `Sair da conta`. `Excluir conta` continua sem cor destrutiva.
- Continua valendo das edições anteriores: sem seletor de tema, sem seletor de idioma, sem lista de aparelhos conectados, sem linhas de suporte, avaliação na loja, convite de amigos ou "sobre nós", sem engrenagem dentro da tela, sem undo depois de sair, sem política em PDF, imagem ou link externo, sem aceite da política com checkbox e sem "zona de perigo" tingida.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela: o painel e a política são texto de interface, em Manrope.
- Nada de mistura de família dentro do mesmo título.
- Nada de overline em toda seção e nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão, em `switch` nem em texto de título.
- Nada de `switch` azul, verde-limão ou de outra cor que não `musgo`.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura. O `switch` não tem sombra no botão.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo nem de spinner girando, nem dentro do `switch` enquanto salva.
- Nada de mola ou quique no `switch`. Um deslize em `dur-fast`, e só.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de label poético. A linha diz o que faz.
- Nada de mensagem de erro genérica do tipo `Algo deu errado`: a mensagem diz o que fazer.

**Componentes**

- Nada de ícone desenhado à mão.
- Nada de checkbox no lugar do `switch`.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline `rubi`.

**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal. `Sair da conta` continua com o modal; o `switch` não é destrutivo.
- Nada de desfazer em ação destrutiva pesada.

**Formulário**

- Nada de placeholder no lugar de label e nada de helper que só aparece depois do erro: a descrição da linha está sempre visível.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing, bento grid ou três colunas de ícones.
- Nada de layout que não colapse para uma coluna abaixo de 768px. Abaixo de 768px, a web usa o desenho mobile: a linha com `switch` na lista, sem o painel.
- Nada de conteúdo essencial escondido em hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
