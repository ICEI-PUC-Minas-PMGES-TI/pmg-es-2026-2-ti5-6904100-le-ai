# F-LST · Lista

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-LST.md
**Requisitos:** RF-LST-02 (remover e reordenar livros nas suas listas; adicionar acontece fora desta tela), RF-LST-04 (ver listas de outros leitores respeitando a privacidade do perfil), RF-LST-05 (livro pessoal do próprio dono dentro da lista dele), RF-LST-06 (livro pessoal na lista de outro leitor abre em modo consulta, sem ação de estante)
**Não funcionais:** RNF-SEC-02 (só o dono reordena e remove, validado no servidor), RNF-SEC-03 (lista de perfil privado só para seguidor aceito), RNF-SEC-06/07 (livro pessoal fora de busca; terceiros não agem sobre ele), RNF-SEC-14 (título e descrição tratados como texto), RNF-DES-02 (itens paginados com teto do servidor), RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-08 (listas seguem a privacidade do perfil do dono), RN-15 (livro pessoal em listas: só o dono inclui, terceiros consultam), RN-03 (página de livro pessoal para terceiros), RN-14.4 (ordem de resolução da capa)
**Versão web:** sim. RF-LST-02, 04, 05 e 06 têm marcação na coluna Web de `REQUISITOS.md` §5.6.
**De onde se chega:** do índice de listas de um leitor (`F-LST/listas-do-leitor.md`, a seção `Listas` do perfil no mobile e a aba `Listas` do perfil na web). O índice e as mudanças no perfil são desenhados em outros prompts. Daqui se vai à página do livro, à página do livro pessoal em modo consulta, ao perfil do dono e à edição da lista (`F-LST/criar-lista.md`, em modo edição).

---

## 1. Contexto

A lista é o **pertencimento** em forma de curadoria: um leitor junta livros sob um título, explica o porquê e põe numa ordem que diz alguma coisa ("por onde começar", "do mais curto ao mais longo"). É o jeito de o leitor dizer o que recomenda sem escrever uma resenha para cada livro, e de quem segue ver o gosto dele organizado.

A mesma tela tem dois modos, e o que muda entre eles é **quem está olhando**:

- **Dono.** Vê a lista dele, **reordena** e **remove** livros, e abre a edição de título e descrição. **Não adiciona livros daqui:** livro entra numa lista pela página do livro, no item `Adicionar à lista` do menu de ações. A lista vazia do dono aponta para o Descobrir.
- **Outro leitor.** Só lê. Se o perfil do dono é privado e quem olha não é seguidor aceito, a tela não mostra nada da lista, nem o título (RN-08).

Três coisas que a tela precisa resolver:

- **A ordem é conteúdo.** A posição de cada livro aparece numerada, e é por ela que a lista se lê. Reordenar é a operação principal do dono, e precisa funcionar por gesto no celular e por arrastar ou por botão na web, com a alternativa acessível sempre presente.
- **Livro pessoal é visível, mas não é acionável para terceiros.** O dono pode ter posto na lista um livro pessoal dele (RN-15.1). Quem não é o dono vê o livro com o badge `PESSOAL` na capa e, ao tocar, abre a página daquele livro em **modo consulta**: metadados, capa, nota e resenha do dono, sem adicionar à estante, sem favoritar, sem iniciar leitura (RN-15.2 e RN-15.3). Esta tela não oferece ação de estante em livro nenhum, oficial ou pessoal.
- **Privacidade herdada.** A lista não tem privacidade própria: ela segue o perfil do dono. O dono vê numa linha a quem a lista está visível, e o terceiro sem acesso vê o bloco de restrição, sem capa, sem título e sem contagem.

