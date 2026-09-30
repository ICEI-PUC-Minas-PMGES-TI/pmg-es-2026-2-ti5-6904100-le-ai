# F-PERFIL · Seguidores e seguidos

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-PERFIL.md
**Requisitos:** RF-SOC-08 (visualizar as próprias listas de seguidores e seguidos), RF-SOC-07 (deixar de seguir e remover um seguidor)
**Não funcionais:** RNF-DES-02 (listagem paginada com limite imposto pelo servidor), RNF-SEC-02 (só o dono lê as próprias listas), RNF-SEC-19/44 (o grafo de terceiros não é navegável), RNF-USA-03, RNF-USA-04 (confirmação em ação destrutiva), RNF-USA-05, RNF-ERR-09
**Regras de negócio:** RN-08 (privacidade de perfil), RN-09 (deixar de seguir tira as atividades daquela pessoa do feed)
**Versão web:** sim (RF-SOC-07 e RF-SOC-08 têm marcação na coluna Web de `REQUISITOS.md` §5.9)

---

## 1. Contexto

As duas listas do grafo do leitor, em abas: quem o segue e quem ele segue. Tela empilhada sobre a área `Perfil`, aberta pelos contadores `seguidores` e `seguindo` de [`meu-perfil.md`](meu-perfil.md), cada um abrindo a aba correspondente. Sai para o perfil de cada pessoa.

É onde o **pertencimento** vira administração: aqui o leitor tira alguém de perto, deixa de acompanhar quem não lê o que ele gosta e confere quem entrou depois de aceitar uma solicitação.

**As listas são só do dono.** RNF-SEC-19 e RNF-SEC-44 impedem que o grafo vire diretório: não existe tela equivalente para o perfil de outra pessoa, e os contadores no perfil alheio não são acionáveis. Esta tela não tem versão "seguidores de Rafael".

Duas coisas que ela precisa resolver:

- **As duas ações são destrutivas e são diferentes.** Remover um seguidor tira o acesso da outra pessoa ao conteúdo restrito; deixar de seguir tira as atividades dela do meu feed. As duas pedem confirmação (RNF-USA-04), e as duas explicam a consequência certa, não uma frase genérica.
- **A lista pode ser longa.** Paginação com limite do servidor (RNF-DES-02), carregada por rolagem, com estado próprio de "carregando mais" que não pode ser confundido com o carregamento inicial.

**Escopo desta entrega.** Nada de busca dentro das listas, nada de ordenação, nada de filtro por seguidor mútuo. A caixa de solicitações pendentes é outra tela, em [`solicitacoes-de-seguir.md`](solicitacoes-de-seguir.md), porque lá se decide e aqui se administra.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Seguidores e seguidos · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Contagens nas abas:** `Seguidores 84` e `Seguindo 97`.

**Lista de seguidores**, cinco primeiros:

| Nome | Nome de usuário | Biografia truncada |
|---|---|---|
| Rafael Okamoto | `@rafaokamoto` | `Professor de história. Leio mais não ficção do que deveria.` |
| Beatriz Nogueira | `@bia.nogueira` | `Tradutora. Ficção japonesa e poesia brasileira.` |
| Caio Ferraz | `@caioferraz` | `Leio no busão. Terror nacional e crônica.` |
| Luana Saldanha | `@luanasal` | sem biografia |
| Henrique Tavares | `@henriquetv` | `Clássicos russos e um clube de leitura que nunca marca data.` |

**Lista de seguindo**, cinco primeiros:

| Nome | Nome de usuário | Biografia truncada |
|---|---|---|
| Dandara Lopes | `@dandaralp` | `Poesia brasileira contemporânea. Anoto tudo.` |
| Rafael Okamoto | `@rafaokamoto` | `Professor de história. Leio mais não ficção do que deveria.` |
| Júlia Wenceslau | `@juwences` | `Ficção científica e quadrinhos.` |
| Otávio Brandão | `@otaviobrandao` | sem biografia |
| Nadia Sampaio | `@nadiasampaio` | `Ensaio, história do Brasil e uma pilha que não diminui.` |

**Paginação:** o servidor entrega 20 por página, e a lista carrega a próxima por rolagem.

