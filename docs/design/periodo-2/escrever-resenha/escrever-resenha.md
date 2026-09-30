# F-AVA-2 · Escrever resenha (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Escrever resenha`, gerado por `docs/design/periodo-1/F-AVA/escrever-resenha.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-AVA/escrever-resenha.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-AVA-2.md
**Requisitos que entram:**
- F-AVA-2: RF-AVA-09 (a resenha aceita formatação em Markdown, no subconjunto de RN-13, com pré-visualização antes de publicar)

**Não funcionais:** RNF-SEC-15 (Markdown renderizado com HTML embutido desabilitado no parser e saída sanitizada antes do DOM), RNF-SEC-14 (conteúdo do usuário tratado como texto), RNF-SEC-13 (limite de caracteres validado por esquema)
**Regras de negócio:** RN-13 (subconjunto permitido: negrito, itálico, tachado, lista ordenada, lista não ordenada e citação em bloco; proibidos: HTML embutido, links, imagens, blocos de código e tabelas; marcação não suportada aparece como texto literal; a mesma configuração vale nos dois clientes), RN-07 (uma resenha por livro, texto cru de até 5.000 caracteres, **contando a marcação**)
**Versão web:** sim. RF-AVA-09 tem marcação na coluna Web de `REQUISITOS.md` §5.5.

---

## 1. O que muda e por quê

No Período 1 a resenha era texto puro, e o prompt original proibia barra de formatação e pré-visualização. RF-AVA-09 traz as duas coisas. A resenha continua **armazenada como texto cru**: o editor mostra e grava a marcação digitada, e quem transforma a marcação em negrito, lista ou citação é o cliente, na hora de exibir. Nenhuma outra feature do Período 2 mexe nesta tela.

| O que entra | Onde | Por quê |
|---|---|---|
| Alternância segmentada `Escrever` e `Visualizar` | Topo do corpo, logo abaixo do cabeçalho do livro (mobile); topo da coluna da direita (web) | RF-AVA-09 pede pré-visualização antes de publicar |
| Barra de formatação com seis botões: negrito, itálico, tachado, lista não ordenada, lista ordenada, citação | Mobile: faixa nova no topo do bloco do rodapé do editor, logo acima da barra de spoiler e contador. Web: na mesma linha da alternância, à direita dela | Os seis itens são exatamente o subconjunto de RN-13, nem um a mais |
| Modo `Visualizar`, somente leitura, com a resenha renderizada no mesmo estilo da página do livro | No lugar da área de texto | O autor confere como o leitor vai ver |
| Faixa informativa quando o texto tem marcação fora do subconjunto | Topo da pré-visualização | RN-13.3: link, tabela, imagem, código e HTML aparecem literais, e o autor precisa saber por quê |
| Mensagem de limite excedido cita a formatação | Linha de erro acima do rodapé | RN-07: o limite conta o texto cru, com a marcação |

**O que deixa de valer do prompt do Período 1:** as duas proibições da seção 10 do original, "não desenhe barra de formatação" e "não desenhe aba ou botão de pré-visualização". Todas as outras regras daquele prompt continuam valendo, e a seção 10 abaixo as repete.

**Onde a barra de formatação fica no mobile, e por quê.** Com o teclado aberto, a ordem de baixo para cima é: teclado, barra de rodapé do editor (spoiler e contador, como no Período 1), barra de formatação, e acima dela a área de texto. As linhas de aviso e de erro que já existem (spoiler ligado, limite excedido, banner de erro) continuam **acima do bloco inteiro**, onde estão hoje. Três razões:

1. **Nada que já existe se move.** A barra de spoiler e contador continua encostada no teclado, na mesma posição de todos os artboards do Período 1, e as linhas de aviso continuam logo acima do bloco.
2. **Trocar de modo não faz o rodapé pular.** Em `Visualizar` não há o que formatar e a barra de formatação sai; como ela está acima do rodapé, quem some é só a faixa de cima, e o contador e o spoiler ficam onde estavam.
3. **Continua ao alcance do polegar.** A barra de formatação fica a 56px do teclado, dentro da mesma zona de alcance do toggle de spoiler.

