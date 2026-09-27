# F-DSF · Criar desafio

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-DSF.md
**Requisitos:** RF-DSF-01 (criar um ou mais desafios simultâneos, escolhendo unidade, janela e valor-alvo), RF-DSF-04 (editar e excluir desafios; pausar mora na lista, em [`desafios.md`](desafios.md))
**Não funcionais:** RNF-ERR-04 (escrita idempotente: reenviar não cria dois desafios), RNF-USA-04 (confirmação em ação destrutiva), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento), RNF-SEC-13 (validação no servidor por esquema)
**Regras de negócio:** RN-20.1 (janelas de calendário no fuso do celular), RN-20.2 (desafio criado no meio da janela considera o que já foi registrado nela), RN-20.3 e RN-04 (livros contam ao serem finalizados), RN-20.4 (livros pessoais contam), RN-20.7 (editar recalcula só a janela corrente), RN-16.13 (minutos cronometrados contam como os informados)
**Versão web:** não. RF-DSF-01 e RF-DSF-04 têm a coluna Web negativa em `REQUISITOS.md` §5.7, e desafios estão fora do escopo do cliente web (`REQUISITOS.md` §2.1).

---

## 1. Contexto

O formulário em que o leitor **define uma meta**: o que conta (páginas, minutos ou livros), em que janela de calendário (dia, semana, mês ou ano) e quanto. É o mesmo formulário para **criar** e para **editar**; na edição ele ganha, no rodapé, a zona de exclusão.

**De onde se chega:**

- **Criar:** do `Plus` do header de [`desafios.md`](desafios.md) ou do botão `Novo desafio` do estado vazio daquela tela.
- **Editar:** do item `Editar desafio` do menu de ações de um desafio, na mesma tela.

**Para onde se vai:** salvar ou cancelar volta para a lista de desafios. Excluir, depois da confirmação, também volta para a lista, já sem o desafio.

A tela é empilhada sobre a área Perfil: header de tela de detalhe com seta de voltar e a aba `Perfil` ativa na barra inferior.

Três coisas que ela precisa resolver:

- **Três escolhas, nenhuma escondida.** Unidade e janela têm poucas opções fixas (três e quatro), então aparecem inteiras, como chips, e não atrás de um `select`. O leitor vê de uma vez tudo o que pode combinar, e qualquer unidade combina com qualquer janela (RN-20).
- **O leitor precisa saber o que vai contar antes de criar.** Páginas vêm de cada registro de progresso, minutos do tempo informado ou cronometrado, livros de cada leitura finalizada. E a janela é de calendário: um desafio anual criado hoje conta 2026 desde janeiro (RN-20.2). Isso é dito no próprio formulário, perto da escolha, e não num tutorial.
- **Editar não reescreve o passado.** RN-20.7: a mudança vale para a janela corrente, que é recalculada; janelas que já terminaram continuam como estavam. A copy da edição diz isso antes de o leitor salvar.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`: primeiro os de criação, depois os de edição.
- **Linha 2:** não existe. A tela não tem versão web (ver seção 5).
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Criar desafio · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
artesanal. Estatísticas e metas existem, mas o produto não é sobre métricas.

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
  página do livro. Fora desses três, serifa não aparece. Esta tela não tem
  serifa nenhuma.
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
radius 12. Chip toggleável é pill. Capa de livro é a exceção declarada do
sistema: retângulo de canto vivo, sem raio nenhum.

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

SOBREPOSIÇÃO MODAL (bottom sheet no mobile)
Fundo papel no claro e noite-elevada no escuro, radius-lg só no topo,
padding space-6, elev-3, alça de 32x4px em linha / linha-noite centralizada
com space-5 acima do conteúdo, padding inferior somando a área segura.
Scrim: #171512 a 40% no claro e preto a 60% no escuro (cor fixa).
Sobe em dur-slow com ease-out, sai em dur-base com ease-in; sob
prefers-reduced-motion entra e sai sem deslizar.

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

**Hoje é quinta-feira, 24 de setembro de 2026**, no fuso do celular do leitor.

**Criação, preenchida:** unidade `Páginas`, janela `Por dia`, valor-alvo `20`. Resumo composto: `20 páginas por dia`.

**Criação de desafio anual, para o artboard da faixa de RN-20.2:** unidade `Livros`, janela `Por ano`, valor-alvo `24`. Resumo: `24 livros por ano`.

**Edição:** o desafio `150 minutos por semana` da lista (unidade `Minutos`, janela `Por semana`, valor-alvo `150`), que nesta semana está em 95 de 150 minutos. O leitor muda o alvo para `120`. Resumo depois da mudança: `120 minutos por semana`.

**O que cada unidade conta** (RN-20, tabela de unidades):

| Unidade | Conta |
|---|---|
| Páginas | as páginas lidas em cada registro de progresso |
| Minutos | o tempo informado ou cronometrado em cada registro de progresso |
| Livros | cada leitura ou releitura finalizada; leitura abandonada ou releitura incompleta não conta |

**Janela, como aparece para o leitor:** `Por dia`, `Por semana`, `Por mês`, `Por ano`. Internamente são diária, semanal, mensal e anual (contrato `diaria | semanal | mensal | anual`).

**Valor-alvo:** número inteiro maior que zero. **O limite máximo ainda não está fixado no contrato** (pendência já registrada no arquivo da feature): o formulário valida só "maior que zero" e não inventa teto.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell. O shell é idêntico em todas as telas autenticadas e precisa ser desenhado por extenso aqui.

**Mobile, barra inferior.** Fixa no rodapé da viewport, acima da área segura. Altura de 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, sem sombra. Quatro itens de largura igual: `Estante`, `Descobrir`, `Feed`, `Perfil`. Cada item empilha ícone de 24px acima e rótulo em `caption` abaixo, com `space-1` de gap, centralizado, e a área tocável tem no mínimo 48px de altura. Ícones Phosphor: `Books` para Estante, `Compass` para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. Inativo: ícone peso `regular`, cor `grafite`; rótulo em `caption` `grafite`. Ativo: ícone peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`. Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone que salta. **Nesta tela o item ativo é `Perfil`.** Quando o teclado numérico está aberto, ele cobre a barra inferior, como em qualquer formulário do app.

