# F-LST · Adicionar à lista

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-LST.md
**Requisitos:** RF-LST-02 (adicionar e remover livros nas próprias listas; reordenar mora na lista), RF-LST-05 (adicionar os próprios livros pessoais às próprias listas)
**Não funcionais:** RNF-SEC-02 (só a dona altera as próprias listas, validado no servidor), RNF-SEC-06/07 (livro pessoal de outra pessoa não entra em lista alheia), RNF-DES-02 (as listas carregam paginadas), RNF-ERR-04 (adicionar e remover são idempotentes), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-15.1 (só o dono adiciona livro pessoal, e só às próprias listas), RN-15.2 e RN-15.5 (quem vê a lista vê o livro pessoal em modo consulta, sob a privacidade do perfil do dono), RN-03 (livro pessoal é exclusivo do dono)
**Versão web:** sim. RF-LST-02 e RF-LST-05 têm marcação na coluna Web de `REQUISITOS.md` §5.6.

---

## 1. Contexto

O sheet em que a leitora **põe o livro que está vendo nas listas dela**, ou o tira de lá. É aberto pelo item `Adicionar à lista` (`ListPlus`) do menu `Mais ações` da página do livro ([`../pagina-do-livro/pagina-do-livro.md`](../pagina-do-livro/pagina-do-livro.md), menu `DotsThree` no header no mobile e dropdown no canto do conteúdo na web). Mais tarde, a edição do livro pessoal abre o mesmo sheet a partir da página do livro pessoal do próprio dono (`livro-pessoal/livro-pessoal.md`, em outro lote).

**É o único caminho de um livro para dentro de uma lista.** Não existe busca de livros dentro da lista: a leitora encontra o livro (estante, Descobrir, feed) e, da página dele, escolhe as listas. Dentro da lista ela só reordena e remove.

**Para onde se vai:**

- Marcar ou desmarcar uma lista salva na hora, sem sair do sheet. O sheet fecha em `Fechar`, no scrim ou arrastando para baixo.
- `Criar lista`, no topo, fecha o sheet e abre o formulário `Nova lista` com este livro já indicado ([`criar-lista.md`](criar-lista.md)). Salvar lá cria a lista com o livro dentro e volta para a página do livro com um toast.
- O toast oferece `Ver lista`, que abre a lista (`F-LST/lista.md`, a desenhar em outro prompt).

**Plataforma.** Bottom sheet no mobile e dialog centrado de 480px na web, a mesma base de sobreposição modal. Os dois são o mesmo componente responsivo.

Três coisas que o sheet precisa resolver:

- **Mostrar onde o livro já está.** Cada lista diz se já contém o livro, e a marca muda de forma, não só de cor. Tocar numa lista marcada tira o livro dela; tocar numa desmarcada põe. Não existe o caso de "adicionar de novo": a marca impede.
- **Salvar sem botão de salvar.** Cada toque é uma operação completa, confirmada pela marca da linha. Não há `Salvar` no fim que a leitora possa esquecer, nem estado "marcado mas não salvo".
- **Livro pessoal é aceito, com consequência dita.** Se o livro é pessoal da própria leitora (RN-15.1), ele entra normalmente, e o sheet avisa que quem vê a lista vai ver o livro em modo consulta. Em livro pessoal de outra pessoa o sheet **não existe**: a página em modo consulta não tem o menu (RN-15.3).

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, na ordem em que a leitora os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Adicionar à lista · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
Este sheet abre sobre a página do livro, mas é um componente de sistema e
segue os dials 5 / 4 / 4.

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
  página do livro. Fora desses três, serifa não aparece. O sheet não tem
  serifa nenhuma.
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
radius 12. Capa de livro é a exceção declarada do sistema: retângulo de
canto vivo, sem raio nenhum.

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

