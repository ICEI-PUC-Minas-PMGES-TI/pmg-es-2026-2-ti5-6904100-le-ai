# Estante (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Estante`, gerado por `docs/design/periodo-1/F-EST/estante.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-EST/estante.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-EST-2.md
**Requisitos que entram:**
- F-EST-2: RF-EST-09 (favoritos: a estante passa a **exibir** o favorito no card e a filtrar por ele; marcar e desmarcar ficam na página do livro e nas ações de leitura), RF-EST-10 (só a entrada para o histórico de leituras), RF-EST-13 (busca dentro da estante: **já desenhada no canvas do Período 1**, nos artboards marcados `· Período 2`; esta edição só a torna permanente no header)

**Não funcionais:** RNF-DES-02 (estante e filtro de favoritos paginados), RNF-SEC-02 (favoritos são do próprio leitor), RNF-USA-02, RNF-USA-03
**Regras de negócio:** RN-04 (os cinco status continuam como estão), RN-15 e RN-03 (favoritar livro pessoal de outra pessoa é recusado; livro pessoal do próprio leitor pode ser favorito)
**Versão web:** sim. RF-EST-09, RF-EST-10 e RF-EST-13 têm marcação na coluna Web de `REQUISITOS.md` §5.3.

---

## 1. O que muda e por quê

F-EST-2 fecha os três recursos que F-EST deixou para o Período 2, e os três tocam a estante. A estante continua sendo o **registro** do leitor, com o mesmo grid, os mesmos pills e a mesma linha de ordenação. O que muda:

| O que entra | Onde | Requisito |
|---|---|---|
| A lupa passa a existir em **todos** os artboards mobile, e o campo `Buscar na minha estante` em todos os artboards web | Header | RF-EST-13 |
| Ícone de histórico no header mobile, ao lado da lupa | Header mobile | RF-EST-10 |
| Botão textual `Histórico de leituras` no header de conteúdo | Header web | RF-EST-10 |
| Pill `Favoritos` no fim da faixa de filtros, depois de um divisor | Faixa de filtros | RF-EST-09 |
| Marca de favorito, um `Heart` preenchido pequeno no canto superior esquerdo da capa | Card de livro | RF-EST-09 |

**A estante só exibe o favorito.** Marcar e desmarcar acontece na página do livro (botão quadrado com `Heart`, já desenhado na edição `pagina-do-livro/pagina-do-livro.md`) e no sheet de ações de leitura (edição `acoes-de-leitura/acoes-de-leitura.md`). No card não existe botão de coração, nem toque longo, nem menu: o `Heart` da capa é marca, como o `Check` do livro Lido.

**Favorito é independente da estante** (RF-EST-09, F-EST-2): favoritar não põe o livro em `Quero ler` e desfavoritar não tira nada da estante. Por isso o filtro `Favoritos` mostra **todos** os favoritos do leitor, inclusive o livro que ele favoritou sem pôr na estante. Esse livro aparece no grid com a linha `Fora da estante` no lugar do status pill. É o único lugar do produto onde o leitor encontra a lista dos favoritos, e deixar um favorito de fora dela faria o favorito sumir.

**O que deixa de valer do prompt do Período 1:** as proibições de desenhar favoritos (filtro, coração no card), de desenhar a lupa e o campo de busca nos artboards do Período 1, e de desenhar histórico. O restante da seção 10 daquele prompt continua valendo e está repetido abaixo.

**Destinos das novas entradas**, desenhados em outros prompts. Não desenhe as telas de destino neste canvas:

| Entrada | Destino |
|---|---|
| Ícone de histórico (mobile) e `Histórico de leituras` (web) | `F-EST-2/historico-de-leituras.md`, com a área **Estante** ativa |
| Lupa e campo de busca | o modo de busca que já está no canvas (artboards `Busca na estante, com resultado · Período 2` e `Busca na estante, sem resultado · Período 2`) |

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Estante · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- Os artboards novos entram **no fim da linha** da sua plataforma, depois dos existentes, sem reordenar nenhum.

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

## 3. O que permanece intocado

