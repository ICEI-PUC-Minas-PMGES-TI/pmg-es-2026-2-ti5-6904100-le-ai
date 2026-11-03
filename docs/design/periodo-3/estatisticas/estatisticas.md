# F-STA-OPC · Estatísticas (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Estatísticas`, gerado por `docs/design/periodo-2/F-STA/estatisticas.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/F-STA/estatisticas.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-STA-OPC.md
**Requisitos que entram:**
- F-STA-OPC: RF-STA-04 (visualizar a distribuição das notas que o leitor atribuiu)

**Não funcionais:** RNF-SEC-02 (o painel continua só do próprio leitor), RNF-USA-03 (contraste do gráfico), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-06 (a nota vai de 0 a 5 em passos de 0,5: onze valores; uma nota por livro, editável e removível; indicador ausente aparece como ausente, nunca como zero), RN-03 (livro pessoal conta), RN-08 (só vale para o recorte de perfil, desenhado em outro prompt)
**Versão web:** sim. RF-STA-04 tem marcação na coluna Web de `REQUISITOS.md` §5.8.

---

## 1. O que muda e por quê

A nota média, que o Período 2 já desenhou na seção `Médias`, esconde o formato: duas leitoras com média 3,5 podem dar notas muito diferentes, uma sempre no meio, outra sempre nos extremos. RF-STA-04 fecha o painel com **um gráfico novo, `Notas que você deu`**, que mostra quantos livros receberam cada uma das onze notas possíveis.

| O que entra | Onde | Plataforma |
|---|---|---|
| Card `Notas que você deu`, com onze colunas na ordem da escala e a contagem sobre cada coluna | Logo depois da seção `Médias`, antes de `Páginas por mês`: a distribuição se lê junto da nota média | mobile e web |
| Visão em tabela do mesmo card | Dentro do card, pelo `Ver como tabela` | mobile e web |
| Card sem gráfico quando o período não tem nota | No mesmo lugar | mobile e web |

**Decisões já tomadas, não rediscutir:**

- **Formato: contagem.** Cada coluna mostra, logo acima dela, quantos livros receberam aquela nota (`2`, `3`). O total de notas aparece no subtítulo. Sem percentual em lugar nenhum.
- **Onze colunas, sempre, quando há ao menos uma nota.** Os valores são exatamente `0`, `0,5`, `1`, `1,5`, `2`, `2,5`, `3`, `3,5`, `4`, `4,5` e `5`. Sem faixa, sem agrupar meia estrela com estrela cheia, sem arredondar. Nota com zero livros continua no eixo, com o `0` à mostra: é informação real ("nunca dei 0,5").
- **Sem nenhuma nota no período, o gráfico não existe.** Onze colunas zeradas afirmariam algo falso. O card mostra só o título e uma frase.
- **O gráfico obedece ao período escolhido**, como a nota média ao lado: as duas saem do mesmo conjunto de notas. Em `2026` o gráfico conta as 8 notas de 2026; em `Acumulado`, as 31 notas desde a criação da conta. A soma das colunas é sempre igual ao número de notas do helper de `Nota média`.

**O que deixa de valer do prompt do Período 2:** a proibição de desenhar a distribuição das notas que a leitora deu. Todas as outras regras daquele prompt continuam, e estão repetidas na seção 10.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Estatísticas · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
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
capa-placeholder #DED4BC   capa de livro ainda não carregada, e skeleton

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
capa-placeholder-noite #3A342A  capa não carregada, e skeleton

Regra do acento: musgo é a cor de ação em toda a interface. Nenhuma tela usa
azul, roxo ou rosa em CTA. rubi só em contexto destrutivo e de erro, ambar só
em alerta, broto só em progresso e gamificação. Sem gradiente de acento, sem
gradiente em texto, sem sombra preta pura.

GRÁFICOS
Gráfico usa musgo como cor principal, broto como secundária e grafite como
neutra, com no máximo três séries por gráfico. Nesta tela cada gráfico tem
UMA série, em musgo (musgo-claro no escuro). Contraste da coluna contra o
fundo: musgo sobre papel-elevado 6,15:1; musgo-claro sobre noite-elevada
7,21:1. broto sobre papel fica em 2,5:1, abaixo do mínimo de 3:1 para marca
gráfica, e por isso não pinta coluna nesta tela.

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

