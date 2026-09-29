# F-PERFIL · Meu perfil

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-PERFIL.md
**Requisitos:** RF-SOC-01 (editar o próprio perfil, a partir daqui), RF-SOC-02 (perfil com estante, resenhas e contadores), RF-SOC-04 (perfil público ou privado), RF-SOC-08 (listas de seguidores e seguidos, a partir daqui)
**Requisito parcialmente atendido:** RF-SOC-02 cita listas do leitor, que dependem de F-LST, no Período 2. O perfil do Período 1 entrega identidade, contadores, estante e resenhas, e a pendência está registrada em `feature-F-PERFIL.md` e no README do período.
**Não funcionais:** RNF-DES-02 (listagens paginadas), RNF-USA-02, RNF-USA-03 (contraste WCAG AA), RNF-USA-05, RNF-ERR-09 (cold start tratado como carregamento)
**Regras de negócio:** RN-08 (privacidade de perfil, e o que ela esconde de terceiros), RN-14.4 (ordem de resolução da capa)
**Versão web:** sim. RF-SOC-01, RF-SOC-02, RF-SOC-04 e RF-SOC-08 têm marcação na coluna Web de `REQUISITOS.md` §5.9.

---

## 1. Contexto

A quarta área de navegação do produto, e o lugar em que o leitor se vê como os outros o veem. É **pertencimento** olhando para dentro: quem eu sou nesta rede, quantas pessoas me acompanham, o que eu já li e o que eu escrevi.

Daqui saem cinco caminhos: editar o perfil, ver seguidores, ver seguidos, responder solicitações de seguir e abrir as configurações da conta. É raiz de aba, então **não tem botão de voltar**.

Três coisas que ela precisa resolver:

- **O perfil próprio mostra tudo, sempre.** RN-08 restringe o que um terceiro vê, nunca o que o dono vê. Privado ou público, o dono enxerga sua estante e suas resenhas do mesmo jeito.
- **A privacidade precisa ser legível de relance.** Quem escolheu perfil privado precisa conseguir confirmar isso sem entrar na edição, e quem escolheu público também.
- **Solicitação pendente não pode ficar escondida.** No cliente web não há sino (`REQUISITOS.md` §2.1), então o perfil é o único lugar em que um pedido para seguir aparece. A linha de solicitações é o que impede que um pedido fique semanas parado.

**Escopo desta entrega.** Esta tela é o **perfil do dono**. O perfil de outro leitor, com seguir, solicitar e conteúdo restrito, é [`perfil-de-outro-leitor.md`](perfil-de-outro-leitor.md): são duas telas, porque as ações, os estados e a autorização são diferentes.

O `documento-de-design.md` §5.5 prevê no perfil o componente de sequência diária e as estatísticas do ano. **Os dois ficam de fora do Período 1:** sequência é gamificação (F-GAM, Período 2) e estatísticas são F-STA (Período 2). Não desenhe nenhum dos dois.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Meu perfil · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Identidade do dono:**

| Campo | Valor |
|---|---|
| Nome de exibição | `Marina Beltrão` |
| Nome de usuário | `@marinableu` |
| Biografia | `Leio ficção brasileira contemporânea e um policial de vez em quando. Aceito indicação de conto.` |
| Avatar | foto de perfil, círculo de 96px |
| Privacidade | `Perfil público` no estado padrão, `Perfil privado` no artboard 4.2 |

**Contadores**, na ordem em que aparecem: `12 livros lidos`, `84 seguidores`, `97 seguindo`.

**Solicitações pendentes:** `3 solicitações para seguir você`, no artboard 4.3. Nos demais, nenhuma.

**Estante, prévia de seis capas** (livros reais, autores coerentes):

| Título | Autor | Status |
|---|---|---|
| Torto Arado | Itamar Vieira Junior | Lendo |
| Vidas Secas | Graciliano Ramos | Lido |
| Quarto de Despejo | Carolina Maria de Jesus | Lido |
| A Hora da Estrela | Clarice Lispector | Relendo |
| Ponciá Vicêncio | Conceição Evaristo | Quero ler |
| Marrom e Amarelo | Paulo Scott | Lido, capa em `capa-placeholder` pelo terceiro nível de RN-14.4 |

**Resenhas recentes**, duas, com texto truncado em três linhas:

| Livro | Trecho | Nota |
|---|---|---|
| Vidas Secas | `A seca é personagem, e Fabiano pensa em palavras que não alcança. Reli depois de dez anos e doeu mais.` | 4,5 estrelas |
| Quarto de Despejo | `O diário de Carolina não pede licença. É o livro que mais me tirou do lugar neste ano.` | 5 estrelas |