SOBREPOSIÇÃO MODAL
Abaixo de 768px: bottom sheet ancorado embaixo, largura total, fundo papel no
claro e noite-elevada no escuro, radius-lg só no topo, padding space-6,
elev-3, alça de 32x4px em linha / linha-noite centralizada com space-5 acima
do conteúdo, padding inferior somando a área segura.
A partir de 768px: dialog centrado, 480px de largura, radius-xl nos quatro
cantos, sem alça, mesmo fundo e mesma elevação.
Scrim: #171512 a 40% no claro e preto a 60% no escuro (cor fixa).
Sheet sobe em dur-slow com ease-out; dialog entra em dur-base com deslize
curto de 16px e fade; os dois saem em dur-base com ease-in. Sob
prefers-reduced-motion entram e saem sem deslizar.
Foco preso dentro enquanto aberto, Esc e toque no scrim fecham, e o foco
volta ao elemento que abriu.

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

## 3. Dados que aparecem na tela

**Leitora:** `Marina Beltrão` (`@marinableu`), perfil público.

**Livro de origem nos artboards principais:** `Torto Arado`, de Itamar Vieira Junior, Todavia, 2019, `264 páginas`, capa real. Está na estante dela como `Lendo`.

**Listas da leitora**, na ordem em que aparecem (a mais recentemente alterada primeiro; a ordem é decisão deste prompt, a ratificar):

| Lista | Livros | Contém `Torto Arado` |
|---|---|---|
| Contos que eu indico | 7 livros | não |
| Autoras negras brasileiras | 6 livros | não |
| Clássicos brasileiros para reler | 8 livros | não |
| Para ler numa viagem | 4 livros | sim |
| Policiais para o fim de semana | 3 livros | não |
| Quero ler em 2027 | 0 livros | não |

São as mesmas listas do índice (`F-LST/listas-do-leitor.md`) e da lista (`F-LST/lista.md`). As contagens são mock declarado. A contagem da linha acompanha a marca: ao pôr `Torto Arado` em `Quero ler em 2027`, a linha passa a `1 livro`.

**Lista criada a partir do livro, para o toast:** `Romances do sertão`.

**Livro pessoal, para o artboard de RN-15.1:** `Contos da Rua Direita`, de Helena Prado, edição independente cadastrada pela própria Marina Beltrão como livro pessoal, **sem capa enviada**: a capa é o `capa-placeholder` com o título centralizado. Já está em `Contos que eu indico` (é o quinto livro daquela lista) e em nenhuma outra.

**O livro entra no fim da lista.** A posição dentro da lista se muda depois, na própria lista.

---

## 4. Artboards mobile (390 x 844)

### Base: a página do livro sob o sheet

O sheet abre sobre a página de `Torto Arado`, que é desenhada em outro canvas. Aqui ela aparece **só como contexto**, coberta pelo scrim `#171512` a 40%, e basta o topo dela:

- Header de 72px mais a área segura, fundo `papel`: `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda; à direita, `DotsThree` (Phosphor, `regular`, 24px, `tinta`) e depois o sino `Bell` (Phosphor, `regular`, 24px, `tinta`). Sem título no header.
- Hero centralizado: capa de `Torto Arado` com 180px de largura em proporção 2:3, canto vivo; abaixo, `space-5`, o título `Torto Arado` em `display` `tinta` e o autor em `body-lg` `grafite`, os dois centralizados. O resto da página fica escondido pelo sheet.
- **Barra inferior**, fixa no rodapé, sob o scrim: 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, quatro itens de largura igual com ícone de 24px acima e rótulo em `caption` abaixo: `Estante` (`Books`), `Descobrir` (`Compass`), `Feed` (`Newspaper`), `Perfil` (`UserCircle`). Inativo em `grafite` com ícone `regular`; **ativo `Estante`**, com ícone `fill` e rótulo peso 600 em `musgo`, porque a página foi aberta da estante.

### Anatomia do sheet

Bottom sheet conforme a sobreposição modal: fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha` centralizada com `space-5` acima do conteúdo, padding inferior somando a área segura. **Altura pelo conteúdo, até 85% da viewport.** Acima disso, a lista de listas rola dentro do sheet, e o cabeçalho e o `Fechar` ficam fixos.

De cima para baixo:

1. **Título do sheet** em `title-sm` `tinta`: `Adicionar à lista`.
2. `space-4`, **cabeçalho do livro**: capa de 48 por 72px, canto vivo; à direita, `space-3` de gap, título `Torto Arado` em `body-strong` `tinta` e autor `Itamar Vieira Junior` em `caption` `grafite`. Sem ação.
3. `space-2`, em `caption` `grafite`: `O livro entra no fim de cada lista que você marcar.`
4. `space-4`, divisor de 1px `linha`.
5. **Linha `Criar lista`**, 56px, largura total: `Plus` (Phosphor, `regular`, 20px, `musgo`) à esquerda, `space-4` de gap, rótulo `Criar lista` em `body` peso 600 `musgo`. Sem marca à direita. Divisor `linha` abaixo.
6. **Linhas de lista**, uma por lista, 64px, largura total, divisor `linha` entre elas:
   - À esquerda, empilhados: título da lista em `body-strong` `tinta`, uma linha só, com reticências; abaixo, a contagem em `caption` `grafite`: `12 livros`.
   - À direita, a **marca**, 24px, num alvo que é a linha inteira:
     - **Contém o livro:** `CheckCircle` (Phosphor, `fill`, 24px, `musgo`).
     - **Não contém:** `PlusCircle` (Phosphor, `regular`, 24px, `grafite`).
   - A marca muda de **forma e peso**, não só de cor.
   - Tocar na linha inteira alterna. Toque com `scale(0.98)` na linha e troca da marca em `dur-fast`.
7. `space-4` depois da última linha visível, botão textual `grafite` de largura total, 48px: `Fechar`.

**Carregamento incremental.** Quem tem muitas listas recebe as primeiras 20; ao rolar até o fim, três linhas em skeleton estático (retângulo `linha` de 60% da largura para o título e de 25% para a contagem, círculo `linha` de 24px no lugar da marca) aparecem e são substituídas pelas próximas. Sem botão `Carregar mais`.

### 4.1 Padrão

O sheet recém-aberto sobre a página de `Torto Arado`. As seis listas da seção 3, com `Para ler numa viagem` marcada (`CheckCircle` `musgo`) e as outras cinco com `PlusCircle` `grafite`. A última, `Quero ler em 2027`, fica rente ao `Fechar`. Nenhuma linha em andamento.

### 4.2 Adicionando

A leitora tocou em `Quero ler em 2027`.

- A marca da linha vira na hora `CheckCircle` `fill` `musgo`, e a contagem abaixo do título troca para `Adicionando` em `caption` `grafite`.
- A linha fica não acionável até a resposta, sem esmaecer o título.
- Sem spinner.
- As outras linhas continuam tocáveis: a leitora pode marcar várias em sequência.
- Confirmado pelo servidor, a contagem volta a aparecer já somada: `1 livro`. **A marca é a confirmação**: não há toast dentro do sheet.

### 4.3 Removendo

O mesmo gesto ao contrário, na linha `Para ler numa viagem`: a marca volta a `PlusCircle` `grafite`, a contagem troca para `Removendo` e, confirmado, passa a `3 livros`.

- **Tirar o livro por aqui não pede confirmação.** O gesto se desfaz com um toque na mesma linha, e o livro continua na estante e no acervo. O que se perde é só a posição dele na lista: se voltar, entra no fim. Esta decisão está a ratificar (seção 7).
- A remoção com confirmação, quando existir, mora na própria lista.

### 4.4 Falha ao adicionar

O servidor não respondeu ao toque em `Policiais para o fim de semana`.

- A marca **volta ao estado anterior** (`PlusCircle` `grafite`) e a contagem volta a `3 livros`.
- Abaixo da contagem, na mesma linha, que cresce para 84px, em `caption` `rubi`: `Não foi possível adicionar. Toque para tentar de novo.`
- Tocar na linha reenvia **a mesma solicitação** (RNF-ERR-04): se a primeira tiver chegado, o livro não entra duas vezes.
- A falha ao remover usa a mesma forma: `Não foi possível remover. Toque para tentar de novo.`
- Se o servidor demorar além de três segundos, a contagem de todas as linhas em andamento troca para `O serviço está iniciando.` em `caption` `grafite`. Não precisa de artboard.

### 4.5 Sem listas

