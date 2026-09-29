# F-AVA · Escrever resenha

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-AVA.md
**Requisitos:** RF-AVA-02 (escrever uma resenha por livro, editável a qualquer momento), RF-AVA-03 (marcar a resenha como contendo spoiler; resenhas assim marcadas são exibidas ocultas, exigindo ação para revelar), RF-AVA-04 (excluir a resenha)
**Não funcionais:** RNF-SEC-02 (propriedade validada no servidor), RNF-SEC-13 (validação por esquema: limite de caracteres), RNF-SEC-14 (conteúdo do usuário tratado como texto, com escape na renderização), RNF-USA-04 (confirmação na exclusão), RNF-ERR-04, RNF-USA-03, RNF-USA-05
**Regras de negócio:** RN-07 (uma resenha por usuário por livro, editável, **texto cru limitado a 5.000 caracteres**, sem exigir leitura concluída), RN-04.5 (a resenha é do livro, sobrevive ao abandono e não duplica por releitura), RN-03 (em livro pessoal, só o dono escreve)
**Versão web:** sim. RF-AVA-02, RF-AVA-03 e RF-AVA-04 têm marcação na coluna Web de `REQUISITOS.md` §5.5.

---

## 1. Contexto

A tela de escrever. É o conteúdo mais longo que o leitor produz no produto e o que alimenta a página do livro, o perfil e o feed.

Ela ocupa o viewport inteiro em vez de ser um sheet, porque escrever cinco mil caracteres num painel de metade da tela com o teclado aberto é desconfortável. É a única tela de conteúdo escrito do Período 1.

Três coisas que definem o desenho:

- **Texto puro, no Período 1.** Markdown é RF-AVA-09, do Período 2. Nada de barra de formatação, nada de negrito, nada de pré-visualização de Markdown, nada de aba de preview.
- **O limite de 5.000 caracteres é regra de negócio (RN-07)**, então o contador é permanente e não aparece só perto do fim.
- **O spoiler é reversível e é decisão do autor.** Ele não muda o texto: muda como quem lê o encontra.

Ela sustenta o mecanismo de **pertencimento**: escrever é o que faz o leitor aparecer para quem o segue.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Escrever resenha · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.

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

**Livro dos artboards:** `Torto Arado`, de Itamar Vieira Junior, Todavia, `264 páginas`. Nota do leitor: `4,5`.

**Texto da resenha em edição** (texto puro, sem nenhuma marcação):

`A força do livro está na troca de narradora no meio da história. Bibiana conta a primeira parte, Belonísia a segunda, e a terceira vem de um lugar que eu não esperava. A disputa pela terra em Água Negra podia render só denúncia, e rende, mas rende também uma história de duas irmãs que se entendem sem falar. Levei três dias e terminei querendo recomeçar.`

Contagem: `412 de 5.000 caracteres`.

**Texto do artboard perto do limite:** `4.847 de 5.000 caracteres`.

**Texto do artboard acima do limite:** `5.126 de 5.000 caracteres`, com o excedente de `126 caracteres`.

**Estado de spoiler:** desligado no artboard padrão, ligado no artboard de spoiler.

**Data da resenha existente, no artboard de edição:** publicada em `22 de agosto de 2026`.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell. **Com uma exceção declarada:** a barra inferior de navegação **não aparece** enquanto o editor está aberto, porque a tela é um fluxo com salvamento e a saída é pelo botão de fechar. O header próprio da tela substitui o header padrão.

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

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, divisor de 1px `linha` na base sempre visível, porque o corpo é uma área de digitação que rola.
- `X` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, fechando o editor.
- Título `Resenha` em `title` `tinta`, centralizado. Aqui o título é `title` e não `display`, porque divide a linha com duas ações.
- Botão textual `musgo` à direita, em `body-strong`: `Publicar`. Desabilitado em `grafite-suave` enquanto o texto está vazio ou acima do limite.
- **Sem sino nesta tela.** O leitor está escrevendo; a notificação espera.

