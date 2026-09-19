# F-PERFIL · Buscar leitor

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-PERFIL.md
**Requisitos:** RF-SOC-03 (buscar outro leitor **apenas por nome de usuário exato**)
**Não funcionais:** RNF-SEC-19 e RNF-SEC-44 (descoberta só por username exato, sem enumeração, sem prefixo, sem sugestão e sem diretório de usuários), RNF-SEC-03 (privacidade revalidada no servidor), RNF-USA-03, RNF-USA-05, RNF-ERR-09
**Regras de negócio:** RN-08 (o resultado traz só os campos públicos: nome, avatar e biografia, independentemente da privacidade)
**Versão web:** sim (RF-SOC-03 tem marcação na coluna Web de `REQUISITOS.md` §5.9)

---

## 1. Contexto

A única porta de entrada para encontrar outra pessoa no produto. O leitor digita o **nome de usuário exato** e recebe um resultado ou nenhum. Tela empilhada sobre a área `Perfil`, aberta pela lupa do header em [`meu-perfil.md`](meu-perfil.md), pelo vazio do feed em [`../F-FEED/feed.md`](../F-FEED/feed.md) e pelo estado `Perfil não encontrado` em [`perfil-de-outro-leitor.md`](perfil-de-outro-leitor.md). Sai para o perfil da pessoa encontrada.

**A ausência de descoberta aberta é decisão de produto, não limitação técnica.** O `REQUISITOS.md` §5.9 diz por extenso: não há busca exploratória de pessoas, sugestão de perfis nem diretório de usuários, porque o público é jovem e a descoberta precisa ser deliberada. RNF-SEC-19 e RNF-SEC-44 transformam isso em requisito de segurança contra enumeração.

Duas coisas que ela precisa resolver:

- **A regra do "exato" precisa estar na tela, antes da primeira tentativa.** Quem digita meio nome e não encontra ninguém vai concluir que a pessoa não está no aplicativo. O texto de aterrissagem existe para evitar essa conclusão errada.
- **O vazio não pode parecer erro nem parecer resposta sobre a existência da conta.** A frase é sobre a **busca**, não sobre a pessoa.

**Escopo desta entrega.** Nada de histórico de buscas, nada de sugestões, nada de "leitores que você talvez conheça", nada de busca por nome de exibição, e-mail ou livro em comum. O resultado é zero ou um perfil.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Buscar leitor · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

| Elemento | Conteúdo |
|---|---|
| Consulta com resultado | `rafaokamoto` |
| Consulta sem resultado | `rafa.okamoto` |
| Consulta parcial, no artboard de orientação | `rafa` |

**Perfil encontrado**, com os campos públicos de RN-08:

| Campo | Valor |
|---|---|
| Nome de exibição | `Rafael Okamoto` |
| Nome de usuário | `@rafaokamoto` |
| Biografia | `Professor de história. Leio mais não ficção do que deveria e anoto tudo na margem.` |
| Privacidade | `Perfil público` |
| Relação atual | não sigo |

**Nenhum dado restrito aparece no resultado:** sem contagem de livros, sem estante, sem resenha, sem nota. Nome, avatar e biografia são públicos em qualquer privacidade; o resto vive no perfil e é revalidado lá.

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

O header inteiro é o campo de busca, como no modo de busca da estante.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, que volta ao perfil.
- Campo ocupando o resto da linha: altura 48px, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, com `At` (Phosphor, `regular`, 20px, `grafite-suave`) dentro à esquerda e `space-3` de gap até o texto. Texto digitado em `body` `tinta`.
  - **`At` e não `MagnifyingGlass`:** o glifo diz que o campo espera um nome de usuário, e não um termo qualquer. A lupa que trouxe o leitor até aqui já cumpriu o papel de dizer que isto é busca.
- Placeholder em `grafite-suave`: `Nome de usuário exato`. Ele **delimita o escopo** e é a exceção declarada desta tela ao padrão de formulário de design §4.2, porque o campo é o header e não há espaço para label acima.
- Com texto, `X` (Phosphor, `regular`, 20px, `grafite`) à direita limpa o campo sem sair da tela.
- Foco: borda de 1.5px `musgo`, transição `dur-fast`, sem outline do browser.
- **Sem sino neste header:** o header é o campo. Esta é a mesma exceção que a estante declara no seu modo de busca.
- **A barra inferior continua visível**, com `Perfil` ativo.

### 4.1 Aterrissagem, sem consulta

Primeiro estado, e o mais importante: é ele que ensina a regra.