A leitora ainda não criou nenhuma lista.

- Título, cabeçalho do livro e divisor como na anatomia, **sem** a linha `O livro entra no fim de cada lista que você marcar.`
- Linha `Criar lista`, como sempre.
- `space-4` abaixo, uma linha em `body` `grafite`, alinhada à esquerda, sem ícone, sem ilustração, sem caixa: `Você ainda não tem listas. Crie a primeira e este livro já entra nela.`
- `space-6`, `Fechar`.
- O sheet é baixo: cabe na metade de baixo da viewport.

### 4.6 Carregando

- Título, cabeçalho do livro e a linha `Criar lista` **reais**, já tocáveis: criar lista não depende do carregamento.
- No lugar das linhas de lista, quatro linhas em skeleton estático, com a forma do carregamento incremental. Um único fade de entrada, sem shimmer.

### 4.7 Erro ao carregar as listas

- Título, cabeçalho do livro e a linha `Criar lista` reais.
- No lugar das linhas, banner inline de largura total, fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Não foi possível carregar suas listas. Verifique sua conexão e tente de novo.` Abaixo do texto, botão textual `musgo`: `Tentar de novo`.
- `Fechar` abaixo do banner.

### 4.8 Livro pessoal da própria leitora

O sheet aberto sobre a página do livro pessoal `Contos da Rua Direita`, da própria Marina Beltrão (a entrada nessa página é desenhada em outro lote).

- Base: o topo da página do livro pessoal sob o scrim, com o `capa-placeholder` no lugar da capa e a etiqueta `Livro pessoal` (pill de 24px, fundo `musgo-fundo`, texto em `label` `musgo`) abaixo do título.
- Cabeçalho do sheet com o `capa-placeholder` de 48 por 72px, canto vivo, e o badge `PESSOAL` no canto inferior esquerdo, em `overline` (design §4.5). O título e o autor ao lado: `Contos da Rua Direita` e `Helena Prado`.
- `space-2` abaixo do cabeçalho, no lugar da linha sobre o fim da lista, a **faixa informativa neutra**: fundo `musgo-fundo`, `radius` 12, padding `space-4`, `Info` (Phosphor, `regular`, 20px, `musgo`), texto em `body` `tinta`: `Livro pessoal: quem puder ver a lista vê este livro em modo consulta, sem poder adicioná-lo à estante.` Não fecha e não tem ação.
- As seis listas, com `Contos que eu indico` marcada, porque o livro já está nela, e as outras com `PlusCircle`.

### 4.9 De volta à página do livro, lista criada

A leitora tocou em `Criar lista`, preencheu `Romances do sertão` no formulário e salvou. O formulário fechou e ela está de volta à página de `Torto Arado`, sem sheet e sem scrim.

- A base é o topo da página do livro descrito acima, agora sem scrim.
- **Toast de confirmação**, no rodapé, `space-4` acima da barra inferior e com `space-4` de margem lateral: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, **barra lateral fina de 4px em `musgo`** à esquerda, texto em `body` `tinta`: `Torto Arado entrou na lista Romances do sertão.` À direita, botão textual `musgo`: `Ver lista`.
- Entra de baixo em `dur-base` com `ease-out`; sai em `dur-base` com `ease-in`. Sob `prefers-reduced-motion`, aparece e some sem deslizar. **A duração não está definida** no documento de design (seção 7): no artboard ele aparece parado.
- Sem toast verde, sem ícone de check grande, sem comemoração.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Base: shell web e a página do livro sob o dialog

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px `linha`. Bloco do topo de 72px, padding lateral `space-5`, com o lockup horizontal da marca à esquerda (símbolo da folha sobre livro aberto seguido de `Lê Ai`, os dois em `musgo`, `space-3` de gap, 24px de altura) e `SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo, `space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro de padding lateral `space-3`: `Estante` (`Books`), `Descobrir` (`Compass`), `Feed` (`Newspaper`), `Perfil` (`UserCircle`). Cada item com 44px de altura, `radius` 12, padding lateral `space-4`, ícone de 20px, `space-3` de gap, rótulo em `body-strong`. Inativo: ícone `regular` e rótulo `grafite`. Ativo: fundo `musgo-fundo`, ícone `fill` e rótulo `musgo`. **Item ativo: `Estante`.** Nada no rodapé da sidebar.

**Sem sino na web.** Notificações estão fora do escopo do cliente web (`REQUISITOS.md` §2.1).

**Área de conteúdo.** À direita da sidebar, fundo `papel`, padding lateral `space-8`: a página de `Torto Arado` em duas colunas, **só como contexto**, coberta pelo scrim `#171512` a 40%. Na coluna esquerda de 280px, a capa com 280px de largura em proporção 2:3, canto vivo; na coluna direita, o título `Torto Arado` em `display-hero` `tinta` e o autor em `body-lg` `grafite`, e o `DotsThree` no canto superior direito do conteúdo. O resto da página em blocos neutros `papel-elevado`, sem texto legível. A página completa é desenhada em outro canvas.