- **O shell inteiro**, exatamente como está no canvas: barra inferior do mobile com `Estante` ativo, sidebar da web com `Estante` ativo e a marca na sidebar do jeito que já aparece. Esta edição não mexe em navegação.
- **O título** `Minha estante` em `display` `tinta`, nos dois headers.
- **O modo de busca do header mobile** e os artboards `Busca na estante, com resultado · Período 2` e `Busca na estante, sem resultado · Período 2`, na linha mobile e na web: campo, `ArrowLeft`, placeholder `Buscar na minha estante`, contagem com o escopo (`1 livro encontrado na sua estante`), vazio com `Buscar no acervo`. Não redesenhe a busca. A única mudança nesses artboards é o pill `Favoritos` que entra na faixa (4.2) e o rótulo, que perde o sufixo `· Período 2` (seção 4.8).
- **Os seis pills existentes** (`Todos`, `Lendo`, `Quero ler`, `Lido`, `Relendo`, `Abandonado`), com a contagem dentro, o desenho de ativo e inativo e a seleção única.
- **A linha de ordenação**, o bottom sheet de ordenação no mobile e o `select` na web, com as oito opções.
- **O card da variante Estante**: capa 2:3 em canto vivo, título, autor, status pill, `Check` do Lido e `ArrowsClockwise` do Relendo no canto superior direito, barra de progresso com o percentual, leitura em risco em `ambar-claro` com `Warning` e `Sem progresso há 24 dias`, linha `Parou na página 210 de 552` do abandonado.
- **Os estados** de carregando, erro, estante vazia, vazio por filtro e abandono automático, com toda a copy.
- **Toda a copy do Período 1** que não aparece na seção 8 como alterada.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas. Onde o mesmo rótulo existe no mobile e na web, a linha é indicada.

### 4.1 Header mobile: lupa e histórico em todos os artboards

Vale para **todo artboard mobile em que o header padrão aparece**: `Padrão, todos os status`, `Filtro Lendo, leitura em risco`, `Filtro Abandonado`, `Vazio por filtro (Relendo)`, `Estante vazia`, `Carregando`, `Erro de carregamento`, `Abandonado automaticamente` e `Padrão, modo escuro`. Não vale para os dois artboards de busca, em que o header já é o campo.

- À esquerda, o título `Minha estante`, como está.
- À direita, na mesma linha e alinhados ao centro vertical do título, três ícones Phosphor `regular` de 24px em `tinta`, com `space-4` de gap entre eles, nesta ordem:
  1. `ClockCounterClockwise`, que abre o histórico de leituras. Rótulo acessível `Histórico de leituras`.
  2. `MagnifyingGlass`, que abre o modo de busca que já está no canvas. Rótulo acessível `Buscar na minha estante`.
  3. `Bell`, o sino do shell, com o badge de não lidas como está.
- Cada ícone tem **48px de alvo de toque**, mesmo com o glifo de 24px. Os alvos podem se tocar, mas não se sobrepõem.
- Se algum desses artboards já mostra a lupa, mantenha-a e acrescente só o `ClockCounterClockwise` à esquerda dela.
- O histórico e a lupa aparecem **também na estante vazia**: o histórico tem estado vazio próprio na tela dele, e esconder a entrada aqui faria o leitor novo não saber que ela existe.
- No modo de busca (artboards de busca), o `ClockCounterClockwise` some junto com o sino, porque o header inteiro vira o campo. Sair do modo devolve os três ícones.

### 4.2 Faixa de filtros: pill `Favoritos`

Vale para **todo artboard, mobile e web, em que a faixa de filtros aparece**, inclusive os de busca, o carregando e a estante vazia.

- Depois do pill `Abandonado`, um **divisor vertical** de 1px `linha` com 24px de altura, centralizado na altura dos pills, com `space-2` de margem de cada lado. Ele separa os cinco status de RN-04 do favorito, que não é status.
- Depois do divisor, o pill `Favoritos`, com o mesmo desenho dos outros: `radius-full`, padding `space-2 space-4`, rótulo em `caption` e contagem em `num-inline`, no formato `Favoritos 4`. A diferença é o ícone: `Heart` (Phosphor, 16px) à esquerda do rótulo, com `space-1` de gap.
  - Inativo: borda de 1px `linha`, fundo transparente, texto `grafite`, `Heart` peso `regular` `grafite`.
  - Ativo: fundo `musgo-fundo`, sem borda, texto peso 600 `musgo`, `Heart` peso `fill` `musgo`.
