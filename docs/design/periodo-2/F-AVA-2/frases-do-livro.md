# F-AVA-2 · Frases do livro

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-AVA-2.md
**Requisitos:** RF-AVA-07 (ver as frases cadastradas de um livro e excluir as suas), RF-AVA-06 (só a entrada `Adicionar frase`; o formulário é `F-AVA-2/adicionar-frase.md`)
**Moderação:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-MOD.md, remoção direta de frase pelo administrador, sem denúncia prévia (RN-11, `DELETE /admin/frases/{id}`), com registro no log de auditoria (RF-MOD-05)
**Não funcionais:** RNF-SEC-02 (só o autor exclui a própria frase, validado no servidor), RNF-SEC-04 (remoção administrativa restrita ao admin, validada no servidor), RNF-SEC-14 (texto da frase tratado como texto), RNF-DES-02 (lista paginada com teto do servidor), RNF-USA-04 (confirmação em excluir e em remover), RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-11 (até 500 caracteres, página de referência obrigatória, máximo de 10 frases por leitor e por livro, remoção direta pela moderação), RN-15 (em livro pessoal, só o dono cadastra e consulta frases)
**Versão web:** sim. RF-AVA-07 e RF-MOD-03 têm marcação na coluna Web de `REQUISITOS.md` §5.5 e §5.11.
**De onde se chega:** do botão `Ver todas as frases` da seção `Frases e trechos` da página do livro ([`../pagina-do-livro/pagina-do-livro.md`](../pagina-do-livro/pagina-do-livro.md)). Daqui se vai ao formulário de nova frase (`F-AVA-2/adicionar-frase.md`, a desenhar em outro prompt) e de volta à página do livro.

---

## 1. Contexto

As frases são o **registro** do que ficou de um livro: o trecho que o leitor sublinharia se o livro fosse dele, guardado com a página em que está. A página do livro mostra só as três mais recentes; esta tela mostra todas, em ordem da mais recente para a mais antiga, e é o único lugar onde uma frase sai do livro.

Três pessoas olham esta tela, e o que cada uma pode fazer é diferente:

- **Leitor, nas frases dos outros.** Só lê. Nenhuma ação sobre frase alheia: frase não tem curtida, comentário nem denúncia (RN-11 tira a frase do fluxo de denúncia).
- **Leitor, nas próprias frases.** Lê e **exclui**, com confirmação (RNF-USA-04). A referência da frase dele diz `você` no lugar do `@username`. Ele vê também quantas frases já guardou do livro, contra o teto de 10 (RN-11), para não descobrir o limite só ao tentar salvar a décima primeira.
- **Administrador, na web.** Vê a mesma lista e **remove qualquer frase**, sem denúncia prévia (RN-11, F-MOD). A remoção vale para todos os leitores e fica no log de moderação. É a única tela do produto em que o administrador age sobre frase: não existe listagem administrativa de frases.

Três coisas que a tela precisa resolver:

- **A frase é o conteúdo, a ação é secundária.** O texto em Newsreader italic ocupa a linha; a referência e o botão de excluir ficam pequenos, abaixo. A tela é de leitura, não de gestão.
- **Excluir e remover parecem iguais e não são.** Excluir é o autor tirando o que é dele. Remover é a moderação tirando o que é de outro, com efeito para todo mundo e registro no log. Copy, confirmação e contexto deixam isso explícito.
- **O limite de 10 é visível antes do erro.** `Você guardou 2 de 10 frases deste livro.` aparece o tempo todo, e ao chegar a 10 o botão de adicionar dá lugar à explicação.

**Por que o administrador não remove frase no mobile.** O F-MOD põe a remoção direta de frase no bloco `Frontend Web` e diz que, no mobile, só existe a denúncia; o painel de moderação é da web. Por isso, no app, a conta de administrador vê esta tela como qualquer leitor. A decisão está listada para ratificação.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Frases do livro · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

SOBREPOSIÇÃO (bottom sheet e dialog)
Abaixo de 768px: bottom sheet ancorado embaixo, largura total, fundo papel no
claro e noite-elevada no escuro, radius-lg só no topo, padding space-6,
elev-3. Alça de 32 x 4px em linha (linha-noite no escuro), centralizada,
space-5 acima do conteúdo. O padding inferior soma a área segura.
Scrim: #171512 a 40% no claro e preto a 60% no escuro.
O sheet sobe em dur-slow com ease-out e sai em dur-base com ease-in. Foco
preso dentro enquanto aberto; Esc e toque no scrim fecham; o foco volta ao
elemento que abriu.