MODO ESCURO
Cidadão de primeira classe e lock de página inteira: nenhuma seção inverte no
meio da rolagem. Superfície elevada fica MAIS CLARA que o fundo, nunca mais
escura.

CONTRASTE
WCAG AA no corpo, AAA no título quando possível. grafite-suave e
grafite-fundo-escuro passam apenas em tamanho grande: nunca carregam texto de
corpo nem informação essencial. Marca gráfica (coluna de gráfico) com no
mínimo 3:1 contra a superfície em que está.
```

---

## 3. O que permanece intocado

- **O shell inteiro**, com **Perfil** ativo, e o header de detalhe (`ArrowLeft`, `Estatísticas`, sino no mobile; header de conteúdo sem sino na web).
- **A faixa de períodos** do mobile e a **lista vertical de períodos** da web, com os mesmos períodos e contagens.
- **A linha de período**, a seção `Totais` e a seção `Médias`, inclusive a nota média, o helper `Média das 8 notas que você deu em 2026.` e as médias ausentes de 2023.
- **Os dois gráficos mensais** (`Páginas por mês`, `Livros concluídos por mês`, e as versões por ano no acumulado), com o balão, a faixa do mês, a visão em tabela e a navegação por teclado.
- **O rodapé** do recálculo, o **vazio da leitora nova** (Caio Nogueira) e o **erro de carregamento**. O vazio continua sem nenhum gráfico: a leitora nova não tem nota, e o bloco centralizado já explica o que fazer.
- **Toda a copy do Período 2** que não aparece na seção 8.

### Dados do card novo

Os valores continuam mock e batem com o canvas do Período 2: a soma das colunas de cada período é o número de notas do helper de `Nota média`, e a média calculada a partir das colunas arredonda para a nota média já desenhada. Leitora: Marina Beltrão (`@marinableu`). Hoje é 29 de setembro de 2026.

| Nota | 2026 | 2025 | 2024 | 2023 | Acumulado |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | sem notas | 0 |
| 0,5 | 0 | 0 | 0 | sem notas | 0 |
| 1 | 0 | 0 | 0 | sem notas | 0 |
| 1,5 | 0 | 0 | 0 | sem notas | 0 |
| 2 | 0 | 1 | 0 | sem notas | 1 |
| 2,5 | 0 | 1 | 0 | sem notas | 1 |
| 3 | 1 | 1 | 1 | sem notas | 3 |
| 3,5 | 1 | 2 | 2 | sem notas | 5 |
| 4 | 2 | 3 | 3 | sem notas | 8 |
| 4,5 | 2 | 2 | 2 | sem notas | 6 |
| 5 | 2 | 3 | 2 | sem notas | 7 |
| **Total** | **8 notas** (média 4,2) | **13 notas** (média 3,9) | **10 notas** (média 4,1) | **nenhuma** | **31 notas** (média 4,0) |

Conferência: 2026 soma 33,5 estrelas em 8 notas, 4,19; 2025 soma 50,5 em 13, 3,88; 2024 soma 41 em 10, 4,1; o acumulado soma 125 em 31, 4,03. Cada livro conta uma vez, com a nota que a leitora deu a ele; livro pessoal conta; reler um livro não cria segunda nota.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas.

### 4.0 O card novo, `Notas que você deu`

Descrito uma vez aqui e usado em todos os artboards que mudam e nos novos.

**Mobile.** `space-6` abaixo do container de `Médias`, antes do card `Páginas por mês`. Card `papel-elevado`, `radius-md`, margem lateral `space-5`, padding `space-5`, `elev-0`, o mesmo card dos gráficos mensais.

- Título `Notas que você deu` em `title-sm` `tinta`. Abaixo, em `caption` `grafite`: `8 notas em 2026` (`13 notas em 2025`, `10 notas em 2024`, `31 notas desde 2023`).
- `space-4` abaixo, a **área do gráfico**, 160px de altura, largura total do card:
  - **Onze colunas** de uma série só, cor `musgo`, na ordem da escala da esquerda para a direita, de `0` a `5`. Cada nota tem uma faixa de largura igual (cerca de 28px no mobile); a coluna ocupa 16px no centro da faixa, e o resto é ar. Ponta superior com raio de 4px, base reta, todas crescendo da mesma linha de base de 1px `linha`. Sem contorno, sem sombra, sem gradiente.
  - **Sem eixo Y e sem linhas de grade:** a contagem está escrita sobre cada coluna, então marcas de eixo seriam o mesmo número duas vezes. A coluna mais alta do período ocupa 120px; as outras são proporcionais.
  - **Contagem sobre cada coluna**, em `caption` peso 600 `tinta` com numeral tabular, centralizada, `space-1` acima da ponta. **Nota sem nenhum livro não tem coluna**: só a linha de base naquele ponto, e o `0` em `caption` `grafite`, apoiado `space-1` acima da linha de base. Todas as onze notas mostram o número, inclusive o zero.
  - **Eixo X** abaixo da linha de base, em `caption` `grafite` com numeral tabular, centralizado sob cada faixa: `0`, `0,5`, `1`, `1,5`, `2`, `2,5`, `3`, `3,5`, `4`, `4,5`, `5`.
  - `space-2` abaixo do eixo, em `caption` `grafite`, alinhado à esquerda: `Nota em estrelas. Sobre cada coluna, o número de livros.`
- `space-3` abaixo, o helper do card em `caption` `grafite`, visível o tempo todo: `Cada livro conta uma vez, com a nota que você deu a ele. Livros pessoais entram.`
- `space-3` abaixo, o botão textual `musgo` com `Table` (Phosphor, `regular`, 20px, `musgo`) à esquerda: `Ver como tabela`.
- Sem legenda de cor: há uma série só, e o título diz o que está desenhado. Nenhuma estrela desenhada, nem no eixo nem nas colunas: a escala é escrita em números.

**Valor no toque.** O mesmo comportamento dos gráficos mensais: tocar em qualquer ponto da faixa vertical de uma nota (área tocável com a largura da faixa, no mínimo 28px, e a altura inteira do gráfico) acende uma faixa `musgo-fundo` atrás da coluna, com `radius-sm`, e abre o **balão** `papel`, `radius` 12, `elev-2`, padding `space-2 space-3`, acima da coluna, sem seta, sem sair do card: `Nota 4,5` em `caption` `grafite` e `2 livros` em `body-strong` `tinta`. Na nota sem livros, `Nota 0,5` e `Nenhum livro`. Enquanto o balão está aberto, a contagem sobre aquela coluna some, para o número não aparecer duas vezes.

**Visão em tabela.** `Ver como tabela` troca, dentro do card, a área do gráfico por uma tabela; o botão passa a `Ver como gráfico` com `ChartBar` (Phosphor, `regular`, 20px, `musgo`).

- Duas colunas, cabeçalho em `label` `grafite`: `Nota` e `Livros`. Linhas de 44px com divisor de 1px `linha`, na mesma ordem do gráfico, de `0 estrelas` a `5 estrelas`.
- Nota em `body` `tinta`: `0 estrelas`, `0,5 estrela`, `1 estrela`, `1,5 estrela`, `2 estrelas`, e assim por diante até `5 estrelas`. Valor em `num-inline` `tinta`, alinhado à direita, com a unidade: `0 livros`, `1 livro`, `2 livros`.
- Última linha, com divisor de 1px `linha` acima e texto em `body-strong`: `Total` · `8 livros`.
- A tabela ocupa a altura que precisar; o card cresce. A escolha vale só para este card.

**Período sem nota.** No ano sem nenhuma nota (`2023`), o card fica só com o título e, no lugar do subtítulo, da área e do botão, uma linha em `body` `grafite`: `Nenhuma nota dada em 2023.` Sem eixo, sem onze zeros, sem `Ver como tabela`. É a mesma frase da nota média ausente, porque as duas saem do mesmo conjunto.

**Web.** Na coluna da direita, `space-6` abaixo da fileira de cards de `Médias` e antes dos dois gráficos lado a lado: **um card de largura total da coluna**, com a mesma anatomia:

- Título, subtítulo, área de 200px, colunas de 32px com faixas de largura igual, contagem sobre cada coluna, eixo X, a linha `Nota em estrelas. Sobre cada coluna, o número de livros.`, o helper e `Ver como tabela`.
- **Hover** na faixa de uma nota faz o que o toque faz no mobile: faixa `musgo-fundo` e balão. O cursor vira ponteiro.
- **Teclado:** a área do gráfico recebe foco como um grupo; `ArrowLeft` e `ArrowRight` movem entre as onze notas e abrem o balão da nota em foco; `Home` vai para `0`, `End` vai para `5`; `Esc` fecha. Foco visível com contorno de 2px `musgo` e offset de 2px na área, e a faixa `musgo-fundo` marca a nota em foco.
- Abaixo de 768px o card volta ao desenho mobile, no mesmo lugar da coluna única.

**Carregando.** O skeleton ganha o card: no mobile, abaixo do skeleton de `Médias`, um card com uma barra de 17px e 45% de largura (o título) e um retângulo `capa-placeholder` de 160px de altura com `radius-sm` no lugar da área; na web, o mesmo com 200px, na largura da coluna. Mesmo fade único, sem shimmer.

### 4.1 `Estatísticas · Acumulado` (linha mobile)

Continua com `Acumulado` ativo e a linha `Desde 12 de novembro de 2023, quando você entrou`. **O que o artboard mostra muda:** em vez de `Médias` e o topo de `Páginas por ano`, ele mostra a seção `Médias` inteira (com `4,0` `estrelas` e `Média das 31 notas que você já deu.`) e, logo abaixo, o card `Notas que você deu` **completo**, com o subtítulo `31 notas desde 2023`: colunas em `2` (1), `2,5` (1), `3` (3), `3,5` (5), `4` (8), `4,5` (6) e `5` (7); `0`, `0,5`, `1` e `1,5` sem coluna e com o `0` apoiado na linha de base. A coluna de `4` é a mais alta, com 120px. O card `Páginas por ano` desce e fica cortado pela barra inferior.

### 4.2 `Estatísticas · Padrão, ano corrente, com hover` (linha web)

Continua com `2026` ativo, os três cards de `Totais` e os três de `Médias`. **Abaixo de `Médias` entra o card `Notas que você deu`**, com `8 notas em 2026`: colunas em `3` (1), `3,5` (1), `4` (2), `4,5` (2) e `5` (2), as seis primeiras notas sem coluna e com `0`. Os dois gráficos mensais descem e aparecem só com o título, cortados pela borda inferior. **O hover sai da coluna de julho e vai para a nota `4,5`** do card novo: faixa `musgo-fundo` e balão `Nota 4,5` · `2 livros`, e o `2` sobre a coluna some enquanto o balão está aberto. O hover nos gráficos mensais continua conferido no artboard `Gráfico como tabela, com foco de teclado`.

### 4.3 `Estatísticas · Acumulado` (linha web)

`Acumulado` ativo. Entre `Médias` e os gráficos por ano, o card `Notas que você deu` com `31 notas desde 2023` e as onze notas do acumulado. Os gráficos `Páginas por ano` e `Livros concluídos por ano` descem e aparecem com o topo, até a linha de base, se couber; o que não couber é cortado pela borda.

### 4.4 `Estatísticas · Ano sem leitura concluída` (linha web)

`2023` ativo. Entre `Médias` e os gráficos, o card `Notas que você deu` no estado sem nota: só o título e `Nenhuma nota dada em 2023.` Os gráficos mensais continuam visíveis logo abaixo, porque o card é baixo.

### 4.5 `Estatísticas · Gráfico como tabela, com foco de teclado` (linha web)

Mesmo estado do Período 2, com `2025` ativo. O artboard passa a mostrar a coluna da direita **rolada até os gráficos**, que ficam no topo da viewport, para que a tabela de páginas e o foco no gráfico de livros continuem inteiros. O card `Notas que você deu` fica acima, fora da área visível.

### 4.6 `Estatísticas · Carregando` (linha web)

O skeleton da coluna da direita ganha o card de 4.0 entre os seis cards e os dois gráficos.

### 4.7 `Web, padrão (5.1)` (linha do modo escuro)

Acompanha 4.2: o card `Notas que você deu` em `noite-elevada`, colunas em `musgo-claro`, contagens em `papel-suave`, `0` e eixo X em `grafite-claro`, linha de base em `linha-noite`, hover na nota `4,5` com faixa `musgo-fundo-escuro` e o balão escuro (`noite`, borda de 1px `linha-noite`).

**Os demais artboards não mudam.** No mobile, `Padrão, ano corrente`, `Ano corrente, gráficos (rolada)`, `Gráfico como tabela`, `Ano fechado`, `Ano sem leitura concluída`, `Vazio, leitora nova`, `Carregando` e `Erro de carregamento` mostram trechos da página em que o card novo não aparece (ele fica entre `Médias` e o primeiro gráfico, fora da área desses recortes), ou estados sem nota nenhuma. Na web, `Vazio` e `Erro` continuam sem artboard próprio, como no Período 2.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Estatísticas · Notas que você deu (rolada)`

