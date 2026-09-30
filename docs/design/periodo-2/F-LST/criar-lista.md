# F-LST · Criar lista

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-LST.md
**Requisitos:** RF-LST-01 (criar listas de livros com título e descrição), RF-LST-03 (editar e excluir as próprias listas). A partir do sheet `Adicionar à lista`, também RF-LST-02 (o livro de origem entra na lista recém-criada)
**Não funcionais:** RNF-SEC-02 (criar, editar e excluir são exclusivos do dono, validados no servidor), RNF-SEC-14 (título e descrição tratados como texto, com escape), RNF-ERR-04 (escrita idempotente: reenviar não cria duas listas), RNF-USA-04 (confirmação em ação destrutiva), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-08 (a lista herda a privacidade do perfil do dono: não existe privacidade por lista), RN-15.1 (livro pessoal só entra em lista do próprio dono)
**Versão web:** sim. RF-LST-01 e RF-LST-03 têm marcação na coluna Web de `REQUISITOS.md` §5.6.

---

## 1. Contexto

O formulário em que o leitor **dá nome a uma coleção**: um título obrigatório e uma descrição opcional. É o mesmo formulário para **criar** e para **editar**; na edição ele ganha, no rodapé, a zona de exclusão. Livros não são escolhidos aqui: eles entram pela página do livro, no sheet `Adicionar à lista`, e são reordenados e removidos dentro da própria lista.

**De onde se chega:**

- **Criar, lista vazia:** do botão `Nova lista` no índice de listas do leitor (`F-LST/listas-do-leitor.md`, a desenhar em outro prompt) e na seção `Listas` do perfil do dono (edição do perfil, em outro lote).
- **Criar, a partir de um livro:** da linha `Criar lista` no topo do sheet `Adicionar à lista` ([`adicionar-a-lista.md`](adicionar-a-lista.md)). Nesse modo o formulário mostra o livro que vai entrar, e salvar cria a lista **já com o livro dentro**.
- **Editar:** do botão `Editar lista` da própria lista (`F-LST/lista.md`). A lista não tem outro lugar de exclusão: excluir mora só na zona de exclusão deste formulário, em modo edição.

**Para onde se vai:**

- Criar a partir do índice ou do perfil abre a lista recém-criada, vazia.
- Criar a partir de um livro volta para a página daquele livro, com um toast que confirma a entrada e oferece `Ver lista`. O toast está desenhado em [`adicionar-a-lista.md`](adicionar-a-lista.md), por cima da página do livro.
- Salvar a edição volta para a lista, já com o título e a descrição novos.
- Excluir, depois da confirmação, volta para o índice de listas (`F-LST/listas-do-leitor.md`), já sem a lista, com o toast `Lista excluída.`
- Fechar ou cancelar volta para onde o leitor estava, sem salvar.

**Plataforma.** No mobile o formulário é uma **tela cheia sobreposta**, sem barra inferior e sem sino: é um formulário de passagem, não um destino da navegação. Na web é um **dialog centrado de 480px** (sobreposição modal), sobre a tela de origem. Os dois são o mesmo componente responsivo.

Três coisas que o formulário precisa resolver:

- **Um campo obrigatório só.** O título é tudo o que a lista precisa para existir. A descrição é opcional e diz isso no label, para ninguém travar tentando escrever um texto de apresentação.
- **Quem vai ver a lista.** Não existe lista secreta nem lista pública dentro de perfil privado: a lista segue a privacidade do perfil (RN-08). O formulário diz isso antes de o leitor salvar, com o texto certo para cada caso, e **não** oferece chave de visibilidade.
- **Excluir não apaga livro nenhum.** A confirmação diz que saem a lista e a ordem dos livros, e que os livros continuam na estante e no acervo.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`: primeiro os de criação, depois os de edição.
- **Linha 2:** estados web, viewport `1440 x 900`, na mesma ordem.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Criar lista · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- Espaçamento generoso entre artboards, com as linhas claramente separadas.

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
  página do livro. Fora desses três, serifa não aparece. Esta tela não tem
  serifa nenhuma: a descrição da lista é texto de interface, em Manrope.
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
radius 12. Capa de livro é a exceção declarada do sistema: retângulo de
canto vivo, sem raio nenhum.

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
Web também tem disabled: fundo linha, texto grafite-suave.
Botão médio: padding de 12 vertical e 20 horizontal, 48px de altura no mobile
e 40px na web, texto em uma linha.

SOBREPOSIÇÃO MODAL
Abaixo de 768px: bottom sheet ancorado embaixo, largura total, fundo papel no
claro e noite-elevada no escuro, radius-lg só no topo, padding space-6,
elev-3, alça de 32x4px em linha / linha-noite centralizada com space-5 acima
do conteúdo, padding inferior somando a área segura.
A partir de 768px: dialog centrado, 480px de largura, radius-xl nos quatro
cantos, sem alça, mesmo fundo e mesma elevação.
Scrim: #171512 a 40% no claro e preto a 60% no escuro (cor fixa).
Sheet sobe em dur-slow com ease-out; dialog entra em dur-base com deslize
curto de 16px e fade; os dois saem em dur-base com ease-in. Sob
prefers-reduced-motion entram e saem sem deslizar.
Foco preso dentro enquanto aberto, Esc e toque no scrim fecham, e o foco
volta ao elemento que abriu. Na confirmação destrutiva o foco entra em
Cancelar, nunca no destrutivo.

TOAST
Fundo papel-elevado (noite-elevada no escuro), radius 12, elev-2, padding
space-4, barra lateral fina de 4px à esquerda: musgo para confirmação, rubi
para falha. Nunca fundo saturado verde ou vermelho.

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

## 3. Dados que aparecem na tela

**Dono das listas:** `Marina Beltrão` (`@marinableu`), a leitora do perfil próprio. Perfil **público** nos artboards principais; o artboard de perfil privado troca só a faixa informativa.

**Criação, preenchida:** título `Poesia para começar`, descrição `Livros de poemas curtos, para quem nunca leu poesia fora da escola.`

**Criação a partir de um livro:** o livro de origem é `Torto Arado`, de Itamar Vieira Junior, Todavia, 2019, `264 páginas`, com capa real. Título digitado: `Romances do sertão`. Descrição vazia.

**Edição:** a lista `Contos que eu indico`, com `7 livros`, criada em março de 2026. Descrição salva: `Livros de contos para quem acha que não gosta de conto. Em ordem de por onde começar.` A leitora corrige o título para `Contos para quem acha que não gosta de conto`.

**Limites de caracteres, provisórios:** o contrato ainda não fixou os limites (decisão do dono da feature, registrada em `feature-F-LST.md`). Este prompt usa **80 caracteres no título** e **300 caracteres na descrição** como valores de desenho, a ratificar. O contador mostra os dois valores literalmente.

**Contagens do contador**, em JetBrains Mono: `19/80` para `Poesia para começar`, `67/300` para a descrição preenchida, `44/80` para `Contos para quem acha que não gosta de conto`.

**Privacidade (RN-08), como aparece para a dona:**

| Perfil | O que a faixa diz |
|---|---|
| Público | `Seu perfil é público: qualquer leitor pode ver esta lista.` |
| Privado | `Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.` |

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, mas **sobreposta em tela cheia**: ela cobre a tela de origem inteira, inclusive a barra inferior, e não tem sino. É um formulário de passagem, como um dialog que ocupa o celular inteiro. Tudo abaixo vale para os artboards 4.1 a 4.9.

**Mobile, header do formulário em tela cheia.** Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.

- `X` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px e rótulo acessível `Fechar sem salvar`. Volta à tela de origem sem salvar e **sem pedir confirmação**: o formulário tem dois campos e nada é perdido que não se escreva de novo em segundos.
- Título em `display` `tinta`, alinhado à base, `space-2` depois do `X`: `Nova lista` na criação, `Editar lista` na edição.
- **Sem sino, sem barra inferior, sem outra ação no header.** O salvar mora no fim do formulário.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Estrutura do formulário

Padding lateral `space-5`, `space-4` de respiro abaixo do header. Os blocos ficam empilhados com `space-6` entre eles. O formulário rola por baixo do header quando não cabe, e o teclado empurra o conteúdo em vez de cobrir o campo focado.

**Bloco opcional, livro que vai entrar** (só no modo "a partir de um livro", 4.3):

- Label `Este livro entra na lista` em `label` `grafite`, `space-2` abaixo.
- **Card de confirmação** (design §4.5, variante Confirmação): fundo `papel-elevado`, `radius-md`, padding `space-5`, sem sombra. Capa de 60 por 90px à esquerda, canto vivo, sem raio. À direita, `space-4` de gap: título `Torto Arado` em `title-sm` `tinta`, autor `Itamar Vieira Junior` em `body` `grafite`, e `Todavia · 2019 · 264 páginas` em `caption` `grafite-suave`. Sem ação dentro do card.

**Campo 1, Título.**

- Label `Título` em `label` `grafite`.
- Campo de uma linha, 48px de altura, largura total, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto em `body` `tinta`.
- Placeholder em `grafite-suave`: `Ex.: Para ler nas férias`. Ele não substitui o label.
- `space-2` abaixo, uma linha com o helper à esquerda e o contador à direita, os dois em `caption`:
  - Helper em `grafite`, sempre visível: `É o nome que aparece no seu perfil.`
  - Contador em JetBrains Mono `grafite`: `19/80`. Aparece desde o início, com `0/80`.

**Campo 2, Descrição.**

- Label `Descrição (opcional)` em `label` `grafite`.
- Área de texto de várias linhas, **120px de altura mínima**, que cresce até 200px e depois rola por dentro. Largura total, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto em `body` `tinta`, padding `space-3` vertical e `space-4` horizontal.
- Placeholder em `grafite-suave`: `O que junta estes livros?`
- `space-2` abaixo, helper à esquerda e contador à direita:
  - Helper em `grafite`: `Aparece abaixo do título, na página da lista.`
  - Contador em JetBrains Mono `grafite`: `67/300`.
- Texto puro: sem negrito, sem link, sem Markdown. Quebra de linha digitada é preservada.

**Faixa de privacidade.** `space-6` abaixo da descrição, a **faixa informativa neutra** (design §4.15): fundo `musgo-fundo`, `radius` 12, padding `space-4`, sem borda, `Info` (Phosphor, `regular`, 20px, `musgo`) à esquerda, `space-3` de gap, texto em `body` `tinta`, com o texto do perfil da dona (seção 3). A faixa não fecha, não some e não tem ação dentro. Ela aparece em todos os artboards, na criação e na edição.

**Ações.** `space-8` depois da faixa:

- Botão primário pill, largura total, 48px, fundo `musgo`, texto `papel`: `Criar lista` na criação, `Criar lista com este livro` no modo "a partir de um livro", `Salvar alterações` na edição.
- **Desabilitado** enquanto o título estiver vazio ou com mais de 80 caracteres, e, na edição, enquanto nada tiver mudado: fundo `linha`, texto `grafite-suave`, sem sombra.
- `space-3`, botão textual `grafite`, centralizado: `Cancelar`. Mesmo efeito do `X`.

### 4.1 Criação, vazio

A leitora acabou de tocar em `Nova lista` no índice. Os dois campos vazios, com os placeholders, contadores em `0/80` e `0/300`, a faixa `Seu perfil é público: qualquer leitor pode ver esta lista.` e o botão `Criar lista` desabilitado.

**O campo `Título` recebe foco ao abrir** e o teclado sobe: é o único campo obrigatório e é de texto, então abrir a tela é começar a escrever. O artboard mostra o campo em foco (borda de 1.5px `musgo`, cursor no início) e o teclado do sistema ocupando a metade de baixo do viewport, com a faixa e os botões rolados para baixo dele.

### 4.2 Criação, preenchido

Teclado fechado. Título `Poesia para começar` com o contador `19/80`, descrição preenchida com `67/300`, a faixa de perfil público e o botão `Criar lista` habilitado. Nenhum campo em foco.

### 4.3 Criação a partir de um livro

A leitora tocou em `Criar lista` no sheet `Adicionar à lista` da página de `Torto Arado`.

- Título do header: `Nova lista`.
- Primeiro bloco: `Este livro entra na lista` com o card de confirmação de `Torto Arado`.
- Título `Romances do sertão` com `18/80`, descrição vazia com o placeholder e `0/300`.
- Faixa de perfil público.
- Botão primário `Criar lista com este livro`, habilitado, e `Cancelar`.
- Fechar ou cancelar volta para a página do livro, **sem reabrir o sheet**, e nada é criado.

### 4.4 Criação, erro no título

A leitora apagou o título e saiu do campo, com a descrição preenchida.

- Campo `Título` com borda de 1.5px `rubi`.
- No lugar do helper, em `caption` `rubi`: `Dê um título para a lista.` O contador continua à direita, em `grafite`, com `0/80`.
- Botão `Criar lista` desabilitado.
- Sem banner no topo: o erro é do campo e mora no campo (design §4.2). Ele aparece ao sair do campo ou ao tentar enviar, nunca a cada tecla.
- **Título acima do limite** usa a mesma forma: o contador passa a `rubi` (`84/80`) e a mensagem é `Use até 80 caracteres no título.` O campo não corta o texto sozinho: a leitora decide o que tirar. Descrição acima do limite: contador `rubi` e `Use até 300 caracteres na descrição.`
- Título só com espaços conta como vazio.

### 4.5 Criando

Depois do toque em `Criar lista` com o formulário do 4.2.

- Campos desabilitados, com o texto em `grafite`; a faixa continua como está.
- Botão primário com o texto `Criando lista`, em `musgo` pleno, sem spinner e sem esmaecer. No modo "a partir de um livro", o texto é o mesmo.
- Se o servidor demorar além de três segundos, aparece abaixo do botão, em `caption` `grafite`, centralizado: `O serviço está iniciando. Isso pode levar alguns segundos.`
- Ao concluir, a tela se fecha e abre a lista recém-criada, vazia. No modo "a partir de um livro", volta para a página do livro com o toast `Torto Arado entrou na lista Romances do sertão.` e a ação `Ver lista`.

### 4.6 Criação, erro do servidor

O servidor não respondeu ou recusou por falha temporária. O formulário volta a ser editável, **com tudo o que foi digitado**.

- `space-6` acima das ações, banner inline de largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Não foi possível criar a lista. Verifique sua conexão e tente de novo.`
- O botão primário volta a `Criar lista`, habilitado. Tocar de novo reenvia **a mesma solicitação** (RNF-ERR-04): se a primeira tiver chegado, não nasce uma segunda lista.
- No modo "a partir de um livro", se a lista for criada e o livro não entrar, a lista fica criada e vazia, e o toast da página do livro diz `A lista Romances do sertão foi criada, mas Torto Arado não entrou. Tente pelo menu do livro.` Não precisa de artboard.
- Se o servidor recusar um campo por validação, o erro vai para o campo, na forma do 4.4, e o banner não aparece.

