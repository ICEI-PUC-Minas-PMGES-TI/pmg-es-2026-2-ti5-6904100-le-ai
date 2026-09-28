# F-ACV-BUSCA · Página do livro

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-ACV-BUSCA.md
**Editada por:** ../../periodo-2/pagina-do-livro/pagina-do-livro.md
**Requisitos:** RF-ACV-04 (página com metadados, capa, sinopse e resenhas de outros leitores), RF-ACV-18 (sinopse sob demanda na primeira abertura), RF-ACV-19 (a página permanece utilizável sem sinopse, exibindo a ausência sem erro)
**Requisitos hospedados de outras features:** RF-EST-01 a RF-EST-08 ([F-EST](../../../plano-de-desenvolvimento/periodo-1/feature-F-EST.md): status na estante, ações do ciclo de leitura e número de conclusões), RF-PRG-02 ([F-PRG](../../../plano-de-desenvolvimento/periodo-1/feature-F-PRG.md): página atual e percentual), RF-AVA-01 a RF-AVA-03 ([F-AVA](../../../plano-de-desenvolvimento/periodo-1/feature-F-AVA.md): nota do leitor, resenha própria e resenha de terceiro com spoiler)
**Não funcionais:** RNF-DES-01 (leitura em até 1s no p95), RNF-DES-02 (resenhas paginadas), RNF-SEC-03 (privacidade validada no servidor), RNF-USA-02, RNF-USA-03, RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-19 (sinopse sob demanda, assíncrona, com ausência como estado terminal válido), RN-14.4 (ordem de resolução da capa: cópia própria, depois URL externa, depois placeholder), RN-08 (só aparecem resenhas de autores públicos, do próprio solicitante, ou de perfis privados que ele segue), RN-04 (máquina de estados da leitura), RN-06 (nota de 0 a 5 em passos de 0,5)
**Versão web:** sim. RF-ACV-04, RF-ACV-18 e RF-ACV-19 têm marcação na coluna Web de `REQUISITOS.md` §5.2.

---

## 1. Contexto

A tela mais editorial do produto e a mais disputada: cinco features do Período 1 depositam conteúdo aqui. O leitor chega da aba `Descobrir`, da estante ou do feed, decide se quer o livro, coloca na estante, inicia a leitura, acompanha o progresso, dá nota e lê o que os outros escreveram.

Ela sustenta os três mecanismos ao mesmo tempo: **registro** (colocar na estante, iniciar, finalizar), **meta** (a barra de progresso da leitura em andamento) e **pertencimento** (as resenhas de outros leitores).

**Esta é a única tela do produto em que `DESIGN_VARIANCE` sobe para 7.** O hero centralizado com a capa em foco, a serifa Newsreader aparecendo em três blocos e a densidade menor existem para que ela contraste deliberadamente com a estante, que é grid previsível, e com o feed, que é lista cronológica previsível. O contraste é o ponto; ele não é licença para inventar layout fora do sistema.

### O que existe no Período 1 e o que não existe

A seção §5.2 do `documento-de-design.md` descreve esta tela para o produto pronto. **Vários elementos que ela cita não existem ainda** e não podem ser desenhados:

| Elemento do design §5.2 | Situação no Período 1 |
|---|---|
| Botão "Favoritar" | **Não desenhe.** RF-EST-09 é desejável e vai para F-EST-2, no Período 2. |
| Frases e trechos em blockquote | **Não desenhe.** RF-AVA-06 e RF-AVA-07 vão para F-AVA-2, no Período 2. |
| Chips de assunto acionáveis | **Não desenhe.** Exibir e tornar o assunto acionável é RF-ACV-21, integralmente do Período 2. |
| Nota geral e Nota dos leitores (componente §4.4) | **Não desenhe o componente.** A projeção de nota é F-ACV-NOTA, no Período 2. |
| Autor, Editora e Série como blocos que levam às páginas respectivas | **Texto, sem link.** As páginas de autor, editora e série são RF-ACV-10, 11 e 12, do Período 2. |
| Resenha em Markdown | **Não desenhe.** RF-AVA-09 é do Período 2. No Período 1 a resenha é texto puro. |