Listas não geram atividade no feed nem notificação. Nada nesta tela avisa alguém de alguma coisa.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Lista · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
```

---

## 3. Dados que aparecem na tela

**Lista do dono**, usada nos artboards do dono. A dona é `Marina Beltrão` (`@marinableu`), perfil público.

| Campo | Valor |
|---|---|
| Título | `Contos que eu indico` |
| Descrição | `Livros de contos para quem acha que não gosta de conto. Em ordem de por onde começar.` |
| Contagem | `7 livros` |
| Atualização | `atualizada em 12 de setembro de 2026` |
| Visibilidade | perfil público: `Seu perfil é público: qualquer leitor pode ver esta lista.` |

| Posição | Título | Autor | Observação |
|---|---|---|---|
| 1 | Olhos d'Água | Conceição Evaristo | |
| 2 | Laços de Família | Clarice Lispector | |
| 3 | Sagarana | João Guimarães Rosa | |
| 4 | Várias Histórias | Machado de Assis | |
| 5 | Contos da Rua Direita | Helena Prado | **livro pessoal da Marina** (edição independente, fora do acervo), sem capa enviada: `capa-placeholder` com badge `PESSOAL` |
| 6 | Morangos Mofados | Caio Fernando Abreu | |
| 7 | A Cidade Ilhada | Milton Hatoum | |

**Lista vazia do dono:** `Quero ler em 2027`, sem descrição, `0 livros`.

**Lista de outro leitor, perfil público**, usada nos artboards de terceiro. O dono é `Rafael Okamoto` (`@rafaokamoto`), que quem olha segue.

| Campo | Valor |
|---|---|
| Título | `Para entender o Brasil` |
| Descrição | `Ensaios e romances que uso em sala de aula. A ordem é a que eu sugiro para ler.` |
| Contagem | `12 livros` |
| Atualização | `atualizada em 03 de agosto de 2026` |

| Posição | Título | Autor | Observação |
|---|---|---|---|
| 1 | Raízes do Brasil | Sérgio Buarque de Holanda | |
| 2 | Casa-Grande e Senzala | Gilberto Freyre | |
| 3 | Os Sertões | Euclides da Cunha | |
| 4 | Formação do Brasil Contemporâneo | Caio Prado Júnior | livro do acervo sem capa: `capa-placeholder` pelo terceiro nível de RN-14.4, sem badge |
| 5 | Crônicas de Mariana | Waldemar Moura | **livro pessoal do Rafael**, com capa enviada por ele e badge `PESSOAL` |
| 6 | O Cortiço | Aluísio Azevedo | |
| 7 | Memórias Póstumas de Brás Cubas | Machado de Assis | |
| 8 a 12 | Vidas Secas, Capitães da Areia, Quarto de Despejo, Torto Arado, Um Defeito de Cor | | carregados na rolagem |

**Perfil privado sem acesso:** `Beatriz Nogueira` (`@bia.nogueira`). Quem olha não é seguidor aceito. Nenhum dado da lista aparece.

**O caso que a tela precisa provar:** `Formação do Brasil Contemporâneo` e `Crônicas de Mariana` estão lado a lado na lista do Rafael. O primeiro é livro do acervo sem capa (placeholder, sem badge); o segundo é livro pessoal (badge `PESSOAL`). Os dois abrem páginas diferentes: o primeiro a página do livro, o segundo a página do livro pessoal em modo consulta.

**Nenhuma nota aparece** nos itens. Nem a do dono, nem a agregada. A nota mora na página do livro.

Todo número aparece com unidade. Nenhum valor é fake-preciso.

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
que salta. **Nesta tela o item ativo é `Perfil`** nos artboards do dono. Nos
artboards de outro leitor, o item ativo é o da área de onde se chegou ao
perfil dele; aqui, `Feed`.

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
ativo segue a mesma regra do mobile:** `Perfil` para o dono, a área de
origem para outro leitor.

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

Header de tela de detalhe, empilhada sobre o índice de listas.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando ao índice de listas.
- **Sem título no header.** O título da lista aparece grande logo abaixo, no bloco da lista, como o nome no perfil de outro leitor. Títulos de lista são longos e não cabem ao lado da seta e do sino.
- `Bell` à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Bloco da lista

Logo abaixo do header, padding lateral `space-5`, `space-2` de respiro acima, alinhado à esquerda.

1. Título da lista em `title-lg` `tinta`, até três linhas, sem corte no meio da palavra.
2. `space-2`, descrição em `body` `grafite`, sem limite de linhas. Descrição ausente: a linha some e nada ocupa o lugar dela.
3. `space-3`, **linha de dono** (só para outro leitor): avatar circular de 24px, `space-2` de gap e, em `caption` `grafite`, `Lista de ` seguido do nome em `caption` peso 600 `musgo`: `Lista de Rafael Okamoto`. O nome é link para o perfil do dono; o resto da frase não é. Mesmo desenho da linha de atribuição do design §4.18, com outro texto.
4. `space-3`, **linha de visibilidade** (só para o dono): `Globe` (Phosphor, `regular`, 16px, `grafite`) e, em `caption` `grafite`, `Seu perfil é público: qualquer leitor pode ver esta lista.`; com perfil privado, `Lock` 16px e `Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.`. A lista não tem controle de privacidade próprio, e a linha existe para o dono não achar que tem.
5. `space-3`, **linha de contagem** em `caption` `grafite`: `7 livros · atualizada em 12 de setembro de 2026`, com o número em `num-inline` no tamanho do `caption`.
6. **Ações do dono**, `space-4` abaixo da contagem, numa linha com `space-3` de gap:
   - Botão secundário, `radius` 12, 48px, borda de 1px `linha`, texto `body-strong` `tinta`, com `PencilSimple` (Phosphor, `regular`, 20px) à esquerda: `Editar lista`. Abre `F-LST/criar-lista.md` em modo edição, onde fica também a exclusão da lista.
   - Botão secundário igual, com `ArrowsDownUp` (Phosphor, `regular`, 20px): `Reordenar`. Entra no modo de reordenação (4.3). Some quando a lista tem menos de dois livros.
   - Outro leitor não tem linha de ações.
7. `space-5`, divisor de 1px `linha` de largura total.

### Linha de livro

Uma por item, na ordem da lista, padding lateral `space-5`, `space-4` de padding vertical, divisor de 1px `linha` entre elas.

- À esquerda, a **posição** em `num-inline` `grafite`, numa coluna de 24px alinhada à direita: `1`, `2`, `3`. A posição é o que diz que a ordem importa.
- `space-3` de gap, capa de 48 por 72px, retângulo de canto vivo, sem sombra. Capa ausente de livro do acervo: `capa-placeholder` com o título em `title-sm` `tinta` centralizado (reduzido para caber, sem cortar no meio da palavra), conforme design §4.5. Livro pessoal: badge `PESSOAL` em `overline` no canto inferior esquerdo da capa, sobre fundo `papel` a 90%, conforme design §4.5.
- `space-4` de gap, a coluna de texto: título em `title-sm` `tinta` com no máximo duas linhas; autor em `caption` `grafite` com uma linha.
- À direita:
  - **Dono:** `DotsThree` (Phosphor, `regular`, 24px, `grafite`) com alvo de 48px, que abre o menu do item (4.2).
  - **Outro leitor:** `CaretRight` (Phosphor, `regular`, 20px, `grafite`), centralizado na altura da linha.
- A linha inteira, fora do `DotsThree`, é a área acionável e abre a página do livro. Para livro pessoal na lista de outro leitor, abre a página do livro pessoal em **modo consulta**, com a lista como via de acesso. Para livro pessoal na lista do próprio dono, abre a página normal do livro pessoal dele.
- **Nenhum status pill, nenhuma nota, nenhum botão de estante** na linha, nem para o dono. A lista não é a estante.
- Paginação por rolagem, com teto de itens imposto pelo servidor. Nada de botão `Carregar mais`, nada de numeração de página.

### 4.1 Dono, padrão

Lista `Contos que eu indico` da Marina. Header com `ArrowLeft` e sino. Bloco da lista com título, descrição, linha de visibilidade `Seu perfil é público: qualquer leitor pode ver esta lista.`, contagem `7 livros · atualizada em 12 de setembro de 2026` e as ações `Editar lista` e `Reordenar`. Abaixo, as linhas de 1 a 5 visíveis, com `Contos da Rua Direita` em placeholder e badge `PESSOAL` na posição 5; a linha 6 entra cortada no fim da viewport. Cada linha com `DotsThree` à direita. Barra inferior com **Perfil** ativo.

### 4.2 Dono, menu do item aberto

Base: 4.1, coberta pelo scrim, com o menu do item `Sagarana` aberto.

- Scrim `#171512` a 40%.
- Bottom sheet conforme design §4.11: fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo; padding inferior soma a área segura.
- Cabeçalho do sheet: capa de 48 por 72px em canto vivo, `space-4` de gap, `Sagarana` em `title-sm` `tinta` e `João Guimarães Rosa` em `caption` `grafite`, e abaixo `Posição 3 de 7` em `caption` `grafite`. Divisor `linha` abaixo.
- Três itens de 56px, ícone Phosphor `regular` de 20px e rótulo em `body`, `space-4` de gap, divisor `linha` entre eles:
  - `ArrowUp` · `Mover para cima`, em `tinta`.
  - `ArrowDown` · `Mover para baixo`, em `tinta`.
  - `MinusCircle` · `Remover da lista`, ícone e rótulo em `rubi`, por último.
