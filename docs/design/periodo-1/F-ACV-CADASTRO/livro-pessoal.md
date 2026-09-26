# F-ACV-CADASTRO · Página do livro pessoal

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-ACV-CADASTRO.md
**Requisitos:** RF-ACV-09 (editar e excluir os livros pessoais que cadastrou), e a visualização que RN-03 e RN-15 definem
**Não funcionais:** RNF-SEC-02 (propriedade validada no servidor), RNF-SEC-06 (livro pessoal não é recuperável por busca, catálogo, filtro ou página de autor, editora e série), RNF-USA-04 (confirmação na exclusão), RNF-USA-02 (responsiva na web), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** RN-03 (tabela de comportamento do livro pessoal), RN-15 (duas vias de acesso de terceiros, modo consulta, privacidade herdada do perfil do dono), RN-14.7 (capa enviada pelo dono)
**Versão web:** sim. RF-ACV-09 tem marcação na coluna Web de `REQUISITOS.md` §5.2.

---

## 1. Contexto

É a página de um livro que só uma pessoa tem. Ela se parece com a página do livro oficial ([`../F-ACV-BUSCA/pagina-do-livro.md`](../F-ACV-BUSCA/pagina-do-livro.md)) e reaproveita a estrutura dela de propósito — mesma hierarquia de capa, ficha e conteúdo editorial —, mas **perde tudo que depende de haver mais de um leitor**: não tem nota dos leitores, não tem nota geral, não tem lista de resenhas de outras pessoas, não tem links de autor, editora ou série.

Esta é uma tela e não um estado do formulário porque ela é **um destino navegável com dois públicos**:

- **O dono**, que chega pela própria estante e vê a página completa, com as ações de leitura e os botões de editar e excluir.
- **Um terceiro**, que chega **exclusivamente pelo feed** (RN-15) e vê a mesma página em **modo consulta**: metadados, capa, nota do dono e resenha do dono, e mais nada. Sem estante, sem favorito, sem iniciar leitura, sem registrar progresso.

A diferença entre os dois modos é a coisa mais importante do desenho, e ela não é decoração: a restrição é validada no servidor, não apenas ocultada na interface (RN-15.3). O modo consulta não é a página do dono com botões cinzas — os botões **não existem** ali.

Duas outras coisas definem o desenho:

- **A nota do dono aparece sozinha, sem média e sem contagem** (RN-03). Nada de "4,5 de 12 avaliações". É a nota de uma pessoa, e o rótulo precisa deixar isso explícito para não parecer uma média de amostra pequena.
- **No Período 1 a nota e a resenha podem simplesmente não existir ainda.** F-AVA entrega a avaliação, e até lá a página precisa ficar bem sem elas. A ausência é estado normal, não erro, e não recebe mensagem de falha.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Livro pessoal · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

Dials: DESIGN_VARIANCE 6, MOTION_INTENSITY 4, VISUAL_DENSITY 4. Layout
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

**Nota sobre a variance desta tela.** A página do livro oficial sobe a `DESIGN_VARIANCE` para 7, com hero centrado e serifa em três blocos. Esta página herda aquela linguagem, mas um passo mais contida: 6. O livro pessoal é um objeto íntimo, de uma pessoa só, e um hero tão editorial quanto o de um título de catálogo soaria desproporcional.

---

## 3. Dados que aparecem na tela

| Dado | Valor |
|---|---|
| Título | `Cartas de um sertanejo` |
| Autor | `Marina Albuquerque` |
| Total de páginas | `184 páginas` |
| Sinopse | `Reunião de cartas trocadas entre 1978 e 1984, organizadas pela própria autora e publicadas em tiragem pequena pela editora da cidade.` |
| Capa | imagem enviada pelo dono, 3 por 4 |
| Nota do dono | `4,5` |
| Nome do dono, no modo consulta | `Rafaela Siqueira` |
| Username do dono, no modo consulta | `@rafaela.siq` |
| Resenha do dono, trecho | `Comprei numa feira em Feira de Santana por cinco reais e li em duas noites. As cartas de 1981 são as melhores.` |
| Data da resenha | `12 de setembro de 2026` |
| Status na estante, só para o dono | `Lendo` |
| Progresso, só para o dono | `página 96 de 184` |