### 4.7 Edição

A leitora abriu `Editar lista` de `Contos que eu indico` e corrigiu o título.

- Título do header: `Editar lista`.
- Título `Contos para quem acha que não gosta de conto`, contador `44/80`; descrição salva, com o contador `85/300`.
- Faixa de perfil público.
- Botão primário `Salvar alterações`, habilitado porque algo mudou. `Cancelar` abaixo.
- **Zona de exclusão** (design §4.19): `space-8` depois de `Cancelar`, divisor de 1px `linha`, `space-5`; título em `caption` `grafite`: `Excluir esta lista`; `space-3`; botão destrutivo em **outline** `rubi` (borda de 1px `rubi`, texto `rubi`, fundo transparente, `radius` 12), largura total, 48px: `Excluir lista`.
- A zona de exclusão **não existe** nos artboards de criação.
- Os livros da lista **não aparecem** neste formulário: reordenar e remover moram na própria lista.
- Salvar volta para a lista, sem toast: o título novo no topo da lista é a confirmação. Erro do servidor usa o banner do 4.6 com o texto `Não foi possível salvar as alterações. Verifique sua conexão e tente de novo.` Enquanto salva, o botão diz `Salvando alterações` e a zona de exclusão fica desabilitada (borda e texto em `grafite-suave`); sem artboard próprio.