- `space-4` abaixo, botão textual `grafite` de largura total: `Cancelar`.
- No primeiro item da lista, `Mover para cima` não aparece; no último, `Mover para baixo` não aparece. O menu não mostra item desabilitado.
- `Mover para cima` e `Mover para baixo` trocam o livro de posição com o vizinho, salvam na hora e fecham o sheet. São a alternativa acessível ao arrastar, e ficam disponíveis fora do modo de reordenação.
- `Remover da lista` **não pede confirmação**: tira o livro desta lista e de nenhum outro lugar. O livro continua na estante, na página dele e nas outras listas. A linha sai com um fade de saída em `dur-base`, as posições de baixo sobem um número e a contagem passa a `6 livros`. Sem toast de sucesso e sem desfazer: o sucesso é a linha sumindo.

### 4.3 Dono, reordenando

O leitor tocou em `Reordenar` e está arrastando `Sagarana` da posição 3 para a posição 2.

- Bloco da lista igual, mas a linha de ações troca: no lugar de `Editar lista` e `Reordenar`, um único botão primário pill `musgo`, 48px, texto `papel`, com `Check` (Phosphor, `bold`, 20px): `Concluir`. Abaixo dele, `space-2`, em `caption` `grafite`: `Arraste pela alça para mudar a ordem.`
- Em cada linha, o `DotsThree` dá lugar à **alça** `DotsSixVertical` (Phosphor, `regular`, 24px, `grafite`) à direita, com alvo de 48px. O arraste começa só pela alça, para a rolagem da lista continuar funcionando no resto da linha.
- A linha em arraste (`Sagarana`) fica levantada: fundo `papel-elevado`, `elev-2`, alça em `musgo`, sem inclinação e sem mudança de escala. As outras linhas abrem espaço para ela com um deslize de `dur-fast` em `ease-in-out`.
- No ponto de soltura, uma **linha de inserção** de 2px `musgo` de largura total menos o padding lateral, entre as posições 1 e 2.
- As posições numeradas só mudam quando o livro é solto. Ao soltar, a nova ordem é salva na hora, sem botão de salvar; `Concluir` só sai do modo.
- No modo de reordenação a lista inteira fica carregada, para que o livro possa ir a qualquer posição.
- Tocar na linha fora da alça não abre a página do livro enquanto o modo está ativo.