A nota usa vírgula decimal e não recebe casa decimal quando é inteira: `4,5` e `4`, nunca `4.5` nem `4,0`.

---

## 4. Artboards mobile (390 x 844)

Dentro do shell autenticado, com barra inferior de quatro itens e header de 72px com o sino. Header com seta `ArrowLeft` à esquerda; **o título da tela no header fica vazio**, porque o título do livro aparece no hero logo abaixo e repeti-lo seria redundante. À direita do header, no modo dono, o ícone `DotsThreeVertical` (Phosphor, `regular`, 24px, `tinta`) antes do sino, que abre o menu de editar e excluir.

Padding lateral `space-5`.

### 4.1 Dono, com nota e resenha

1. `space-6` abaixo do header.
2. **Hero**, centralizado: capa de 140 por 187px, `radius` 12, `elev-2`. Sem capa própria, retângulo `capa-placeholder` de canto vivo com o ícone `BookOpen` (Phosphor, `regular`, 32px, `grafite-suave`) centralizado.
3. `space-5`, título em `display` `tinta`, centralizado, até três linhas.
4. `space-2`, autor em `body-lg` `grafite`, centralizado. **Não é link**: livro pessoal não tem página de autor (RN-03).
5. `space-3`, uma **etiqueta de livro pessoal**: pill de 24px de altura, fundo `musgo-fundo`, texto em `label` `musgo`, centralizada: `Livro pessoal`. Ela existe para o dono não confundir este livro com um do acervo quando abrir a página vinda da estante.
6. `space-6`, divisor de 1px `linha`.
7. **Ficha**, `space-5` de padding vertical: uma linha só, rótulo `Páginas` em `label` `grafite` à esquerda e `184 páginas` em `body` `tinta` à direita. Sem linha de editora, sem linha de ISBN, sem linha de série: esses dados não existem aqui, e uma linha com traço seria pior que a ausência.
8. Divisor de 1px `linha`.
9. **Bloco de leitura**, `space-5` de padding vertical, só no modo dono: status pill `Lendo` conforme §4.6, barra de progresso conforme §4.7 e `página 96 de 184` em `num-inline` `grafite`. Abaixo, `space-4`, botão primário pill de largura total: `Registrar progresso`.
10. Divisor.
11. **Sinopse**, `space-5` de padding vertical: título de seção em `title-sm` `tinta`, `Sinopse`; `space-3`; texto em **Newsreader** `body-lg` `tinta`, que é um dos três lugares do produto em que a serifa aparece.
12. Divisor.
13. **Sua nota**, `space-5` de padding vertical: título de seção em `title-sm` `tinta`, `Sua nota`; `space-3`; cinco estrelas de 24px conforme §4.3, com 4,5 preenchidas em `musgo`, e ao lado `4,5` em `num-inline` `tinta`. **Sem contagem de avaliações e sem média** (RN-03). Abaixo, `space-3`, botão textual `musgo`: `Editar nota`.
14. Divisor.
15. **Sua resenha**, `space-5` de padding vertical: título de seção em `title-sm` `tinta`, `Sua resenha`; `space-3`; texto em **Newsreader** `body-lg` `tinta`; `space-3`; data em `caption` `grafite-suave`, `12 de setembro de 2026`; `space-3`; botão textual `musgo`: `Editar resenha`.
16. `space-12` de respiro final, para o conteúdo não encostar na barra inferior.

### 4.2 Dono, sem nota e sem resenha

Igual a 4.1, com as seções 13 e 15 substituídas por um bloco único, `space-5` de padding vertical: texto em `body` `grafite`, `Você ainda não avaliou este livro.`, e abaixo, `space-3`, botão primário de largura automática: `Avaliar`. **Sem mensagem de erro e sem seção vazia com traço.** A ausência é normal.

### 4.3 Dono, sem sinopse

Igual a 4.1, com a seção 11 inteira ausente, divisor incluído. Sinopse é opcional no cadastro, e uma seção com "sem sinopse" ocuparia espaço para dizer nada.

