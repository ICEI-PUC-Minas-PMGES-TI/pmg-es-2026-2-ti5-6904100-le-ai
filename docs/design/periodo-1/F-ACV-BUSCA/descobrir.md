# F-ACV-BUSCA · Descobrir

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-ACV-BUSCA.md
**Editada por:** ../../periodo-2/descobrir/descobrir.md
**Requisitos:** RF-ACV-01 (buscar por título, autor, editora ou ISBN, com resultados paginados), RF-ACV-02 (filtrar resultados por assunto)
**Não funcionais:** RNF-DES-02 (paginação com teto de itens), RNF-SEC-06 (livro pessoal nunca aparece na busca), RNF-USA-02 (responsiva na web), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (mensagem de erro em pt-BR e acionável), RNF-ERR-09 (cold start é carregamento, não erro)
**Regras de negócio:** RN-01 (o livro é a edição; o agrupamento por título mais autor é mitigação de interface, não mudança de modelo), RN-03 (livro pessoal fora do catálogo), RN-14.4 (ordem de resolução da capa), RN-21 (assuntos normalizados do conjunto curado)
**Versão web:** sim. RF-ACV-01 e RF-ACV-02 têm marcação na coluna Web de `REQUISITOS.md` §5.2.

---

## 1. Contexto

Esta é a porta de entrada do acervo: o "encontrar um livro" do ciclo de valor do produto. O leitor chega aqui pela aba **Descobrir** da navegação, digita o que lembra (título, autor, editora ou ISBN) e sai daqui para a página do livro, de onde parte para a estante e para a leitura.

**Esta tela é raiz de aba, não tela filha da estante.** A separação é deliberada: `Minha estante` mostra o que o leitor já tem, e a lupa de lá busca **dentro** dela ([`../F-EST/estante.md`](../F-EST/estante.md)); `Descobrir` mostra o acervo inteiro. Sem essa divisão, uma aba chamada `Estante` exibiria resultados de catálogo e um campo dentro de `Minha estante` devolveria livros que não são do leitor. A aba é nova em relação ao shell de três itens de [P0-NAV](../../periodo-0/P0-NAV/shell-de-navegacao.md) e vale como decisão de protótipo até o controle de mudança do plano §3, no mesmo regime da barra inferior.

Ela sustenta o mecanismo de **registro**: sem encontrar a edição certa, não há o que registrar.

Quatro coisas definem o desenho:

- **A busca é de livro oficial apenas.** Livro pessoal nunca aparece aqui, em nenhuma circunstância, nem para o próprio dono (RN-03, RNF-SEC-06). O caminho do livro pessoal é outro e pertence a F-ACV-CADASTRO.
- **O modelo é por edição** (RN-01). Duas edições da mesma obra são dois registros. Como isso confunde na leitura de uma lista de resultados, a interface **agrupa visualmente** por título mais autor e mostra quantas edições existem. O agrupamento é de interface, não de dados.
- **O filtro por assunto convive com a busca textual**, não a substitui. O assunto vem do conjunto curado e fechado de RN-21.
- **A aba é magra no Período 1, e tudo bem.** Sem consulta ela mostra o campo e os assuntos, e nada mais: livros em destaque, mais lidos e recomendados não existem ainda. Os filtros avançados e as páginas de autor, editora e série chegam com F-ACV-DESCOBERTA no Período 2, e a seção de recomendações com F-REC-P2P. Não antecipe nenhum dos dois desenhando espaço reservado, seção vazia ou placeholder de "em breve".

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Descobrir · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Consulta digitada:** `conceição evaristo`

**Resultados (livros reais, editoras coerentes):**

| Título | Autor | Editora | Ano | Páginas | Assuntos |
|---|---|---|---|---|---|
| Ponciá Vicêncio | Conceição Evaristo | Pallas | 2003 | 128 páginas | Romance |
| Becos da Memória | Conceição Evaristo | Pallas | 2006 | 200 páginas | Romance |
| Olhos d'Água | Conceição Evaristo | Pallas | 2014 | 116 páginas | Conto |
| Insubmissas Lágrimas de Mulheres | Conceição Evaristo | Nandyala | 2011 | 108 páginas | Conto |

