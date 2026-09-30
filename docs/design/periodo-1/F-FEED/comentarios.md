# F-FEED · Comentários

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-FEED.md
**Requisitos:** RF-SOC-12 (comentar atividades e responder a comentários, conforme RN-10), RF-SOC-14 (ao responder a uma resposta, pré-preencher a menção `@username` ao autor respondido, mantendo o mesmo nível de aninhamento)
**Não funcionais:** RNF-SEC-14 (comentário tratado como texto e renderizado com escape, nunca como HTML), RNF-SEC-18 (rate limiting em comentar, responder e mencionar), RNF-SEC-03 (o servidor revalida se a atividade ainda é visível ao solicitante antes de listar ou escrever), RNF-DES-02 (listagens paginadas), RNF-USA-03, RNF-USA-05, RNF-ERR-09
**Regras de negócio:** RN-10 (comentários só em atividades do feed, com **um único nível** de resposta; resposta a uma resposta é irmã sob a mesma raiz, e o contexto é preservado pela menção), RN-08 e RN-09 (visibilidade da atividade)
**Versão web:** sim (RF-SOC-12 e RF-SOC-14 têm marcação na coluna Web de `REQUISITOS.md` §5.9)
**Editada por:** ../../periodo-2/comentarios/comentarios.md

---

## 1. Contexto

A conversa sobre uma atividade do feed. Abre pelo botão de comentar de um item em [`feed.md`](feed.md): **bottom sheet no mobile, dialog centrado na web**, conforme design §5.4. É tela pela regra de recorte de `docs/design/AGENTS.md` §2, porque tem estados próprios.

**RN-10 é o desenho.** O aninhamento para em **um nível**: existe comentário e existe resposta, e não existe resposta de resposta. Quando alguém responde a uma resposta, o comentário novo entra como **irmão**, sob a mesma raiz, e o contexto de a quem se respondeu é preservado pela menção `@username` no começo do texto, pré-preenchida pelo cliente (RF-SOC-14). É o modelo do Instagram e do YouTube, e a razão é direta: árvore profunda é ilegível em tela de celular.

Duas coisas que ela precisa resolver:

- **A menção pré-preenchida precisa ser óbvia e removível.** Ela aparece no campo antes de o leitor digitar, e ele pode apagar. O que o servidor usa para notificar é o comentário-alvo, não o texto: apagar a menção não quebra o destino, só tira o contexto de quem lê.
- **O texto é do usuário, e entra escapado.** Comentário não é Markdown, não é HTML, não vira link e não embute imagem (RNF-SEC-14). No Período 1 a menção também **não é navegável**: resolver `@username` em link é RF-SOC-15, Desejável, de F-SOCIAL-2.

**Escopo desta entrega.** Não há editar nem excluir comentário: RF-SOC-13 é Desejável e pertence a F-SOCIAL-2. Não há curtir comentário, não há denúncia, e não há menção digitada livremente que vire link.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, com o bottom sheet sobre o feed.
- **Linha 2:** estados web, viewport `1440 x 900`, com o dialog sobre o feed.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Comentários · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Atividade comentada**, resumida no topo:

| Campo | Valor |
|---|---|
| Autor | `Rafael Okamoto` |
| Verbo | `publicou uma resenha` |
| Livro | `Os Sertões`, de `Euclides da Cunha` |

**Comentários**, dois raízes e duas respostas sob o primeiro:

| Nível | Quem | Texto | Quando |
|---|---|---|---|
| raiz | Dandara Lopes `@dandaralp` | `Reli esse ano e travei na segunda parte. Você acha que vale insistir?` | `1 h` |
| resposta | Rafael Okamoto `@rafaokamoto` | `Vale. A terceira parte reorganiza tudo o que a segunda parece atrasar.` | `52 min` |
| resposta | Júlia Wenceslau `@juwences` | `@rafaokamoto foi exatamente o que aconteceu comigo, só que eu levei dois meses` | `35 min` |
| raiz | Nadia Sampaio `@nadiasampaio` | `A edição com notas ajuda muito em quem nunca leu Euclides.` | `20 min` |

**Contagem no cabeçalho:** `3 comentários`. A contagem soma raízes e respostas, porque é o mesmo número que aparece no botão do item do feed.

**Menção pré-preenchida** no artboard 4.3: `@juwences ` com um espaço ao fim, no campo de escrita.

**Paginação:** o servidor entrega 20 comentários-raiz por página; as respostas de uma raiz carregam por cursor, também com limite do servidor.

Todo número aparece com unidade.