### 4.4 Dono, menu de ações aberto

Bottom sheet sobre scrim `tinta` a 40%, fundo `papel`, `radius` 20 no topo, alça de 32 por 4px em `linha`, padding `space-6`:

1. Item `Editar livro`, altura 56px, ícone `PencilSimple` (Phosphor, `regular`, 20px, `tinta`) à esquerda, `space-4` de gap, rótulo em `body` `tinta`.
2. Divisor de 1px `linha`.
3. Item `Excluir livro`, altura 56px, ícone `Trash` (Phosphor, `regular`, 20px, `rubi`), rótulo em `body` `rubi`.
4. `space-4`, botão textual `grafite` de largura total: `Cancelar`.

A confirmação da exclusão é a mesma de [`cadastro-pessoal.md`](cadastro-pessoal.md) §4.8, e **não é redesenhada aqui**: mesmo texto, mesmo botão destrutivo em outline `rubi`.

### 4.5 Terceiro, modo consulta

Este artboard é o mais importante do conjunto, porque é a regra de RN-15 desenhada.

Igual a 4.1, com estas diferenças:

1. **Sem `DotsThreeVertical` no header.** Nada de editar, nada de excluir.
2. Abaixo da etiqueta `Livro pessoal`, `space-3`, uma linha de atribuição centralizada: avatar circular de 24px, `space-2` de gap, e texto em `caption` `grafite`: `Livro pessoal de Rafaela Siqueira`. O nome é link para o perfil do dono; o resto não é.
3. **O bloco de leitura inteiro não existe** — sem status pill, sem barra de progresso, sem `Registrar progresso`. Não é botão desabilitado: é ausência (RN-15.3).
4. A seção de nota vira `Nota de Rafaela`, e a de resenha vira `Resenha de Rafaela`. Sem os botões de editar.
5. Abaixo da resenha, as ações que **são** permitidas a terceiro (RN-15.4): botão de curtir com `ThumbsUp` (Phosphor, `regular`, 20px, `grafite`) e contador, botão de descurtir com `ThumbsDown`, e botão textual `grafite` `Denunciar`. Desenhe-os no estado inativo.
6. Sem a seção de avaliar, óbvio: terceiro não avalia livro pessoal de outra pessoa.

### 4.6 Terceiro, dono ainda sem nota e sem resenha

Igual a 4.5, com as seções de nota e resenha ausentes por completo, sem bloco substituto e sem convite: não há nada para um terceiro fazer ali. A página fica com hero, etiqueta, atribuição, ficha e sinopse. Este artboard existe para provar que a página não quebra nem fica com buraco.

### 4.7 Carregando

Skeleton com a forma do layout final (§7.4): retângulo de capa em `linha` com `radius` 12, duas barras para título, uma para autor, três linhas para a sinopse, todas em `linha` com `radius` 6, com um único fade de entrada. Sem spinner.

### 4.8 Livro excluído ou sem acesso

Quando o dono exclui o livro, o acesso de terceiros cessa imediatamente (RN-15.6), e a página aberta em outra aba deixa de existir. Estado vazio, alinhado ao topo: ícone `BookOpen` (Phosphor, `regular`, 32px, `grafite-suave`) em círculo de 72px `papel-elevado`; `space-6`; título em `title` `tinta`, `Este livro não está mais disponível`; `space-3`; texto em `body` `grafite`, centralizado, `Ele pode ter sido excluído por quem o cadastrou.`; `space-6`; botão textual `musgo`, `Voltar ao feed`.

O mesmo estado atende quem tentou abrir a página sem uma via válida. **Não existe mensagem que confirme a existência do livro** para quem não tem acesso.

---

## 5. Artboards web (1440 x 900)

Shell com sidebar retrátil, área de conteúdo com padding lateral `space-8`, sem sino.

A web usa **duas colunas**, como a página do livro oficial: coluna esquerda de 280px com a capa, a etiqueta, a ficha e o bloco de leitura; coluna direita com sinopse, nota e resenha. `space-12` de gap, largura máxima total de 1080px. O título e o autor ficam no **topo da coluna direita**, alinhados à esquerda e não centralizados — o hero centrado é do mobile; na web, uma coluna de texto alinhada lê melhor.

