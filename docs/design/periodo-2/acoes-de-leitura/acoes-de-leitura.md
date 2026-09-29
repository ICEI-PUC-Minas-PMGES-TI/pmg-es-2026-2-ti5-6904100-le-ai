# Ações de leitura (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Ações de leitura`, gerado por `docs/design/periodo-1/F-EST/acoes-de-leitura.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-EST/acoes-de-leitura.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-EST-2.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-SESSAO.md
**Requisitos que entram:**
- F-EST-2: RF-EST-09 (marcar e desmarcar favorito, a partir do sheet)
- F-SESSAO: RF-PRG-05 (só a entrada `Iniciar sessão de leitura`, a partir de uma leitura em Lendo ou Relendo; o modo de foco é outra tela)

**Não funcionais:** RNF-ERR-04 (favoritar é idempotente), RNF-SEC-07 (o servidor recusa favoritar e iniciar leitura em livro pessoal de outra pessoa), RNF-USA-03, RNF-USA-05
**Regras de negócio:** RN-04 (a lista continua mostrando só as transições válidas), RN-16.1 e RN-16.3 (a sessão só nasce de Lendo ou Relendo, e abre sem shell, em modo de foco), RN-03 (o dono de um livro pessoal pode favoritá-lo e iniciar leitura dele em qualquer status; o sheet do livro pessoal do dono é igual ao do livro oficial)
**Versão web:** sim, para o favorito: RF-EST-09 tem marcação na coluna Web de `REQUISITOS.md` §5.3. **A sessão não tem web:** RF-PRG-05 tem marcação negativa na coluna Web de §5.4, porque RN-16 não se aplica a uma aba de navegador (§10.9). O item `Iniciar sessão de leitura` existe **só no app Flutter**; ele não aparece no dialog da web nem na SPA aberta num celular.

---

## 1. O que muda e por quê

Duas features do Período 2 põem uma ação cada no sheet de ações de leitura, e as duas entram nesta edição de uma vez para não disputarem a lista em edições separadas. **A anatomia do sheet e do dialog, as confirmações de abandono e remoção, os passos de data e os estados de salvando e erro não mudam.**

| O que entra | Onde | Em quais status | Plataforma | Feature |
|---|---|---|---|---|
| Item `Favoritar` / `Remover dos favoritos` | Grupo próprio, depois das transições e antes da ação destrutiva | Todos, inclusive fora da estante | mobile e web | F-EST-2 |
| Item `Iniciar sessão de leitura` | Logo abaixo de `Registrar progresso` | Só `Lendo` e `Relendo` | só mobile | F-SESSAO |

**Favoritar não é transição de RN-04.** Ele não muda o status, não põe o livro em `Quero ler` e não tira nada da estante (RF-EST-09, F-EST-2: favorito é relação independente). Por isso o item mora num **grupo próprio**, separado por divisor das transições, e aparece **em todos os estados**, inclusive no livro fora da estante. Tocar alterna na hora, sem confirmação e sem sair do sheet: desfavoritar não é destrutivo, é reversível no mesmo toque.

**`Iniciar sessão de leitura` é a primeira das duas entradas da sessão cronometrada.** A outra é um botão secundário no sheet de registrar progresso (edição `registrar-progresso/registrar-progresso.md`). O toque fecha o sheet e abre o modo de foco em tela cheia, **sem shell** (RN-16.3): sem barra inferior, sem sino, sem voltar. O modo de foco é desenhado em `F-SESSAO/modo-de-foco.md`; não o desenhe neste canvas. Iniciar não chama o servidor (RN-16.10), então o item não tem estado de salvando nem de erro.

**Livro pessoal.** No livro pessoal do próprio dono o sheet é idêntico ao do livro oficial, com favoritar e sessão (RN-03: estante e leitura são exclusivas do dono, em qualquer status). No livro pessoal de outra pessoa o sheet **não existe**: a página em modo consulta não oferece estante, favorito nem leitura (design §5.8). Nenhum artboard novo é preciso para isso.

