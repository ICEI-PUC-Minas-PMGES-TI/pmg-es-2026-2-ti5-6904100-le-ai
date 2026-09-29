# Meu perfil (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Meu perfil`, gerado por `docs/design/periodo-1/F-PERFIL/meu-perfil.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-PERFIL/meu-perfil.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-GAM.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-STA.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-DSF.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-LST.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-AVA-2.md
**Requisitos que entram:**
- F-GAM: RF-GAM-02 (ver a sequência atual e a maior sequência já alcançada). RF-GAM-01 e RF-GAM-03 são de sistema: aqui aparece só o efeito, a sequência que subiu ou zerou.
- F-STA: RF-STA-01 (só o bloco `Estatísticas do ano`, com os três totais do ano corrente, e a entrada `Ver estatísticas` para o painel)
- F-DSF: RF-DSF-03 (só o bloco `Desafios`, com os dois primeiros desafios ativos, e a entrada `Ver todos`)
- F-LST: RF-LST-01 (só a entrada `Nova lista`), RF-LST-04 (a seção `Listas` no mobile e a aba `Listas` na web). Fecha a pendência de RF-SOC-02 do Período 1, que citava as listas do leitor.
- F-AVA-2: RF-AVA-08 (contagens de curtidas e descurtidas separadas nas resenhas da prévia)

**Não funcionais:** RNF-SEC-02 (sequência, desafios e painel são dados do próprio leitor), RNF-DES-02 (listas paginadas no índice, não aqui), RNF-USA-03 (contraste), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-18 (sequência em dias com leitura, recorde preservado quando a atual zera), RN-20 (desafios em janelas de calendário; pausado não acumula), RN-04 e RN-17 (o que entra nos totais), RN-08 (o dono vê tudo; listas e estatísticas seguem a privacidade do perfil para terceiros)
**Versão web:** sim. RF-STA-01, RF-LST-01, RF-LST-04 e RF-AVA-08 têm marcação na coluna Web de `REQUISITOS.md`. **Sequência (F-GAM) e desafios (F-DSF) não têm web** (`REQUISITOS.md` §2.1): os dois blocos existem só no mobile.

---

## 1. O que muda e por quê

O Período 1 deixou de fora, de propósito, tudo o que o `documento-de-design.md` §5.5 prevê no perfil e que dependia de outra feature: sequência diária, estatísticas do ano e listas. Cinco features do Período 2 depositam conteúdo aqui, e todas entram nesta edição de uma vez, para não disputarem o mesmo espaço em edições separadas. **A identidade, os contadores, a linha de solicitações, a prévia da estante e o header não mudam.** O que muda é o que vem abaixo dos contadores.

| O que entra | Onde | Plataforma | Feature |
|---|---|---|---|
| Componente de sequência diária (design §4.8) | Logo abaixo dos contadores (e da linha de solicitações, quando houver) | só mobile | F-GAM |
| Bloco `Estatísticas do ano` com três totais e `Ver estatísticas` | Depois da sequência no mobile; na coluna de identidade da web, depois dos contadores | mobile e web | F-STA |
| Bloco `Desafios` com dois desafios e `Ver todos` | Depois das estatísticas | só mobile | F-DSF |
| Contagens de curtidas e descurtidas em cada resenha da prévia | Rodapé de cada resenha | mobile e web | F-AVA-2 |
| Seção `Listas` com as três mais recentes, `Ver todas` e `Nova lista` | Depois de `Resenhas`, última seção | mobile | F-LST |
| Terceira aba `Listas` | Faixa de abas da coluna direita | web | F-LST |

**Ordem das seções no mobile, de cima para baixo:** identidade, contadores, linha de solicitações (quando existe), `Sequência`, `Estatísticas do ano`, `Desafios`, `Estante`, `Resenhas`, `Listas`. A ordem segue o §5.5 (sequência e estatísticas logo depois dos contadores, estante e resenhas depois) e põe os desafios junto da sequência, porque os dois são o mecanismo de **meta**. As listas vão por último porque são a seção menos frequente.

**O que deixa de valer do prompt do Período 1:** as proibições de desenhar sequência diária, estatísticas do ano e listas do leitor, e a proibição de desenhar desafios. Todas as outras regras daquele prompt continuam valendo, e a seção 10 abaixo as repete.

**Os destinos das novas entradas são outras telas, já escritas em outros prompts.** Esta edição desenha só o ponto de entrada. Não desenhe a tela de destino dentro deste canvas:

| Entrada | Destino |
|---|---|
| `Ver estatísticas` | painel `F-STA/estatisticas.md` (tela de detalhe, aba **Perfil** ativa) |
| `Ver todos`, no bloco `Desafios`, e toque num desafio | lista `F-DSF/desafios.md` (tela de detalhe, aba **Perfil** ativa) |
| `Novo desafio`, no bloco vazio | formulário `F-DSF/criar-desafio.md` |
| `Ver todas`, na seção `Listas` | índice mobile `F-LST/listas-do-leitor.md` |
| `Nova lista` | formulário `F-LST/criar-lista.md` |
| Card de lista | lista `F-LST/lista.md` |

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Meu perfil · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
- Os artboards novos entram **no fim da linha** da sua plataforma, depois dos existentes, sem reordenar nenhum.
- Os artboards existentes continuam mostrando o **topo da página**. Os artboards novos marcados como `(rolada)` mostram a página **rolada até a seção indicada**, com o header fixo no topo (com o divisor `linha` na base, porque o conteúdo rola por baixo dele) e a barra inferior fixa no rodapé. É a única forma de mostrar as seções de baixo sem esticar o artboard.

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