### 4.8 Edição, confirmação de exclusão

A leitora tocou em `Excluir lista`. Bottom sheet de confirmação destrutiva (design §4.11), sobre o estado 4.7 escurecido pelo scrim `#171512` a 40%.

1. Alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo.
2. Título em `title-sm` `tinta`: `Excluir a lista Contos que eu indico?`
3. `space-3`, texto em `body` `grafite`: `A lista e a ordem dos 7 livros saem do seu perfil. Os livros continuam na sua estante e no acervo. Não dá para desfazer.`
4. `space-6`, botão destrutivo em outline `rubi`, largura total, 48px: `Excluir lista`.
5. `space-3`, botão textual `grafite`, largura total: `Cancelar`.

O título nomeia a lista pelo título **salvo**, e não pelo editado e ainda não salvo. O foco entra em `Cancelar`. Enquanto exclui, o botão destrutivo diz `Excluindo lista`, sem spinner. Confirmada, a tela volta ao índice de listas, já sem a lista, com o toast `Lista excluída.` no rodapé. Sem desfazer.

### 4.9 Edição, perfil privado

O estado 4.7 com uma única diferença: a faixa diz `Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.` Serve para conferir que o texto muda com o perfil e que **não aparece chave de visibilidade** em nenhum dos dois casos.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

Na web o formulário é um **dialog centrado** (sobreposição modal), por cima da tela de origem. Um formulário de dois campos numa página inteira de 1440px ficaria perdido no meio da tela; no dialog ele mantém a medida do conteúdo e deixa claro de onde a leitora veio.