### Cabeçalho do livro

- Card compacto com padding lateral `space-5` e `space-4` de padding vertical: capa de 60 por 90px em canto vivo à esquerda, `space-4` de gap, título em `title-sm` `tinta`, autor em `caption` `grafite`.
- Abaixo do autor, a nota do leitor em estrelas de tamanho `sm` de 16px conforme design §4.3, com o valor ao lado em `num-inline` `caption` `tinta`: `4,5`. Se não houver nota, a linha traz `Sem nota` em `caption` `grafite-suave` e um botão textual `musgo`: `Dar nota`.
- Divisor de 1px `linha` abaixo.

### Área de texto

- Ocupa todo o espaço entre o cabeçalho e a barra de rodapé.
- Padding lateral `space-5`, `space-5` de padding superior.
- **Texto digitado em `body-lg` Newsreader 400**, cor `tinta`. Este é um dos três únicos lugares do produto em que a serifa aparece, e ele existe para que o autor escreva vendo o texto como quem lê vai ver.
- Sem borda, sem fundo próprio, sem `radius`: a área de texto é o corpo da tela, e não um campo dentro dela. Esta é a exceção declarada desta tela ao input de design §4.2, cujo campo com borda e fundo `papel-elevado` serve a entradas curtas.
- Placeholder em `grafite-suave`, em Newsreader: `Escreva sobre o livro. O que ficou, o que incomodou, para quem você indicaria.` O placeholder aqui não substitui label: o título da tela e o cabeçalho do livro já dizem o que se escreve.
- Cursor em `musgo`.

### Barra de rodapé do editor

Fixa acima do teclado, largura total, fundo `papel-elevado`, divisor de 1px `linha` no topo, altura de 56px mais a área segura, padding lateral `space-5`.

- **À esquerda, o toggle de spoiler:** `EyeSlash` (Phosphor, `regular`, 20px) seguido do rótulo `Contém spoiler` em `caption`, dentro de uma área acionável de 48px de altura.
  - Desligado: ícone e rótulo em `grafite`, sem fundo.
  - Ligado: fundo `ambar-fundo`, `radius-full`, padding `space-1 space-3`, ícone e rótulo em `ambar`, rótulo em peso 600.
- **À direita, o contador** em `num-inline` `caption` `grafite`: `412 de 5.000 caracteres`. Ele é **permanente**, e não aparece só quando o texto se aproxima do limite.

### 4.1 Padrão, escrevendo

Header com `Publicar` ativo, cabeçalho do livro com a nota `4,5`, texto em Newsreader ocupando o corpo, barra de rodapé com o toggle desligado e o contador em `412 de 5.000 caracteres`. Cursor visível no fim do texto.

### 4.2 Vazio, primeiro acesso

- Área de texto com o placeholder em `grafite-suave` e o cursor no início.
- Contador em `0 de 5.000 caracteres`.
- Botão `Publicar` **desabilitado**, em `grafite-suave`.
- Toggle de spoiler presente e acionável: o autor pode marcar antes de escrever.

### 4.3 Spoiler ligado

- Toggle em `ambar-fundo` com ícone e rótulo em `ambar`.
- Abaixo da barra de rodapé, ou acima dela quando o teclado está fechado, uma linha de aviso em `caption` `ambar` com padding lateral `space-5`: `Sua resenha será exibida oculta. Quem quiser ler precisa tocar para revelar.`
- **O texto não muda de aparência.** Nada de fundo tingido na área de digitação, nada de borrão no editor: o autor continua vendo o que escreve.

### 4.4 Perto do limite

- Contador em `4.847 de 5.000 caracteres`, ainda em `grafite`.
- A partir de 4.750 o contador passa a `ambar`, sem outra mudança na tela.
- Botão `Publicar` ativo: ainda está dentro do limite.

### 4.5 Acima do limite

