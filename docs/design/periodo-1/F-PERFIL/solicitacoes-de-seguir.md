# F-PERFIL · Solicitações de seguir

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-PERFIL.md
**Requisitos:** RF-SOC-06 (solicitar para seguir um perfil privado; o destinatário **aceita ou recusa**)
**Não funcionais:** RNF-SEC-02 (só o destinatário lê e decide as próprias solicitações), RNF-DES-02 (lista paginada com limite imposto pelo servidor), RNF-USA-03, RNF-USA-04 (confirmação ao recusar), RNF-USA-05, RNF-ERR-09
**Regras de negócio:** RN-08 (aceitar é o que abre estante, notas e resenhas de um perfil privado)
**Versão web:** sim (RF-SOC-06 tem marcação na coluna Web de `REQUISITOS.md` §5.9, e no cliente web esta é a **única** porta de entrada, porque não há sino)

---

## 1. Contexto

A caixa de quem pediu para seguir um perfil privado. Cada pedido tem duas saídas: aceitar, que cria o seguimento e abre o conteúdo restrito de RN-08, ou recusar, que descarta o pedido. Tela empilhada sobre a área `Perfil`.

Chega de três lugares: da linha `3 solicitações para seguir você` em [`meu-perfil.md`](meu-perfil.md), da notificação de solicitação no mobile em [`../F-NOT/notificacoes.md`](../F-NOT/notificacoes.md) e da linha de aviso no perfil de quem pediu, em [`perfil-de-outro-leitor.md`](perfil-de-outro-leitor.md).

**No cliente web ela é indispensável.** Notificações estão fora do escopo da web (`REQUISITOS.md` §2.1), então sem esta tela um pedido feito a um perfil privado não teria onde ser respondido naquele cliente.

Duas coisas que ela precisa resolver:

- **Aceitar é irreversível na prática, e recusar também.** Aceitar dá acesso imediato à estante, às notas e às resenhas; recusar apaga o pedido. **Só recusar pede confirmação** (RNF-USA-04), porque é a que descarta algo; aceitar tem desfazer natural, que é remover a pessoa dos seguidores em [`seguidores-e-seguidos.md`](seguidores-e-seguidos.md), e o texto da tela diz isso.
- **A decisão precisa de contexto.** Um nome de usuário sozinho não diz quem é a pessoa. O item traz avatar, nome, biografia e há quanto tempo o pedido está esperando, e o toque no nome abre o perfil público dela antes de decidir.

**Escopo desta entrega.** Esta tela lista **as solicitações recebidas**. Não existe lista de solicitações enviadas: o contrato de `identidade` não a prevê e nenhum RF a pede. O estado de pedido enviado aparece no perfil da pessoa, no artboard 4.4 de `perfil-de-outro-leitor.md`.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Solicitações de seguir · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- Espaçamento generoso entre artboards, com as linhas claramente separadas.

---

## 2. Contexto do design