### Anatomia do dialog

Dialog centrado na viewport, **480px de largura**, fundo `papel`, `radius-xl` nos quatro cantos, `elev-3`, padding `space-6`, sem alça. Altura pelo conteúdo, até 80% da viewport; acima disso as linhas de lista rolam dentro do dialog, com cabeçalho e rodapé fixos.

- **Cabeçalho:** `Adicionar à lista` em `title-lg` `tinta` à esquerda e `X` (Phosphor, `regular`, 20px, `grafite`) à direita num alvo de 40px, com rótulo acessível `Fechar`; hover com fundo `linha` e `radius` 12.
- `space-4`, o cabeçalho do livro com capa de 60 por 90px, título em `body-strong` e autor em `caption` `grafite`; `space-2`, a linha `O livro entra no fim de cada lista que você marcar.`
- Linha `Criar lista` e linhas de lista com a mesma anatomia do mobile, com **52px** de altura por linha e padding lateral `space-3` dentro do dialog. Hover da linha com fundo `linha` e `radius` 12, transição `dur-fast`. Clique e `Espaço` alternam.
- **Rodapé:** sem `Fechar` textual. `Esc`, clique no scrim e o `X` fecham. Nenhum botão `Salvar`: cada clique já salvou.
- **Foco de teclado:** as linhas são uma lista navegável com as setas para cima e para baixo, e `Tab` passa de `Criar lista` para a lista e dela para o `X`. Anel de foco de 2px `musgo` afastado 2px da linha.

**Abaixo de 768px** o dialog vira o bottom sheet do mobile. Entre 768px e 1024px a sidebar nasce retraída em 72px, e o dialog continua com 480px.

### 5.1 Padrão, com hover

O dialog recém-aberto a partir do dropdown `Mais ações`, com as seis listas de 4.1. O cursor está sobre `Clássicos brasileiros para reler`, que ganha fundo `linha`.

### 5.2 Adicionando e com foco de teclado

`Quero ler em 2027` em `Adicionando`, com a marca já em `CheckCircle`, e o foco de teclado visível na linha `Autoras negras brasileiras`. Serve para conferir que hover, foco e marcado são distinguíveis.

### 5.3 Sem listas

O 4.5 no dialog: título, livro, `Criar lista` e a linha `Você ainda não tem listas. Crie a primeira e este livro já entra nela.` O dialog é baixo.

### 5.4 De volta à página do livro, lista criada

A página de `Torto Arado` sem scrim, com o toast de 4.9 no **canto inferior esquerdo da área de conteúdo**, `space-6` acima da borda da viewport e `space-8` da sidebar, com no máximo 480px de largura: barra `musgo`, `Torto Arado entrou na lista Romances do sertão.` e `Ver lista`. Na web o toast ganha também um `X` (Phosphor, `regular`, 16px, `grafite`) com rótulo acessível `Fechar aviso`.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem. Os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

### 6.1 Padrão, mobile

O 4.1 no escuro:

- Página do livro em `noite` sob scrim preto a 60%. Barra inferior em `noite-elevada`, divisor `linha-noite`, `Estante` ativo em `musgo-claro`.
- Sheet em `noite-elevada`, **mais claro** que o fundo, alça em `linha-noite`.
- Título do sheet e títulos das listas em `papel-suave`; autor, contagens e a linha sobre o fim da lista em `grafite-claro`.
- `Criar lista` com ícone e rótulo em `musgo-claro`.
- Marca marcada em `CheckCircle` `fill` `musgo-claro`; desmarcada em `PlusCircle` `regular` `grafite-claro`.
- Divisores `linha-noite`. `Fechar` em `grafite-claro`.

### 6.2 Livro pessoal, mobile

O 4.8 no escuro, com o tratamento do 6.1 e a faixa informativa em `musgo-fundo-escuro`, ícone e texto em `musgo-claro`.

### 6.3 Padrão, web

O 5.1 no escuro: sidebar em `noite-elevada` com borda direita `linha-noite` e `Estante` ativo com fundo `musgo-fundo-escuro` e ícone e rótulo em `musgo-claro`; página em `noite` sob scrim preto a 60%; dialog em `noite-elevada` com o tratamento do 6.1; hover da linha com fundo `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Bottom sheet e dialog centrado de 480px | documento-de-design §4.11 |
| Linha `Criar lista` e linhas de 56px com ícone Phosphor de 20px | documento-de-design §4.11 (menu de ações) |
| Botão textual | documento-de-design §4.1 |
| Faixa informativa neutra | documento-de-design §4.15 |
| Etiqueta `Livro pessoal` e badge `PESSOAL` na capa | documento-de-design §4.17 e §4.5 |
| Banner inline de erro em `rubi-fundo` | documento-de-design §4.2 e prompts do Período 1 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6 |
| Skeleton estático com um único fade | documento-de-design §3.6 |
| Escala tipográfica | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Shell, barra inferior e sidebar | ../../periodo-0/P0-NAV/shell-de-navegacao.md |
| Menu `Mais ações` que abre este sheet | ../pagina-do-livro/pagina-do-livro.md, seção 5.1 e 5.6 |
| Carregamento incremental com skeleton no fim da lista | nasceu nos prompts do Período 1, incorporação pendente |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Linha de seleção múltipla com salvamento imediato**: título, contagem e marca `CheckCircle` `fill` / `PlusCircle` `regular` à direita, com os estados `Adicionando`, `Removendo` e falha inline em `rubi` dentro da própria linha. O §4.11 só define o menu de ações, em que cada item dispara uma ação e fecha.
2. **Sheet de seleção sem botão de salvar**, fechado por `Fechar` textual, com altura pelo conteúdo até 85% da viewport e cabeçalho fixo.
3. **Cabeçalho compacto de livro com capa de 48 por 72px** dentro do sheet (o §5.4 usa 60 por 90).
4. **Toast de confirmação com ação** (`Ver lista`) e a sua posição: acima da barra inferior no mobile, canto inferior esquerdo do conteúdo na web. O §7.6 define só a forma, sem posição, duração nem ação.

**Decisões deste prompt, a ratificar com o dono da feature:**

- **Remover pelo sheet sem confirmação** (4.3): o gesto se desfaz com um toque, mas a posição na lista se perde. RNF-USA-04 pede confirmação em ação destrutiva; aqui o desenho trata remover da lista como reversível.
- **Readicionar livro já presente:** a marca impede o caso na interface, mas o comportamento do servidor (ignorar sem erro ou recusar) continua em aberto, como já registrado em `feature-F-LST.md`. O desenho supõe que repetir o mesmo pedido não cria item duplicado.
- **Ordem das listas no sheet:** a mais recentemente alterada primeiro. O requisito não fixa.
- **Posição de entrada do livro:** no fim da lista. O requisito não fixa.
- **Duração do toast** não definida no documento de design.

**Conflito de contrato:** o sheet precisa saber, para cada lista da leitora, se ela **já contém** o livro aberto. `GET /perfis/{usuarioId}/listas?page=` devolve as listas, mas não esse dado. Ou o endpoint aceita o livro como parâmetro e devolve a marca, ou nasce uma consulta própria (listas da leitora que contêm o livro). Também a **contagem de livros** por lista precisa vir na listagem.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do sheet e do dialog | `Adicionar à lista` |
| Cabeçalho do livro | `Torto Arado` · `Itamar Vieira Junior` · `Contos da Rua Direita` · `Helena Prado` |
| Linha sobre a posição | `O livro entra no fim de cada lista que você marcar.` |
| Linha de criar | `Criar lista` |
| Listas | `Contos que eu indico` · `Autoras negras brasileiras` · `Clássicos brasileiros para reler` · `Para ler numa viagem` · `Policiais para o fim de semana` · `Quero ler em 2027` |
| Contagens | `7 livros` · `6 livros` · `8 livros` · `4 livros` · `3 livros` · `0 livros` · `1 livro` |
| Linha em andamento | `Adicionando` · `Removendo` |
| Falha na linha | `Não foi possível adicionar. Toque para tentar de novo.` · `Não foi possível remover. Toque para tentar de novo.` |
| Cold start | `O serviço está iniciando.` |
| Sem listas | `Você ainda não tem listas. Crie a primeira e este livro já entra nela.` |
| Erro ao carregar | `Não foi possível carregar suas listas. Verifique sua conexão e tente de novo.` |
| Ação do erro | `Tentar de novo` |
| Faixa, livro pessoal | `Livro pessoal: quem puder ver a lista vê este livro em modo consulta, sem poder adicioná-lo à estante.` |
| Etiqueta e badge, livro pessoal | `Livro pessoal` · `PESSOAL` |
| Fechar | `Fechar` |
| `X` do dialog, rótulo acessível | `Fechar` |
| Toast | `Torto Arado entrou na lista Romances do sertão.` |
| Ação do toast | `Ver lista` |
| `X` do toast na web, rótulo acessível | `Fechar aviso` |
| Rótulo acessível da linha marcada | `Para ler numa viagem, 4 livros. Torto Arado está nesta lista. Tocar remove.` |
| Rótulo acessível da linha desmarcada | `Quero ler em 2027, 0 livros. Torto Arado não está nesta lista. Tocar adiciona.` |

---

## 9. Acessibilidade e interação

- **Alvo de toque:** as linhas têm 64px e são inteiras tocáveis no mobile; `Criar lista` e `Fechar` têm 56px e 48px. Na web, 52px por linha e 40px no `X`.
- **As linhas são caixas de seleção** para leitor de tela, com o estado anunciado (`marcada` ou `não marcada`) e o rótulo da seção 8. O estado não depende só da cor: a marca muda de forma (`CheckCircle` e `PlusCircle`) e de peso (`fill` e `regular`).
- **Mudança anunciada.** `Adicionando`, a confirmação e a falha de cada linha são anunciadas por região viva educada, para quem não está olhando a marca.
- **Foco:** ao abrir, o foco vai para o título do sheet ou do dialog; fica preso dentro enquanto aberto e volta ao `DotsThree` que abriu quando fecha. Ao voltar da criação, o foco vai para o toast, e `Ver lista` é alcançável pelo teclado.
- **Contraste:** títulos em `tinta` e contagens em `grafite` sobre `papel` passam em AA; a marca desmarcada em `grafite` passa como elemento gráfico. No escuro, `papel-suave`, `grafite-claro` e `musgo-claro`.
- **Motion:** sheet em `dur-slow` na entrada e `dur-base` na saída; dialog com deslize de 16px e fade em `dur-base`; troca de marca em `dur-fast`; toast em `dur-base`; press da linha em `scale(0.98)`. Tudo estático sob `prefers-reduced-motion`.
- **Texto grande:** com o escalonamento de fonte do sistema aumentado, o título da lista quebra em duas linhas em vez de cortar, e a linha cresce; a marca continua centrada na vertical.
- **Nenhuma ação destrutiva irreversível** nesta tela: tirar o livro de uma lista se desfaz com um toque na mesma linha.

---

## 10. O que não fazer nesta tela

**Específico desta tela**

- **Não ponha botão `Salvar`, `Concluir` nem `Adicionar` no fim.** Cada toque já salvou.
- **Não use checkbox quadrado de formulário nem switch** na linha. A marca é `CheckCircle` e `PlusCircle`, na direita.
- **Não mostre a mesma lista duas vezes** nem uma segunda marca de "adicionar de novo" numa lista que já contém o livro.
- **Não mostre listas de outros leitores.** O sheet só tem as listas da própria leitora.
- **Não desenhe este sheet sobre livro pessoal de outra pessoa.** Em modo consulta ele não existe (RN-15.3).
- **Não ofereça reordenar aqui.** A posição dentro da lista se muda na lista.
- **Não ponha busca de listas, filtro nem ordenação** no sheet.
- **Não desenhe o formulário de criar lista dentro do sheet.** `Criar lista` abre o formulário, que é outra tela.
- **Não mostre toast a cada marca.** A marca da linha é a confirmação; o toast só aparece ao voltar da criação.
- **Não diga que a lista vai para o feed nem que alguém será notificado.** Listas não geram atividade nem notificação.
- **Não mostre capas das listas nem mosaico** nas linhas: é uma lista de nomes, para escolher rápido.
- **Não desenhe a página do livro inteira.** Ela é contexto e mora em outro canvas.

**Tipografia (design §7.1)**

- Não use Inter como fonte de interface: a UI é Manrope.
- Não use Instrument Serif nem Fraunces. A serifa do produto é Newsreader, e ela não aparece neste sheet.
- Não misture família dentro de um título: ênfase é itálico da mesma família.
- Não ponha overline sobre o título do sheet. O único overline da tela é o badge `PESSOAL` na capa.
- Não use eyebrow numerado.

**Cores e superfícies (design §7.2)**

- Não use a família bege quente com latão, oxblood e expresso. O acento é `musgo`.
- Não use gradiente roxo, rosa ou azul, nem mesh, nem glow neon.
- Não use gradiente em botão nem em texto de título.
- Não use sombra preta pura nem `#000000` em lugar nenhum.
- Não use textura de papel ou de madeira no fundo.
- Não pinte cada lista com uma cor. Todas as linhas têm o mesmo tratamento.