Todo número aparece com unidade. Nenhum valor é fake-preciso.

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

Raiz de aba: **sem `ArrowLeft`**, porque não há de onde voltar.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- Título `Perfil` em `display` `tinta`, à esquerda, alinhado à base.
- À direita, na mesma linha, com `space-4` de gap e nesta ordem: `MagnifyingGlass` (Phosphor, `regular`, 24px, `tinta`), que abre a busca por nome de usuário em [`buscar-leitor.md`](buscar-leitor.md); `Gear` (Phosphor, `regular`, 24px, `tinta`), que abre as configurações da conta em [`../F-AUT/configuracoes.md`](../F-AUT/configuracoes.md); e `Bell` com o badge de não lidas quando houver.
- **A lupa deste header busca pessoas, por nome de usuário exato, nunca livros.** A busca do acervo é a aba `Descobrir` e a busca da estante é a lupa da estante, no Período 2. Três lupas em três áreas, cada uma com escopo declarado no lugar em que vive. Ver a pendência na seção 7.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.
- **O título do header é `Perfil`, não o nome do leitor.** O nome aparece grande no bloco de identidade logo abaixo, e repetir nos dois lugares é ruído.

### Bloco de identidade

Conforme design §5.5. Padding lateral `space-5`, `space-6` de respiro abaixo do header, tudo centralizado na horizontal.

1. Avatar circular (`radius-full`) de 96px, com borda de 1px `linha`.
2. `space-4`, nome `Marina Beltrão` em `display` `tinta`.
3. `space-1`, `@marinableu` em `caption` `grafite-suave`.
4. `space-3`, chip de privacidade: `radius-full`, padding `space-1 space-3`, fundo `musgo-fundo`, texto em `caption` peso 600 `musgo`, com `Globe` (Phosphor, `regular`, 16px) à esquerda: `Perfil público`.
5. `space-4`, biografia em `body` `grafite`, centralizada, no máximo três linhas, com reticências ao truncar.
6. `space-5`, botão secundário `Editar perfil`, `radius` 12, 48px de altura, borda de 1px `linha`, fundo transparente, texto `body-strong` `tinta`, largura de no máximo 240px, centralizado.

### Contadores

- `space-6` abaixo do botão. Três valores em linha, largura total, separados por divisor vertical de 1px `linha`, cada um centralizado com o número em `num-inline` `tinta` acima e o rótulo em `caption` `grafite` abaixo: `12` sob `livros lidos`, `84` sob `seguidores`, `97` sob `seguindo`.
- **Os três são acionáveis.** `livros lidos` leva à estante filtrada por `Lido`; `seguidores` e `seguindo` levam a [`seguidores-e-seguidos.md`](seguidores-e-seguidos.md), cada um na sua aba.
- **Três números em uma linha com divisor, não três cards iguais** (design §7.3).
- Divisor de 1px `linha` de largura total abaixo.

### Seções de conteúdo

Duas seções, com `space-8` entre elas. Cada uma tem um cabeçalho com o título em `title-lg` `tinta` à esquerda e um botão textual `musgo` em `caption` à direita, ambos no padding lateral `space-5`.

- **`Estante`**, com `Ver tudo` à direita. Abaixo, faixa horizontal rolável de capas em proporção 2:3, altura de 132px, gap `space-3`, retângulo de canto vivo sem raio. Cada capa leva à página do livro. Sem título e sem autor sob as capas: é prévia, não é a estante.
- **`Resenhas`**, com `Ver todas` à direita. Abaixo, duas resenhas empilhadas, separadas por divisor de 1px `linha`, cada uma com:
  - Linha superior: capa de 40 por 60px à esquerda, `space-3` de gap, título em `title-sm` `tinta` e autor em `caption` `grafite` empilhados.
  - `space-2`, estrelas conforme design §4.3, com o valor ao lado em `num-inline` `caption` `grafite`: `4,5`.
  - `space-3`, trecho da resenha em `body` **Newsreader** `grafite`, truncado em três linhas. Este é um dos três lugares do produto em que a serifa entra.

### 4.1 Padrão, perfil público

Estado principal. Header, identidade com o chip `Perfil público`, contadores, prévia da estante com seis capas e as duas resenhas. Barra inferior do shell com **Perfil** ativo.

### 4.2 Perfil privado