Todo número aparece com unidade ou com o rótulo que serve de unidade.

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

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, voltando ao perfil.
- Título `Conexões` em `display` `tinta`, à esquerda, alinhado à base.
- `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita, com o badge de não lidas quando houver.
- **A barra inferior continua visível**, com `Perfil` ativo.

**Por que `Conexões` e não `Seguidores`:** o título precisa cobrir as duas abas, e repetir o nome de uma delas no header faria a outra parecer subordinada.

### Faixa de abas

Logo abaixo do header, largura total, altura de 48px, com divisor de 1px `linha` na base.

- Duas abas de largura igual: `Seguidores 84` e `Seguindo 97`, com o rótulo em `body-strong` e a contagem em `num-inline` logo depois, separados por um espaço simples.
- **Ativa:** texto em `musgo` e sublinhado de 2px `musgo` na base da aba.
- **Inativa:** texto em `grafite`, sem sublinhado.
- A troca de aba muda o conteúdo abaixo em `dur-fast`. Sem carrossel, sem deslizamento horizontal do conteúdo inteiro, sem indicador que corre.

### Item da lista

Cada linha tem padding lateral `space-5` e `space-4` de padding vertical, separada por divisor de 1px `linha`.

- Avatar circular de 48px à esquerda, `space-4` de gap.
- No meio, empilhados: nome em `title-sm` `tinta`, `@username` em `caption` `grafite-suave`, e biografia em `caption` `grafite` truncada em uma linha. Quem não tem biografia simplesmente não mostra a terceira linha, sem texto substituto.
- À direita, o botão de ação da aba, `radius` 12, altura de 36px, padding lateral `space-4`, texto em `caption` peso 600:
  - Na aba `Seguidores`: **outline** `rubi`, borda de 1px, fundo transparente, texto `rubi`: `Remover`.
  - Na aba `Seguindo`: **secundário**, borda de 1px `linha`, texto `tinta`, com `Check` (Phosphor, `bold`, 16px, `musgo`) à esquerda: `Seguindo`.
- **A área do nome é acionável e leva ao perfil.** O botão de ação é um alvo separado, e os dois não se sobrepõem.

### 4.1 Aba Seguidores

Estado principal. Header, faixa com `Seguidores 84` ativo, cinco linhas com o botão `Remover`. Barra inferior com **Perfil** ativo.

### 4.2 Aba Seguindo

Faixa com `Seguindo 97` ativo, cinco linhas com o botão `Seguindo`.

### 4.3 Confirmar remoção de seguidor

Modal centrado sobre a tela, conforme RNF-USA-04.

- Fundo da tela escurecido por uma camada em `tinta` a 40% de opacidade.
- Card centrado, largura de 320px, `radius-lg`, fundo `papel-elevado`, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Remover Caio dos seus seguidores?`
- `space-3`, texto em `body` `grafite`: `Ele deixa de seguir você e perde o acesso ao seu conteúdo restrito. Ele pode pedir para seguir de novo.`
- `space-6`, dois botões empilhados com `space-3` de gap: botão **outline** `rubi` de 48px `Remover` e botão textual `grafite` `Cancelar`.
- **Sem desfazer depois.** A confirmação é antes.

### 4.4 Confirmar deixar de seguir

Mesmo modal, com a consequência certa desta ação, que é outra.

- Título em `title` `tinta`: `Deixar de seguir Dandara?`
- `space-3`, texto em `body` `grafite`: `As atividades dela saem do seu feed. Você pode seguir de novo quando quiser.`
- Se o perfil for privado, o texto é: `As atividades dela saem do seu feed, e você perde o acesso à estante e às resenhas. Seguir de novo exige uma solicitação nova.`
- Mesmos dois botões, com o destrutivo escrito `Deixar de seguir`.

**Os dois modais precisam ser visivelmente a mesma peça e textualmente diferentes.** Uma frase genérica do tipo `Tem certeza?` apagaria a diferença entre perder acesso e perder o feed.

### 4.5 Aba Seguidores vazia

O leitor ainda não tem seguidores.

- Faixa de abas presente, com `Seguidores 0` ativo: a estrutura aparece antes do conteúdo existir.
- Bloco centralizado no espaço da lista, `space-6` entre os elementos:
  - `Users` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Ninguém segue você ainda`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Quando alguém começar a seguir você, aparece aqui.`
- **Sem botão nesta aba:** o leitor não tem ação para conquistar seguidores, e inventar um CTA aqui seria prometer o que o produto não faz.
- Na aba `Seguindo` vazia, o bloco é outro: título `Você ainda não segue ninguém`, texto `Busque um leitor pelo nome de usuário para começar a montar seu feed.` e botão primário pill `musgo` `Buscar leitor`, que leva a [`buscar-leitor.md`](buscar-leitor.md). Aqui o CTA existe porque a ação existe.
- **Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.**

### 4.6 Carregando

- Header e faixa de abas reais, com as contagens ainda ocultas.
- Lista substituída por **skeleton estático**: seis linhas, cada uma com um círculo de 48px e três barras em `capa-placeholder` com `radius-sm`, alturas de 17px, 13px e 13px, larguras de 40%, 25% e 70%, mais um retângulo de 36px à direita.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** (RNF-ERR-09).

### 4.7 Carregando mais

A rolagem chegou ao fim da primeira página de 20.