- **Seleção única continua valendo**: ativar `Favoritos` desativa o status que estava ativo, e ativar um status desativa `Favoritos`. Não existe combinação de `Lido` com `Favoritos`.
- No mobile a faixa continua rolando na horizontal, e o pill `Favoritos` fica fora da viewport à direita no estado inicial, como qualquer pill que não cabe. Nos artboards em que ele não aparece por isso, não force a faixa a caber.
- Na web os oito elementos (sete pills e o divisor) cabem numa linha e não rolam, como antes. Hover do pill `Favoritos` igual ao dos outros, fundo `linha`.
- No `Carregando` a contagem do `Favoritos` também fica oculta, como a dos outros pills.
- Na `Estante vazia` o pill aparece como `Favoritos 0`.

### 4.3 Marca de favorito no card

Vale para **todo artboard que mostra um card de livro favorito**. Na lista da seção 5, são favoritos: `Vidas Secas`, `Quarto de Despejo` e `A Hora da Estrela`, e o livro fora da estante `Olhos d'água`, que só aparece no filtro `Favoritos`.

- No **canto superior esquerdo** da capa, com `space-2` de recuo do topo e da borda esquerda, um círculo de 28px em `papel` com `elev-1` e, dentro, `Heart` (Phosphor, `fill`, 16px, `musgo`). É o mesmo tratamento do `Check` do Lido, no canto oposto, para que as duas marcas convivam na mesma capa sem se tocar.
- O canto superior direito continua com o `Check` do Lido e o `ArrowsClockwise` do Relendo. `Vidas Secas` e `Quarto de Despejo` mostram as duas marcas ao mesmo tempo; `A Hora da Estrela` mostra o coração e o `ArrowsClockwise`.
- A marca não é botão: tocar nela faz o mesmo que tocar no card. Não tem hover próprio na web.
- Livro que não é favorito não tem marca nenhuma nesse canto. Nada de coração vazio.

### 4.4 `Padrão, todos os status` (linhas mobile e web)

- Entram 4.1 (só no mobile), 4.2 e 4.3. O pill ativo continua `Todos 10`; `Favoritos 4` fica inativo.
- A contagem `10 livros` não muda: `Todos` é a estante, e o livro fora da estante `Olhos d'água` não entra nela.
- Cards com a marca de favorito: `Vidas Secas`, `Quarto de Despejo`, `A Hora da Estrela`.

### 4.5 `Filtro Lendo, leitura em risco` (linhas mobile e web), `Filtro Abandonado`, `Abandonado automaticamente`, `Vazio por filtro (Relendo)`, `Vazio por filtro, com hover`

- Entram 4.1 (mobile) e 4.2. Nenhum livro destes filtros é favorito, então nenhuma capa ganha marca.

### 4.6 `Carregando` (linhas mobile e web), `Erro de carregamento`, `Estante vazia`

- Entram 4.1 (mobile) e 4.2, com as regras de contagem de 4.2. O skeleton do grid não ganha marca de favorito.

### 4.7 Header de conteúdo da web: busca e histórico em todos os artboards

Vale para **todo artboard web**: `Padrão, todos os status`, `Filtro Lendo, leitura em risco`, `Vazio por filtro, com hover`, `Carregando`, `Busca na estante, sem resultado · Período 2` e `Padrão web, modo escuro`.

- Header de conteúdo de 72px, título `Minha estante` à esquerda, como está.
- À direita, alinhados ao centro vertical do título, com `space-4` de gap:
  1. **Botão textual** `Histórico de leituras`, com `ClockCounterClockwise` (Phosphor, `regular`, 20px, `musgo`) à esquerda do texto, `space-2` de gap, texto em `body-strong` `musgo`, altura de 40px, padding lateral `space-3`, `radius` 12, sem borda e sem fundo. Hover: fundo `musgo-fundo`, `dur-fast`. Foco: contorno de 2px `musgo` com offset de 2px.
  2. **O campo de busca** de 44px de altura e 320px de largura, com `MagnifyingGlass` dentro e o placeholder `Buscar na minha estante`, exatamente como o artboard `Busca na estante, sem resultado · Período 2` já o desenha. Nos artboards que ainda não o têm, ele entra vazio.
