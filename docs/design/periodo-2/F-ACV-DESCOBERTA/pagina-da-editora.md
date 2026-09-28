# F-ACV-DESCOBERTA · Página da editora

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-ACV-DESCOBERTA.md
**Requisitos:** RF-ACV-11 (página de editora com a lista de livros oficiais daquela editora)
**Não funcionais:** RNF-DES-01 (leitura em até 1s no p95, sem contar cold start), RNF-DES-02 (lista paginada com teto do servidor), RNF-SEC-05 (identificador não sequencial na rota), RNF-SEC-06 (livro pessoal nunca aparece na página de editora), RNF-USA-02, RNF-USA-03, RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-03 (livro pessoal não alimenta página de editora), RN-12 (editora vem como texto livre da fonte e é normalizada com tabela de sinônimos na ingestão), RN-01 (o livro é a edição; o agrupamento por título mais autor é de interface), RN-14.4 (ordem de resolução da capa: cópia própria, URL externa, placeholder)
**Versão web:** sim. RF-ACV-11 tem marcação na coluna Web de `REQUISITOS.md` §5.2.
**De onde se chega:** da página do livro, tocando o valor `Editora` da seção `Ficha`, que no Período 2 deixa de ser texto e vira link (edição consolidada em `../pagina-do-livro/pagina-do-livro.md`, outro prompt). Esta tela é empilhada sobre a página do livro e mantém ativa a **aba de origem**: nos artboards, `Descobrir`.
**Irmãs:** `pagina-do-autor.md` e `pagina-da-serie.md`, na mesma pasta, usam o **mesmo esqueleto de página de catálogo** descrito aqui. Mudou o esqueleto em uma, muda nas três.

---

## 1. Contexto

A página da editora é a mais simples das três páginas de catálogo: o nome da editora e a lista dos livros oficiais que ela publicou. O leitor que gostou de `Torto Arado` toca `Todavia` na ficha e vê o resto do catálogo da casa que está no acervo. Daqui, o único destino é a página de outro livro.

Ela sustenta o mecanismo de **registro**: editora é um atalho de gosto (quem gosta de um catálogo costuma gostar do resto dele) e leva à próxima leitura.

Quatro coisas definem o desenho:

- **Não é perfil.** A página de editora não tem dono, não recebe conteúdo de usuário e não é editável pela interface (`REQUISITOS.md` §5.2). Nada de logo da editora, site, redes sociais, seguir, curtir, comentar, compartilhar, sugerir edição ou reportar erro. É consulta sobre a base oficial curada.
- **Sem bloco de conteúdo próprio.** Diferente do autor, a editora não tem biografia nem descrição: o requisito pede só a lista. Não invente texto institucional, ano de fundação ou cidade.
- **Só livro oficial.** Livro pessoal nunca aparece aqui, nem para o próprio dono, nem com badge, nem em seção separada (RN-03, RNF-SEC-06).
- **O esqueleto é compartilhado.** Autor, editora e série são três páginas de catálogo com a mesma estrutura: header de detalhe, bloco de identidade, conteúdo próprio opcional (que aqui não existe) e a lista de livros no card da variante Busca, a mesma do `Descobrir`.

O nome exibido é a **forma canônica** da editora depois da normalização da ingestão (RN-12): a tabela de sinônimos junta variantes como `Cia das Letras` e `Companhia das Letras` numa entidade só. A interface mostra um nome, sem variantes, sem "também conhecida como".

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Página da editora · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- Espaçamento generoso entre artboards, com as linhas claramente separadas.
- Como a página é longa, cada artboard mostra o **topo da página** dentro do viewport, com o conteúdo cortado naturalmente pela borda inferior. O artboard de paginação é a exceção: ele mostra o **fim** da lista carregada.

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

**Editora principal dos artboards:** `Todavia`.

**Livros oficiais da editora** (livros reais; páginas são mock), do ano de publicação mais recente para o mais antigo (a ordem é decisão deste prompt, a ratificar; o requisito não fixa ordem para editora):

| Título | Autor | Ano | Páginas | Na estante do leitor |
|---|---|---|---|---|
| Salvar o Fogo | Itamar Vieira Junior | 2023 | 320 páginas | `Quero ler` |
| Doramar ou a Odisseia | Itamar Vieira Junior | 2021 | 176 páginas | não |
| Atos Humanos | Han Kang | 2021 | 216 páginas | não |
| Torto Arado | Itamar Vieira Junior | 2019 | 264 páginas | `Lendo` |
| A Vegetariana | Han Kang | 2018 | 176 páginas | não |
| Garotas Mortas | Selva Almada | 2018 | 128 páginas | `Lido` |