Idêntico a 4.1, com uma diferença: o chip de privacidade vira `Perfil privado`, com `Lock` (Phosphor, `regular`, 16px) à esquerda, fundo `papel-elevado`, borda de 1px `linha` e texto em `caption` peso 600 `grafite`.

- **Nada mais muda.** O dono continua vendo estante, resenhas e contadores inteiros: RN-08 restringe o que o terceiro vê, nunca o que o dono vê.
- Abaixo do chip, `space-2`, uma linha em `caption` `grafite`: `Só quem você aceita vê sua estante e suas resenhas.`

### 4.3 Com solicitações pendentes

Idêntico a 4.1, com um bloco a mais entre os contadores e a seção `Estante`.

- Linha de largura total menos o padding lateral, fundo `musgo-fundo`, `radius` 12, padding `space-4`, com `UserPlus` (Phosphor, `regular`, 20px, `musgo`) à esquerda, `space-3` de gap.
- Texto em `body` `tinta`: `3 solicitações para seguir você`.
- `CaretRight` (Phosphor, `regular`, 20px, `musgo`) à direita. A linha inteira leva a [`solicitacoes-de-seguir.md`](solicitacoes-de-seguir.md).
- **Sem badge vermelho, sem ponto pulsando, sem contagem no ícone do header.** O acento é `musgo`, e o número está escrito com unidade.

### 4.4 Sem estante e sem resenhas

O leitor novo, que ainda não adicionou livro nenhum.

- Identidade e contadores presentes, com `0` nos três valores.
- Seção `Estante` com bloco vazio de desenho intencional, centralizado, `space-6` entre os elementos:
  - `Books` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Texto em `body` `grafite`, centralizado: `Os livros que você adicionar aparecem aqui.`
  - Botão primário pill `musgo`, 48px: `Buscar livros`, que leva à aba `Descobrir`.
- Seção `Resenhas` com bloco vazio menor, só texto em `body` `grafite` centralizado: `Suas resenhas aparecem aqui depois que você escrever a primeira.` Sem botão: escrever resenha depende de ter livro, e o CTA já está acima.
- **Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.**

### 4.5 Carregando

- Header real, com `Gear` e `Bell`.
- Corpo substituído por **skeleton estático**: círculo de 96px em `capa-placeholder`, três barras centralizadas de 32px, 13px e 15px de altura com larguras de 55%, 30% e 80%, a linha de contadores com três pares de barras, seis retângulos 2:3 na faixa da estante e dois blocos de resenha com barra de título e três barras de texto.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** do serviço (RNF-ERR-09): demora não é erro.

### 4.6 Erro de carregamento

- Header real.
- Banner inline no lugar do corpo, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar seu perfil. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

Duas colunas, conforme o padrão de perfil para web: **identidade fixa à esquerda e conteúdo em abas à direita.**

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo.
- Área de conteúdo com padding lateral `space-8` e header de conteúdo de 72px com `Perfil` em `display` `tinta` à esquerda e, à direita, dois botões secundários com `space-3` de gap: `Buscar leitor`, com `MagnifyingGlass` (Phosphor, `regular`, 20px) à esquerda do texto, e `Configurações`, com `Gear` (Phosphor, `regular`, 20px). **Sem sino.**
- **Coluna esquerda de 300px, fixa:** avatar de 120px, nome em `title-lg`, `@username`, chip de privacidade, biografia alinhada à esquerda, botão `Editar perfil` de largura total e 40px de altura, e os três contadores **empilhados**, um por linha, cada um com o número em `num-inline` `tinta` à esquerda e o rótulo em `body` `grafite` à direita, separados por divisor de 1px `linha`. Na web os contadores empilham porque a coluna é estreita e a linha de três ficaria apertada.
- **Coluna direita, o resto da largura:** faixa de abas no topo, com `Estante` e `Resenhas`, cada aba em `body-strong`, a ativa em `musgo` com sublinhado de 2px `musgo` e as demais em `grafite`. Abaixo, o conteúdo da aba.
  - Aba `Estante`: grid de capas de **seis colunas** com gap `space-4`, com título em `title-sm` e autor em `caption` sob cada capa.
  - Aba `Resenhas`: lista de resenhas em coluna única de no máximo 720px, cada uma com capa de 60 por 90px à esquerda e o texto em Newsreader à direita, separadas por divisor de 1px `linha`.
- A linha de solicitações pendentes, quando existe, entra **no topo da coluna direita**, acima das abas, com o mesmo desenho do mobile.
- `hover` no card da estante com `elev-2` na capa e título em `musgo`; foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** as duas colunas viram uma só, na ordem identidade, contadores e conteúdo, as abas viram as duas seções empilhadas do mobile e a sidebar dá lugar à barra inferior.