**Mobile, header de tela de detalhe.** Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando à lista de desafios sem salvar. Se algo já foi escolhido ou digitado, a volta não pede confirmação: nada se perde de importante, e o formulário tem três escolhas.
- Título em `display` `tinta`, à esquerda, alinhado à base, `space-2` depois da seta: `Novo desafio` na criação, `Editar desafio` na edição.
- À direita, o sino `Bell` (Phosphor, `regular`, 24px, `tinta`), com o badge de não lidas quando houver: círculo de 18px, fundo `musgo`, encostado no canto superior direito do ícone, número em 11px peso 600 cor `papel`, `9+` acima de nove. Sem outra ação contextual.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Estrutura do formulário

Padding lateral `space-5`. Os três grupos ficam empilhados com `space-6` entre eles. O formulário rola por baixo do header quando não cabe.

**Grupo 1, Unidade.**

- Label `O que você quer contar` em `label` `grafite`, `space-2` abaixo.
- Três **chips de escolha** em uma linha, largura igual, `space-2` de gap: `Páginas`, `Minutos`, `Livros`. Cada chip tem 48px de altura, `radius-full`, ícone de 20px à esquerda do rótulo com `space-2` de gap (`BookOpen`, `Clock`, `Books`), rótulo em `body`.
  - Inativo: borda de 1px `linha`, fundo transparente, ícone `regular` e rótulo em `grafite`.
  - Ativo: fundo `musgo-fundo`, sem borda, ícone `fill` e rótulo em `musgo` peso 600.
  - Seleção única. Tocar no ativo não o desmarca.
- `space-2` abaixo, helper em `caption` `grafite`, visível sempre. Antes de qualquer escolha: `Escolha uma unidade para ver o que conta.` Depois, o helper da unidade escolhida:
  - Páginas: `Conta as páginas de cada registro de progresso.`
  - Minutos: `Conta o tempo de cada registro de progresso, informado ou cronometrado.`
  - Livros: `Conta cada leitura ou releitura finalizada. Livro abandonado não conta.`

**Grupo 2, Janela.**

- Label `Em que período` em `label` `grafite`, `space-2` abaixo.
- Quatro chips de escolha, mesmo tratamento do grupo 1, **sem ícone**, numa grade de duas colunas por duas linhas com `space-2` de gap (quatro rótulos numa linha só apertariam o toque): `Por dia`, `Por semana`, `Por mês`, `Por ano`.
- `space-2`, helper em `caption` `grafite`, visível sempre: `O período segue o calendário: o dia, a semana, o mês ou o ano em curso, no horário do seu celular.`