- As vinte linhas carregadas continuam visíveis e utilizáveis.
- Abaixo da última, **duas linhas de skeleton** no mesmo desenho de 4.6, com um único fade.
- **Nada muda no topo.** O carregamento incremental não recarrega a lista, não move o scroll e não substitui o conteúdo por skeleton inteiro.

### 4.8 Erro de carregamento

- Header e faixa de abas reais.
- Banner inline no lugar da lista, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar suas conexões. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo.
- Área de conteúdo com padding lateral `space-8`, header de conteúdo de 72px com o botão textual de retorno `Perfil` e o título `Conexões` em `display` `tinta`. Sem sino.
- **Faixa de abas alinhada à esquerda**, não de largura igual: cada aba ocupa a largura do próprio texto, com `space-8` de gap entre elas, e o sublinhado de 2px `musgo` acompanha o texto da ativa.
- **Lista em duas colunas** de cards, com gap `space-4`, cada card com `radius` 12, borda de 1px `linha`, padding `space-4`, no mesmo arranjo do item do mobile: avatar de 48px, bloco de texto e botão de ação à direita. A área de conteúdo comporta duas colunas sem esticar a linha.
- **Largura máxima de 1040px** para o conjunto das duas colunas, alinhado à esquerda.
- `hover` no card com fundo `papel-elevado`, transição `dur-fast`. `hover` no botão `Seguindo` troca a borda para `rubi` e o texto para `rubi`, **sem trocar o rótulo**. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** as duas colunas viram uma, os cards viram as linhas com divisor do mobile e a sidebar dá lugar à barra inferior.

### 5.1 Aba Seguidores

Sidebar com `Perfil` ativo, abas alinhadas à esquerda com `Seguidores 84` ativa, dez cards em duas colunas.

### 5.2 Aba Seguindo, com confirmação aberta

Aba `Seguindo 97` ativa e o modal de 4.4 centrado na viewport, com 360px de largura, sobre a camada escurecida, com os dois botões **lado a lado**: `Cancelar` textual à esquerda e `Deixar de seguir` outline `rubi` à direita, alinhados à direita do card.

### 5.3 Aba Seguidores vazia

Abas presentes com `Seguidores 0` ativa e o bloco de vazio centralizado na área de conteúdo, sem botão.

### 5.4 Carregando