O que a tela **ganha** de outras features do próprio Período 1: status pill e ações de estante (F-EST), número de conclusões (RF-EST-08), barra de progresso da leitura em andamento (F-PRG), nota do leitor em estrelas com meia estrela (F-AVA) e resenhas de terceiros com spoiler oculto (F-AVA).

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Página do livro · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- Como a página é longa, cada artboard mostra o **topo da página** dentro do viewport, com o conteúdo cortado naturalmente pela borda inferior. Nada de artboard esticado até caber a página inteira.

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
ESTA TELA É UMA DELAS: a página do livro opera em DESIGN_VARIANCE 7,
MOTION_INTENSITY 4, VISUAL_DENSITY 3. Hero centralizado com capa em foco,
display grande, serifa em três blocos e densidade menor que a estante.

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

**Livro principal dos artboards:**

| Campo | Valor |
|---|---|
| Título | Torto Arado |
| Autor | Itamar Vieira Junior |
| Editora | Todavia |
| Ano | 2019 |
| Páginas | 264 páginas |
| ISBN-13 | 9788588808911 |
| Série | não pertence a série |

**Sinopse** (texto puro persistido, RN-19, exibido em Newsreader):

`Bibiana e Belonísia crescem no interior da Bahia, na comunidade quilombola de Água Negra, onde as famílias trabalham uma terra que não é sua. Um acidente com uma faca antiga muda a vida das duas irmãs e marca o início de uma história sobre herança, silêncio e a disputa pela terra.`

**Estado do leitor sobre este livro:**

- Status na estante: `Lendo`.
- Leitura em andamento: iniciada em `12 de agosto de 2026`, página atual `148`, o que dá `56%` de `264 páginas`.
- Número de conclusões anteriores: `1 conclusão` (RF-EST-08). O leitor já leu este livro uma vez e está relendo em outra leitura registrada.
- Nota do leitor: `4,5` estrelas.
- Resenha própria: ainda não escrita.

**Resenhas de outros leitores** (paginadas, filtradas por RN-08):

| Autor | Username | Nota | Spoiler | Trecho |
|---|---|---|---|---|
| Marina Antunes | @marina.antunes | 5 estrelas | não | `A terra e a fala são a mesma disputa no livro inteiro. Levei três dias e ainda estou pensando na parte final.` |
| Rafael Bittencourt | @rbittencourt | 4 estrelas | **sim** | conteúdo oculto até revelar |
| Letícia Nakamura | @lelenakamura | 4,5 estrelas | não | `A troca de narradora no meio da história é o melhor recurso do romance. Demorei a entender e depois não consegui parar.` |

Contagem total: `28 resenhas`.

**Nenhuma nota agregada aparece.** Não existe "nota geral", não existe "nota dos leitores", não existe distribuição de notas. Onde o design §4.4 prevê o componente, a tela do Período 1 **não tem nada**: nem o componente vazio, nem `0,0`, nem traço.

**Livro do artboard de sinopse ausente:** `Insubmissas Lágrimas de Mulheres`, de Conceição Evaristo, Nandyala, 2011, `108 páginas`.

**Livro do artboard de capa em placeholder:** `Becos da Memória`, de Conceição Evaristo, Pallas, 2006, `200 páginas`.

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

### Header desta tela

