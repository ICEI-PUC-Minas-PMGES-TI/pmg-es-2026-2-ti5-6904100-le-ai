# F-NOT-OPC · Preferências de notificação

**Feature:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-NOT-OPC.md
**Requisitos:** RF-NOT-05 (habilitar ou desabilitar individualmente cada tipo de notificação de RF-NOT-01, sem agrupamento obrigatório em categorias)
**Requisito de sistema cujo efeito aparece aqui:** RF-NOT-07 (entrega por push em dispositivo móvel). O envio é do servidor e o pedido de permissão é do sistema operacional; esta tela só mostra o **efeito** de a permissão estar negada no aparelho.
**Não funcionais:** RNF-SEC-02 (só o dono lê e altera as próprias preferências), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (mensagem em pt-BR e acionável), RNF-ERR-09 (cold start do servidor tratado como carregamento)
**Regras de negócio:** nenhuma RN própria. Os tipos listados são os de RF-NOT-01; a regra do tipo `Leitura em risco` (RN-05) e a do `Lembrete de sequência` (RN-18) só aparecem como descrição de uma linha.
**Versão web:** não. RF-NOT-05 tem a coluna Web negativa em `REQUISITOS.md` §5.10, e notificações estão fora do escopo do cliente web (`REQUISITOS.md` §2.1).

---

## 1. Contexto

O lugar em que o leitor escolhe **o que quer receber**. Cada tipo de notificação do produto tem uma linha própria com um `switch`: ligado, o tipo chega na lista de notificações do app e, no Android com permissão, como push no celular; desligado, não chega de jeito nenhum.

**De onde se chega:** de `Configurações`, pela linha `Notificações`, que entra num prompt de edição separado das Configurações. A tela é uma **tela de detalhe empilhada sobre a área Perfil**: header com seta de voltar e a aba `Perfil` ativa na barra inferior, como `Alterar senha` e `Política de privacidade`.

**Para onde se vai:** de volta a `Configurações`. A única saída para fora do app é o botão do aviso de push negado, que abre os ajustes de notificação do Android para o Lê Ai.

Quatro coisas que ela precisa resolver:

- **Um controle por tipo, sem interruptor de grupo.** O contrato aprovado é uma preferência por tipo (RF-NOT-05), sem categoria que liga ou desliga vários tipos de uma vez. Os tipos aparecem organizados sob quatro títulos de seção, só para facilitar a leitura de uma lista de doze linhas; **o título não tem `switch`** e não controla nada.
- **O leitor precisa saber o que cada tipo é.** `Resposta a comentário` e `Comentário em atividade` são parecidos no nome. Cada linha tem o ícone que o tipo usa na lista de notificações e uma descrição curta de quando ele chega.
- **Push e lista do app são a mesma preferência.** Desligar um tipo vale para os dois. A permissão do Android é outra coisa: sem ela, nada chega fora do app, mas a lista do app continua recebendo tudo o que está ligado. A tela diz isso uma vez, no aviso, e não cria um segundo conjunto de `switch` para push.
- **Salvar não pede botão.** Cada toque salva aquela linha. Se não salvar, o `switch` volta para onde estava e a linha diz o motivo. Nada fica com cara de ligado sem ter sido salvo.

Mecanismo do produto sustentado: **pertencimento**. As notificações são a ponte para o que os amigos fazem; deixar o leitor regular o volume é o que impede que ele desligue tudo no sistema.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o leitor os encontra.
- **Linha 2:** não existe. A tela não tem versão web (ver seção 5).
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Preferências de notificação · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

MODO ESCURO
Cidadão de primeira classe e lock de página inteira: nenhuma seção inverte no
meio da rolagem. Superfície elevada fica MAIS CLARA que o fundo, nunca mais
escura.

