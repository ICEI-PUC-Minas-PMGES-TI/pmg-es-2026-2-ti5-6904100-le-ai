# F-STA · Estatísticas

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-STA.md
**Requisitos:** RF-STA-01 (totais de livros concluídos, páginas lidas e tempo de leitura, por ano e no acumulado), RF-STA-02 (médias de páginas por dia, dias por livro e nota média atribuída), RF-STA-03 (gráficos de evolução de páginas por mês e de livros concluídos por mês)
**Requisito que esta tela não desenha:** RF-STA-05 (recálculo assíncrono) é requisito de sistema e não gera tela; aqui ele aparece só como efeito, numa linha de rodapé. RF-STA-04 (distribuição das notas que o leitor deu) é Opcional, do Período 3, e fica fora.
**Não funcionais:** RNF-SEC-02 (o painel é do próprio leitor, validado no servidor), RNF-USA-02, RNF-USA-03 (contraste dos gráficos), RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-04 (páginas de leituras abandonadas contam nas páginas lidas; só leitura finalizada conta como livro concluído), RN-17 (páginas lidas são derivadas das atualizações de progresso; o tempo vem da sessão cronometrada ou do tempo informado, que é opcional no registro manual), RN-08 (o perfil de outro leitor mostra só o bloco resumido, nunca este painel)
**Versão web:** sim. RF-STA-01, RF-STA-02 e RF-STA-03 têm marcação na coluna Web de `REQUISITOS.md` §5.8.
**De onde se chega:** do bloco `Estatísticas do ano` do **Meu perfil**, pelo botão textual `Ver estatísticas`, no mobile e na web (na web, o bloco fica na coluna de identidade do perfil). O bloco é desenhado na edição do perfil, em outro prompt (`docs/design/periodo-2/meu-perfil/meu-perfil.md`, a escrever). Esta tela fica com a área **Perfil** ativa no shell.

---

## 1. Contexto

O **registro** em número. A estante diz o que está na mão agora, o histórico diz o que foi concluído e quando; o painel responde às perguntas de quem quer ver o próprio hábito: "quantas páginas eu li este ano?", "quanto tempo eu passei lendo?", "estou lendo mais que no ano passado?", "em que mês eu parei?".

Quem usa é o próprio leitor, e só ele. O painel é privado: o perfil de outro leitor mostra no máximo o bloco resumido do ano, sob a privacidade do perfil (RN-08), e não leva a esta tela. Chega-se aqui pelo Meu perfil e daqui não se vai a lugar nenhum além de voltar: o painel é consulta, não tem ação sobre os dados.

Quatro coisas que a tela precisa resolver:

- **Um período por vez.** O leitor escolhe um ano ou o acumulado de toda a conta. O ano corrente abre selecionado. Totais, médias e gráficos obedecem ao mesmo período, sem misturar.
- **Ausente não é zero.** Uma média sem denominador não existe: em um ano sem nenhuma leitura concluída, `dias por livro` não é `0 dias`, é a frase `Sem leituras concluídas em 2023`. Já o total de livros concluídos nesse mesmo ano é zero de verdade, e aparece como `0 livros`.
- **As regras de conta ficam à vista.** Páginas lidas incluem as leituras abandonadas; páginas por dia só contam os dias em que houve registro; dias por livro vão do início ao fim de cada leitura concluída, inclusive os dias sem leitura; o tempo soma só o que foi cronometrado ou informado. Isso aparece em helpers curtos, visíveis o tempo todo, para que ninguém ache que o número está errado.
- **Gráfico legível sem cor.** Os dois gráficos são de colunas, uma série cada, com eixo, valor no toque e uma visão em tabela para quem não enxerga o gráfico.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Estatísticas · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
capa-placeholder #DED4BC   capa de livro ainda não carregada, e skeleton

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
capa-placeholder-noite #3A342A  capa não carregada, e skeleton

Regra do acento: musgo é a cor de ação em toda a interface. Nenhuma tela usa
azul, roxo ou rosa em CTA. rubi só em contexto destrutivo e de erro, ambar só
em alerta, broto só em progresso e gamificação. Sem gradiente de acento, sem
gradiente em texto, sem sombra preta pura.

GRÁFICOS
Gráfico usa musgo como cor principal, broto como secundária e grafite como
neutra, com no máximo três séries por gráfico. Nesta tela cada gráfico tem
UMA série, em musgo (musgo-claro no escuro). Contraste da coluna contra o
fundo: musgo sobre papel-elevado 6,15:1; musgo-claro sobre noite-elevada
7,21:1. broto sobre papel fica em 2,5:1, abaixo do mínimo de 3:1 para marca
gráfica, e por isso não pinta coluna nesta tela.

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

MODO ESCURO
Cidadão de primeira classe e lock de página inteira: nenhuma seção inverte no
meio da rolagem. Superfície elevada fica MAIS CLARA que o fundo, nunca mais
escura.

