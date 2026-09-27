# F-EST · Estante

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-EST.md
**Requisitos:** RF-EST-01 (relação leitor e livro em um dos cinco status), RF-EST-02 (estante agrupada por status, com ordenação e paginação)
**Requisito do Período 2 desenhado aqui:** RF-EST-13 (buscar por título e autor dentro da própria estante). Desejável, entregue por F-EST-2. O prompt mora junto da tela pela regra de recorte de `docs/design/AGENTS.md` §2, e os artboards dele estão marcados.
**Requisitos de sistema cujo efeito aparece aqui:** RF-EST-11 (abandono automático em 40 dias) e RF-EST-12 (alerta nos dias 20 e 30). Os dois são de sistema, com a coluna Web marcada com traço; o cliente apenas **exibe o efeito**.
**Não funcionais:** RNF-DES-02 (estante paginada), RNF-USA-02, RNF-USA-03, RNF-USA-04 (confirmação em ação destrutiva), RNF-USA-05, RNF-ERR-09
**Regras de negócio:** RN-04 (máquina de estados da leitura e seus cinco status), RN-05 (inatividade: alerta em 20 e 30 dias, abandono automático em 40), RN-14.4 (ordem de resolução da capa)
**Versão web:** sim. RF-EST-01 e RF-EST-02 têm marcação na coluna Web de `REQUISITOS.md` §5.3.

---

## 1. Contexto

A tela principal do aplicativo depois da autenticação, e a primeira que o leitor vê ao abrir. É o **registro** em forma de tela: tudo o que ele já leu, está lendo, quer ler, está relendo e abandonou, agrupado por status.

Daqui ele parte para a página do livro e para o registro de progresso. **Encontrar livro novo não acontece aqui:** a busca do acervo é a aba `Descobrir`, em [`../F-ACV-BUSCA/descobrir.md`](../F-ACV-BUSCA/descobrir.md).

A lupa no header desta tela, prevista no `documento-de-design.md` §5.1, **busca dentro da estante do leitor** e nunca traz resultado do acervo. Ela é **RF-EST-13, Desejável, e entra no Período 2** com F-EST-2: **no Período 1 o header sai sem lupa, só com o sino.** Os artboards dela estão desenhados aqui porque o prompt mora junto da tela, e vêm marcados como Período 2.

Três coisas que ela precisa resolver:

- **Os cinco status de RN-04 convivem na mesma tela**, e a troca entre eles é o gesto mais frequente do produto. Por isso o filtro é uma faixa de pills no topo e não um menu escondido.
- **Quando a busca local chegar, ela precisa ser obviamente local.** Uma estante grande fica difícil de varrer só com pills e ordenação, mas um campo de busca dentro de uma tela chamada `Minha estante` que devolvesse o catálogo inteiro seria uma mentira de rótulo. O campo busca a estante; a saída para o acervo é explícita e rotulada.
- **A inatividade precisa ser visível antes de virar abandono.** RN-05 alerta nos dias 20 e 30 e abandona no dia 40. O leitor recebe a notificação, mas a estante também precisa mostrar o risco, senão o abandono automático chega como surpresa.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Estante · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Livros na estante do leitor** (livros reais, editoras coerentes):

| Título | Autor | Páginas | Status | Detalhe |
|---|---|---|---|---|
| Torto Arado | Itamar Vieira Junior | 264 páginas | Lendo | página 148, 56% |
| O Avesso da Pele | Jeferson Tenório | 208 páginas | Lendo | página 62, 30%, **em risco há 24 dias** |
| Vidas Secas | Graciliano Ramos | 176 páginas | Lido | concluído em 04 de julho de 2026 |
| Quarto de Despejo | Carolina Maria de Jesus | 200 páginas | Lido | concluído em 19 de maio de 2026 |
| A Hora da Estrela | Clarice Lispector | 96 páginas | Relendo | página 31, 32% |
| Cidade de Deus | Paulo Lins | 552 páginas | Abandonado | parou na página 210 |
| Grande Sertão: Veredas | João Guimarães Rosa | 624 páginas | Quero ler | sem leitura iniciada |
| Um Defeito de Cor | Ana Maria Gonçalves | 952 páginas | Quero ler | sem leitura iniciada |
| Ponciá Vicêncio | Conceição Evaristo | 128 páginas | Quero ler | sem leitura iniciada |
| Marrom e Amarelo | Paulo Scott | 168 páginas | Lido | concluído em 02 de março de 2026 |