- `2026` ativo. Página rolada até que o container de `Médias` fique logo abaixo do header, que mostra o divisor `linha` porque o conteúdo rola por baixo.
- De cima para baixo: o container de `Médias` com `Nota média` · `4,2` `estrelas` e o helper `Média das 8 notas que você deu em 2026.`; `space-6`; o card `Notas que você deu` completo (4.0), com `8 notas em 2026`; o **balão aberto sobre a nota `5`**, `Nota 5` · `2 livros`, com a faixa `musgo-fundo`; o helper e `Ver como tabela`; `space-6`; o título de `Páginas por mês`, cortado pela barra inferior.
- Barra inferior com **Perfil** ativo.
- É o artboard que confere a anatomia do gráfico novo: onze notas no eixo, seis delas com `0` e sem coluna, a contagem sobre as outras cinco.

#### 5.2 `Estatísticas · Notas como tabela (rolada)`

- `2025` ativo, rolada como 5.1. Linha de período `De 1º de janeiro a 31 de dezembro de 2025`.
- O card `Notas que você deu` com `13 notas em 2025`, na **visão em tabela**: onze linhas, de `0 estrelas` · `0 livros` a `5 estrelas` · `3 livros`, com `2 estrelas` · `1 livro`, `2,5 estrelas` · `1 livro`, `3 estrelas` · `1 livro`, `3,5 estrelas` · `2 livros`, `4 estrelas` · `3 livros`, `4,5 estrelas` · `2 livros`; a linha `Total` · `13 livros`; e o botão `Ver como gráfico` no fim do card.
- A tabela empurra o card `Páginas por mês` para fora da viewport.

