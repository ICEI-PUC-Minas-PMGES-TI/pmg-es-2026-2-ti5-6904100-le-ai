# Descobrir (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Descobrir`, o que foi gerado por `docs/design/periodo-1/F-ACV-BUSCA/descobrir.md` e editado por `docs/design/periodo-2/descobrir/descobrir.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/descobrir/descobrir.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-REC-ALG.md
**Requisitos que entram:** F-REC-ALG: RF-REC-08 (sugerir livros semelhantes aos da estante do leitor, por atributos do acervo), RF-REC-09 (sugerir livros a partir das leituras de quem o leitor segue, respeitando RN-08), RF-REC-10 (excluir livro já na estante e livro pessoal de terceiro), RF-REC-11 (cada sugestão mostra o motivo), RF-REC-12 (descartar uma sugestão, que não reaparece). RF-REC-13 e RF-REC-14, já entregues no Período 2, passam a ter as duas fontes.
**Não funcionais:** RNF-DES-02 (paginação com teto de itens por seção), RNF-SEC-03 (privacidade verificada no servidor), RNF-SEC-06 (livro pessoal fora de qualquer superfície de descoberta), RNF-USA-02, RNF-USA-03, RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-08 (perfil privado não é exposto pela atribuição da sugestão), RN-15 (livro pessoal de terceiro é inacionável), RN-21 (assunto do conjunto curado)
**Versão web:** sim. RF-REC-08, RF-REC-09, RF-REC-11 e RF-REC-12 têm marcação na coluna Web de `REQUISITOS.md` §5.13.
**Destinos desenhados em outros prompts:** a página do livro (`docs/design/periodo-2/pagina-do-livro/pagina-do-livro.md`) e a lista `Recomendações recebidas` (`docs/design/periodo-2/F-REC-P2P/recomendacoes-recebidas.md`). Aqui só existe a navegação até elas. **Não existe tela de lista completa de sugestões**: elas paginam dentro da própria seção.

---

## 1. O que muda e por quê

O Período 2 entregou a aterrissagem do `Descobrir` com uma única seção, `Recomendações recebidas`, que reúne os livros que amigos mandaram ao leitor. O requisito sempre previu duas fontes em seções distintas e rotuladas (RF-REC-13); a segunda, algorítmica, ficou para o Período 3. Esta edição é a chegada dela.

- **Duas seções novas de sugestões, abaixo de `Recomendações recebidas`.** Os nomes são os de `REQUISITOS.md` §10.7, que rotula cada seção pela origem do sinal:
  - **`Quem você segue leu`** (RF-REC-09): livros que leitores seguidos, com seguimento aceito, terminaram e avaliaram bem.
  - **`Do seu gosto`** (RF-REC-08): livros que combinam com os assuntos, autores e séries mais frequentes na estante do leitor.
- **Cada sugestão diz por que está ali (RF-REC-11)**, numa linha de motivo no lugar onde o item de recomendação recebida mostra quem recomendou: `4 pessoas que você segue leram`, `Você lê muito Romance`, `Do mesmo autor de Ponciá Vicêncio`, `Continuação de O Tempo e o Vento`.
- **Cada sugestão pode ser descartada (RF-REC-12)** pelo menu `DotsThree` do item, no mesmo desenho do descarte de `Recomendações recebidas`: sem confirmação, toast curto, sem `Desfazer`. A sugestão descartada não volta em nenhuma das duas seções.
- **A paginação acontece dentro da seção.** Cada seção mostra a primeira página e, abaixo dela, o botão textual `Mostrar mais`, que acrescenta a página seguinte na mesma seção. Não há `Ver todas` nem tela de lista completa de sugestões (decisão do lote 2 do Período 3).
- **Seção sem sugestão some.** Se uma das duas não tem nada (o leitor não segue ninguém, ou nenhum seguido terminou e avaliou bem um livro, ou a estante ainda não dá sinal), a seção inteira sai da aterrissagem, sem título e sem linha de vazio. Se as duas somem, a aterrissagem volta a ser a do Período 2, só com `Recomendações recebidas`: é RF-REC-14, a aba funcionando sem a fonte algorítmica.

O que deixa de valer do escopo do Período 2: a proibição de desenhar a recomendação algorítmica (seção 4.4 e seção 10 do prompt do Período 2, item "Não desenhe a recomendação algorítmica") e a de ter qualquer ação dentro de um item da aterrissagem, **apenas para os itens de sugestão**. O item de recomendação recebida continua sem ação própria.