- Contador em `5.126 de 5.000 caracteres`, em `rubi`.
- Abaixo da barra de rodapé, mensagem em `caption` `rubi` com padding lateral `space-5`: `Sua resenha passou do limite em 126 caracteres. Corte um trecho para publicar.`
- Botão `Publicar` **desabilitado**, em `grafite-suave`.
- **O texto excedente não é cortado nem bloqueado na digitação.** O autor continua escrevendo e decide o que tirar. Cortar por ele seria perder texto sem aviso.

### 4.6 Editando resenha existente

- Área de texto preenchida com a resenha já publicada.
- Abaixo do cabeçalho do livro, em `caption` `grafite-suave` com padding lateral `space-5`: `Publicada em 22 de agosto de 2026`.
- Botão do header passa de `Publicar` para `Salvar`.
- Na barra de rodapé, à direita do contador, `Trash` (Phosphor, `regular`, 20px, `rubi`) com alvo de 48px, abrindo a confirmação de exclusão.
- Editar **não** gera nova atividade no feed: a atividade nasce na primeira publicação. A tela não promete nem sugere o contrário.

### 4.7 Confirmação de exclusão

Ação destrutiva. Conforme RNF-USA-04, confirmação em modal.

- Scrim `rgba(23,21,18,0.32)`, tingido no hue de `tinta`.
- Dialog centrado, largura de 320px, fundo `papel-elevado`, `radius-lg` 20, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Excluir sua resenha?`
- Texto em `body` `grafite`: `O texto será apagado e sai da página do livro e do seu perfil. Sua nota continua registrada.`
- `space-6` abaixo, dois botões empilhados de largura total:
  - **Botão destrutivo em outline**, `radius` 12, altura 48px, fundo transparente, borda de 1px `rubi`, texto `rubi`: `Excluir resenha`. Nunca preenchido.
  - Botão textual `grafite`: `Cancelar`.

### 4.8 Publicando e erro

**Publicando:** área de texto em somente leitura, botão do header com o rótulo `Publicando` em `grafite-suave`, toggle e contador visíveis. Sem spinner.

**Erro:** banner inline acima da barra de rodapé, fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda, texto em `body` `tinta`: `Não foi possível publicar sua resenha. O texto continua aqui. Tente de novo.` A segunda frase é o que importa: o autor precisa saber que não perdeu o que escreveu.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Estante** ativo. Diferente do mobile, a navegação **continua visível** na web: não há teclado ocupando metade da tela e esconder a sidebar não ganharia nada.
- Área de conteúdo com padding lateral `space-8`.
- Header de conteúdo de 72px com `Resenha` em `display` `tinta` à esquerda, e à direita `Cancelar` textual seguido de `Publicar` primário pill de 40px.
- **Duas colunas:**
  - **Coluna da esquerda, 280px, fixa ao rolar:** capa de 240 por 360px, título, autor, as estrelas com o valor, e a data de publicação quando existir.
  - **Coluna da direita:** a área de texto, com `max-width` de 68ch para que a linha não fique longa demais para escrever nem para ler. Este é o principal ganho da web sobre o mobile.
- **Barra de rodapé do editor fixa no rodapé da área de conteúdo**, não da viewport: ela acompanha a coluna da direita, com o toggle à esquerda e o contador à direita.
- `hover` no toggle: fundo `linha` quando desligado, `ambar-fundo` mais escuro quando ligado. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- `Esc` pede confirmação de descarte quando há texto não salvo. **Fechar nunca descarta em silêncio.**
- **Abaixo de 768px** as duas colunas viram uma, o cabeçalho do livro vira o card horizontal do mobile, e a sidebar dá lugar ao header com `X` e `Publicar`.

### 5.1 Padrão, escrevendo

Duas colunas, texto em Newsreader com `max-width` de 68ch, barra de rodapé com toggle desligado e `412 de 5.000 caracteres`.

### 5.2 Spoiler ligado, com toggle em hover

Toggle em `ambar-fundo` com o cursor sobre ele, linha de aviso em `ambar` abaixo da barra, e o texto na área de digitação sem nenhuma alteração de aparência.

### 5.3 Acima do limite

Contador em `rubi` com `5.126 de 5.000 caracteres`, mensagem em `caption` `rubi` abaixo da barra, botão `Publicar` desabilitado em `grafite-suave` com fundo `linha`.

### 5.4 Editando, com confirmação de exclusão

Dialog centrado de 400px sobre o scrim, com a copy de 4.7 e os dois botões **lado a lado à direita**: `Cancelar` textual e `Excluir resenha` em outline `rubi`. Atrás, as duas colunas do editor com a resenha existente.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, escrevendo.** Fundo `noite`. Título do header em `papel-suave`, `X` em `papel-suave`, `Publicar` em `musgo-claro`. Cabeçalho do livro com título em `papel-suave` e autor em `grafite-claro`. Texto em Newsreader `papel-suave` sobre `noite`. Placeholder em `grafite-fundo-escuro`. Cursor em `musgo-claro`. Barra de rodapé em `noite-elevada`, **mais clara** que o fundo, com divisor `linha-noite`. Toggle desligado em `grafite-claro`; ligado com fundo `ambar-fundo-escuro` e ícone e rótulo em `ambar-claro`. Contador em `grafite-claro`. Estrelas em `musgo-claro`.
- **Mobile, acima do limite.** Contador em `rubi-claro`, mensagem em `caption` `rubi-claro`, botão `Publicar` desabilitado em `grafite-fundo-escuro`.
- **Web, confirmação de exclusão.** Dialog em `noite-elevada` sobre contexto em `noite`, com a sidebar em `noite-elevada` atrás do scrim. Botão destrutivo com borda de 1px `rubi-claro` e texto `rubi-claro`, fundo transparente.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Serifa Newsreader no corpo da resenha | documento-de-design §3.2.2 |
| Estrela de avaliação, variante de exibição, tamanho `sm` 16px | documento-de-design §4.3 |
| Card compacto do livro com capa de 60 por 90px | documento-de-design §5.4 |
| Botão primário pill, textual e destrutivo em outline | documento-de-design §4.1 |
| Input com label, helper e erro, e a exceção declarada da área de texto longa | documento-de-design §4.2 |
| Confirmação de ação destrutiva em modal, com botão em outline `rubi` | documento-de-design §7.8 e RNF-USA-04 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell de navegação e sidebar da web | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que ainda não existem na fonte.** Três nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **A área de texto longa sem borda**, com o texto em Newsreader ocupando o corpo da tela. O §4.2 só define o campo curto com borda e fundo `papel-elevado`.
2. **O toggle de spoiler**, com estado desligado neutro e ligado em `ambar-fundo`. O §4.6 define pill de status de estante, que é outro componente com outro propósito.
3. **O contador de caracteres permanente**, com as três faixas de cor: `grafite`, `ambar` a partir de 4.750 e `rubi` acima de 5.000.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Resenha` |
| Ação, resenha nova | `Publicar` |
| Ação, resenha existente | `Salvar` |
| Ação em salvamento | `Publicando` |
| Placeholder | `Escreva sobre o livro. O que ficou, o que incomodou, para quem você indicaria.` |
| Sem nota, rótulo | `Sem nota` |
| Sem nota, ação | `Dar nota` |
| Toggle | `Contém spoiler` |
| Aviso de spoiler | `Sua resenha será exibida oculta. Quem quiser ler precisa tocar para revelar.` |
| Contador | `412 de 5.000 caracteres` |
| Contador perto do limite | `4.847 de 5.000 caracteres` |
| Contador acima do limite | `5.126 de 5.000 caracteres` |
| Erro de limite | `Sua resenha passou do limite em 126 caracteres. Corte um trecho para publicar.` |
| Data de publicação | `Publicada em 22 de agosto de 2026` |
| Confirmação, título | `Excluir sua resenha?` |
| Confirmação, texto | `O texto será apagado e sai da página do livro e do seu perfil. Sua nota continua registrada.` |
| Confirmação, botão destrutivo | `Excluir resenha` |
| Cancelar | `Cancelar` |
| Erro de publicação | `Não foi possível publicar sua resenha. O texto continua aqui. Tente de novo.` |

