# F-EST · Ações de leitura

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-EST.md
**Requisitos:** RF-EST-03 (iniciar leitura, com data de início padrão hoje e editável), RF-EST-04 (finalizar leitura, com data de fim padrão hoje e editável), RF-EST-05 (abandonar manualmente), RF-EST-06 (iniciar releitura de um livro Lido), RF-EST-07 (retomar uma primeira leitura abandonada, continuando da página registrada). Também o vínculo de estante de RF-EST-01 e a remoção de um livro em Quero ler.
**Não funcionais:** RNF-USA-04 (confirmação em ação destrutiva), RNF-USA-03, RNF-USA-05, RNF-SEC-07 (o servidor recusa iniciar leitura de livro pessoal de outro), RNF-ERR-04 (repetir a mesma escrita não repete efeito)
**Regras de negócio:** RN-04, a máquina de estados completa, incluindo as duas assimetrias que a copy precisa comunicar: abandonar uma primeira leitura deixa a leitura **retomável**, e abandonar uma **releitura** salva como Lido incompleto, **não retomável** e **sem incrementar** o número de conclusões.
**Versão web:** sim. RF-EST-03 a RF-EST-07 têm marcação na coluna Web de `REQUISITOS.md` §5.3. No mobile é bottom sheet; na web é dialog centrado, conforme `documento-de-design.md` §5.4.

---

## 1. Contexto

Este é o painel que move a leitura pela máquina de estados de RN-04. Ele abre por cima da estante e por cima da página do livro, sempre com o mesmo desenho, e mostra **só as transições válidas a partir do status atual**.

É a peça mais delicada do produto em termos de copy: duas transições parecem a mesma coisa e não são.

- **Abandonar uma primeira leitura** grava a página de parada e deixa a leitura **retomável**. O leitor volta de onde parou.
- **Abandonar uma releitura** salva a releitura como incompleta, o status volta para **Lido**, o número de conclusões **não** aumenta e a releitura **não** é retomável.

Se a interface não disser isso antes da confirmação, o leitor descobre depois, e não há como desfazer: a máquina de estados de RN-04 não tem undo.

Ele sustenta o mecanismo de **registro**: é onde o fato de ter lido fica gravado.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, com o sheet sobre o contexto de origem.
- **Linha 2:** estados web, viewport `1440 x 900`, com o dialog centrado sobre o contexto de origem.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Ações de leitura · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- **O contexto de origem aparece atrás em todos os artboards**, escurecido pelo scrim, para que a proporção do sheet e do dialog seja legível. Ele é a estante ou a página do livro, desenhados de forma genérica: não são o assunto deste prompt.

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

**Livro dos artboards de Lendo, Quero ler e Abandonado:** `Torto Arado`, de Itamar Vieira Junior, Todavia, `264 páginas`.

**Livro do artboard de Relendo:** `A Hora da Estrela`, de Clarice Lispector, Rocco, `96 páginas`, com `2 conclusões` anteriores.

**Livro do artboard de Lido:** `Vidas Secas`, de Graciliano Ramos, Record, `176 páginas`, concluído em `04 de julho de 2026`, com `1 conclusão`.

**Datas:**

- Data de hoje nos artboards: `08 de setembro de 2026`.
- Data de início da leitura em andamento: `12 de agosto de 2026`.
- Página de parada da leitura abandonada: `página 210`.

**Estados de leitura por artboard:**

| Artboard | Status atual | Transições oferecidas |
|---|---|---|
| Fora da estante | nenhum | Adicionar como Quero ler, Iniciar leitura |
| Quero ler | Quero ler | Iniciar leitura, Remover da estante |
| Lendo | Lendo | Registrar progresso, Finalizar leitura, Abandonar leitura |
| Relendo | Relendo | Registrar progresso, Finalizar releitura, Abandonar releitura |
| Lido | Lido | Iniciar releitura |
| Abandonado | Abandonado | Retomar leitura |

---

## 4. Artboards mobile (390 x 844)

O painel é um **bottom sheet**, conforme `documento-de-design.md` §5.4, que fixa sheet no mobile e dialog centrado na web.

### Anatomia do bottom sheet