**Spoiler na pré-visualização.** O modo `Visualizar` **não oculta** o texto quando `Contém spoiler` está ligado. O autor está conferindo a formatação e precisa ler o que escreveu; o prompt original já fixava que o spoiler muda como o texto é exibido para quem lê, não para quem escreve. A linha de aviso em `ambar` do Período 1 continua aparecendo acima do rodapé e diz como os outros leitores vão encontrar a resenha.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Escrever resenha · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
- Os artboards novos entram **no fim da linha** da sua plataforma, depois dos existentes, sem reordenar nenhum.

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
  página do livro. Fora desses três, serifa não aparece. Nesta tela a
  serifa aparece no texto em edição e na pré-visualização, porque os dois
  são o corpo da resenha. O negrito da resenha renderizada usa Newsreader
  600, como já está na página do livro.
JetBrains Mono (400, 500) em números, com numeral tabular.

ESCALA (nome, tamanho / entrelinha, peso)
display-hero  40 / 44   1.05   600
display       32 / 36   1.1    600
title-lg      24 / 28   1.2    600
title         20 / 24   1.25   600
title-sm      17 / 22   1.3    600
body-lg       17 / 26   1.5    400  (em contexto editorial, Newsreader 17 / 28)
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

FAIXA INFORMATIVA NEUTRA
Informação que não é erro nem alerta. Fundo musgo-fundo (musgo-fundo-escuro
no escuro), radius 12, padding space-4, sem borda. Ícone Info (Phosphor,
regular, 20px, musgo / musgo-claro) à esquerda, space-3 de gap, texto em
body tinta no claro e musgo-claro no escuro. Não fecha, não some sozinha e
não tem ação dentro.

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

## 3. O que permanece intocado

- **O header mobile:** `X` à esquerda, `Resenha` em `title` centralizado, `Publicar` (ou `Salvar`, ou `Publicando`) à direita, divisor `linha` na base, sem sino. As regras de habilitação de `Publicar` não mudam e valem nos dois modos: desabilitado com texto vazio ou acima do limite.
- **O cabeçalho do livro** (capa de 60 por 90px em canto vivo, `Torto Arado`, `Itamar Vieira Junior`, estrelas `sm` com `4,5`) e a linha `Publicada em 22 de agosto de 2026` quando a resenha já existe.
- **A barra de rodapé do editor:** fundo `papel-elevado` no mobile, 56px, toggle `Contém spoiler` à esquerda com os dois estados, contador permanente à direita, `Trash` em `rubi` quando a resenha já existe. As três faixas de cor do contador (`grafite`, `ambar` a partir de 4.750, `rubi` acima de 5.000) não mudam.
- **A área de texto em modo `Escrever`:** sem borda, sem fundo, texto em Newsreader 400 `tinta`, placeholder em Newsreader `grafite-suave`, cursor em `musgo`. **Ela continua mostrando o texto cru**, com os asteriscos, traços, tis e sinais de maior visíveis como foram digitados, na mesma cor do texto. Não há realce de sintaxe nem formatação ao vivo dentro do editor.
- **As linhas de aviso e de erro:** o aviso de spoiler em `caption` `ambar` e a mensagem de limite em `caption` `rubi`, na mesma posição (acima do bloco do rodapé); o banner de erro de publicação em `rubi-fundo`. Só o texto da mensagem de limite muda (seção 8).
- **A confirmação de exclusão** mobile e web, com a copy e os botões como estão.
- **Os estados `Publicando` e `Erro ao publicar`**, com a copy como está.
- **A estrutura web:** sidebar do shell com o lockup da logo e `Estante` ativo, header de conteúdo com `Resenha` em `display`, `Cancelar` e `Publicar`, coluna esquerda de 280px com a capa de 240 por 360px, coluna direita com `max-width` de 68ch, rodapé do editor no fim da coluna direita.
- **O texto de exemplo dos artboards existentes.** Ele é texto puro, e texto puro é Markdown válido: renderizado, fica igual. Os contadores (`412`, `4.847`, `5.126` de 5.000 caracteres) continuam os mesmos.
- **O tratamento do modo escuro** já desenhado nos três artboards escuros.

---

## 4. Artboards que mudam

### 4.1 Elementos que entram em todos os artboards mobile do modo `Escrever`

Valem para `Padrão, escrevendo`, `Vazio, primeiro acesso`, `Spoiler ligado`, `Perto do limite`, `Acima do limite`, `Editando resenha existente`, `Confirmação de exclusão` (atrás do scrim), `Publicando`, `Erro ao publicar` e `Escrevendo, modo escuro`, `Acima do limite, modo escuro`.