### 4.4 Dono, falha ao salvar a ordem

A nova ordem não chegou ao servidor. A lista volta à ordem anterior, e o leitor precisa saber disso.

- Base: 4.3 depois de soltar, com o modo de reordenação ainda ativo e as linhas **de volta à ordem anterior** (`Sagarana` de novo na posição 3).
- Toast no rodapé, acima da barra inferior, com `space-4` de margem lateral: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, **barra lateral fina de 4px em `rubi`** à esquerda, texto em `body` `tinta`: `Não foi possível salvar a nova ordem. A lista voltou como estava.` À direita, botão textual `musgo`: `Tentar de novo`, que reenvia a mesma mudança.
- O toast entra de baixo em `dur-base` com `ease-out` e fica até o leitor tocar em `Tentar de novo` ou em `X` (Phosphor, `regular`, 20px, `grafite`). Não some sozinho num tempo fixo.
- Nunca fica ordem parcial: ou a mudança inteira foi salva, ou nada mudou.

### 4.5 Dono, lista vazia

Lista `Quero ler em 2027`, recém-criada, sem descrição.

- Bloco da lista com o título, a linha de visibilidade, contagem `0 livros` e só o botão `Editar lista`: `Reordenar` não aparece.
- No lugar das linhas, bloco centralizado com `space-6` entre os elementos:
  - `ListPlus` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Esta lista ainda está vazia`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Abra a página de um livro e escolha Adicionar à lista no menu de ações.`
  - Botão primário pill, 48px, `musgo`, texto `papel`: `Buscar livros`, que leva ao `Descobrir`.
- Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.

### 4.6 Outro leitor, perfil público

Lista `Para entender o Brasil` do Rafael.

- Header com `ArrowLeft` e sino.
- Bloco da lista com título, descrição, linha de dono `Lista de Rafael Okamoto`, contagem `12 livros · atualizada em 03 de agosto de 2026`. Sem linha de visibilidade e sem ações.
- Linhas de 1 a 6 visíveis, cada uma com `CaretRight`. Na posição 4, `Formação do Brasil Contemporâneo` em placeholder, **sem** badge; na posição 5, `Crônicas de Mariana` com a capa enviada pelo Rafael e o badge `PESSOAL`. A linha 7 entra cortada no fim.
- Barra inferior com **Feed** ativo, a área de onde se chegou ao perfil do Rafael.

### 4.7 Outro leitor, perfil privado sem acesso

Quem olha chegou a uma lista da Beatriz, mas não é seguidor aceito.

- Header com `ArrowLeft` e sino. **Sem bloco da lista:** nem título, nem descrição, nem contagem.
- Bloco de restrição centralizado, com `space-6` entre os elementos e `space-10` de respiro acima, no mesmo desenho do perfil de outro leitor:
  - `Lock` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Esta lista é de um perfil privado`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Só quem Beatriz aceita como seguidor vê as listas dela.`
  - Botão secundário, `radius` 12, 48px: `Ver perfil de Beatriz`, que leva ao perfil dela, onde mora `Solicitar para seguir`.
- **O bloco não é um erro.** Fundo `papel`, sem `rubi`, sem `ambar`, sem banner. É uma escolha da outra pessoa.
- Nenhuma capa e nenhum título de livro aparece, **nem desfocado, nem em silhueta, nem atrás de uma camada**.