- **Scrim** cobrindo a viewport inteira, `rgba(23,21,18,0.32)`, ou seja, tingido no hue de `tinta` e nunca preto puro. Toque no scrim fecha.
- **Sheet** ancorado no rodapé, largura total, fundo `papel-elevado`, cantos superiores em `radius-xl` 24 e cantos inferiores retos, `elev-3`.
- **Alça** de 36 por 4px em `linha`, `radius-full`, centralizada, com `space-3` acima e abaixo. Ela indica o arraste para fechar e não é um botão.
- **Cabeçalho do sheet:** card compacto do livro, com capa de 60 por 90px à esquerda em canto vivo, `space-4` de gap, título em `title-sm` `tinta` e autor em `caption` `grafite`. À direita, o status pill atual conforme design §4.6.
- Divisor de 1px `linha` abaixo do cabeçalho.
- **Lista de ações**, cada uma com 56px de altura, padding lateral `space-5`, ícone Phosphor de 24px à esquerda, `space-4` de gap, rótulo em `body-strong`, e um `CaretRight` (Phosphor, `regular`, 20px, `grafite-suave`) à direita quando a ação abre outro passo.
  - Ação neutra: ícone e rótulo em `tinta`.
  - Ação principal do estado: ícone e rótulo em `musgo`.
  - Ação destrutiva: ícone e rótulo em `rubi`, sempre a **última** da lista, separada por divisor de 1px `linha`.
- Padding inferior de `space-5` mais a área segura.
- Entrada do sheet: desliza de baixo em `dur-base` com `ease-out`. Saída em `dur-fast` com `ease-in`. Sob `prefers-reduced-motion`, aparece e some sem deslizar.

### 4.1 Livro fora da estante

Cabeçalho sem status pill. Duas ações:

- `BookmarkSimple` `Adicionar como Quero ler`, em `musgo`.
- `BookOpen` `Iniciar leitura`, em `tinta`, com `CaretRight`.

### 4.2 Status Quero ler

Cabeçalho com pill `Quero ler`. Duas ações:

- `BookOpen` `Iniciar leitura`, em `musgo`, com `CaretRight`.
- Divisor, e `Trash` `Remover da estante`, em `rubi`.

### 4.3 Status Lendo

Cabeçalho com pill `Lendo`, e abaixo dele, dentro do cabeçalho, a barra de progresso de design §4.7 com `56%` e a linha `Página 148 de 264` em `caption` `grafite`.

Três ações:

- `PlusCircle` `Registrar progresso`, em `musgo`, com `CaretRight`.
- `CheckCircle` `Finalizar leitura`, em `tinta`, com `CaretRight`.
- Divisor, e `PauseCircle` `Abandonar leitura`, em `rubi`.

### 4.4 Iniciar leitura, com data

O passo que a ação `Iniciar leitura` abre, no mesmo sheet, substituindo a lista.

- `ArrowLeft` (Phosphor, `regular`, 20px, `grafite`) no topo à esquerda, voltando à lista de ações.
- Título em `title` `tinta`: `Iniciar leitura`.
- Campo de data conforme design §4.2: label acima em `label` `grafite`, `Data de início`; campo de 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel` para contrastar com o sheet em `papel-elevado`, texto em `body` `tinta` com o valor `08 de setembro de 2026`, e `Calendar` (Phosphor, `regular`, 20px, `grafite`) à direita.
- Helper abaixo em `caption` `grafite`, **visível o tempo todo e não só depois de erro**: `A data padrão é hoje. Você pode ajustar se começou antes.`
- `space-6` abaixo, botão primário pill de largura total, altura 48px, `musgo`, texto `papel`: `Iniciar leitura`.
- Botão textual `musgo` de largura total abaixo: `Cancelar`.

### 4.5 Finalizar leitura, com data

Mesmo desenho do passo anterior, com:

- Título `Finalizar leitura`.
- Label `Data de fim`, valor `08 de setembro de 2026`.
- Helper: `A data padrão é hoje. Você pode ajustar se terminou antes.`
- Acima do botão, uma linha em `caption` `grafite` com `Check` (Phosphor, `regular`, 16px, `musgo`) à esquerda: `Esta será sua 2ª conclusão deste livro.` A contagem de RF-EST-08 sobe apenas na finalização, e dizer isso antes evita que o número apareça do nada.
- Botão primário: `Finalizar leitura`.

### 4.6 Confirmação de abandono, primeira leitura

Ação destrutiva. Conforme RNF-USA-04, a confirmação é **modal**, não um segundo toque no mesmo botão.

- O sheet dá lugar a um **dialog centrado** sobre o mesmo scrim: largura de 320px, fundo `papel-elevado`, `radius-lg` 20, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Abandonar esta leitura?`
- Texto em `body` `grafite`, com `space-4` acima: `A leitura fica salva na página 148 e você pode retomá-la depois, continuando de onde parou.`
- `space-6` abaixo, dois botões empilhados, largura total:
  - **Botão destrutivo em outline**, `radius` 12, altura 48px, fundo transparente, borda de 1px `rubi`, texto `rubi`: `Abandonar leitura`. Nunca preenchido.
  - Botão textual `grafite`: `Cancelar`.