**Alternância segmentada `Escrever | Visualizar`.** Entra entre o divisor do cabeçalho do livro e a área de texto.

- Linha com padding lateral `space-5` e `space-3` de padding vertical, fundo `papel`.
- Contêiner de 48px de altura e 240px de largura, alinhado à esquerda, `radius-full`, fundo `papel-elevado`, borda de 1px `linha`, padding interno `space-1`.
- Dois segmentos de largura igual, cada um com 40px de altura e `radius-full`, rótulo centralizado em `body-strong`: `Escrever` e `Visualizar`. A área tocável de cada segmento é a altura inteira do contêiner, 48px.
- Segmento ativo: fundo `musgo-fundo`, rótulo `musgo`. Segmento inativo: fundo transparente, rótulo `grafite`.
- Nestes artboards, **`Escrever` está ativo**.
- A área de texto começa `space-2` abaixo da linha da alternância, e não mais `space-5` abaixo do divisor, para não somar respiro duplo.

**Barra de formatação.** Entra no topo do bloco do rodapé do editor, **acima** da barra de spoiler e contador, e **abaixo** das linhas de aviso e de erro que já existem.

- Largura total, 48px de altura, fundo `papel-elevado`, divisor de 1px `linha` no topo. A barra de spoiler e contador logo abaixo mantém o seu divisor de 1px `linha` no topo, que agora separa as duas faixas do mesmo bloco.
- Padding lateral `space-3`. Seis botões de 48 por 48px, alinhados à esquerda, sem gap entre eles, em dois grupos separados por um divisor vertical de 1px `linha` com 24px de altura e `space-2` de margem de cada lado:
  - grupo de trecho: `TextB` (negrito), `TextItalic` (itálico), `TextStrikethrough` (tachado);
  - grupo de bloco: `ListBullets` (lista não ordenada), `ListNumbers` (lista ordenada), `Quotes` (citação).
- Ícones Phosphor peso `regular`, 20px, cor `grafite`, centralizados no alvo de 48px.
- **Estado ativo** (o cursor ou a seleção está dentro daquela formatação): fundo `musgo-fundo` num quadrado de 40 por 40px com `radius` 12 centrado no alvo, ícone `musgo`, **ainda no peso `regular`**. Esta é uma exceção declarada à regra do `fill`: nos glifos de formatação da Phosphor o peso `fill` vira um quadrado cheio que se lê como outro ícone, e o estado já fica claro pelo fundo e pela cor.
- **Nada à direita dos seis botões.** Sem botão de ajuda, sem botão de mais opções, sem link, sem imagem, sem código.

**Comportamento dos botões**, que o artboard não mostra mas o protótipo precisa respeitar:

- Negrito, itálico e tachado **envolvem a seleção** com `**`, `*` e `~~`. Sem seleção, inserem o par e põem o cursor no meio. Tocar de novo com o cursor dentro da formatação remove o par.
- Lista não ordenada, lista ordenada e citação **põem o prefixo no começo de cada linha selecionada** (`- `, `1. ` numerado em sequência, `> `), ou da linha do cursor. Tocar de novo remove o prefixo.
- Dentro de uma lista, `Enter` continua a lista com o próximo marcador; `Enter` num item vazio sai da lista.
- A marcação inserida entra no contador na hora: ela é texto cru e conta no limite (RN-07).

### 4.2 `Publicando` (linha mobile)

Além de 4.1: a alternância e os seis botões de formatação ficam **desabilitados**, com rótulos e ícones em `grafite-suave` e sem estado ativo, como a área de texto, que já está em somente leitura.

### 4.3 `Vazio, primeiro acesso` (linha mobile)

Além de 4.1: os seis botões ficam **habilitados**, em `grafite`. Dá para escolher a formatação antes de escrever, como já dá para marcar o spoiler. O segmento `Visualizar` também fica habilitado; o que ele mostra com o texto vazio é o artboard novo 5.6.

### 4.4 Mensagem de limite excedido (`Acima do limite` mobile, web e escuro)

A linha em `caption` `rubi` acima do rodapé troca de texto, conforme a seção 8. Ela passa a dizer que a formatação conta no limite, porque agora o autor pode passar dos 5.000 caracteres com um texto que, renderizado, parece mais curto. O contador e a posição da linha não mudam.

### 4.5 Artboards web do modo `Escrever`