`Ponciá Vicêncio` tem **3 edições** no acervo (Pallas 2003, Pallas 2017, Pallas 2018). O card agrupado mostra a edição mais recente e a indicação `3 edições`.

**Segunda consulta, para o artboard de filtro:** `terror`, com o chip de assunto `Terror` ativo.

| Título | Autor | Editora | Ano | Páginas |
|---|---|---|---|---|
| O Espelho e a Máscara | Ana Paula Maia | Record | 2019 | 152 páginas |
| A Casa das Sete Mulheres | Letícia Wierzchowski | Record | 2002 | 448 páginas |

**Chips de assunto disponíveis** (conjunto curado de RN-21, faixa rolável): `Romance`, `Conto`, `Terror`, `Ficção científica`, `Poesia`, `Fantasia`, `Biografia`, `História`, `Ensaio`.

**Contagem de resultados:** `12 livros encontrados`. Todo número traz a unidade.

**Estado de nota:** nenhum resultado exibe nota. Nota geral e nota dos leitores só existem a partir de F-ACV-NOTA, no Período 2. Onde o card de busca de design §4.5 prevê nota, o artboard mostra **nada**, não `0,0` e não um traço.

**Status pill:** `Ponciá Vicêncio` já está na estante do leitor com status `Lendo`. `Olhos d'Água` está com `Quero ler`. Os outros dois não estão na estante e não trazem pill.

**Capas:** `Ponciá Vicêncio` e `Olhos d'Água` carregam capa real. `Becos da Memória` cai no placeholder `capa-placeholder` com o título centralizado, conforme RN-14.4 e design §4.5.

---

## 4. Artboards mobile (390 x 844)

Toda tela desta lista é autenticada e vive dentro do shell.

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

### Header de Descobrir

Raiz de aba: o header segue o padrão do shell e ganha uma **segunda linha** para o campo de busca. Sem `ArrowLeft`, porque não há de onde voltar.