**Grupo 3, Valor-alvo.**

- Label `Quanto` em `label` `grafite`, `space-2` abaixo.
- Uma linha com o campo numérico e a unidade: campo de 48px de altura, **160px de largura** e não a largura total (a medida comunica o tamanho da entrada), `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto em `num-inline` `tinta`, teclado numérico. À direita do campo, `space-3`, o texto da unidade em `body` `grafite`, que acompanha a escolha do grupo 1 e o plural: `páginas`, `minutos`, `livros` (`livro` quando o valor é 1). Antes da unidade escolhida, esse texto não aparece.
- Placeholder em `grafite-suave`: `20`. Ele não substitui o label.
- `space-2`, helper em `caption` `grafite`, visível sempre: `Um número inteiro maior que zero.`

**Resumo e o que já conta.** Quando as três escolhas estão feitas, `space-6` abaixo do grupo 3:

- Uma linha em `body` `grafite`: `Seu desafio:` seguido do resumo em `body-strong` `tinta`, com os números em JetBrains Mono: `20 páginas por dia`.
- `space-4`, uma **faixa informativa neutra** (design §4.15): fundo `musgo-fundo`, `radius` 12, padding `space-4`, sem borda, `Info` (Phosphor, `regular`, 20px, `musgo`) à esquerda, `space-3` de gap, texto em `body` `tinta`. Na criação, o texto diz que o que já foi registrado na janela conta (RN-20.2), e muda com a janela escolhida:
  - Por dia: `O que você já registrou hoje também conta.`
  - Por semana: `O que você já registrou nesta semana também conta.`
  - Por mês: `O que você já registrou em setembro também conta.`
  - Por ano: `O que você já registrou em 2026 também conta, desde janeiro.`
- A faixa não fecha, não some sozinha e não tem ação dentro.

**Ações.** `space-8` depois do último bloco:

- Botão primário pill, largura total, 48px, fundo `musgo`, texto `papel`: `Criar desafio` na criação, `Salvar alterações` na edição.
- **Desabilitado** enquanto faltar alguma escolha ou o valor-alvo for inválido, e, na edição, enquanto nada tiver mudado: fundo `linha`, texto `grafite-suave`, sem sombra.
- `space-3`, botão textual `grafite`, centralizado: `Cancelar`. Volta à lista sem salvar.

### 4.1 Criação, vazio

O leitor acabou de tocar em `Novo desafio`. Nenhum chip selecionado, campo vazio, sem resumo e sem faixa. Helper da unidade em `Escolha uma unidade para ver o que conta.`, texto da unidade ao lado do campo ausente, botão `Criar desafio` desabilitado.

**Nada vem pré-selecionado.** Um padrão como "20 páginas por dia" empurraria todo mundo para o mesmo desafio; a meta do produto é o alvo que o leitor escolhe.

### 4.2 Criação, preenchido

`Páginas`, `Por dia` e `20`, com os chips ativos, o helper de páginas, `páginas` ao lado do campo, o resumo `Seu desafio: 20 páginas por dia` e a faixa `O que você já registrou hoje também conta.` Botão `Criar desafio` habilitado.

### 4.3 Criação, desafio anual

`Livros`, `Por ano` e `24`. Helper de livros, `livros` ao lado do campo, resumo `Seu desafio: 24 livros por ano` e a faixa `O que você já registrou em 2026 também conta, desde janeiro.`

Este artboard existe para mostrar a regra que mais surpreende: um desafio anual criado em setembro já nasce com as leituras do ano.

### 4.4 Criação, erro no valor-alvo

`Minutos` e `Por semana` escolhidos; o leitor digitou `0` e saiu do campo.

- Campo com borda de 1.5px `rubi`.
- No lugar do helper, em `caption` `rubi`: `Informe um número maior que zero.`
- Sem resumo e sem faixa, porque a configuração ainda não é válida. Botão `Criar desafio` desabilitado.
- Sem banner no topo: o erro é do campo e mora no campo (design §4.2). O erro aparece ao sair do campo ou ao corrigir, nunca a cada tecla.
- Campo vazio depois de ter sido tocado usa a mesma forma: `Informe quanto você quer alcançar.`

### 4.5 Criando

Depois do toque em `Criar desafio` com o formulário do 4.2.

- Chips e campo desabilitados: chips ativos mantêm `musgo-fundo` e `musgo`, inativos ficam com texto `grafite-suave`; o campo fica com texto `grafite`.
- Botão primário com o texto `Criando desafio`, em `musgo` pleno, sem spinner e sem esmaecer.
- Se o servidor demorar além de três segundos, aparece abaixo do botão, em `caption` `grafite`, centralizado: `O serviço está iniciando. Isso pode levar alguns segundos.`
- Ao concluir, a tela volta para a lista de desafios, já com o novo desafio no lugar da ordem e com o acumulado da janela corrente calculado pelo servidor.

### 4.6 Criação, erro do servidor

O servidor não respondeu ou recusou por falha temporária. O formulário volta a ser editável, **com tudo o que foi escolhido e digitado**.

- `space-6` acima das ações, banner inline de largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Não foi possível criar o desafio. Verifique sua conexão e tente de novo.`
- O botão primário volta a `Criar desafio`, habilitado. Tocar de novo reenvia **a mesma solicitação** (RNF-ERR-04): se a primeira tiver chegado, não nasce um segundo desafio.
- Se o servidor recusar algum campo por validação, o erro vai para o campo, na forma do 4.4, e o banner não aparece.