- **O shell inteiro**, exatamente como está no canvas: barra inferior do mobile com **Perfil** ativo, sidebar da web com **Perfil** ativo, e a marca na sidebar do jeito que já aparece. Esta edição não mexe em navegação.
- **O header:** título `Perfil` em `display`, `MagnifyingGlass`, `Gear` e `Bell` no mobile; `Buscar leitor` e `Configurações` no header de conteúdo da web, sem sino. Nenhuma ação nova entra no header.
- **O bloco de identidade:** avatar de 96px (120px na web), `Marina Beltrão`, `@marinableu`, chip `Perfil público` ou `Perfil privado`, a linha explicativa do privado, biografia e `Editar perfil`.
- **Os contadores** `12 livros lidos`, `84 seguidores`, `97 seguindo`, em linha no mobile e empilhados na web, e os destinos deles.
- **A linha de solicitações pendentes** `3 solicitações para seguir você`, onde já está.
- **A seção `Estante`**: título, `Ver tudo` e a faixa de seis capas. No mobile ela desce na página, mas o desenho não muda.
- **A seção `Resenhas`**: título, `Ver todas`, as duas resenhas com capa, estrelas e trecho em Newsreader truncado em três linhas. Só o rodapé de cada resenha ganha as contagens (4.2 C).
- **A aba `Estante` e a aba `Resenhas` da web**, com o grid de seis colunas e a coluna de 720px.
- **Os estados vazios de estante e de resenhas**, o **erro de carregamento** e toda a **copy do Período 1** que não aparece na seção 8 como substituída.
- **O ritmo:** `space-8` entre seções de conteúdo no mobile, títulos de seção em `title-lg`, padding lateral `space-5` no mobile e `space-8` na web.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas. Onde o mesmo rótulo existe no mobile e na web, a linha é indicada.

### 4.1 Elementos que entram no mobile, em todo artboard da página carregada

Entram em `Padrão, perfil público`, `Perfil privado`, `Com solicitações pendentes`, `Sem estante e sem resenhas` e, na linha do modo escuro, `Mobile, padrão` e `Mobile, com solicitações`. Não entram em `Carregando` nem em `Erro de carregamento`, tratados em 4.5 e 4.6.

Nos artboards existentes, que mostram o **topo da página**, os blocos novos começam logo abaixo dos contadores e são **cortados naturalmente pela barra inferior do shell**, como o resto da página. Em `Padrão, perfil público` aparecem a sequência inteira e o começo de `Estatísticas do ano`; o resto da página só se vê nos artboards `(rolada)` da seção 5.

**A. Sequência diária** (RF-GAM-02, design §4.8). Só mobile, só no perfil do dono.

- `space-6` abaixo do divisor dos contadores (ou da linha de solicitações, quando ela existe). Margem lateral `space-5`.
- Container `papel-elevado`, `radius-md`, padding `space-5`, `elev-0`, largura total menos o padding lateral. Sem título de seção acima: o rótulo interno já diz o que é.
- Dentro, de cima para baixo, alinhado à esquerda:
  - Rótulo em `label` `grafite`: `Sequência diária`.
  - `space-2` abaixo, a **sequência atual**: `Flame` (Phosphor, `regular`, 20px, `broto`), `space-2` de gap, o número em `num-display` `broto`: `12`, e `space-2` depois, alinhado pela linha de base, `dias seguidos` em `body-strong` `grafite`.
  - `space-2` abaixo, a **sequência recorde**: `Recorde:` em `caption` `grafite`, seguido de `31` em `num-inline` `grafite` e `dias` em `caption` `grafite`.
- À direita do container, alinhado ao topo, em `caption` `grafite`, até duas linhas, largura máxima de 128px: `Conta cada dia em que você registra ao menos 1 página.` É o helper visível o tempo todo que explica o que conta (RN-18.1), para que ninguém ache que a sequência zerou por erro.
- **O componente não é acionável.** Não há tela de calendário no Período 2 (RF-GAM-04 é do Período 3): nada de `CaretRight`, nada de toque.
- `Flame` é **estático**. Nada de fogo animado, partícula, chama que cresce, contagem regressiva para o fim do dia ou emoji.

**B. Bloco `Estatísticas do ano`** (RF-STA-01, design §5.5). Mobile.

- `space-8` abaixo da sequência.
- Cabeçalho de seção no padrão das outras: título `Estatísticas do ano` em `title-lg` `tinta` à esquerda e, à direita, o botão textual `musgo` em `caption`: `Ver estatísticas`, que abre o painel.
- `space-1` abaixo do título, em `caption` `grafite`: `2026, até hoje`.
- `space-3` abaixo, uma **faixa horizontal de três cards**, rolável na horizontal, gap `space-3`, começando no padding lateral `space-5` e sangrando pela borda direita da tela, para que o terceiro card apareça cortado e diga que a faixa rola (design §5.5: "cards horizontais com número grande em `num-display`"). Cada card:
  - Fundo `papel-elevado`, `radius` 12, padding `space-4`, `elev-0`, largura do conteúdo com mínimo de 136px, altura igual nos três.
  - Rótulo em `caption` `grafite` em cima: `Livros concluídos`, `Páginas lidas`, `Tempo de leitura`.
  - `space-1` abaixo, o valor: número em `num-display` `tinta` e a unidade em `body-strong` `grafite`, alinhados pela linha de base, `space-1` de gap: `9` `livros`; `3.818` `páginas`; `71` `h` `20` `min`, com cada número em `num-display` e cada unidade em `body-strong` `grafite`.