CONTRASTE
WCAG AA no corpo, AAA no título quando possível. grafite-suave e
grafite-fundo-escuro passam apenas em tamanho grande: nunca carregam texto de
corpo nem informação essencial. Componente de interface (contorno de controle,
trilho de switch) precisa de 3:1 contra o fundo.
```

---

## 3. Dados que aparecem na tela

A leitora é **Marina Beltrão** (`@marinableu`), a mesma das Configurações. O badge de não lidas no sino mostra `3`, como no canvas das Configurações.

**Os doze tipos de RF-NOT-01**, na ordem em que aparecem, com o ícone que cada um já usa na lista de notificações e o estado no artboard padrão. Todo tipo nasce ligado (padrão do servidor); a leitora desligou dois.

| Seção | Tipo | Ícone (Phosphor, `regular`) | Descrição | Estado no padrão |
|---|---|---|---|---|
| `Seguidores` | `Novo seguidor` | `UserPlus` | `Quando alguém começa a seguir você.` | ligado |
| `Seguidores` | `Pedido para seguir` | `UserPlus` | `Quando alguém pede para seguir seu perfil privado.` | ligado |
| `Seguidores` | `Pedido aceito` | `UserCheck` | `Quando aceitam seu pedido para seguir.` | ligado |
| `Atividades e comentários` | `Curtida em atividade` | `Heart` | `Quando curtem uma atividade sua no feed.` | **desligado** |
| `Atividades e comentários` | `Comentário em atividade` | `ChatCircle` | `Quando comentam uma atividade sua.` | ligado |
| `Atividades e comentários` | `Resposta a comentário` | `ChatCircle` | `Quando respondem a um comentário seu.` | ligado |
| `Atividades e comentários` | `Menção em comentário` | `At` | `Quando mencionam você num comentário.` | ligado |
| `Resenhas e recomendações` | `Curtida em resenha` | `ThumbsUp` | `Quando curtem uma resenha sua.` | ligado |
| `Resenhas e recomendações` | `Livro recomendado` | `PaperPlaneTilt` | `Quando um leitor recomenda um livro para você.` | ligado |
| `Leituras` | `Leitura em risco` | `Warning` | `Depois de 30 dias sem progresso, com a opção de abandonar a leitura.` | ligado |
| `Leituras` | `Leitura abandonada` | `PauseCircle` | `Quando uma leitura é abandonada depois de 40 dias sem progresso.` | **desligado** |
| `Leituras` | `Lembrete de sequência` | `Flame` | `Um aviso por dia, se você tem sequência ativa e ainda não registrou progresso.` | ligado |

**Ícones nesta tela são todos `grafite`**, inclusive `Warning` e `Flame`. Na lista de notificações o `Warning` é `ambar` porque pede ação; aqui ele só identifica o tipo, e cor de estado não entra. `Flame` é o ícone do streak (design §4.8), também sem o `broto` nesta tela.

**Texto de abertura**, acima da primeira seção: `Escolha o que você quer receber. Desligar um tipo vale para a lista do app e para as notificações no celular.`

**Nota de rodapé**, abaixo da última linha: `Desligar um tipo não apaga as notificações que você já recebeu.`

**Aviso de push negado:** título `As notificações no celular estão desligadas`, texto `Você continua recebendo na lista do app tudo o que estiver ligado aqui. Para receber também fora dele, permita as notificações do Lê Ai nos ajustes do Android.`, botão `Abrir ajustes do Android`.

**Erro ao salvar uma linha** (no exemplo, `Comentário em atividade`, que a leitora tentou desligar): `Não foi possível salvar. Verifique sua conexão e tente de novo.`

**Erro de carregamento:** `Não foi possível carregar suas preferências. Verifique sua conexão e tente de novo.`, botão `Tentar de novo`.

Nenhum número aparece nesta tela além de `30 dias` e `40 dias`, nas descrições, e o `3` do badge.

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
Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone que
salta. **Nesta tela, `Perfil` está ativo** em todos os artboards.

**Mobile, header.** Altura de 72px mais a área segura, padding lateral
`space-5`, fundo `papel`, sem sombra. O sino `Bell` (Phosphor, `regular`,
24px, `tinta`) fica à direita e é fixo em toda tela autenticada. Badge de não
lidas: círculo de 18px, fundo `musgo`, encostado no canto superior direito do
ícone, número centralizado em 11px peso 600 cor `papel`; acima de nove mostra
`9+`; sem não lidas, o badge simplesmente não existe.

### Header desta tela

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, voltando a `Configurações`.
- Título `Notificações` em `display` `tinta`, à esquerda depois da seta, alinhado à base.
- `Bell` à direita, com o badge `3`.
- Quando o conteúdo passa por baixo do header na rolagem, ele ganha um divisor de 1px `linha` na base. Em repouso no topo, sem divisor.

### Texto de abertura

- Logo abaixo do header, padding lateral `space-5`, `space-2` de respiro acima.
- Texto em `body` `grafite`: `Escolha o que você quer receber. Desligar um tipo vale para a lista do app e para as notificações no celular.`
- `space-6` abaixo.

### Seções e linhas

Quatro seções na ordem da seção 3: `Seguidores`, `Atividades e comentários`, `Resenhas e recomendações`, `Leituras`.

- **Título de seção** em `label` `grafite`, padding lateral `space-5`, `space-6` de respiro acima (exceto a primeira, que vem logo depois do texto de abertura) e `space-3` abaixo. **Sem `switch` no título**, sem contagem, sem caixa alta.
- **Linha de preferência**, a anatomia que se repete doze vezes:
  - Altura mínima de 72px, padding lateral `space-5`, padding vertical `space-3`, fundo `papel`. A linha inteira é a área tocável.
  - À esquerda, o ícone do tipo, Phosphor `regular`, 24px, `grafite`, alinhado ao topo do texto.
  - `space-4` de gap. No meio, ocupando a largura que sobra, o nome do tipo em `body` `tinta` e, `space-1` abaixo, a descrição em `caption` `grafite`, em até duas linhas, sem corte.
  - `space-4` de gap. À direita, centralizado na altura da linha, o `switch` (componente abaixo).
  - Divisor de 1px `linha` entre linhas da mesma seção, começando no alinhamento do texto, não sob o ícone. Sem divisor depois da última linha da seção.
- **`switch`**, componente que nasce aqui (seção 7):
  - Trilho de 52 x 32px, `radius-full`.
  - **Ligado:** trilho preenchido em `musgo`; botão circular de 24px em `papel`, encostado à direita com 4px de folga.
  - **Desligado:** trilho com fundo `papel-elevado` e contorno de 2px `grafite-suave`; botão circular de 16px em `grafite-suave`, encostado à esquerda com 8px de folga.
  - A diferença entre ligado e desligado **não depende só da cor**: muda a posição e o tamanho do botão, e o trilho passa de contorno para preenchido.
  - Ao tocar, o botão desliza para o outro lado em `dur-fast` com `ease-in-out`. Sob `prefers-reduced-motion`, troca de lado sem deslizar.
- **Nota de rodapé:** `space-6` depois da última linha, padding lateral `space-5`, texto em `caption` `grafite`: `Desligar um tipo não apaga as notificações que você já recebeu.` `space-8` abaixo, antes da barra inferior.

### 4.1 Carregando

As preferências vêm de `GET /me/notificacoes/preferencias`.

- Header real, com a seta, o título e o sino.
- Texto de abertura real: ele é fixo e não espera o servidor.
- No lugar das seções, **skeleton estático**: um título de seção como barra de 12px por 30% de largura, e abaixo cinco linhas, cada uma com um quadrado de 24px, duas barras de 15px e 13px de altura com 55% e 80% de largura, e à direita um retângulo de 52 x 32px em `radius-full`. Tudo em `capa-placeholder`, barras com `radius-sm`, com o mesmo espaçamento das linhas reais.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** (RNF-ERR-09): demora não é erro.

### 4.2 Padrão

- Header, texto de abertura, seção `Seguidores` com as três linhas ligadas, seção `Atividades e comentários` com `Curtida em atividade` **desligado** e as outras três ligadas, e o começo da seção `Resenhas e recomendações`, cortado naturalmente pela barra inferior.
- Nenhum aviso no topo: o aparelho tem permissão de notificação.
- A tela rola. O artboard mostra o topo.

### 4.3 Padrão, rolado até o fim

- O mesmo estado de 4.2, rolado até o fim. Header com o divisor de 1px `linha` na base, porque o conteúdo passa por baixo.
- Visíveis: o fim de `Atividades e comentários`, `Resenhas e recomendações` com as duas linhas ligadas, `Leituras` com `Leitura em risco` ligado, `Leitura abandonada` **desligado** e `Lembrete de sequência` ligado, e a nota de rodapé.
- Este artboard prova que a lista inteira é de linhas iguais, e que `Leitura em risco` e `Lembrete de sequência` não ganham cor própria.

### 4.4 Falha ao salvar

A leitora tocou no `switch` de `Comentário em atividade` para desligá-lo, e o servidor não respondeu.

- Mesma rolagem de 4.2.
- O `switch` de `Comentário em atividade` **voltou para ligado**: ele mudou na hora do toque e voltou quando a gravação falhou, com o mesmo deslize de `dur-fast`.
- Logo abaixo da descrição, dentro da mesma linha e no alinhamento do texto, `space-2` de gap, a mensagem em `caption` `rubi`, com `Warning` (Phosphor, `regular`, 16px, `rubi`) à esquerda: `Não foi possível salvar. Verifique sua conexão e tente de novo.` A linha cresce para caber a mensagem.
- **Tentar de novo é tocar no `switch` outra vez.** Não há botão extra. A mensagem some quando o próximo toque nessa linha salva.
- As outras linhas continuam utilizáveis. Nada de banner no topo nem de toast: o erro é da linha.
- **Também é o estado sem conexão ao salvar.** Não existe fila offline de preferências: um `switch` nunca fica na posição nova sem ter sido salvo.

### 4.5 Notificações desligadas no aparelho

A leitora negou a permissão de notificação do Android (obrigatória a partir do Android 13). O pedido de permissão é a caixa do próprio sistema e **não** é desenhado aqui.

- Header igual a 4.2.
- **Aviso entre o texto de abertura e a primeira seção**, com padding lateral `space-5` por fora:
  - Bloco de largura total menos o padding, fundo `ambar-fundo`, `radius` 12, padding `space-4`, sem borda e sem sombra.
  - À esquerda, `BellSlash` (Phosphor, `regular`, 20px, `tinta`), alinhado ao topo do título.
  - `space-3` de gap. Título em `body-strong` `tinta`: `As notificações no celular estão desligadas`.
  - `space-1`, texto em `body` `tinta`: `Você continua recebendo na lista do app tudo o que estiver ligado aqui. Para receber também fora dele, permita as notificações do Lê Ai nos ajustes do Android.`
  - `space-3`, botão textual `musgo` com `ArrowSquareOut` (Phosphor, `regular`, 20px, `musgo`) à direita do texto: `Abrir ajustes do Android`. Alvo de 48px de altura.
  - Sem `X` para fechar: o aviso some sozinho quando a permissão volta a ser concedida e a leitora retorna ao app.
- `space-6` abaixo do aviso, as seções como em 4.2, com os mesmos `switch`. **Os `switch` continuam funcionando**: eles valem para a lista do app.
- O ícone e o título não usam `ambar` no texto: o fundo `ambar-fundo` já marca o alerta, e `ambar` sobre `ambar-fundo` não passa em contraste.

### 4.6 Erro de carregamento ou sem conexão

O servidor não devolveu as preferências, ou o aparelho está sem conexão ao abrir a tela.

- Header real.
- Texto de abertura real.
- No lugar das seções, banner inline com largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar suas preferências. Verifique sua conexão e tente de novo.`
- `space-2`, botão textual `musgo`: `Tentar de novo`. Tocar volta ao estado 4.1.
- **Nenhum `switch` aparece neste estado.** Sem a resposta do servidor, a tela não sabe o que está ligado, e mostrar todos ligados por padrão seria afirmar algo que não foi lido.