CONTRASTE
WCAG AA no corpo, AAA no título quando possível. grafite-suave e
grafite-fundo-escuro passam apenas em tamanho grande: nunca carregam texto de
corpo nem informação essencial. Marca gráfica (coluna de gráfico) com no
mínimo 3:1 contra a superfície em que está.
```

---

## 3. Dados que aparecem na tela

**Leitora:** Marina Beltrão (`@marinableu`), conta criada em **12 de novembro de 2023**. Hoje é **29 de setembro de 2026**. Todos os valores são mock, internamente consistentes: a soma dos meses bate com o total do ano, e a soma dos anos bate com o acumulado.

**Períodos disponíveis no seletor:** `2026`, `2025`, `2024`, `2023` e `Acumulado`. Só entram anos com algum registro de progresso.

### Totais por período (RF-STA-01)

| Período | Livros concluídos | Páginas lidas | Tempo de leitura |
|---|---|---|---|
| 2026 (até 29 de setembro) | 9 livros | 3.818 páginas | 71 h 20 min |
| 2025 | 14 livros | 5.150 páginas | 88 h 05 min |
| 2024 | 11 livros | 4.210 páginas | 64 h 30 min |
| 2023 (desde 12 de novembro) | 0 livros | 360 páginas | 7 h 40 min |
| Acumulado | 34 livros | 13.538 páginas | 231 h 35 min |

### Médias por período (RF-STA-02)

| Período | Páginas por dia | Dias por livro | Nota média atribuída |
|---|---|---|---|
| 2026 | 20,4 páginas por dia (3.818 páginas em 187 dias com leitura) | 19,1 dias por livro (172 dias em 9 leituras concluídas) | 4,2 estrelas (8 notas) |
| 2025 | 21,4 páginas por dia (5.150 páginas em 241 dias com leitura) | 19 dias por livro (266 dias em 14 leituras concluídas) | 3,9 estrelas (13 notas) |
| 2024 | 23,9 páginas por dia (4.210 páginas em 176 dias com leitura) | 22 dias por livro (242 dias em 11 leituras concluídas) | 4,1 estrelas (10 notas) |
| 2023 | 25,7 páginas por dia (360 páginas em 14 dias com leitura) | **ausente**: nenhuma leitura concluída | **ausente**: nenhuma nota dada |
| Acumulado | 21,9 páginas por dia (13.538 páginas em 618 dias com leitura) | 20 dias por livro (680 dias em 34 leituras concluídas) | 4,0 estrelas (31 notas) |

**Ausente é ausente.** Em 2023, dias por livro e nota média não viram `0` nem traço: a célula mostra uma frase. O total `0 livros` de 2023 é um zero real, e aparece como número.

### Séries mensais (RF-STA-03)

**2026, de janeiro a setembro.** Outubro, novembro e dezembro ainda não aconteceram e **não aparecem no eixo**: o gráfico do ano corrente vai até o mês de hoje. Setembro está em andamento.

| Mês | jan | fev | mar | abr | mai | jun | jul | ago | set |
|---|---|---|---|---|---|---|---|---|---|
| Páginas | 412 | 356 | 498 | 287 | 530 | 441 | 604 | 372 | 318 |
| Livros concluídos | 1 | 1 | 2 | 0 | 1 | 1 | 2 | 0 | 1 |

Soma: 3.818 páginas, 9 livros. Mês com mais páginas: **julho, 604 páginas**.

**2025, de janeiro a dezembro.**

| Mês | jan | fev | mar | abr | mai | jun | jul | ago | set | out | nov | dez |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Páginas | 380 | 310 | 452 | 405 | 298 | 520 | 610 | 488 | 344 | 402 | 366 | 575 |
| Livros concluídos | 1 | 1 | 1 | 2 | 0 | 1 | 2 | 1 | 1 | 1 | 1 | 2 |

Soma: 5.150 páginas, 14 livros. Mês com mais páginas: **julho, 610 páginas**.

**2023, novembro e dezembro.** A conta começou em 12 de novembro; o eixo começa no primeiro mês com registro. Novembro: 146 páginas, 0 livros. Dezembro: 214 páginas, 0 livros.

**Acumulado, por ano.** No acumulado os gráficos passam a uma coluna por ano, porque 35 meses não cabem legíveis em 390px: `2023` 360 páginas e 0 livros; `2024` 4.210 páginas e 11 livros; `2025` 5.150 páginas e 14 livros; `2026` 3.818 páginas e 9 livros, até hoje.

### Leitora nova

Para o estado vazio: **Caio Nogueira** (`@caionog`), conta criada hoje, sem nenhum registro de progresso, nenhuma leitura concluída e nenhuma nota.

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
que salta. **Nesta tela o item ativo é `Perfil`.**

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
ativo é `Perfil`.**

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

Header de tela de detalhe, empilhada sobre o Meu perfil.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando ao Meu perfil.
- Título `Estatísticas` em `display` `tinta`, à esquerda, logo depois da seta, alinhado à base.
- `Bell` à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Faixa de períodos

Logo abaixo do header, `space-4` de respiro, faixa horizontal rolável de pills, padding lateral `space-5`, `space-2` de gap. Mesmo desenho dos pills de filtro da Estante:

- Pill inativo: `radius-full`, padding `space-2 space-4`, borda de 1px `linha`, fundo transparente, texto em `caption` `grafite`.
- Pill ativo: fundo `musgo-fundo`, sem borda, texto em `caption` peso 600 `musgo`.
- Ordem: `2026`, `2025`, `2024`, `2023`, `Acumulado`. Os anos em `num-inline` no tamanho do `caption`. O ano corrente abre ativo.
- Seleção única. A faixa rola sem seta, sem gradiente de fade e sem indicador de rolagem. Com cinco pills ela cabe inteira em 390px.

### Linha de período

Abaixo da faixa, padding lateral `space-5`, `space-3` de respiro: em `caption` `grafite`, o intervalo exato que os números cobrem.

- Ano corrente: `De 1º de janeiro a 29 de setembro de 2026`.
- Ano fechado: `De 1º de janeiro a 31 de dezembro de 2025`.
- Ano de criação da conta: `De 12 de novembro a 31 de dezembro de 2023, desde que você entrou`.
- Acumulado: `Desde 12 de novembro de 2023, quando você entrou`.

### Seção `Totais`

`space-6` de respiro acima. Título de seção `Totais` em `title-lg` `tinta`, padding lateral `space-5`.

- `space-3` abaixo, um container único `papel-elevado`, `radius-md`, `elev-0`, margem lateral `space-5`, com **três linhas de métrica empilhadas**, padding `space-4 space-5`, divisor de 1px `linha` entre elas:
  - Label em `caption` `grafite` em cima; `space-1` abaixo, o valor: número em `num-display` `tinta` seguido da unidade em `body-strong` `grafite`, alinhados pela linha de base, com `space-2` de gap.
  - `Livros concluídos` · `9` `livros`.
  - `Páginas lidas` · `3.818` `páginas`.
  - `Tempo de leitura` · `71` `h` `20` `min`: cada número em `num-display`, cada unidade em `body-strong` `grafite`, com `space-1` entre número e unidade e `space-2` entre `h` e o segundo número.
- **Helper da seção**, `space-3` abaixo do container, padding lateral `space-5`, em `caption` `grafite`, visível o tempo todo: `Páginas lidas incluem as leituras que você abandonou. O tempo soma as sessões cronometradas e o tempo que você informou nos registros.`

As três métricas são linhas cheias, não três cards lado a lado: `71 h 20 min` em `num-display` não cabe num terço de 390px.

### Seção `Médias`

`space-6` de respiro acima. Título `Médias` em `title-lg` `tinta`, padding lateral `space-5`.

- `space-3` abaixo, container `papel-elevado`, `radius-md`, margem lateral `space-5`, com três linhas de padding `space-4 space-5` e divisor de 1px `linha`:
  - À esquerda, o label em `body-strong` `tinta` e, abaixo, o helper em `caption` `grafite` com a regra da conta, em até duas linhas.
  - À direita, alinhado ao topo, o valor: número em `title` com família JetBrains Mono peso 500 e numeral tabular (o mesmo desenho do `num-inline`, no tamanho do `title`) cor `tinta`, e a unidade abaixo em `caption` `grafite`, os dois alinhados à direita.
  - `Páginas por dia` · helper `Só conta os dias em que você registrou leitura.` · `20,4` / `páginas por dia`.
  - `Dias por livro` · helper `Do início ao fim de cada leitura concluída, com os dias sem leitura.` · `19,1` / `dias por livro`.
  - `Nota média` · helper `Média das 8 notas que você deu em 2026.` · `4,2` / `estrelas`.
- **Média ausente.** Quando falta denominador, o lugar do número mostra uma frase em `caption` `grafite`, alinhada à direita, com no máximo 140px de largura, e **nenhum número**: `Sem leituras concluídas em 2023` ou `Nenhuma nota dada em 2023`. O helper da linha continua lá. Nada de `0`, nada de `-`, nada de `N/A`.
- Nenhuma estrela desenhada ao lado da nota média: o componente de estrela do produto é de dar nota a um livro, e aqui é só um número.

### Seção `Páginas por mês`

`space-6` de respiro acima. Card `papel-elevado`, `radius-md`, margem lateral `space-5`, padding `space-5`.

- Título `Páginas por mês` em `title-sm` `tinta`. Abaixo, em `caption` `grafite`: `3.818 páginas de janeiro a setembro`.
- `space-4` abaixo, a **área do gráfico**, 180px de altura, largura total do card:
  - **Colunas** de uma série só, cor `musgo`, uma por mês, com largura de 20px e nunca mais que 24px; o que sobra do espaço de cada mês é ar. Ponta superior com raio de 4px, base reta, todas crescendo da mesma linha de base. Sem contorno, sem sombra, sem gradiente, sem textura.
  - **Eixo Y** à esquerda, sem linha de eixo, só as marcas em `caption` `grafite` com numeral tabular: `0`, `200`, `400`, `600`. O domínio vai de 0 a 650 páginas. **Linhas de grade** horizontais de 1px `linha`, sólidas, na altura de cada marca; a de 0 é a linha de base.
  - **Eixo X** abaixo, em `caption` `grafite`, com o mês abreviado em minúsculas centralizado sob cada coluna: `jan`, `fev`, `mar`, `abr`, `mai`, `jun`, `jul`, `ago`, `set`. No ano corrente o eixo **termina no mês de hoje**: não há `out`, `nov` nem `dez` desenhados.
  - **Um único rótulo direto:** sobre a coluna de julho, o valor mais alto, `604 páginas` em `caption` peso 600 `tinta`, centralizado, `space-1` acima da ponta. Nenhum outro mês leva número.
  - Mês com zero páginas não tem coluna: só a linha de base naquele ponto. O toque ainda funciona e mostra o zero.
- Sem legenda: há uma série só, e o título já diz o que está desenhado.
- `space-3` abaixo da área, o botão textual `musgo`, alinhado à esquerda, com `Table` (Phosphor, `regular`, 20px, `musgo`) à esquerda: `Ver como tabela`.

### Seção `Livros concluídos por mês`

`space-4` de respiro acima. Mesmo card e mesma anatomia do gráfico de páginas:

- Título `Livros concluídos por mês` em `title-sm` `tinta`. Abaixo, em `caption` `grafite`: `9 livros de janeiro a setembro`.
- Área de 140px. Eixo Y com marcas inteiras `0`, `1`, `2`, `3`, domínio de 0 a 3 livros. Colunas `musgo` de 20px, pontas com raio de 4px.
- Rótulo direto só no primeiro mês de valor máximo, `mar`: `2 livros`. Julho também tem 2 e não leva rótulo, para não pôr número em toda coluna.
- `abr` e `ago` com zero: sem coluna.
- Botão textual `Ver como tabela`, igual ao do gráfico de páginas.

### Valor no toque

Tocar numa coluna (ou em qualquer ponto da faixa vertical do mês, que é a área tocável, com pelo menos 32px de largura e a altura inteira do gráfico) mostra o valor:

- Um **balão** `papel`, `radius` 12, `elev-2`, padding `space-2 space-3`, posicionado acima da coluna, sem seta, sem sair do card: encosta na borda quando o mês é o primeiro ou o último.
- Dentro, em duas linhas: o mês por extenso em `caption` `grafite` (`Julho de 2026`) e o valor em `body-strong` `tinta` (`604 páginas`).
- O mês tocado ganha uma faixa vertical de fundo `musgo-fundo` atrás da coluna, com a largura da área tocável e `radius-sm`. A coluna não muda de cor.
- No mês corrente o balão diz `Setembro de 2026, até hoje`. No mês com zero, `Abril de 2026` e `0 livros concluídos`.
- Tocar fora do gráfico ou em outro mês troca ou fecha o balão. Entrada com fade em `dur-fast`, estático sob `prefers-reduced-motion`.

### Visão em tabela

`Ver como tabela` troca, dentro do mesmo card, a área do gráfico por uma tabela; o botão passa a `Ver como gráfico` com `ChartBar` (Phosphor, `regular`, 20px, `musgo`).

- Duas colunas, cabeçalho em `label` `grafite`: `Mês` e `Páginas` (ou `Livros`). Linhas de 44px com divisor de 1px `linha`.
- Mês por extenso em `body` `tinta` (`Janeiro`); valor em `num-inline` `tinta`, alinhado à direita, com a unidade: `412 páginas`, `1 livro`, `0 livros`.
- Setembro leva `até hoje` em `caption` `grafite` ao lado do nome.
- A tabela ocupa a altura que precisar; o card cresce. A escolha vale só para aquele card.

### Rodapé

`space-6` abaixo do último card, padding lateral `space-5`, em `caption` `grafite`, centralizado: `Um registro novo pode levar alguns instantes para aparecer aqui.` Esse é o único vestígio do recálculo assíncrono na tela. `space-8` abaixo, fim da rolagem, antes da barra inferior.

### 4.1 Padrão, ano corrente

Header, faixa com `2026` ativo, linha `De 1º de janeiro a 29 de setembro de 2026`. Seção `Totais` inteira com o helper, e a seção `Médias` com as três linhas, a última cortada pela barra inferior se não couber. Barra inferior com **Perfil** ativo. Badge de `2` no sino.

### 4.2 Ano corrente, gráficos (rolada)

A mesma tela rolada até os gráficos. Header com divisor, porque o conteúdo rola por baixo. O card `Páginas por mês` inteiro, com as nove colunas, o rótulo `604 páginas` sobre julho e o **balão aberto sobre maio**: `Maio de 2026` e `530 páginas`, com a faixa `musgo-fundo` atrás da coluna de maio. Abaixo, o card `Livros concluídos por mês` inteiro, com `abr` e `ago` sem coluna. Este é o artboard que confere a anatomia do gráfico.

### 4.3 Gráfico como tabela

Rolada até os gráficos, com o card `Páginas por mês` na visão em tabela: nove linhas de `Janeiro` a `Setembro`, `Setembro` com `até hoje`, valores de `412 páginas` a `318 páginas`, e o botão `Ver como gráfico` no fim do card. O card `Livros concluídos por mês`, abaixo, continua como gráfico: a escolha é por card.

### 4.4 Ano fechado

Faixa com `2025` ativo, rolada até os gráficos. Linha de período `De 1º de janeiro a 31 de dezembro de 2025`. `Páginas por mês` com as doze colunas, de `jan` a `dez`, eixo com marcas `0`, `200`, `400`, `600` e domínio até 650 páginas, rótulo único `610 páginas` sobre julho, subtítulo `5.150 páginas em 2025`. `Livros concluídos por mês` com doze colunas, `mai` sem coluna, rótulo único `2 livros` sobre `abr`, subtítulo `14 livros em 2025`. Com doze meses, as colunas ficam com 16px de largura, sempre com ar entre elas.

### 4.5 Acumulado

Faixa com `Acumulado` ativo, a faixa rolada até o fim para mostrar o pill. Linha `Desde 12 de novembro de 2023, quando você entrou`.

- `Totais`: `34` `livros`, `13.538` `páginas`, `231` `h` `35` `min`.
- `Médias`: `21,9` `páginas por dia`; `20` `dias por livro`; `4,0` `estrelas`, com o helper `Média das 31 notas que você já deu.`
- Rolando, os dois gráficos viram **por ano**: título `Páginas por ano`, subtítulo `13.538 páginas desde 2023`, quatro colunas de 24px (`2023`, `2024`, `2025`, `2026`), eixo com `0`, `2.000`, `4.000`, `6.000`, rótulo único `5.150 páginas` sobre `2025`; e `Livros concluídos por ano`, subtítulo `34 livros desde 2023`, marcas `0`, `5`, `10`, `15`, rótulo único `14 livros` sobre `2025`, `2023` sem coluna. O balão de `2026` diz `2026, até hoje`.
- No artboard aparecem a seção `Médias` e o card `Páginas por ano`, rolados de forma que o topo do card entre na viewport.

### 4.6 Ano sem leitura concluída

Faixa com `2023` ativo. Linha `De 12 de novembro a 31 de dezembro de 2023, desde que você entrou`.

- `Totais`: `0` `livros`, em `num-display` como qualquer outro número, porque o zero é real; `360` `páginas`; `7` `h` `40` `min`.
- `Médias`: `25,7` `páginas por dia`; **`Dias por livro` ausente**, com `Sem leituras concluídas em 2023` no lugar do número; **`Nota média` ausente**, com `Nenhuma nota dada em 2023` no lugar do número e o helper `Média das notas que você deu em 2023.`
- Rolando, `Páginas por mês` com só duas colunas, `nov` 146 páginas e `dez` 214 páginas, o eixo X começando em `nov`, rótulo `214 páginas` sobre dezembro, subtítulo `360 páginas de novembro a dezembro`.
- `Livros concluídos por mês` **sem área de gráfico**: título, e no lugar das colunas uma linha em `body` `grafite`: `Nenhum livro concluído em 2023.` Sem botão `Ver como tabela`.
- O artboard mostra `Totais` e `Médias`, com as duas médias ausentes visíveis. É o artboard que prova que ausente não vira zero.

### 4.7 Vazio, leitora nova

A conta de Caio Nogueira, sem nenhum registro.

- Header real. **Sem faixa de períodos e sem linha de período**: não há ano para escolher.
- Bloco centralizado no espaço do conteúdo, com `space-6` entre os elementos:
  - `ChartBar` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Suas estatísticas começam no primeiro registro`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Registre em que página você parou em qualquer livro da estante. Páginas, tempo e médias passam a ser contados a partir daí.`
  - Botão primário pill, altura 48px, `musgo`, texto `papel`: `Ir para a estante`, que abre a Estante.
- Nenhum `0` de exemplo, nenhum gráfico vazio com eixos desenhados, nenhuma ilustração, nenhum emoji.

### 4.8 Carregando

- Header real e faixa de períodos real, com `2026` ativo. A linha de período ainda não aparece.
- Títulos `Totais` e `Médias` reais. No lugar dos containers, **skeleton estático** com a forma final: o container de `Totais` com três linhas, cada uma com uma barra de 13px de altura e 30% de largura (o label) e uma barra de 36px de altura e 45% de largura (o número), em `capa-placeholder` com `radius-sm`; o container de `Médias` com três linhas de uma barra de 15px e 40% à esquerda e uma barra de 20px e 18% à direita.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** do serviço (RNF-ERR-09) e o estado de cada troca de período enquanto o novo recorte chega: demora não é erro. Na troca de período o skeleton ocupa só os containers e os gráficos; a faixa continua utilizável.

### 4.9 Erro de carregamento

- Header e faixa de períodos reais, com `2026` ativo.
- Banner inline no lugar do conteúdo, margem lateral `space-5`, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar suas estatísticas. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.
- Nenhum número antigo em cache mostrado como se fosse atual, nenhum gráfico vazio atrás do banner.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo.
- Área de conteúdo com padding lateral `space-8`, `max-width` de 1120px.
- **Header de conteúdo de 72px** com `Estatísticas` em `display` `tinta` à esquerda. Nada à direita e sem sino. A volta para o perfil é o item `Perfil` da sidebar, que continua ativo.
- **Duas colunas**, com `space-8` de gap:
  - **Coluna da esquerda, 240px, fixa ao rolar:** o label `Período` em `label` `grafite` e, `space-2` abaixo, a **lista vertical de períodos**, que substitui a faixa de pills do mobile: um item por linha, altura de 44px, `radius` 12, padding lateral `space-4`, com o período à esquerda (`2026` em `num-inline`, ou `Acumulado` em `body-strong`) e o total de livros em `caption` à direita (`9 livros`, `14 livros`, `11 livros`, `0 livros`, `34 livros`). `Acumulado` vem por último, separado dos anos por `space-2` a mais e um divisor de 1px `linha`. Inativo: texto `grafite`, fundo transparente, hover com fundo `linha`. Ativo: fundo `musgo-fundo`, texto `musgo` peso 600. Mesmo desenho dos itens da sidebar, para que a seleção seja reconhecida sem aprendizado.
  - **Coluna da direita:** a linha de período em `caption` `grafite`, e as seções abaixo.
- **`Totais`** em **três cards lado a lado**, de largura igual, gap `space-4`, cada um `papel-elevado`, `radius-md`, padding `space-5`: label em `caption` `grafite` em cima e o valor em `num-display` `tinta` com a unidade em `body-strong` `grafite`. O helper da seção embaixo, em `caption` `grafite`, em uma linha.
- **`Médias`** em três cards lado a lado com o mesmo grid dos totais: label em `body-strong` `tinta`, valor no número de `title` em JetBrains Mono com a unidade em `caption` `grafite` ao lado, e o helper da conta em `caption` `grafite` abaixo. Média ausente: a frase no lugar do número, como no mobile.
- **Gráficos lado a lado**, dois cards de largura igual, gap `space-6`, cada um com a anatomia do mobile: título, subtítulo, área de 220px, eixos, colunas de 24px (20px com doze meses), rótulo único no maior valor, `Ver como tabela` no fim. Abaixo de 1024px os dois gráficos passam a um embaixo do outro.
- **Hover numa coluna** (ou na faixa vertical do mês) faz o que o toque faz no mobile: faixa `musgo-fundo` atrás do mês e balão com o mês e o valor. O cursor vira ponteiro.
- **Teclado nos gráficos:** a área do gráfico recebe foco como um grupo; `ArrowLeft` e `ArrowRight` movem entre os meses e mostram o balão do mês em foco; `Esc` fecha. Foco visível com contorno de 2px `musgo` e offset de 2px na área do gráfico, e a faixa `musgo-fundo` marca o mês em foco.
- O rodapé `Um registro novo pode levar alguns instantes para aparecer aqui.` fica no fim da coluna da direita, alinhado à esquerda.
- **Abaixo de 768px:** as duas colunas viram uma; a lista vertical de períodos volta a ser a faixa horizontal de pills do mobile; os cards de `Totais` e `Médias` voltam a ser os containers de linhas empilhadas; os gráficos ficam um embaixo do outro; o header ganha `ArrowLeft` à esquerda; e a sidebar dá lugar à barra inferior.

### 5.1 Padrão, ano corrente, com hover

Coluna da esquerda com `2026` ativo. Coluna da direita com a linha `De 1º de janeiro a 29 de setembro de 2026`, os três cards de `Totais` com o helper, os três cards de `Médias` e, abaixo, os dois gráficos lado a lado, visíveis ao menos até a linha de base. O cursor sobre a coluna de julho de `Páginas por mês`: faixa `musgo-fundo` e balão `Julho de 2026` · `604 páginas`. O rótulo direto `604 páginas` some enquanto o balão está aberto sobre a mesma coluna, para não repetir o número.

### 5.2 Acumulado

`Acumulado` ativo na lista. `Totais` com `34 livros`, `13.538 páginas`, `231 h 35 min`; `Médias` com `21,9`, `20` e `4,0`; os gráficos `Páginas por ano` e `Livros concluídos por ano`, lado a lado, com as quatro colunas de 2023 a 2026 e o rótulo único sobre `2025`.

### 5.3 Ano sem leitura concluída

`2023` ativo na lista, com `0 livros` à direita do item. `Totais` com `0 livros`, `360 páginas`, `7 h 40 min`. `Médias` com `25,7 páginas por dia` e as duas médias ausentes com as frases. Gráfico de páginas com `nov` e `dez`; card de livros com `Nenhum livro concluído em 2023.` no lugar da área.

### 5.4 Gráfico como tabela, com foco de teclado

`2025` ativo. O card `Páginas por mês` na visão em tabela, com doze linhas, e o card `Livros concluídos por mês` como gráfico, com **foco de teclado** na área do gráfico: contorno de 2px `musgo`, faixa `musgo-fundo` em `abr` e balão `Abril de 2025` · `2 livros`. A tabela é mais alta que o gráfico ao lado; o card ao lado não estica, fica alinhado ao topo.

### 5.5 Carregando

Coluna da esquerda real, com `2026` ativo. Coluna da direita em skeleton: seis cards com uma barra curta de label e uma barra alta de número, e os dois cards de gráfico com uma barra de título e um retângulo `capa-placeholder` de `radius-sm` no lugar da área. Um único fade de entrada, sem shimmer.

**Vazio e erro na web**, descritos aqui e sem artboard próprio: o vazio da leitora nova some com a coluna da esquerda e centraliza o bloco de 4.7 na área de conteúdo, com o botão `Ir para a estante`; o erro mantém a coluna da esquerda e põe o banner de 4.9 no topo da coluna da direita, com `max-width` de 640px.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão (4.1).** Fundo `noite`. Título, `ArrowLeft` e sino em `papel-suave`. Pill inativo com borda `linha-noite` e texto `grafite-claro`; pill ativo com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Linha de período e helpers em `grafite-claro`. Containers de `Totais` e `Médias` em `noite-elevada`, **mais claros** que o fundo, com divisores `linha-noite`. Números em `papel-suave`, unidades e labels em `grafite-claro`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com **Perfil** ativo em `musgo-claro`.
- **Mobile, gráficos (4.2).** Cards de gráfico em `noite-elevada`. Colunas em `musgo-claro`, 7,21:1 contra a superfície. Linhas de grade em `linha-noite`, marcas dos eixos em `grafite-claro`, rótulo direto em `papel-suave`. Balão em `noite` com borda de 1px `linha-noite`, mês em `grafite-claro` e valor em `papel-suave`; faixa do mês tocado em `musgo-fundo-escuro`. Nenhuma série troca de cor: é o mesmo gráfico, com os passos escuros da mesma paleta.
- **Web, padrão (5.1).** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, lockup em `musgo-claro`, item **Perfil** ativo com fundo `musgo-fundo-escuro`. Item de período ativo com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Cards em `noite-elevada`, colunas em `musgo-claro`, hover de julho com faixa `musgo-fundo-escuro` e o balão escuro.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Pill de filtro com seleção única (reusado na faixa de períodos) | documento-de-design §5.1 |
| Estatísticas com número grande em `num-display` | documento-de-design §5.5 (bloco do perfil) e §3.2.1 |
| Regras de gráfico: `musgo` principal, no máximo três séries, número com unidade | documento-de-design §7.10 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md e documento-de-design §5 |
| Header de tela de detalhe com `ArrowLeft`, título e sino | nasceu nos prompts do Período 1 (F-PRG, F-PERFIL, F-NOT); incorporação pendente |
| Lista vertical de filtro na coluna lateral da web | nasceu em `F-EST-2/historico-de-leituras.md`; incorporação pendente |
| Banner de erro inline `rubi-fundo` | documento-de-design §4.2 e prompts do P1 |

**Componentes que nascem aqui.** Nenhum deles está no `documento-de-design.md`, e todos precisam ser incorporados pelo controle de mudança (plano §3) antes de valerem como padrão:

1. **Linha de métrica total.** Label em `caption` sobre número em `num-display` com a unidade em `body-strong` `grafite` na mesma linha de base; empilhada em container no mobile, em card no grid de três da web.
2. **Linha de média com regra da conta.** Label, helper que explica o denominador, número no tamanho do `title` em JetBrains Mono e unidade abaixo. O `documento-de-design` não tem token para número médio entre `num-inline` (15px) e `num-display` (36px): a combinação `title` com JetBrains Mono é proposta daqui.
3. **Média ausente.** Frase curta no lugar do número, sem `0` nem traço.
4. **Gráfico de colunas de uma série.** Colunas de 20 a 24px com ponta de 4px e base reta, grade horizontal de 1px `linha`, eixo Y só com marcas, meses abreviados em minúsculas, um único rótulo direto no maior valor, sem legenda.
5. **Balão de valor com faixa do mês.** Balão `papel` com `elev-2` e faixa `musgo-fundo` atrás do mês tocado, com hover, toque e navegação por setas.
6. **Alternância gráfico e tabela por card.** `Ver como tabela` e `Ver como gráfico`, com a tabela de mês e valor.
7. **Eixo do ano corrente até o mês de hoje** e mês em andamento marcado com `até hoje`.
8. **Troca da granularidade no acumulado**, de mês para ano.
9. **Seletor de período com `Acumulado`** separado dos anos.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header | `Estatísticas` |
| Label da lista de períodos, web | `Período` |
| Pills e itens de período | `2026`, `2025`, `2024`, `2023`, `Acumulado` |
| Contagem nos itens da web | `9 livros`, `14 livros`, `11 livros`, `0 livros`, `34 livros` |
| Linha de período, ano corrente | `De 1º de janeiro a 29 de setembro de 2026` |
| Linha de período, ano fechado | `De 1º de janeiro a 31 de dezembro de 2025` |
| Linha de período, ano de entrada | `De 12 de novembro a 31 de dezembro de 2023, desde que você entrou` |
| Linha de período, acumulado | `Desde 12 de novembro de 2023, quando você entrou` |
| Título de seção | `Totais` |
| Labels dos totais | `Livros concluídos`, `Páginas lidas`, `Tempo de leitura` |
| Unidades dos totais | `livros`, `livro`, `páginas`, `h`, `min` |
| Helper dos totais | `Páginas lidas incluem as leituras que você abandonou. O tempo soma as sessões cronometradas e o tempo que você informou nos registros.` |
| Título de seção | `Médias` |
| Label e helper, páginas por dia | `Páginas por dia` · `Só conta os dias em que você registrou leitura.` |
| Label e helper, dias por livro | `Dias por livro` · `Do início ao fim de cada leitura concluída, com os dias sem leitura.` |
| Label e helper, nota média | `Nota média` · `Média das 8 notas que você deu em 2026.` (e `Média das 13 notas que você deu em 2025.`, `Média das 10 notas que você deu em 2024.`, `Média das notas que você deu em 2023.`, `Média das 31 notas que você já deu.`) |
| Unidades das médias | `páginas por dia`, `dias por livro`, `estrelas` |
| Média ausente | `Sem leituras concluídas em 2023`, `Nenhuma nota dada em 2023` |
| Título do gráfico, ano | `Páginas por mês`, `Livros concluídos por mês` |
| Título do gráfico, acumulado | `Páginas por ano`, `Livros concluídos por ano` |
| Subtítulo do gráfico | `3.818 páginas de janeiro a setembro`, `9 livros de janeiro a setembro`, `5.150 páginas em 2025`, `14 livros em 2025`, `360 páginas de novembro a dezembro`, `13.538 páginas desde 2023`, `34 livros desde 2023` |
| Meses no eixo | `jan`, `fev`, `mar`, `abr`, `mai`, `jun`, `jul`, `ago`, `set`, `out`, `nov`, `dez` |
| Rótulo direto | `604 páginas`, `2 livros`, `610 páginas`, `214 páginas`, `5.150 páginas`, `14 livros` |
| Balão | `Julho de 2026` · `604 páginas`; `Maio de 2026` · `530 páginas`; `Setembro de 2026, até hoje` · `318 páginas`; `Abril de 2026` · `0 livros concluídos`; `2026, até hoje` · `3.818 páginas` |
| Gráfico sem dados no período | `Nenhum livro concluído em 2023.` |
| Alternância | `Ver como tabela`, `Ver como gráfico` |
| Cabeçalho da tabela | `Mês`, `Páginas`, `Livros`; no acumulado, `Ano` |
| Linhas da tabela | `Janeiro` · `412 páginas`; `Setembro` `até hoje` · `318 páginas`; `Abril` · `0 livros` |
| Rodapé | `Um registro novo pode levar alguns instantes para aparecer aqui.` |
| Vazio, título | `Suas estatísticas começam no primeiro registro` |
| Vazio, texto | `Registre em que página você parou em qualquer livro da estante. Páginas, tempo e médias passam a ser contados a partir daí.` |
| Vazio, botão | `Ir para a estante` |
| Erro, texto | `Não foi possível carregar suas estatísticas. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |

Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade, com duas exceções declaradas: os anos, que são rótulo e não medida, e as marcas dos eixos, cuja unidade está no título do gráfico. Decimal com vírgula e milhar com ponto, como em pt-BR: `20,4`, `3.818`.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no `ArrowLeft`, no sino, em cada pill de período e nos botões `Ver como tabela` e `Ver como gráfico`. A área tocável de cada mês no gráfico tem a altura inteira do gráfico e pelo menos 32px de largura, maior que a coluna.
- **O gráfico nunca depende só da cor.** Há uma série por gráfico, nomeada pelo título; as colunas têm 6,15:1 contra `papel-elevado` no claro e 7,21:1 contra `noite-elevada` no escuro, acima dos 3:1 exigidos para marca gráfica. Texto de eixo, rótulo e balão usa `grafite` e `tinta` (`grafite-claro` e `papel-suave` no escuro), nunca a cor da coluna.
- **Todo valor do gráfico tem caminho fora do gráfico:** o balão, a navegação por teclado e a visão em tabela. Leitor de tela lê a área do gráfico como `Gráfico de colunas, páginas por mês em 2026, de janeiro a setembro. Maior valor: julho, 604 páginas.` e cada mês como `Julho de 2026, 604 páginas`. A tabela é uma tabela de verdade, com cabeçalho de coluna.
- **Média ausente** é anunciada pela frase, e nunca como `zero`: `Dias por livro: sem leituras concluídas em 2023.`
- A troca de período é anunciada com o intervalo junto (`Mostrando 2025, de 1º de janeiro a 31 de dezembro`), para que a mudança de todos os números não seja silenciosa.
- Os números usam numeral tabular, para que comparar anos não faça os dígitos dançarem.
- Contraste WCAG AA no corpo nos dois temas. Helpers, unidades e marcas de eixo usam `grafite`, não `grafite-suave`, porque explicam a conta: sem eles o número pode parecer errado.
- Na web, foco de teclado visível na lista de períodos, nos botões e na área de cada gráfico, com contorno de 2px `musgo` e offset de 2px. A ordem de tabulação vai da sidebar para a lista de períodos e daí para os cards, na ordem de leitura. Dentro do gráfico, setas movem entre meses e `Esc` fecha o balão.
- `prefers-reduced-motion` respeitado: o fade do skeleton, o fade do balão e o hover viram estáticos. As colunas **não crescem animadas** ao carregar nem ao trocar de período.
- O skeleton preserva a altura dos containers para que o conteúdo não salte quando os dados chegam.
- O texto do sistema pode crescer: labels e helpers quebram linha em vez de cortar; o número de `Tempo de leitura` quebra entre `h` e o segundo número se não couber; o gráfico mantém a altura e passa a mostrar os meses em marcas alternadas no eixo X quando o rótulo não cabe.
- Nenhuma ação destrutiva nesta tela, e por isso nenhuma confirmação.