### 5.1 Padrão, aba Estante

Estado principal. Sidebar com `Perfil` ativo, coluna esquerda completa com o chip `Perfil público`, coluna direita com a aba `Estante` ativa e o grid de seis colunas.

### 5.2 Aba Resenhas, com solicitações pendentes

Aba `Resenhas` ativa, com as duas resenhas em coluna de 720px, e a linha `3 solicitações para seguir você` acima das abas.

### 5.3 Perfil privado, com hover na aba

Chip `Perfil privado` na coluna esquerda, aba `Estante` ativa e o cursor sobre `Resenhas`, que ganha texto `tinta` sem o sublinhado da ativa. Serve para conferir que hover e ativo são distinguíveis.

### 5.4 Carregando

Skeleton estático nas duas colunas, com a faixa de abas real e doze retângulos no grid. Um único fade de entrada, sem shimmer.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título do header e ícones em `papel-suave`. Nome em `papel-suave`, `@username` em `grafite-fundo-escuro`, biografia em `grafite-claro`. Chip `Perfil público` com fundo `musgo-fundo-escuro` e texto `musgo-claro`; chip `Perfil privado` com fundo `noite-elevada`, borda `linha-noite` e texto `grafite-claro`. Botão `Editar perfil` com borda `linha-noite` e texto `papel-suave`. Contadores com número em `papel-suave` e rótulo em `grafite-claro`, divisores em `linha-noite`. Capa em `capa-placeholder-noite`. Estrelas preenchidas em `musgo-claro`. Texto da resenha em Newsreader `grafite-claro`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com **Perfil** ativo em `musgo-claro`.
- **Mobile, com solicitações.** A linha de solicitações com fundo `musgo-fundo-escuro`, ícone e `CaretRight` em `musgo-claro`, texto em `papel-suave`.
- **Web, aba Estante.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, `Perfil` ativo com fundo `musgo-fundo-escuro`. Aba ativa em `musgo-claro` com sublinhado `musgo-claro`; abas inativas em `grafite-claro`.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Padrão de tela de perfil, com avatar, nome, bio, contadores, estante e resenhas | documento-de-design §5.5 |
| Estrela de avaliação, com meia estrela | documento-de-design §4.3 |
| Capa de livro em retângulo de canto vivo e placeholder | documento-de-design §4.5 e §7.6 |
| Botão primário pill, botão secundário e botão textual | documento-de-design §4.1 |
| Escala tipográfica e as quatro famílias, com Newsreader no corpo da resenha | documento-de-design §3.2 e §3.2.2 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que ainda não existem na fonte.** Quatro elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **O chip de privacidade** no bloco de identidade. O §5.5 não prevê indicação de perfil público ou privado, e RF-SOC-04 precisa ser visível fora da edição.
2. **A linha de solicitações pendentes.** Sem sino na web, o perfil é o único ponto de entrada de RF-SOC-06 naquele cliente.
3. **A faixa de abas da web**, com `Estante` e `Resenhas`. O §5.5 descreve o empilhamento do mobile e não define o desenho de abas.
4. **As ações do header do perfil:** o `Gear`, que leva às configurações, e a `MagnifyingGlass`, que leva à busca por nome de usuário. O §5.5 não define ações no header desta área, e **RF-SOC-03 não tinha ponto de entrada permanente em nenhum protótipo**: o `documento-de-design.md` §5.3 só a oferece dentro do vazio do feed, que some assim que o leitor segue alguém. Pôr a lupa aqui é a proposta deste prompt, e precisa de decisão do grupo.
5. **A origem do contador `livros lidos`.** O schema `ContadoresPerfil` de [`identidade.yaml`](../../../api/identidade.yaml) traz somente `seguidores` e `seguidos`; o número de livros lidos vem do endpoint autorizado de `leitura`, citado no README do Período 1. O `documento-de-design.md` §5.5 pede os três contadores, então o desenho os mantém, e a composição entre dois serviços fica registrada aqui.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Perfil` |
| Nome de exibição | `Marina Beltrão` |
| Nome de usuário | `@marinableu` |
| Biografia | `Leio ficção brasileira contemporânea e um policial de vez em quando. Aceito indicação de conto.` |
| Chip de privacidade, público | `Perfil público` |
| Chip de privacidade, privado | `Perfil privado` |
| Linha explicativa do privado | `Só quem você aceita vê sua estante e suas resenhas.` |
| Botão de edição | `Editar perfil` |
| Contador 1 | `12` sob `livros lidos` |
| Contador 2 | `84` sob `seguidores` |
| Contador 3 | `97` sob `seguindo` |
| Linha de solicitações | `3 solicitações para seguir você` |
| Título da seção 1 | `Estante` |
| Ação da seção 1 | `Ver tudo` |
| Título da seção 2 | `Resenhas` |
| Ação da seção 2 | `Ver todas` |
| Estante vazia, texto | `Os livros que você adicionar aparecem aqui.` |
| Estante vazia, botão | `Buscar livros` |
| Resenhas vazias, texto | `Suas resenhas aparecem aqui depois que você escrever a primeira.` |
| Erro, texto | `Não foi possível carregar seu perfil. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |
| Web, botões do header | `Buscar leitor` e `Configurações` |
| Web, abas | `Estante` e `Resenhas` |