- **Primeira linha**, altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`. Título `Descobrir` em `display` `tinta` à esquerda, alinhado à base. À direita, apenas o sino `Bell` (Phosphor, `regular`, 24px, `tinta`), com o badge de não lidas do shell. **O sino existe aqui como em toda tela autenticada:** o campo saiu da linha do título e a exceção que a versão anterior desta tela abria deixou de existir.
- **Segunda linha**, padding lateral `space-5`, `space-3` de respiro abaixo do título: o **campo de busca** em largura total. Altura 48px, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, conforme design §4.2. `MagnifyingGlass` (Phosphor, `regular`, 20px, `grafite-suave`) dentro do campo à esquerda, com `space-3` de gap até o texto. Texto digitado em `body` `tinta`. Quando há texto, `X` (Phosphor, `regular`, 20px, `grafite`) à direita limpa o campo.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.
- Foco no campo: borda de 1.5px `musgo`, transição `dur-fast`, sem outline do browser.
- **Nada de header que encolhe, colapsa ou vira campo flutuante na rolagem.** As duas linhas são fixas.

### Faixa de assuntos

Logo abaixo do header, faixa horizontal rolável com os chips de assunto, padding lateral `space-5`, `space-2` de gap entre chips, `space-4` de respiro acima e abaixo.

- Chip inativo: `radius-full`, padding `space-2 space-4`, borda de 1px `linha`, fundo transparente, texto em `caption` `grafite`.
- Chip ativo: fundo `musgo-fundo`, sem borda, texto em `caption` peso 600 `musgo`, com `X` (Phosphor, `regular`, 16px, `musgo`) à direita para remover o filtro.
- A faixa rola na horizontal e **não tem seta, gradiente de fade nem indicador de rolagem**. O corte do último chip visível já comunica que há mais.

### 4.1 Resultados

O estado principal. De cima para baixo:

1. Header de duas linhas: título `Descobrir` com o sino à direita, e o campo preenchido com `conceição evaristo` abaixo.
2. Faixa de assuntos, nenhum chip ativo.
3. Linha de contagem: `12 livros encontrados` em `caption` `grafite`, padding lateral `space-5`, alinhada à esquerda, com `space-3` abaixo.
4. **Lista de resultados**, cards da variante Busca de design §4.5, um por linha, separados por divisor de 1px `linha` com `space-4` de padding vertical:
   - Capa de 80 por 120px à esquerda, retângulo de canto vivo, sem raio.
   - `space-4` de gap até o bloco de texto.
   - Título em `title-sm` `tinta`, no máximo duas linhas.
   - Autor em `body` `grafite`.
   - Editora e ano em `caption` `grafite-suave`, no formato `Pallas · 2003`.
   - Número de páginas em `caption` `grafite-suave`, no formato `128 páginas`.
   - Status pill conforme design §4.6, quando o livro está na estante: `Lendo` com fundo `musgo-fundo` e texto `musgo`, `Quero ler` com borda de 1px `linha` e texto `tinta`.
   - **Nenhuma nota.** O espaço que o card de busca reserva para nota fica vazio.
5. `Ponciá Vicêncio` traz, abaixo da linha de editora, a indicação de agrupamento: `3 edições` em `caption` `musgo`, acionável, que expande as edições daquele título mais autor. Esse é o tratamento de RN-01 e ele é de interface: o modelo continua sendo por edição.
6. `Becos da Memória` aparece com o placeholder de capa: retângulo `capa-placeholder` de 80 por 120px com o título centralizado em `title-sm` `tinta` e o autor abaixo em `caption` `grafite`. Nada de ícone de livro genérico.
7. Ao fim da lista, o carregamento da próxima página acontece por rolagem. Nada de botão `Carregar mais`, nada de numeração de página no mobile.
8. Barra inferior do shell com **Descobrir** ativo, com `Compass` em peso `fill` e o rótulo em peso 600 `musgo`.

### 4.2 Filtro por assunto ativo

Mesmo enquadramento de 4.1, com a consulta `terror` e o chip `Terror` ativo em `musgo-fundo`.

- A linha de contagem passa a `2 livros encontrados`.
- A lista mostra os dois resultados de terror.
- O chip ativo é o **único** chip ativo: o filtro por assunto é de seleção única no Período 1, porque `GET /livros` recebe um assunto. Nada de multisseleção desenhada aqui.

### 4.3 Carregando

O que aparece entre digitar e receber a resposta, e também durante o cold start do serviço (RNF-ERR-09), que é carregamento e não erro.

- Header de duas linhas e faixa de assuntos completos e reais.
- No lugar da lista, **skeleton estático** com a forma do card de busca: retângulo `capa-placeholder` de 80 por 120px, e três barras à direita em `capa-placeholder` com `radius-sm`, larguras de 70%, 45% e 30%, alturas de 18px, 15px e 13px, com `space-2` entre elas.
- Cinco esqueletos empilhados, separados pelo mesmo divisor `linha`.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner. O sistema não tem spinner.
- Sem linha de contagem: não se sabe ainda quantos são.

### 4.4 Nenhum resultado

Estado vazio da busca, com desenho intencional.

- Header de duas linhas, com o campo preenchido com `guimaraes rossa`, um erro de digitação plausível.
- Faixa de assuntos presente, nenhum chip ativo.
- Bloco centralizado no espaço restante, com `space-6` entre os elementos:
  - `MagnifyingGlass` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhum livro encontrado`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Confira a grafia ou tente pelo ISBN. Se o livro não está no acervo, você pode cadastrá-lo.`
  - Botão primário pill, altura 48px, fundo `musgo`, texto `papel`: `Cadastrar por ISBN`.
  - Botão textual `musgo`: `Cadastrar livro pessoal`.
- **Nunca "não há dados", nunca "nada por aqui".** O vazio da busca tem saída, e a saída é o cadastro.

### 4.5 Erro de carregamento

- Header de duas linhas e faixa de assuntos completos.
- Banner inline no lugar da lista, largura total menos o padding lateral `space-5`, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda e `space-3` de gap.
- Texto em `body` `tinta`: `Não foi possível carregar os resultados. Verifique sua conexão e tente de novo.`
- Botão textual `musgo` abaixo do texto: `Tentar de novo`.
- **Nada de "Algo deu errado".** A mensagem diz o que falhou e o que fazer.

### 4.6 Aterrissagem, antes de buscar

O estado em que a aba abre quando o leitor toca em `Descobrir`.

- Campo de busca vazio, **sem foco automático e sem teclado aberto**. Aba raiz não sequestra o teclado: quem chegou pelo assunto não pediu para digitar. O foco só vem do toque no campo.
- Placeholder em `grafite-suave`: `Título, autor, editora ou ISBN`. O placeholder aqui descreve o escopo da busca e não substitui label nenhum: o campo é o assunto da tela e não tem label acima, o que é a exceção declarada desta tela ao padrão de formulário de design §4.2.
- Faixa de assuntos visível e é o caminho de entrada sem digitar: mesmo sem consulta, o leitor pode tocar um assunto e receber resultados.
- Resto da tela em `papel`, vazio, sem sugestão de busca, sem histórico de buscas, sem livros em destaque. **A aba é assumidamente magra aqui no Período 1.** Filtros avançados e páginas de autor, editora e série chegam com F-ACV-DESCOBERTA, e a seção de recomendações com F-REC-P2P: as duas preenchem esta tela no Período 2. Desenhar espaço reservado para elas agora é desenhar promessa, não interface.
- Barra inferior com **Descobrir** ativo.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular ela usa o desenho mobile, no desktop usa o desenho abaixo. Os dois artboards são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Descobrir** ativo em `musgo-fundo`, com `Compass` em `fill` `musgo`.
- Área de conteúdo com padding lateral `space-8` e `max-width` de 1120px no bloco central, alinhado à esquerda da área útil e não centralizado num container estreito sobre fundo vazio.
- **Header de conteúdo de 72px** com o título `Descobrir` em `display` `tinta` à esquerda e, à direita, o campo de busca de 44px de altura (medida de web, design §4.2) ocupando 560px. Sem sino. Na web o título e o campo cabem na mesma linha, então a segunda linha do mobile não existe aqui.
- Abaixo do header, a **linha de contagem** em `caption` `grafite`, alinhada à direita da área útil, com `space-3` de respiro.
- Abaixo dela, **duas colunas**:
  - **Coluna da esquerda, 240px:** painel de assuntos fixo, em lista vertical e não em faixa rolável. Título de seção `Assuntos` em `label` `grafite`, e os nove assuntos empilhados com `space-1` de gap. Cada item tem 36px de altura, `radius` 12, padding lateral `space-3`, texto em `body`. Hover com fundo `linha`. Ativo com fundo `musgo-fundo` e texto `musgo`.
  - **Coluna da direita:** os resultados em **grid de duas colunas** com gap `space-5`, cards da variante Busca. A tela grande cabe dois cards por linha sem espremer o texto, e é mais densa que o mobile sem virar dashboard.
- `hover` no card: fundo `papel-elevado`, transição `dur-fast`. Foco de teclado visível em card, chip e botão, com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** o painel de assuntos volta a ser a faixa horizontal rolável do mobile, o grid cai para uma coluna e a sidebar dá lugar à barra inferior.

### 5.1 Resultados

Estado padrão da web. Campo com `conceição evaristo`, contagem `12 livros encontrados` à direita, painel de assuntos sem seleção, grid de duas colunas com os quatro resultados. `Ponciá Vicêncio` traz `3 edições` em `caption` `musgo`.

### 5.2 Filtro por assunto ativo

Painel de assuntos com `Terror` em `musgo-fundo`, campo com `terror`, contagem `2 livros encontrados`, grid com dois cards.

### 5.3 Carregando

Skeleton estático no grid, seis cards em forma de esqueleto, painel de assuntos real e campo real. Um único fade de entrada, sem shimmer.

### 5.4 Nenhum resultado

Grid substituído pelo bloco centralizado dentro da coluna da direita, com a mesma copy do mobile e os dois botões lado a lado. O painel de assuntos continua à esquerda: o leitor pode trocar de caminho sem voltar.

### 5.5 Aterrissagem, antes de buscar

O estado em que a aba abre na web, e o artboard que mostra com honestidade o quanto ela ainda é magra no Período 1.

- Campo do header vazio, com o placeholder `Título, autor, editora ou ISBN`, **sem foco automático**.
- Sem linha de contagem: não há consulta.
- Painel de assuntos completo à esquerda, sem seleção. Ele é o caminho de entrada sem digitar e, nesta tela grande, é o que impede a aterrissagem de parecer quebrada.
- Coluna da direita em `papel`, vazia. **Sem bloco de vazio centralizado, sem ilustração, sem texto de boas-vindas, sem espaço reservado.** A tela ainda não tem o que dizer, e dizer isso com um bloco de vazio seria tratar o estado inicial como falha.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, resultados.** Fundo `noite`. Título do header em `papel-suave` e o sino em `papel-suave`. Campo de busca em `noite-elevada`, **mais claro** que o fundo, borda `linha-noite`, texto digitado em `papel-suave`, placeholder em `grafite-fundo-escuro`. Chip inativo com borda `linha-noite` e texto `grafite-claro`; chip ativo com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Título do card em `papel-suave`, autor em `grafite-claro`, editora e páginas em `grafite-fundo-escuro`. Divisor `linha-noite`. Placeholder de capa em `capa-placeholder-noite`. Status pill `Lendo` com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Barra inferior em `noite-elevada` com quatro itens e **Descobrir** ativo em `musgo-claro`.
- **Web, resultados.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, com quatro itens e **Descobrir** ativo em `musgo-fundo-escuro`. Painel de assuntos com hover `linha-noite` e ativo `musgo-fundo-escuro`. Card em hover com fundo `noite-elevada`.

Nos dois, os shadows ficam com **metade da opacidade**: a hierarquia no escuro vem da cor de superfície e do divisor `linha-noite`, não da sombra.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Card de livro, variante Busca | documento-de-design §4.5 |
| Placeholder de capa em retângulo de canto vivo | documento-de-design §4.5 e §7.6 |
| Status pill dos cinco status | documento-de-design §4.6 |
| Input com label, foco, erro e helper | documento-de-design §4.2 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que ainda não existem na fonte.** Dois elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3, não ficam decididos só neste prompt:

1. **O chip de assunto como filtro.** Ele aparece no §5.2 como elemento da página do livro, mas nunca como filtro de busca com estado ativo e remoção. O desenho aqui reaproveita o mesmo chip e acrescenta o estado ativo.
2. **A aba `Descobrir` como quarta área da navegação.** O §5 nunca define barra de navegação, e o §5.1 põe a lupa no header da estante sem dizer o que ela busca. Esta tela deixa de ser filha da estante e vira raiz de aba, o que muda o shell de [P0-NAV](../../periodo-0/P0-NAV/shell-de-navegacao.md) e o significado da lupa do §5.1. Registrado como pendência em [`feature-P0-NAV.md`](../../../plano-de-desenvolvimento/periodo-0/feature-P0-NAV.md).

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Descobrir` |
| Item de navegação | `Descobrir` |
| Placeholder do campo | `Título, autor, editora ou ISBN` |
| Contagem, resultados | `12 livros encontrados` |
| Contagem, filtro ativo | `2 livros encontrados` |
| Indicação de agrupamento | `3 edições` |
| Chips de assunto | `Romance`, `Conto`, `Terror`, `Ficção científica`, `Poesia`, `Fantasia`, `Biografia`, `História`, `Ensaio` |
| Título de seção do painel web | `Assuntos` |
| Vazio, título | `Nenhum livro encontrado` |
| Vazio, texto | `Confira a grafia ou tente pelo ISBN. Se o livro não está no acervo, você pode cadastrá-lo.` |
| Vazio, botão primário | `Cadastrar por ISBN` |
| Vazio, botão textual | `Cadastrar livro pessoal` |
| Erro, texto | `Não foi possível carregar os resultados. Verifique sua conexão e tente de novo.` |
| Erro, botão textual | `Tentar de novo` |
| Status pill | `Lendo`, `Quero ler` |
| Metadado do card | `Pallas · 2003`, `128 páginas` |

Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no sino, no botão de limpar o campo e em cada chip de assunto, mesmo que o chip pareça menor. **Não existe botão de voltar nesta tela:** ela é raiz de aba, e o gesto de voltar do sistema sai para a aba anterior, não para a estante.
- O card inteiro é a área acionável, não só o título. No mobile isso dá uma área muito acima de 48px.
- Contraste WCAG AA no corpo nos dois temas. Editora, ano e páginas usam `grafite-suave`, que passa apenas em tamanho grande: por isso eles nunca carregam informação essencial, e o título e o autor, que carregam, usam `tinta` e `grafite`.
- O chip ativo é distinguível **sem depender de cor**: além de `musgo-fundo`, ele ganha peso 600 no texto e o `X` de remoção.
- Na web, foco de teclado visível em campo, chip, card e botão, com contorno de 2px `musgo` e offset de 2px. A ordem de tabulação vai da sidebar para o campo, do campo para o painel de assuntos e daí para os resultados.
- A aba abre **sem foco automático no campo**, então quem usa leitor de tela chega no título `Descobrir` e escolhe entre digitar e navegar pelos assuntos, em vez de cair num campo de texto sem contexto.
- A contagem de resultados é anunciada por leitor de tela quando muda, para que a troca de filtro não seja silenciosa.
- `prefers-reduced-motion` respeitado: o fade de entrada do skeleton e a transição de hover viram estáticos.
- O estado de carregamento preserva a altura da lista para que o conteúdo não salte quando os resultados chegam.