### 4.8 Carregando

- Header real.
- Bloco da lista em **skeleton estático**: uma barra de 24px de altura e 70% de largura, duas barras de 15px (90% e 60%) e uma barra curta de 13px, todas em `capa-placeholder` com `radius-sm`.
- Abaixo, cinco linhas em skeleton: um quadrado de 16px no lugar da posição, um retângulo `capa-placeholder` de 48 por 72px e duas barras à direita, alturas de 17px e 13px, larguras de 70% e 45%.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** do serviço (RNF-ERR-09): demora não é erro.

### 4.9 Carregando mais

Lista do Rafael rolada até a posição 7, no fim do que foi carregado.

- As linhas de 3 a 7 visíveis e utilizáveis; o bloco da lista já saiu pelo topo.
- Abaixo da linha 7, **duas linhas de skeleton** no mesmo desenho de 4.8, com um único fade.
- **Nada muda no topo.** O carregamento incremental não recarrega a lista, não move o scroll e não substitui o conteúdo por skeleton inteiro.

### 4.10 Erro de carregamento

- Header real, sem bloco da lista.
- Banner inline, largura total menos o padding lateral, `space-4` abaixo do header, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda e `space-3` de gap.
- Texto em `body` `tinta`: `Não foi possível carregar esta lista. Verifique sua conexão e tente de novo.`
- Abaixo, botão textual `musgo`: `Tentar de novo`.

### 4.11 Lista não encontrada

A lista foi excluída pelo dono, ou o endereço não corresponde a nenhuma lista.

- Header real.
- Bloco centralizado, `space-6` entre os elementos:
  - `ListDashes` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Lista não encontrada`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Ela pode ter sido excluída por quem a criou.`
  - Botão textual `musgo`: `Voltar`.
- **Sem `rubi`, sem banner.** Não é falha do sistema.

**Variante sem artboard próprio:** a lista vazia de outro leitor mostra o bloco da lista normal, com `0 livros`, e no lugar das linhas uma frase em `body` `grafite`, alinhada à esquerda, sem ícone e sem botão: `Rafael ainda não adicionou livros a esta lista.`

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px. Item ativo: **Perfil** para o dono, **Feed** nos artboards do Rafael.
- Área de conteúdo com padding lateral `space-8`, `max-width` de 1120px.
- **Header de conteúdo de 72px** com um botão textual de retorno à esquerda: `ArrowLeft` (Phosphor, `regular`, 20px) seguido de `Minhas listas` para o dono ou `Listas de Rafael` para outro leitor, em `body-strong` `musgo`. Volta ao perfil com a aba `Listas` ativa. Nada à direita e sem sino.
- **Duas colunas**, com `space-8` de gap:
  - **Coluna da esquerda, 320px, fixa ao rolar:** o bloco da lista na mesma ordem do mobile, com o título em `display` `tinta` (até quatro linhas), a descrição em `body` `grafite`, a linha de dono ou a de visibilidade, a contagem e, para o dono, o botão secundário `Editar lista` de largura total, 40px, com `PencilSimple`. Na web não existe botão `Reordenar`: os controles de ordem ficam sempre visíveis nas linhas.
  - **Coluna da direita:** as linhas da lista, em coluna única de no máximo 720px.
- **Linha de livro na web**, altura mínima de 96px, padding vertical `space-4`, divisor de 1px `linha`:
  - **Dono:** à esquerda, a alça `DotsSixVertical` (Phosphor, `regular`, 20px, `grafite`), com cursor de agarrar; `space-3`; a posição em `num-inline` `grafite`; `space-3`; capa de 48 por 72px em canto vivo; `space-4`; título em `body-strong` `tinta` e autor em `caption` `grafite`. À direita, três botões só de ícone, 40 por 40px, `radius` 12, fundo transparente, ícone de 20px `grafite`, `space-1` de gap: `ArrowUp` (rótulo acessível `Mover para cima`), `ArrowDown` (`Mover para baixo`) e `MinusCircle` (`Remover da lista`). Os três ficam **sempre visíveis**, não só no hover. No primeiro item `ArrowUp` fica desabilitado, com ícone em `grafite-suave`; no último, `ArrowDown`.
  - **Outro leitor:** sem alça e sem botões; posição, capa, título e autor, e `CaretRight` 20px `grafite` à direita.
  - Hover na linha: fundo `papel-elevado`, transição `dur-fast`. Hover num botão de ícone: fundo `linha` e ícone `tinta`; em `Remover da lista`, ícone `rubi`.
  - Clicar na capa ou no título abre a página do livro, com as mesmas regras do mobile para livro pessoal.