**O que deixa de valer do prompt do Período 1:** a proibição de desenhar favoritar. O cronômetro e o modo de foco continuam fora deste canvas: aqui entra só o item que leva até eles.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`, com o sheet sobre o contexto de origem.
- **Linha 2:** estados web, viewport `1440 x 900`, com o dialog centrado sobre o contexto de origem.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Ações de leitura · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

## 3. O que permanece intocado

- **O contexto de origem** atrás do scrim, a estante ou a página do livro, desenhados de forma genérica, com o shell como já está.
- **A anatomia do bottom sheet**: scrim, fundo `papel-elevado`, cantos superiores em `radius-xl`, alça, cabeçalho com o card compacto do livro (capa de 60 por 90px em canto vivo, título, autor, status pill), divisor, itens de 56px com ícone de 24px e rótulo em `body-strong`, `CaretRight` quando a ação abre outro passo.
- **A anatomia do dialog da web**: 440px, `radius-lg`, `X` no canto, itens de 48px com hover de fundo `linha`, botões de 40px.
- **Os três papéis das ações**: principal em `musgo`, neutra em `tinta`, destrutiva em `rubi`, sempre a última, depois de divisor.
- **Os artboards de passo e confirmação**, sem nenhuma mudança: `Iniciar leitura, com data`, `Finalizar leitura, com data`, `Abandonar leitura (primeira)`, `Abandonar releitura`, `Remover da estante`, `Salvando`, `Erro ao salvar`, `Finalizar leitura, web`, `Abandonar releitura, web`, `Abandonar leitura, escuro`. Eles mostram um passo ou um modal, não a lista, e a lista é o único lugar que muda.
- **O item `Ver atualizações`**, onde ele já estiver no canvas.
- **Toda a copy do Período 1** que não aparece na seção 8 como alterada.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas.

### 4.1 Item de favorito, em toda lista de ações

Vale para todo artboard que mostra a **lista de ações**: `Fora da estante`, `Quero ler`, `Lendo`, `Lido`, `Abandonado`, `Lendo, web`, `Hover e desabilitado, web` (o dialog da lista), `Lendo, escuro` e `Lendo, web escuro`.

- **Posição:** depois da última transição de RN-04 e antes do divisor da ação destrutiva. O item tem um **divisor de 1px `linha` acima dele**, que o separa das transições. Onde não há ação destrutiva (`Fora da estante`, `Lido`, `Abandonado`), ele é o último item da lista, ainda com o divisor acima.
- **Anatomia:** a mesma do item neutro: 56px de altura no mobile e 48px na web, padding lateral `space-5`, `Heart` (Phosphor, 24px no mobile e 20px na web) à esquerda, `space-4` de gap, rótulo em `body-strong` `tinta`. **Sem `CaretRight`**, porque o toque não abre outro passo.
- **Não favorito:** `Heart` peso `regular`, cor `tinta`; rótulo `Favoritar`.
- **Favorito:** `Heart` peso `fill`, cor `musgo`; rótulo `Remover dos favoritos`, ainda em `tinta`. O rótulo não fica `rubi`: desfavoritar não é destrutivo.
- **Toque:** alterna o estado na hora, com transição de `dur-fast` só na troca de peso e cor do ícone e no rótulo. O sheet **continua aberto**, sem toast e sem confirmação. É o mesmo comportamento do botão quadrado de `Heart` da página do livro, com o mesmo ícone e os mesmos rótulos.
- **Estados por artboard**, coerentes com a estante da mesma edição:

| Artboard | Livro | Favorito |
|---|---|---|
| `Fora da estante` | Torto Arado | não |
| `Quero ler` | Torto Arado | não |
| `Lendo`, `Lendo, web`, `Hover e desabilitado, web`, `Lendo, escuro`, `Lendo, web escuro` | Torto Arado | não |
| `Lido` | Vidas Secas | **sim** |
| `Abandonado` | Torto Arado | não |

- No `Hover e desabilitado, web`, o hover continua em `Finalizar leitura`. O item de favorito aparece no estado normal.

### 4.2 Item de sessão, em Lendo (só mobile)

Vale para `Lendo` e `Lendo, escuro`. **Não vale** para `Lendo, web`, `Hover e desabilitado, web` nem `Lendo, web escuro`: a web não tem sessão cronometrada.

- **Posição:** logo abaixo de `Registrar progresso`, antes de `Finalizar leitura`. Registrar e cronometrar são as duas formas de registrar progresso e ficam juntas.
- **Anatomia:** item neutro de 56px, `Timer` (Phosphor, `regular`, 24px, `tinta`) à esquerda, `space-4` de gap, rótulo em `body-strong` `tinta`: `Iniciar sessão de leitura`. `CaretRight` (Phosphor, `regular`, 20px, `grafite-suave`) à direita, porque o toque leva a outra tela.
- **Não é a ação principal.** A principal do status Lendo continua `Registrar progresso`, em `musgo`. O item de sessão é neutro, em `tinta`.
- O `Timer` é o mesmo glifo que o modo de foco e o sheet de encerrar sessão já usam para o tempo medido.
- **Toque:** o sheet some sem deslizar e o modo de foco ocupa a viewport inteira, sem shell e sem motion, porque o modo de foco opera em motion zero (design §4.10). Não há passo intermediário, confirmação nem aviso: RN-16.4 já não deixa o leitor sair por outro caminho que não encerrar ou cancelar, e o modo de foco explica isso na própria tela.
- A lista do status Lendo fica, de cima para baixo: `Registrar progresso` (principal), `Iniciar sessão de leitura`, `Finalizar leitura`, `Ver atualizações` se já estiver no canvas, divisor, `Favoritar`, divisor, `Abandonar leitura` (destrutiva).

### 4.3 `Lido`

- Entra 4.1, com o favorito **ativo**: `Heart` `fill` `musgo` e `Remover dos favoritos`. É o artboard que mostra o estado ativo no claro.
- Continua sem `Remover da estante` e sem sessão: Lido não tem leitura em andamento.

### 4.4 `Fora da estante`

- Entra 4.1, não favorito. O item aparece mesmo sem status pill no cabeçalho, porque favorito é independente da estante. Tocar em `Favoritar` não muda as duas ações existentes (`Adicionar como Quero ler`, `Iniciar leitura`).

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Ações de leitura · Relendo`