#### 5.3 `Estatísticas · Ano sem nota (rolada)`

- `2023` ativo, rolada como 5.1.
- O container de `Médias` com as duas médias ausentes (`Sem leituras concluídas em 2023` e `Nenhuma nota dada em 2023`); `space-6`; o card `Notas que você deu` no estado sem nota, só com o título e `Nenhuma nota dada em 2023.`; `space-6`; o card `Páginas por mês` com `nov` e `dez`.
- É o artboard que prova que distribuição ausente não vira onze zeros.

### Linha 2, web, no fim da linha

#### 5.4 `Estatísticas · Notas com foco de teclado`

- `2025` ativo na lista da esquerda. Coluna da direita rolada até `Médias`, com os três cards de médias no topo.
- O card `Notas que você deu`, `13 notas em 2025`, com **foco de teclado** na área do gráfico: contorno de 2px `musgo` com offset de 2px, faixa `musgo-fundo` na nota `4` e o balão `Nota 4` · `3 livros`. O `3` sobre a coluna de `4` some enquanto o balão está aberto; as notas `0` a `1,5` com `0` e sem coluna.
- Abaixo, o topo dos dois gráficos mensais.

### Linha 3, modo escuro, no fim da linha

#### 5.5 `Estatísticas · Notas que você deu (rolada), modo escuro`