- Sem sino, como em toda a web.
- **Abaixo de 768px**, o botão textual vira o `ClockCounterClockwise` do header mobile e o campo vira a lupa, na ordem de 4.1.

### 4.8 Rótulos dos artboards de busca

- `Estante · Busca na estante, com resultado · Período 2` passa a `Estante · Busca na estante, com resultado`.
- `Estante · Busca na estante, sem resultado · Período 2` passa a `Estante · Busca na estante, sem resultado`, nas duas linhas.
- O sufixo marcava o que ainda não existia no Período 1. Agora a busca é da tela. O conteúdo dos artboards não muda além de 4.2.

### 4.9 `Padrão, modo escuro` e `Padrão web, modo escuro`

- Entram os mesmos elementos de 4.4 (mobile) e 4.4 com 4.7 (web), com o tratamento escuro da seção 6.

---

## 5. Artboards novos

### Dados do filtro `Favoritos`

Os quatro favoritos da leitora, na ordenação atual `Adicionados recentemente`:

| Título | Autor | Status na estante | Detalhe no card |
|---|---|---|---|
| Olhos d'água | Conceição Evaristo | **fora da estante** | linha `Fora da estante` |
| A Hora da Estrela | Clarice Lispector | Relendo | página 31, 32% |
| Vidas Secas | Graciliano Ramos | Lido | pill `Lido` |
| Quarto de Despejo | Carolina Maria de Jesus | Lido | pill `Lido` |

`Olhos d'água` foi favoritado na página do livro sem ser adicionado à estante. Por isso ele não conta em `Todos 10` nem em nenhum status, e conta em `Favoritos 4`.

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Estante · Filtro Favoritos`

- Header com os três ícones de 4.1. Faixa rolada até o fim, para que `Favoritos 4` apareça **ativo** à direita, com o divisor antes dele e `Relendo 1` e `Abandonado 1` visíveis à esquerda.
- Linha de ordenação: `4 livros` à esquerda e `Adicionados recentemente` à direita.
- Grid de duas colunas com os quatro cards, todos com a marca de 4.3.
- **Card do livro fora da estante**, `Olhos d'água`: capa, título e autor como qualquer card; no lugar do status pill, a linha `Fora da estante` em `caption` `grafite`, sem ícone, sem borda e sem fundo. Sem barra de progresso. A capa não é esmaecida: o livro não está em estado de erro, só não está na estante.
- `A Hora da Estrela` com `ArrowsClockwise` no canto superior direito, o coração no esquerdo e a barra de progresso em 32%.
- Barra inferior com **Estante** ativo.

#### 5.2 `Estante · Filtro Favoritos, vazio`

O leitor que ainda não favoritou nenhum livro.

- Faixa rolada até o fim, com `Favoritos 0` ativo.
- Linha de ordenação ausente, como nos outros vazios por filtro.
- Bloco centralizado no espaço do grid, com `space-6` entre os elementos, na forma do vazio por filtro que já está no canvas:
  - `Heart` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhum livro favorito`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Marque um livro como favorito na página dele ou nas ações de leitura.`
  - Botão primário pill, altura 48px, `musgo`, texto `papel`: `Ver livros lidos`, que ativa o pill `Lido`.

### Linha 2, web, no fim da linha

#### 5.3 `Estante · Filtro Favoritos` (web)

- Sidebar com **Estante** ativo. Header de conteúdo com `Histórico de leituras` em **hover** (fundo `musgo-fundo`) e o campo de busca vazio, como em 4.7.
- Faixa em uma linha com os sete pills e o divisor, `Favoritos 4` ativo.
- Linha de ordenação com `4 livros` e o `select`.
- Grid de seis colunas com os quatro cards alinhados à esquerda, sem esticar e sem centralizar, e o card de `Olhos d'água` com `Fora da estante`.
- O card de `Vidas Secas` em hover, com a capa em `elev-2` e o título em `musgo`, para conferir que a marca de favorito não muda no hover.

### Linha 3, modo escuro, no fim da linha