`Torto Arado` é o livro de onde o leitor veio, com o status `Lendo` que a página do livro mostra.

**Contagem:** `36 livros no acervo` (mock). A lista carrega por páginas; os artboards mostram só as primeiras.

**Capas:** `Salvar o Fogo`, `Torto Arado` e `A Vegetariana` com capa real. `Doramar ou a Odisseia` cai no placeholder `capa-placeholder` com o título centralizado, conforme RN-14.4 e design §4.5.

**Nota:** nenhum card exibe nota, como nos resultados do `Descobrir`. Os indicadores de nota vivem na página do livro.

**Editora do artboard sem livros:** `Mazza Edições`, estado defensivo descrito em 4.5.

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
ícone peso `regular`, cor `grafite`; rótulo em `caption` `grafite`. Ativo:
ícone peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`.
Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone
que salta. **Nesta tela o item ativo é `Descobrir`** (aba de origem).

**Mobile, header.** Altura de 72px mais a área segura, padding lateral
`space-5`, fundo `papel`, sem sombra. O sino `Bell` (Phosphor, `regular`,
24px, `tinta`) fica à direita e é fixo em toda tela autenticada. Badge de não
lidas: círculo de 18px, fundo `musgo`, encostado no canto superior direito do
ícone, número centralizado em 11px peso 600 cor `papel`; acima de nove mostra
`9+`; sem não lidas, o badge simplesmente não existe.

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida
por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px
`linha`. Bloco do topo de 72px, padding lateral `space-5`, com o lockup
horizontal da marca à esquerda (símbolo da folha sobre livro aberto seguido
de `Lê Ai`, os dois em `musgo`, `space-3` de gap, 24px de altura) e
`SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo,
`space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro
de padding lateral `space-3`: altura de 44px, `radius` 12, padding lateral
`space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em
`body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo
transparente. Hover: fundo `linha`, transição `dur-fast`. Ativo: fundo
`musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`. **Nesta tela o item
ativo é `Descobrir`**, pela mesma regra de aba de origem.

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

Header de tela de detalhe, empilhada sobre a página do livro. O título diz **que tipo de página** é esta, e o nome da editora vem logo abaixo, no bloco de identidade: nomes de editora como `Companhia das Letras` não cabem em `display` ao lado da seta e do sino em 390px.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando à tela anterior.
- Título `Editora` em `display` `tinta`, logo depois da seta, alinhado à base.
- `Bell` à direita, com o badge de não lidas quando houver. **Nenhuma outra ação no header:** sem compartilhar, sem menu, sem seguir.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Esqueleto da página de catálogo

A mesma estrutura das páginas de autor e de série, de cima para baixo, com padding lateral `space-5`:

1. **Bloco de identidade**, `space-4` abaixo do header:
   - Nome da editora em `title-lg` `tinta`, alinhado à esquerda, até duas linhas.
   - `space-1` abaixo, a contagem em `caption` `grafite`: `36 livros no acervo`. No singular, `1 livro no acervo`.
   - Sem logo, sem imagem, sem ícone. A página não é perfil.
2. **Bloco de conteúdo próprio:** **não existe na página da editora.** O requisito pede só a lista. A seção `Livros` começa `space-6` abaixo da contagem.
3. **Seção `Livros`**, com a lista no card da variante Busca.

Títulos de seção desta tela em `title` `tinta` (um degrau abaixo do nome), com `space-3` entre o título e o conteúdo.

### Seção `Livros`

- Título de seção `Livros` em `title` `tinta`.
- Lista de cards da variante Busca de design §4.5, um por linha, separados por divisor de 1px `linha` com `space-4` de padding vertical. **É o mesmo card dos resultados do `Descobrir`:**
  - Capa de 80 por 120px à esquerda, retângulo de canto vivo, sem raio.
  - `space-4` de gap até o bloco de texto.
  - Título em `title-sm` `tinta`, no máximo duas linhas.
  - Autor em `body` `grafite`.
  - Editora e ano em `caption` `grafite-suave`, no formato `Todavia · 2019`. A editora se repete em todos os cards desta página, e tudo bem: o card é o mesmo componente em toda a interface.
  - Número de páginas em `caption` `grafite-suave`, no formato `264 páginas`.
  - Status pill conforme design §4.6, quando o livro está na estante do leitor: `Quero ler` com borda de 1px `linha`, texto `tinta` e `BookmarkSimple` 16px; `Lendo` com fundo `musgo-fundo`, texto `musgo` e `BookOpen` 16px; `Lido` com fundo `musgo`, texto `papel` e `Check` (Phosphor, `bold`, 16px). Pill em `caption`, `radius-full`, padding `space-1 space-2`.
  - **Nenhuma nota no card.**
  - O card inteiro é a área acionável e abre a página do livro.
- Livro agrupado por título mais autor traz, abaixo da linha de editora, `N edições` em `caption` `musgo`, acionável. O agrupamento é de interface (RN-01). Nenhum livro dos artboards desta tela tem mais de uma edição, então a indicação não aparece aqui.
- Ordem: do ano de publicação mais recente para o mais antigo. Sem controle de ordenação e sem filtro nesta página.
- Paginação por rolagem, com teto de itens imposto pelo servidor. Nada de botão `Carregar mais`, nada de numeração de página.

### 4.1 Padrão

O estado principal, no topo da página. De cima para baixo:

1. Header com `ArrowLeft`, `Editora` e o sino com badge `3`.
2. Bloco de identidade: `Todavia` em `title-lg`, e `36 livros no acervo` abaixo.
3. Seção `Livros` com os cards visíveis: `Salvar o Fogo` com o pill `Quero ler`, `Doramar ou a Odisseia` com o placeholder de capa (retângulo `capa-placeholder` de 80 por 120px com o título centralizado em `title-sm` `tinta` e `Itamar Vieira` abaixo em `caption` `grafite`), `Atos Humanos`, `Torto Arado` com o pill `Lendo`, e `A Vegetariana` cortado pela borda inferior.
4. Barra inferior do shell com **Descobrir** ativo.

### 4.2 Carregando mais livros

O fim da parte já carregada da lista, rolada até a base, enquanto a próxima página chega.

- Header com o divisor `linha` na base, porque o conteúdo rola por baixo dele.
- Os últimos cards reais (`Torto Arado` com `Lendo`, `A Vegetariana`, `Garotas Mortas` com `Lido`).
- Abaixo do último card real, **dois cards em skeleton** com a forma do card de busca: retângulo `capa-placeholder` de 80 por 120px e três barras à direita em `capa-placeholder`, `radius-sm`, larguras de 70%, 45% e 30%, alturas de 18px, 15px e 13px, `space-2` entre elas, separados pelo mesmo divisor.
- Um único fade de entrada em `dur-base` com `ease-out`. Sem shimmer, sem spinner, sem texto `Carregando`.

### 4.3 Falha ao carregar mais livros

Mesmo enquadramento de 4.2, com a próxima página tendo falhado.

- Os cards já carregados **continuam na tela**. Uma falha de paginação não apaga o que o leitor já está vendo.
- No lugar dos dois skeletons, banner inline em largura total, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda e `space-3` de gap.
- Texto em `body` `tinta`: `Não foi possível carregar mais livros. Verifique sua conexão e tente de novo.`
- Botão textual `musgo` abaixo do texto: `Tentar de novo`.

### 4.4 Carregando a página

O que aparece ao abrir a página e também durante o **cold start** do serviço (RNF-ERR-09): demora não é erro.

- Header real com `ArrowLeft`, `Editora` e o sino.
- Bloco de identidade em skeleton: barra de 24px de altura e 45% de largura, e abaixo barra de 13px e 30%, em `capa-placeholder`, `radius-sm`, `space-2` entre elas.
- Seção `Livros` com o título real e cinco cards em skeleton, no mesmo desenho de 4.2.
- Um único fade de entrada. Sem shimmer, sem spinner.

### 4.5 Sem livros no acervo

Estado **defensivo e raro**: a página só é alcançada a partir de um livro oficial da editora, então a lista vazia só acontece se o acervo mudou depois (livro retirado da base curada). Ele precisa existir para que a página não quebre, não para ser vitrine.

- Header e bloco de identidade com `Mazza Edições`, **sem a linha de contagem**: nada de `0 livros no acervo`.
- No lugar da seção `Livros`, bloco centralizado com `space-5` entre os elementos: `Books` (Phosphor, `regular`, 32px, `grafite-suave`), título em `title` `tinta`: `Nenhum livro no acervo`, texto em `body` `grafite` centralizado, largura máxima de 280px: `Os livros de Mazza Edições não estão no acervo no momento.`, e botão textual `musgo`: `Buscar no Descobrir`.
- Nada de `rubi`, nada de `Warning`: lista vazia não é erro.

### 4.6 Erro de carregamento

Falha de rede na **página inteira**.

- Header real com `ArrowLeft`, `Editora` e o sino.
- Bloco centralizado no corpo, com `space-5` entre os elementos: `Warning` (Phosphor, `regular`, 32px, `rubi`), título em `title` `tinta`: `Não foi possível abrir esta página`, texto em `body` `grafite` centralizado, largura máxima de 280px: `A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.`, e botão primário pill, altura 48px, fundo `musgo`, texto `papel` em `body-strong`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular ela usa o desenho mobile, no desktop usa o desenho abaixo. Os dois artboards são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Descobrir** ativo em `musgo-fundo`, com `Compass` em `fill` `musgo`, pela regra da aba de origem.
- Área de conteúdo com padding lateral `space-8` e `max-width` de 1120px no bloco de conteúdo, alinhado à esquerda da área útil, não centralizado num container estreito sobre fundo vazio.
- **Header de conteúdo de 72px** com o **nome da editora** em `display` `tinta` à esquerda. Na web a largura comporta o nome, então o título do header é o nome e não o tipo da página. À direita, nada: sem ações, sem sino. Sem botão de voltar no header, como nas demais telas de detalhe da web: a navegação é pela sidebar e pelo voltar do navegador.
- Logo abaixo do header, em `caption` `grafite`: `Editora · 36 livros no acervo`. O tipo da página entra aqui, porque saiu do título.
- `space-8` abaixo, a seção `Livros`, com o título em `title` `tinta` e os cards da variante Busca em **grid de três colunas** com gap `space-5`. Sem painel lateral: esta página não tem filtro, então o grid ocupa toda a largura útil.
- `hover` no card: fundo `papel-elevado`, transição `dur-fast`. Foco de teclado visível em card, link e botão, com contorno de 2px `musgo` e offset de 2px.
- Paginação por rolagem também na web, com dois cards em skeleton no fim do grid enquanto a próxima página chega.
- **Entre 1024px e 1280px** o grid cai para duas colunas. **Entre 768px e 1024px** a sidebar nasce retraída em 72px e o grid fica em duas colunas. **Abaixo de 768px** o layout é o desenho mobile: o título do header volta a ser `Editora`, o nome desce para o bloco de identidade e a sidebar dá lugar à barra inferior.

### 5.1 Padrão

`Todavia` no header, `Editora · 36 livros no acervo` e o grid com os seis cards em duas linhas de três (`Doramar ou a Odisseia` em placeholder de capa, `Salvar o Fogo` com `Quero ler`, `Torto Arado` com `Lendo`, `Garotas Mortas` com `Lido`). O card de `Atos Humanos` aparece em **hover**, com fundo `papel-elevado`, para conferir o estado de ponteiro.

### 5.2 Carregando mais livros

Página rolada até o fim da parte carregada: a última linha real do grid e, abaixo, três cards em skeleton ocupando a linha seguinte, com um único fade de entrada. Header de conteúdo fora do viewport pela rolagem; a sidebar continua fixa.

### 5.3 Carregando a página

Header de conteúdo com uma barra de skeleton de 36px de altura e 240px de largura no lugar do nome, barra de 13px e 200px no lugar da linha de contagem, título real `Livros` e seis cards em skeleton no grid de três colunas. Um único fade de entrada.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão (4.1).** Fundo `noite`. Header com `ArrowLeft`, `Editora` e o sino em `papel-suave`. Nome em `papel-suave`, contagem em `grafite-claro`. Título de seção em `papel-suave`. Título do card em `papel-suave`, autor em `grafite-claro`, editora, ano e páginas em `grafite-fundo-escuro`. Divisor `linha-noite`. Placeholder de capa em `capa-placeholder-noite`. Pill `Lendo` com fundo `musgo-fundo-escuro` e texto `musgo-claro`; pill `Quero ler` com borda `linha-noite` e texto `papel-suave`. Barra inferior em `noite-elevada` com **Descobrir** ativo em `musgo-claro`.
- **Web, padrão (5.1).** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, com **Descobrir** ativo em `musgo-fundo-escuro` e o lockup da marca em `musgo-claro`. Pill `Lido` com fundo `musgo-claro` e texto `noite`. Card em hover com fundo `noite-elevada`, **mais claro** que o fundo.

Nos dois, os shadows ficam com **metade da opacidade**: a hierarquia no escuro vem da cor de superfície e do divisor `linha-noite`, não da sombra.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Card de livro, variante Busca | documento-de-design §4.5 |
| Placeholder de capa em retângulo de canto vivo | documento-de-design §4.5 e §7.6 |
| Status pill dos cinco status | documento-de-design §4.6 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Banner de erro inline em `rubi-fundo` | mesmo tratamento dos resultados do `Descobrir` (periodo-1/F-ACV-BUSCA/descobrir.md) |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que ainda não existem na fonte.** Os mesmos de `pagina-do-autor.md`, compartilhados pelas três páginas de catálogo e pendentes de incorporação pelo controle de mudança do plano §3:

1. **O esqueleto da página de catálogo:** header de detalhe com o **tipo da página** como título no mobile e o **nome** como título na web, bloco de identidade sem imagem com a contagem `N livros no acervo`, bloco de conteúdo próprio opcional (ausente na editora) e lista de cards da variante Busca, em grid de três colunas na web.
2. **A falha de paginação inline** no fim da lista, que preserva os itens já carregados.
3. **O estado defensivo sem livros** para página de catálogo.

O **skeleton no fim da lista** reaproveita o carregamento incremental já pendente de incorporação desde o lote do Período 1 (`docs/design/AGENTS.md` §11).

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header, mobile | `Editora` |
| Título do header, web | `Todavia` |
| Nome no bloco de identidade, mobile | `Todavia`, `Mazza Edições` |
| Contagem, mobile | `36 livros no acervo`; singular `1 livro no acervo` |
| Linha abaixo do header, web | `Editora · 36 livros no acervo` |
| Título de seção | `Livros` |
| Metadado do card | `Todavia · 2019`, `264 páginas` |
| Status pill | `Quero ler`, `Lendo`, `Lido` |
| Falha de paginação, texto | `Não foi possível carregar mais livros. Verifique sua conexão e tente de novo.` |
| Falha de paginação, ação | `Tentar de novo` |
| Erro, título | `Não foi possível abrir esta página` |
| Erro, texto | `A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.` |
| Erro, ação | `Tentar de novo` |
| Sem livros, título | `Nenhum livro no acervo` |
| Sem livros, texto | `Os livros de Mazza Edições não estão no acervo no momento.` |
| Sem livros, ação | `Buscar no Descobrir` |

Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no botão de voltar, no sino e em `Tentar de novo`. O card inteiro é a área acionável e passa de 48px com folga.
- Contraste WCAG AA no corpo nos dois temas. Editora, ano e páginas usam `grafite-suave`, que passa apenas em tamanho grande: por isso nenhum deles carrega informação essencial, e título e autor, que carregam, usam `tinta` e `grafite`.
- O status do livro é distinguível **sem depender de cor**: cada pill traz ícone próprio conforme design §4.6.
- No leitor de tela, o nome da editora é o título principal da página nos dois tamanhos, mesmo que no mobile o header visual diga `Editora`: o header é rótulo da tela e o nome é o conteúdo.
- Na web, foco de teclado visível em card, link e botão, com contorno de 2px `musgo` e offset de 2px. A ordem de tabulação vai da sidebar para os cards, na ordem da lista.
- Quando a próxima página chega, o foco do teclado não salta: os cards novos entram depois do último card focado.
- O estado de carregamento preserva a altura da lista para que o conteúdo não salte quando os livros chegam.
- `prefers-reduced-motion` respeitado: o fade de entrada do skeleton e a transição de hover viram estáticos.

---

## 10. O que não fazer nesta tela

**Específico da página da editora**

- **Não desenhe a página como perfil.** Nada de logo da editora, site, redes sociais, seguir, curtir, contador de seguidores, comentários, avaliação, compartilhar, sugerir edição ou reportar erro. A página não tem dono e não recebe conteúdo de usuário.
- **Não invente conteúdo institucional.** Sem descrição da editora, ano de fundação, cidade ou selo. O requisito pede a lista de livros e nada mais.
- **Não desenhe livro pessoal na lista.** Nem para o dono, nem com badge `PESSOAL`, nem em seção separada (RN-03, RNF-SEC-06).
- Não mostre variantes do nome da editora nem "também conhecida como". A normalização já uniu as variantes, e a interface mostra uma forma só.
- Não desenhe nota nos cards. Os indicadores de nota vivem na página do livro.
- Não desenhe filtro, busca interna, ordenação ou abas nesta página. É consulta, não busca; o filtro por editora mora no `Descobrir`.
- Não desenhe seção de editoras relacionadas, lançamentos ou mais lidos da editora. Curadoria de descoberta não é escopo de nenhum requisito.
- Não desenhe numeração de página no mobile nem botão `Carregar mais`. A paginação é por rolagem.
- Não apague os cards já carregados quando a próxima página falhar.
- Não desenhe `0 livros no acervo`.
- Não troque a aba ativa: a barra inferior mantém a aba de origem.

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

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
