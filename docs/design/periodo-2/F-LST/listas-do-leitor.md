# F-LST · Listas do leitor

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-LST.md
**Requisitos:** RF-LST-01 (criar listas com título e descrição, a partir de `Nova lista`), RF-LST-04 (ver as listas de outros leitores respeitando a privacidade do perfil)
**Requisito que esta tela fecha em parte:** RF-SOC-02 cita as listas do leitor na composição do perfil, pendência do Período 1 registrada em F-PERFIL. O desenho do índice mora aqui; a entrada no perfil entra na edição do perfil, em outro prompt.
**Não funcionais:** RNF-SEC-02 (só o dono cria listas), RNF-SEC-03 (listas de perfil privado só para seguidor aceito), RNF-SEC-14 (título e descrição tratados como texto), RNF-DES-02 (listagem paginada com teto do servidor), RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-08 (listas seguem a privacidade do perfil do dono), RN-14.4 (ordem de resolução da capa)
**Versão web:** sim. RF-LST-01 e RF-LST-04 têm marcação na coluna Web de `REQUISITOS.md` §5.6.
**De onde se chega:** no mobile, do botão `Ver todas` da seção `Listas` do perfil (o próprio ou o de outro leitor), que mostra as três listas mais recentes. Na web o índice **não é página própria**: é o conteúdo da terceira aba, `Listas`, do perfil, ao lado de `Estante` e `Resenhas`. A seção e a aba entram nas edições do perfil (`meu-perfil` e `perfil-de-outro-leitor`, em outro prompt), que usam o desenho deste canvas. Daqui se vai à lista (`F-LST/lista.md`) e à criação de lista (`F-LST/criar-lista.md`).

---

## 1. Contexto

O índice é onde as listas de um leitor ficam juntas: as do próprio leitor, que ele cria e organiza, e as de quem ele visita, que ele só lê. Sustenta o **pertencimento**: é o lugar em que o gosto de alguém aparece organizado por intenção ("clássicos para reler", "autoras negras brasileiras"), e não só pela ordem em que os livros foram parar na estante.

Dois modos, decididos por quem está olhando:

- **Dono.** Vê as próprias listas e cria uma nova em `Nova lista`. Não exclui nem edita daqui: isso mora dentro de cada lista.
- **Outro leitor.** Vê as listas de quem visita, se RN-08 permite. Perfil privado sem seguimento aceito não mostra nada, nem a quantidade de listas.

Três coisas que a tela precisa resolver:

- **Reconhecer uma lista pela cara dela.** Cada lista aparece com um **mosaico das três primeiras capas**, o título, a descrição curta e a contagem de livros. Lista vazia tem mosaico vazio, e isso precisa parecer intencional, não quebrado.
- **Um só nome para criar.** `Nova lista` é o nome da ação em todo lugar em que ela aparece: aqui, na seção do perfil e dentro do sheet de adicionar à lista.
- **Privacidade herdada.** A lista não tem privacidade própria. O dono vê numa linha que as listas seguem o perfil dele; o terceiro sem acesso vê o bloco de restrição.