- Os valores são **os mesmos do painel** para 2026, para que o toque em `Ver estatísticas` não mostre outro número.
- **Os cards não são acionáveis um a um.** A entrada é `Ver estatísticas`. Nada de gráfico no bloco, nada de média, nada de comparação com o ano anterior, nada de seta de tendência: o bloco é o resumo, o painel é a análise.
- Sem helper de regra de conta aqui: as regras moram no painel.

**C. Bloco `Desafios`** (RF-DSF-03). Só mobile.

- `space-8` abaixo da faixa de estatísticas.
- Cabeçalho: título `Desafios` em `title-lg` `tinta` e, à direita, `Ver todos` em botão textual `musgo` `caption`.
- `space-3` abaixo, **os dois primeiros desafios ativos**, na ordem da tela de desafios (janela mais curta primeiro), empilhados com `space-3` de gap. Pausados não entram no bloco. Cada um é o **card de desafio compacto**, derivado do card de `F-DSF/desafios.md`:
  - Fundo `papel-elevado`, `radius-md`, padding `space-4`, sem sombra.
  - Linha 1: ícone da unidade (Phosphor, `regular`, 20px, `grafite`: `BookOpen` para páginas, `Clock` para minutos, `Books` para livros), `space-3` de gap, título em `title-sm` `tinta` com os números em JetBrains Mono, e à direita o nome da janela em `caption` `grafite` (`Hoje`, `Esta semana`). **Sem `DotsThreeVertical`**: editar, pausar e excluir moram na tela de desafios.
  - `space-3` abaixo, a barra de progresso de desafio: trilha de 6px, `radius-full`, fundo `musgo-fundo`, preenchimento `broto` proporcional ao acumulado.
  - `space-2` abaixo, a linha de números: `12 de 20 páginas` com os números em `num-inline` `tinta` e `de` e a unidade em `body` `grafite`; à direita, em `caption` `grafite`, `Faltam 8 páginas`. Sem percentual.
  - O card inteiro é tocável e abre a tela de desafios.
- Desafios do bloco: `20 páginas por dia` (`Hoje`, `12 de 20 páginas`, `Faltam 8 páginas`) e `150 minutos por semana` (`Esta semana`, `95 de 150 minutos`, `Faltam 55 minutos`).
- `space-2` abaixo do segundo card, em `caption` `grafite`: `Mais 3 desafios`. É texto, não link: a entrada é `Ver todos`.
- **Desafio cumprido no bloco**, se estiver entre os dois primeiros: barra cheia em `broto` e, no lugar de `Faltam`, `Check` (Phosphor, `bold`, 16px, `broto`) e `Cumprido hoje` em `caption` peso 600 `tinta`. Sem selo, sem confete.

### 4.2 Elementos que entram no mobile, abaixo da estante

**D. Seção `Resenhas`: contagens de reação** (RF-AVA-08).

- Em cada resenha da prévia, `space-3` abaixo do trecho, a **linha de contagens**, alinhada à esquerda, `space-4` entre os dois itens:
  - `ThumbsUp` (Phosphor, `regular`, 16px, `grafite`), `space-1`, `12 curtidas` em `caption` `grafite`.
  - `ThumbsDown` (Phosphor, `regular`, 16px, `grafite`), `space-1`, `1 descurtida` em `caption` `grafite`.
- **São contagens, não botões.** A resenha é da própria leitora, e ninguém reage à própria resenha (RF-AVA-05): sem fundo, sem alvo de toque, sem estado ativo, sem `fill`.
- As duas contagens ficam separadas, nunca como saldo nem percentual. Zero aparece como `0 descurtidas`, porque é contagem real.
- Contagens: `Vidas Secas` com `12 curtidas` e `1 descurtida`; `Quarto de Despejo` com `27 curtidas` e `0 descurtidas`.

**E. Seção `Listas`** (RF-LST-04, RF-LST-01). Última seção do mobile.

- `space-8` abaixo de `Resenhas`.
- Cabeçalho: título `Listas` em `title-lg` `tinta` e, à direita, `Ver todas` em botão textual `musgo` `caption`, que abre o índice mobile.
- `space-3` abaixo, **as três listas atualizadas mais recentemente**, em coluna única, cada uma no **card de lista** do índice (`F-LST/listas-do-leitor.md`), sem mudança de desenho:
  - Linha sem fundo próprio, sem borda e sem sombra, `space-4` de padding vertical, divisor de 1px `linha` entre as linhas.
  - À esquerda, o **mosaico de capas** de 88 por 72px: as três primeiras capas da lista, de 48 por 72px cada, canto vivo, sobrepostas em leque horizontal com 20px de deslocamento, a primeira na frente, contorno de 1px `papel` entre elas, sem rotação e sem sombra. Posição sem livro: retângulo vazio `papel-elevado` com borda de 1px `linha`.
  - `space-4` de gap, título da lista em `title-sm` `tinta` (até duas linhas), descrição em `caption` `grafite` (até duas linhas, some quando não há) e, `space-1` abaixo, a contagem em `caption` `grafite`.
  - À direita, `CaretRight` (Phosphor, `regular`, 20px, `grafite`). A linha inteira abre a lista.