MODO ESCURO
Cidadão de primeira classe e lock de página inteira: nenhuma seção inverte no
meio da rolagem. Superfície elevada fica MAIS CLARA que o fundo, nunca mais
escura.

CONTRASTE
WCAG AA no corpo, AAA no título quando possível. grafite-suave e
grafite-fundo-escuro passam apenas em tamanho grande: nunca carregam texto de
corpo nem informação essencial.

DIALOG: a partir de 768px, a confirmação
é dialog centrado de 480px, radius-xl 24 nos quatro cantos, sem alça, fundo
papel no claro e noite-elevada no escuro, padding space-6, elev-3; entra em
dur-base com deslize curto de 16px e fade, sai em dur-base com ease-in.
```

---

## 3. Dados que aparecem na tela

**Livro:** `Torto Arado`, Itamar Vieira Junior, Todavia, 2019, `264 páginas`. Livro do acervo, com capa.

**Contagem:** `14 frases` no livro. Quem olha guardou `2 de 10` delas.

**Frases**, da mais recente para a mais antiga. Texto mock escrito para o protótipo, não é citação do livro. As três primeiras são as mesmas que a página do livro mostra na seção `Frases e trechos`.

| # | Frase | Referência | De quem |
|---|---|---|---|
| 1 | `A terra não era nossa, mas era a gente que sabia o nome de cada pedaço dela.` | `Página 57 · @marina.antunes` | Marina Antunes |
| 2 | `Aprendi cedo que o silêncio também é uma forma de dizer quem manda.` | `Página 112 · você` | quem olha |
| 3 | `Quando a chuva voltou, ninguém comemorou em voz alta, com medo de espantar.` | `Página 203 · @joao.pedrosa` | João Pedrosa |
| 4 | `O rio não pedia licença para mudar de caminho, e a gente também aprendeu a não pedir.` | `Página 146 · @leticia.nakamura` | Letícia Nakamura |
| 5 | `Tinha coisa que só a avó sabia dizer, e dizia olhando para o chão.` | `Página 31 · você` | quem olha |
| 6 | `Cada enxada que voltava do campo contava uma história que ninguém escrevia.` | `Página 88 · @caio.albuquerque` | Caio Albuquerque |
| 7 | `Minha irmã guardava as palavras como quem guarda semente para o ano seguinte.` | `Página 19 · @renata.siqueira` | Renata Siqueira |
| 8 a 14 | | | carregadas na rolagem |

**Limite atingido**, usado em 4.5: o mesmo livro, com quem olha tendo guardado `10 de 10`. Contagem do livro `22 frases`.

**Sem frases**, usado em 4.6: `Torto Arado` com `0 frases`.

**Administrador**, usado na web em 5.3 a 5.5: a conta de moderação vê as mesmas 14 frases. Ela não tem frases próprias neste livro, então nenhuma referência diz `você`.

**Nenhuma data aparece** nas frases: a referência é a página. **Nenhum número sem unidade**, com a exceção do número da página dentro de `Página 57`, que já é a unidade.

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
que salta. **Nesta tela o item ativo é o da área de onde se chegou à página
do livro; em todos os artboards, `Descobrir`.**

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
ativo é `Descobrir`.**

**Web, sidebar da conta de administrador.** Igual à de cima, com um quinto
item: depois dos quatro, `space-3`, um divisor de 1px `linha` na largura
interna (padding lateral `space-3` + `space-4`), `space-3`, e o item `Moderação` com
`ShieldCheck` (Phosphor, `regular`, 20px), no mesmo desenho e nos mesmos
estados dos outros quatro. Ele só existe para a conta de administrador:
nenhum leitor vê o item, nem desabilitado. **Nesta tela ele está inativo**,
porque a tela é a de frases e a área ativa continua `Descobrir`.

**Sem sino na web.** Notificações estão fora do escopo do cliente web
(REQUISITOS.md §2.1), então o ícone não existe na sidebar nem no header web.
Nada no rodapé da sidebar: sem suporte, sem versão, sem crédito.

**Web, área de conteúdo.** À direita da sidebar, fundo `papel`, padding
lateral `space-8`, com header próprio de 72px, sem o sino.

**Ponto de virada.** Entre 768px e 1024px a sidebar nasce retraída em 72px,
só ícones. Abaixo de 768px a sidebar deixa de existir e a barra inferior do
mobile assume. Não existe menu hamburguer em nenhum tamanho.

### Header desta tela

Header de tela de detalhe, empilhada sobre a página do livro.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px e rótulo acessível `Voltar para Torto Arado`.
- `space-2` de gap, o título `Frases e trechos` em `title-sm` `tinta`, alinhado à esquerda, uma linha.
- `Bell` à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Bloco do livro

Logo abaixo do header, padding lateral `space-5`, `space-2` de respiro acima.

1. Uma linha com a capa de 48 por 72px em retângulo de canto vivo, sem sombra, à esquerda; `space-4` de gap; à direita, empilhados, `Torto Arado` em `title-sm` `tinta`, `Itamar Vieira Junior` em `caption` `grafite` e `14 frases` em `caption` `grafite`, com o número em `num-inline` no tamanho do `caption`. A linha inteira não é tocável: a volta ao livro é o `ArrowLeft`.
2. `space-4`, a **linha de cota** em `caption` `grafite`: `Você guardou 2 de 10 frases deste livro.`, com os dois números em `num-inline` no tamanho do `caption`. Com zero frases próprias: `Você ainda não guardou frases deste livro. Cabem até 10.`
3. `space-3`, botão secundário de largura total, 48px, `radius` 12, borda de 1px `linha`, texto em `body-strong` `tinta`, com `Plus` (Phosphor, `regular`, 20px) à esquerda: `Adicionar frase`. Abre o formulário de nova frase, desenhado em outro prompt.
4. `space-5`, divisor de 1px `linha` de largura total.

### Item de frase

Um por frase, padding lateral `space-5`, `space-5` de padding vertical, divisor de 1px `linha` entre eles.

- **Texto da frase** em `body-lg` **Newsreader 400 italic** `tinta`, em blockquote com borda esquerda de 2px `musgo-fundo` e padding esquerdo `space-4`. Sem aspas decorativas grandes, sem ícone de aspas, sem limite de linhas: a frase aparece inteira, até 500 caracteres.
- `space-2` abaixo, alinhada ao texto da frase (depois da borda e do padding), uma linha de 48px de altura:
  - À esquerda, a referência em `caption` `grafite`: `Página 57 · @marina.antunes`. Na frase de quem olha, `Página 112 · você`. O `@username` é texto, não link, como na página do livro.
  - À direita, **só na frase de quem olha**, botão só de ícone `Trash` (Phosphor, `regular`, 20px, `grafite`), alvo de 48px, rótulo acessível `Excluir frase da página 112`. Abre a confirmação (4.2).
  - Frase de outro leitor não tem ícone nenhum à direita, nem `DotsThree`: não há ação sobre ela.
- Paginação por rolagem, com teto de itens imposto pelo servidor. Nada de botão `Carregar mais`, nada de numeração de página.

### 4.1 Padrão

`Torto Arado` com `14 frases`. Header com `ArrowLeft`, `Frases e trechos` e sino. Bloco do livro com a linha de cota `Você guardou 2 de 10 frases deste livro.` e `Adicionar frase`. Abaixo, as frases 1 a 4 visíveis; a frase 2 (`Página 112 · você`) com o `Trash` à direita, as outras sem ícone. A frase 5, também de quem olha, entra cortada no fim da viewport. Barra inferior com **Descobrir** ativo.

### 4.2 Confirmar exclusão

Base: 4.1, coberta pelo scrim `#171512` a 40%, depois do toque no `Trash` da frase 2.