Listas não geram atividade no feed nem notificação.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`, com o perfil aberto na aba `Listas`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Listas do leitor · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Listas da dona**, `Marina Beltrão` (`@marinableu`), perfil público. Da atualizada mais recentemente para a mais antiga:

| Título | Descrição | Livros | Três primeiras capas |
|---|---|---|---|
| Contos que eu indico | `Livros de contos para quem acha que não gosta de conto. Em ordem de por onde começar.` | `7 livros` | Olhos d'Água, Laços de Família, Sagarana |
| Autoras negras brasileiras | `Para ler, reler e dar de presente.` | `6 livros` | Quarto de Despejo, Ponciá Vicêncio, Um Defeito de Cor |
| Clássicos brasileiros para reler | `Os que li na escola e merecem uma segunda chance.` | `8 livros` | Dom Casmurro, Vidas Secas, Memórias Póstumas de Brás Cubas |
| Para ler numa viagem | sem descrição | `4 livros` | A Hora da Estrela, Marrom e Amarelo, Tudo é Rio |
| Policiais para o fim de semana | `Curtos, com final que se resolve.` | `3 livros` | O Silêncio da Chuva, Bellini e a Esfinge, Uma Janela em Copacabana |
| Quero ler em 2027 | sem descrição | `0 livros` | nenhuma |

`Marrom e Amarelo` usa `capa-placeholder` pelo terceiro nível de RN-14.4, para o mosaico mostrar o caso. `Quero ler em 2027` é a lista vazia.

**Contagem da dona:** `6 listas`.

**Listas de outro leitor**, `Rafael Okamoto` (`@rafaokamoto`), perfil público, que quem olha segue:

| Título | Descrição | Livros | Três primeiras capas |
|---|---|---|---|
| Para entender o Brasil | `Ensaios e romances que uso em sala de aula. A ordem é a que eu sugiro para ler.` | `12 livros` | Raízes do Brasil, Casa-Grande e Senzala, Os Sertões |
| Romances históricos | `Ficção que acerta a época.` | `7 livros` | Um Defeito de Cor, Os Tambores de São Luís, Viva o Povo Brasileiro |
| Não ficção para começar | sem descrição | `2 livros` | O Povo Brasileiro, Brasil: uma Biografia |

**Contagem do Rafael:** `3 listas`. A lista `Não ficção para começar` tem só dois livros e mostra o mosaico com duas capas e um espaço vazio.

**Perfil privado sem acesso:** `Beatriz Nogueira` (`@bia.nogueira`). Quem olha não é seguidor aceito.

**Carregando mais:** no artboard de carregamento incremental, a Marina tem 14 listas, e só as seis acima estão carregadas. A contagem desse artboard é `14 listas`.

Nenhuma nota aparece. Todo número aparece com unidade. Nenhum valor é fake-preciso.

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
que salta. **Nesta tela o item ativo é `Perfil`** nas listas da própria
leitora. Nas listas de outro leitor, o item ativo é o da área de onde se
chegou ao perfil dele; aqui, `Feed`.

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
ativo é `Perfil`** no perfil da dona. No perfil de outro leitor, o item
ativo é o da área de onde se chegou a ele; aqui, `Feed`.

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

Header de tela de detalhe, empilhada sobre o perfil.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando ao perfil.
- Título `Listas` em `display` `tinta`, à esquerda, logo depois da seta, alinhado à base. O mesmo título vale para as listas de outro leitor: de quem são as listas fica dito na primeira linha do conteúdo, porque `Listas de Rafael` não cabe em `display` ao lado da seta e do sino em 390px.
- `Bell` à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Linha de topo

Logo abaixo do header, padding lateral `space-5`, `space-2` de respiro acima.

- **Dono:** à esquerda, a contagem `6 listas` em `caption` `grafite`, com o número em `num-inline` no tamanho do `caption`; à direita, na mesma linha de base, o botão textual `musgo` com `Plus` (Phosphor, `regular`, 16px) à esquerda: `Nova lista`, que abre `F-LST/criar-lista.md` em modo criação. Abaixo, `space-2`, a **linha de visibilidade**: `Globe` (Phosphor, `regular`, 16px, `grafite`) e, em `caption` `grafite`, `Seu perfil é público: qualquer leitor pode ver suas listas.`; com perfil privado, `Lock` 16px e `Seu perfil é privado: só quem você aceitou como seguidor vê suas listas.`
- **Outro leitor:** avatar circular de 24px, `space-2` de gap e, em `caption` `grafite`, `Listas de ` seguido do nome em `caption` peso 600 `musgo`: `Listas de Rafael Okamoto`. O nome é link para o perfil dele. À direita, a contagem `3 listas` em `caption` `grafite`. Sem `Nova lista`.
- `space-4` abaixo, divisor de 1px `linha` de largura total.

### Card de lista

Um por lista, em coluna única, padding lateral `space-5`, `space-4` de padding vertical, divisor de 1px `linha` entre eles. É linha, não cartão elevado: sem fundo próprio, sem borda, sem sombra.

- À esquerda, o **mosaico de capas**, 88 por 72px: as três primeiras capas da lista, cada uma de 48 por 72px, em canto vivo, **sobrepostas em leque horizontal**, cada capa deslocada 20px para a direita da anterior, com a primeira na frente. Cada capa leva contorno de 1px `papel` para separar da de trás. Sem rotação, sem sombra.
  - Capa ausente de livro do acervo: `capa-placeholder` sem texto, porque em 48px de largura atrás de outra capa o título não se lê. O título do livro aparece na lista, não no mosaico.
  - Lista com menos de três livros: as posições que faltam ficam como **retângulo vazio** de 48 por 72px, fundo `papel-elevado`, borda de 1px `linha`, sem ícone e sem texto.
  - Lista vazia: três retângulos vazios.
- `space-4` de gap, a coluna de texto: título da lista em `title-sm` `tinta`, até duas linhas; descrição em `caption` `grafite`, até duas linhas com reticências; e, `space-1` abaixo, a contagem `7 livros` em `caption` `grafite`. Descrição ausente: a linha some.
- À direita, `CaretRight` (Phosphor, `regular`, 20px, `grafite`), centralizado na altura do card.
- O card inteiro é a área acionável e abre `F-LST/lista.md`.
- Ordem: da lista atualizada mais recentemente para a mais antiga.
- Paginação por rolagem, com teto imposto pelo servidor. Nada de `Carregar mais`, nada de numeração de página.

### 4.1 Minhas listas, padrão

Header `Listas`, linha de topo da dona com `6 listas`, `Nova lista` e `Seu perfil é público: qualquer leitor pode ver suas listas.`. Cards de `Contos que eu indico`, `Autoras negras brasileiras`, `Clássicos brasileiros para reler`, `Para ler numa viagem` (sem descrição, com `Marrom e Amarelo` em placeholder no mosaico) e `Policiais para o fim de semana`; `Quero ler em 2027` entra cortado no fim da viewport, com os três retângulos vazios. Barra inferior com **Perfil** ativo.

### 4.2 Minhas listas, vazio

A dona ainda não criou nenhuma lista.

- Header real. Linha de topo **sem contagem e sem `Nova lista`**: a ação aparece uma vez só, no bloco de vazio. A linha de visibilidade continua.
- Bloco centralizado no espaço da lista, com `space-6` entre os elementos:
  - `ListBullets` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Você ainda não tem listas`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Junte livros sob um título, com uma descrição e na ordem que você quiser.`
  - Botão primário pill, 48px, `musgo`, texto `papel`, com `Plus` 20px: `Nova lista`.
- Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.

### 4.3 Listas de outro leitor

Header `Listas`, linha de topo com `Listas de Rafael Okamoto` e `3 listas`. Cards de `Para entender o Brasil`, `Romances históricos` e `Não ficção para começar`, esta com duas capas e um retângulo vazio no mosaico. Abaixo do último card, nada. Barra inferior com **Feed** ativo, a área de onde se chegou ao perfil do Rafael.

### 4.4 Outro leitor, sem listas

- Header real, linha de topo com `Listas de Rafael Okamoto`, sem contagem.
- No lugar dos cards, uma frase em `body` `grafite`, alinhada à esquerda, sem ícone, sem ilustração e sem botão: `Rafael ainda não criou listas.` Quem olha não pode agir, então não há convite.

### 4.5 Outro leitor, perfil privado sem acesso

- Header real. **Sem linha de topo:** nem contagem, nem nome de lista.
- Bloco de restrição centralizado, com `space-6` entre os elementos e `space-10` de respiro acima, no mesmo desenho do perfil de outro leitor:
  - `Lock` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Este perfil é privado`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Só quem Beatriz aceita como seguidor vê as listas dela.`
  - Botão secundário, `radius` 12, 48px, borda de 1px `linha`, texto `body-strong` `tinta`: `Ver perfil de Beatriz`.
- **O bloco não é um erro.** Fundo `papel`, sem `rubi`, sem `ambar`, sem banner.
- Nenhum mosaico, nenhum título de lista, **nem desfocado, nem em silhueta**.
- Este estado aparece quando se chega aqui por um endereço antigo ou depois de deixar de seguir: o perfil privado não mostra a seção `Listas` a quem não é seguidor aceito.

### 4.6 Carregando

- Header real. Linha de topo com uma barra curta de 13px em `capa-placeholder` no lugar da contagem.
- Cinco cards em **skeleton estático**: três retângulos `capa-placeholder` de 48 por 72px no leque do mosaico e três barras à direita em `capa-placeholder` com `radius-sm`, alturas de 17px, 13px e 13px, larguras de 65%, 85% e 30%.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** do serviço (RNF-ERR-09).

### 4.7 Carregando mais

As listas da dona, com `14 listas` na linha de topo, roladas até `Quero ler em 2027`, a sexta, no fim do que foi carregado.

- Cards de 3 a 6 visíveis e utilizáveis.
- Abaixo do último, **dois cards de skeleton** no desenho de 4.6, com um único fade.
- **Nada muda no topo.**

### 4.8 Erro de carregamento

- Header real, linha de topo sem contagem (dono mantém `Nova lista`, que não depende da listagem).
- Banner inline, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda e `space-3` de gap.
- Texto em `body` `tinta`: `Não foi possível carregar as listas. Verifique sua conexão e tente de novo.`
- Abaixo, botão textual `musgo`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

Na web o índice é a **aba `Listas` do perfil**. Os artboards mostram o perfil inteiro com essa aba ativa, para o desenho da aba ser conferido no contexto em que ela vive. A edição do perfil, em outro prompt, reaproveita este desenho.

- Sidebar do shell à esquerda, expandida em 248px. Item ativo: **Perfil** no perfil da dona, **Feed** no perfil do Rafael.
- Área de conteúdo com padding lateral `space-8`.
- **Perfil da dona:** header de conteúdo de 72px com `Perfil` em `display` `tinta` à esquerda e, à direita, dois botões secundários de 40px com `space-3` de gap: `Buscar leitor`, com `MagnifyingGlass` (Phosphor, `regular`, 20px), e `Configurações`, com `Gear` (Phosphor, `regular`, 20px). **Sem sino.**
- **Perfil de outro leitor:** header de conteúdo de 72px com o botão textual de retorno `ArrowLeft` (Phosphor, `regular`, 20px) mais `Voltar`, em `body-strong` `musgo`, à esquerda. Sem título.
- **Coluna esquerda de 300px, fixa**, igual à do perfil de hoje: avatar de 120px com borda de 1px `linha`, nome em `title-lg` `tinta`, `@username` em `caption` `grafite-suave`, chip de privacidade (`Perfil público` com `Globe` em `musgo-fundo`, ou `Perfil privado` com `Lock` em `papel-elevado` com borda `linha`), biografia em `body` `grafite` alinhada à esquerda, o botão de largura total e 40px (`Editar perfil` secundário para a dona; `Seguindo` secundário com `Check` `musgo` para o Rafael) e os contadores empilhados, número em `num-inline` `tinta` à esquerda e rótulo em `body` `grafite` à direita, com divisor de 1px `linha`.
  - Dona: `Marina Beltrão`, `@marinableu`, `Leio ficção brasileira contemporânea e um policial de vez em quando. Aceito indicação de conto.`, `12 livros lidos`, `84 seguidores`, `97 seguindo`.
  - Rafael: `Rafael Okamoto`, `@rafaokamoto`, `Professor de história. Leio mais não ficção do que deveria e anoto tudo na margem.`, `31 livros lidos`, `212 seguidores`, `148 seguindo`.
- **Coluna direita:** faixa de abas no topo com **`Estante`, `Resenhas` e `Listas`**, cada aba em `body-strong`, a ativa em `musgo` com sublinhado de 2px `musgo` e as demais em `grafite`. Nestes artboards, **`Listas` está ativa**. Abaixo, `space-6`, o conteúdo da aba:
  - **Linha de topo** como no mobile: contagem `6 listas` em `caption` `grafite` e, para a dona, à direita, o botão secundário de 40px com `Plus` 20px: `Nova lista`; abaixo, a linha de visibilidade. Para o Rafael, só a contagem `3 listas`: o nome já está na coluna esquerda, então a linha `Listas de Rafael Okamoto` não se repete.
  - `space-5` abaixo, **grid de cards de lista em três colunas**, gap `space-5`. Cada card em coluna: o mosaico em cima, maior, com capas de 80 por 120px deslocadas 32px cada, ocupando 144 por 120px; `space-4`; título em `title-sm` `tinta` até duas linhas; descrição em `caption` `grafite` até duas linhas; contagem em `caption` `grafite`. Padding `space-4`, `radius` 12, fundo transparente, sem borda. O card inteiro é clicável.
  - Hover no card: fundo `papel-elevado` e título em `musgo`, transição `dur-fast`. Cursor de ponteiro.
  - Paginação por rolagem dentro da aba, com o mesmo skeleton de duas linhas de cards no fim.
- Quando RN-08 não permite, a coluna direita inteira é o bloco de restrição e **não há faixa de abas**, como no perfil de hoje. Esse estado já existe no canvas do perfil de outro leitor e não se repete aqui.
- Foco de teclado visível em abas, `Nova lista` e card, com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px:** as duas colunas viram uma, as abas viram as seções empilhadas do mobile (a seção `Listas` com as três mais recentes e `Ver todas`, que abre o índice mobile desta tela), e a sidebar dá lugar à barra inferior.

### 5.1 Meu perfil, aba Listas

Perfil da Marina com `Listas` ativa. `6 listas`, `Nova lista` e a linha de visibilidade. Grid com as seis listas em duas fileiras de três: `Contos que eu indico`, `Autoras negras brasileiras`, `Clássicos brasileiros para reler`; `Para ler numa viagem`, `Policiais para o fim de semana`, `Quero ler em 2027` (três retângulos vazios no mosaico).

### 5.2 Meu perfil, aba Listas vazia

Perfil da Marina com `Listas` ativa e nenhuma lista. Linha de topo só com a linha de visibilidade. No lugar do grid, o bloco de vazio de 4.2, alinhado ao topo da coluna com `space-10` de respiro e centralizado na largura da coluna, com o botão primário pill de 40px `Nova lista`.

### 5.3 Perfil de outro leitor, aba Listas, com hover

Perfil do Rafael com `Listas` ativa, `3 listas`, grid com uma fileira de três cards. O cursor sobre `Romances históricos`: fundo `papel-elevado` e título em `musgo`. Sidebar com **Feed** ativo.

### 5.4 Carregando

Perfil da Marina com a coluna esquerda real e a faixa de abas real com `Listas` ativa. Conteúdo da aba em skeleton: uma barra curta no lugar da contagem e seis cards em skeleton em duas fileiras, cada um com três retângulos `capa-placeholder` no leque e três barras abaixo. Um único fade de entrada, sem shimmer.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, minhas listas, padrão.** Equivalente a 4.1. Fundo `noite`. Título `Listas`, `ArrowLeft` e sino em `papel-suave`. Contagem e linha de visibilidade em `grafite-claro`, `Nova lista` em `musgo-claro`. Título do card em `papel-suave`, descrição e contagem em `grafite-claro`, `CaretRight` em `grafite-claro`. Contorno entre as capas do mosaico em `noite`. Placeholder de capa em `capa-placeholder-noite`. Retângulo vazio do mosaico em `noite-elevada`, **mais claro** que o fundo, com borda `linha-noite`. Divisores em `linha-noite`. Barra inferior em `noite-elevada` com **Perfil** em `musgo-claro`.
- **Web, meu perfil, aba Listas.** Equivalente a 5.1. Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, lockup em `musgo-claro`, item **Perfil** com fundo `musgo-fundo-escuro`. Aba ativa em `musgo-claro` com sublinhado `musgo-claro`, abas inativas em `grafite-claro`. Chip `Perfil público` com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Botões secundários com borda `linha-noite` e texto `papel-suave`. Hover de card em `noite-elevada` com título em `musgo-claro`.

Nos dois, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Capa em retângulo de canto vivo e placeholder de capa | documento-de-design §4.5 e §7.6 |
| Linha de dono (desenho da linha de atribuição, com outro texto) | documento-de-design §4.18 |
| Botão primário pill, secundário e textual | documento-de-design §4.1 |
| Perfil web com identidade à esquerda e abas à direita | documento-de-design §5.5 e periodo-1/F-PERFIL/meu-perfil.md |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md e documento-de-design §5 |
| Header de tela de detalhe com `ArrowLeft`, título e sino | nasceu nos prompts do Período 1 (F-PRG, F-PERFIL, F-NOT); incorporação pendente |
| Faixa de abas da web | nasceu em periodo-1/F-PERFIL/meu-perfil.md; incorporação pendente |
| Bloco de restrição de RN-08 | nasceu em periodo-1/F-PERFIL/perfil-de-outro-leitor.md; incorporação pendente |
| Carregamento incremental com skeleton no fim da lista | nasceu em periodo-1/F-PERFIL/seguidores-e-seguidos.md; incorporação pendente |

**Componentes que nascem aqui.** Nenhum deles está no `documento-de-design.md`, e todos precisam ser incorporados pelo controle de mudança (plano §3) antes de valerem como padrão:

1. **Card de lista.** Mosaico de capas, título, descrição curta e contagem de livros. Linha em coluna única no mobile, card em grid de três colunas na web.
2. **Mosaico de capas em leque.** Três primeiras capas sobrepostas com deslocamento horizontal fixo, contorno de 1px na cor do fundo, placeholder sem texto e **retângulo vazio** para posição sem livro. É a única situação do produto em que o placeholder de capa não mostra o título, porque a capa fica parcialmente coberta.
3. **Terceira aba `Listas` no perfil web**, ao lado de `Estante` e `Resenhas`, e a seção `Listas` no perfil mobile com as três mais recentes e `Ver todas`. O desenho da aba nasce aqui; a inclusão no perfil é da edição do perfil.
4. **Linha de visibilidade herdada**, que diz ao dono que as listas seguem a privacidade do perfil, sem oferecer controle.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header, mobile | `Listas` |
| Contagem | `6 listas`, `3 listas` |
| Ação de criar | `Nova lista` |
| Linha de visibilidade, perfil público | `Seu perfil é público: qualquer leitor pode ver suas listas.` |
| Linha de visibilidade, perfil privado | `Seu perfil é privado: só quem você aceitou como seguidor vê suas listas.` |
| Linha de dono, mobile | `Listas de Rafael Okamoto` |
| Contagem do card | `7 livros`, `6 livros`, `8 livros`, `4 livros`, `3 livros`, `0 livros`, `12 livros`, `2 livros` |
| Abas do perfil, web | `Estante`, `Resenhas`, `Listas` |
| Retorno, web | `Voltar` |
| Vazio da dona, título | `Você ainda não tem listas` |
| Vazio da dona, texto | `Junte livros sob um título, com uma descrição e na ordem que você quiser.` |
| Vazio da dona, botão | `Nova lista` |
| Vazio de outro leitor | `Rafael ainda não criou listas.` |
| Restrição, título | `Este perfil é privado` |
| Restrição, texto | `Só quem Beatriz aceita como seguidor vê as listas dela.` |
| Restrição, botão | `Ver perfil de Beatriz` |
| Erro, texto | `Não foi possível carregar as listas. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |

Os títulos e descrições das listas estão na seção 3. Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no `ArrowLeft`, no sino, em `Nova lista` e em cada card.
- Leitor de tela anuncia o card como um único botão com o conteúdo completo: `Contos que eu indico, 7 livros. Livros de contos para quem acha que não gosta de conto. Abrir lista.` O mosaico é decorativo para leitor de tela: as capas não são anunciadas uma a uma.
- A linha de dono lê o nome como link separado: `Listas de Rafael Okamoto, abrir perfil`.
- Bloco de restrição é anunciado como conteúdo, não como erro.
- Contraste WCAG AA no corpo nos dois temas. Descrição e contagem usam `grafite`, não `grafite-suave`. O retângulo vazio do mosaico não carrega informação e não precisa de contraste de texto.
- Na web, foco de teclado visível com contorno de 2px `musgo` e offset de 2px. As abas seguem o padrão de abas: setas esquerda e direita trocam de aba, `Tab` entra no conteúdo. Ordem de tabulação: sidebar, header, coluna esquerda, abas, `Nova lista`, cards na ordem de leitura.
- `prefers-reduced-motion` respeitado: o hover do card e o fade do skeleton viram estáticos.
- O skeleton preserva a altura do layout. O carregamento incremental é anunciado como região ocupada, sem roubar o foco.
- O texto do sistema pode crescer: título e descrição quebram linha em vez de cortar, e o mosaico mantém o tamanho.