#### 5.4 `Estante · Filtro Favoritos, modo escuro`

- O artboard 5.1 no modo escuro, com o tratamento da seção 6.

---

## 6. Artboards a remover e tratamento escuro

**Nenhum artboard sai.** Todos os do Período 1 continuam, com as mudanças da seção 4.

**Tratamento escuro dos elementos novos.** Modo escuro é lock de página inteira: nenhuma seção inverte no meio da rolagem. Superfície elevada fica **mais clara** que o fundo, `musgo-claro` é o acento e os shadows têm metade da opacidade, porque a hierarquia no escuro vem da cor de superfície e do divisor `linha-noite`.

- Ícones do header mobile (`ClockCounterClockwise`, `MagnifyingGlass`, `Bell`) em `papel-suave`.
- Botão `Histórico de leituras` da web em `musgo-claro`, hover com fundo `musgo-fundo-escuro`. Campo de busca em `noite-elevada` com borda `linha-noite`, como já está no `Padrão web, modo escuro`.
- Divisor da faixa em `linha-noite`.
- Pill `Favoritos` inativo com borda `linha-noite`, texto e `Heart` em `grafite-claro`; ativo com fundo `musgo-fundo-escuro`, texto e `Heart` `fill` em `musgo-claro`.
- Marca de favorito na capa: círculo em `noite-elevada`, **mais claro** que o fundo, com `Heart` `fill` em `musgo-claro`. Mesmo tratamento que o círculo do `Check` já tem no escuro.
- Linha `Fora da estante` em `grafite-claro`.
- Vazio de favoritos: `Heart` em `grafite-fundo-escuro`, título em `papel-suave`, texto em `grafite-claro`, botão com fundo `musgo-claro` e texto `noite`.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Padrão de tela da estante, com header, filtros, grid e vazio | documento-de-design §5.1 |
| Card de livro, variante Estante, com as marcas de capa | documento-de-design §4.5 |
| Status pill dos cinco status | documento-de-design §4.6 |
| Botão textual e botão primário pill | documento-de-design §4.1 |
| Ícone `fill` só para estado ativo (favorito) | documento-de-design §6 |
| Lupa da estante com escopo local | documento-de-design §5.1 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md e documento-de-design §5 |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Pill `Favoritos` na faixa de status**, separado dos cinco status por um divisor vertical e com `Heart` no pill. O §5.1 define a faixa como "um pill por status"; o favorito não é status.
- **Marca de favorito no canto superior esquerdo da capa**, com o mesmo círculo de 28px do `Check`. O §4.5 define as marcas de Lido, Relendo e `PESSOAL`, e não a de favorito.
- **Card de favorito fora da estante**, com a linha `Fora da estante` no lugar do status pill. É uma variação da variante Estante, não uma quarta variante.
- **Terceiro ícone no header da estante** (`ClockCounterClockwise`) e **botão textual no header de conteúdo da web**. O §5.1 prevê só a lupa.

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Pill de filtro | não existia | `Favoritos 4` / `Favoritos 0` |
| Contagem no filtro Favoritos | não existia | `4 livros` |
| Card fora da estante | não existia | `Fora da estante` |
| Vazio de favoritos, título | não existia | `Nenhum livro favorito` |
| Vazio de favoritos, texto | não existia | `Marque um livro como favorito na página dele ou nas ações de leitura.` |
| Vazio de favoritos, botão | não existia | `Ver livros lidos` |
| Botão do header web | não existia | `Histórico de leituras` |
| Rótulo acessível do ícone de histórico | não existia | `Histórico de leituras` |
| Rótulo acessível da lupa | não existia | `Buscar na minha estante` |
| Rótulo acessível da marca de favorito | não existia | `Favorito` |
| Rótulo de artboard | `Busca na estante, com resultado · Período 2` | `Busca na estante, com resultado` |
| Rótulo de artboard | `Busca na estante, sem resultado · Período 2` | `Busca na estante, sem resultado` |

As linhas da copy do Período 1 marcadas com `· P2` (placeholder, contagens e vazio da busca local) continuam iguais e agora são copy da tela.

Zero em-dash, zero emoji. Nenhum número sem unidade, exceto as contagens dentro dos pills, em que o rótulo do pill já é a unidade.