Diferente das demais: a página do livro **não repete o título no header**, porque o título aparece grande no hero logo abaixo.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px.
- `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header **apenas quando o conteúdo rola por baixo dele**. Com a página no topo, sem divisor.

### 4.1 Padrão, leitura em andamento

O estado principal. De cima para baixo, com `space-6` entre seções:

1. **Hero.** Fundo `papel` sólido, sem imagem, sem desfoque, sem gradiente.
   - Capa centralizada ocupando 40% da largura da tela, retângulo de canto vivo, proporção 2:3, com `elev-2`.
   - `space-5` abaixo.
   - Título `Torto Arado` em `display`, cor `tinta`, centralizado.
   - Autor `Itamar Vieira Junior` em `body` `grafite`, centralizado, `space-2` abaixo do título.
   - Metadados em `caption` `grafite-suave`, centralizados, em uma linha: `Todavia · 2019 · 264 páginas`.
2. **Status e progresso** (F-EST e F-PRG).
   - Status pill `Lendo` conforme design §4.6: fundo `musgo-fundo`, texto `musgo`, ícone `BookOpen` (Phosphor, `regular`, 16px), `radius-full`, padding `space-1 space-2`, `caption`. Centralizado.
   - `space-3` abaixo, **barra de progresso** conforme design §4.7: track `musgo-fundo` de 6px de altura e `radius-full`, fill `musgo` até 56% da largura, e o percentual à direita em `num-inline` `caption`, no formato `56%`. Padding lateral `space-5`.
   - Abaixo da barra, em `caption` `grafite`, alinhado à esquerda: `Página 148 de 264`. Alinhado à direita, na mesma linha: `1 conclusão` (RF-EST-08).
   - A barra **nunca** mostra `0%` nem `100%`: em zero mostra `Iniciada`, em cem mostra `Concluída` com a data de fim.
3. **Barra de ação.**
   - Botão primário largo, pill, altura 48px, fundo `musgo`, texto `papel` em `body-strong`: `Registrar progresso`. É o CTA principal quando existe leitura em andamento.
   - `space-3` abaixo, botão secundário largo, `radius` 12, borda de 1px `linha`, fundo transparente, texto `tinta`: `Alterar status`.
   - **Um CTA por intenção.** Não existe "Adicionar à estante" convivendo com "Registrar progresso": o livro já está na estante.
4. **Sua avaliação** (F-AVA).
   - Título de seção `Sua avaliação` em `title-lg` `tinta`, alinhado à esquerda, padding lateral `space-5`.
   - Estrelas em tamanho `md` de 24px conforme design §4.3: quatro `Star` (Phosphor, `fill`) em `musgo` e uma `StarHalf` (Phosphor, `fill`) em `musgo`, com o valor ao lado em `num-inline` `tinta`: `4,5`. Meia estrela é hard-stop 50/50 sólido, nunca um gradiente linear.
   - Botão textual `musgo`: `Escrever resenha`.
5. **Sinopse.**
   - Título de seção `Sinopse` em `title-lg` `tinta`.
   - Texto em `body-lg` **Newsreader 400**, cor `tinta`, padding lateral `space-5`. Este é um dos três únicos lugares do produto em que a serifa aparece.
   - Sem "ler mais" com corte por altura: a sinopse persistida tem no máximo 4.000 caracteres e cabe rolando.
6. **Ficha.**
   - Título de seção `Ficha` em `title-lg` `tinta`.
   - Três linhas de rótulo e valor, separadas por divisor de 1px `linha`, com `space-3` de padding vertical: `Autor` / `Itamar Vieira Junior`, `Editora` / `Todavia`, `ISBN` / `9788588808911`. Rótulo em `label` `grafite` à esquerda, valor em `body` `tinta` à direita.
   - **Os valores são texto, não link.** As páginas de autor, editora e série são do Período 2.
7. **Resenhas.**
   - Título de seção `Resenhas` em `title-lg` `tinta`, com a contagem ao lado em `caption` `grafite`: `28 resenhas`.
   - Lista com `space-6` entre resenhas. Cada uma:
     - Avatar circular de 40px, nome em `title-sm` `tinta`, `@username` em `caption` `grafite-suave` abaixo, e as estrelas em tamanho `sm` de 16px à direita.
     - Corpo da resenha em `body-lg` **Newsreader 400** `tinta`, com `space-3` acima. Segundo dos três lugares da serifa.
     - Data em `caption` `grafite-suave` abaixo.
   - Ao fim, botão textual `musgo`: `Ver todas as resenhas`.
8. Barra inferior do shell com **Descobrir** ativo. Esta é uma tela de detalhe empilhada, não uma raiz de aba: **o item ativo é sempre a aba de origem**, e os artboards usam `Descobrir` porque a rota mais frequente é a da busca. Chegando da estante ou do feed, o ativo é `Estante` ou `Feed` sem nenhuma outra mudança no desenho.

### 4.2 Livro fora da estante

Mesmo hero, com o leitor sem relação com o livro.

- Sem status pill, sem barra de progresso, sem contagem de conclusões.
- Barra de ação: botão primário largo pill `musgo` com `Adicionar à estante`, e botão secundário `radius` 12 com borda `linha` e texto `tinta`: `Iniciar leitura`.
- Bloco `Sua avaliação` presente, com as **cinco estrelas vazias** em `grafite-suave` outline, sem fill, e o texto ao lado em `caption` `grafite-suave`: `Sem nota`. Nunca `0,0`.
- **Sem botão Favoritar.** Favoritos são do Período 2.

### 4.3 Sinopse pendente

O que aparece na primeira abertura da página, enquanto o fluxo assíncrono de RN-19 busca a sinopse. **A página abre inteira e utilizável**: a sinopse não bloqueia a renderização.

- Hero, status, barra de ação, ficha e resenhas **completos e reais**. Só a seção de sinopse está em skeleton.
- Na seção `Sinopse`: título de seção real, e abaixo quatro barras em `capa-placeholder`, `radius-sm`, altura de 20px cada, larguras de 100%, 96%, 100% e 62%, com `space-3` entre elas, reproduzindo a forma de um parágrafo.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer perpétuo, sem spinner, sem barra de progresso indeterminada. O sistema não tem spinner.
- Nenhum texto do tipo `Carregando sinopse`. A forma do skeleton já diz o que está vindo.

### 4.4 Sinopse ausente

Estado **terminal e válido** de RN-19.4. Ausência não é erro e não pode parecer erro.

- Seção `Sinopse` com o título de seção normal.
- Abaixo, texto em `body` `grafite-suave`, alinhado à esquerda, sem caixa, sem borda, sem ícone de alerta, sem fundo tingido: `Este livro ainda não tem sinopse no acervo.`
- **Nada de `rubi`, nada de `ambar`, nada de `Warning`, nada de botão "tentar de novo".** A busca automática terminou e o resultado é ausência.
- O resto da página segue completo e utilizável (RF-ACV-19).

### 4.5 Capa em placeholder

Resolução de capa de RN-14.4 chegando ao terceiro nível.

- No hero, no lugar da capa, retângulo `capa-placeholder` na mesma proporção 2:3 e mesmo canto vivo, com o título `Becos da Memória` centralizado em `title-sm` `tinta` e o autor abaixo em `caption` `grafite`.
- **Nada de ícone de livro genérico ilustrado.** O placeholder do sistema já dá dignidade ao livro sem capa.
- O resto do hero segue igual: o título grande em `display` continua abaixo do placeholder, mesmo repetindo o texto que aparece dentro dele. A repetição é intencional e vem do componente.

### 4.6 Resenha com spoiler

Estado de RF-AVA-03 dentro da lista de resenhas.

- Cabeçalho da resenha normal: avatar, `Rafael Bittencourt`, `@rbittencourt`, quatro estrelas em `musgo`.
- No lugar do corpo, um bloco de `radius` 12, fundo `papel-elevado`, borda de 1px `linha`, padding `space-4`, altura suficiente para três linhas de texto, **sem nenhum texto legível dentro**. Nada de texto borrado, nada de censura por caractere: o conteúdo simplesmente não está renderizado.
- Dentro do bloco, centralizado: `EyeSlash` (Phosphor, `regular`, 20px, `grafite`), texto em `caption` `grafite`: `Esta resenha contém spoiler`, e botão textual `musgo`: `Mostrar mesmo assim`.
- Revelar troca o bloco pelo texto em Newsreader com transição `dur-fast`, uma vez, sem animação de expansão elástica.

### 4.7 Sem resenhas

- Seção `Resenhas` com o título de seção e, ao lado, `Nenhuma resenha ainda` em `caption` `grafite`.
- Abaixo, texto em `body` `grafite`: `Ninguém que você segue escreveu sobre este livro.` seguido de botão textual `musgo`: `Escrever a primeira`.
- Esse texto é importante: a lista é filtrada por RN-08 no servidor, então "sem resenhas" pode significar "existem, mas não para você". A copy não promete que o livro não tem resenha nenhuma.

### 4.8 Carregando a página

- Header real com `ArrowLeft` e `Bell`.
- Skeleton com a forma do layout final: retângulo `capa-placeholder` centralizado a 40% da largura na proporção 2:3, barra de 32px de altura e 70% de largura centralizada abaixo, barra de 18px e 45% abaixo dela, e duas barras largas na área da barra de ação com `radius-full`.
- Um único fade de entrada. Sem shimmer, sem spinner.
- Este é também o estado do **cold start** do serviço (RNF-ERR-09): demora não é erro.

### 4.9 Erro de carregamento

- Header real.
- Bloco centralizado no corpo, com `space-5` entre os elementos: `Warning` (Phosphor, `regular`, 32px, `rubi`), título em `title` `tinta`: `Não foi possível abrir este livro`, texto em `body` `grafite` centralizado: `A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.`, e botão primário pill `musgo`: `Tentar de novo`.
- Este bloco é para falha de rede na **página inteira**. Ele nunca aparece por causa de sinopse ausente.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

A web **não** é a coluna mobile esticada. O hero centralizado do mobile vira **layout de duas colunas**, que é o que a tela grande pede: a ficha à esquerda, o conteúdo editorial à direita.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Descobrir** ativo, pela mesma regra de aba de origem de 4.1.
- Área de conteúdo com padding lateral `space-8`, `max-width` de 1120px no bloco de conteúdo.
- **Coluna da esquerda, 320px, fixa ao rolar** (`position: sticky` no topo, com `space-8` de offset):
  - Capa de 280 por 420px, canto vivo, `elev-2`.
  - `space-5` abaixo, status pill `Lendo`.
  - Barra de progresso com o percentual `56%` e, abaixo, `Página 148 de 264` e `1 conclusão` em `caption` `grafite`.
  - Botão primário pill de largura total da coluna, altura 40px (medida de web), `musgo`: `Registrar progresso`.
  - Botão secundário de largura total, `radius` 12, borda `linha`: `Alterar status`.
  - `space-6` abaixo, a **ficha** em três linhas de rótulo e valor, com divisor `linha` entre elas.
- **Coluna da direita, o resto da largura:**
  - Título `Torto Arado` em `display-hero`, cor `tinta`, alinhado à esquerda. O `display-hero` só cabe aqui porque a web tem largura; no mobile o título usa `display`.
  - Autor em `title-sm` `grafite` abaixo, e metadados `Todavia · 2019 · 264 páginas` em `caption` `grafite-suave`.
  - `space-8` abaixo, bloco `Sua avaliação` com as estrelas em 24px e o botão textual `Escrever resenha`.
  - Seção `Sinopse` com o texto em `body-lg` Newsreader, com `max-width` de 68ch para que a linha não fique longa demais para ler.
  - Seção `Resenhas` com a contagem, em **duas colunas** de cards de resenha com gap `space-6`. Cada card tem fundo `papel-elevado`, `radius` 16, padding `space-5`, sem sombra.
- `hover` no card de resenha: borda de 1px `linha` aparecendo, transição `dur-fast`. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Entre 768px e 1024px** a coluna da esquerda deixa de ser fixa e as duas colunas viram uma só, com a capa centralizada no topo e largura de 200px. **Abaixo de 768px** o layout é o desenho mobile e a sidebar dá lugar à barra inferior.

### 5.1 Padrão, leitura em andamento

Estado principal em duas colunas, como descrito acima.

### 5.2 Sinopse pendente

Mesmo layout, com a seção `Sinopse` em skeleton de quatro barras e o resto da página completo e real. Um único fade.

### 5.3 Sinopse ausente

Mesmo layout, com a seção `Sinopse` exibindo `Este livro ainda não tem sinopse no acervo.` em `body` `grafite-suave`, sem caixa e sem ícone de alerta.

### 5.4 Resenha com spoiler e hover de card

Grid de resenhas com o card de `Rafael Bittencourt` no estado oculto, e o card de `Marina Antunes` em hover com a borda `linha` visível. Serve para conferir que hover e estado de spoiler são distinguíveis.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título em `papel-suave`, autor em `grafite-claro`, metadados em `grafite-fundo-escuro`. Status pill `Lendo` com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Barra de progresso com track `musgo-fundo-escuro` e fill `musgo-claro`. Botão primário com fundo `musgo-claro` e texto `noite`. Sinopse em Newsreader `papel-suave`. Divisores da ficha em `linha-noite`. Estrelas cheias em `musgo-claro`, estrelas vazias em `grafite-fundo-escuro`. Bloco de spoiler em `noite-elevada`, **mais claro** que o fundo, com borda `linha-noite`. Barra inferior em `noite-elevada`.
- **Web, padrão.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Card de resenha em `noite-elevada`, mais claro que o fundo. Hover do card com borda `linha-noite`.

Nos dois, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`, não da sombra. A capa mantém `elev-2` atenuado.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Padrão de tela da página do livro, com a variance 7 | documento-de-design §5.2 |
| Estrela de avaliação com meia estrela | documento-de-design §4.3 |
| Card de livro e placeholder de capa em canto vivo | documento-de-design §4.5 e §7.6 |
| Status pill dos cinco status | documento-de-design §4.6 |
| Barra de progresso de leitura | documento-de-design §4.7 |
| Botão primário pill, secundário e textual | documento-de-design §4.1 |
| Serifa Newsreader em sinopse e em corpo de resenha | documento-de-design §3.2.2 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que ainda não existem na fonte.** O **bloco de resenha com spoiler oculto** é citado em RF-AVA-03 e no §5.2 do design apenas como "exibidas ocultas, exigindo ação para revelar", sem desenho. O tratamento aqui, com bloco em `papel-elevado` e ação textual, nasce neste prompt e vira pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3.

