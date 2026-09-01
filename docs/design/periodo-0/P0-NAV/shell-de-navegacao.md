# P0-NAV · Shell de navegação

**Feature:** ../../../plano-de-desenvolvimento/periodo-0/feature-P0-NAV.md
**Requisitos:** RF-AUT-03 (sessão persistente no cliente). A navegação entre as telas principais e a guarda de rota vêm da Especificação de `feature-P0-NAV.md`, blocos `### Frontend Web` e `### App Flutter`.
**Não funcionais:** RNF-USA-01 (interfaces consistentes entre plataformas), RNF-USA-02 (interface responsiva na web), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** nenhuma RN se aplica diretamente ao shell
**Versão web:** sim, com desenho próprio de web

---

## 1. Contexto

Este não é o desenho de uma tela: é o desenho do **quadro** em que toda tela autenticada do produto vive. Barra inferior no mobile, barra lateral na web, e o padrão de header que as telas herdam.

O `documento-de-design.md` define os headers de tela por tela (§5.1 estante com busca à direita, §5.3 feed com sino e perfil à direita) mas **nunca define a barra de navegação**. Este protótipo preenche essa lacuna, e o que for aprovado aqui passa a valer para todas as telas dos períodos seguintes: estante, página do livro, feed, perfil, notificações, estatísticas e o resto.

Duas coisas que ele resolve:

- **Onde o usuário troca de área** do produto, sem inventar uma navegação diferente por tela.
- **O que aparece antes de saber se há sessão.** A guarda de rota precisa de um estado visual enquanto decide entre abrir o shell autenticado e mandar para o login.

**Escopo desta entrega.** No período 0 as áreas de destino são placeholders: estante, descobrir, feed e perfil ainda não existem como telas reais. O conteúdo desenhado dentro do shell nestes artboards serve só para dar contexto ao quadro, e pertence a F-EST, F-ACV-BUSCA, F-FEED e F-PERFIL no período 1.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`, mais um artboard de `768 x 900` no fim da linha, mostrando o ponto de virada do layout.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Shell de navegação · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

O shell carrega pouca informação própria:

| Elemento | Conteúdo |
|---|---|
| Itens de navegação | `Estante`, `Descobrir`, `Feed`, `Perfil` |
| Título da tela ativa no header | `Minha estante` no artboard de estante, `Feed` no artboard de feed |
| Contador de não lidas no sino | `3` |
| Wordmark na sidebar web | `Lê Ai` |

O conteúdo dentro do quadro é genérico e existe só para dar escala: uma grade de capas usando `capa-placeholder` com títulos plausíveis (`A Hora da Estrela`, `Torto Arado`, `O Avesso da Pele`, `Ponciá Vicêncio`, `Cidade de Deus`, `Quarto de Despejo`) na estante, e dois itens de feed com avatar, nome e verbo no feed. Não desenhe esse conteúdo com fidelidade: ele não é o assunto deste prompt.

---

## 4. Artboards mobile (390 x 844)

### Barra inferior

Fixa no rodapé da viewport, acima da área segura do sistema.

- Altura de 64px mais a área segura. Fundo `papel-elevado`, com um divisor de 1px `linha` no topo. Sem sombra: a hierarquia vem da superfície e do divisor.
- **Quatro itens** de largura igual: `Estante`, `Descobrir`, `Feed`, `Perfil`.
- Cada item empilha ícone de 24px acima e rótulo em `caption` abaixo, com `space-1` de gap, tudo centralizado. A área tocável de cada item tem no mínimo 48px de altura.
- Ícones Phosphor: `Books` para Estante, `Compass` para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. `Compass` e não `MagnifyingGlass`: os outros três rótulos pareiam com ícone-substantivo, e a tela de Descobrir já traz uma `MagnifyingGlass` dentro do campo de busca. Repetir o glifo na mesma tela é ruído.
- **Inativo:** ícone no peso `regular`, cor `grafite`; rótulo em `caption` `grafite`.
- **Ativo:** ícone no peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`.
- A troca de item muda cor e peso do ícone em `dur-instant`. **Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone que salta.**