- Bottom sheet de confirmação conforme design §4.11: fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo; padding inferior soma a área segura.
- Título em `title-sm` `tinta`: `Excluir esta frase?`
- `space-3`, a frase que vai sair, no mesmo blockquote do item, reduzida para `body` Newsreader 400 italic `tinta`, com a referência `Página 112 · você` abaixo em `caption` `grafite`. Quem confirma vê o que perde.
- `space-4`, a consequência em `body` `grafite`: `A frase sai desta lista e da página do livro. Não é possível desfazer.`
- `space-6`, dois botões empilhados em largura total, 48px, `space-3` entre eles: em cima o destrutivo em outline, `radius` 12, borda de 1px `rubi`, texto em `body-strong` `rubi`: `Excluir frase`; embaixo o textual `grafite`: `Cancelar`.
- O foco entra em `Cancelar`, nunca no destrutivo.

### 4.3 Frase excluída

O leitor confirmou. O sheet fechou e a lista mostra o resultado.

- Base: 4.1 sem a frase 2. A frase 3 subiu para o lugar dela.
- Bloco do livro atualizado: `13 frases` e `Você guardou 1 de 10 frases deste livro.`
- A saída da frase é um fade em `dur-base`, e as frases de baixo sobem em `dur-base` com `ease-in-out`. O artboard mostra o estado final.
- **Sem toast de sucesso e sem desfazer.** A confirmação é a frase fora da lista e a contagem atualizada.