---

## 10. O que não fazer nesta tela

**Específico da busca**

- **Não desenhe livro pessoal nos resultados.** Nem para o dono, nem com badge, nem em seção separada. Livro pessoal está fora da busca, do catálogo e dos filtros (RN-03, RNF-SEC-06).
- **Não desenhe nota nos cards.** Nota geral e nota dos leitores não existem no Período 1. Ausência é ausência: nada de `0,0`, nada de traço, nada de cinco estrelas vazias.
- **Não desenhe filtro por autor, editora, série, ano ou faixa de páginas.** Isso é RF-ACV-03, do Período 2. O único filtro desta tela é por assunto.
- Não desenhe multisseleção de assunto. Um assunto por vez.
- Não desenhe uma quinta área na navegação nem mude os quatro itens do shell. A seção de recomendações de RF-REC-13 entra **dentro** desta aba no Período 2.
- Não desenhe sugestão de busca, autocompletar, histórico de buscas nem busca por voz.
- Não desenhe seção de livros em destaque, mais lidos ou recomendados na aterrissagem. Nem como espaço reservado, nem como "em breve". O que preenche esta aba no Período 2 é F-ACV-DESCOBERTA (filtros avançados e páginas de autor, editora e série) e F-REC-P2P (seção de recomendações, RF-REC-13).
- **Não desenhe livro da estante do leitor aqui.** Esta aba mostra o acervo; o que ele já tem aparece na `Minha estante`. O status pill no card é indicação de estado, não filtro nem seção.
- **Não desenhe botão de voltar** no header. Raiz de aba não volta.
- **Não tire o sino desta tela.** O campo desceu para a segunda linha justamente para o sino caber, e ele é fixo em toda tela autenticada do mobile.
- Não abra a aba com o campo focado e o teclado do sistema aberto.
- Não desenhe numeração de página estilo `1 2 3 ... 12` no mobile. A paginação do mobile é por rolagem.
- Não transforme o agrupamento por título mais autor em fusão de registros. O card agrupado mostra uma edição e diz quantas existem.

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
**Formulários**

- Nada de placeholder no lugar do label. Label sempre acima do campo.
- Nada de helper que só aparece depois do erro. Se a regra existe, o helper é visível o tempo todo.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.
- Nada de campo de senha sem o botão de mostrar a senha.
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