- Listas: `Contos que eu indico` (`7 livros`), `Autoras negras brasileiras` (`6 livros`), `Clássicos brasileiros para reler` (`8 livros`), com as descrições e capas da seção 3 do índice.
- `space-3` abaixo da terceira lista, o botão textual `musgo` em `body-strong`, alinhado à esquerda, com `Plus` (Phosphor, `regular`, 20px) à esquerda: `Nova lista`, que abre o formulário de criação.
- **Seção sem listas:** o cabeçalho fica **sem `Ver todas`**. No lugar das linhas, texto em `body` `grafite`: `Junte livros sob um título, com uma descrição e na ordem que você quiser.` e, `space-3` abaixo, o mesmo botão textual `Nova lista`. É o único ponto de criação da seção; nunca dois CTAs com a mesma intenção.
- `space-8` antes da barra inferior, no fim da página.

### 4.3 `Padrão, perfil público` (linha mobile)

- Entra 4.1 A inteiro e o começo de 4.1 B, cortado pela barra inferior.
- Sequência `12 dias seguidos`, recorde `31 dias`.

### 4.4 `Perfil privado` e `Com solicitações pendentes` (linha mobile)

- Entram 4.1 A e B como em 4.3. Na variante com solicitações, a sequência começa `space-6` abaixo da linha de solicitações, e por isso só o topo do container da sequência aparece antes da barra inferior.
- **No perfil privado nada muda para a dona.** Estatísticas e listas continuam inteiras: RN-08 restringe o terceiro, nunca a dona.

### 4.5 `Sem estante e sem resenhas` (linha mobile)

O leitor novo, sem nenhum registro. Entram os blocos, cada um no estado de conta nova:

- **Sequência zerada** (design §4.8): o componente existe e mostra `0` em `num-display` `broto`, com `Flame` estático. No lugar de `dias seguidos`, em `body` `grafite`: `leia hoje para começar`. A linha do recorde mostra `Recorde:` `0` `dias`. O helper à direita continua.
- **`Estatísticas do ano` sem registro:** o cabeçalho fica **sem `Ver estatísticas`** e sem a linha `2026, até hoje`. No lugar da faixa de cards, uma frase em `body` `grafite`: `Suas estatísticas começam no primeiro registro de progresso.` Nenhum card com `0`, nenhum gráfico vazio.
- **`Desafios` sem desafio:** o cabeçalho fica **sem `Ver todos`**. No lugar dos cards, texto em `body` `grafite`: `Escolha um alvo curto, como páginas por dia ou livros por ano.` e, `space-3` abaixo, o botão textual `musgo` com `Plus` 20px: `Novo desafio`.
- Os blocos de estante e resenhas vazios continuam como estão; a seção `Listas` sem listas (4.2 E) fica abaixo, onde a rolagem alcançar.
- Neste artboard a página é mais longa que a viewport: o que não couber é cortado pela barra inferior.

### 4.6 `Carregando` (linha mobile)

- Header real, com `MagnifyingGlass`, `Gear` e `Bell`.
- O skeleton ganha, abaixo da linha de contadores, **a forma da sequência**: um retângulo `capa-placeholder` de `radius-md` e 104px de altura, largura total menos o padding lateral. Abaixo, `space-8`, uma barra de 24px e 50% de largura (o título `Estatísticas do ano`) e três retângulos `capa-placeholder` de `radius` 12, 136 por 88px, em faixa, o terceiro cortado pela borda.
- O resto do skeleton do Período 1 desce e é cortado pela barra inferior.
- Continua um único fade de entrada em `dur-base` com `ease-out`, sem shimmer, sem pulso, sem spinner.

### 4.7 `Erro de carregamento` (linha mobile)

Não muda. Falha ao carregar o perfil inteiro é o banner de hoje. Falha de **um bloco só** é outro estado, em artboard novo (5.5).

### 4.8 Linha web: a coluna de identidade ganha as estatísticas

Vale para `Padrão, aba Estante`, `Aba Resenhas, com solicitações pendentes`, `Perfil privado, com hover na aba` e, na linha do modo escuro, `Web, aba Estante`.

- **Sem sequência e sem desafios na web.** Os dois ficam fora do cliente web (`REQUISITOS.md` §2.1). A coluna de identidade não ganha nenhum espaço reservado para eles.
- **Bloco `Estatísticas do ano` na coluna esquerda de 300px**, `space-6` abaixo do último contador, depois de um divisor de 1px `linha`:
  - Título `Estatísticas do ano` em `title-sm` `tinta` e, `space-1` abaixo, `2026, até hoje` em `caption` `grafite`.
  - `space-3` abaixo, as três métricas **empilhadas**, no mesmo desenho dos contadores da coluna: número em `num-inline` `tinta` à esquerda e rótulo em `body` `grafite` à direita, divisor de 1px `linha` entre elas: `9` `livros concluídos`; `3.818` `páginas lidas`; `71 h 20 min` `de leitura`. Na coluna estreita, cards lado a lado ficariam apertados, como já acontecia com os contadores.
  - `space-3` abaixo, o botão textual `musgo` em `body-strong`, com `ChartBar` (Phosphor, `regular`, 20px) à esquerda: `Ver estatísticas`.
- **A faixa de abas ganha a terceira aba `Listas`**, depois de `Resenhas`, no mesmo desenho: `body-strong`, ativa em `musgo` com sublinhado de 2px `musgo`, inativas em `grafite`, hover com texto `tinta` sem sublinhado.
- **Aba `Resenhas`** (artboard `Aba Resenhas, com solicitações pendentes`): cada resenha da coluna de 720px ganha a linha de contagens de 4.2 D, com as mesmas regras (contagem, não botão).
- A coluna esquerda pode ficar mais alta que a viewport; ela rola junto com a página, e o que não couber é cortado pelo fim do artboard.