```
Produto: Lê Ai, aplicativo social de leitura brasileiro, no modelo Skoob e
Letterboxd. Público de 18 a 30 anos, interface em pt-BR, uso predominante em
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

**Três solicitações pendentes**, da mais recente para a mais antiga:

| Nome | Nome de usuário | Biografia truncada | Quando |
|---|---|---|---|
| Caio Ferraz | `@caioferraz` | `Leio no busão. Terror nacional e crônica.` | `há 2 horas` |
| Nadia Sampaio | `@nadiasampaio` | `Ensaio, história do Brasil e uma pilha que não diminui.` | `há 3 dias` |
| Otávio Brandão | `@otaviobrandao` | sem biografia | `há 1 semana` |

**Contagem no cabeçalho da lista:** `3 solicitações`.

**Paginação:** o servidor entrega 20 por página, e a lista carrega a próxima por rolagem.

Todo número aparece com unidade.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell.

Toda tela autenticada é desenhada dentro do shell do produto. O shell é
idêntico em todas elas e precisa ser desenhado por extenso aqui.

**Mobile, barra inferior.** Fixa no rodapé da viewport, acima da área segura.
Altura de 64px mais a área segura, fundo `papel-elevado`, divisor de 1px
`linha` no topo, sem sombra. Quatro itens de largura igual: `Estante`,
`Descobrir`, `Feed`, `Perfil`. Cada item empilha ícone de 24px acima e rótulo
em `caption` abaixo, com `space-1` de gap, centralizado, e a área tocável tem
no mínimo 48px de altura. Ícones Phosphor: `Books` para Estante, `Compass`
para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. Inativo:
ícone peso `regular`, cor `grafite`;
rótulo em `caption` `grafite`. Ativo: ícone peso `fill`, cor `musgo`; rótulo
em `caption` peso 600, cor `musgo`. Sem pill de fundo atrás do item ativo,
sem indicador deslizante, sem ícone que salta.

**Mobile, header.** Altura de 72px mais a área segura, padding lateral
`space-5`, fundo `papel`, sem sombra. À esquerda o título da tela em
`display`, cor `tinta`, alinhado à base. À direita, na mesma linha, as ações
contextuais da tela seguidas do sino `Bell` (Phosphor, `regular`, 24px,
`tinta`), com `space-4` de gap. O sino é fixo em toda tela autenticada.
Badge de não lidas: círculo de 18px, fundo `musgo`, encostado no canto
superior direito do ícone, número centralizado em 11px peso 600 cor `papel`;
acima de nove mostra `9+`; sem não lidas, o badge simplesmente não existe.

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida
por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px
`linha`. Bloco do topo de 72px, padding lateral `space-5`, com o wordmark
`Lê Ai` em Space Grotesk 600, token `title`, cor `tinta`, à esquerda, e
`SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo,
`space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro
de padding lateral `space-3`: altura de 44px, `radius` 12, padding lateral
`space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em
`body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo
transparente. Hover: fundo `linha`, transição `dur-fast`. Ativo: fundo
`musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`.

**Sem sino na web.** Notificações estão fora do escopo do cliente web
(REQUISITOS.md §2.1), então o ícone não existe na sidebar nem no header web.
Nada no rodapé da sidebar: sem suporte, sem versão, sem crédito.

**Web, área de conteúdo.** À direita da sidebar, fundo `papel`, padding
lateral `space-8`, com header próprio de 72px: título da tela em `display`
`tinta` à esquerda e ações contextuais à direita, sem o sino.

**Ponto de virada.** Entre 768px e 1024px a sidebar nasce retraída em 72px,
só ícones. Abaixo de 768px a sidebar deixa de existir e a barra inferior do
mobile assume. Não existe menu hamburguer em nenhum tamanho.


### Header desta tela

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, voltando à tela de origem.
- Título `Solicitações` em `display` `tinta`, à esquerda, alinhado à base.
- `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita, com o badge de não lidas quando houver.
- **A barra inferior continua visível**, com `Perfil` ativo.

### Linha de contexto

Logo abaixo do header, padding lateral `space-5`, `space-4` de respiro acima e abaixo.

- Em `caption` `grafite`: `3 solicitações`.
- Abaixo, em `caption` `grafite`, uma linha que explica o efeito antes da decisão: `Quem você aceitar passa a ver sua estante, suas notas e suas resenhas.`
- Divisor de 1px `linha` de largura total abaixo.

### Item da lista

Cada solicitação ocupa um bloco com padding lateral `space-5` e `space-4` de padding vertical, separado por divisor de 1px `linha`. Duas linhas internas:

**Linha superior:**

- Avatar circular de 48px à esquerda, `space-4` de gap. O avatar e o nome levam ao perfil público de quem pediu.
- No meio, empilhados: nome em `title-sm` `tinta`, `@username` em `caption` `grafite-suave`, biografia em `caption` `grafite` truncada em uma linha. Quem não tem biografia não mostra a terceira linha, sem texto substituto.
- À direita, o tempo de espera em `caption` `grafite-suave`: `há 2 horas`.