Valem para `Padrão, escrevendo`, `Spoiler ligado, hover no toggle`, `Acima do limite`, `Editando, confirmação de exclusão` (atrás do scrim) e `Confirmação de exclusão, modo escuro` (atrás do scrim).

- **Linha de ferramentas no topo da coluna da direita**, antes da área de texto, com a mesma largura da coluna (até 68ch), 40px de altura e `space-4` de margem abaixo:
  - À esquerda, a alternância segmentada com as medidas de web: contêiner de 40px de altura e 216px de largura, segmentos de 32px, mesmos tokens do mobile. `Escrever` ativo.
  - `space-6` depois, os seis botões de formatação em 40 por 40px, com o mesmo agrupamento e o mesmo divisor vertical do mobile, ícones de 20px `grafite`. Ativo: fundo `musgo-fundo` com `radius` 12 na caixa inteira de 40px, ícone `musgo`.
- **Na web a barra de formatação fica no topo, e não junto do rodapé** como no mobile. Na web não existe teclado virtual, e o lugar esperado das ferramentas de um editor de desktop é acima do texto, junto da alternância de modo.
- `hover` nos botões e nos segmentos inativos: fundo `linha`, transição `dur-fast`. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px, em cada segmento e em cada botão.
- O rodapé do editor, no fim da coluna da direita, não muda.

### 4.6 Artboards escuros existentes

`Escrevendo, modo escuro` e `Acima do limite, modo escuro` recebem 4.1 no tratamento escuro: contêiner da alternância em `noite-elevada` com borda `linha-noite`, segmento ativo em `musgo-fundo-escuro` com rótulo `musgo-claro`, inativo em `grafite-claro`. Barra de formatação em `noite-elevada`, divisor `linha-noite`, ícones `grafite-claro`. `Confirmação de exclusão, modo escuro` recebe 4.5 no mesmo tratamento, atrás do scrim.

---

## 5. Artboards novos

**Texto cru de exemplo dos artboards novos**, exatamente assim, com as quebras de linha:

```
A força do livro está na **troca de narradora** no meio da história. Bibiana conta a primeira parte, Belonísia a segunda, e a terceira vem de um lugar que eu *não esperava*.

O que fica depois de fechar:

- a disputa pela terra em Água Negra
- duas irmãs que se entendem sem falar
- ~~um final fechado~~ um final que pede releitura

Três cenas para reler:

1. a do machado
2. o jarê de Zeca Chapéu Grande
3. a última página

> Levei três dias e terminei querendo recomeçar.
```

São `473 de 5.000 caracteres`, dos quais 27 são marcação.

**Estilo da pré-visualização.** É o mesmo corpo de resenha em Markdown da página do livro, para que o autor veja exatamente o que o leitor vai ver:

- Texto em Newsreader 400, `body-lg` na variante editorial (17 / 28), `tinta`.
- Parágrafos separados por `space-3`.
- Negrito em Newsreader 600. Itálico em Newsreader italic. Tachado com risco de 1px na cor do texto.
- Lista não ordenada com marcador de ponto em `tinta`; lista ordenada com o numeral em Newsreader. Recuo de `space-5`, `space-1` entre itens.
- Citação em bloco com borda esquerda de 2px `linha`, padding esquerdo `space-4`, texto em Newsreader 400 `grafite`, sem itálico, sem aspas decorativas, sem ícone de aspas.
- Sem cursor, sem seleção de edição, sem borda em volta: a pré-visualização ocupa o mesmo lugar e as mesmas margens da área de texto.
- Marcação fora do subconjunto aparece **como texto literal**, no mesmo Newsreader 400 `tinta`, sem cor de link, sem sublinhado, sem caixa de tabela.

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Escrever resenha · Escrevendo com formatação`

- Header com `Publicar` ativo, cabeçalho do livro, alternância com `Escrever` ativo.
- Área de texto com o texto cru de exemplo, em Newsreader `tinta`, com toda a marcação visível literalmente: os `**`, o `*`, os `~~`, os `- `, os `1. ` e o `> `. O corpo corta no fim da viewport, no meio da lista ordenada.
- Teclado fechado. Cursor em `musgo` no fim de `recomeçar.`, fora do corte, então nenhum botão está ativo.
- Barra de formatação com os seis botões em repouso. Rodapé com o toggle desligado e `473 de 5.000 caracteres` em `grafite`.

#### 5.2 `Escrever resenha · Formatando, negrito ativo`

- O mesmo texto, rolado para o começo. O autor selecionou `troca de narradora` junto com os asteriscos: a seleção aparece em fundo `musgo-fundo` atrás do texto, com as duas alças de seleção do sistema em `musgo`.
- **Teclado aberto**, desenhado como o teclado padrão do Android em tema claro, com 264px de altura, encostado no rodapé da viewport. Ele é chrome do sistema e não usa tokens do produto.
- De baixo para cima, acima do teclado: a barra de spoiler e contador (`473 de 5.000 caracteres`), a barra de formatação com `TextB` **ativo** (fundo `musgo-fundo`, ícone `musgo`), e a área de texto.
- Header, cabeçalho do livro e alternância continuam no topo. A área de texto fica entre a alternância e a barra de formatação, com cerca de oito linhas visíveis.
- Este artboard é o que prova a decisão da seção 1: a barra de formatação fica acima do rodapé, e o rodapé fica encostado no teclado.

#### 5.3 `Escrever resenha · Visualizar`

- Header com `Publicar` ativo. Cabeçalho do livro.
- Alternância com **`Visualizar` ativo**.
- No lugar da área de texto, a resenha **renderizada** no estilo da pré-visualização: o primeiro parágrafo com `troca de narradora` em negrito e `não esperava` em itálico; `O que fica depois de fechar:`; a lista de três itens com `um final fechado` tachado; `Três cenas para reler:`; a lista numerada de 1 a 3; a citação `Levei três dias e terminei querendo recomeçar.` com a borda de 2px `linha`. Corta no fim da viewport se não couber.
- **A barra de formatação não existe neste modo.** O rodapé do editor fica sozinho, no mesmo lugar, com o toggle desligado e `473 de 5.000 caracteres`: **o contador continua contando o texto cru**, marcação incluída, e não o texto renderizado.
- Teclado fechado: a pré-visualização é somente leitura e tocar no texto não abre teclado nem volta ao modo de escrever. Só a alternância volta.

#### 5.4 `Escrever resenha · Visualizar, spoiler ligado`

- O mesmo de 5.3, com o toggle `Contém spoiler` ligado (fundo `ambar-fundo`, ícone e rótulo em `ambar`, rótulo em peso 600).
- Acima do rodapé, a linha de aviso de sempre, em `caption` `ambar`: `Sua resenha será exibida oculta. Quem quiser ler precisa tocar para revelar.`
- **O texto renderizado aparece inteiro, sem borrão, sem véu e sem botão de revelar.** A pré-visualização é para o autor.

#### 5.5 `Escrever resenha · Visualizar, marcação não suportada`

- O texto cru de exemplo com mais estas linhas no fim (texto total em `604 de 5.000 caracteres`):

```
Entrevista com o autor: [leia aqui](https://www.todavialivros.com.br/entrevista)

| Parte | Narradora |
|---|---|
| 1 | Bibiana |
```

- Alternância com `Visualizar` ativo.
- No topo da pré-visualização, antes do texto, a **faixa informativa neutra**: fundo `musgo-fundo`, `radius` 12, padding `space-4`, `Info` de 20px em `musgo`, texto em `body` `tinta`: `Links, imagens, tabelas, títulos, código e HTML aparecem como você digitou. A resenha aceita negrito, itálico, tachado, listas e citação.` `space-4` abaixo da faixa começa o texto.
- A pré-visualização rolada até o fim, com a lista numerada e a citação renderizadas e, depois delas, **a linha do link e as quatro linhas da tabela como texto literal**, em Newsreader 400 `tinta`, com colchetes, parênteses, endereço e barras verticais visíveis. O endereço não é azul, não é `musgo`, não é sublinhado e não é tocável. A tabela não vira grade.
- A faixa só existe quando o texto tem marcação fora do subconjunto. Em 5.3 ela não aparece.
- Rodapé com `604 de 5.000 caracteres` em `grafite`. `Publicar` continua ativo: marcação não suportada não impede publicar, ela só não é interpretada.

#### 5.6 `Escrever resenha · Visualizar, sem texto`

- Header com `Publicar` desabilitado em `grafite-suave`. Alternância com `Visualizar` ativo.
- No lugar do texto, bloco centralizado no espaço do corpo, `space-4` entre os elementos:
  - `Eye` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Texto em `body` `grafite`, centralizado, largura máxima de 260px: `Nada para visualizar ainda. Escreva sua resenha para ver como ela vai aparecer.`
- **Sem botão no bloco:** o segmento `Escrever` logo acima já é a ação.
- Rodapé com o toggle desligado e `0 de 5.000 caracteres`. Sem barra de formatação.

#### 5.7 `Escrever resenha · Acima do limite pela formatação`

- Alternância com `Visualizar` ativo. Pré-visualização de um texto longo, com negritos, itálicos e listas, cortando no fim da viewport.
- Contador em `rubi`: `5.012 de 5.000 caracteres`.
- Acima do rodapé, a mensagem em `caption` `rubi`, na versão nova da seção 8: `Sua resenha passou do limite em 12 caracteres, contando a formatação. Corte um trecho para publicar.`
- `Publicar` desabilitado em `grafite-suave`.
- O artboard mostra que o limite vale no modo `Visualizar` também, e que a conta é do texto cru: a pré-visualização não esconde o erro.

### Linha 2, web, no fim da linha, nesta ordem

Todos com a sidebar expandida em 248px e `Estante` ativo, header de conteúdo com `Resenha`, `Cancelar` e `Publicar`, coluna esquerda com a capa, título, autor e estrelas, como os artboards web existentes.

#### 5.8 `Escrever resenha · Escrevendo com formatação, hover na barra`

- Coluna da direita com a linha de ferramentas de 4.5: `Escrever` ativo e os seis botões.
- Área de texto com o texto cru de exemplo inteiro, marcação visível, em Newsreader dentro dos 68ch. Cursor em `musgo` dentro de `*não esperava*`, então `TextItalic` está **ativo**.
- Ponteiro sobre `ListNumbers`, com fundo `linha` no botão, para conferir que hover e ativo se distinguem.
- Rodapé com o toggle desligado e `473 de 5.000 caracteres`.

#### 5.9 `Escrever resenha · Visualizar`

- Linha de ferramentas com **`Visualizar` ativo** e **sem os seis botões**: a linha mantém os 40px de altura, só com a alternância à esquerda, para que o texto não suba ao trocar de modo.
- Pré-visualização do texto de exemplo no estilo da seção 5, dentro dos 68ch, cabendo inteira.
- Rodapé com `473 de 5.000 caracteres`.

#### 5.10 `Escrever resenha · Visualizar, marcação não suportada`

- O mesmo de 5.9 com o texto de 5.5, a faixa informativa neutra no topo da pré-visualização, com a largura da coluna, e o link e a tabela literais no fim.
- Rodapé com `604 de 5.000 caracteres`.

### Linha 3, modo escuro, no fim da linha

#### 5.11 `Escrever resenha · Visualizar, modo escuro` (mobile)

O artboard 5.3 no escuro. Fundo `noite`. Alternância em `noite-elevada` com borda `linha-noite`, `Visualizar` em `musgo-fundo-escuro` com rótulo `musgo-claro`, `Escrever` em `grafite-claro`. Texto renderizado em Newsreader `papel-suave`; citação com borda de 2px `linha-noite` e texto `grafite-claro`; marcadores de lista e numerais em `papel-suave`. Rodapé em `noite-elevada`, mais claro que o fundo, divisor `linha-noite`, contador em `grafite-claro`.

#### 5.12 `Escrever resenha · Escrevendo com formatação, modo escuro` (web)

O artboard 5.8 no escuro. Sidebar em `noite-elevada`, conteúdo em `noite`. Botões de formatação em `grafite-claro`; `TextItalic` ativo com fundo `musgo-fundo-escuro` e ícone `musgo-claro`; hover em `ListNumbers` com fundo `linha-noite`. Texto cru em Newsreader `papel-suave`, cursor em `musgo-claro`.

Nos dois, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`. A faixa informativa, quando aparece no escuro, usa fundo `musgo-fundo-escuro` com ícone e texto em `musgo-claro`.

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards do Período 1 continuam valendo como o modo `Escrever` da tela, com os acréscimos da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Corpo da resenha em Markdown renderizado (pesos, listas, citação em bloco com borda `linha`) | nasceu na edição `periodo-2/pagina-do-livro/pagina-do-livro.md`; aqui é reutilizado igual |
| Faixa informativa neutra | documento-de-design §4.15 |
| Serifa Newsreader no corpo da resenha | documento-de-design §3.2.2 |
| Botões e estados de foco e hover | documento-de-design §4.1 |
| Área de texto longa sem borda, toggle de spoiler e contador permanente | nasceram no prompt do Período 1 desta tela, sem mudança |
| Subconjunto de Markdown | REQUISITOS.md RN-13 |
| Paleta, escala, espaçamento, raio, elevação, motion | documento-de-design §3.1 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança (plano §3):

1. **Alternância segmentada de dois modos:** contêiner pill em `papel-elevado` com borda `linha`, segmento ativo em `musgo-fundo` com rótulo `musgo`, 48px no mobile e 40px na web. O documento não define controle segmentado; pills de filtro (§5.1) e chips de escolha única do lote 1 são outros componentes.
2. **Barra de formatação:** seis botões de ícone de 48px (mobile) ou 40px (web) em dois grupos com divisor vertical, estado ativo por fundo `musgo-fundo` e cor `musgo` **sem o peso `fill`** (exceção declarada à regra de ícone ativo do §6).
3. **Posição da barra por plataforma:** no mobile, faixa superior do bloco do rodapé do editor, acima da barra de spoiler e contador; na web, no topo da coluna, ao lado da alternância.
4. **Modo de pré-visualização somente leitura** no mesmo lugar da área de texto, sem a barra de formatação, com o contador contando o texto cru.
5. **Vazio da pré-visualização** com `Eye` de 32px e uma frase, sem botão.
6. **Uso da faixa informativa para marcação não suportada**, condicionada à presença dessa marcação no texto.

---

## 8. Copy nova ou alterada

| Onde | Antes | Depois |
|---|---|---|
| Alternância, modo de edição | não existia | `Escrever` |
| Alternância, modo de pré-visualização | não existia | `Visualizar` |
| Rótulo acessível, negrito | não existia | `Negrito` |
| Rótulo acessível, itálico | não existia | `Itálico` |
| Rótulo acessível, tachado | não existia | `Tachado` |
| Rótulo acessível, lista não ordenada | não existia | `Lista com marcadores` |
| Rótulo acessível, lista ordenada | não existia | `Lista numerada` |
| Rótulo acessível, citação | não existia | `Citação` |
| Rótulo acessível da barra | não existia | `Formatação` |
| Faixa de marcação não suportada | não existia | `Links, imagens, tabelas, títulos, código e HTML aparecem como você digitou. A resenha aceita negrito, itálico, tachado, listas e citação.` |
| Pré-visualização vazia | não existia | `Nada para visualizar ainda. Escreva sua resenha para ver como ela vai aparecer.` |
| Erro de limite, artboards existentes | `Sua resenha passou do limite em 126 caracteres. Corte um trecho para publicar.` | `Sua resenha passou do limite em 126 caracteres, contando a formatação. Corte um trecho para publicar.` |
| Erro de limite, artboard 5.7 | não existia | `Sua resenha passou do limite em 12 caracteres, contando a formatação. Corte um trecho para publicar.` |
| Contador, artboards novos | não existia | `473 de 5.000 caracteres`, `604 de 5.000 caracteres`, `5.012 de 5.000 caracteres`, `0 de 5.000 caracteres` |

Toda a outra copy do Período 1 continua igual. Zero em-dash em toda a copy, inclusive no texto de exemplo. Zero emoji na interface. Todo número traz a unidade.

---

## 9. Acessibilidade e interação do que muda

- **Alvo de toque:** cada segmento da alternância e cada botão de formatação têm 48px de alvo no mobile. Na web, 40px com foco visível.
- **Alternância como abas:** os dois segmentos são uma lista de abas com `Escrever` e `Visualizar`; o leitor de tela anuncia qual está selecionada. Setas esquerda e direita trocam de aba na web.
- **Estado dos botões sem depender de cor:** cada botão de formatação é um botão de alternar, com estado pressionado exposto ao leitor de tela (`Negrito, ativado`). O fundo `musgo-fundo` é o reforço visual, não o único sinal.
- **Atalhos na web:** `Ctrl+B` e `Ctrl+I` (`Cmd` no macOS) aplicam negrito e itálico, e são expostos no rótulo acessível dos dois botões. Os outros quatro não têm atalho.
- **A pré-visualização preserva a semântica:** lista é lista, item é item, citação é citação para o leitor de tela. Marcação literal é lida como texto.
- **Trocar de modo não perde nada:** voltar a `Escrever` devolve o cursor e a rolagem ao ponto em que estavam. Trocar de modo não publica, não salva e não descarta.
- **O contador é o mesmo nos dois modos** e continua anunciado só quando cruza as faixas de aviso e de erro.
- **Contraste:** `grafite` dos ícones em repouso sobre `papel-elevado` e `musgo` sobre `musgo-fundo` passam AA para ícone. A citação em `grafite` sobre `papel` passa AA para corpo; nada essencial fica em `grafite-suave`.
- **Motion:** a troca de modo é instantânea, sem deslize de conteúdo, sem crossfade longo; no máximo um fade de `dur-fast`. Sob `prefers-reduced-motion`, troca sem transição. A barra de formatação aparece e some sem animação.
- **Escalonamento de texto do sistema:** com fonte aumentada, os rótulos da alternância não quebram linha (o contêiner cresce em altura) e a barra de formatação continua em uma linha, porque os botões são só ícone.
- **Fechar com texto não salvo** continua pedindo confirmação nos dois modos, pelo `X` no mobile e pelo `Esc` na web.

---

## 10. O que não fazer nesta edição

**Regra da edição**

- **Não redesenhe o que não foi citado.** Header, cabeçalho do livro, rodapé do editor, confirmação de exclusão, estados de publicação e o layout web ficam como estão.
- **Não reordene nem remova artboard existente.** Os novos entram no fim de cada linha.
- **Não mova a barra de spoiler e contador no mobile.** Ela continua encostada no teclado; a barra de formatação entra acima dela.
- **Não reintroduza o que o prompt original proibia e continua valendo:** curtida, descurtida e contadores de reação nesta tela; cadastro de frases; comentários na resenha; rascunho com salvamento automático e aviso do tipo `salvo há 3 segundos`; spinner ao publicar; exigir leitura concluída; exigir nota para publicar.

**Específico do Markdown**

- **Não ofereça nada fora do subconjunto de RN-13.** Nada de botão de link, imagem, código, tabela, título, cor de texto, sublinhado, alinhamento, emoji ou menção. São seis botões e só seis.
- **Não formate o texto dentro do editor.** O modo `Escrever` mostra o texto cru, com a marcação visível e na mesma cor do texto. Nada de editor visual, nada de negrito aparecendo enquanto se digita, nada de asterisco escondido.
- **Não pinte a marcação literal como link** na pré-visualização. Endereço digitado não é azul, não é `musgo`, não é sublinhado e não é tocável.
- **Não transforme a tabela em grade** nem o título em texto maior. Marcação não suportada é texto comum.
- **Não oculte o texto na pré-visualização** quando o spoiler está ligado.
- **Não conte o texto renderizado no contador.** O limite é do texto cru, com a marcação.
- **Não corte o texto no limite** nem bloqueie a digitação. Só a publicação é bloqueada.
- **Não divida a coluna da web** em editor e pré-visualização lado a lado. A web usa a mesma alternância do mobile, dentro dos 68ch.
- **Não use a serifa na interface nova.** A alternância, os rótulos e a faixa informativa são Manrope. Newsreader só no texto da resenha, em edição e na pré-visualização.
- Não desenhe folha de ajuda de Markdown, tabela de sintaxe nem tour de primeira vez. A barra de formatação é a ajuda.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2.
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
- Um único acento: `musgo`. Nada de azul em link literal, nada de segunda cor no estado ativo da barra.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.
- Nada de animação de deslize ao trocar entre `Escrever` e `Visualizar`.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é: `Escrever`, `Visualizar`, não "Rascunhar" nem "Espiar".
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Os seis ícones são Phosphor: `TextB`, `TextItalic`, `TextStrikethrough`, `ListBullets`, `ListNumbers`, `Quotes`.
- Nada de capa de livro com canto arredondado.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline `rubi`.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px: abaixo disso a tela vira o desenho mobile, com a barra de formatação no bloco do rodapé.
- Nada de conteúdo essencial escondido em hover. O nome de cada botão está no rótulo acessível, e o ícone basta para quem vê.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Formulários**

- Nada de placeholder no lugar do label: o título da tela e o cabeçalho do livro dizem o que se escreve, como no Período 1.
- Nada de helper que só aparece depois do erro. O contador é permanente.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.

**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de botão destrutivo preenchido.
- Nada de desfazer em ação destrutiva pesada.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