Zero em-dash em toda a copy. Zero emoji. Todo número aparece com unidade, inclusive nos contadores, em que o rótulo abaixo é a unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no mobile em cada contador, no botão `Editar perfil`, na linha de solicitações, nas ações de seção e nos ícones do header.
- Cada contador é um destino anunciado por extenso para leitor de tela, no formato `84 seguidores`, e não como número solto.
- A privacidade é distinguível **sem depender de cor**: o chip traz ícone (`Globe` ou `Lock`) e a palavra.
- Contraste WCAG AA no corpo nos dois temas. A biografia usa `grafite`; só o `@username` usa `grafite-suave`, e ele repete informação já presente no nome.
- As capas da prévia da estante têm rótulo acessível com título e autor, mesmo sem texto visível sob elas.
- O trecho de resenha truncado é anunciado como truncado, e a resenha inteira é alcançável pela ação `Ver todas`.
- Foco de teclado visível na web em abas, contadores, cards e botões, com contorno de 2px `musgo` e offset de 2px. A ordem de tabulação vai da sidebar para o header, daí para a coluna de identidade e por fim para as abas.
- A troca de aba na web move o foco para o conteúdo da aba e é anunciada.
- `prefers-reduced-motion` respeitado: o fade do skeleton e o hover viram estáticos.
- Nenhuma ação desta tela é destrutiva.

---

## 10. O que não fazer nesta tela

**Escopo do Período 1**

- **Não desenhe o componente de sequência diária.** O §5.5 o prevê, mas gamificação é F-GAM, do Período 2.
- **Não desenhe estatísticas do ano.** O §5.5 as prevê, mas RF-STA-01 é F-STA, do Período 2. Nada de número grande de páginas lidas, gráfico, meta anual nem cards de estatística.
- **Não desenhe listas do leitor.** RF-SOC-02 as cita, mas F-LST é do Período 2. Nenhuma aba `Listas`, nenhuma seção vazia esperando por elas.
- **Não desenhe favoritos.** RF-EST-09 é do Período 2.
- **Não desenhe frases e trechos.** RN-11 não tem tela no Período 1.
- Não desenhe desafios, medalhas, nível de leitor nem qualquer selo.

**Específico do perfil próprio**

- **Não restrinja nada do dono.** Perfil privado não esconde estante nem resenha de quem é dono deles.
- **Não desenhe botão de seguir, solicitar ou deixar de seguir.** Ninguém segue a si mesmo, e o servidor recusa. Essas ações são da outra tela.
- **Não desenhe a lista de seguidores de terceiros** a partir daqui. Só o dono vê as próprias listas, e não existe listagem do grafo alheio.
- **Não desenhe compartilhar perfil, QR code nem link público.** Não há requisito.
- **Não desenhe o nome do leitor no título do header.** O título é `Perfil`.
- Não desenhe contagem de curtidas recebidas, visualizações de perfil nem qualquer métrica de vaidade.
- Não desenhe a estante completa aqui: a prévia leva à estante, que é outra área.
- Não desenhe upload de avatar direto nesta tela. Avatar muda na edição de perfil.
- Não desenhe banner de capa atrás do avatar.

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


**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo em tela de dados.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. Mobile não tem hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "42" sozinho: é "42 páginas", "42 minutos", "42 livros".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".
- Nada de gráfico em roxo ou teal de IA. Gráfico usa musgo como principal, broto como secundário e grafite como neutro.
- Nada de gráfico com mais de três séries.
- Nada de repetir o símbolo de percentual quando o contexto já é percentual.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