**Contagens por status**, exibidas dentro de cada pill de filtro: `Todos 10`, `Lendo 2`, `Quero ler 3`, `Lido 3`, `Relendo 1`, `Abandonado 1`.

**Ordenação atual:** `Adicionados recentemente`. As outras opções do seletor são `Adicionados há mais tempo`, `Título, A a Z`, `Título, Z a A`, `Autor, A a Z`, `Autor, Z a A`, `Maior progresso` e `Menor progresso` (contrato `OrdenacaoEstante`: `adicionado_desc/asc`, `titulo_asc/desc`, `autor_asc/desc`, `progresso_desc/asc`). Na ordenação por autor, livro sem autor vai por último e o empate é desfeito pelo título; na por progresso, conta o percentual da leitura em andamento, e livro sem leitura em andamento vai por último.

**Capa em placeholder:** `Marrom e Amarelo` cai no terceiro nível de RN-14.4 e usa `capa-placeholder`.

**Consulta da busca local:** `guimarães`, que casa com um único livro da estante, `Grande Sertão: Veredas`. **Segunda consulta, para o artboard de vazio:** `saramago`, que não casa com nenhum.

**Nenhuma nota aparece na estante.** O card da variante Estante do design §4.5 traz capa, título, autor e status pill. Título, autor e capa (só a URL, a imagem vem do CDN) chegam no próprio item da listagem da estante (`ItemEstante.livro { titulo, autor, capaUrl }` em `GET /estante` e `GET /perfis/{id}/estante`): o cliente não compõe com o `acervo`. Nota agregada é do Período 2 e nota própria do leitor mora na página do livro.

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

### Header da estante

Segue o padrão do shell. A ação contextual do `documento-de-design.md` §5.1 é a lupa, e ela só existe a partir de RF-EST-13, no Período 2.

- Título `Minha estante` em `display` `tinta`, alinhado à base, à esquerda.
- À direita, apenas `Bell`. **No Período 1 não há lupa neste header:** a busca do acervo mudou de área e a busca da estante é RF-EST-13, do Período 2. Com RF-EST-13, `MagnifyingGlass` (Phosphor, `regular`, 24px, `tinta`) entra antes do sino, com `space-4` de gap.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

**Modo de busca do header, RF-EST-13, Período 2.** Tocar na lupa troca o header inteiro pelo campo inline, sem sair da tela e sem empurrar o conteúdo:

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com 48px de alvo de toque, que **sai do modo de busca** e devolve o header padrão. Ele não navega para lugar nenhum.
- Campo ocupando o resto da linha: altura 48px, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, com `MagnifyingGlass` (Phosphor, `regular`, 20px, `grafite-suave`) dentro à esquerda e `space-3` de gap até o texto. Texto digitado em `body` `tinta`. Com texto, `X` (Phosphor, `regular`, 20px, `grafite`) à direita limpa o campo sem sair do modo.
- Placeholder em `grafite-suave`: `Buscar na minha estante`. O placeholder aqui **delimita o escopo da busca** e é a única defesa contra a leitura de que o campo devolveria o acervo. Ele não substitui label nenhum: o campo é o header, e essa é a exceção declarada desta tela ao padrão de formulário de design §4.2.
- Foco: borda de 1.5px `musgo`, transição `dur-fast`, sem outline do browser.
- O sino não aparece enquanto o modo de busca está aberto: o header é o campo. Sair do modo devolve o sino e o badge.
- **A busca é local e casa por título e autor.** Ela filtra sobre o status já selecionado, não o zera: buscar com `Lendo` ativo procura dentro de `Lendo`. A faixa de pills e a linha de contagem continuam visíveis e a contagem acompanha o resultado.

### Faixa de filtros por status

Logo abaixo do header, faixa horizontal rolável com um pill por status, conforme design §5.1. Padding lateral `space-5`, `space-2` de gap, `space-4` de respiro acima e abaixo.