### Padrão de header

Vale para toda tela autenticada, e é o que as telas dos períodos seguintes herdam.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`. Sem sombra. Um divisor de 1px `linha` aparece na base do header apenas quando o conteúdo rola por baixo dele.
- **À esquerda:** o título da tela em `display`, cor `tinta`, alinhado à base.
- **À direita, na mesma linha:** as ações contextuais daquela tela, seguidas do sino. Ícones de 24px, peso `regular`, cor `tinta`, com `space-4` de gap entre eles.
  - Na estante, a ação contextual é `MagnifyingGlass`, conforme documento-de-design §5.1. Ela **filtra a própria estante**, não o acervo: a busca do acervo mora na aba `Descobrir`. Ver a pendência da seção 7.
  - O sino é `Bell`, e ele é fixo: aparece no header de toda tela autenticada.
- **Badge do sino:** círculo de 18px de diâmetro, fundo `musgo`, encostado no canto superior direito do ícone, com o número centralizado em 11px peso 600, cor `papel`. Acima de nove, mostra `9+`. **Quando não há não lidas, o badge simplesmente não existe:** nada de círculo vazio, nada de contorno.

### 4.1 Estante ativa

O shell em uso. Header com o título `Minha estante` e, à direita, `MagnifyingGlass` e `Bell` sem badge. Corpo com a grade de capas genérica em duas colunas, padding lateral `space-5`, gap `space-4`, capas em retângulo de canto vivo com `capa-placeholder` e o título centralizado em `title-sm` `tinta`. Barra inferior com **Estante** ativo.

### 4.2 Feed ativo

Header com o título `Feed` e, à direita, apenas `Bell`. Corpo com dois itens de feed genéricos separados por divisor `linha`. Barra inferior com **Feed** ativo.

### 4.3 Header com não lidas

Mesmo enquadramento de 4.1, com o badge do sino mostrando `3`. Serve para conferir o badge contra o ícone em tamanho real.

### 4.4 Verificando sessão

O que a guarda de rota mostra antes de decidir entre shell autenticado e login.

- Fundo `papel`, tela inteira. Sem barra inferior e sem header: ainda não se sabe em que área o usuário está.
- Wordmark **Lê Ai** em Space Grotesk 600, token `title`, cor `grafite`, centralizado na tela.
- **Nada mais.** Sem spinner, sem barra de progresso, sem ponto pulsando, sem skeleton de conteúdo que ainda não se sabe qual é.
- Sem sessão, a tela seguinte é o login. Com sessão, é o shell na última área visitada.

---

## 5. Artboards web (1440 x 900)

### Sidebar

Coluna fixa à esquerda, altura total da viewport, **expandida por padrão**.

- **Expandida:** 248px de largura. Fundo `papel-elevado`, borda direita de 1px `linha`.
- **Retraída:** 72px de largura, só os ícones.
- **Bloco do topo**, 72px de altura, alinhado com o header do conteúdo, padding lateral `space-5`:
  - Expandida: wordmark **Lê Ai** em Space Grotesk 600, token `title`, cor `tinta`, à esquerda; `SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita, que retrai.
  - Retraída: apenas o `SidebarSimple` centralizado, que expande. **Não substitua o wordmark por uma inicial, um monograma ou um símbolo.**