**Componente deliberadamente ausente.** O componente `Nota geral vs Nota dos leitores` do §4.4 **não é desenhado**, porque a projeção de nota é F-ACV-NOTA, do Período 2. Ausente significa ausente: nem o componente vazio, nem valores zerados.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do livro | `Torto Arado` |
| Autor | `Itamar Vieira Junior` |
| Metadados | `Todavia · 2019 · 264 páginas` |
| Status pill | `Lendo` |
| Progresso, percentual | `56%` |
| Progresso, detalhe | `Página 148 de 264` |
| Conclusões | `1 conclusão` |
| CTA com leitura em andamento | `Registrar progresso` |
| Ação secundária | `Alterar status` |
| CTA sem relação com o livro | `Adicionar à estante` |
| Ação secundária sem relação | `Iniciar leitura` |
| Título de seção | `Sua avaliação` |
| Sem nota | `Sem nota` |
| Ação de resenha | `Escrever resenha` |
| Título de seção | `Sinopse` |
| Sinopse ausente | `Este livro ainda não tem sinopse no acervo.` |
| Título de seção | `Ficha` |
| Rótulos da ficha | `Autor`, `Editora`, `ISBN` |
| Título de seção | `Resenhas` |
| Contagem de resenhas | `28 resenhas` |
| Sem resenhas, rótulo | `Nenhuma resenha ainda` |
| Sem resenhas, texto | `Ninguém que você segue escreveu sobre este livro.` |
| Sem resenhas, ação | `Escrever a primeira` |
| Ver mais resenhas | `Ver todas as resenhas` |
| Spoiler, aviso | `Esta resenha contém spoiler` |
| Spoiler, ação | `Mostrar mesmo assim` |
| Erro, título | `Não foi possível abrir este livro` |
| Erro, texto | `A conexão falhou antes de carregar os dados. Tente de novo em alguns instantes.` |
| Erro, ação | `Tentar de novo` |

Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade, com a exceção do percentual, cujo símbolo já é a unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no botão de voltar, no sino, em cada estrela do seletor e no botão de revelar spoiler.
- O seletor de estrelas é operável por teclado na web: setas mudam o valor em passos de 0,5 e o valor atual é anunciado como texto, não só como preenchimento visual.
- Contraste WCAG AA no corpo e AAA no título. A sinopse em Newsreader usa `tinta` sobre `papel`, não `grafite`, porque é texto longo de leitura.
- `grafite-suave` carrega apenas metadado e nunca informação essencial: o texto de sinopse ausente é a exceção deliberada, e por isso ele também é reforçado pela ausência do parágrafo, não só pela cor.
- O status da leitura é distinguível **sem depender de cor**: o pill traz ícone próprio por status conforme design §4.6.
- A barra de progresso não comunica só por preenchimento: o valor aparece em número ao lado e em texto abaixo (`Página 148 de 264`).
- O spoiler oculto não é uma sobreposição visual sobre texto presente no DOM: o conteúdo não está renderizado até a ação de revelar, para que leitor de tela também não o leia por engano.
- Na web, foco de teclado visível em todo elemento interativo, com contorno de 2px `musgo` e offset de 2px. A ordem de tabulação vai da sidebar para a coluna da esquerda e daí para a coluna editorial.
- `prefers-reduced-motion` respeitado: o fade de entrada do skeleton e a transição de revelar spoiler viram estáticos.
- Rolagem longa sem captura: nada de rolagem pinada, nada de parallax na capa, nada de header que encolhe com efeito elástico.