- Campo vazio, com o placeholder visível. **Sem foco automático:** o teclado não sobe sozinho, como na aterrissagem de `Descobrir`.
- `space-10` abaixo do header, bloco centralizado com `space-5` entre os elementos, largura máxima de 300px:
  - `At` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`, centralizado: `Busque pelo nome de usuário`.
  - Texto em `body` `grafite`, centralizado: `A busca por pessoas é exata: digite o nome de usuário inteiro, sem o arroba. Não existe lista de leitores para explorar.`
- **Sem histórico, sem sugestões, sem "leitores populares".**

### 4.2 Resultado encontrado

- Campo preenchido com `rafaokamoto`, com o `X` de limpar à direita.
- `space-6` abaixo do header, um único card de largura total menos o padding lateral, `radius` 12, fundo `papel-elevado`, padding `space-4`, com `elev-1`:
  - Avatar circular de 48px à esquerda, `space-4` de gap.
  - Nome `Rafael Okamoto` em `title-sm` `tinta` e `@rafaokamoto` em `caption` `grafite-suave` logo abaixo.
  - Biografia em `caption` `grafite`, no máximo duas linhas, com reticências ao truncar.
  - `CaretRight` (Phosphor, `regular`, 20px, `grafite-suave`) à direita.
- O card inteiro é acionável e leva a [`perfil-de-outro-leitor.md`](perfil-de-outro-leitor.md).
- **Sem botão `Seguir` dentro do card.** Seguir é decisão que se toma depois de olhar o perfil, e um botão de ação dentro de um resultado de busca convida ao clique automático.
- **Um resultado, nunca uma lista.** A busca é exata, então ou há um card ou não há nenhum.

### 4.3 Nenhum resultado

- Campo preenchido com `rafa.okamoto`.
- `space-10` abaixo do header, bloco centralizado com `space-5` entre os elementos:
  - `At` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhum leitor com esse nome de usuário`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 300px: `Confira a grafia. A busca precisa do nome de usuário inteiro e exato.`
- **A frase é sobre a busca, não sobre a pessoa.** Nada de `Esse usuário não existe`, que responderia se a conta existe ou não.
- **Sem `rubi`, sem banner, sem ícone de aviso:** não encontrar não é erro.
- **Sem sugestão de nomes parecidos**, que é exatamente a enumeração por aproximação que RNF-SEC-44 proíbe.

### 4.4 Consulta parcial

O leitor digitou `rafa` e enviou. **O resultado é o mesmo de 4.3**, e este artboard existe para deixar isso explícito no protótipo.

- Campo preenchido com `rafa`.
- Mesmo bloco de 4.3, com uma linha a mais abaixo do texto, em `caption` `grafite`: `Você digitou uma parte do nome. Busque o nome de usuário completo.`
- **Nada de resultado parcial, nada de "3 leitores começam com rafa", nada de contagem.** Informar quantos existem é enumerar.

### 4.5 Buscando, com cold start

- Campo preenchido e sem foco possível.
- No lugar do bloco central, **skeleton estático** de um card: retângulo de 72px de altura, `radius` 12, em `capa-placeholder`, com um círculo de 48px e duas barras dentro.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem spinner.
- Abaixo do skeleton, `space-4`, linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`

### 4.6 Erro de busca

Falha de rede ou serviço indisponível, que é diferente de não encontrar.

- Campo preenchido.
- Banner inline no lugar do bloco central, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível buscar agora. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.
- Este artboard e o 4.3 precisam ser visivelmente diferentes: **indisponibilidade não é ausência.**

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo.
- Área de conteúdo com padding lateral `space-8`.
- **Header de conteúdo de 72px** com o botão textual de retorno `Perfil` acima e, na linha do título, `Buscar leitor` em `display` `tinta` à esquerda e o campo de busca à direita, com 44px de altura e 360px de largura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, `At` dentro à esquerda e o mesmo placeholder. **Na web o campo não substitui o header:** há espaço para os dois.
- **O conteúdo não estica.** Resultado, vazio e erro vivem numa coluna de no máximo 560px alinhada à esquerda da área de conteúdo. Um único card ocupando 1440px é o erro que esta regra evita.
- O card de resultado ganha `hover` com `elev-2` e o nome em `musgo`, transição `dur-fast`. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** o campo desce para a linha de baixo do header, ocupando a largura inteira, e a sidebar dá lugar à barra inferior.

### 5.1 Aterrissagem, sem consulta

Sidebar com `Perfil` ativo, campo vazio no header, bloco de orientação alinhado ao topo da coluna de 560px, com `space-16` de respiro acima.

### 5.2 Resultado encontrado, com hover

Campo com `rafaokamoto`, card de resultado na coluna de 560px em estado de `hover`, com `elev-2` e nome em `musgo`. Serve para conferir que o card é reconhecível como acionável sem depender do `CaretRight`.

### 5.3 Nenhum resultado

Campo com `rafa.okamoto` e o bloco de vazio na coluna de 560px, sem nenhum tint de erro.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, aterrissagem.** Fundo `noite`. `ArrowLeft` em `papel-suave`. Campo em `noite-elevada`, **mais claro** que o fundo, borda `linha-noite`, `At` e placeholder em `grafite-fundo-escuro`, texto digitado em `papel-suave`. Bloco central com ícone em `grafite-fundo-escuro`, título em `papel-suave` e texto em `grafite-claro`. Barra inferior em `noite-elevada`, com **Perfil** ativo em `musgo-claro`.
- **Mobile, resultado encontrado.** Card em `noite-elevada`, **mais claro** que o fundo, nome em `papel-suave`, `@username` em `grafite-fundo-escuro`, biografia em `grafite-claro`, `CaretRight` em `grafite-fundo-escuro`.
- **Web, aterrissagem.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, `Perfil` ativo com fundo `musgo-fundo-escuro`. Campo do header com o mesmo tratamento do mobile.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`. O banner de erro no escuro usa `rubi-fundo-escuro` com ícone `rubi-claro` e texto `papel-suave`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de busca com ícone dentro, foco e limpar | documento-de-design §4.2 e §5.7 |
| Botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` | documento-de-design §3.1.3 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |
| Modo de busca ocupando o header inteiro no mobile | periodo-1/F-EST/estante.md |

**Componentes que ainda não existem na fonte.** Dois elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **O card de resultado de pessoa**, com avatar de 48px, nome, `@username` e biografia truncada. O §4.5 define as três variantes do card de livro e nenhuma variante de pessoa. Este card volta a aparecer em `seguidores-e-seguidos.md` e em `solicitacoes-de-seguir.md`, e os três precisam ser o mesmo componente.
2. **O ponto de entrada desta tela.** RF-SOC-03 não tem lugar fixo em nenhum protótipo anterior: o §5.3 só o oferece dentro do vazio do feed. Este prompt assume a lupa no header do perfil, proposta em `meu-perfil.md`, e a decisão é do grupo.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela, na web | `Buscar leitor` |
| Placeholder do campo | `Nome de usuário exato` |
| Aterrissagem, título | `Busque pelo nome de usuário` |
| Aterrissagem, texto | `A busca por pessoas é exata: digite o nome de usuário inteiro, sem o arroba. Não existe lista de leitores para explorar.` |
| Resultado, nome | `Rafael Okamoto` |
| Resultado, username | `@rafaokamoto` |
| Resultado, biografia | `Professor de história. Leio mais não ficção do que deveria e anoto tudo na margem.` |
| Vazio, título | `Nenhum leitor com esse nome de usuário` |
| Vazio, texto | `Confira a grafia. A busca precisa do nome de usuário inteiro e exato.` |
| Vazio de consulta parcial, linha extra | `Você digitou uma parte do nome. Busque o nome de usuário completo.` |
| Erro, texto | `Não foi possível buscar agora. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Web, retorno | `Perfil` |