### 4.4 Falha ao excluir

A exclusão não chegou ao servidor.

- Base: 4.2, com o sheet ainda aberto e os mesmos elementos.
- Abaixo de `Cancelar`, `space-3`, em `caption` `rubi`, com `Warning` (Phosphor, `regular`, 16px, `rubi`) à esquerda: `Não foi possível excluir a frase. Verifique sua conexão e tente de novo.`
- `Excluir frase` continua ativo, com o rótulo original. Tentar de novo não duplica nada: excluir é idempotente.
- A frase continua na lista atrás do scrim. Nada muda enquanto o servidor não confirmar.

### 4.5 Limite atingido

Quem olha já guardou 10 frases deste livro.

- Bloco do livro com `22 frases` e a linha de cota `Você guardou 10 de 10 frases deste livro.`
- **No lugar do botão `Adicionar frase`**, `space-3` abaixo da linha de cota, a explicação em `caption` `grafite`, com `Info` (Phosphor, `regular`, 16px, `grafite`) à esquerda: `Você chegou ao limite de 10 frases por livro. Exclua uma das suas para guardar outra.`
- **Não é erro.** Nada de `rubi`, nada de `ambar`, nada de banner, nada de botão desabilitado. É uma regra do produto, explicada no lugar em que o botão estaria.
- Abaixo, a lista normal, com o `Trash` em cada frase de quem olha.

### 4.6 Vazio

`Torto Arado` sem nenhuma frase. É o destino raro de `Ver todas as frases`, que normalmente só aparece com frases; o estado existe para quando a última frase foi excluída com a tela aberta.

- Bloco do livro com `0 frases` e a linha de cota `Você ainda não guardou frases deste livro. Cabem até 10.`, **sem** o botão `Adicionar frase` no bloco, porque o CTA vai para o estado vazio.
- Divisor, e abaixo um bloco centralizado com `space-6` entre os elementos e `space-10` de respiro acima:
  - `Quotes` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhuma frase ainda`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Guarde um trecho que marcou você, com a página em que ele está.`
  - Botão primário pill, 48px, `musgo`, texto `papel`: `Adicionar a primeira`.
- Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.

### 4.7 Carregando

- Header real, com o título.
- Bloco do livro em **skeleton estático**: retângulo `capa-placeholder` de 48 por 72px e três barras à direita (17px de altura a 60% de largura, 13px a 45%, 13px a 30%); abaixo, uma barra de 13px a 70% e o retângulo do botão com 48px de altura e `radius` 12. Tudo em `capa-placeholder`, barras com `radius-sm`.
- Abaixo, quatro itens em skeleton: uma borda vertical de 2px em `capa-placeholder` à esquerda e, ao lado, três barras de 17px (95%, 90% e 55% de largura) e uma barra curta de 13px a 35%.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** do serviço (RNF-ERR-09): demora não é erro.

### 4.8 Carregando mais

Lista rolada até a frase 7, no fim do que foi carregado.

- As frases de 4 a 7 visíveis e utilizáveis; o bloco do livro já saiu pelo topo e o header ganhou o divisor da base.
- Abaixo da frase 7, **dois itens de skeleton** no desenho de 4.7, com um único fade.
- **Nada muda no topo.** O carregamento incremental não recarrega a lista, não move o scroll e não substitui o conteúdo por skeleton inteiro.

### 4.9 Erro de carregamento

- Header real, com o título, sem bloco do livro.
- Banner inline, largura total menos o padding lateral, `space-4` abaixo do header, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda e `space-3` de gap.
- Texto em `body` `tinta`: `Não foi possível carregar as frases deste livro. Verifique sua conexão e tente de novo.`
- Abaixo, botão textual `musgo`: `Tentar de novo`.