O artboard 5.1 no escuro. Fundo `noite`. Container de `Médias` e card `Notas que você deu` em `noite-elevada`, **mais claros** que o fundo. Colunas em `musgo-claro`, 7,21:1 contra a superfície. Contagens em `papel-suave`; `0`, eixo X, legenda e helper em `grafite-claro`; linha de base em `linha-noite`. Balão em `noite` com borda de 1px `linha-noite`, `Nota 5` em `grafite-claro` e `2 livros` em `papel-suave`; faixa da nota tocada em `musgo-fundo-escuro`. `Ver como tabela` em `musgo-claro`. Barra inferior em `noite-elevada` com **Perfil** em `musgo-claro`. Shadows com metade da opacidade.

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards do Período 2 continuam, com as mudanças da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Card de gráfico de colunas de uma série, balão de valor e faixa da categoria, alternância gráfico e tabela | nasceram em `periodo-2/F-STA/estatisticas.md`; incorporação pendente |
| Regras de gráfico: `musgo` principal, no máximo três séries, número com unidade | documento-de-design §7.10 |
| Botão textual | documento-de-design §4.1 |
| Escala tipográfica, JetBrains Mono em número | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Histograma de categorias fixas com contagem sobre toda coluna.** Onze faixas de largura igual, sem eixo Y e sem grade, a contagem escrita sobre cada coluna e o `0` apoiado na linha de base quando a categoria não tem valor. Diverge de propósito do gráfico mensal do Período 2, que só rotula o maior valor: aqui a contagem é o dado que se lê, por decisão do dono.
2. **Legenda de leitura em uma linha** sob o eixo (`Nota em estrelas. Sobre cada coluna, o número de livros.`), que dá a unidade dos números escritos no gráfico.
3. **Distribuição ausente**: o card só com título e a frase, sem eixos.
4. **Linha `Total`** no fim da visão em tabela.