O status que o canvas do Período 1 não mostra como lista, e o segundo status que oferece a sessão (RN-16.1).

- Contexto atrás: a página do livro de `A Hora da Estrela`, de Clarice Lispector, Rocco, `96 páginas`, sob o scrim.
- Cabeçalho do sheet com o card compacto, o pill `Relendo` conforme design §4.6 (fundo `musgo-fundo`, texto `broto`, `ArrowsClockwise`), e abaixo a barra de progresso de design §4.7 com `32%` e a linha `Página 31 de 96` em `caption` `grafite`.
- Lista, de cima para baixo:
  - `PlusCircle` `Registrar progresso`, em `musgo`, com `CaretRight`.
  - `Timer` `Iniciar sessão de leitura`, em `tinta`, com `CaretRight` (4.2).
  - `CheckCircle` `Finalizar releitura`, em `tinta`, com `CaretRight`.
  - Divisor, e `Heart` `Remover dos favoritos`, com o `Heart` em `fill` `musgo` (4.1): `A Hora da Estrela` é favorito.
  - Divisor, e `PauseCircle` `Abandonar releitura`, em `rubi`.

#### 5.2 `Ações de leitura · Favorito, falha ao salvar`

A troca do favorito é otimista. Se o servidor recusa ou a conexão cai, o ícone volta e o sheet explica.