Zero em-dash em toda a copy, inclusive no texto de exemplo da resenha. Zero emoji na interface: o emoji só existe como conteúdo digitado pelo usuário dentro do próprio texto da resenha, e nenhum artboard precisa demonstrar isso. Todo número traz a unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no `X`, no botão `Publicar`, no toggle de spoiler e no ícone de excluir.
- O estado do spoiler é comunicado **sem depender de cor**: além de `ambar-fundo`, o toggle muda o peso do rótulo para 600 e a linha de aviso aparece em texto.
- O contador é lido por leitor de tela quando cruza as faixas de aviso e de erro, não a cada caractere digitado.
- A mensagem de limite excedido cita o número exato de caracteres a cortar, e não uma frase abstrata sobre o limite.
- O texto nunca é truncado nem bloqueado na digitação. Perder texto do autor sem aviso é pior que impedir a publicação.
- Contraste WCAG AA no corpo nos dois temas. O corpo da resenha usa `tinta` sobre `papel`, não `grafite`, porque é texto longo de leitura.
- Fechar com texto não salvo pede confirmação, na web pelo `Esc` e no mobile pelo `X`. **Nada é descartado em silêncio.**
- Excluir a resenha passa por confirmação em modal (RNF-USA-04), e a confirmação esclarece que a nota não é afetada.
- Na web, o foco fica preso dentro do dialog de confirmação, é devolvido ao editor ao fechar, e `Esc` fecha. A área de texto é alcançável por teclado e o toggle é acionável por espaço.
- `prefers-reduced-motion` respeitado: a transição do toggle e a mudança de cor do contador viram estáticas.
- A tela respeita o escalonamento de texto do sistema: com fonte aumentada, a área de texto reduz e a barra de rodapé continua acessível, sem cortar o contador.