### 4.9 `Carregando` (linha web)

- A faixa de abas real passa a ter as três abas.
- Na coluna esquerda, abaixo dos contadores em skeleton, uma barra de 17px e 60% de largura (o título do bloco) e três pares de barras no desenho dos contadores.

### 4.10 Tratamento escuro dos elementos novos

Modo escuro é lock de página inteira: nenhuma seção inverte no meio da rolagem. Superfície elevada fica **mais clara** que o fundo. Shadows com metade da opacidade.

- Sequência: container `noite-elevada`, rótulo `grafite-claro`, número e `Flame` em `broto-vivo`, `dias seguidos` e recorde em `grafite-claro`, helper em `grafite-claro`.
- Cards de estatística em `noite-elevada`, rótulo e unidade em `grafite-claro`, número em `papel-suave`.
- Card de desafio compacto em `noite-elevada`, trilha `musgo-fundo-escuro`, preenchimento `broto-vivo`, números em `papel-suave`, unidade e `Faltam` em `grafite-claro`, ícone em `grafite-claro`.
- Contagens de reação em `grafite-claro`.
- Card de lista: título `papel-suave`, descrição e contagem `grafite-claro`, contorno entre as capas em `noite`, retângulo vazio `noite-elevada` com borda `linha-noite`, divisores `linha-noite`.
- Botões textuais (`Ver estatísticas`, `Ver todos`, `Ver todas`, `Nova lista`) em `musgo-claro`.
- Web: aba `Listas` inativa em `grafite-claro`, ativa em `musgo-claro` com sublinhado `musgo-claro`.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Meu perfil · Sequência, estatísticas e desafios (rolada)`

- Página de `Padrão, perfil público` rolada até que o divisor dos contadores fique logo abaixo do header.
- De cima para baixo: a sequência inteira (4.1 A, `12 dias seguidos`, recorde `31 dias`); `space-8`; o bloco `Estatísticas do ano` inteiro (4.1 B), com o card `Tempo de leitura` cortado pela borda direita; `space-8`; o bloco `Desafios` (4.1 C) com os dois cards e `Mais 3 desafios`; `space-8`; o título da seção `Estante`, cortado pela barra inferior.
- Barra inferior com **Perfil** ativo.

#### 5.2 `Meu perfil · Resenhas e listas (rolada)`

- Página rolada até a seção `Resenhas`.
- De cima para baixo: as duas resenhas, cada uma com a linha de contagens (4.2 D); `space-8`; a seção `Listas` (4.2 E) com as três listas e `Nova lista`; `space-8` antes da barra inferior.
- É o fim da página: abaixo de `Nova lista` não há mais nada.

#### 5.3 `Meu perfil · Sequência zerada, recorde mantido (rolada)`

O dia de ontem terminou sem registro (RF-GAM-03). A sequência atual zerou e o recorde ficou (RN-18.6).

- Mesma rolagem de 5.1.
- Sequência: `0` em `num-display` `broto` com `Flame` estático, `leia hoje para começar` em `body` `grafite` no lugar de `dias seguidos`, e `Recorde:` `31` `dias`.
- **Zerar não é erro nem falha.** Sem `rubi`, sem `ambar`, sem ícone de alerta, sem frase de culpa do tipo "você perdeu sua sequência". O recorde continua no mesmo peso de antes.
- Estatísticas e desafios como em 5.1: a sequência é independente deles.

#### 5.4 `Meu perfil · Fim da página, sem listas (rolada)`

- A dona com estante, resenhas, sequência, estatísticas e desafios, mas sem nenhuma lista.
- Página rolada até o fim: é uma rolagem contínua, sem cortes nem seções coladas. De cima para baixo aparecem o fim da seção `Resenhas` (a segunda resenha, com a linha de contagens) e a seção `Listas` no estado sem listas (4.2 E), com `Nova lista`, e `space-8` antes da barra inferior.
- O bloco `Desafios` sem desafio (4.5, com `Novo desafio`) não é repetido aqui: ele já aparece em `Sem estante e sem resenhas`. Aqui o que se confere é o vazio da seção `Listas` numa conta que tem todo o resto.

#### 5.5 `Meu perfil · Estatísticas indisponíveis (rolada)`

O perfil carregou, mas o serviço de estatísticas não respondeu. **Um bloco que falha não derruba a página.**

- Mesma rolagem de 5.1.
- Bloco `Estatísticas do ano`: o cabeçalho mantém o título e **perde `Ver estatísticas`** e a linha `2026, até hoje`. No lugar da faixa, um banner inline de largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda com `space-3` de gap, texto em `body` `tinta`: `Não foi possível carregar suas estatísticas. Verifique sua conexão e tente de novo.` e, abaixo, o botão textual `musgo`: `Tentar de novo`.
- Sequência e desafios aparecem normais, acima e abaixo do banner.
- A mesma regra vale para a sequência, os desafios e as listas quando só um deles falha: banner inline no lugar do conteúdo do bloco, com a mensagem do bloco (seção 8). Este artboard desenha só o caso das estatísticas.

### Linha 2, web, no fim da linha

#### 5.6 `Meu perfil · Aba Listas`

O desenho da aba vem do canvas do índice de listas (`F-LST/listas-do-leitor.md`, artboard `Listas do leitor · Meu perfil, aba Listas`). Reproduza-o aqui, dentro do perfil deste canvas, sem mudar nada:

- Sidebar com **Perfil** ativo. Header de conteúdo com `Perfil`, `Buscar leitor` e `Configurações`.
- Coluna esquerda como em 4.8, com o bloco `Estatísticas do ano`.
- Coluna direita com a faixa de abas `Estante`, `Resenhas`, `Listas`, **`Listas` ativa**. Abaixo, `space-6`:
  - Linha de topo: `6 listas` em `caption` `grafite` à esquerda e, à direita, o botão secundário de 40px com `Plus` 20px: `Nova lista`. Abaixo, `space-2`, a linha de visibilidade: `Globe` 16px `grafite` e `Seu perfil é público: qualquer leitor pode ver suas listas.` em `caption` `grafite`.
  - `space-5` abaixo, **grid de cards de lista em três colunas**, gap `space-5`. Cada card em coluna: o mosaico com capas de 80 por 120px deslocadas 32px cada, ocupando 144 por 120px; `space-4`; título em `title-sm` `tinta` até duas linhas; descrição em `caption` `grafite` até duas linhas; contagem em `caption` `grafite`. Padding `space-4`, `radius` 12, fundo transparente, sem borda. Hover: fundo `papel-elevado` e título em `musgo`, `dur-fast`.
  - As seis listas em duas fileiras de três: `Contos que eu indico`, `Autoras negras brasileiras`, `Clássicos brasileiros para reler`; `Para ler numa viagem`, `Policiais para o fim de semana`, `Quero ler em 2027` (três retângulos vazios no mosaico). O cursor sobre `Autoras negras brasileiras`, para mostrar o hover.
- **Abaixo de 768px:** as duas colunas viram uma, as três abas viram as seções empilhadas do mobile (com a seção `Listas` de 4.2 E) e a sidebar dá lugar à barra inferior. Sequência e desafios **não** aparecem nesse ponto de virada, porque a SPA não tem esses dados: eles existem só no app.

### Linha 3, modo escuro, no fim da linha

#### 5.7 `Meu perfil · Sequência, estatísticas e desafios (rolada), modo escuro`

- O artboard 5.1 no modo escuro, com o tratamento de 4.10. Serve para conferir no escuro o `broto-vivo` da sequência e da barra de desafio contra `noite-elevada`.

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards do Período 1 continuam, com as mudanças da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Streak (sequência diária), com atual em `num-display` `broto`, `Flame` estático e recorde | documento-de-design §4.8 |
| Padrão de perfil com streak do dono e estatísticas do ano | documento-de-design §5.5 |
| Barra de progresso (geometria) com as cores de desafio | documento-de-design §4.7 e §3.1.3 |
| Card de desafio (ativo, cumprido) | nasceu em `F-DSF/desafios.md`; incorporação pendente |
| Card de lista e mosaico de capas em leque, aba `Listas` da web | nasceram em `F-LST/listas-do-leitor.md`; incorporação pendente |
| Linha de visibilidade herdada | nasceu em `F-LST/listas-do-leitor.md`; incorporação pendente |
| Linha de métrica total com número em `num-display` e unidade em `body-strong` | nasceu em `F-STA/estatisticas.md`; incorporação pendente |
| Botão textual, secundário e primário | documento-de-design §4.1 |
| Capa em canto vivo e placeholder | documento-de-design §4.5 e §7.6 |
| Iconografia Phosphor, `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Superfície e anatomia do streak no perfil**: container `papel-elevado` `radius-md`, rótulo `Sequência diária`, `dias seguidos` ao lado do número, recorde como `Recorde: 31 dias` e o helper de regra à direita. O §4.8 define só os dois números empilhados e o zero.
2. **Card de estatística do bloco do perfil**: faixa horizontal rolável de cards `papel-elevado` `radius` 12, rótulo em cima e número em `num-display` com unidade. O §5.5 diz só "cards horizontais com número grande em `num-display`".
3. **Card de desafio compacto**: o card de `desafios.md` sem `DotsThreeVertical`, com a janela na linha do título e o card inteiro tocável.
4. **Linha de contagens de reação não acionável**, para resenha do próprio leitor: ícone de 16px e contagem em `caption` `grafite`, sem alvo de toque.
5. **Seção `Listas` do perfil mobile** com `Nova lista` como botão textual depois das três listas.
6. **Bloco de estatísticas empilhado na coluna de identidade da web.**
7. **Falha parcial de bloco do perfil**: banner inline no lugar do conteúdo de um bloco, com o resto da página carregado.