- Base: o artboard `Lido`, com `Vidas Secas`.
- O leitor tocou em `Remover dos favoritos` e o envio falhou: o item **voltou** ao estado favorito, com `Heart` `fill` `musgo` e o rótulo `Remover dos favoritos`.
- Logo abaixo do item, com padding lateral `space-5` e `space-2` de gap, a mensagem em `caption` `rubi`, com `Warning` (Phosphor, `regular`, 16px, `rubi`) à esquerda: `Não foi possível atualizar seus favoritos. Verifique sua conexão e tente de novo.`
- O item continua acionável: tocar de novo repete a tentativa. A escrita é idempotente (RNF-ERR-04), então repetir não cria nada em dobro.
- A mensagem some no próximo toque bem-sucedido ou ao fechar o sheet. Sem banner no topo, sem toast, sem modal.

### Linha 2, web

Nenhum artboard novo. O favorito na web aparece nos artboards de lista que já existem (4.1), e a sessão não tem web.

### Linha 3, modo escuro, no fim da linha

#### 5.3 `Ações de leitura · Relendo, escuro`

- O artboard 5.1 no modo escuro, com o tratamento da seção 6. Serve para conferir no escuro o favorito ativo e o item de sessão.

---

## 6. Artboards a remover e tratamento escuro

**Nenhum artboard sai.** Todos os do Período 1 continuam, com as mudanças da seção 4.

**Tratamento escuro dos elementos novos.** Modo escuro é lock de página inteira: o contexto atrás do scrim também está escuro. O sheet e o dialog ficam em `noite-elevada`, **mais claros** que o fundo `noite`; `musgo-claro` é o acento e os shadows têm metade da opacidade, porque a hierarquia vem da cor de superfície e do divisor `linha-noite`.

- Divisor acima do favorito em `linha-noite`.
- `Favoritar`: `Heart` `regular` e rótulo em `papel-suave`.
- `Remover dos favoritos`: `Heart` `fill` em `musgo-claro`, rótulo em `papel-suave`.
- `Iniciar sessão de leitura`: `Timer` e rótulo em `papel-suave`, `CaretRight` em `grafite-fundo-escuro`.
- Pill `Relendo` com fundo `musgo-fundo-escuro` e texto `broto-vivo`; barra de progresso com track `musgo-fundo-escuro` e fill `musgo-claro`.
- Mensagem de falha do favorito em `rubi-claro`, com o `Warning` em `rubi-claro`.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Lista de ações do sheet, com os três papéis | documento-de-design §5.4 e §4.11 |
| Bottom sheet no mobile e dialog centrado na web | documento-de-design §4.11 e §5.4 |
| Status pill `Relendo` | documento-de-design §4.6 |
| Barra de progresso de leitura | documento-de-design §4.7 |
| Ícone `fill` só para estado ativo (favorito) | documento-de-design §6 |
| Modo de foco, destino do item de sessão, sem shell e sem motion | documento-de-design §4.10 |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Grupo de ação que não é transição** na lista de ações, separado por divisor entre as transições e a destrutiva. O §5.4 diz que a lista mostra "só as transições que a máquina de estados permite"; o favorito é a primeira ação da lista que não é transição.
- **Item de alternância** (`Favoritar` / `Remover dos favoritos`), que troca de estado sem fechar o sheet e sem `CaretRight`.
- **Erro inline de um item da lista**, abaixo do item, em `caption` `rubi` com `Warning`. O P1 só tinha erro abaixo do botão do passo de data.
- **Item que só existe numa plataforma** (`Iniciar sessão de leitura`, só no app), com a regra de que a SPA em largura de celular não o mostra.

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Item de favorito, não favorito | não existia | `Favoritar` |
| Item de favorito, favorito | não existia | `Remover dos favoritos` |
| Item de sessão | não existia | `Iniciar sessão de leitura` |
| Falha do favorito | não existia | `Não foi possível atualizar seus favoritos. Verifique sua conexão e tente de novo.` |
| Ação do status Relendo | não aparecia em artboard | `Registrar progresso`, `Iniciar sessão de leitura`, `Finalizar releitura`, `Abandonar releitura` |
| Detalhe do Relendo | não aparecia em artboard | `Página 31 de 96` |