---

## 10. O que não fazer nesta tela

**Escopo do Período 1**

- **Não desenhe barra de formatação.** Nada de negrito, itálico, lista, citação, link nem ícones de formatação. Markdown é RF-AVA-09, do Período 2.
- **Não desenhe aba ou botão de pré-visualização.** A pré-visualização faz parte de RF-AVA-09.
- **Não desenhe curtida ou descurtida da resenha, nem contadores de reação.** RF-AVA-05 e RF-AVA-08 são do Período 2.
- **Não desenhe cadastro de frases ou trechos** com página de referência. RF-AVA-06 e RF-AVA-07 são do Período 2.
- Não desenhe comentários na resenha. Resenha não recebe comentário em nenhum período, apenas reação, e a reação é do Período 2.

**Específico do editor**

- **Não corte o texto no limite de 5.000 caracteres.** O autor continua escrevendo e decide o que tirar; só a publicação é bloqueada.
- **Não esconda o contador até o texto se aproximar do limite.** O limite é regra de negócio, e o contador é permanente.
- **Não mude a aparência do texto quando o spoiler está ligado.** Nada de fundo tingido, nada de borrão no editor. O spoiler muda como o texto é exibido para quem lê, não para quem escreve.
- **Não exija leitura concluída para escrever.** RN-07 é explícito: a resenha não depende de leitura concluída.
- **Não exija nota para publicar a resenha**, nem resenha para dar nota. As duas são independentes.
- Não gere nova atividade no feed ao editar. A atividade nasce na primeira publicação.
- Não descarte texto sem confirmação ao fechar.
- Não desenhe botão destrutivo preenchido. Excluir é outline `rubi` na confirmação.
- Não desenhe salvamento automático de rascunho com aviso do tipo `salvo há 3 segundos`. Não existe rascunho no Período 1: a resenha é publicada ou não é.
- Não desenhe spinner ao publicar. O rótulo do botão muda e ele fica desabilitado.

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