**Decisões deste prompt a ratificar pelo dono das features:**

- Ordem das seções no mobile (sequência, estatísticas, desafios, estante, resenhas, listas).
- O bloco de desafios mostra só os dois primeiros ativos e esconde os pausados; a linha `Mais 3 desafios` conta todos os outros, pausados inclusive.
- O bloco de estatísticas some com uma frase na conta nova, em vez de cards com `0`; e perde `Ver estatísticas` nesse caso, embora o painel tenha estado vazio próprio.
- Sequência zerada usa a frase literal do §4.8, `leia hoje para começar`, em minúscula.
- Helper da sequência (`Conta cada dia em que você registra ao menos 1 página.`) não está no §4.8.

**Conflitos a levar ao grupo:**

- **Contraste do `broto`.** O §4.8 põe o número da sequência em `num-display` `broto`, e `broto` (`#8AA274`) sobre `papel-elevado` (`#EDE9DE`) fica abaixo de 3:1, abaixo do mínimo de texto grande do WCAG AA. O desenho segue o §4.8 e compensa com `dias seguidos` em `grafite` ao lado e o rótulo acessível completo, mas o documento precisa decidir (o lote 4 já registrou o mesmo problema do `broto` nos gráficos). No escuro, `broto-vivo` sobre `noite-elevada` passa.
- **Contadores e painel com bases diferentes.** O contador `12 livros lidos` é do canvas do Período 1 e o painel de estatísticas usa `34 livros` concluídos no acumulado para a mesma leitora. Neste canvas os números não se contradizem (12 no total, 9 em 2026), mas os dois canvases não batem. Decidir se `livros lidos` conta livros distintos ou leituras concluídas, e alinhar os mocks.
- **Datas diferentes nos mocks:** os desafios foram desenhados em 24 de setembro e o painel em 29 de setembro de 2026. Aceitável, porque são canvases separados.
- **Contrato:** o perfil compõe dados de quatro endpoints (`/me/sequencia`, `/me/estatisticas`, desafios e `GET /perfis/{usuarioId}/listas`) além de `identidade`. O `Mais 3 desafios` pressupõe um total de desafios na listagem; `Estatísticas do ano` pressupõe o ano corrente em `GET /me/estatisticas` sem pedir o painel inteiro.

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Rótulo da sequência | não existia | `Sequência diária` |
| Sequência atual | não existia | `12` `dias seguidos` |
| Sequência zerada | não existia | `0` `leia hoje para começar` |
| Recorde | não existia | `Recorde: 31 dias`, `Recorde: 0 dias` |
| Helper da sequência | não existia | `Conta cada dia em que você registra ao menos 1 página.` |
| Título do bloco | não existia | `Estatísticas do ano` |
| Período do bloco | não existia | `2026, até hoje` |
| Ação do bloco | não existia | `Ver estatísticas` |
| Rótulos dos cards | não existia | `Livros concluídos`, `Páginas lidas`, `Tempo de leitura` |
| Valores dos cards | não existia | `9 livros`, `3.818 páginas`, `71 h 20 min` |
| Web, métricas empilhadas | não existia | `9` `livros concluídos`, `3.818` `páginas lidas`, `71 h 20 min` `de leitura` |
| Estatísticas sem registro | não existia | `Suas estatísticas começam no primeiro registro de progresso.` |
| Estatísticas, falha | não existia | `Não foi possível carregar suas estatísticas. Verifique sua conexão e tente de novo.` |
| Título do bloco | não existia | `Desafios` |
| Ação do bloco | não existia | `Ver todos` |
| Desafios | não existia | `20 páginas por dia`, `Hoje`, `12 de 20 páginas`, `Faltam 8 páginas`; `150 minutos por semana`, `Esta semana`, `95 de 150 minutos`, `Faltam 55 minutos` |
| Desafio cumprido | não existia | `Cumprido hoje` |
| Contagem restante | não existia | `Mais 3 desafios` |
| Desafios, vazio | não existia | `Escolha um alvo curto, como páginas por dia ou livros por ano.` |
| Desafios, ação do vazio | não existia | `Novo desafio` |
| Desafios, falha | não existia | `Não foi possível carregar seus desafios. Verifique sua conexão e tente de novo.` |
| Sequência, falha | não existia | `Não foi possível carregar sua sequência. Verifique sua conexão e tente de novo.` |
| Contagens de reação | não existia | `12 curtidas`, `1 descurtida`, `27 curtidas`, `0 descurtidas` |
| Título da seção | não existia | `Listas` |
| Ação da seção | não existia | `Ver todas` |
| Listas | não existia | `Contos que eu indico`, `7 livros`; `Autoras negras brasileiras`, `6 livros`; `Clássicos brasileiros para reler`, `8 livros` |
| Descrições das listas | não existia | `Livros de contos para quem acha que não gosta de conto. Em ordem de por onde começar.`; `Para ler, reler e dar de presente.`; `Os que li na escola e merecem uma segunda chance.` |
| Criar lista | não existia | `Nova lista` |
| Listas, vazio | não existia | `Junte livros sob um título, com uma descrição e na ordem que você quiser.` |
| Listas, falha | não existia | `Não foi possível carregar suas listas. Verifique sua conexão e tente de novo.` |
| Web, abas | `Estante` e `Resenhas` | `Estante`, `Resenhas` e `Listas` |
| Web, aba Listas | não existia | `6 listas`, `Nova lista`, `Seu perfil é público: qualquer leitor pode ver suas listas.` |
| Linha explicativa do privado | `Só quem você aceita vê sua estante e suas resenhas.` | `Só quem você aceita vê sua estante, suas resenhas, suas listas e suas estatísticas.` |
| Rótulo acessível da sequência | não existia | `Sequência diária: 12 dias seguidos. Recorde: 31 dias.` |