- **Sem opção de desfazer depois.** A máquina de estados de RN-04 não tem undo, e prometer um seria mentira.

### 4.7 Confirmação de abandono, releitura

O mesmo dialog, com a copy que muda o fato.

- Título em `title` `tinta`: `Abandonar esta releitura?`
- Texto em `body` `grafite`: `A releitura será salva como incompleta e o livro volta para Lido. Ela não conta como nova conclusão e não pode ser retomada.`
- Botão destrutivo em outline `rubi`: `Abandonar releitura`.
- Botão textual `grafite`: `Cancelar`.
- Este artboard existe porque a diferença entre 4.6 e 4.7 é uma regra de negócio, não uma variação de texto. Os dois precisam aparecer no canvas lado a lado.

### 4.8 Status Lido

Cabeçalho com pill `Lido`, e abaixo, em `caption` `grafite`: `Concluído em 04 de julho de 2026 · 1 conclusão`.

Uma ação:

- `ArrowsClockwise` `Iniciar releitura`, em `musgo`, com `CaretRight`.

**Sem opção de remover da estante.** Existe histórico de leitura, e o vínculo de estante só é removível enquanto o livro está em Quero ler e nunca foi lido.

### 4.9 Status Abandonado

Cabeçalho com pill `Abandonado`, e abaixo, em `caption` `grafite`: `Parou na página 210 de 552`.

Uma ação:

- `Play` `Retomar leitura`, em `musgo`.
- Abaixo da lista, em `caption` `grafite`, com padding lateral `space-5`: `Você volta para a página 210, onde parou.`

### 4.10 Confirmação de remover da estante

- Dialog centrado, mesmo desenho do 4.6.
- Título: `Remover da estante?`
- Texto em `body` `grafite`: `O livro sai da sua lista de Quero ler. Você pode adicioná-lo de novo quando quiser.`
- Botão destrutivo em outline `rubi`: `Remover da estante`.
- Botão textual `grafite`: `Cancelar`.

### 4.11 Salvando e erro

Dois estados no mesmo artboard, um acima do outro dentro do frame não: **dois artboards separados**.

- **Salvando:** o botão primário fica em estado desabilitado, fundo `musgo` com 60% de opacidade, texto `papel`, e o rótulo passa a `Salvando`. **Sem spinner dentro do botão.** Os campos ficam desabilitados com fundo `linha` e texto `grafite-suave`.
- **Erro:** abaixo do botão, mensagem em `caption` `rubi` com `space-2` de gap: `Não foi possível salvar. Verifique sua conexão e tente de novo.` O botão volta a ficar ativo com o rótulo original.

---

## 5. Artboards web (1440 x 900)

Na web o painel é **dialog centrado**, não bottom sheet, conforme `documento-de-design.md` §5.4.

### Anatomia do dialog

- Scrim cobrindo a viewport, `rgba(23,21,18,0.32)`, tingido no hue de `tinta`.
- Dialog centrado vertical e horizontalmente, largura de 440px, fundo `papel-elevado`, `radius-lg` 20, `elev-3`, padding `space-6`.
- **Sem alça de arraste:** a alça é elemento de sheet e não existe aqui.
- `X` (Phosphor, `regular`, 20px, `grafite`) no canto superior direito, fechando.
- Cabeçalho do livro com capa de 72 por 108px, título em `title-sm`, autor em `caption`, status pill à direita.
- Lista de ações com 48px de altura (medida de web) e `hover` de fundo `linha`, transição `dur-fast`.
- Botões com 40px de altura, a medida de web de design §4.1.
- O contexto atrás é a estante ou a página do livro em desktop, com a sidebar do shell visível à esquerda.
- Foco de teclado preso dentro do dialog enquanto ele está aberto, e devolvido ao elemento que o abriu quando fecha. `Esc` fecha.

### 5.1 Status Lendo