**Fundo do artboard: a tela de origem, sob o scrim.** Desenhe o shell web por extenso e, na área de conteúdo, a tela de origem apenas como contexto:

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px `linha`. Bloco do topo de 72px, padding lateral `space-5`, com o lockup horizontal da marca à esquerda (símbolo da folha sobre livro aberto seguido de `Lê Ai`, os dois em `musgo`, `space-3` de gap, 24px de altura) e `SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo, `space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro de padding lateral `space-3`: `Estante` (`Books`), `Descobrir` (`Compass`), `Feed` (`Newspaper`), `Perfil` (`UserCircle`). Cada item com 44px de altura, `radius` 12, padding lateral `space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em `body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo transparente. Ativo: fundo `musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`. **Item ativo: `Perfil`** nos artboards 5.1, 5.3, 5.4 e 5.5, porque o índice de listas é uma área do perfil; **`Estante`** no 5.2, porque a página de `Torto Arado` foi aberta da estante. Nada no rodapé da sidebar.

**Sem sino na web.** Notificações estão fora do escopo do cliente web (`REQUISITOS.md` §2.1).

**Web, área de conteúdo.** À direita da sidebar, fundo `papel`, padding lateral `space-8`, header de 72px com o título da tela de origem em `display` `tinta` à esquerda (`Perfil` ou, no 5.2, sem título porque é a página do livro). Abaixo, o conteúdo da origem representado por **blocos neutros** em `papel-elevado`, sem texto legível, na forma aproximada da tela (uma coluna estreita e uma larga no perfil; capa e colunas na página do livro). A origem é desenhada em outros prompts; aqui ela só dá contexto e fica toda sob o scrim.

**Scrim** `#171512` a 40% cobrindo sidebar e conteúdo.

**Dialog.** Centrado na viewport, **480px de largura**, fundo `papel`, `radius-xl` nos quatro cantos, `elev-3`, padding `space-6`, sem alça. Altura pelo conteúdo, com no máximo 90% da viewport; o que passar disso rola dentro do dialog, com o cabeçalho e as ações fixos.

- **Cabeçalho do dialog:** título em `title-lg` `tinta` à esquerda (`Nova lista` ou `Editar lista`) e, à direita, `X` (Phosphor, `regular`, 20px, `grafite`) num alvo de 40px com rótulo acessível `Fechar sem salvar`; hover com fundo `linha` e `radius` 12. `space-6` abaixo.
- **Corpo:** os mesmos blocos do mobile, na mesma ordem, com campos de **44px** de altura. A área de descrição tem 120px de altura mínima. Contadores e helpers idênticos.
- **Ações:** `space-6` depois da faixa, alinhadas à direita, na mesma linha: botão textual `grafite` `Cancelar` e, `space-3` depois, o botão primário pill de 40px com o rótulo do estado. O primário tem a largura do rótulo, não a do dialog.
- **Zona de exclusão** (só na edição): `space-6` depois das ações, divisor de 1px `linha` de borda a borda do conteúdo, `space-5`, título `Excluir esta lista` em `caption` `grafite`, `space-3`, botão destrutivo em outline `rubi` de **40px e largura do rótulo**, alinhado à esquerda: `Excluir lista`.
- **Estados de ponteiro:** hover do primário em `musgo-vivo`; hover do textual com texto `tinta`; hover do destrutivo com fundo `rubi-fundo`. Foco de teclado visível em todos, com anel de 2px `musgo` afastado 2px do elemento.
- `Esc` e clique no scrim fecham sem salvar, como o `X`.

**Abaixo de 768px** o dialog vira a tela cheia do mobile, com o header da seção 4. Entre 768px e 1024px a sidebar nasce retraída em 72px, e o dialog continua com 480px.

### 5.1 Criação, vazio com foco

Aberto a partir de `Nova lista` na aba `Listas` do perfil. Campo `Título` em foco (borda de 1.5px `musgo`), contadores em `0/80` e `0/300`, faixa de perfil público, `Criar lista` desabilitado.

### 5.2 Criação a partir de um livro

Aberto pela linha `Criar lista` do dialog `Adicionar à lista`, sobre a página de `Torto Arado`. O dialog de adicionar se fecha e este abre no lugar, sem dois dialogs empilhados. Card de confirmação de `Torto Arado` com a capa de **80 por 120px** (medida web da variante Confirmação), título `Romances do sertão` com `18/80`, descrição vazia, faixa, e o primário `Criar lista com este livro` em **hover**.

### 5.3 Criação, erro no título

O 4.4 no dialog: título vazio depois de tocado, borda `rubi`, `Dê um título para a lista.`, primário desabilitado. O foco de teclado está no `Cancelar`, com o anel visível, para conferir o foco no botão textual.

### 5.4 Edição