O mecanismo que a tela sustenta continua sendo **registro** e **pertencimento**. A seção `Quem você segue leu` é pertencimento sem expor ninguém: diz quantos seguidos leram, nunca quem.

O canvas continua simulando um arquivo de Figma. Os artboards novos entram **lado a lado** com os existentes, cada um simulando o viewport de um aparelho, nunca empilhados dentro do mesmo frame.

- **Linha 1:** mobile, `390 x 844`. Os novos entram **no fim da linha**, na ordem da seção 5.
- **Linha 2:** web, `1440 x 900`. Novos no fim da linha.
- **Linha 3:** modo escuro. Novos no fim da linha.
- Cada artboard novo leva o **rótulo acima**, no formato `Descobrir · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.

### Dados dos artboards novos e alterados

(Os dados dos Períodos 1 e 2 continuam valendo para o que não mudou, inclusive as cinco recomendações recebidas de Júlia Figueiredo, Caio Rezende, Beatriz Okada e Henrique Sampaio.)

O leitor deste canvas tem na estante `Ponciá Vicêncio` (`Lendo`), `Olhos d'Água` (`Quero ler`), `O Continente` de Erico Verissimo (`Lido`) e vários romances. Nenhuma sugestão abaixo está na estante dele, nenhuma é livro pessoal e nenhuma repete livro de `Recomendações recebidas`.

A primeira página de cada seção tem **quatro sugestões** no mobile e na web (valor de mock: o tamanho da página e o teto de cada seção são do servidor).

**`Quem você segue leu`**, ordem do servidor:

| # | Livro | Autor | Motivo |
|---|---|---|---|
| 1 | Mulheres Empilhadas | Patrícia Melo | `4 pessoas que você segue leram` |
| 2 | O Peso do Pássaro Morto | Aline Bei | `3 pessoas que você segue leram` |
| 3 | Solitária | Eliana Alves Cruz | `2 pessoas que você segue leram` |
| 4 | A Vida Invisível de Eurídice Gusmão | Martha Batalha | `2 pessoas que você segue leram` |
| 5 | Pequena Coreografia do Adeus | Aline Bei | `2 pessoas que você segue leram` |
| 6 | O Sol na Cabeça | Geovani Martins | `1 pessoa que você segue leu` |

`A Vida Invisível de Eurídice Gusmão` usa o placeholder de capa, para o artboard mostrar o caso. Os itens 5 e 6 são a segunda página.

**`Do seu gosto`**, ordem do servidor:

| # | Livro | Autor | Motivo |
|---|---|---|---|
| 1 | O Arquipélago | Erico Verissimo | `Continuação de O Tempo e o Vento` |
| 2 | Insubmissas Lágrimas de Mulheres | Conceição Evaristo | `Do mesmo autor de Ponciá Vicêncio` |
| 3 | Úrsula | Maria Firmina dos Reis | `Você lê muito Romance` |
| 4 | Água de Barrela | Eliana Alves Cruz | `Você lê muito Romance` |
| 5 | Contos Negreiros | Marcelino Freire | `Você lê muito Conto` |
| 6 | Becos da Memória | Conceição Evaristo | `Do mesmo autor de Ponciá Vicêncio` |

Os itens 5 e 6 são a segunda página.

**Descarte:** o leitor descarta `O Peso do Pássaro Morto`, de `Quem você segue leu`. Depois do descarte, `Solitária` sobe para o lugar dele.

**Leitor só com `Do seu gosto` (5.8):** `Rafael Monteiro Lins`, que ainda não segue ninguém. Tem estante, mas nenhuma recomendação recebida.

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

SOBREPOSIÇÃO (bottom sheet e menu suspenso)
Abaixo de 768px: bottom sheet ancorado embaixo, largura total, fundo papel no
claro e noite-elevada no escuro, radius-lg só no topo, padding space-6,
elev-3. Alça de 32 x 4px em linha (linha-noite no escuro), centralizada,
space-5 acima do conteúdo. O padding inferior soma a área segura.
Scrim: #171512 a 40% no claro e preto a 60% no escuro.
O sheet sobe em dur-slow com ease-out e sai em dur-base com ease-in. Foco
preso dentro enquanto aberto; Esc e toque no scrim fecham; o foco volta ao
elemento que abriu.
A partir de 768px, o menu de ações de um item é um menu suspenso ancorado no
botão que o abriu: fundo papel, borda de 1px linha, radius 12, elev-2, sem
scrim.

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