- Cada pill traz o rótulo e a contagem, no formato `Lendo 2`, com a contagem em `num-inline` e o rótulo em `caption`.
- Pill inativo: `radius-full`, padding `space-2 space-4`, borda de 1px `linha`, fundo transparente, texto `grafite`.
- Pill ativo: fundo `musgo-fundo`, sem borda, texto peso 600 `musgo`.
- O primeiro pill é `Todos`, seguido dos cinco status na ordem da máquina de estados: `Lendo`, `Quero ler`, `Lido`, `Relendo`, `Abandonado`.
- Seleção única. A faixa rola na horizontal sem seta, sem gradiente de fade e sem indicador de rolagem.

### Linha de ordenação

Abaixo da faixa, uma linha com padding lateral `space-5` e `space-3` de respiro:

- À esquerda, em `caption` `grafite`: `10 livros`.
- À direita, botão textual `musgo` com `ArrowsDownUp` (Phosphor, `regular`, 16px) à esquerda do texto: `Adicionados recentemente`. Aciona um bottom sheet de ordenação.

### Grid

- **Duas colunas** no mobile, gap `space-4`, padding lateral `space-5`, conforme design §5.1.
- Cards da variante Estante de design §4.5: capa em proporção 2:3 ocupando a largura da coluna, retângulo de canto vivo sem raio; abaixo, título em `title-sm` `tinta` com no máximo duas linhas; autor em `caption` `grafite` com uma linha; status pill conforme design §4.6 abaixo.
- Livro com status `Lido` recebe `Check` (Phosphor, `bold`, 20px) em `musgo` no canto superior direito da capa, sobre um círculo de 28px em `papel` com `elev-1`.
- Livro com status `Relendo` recebe `ArrowsClockwise` (Phosphor, `regular`, 20px) em `broto`, no mesmo canto e mesmo tratamento.
- Livro em leitura, com `Lendo` ou `Relendo`, recebe a **barra de progresso** de design §4.7 logo abaixo da capa, largura total da coluna, com o percentual à direita em `num-inline` `caption`.

### 4.1 Padrão, todos os status

Estado principal. Header, faixa com `Todos 10` ativo, linha de ordenação, e o grid com os dez livros em duas colunas. Barra inferior do shell com **Estante** ativo.

O grid mostra a variedade dos cinco status lado a lado: é o artboard que prova que os pills de design §4.6 são distinguíveis entre si em tamanho real.

### 4.2 Filtro Lendo, com leitura em risco

Faixa com `Lendo 2` ativo. Grid com dois cards.

- `Torto Arado` normal: barra de progresso com fill `musgo` a 56% e o valor `56%` à direita.
- `O Avesso da Pele` **em risco** (RN-05, dia 24 de inatividade), conforme design §4.7:
  - O fill da barra vira `ambar-claro` no lugar de `musgo`, mantendo o track `musgo-fundo`.
  - `Warning` (Phosphor, `regular`, 16px, `ambar`) aparece **antes** do percentual, com `space-2` de gap.
  - Abaixo do card, em `caption` `ambar`: `Sem progresso há 24 dias`.
- O risco é informativo aqui: a ação de abandonar chega pela notificação (RF-NOT-04) e pelo bottom sheet de ações de leitura. **A estante não abandona nada sozinha e não oferece botão de abandonar dentro do card.**

### 4.3 Filtro Abandonado

Faixa com `Abandonado 1` ativo. Um card, `Cidade de Deus`.

- Status pill `Abandonado` conforme design §4.6: fundo transparente com borda de 1px `linha`, texto `grafite`, ícone `PauseCircle` (Phosphor, `regular`, 16px).
- Sem barra de progresso: a leitura não está em andamento. No lugar dela, em `caption` `grafite`: `Parou na página 210 de 552`.
- A capa não é esmaecida, não é dessaturada e não recebe sobreposição cinza. Abandonado é um estado do registro, não uma punição visual.

### 4.4 Vazio por filtro

Faixa com `Relendo` ativo e a contagem em zero. Conforme design §5.1, o vazio tem desenho intencional e um CTA relevante ao filtro.