### 4.7 Edição

O leitor abriu `Editar desafio` de `150 minutos por semana` e mudou o alvo para `120`.

- Título do header: `Editar desafio`.
- `Minutos` e `Por semana` ativos, campo com `120`, `minutos` ao lado, helpers da unidade e da janela.
- Resumo: `Seu desafio: 120 minutos por semana`.
- A faixa informativa neutra troca de texto, porque na edição o que importa é o efeito sobre as janelas (RN-20.7): `A mudança vale para esta semana, que é recalculada. Semanas que já terminaram continuam como estavam.` A primeira frase nomeia a janela corrente da configuração escolhida **depois** da edição (`hoje`, `esta semana`, `setembro`, `2026`); a segunda fala das janelas encerradas na configuração **salva antes** (`Dias`, `Semanas`, `Meses`, `Anos`), porque são elas que ficam como estavam. Se o leitor mudar a janela de semanal para mensal, o texto fica: `A mudança vale para setembro, que é recalculado. Semanas que já terminaram continuam como estavam.`
- Botão primário `Salvar alterações`, habilitado porque algo mudou. `Cancelar` abaixo.
- **Zona de exclusão** (design §4.19): `space-8` depois de `Cancelar`, divisor de 1px `linha`, `space-5`; título em `caption` `grafite`: `Excluir este desafio`; `space-3`; botão destrutivo em **outline** `rubi` (borda de 1px `rubi`, texto `rubi`, fundo transparente, `radius` 12), largura total, 48px: `Excluir desafio`.
- A zona de exclusão **não existe** nos artboards de criação.
- **Desafio pausado também se edita.** Nesse caso, entre o header e o grupo 1, com `space-4` de respiro, aparece uma linha em `caption` `grafite` com o pill `Pausado` (borda de 1px `linha`, `PauseCircle` de 16px, `radius-full`) seguido de `Continua pausado depois de salvar.` Não precisa de artboard próprio.

### 4.8 Edição, confirmação de exclusão

O leitor tocou em `Excluir desafio` na zona de exclusão. Bottom sheet de confirmação destrutiva do design §4.11, sobre o estado 4.7 escurecido pelo scrim.

1. Alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo.
2. Título em `title-sm` `tinta`: `Excluir o desafio 150 minutos por semana?`
3. `space-3`, texto em `body` `grafite`: `O desafio e o progresso dele saem da sua lista. Seus registros de leitura continuam como estão. Não dá para desfazer.`
4. `space-6`, botão destrutivo em outline `rubi`, largura total, 48px: `Excluir desafio`.
5. `space-3`, botão textual `grafite`, largura total: `Cancelar`.

O título nomeia o desafio pela configuração **salva**, e não pela editada e ainda não salva. O foco entra em `Cancelar`. Confirmada, a tela volta à lista, já sem o desafio; sem desfazer. É a mesma confirmação da lista de desafios, com a mesma copy.

### 4.9 Salvando alterações

Como o 4.5, com o texto `Salvando alterações` no botão. A zona de exclusão fica desabilitada enquanto salva (borda e texto em `grafite-suave`). Erro do servidor na edição usa o banner do 4.6 com o texto `Não foi possível salvar as alterações. Verifique sua conexão e tente de novo.`