## 3. O que permanece intocado

Tudo o que vem a seguir fica **exatamente como está no canvas**:

- **O shell inteiro.** Barra inferior do mobile com quatro itens e **Descobrir** ativo; sidebar da web com os mesmos quatro itens e **Descobrir** ativo em `musgo-fundo`. A marca no topo da sidebar fica como está desenhada neste canvas. Nenhum quinto item de navegação.
- **O header mobile de duas linhas**, com título, sino, campo de busca e botão de filtros, e o **header de conteúdo da web**.
- **A faixa de assuntos e o painel `Assuntos`, o bloco `Filtros`, o sheet de filtros, a fileira de filtros aplicados** e todos os artboards de busca, filtro, resultado, carregamento, vazio e erro dos Períodos 1 e 2.
- **A seção `Recomendações recebidas`** inteira: título, `Ver todas`, os itens com capa, título, autor, linha `<nome> te recomendou · <tempo>` e mensagem, o vazio de uma linha, o carregamento e o banner de falha. A seção continua **primeira** da aterrissagem, logo abaixo dos assuntos. O item de recomendação recebida continua **sem** menu e sem ação própria.
- **A regra de que as seções existem só na aterrissagem.** Consulta digitada, assunto tocado ou filtro aplicado tiram todas as seções, as recebidas e as duas de sugestão, e os resultados ocupam o lugar delas.
- **A ordem dos artboards existentes** em cada linha. Os novos entram depois deles.

---

## 4. Artboards que mudam

### 4.1 `Descobrir · Aterrissagem, antes de buscar` (mobile)

Tudo continua igual até o fim da seção `Recomendações recebidas`. Abaixo do último item dela, `space-6` de respiro e começa a seção **`Quem você segue leu`**, no desenho de 5.1. No viewport de 844px só cabem o cabeçalho da seção e o começo do primeiro item, `Mulheres Empilhadas`; o resto passa por baixo da barra inferior, como conteúdo que continua na rolagem. Nada de artboard esticado.

### 4.2 `Descobrir · Aterrissagem, antes de buscar` (web)

Na coluna da direita, abaixo do grid de quatro recomendações recebidas, `space-8` de respiro e a seção **`Quem você segue leu`** no desenho web de 5.10: cabeçalho e a primeira linha do grid de duas colunas (`Mulheres Empilhadas` e `O Peso do Pássaro Morto`), cortada pela borda inferior da viewport onde a página continua.

O item da seção 4.4 do prompt do Período 2 que dizia **"Nada de outra seção ao lado ou abaixo: sem `Sugestões para você`, sem destaques, sem espaço reservado para a recomendação algorítmica"** deixa de valer para as duas seções desta edição. Destaques continuam proibidos.

### 4.3 `Descobrir · Aterrissagem sem recomendações` (mobile e web)

O leitor não tem recomendação recebida, mas tem sugestões.

- **Mobile:** abaixo da linha `Livros que outros leitores recomendarem para você aparecem aqui.`, `space-6` e a seção `Quem você segue leu` com os quatro primeiros itens, e depois `Mostrar mais`. Com a seção de recebidas encolhida para uma linha, cabem no viewport o cabeçalho, os quatro itens e o começo de `Mostrar mais`.
- **Web:** abaixo da linha de vazio, `space-8` e a seção `Quem você segue leu` com o grid 2 por 2 e `Mostrar mais`, cortada pela viewport se não couber.

### 4.4 `Descobrir · Aterrissagem carregando recomendações` (mobile)

Abaixo dos três esqueletos de `Recomendações recebidas`, `space-6` e o cabeçalho real `Quem você segue leu`, sem `Mostrar mais`, com o primeiro esqueleto de item no mesmo desenho (retângulo de 60 por 90px e três barras em `capa-placeholder`), passando por baixo da barra inferior. As duas fontes carregam em paralelo e o cold start (RNF-ERR-09) é este mesmo estado.

### 4.5 `Descobrir · Recomendações indisponíveis` (mobile)

A falha de `Recomendações recebidas` não derruba as sugestões: são chamadas separadas. Abaixo do banner de falha da seção de recebidas, `space-6` e a seção `Quem você segue leu` carregada normalmente, com os primeiros itens, cortada pela barra inferior.

### 4.6 `Descobrir · Aterrissagem` (escuro, mobile)

Como em 4.1: abaixo das recebidas entra o cabeçalho de `Quem você segue leu` e o começo do primeiro item, nas cores escuras de 5.13.