Nenhuma copy do Período 1 é substituída. Zero em-dash, zero emoji. Todo número traz a unidade, exceto o percentual da barra.

---

## 9. Acessibilidade e interação do que muda

- **Favorito:** o item é um botão de alternância com `aria-pressed`, anunciado pelo rótulo visível (`Favoritar` ou `Remover dos favoritos`). O estado não depende só de cor: muda o peso do ícone e o texto do rótulo. Alvo de 56px no mobile.
- **Falha do favorito:** a mensagem é associada ao item e anunciada como alerta, sem roubar o foco, que continua no item.
- **Sessão:** o item anuncia que abre outra tela. Ao abrir o modo de foco, o foco vai para o título do livro na tela da sessão; o botão ou gesto de voltar do sistema não devolve o sheet, porque o modo de foco não é contornável (RN-16.4).
- **Sessão só no app:** na SPA web, em qualquer largura, o item não é renderizado, nem desabilitado, nem escondido atrás de menu. Leitor de tela da web não o encontra.
- Contraste WCAG AA nos dois temas. Rótulos em `tinta` e `papel-suave`; a mensagem de falha em `rubi` e `rubi-claro` sobre a superfície do sheet.
- `prefers-reduced-motion`: a troca do favorito vira instantânea. A saída do sheet ao iniciar a sessão já é sem deslize.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Anatomia do sheet e do dialog, cabeçalho do livro, passos de data, confirmações, salvando e erro ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe o modo de foco** neste canvas. Ele é `F-SESSAO/modo-de-foco.md`.

**Específico do favorito**

- **Não trate favoritar como transição de status.** Ele não fica em `musgo` como ação principal, não muda o pill e não põe o livro em `Quero ler`.
- **Não trate desfavoritar como destrutivo.** Nada de `rubi`, nada de confirmação em modal, nada de mover o item para o lugar da ação destrutiva.
- Não feche o sheet ao favoritar. Não mostre toast de sucesso.
- Não desenhe o coração em vermelho ou rosa, nem com contagem.
- Não esconda o favorito no livro fora da estante.
- Não desenhe favoritar em livro pessoal de outra pessoa: ali o sheet não existe.

**Específico da sessão**

- **Não desenhe `Iniciar sessão de leitura` na web**, nem desabilitado, nem com aviso de "disponível no app".
- **Não ofereça a sessão fora de Lendo e Relendo.** Nada de sessão em `Quero ler`, `Lido`, `Abandonado` ou fora da estante (RN-16.1). Para começar a ler, o caminho continua `Iniciar leitura`.
- Não transforme o item em ação principal: a principal de Lendo e Relendo é `Registrar progresso`.
- Não desenhe passo de configuração da sessão (duração, meta, alarme). A sessão começa no toque.
- Não desenhe transição animada entre o sheet e o modo de foco.

**Das ações de leitura, do Período 1, que continua valendo**

- **Não ofereça transição inválida.** O painel mostra só o que a máquina de estados de RN-04 permite a partir do status atual.
- **Não use a mesma copy para abandonar leitura e abandonar releitura.**
- **Não prometa desfazer.** RN-04 não tem undo.
- Não junte a confirmação ao próprio botão de ação em um "toque duas vezes para confirmar". A confirmação é modal.
- Não ofereça iniciar leitura de livro pessoal de outra pessoa.
- Não desenhe spinner dentro do botão em salvamento.

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
- Nada de spinner girando.
- Nada de coração pulsando, partícula ou confete ao favoritar.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O rótulo diz o que a ação faz.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado, nem no card compacto do sheet.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de botão destrutivo preenchido.
- Nada de desfazer em ação destrutiva pesada.

**Layout (web)**

- Nada de conteúdo essencial escondido em hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio: na web o painel é o dialog centrado sobre a página em desktop.
- Nada de layout que não colapse abaixo de 768px: ali o dialog vira o bottom sheet, ainda sem o item de sessão.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