**Variante sem artboard próprio, livro pessoal.** Num livro pessoal, só o dono cadastra e vê frases (RN-15): terceiros em modo consulta não chegam a esta tela, porque a página do livro pessoal não mostra a seção para eles. Para o dono, a tela é a mesma, e todas as referências dizem `você`. A linha de cota e o limite de 10 valem igual.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, com **Descobrir** ativo. Nos artboards do administrador (5.3 a 5.5), a sidebar tem o quinto item `Moderação`, inativo, separado por divisor.
- Área de conteúdo com padding lateral `space-8`, `max-width` de 1120px.
- **Header de conteúdo de 72px** com um botão textual de retorno à esquerda: `ArrowLeft` (Phosphor, `regular`, 20px) seguido de `Torto Arado`, em `body-strong` `musgo`. Volta à página do livro. Nada à direita e sem sino.
- **Duas colunas**, com `space-8` de gap:
  - **Coluna da esquerda, 280px, fixa ao rolar:** capa de 120 por 180px em retângulo de canto vivo, `elev-1`; `space-4`; `Torto Arado` em `title-lg` `tinta`; `Itamar Vieira Junior` em `body` `grafite`; `space-4`; a linha de cota em `caption` `grafite`; `space-4`; botão secundário de largura total, 40px, com `Plus`: `Adicionar frase`, que abre o formulário de nova frase em dialog. No limite, o botão dá lugar à explicação de 4.5.
  - **Coluna da direita:** título da tela `Frases e trechos` em `display` `tinta`, com `14 frases` em `caption` `grafite` ao lado, alinhado pela base; `space-6`; as frases em coluna única com `max-width` de 68ch, a mesma medida da seção na página do livro.
- **Item de frase na web:** o mesmo desenho do mobile, com o texto em `body-lg` Newsreader italic, `space-5` de padding vertical e divisor `linha`. A linha da referência tem 40px de altura. Na frase de quem olha, o `Trash` é botão só de ícone de 40 por 40px, `radius` 12, fundo transparente, ícone de 20px `grafite`, **sempre visível**, não só no hover. Hover no botão: fundo `linha` e ícone `rubi`, transição `dur-fast`. Hover na frase não muda nada: a frase não é clicável.
- **Confirmação na web:** dialog centrado de 480px, com o conteúdo de 4.2 e os botões lado a lado, alinhados à direita, `Cancelar` textual primeiro e o destrutivo em outline depois, os dois com 40px.
- Foco de teclado visível em retorno, `Adicionar frase` e cada `Trash`, com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px:** as duas colunas viram uma, na ordem bloco do livro e frases, no desenho do mobile; o retorno vira o `ArrowLeft` do header com o título `Frases e trechos`; a sidebar dá lugar à barra inferior, e o administrador deixa de ter a remoção, como no app.

### Ações do administrador na web

Só na conta de administrador. Nenhum leitor vê nada disto.

- **Faixa informativa neutra** conforme design §4.15, no topo da coluna da direita, entre o título e a primeira frase, `space-6` acima e abaixo: fundo `musgo-fundo`, `radius` 12, padding `space-4`, sem borda, `Info` (Phosphor, `regular`, 20px, `musgo`) à esquerda, texto em `body` `tinta`: `Você está vendo como administrador. Remover uma frase tira o trecho do livro para todos os leitores e fica registrado no log de moderação.` Não fecha, não some e não tem ação.
- **Em toda frase**, à direita da referência, um botão textual com 40px de altura, `radius` 12, padding lateral `space-3`, com `Trash` (Phosphor, `regular`, 16px, `rubi`) e o rótulo `Remover frase` em `caption` peso 600 `rubi`, `space-2` de gap. Hover: fundo `rubi-fundo`, transição `dur-fast`. Rótulo acessível `Remover frase de @joao.pedrosa, página 203`.
- A remoção é por texto e não só por ícone porque a ação vale para todos os leitores: o rótulo precisa estar visível.
- A coluna da esquerda do administrador não tem a linha de cota nem `Adicionar frase`: a conta de moderação não guarda frases (decisão a ratificar). Fica só a capa, o título e o autor.

### 5.1 Leitor, padrão, com hover no excluir

Sidebar com **Descobrir** ativo. Retorno `Torto Arado`. Coluna da esquerda com a capa, o título, o autor, `Você guardou 2 de 10 frases deste livro.` e `Adicionar frase`. Coluna da direita com `Frases e trechos` e `14 frases`, e as frases de 1 a 6 visíveis; a 7 entra cortada. As frases 2 e 5 (`você`) com o `Trash`; o cursor está sobre o `Trash` da frase 5, com fundo `linha` e ícone `rubi`.

### 5.2 Leitor, confirmar exclusão

Base: 5.1, coberta pelo scrim `#171512` a 40%. Dialog centrado de 480px com `Excluir esta frase?`, a frase 5 (`Tinha coisa que só a avó sabia dizer, e dizia olhando para o chão.`) com `Página 31 · você`, a consequência de 4.2, e `Cancelar` e `Excluir frase` lado a lado à direita. Foco visível em `Cancelar`.

### 5.3 Administrador, padrão