---

## 5. Artboards novos

### Item de sugestão (vale para todos os artboards)

O item de sugestão é o item de recomendação recebida do Período 2 com duas trocas: a linha de atribuição vira **linha de motivo**, e entra o **botão de menu** à direita.

- Capa de 60 por 90px no mobile e 80 por 120px na web, retângulo de canto vivo, sem raio. Placeholder `capa-placeholder` com o título centralizado quando não há capa.
- `space-4` de gap até o bloco de texto.
- Título em `title-sm` `tinta`, no máximo duas linhas com reticências.
- Autor em `body` `grafite`, uma linha.
- `space-2` abaixo, **linha de motivo** em `caption` `grafite`, no máximo duas linhas: `4 pessoas que você segue leram`, `Do mesmo autor de Ponciá Vicêncio`. **Sem avatar, sem nome e sem foto de quem leu** em `Quem você segue leu`: o motivo diz quantos, nunca quem (RN-08). Sem ícone na linha: o texto basta.
- **Botão de menu** à direita, alinhado ao topo do item: `DotsThree` (Phosphor, `regular`, 20px, `grafite`), área de toque de 48 por 48px no mobile e 40 por 40px na web, `radius` 12, rótulo acessível `Mais ações para <título>`. Sempre visível, também na web, sem depender de hover.
- **O resto do item é a área acionável** e leva à página do livro. O botão de menu é um alvo separado.
- **Nenhum item tem status pill**: livro na estante não vira sugestão (RF-REC-10).
- No mobile, padding vertical `space-4`, padding lateral `space-5` e divisor de 1px `linha` entre itens. Na web, padding `space-4`, `radius` 12, fundo transparente, `hover` em `papel-elevado` com `dur-fast`, como o item de recebidas.

### Seção de sugestão (vale para todos os artboards)

- **Cabeçalho:** título em `title-lg` `tinta` à esquerda (`Quem você segue leu` ou `Do seu gosto`). Sem `Ver todas` e sem nada à direita.
- `space-3` abaixo, a lista com a primeira página: quatro itens.
- **Abaixo da lista**, `space-3` e o botão textual `musgo` `Mostrar mais`, alinhado à esquerda no padding da seção, altura tocável de 48px no mobile e 40px na web. Ele acrescenta a página seguinte **na mesma seção**, sem sair da aterrissagem. Quando a seção chega ao fim, o botão some e não entra nenhuma linha de fim de lista.
- Ordem: `Recomendações recebidas`, depois `Quem você segue leu`, depois `Do seu gosto`, com `space-6` entre seções no mobile e `space-8` na web.
- **Seção sem sugestão some por inteiro**, título incluído. Não existe artboard de seção de sugestão vazia.

### Mobile (390 x 844), no fim da linha 1, nesta ordem

#### 5.1 `Descobrir · Sugestões`

A aterrissagem rolada até as sugestões.

- O header de duas linhas e a faixa de assuntos saíram pela borda superior. No topo do frame, o último item de `Recomendações recebidas`, `Tudo É Rio`, cortado pela borda superior.
- `space-6` abaixo, seção **`Quem você segue leu`** com os quatro itens da tabela: `Mulheres Empilhadas`, `O Peso do Pássaro Morto`, `Solitária` e `A Vida Invisível de Eurídice Gusmão` (com placeholder de capa). Depois, `Mostrar mais`.
- `space-6` abaixo, o cabeçalho **`Do seu gosto`** e o começo de `O Arquipélago`, passando por baixo da barra inferior.
- Barra inferior com **Descobrir** ativo.

#### 5.2 `Descobrir · Sugestões do seu gosto`

Rolada mais adiante, para mostrar os quatro tipos de motivo.

- No topo, o fim de `Quem você segue leu`: `A Vida Invisível de Eurídice Gusmão` cortado e `Mostrar mais`.
- Seção **`Do seu gosto`** com os quatro primeiros itens: `O Arquipélago` (`Continuação de O Tempo e o Vento`), `Insubmissas Lágrimas de Mulheres` (`Do mesmo autor de Ponciá Vicêncio`), `Úrsula` (`Você lê muito Romance`), `Água de Barrela` (`Você lê muito Romance`). Depois, `Mostrar mais`.
- Abaixo, só o fundo `papel` até a barra inferior. Nada de seção extra no fim.

#### 5.3 `Descobrir · Carregando mais sugestões`

O leitor tocou `Mostrar mais` em `Do seu gosto`.