---

## 5. Artboards web (1440 x 900)

Não há versão web. RF-DSF-01 e RF-DSF-04 têm a coluna Web negativa em `REQUISITOS.md` §5.7, e desafios estão fora do escopo do cliente web (`REQUISITOS.md` §2.1). Não desenhe a linha 2.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

### 6.1 Criação, preenchido

O estado 4.2 no escuro:

- Fundo `noite`. Título e ícones do header em `papel-suave`.
- Labels em `grafite-claro`, helpers em `grafite-claro`.
- Chip inativo com borda `linha-noite`, ícone e rótulo em `grafite-claro`; chip ativo com fundo `musgo-fundo-escuro`, ícone `fill` e rótulo em `musgo-claro` peso 600.
- Campo em `noite-elevada`, **mais claro** que o fundo, borda `linha-noite`, número em `papel-suave`, placeholder em `grafite-fundo-escuro`; foco com borda de 1.5px `musgo-claro`.
- Resumo: `Seu desafio:` em `grafite-claro`, o resumo em `papel-suave`.
- Faixa informativa com fundo `musgo-fundo-escuro`, ícone e texto em `musgo-claro`.
- Botão primário com fundo `musgo-claro` e texto `noite`; `Cancelar` em `grafite-claro`.
- Barra inferior em `noite-elevada`, divisor `linha-noite`, `Perfil` ativo em `musgo-claro`.

### 6.2 Edição

O estado 4.7 no escuro, com o mesmo tratamento do 6.1, mais a zona de exclusão: divisor `linha-noite`, título em `grafite-claro` e botão destrutivo em outline `rubi-claro` com texto `rubi-claro`, fundo transparente.

Nos dois, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo numérico com label acima, helper sempre visível e estado de erro | documento-de-design §4.2 |
| Botão primário pill, com desabilitado e carregamento | documento-de-design §4.1 |
| Botão textual e botão destrutivo em outline `rubi` | documento-de-design §4.1 e §7.8 |
| Faixa informativa neutra | documento-de-design §4.15 |
| Zona de exclusão, só no formulário de edição | documento-de-design §4.19 |
| Bottom sheet de confirmação destrutiva | documento-de-design §4.11 |
| Chip toggleável em pill, tratamento ativo e inativo dos pills de filtro | documento-de-design §3.4 e §5.1 |
| Pill neutro com borda (tratamento do `Abandonado`) | documento-de-design §4.6 |
| Banner inline de erro em `rubi-fundo` | documento-de-design §4.2 e prompts do Período 1 |
| Escala tipográfica, com JetBrains Mono em numeral tabular | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell autenticado, barra inferior e header | ../../periodo-0/P0-NAV/shell-de-navegacao.md |
| Header de tela de detalhe (`ArrowLeft`, título, sino) | nasceu nos prompts do Período 1 (`F-AUT/alterar-senha.md`), incorporação pendente |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Grupo de chips de escolha única em formulário**, com label acima e helper que muda conforme a escolha. O sistema tem pills de filtro (§5.1) e chips de assunto (§5.7), mas não um campo de formulário feito de chips, com ícone opcional, 48px de altura e largura igual.
2. **Campo numérico com unidade ao lado**, em que o texto da unidade acompanha a escolha feita em outro campo e o plural do valor.
3. **Linha de resumo composto** (`Seu desafio:` seguido da configuração), que aparece só quando o formulário é válido.

**Pendências abertas por este prompt**, a registrar no arquivo da feature:

- **Faixa do valor-alvo** não fixada no contrato: o formulário valida só "inteiro maior que zero" e não mostra teto. Quando o contrato fixar, o helper do grupo 3 passa a dizer o limite.
- **Início da semana de calendário** não definido (ver [`desafios.md`](desafios.md)): o helper da janela fala em "semana em curso" sem dizer em que dia ela começa.
- **Sem valor padrão:** este prompt decide que nada vem pré-selecionado. Ratificar com o dono da feature.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header, criação | `Novo desafio` |
| Título do header, edição | `Editar desafio` |
| Label da unidade | `O que você quer contar` |
| Chips da unidade | `Páginas` · `Minutos` · `Livros` |
| Helper da unidade, sem escolha | `Escolha uma unidade para ver o que conta.` |
| Helper, páginas | `Conta as páginas de cada registro de progresso.` |
| Helper, minutos | `Conta o tempo de cada registro de progresso, informado ou cronometrado.` |
| Helper, livros | `Conta cada leitura ou releitura finalizada. Livro abandonado não conta.` |
| Label da janela | `Em que período` |
| Chips da janela | `Por dia` · `Por semana` · `Por mês` · `Por ano` |
| Helper da janela | `O período segue o calendário: o dia, a semana, o mês ou o ano em curso, no horário do seu celular.` |
| Label do valor-alvo | `Quanto` |
| Placeholder do valor-alvo | `20` |
| Unidade ao lado do campo | `páginas` · `minutos` · `livros` · `livro` (quando o valor é 1) |
| Helper do valor-alvo | `Um número inteiro maior que zero.` |
| Erro, valor zero | `Informe um número maior que zero.` |
| Erro, valor vazio | `Informe quanto você quer alcançar.` |
| Resumo | `Seu desafio:` + `20 páginas por dia` |
| Faixa, criação | `O que você já registrou hoje também conta.` · `O que você já registrou nesta semana também conta.` · `O que você já registrou em setembro também conta.` · `O que você já registrou em 2026 também conta, desde janeiro.` |
| Faixa, edição | `A mudança vale para esta semana, que é recalculada. Semanas que já terminaram continuam como estavam.` · `A mudança vale para hoje, que é recalculado. Dias que já terminaram continuam como estavam.` · `A mudança vale para setembro, que é recalculado. Meses que já terminaram continuam como estavam.` · `A mudança vale para 2026, que é recalculado. Anos que já terminaram continuam como estavam.` |
| Faixa, edição com troca de janela | o período novo com o plural da janela antiga, ex.: `A mudança vale para setembro, que é recalculado. Semanas que já terminaram continuam como estavam.` |
| Linha de pausado na edição | `Pausado` + `Continua pausado depois de salvar.` |
| Botão primário | `Criar desafio` · `Salvar alterações` |
| Botão primário, enviando | `Criando desafio` · `Salvando alterações` |
| Botão textual | `Cancelar` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro do servidor, criação | `Não foi possível criar o desafio. Verifique sua conexão e tente de novo.` |
| Erro do servidor, edição | `Não foi possível salvar as alterações. Verifique sua conexão e tente de novo.` |
| Zona de exclusão, título | `Excluir este desafio` |
| Zona de exclusão, botão | `Excluir desafio` |
| Confirmação, título | `Excluir o desafio 150 minutos por semana?` |
| Confirmação, texto | `O desafio e o progresso dele saem da sua lista. Seus registros de leitura continuam como estão. Não dá para desfazer.` |
| Confirmação, botões | `Excluir desafio` · `Cancelar` |

---

## 9. Acessibilidade e interação

- **Alvo de toque de 48px** em cada chip, no campo, nos botões, na seta e no sino.
- **Chips são um grupo de rádio** para leitor de tela: o grupo se anuncia pelo label (`O que você quer contar`, `Em que período`) e cada chip como opção selecionada ou não. O estado ativo não depende só da cor: muda o fundo, o peso do rótulo e o ícone vira `fill`.
- **Helper e erro ligados ao campo** por descrição acessível, para que o leitor de tela leia `Um número inteiro maior que zero.` ao focar o valor-alvo e leia o erro quando ele aparecer.
- **Foco:** ao abrir, nenhum campo recebe foco automático, e o teclado não sobe sozinho. Depois de um envio recusado por validação, o foco vai para o primeiro campo inválido.
- **Contraste:** labels e helpers em `grafite` sobre `papel` passam em AA; o botão desabilitado usa `grafite-suave` sobre `linha` e é o único lugar onde esse contraste menor aparece, porque o botão não é acionável. No escuro, `grafite-claro` e `papel-suave`.
- **Toda exclusão passa por confirmação** (RNF-USA-04), com botão destrutivo em outline, nunca preenchido, e foco inicial em `Cancelar`.
- **Motion:** troca de chip em `dur-fast`; entrada do resumo e da faixa com um fade em `dur-base` quando o formulário fica válido; troca do texto da faixa por crossfade em `dur-base`; sheet de confirmação em `dur-slow` na entrada e `dur-base` na saída; press em `scale(0.98)`. Tudo estático sob `prefers-reduced-motion`.
- **Texto grande:** com o escalonamento de fonte do sistema aumentado, os três chips de unidade passam para uma coluna e os quatro de janela continuam em duas colunas, em vez de cortar o rótulo.