Sidebar da conta de administrador, com **Descobrir** ativo e `Moderação` inativo abaixo do divisor. Retorno `Torto Arado`. Coluna da esquerda só com capa, título e autor. Coluna da direita com `Frases e trechos` e `14 frases`, a faixa informativa neutra do administrador e as frases de 1 a 5, cada uma com `Remover frase` à direita da referência, **inclusive** as que no artboard do leitor diziam `você`: aqui elas mostram o `@username` da autora, `Página 112 · @beatriz.lemos` e `Página 31 · @beatriz.lemos`, porque quem olha é o administrador. Nenhum `Trash` só de ícone. O cursor está sobre `Remover frase` da frase 3, com fundo `rubi-fundo`.

### 5.4 Administrador, confirmar remoção

Base: 5.3, coberta pelo scrim. Dialog centrado de 480px:

- Título em `title-sm` `tinta`: `Remover esta frase?`
- `space-3`, a frase 3 no blockquote reduzido, com `Página 203 · @joao.pedrosa` abaixo.
- `space-4`, a consequência em `body` `grafite`: `O trecho sai deste livro para todos os leitores, inclusive para quem o guardou. A remoção fica registrada no log de moderação e não pode ser desfeita.`
- `space-6`, `Cancelar` textual e o destrutivo em outline `rubi`, `Remover frase`, lado a lado à direita, 40px. Foco em `Cancelar`.
- Não há campo de motivo: a remoção direta de frase não passa por denúncia (RN-11), e o log grava autor, alvo, ação e horário sem texto adicional.

### 5.5 Administrador, falha ao remover

A remoção não foi confirmada pelo serviço que guarda as frases.

- Base: 5.4, com o dialog ainda aberto.
- Entre a consequência e os botões, `space-4`, em `caption` `rubi` com `Warning` (Phosphor, `regular`, 16px, `rubi`) à esquerda: `Não foi possível remover a frase. Ela continua no livro. Tente de novo em instantes.`
- `Remover frase` continua ativo. A frase continua na lista atrás do scrim: nenhum estado local finge que ela saiu antes da confirmação.

### 5.6 Carregando

Coluna da esquerda em skeleton (retângulo de capa de 120 por 180px, duas barras de título e autor, uma de cota e o retângulo do botão), coluna da direita com a barra do título e cinco itens em skeleton no desenho de 4.7. Um único fade de entrada, sem shimmer.

**Variante sem artboard próprio, vazio na web:** coluna da esquerda sem `Adicionar frase`, coluna da direita com o bloco de 4.6 alinhado à esquerda, abaixo do título, e o botão `Adicionar a primeira` com 40px. Para o administrador, o vazio mostra só o título e o texto `Nenhuma frase neste livro.` em `body` `grafite`, sem botão.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Equivalente a 4.1. Fundo `noite`. `ArrowLeft`, título e sino em `papel-suave`. `Torto Arado` em `papel-suave`, autor, contagem e linha de cota em `grafite-claro`. Botão `Adicionar frase` com borda `linha-noite` e texto `papel-suave`. Texto das frases em Newsreader italic `papel-suave`, com a borda do blockquote em `musgo-fundo-escuro`. Referência em `grafite-claro`, `Trash` em `grafite-claro`. Divisores em `linha-noite`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com **Descobrir** em `musgo-claro`.
- **Mobile, confirmar exclusão.** Equivalente a 4.2. Scrim preto a 60%. Sheet em `noite-elevada` com alça `linha-noite`, título e frase em `papel-suave`, consequência em `grafite-claro`, destrutivo com borda e texto `rubi-claro`, `Cancelar` em `grafite-claro`.
- **Web, administrador, padrão.** Equivalente a 5.3. Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita e divisor antes de `Moderação` em `linha-noite`, lockup em `musgo-claro`, item **Descobrir** com fundo `musgo-fundo-escuro`. Retorno em `musgo-claro`. Faixa do administrador em `musgo-fundo-escuro`, com ícone e texto em `musgo-claro`. `Remover frase` com ícone e rótulo em `rubi-claro`; o hover usa `rubi-fundo-escuro`.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Blockquote de frase em Newsreader italic com borda esquerda de 2px e `Página N · @username` | documento-de-design §5.2 e §3.2.2; o desenho da borda e da referência nasceu na edição da página do livro do Período 2, incorporação pendente |
| Capa em retângulo de canto vivo | documento-de-design §4.5 e §7.6 |
| Bottom sheet e dialog de confirmação destrutiva, com foco em `Cancelar` | documento-de-design §4.11 e §7.8 |
| Botão primário pill, secundário, textual e destrutivo em outline | documento-de-design §4.1 |
| Faixa informativa neutra | documento-de-design §4.15 |
| Estado vazio com ícone, título, texto e CTA | documento-de-design §5.1 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md e documento-de-design §5 |
| Header de tela de detalhe com `ArrowLeft`, título e sino | nasceu nos prompts do Período 1 (F-PERFIL); incorporação pendente |
| Carregamento incremental com dois itens de skeleton no fim da lista | nasceu em periodo-1/F-PERFIL/seguidores-e-seguidos.md; incorporação pendente |
| Retorno textual nomeado no header de conteúdo da web | nasceu em periodo-2/F-LST/lista.md; incorporação pendente |