A linha explicativa do perfil privado muda porque RN-08 restringe também listas e estatísticas, e a frase antiga ficaria incompleta. A sequência e os desafios não entram na frase: são do próprio leitor e ninguém mais os vê.

Zero em-dash, zero emoji. Todo número tem unidade.

---

## 9. Acessibilidade e interação do que muda

- **Sequência:** o container é lido como um texto só: `Sequência diária: 12 dias seguidos. Recorde: 31 dias.` O número não depende da cor `broto` para ser entendido, porque `dias seguidos` está escrito ao lado em `grafite`. Não recebe foco, porque não é acionável.
- **Estatísticas:** a faixa horizontal é uma lista rolável com rótulo `Estatísticas de 2026`; cada card é lido como `Livros concluídos: 9 livros`. O terceiro card cortado continua alcançável por rolagem e por leitor de tela. `Ver estatísticas` tem alvo de 48px.
- **Desafios:** cada card compacto é um botão com o rótulo completo, por exemplo `20 páginas por dia, hoje, 12 de 20 páginas, faltam 8 páginas. Abrir desafios.` A barra tem papel `progressbar` com valor, mínimo e máximo, mas a fração escrita já diz tudo. Alvo de toque do card inteiro.
- **Contagens de reação:** lidas como `12 curtidas, 1 descurtida`, sem papel de botão.
- **Listas:** cada linha é um botão, lido como `Contos que eu indico, 7 livros. Livros de contos para quem acha que não gosta de conto. Abrir lista.` O mosaico é decorativo para leitor de tela. `Nova lista` e `Ver todas` com alvo de 48px.
- **Falha de bloco:** o banner é anunciado como alerta, e `Tentar de novo` recarrega só aquele bloco.
- **Web:** a terceira aba segue o padrão de abas já usado: setas trocam de aba, `Tab` entra no conteúdo, e a troca move o foco para o conteúdo. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px em `Ver estatísticas`, na aba `Listas`, em `Nova lista` e em cada card. Ordem de tabulação: sidebar, header, coluna de identidade (com `Ver estatísticas` depois dos contadores), abas, conteúdo.
- Contraste: helpers, contagens, rótulos e descrições em `grafite`, nunca em `grafite-suave`. Ver na seção 7 o conflito do `broto` no número da sequência.
- `prefers-reduced-motion`: a rolagem da faixa de estatísticas não tem inércia animada extra, o hover do card de lista e o fade do skeleton viram estáticos.
- Nenhuma ação nova desta edição é destrutiva.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Header, identidade, chip de privacidade, contadores, linha de solicitações, estante, trecho das resenhas, estados vazios do Período 1, erro e shell ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe as telas de destino** (painel de estatísticas, lista de desafios, criar desafio, índice de listas, lista, criar lista) dentro deste canvas.
- Não ponha ação nova no header. As entradas moram nos blocos.