- **Arrastar na web:** pela alça, com o mesmo tratamento do mobile (linha levantada em `papel-elevado` com `elev-2`, linha de inserção de 2px `musgo`). Pelo teclado, com foco na alça, `Espaço` pega o item, as setas movem e `Espaço` solta; os botões `Mover para cima` e `Mover para baixo` fazem o mesmo em um clique.
- Remover na web também não pede confirmação: a linha sai com fade em `dur-base` e a contagem atualiza.
- Falha ao salvar a ordem: o mesmo toast de 4.4, no canto inferior esquerdo da área de conteúdo, com largura de 400px.
- Foco de teclado visível em retorno, `Editar lista`, alça, botões de ícone e linha, com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px:** as duas colunas viram uma, na ordem bloco da lista e linhas; os botões de ícone dão lugar ao `DotsThree` com o menu do item; volta o botão `Reordenar` com o modo de reordenação do mobile; o retorno vira o `ArrowLeft` do header; e a sidebar dá lugar à barra inferior.

### 5.1 Dono, padrão, com hover num controle

Coluna da esquerda com `Contos que eu indico`, a descrição, `Seu perfil é público: qualquer leitor pode ver esta lista.`, `7 livros · atualizada em 12 de setembro de 2026` e `Editar lista`. Coluna da direita com as sete linhas, `Contos da Rua Direita` em placeholder com badge `PESSOAL`. O cursor está sobre o `ArrowUp` da linha 4, `Várias Histórias`: fundo `linha` no botão e fundo `papel-elevado` na linha. Na linha 1, `ArrowUp` desabilitado; na linha 7, `ArrowDown` desabilitado.

### 5.2 Dono, arrastando

`Morangos Mofados` (posição 6) sendo arrastado pela alça para cima, entre as posições 2 e 3: linha levantada em `papel-elevado` com `elev-2`, alça em `musgo`, linha de inserção de 2px `musgo` entre `Laços de Família` e `Sagarana`. As posições numeradas ainda são as antigas.

### 5.3 Outro leitor, perfil público

Header com `Listas de Rafael`. Coluna da esquerda com `Para entender o Brasil`, a descrição, `Lista de Rafael Okamoto` e `12 livros · atualizada em 03 de agosto de 2026`, sem botão. Coluna da direita com as linhas de 1 a 7, com `Formação do Brasil Contemporâneo` em placeholder sem badge e `Crônicas de Mariana` com badge `PESSOAL`, cada linha com `CaretRight`. Sidebar com **Feed** ativo.

### 5.4 Outro leitor, perfil privado sem acesso

Header com `Perfil de Beatriz` no retorno, que leva ao perfil dela. Sem as duas colunas: o bloco de restrição de 4.7 centralizado na área de conteúdo, alinhado ao topo com `space-16` de respiro, com o botão secundário `Ver perfil de Beatriz` de 40px.

### 5.5 Carregando

Coluna da esquerda em skeleton (barra de título, duas de descrição, uma de contagem e o retângulo do botão), coluna da direita com seis linhas em skeleton no desenho de 4.8. Um único fade de entrada, sem shimmer.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, dono, padrão.** Equivalente a 4.1. Fundo `noite`. `ArrowLeft` e sino em `papel-suave`. Título da lista em `papel-suave`, descrição, linha de visibilidade e contagem em `grafite-claro`. Botões secundários com borda `linha-noite` e texto `papel-suave`. Posição e autor em `grafite-claro`, título do livro em `papel-suave`, `DotsThree` em `grafite-claro`. Placeholder de capa em `capa-placeholder-noite`, badge `PESSOAL` sobre `noite` a 90% com texto `papel-suave`. Divisores em `linha-noite`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com **Perfil** em `musgo-claro`.
- **Mobile, outro leitor, perfil público.** Equivalente a 4.6. Linha de dono com o nome em `musgo-claro`, `CaretRight` em `grafite-claro`, o resto como acima. Barra inferior com **Feed** em `musgo-claro`.
- **Web, dono, padrão.** Equivalente a 5.1. Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, lockup em `musgo-claro`, item **Perfil** com fundo `musgo-fundo-escuro`. Retorno em `musgo-claro`. Hover de linha em `noite-elevada`, hover de botão de ícone com fundo `linha-noite` e ícone `papel-suave`. Botão desabilitado com ícone em `grafite-fundo-escuro`.