**Linha inferior**, `space-3` abaixo, alinhada à direita do bloco, com `space-3` de gap entre os dois botões, cada um com 40px de altura e `radius` 12:

- **`Recusar`:** outline `rubi`, borda de 1px, fundo transparente, texto em `caption` peso 600 `rubi`.
- **`Aceitar`:** primário, fundo `musgo`, texto `papel` em `caption` peso 600, `radius-full`.
- **Os dois botões em linha própria, não à direita do texto.** Em 390px de largura, avatar, três linhas de texto e dois botões na mesma linha esmagariam o nome, e o nome é o que sustenta a decisão.
- **O botão destrutivo vem antes do primário**, à esquerda dele: o primário fica na posição de descanso do polegar, e o destrutivo fica onde o toque acidental é menos provável.

### 4.1 Padrão, três solicitações

Estado principal. Header, linha de contexto com `3 solicitações`, três blocos empilhados. Barra inferior com **Perfil** ativo.

### 4.2 Confirmar recusa

Modal centrado sobre a tela, conforme RNF-USA-04.

- Fundo da tela escurecido por uma camada em `tinta` a 40% de opacidade.
- Card centrado, largura de 320px, `radius-lg`, fundo `papel-elevado`, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Recusar a solicitação de Nadia?`
- `space-3`, texto em `body` `grafite`: `O pedido é descartado e ela não recebe aviso. Ela pode pedir de novo depois.`
- `space-6`, dois botões empilhados com `space-3` de gap: botão **outline** `rubi` de 48px `Recusar` e botão textual `grafite` `Cancelar`.
- **A frase diz que não há aviso** porque essa é a dúvida real de quem recusa, e esconder isso faria a pessoa evitar a decisão.

### 4.3 Aceitando

O leitor tocou em `Aceitar` no primeiro item.

- O bloco do item permanece no lugar, com os dois botões substituídos por uma linha em `caption` `musgo`, alinhada à direita, com `Check` (Phosphor, `bold`, 16px) à esquerda: `Aceito`.
- O restante do item fica com opacidade reduzida em `dur-fast`, e o bloco sai da lista no fim da transição, sem salto do conteúdo abaixo.
- A contagem da linha de contexto passa a `2 solicitações`.
- **Sem toast, sem confete, sem modal de sucesso.** A confirmação é o próprio item mudando.
- **Aceitar não pede confirmação.** O desfazer existe e é explícito: remover a pessoa em `Conexões`.

### 4.4 Nenhuma solicitação

- Header e linha de contexto ausente: sem pedidos, não há o que contar.
- Bloco centralizado no espaço da lista, `space-6` entre os elementos:
  - `UserPlus` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhuma solicitação pendente`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Pedidos para seguir seu perfil privado aparecem aqui.`
- Quando o perfil é **público**, o texto é outro, porque nesse caso não existem pedidos por definição: `Seu perfil é público, então quem quiser seguir você segue na hora. Pedidos só existem em perfil privado.` e um botão textual `musgo` `Editar perfil`, que leva a [`editar-perfil.md`](editar-perfil.md).
- **Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.**

### 4.5 Carregando

- Header real.
- Lista substituída por **skeleton estático**: três blocos, cada um com círculo de 48px, três barras em `capa-placeholder` com `radius-sm` e dois retângulos de 40px na linha inferior.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** (RNF-ERR-09).

### 4.6 Carregando mais

A rolagem chegou ao fim da primeira página de 20.

- Os vinte blocos carregados continuam visíveis e utilizáveis.
- Abaixo do último, **um bloco de skeleton** no mesmo desenho de 4.5, com um único fade.
- **Nada muda no topo.** O carregamento incremental não recarrega a lista nem move o scroll.

### 4.7 Erro de carregamento

- Header real.
- Banner inline no lugar da lista, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar suas solicitações. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo.
- Área de conteúdo com padding lateral `space-8`, header de conteúdo de 72px com o botão textual de retorno `Perfil` e o título `Solicitações` em `display` `tinta`. Sem sino.
- **Coluna única de no máximo 720px**, alinhada à esquerda: a decisão é uma leitura por vez, e duas colunas de pedidos convidariam ao clique apressado.
- Cada solicitação vira um card com `radius` 12, borda de 1px `linha`, padding `space-4`, com `space-3` de gap entre cards. Na largura da web, **os dois botões voltam para a direita do texto**, na mesma linha do avatar e do nome, com 36px de altura: aqui cabe, e a linha inferior deixa de ser necessária.
- `hover` no card com fundo `papel-elevado`; `hover` no `Aceitar` levando `musgo` para `musgo-vivo`; `hover` no `Recusar` intensificando a borda `rubi`. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** os botões voltam para a linha inferior e o card vira o bloco com divisor do mobile, com a sidebar dando lugar à barra inferior.

### 5.1 Padrão, três solicitações

Sidebar com `Perfil` ativo, linha de contexto, três cards na coluna de 720px com os botões à direita.

### 5.2 Confirmar recusa

O modal de 4.2 centrado na viewport, com 360px de largura, sobre a camada escurecida, com os dois botões **lado a lado**: `Cancelar` textual à esquerda e `Recusar` outline `rubi` à direita, alinhados à direita do card.

### 5.3 Nenhuma solicitação

Bloco de vazio centralizado na área de conteúdo, na variante de perfil privado, sem botão.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título e ícones do header em `papel-suave`. Linha de contexto em `grafite-claro`. Nome em `papel-suave`, `@username` e tempo de espera em `grafite-fundo-escuro`, biografia em `grafite-claro`. Divisores em `linha-noite`. Botão `Aceitar` com fundo `musgo-claro` e texto `noite`; botão `Recusar` com borda e texto em `rubi-claro`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com **Perfil** ativo em `musgo-claro`.
- **Mobile, confirmar recusa.** Card em `noite-elevada`, **mais claro** que o fundo, camada de escurecimento em `noite` a 60%, título em `papel-suave`, texto em `grafite-claro`, botão destrutivo com borda e texto `rubi-claro`.
- **Web, padrão.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Cards com borda `linha-noite` e hover em `noite-elevada`.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Botão primário pill, botão outline destrutivo e botão textual | documento-de-design §4.1 e §7.8 |
| Modal de confirmação de ação destrutiva | documento-de-design §7.8 e RNF-USA-04 |
| Banner de erro em `rubi-fundo` | documento-de-design §3.1.3 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |
| Item de pessoa, com avatar de 48px, nome, `@username` e biografia truncada | periodo-1/F-PERFIL/buscar-leitor.md |
| Carregamento incremental com skeleton no fim da lista | periodo-1/F-PERFIL/seguidores-e-seguidos.md |

**Componentes que ainda não existem na fonte.** Dois elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **O item de decisão com par de botões**, que é o item de pessoa mais `Aceitar` e `Recusar`, com arranjo diferente no mobile e na web. A ordem, destrutivo à esquerda e primário à direita, precisa valer em todo par de ação do produto.
2. **A transição de saída do item decidido**, com o rótulo `Aceito` substituindo os botões antes de a linha sair da lista. É a alternativa adotada ao toast, que a banlist proíbe com fundo saturado e que aqui seria redundante.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Solicitações` |
| Contagem | `3 solicitações` |
| Linha de efeito | `Quem você aceitar passa a ver sua estante, suas notas e suas resenhas.` |
| Tempo de espera | `há 2 horas`, `há 3 dias`, `há 1 semana` |
| Botão primário do item | `Aceitar` |
| Botão destrutivo do item | `Recusar` |
| Item aceito | `Aceito` |
| Modal, título | `Recusar a solicitação de Nadia?` |
| Modal, texto | `O pedido é descartado e ela não recebe aviso. Ela pode pedir de novo depois.` |
| Modal, botão destrutivo | `Recusar` |
| Modal, botão textual | `Cancelar` |
| Vazio, perfil privado, título | `Nenhuma solicitação pendente` |
| Vazio, perfil privado, texto | `Pedidos para seguir seu perfil privado aparecem aqui.` |
| Vazio, perfil público, texto | `Seu perfil é público, então quem quiser seguir você segue na hora. Pedidos só existem em perfil privado.` |
| Vazio, perfil público, botão | `Editar perfil` |
| Erro, texto | `Não foi possível carregar suas solicitações. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |
| Web, retorno | `Perfil` |

O modal usa o **primeiro nome** da pessoa, não o username.

Zero em-dash em toda a copy. Zero emoji. Todo número aparece com unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no mobile no `ArrowLeft`, na área do nome e em cada um dos dois botões. Os botões de 40px têm área de toque expandida para 48px, e o `space-3` entre eles impede o toque errado.
- Cada botão tem rótulo acessível que nomeia a pessoa, no formato `Aceitar solicitação de Nadia Sampaio`, para que a decisão não dependa da posição na lista.
- A ação destrutiva é distinguível **sem depender de cor**: o rótulo diz o que faz e o botão é outline, não preenchido.
- O resultado de aceitar é anunciado, e o foco vai para o item seguinte quando o bloco sai da lista, nunca para o topo da tela.
- O modal captura o foco, começa no botão `Cancelar`, fecha com `Esc` e devolve o foco ao botão `Recusar` que o abriu.
- A contagem é anunciada por extenso, no formato `3 solicitações`, e atualizada a cada decisão.
- Contraste WCAG AA no corpo nos dois temas. A biografia usa `grafite`; `@username` e tempo de espera usam o terciário, e nenhum dos dois carrega informação essencial para a decisão.
- Foco de teclado visível na web em cards e botões, na ordem visual.
- `prefers-reduced-motion` respeitado: o fade do modal, a saída do item decidido e o hover viram estáticos, e o item some sem transição.
- Recusar é ação destrutiva e sempre passa pelo modal, nas duas plataformas.

---

## 10. O que não fazer nesta tela

**Específico da decisão**

- **Não recuse sem confirmação.**
- **Não peça confirmação para aceitar.** O desfazer é explícito e mora em `Conexões`.
- **Não desenhe ação em lote**, com `Aceitar todas` ou seleção múltipla. Cada pedido é uma decisão sobre uma pessoa.
- **Não inverta a ordem dos botões** entre mobile e web: destrutivo à esquerda, primário à direita, sempre.
- **Não desenhe desfazer** depois de recusar.
- **Não prometa aviso ao recusado.** A copy diz que ele não é avisado, e a implementação precisa manter isso verdadeiro.
- Não use toast para confirmar aceite ou recusa.

**Específico da lista**

- **Não desenhe solicitações enviadas** nesta tela, nem como aba, nem como seção. Não há contrato nem requisito para elas.
- **Não misture com notificações.** A notificação avisa que existe um pedido; a decisão acontece aqui. No mobile as duas telas coexistem, e nenhuma delas duplica os botões da outra.
- **Não desenhe as solicitações como terceira aba de `Conexões`.** Administrar quem já está no grafo e decidir quem entra são coisas diferentes.
- **Não mostre dado restrito de quem pediu:** só nome, avatar e biografia, que RN-08 torna públicos. Nada de estante, contagem de livros ou resenhas de quem ainda não foi aceito.
- **Não ordene por outra coisa que não o tempo.** Nada de "mais relevantes", nada de sugestão de aceitar.
- **Não recarregue a lista inteira** ao carregar a próxima página.
- Não desenhe texto substituto para quem não tem biografia: a linha simplesmente não aparece.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. Esta tela não é nenhum deles.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.


**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.
- Nada de desfazer em ação destrutiva pesada.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo em tela de dados.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. Mobile não tem hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