---

## 9. Acessibilidade e interação do que muda

- **Três ícones no header mobile**, cada um com 48px de alvo e rótulo acessível próprio. A ordem de leitura é título, histórico, lupa, sino.
- **Pill `Favoritos`** anunciado como os outros filtros, com a contagem (`Favoritos, 4 livros`). A troca de filtro e a nova contagem são anunciadas, como na faixa existente. O estado ativo não depende só de cor: muda o fundo, o peso do texto e o peso do `Heart`.
- **Divisor da faixa** é decorativo para leitor de tela: não recebe foco nem é anunciado.
- **Marca de favorito** anunciada junto do card (`Vidas Secas, Graciliano Ramos, Lido, favorito`). Ela não é foco próprio: o card inteiro continua sendo a única área acionável.
- **`Fora da estante`** anunciado no lugar do status, para que o leitor de tela não leia um card sem status.
- **Web:** o botão `Histórico de leituras` e o campo entram na ordem de tabulação entre a sidebar e a faixa de filtros, nessa ordem. Foco visível com contorno de 2px `musgo` e offset de 2px.
- Contraste: `Fora da estante` usa `grafite`, não `grafite-suave`, porque é informação essencial do card.
- `prefers-reduced-motion`: o hover do botão de histórico vira estático.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Grid, cards, pills existentes, linha de ordenação, estados e shell ficam como estão no canvas.
- **Não redesenhe a busca na estante.** Ela já está desenhada nos artboards de busca; esta edição só a deixa visível no header de todos os artboards.
- **Não reordene os artboards existentes.** Os novos entram no fim de cada linha. A única troca de rótulo permitida é a da seção 4.8.
- **Não desenhe a tela do histórico** neste canvas. Ela é `F-EST-2/historico-de-leituras.md`.

**Específico dos favoritos na estante**

- **Não desenhe botão de favoritar no card.** Nem coração vazio para tocar, nem toque longo, nem menu de três pontos. Favoritar mora na página do livro e nas ações de leitura; a estante só mostra.
- **Não combine `Favoritos` com um status.** A faixa continua com seleção única.
- **Não trate `Favoritos` como sexto status.** Ele vem depois do divisor, com o `Heart`, e não muda a ordem nem o desenho dos cinco status.
- Não pinte o coração de vermelho nem de rosa. O favorito é `musgo`, e o coração vazio não existe no card.
- Não esconda do filtro `Favoritos` o livro favoritado fora da estante, e não o conte em `Todos`.
- Não dê status pill falso ao livro fora da estante (nada de `Quero ler` inventado). Ele recebe só a linha `Fora da estante`.
- Não crie uma seção separada de favoritos acima do grid nem uma faixa horizontal de capas favoritas.
- Não desenhe contagem de favoritos no card nem ranking de favoritos.

**Específico da estante, do Período 1, que continua valendo**

- **Não desenhe botão de abandonar dentro do card.** Abandonar é ação destrutiva, passa por confirmação e mora no bottom sheet de ações de leitura.
- **Não esmaeça, dessature nem cubra a capa do livro abandonado**, nem a do livro fora da estante.
- Não desenhe uma quarta variante de card. As três variantes de design §4.5 são Estante, Feed e Busca.
- Não transforme o alerta de risco em modal, banner de topo ou interstitial. Ele é uma marca no card.
- Não desenhe a estante como lista de linhas no mobile. O padrão de design §5.1 é grid.
- **Não misture resultado de acervo ao grid da estante** e não caia no acervo sozinho quando a busca local não encontra nada. A ponte é o botão `Buscar no acervo`.
- Não use o placeholder genérico do acervo (`Título, autor, editora ou ISBN`) no campo da estante.
- Não desenhe nota nos cards, componente de sequência diária, estatísticas nem gráficos nesta tela.

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
- Nada de coração pulsando, partícula ou confete.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é: `Favoritos`, não "Seus queridinhos".
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
- Nada de conteúdo essencial escondido em hover. A marca de favorito e o botão de histórico aparecem sempre.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "4" sozinho fora do pill: é "4 livros".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".
- Nada de repetir o símbolo de percentual quando o contexto já é percentual.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