Dialog com as três ações, cabeçalho com barra de progresso e o item `Abandonar leitura` em `rubi` separado por divisor.

### 5.2 Finalizar leitura, com data

Dialog no passo de data, com o campo de 44px de altura (medida de web), o helper visível, a linha `Esta será sua 2ª conclusão deste livro.` e os dois botões **lado a lado** à direita, e não empilhados como no mobile: `Cancelar` textual à esquerda de `Finalizar leitura` primário.

### 5.3 Confirmação de abandono de releitura

Dialog de confirmação, 400px de largura, com a copy de 4.7 e os dois botões lado a lado à direita: `Cancelar` textual e `Abandonar releitura` em outline `rubi`.

### 5.4 Ação em hover e campo desabilitado

Dialog com as três ações, o item `Finalizar leitura` em hover com fundo `linha`, e um segundo dialog ao lado no estado salvando, com os campos desabilitados em fundo `linha` e texto `grafite-suave`. Serve para conferir hover e `disabled`, que só existem na web.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: o contexto atrás do scrim também está escuro.

- **Mobile, status Lendo.** Contexto em `noite`. Scrim em `rgba(0,0,0,0.48)` sobre o fundo escuro, mas nunca com o próprio sheet em preto puro. Sheet em `noite-elevada`, **mais claro** que o fundo, sem borda. Alça em `linha-noite`. Título do livro em `papel-suave`, autor em `grafite-claro`. Divisores em `linha-noite`. Ação principal em `musgo-claro`, ação neutra em `papel-suave`, ação destrutiva em `rubi-claro`. Status pill `Lendo` com fundo `musgo-fundo-escuro` e texto `musgo-claro`.
- **Mobile, confirmação de abandono.** Dialog em `noite-elevada`, título em `papel-suave`, texto em `grafite-claro`, botão destrutivo com borda de 1px `rubi-claro` e texto `rubi-claro`, fundo transparente.
- **Web, status Lendo.** Dialog em `noite-elevada` sobre o contexto em `noite`, com a sidebar em `noite-elevada` visível atrás do scrim. Hover da ação em `linha-noite`.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia do sheet e do dialog vem da cor de superfície, que é mais clara que o fundo, e não da sombra.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Bottom sheet no mobile e dialog centrado na web | documento-de-design §5.4 |
| Card compacto do livro no cabeçalho, com capa de 60 por 90px | documento-de-design §5.4 |
| Status pill dos cinco status | documento-de-design §4.6 |
| Barra de progresso de leitura | documento-de-design §4.7 |
| Botão primário pill, textual e destrutivo em outline | documento-de-design §4.1 |
| Input com label acima, helper permanente e erro | documento-de-design §4.2 |
| Confirmação de ação destrutiva em modal, com botão em outline `rubi` | documento-de-design §7.8 e RNF-USA-04 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |

**Componentes que ainda não existem na fonte.** A **lista de ações dentro do sheet**, com ação neutra, ação principal e ação destrutiva separada por divisor, não está no `documento-de-design.md`: o §5.4 desenha o sheet de registrar progresso, que é um formulário, não um menu de transições. O desenho nasce aqui e vira pendência de incorporação ao documento pelo controle de mudança do plano §3.

**Também nasce aqui o campo de data.** O §4.2 define input de texto, não seletor de data. O campo desenhado é o input padrão com o valor formatado e o ícone `Calendar`; o seletor de data em si é o do sistema operacional no mobile e o nativo do browser na web, e não é redesenhado.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Ação | `Adicionar como Quero ler` |
| Ação | `Iniciar leitura` |
| Ação | `Registrar progresso` |
| Ação | `Finalizar leitura` |
| Ação | `Finalizar releitura` |
| Ação | `Iniciar releitura` |
| Ação | `Retomar leitura` |
| Ação destrutiva | `Abandonar leitura` |
| Ação destrutiva | `Abandonar releitura` |
| Ação destrutiva | `Remover da estante` |
| Label do campo | `Data de início` |
| Label do campo | `Data de fim` |
| Helper de início | `A data padrão é hoje. Você pode ajustar se começou antes.` |
| Helper de fim | `A data padrão é hoje. Você pode ajustar se terminou antes.` |
| Aviso de conclusão | `Esta será sua 2ª conclusão deste livro.` |
| Detalhe de Lido | `Concluído em 04 de julho de 2026 · 1 conclusão` |
| Detalhe de Abandonado | `Parou na página 210 de 552` |
| Detalhe de retomada | `Você volta para a página 210, onde parou.` |
| Confirmação, título | `Abandonar esta leitura?` |
| Confirmação, texto | `A leitura fica salva na página 148 e você pode retomá-la depois, continuando de onde parou.` |
| Confirmação de releitura, título | `Abandonar esta releitura?` |
| Confirmação de releitura, texto | `A releitura será salva como incompleta e o livro volta para Lido. Ela não conta como nova conclusão e não pode ser retomada.` |
| Confirmação de remoção, título | `Remover da estante?` |
| Confirmação de remoção, texto | `O livro sai da sua lista de Quero ler. Você pode adicioná-lo de novo quando quiser.` |
| Cancelar | `Cancelar` |
| Botão em salvamento | `Salvando` |
| Erro | `Não foi possível salvar. Verifique sua conexão e tente de novo.` |