---

## 10. O que não fazer nesta tela

**Específico desta tela**

- **Não desenhe versão web.** Desafios estão fora do cliente web.
- **Não esconda unidade nem janela atrás de `select` ou dropdown.** São três e quatro opções fixas, e aparecem inteiras como chips.
- **Não pré-selecione unidade, janela nem valor.** O leitor escolhe o próprio alvo.
- **Não ofereça desafios prontos, sugestões nem "desafios populares".** Não existe catálogo de desafios.
- **Não peça nome, descrição, data de início, data de fim nem cor** para o desafio. Ele é só unidade, janela e alvo, e o título é composto por eles.
- **Não ofereça janela personalizada** ("a cada 3 dias", "de 10 a 20 de outubro"). As janelas são as quatro de calendário.
- **Não desenhe desafio com amigos, desafio compartilhado, convite, ranking nem comparação** com outros leitores.
- **Não prometa recompensa** ("ganhe uma medalha ao cumprir"). Não existem medalhas no produto.
- **Não mostre o histórico de janelas encerradas** na edição. Ele é do Período 3.
- **Não ponha a zona de exclusão no formulário de criação.**
- **Não peça confirmação para voltar ou cancelar.** O formulário é curto e nada importante se perde.
- **Não invente limite máximo** para o valor-alvo no helper ou no erro. O contrato ainda não fixou.

**Tipografia (design §7.1)**

- Não use Inter como fonte de interface: a UI é Manrope.
- Não use Instrument Serif nem Fraunces. A serifa do produto é Newsreader, e ela não aparece nesta tela.
- Não misture família dentro de um título: ênfase é itálico da mesma família.
- Não ponha overline em cima dos grupos. O label de cada grupo é `label` `grafite`, em caixa normal.
- Não use eyebrow numerado, como `01 · UNIDADE`, nem indicador de passos. É um formulário de três campos, não um wizard.

**Cores e superfícies (design §7.2)**

- Não use a família bege quente com latão, oxblood e expresso. O acento é `musgo`.
- Não use gradiente roxo, rosa ou azul, nem mesh, nem glow neon.
- Não use gradiente em botão nem em texto de título.
- Não use sombra preta pura nem `#000000` em lugar nenhum.
- Não use textura de papel ou de madeira no fundo.
- Não pinte os chips com cores diferentes por unidade. Ativo é `musgo-fundo` com `musgo`, para as três.

**Motion (design §7.4)**

- Nada de scroll hijacking, parallax ou marquee.
- Nada de loop infinito, spinner ou ícone que pulsa. Enviando é o texto do botão mudando.
- Nada de animação de comemoração ao criar o desafio.

**Conteúdo e copy (design §7.5)**

- Zero em-dash em qualquer texto visível. Use dois pontos, vírgula ou reescreva.
- Nada de número fake-preciso. Os números desta tela são mock declarado e sempre aparecem com unidade.
- Nada de label poético: os labels dizem o que o campo é.
- Nada de emoji na copy.

**Componentes e assets (design §7.6)**

- Nada de ícone desenhado à mão: todos os ícones são Phosphor.
- Nada de toast com fundo saturado verde ou vermelho.

**Modo escuro (design §7.7)**

- Nada de fundo `#000000`: o fundo é `noite`.
- Nada de só inverter a paleta: no escuro o campo é `noite-elevada`, mais claro que o fundo, e o acento é `musgo-claro`.
- Nada de meia tela clara e meia escura.

**Interações destrutivas (design §7.8)**

- Nada de excluir sem confirmação.
- Nada de botão destrutivo preenchido em `rubi`: é outline.
- Nada de desfazer depois de excluir.

**Formulários (design §7.9)**

- Nada de placeholder no lugar do label: o label fica acima, sempre.
- Nada de helper que só aparece depois do erro: os três helpers ficam visíveis o tempo todo.
- Nada de mensagem de erro genérica, como "Algo deu errado" ou "Valor inválido". O erro diz o que fazer.

**Métricas e dados (design §7.10)**

- Nada de número sem unidade: o valor-alvo tem a unidade ao lado, e o resumo também.

**Fora de escopo por decisão (design §7.12)**

- Nada de camada de obra, login social, mensagem direta, clube de leitura, grupo, fórum, leitura de e-book, medalha, conquista ou ranking.