---

## 4. Artboards mobile (390 x 844)

**O sheet abre sobre o feed**, que continua visível e escurecido atrás. Por isso, em todos os artboards mobile, desenhe o shell e o feed ao fundo, conforme o prompt de [`feed.md`](feed.md), com a camada de escurecimento por cima.

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


### O bottom sheet

- Fundo da tela escurecido por uma camada em `tinta` a 40% de opacidade. A barra inferior do shell fica **abaixo** dessa camada e não é acionável enquanto o sheet está aberto.
- Sheet ancorado no rodapé, largura total, altura de 88% da viewport, cantos superiores em `radius-xl`, fundo `papel-elevado`, `elev-3`.
- **Alça** no topo: retângulo de 36 por 4px, `radius-full`, `linha`, centralizado, com `space-3` acima e abaixo. Arrastar para baixo fecha.
- Entra de baixo para cima em `dur-base` com `ease-out`. Sob `prefers-reduced-motion`, aparece sem deslocamento.

### Cabeçalho do sheet

- Padding lateral `space-5`, `space-4` de padding vertical, divisor de 1px `linha` na base.
- À esquerda, título `Comentários` em `title` `tinta`, e abaixo, em `caption` `grafite`: `3 comentários`.
- À direita, `X` (Phosphor, `regular`, 24px, `tinta`), alvo de 48px, que fecha.
- Abaixo do divisor, **resumo da atividade** em uma linha, padding lateral `space-5`, `space-3` de padding vertical, fundo `papel`, com capa de 32 por 48px em canto vivo à esquerda, `space-3` de gap, e o texto em `caption` `grafite` em duas linhas: `Rafael Okamoto publicou uma resenha` e `Os Sertões, de Euclides da Cunha`.
- O resumo existe para que o leitor não perca o assunto ao rolar a conversa. Ele **não** é acionável: o caminho para o livro é o item do feed, atrás do sheet.

### Comentário-raiz

Padding lateral `space-5`, `space-4` de padding vertical, sem divisor entre comentários: o respiro basta.

- Avatar circular de 32px à esquerda, `space-3` de gap, alinhado ao topo do bloco.
- Primeira linha: nome em `body-strong` `tinta`, separador `·` com espaço simples e o tempo em `caption` `grafite-suave`.
- `space-1`, texto do comentário em `body` `tinta`, quebrando em quantas linhas precisar. **Texto puro:** sem negrito, sem itálico, sem link, sem citação, sem lista.
- `space-2`, botão textual `Responder` em `caption` peso 600 `grafite`, alvo de 48px.
- Quando há respostas, `space-3` abaixo, botão textual em `caption` peso 600 `musgo`, com um traço horizontal de 16px em `linha` à esquerda: `Ver 2 respostas`. Expandido, vira `Ocultar respostas`.

### Resposta

- Recuada em `space-10` a partir do padding lateral, o suficiente para o alinhamento ficar óbvio sem espremer o texto em 390px.
- Avatar circular de 28px, nome, tempo, texto e `Responder` no mesmo desenho do comentário-raiz, com o texto em `body` `tinta`.
- **A menção no início do texto é `body-strong` `tinta`, não `musgo`.** Ela marca a quem se responde, e não é link no Período 1: pintá-la com a cor de acento prometeria uma navegação que ainda não existe.
- **Nunca existe um terceiro nível de recuo.** Responder a uma resposta gera outra resposta no **mesmo** recuo, sob a mesma raiz.

### Campo de escrita

Fixo no rodapé do sheet, acima da área segura, com divisor de 1px `linha` no topo e fundo `papel-elevado`.

- Padding lateral `space-5`, `space-3` de padding vertical.
- Avatar do leitor, círculo de 32px, à esquerda, `space-3` de gap.
- Campo de altura mínima de 44px, `radius-full`, borda de 1px `linha`, fundo `papel`, padding lateral `space-4`, texto em `body` `tinta`, crescendo até quatro linhas antes de rolar internamente.
- Placeholder em `grafite-suave`: `Escreva um comentário`.
- À direita, `PaperPlaneRight` (Phosphor, `regular`, 24px), alvo de 48px: `grafite-suave` com o campo vazio, `musgo` com texto.

### 4.1 Padrão, com respostas recolhidas

Estado principal. Sheet aberto sobre o feed escurecido, cabeçalho, resumo da atividade, o comentário de `Dandara Lopes` com `Ver 2 respostas`, o comentário de `Nadia Sampaio` e o campo de escrita vazio no rodapé.