Zero em-dash em toda a copy. Zero emoji. Todo número traz a unidade, e as datas aparecem por extenso em pt-BR.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px em cada item da lista de ações e em cada botão, que já é a altura do item.
- A ação destrutiva é distinguível **sem depender de cor**: além de `rubi`, ela fica separada por divisor, é sempre a última da lista e o botão de confirmação é o único em outline.
- Toda ação destrutiva passa por confirmação em modal (RNF-USA-04): abandonar leitura, abandonar releitura e remover da estante. Nenhuma delas é executada pelo primeiro toque.
- A confirmação diz **o que acontece**, não "esta ação não pode ser desfeita" no genérico. Em RN-04 as duas confirmações de abandono têm consequências diferentes, e a copy carrega essa diferença.
- Contraste WCAG AA no corpo nos dois temas. O texto da confirmação usa `grafite`, não `grafite-suave`, porque é informação essencial.
- No dialog da web, o foco de teclado fica preso dentro dele enquanto está aberto, entra no primeiro elemento acionável, é devolvido ao elemento de origem ao fechar, e `Esc` fecha. O dialog é anunciado com o título como rótulo.
- O bottom sheet do mobile é fechável por toque no scrim e por arraste para baixo, e o botão `Cancelar` continua existindo para quem não usa gesto.
- `prefers-reduced-motion` respeitado: o sheet aparece e some sem deslizar, e o dialog sem escala de entrada.
- O helper do campo de data é visível o tempo todo, não só depois do erro.

---

## 10. O que não fazer nesta tela

**Específico das ações de leitura**

- **Não ofereça transição inválida.** O painel mostra só o que a máquina de estados de RN-04 permite a partir do status atual. Livro em Lido não oferece abandonar; livro em Abandonado não oferece finalizar; livro com histórico não oferece remover da estante.
- **Não use a mesma copy para abandonar leitura e abandonar releitura.** As consequências são diferentes e a confirmação precisa dizer qual delas se aplica.
- **Não prometa desfazer.** RN-04 não tem undo. Nada de "você pode desfazer depois", nada de toast com `Desfazer`.
- **Não desenhe botão destrutivo preenchido.** Destrutivo é outline `rubi`, e isso vale nos dois temas.
- Não junte a confirmação ao próprio botão de ação em um "toque duas vezes para confirmar". A confirmação é modal.
- **Não desenhe favoritar.** RF-EST-09 é do Período 2, em F-EST-2.
- Não ofereça iniciar leitura de livro pessoal de outra pessoa. O servidor recusa (RNF-SEC-07) e a interface não oferece.
- Não desenhe seletor de data customizado do zero. O campo é o input do sistema com o valor formatado.
- Não esconda o campo de data atrás de um "avançado". A data é editável por requisito, não por preferência.
- Não desenhe spinner dentro do botão em salvamento. O sistema não tem spinner: o botão fica desabilitado e o rótulo muda.

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

**Formulários**

- Nada de placeholder no lugar do label. Label sempre acima do campo.
- Nada de helper que só aparece depois do erro. Se a regra existe, o helper é visível o tempo todo.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.
- Nada de campo de senha sem o botão de mostrar a senha.
**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.
- Nada de desfazer em ação destrutiva pesada.
**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "42" sozinho: é "42 páginas", "42 minutos", "42 livros".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".
- Nada de gráfico em roxo ou teal de IA. Gráfico usa musgo como principal, broto como secundário e grafite como neutro.
- Nada de gráfico com mais de três séries.
- Nada de repetir o símbolo de percentual quando o contexto já é percentual.
**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