- Bloco centralizado no espaço do grid, com `space-6` entre os elementos:
  - `ArrowsClockwise` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhuma releitura em andamento`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Releituras aparecem aqui quando você recomeça um livro que já concluiu.`
  - Botão primário pill, altura 48px, `musgo`, texto `papel`: `Ver livros lidos`.
- O CTA muda conforme o filtro vazio: em `Quero ler` vazio o botão é `Buscar livros`, que **leva à aba Descobrir**; em `Lido` vazio é `Ver o que está lendo`. **Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.**

### 4.5 Estante vazia

O leitor novo, sem nenhum livro.

- Faixa de filtros **presente**, com todas as contagens em zero, para que ele já entenda a organização que vem.
- Bloco centralizado:
  - `Books` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Sua estante está vazia`.
  - Texto em `body` `grafite`, centralizado: `Busque um livro pelo título, autor ou ISBN e escolha em qual status ele entra.`
  - Botão primário pill `musgo`: `Buscar livros`, que **leva à aba Descobrir**.
  - Botão textual `musgo`: `Cadastrar por ISBN`.

### 4.6 Carregando

- Header e faixa de filtros reais, com as contagens ainda ocultas nos pills.
- Grid substituído por **skeleton estático**: seis retângulos `capa-placeholder` na proporção 2:3, cada um com duas barras abaixo em `capa-placeholder` e `radius-sm`, alturas de 18px e 13px, larguras de 85% e 55%.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner. O sistema não tem spinner.
- Este é também o estado do **cold start** do serviço (RNF-ERR-09): demora não é erro.

### 4.7 Erro de carregamento

- Header e faixa de filtros reais.
- Banner inline no lugar do grid, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar sua estante. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

### 4.8 Abandonado automaticamente

O efeito de RF-EST-11 na tela. O job diário já aplicou a transição de RN-04; o cliente só exibe.

- Faixa com `Abandonado 2` ativo.
- `O Avesso da Pele` aparece agora com pill `Abandonado`, e abaixo do card, em `caption` `grafite`: `Abandonado automaticamente em 05 de setembro de 2026`.
- **Sem banner de sistema, sem alerta modal, sem "atenção".** A notificação já avisou; a estante informa o fato.
- O card oferece o caminho de volta: a ação de retomar mora no bottom sheet de ações de leitura, acessível pelo toque no card.

### 4.9 Busca na estante, com resultado · RF-EST-13, Período 2

O modo de busca do header aberto e produtivo.

- Header trocado pelo campo inline, com `ArrowLeft` à esquerda e o campo preenchido com `guimarães`. Sino ausente.
- Faixa de filtros **presente e inalterada**, com `Todos 10` ativo: a busca filtra dentro do status vigente e não zera a seleção.
- Linha de contagem em `caption` `grafite`: `1 livro encontrado na sua estante`. A unidade nomeia o escopo, e é ela que impede a leitura de resultado de acervo.
- Grid com um card, `Grande Sertão: Veredas`, com pill `Quero ler`. Um card sozinho no grid de duas colunas fica **alinhado à esquerda**, sem esticar para ocupar a linha inteira.
- A linha de ordenação continua onde estava. Buscar não é um modo separado da estante: é a mesma tela com menos itens.

### 4.10 Busca na estante, sem resultado · RF-EST-13, Período 2

O caso que decide se a arquitetura de informação se sustenta: o leitor busca um livro que ele não tem.

- Campo preenchido com `saramago`, faixa de filtros presente, contagem em `0 livros encontrados na sua estante`.
- Bloco centralizado no espaço do grid, com `space-6` entre os elementos:
  - `MagnifyingGlass` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nada na sua estante com esse nome`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Esta busca olha só os livros que você já adicionou.`
  - Botão primário pill, altura 48px, `musgo`, texto `papel`: `Buscar no acervo`, que **leva à aba Descobrir com `saramago` já preenchido**.
- Essa é a **única ponte** entre a busca da estante e a busca do acervo, e ela é explícita, rotulada e acionada pelo leitor. Nada aqui cai no acervo sozinho, e nenhum resultado de acervo se mistura ao grid da estante.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Estante** ativo.
- Área de conteúdo com padding lateral `space-8`.
- **Header de conteúdo de 72px** com `Minha estante` em `display` `tinta` à esquerda. Sem sino. **No Período 1 não há nada à direita.** Com RF-EST-13, entra um campo de busca de 44px de altura e 320px de largura com `MagnifyingGlass` dentro, sempre aberto, sem o modo de busca do mobile: **ele busca a estante**, e o placeholder `Buscar na minha estante` em `grafite-suave` diz isso sem depender de contexto.
- **Faixa de filtros em linha horizontal**, não rolável: os seis pills cabem na largura. Mesmo desenho de pill do mobile, com hover de fundo `linha`.
- Linha de ordenação com `10 livros` à esquerda e um `select` de 44px à direita com a ordenação atual, em vez do bottom sheet do mobile.
- **Grid de seis colunas** com gap `space-4`, conforme design §5.1. Em `md` são quatro colunas, em mobile são duas.
- `hover` no card: a capa ganha `elev-2` e o título passa a `musgo`, transição `dur-fast`. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** a faixa de filtros volta a rolar na horizontal, o grid cai para duas colunas e a sidebar dá lugar à barra inferior. Com RF-EST-13, o campo de busca vira o ícone de lupa que abre o modo de busca do mobile.

### 5.1 Padrão, todos os status

Estado principal. Sidebar expandida, header com o campo de busca, faixa com `Todos 10` ativo, grid de seis colunas com os dez livros ocupando duas linhas.

### 5.2 Filtro Lendo, com leitura em risco

Faixa com `Lendo 2` ativo, grid com dois cards, `O Avesso da Pele` com o fill `ambar-claro`, o `Warning` antes do percentual e a linha `Sem progresso há 24 dias`. Sobra muito espaço no grid de seis colunas com dois itens: os cards ficam alinhados à esquerda, **sem esticar para preencher a linha** e sem centralizar no meio da tela.

### 5.3 Vazio por filtro, com hover

Faixa com `Relendo` ativo, bloco de vazio centralizado dentro da área de conteúdo, e a faixa de filtros mostrando o pill `Lido` em hover com fundo `linha`. Serve para conferir que hover, ativo e inativo são distinguíveis.

### 5.4 Carregando

Skeleton estático de doze cards no grid de seis colunas, com header e faixa reais. Um único fade de entrada, sem shimmer.

### 5.5 Busca na estante, sem resultado · RF-EST-13, Período 2

Campo do header preenchido com `saramago`, sidebar com **Estante** ativo, faixa de filtros com `Todos 10` ativo e contagem em `0 livros encontrados na sua estante`. O grid dá lugar ao mesmo bloco centralizado do mobile, com o botão `Buscar no acervo`. A sidebar continua à esquerda com `Descobrir` visível e inativo: na web o leitor enxerga a outra aba sem precisar do botão, e as duas rotas para o acervo dizem a mesma coisa.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título do header em `papel-suave`, ícones em `papel-suave`. Pill inativo com borda `linha-noite` e texto `grafite-claro`; pill ativo com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Título do card em `papel-suave`, autor em `grafite-claro`. Status pill `Lendo` com fundo `musgo-fundo-escuro` e texto `musgo-claro`; `Lido` com fundo `musgo-claro` e texto `noite`; `Relendo` com texto `broto-vivo`; `Abandonado` com borda `linha-noite` e texto `grafite-claro`. Barra de progresso com track `musgo-fundo-escuro` e fill `musgo-claro`, e fill `ambar-claro` no caso em risco. Placeholder de capa em `capa-placeholder-noite`. Barra inferior em `noite-elevada`, **mais clara** que o fundo.
- **Web, padrão.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, com quatro itens e **Estante** ativo. Campo de busca do header em `noite-elevada`, **mais claro** que o fundo, com borda `linha-noite`, texto digitado em `papel-suave` e placeholder em `grafite-fundo-escuro`. Hover do pill em `linha-noite`.

Nos dois, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Padrão de tela da estante, com header, filtros, grid e vazio | documento-de-design §5.1 |
| Card de livro, variante Estante | documento-de-design §4.5 |
| Status pill dos cinco status | documento-de-design §4.6 |
| Barra de progresso, incluindo o tratamento de leitura em risco | documento-de-design §4.7 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Placeholder de capa em retângulo de canto vivo | documento-de-design §4.5 e §7.6 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que nasceram aqui.** Três elementos nasceram neste prompt; os dois primeiros foram incorporados ao `documento-de-design.md` §5.1 em 26/09/2026 pelo controle de mudança do plano §3:

1. **A contagem dentro do pill de filtro.** O §5.1 define a faixa de pills por status, mas não a contagem.
2. **A linha de ordenação.** RF-EST-02 exige ordenação, e o §5.1 não desenha o controle.
3. **A busca dentro da estante já não é lacuna: virou RF-EST-13** em 01/09/2026, e o `documento-de-design.md` §5.1 passou a declarar o escopo da lupa. Como o requisito ficou **Desejável**, o que está desenhado aqui é entregue por [F-EST-2](../../../plano-de-desenvolvimento/periodo-2/feature-F-EST-2.md) no Período 2.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Minha estante` |
| Pills de filtro | `Todos 10`, `Lendo 2`, `Quero ler 3`, `Lido 3`, `Relendo 1`, `Abandonado 1` |
| Contagem | `10 livros` |
| Ordenação atual | `Adicionados recentemente` |
| Outras ordenações | `Adicionados há mais tempo`, `Título, A a Z`, `Título, Z a A`, `Autor, A a Z`, `Autor, Z a A`, `Maior progresso`, `Menor progresso` |
| Detalhe de abandonado | `Parou na página 210 de 552` |
| Detalhe de abandono automático | `Abandonado automaticamente em 05 de setembro de 2026` |
| Aviso de risco | `Sem progresso há 24 dias` |
| Vazio por filtro, título | `Nenhuma releitura em andamento` |
| Vazio por filtro, texto | `Releituras aparecem aqui quando você recomeça um livro que já concluiu.` |
| Vazio por filtro, botão | `Ver livros lidos` |
| Vazio de Quero ler, botão | `Buscar livros` |
| Vazio de Lido, botão | `Ver o que está lendo` |
| Vazio de Lendo · incorporado em 27/09/2026 | `Nenhuma leitura em andamento`, `Livros aparecem aqui quando você começa a ler.` |
| Vazio de Quero ler · incorporado em 27/09/2026 | `Nenhum livro para ler depois`, `Livros aparecem aqui quando você os adiciona como Quero ler.` |
| Vazio de Lido · incorporado em 27/09/2026 | `Nenhum livro concluído`, `Livros aparecem aqui quando você finaliza uma leitura.` |
| Vazio de Abandonado · incorporado em 27/09/2026 | `Nenhuma leitura abandonada`, `Leituras aparecem aqui quando você as deixa de lado.` |
| Detalhe de relidos no card · incorporado em 27/09/2026 | `Lido 2 vezes`, `Lido 1 vez` |
| Estante vazia, título | `Sua estante está vazia` |
| Estante vazia, texto | `Busque um livro pelo título, autor ou ISBN e escolha em qual status ele entra.` |
| Estante vazia, botão primário | `Buscar livros` |
| Estante vazia, botão textual | `Cadastrar por ISBN` |
| Erro, texto | `Não foi possível carregar sua estante. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |
| Placeholder da busca local · P2 | `Buscar na minha estante` |
| Contagem da busca local, com resultado · P2 | `1 livro encontrado na sua estante` |
| Contagem da busca local, sem resultado · P2 | `0 livros encontrados na sua estante` |
| Busca local vazia, título · P2 | `Nada na sua estante com esse nome` |
| Busca local vazia, texto · P2 | `Esta busca olha só os livros que você já adicionou.` |
| Busca local vazia, botão · P2 | `Buscar no acervo` |

As linhas marcadas com `· P2` pertencem a RF-EST-13 e entram com F-EST-2.

Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade, com a exceção do percentual e das contagens dentro dos pills, em que o rótulo do pill já é a unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px em cada pill de filtro, no sino, no botão de ordenação e, a partir de RF-EST-13, na lupa, mesmo que o pill pareça menor.
- O card inteiro é a área acionável. No grid de duas colunas do mobile isso dá uma área muito acima de 48px.
- O status é distinguível **sem depender de cor**: cada pill traz ícone próprio conforme design §4.6, e `Lido` e `Relendo` ainda recebem marca na capa.
- A leitura em risco não é comunicada só por `ambar`: ela traz o ícone `Warning` e a linha de texto `Sem progresso há 24 dias`.
- A barra de progresso não comunica só por preenchimento: o percentual aparece em número ao lado.
- Contraste WCAG AA no corpo nos dois temas. O autor no card usa `grafite`, não `grafite-suave`, porque é informação essencial para distinguir edições e homônimos.
- A contagem de livros e a troca de filtro são anunciadas por leitor de tela, para que a filtragem não seja silenciosa. **A contagem da busca local é anunciada com o escopo junto** (`1 livro encontrado na sua estante`), e não como número solto: é por ela que o leitor de tela distingue esta busca da busca do acervo.
- Entrar e sair do modo de busca do mobile move o foco de forma previsível: abrir põe o foco no campo, e o `ArrowLeft` devolve o foco à lupa do header padrão.
- Na web, foco de teclado visível em pill, campo, card e botão, com contorno de 2px `musgo` e offset de 2px. A ordem de tabulação vai da sidebar para os filtros e daí para o grid; com RF-EST-13, o campo de busca entra entre a sidebar e os filtros.
- `prefers-reduced-motion` respeitado: o fade de entrada do skeleton e o hover do card viram estáticos.
- O skeleton preserva a altura do grid para que o conteúdo não salte quando os dados chegam.

---

## 10. O que não fazer nesta tela

**Escopo do Período 1**

- **Não desenhe favoritos.** Nem filtro `Favoritos`, nem ícone de coração no card, nem seção separada. RF-EST-09 é do Período 2, em F-EST-2.
- **Não desenhe a lupa nem o campo de busca nos artboards do Período 1.** RF-EST-13 é do Período 2, em F-EST-2, e tem artboards próprios em 4.9, 4.10 e 5.5. No Período 1 o header do mobile tem só o sino, e o header da web tem só o título.
- **Não desenhe histórico por ano.** RF-EST-10 é do Período 2.
- **Não desenhe nota nos cards.** Nota agregada é do Período 2, e a nota própria mora na página do livro.
- **Não desenhe o componente de sequência diária.** Gamificação é do Período 2.
- Não desenhe estatísticas, totais de páginas lidas nem gráficos. Estatísticas são do Período 2.

**Específico da estante**

- **Não desenhe botão de abandonar dentro do card.** Abandonar é ação destrutiva, passa por confirmação e mora no bottom sheet de ações de leitura.
- **Não esmaeça, dessature nem cubra a capa do livro abandonado.** Abandonado é um estado do registro, não uma punição visual.
- Não desenhe multisseleção de status. O filtro é de seleção única.
- Não desenhe uma quarta variante de card. As três variantes de design §4.5 são Estante, Feed e Busca. A busca local reusa a variante **Estante**, porque o resultado é um livro da estante.
- Não desenhe menu de contexto com três pontos no canto de cada card. As ações chegam pelo toque no card.
- Não transforme o alerta de risco em modal, banner de topo ou interstitial. Ele é uma marca no card.
- Não desenhe a estante como lista de linhas no mobile. O padrão de design §5.1 é grid.

**Específico da busca local, RF-EST-13, Período 2**

- **Não misture resultado de acervo ao grid da estante.** Nem em seção separada, nem abaixo dos resultados locais, nem com badge de "não está na sua estante". A estante mostra só o que o leitor já adicionou; o acervo é a aba `Descobrir`.
- **Não caia no acervo automaticamente** quando a busca local não encontra nada. A ponte é o botão `Buscar no acervo`, acionado pelo leitor.
- **Não use o placeholder genérico do acervo** (`Título, autor, editora ou ISBN`) neste campo. O placeholder daqui delimita o escopo, e trocá-lo reabre exatamente a ambiguidade que esta tela existe para fechar.
- Não desenhe filtro por editora, ISBN, ano ou assunto na busca local. Ela casa por título e autor sobre o que já está na estante.
- Não desenhe sugestão, autocompletar nem histórico de buscas.
- Não zere o filtro de status ao buscar. A busca acontece **dentro** do status selecionado.

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
**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.
- Nada de desfazer em ação destrutiva pesada.
**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