**Estado vazio não se aplica:** os doze tipos sempre existem e o servidor devolve todos, inclusive os nunca alterados. **Estado de leitor no iOS:** sem artboard próprio. No iOS não há push (decisão P-04), o aviso de 4.5 nunca aparece e a tela é a de 4.2.

---

## 5. Artboards web (1440 x 900)

**Não existem.** RF-NOT-05 tem a coluna Web negativa em `REQUISITOS.md` §5.10, e o §2.1 lista notificações entre os assuntos que o cliente web não cobre. Não desenhe sidebar, dialog nem coluna web desta tela.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem. Três artboards na linha 3, alinhados abaixo dos equivalentes claros:

- **`Preferências de notificação · Escuro, padrão`** (o estado 4.2). Fundo `noite`. Seta, título e sino em `papel-suave`; badge em `musgo-claro` com número em `noite`. Texto de abertura em `grafite-claro`. Títulos de seção em `grafite-claro`. Nome do tipo em `papel-suave`, descrição em `grafite-claro`, ícone do tipo em `grafite-claro`. Divisores em `linha-noite`. `switch` ligado com trilho `musgo-claro` e botão em `noite`; desligado com trilho em `noite-elevada`, contorno de 2px `grafite-fundo-escuro` e botão em `grafite-claro`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com `Perfil` ativo em `musgo-claro`.
- **`Preferências de notificação · Escuro, notificações desligadas no aparelho`** (o estado 4.5). Aviso com fundo `ambar-fundo-escuro`, ícone e título em `papel-suave`, texto em `grafite-claro`, botão textual em `musgo-claro`.
- **`Preferências de notificação · Escuro, falha ao salvar`** (o estado 4.4). Mensagem e `Warning` da linha em `rubi-claro`.