Zero em-dash em toda a copy. Zero emoji. **Nenhuma frase desta tela afirma ou nega a existência de uma conta.**

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no mobile no `ArrowLeft`, no campo, no `X` de limpar e no card de resultado.
- O campo tem rótulo acessível `Nome de usuário exato` mesmo sem label visível, porque ele é o header.
- O resultado e o vazio são anunciados quando chegam, e o foco não pula para o card: quem usa leitor de tela ouve a mudança sem perder o campo.
- O card de resultado é um único destino anunciado como `Rafael Okamoto, arroba rafaokamoto`, sem repetir a biografia truncada.
- O vazio é anunciado como informação, nunca como erro; o erro de busca é anunciado como erro.
- Contraste WCAG AA no corpo nos dois temas. A biografia no card usa `grafite`; só o `@username` usa o terciário.
- Foco de teclado visível na web em campo, botão de limpar e card, na ordem visual.
- `prefers-reduced-motion` respeitado: o fade do skeleton e o hover do card viram estáticos.
- Nenhuma ação desta tela é destrutiva.

---

## 10. O que não fazer nesta tela

**Descoberta deliberada, a regra dura desta tela**

- **Não desenhe busca por prefixo, aproximação ou nome de exibição.** Só nome de usuário exato.
- **Não desenhe autocompletar**, nem sugestão enquanto digita, nem lista que filtra a cada tecla.
- **Não desenhe lista de resultados.** Zero ou um.
- **Não desenhe contagem de resultados** do tipo `3 leitores encontrados`: informar quantidade é enumerar.
- **Não sugira nomes parecidos** no estado vazio.
- **Não desenhe diretório de usuários, leitores populares, pessoas que você pode conhecer nem seguir de volta sugerido.**
- **Não diga que o usuário não existe.** A frase é sobre a busca.
- **Não desenhe histórico de buscas** nem buscas recentes: guardar quem alguém procurou é dado sensível sem requisito.
- Não desenhe busca por e-mail, telefone, contatos do aparelho nem importação de agenda.
- Não desenhe código QR nem link de convite.

**Específico da tela**

- **Não misture busca de pessoas com busca de livros.** Esta tela nunca retorna livro, e a aba `Descobrir` nunca retorna pessoa.
- **Não ponha botão `Seguir` no card de resultado.** Seguir se decide no perfil.
- **Não mostre dado restrito no resultado:** nem contagem de livros, nem estante, nem resenha, nem nota, mesmo que o perfil seja público.
- **Não trate o vazio como erro** e não trate indisponibilidade como vazio.
- Não use foco automático no campo ao abrir a tela.
- Não use placeholder genérico do acervo neste campo.

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

- Nada de hero de landing dentro do produto. Esta é tela de busca.
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