O 4.7 no dialog: `Editar lista`, título corrigido com `44/80`, descrição salva, faixa, ações e a zona de exclusão no fim.

### 5.5 Edição, confirmação de exclusão

A leitora clicou em `Excluir lista`. **O conteúdo do mesmo dialog é trocado** pela confirmação destrutiva, em vez de abrir um segundo dialog por cima do primeiro:

- Título em `title-sm` `tinta`: `Excluir a lista Contos que eu indico?`
- `space-3`, texto em `body` `grafite`: `A lista e a ordem dos 7 livros saem do seu perfil. Os livros continuam na sua estante e no acervo. Não dá para desfazer.`
- `space-6`, botões lado a lado, alinhados à direita, **`Cancelar` primeiro**: botão textual `grafite` `Cancelar` e botão destrutivo em outline `rubi`, 40px, `Excluir lista`.
- O foco entra em `Cancelar`, com o anel visível. `Cancelar` e `Esc` voltam ao formulário de edição **com as mudanças não salvas preservadas**.
- Troca de conteúdo em crossfade de `dur-base`; estática sob `prefers-reduced-motion`.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem. Os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

### 6.1 Criação a partir de um livro, mobile

O 4.3 no escuro:

- Fundo `noite`. Título e `X` do header em `papel-suave`.
- Labels, helpers e contadores em `grafite-claro`.
- Card de confirmação em `noite-elevada`, **mais claro** que o fundo; título em `papel-suave`, autor em `grafite-claro`, editora em `grafite-fundo-escuro`.
- Campos em `noite-elevada`, borda `linha-noite`, texto em `papel-suave`, placeholder em `grafite-fundo-escuro`; foco com borda de 1.5px `musgo-claro`.
- Faixa com fundo `musgo-fundo-escuro`, ícone e texto em `musgo-claro`.
- Botão primário com fundo `musgo-claro` e texto `noite`; `Cancelar` em `grafite-claro`.

### 6.2 Edição, mobile

O 4.7 no escuro, com o tratamento do 6.1 e a zona de exclusão: divisor `linha-noite`, título em `grafite-claro`, botão destrutivo em outline `rubi-claro` com texto `rubi-claro`, fundo transparente.

### 6.3 Edição, web

O 5.4 no escuro: sidebar em `noite-elevada` com borda direita `linha-noite`, `Perfil` ativo com fundo `musgo-fundo-escuro` e ícone e rótulo em `musgo-claro`; área de conteúdo em `noite` com os blocos neutros em `noite-elevada`; scrim preto a 60%; dialog em `noite-elevada`, com o mesmo tratamento de campos, faixa e zona de exclusão do 6.2.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de texto com label acima, helper sempre visível e estado de erro | documento-de-design §4.2 |
| Botão primário pill, com desabilitado e carregamento | documento-de-design §4.1 |
| Botão textual e botão destrutivo em outline `rubi` | documento-de-design §4.1 e §7.8 |
| Card de livro, variante Confirmação | documento-de-design §4.5 |
| Faixa informativa neutra | documento-de-design §4.15 |
| Zona de exclusão, só no formulário de edição | documento-de-design §4.19 |
| Bottom sheet e dialog de confirmação destrutiva | documento-de-design §4.11 |
| Dialog centrado de 480px na web | documento-de-design §4.11 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6 |
| Banner inline de erro em `rubi-fundo` | documento-de-design §4.2 e prompts do Período 1 |
| Escala tipográfica, com JetBrains Mono no contador | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Shell web, sidebar | ../../periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Formulário em tela cheia sobreposta no mobile**, com `X` à esquerda, título e sem sino nem barra inferior. O `criar-desafio` do mesmo período manteve o shell com seta de voltar; aqui a tela é sobreposição. Os dois padrões precisam ser reconciliados.
2. **Formulário dentro do dialog de 480px na web**, com cabeçalho `título` mais `X`, ações alinhadas à direita e zona de exclusão dentro do dialog. O §4.11 cita "formulários curtos como o de §5.4", mas não desenha zona de exclusão dentro de dialog.
3. **Troca de conteúdo do dialog pela confirmação destrutiva** (5.5), em vez de empilhar dois dialogs.
4. **Contador de caracteres** na linha do helper, à direita, em JetBrains Mono, que passa a `rubi` acima do limite.
5. **Área de texto de várias linhas** com altura mínima e crescimento até um teto. O §4.2 só define campo de uma linha.
6. **Toast de confirmação** com barra `musgo` e ação textual. O §7.6 define a forma, não a posição, a duração nem a ação.

**Pendências abertas por este prompt**, a registrar no arquivo da feature:

- **Limites de título e descrição** (80 e 300 caracteres) são provisórios. O contrato ainda não fixou (decisão do dono, já registrada em `feature-F-LST.md`).
- **Título repetido** entre listas da mesma dona é permitido neste desenho: nada no requisito proíbe. Ratificar.
- **Duração do toast** não definida pelo documento de design.
- **Criação a partir de um livro em duas chamadas** (criar a lista, depois adicionar o livro) abre o caso de lista criada sem o livro (4.6). Se o contrato aceitar o livro no `POST /listas`, o caso desaparece.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header ou do dialog, criação | `Nova lista` |
| Título do header ou do dialog, edição | `Editar lista` |
| `X`, rótulo acessível | `Fechar sem salvar` |
| Label do livro de origem | `Este livro entra na lista` |
| Card do livro de origem | `Torto Arado` · `Itamar Vieira Junior` · `Todavia · 2019 · 264 páginas` |
| Label do título | `Título` |
| Placeholder do título | `Ex.: Para ler nas férias` |
| Helper do título | `É o nome que aparece no seu perfil.` |
| Contador do título | `0/80` · `19/80` · `18/80` · `44/80` · `84/80` |
| Label da descrição | `Descrição (opcional)` |
| Placeholder da descrição | `O que junta estes livros?` |
| Helper da descrição | `Aparece abaixo do título, na página da lista.` |
| Contador da descrição | `0/300` · `67/300` · `85/300` |
| Faixa, perfil público | `Seu perfil é público: qualquer leitor pode ver esta lista.` |
| Faixa, perfil privado | `Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.` |
| Erro, título vazio | `Dê um título para a lista.` |
| Erro, título longo | `Use até 80 caracteres no título.` |
| Erro, descrição longa | `Use até 300 caracteres na descrição.` |
| Botão primário | `Criar lista` · `Criar lista com este livro` · `Salvar alterações` |
| Botão primário, enviando | `Criando lista` · `Salvando alterações` |
| Botão textual | `Cancelar` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro do servidor, criação | `Não foi possível criar a lista. Verifique sua conexão e tente de novo.` |
| Erro do servidor, edição | `Não foi possível salvar as alterações. Verifique sua conexão e tente de novo.` |
| Toast, criada a partir do livro | `Torto Arado entrou na lista Romances do sertão.` + `Ver lista` |
| Toast, criada sem o livro | `A lista Romances do sertão foi criada, mas Torto Arado não entrou. Tente pelo menu do livro.` |
| Zona de exclusão, título | `Excluir esta lista` |
| Zona de exclusão, botão | `Excluir lista` |
| Confirmação, título | `Excluir a lista Contos que eu indico?` |
| Confirmação, texto | `A lista e a ordem dos 7 livros saem do seu perfil. Os livros continuam na sua estante e no acervo. Não dá para desfazer.` |
| Confirmação, botões | `Excluir lista` · `Cancelar` |
| Confirmação, excluindo | `Excluindo lista` |
| Toast, depois de excluir | `Lista excluída.` |

---

## 9. Acessibilidade e interação

- **Alvo de toque de 48px** no mobile em campos, botões e no `X`; na web, 40px nos botões e 44px nos campos, com foco de teclado visível em todos.
- **Helper, contador e erro ligados ao campo** por descrição acessível: o leitor de tela lê `Título. É o nome que aparece no seu perfil. 16 de 80 caracteres.` O contador é anunciado ao chegar perto do limite e ao passar dele, não a cada tecla.
- **Foco:** ao abrir, o foco vai para o campo `Título`. Depois de um envio recusado por validação, o foco vai para o primeiro campo inválido. Na web o foco fica preso dentro do dialog e volta ao botão que o abriu quando ele fecha.
- **Contraste:** labels, helpers e contadores em `grafite` sobre `papel` passam em AA; o botão desabilitado usa `grafite-suave` sobre `linha` e é o único lugar onde esse contraste menor aparece, porque o botão não é acionável. No escuro, `grafite-claro` e `papel-suave`.
- **Toda exclusão passa por confirmação** (RNF-USA-04), com botão destrutivo em outline, nunca preenchido, e foco inicial em `Cancelar`.
- **Texto do usuário é texto.** Título e descrição são exibidos como texto puro, com escape (RNF-SEC-14): nada vira link nem formatação.
- **Motion:** tela cheia do mobile entra de baixo em `dur-slow` com `ease-out` e sai em `dur-base` com `ease-in`, como um sheet; dialog web com deslize curto de 16px e fade em `dur-base`; foco de campo em `dur-fast`; press em `scale(0.98)`. Tudo estático sob `prefers-reduced-motion`.
- **Texto grande:** com o escalonamento de fonte do sistema aumentado, helper e contador passam para duas linhas, o contador embaixo, em vez de cortar o helper.