Skeleton estático de oito cards em duas colunas, com header e abas reais. Um único fade de entrada, sem shimmer.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, aba Seguidores.** Fundo `noite`. Título e ícones do header em `papel-suave`. Aba ativa em `musgo-claro` com sublinhado `musgo-claro`; inativa em `grafite-claro`. Nome em `papel-suave`, `@username` em `grafite-fundo-escuro`, biografia em `grafite-claro`. Divisores em `linha-noite`. Botão `Remover` com borda e texto em `rubi-claro`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com **Perfil** ativo em `musgo-claro`.
- **Mobile, confirmar deixar de seguir.** Card em `noite-elevada`, **mais claro** que o fundo, camada de escurecimento em `noite` a 60%, título em `papel-suave`, texto em `grafite-claro`, botão destrutivo com borda e texto `rubi-claro`.
- **Web, aba Seguindo.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Cards com borda `linha-noite` e hover em `noite-elevada`. Botão `Seguindo` com borda `linha-noite`, texto `papel-suave` e `Check` em `musgo-claro`.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Botão outline destrutivo em `rubi`, nunca preenchido | documento-de-design §4.1 e §7.8 |
| Modal de confirmação de ação destrutiva | documento-de-design §7.8 e RNF-USA-04 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` | documento-de-design §3.1.3 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |
| Item de pessoa, com avatar de 48px, nome, `@username` e biografia truncada | periodo-1/F-PERFIL/buscar-leitor.md |
| Faixa de abas | periodo-1/F-PERFIL/meu-perfil.md |

**Componentes que ainda não existem na fonte.** Três elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **A faixa de abas com contagem no rótulo**, de largura igual no mobile e alinhada à esquerda na web.
2. **O item de pessoa com ação à direita**, que é o item de `buscar-leitor.md` mais um botão. Os três usos de item de pessoa no Período 1, aqui, na busca e nas solicitações, precisam ser o mesmo componente com ações diferentes.
3. **O estado de carregamento incremental**, com duas linhas de skeleton no fim da lista. Ele vale também para o feed, para as resenhas e para as notificações, e precisa ser fixado uma vez só.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Conexões` |
| Aba 1 | `Seguidores 84` |
| Aba 2 | `Seguindo 97` |
| Ação na aba Seguidores | `Remover` |
| Ação na aba Seguindo | `Seguindo` |
| Modal de remoção, título | `Remover Caio dos seus seguidores?` |
| Modal de remoção, texto | `Ele deixa de seguir você e perde o acesso ao seu conteúdo restrito. Ele pode pedir para seguir de novo.` |
| Modal de remoção, botão destrutivo | `Remover` |
| Modal de deixar de seguir, título | `Deixar de seguir Dandara?` |
| Modal de deixar de seguir, texto | `As atividades dela saem do seu feed. Você pode seguir de novo quando quiser.` |
| Modal de deixar de seguir, texto para perfil privado | `As atividades dela saem do seu feed, e você perde o acesso à estante e às resenhas. Seguir de novo exige uma solicitação nova.` |
| Modal de deixar de seguir, botão destrutivo | `Deixar de seguir` |
| Modal, botão textual | `Cancelar` |
| Vazio de seguidores, título | `Ninguém segue você ainda` |
| Vazio de seguidores, texto | `Quando alguém começar a seguir você, aparece aqui.` |
| Vazio de seguindo, título | `Você ainda não segue ninguém` |
| Vazio de seguindo, texto | `Busque um leitor pelo nome de usuário para começar a montar seu feed.` |
| Vazio de seguindo, botão | `Buscar leitor` |
| Erro, texto | `Não foi possível carregar suas conexões. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |
| Web, retorno | `Perfil` |

Os modais usam o **primeiro nome** da pessoa, não o username: é uma pergunta sobre uma pessoa, não sobre um identificador.

Zero em-dash em toda a copy. Zero emoji. As contagens aparecem dentro do rótulo da aba, que serve de unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no mobile em cada aba, no `ArrowLeft`, na área do nome, no botão de ação de cada linha e nos botões do modal. O botão de 36px de altura tem área de toque expandida para 48px.
- A área do nome e o botão de ação são dois destinos distintos na navegação por leitor de tela, anunciados como `Rafael Okamoto, arroba rafaokamoto` e `Remover Rafael dos seus seguidores`.
- A ação destrutiva é distinguível **sem depender de cor**: o rótulo diz o que faz e o botão é outline, não preenchido.
- A troca de aba é anunciada com a contagem junto, no formato `Seguindo, 97 pessoas`, e move o foco para a lista.
- Cada modal captura o foco, começa no botão `Cancelar`, fecha com `Esc` e devolve o foco ao botão que o abriu.
- O carregamento incremental é anunciado como região ocupada, sem roubar o foco de quem está lendo.
- Contraste WCAG AA no corpo nos dois temas. A biografia usa `grafite`; só o `@username` usa o terciário.
- Foco de teclado visível na web em abas, cards e botões, na ordem visual.
- `prefers-reduced-motion` respeitado: o fade do modal, o fade do skeleton e o hover viram estáticos.
- As duas ações desta tela são destrutivas e sempre passam pelo modal, nas duas plataformas.

---

## 10. O que não fazer nesta tela

**Grafo fechado, a regra dura desta tela**

- **Não desenhe esta tela para o perfil de outra pessoa.** Só o dono vê as próprias listas.
- **Não desenhe seguidores em comum, amigos em comum nem "também segue".** Isso expõe o grafo de terceiros.
- **Não desenhe sugestão de quem seguir** em nenhum estado, inclusive no vazio.
- **Não desenhe busca dentro das listas** enquanto não houver requisito. RF-SOC-03 é busca por username exato, e é outra tela.

**Específico das ações**

- **Não remova nem deixe de seguir sem confirmação.**
- **Não use a mesma frase nos dois modais.** Remover um seguidor e deixar de seguir têm consequências diferentes, e cada texto diz a sua.
- **Não troque o rótulo `Seguindo` por `Deixar de seguir` no hover ou no press.** O hover muda a cor da borda e do texto, não a palavra.
- **Não desenhe desfazer** depois de remover ou deixar de seguir.
- **Não desenhe ação em lote**, com seleção múltipla e "remover selecionados". Nenhum requisito prevê isso, e o risco de erro é alto.
- **Não desenhe bloquear nem silenciar.** Não existem no produto.
- Não coloque o botão de ação sobre a área acionável do nome.

**Específico da lista**

- **Não desenhe ordenação nem filtro.** A lista é cronológica pelo servidor e paginada.
- **Não recarregue a lista inteira** ao carregar a próxima página, e não substitua o conteúdo por skeleton de tela cheia.
- **Não desenhe paginação numerada na web.** O carregamento é incremental nas duas plataformas.
- **Não mostre dado restrito na linha:** nem contagem de livros, nem estante, nem se a pessoa segue de volta, quando o perfil dela é privado e não sou seguidor aceito.
- Não desenhe texto substituto para quem não tem biografia: a linha simplesmente não aparece.
- Não desenhe as solicitações pendentes como terceira aba desta tela. Elas têm tela própria.

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


**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.
- Nada de desfazer em ação destrutiva pesada.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
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