Nos três, os shadows ficam com **metade da opacidade**, e a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Shell: barra inferior e header com o sino | periodo-0/P0-NAV/shell-de-navegacao.md |
| Header de tela de detalhe (`ArrowLeft`, título, sino) | prompts do Período 1 de F-AUT (`configuracoes.md`, `alterar-senha.md`), incorporação pendente |
| Título de seção em `label` | prompts de Configurações do Período 1 |
| Ícones dos tipos de notificação | documento-de-design §5.6 e os prompts de notificações dos Períodos 1 e 2 |
| `Flame` do streak | documento-de-design §4.8 |
| Banner de erro inline em `rubi-fundo` com `Tentar de novo` | documento-de-design §4.2 e o estado de erro das Notificações do Período 1 |
| Erro inline de item com `Warning` 16px | edição de Ações de leitura do Período 2, incorporação pendente |
| Botão textual | documento-de-design §4.1 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Iconografia Phosphor | documento-de-design §6 |

**Componentes que nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **O `switch`.** O documento-de-design não define controle de liga e desliga. O desenho adotado é trilho de 52 x 32px em `radius-full`, ligado preenchido em `musgo` com botão de 24px em `papel`, desligado com contorno de 2px `grafite-suave` e botão de 16px; equivalentes no escuro com `musgo-claro`, `noite-elevada` e `grafite-fundo-escuro`.
2. **A linha de preferência**: ícone de 24px, nome em `body`, descrição em `caption` de até duas linhas e `switch` à direita, com 72px de altura mínima e a linha inteira tocável.
3. **O aviso de permissão negada do sistema**: bloco em `ambar-fundo` com ícone, título, texto e botão textual que sai do app, sem `X`.
4. **O ícone `BellSlash`** para push desligado e **`ArrowSquareOut`** para ação que abre outro aplicativo.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Notificações` |
| Texto de abertura | `Escolha o que você quer receber. Desligar um tipo vale para a lista do app e para as notificações no celular.` |
| Seção 1 | `Seguidores` |
| Seção 2 | `Atividades e comentários` |
| Seção 3 | `Resenhas e recomendações` |
| Seção 4 | `Leituras` |
| Tipo e descrição | `Novo seguidor` · `Quando alguém começa a seguir você.` |
| Tipo e descrição | `Pedido para seguir` · `Quando alguém pede para seguir seu perfil privado.` |
| Tipo e descrição | `Pedido aceito` · `Quando aceitam seu pedido para seguir.` |
| Tipo e descrição | `Curtida em atividade` · `Quando curtem uma atividade sua no feed.` |
| Tipo e descrição | `Comentário em atividade` · `Quando comentam uma atividade sua.` |
| Tipo e descrição | `Resposta a comentário` · `Quando respondem a um comentário seu.` |
| Tipo e descrição | `Menção em comentário` · `Quando mencionam você num comentário.` |
| Tipo e descrição | `Curtida em resenha` · `Quando curtem uma resenha sua.` |
| Tipo e descrição | `Livro recomendado` · `Quando um leitor recomenda um livro para você.` |
| Tipo e descrição | `Leitura em risco` · `Depois de 30 dias sem progresso, com a opção de abandonar a leitura.` |
| Tipo e descrição | `Leitura abandonada` · `Quando uma leitura é abandonada depois de 40 dias sem progresso.` |
| Tipo e descrição | `Lembrete de sequência` · `Um aviso por dia, se você tem sequência ativa e ainda não registrou progresso.` |
| Nota de rodapé | `Desligar um tipo não apaga as notificações que você já recebeu.` |
| Erro ao salvar uma linha | `Não foi possível salvar. Verifique sua conexão e tente de novo.` |
| Aviso, título | `As notificações no celular estão desligadas` |
| Aviso, texto | `Você continua recebendo na lista do app tudo o que estiver ligado aqui. Para receber também fora dele, permita as notificações do Lê Ai nos ajustes do Android.` |
| Aviso, botão | `Abrir ajustes do Android` |
| Erro de carregamento | `Não foi possível carregar suas preferências. Verifique sua conexão e tente de novo.` |
| Erro de carregamento, botão | `Tentar de novo` |
| Rótulo acessível da seta | `Voltar para Configurações` |
| Estado anunciado do `switch` | `ligado` ou `desligado` |

Zero em-dash em toda a copy. Zero emoji. Os prazos aparecem com unidade: `30 dias`, `40 dias`. A copy diz o que o tipo é, sem pedir nada: nada de `Não perca`, `Fique por dentro` nem ponto de exclamação.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo nos dois temas. A descrição de cada tipo é informação essencial e usa `grafite` (`grafite-claro` no escuro), nunca o terciário.
- **O `switch` passa 3:1 como componente de interface**: o contorno `grafite-suave` sobre `papel` no desligado e o `musgo` preenchido no ligado. No escuro, `grafite-fundo-escuro` e `musgo-claro` sobre `noite`.
- **Ligado e desligado se distinguem sem cor**, pela posição e pelo tamanho do botão e pelo trilho preenchido ou só contornado.
- **A linha inteira é um único controle** para o leitor de tela, com papel de `switch`, nome do tipo como rótulo, descrição como dica e o estado `ligado` ou `desligado`. Tocar em qualquer ponto da linha alterna. Alvo de 72px de altura, acima dos 48px exigidos.
- **A falha ao salvar é anunciada** ao leitor de tela junto com a volta do estado: `Comentário em atividade, ligado. Não foi possível salvar. Verifique sua conexão e tente de novo.`
- O aviso de 4.5 é lido antes da primeira seção, e o botão `Abrir ajustes do Android` é anunciado como algo que sai do app.
- Títulos de seção são cabeçalhos para o leitor de tela, e não são focáveis como controle.
- Ícones dos tipos são decorativos para o leitor de tela: o nome do tipo já diz o que ele é.
- A tela acomoda o aumento de fonte do sistema: as descrições quebram em mais linhas e as linhas crescem, sem corte e sem o `switch` sair da linha.
- `prefers-reduced-motion` respeitado: o deslize do `switch` e o fade do skeleton viram troca instantânea.
- **Nenhuma ação destrutiva nesta tela.** Desligar um tipo é reversível no mesmo toque e não apaga nada, por isso não pede confirmação.

---

## 10. O que não fazer nesta tela

**Escopo**

- **Não desenhe `switch` de seção ou de categoria.** O controle é por tipo (RF-NOT-05). O título da seção é só texto.
- **Não desenhe um `switch` geral** do tipo `Pausar todas as notificações` ou `Não perturbe`. Não há requisito.
- **Não desenhe dois controles por tipo** (um para o app e outro para o push). É uma preferência só, que vale para os dois.
- **Não desenhe horário do lembrete** nem campo para escolher a hora. O lembrete sai uma vez por dia e o horário não é configurável.
- **Não desenhe a caixa de permissão do Android.** Ela é do sistema operacional.
- **Não desenhe a lista de aparelhos registrados** nem sessões ativas. O registro do aparelho acontece sem tela.
- **Não desenhe e-mail como canal.** O produto não envia notificação por e-mail.
- **Não desenhe versão web** desta tela.
- **Não desenhe botão `Salvar`** no rodapé nem confirmação de saída da tela. Cada toque salva a linha.
- **Não use toast** para confirmar que salvou, nem para o erro. O `switch` na posição nova é a confirmação; o erro fica na linha.
- **Não pinte `Leitura em risco` de `ambar`** nem `Lembrete de sequência` de `broto` nesta tela. Os ícones são todos `grafite`.
- **Não desenhe uma prévia da notificação** nem um exemplo de push em cada linha.
- Não desenhe engrenagem nesta tela. O caminho até aqui é `Configurações`.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela. Ela não é resenha, frase nem sinopse.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. Os títulos de seção são `label`, não caixa alta.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão, em `switch` ou em texto de título.
- Nada de `switch` azul, verde-limão ou de outra cor que não `musgo`.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura. O `switch` não tem sombra no botão.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando, nem dentro do `switch` enquanto salva.
- Nada de mola ou quique no `switch`. Um deslize em `dur-fast`, e só.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de checkbox no lugar do `switch`.
- Nada de toast com fundo saturado.
- Nada de avatar nas linhas.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