---

## 10. O que não fazer nesta tela

**Específico desta tela**

- **Não ofereça chave de visibilidade** (pública, privada, só amigos) para a lista. A lista segue a privacidade do perfil (RN-08).
- **Não peça capa, cor, ícone, emoji, tag nem categoria** para a lista. Ela é título e descrição.
- **Não ponha seletor ou busca de livros no formulário.** Livros entram pela página do livro, no sheet `Adicionar à lista`.
- **Não mostre os livros da lista na edição** nem controles de reordenar ou remover: isso mora na lista.
- **Não ponha a zona de exclusão no formulário de criação.**
- **Não peça confirmação para fechar ou cancelar.**
- **Não formate a descrição:** sem negrito, sem link, sem Markdown, sem serifa.
- **Não ofereça lista colaborativa, convite para editar nem "seguir lista".** A lista tem uma dona.
- **Não diga que a lista vai aparecer no feed nem que alguém será notificado.** Listas não geram atividade nem notificação.
- **Não empilhe dois dialogs na web.** A confirmação troca o conteúdo do dialog.
- **Não corte o título digitado sozinho** ao passar do limite.

**Tipografia (design §7.1)**

- Não use Inter como fonte de interface: a UI é Manrope.
- Não use Instrument Serif nem Fraunces. A serifa do produto é Newsreader, e ela não aparece nesta tela.
- Não misture família dentro de um título: ênfase é itálico da mesma família.
- Não ponha overline em cima dos campos. O label é `label` `grafite`, em caixa normal.
- Não use eyebrow numerado nem indicador de passos. É um formulário de dois campos, não um wizard.

**Cores e superfícies (design §7.2)**

- Não use a família bege quente com latão, oxblood e expresso. O acento é `musgo`.
- Não use gradiente roxo, rosa ou azul, nem mesh, nem glow neon.
- Não use gradiente em botão nem em texto de título.
- Não use sombra preta pura nem `#000000` em lugar nenhum.
- Não use textura de papel ou de madeira no fundo.

**Layout (design §7.3)**

- Não estique o formulário na largura da página web: ele vive no dialog de 480px.
- Não deixe conteúdo essencial escondido em hover.
- Não deixe de colapsar: abaixo de 768px o dialog vira a tela cheia do mobile.

**Motion (design §7.4)**

- Nada de scroll hijacking, parallax ou marquee.
- Nada de loop infinito, spinner ou ícone que pulsa. Enviando é o texto do botão mudando.
- Nada de animação de comemoração ao criar a lista.

**Conteúdo e copy (design §7.5)**

- Zero em-dash em qualquer texto visível. Use dois pontos, vírgula ou reescreva.
- Nada de número fake-preciso. Os números desta tela são mock declarado e sempre aparecem com unidade.
- Nada de label poético: os labels dizem o que o campo é.
- Nada de emoji na copy nem no placeholder.

**Componentes e assets (design §7.6)**

- Nada de ícone desenhado à mão: todos os ícones são Phosphor.
- Nada de raio na capa do livro: retângulo de canto vivo.
- Nada de ícone de livro genérico no lugar de capa ausente: o placeholder mostra o título.
- Nada de toast com fundo saturado verde ou vermelho: toast é `papel-elevado` com barra lateral fina.

**Modo escuro (design §7.7)**

- Nada de fundo `#000000`: o fundo é `noite`.
- Nada de só inverter a paleta: no escuro o campo e o dialog são `noite-elevada`, mais claros que o fundo, e o acento é `musgo-claro`.
- Nada de meia tela clara e meia escura.

**Interações destrutivas (design §7.8)**

- Nada de excluir sem confirmação.
- Nada de botão destrutivo preenchido em `rubi`: é outline.
- Nada de desfazer depois de excluir.

**Formulários (design §7.9)**

- Nada de placeholder no lugar do label: o label fica acima, sempre.
- Nada de helper que só aparece depois do erro: helpers e contadores ficam visíveis o tempo todo.
- Nada de mensagem de erro genérica, como "Algo deu errado" ou "Campo inválido". O erro diz o que fazer.

**Landing e web (design §7.11)**

- Nada de faixa decorativa, ilustração de boas-vindas nem botão flutuante.

**Fora de escopo por decisão (design §7.12)**

- Nada de camada de obra, login social, mensagem direta, clube de leitura, grupo, fórum, leitura de e-book, medalha, conquista ou ranking.