---

## 10. O que não fazer nesta tela

**Escopo desta tela**

- **Não mostre zero no lugar de média ausente.** Sem leitura concluída não existe `0 dias por livro`; sem nota não existe `0 estrelas`. O zero só aparece onde ele é contagem real, como `0 livros`.
- **Não desenhe a distribuição das notas que a leitora deu**, nem histograma de estrelas, nem "suas notas por faixa". É outro requisito, de outro período.
- Não desenhe este painel para o perfil de outro leitor, nem botão `Ver estatísticas` num perfil que não é o da leitora. Outro leitor vê no máximo o bloco resumido no perfil, desenhado em outro prompt.
- Não desenhe o bloco `Estatísticas do ano` do perfil aqui. Ele é a entrada da tela e entra na edição do perfil.
- Não desenhe meta anual, objetivo de livros no ano, barra de "faltam N livros", nem comparação com a meta. Desafios são outra feature.
- Não desenhe sequência diária, streak, chama nem dias seguidos. Gamificação é outra feature.
- Não compare a leitora com outros leitores, nem média da comunidade, nem posição, nem percentil.
- Não desenhe compartilhar, exportar, baixar imagem ou "retrospectiva do ano".
- Não desenhe gêneros mais lidos, autores mais lidos, horário preferido, livro mais rápido ou qualquer métrica que não esteja nos requisitos: totais, três médias e dois gráficos.
- Não desenhe filtro por livro, por status ou por intervalo de datas livre. O período é ano ou acumulado.
- Não mostre os meses futuros do ano corrente com coluna vazia: o eixo termina no mês de hoje.
- Não use `rubi` nem `ambar` em nada desta tela, a não ser o banner de erro. Queda de páginas de um mês para o outro não é alerta.
- Não ponha seta de tendência, variação percentual nem "mais que no ano passado" colorido em verde ou vermelho.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. Esta tela não é nenhum deles.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. Os títulos de seção são `title-lg`, não overline.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão, em coluna de gráfico ou em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de coluna crescendo animada, contador de número subindo, nem gráfico que se desenha ao entrar.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético do tipo "Seu ano em livros", "Sua jornada de leitura" ou "Você é um leitor voraz". O título diz o que a coisa é.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de toast com fundo saturado.
- Nada de estrelas desenhadas ao lado da nota média.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura, nem card de gráfico claro sobre fundo escuro.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos. Os três cards de totais são dados, não ícone mais título mais texto.
- Nada de bento grid decorativo em tela de dados, com cards de tamanhos diferentes para parecer painel.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. O valor de cada mês também está na tabela, e o maior valor está no rótulo direto.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de gráfico com legenda em roxo ou em verde-água (`#7C3AED`, `#14B8A6`). As colunas são `musgo`, e `musgo-claro` no escuro.
- Nada de gráfico com muitas cores. Uma série por gráfico nesta tela, e nunca mais de três em gráfico nenhum.
- Nada de `broto` nas colunas: ele não alcança 3:1 sobre o fundo claro.
- Nada de dois eixos Y no mesmo gráfico, nem páginas e livros no mesmo gráfico. São dois gráficos.
- Nada de gráfico de pizza, rosca, área empilhada, radar ou linha com área preenchida saturada.
- Nada de número em cima de toda coluna: um rótulo direto, no maior valor.
- Nada de linha de grade tracejada nem eixo pesado.
- Nada de número exibido sem unidade. Nunca "604" sozinho: é "604 páginas", "9 livros", "71 h 20 min".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores", e nada de "%" nesta tela.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação, nem "selo de 10 livros no ano".
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