**Componentes que nascem aqui.** Nenhum deles está no `documento-de-design.md`, e todos precisam ser incorporados pelo controle de mudança (plano §3) antes de valerem como padrão:

1. **Item de frase em lista completa**, com a frase inteira, a referência numa linha de 48px (40px na web) e o `Trash` só na frase de quem olha.
2. **Linha de cota** (`Você guardou 2 de 10 frases deste livro.`) e a **explicação de limite no lugar do botão**, sem desabilitar e sem cor de alerta.
3. **Item `Moderação` na sidebar da conta de administrador**, com `ShieldCheck`, depois de um divisor, visível só para o admin. É o primeiro item de navegação ligado a papel; o §5 do design fala em quatro áreas.
4. **Ação de moderação em linha** (`Remover frase` textual em `rubi`, com ícone de 16px) e a **faixa de contexto do administrador**, reaproveitando o §4.15.
5. **Confirmação que mostra o conteúdo afetado**: a frase, reduzida, dentro do sheet ou do dialog, entre o título e a consequência.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Header mobile, título | `Frases e trechos` |
| `ArrowLeft`, rótulo acessível | `Voltar para Torto Arado` |
| Bloco do livro | `Torto Arado`, `Itamar Vieira Junior`, `14 frases` |
| Linha de cota | `Você guardou 2 de 10 frases deste livro.` |
| Linha de cota, sem frases próprias | `Você ainda não guardou frases deste livro. Cabem até 10.` |
| Linha de cota, no limite | `Você guardou 10 de 10 frases deste livro.` |
| Explicação do limite | `Você chegou ao limite de 10 frases por livro. Exclua uma das suas para guardar outra.` |
| Botão do bloco | `Adicionar frase` |
| Referência | `Página 57 · @marina.antunes`, `Página 112 · você`, `Página 203 · @joao.pedrosa`, `Página 146 · @leticia.nakamura`, `Página 31 · você`, `Página 88 · @caio.albuquerque`, `Página 19 · @renata.siqueira` |
| Referência vista pelo administrador | `Página 112 · @beatriz.lemos`, `Página 31 · @beatriz.lemos` |
| `Trash`, rótulo acessível | `Excluir frase da página 112` |
| Confirmação de exclusão, título | `Excluir esta frase?` |
| Confirmação de exclusão, consequência | `A frase sai desta lista e da página do livro. Não é possível desfazer.` |
| Confirmação de exclusão, botões | `Excluir frase`, `Cancelar` |
| Falha ao excluir | `Não foi possível excluir a frase. Verifique sua conexão e tente de novo.` |
| Vazio, título | `Nenhuma frase ainda` |
| Vazio, texto | `Guarde um trecho que marcou você, com a página em que ele está.` |
| Vazio, botão | `Adicionar a primeira` |
| Vazio do administrador | `Nenhuma frase neste livro.` |
| Erro de carregamento | `Não foi possível carregar as frases deste livro. Verifique sua conexão e tente de novo.` |
| Erro de carregamento, botão | `Tentar de novo` |
| Retorno da web | `Torto Arado` |
| Título da web | `Frases e trechos`, `14 frases` |
| Sidebar do administrador | `Moderação` |
| Faixa do administrador | `Você está vendo como administrador. Remover uma frase tira o trecho do livro para todos os leitores e fica registrado no log de moderação.` |
| Ação do administrador | `Remover frase` |
| Ação do administrador, rótulo acessível | `Remover frase de @joao.pedrosa, página 203` |
| Confirmação de remoção, título | `Remover esta frase?` |
| Confirmação de remoção, consequência | `O trecho sai deste livro para todos os leitores, inclusive para quem o guardou. A remoção fica registrada no log de moderação e não pode ser desfeita.` |
| Confirmação de remoção, botões | `Remover frase`, `Cancelar` |
| Falha ao remover | `Não foi possível remover a frase. Ela continua no livro. Tente de novo em instantes.` |