Nos três, os shadows ficam com **metade da opacidade**, inclusive na linha levantada durante o arraste: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Capa em retângulo de canto vivo, placeholder com título e badge `PESSOAL` | documento-de-design §4.5 e §7.6 |
| Linha de dono (desenho da linha de atribuição, com outro texto) | documento-de-design §4.18 |
| Modo consulta do livro pessoal, destino dos itens pessoais de outro leitor | documento-de-design §5.8 |
| Bottom sheet com menu de ações, item destrutivo por último e `Cancelar` | documento-de-design §4.11 |
| Botão primário pill, secundário e textual | documento-de-design §4.1 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md e documento-de-design §5 |
| Header de tela de detalhe sem título, com `ArrowLeft` e sino | nasceu nos prompts do Período 1 (F-PERFIL); incorporação pendente |
| Bloco de restrição de RN-08 | nasceu em periodo-1/F-PERFIL/perfil-de-outro-leitor.md; incorporação pendente |
| Carregamento incremental com duas linhas de skeleton no fim da lista | nasceu em periodo-1/F-PERFIL/seguidores-e-seguidos.md; incorporação pendente |

**Componentes que nascem aqui.** Nenhum deles está no `documento-de-design.md`, e todos precisam ser incorporados pelo controle de mudança (plano §3) antes de valerem como padrão:

1. **Linha de livro numerada.** Posição em `num-inline`, capa de 48 por 72px, título e autor, com `DotsThree` para o dono e `CaretRight` para terceiros. Não é variante do card de livro do §4.5: é item de lista ordenada.
2. **Modo de reordenação no mobile.** Botão `Reordenar` que troca as ações por `Concluir`, alça `DotsSixVertical` no lugar do menu, linha levantada em `papel-elevado` com `elev-2` e linha de inserção de 2px `musgo`, com salvamento a cada soltura.
3. **Controles de ordem sempre visíveis na web.** Alça à esquerda e três botões só de ícone (`ArrowUp`, `ArrowDown`, `MinusCircle`) à direita, com desabilitado nas pontas.
4. **Linha de visibilidade herdada**, que diz ao dono a quem a lista está visível sem oferecer controle.
5. **Linha de dono de lista**, `Lista de <nome>`, reaproveitando o desenho do §4.18.
6. **Remoção leve sem confirmação**: tirar um item de uma coleção do próprio leitor, sem perda de dado, sai direto com fade. O §7.8 exige confirmação para ação destrutiva e não diz se remover de uma lista é destrutivo; a decisão aqui é que não é.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da lista do dono | `Contos que eu indico` |
| Descrição da lista do dono | `Livros de contos para quem acha que não gosta de conto. Em ordem de por onde começar.` |
| Linha de visibilidade, perfil público | `Seu perfil é público: qualquer leitor pode ver esta lista.` |
| Linha de visibilidade, perfil privado | `Seu perfil é privado: só quem você aceitou como seguidor vê esta lista.` |
| Contagem | `7 livros · atualizada em 12 de setembro de 2026` |
| Contagem, lista vazia | `0 livros` |
| Ações do dono | `Editar lista`, `Reordenar` |
| Modo de reordenação | `Concluir` |
| Helper do modo de reordenação | `Arraste pela alça para mudar a ordem.` |
| Badge da capa | `PESSOAL` |
| Menu do item, cabeçalho | `Posição 3 de 7` |
| Menu do item | `Mover para cima`, `Mover para baixo`, `Remover da lista`, `Cancelar` |
| Falha ao salvar a ordem | `Não foi possível salvar a nova ordem. A lista voltou como estava.` |
| Falha ao salvar a ordem, ação | `Tentar de novo` |
| Lista vazia do dono, título | `Esta lista ainda está vazia` |
| Lista vazia do dono, texto | `Abra a página de um livro e escolha Adicionar à lista no menu de ações.` |
| Lista vazia do dono, botão | `Buscar livros` |
| Lista vazia de outro leitor | `Rafael ainda não adicionou livros a esta lista.` |
| Título da lista de outro leitor | `Para entender o Brasil` |
| Descrição da lista de outro leitor | `Ensaios e romances que uso em sala de aula. A ordem é a que eu sugiro para ler.` |
| Linha de dono | `Lista de Rafael Okamoto` |
| Contagem de outro leitor | `12 livros · atualizada em 03 de agosto de 2026` |
| Restrição, título | `Esta lista é de um perfil privado` |
| Restrição, texto | `Só quem Beatriz aceita como seguidor vê as listas dela.` |
| Restrição, botão | `Ver perfil de Beatriz` |
| Erro, texto | `Não foi possível carregar esta lista. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |
| Não encontrada, título | `Lista não encontrada` |
| Não encontrada, texto | `Ela pode ter sido excluída por quem a criou.` |
| Não encontrada, botão | `Voltar` |
| Retorno da web | `Minhas listas`, `Listas de Rafael`, `Perfil de Beatriz` |
| Rótulos acessíveis dos botões de ícone, web | `Mover para cima`, `Mover para baixo`, `Remover da lista` |

Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade, com a exceção da posição na lista, que é rótulo de ordem e não medida.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no `ArrowLeft`, no sino, no `DotsThree`, na alça e em cada linha. Na web, botões de ícone de 40 por 40px, com a área de clique da linha inteira em volta.
- **Reordenar nunca depende só de arrastar.** No mobile, `Mover para cima` e `Mover para baixo` estão no menu do item, dentro e fora do modo de reordenação. Na web, os mesmos dois botões ficam em cada linha e a alça aceita teclado (`Espaço` pega, setas movem, `Espaço` solta, `Esc` cancela e devolve o item ao lugar).
- Cada mudança de posição é anunciada por leitor de tela: `Sagarana, agora na posição 2 de 7.` Falha ao salvar é anunciada como alerta.
- Leitor de tela anuncia a linha como um único botão com o conteúdo completo: `Posição 5, Contos da Rua Direita, Helena Prado, livro pessoal. Abrir página do livro.` O badge `PESSOAL` não é comunicado só pela imagem.
- A linha de dono lê o nome como link separado: `Lista de Rafael Okamoto, abrir perfil`.
- Bloco de restrição e lista não encontrada são anunciados como conteúdo, não como erro.
- Contraste WCAG AA no corpo nos dois temas. Posição, autor e contagem usam `grafite`, não `grafite-suave`, porque são informação essencial. Botão desabilitado em `grafite-suave` é ícone, não texto.
- Na web, foco de teclado visível com contorno de 2px `musgo` e offset de 2px. Ordem de tabulação: sidebar, retorno, `Editar lista`, e em cada linha alça, título, `Mover para cima`, `Mover para baixo`, `Remover da lista`.
- `prefers-reduced-motion` respeitado: o deslize das linhas no arraste, o fade de saída ao remover e o fade do skeleton viram estáticos. A linha de inserção continua aparecendo, porque é informação e não enfeite.
- O skeleton preserva a altura do layout para o conteúdo não saltar quando os dados chegam.
- O texto do sistema pode crescer: título e autor quebram linha em vez de cortar, e o título da lista nunca corta no meio da palavra.

---

## 10. O que não fazer nesta tela

**Escopo desta tela**

- **Não desenhe botão de adicionar livros dentro da lista**, nem campo de busca, nem seletor de livros. Livro entra numa lista pela página do livro, no item `Adicionar à lista`.
- **Não desenhe ação de estante em nenhuma linha**: nada de `Quero ler`, `Adicionar à estante`, `Iniciar leitura` nem coração de favorito, para livro oficial ou pessoal. A lista não é a estante.
- Não desenhe status pill, estrelas, nota geral nem nota dos leitores nas linhas.
- Não desenhe `Excluir lista` nesta tela. A exclusão mora na zona de exclusão da edição da lista.
- Não desenhe controle de privacidade da lista (pública, privada, só amigos). A lista segue o perfil do dono.
- Não mostre nada da lista de um perfil privado para quem não é seguidor aceito: nem título, nem contagem, nem capa desfocada ou em silhueta.
- Não desenhe `DotsThree`, alça nem botões de ordem para quem não é o dono.
- Não desenhe curtir, comentar, salvar ou copiar a lista de outro leitor. Listas não têm interação social neste período.
- Não desenhe compartilhar, gerar link ou exportar a lista.
- Não desenhe atividade de feed nem notificação sobre listas. Listas não geram nenhuma das duas.
- Não mostre a lista como grid de capas. Ela é lista numerada, porque a ordem é o conteúdo.
- Não desenhe a página do livro, a página do livro pessoal, o índice de listas nem a edição da lista aqui. São outros prompts.
- Não use `rubi` fora de `Remover da lista`, do toast de falha e do banner de erro. Não use `ambar` em nada desta tela.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. A descrição da lista é interface, não resenha: Manrope.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. O único overline da tela é o badge `PESSOAL` na capa.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO". A posição do livro é número em `num-inline`, não eyebrow.

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura, inclusive na linha levantada durante o arraste.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de linha que balança, inclina ou cresce ao ser arrastada.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético do tipo "Sua curadoria" ou "Coleção especial". O que é lista se chama lista.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de placeholder de capa com ícone de livro genérico. O placeholder mostra o título.
- Nada de toast com fundo saturado. Nada de toast de sucesso: o sucesso é a lista mudando.

**Interações destrutivas**

- Nada de botão destrutivo preenchido em `rubi`.
- Nada de desfazer depois de remover um livro: remover é leve, e o livro volta pela página dele.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. Os controles de ordem da web ficam sempre visíveis.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "7" sozinho na contagem: é "7 livros".
- Nada de número fake-preciso.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação, nem "lista em destaque".
- Sem ranking de leitores nem de listas.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns, nem lista colaborativa.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