### 4.2 Respostas expandidas

O mesmo sheet com `Ocultar respostas` no lugar do botão, e as duas respostas visíveis no recuo único, incluindo a de `Júlia Wenceslau`, cujo texto começa com `@rafaokamoto`.

Este artboard é o que prova RN-10 no desenho: **as duas respostas estão no mesmo nível**, mesmo que a segunda responda à primeira.

### 4.3 Respondendo a uma resposta, com menção pré-preenchida

O caso de RF-SOC-14, e o artboard mais importante da tela.

- O leitor tocou em `Responder` na resposta de `Júlia Wenceslau`.
- Acima do campo de escrita entra uma **barra de contexto**, largura total, fundo `musgo-fundo`, padding `space-3 space-5`, com o texto em `caption` `musgo`: `Respondendo a Júlia` e, à direita, `X` (Phosphor, `regular`, 20px, `musgo`), alvo de 48px, que cancela a resposta e devolve o campo ao modo de comentário-raiz.
- O campo já contém `@juwences ` em `body` `tinta`, com um espaço ao fim, e o cursor logo depois. O teclado está aberto.
- O `PaperPlaneRight` está em `musgo`, porque o campo tem texto.
- A lista rola de modo que a resposta sendo respondida fique visível acima da barra de contexto.
- **A menção é texto comum e editável.** O leitor pode apagá-la, e o comentário continua sendo resposta à mesma raiz e notificando a mesma pessoa, porque quem determina isso é o comentário-alvo, no servidor.

### 4.4 Sem comentários

- Cabeçalho com `Comentários` e, abaixo, em `caption` `grafite`: `Nenhum comentário`.
- Resumo da atividade presente.
- Bloco centralizado no espaço da lista, `space-5` entre os elementos:
  - `ChatCircle` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Texto em `body` `grafite`, centralizado, largura máxima de 260px: `Seja o primeiro a comentar esta atividade.`
- **Sem botão no bloco:** o campo de escrita no rodapé já é a ação, e um botão que só move o foco para ele seria redundante.
- **Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.**

### 4.5 Enviando, com cold start

- O comentário digitado permanece no campo, com opacidade reduzida e sem foco possível.
- O `PaperPlaneRight` fica desabilitado, em `grafite-suave`.
- Acima do campo, no lugar da barra de contexto, uma linha em `caption` `grafite`, padding `space-2 space-5`: `Enviando. O servidor está iniciando e isso pode levar alguns segundos.`
- **Sem spinner, sem barra indeterminada.**
- **Sem comentário otimista na lista.** O comentário só aparece depois que o servidor confirma: mostrar antes e remover depois de uma falha é pior do que esperar.

### 4.6 Limite de comentários

O rate limiting de RNF-SEC-18 respondeu. Isto é **alerta**, não erro de conteúdo.

- Banner acima do campo de escrita, largura total, fundo `ambar-fundo`, padding `space-3 space-5`, com `Warning` (Phosphor, `regular`, 20px, `ambar`) à esquerda, `space-3` de gap, e o texto em `body` `tinta`: `Muitos comentários seguidos. Espere alguns minutos para comentar de novo.`
- O texto digitado **permanece no campo**, e o campo fica desabilitado com opacidade reduzida.
- **Sem contagem regressiva animada.**

### 4.7 Carregando

- Sheet aberto, cabeçalho e resumo da atividade reais, com a contagem ainda oculta.
- Lista substituída por **skeleton estático**: três blocos, cada um com círculo de 32px e três barras em `capa-placeholder` com `radius-sm`, alturas de 15px, 15px e 15px, larguras de 35%, 90% e 60%.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Campo de escrita presente e já utilizável: dá para comentar antes de a lista chegar.

### 4.8 Erro ao carregar

- Cabeçalho e resumo reais.
- Banner inline no lugar da lista, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar os comentários. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o bottom sheet, no desktop usa o dialog abaixo, conforme design §5.4. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- O feed continua ao fundo, com a sidebar do shell à esquerda e o item comentado visível, tudo sob uma camada de escurecimento em `tinta` a 40%.
- **Dialog centrado** na viewport, largura de 640px, altura máxima de 80% da viewport, `radius-lg`, fundo `papel-elevado`, `elev-3`. Entra com fade em `dur-fast` e 8px de deslocamento vertical.
- Cabeçalho, resumo da atividade, lista e campo de escrita na mesma ordem do mobile. O cabeçalho ganha padding lateral `space-6`.
- A lista rola **dentro** do dialog, com o cabeçalho e o campo de escrita fixos.
- O recuo da resposta passa a `space-12`, e o avatar da resposta a 32px: na largura maior, o recuo maior continua legível.
- `hover` no botão `Responder` com sublinhado; `hover` no `PaperPlaneRight` levando `musgo` para `musgo-vivo`. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** o dialog vira o bottom sheet do mobile, ancorado no rodapé e ocupando 88% da altura.