- `space-4` abaixo do bloco do topo.
- **Itens**, empilhados com `space-1` de gap, dentro de padding lateral `space-3`:
  - Expandida: altura de 44px, `radius` 12, padding lateral `space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em `body-strong`.
  - Retraída: 44 por 44px, `radius` 12, ícone de 20px centralizado, sem rótulo.
  - **Inativo:** ícone `regular` `grafite`, rótulo `grafite`, fundo transparente.
  - **Hover:** fundo `linha`, transição `dur-fast`.
  - **Ativo:** fundo `musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`.
- **Quatro itens**, os mesmos do mobile: `Estante` (`Books`), `Descobrir` (`Compass`), `Feed` (`Newspaper`), `Perfil` (`UserCircle`).
- **Sem sino na web.** Notificações estão fora do escopo do cliente web (REQUISITOS.md §2.1), então o ícone não existe aqui.
- **Nada no rodapé da sidebar.** Sem botão de suporte, sem "Fale conosco", sem versão do aplicativo.

### Animação de retrair e expandir

- A largura vai de 248px para 72px em `dur-base` com `ease-in-out`, que é o easing de movimento contínuo do sistema.
- Os rótulos somem em `dur-fast` com `ease-in`, antes da largura terminar de fechar, para não espremerem o texto.
- Sob `prefers-reduced-motion`, a troca é instantânea, sem transição de largura.
- A animação acontece **uma vez por acionamento**. Não existe estado em que a sidebar fica se movendo sozinha.

### Área de conteúdo

À direita da sidebar, fundo `papel`, padding lateral `space-8`. Header próprio de 72px com o título da tela em `display` `tinta` à esquerda e as ações contextuais à direita, seguindo o mesmo padrão do mobile menos o sino.

### 5.1 Sidebar expandida, estante ativa

Estado padrão. Sidebar de 248px com wordmark e os quatro rótulos, item **Estante** ativo em `musgo-fundo`. Conteúdo com o header `Minha estante` mais `MagnifyingGlass`, e a grade de capas em seis colunas com gap `space-4`.

### 5.2 Sidebar retraída

Sidebar de 72px, só os ícones, item **Estante** ativo em `musgo-fundo`. O conteúdo se estende para a largura liberada e a grade continua em seis colunas, mais folgada. No hover de um ícone, um tooltip aparece à direita com o rótulo em `caption`, fundo `papel-elevado`, `radius-sm`, `elev-2`.

### 5.3 Item em hover

Sidebar expandida com o cursor sobre **Feed**: fundo `linha` no item, enquanto **Estante** segue ativo em `musgo-fundo`. Serve para conferir que hover e ativo são distinguíveis.

### 5.4 Ponto de virada, 768 x 900

Artboard mais estreito, no fim da linha web. A sidebar nasce **retraída** entre 768px e 1024px, e a grade de conteúdo cai para duas colunas. Abaixo de 768px a sidebar deixa de existir e a barra inferior do mobile assume: **não existe menu hamburguer em nenhum tamanho**.

---

## 6. Artboards em modo escuro

- **Mobile, estante ativa.** Fundo `noite`. Header com título em `papel-suave` e ícones em `papel-suave`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com divisor `linha-noite` no topo. Item inativo em `grafite-claro`, item ativo com ícone `fill` e rótulo em `musgo-claro`. Badge do sino em `musgo-claro` com o número em `noite`.
- **Web, sidebar expandida.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Item ativo com fundo `musgo-fundo-escuro`, ícone `fill` e rótulo em `musgo-claro`. Hover com fundo `linha-noite`.

Nos dois, os shadows ficam com metade da opacidade: a hierarquia vem da superfície e do divisor.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Header de tela com título em `display` à esquerda e ações à direita | documento-de-design §5.1 e §5.3 |
| Placeholder de capa em retângulo de canto vivo | documento-de-design §4.5 e §7.6 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |

**Componentes que ainda não existem na fonte.** Quatro elementos deste prompt não estão no `documento-de-design.md` e nascem aqui:

1. **Barra inferior do mobile, com quatro áreas.** O documento define os headers de tela, nunca a barra de navegação. O quarto item, `Descobrir`, separa a busca do acervo da estante: sem ele o §5.1 obriga a busca a viver dentro de `Minha estante`, e a aba passa a mostrar conteúdo que o rótulo não promete.
2. **Sidebar retrátil da web.** Mesma lacuna.
3. **Nova semântica da lupa da estante.** O §5.1 põe `MagnifyingGlass` no header da estante sem dizer o que ela busca, e até aqui o protótipo a tratava como porta do acervo. Ela passa a filtrar a estante do leitor. **Busca textual na estante não tem RF** (RF-EST-01..12 não cobre): é requisito novo, registrado como pendência em `feature-F-EST.md`, e o protótipo desenha antes da implementação poder entrar.
4. **Badge de não lidas no sino.** O §5.6 define o indicador de não lida como um ponto `musgo` de 8px **dentro da lista de notificações**, e diz que não é pill grande nem fundo tingido. O badge no ícone do sino é outro elemento, em outro lugar, e não está previsto. O desenho aqui é deliberadamente contido para não brigar com o espírito do §5.6.

O que for aprovado neste protótipo vira pendência de incorporação ao `documento-de-design.md`, que é a fonte. Não o considere decidido antes disso.

**Wordmark.** Enquanto não existir logo, é o texto `Lê Ai` em Space Grotesk 600. Não desenhe símbolo, monograma nem lettering.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Item de navegação 1 | `Estante` |
| Item de navegação 2 | `Descobrir` |
| Item de navegação 3 | `Feed` |
| Item de navegação 4 | `Perfil` |
| Título da tela, artboard de estante | `Minha estante` |
| Título da tela, artboard de feed | `Feed` |
| Badge do sino | `3` |
| Wordmark | `Lê Ai` |

O estado de verificação de sessão **não tem texto**. Sem `Carregando`, sem `Aguarde`, sem `Verificando sua sessão`: só o wordmark.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px em cada item da barra inferior do mobile, mesmo com o rótulo ocupando menos.
- O item ativo é distinguível **sem depender de cor**: além de `musgo`, ele muda o peso do ícone de `regular` para `fill` e o peso do rótulo para 600.
- Contraste WCAG AA nos rótulos da navegação nos dois temas. O rótulo inativo usa `grafite`, que passa em corpo, e nunca `grafite-suave`.
- O badge do sino tem o número em `papel` sobre `musgo`, e a informação de quantidade não depende só da cor do círculo.
- Na web, o botão de retrair tem rótulo acessível descrevendo a ação, e o estado da sidebar é anunciado. A ordem de tabulação vai da sidebar para o header e daí para o conteúdo.
- Na sidebar retraída, o rótulo de cada item continua disponível para leitor de tela mesmo com o texto oculto visualmente, e o tooltip de hover não é a única forma de saber o que o ícone significa.
- `prefers-reduced-motion` respeitado: a transição de largura da sidebar vira instantânea.

---

## 10. O que não fazer nesta tela

**Específico do shell**

- **Não desenhe barra inferior no desktop.** A navegação da web é a sidebar.
- **Não desenhe menu hamburguer** em nenhum tamanho de viewport. Acima de 768px existe sidebar, expandida ou retraída; abaixo existe barra inferior.
- **Não coloque o sino na web.** Notificações estão fora do escopo do cliente web.
- **Não desenhe uma quinta área** na navegação. Quatro é o teto: a aba `Recomendações` de RF-REC-13 entra como **seção dentro de Descobrir** no Período 2, não como item novo, e notificações chegam pelo sino no mobile.
- Não desenhe badge grande, badge com fundo saturado fora da paleta, nem badge com contorno quando não há não lidas.
- Não anime o badge, o sino ou o item ativo em loop. Nada pulsa, nada balança, nada brilha.
- Não use pill de fundo nem indicador deslizante atrás do item ativo da barra inferior.
- Não coloque nada no rodapé da sidebar: sem suporte, sem versão, sem crédito.
- Não substitua o wordmark por inicial, monograma ou símbolo quando a sidebar retrai.
- Não desenhe spinner no estado de verificação de sessão.

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

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