**Específico do perfil no Período 2**

- **Não desenhe sequência nem desafios na web**, nem como espaço reservado, nem como aviso de "disponível no app".
- **Não anime a sequência.** Nada de fogo animado, partícula, chama que cresce, número que conta subindo, emoji de fogo ou contagem regressiva para o fim do dia.
- **Não trate a sequência zerada como falha.** Sem `rubi`, sem `ambar`, sem ícone de alerta, sem frase de culpa. O recorde continua visível e no mesmo peso.
- Não desenhe calendário de dias com leitura nem lembrete: são do Período 3.
- Não desenhe gráfico, média, comparação com o ano anterior ou seta de tendência no bloco de estatísticas. O bloco tem três totais; o resto mora no painel.
- Não mostre `0 livros`, `0 páginas` e `0 min` em cards para a conta nova: o bloco vira uma frase.
- Não use `musgo` na barra de desafio: progresso de desafio é `broto` sobre `musgo-fundo`.
- Não mostre percentual ao lado da barra de desafio.
- Não desenhe `DotsThreeVertical`, editar, pausar ou excluir desafio dentro do perfil.
- Não desenhe desafio pausado no bloco.
- **Não transforme as contagens da própria resenha em botões.** A leitora não reage à própria resenha.
- Não mostre curtidas e descurtidas como saldo, percentual ou barra de proporção.
- Não desenhe excluir ou editar lista a partir do perfil: isso mora dentro da lista.
- Não crie controle de privacidade por lista: a lista segue o perfil.
- Não desenhe `Nova lista` duas vezes na mesma seção.
- Não desenhe favoritos, frases, medalhas, nível de leitor nem selo.

**Específico do perfil próprio (continua valendo do Período 1)**

- **Não restrinja nada do dono.** Perfil privado não esconde estante, resenha, lista ou estatística de quem é dono delas.
- Não desenhe botão de seguir, solicitar ou deixar de seguir.
- Não desenhe compartilhar perfil, QR code nem link público.
- Não desenhe o nome do leitor no título do header. O título é `Perfil`.
- Não desenhe contagem de curtidas recebidas no total, visualizações de perfil nem qualquer métrica de vaidade. As contagens por resenha são RF-AVA-08, não um placar do perfil.
- Não desenhe banner de capa atrás do avatar nem upload de avatar nesta tela.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais: corpo da resenha, frases e trechos, sinopse. Sequência, estatísticas, desafios e listas são Manrope e JetBrains Mono.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão, em texto de título, na barra de desafio ou no card de estatística.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.
- Nada de barra de desafio que "enche" animada ao abrir a tela: ela aparece no valor.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é: `Sequência diária`, `Estatísticas do ano`, `Desafios`, `Listas`.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado, nem no mosaico das listas.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.

**Métricas e dados**

- Nada de número exibido sem unidade: `12 dias seguidos`, `3.818 páginas`, `71 h 20 min`, `7 livros`.
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".
- Nada de gráfico em roxo ou teal de IA. Nada de gráfico no perfil.
- Nada de repetir o símbolo de percentual quando o contexto já é percentual.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos. As estatísticas da web são linhas empilhadas, não três cards.
- Nada de bento grid decorativo com estatísticas e listas.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação, nem ao cumprir desafio nem ao bater recorde.
- Sem ranking de leitores nem comparação de sequência com amigos.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