**Layout (design §7.3)**

- Não abra uma página inteira na web para escolher listas: é o dialog de 480px.
- Não deixe a marca aparecer só em hover na web.
- Não deixe de colapsar: abaixo de 768px o dialog vira o sheet.

**Motion (design §7.4)**

- Nada de scroll hijacking, parallax ou marquee.
- Nada de loop infinito, spinner ou ícone que pulsa. Em andamento é o texto da contagem mudando.
- Nada de animação de check que desenha, salta ou solta partícula.

**Conteúdo e copy (design §7.5)**

- Zero em-dash em qualquer texto visível. Use dois pontos, vírgula ou reescreva.
- Nada de número fake-preciso. As contagens são mock declarado e sempre aparecem com unidade: `12 livros`, `1 livro`.
- Nada de label poético: `Adicionar à lista`, não "Guardar na coleção".
- Nada de nomes genéricos como "Lista 1" ou "Minha lista" nos dados.
- Nada de emoji na copy nem nos nomes das listas.

**Componentes e assets (design §7.6)**

- Nada de ícone desenhado à mão: todos os ícones são Phosphor.
- Nada de raio na capa do livro: retângulo de canto vivo.
- Nada de ícone de livro genérico no lugar de capa ausente: o placeholder mostra o título.
- Nada de toast com fundo saturado verde ou vermelho: toast é `papel-elevado` com barra lateral fina `musgo`.

**Modo escuro (design §7.7)**

- Nada de fundo `#000000`: o fundo é `noite`.
- Nada de só inverter a paleta: no escuro o sheet e o dialog são `noite-elevada`, mais claros que o fundo, e o acento é `musgo-claro`.
- Nada de meia tela clara e meia escura.

**Métricas e dados (design §7.10)**

- Nada de contagem sem unidade.

**Landing e web (design §7.11)**

- Nada de botão flutuante de "nova lista" nem faixa decorativa.

**Fora de escopo por decisão (design §7.12)**

- Nada de camada de obra, login social, mensagem direta, clube de leitura, grupo, fórum, leitura de e-book, medalha, conquista ou ranking.