**Decisões deste prompt a ratificar pela dona da feature (Ana Luiza de Freitas):**

- O card fica entre `Médias` e `Páginas por mês`, e por isso os gráficos mensais descem na web.
- O gráfico segue o período escolhido, como a nota média; no acumulado conta todas as notas desde a criação da conta.
- Sem eixo Y e sem grade, já que a contagem está sobre cada coluna.
- Balão também neste gráfico, por coerência com os mensais, escondendo a contagem da coluna enquanto aberto.
- Escala escrita em números, sem desenhar estrelas.
- Tabela na ordem da escala, de `0 estrelas` a `5 estrelas`, com a linha `Total`.

**Contrato a confirmar:** `GET /me/estatisticas` precisa devolver a distribuição **por período** (cada ano e o acumulado), como já devolve a nota média por período. O arquivo da feature fala em "bloco de distribuição" sem dizer se ele acompanha o ano.

---

## 8. Copy nova ou alterada

| Onde | Texto |
|---|---|
| Título do card | `Notas que você deu` |
| Subtítulo | `8 notas em 2026`, `13 notas em 2025`, `10 notas em 2024`, `31 notas desde 2023` |
| Eixo X | `0`, `0,5`, `1`, `1,5`, `2`, `2,5`, `3`, `3,5`, `4`, `4,5`, `5` |
| Legenda sob o eixo | `Nota em estrelas. Sobre cada coluna, o número de livros.` |
| Helper do card | `Cada livro conta uma vez, com a nota que você deu a ele. Livros pessoais entram.` |
| Balão | `Nota 4,5` · `2 livros`; `Nota 5` · `2 livros`; `Nota 4` · `3 livros`; `Nota 0,5` · `Nenhum livro` |
| Alternância | `Ver como tabela`, `Ver como gráfico` (já existem no canvas) |
| Cabeçalho da tabela | `Nota`, `Livros` |
| Linhas da tabela | `0 estrelas`, `0,5 estrela`, `1 estrela`, `1,5 estrela`, `2 estrelas`, `2,5 estrelas`, `3 estrelas`, `3,5 estrelas`, `4 estrelas`, `4,5 estrelas`, `5 estrelas` · `0 livros`, `1 livro`, `2 livros`, `3 livros` |
| Total da tabela | `Total` · `8 livros`, `13 livros` |
| Sem nota no período | `Nenhuma nota dada em 2023.` |
| Rótulo acessível do gráfico | `Gráfico de colunas, notas que você deu em 2026, 8 notas. Mais frequentes: 4, 4,5 e 5 estrelas, com 2 livros cada.` |
| Rótulo acessível de cada nota | `Nota 4,5: 2 livros`; `Nota 0,5: nenhum livro` |

As contagens sobre as colunas e as marcas do eixo X são as únicas exceções declaradas à regra "todo número com unidade": a unidade delas está na legenda sob o eixo, como as marcas de eixo do Período 2 tinham a unidade no título. Decimal com vírgula. Zero em-dash, zero emoji, zero `%`.

---

## 9. Acessibilidade e interação do que muda