---

## 10. O que não fazer nesta tela

**Escopo do Período 1**

- **Não desenhe o botão Favoritar.** RF-EST-09 é do Período 2.
- **Não desenhe frases e trechos** em blockquote. RF-AVA-06 e RF-AVA-07 são do Período 2.
- **Não desenhe chips de assunto.** Exibir e tornar o assunto acionável é RF-ACV-21, do Período 2.
- **Não desenhe o componente Nota geral vs Nota dos leitores**, nem vazio, nem com valores. É F-ACV-NOTA, do Período 2.
- **Não transforme autor, editora ou série em link.** As páginas respectivas são do Período 2. Aqui são texto na ficha.
- **Não renderize Markdown** na resenha. No Período 1 a resenha é texto puro.
- Não desenhe distribuição de notas em gráfico de barras. Não existe no Período 1.

**Específico da página do livro**

- **Ausência de sinopse não é erro.** Nada de `rubi`, nada de `ambar`, nada de ícone de alerta, nada de botão de tentar de novo na seção de sinopse.
- **A página abre sem esperar a sinopse.** Nunca desenhe a página inteira em skeleton porque a sinopse ainda não chegou.
- Não use a capa como fundo desfocado do hero. O fundo do hero é `papel` sólido.
- Não arredonde o canto da capa. Capa é a exceção declarada do sistema: retângulo de canto vivo.
- Não desenhe placeholder de capa com livro genérico ilustrado.
- Não desenhe dois CTAs com a mesma intenção. Se há leitura em andamento, o primário é registrar progresso; se não há, é adicionar à estante.
- Não desenhe o corpo do spoiler borrado, censurado por caractere ou coberto por sobreposição translúcida. O conteúdo não é renderizado.
- Não desenhe nota do leitor como `0,0` quando não há nota. Sem nota é `Sem nota`, com as estrelas vazias.
- Não desenhe o percentual como `0%` nem `100%`. Zero é `Iniciada`, cem é `Concluída`.

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
**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