### 5.1 Padrão, com respostas expandidas

Dialog sobre o feed escurecido, com os dois comentários-raiz, as duas respostas no recuo único e o campo de escrita vazio.

### 5.2 Respondendo a uma resposta, com menção pré-preenchida

Barra de contexto em `musgo-fundo` com `Respondendo a Júlia`, campo com `@juwences ` e o cursor depois do espaço, `PaperPlaneRight` em `musgo`.

### 5.3 Sem comentários

Dialog com o bloco de vazio centralizado e o campo de escrita ativo no rodapé.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem, e isso inclui o que está atrás do sheet.

- **Mobile, padrão.** Feed ao fundo em `noite`, camada de escurecimento em `noite` a 60%. Sheet em `noite-elevada`, **mais claro** que o fundo, com alça em `linha-noite`. Título em `papel-suave`, contagem e resumo em `grafite-claro`. Nome do comentarista em `papel-suave`, tempo em `grafite-fundo-escuro`, texto em `papel-suave`. `Responder` em `grafite-claro`, `Ver 2 respostas` em `musgo-claro`. Campo de escrita com fundo `noite`, borda `linha-noite`, placeholder em `grafite-fundo-escuro`, `PaperPlaneRight` em `musgo-claro` quando há texto.
- **Mobile, respondendo com menção.** Barra de contexto com fundo `musgo-fundo-escuro`, texto e `X` em `musgo-claro`. Menção no texto da resposta em `body-strong` `papel-suave`.
- **Web, padrão.** Dialog em `noite-elevada` sobre o feed em `noite`, com a sidebar em `noite-elevada` ao fundo e a camada de escurecimento por cima de tudo.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Bottom sheet no mobile e dialog centrado na web | documento-de-design §5.4 |
| Campo de formulário, foco e erro | documento-de-design §4.2 |
| Botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` e alerta em `ambar-fundo` | documento-de-design §3.1.3 |
| Capa de livro em retângulo de canto vivo | documento-de-design §4.5 e §7.6 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação e item de feed ao fundo | periodo-0/P0-NAV/shell-de-navegacao.md e periodo-1/F-FEED/feed.md |

**Componentes que ainda não existem na fonte.** Quatro elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **A lista de comentários com um único nível de recuo**, com `space-10` no mobile e `space-12` na web.
2. **O botão de expandir respostas**, com traço à esquerda e alternância entre `Ver 2 respostas` e `Ocultar respostas`.
3. **A barra de contexto de resposta**, em `musgo-fundo`, com o nome de quem se responde e o `X` de cancelar.
4. **O campo de escrita ancorado**, com avatar, campo `radius-full` e botão de envio.

**Decisão registrada:** a menção é `body-strong` `tinta`, e não `musgo`, porque no Período 1 ela **não é navegável**. Quando RF-SOC-15 entrar, em F-SOCIAL-2, a menção vira link e passa a usar o acento, e o prompt de edição daquela feature muda esta regra.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do sheet | `Comentários` |
| Contagem | `3 comentários` |
| Contagem sem comentários | `Nenhum comentário` |
| Resumo da atividade, linha 1 | `Rafael Okamoto publicou uma resenha` |
| Resumo da atividade, linha 2 | `Os Sertões, de Euclides da Cunha` |
| Comentário 1 | `Reli esse ano e travei na segunda parte. Você acha que vale insistir?` |
| Resposta 1 | `Vale. A terceira parte reorganiza tudo o que a segunda parece atrasar.` |
| Resposta 2 | `@rafaokamoto foi exatamente o que aconteceu comigo, só que eu levei dois meses` |
| Comentário 2 | `A edição com notas ajuda muito em quem nunca leu Euclides.` |
| Ação em cada comentário | `Responder` |
| Expandir respostas | `Ver 2 respostas` |
| Recolher respostas | `Ocultar respostas` |
| Placeholder do campo | `Escreva um comentário` |
| Barra de contexto | `Respondendo a Júlia` |
| Menção pré-preenchida | `@juwences ` |
| Vazio, texto | `Seja o primeiro a comentar esta atividade.` |
| Enviando, com cold start | `Enviando. O servidor está iniciando e isso pode levar alguns segundos.` |
| Alerta de limite | `Muitos comentários seguidos. Espere alguns minutos para comentar de novo.` |
| Erro ao carregar | `Não foi possível carregar os comentários. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |

A barra de contexto usa o **primeiro nome**; a menção no campo usa o **nome de usuário**, porque é ela que vai para o texto.

Zero em-dash em toda a copy. Zero emoji **na interface**. Emoji dentro do texto de um comentário é conteúdo do usuário e é aceitável; nenhum dos comentários de exemplo usa.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no mobile no `X` do cabeçalho, em `Responder`, em `Ver 2 respostas`, no `X` da barra de contexto e no botão de envio.
- O sheet e o dialog capturam o foco, fecham com `Esc` e devolvem o foco ao botão de comentar do item do feed que os abriu.
- Ao abrir em modo de resposta, o foco vai para o campo, com o cursor **depois** da menção, e a barra de contexto é anunciada antes.
- Cada comentário é anunciado como unidade: `Dandara Lopes, há 1 hora` seguido do texto.
- A relação de resposta não depende só do recuo visual: cada resposta é anunciada como resposta ao comentário de quem a originou, e a menção está no texto.
- `Ver 2 respostas` anuncia o estado expandido ou recolhido, e expandir não move o scroll para longe do comentário.
- O botão de envio é anunciado como desabilitado enquanto o campo está vazio.
- O alerta de limite carrega **ícone e texto**, não só cor, e é anunciado quando aparece.
- Contraste WCAG AA no corpo nos dois temas. O texto do comentário usa `tinta`; só o tempo usa `grafite-suave`.
- Foco de teclado visível na web em todos os controles, na ordem visual: fechar, lista, responder, campo, enviar.
- `prefers-reduced-motion` respeitado: a entrada do sheet e do dialog, o fade do skeleton e o hover viram estáticos.
- Nenhuma ação desta tela é destrutiva no Período 1, porque não há exclusão de comentário.

---

## 10. O que não fazer nesta tela

**RN-10, a regra dura desta tela**

- **Não desenhe um terceiro nível de recuo.** Resposta de resposta é irmã, no mesmo recuo, sob a mesma raiz.
- **Não desenhe linha de árvore, fio de conexão nem indentação progressiva** que sugira hierarquia além de um nível.
- **Não esconda a menção** quando ela for o começo do texto: ela é o que preserva o contexto.
- **Não torne a menção um link** nem a pinte com o acento. RF-SOC-15 é do Período 2.
- **Não impeça o leitor de apagar a menção** pré-preenchida.

**Segurança e conteúdo**

- **Não renderize Markdown, HTML ou BBCode** no comentário. Texto puro, escapado.
- **Não transforme URL em link clicável** dentro do comentário.
- **Não embuta imagem, GIF, vídeo, áudio nem prévia de link.**
- **Não desenhe seletor de emoji** na interface do campo. Emoji do teclado do sistema é conteúdo do usuário e basta.
- **Não desenhe comentário otimista** na lista antes da confirmação do servidor.

**Escopo do Período 1**

- **Não desenhe editar nem excluir comentário.** RF-SOC-13 é Desejável, de F-SOCIAL-2.
- **Não desenhe curtir comentário.** Não existe requisito.
- **Não desenhe denunciar comentário.** RF-MOD-01 é Desejável e do Período 2.
- **Não desenhe autocompletar de `@`** enquanto o leitor digita: sugerir nomes é enumerar pessoas, e RNF-SEC-44 fecha essa porta. A única menção que o cliente escreve é a que ele pré-preenche ao responder.
- **Não desenhe fixar comentário, destacar comentário do autor nem ordenação por curtidas.** A ordem é cronológica.

**Específico do sheet**

- **Não desenhe o sheet em tela cheia sem alça e sem `X`.** O leitor precisa de duas saídas óbvias.
- **Não torne o resumo da atividade acionável** dentro do sheet: o caminho para o livro é o item do feed.
- **Não recarregue a lista inteira** ao expandir respostas ou ao carregar a próxima página.
- **Não use toast** para confirmar o envio: o comentário aparecendo na lista é a confirmação.

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


**Formulário**

- Nada de placeholder no lugar de label, com a exceção declarada do campo de escrita, que é ancorado e não tem espaço para label acima.
- Nada de helper que só aparece depois do erro.
- Nada de validação que só existe no cliente: a mensagem reflete a regra que o servidor aplica.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é uma camada sobre o feed.
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