### 5.1 Dono, com nota e resenha

Duas colunas conforme acima. A ação de editar e excluir não fica em menu de três pontos: na web ela vira dois botões textuais no topo da coluna direita, alinhados à direita, `Editar` e `Excluir`, o segundo em `rubi`. `hover` em card, link e botão; foco de teclado visível.

### 5.2 Terceiro, modo consulta

Igual a 5.1, sem os botões de editar e excluir, sem o bloco de leitura na coluna esquerda, e com a linha de atribuição logo abaixo do autor, no topo da coluna direita.

### 5.3 Confirmação de exclusão

Dialog centrado de 480px, igual ao de [`cadastro-pessoal.md`](cadastro-pessoal.md) §5.4.

### 5.4 Livro excluído ou sem acesso

Estado vazio ocupando a largura da área de conteúdo, com o conteúdo em coluna centralizada de 480px, alinhado ao topo.

**Abaixo de 768px** as duas colunas colapsam em uma na ordem do mobile — hero, etiqueta, ficha, leitura, sinopse, nota, resenha —, a sidebar dá lugar à barra inferior, os botões de editar e excluir voltam para o menu de três pontos do header, e o dialog vira bottom sheet.

---

## 6. Artboards em modo escuro

Modo escuro é lock de página inteira (§3.1.2). Superfície elevada fica **mais clara** que o fundo, e os shadows têm metade da opacidade.

- **Mobile, dono com nota e resenha.** Fundo `noite`. Título em `papel-suave`, autor em `grafite-claro`. Etiqueta `Livro pessoal` com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Divisores em `linha-noite`. Rótulo da ficha em `grafite-claro`, valor em `papel-suave`. Sinopse e resenha em Newsreader `papel-suave`. Estrelas preenchidas em `musgo-claro`, vazias em `grafite-fundo-escuro`. Data em `grafite-fundo-escuro`. Barra de progresso com trilha `linha-noite` e preenchimento `broto-vivo`. Placeholder de capa em `capa-placeholder-noite`. Barra inferior em `noite-elevada`.
- **Mobile, terceiro em modo consulta.** O mesmo, com a linha de atribuição em `grafite-claro` e o nome do dono em `musgo-claro`.
- **Mobile, menu de ações.** Sheet em `noite-elevada` sobre scrim preto a 60%, alça em `linha-noite`, item de exclusão com ícone e rótulo em `rubi-claro`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Estrela de avaliação, variante de exibição, com meia estrela | documento-de-design §4.3 |
| Status pill dos cinco status de leitura | documento-de-design §4.6 |
| Barra de progresso de leitura | documento-de-design §4.7 |
| Bottom sheet no mobile e dialog centrado na web | documento-de-design §5.4 |
| Confirmação de ação destrutiva em modal | documento-de-design §7.8 e RNF-USA-04 |
| Botão primário pill, textual e destrutivo em outline | documento-de-design §4.1 |
| Placeholder de capa, retângulo de canto vivo | documento-de-design §4.5 e RN-14.4 |
| Estado vazio com desenho intencional | documento-de-design §5.1 e §8 |
| Skeleton com a forma do layout final | documento-de-design §3.6 e §7.4 |
| Newsreader em sinopse e resenha, dois dos três lugares da serifa | documento-de-design §3.2 |
| Escala tipográfica, com JetBrains Mono em `num-inline` | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell autenticado, barra inferior e sidebar | ../../periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Etiqueta `Livro pessoal`**, pill informativa em `musgo-fundo`. O sistema tem status pill de leitura e chip de assunto, mas nenhuma etiqueta de natureza do registro.
- **Linha de atribuição de dono**, com avatar pequeno e nome linkado, usada no modo consulta.
- **Modo consulta como variante de página**, isto é, a mesma página com um conjunto de ações ausente. Vale registrar porque F-LST vai precisar do mesmo comportamento na via por lista, no Período 2.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Etiqueta | `Livro pessoal` |
| Atribuição, modo consulta | `Livro pessoal de Rafaela Siqueira` |
| Rótulo da ficha | `Páginas` |
| Valor da ficha | `184 páginas` |
| Progresso | `página 96 de 184` |
| Botão de progresso | `Registrar progresso` |
| Seção de sinopse | `Sinopse` |
| Seção de nota, dono | `Sua nota` |
| Seção de nota, terceiro | `Nota de Rafaela` |
| Seção de resenha, dono | `Sua resenha` |
| Seção de resenha, terceiro | `Resenha de Rafaela` |
| Editar nota | `Editar nota` |
| Editar resenha | `Editar resenha` |
| Sem avaliação, dono | `Você ainda não avaliou este livro.` |
| Sem avaliação, botão | `Avaliar` |
| Menu, editar | `Editar livro` |
| Menu, excluir | `Excluir livro` |
| Menu, cancelar | `Cancelar` |
| Denunciar | `Denunciar` |
| Indisponível, título | `Este livro não está mais disponível` |
| Indisponível, texto | `Ele pode ter sido excluído por quem o cadastrou.` |
| Indisponível, botão | `Voltar ao feed` |