Frases de exemplo: as sete da seção 3, literais. Zero em-dash em toda a copy. Zero emoji. Todo número com unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no `ArrowLeft`, no sino, no `Trash` e em `Adicionar frase`. Na web, `Trash` de 40 por 40px e `Remover frase` com 40px de altura.
- **Excluir e remover sempre com confirmação** (RNF-USA-04), em sheet no mobile e dialog na web, com o foco entrando em `Cancelar`. `Esc` e toque no scrim fecham sem excluir. O foco volta ao elemento que abriu, ou, depois de excluir, à frase que ocupou o lugar da excluída.
- Leitor de tela lê cada frase como um bloco de citação, seguido da referência: `Citação: Aprendi cedo que o silêncio também é uma forma de dizer quem manda. Página 112, sua frase.` O botão lê `Excluir frase da página 112`; o do administrador lê autor e página.
- A exclusão concluída é anunciada: `Frase excluída. 13 frases.` A falha é anunciada como alerta.
- A linha de cota e a explicação do limite são texto, lido na ordem, não tooltip nem estado de botão desabilitado.
- A faixa do administrador é lida antes da primeira frase, como conteúdo.
- Contraste WCAG AA no corpo nos dois temas. Referência, cota e contagem usam `grafite`, não `grafite-suave`, porque são informação essencial. A borda `musgo-fundo` do blockquote é decorativa: a citação é comunicada pela semântica, não só pela borda.
- Na web, foco de teclado visível com contorno de 2px `musgo` e offset de 2px. Ordem de tabulação: sidebar, retorno, `Adicionar frase`, e em cada frase o botão de excluir ou de remover. A frase em si não recebe foco, porque não é interativa.
- `prefers-reduced-motion` respeitado: o fade de saída da frase, o deslize das de baixo e o fade do skeleton viram estáticos.
- O skeleton preserva a altura do layout para o conteúdo não saltar quando os dados chegam.
- O texto do sistema pode crescer: a frase quebra linha, a referência quebra para duas linhas com o botão alinhado ao topo, e nada corta.

---

## 10. O que não fazer nesta tela

**Escopo desta tela**

- **Não desenhe o formulário de nova frase aqui.** `Adicionar frase` só abre outro prompt.
- **Não desenhe curtir, comentar, compartilhar ou denunciar frase.** Frase não tem reação nem denúncia; a moderação a remove direto.
- Não desenhe `DotsThree` nem menu de ações na frase: a única ação é excluir a própria, e, na web do administrador, remover.
- Não desenhe editar frase. Para mudar o texto, o leitor exclui e guarda de novo.
- Não desenhe filtro, busca ou ordenação na lista. A ordem é da mais recente para a mais antiga.
- Não desenhe data, avatar nem nome completo do autor da frase. A referência é `Página N · @username`.
- Não desenhe `Remover frase` para leitor comum, nem no mobile para o administrador.
- Não desenhe campo de motivo na remoção pelo administrador, nem link para o painel de moderação dentro da tela.
- Não desenhe nota, estrelas, resenhas, sinopse ou ficha do livro. Esta tela é só de frases.
- Não desenhe o botão `Adicionar frase` desabilitado no limite: ele dá lugar à explicação.
- Não use `rubi` fora do excluir, do remover, das mensagens de falha e do banner de erro. Não use `ambar` em nada desta tela.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. Aqui a serifa é só o texto das frases; referência, cota, título e botões são Manrope.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção, e nada de eyebrow numerado do tipo "01 · SEÇÃO".
- Nada de aspas decorativas gigantes ou ícone de aspas ao lado da frase.

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira, nem card de citação com fundo de papel envelhecido.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético do tipo "Suas marcações" ou "Pérolas do livro". O que é frase se chama frase.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast de sucesso. O sucesso é a frase saindo da lista.
- Nada de toast com fundo saturado.

**Interações destrutivas**

- Nada de excluir ou remover sem confirmação.
- Nada de botão destrutivo preenchido em `rubi`.
- Nada de desfazer depois de excluir ou remover.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo e nada de frases em grid de cards: é coluna única de leitura, com 68ch.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. Excluir e remover ficam sempre visíveis.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "14" sozinho: é "14 frases".
- Nada de número fake-preciso.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação, nem "frase em destaque" ou "frase mais curtida".
- Sem ranking de leitores nem de frases.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo, nem trecho puxado de e-book.