- **O gráfico não depende de cor.** Uma série só, nomeada pelo título, colunas com 6,15:1 (`musgo` sobre `papel-elevado`) e 7,21:1 (`musgo-claro` sobre `noite-elevada`). Cada contagem está escrita em texto `tinta`, e a nota sem livros tem o `0` escrito, não só a ausência de coluna.
- **Todo valor tem caminho fora do gráfico:** a contagem escrita, o balão, a navegação por teclado e a visão em tabela, que é uma tabela de verdade com cabeçalho de coluna.
- **Leitor de tela:** a área do gráfico é lida com o rótulo da seção 8; cada nota é um item lido como `Nota 4,5: 2 livros`. A ordem é a da escala.
- **Distribuição ausente** é anunciada pela frase `Nenhuma nota dada em 2023`, nunca como zeros.
- Alvo de toque: cada faixa de nota tem no mínimo 28px de largura e a altura inteira do gráfico; a área do gráfico ocupa a largura do card, então as faixas encostam umas nas outras sem espaço morto. `Ver como tabela` com 48px de altura.
- **Texto grande:** quando o eixo X não cabe, ele passa a mostrar só as notas inteiras (`0`, `1`, `2`, `3`, `4`, `5`); as contagens continuam sobre todas as colunas e o rótulo acessível de cada nota não muda.
- Na web, a área do gráfico entra na ordem de tabulação depois de `Médias` e antes dos gráficos mensais; setas, `Home`, `End` e `Esc` como em 4.0.
- `prefers-reduced-motion`: o fade do balão e o hover viram estáticos. As colunas não crescem animadas, nem ao carregar nem ao trocar de período.
- Nenhuma ação nova é destrutiva.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Shell, header, faixa e lista de períodos, `Totais`, `Médias`, os gráficos mensais, o rodapé, o vazio e o erro ficam como estão.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe o perfil de outro leitor aqui.** A distribuição no perfil alheio entra em outra edição (`perfil-de-outro-leitor`).

**Escopo desta tela, do Período 2, que continua valendo**

- **Não mostre zero no lugar de média ausente** e **não mostre onze zeros no lugar de distribuição ausente.** O zero só aparece como contagem real de uma nota, num período que tem pelo menos uma nota.
- **Não agrupe as notas em faixas** (`4 a 5`, `estrelas cheias`), não arredonde meia estrela e não junte notas vizinhas para economizar espaço. São onze colunas.
- **Não use percentual** em lugar nenhum do gráfico, do balão ou da tabela.
- **Não confunda com o histograma do livro.** Este gráfico é das notas que a leitora deu; a distribuição das notas de um livro mora na página do livro e não aparece aqui.
- Não desenhe este painel para o perfil de outro leitor, nem `Ver estatísticas` num perfil que não é o da leitora.
- Não desenhe meta anual, desafios, sequência diária, comparação com outros leitores, média da comunidade, ranking ou percentil.
- Não desenhe compartilhar, exportar, baixar imagem ou retrospectiva do ano.
- Não desenhe gêneros mais lidos, autores mais lidos ou qualquer métrica fora dos requisitos.
- Não use `rubi` nem `ambar` em nada desta tela, a não ser o banner de erro.
- Não ponha seta de tendência nem variação colorida.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. Esta tela não é nenhum deles.
- Nada de mistura de família dentro do mesmo título.
- Nada de overline em toda seção, nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em coluna, em botão ou em texto.
- Nada de cor diferente por nota, nada de colunas de `5` em verde e de `0` em vermelho: é uma série, uma cor.
- Nada de `broto` nas colunas: ele não alcança 3:1 sobre o fundo claro.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro. Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de coluna crescendo animada, contador subindo, nem gráfico que se desenha ao entrar.
- Nada de shimmer perpétuo em skeleton e nada de spinner girando.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético do tipo "Seu gosto em estrelas" ou "Como você avalia". O título diz o que a coisa é.
- Nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de estrelas desenhadas no eixo, nas colunas ou ao lado da nota média.
- Nada de toast com fundo saturado.

**Métricas e dados**

- Nada de gráfico de pizza, rosca, radar, linha ou área para a distribuição. São colunas.
- Nada de dois eixos Y, nada de duas séries, nada de linha de média sobre o histograma.
- Nada de linha de grade tracejada nem eixo pesado.
- Nada de gráfico com legenda em roxo ou em verde-água (`#7C3AED`, `#14B8A6`).

**Modo escuro**

- Nada de fundo #000000, nada de simples inversão da paleta clara, nada de card claro sobre fundo escuro.

**Layout (web)**

- Nada de hero de landing dentro do produto, nada de bento grid decorativo, nada de três colunas de features com ícone.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover: a contagem está escrita sobre cada coluna.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