---

## 10. O que não fazer nesta tela

**Escopo desta tela**

- **Não desenhe excluir, editar, renomear ou reordenar listas aqui.** Editar e excluir moram dentro de cada lista; o índice só abre e cria.
- Não use outro nome para criar: é `Nova lista` em todo lugar, não "Criar lista", "Adicionar lista" ou `+` solto.
- Não desenhe botão flutuante de criar lista.
- Não desenhe controle de privacidade da lista. As listas seguem o perfil do dono.
- Não mostre nada das listas de um perfil privado para quem não é seguidor aceito: nem contagem, nem título, nem mosaico desfocado ou em silhueta.
- Não desenhe `Nova lista` nas listas de outro leitor.
- Não desenhe curtir, salvar, seguir, comentar ou copiar a lista de outro leitor.
- Não desenhe listas sugeridas, listas populares, listas em destaque nem listas de leitores que você não visitou. Não existe descoberta aberta de listas.
- Não desenhe compartilhar nem exportar.
- Não desenhe a lista aberta, a criação de lista, nem o resto do perfil além do que a seção 5 descreve. São outros prompts.
- Não desenhe nota, estrelas nem status pill em lugar nenhum desta tela.
- Não use `rubi` fora do banner de erro, nem `ambar` em nada desta tela.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. Descrição de lista é interface: Manrope.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura, nem sombra nas capas do mosaico.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de mosaico que abre em leque, gira ou anima no hover.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético do tipo "Suas coleções" ou "Estantes temáticas". O título é `Listas`.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado, nem no mosaico.
- Nada de placeholder de capa com ícone de livro genérico, nem no retângulo vazio do mosaico.
- Nada de capas giradas ou inclinadas no mosaico.
- Nada de toast com fundo saturado.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto.
- Nada de três colunas de features iguais com três ícones e três títulos. O grid de três colunas é de conteúdo real, com capas.
- Nada de bento grid decorativo, com cards de tamanhos diferentes.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "7" sozinho: é "7 livros", "6 listas".
- Nada de número fake-preciso.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores nem de listas.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns, nem lista colaborativa.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