- Mesma rolagem de 5.2, com a página subindo um pouco: os quatro itens e, no lugar do botão, **dois esqueletos estáticos** no desenho do item (retângulo `capa-placeholder` de 60 por 90px e três barras em `capa-placeholder` com `radius-sm`, larguras de 70%, 45% e 55%), separados pelo divisor `linha`.
- `Mostrar mais` não aparece enquanto carrega. Um único fade de entrada em `dur-base`. Sem spinner.

#### 5.4 `Descobrir · Falha ao carregar mais sugestões`

O pedido da segunda página falhou.

- Os quatro itens de `Do seu gosto` continuam visíveis e utilizáveis.
- No lugar de `Mostrar mais`, uma linha em `body` `grafite`: `Não foi possível carregar mais sugestões.` e, logo abaixo, o botão textual `musgo` `Tentar de novo`, 48px de altura tocável. Sem banner vermelho: o que já está na tela continua valendo.

#### 5.5 `Descobrir · Menu da sugestão`

O leitor tocou o `DotsThree` de `O Peso do Pássaro Morto`.

- Base: o estado 5.1, escurecido pelo scrim `#171512` a 40%.
- **Bottom sheet de menu**, no desenho do menu de `Recomendações recebidas`: fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha`, `space-5` acima do conteúdo.
- **Cabeçalho do sheet:** capa de 60 por 90px de canto vivo e, ao lado, `O Peso do Pássaro Morto` em `title-sm` `tinta` e o motivo `3 pessoas que você segue leram` em `caption` `grafite`. Divisor `linha` abaixo.
- **Um item**, 72px: `XCircle` (Phosphor, `regular`, 20px, `tinta`) e o rótulo `Descartar sugestão` em `body` `tinta`, `space-4` de gap. Logo abaixo do rótulo, na mesma coluna, a linha explicativa em `caption` `grafite`: `Este livro não volta a aparecer nas sugestões.`
- O item fica em `tinta`, não em `rubi`, e não pede confirmação: descartar uma sugestão não apaga nada do leitor, e o livro continua no acervo para ser encontrado pela busca. É o mesmo tratamento do descarte de recomendação recebida.
- `space-4` abaixo, botão textual `grafite` de largura total: `Cancelar`.

#### 5.6 `Descobrir · Sugestão descartada`

O leitor tocou `Descartar sugestão`. O sheet fechou.

- Base: a rolagem de 5.1. `O Peso do Pássaro Morto` saiu da lista e `Solitária` subiu para o lugar dele, seguido de `A Vida Invisível de Eurídice Gusmão`. A seção continua com `Mostrar mais`: **não** entra um quinto item para completar a página.
- **Toast** acima da barra inferior, com `space-4` de margem lateral: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, barra lateral de 4px em `musgo`, texto em `body` `tinta`: `Sugestão descartada.` À direita, `X` (Phosphor, `regular`, 20px, `grafite`) com alvo de 48px, rótulo acessível `Fechar aviso`.
- **Sem `Desfazer`.**
- Enquanto o servidor responde, o item fica com opacidade de 50% e não reage ao toque; ele só sai da lista quando o servidor confirma, como no descarte de recomendação recebida. Esse intervalo não tem artboard próprio.

#### 5.7 `Descobrir · Falha ao descartar sugestão`

- Base: a rolagem de 5.1, com `O Peso do Pássaro Morto` de volta no lugar, com opacidade cheia.
- Toast no desenho de 5.6, com a barra lateral de 4px em `rubi` e o texto em `body` `tinta`: `Não foi possível descartar a sugestão. Verifique sua conexão e tente de novo.` À direita, botão textual `musgo` `Tentar de novo`, e o `X` de fechar.

#### 5.8 `Descobrir · Só sugestões do seu gosto`

Rafael Monteiro Lins ainda não segue ninguém e não recebeu recomendação.

- Header de duas linhas e faixa de assuntos completos, sem foco no campo.
- Seção `Recomendações recebidas` no vazio de uma linha do Período 2.
- `space-6` abaixo, a seção **`Do seu gosto`** com os quatro primeiros itens e `Mostrar mais`, cortada pela barra inferior se não couber.
- **A seção `Quem você segue leu` não aparece**, nem título nem linha de vazio: sem seguidos, não há sinal. O artboard documenta que seção vazia some.

#### 5.9 `Descobrir · Aterrissagem sem sugestões`

As duas seções de sugestão estão vazias, ou a fonte algorítmica não respondeu nada. É RF-REC-14: a aterrissagem funciona só com a fonte P2P.

- O frame é igual ao `Descobrir · Aterrissagem, antes de buscar` do Período 2, antes desta edição: header, assuntos, `Recomendações recebidas` com três itens e `Ver todas`, e nada abaixo. Sem cabeçalho de sugestão, sem linha de vazio, sem espaço reservado.

#### 5.10 `Descobrir · Sugestões indisponíveis`

A chamada das sugestões falhou; a de recebidas, não.

- Rolagem de 5.1, com o fim de `Recomendações recebidas` no topo.
- `space-6` abaixo, **sem título de seção**, porque as duas seções vêm da mesma chamada e nenhuma pôde ser montada: o banner inline do Período 2, largura total menos o padding `space-5`, fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda com `space-3` de gap, texto em `body` `tinta`: `Não foi possível carregar as sugestões. Verifique sua conexão e tente de novo.`, e abaixo o botão textual `musgo` `Tentar de novo`.

### Web (1440 x 900), no fim da linha 2, nesta ordem

#### 5.11 `Descobrir · Sugestões`

- A página rolada: o header de conteúdo saiu pela borda superior; a sidebar continua fixa na altura total. O painel da esquerda (assuntos e filtros) rola junto com a página, como no Período 2, e aparece no ponto que a rolagem mostrar.
- Coluna da direita, de cima para baixo: o fim do grid de `Recomendações recebidas`, cortado no topo; `space-8`; seção **`Quem você segue leu`** em **grid de duas colunas** com gap `space-5`, os quatro itens em duas linhas, e `Mostrar mais` abaixo do grid, alinhado à esquerda; `space-8`; cabeçalho de **`Do seu gosto`** e a primeira linha do grid (`O Arquipélago` e `Insubmissas Lágrimas de Mulheres`), cortada pela borda inferior.
- `Solitária` em **hover**, com fundo `papel-elevado` e cursor de ponteiro. O `DotsThree` de cada item continua visível com ou sem hover.

#### 5.12 `Descobrir · Menu da sugestão`

- Base: 5.11 sem hover.
- O `DotsThree` de `O Peso do Pássaro Morto` está pressionado (fundo `linha`) e abre o **menu suspenso** ancorado abaixo dele, alinhado pela borda direita do botão, `space-2` abaixo: 280px de largura, fundo `papel`, borda de 1px `linha`, `radius` 12, `elev-2`, padding `space-2` vertical. Sem scrim.
- Um item, 60px, padding lateral `space-4`: `XCircle` `regular` 20px `tinta`, `space-3` de gap, `Descartar sugestão` em `body` `tinta`, e abaixo `Este livro não volta a aparecer nas sugestões.` em `caption` `grafite`. Em hover, fundo `linha`.
- Sem `Cancelar`: `Esc`, clique fora e novo clique no `DotsThree` fecham, e o foco volta ao `DotsThree`.

#### 5.13 `Descobrir · Sugestão descartada`

- Grid de `Quem você segue leu` com `Mulheres Empilhadas` e `Solitária` na primeira linha, `A Vida Invisível de Eurídice Gusmão` sozinha na segunda, com a célula da direita vazia, sem placeholder. `Mostrar mais` abaixo.
- Toast no canto inferior esquerdo da área de conteúdo, `space-8` da borda esquerda do conteúdo e `space-8` da borda inferior, largura de 400px, no desenho de 5.6: barra lateral de 4px `musgo`, `Sugestão descartada.` e `X` para fechar. Sem `Desfazer`.

### Modo escuro, no fim da linha 3, nesta ordem

Lock de página inteira. Superfície elevada **mais clara** que o fundo, `musgo-claro` como acento, shadows com metade da opacidade.

#### 5.14 `Descobrir · Sugestões` (escuro, mobile)

Equivalente a 5.1. Fundo `noite`. Títulos de seção e de livro em `papel-suave`, autor e motivo em `grafite-claro`, `DotsThree` em `grafite-claro`, divisor `linha-noite`, placeholder de capa em `capa-placeholder-noite`, `Mostrar mais` em `musgo-claro`. Barra inferior em `noite-elevada` com **Descobrir** em `musgo-claro`.

#### 5.15 `Descobrir · Menu da sugestão` (escuro, mobile)

Equivalente a 5.5. Base sob scrim preto a 60%. Sheet em `noite-elevada`, mais claro que o fundo, alça em `linha-noite`. Título do livro e `Descartar sugestão` em `papel-suave`, motivo e linha explicativa em `grafite-claro`, `XCircle` em `papel-suave`, divisor `linha-noite`, `Cancelar` em `grafite-claro`.

#### 5.16 `Descobrir · Sugestões` (escuro, web)

Equivalente a 5.11, sem hover. Sidebar em `noite-elevada` sobre conteúdo em `noite`, **Descobrir** ativo em `musgo-fundo-escuro`. Itens com título em `papel-suave`, autor e motivo em `grafite-claro`, `Mostrar mais` em `musgo-claro`.

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards dos Períodos 1 e 2 continuam no canvas, com as mudanças da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Item de recomendação recebida (base do item de sugestão) | nasceu em `../../periodo-2/descobrir/descobrir.md`, incorporação pendente |
| Seção de aterrissagem com título | nasceu em `../../periodo-2/descobrir/descobrir.md`, incorporação pendente |
| Bottom sheet de menu de ações | documento-de-design §4.11 |
| Menu suspenso de ações na web e descarte sem confirmação com linha explicativa | nasceram em `../../periodo-2/F-REC-P2P/recomendacoes-recebidas.md`, incorporação pendente |
| Toast com barra lateral | documento-de-design §4.11 e o desenho de `recomendacoes-recebidas.md` |
| Banner inline de falha de seção | nasceu nos prompts do Período 1, incorporação pendente |
| Botão textual | documento-de-design §4.1 |
| Padrão de tela Descobrir | documento-de-design §5.7 |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3, não ficam decididos só neste prompt:

1. **Item de sugestão:** o item de recomendação recebida com a linha de motivo em `caption` `grafite`, no lugar da atribuição, e o `DotsThree` sempre visível à direita.
2. **Paginação dentro da seção:** botão textual `Mostrar mais` abaixo da lista, que acrescenta a página seguinte na mesma seção e some no fim, com esqueletos no lugar dele enquanto carrega e a linha de falha com `Tentar de novo`.
3. **Seção que some quando vazia:** a seção de sugestão sai inteira, título incluído, ao contrário da seção de recebidas, que fica com uma linha de vazio.
4. **Banner de falha sem título de seção**, quando uma única chamada alimenta duas seções.

O §5.7 do `documento-de-design.md` diz que a aterrissagem não tem destaques. As sugestões vêm de RF-REC-08 e RF-REC-09 e não são curadoria de destaque; a frase do §5.7, já marcada para ajuste pela edição do Período 2, precisa citar também as sugestões.

---

## 8. Copy nova ou alterada

| Onde | Antes | Agora |
|---|---|---|
| Título da seção social | não existia | `Quem você segue leu` |
| Título da seção de gosto | não existia | `Do seu gosto` |
| Motivo, seção social | não existia | `4 pessoas que você segue leram`, `3 pessoas que você segue leram`, `2 pessoas que você segue leram`, `1 pessoa que você segue leu` |
| Motivo, série | não existia | `Continuação de O Tempo e o Vento` |
| Motivo, autor | não existia | `Do mesmo autor de Ponciá Vicêncio` |
| Motivo, assunto | não existia | `Você lê muito Romance`, `Você lê muito Conto` |
| Paginação da seção | não existia | `Mostrar mais` |
| Falha ao carregar mais | não existia | `Não foi possível carregar mais sugestões.` |
| Ação da falha | já existia | `Tentar de novo` |
| Rótulo acessível do menu | não existia | `Mais ações para O Peso do Pássaro Morto` |
| Item do menu | não existia | `Descartar sugestão` |
| Linha explicativa do descarte | não existia | `Este livro não volta a aparecer nas sugestões.` |
| Fechar o sheet | já existia | `Cancelar` |
| Toast de descarte | não existia | `Sugestão descartada.` |
| Toast de falha do descarte | não existia | `Não foi possível descartar a sugestão. Verifique sua conexão e tente de novo.` |
| Falha das sugestões | não existia | `Não foi possível carregar as sugestões. Verifique sua conexão e tente de novo.` |
| Rótulo acessível do fechar do toast | já existia | `Fechar aviso` |

Toda a copy dos Períodos 1 e 2 que não aparece nesta tabela continua igual. Zero em-dash, zero emoji, nenhum número sem unidade: o motivo sempre diz `pessoas`.

---

## 9. Acessibilidade e interação do que muda

- Cada item de sugestão tem **dois alvos**: o item, que leva à página do livro, e o `DotsThree`, com 48 por 48px no mobile. O rótulo acessível do item junta livro, autor e motivo: `Mulheres Empilhadas, de Patrícia Melo. 4 pessoas que você segue leram.`
- O cabeçalho de cada seção é um título de nível de seção para leitor de tela, para quem navega por títulos achar `Quem você segue leu` e `Do seu gosto`.
- `Mostrar mais` tem 48px de altura tocável no mobile. Ao carregar a página seguinte, o foco vai para o **primeiro item novo**, e o leitor de tela anuncia `2 sugestões carregadas`. Quando a seção acaba e o botão some, o foco fica no último item.
- O motivo não depende de cor nem de ícone: é texto em `caption` `grafite`, que passa AA sobre `papel`.
- O sheet de menu prende o foco enquanto aberto; ao fechar, o foco volta ao `DotsThree`. Depois do descarte, o foco vai para o item que subiu para o lugar do descartado. Se o descartado era o último item e a seção saiu, o foco vai para o título da seção seguinte ou, sem seção seguinte, para o título `Recomendações recebidas`.
- **Descarte sem confirmação, de propósito.** RNF-USA-04 pede confirmação em ação destrutiva. Descartar uma sugestão não apaga dado do leitor: tira da lista algo calculado pelo sistema, e o menu já é um passo intermediário. O item explica a consequência (`Este livro não volta a aparecer nas sugestões.`) antes do toque. É a mesma decisão do descarte de recomendação recebida.
- O toast é anunciado por leitor de tela e fica até ser fechado ou até a próxima ação; não some antes de o leitor de tela terminar de ler.
- Na web, a ordem de tabulação percorre cada item e logo depois o `DotsThree` dele, e no fim da seção o `Mostrar mais`. `Enter` e `Espaço` abrem o menu; `Esc` fecha.
- A aterrissagem continua **sem foco automático no campo**.
- `prefers-reduced-motion` respeitado: o sheet entra e sai sem deslizar, o item descartado some sem fade e os esqueletos aparecem sem fade.

---

## 10. O que não fazer nesta edição

**Regras da edição**

- **Não redesenhe o que não foi citado.** Shell, header, busca, filtros, resultados e a seção `Recomendações recebidas` ficam como estão.
- **Não reordene os artboards existentes.** Os novos entram no fim de cada linha.
- **Não troque a marca da sidebar** neste canvas.
- Não reintroduza o que os prompts anteriores proibiam e continua valendo: livro pessoal nos resultados ou nas sugestões, nota nos cards, multisseleção de assunto, quinto item de navegação, botão de voltar no header, campo com foco automático, autocompletar nos filtros, seção junto com resultados de busca.

**Sugestões**

- Não desenhe tela de lista completa de sugestões nem `Ver todas` nas seções de sugestão. A paginação é `Mostrar mais`, dentro da seção.
- Não mostre **nome, avatar, foto ou @ de quem leu** em `Quem você segue leu`. O motivo diz só quantos (RN-08).
- Não junte as duas seções numa só, nem as transforme em abas, nem em seletor de fonte. São duas seções rotuladas, uma abaixo da outra.
- Não desenhe linha de vazio, ilustração ou convite numa seção de sugestão sem itens: ela some.
- Não desenhe status pill, nota, estrela, porcentagem de compatibilidade ou pontuação na sugestão.
- Não desenhe `Adicionar à estante`, `Quero ler` ou outro botão de ação rápida no item. O item leva à página do livro; o menu só descarta.
- Não pinte `Descartar sugestão` de `rubi` nem peça confirmação. Não ofereça `Desfazer`.
- Não desenhe carrossel horizontal de sugestões no mobile: é lista vertical, como a de recebidas.
- Não use label poético. Os títulos são os da fonte: `Quem você segue leu` e `Do seu gosto`. Nada de `Para você`, `Escolhidos a dedo` ou `Você vai amar`.
- Não desenhe destaques, mais lidos, lançamentos, livros populares nem ranking.
- Não ponha a pergunta de descarte em lote aqui: ela é das recomendações recebidas, na tela `Recomendações recebidas`.
- Não use serifa no motivo.

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
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de placeholder de capa com livro genérico ilustrado.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido.

**Interações destrutivas**

- Nada de botão destrutivo preenchido em `rubi`.
- Nada de `Desfazer` no lugar de explicar a consequência antes da ação.

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
- Nada de conteúdo essencial escondido em hover: o `DotsThree` fica sempre visível.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "4" sozinho: é `4 pessoas que você segue leram`.
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