Zero em-dash em toda a copy. Zero emoji, e isso vale especialmente para as estrelas: é o ícone `Star` da Phosphor, nunca o emoji. A nota usa vírgula decimal e sem casa decimal quando inteira. A data por extenso em pt-BR, sem zero à esquerda no dia.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo e AAA no título quando possível. `grafite-suave` e `grafite-fundo-escuro` carregam só data e metadado.
- Alvo de toque de no mínimo 48px no mobile, inclusive nos botões de curtir e descurtir.
- A nota é anunciada por texto acessível completo, `4,5 de 5`, e não por cinco imagens de estrela soltas.
- Foco de teclado visível na web em borda de 1.5px `musgo`. No bottom sheet e no dialog, o foco fica preso enquanto abertos, `Esc` fecha, e o foco volta ao elemento que os abriu. No dialog de exclusão o foco entra em `Cancelar`.
- A seção de sinopse e a de resenha usam `lang="pt-BR"` e largura de medida confortável, já que são os blocos em serifa.
- `prefers-reduced-motion` respeitado: sob `reduce`, o sheet e o dialog entram sem deslizar e o skeleton não pulsa.
- Toda ação destrutiva pede confirmação em modal (RNF-USA-04), com botão destrutivo em outline `rubi`.

---

## 10. O que não fazer nesta tela

- **Não desenhe nota dos leitores nem nota geral.** RN-03: "não se aplicam" a livro pessoal. Nada de média, nada de contagem de avaliações, nada de histograma.
- **Não desenhe lista de resenhas.** Só existe a resenha do dono, e ela não é um item de uma lista de uma pessoa.
- **Não linke autor, editora ou série.** Livro pessoal não afeta contadores nem listagens dessas páginas (RN-03), e um link que leva a uma página vazia é pior que texto simples.
- **Não mostre ISBN.** Ele não existe (RN-02).
- **Não desenhe as ações do dono desabilitadas no modo consulta.** Elas não existem ali. Ocultar na interface não é controle de acesso, mas desenhar um botão cinza sugere que a permissão é uma questão de estado, e ela não é (RN-15.3, RNF-SEC-02).
- **Não ofereça adicionar à estante, favoritar, iniciar leitura ou registrar progresso a terceiro.** Nenhuma das quatro, em nenhuma forma.
- **Não confirme a existência do livro a quem não tem acesso.** O estado de indisponível é o mesmo para livro excluído e para acesso negado, e a copy não distingue os dois.
- **Não repita o título do livro no header** e no hero.
- **Não trate a ausência de nota, resenha ou sinopse como erro.** São estados normais, ainda mais no Período 1, em que F-AVA nem entregou a avaliação.
- Nada de gradiente de acento, nada de `#000000`, nada de sombra preta pura, nada de emoji, nada de loop infinito de motion (§7).
- Nada de bento grid decorativo nem hero de landing: a variance sobe para 6 no hero da capa, e para em pé (§7.3, §7.11).
