# F-AVA-2 · Adicionar frase

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-AVA-2.md
**Requisitos:** RF-AVA-06 (cadastrar frases ou trechos de um livro, com a página de referência obrigatória e o limite de caracteres de RN-11)
**Não funcionais:** RNF-SEC-14 (texto da frase tratado como texto, sem interpretação de marcação), RNF-ERR-04 (reenviar não cria frase duplicada), RNF-USA-04 (descartar o que foi digitado pede confirmação), RNF-USA-05 (erro em pt-BR e acionável)
**Regras de negócio:** RN-11 (até 500 caracteres, página de referência obrigatória, máximo de 10 frases por leitor e por livro), RN-15 (em livro pessoal, só o dono cadastra frases)
**Versão web:** sim. RF-AVA-06 tem marcação na coluna Web de `REQUISITOS.md` §5.5.
**De onde se chega:** do botão `Adicionar frase` (e de `Adicionar a primeira`, no vazio) da seção `Frases e trechos` da página do livro ([`../pagina-do-livro/pagina-do-livro.md`](../pagina-do-livro/pagina-do-livro.md)) e do bloco do livro na lista de frases ([`frases-do-livro.md`](frases-do-livro.md)). Salvar devolve à tela de origem, com a frase nova no topo.

---

## 1. Contexto

Adicionar frase é o gesto mais curto do **registro**: o leitor está com o livro aberto, leu um trecho que quer guardar e copia com a página. A tela precisa ser tão rápida quanto sublinhar, e ao mesmo tempo segurar as três regras de RN-11, que existem para respeitar o limite de citação de obra protegida: **até 500 caracteres**, **página obrigatória** e **no máximo 10 frases por leitor em cada livro**.

**Formato: bottom sheet no mobile e dialog centrado na web**, a mesma sobreposição de `Registrar progresso`. Três razões:

- O design §4.11 põe "formulários curtos" na base de sobreposição, e este tem dois campos.
- O leitor continua vendo que está no livro certo: a página do livro fica atrás do scrim, e o sheet repete a capa e o título.
- Tela cheia, como `Criar lista`, seria o desenho para quando o formulário é o destino. Aqui ele é um desvio de poucos segundos a partir da leitura.

O preço do sheet é o espaço com o teclado aberto: o trecho pode ter até 500 caracteres. Por isso a área de texto cresce até um teto e rola por dentro, e o sheet sobe até 92% da altura da viewport quando o teclado aparece. A escolha está listada para ratificação.

Três coisas que a tela precisa resolver:

- **O limite é visível antes do erro.** O contador de caracteres aparece desde o primeiro toque, e o helper da página diz a faixa válida do livro (`Entre 1 e 264.`). A cota de frases (`Você guardou 2 de 10 frases deste livro.`) fica no cabeçalho do sheet, para quem está chegando perto do teto.
- **O leitor não perde o que copiou.** Um trecho de 400 caracteres digitado no celular é trabalho. Fechar o sheet com texto preenchido pede confirmação; o erro de envio mantém tudo no lugar.
- **A frase entra como foi escrita.** Sem formatação, sem Markdown, sem aspas automáticas. O campo guarda texto puro, e a exibição em Newsreader italic acontece depois, na lista.

Salvar não gera atividade no feed nem notificação. Frase é registro pessoal que outros leitores podem ler, não evento social.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Adicionar frase · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

DIALOG: a partir de 768px, o formulário é dialog centrado de 480px,
radius-xl 24 nos quatro cantos, sem alça, fundo papel no claro e
noite-elevada no escuro, padding space-6, elev-3; entra em dur-base com
deslize curto de 16px e fade, sai em dur-base com ease-in.
```

---

## 3. Dados que aparecem na tela

**Livro:** `Torto Arado`, Itamar Vieira Junior, Todavia, 2019, `264 páginas`. Livro do acervo, com capa. O livro está na estante de quem olha, com leitura em andamento, mas nada disso aparece no formulário: frase não depende de status de leitura.

**Cota de quem olha:** `2 de 10` frases guardadas neste livro antes de salvar; `3 de 10` depois.

**Frase de exemplo**, usada nos estados preenchidos (texto mock escrito para o protótipo, não é citação do livro):

| Campo | Valor |
|---|---|
| Trecho | `A gente aprende a ler o céu antes de aprender a ler as letras.` |
| Contador | `63/500` |
| Página | `74` |

**Trecho acima do limite**, usado em 4.4, com 534 caracteres (texto mock):

`No fim da tarde, quando o sol baixava atrás do morro e a poeira da estrada assentava, minha avó puxava o banco para a porta e ficava olhando o caminho por onde os homens voltavam do campo. Não dizia nada. Contava as enxadas pelo barulho, uma a uma, e só depois de ouvir a última se levantava para acender o fogo. Aprendi com ela que esperar também é trabalho, que o silêncio tem hora e medida, e que ninguém na fazenda dormia antes de saber que todos tinham chegado. Até hoje, quando escurece, conto os passos de quem chega.`

Contador `534/500`.

**Página fora do livro**, usada em 4.5: `300`.

**Tela de origem atrás do scrim:** a página do livro `Torto Arado`, rolada até a seção `Frases e trechos` com `14 frases` e as três mais recentes (`Página 57 · @marina.antunes`, `Página 112 · você`, `Página 203 · @joao.pedrosa`). Depois de salvar, a seção mostra `15 frases` e a frase nova em primeiro, com `Página 74 · você`.

Todo número aparece com unidade, exceto o contador de caracteres, que é leitura de campo, e o número digitado no campo de página, que tem o label `Página` acima.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada: a sobreposição abre sobre a página do livro, que continua dentro do shell.

**Mobile, contexto atrás do scrim.** A página do livro, rolada até `Frases e trechos`, com o header dela e a barra inferior do shell: fixa no rodapé, 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, quatro itens de largura igual (`Estante` com `Books`, `Descobrir` com `Compass`, `Feed` com `Newspaper`, `Perfil` com `UserCircle`), ícone de 24px acima do rótulo em `caption`. Ativo: ícone `fill` `musgo` e rótulo `caption` peso 600 `musgo`; inativo: `regular` `grafite`. **Item ativo: `Descobrir`**, a área de onde se chegou ao livro. O header da página do livro tem o sino `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita. Tudo isso fica sob o scrim e não recebe toque.

### Anatomia do bottom sheet

- **Scrim** `#171512` a 40%, cobrindo a viewport inteira, inclusive a barra inferior.
- **Sheet** conforme design §4.11: ancorado embaixo, largura total, fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`. Alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo. O padding inferior soma a área segura. Com o teclado aberto, o sheet fica acima do teclado e ocupa até 92% da altura da viewport.
- **Título** `Adicionar frase` em `title` `tinta`, alinhado à esquerda.
- `space-4`, **card compacto do livro**: capa de 48 por 72px em retângulo de canto vivo, sem sombra, à esquerda; `space-4` de gap; à direita, `Torto Arado` em `title-sm` `tinta`, `Itamar Vieira Junior` em `caption` `grafite` e a **linha de cota** em `caption` `grafite`: `Você guardou 2 de 10 frases deste livro.`, com os números em `num-inline` no tamanho do `caption`. Na nona frase, a linha diz `Você guardou 9 de 10 frases deste livro. Esta é a última que cabe.`
- `space-5`, divisor de 1px `linha`.
- `space-5`, o formulário, com `space-5` entre os campos.
- `space-6`, as ações.
- Entrada do sheet: sobe de baixo em `dur-slow` com `ease-out`; saída em `dur-base` com `ease-in`. Sob `prefers-reduced-motion`, aparece e some sem deslizar.

### Campos

**Campo 1, trecho.** Conforme design §4.2.

- Label acima, em `label` `grafite`, `space-2` de gap: `Trecho`.
- Área de texto de várias linhas, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, padding `space-3` vertical e `space-4` horizontal, texto digitado em `body` Manrope `tinta`. Altura mínima de 132px (seis linhas); cresce com o texto até 264px e, dali, rola por dentro. **O texto digitado é Manrope**, não Newsreader: é campo de interface. A serifa aparece só quando a frase é exibida.
- Placeholder em `body` `grafite-suave`, que some ao digitar: `Copie o trecho como está no livro.` O label continua acima: o placeholder não substitui o label.
- `space-2` abaixo, uma linha com o helper à esquerda e o contador à direita, os dois em `caption`:
  - Helper em `grafite`, visível o tempo todo: `Até 500 caracteres.`
  - Contador em JetBrains Mono `grafite`, numeral tabular: `0/500`. Aparece desde o início e atualiza a cada tecla.
- Teclado de texto do sistema, com correção automática ligada.

**Campo 2, página.** Conforme design §4.2.

- Label acima, em `label` `grafite`: `Página`.
- Campo numérico de 48px de altura e 160px de largura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto digitado em `body` com numeral tabular de JetBrains Mono `tinta`. Teclado numérico do sistema.
- Helper permanente abaixo, em `caption` `grafite`: `Entre 1 e 264. É a página em que o trecho está.`
- **O campo é obrigatório** (RN-11). Não existe opção `sem página`.

### Ações

- Botão primário pill de largura total, 48px, `musgo`, texto `papel`: `Salvar frase`. **Sempre acionável**, como em `Registrar progresso`: a validação acontece ao tocar, e o erro aparece no campo. Travar o botão esconderia o motivo.
- `space-2`, botão textual `musgo` de largura total: `Cancelar`.

### Validação

- Acontece ao tocar em `Salvar frase`. Depois do primeiro erro, cada campo revalida ao sair dele, e a mensagem some assim que o valor fica válido.
- Erro conforme design §4.2: borda de 1.5px `rubi`, mensagem abaixo do campo em `caption` `rubi`, com `space-2` de gap, **no lugar do helper**. O contador continua à direita da linha.
- O foco vai para o primeiro campo com erro.
- A validação do cliente reforça a do servidor, não substitui: o limite de 10 e a página são conferidos também no envio.

### 4.1 Aberto, campos vazios

O leitor tocou em `Adicionar frase` na página do livro. Sheet aberto, título, card do livro com `Você guardou 2 de 10 frases deste livro.`, campo `Trecho` em foco (borda de 1.5px `musgo`, cursor no início, placeholder visível), contador `0/500`, campo `Página` vazio com o helper, e o teclado de texto aberto. Com o teclado aberto, as ações ficam acima dele, e o campo `Página` pode ficar cortado na borda de cima do teclado.

### 4.2 Preenchido

Teclado fechado. Trecho `A gente aprende a ler o céu antes de aprender a ler as letras.` com o contador `63/500`, página `74`, helpers visíveis, `Salvar frase` e `Cancelar`. Nenhum campo em foco.

### 4.3 Campos obrigatórios vazios

O leitor tocou em `Salvar frase` sem preencher nada.

- `Trecho` com borda de 1.5px `rubi` e, no lugar do helper, em `caption` `rubi`: `Escreva o trecho que você quer guardar.` O contador continua `0/500` em `grafite`.
- `Página` com borda de 1.5px `rubi` e, no lugar do helper: `Informe a página em que o trecho está.`
- Foco em `Trecho`, o primeiro campo com erro.

### 4.4 Trecho acima do limite

- `Trecho` com o texto de 534 caracteres da seção 3. A área chegou ao teto de 264px e rola por dentro; o artboard mostra o fim do texto.
- **O contador passa a `rubi`**: `534/500`. Isso acontece enquanto o leitor digita, antes de tocar em salvar, porque o contador é leitura contínua.
- Depois de tocar em `Salvar frase`: borda de 1.5px `rubi` e, no lugar do helper, `Use até 500 caracteres. Tire 34 para salvar.`
- **O campo não corta o texto sozinho.** Nada de truncar em 500: o leitor escolhe o que tirar.
- `Página` com `146`, válido, com o helper normal.

### 4.5 Página fora do livro

- `Trecho` válido, com a frase de exemplo e `63/500`.
- `Página` com `300`, borda de 1.5px `rubi` e, no lugar do helper: `O livro tem 264 páginas. Informe uma página até 264.`
- Para `0`: `Informe uma página a partir de 1.` Cada mensagem cita o número concreto do caso.

### 4.6 Salvando

- Campos desabilitados, fundo `linha`, texto `grafite-suave`.
- Botão primário desabilitado, fundo `musgo` com 60% de opacidade, rótulo `Salvando`. `Cancelar` desabilitado.
- **Sem spinner.** O sistema não tem spinner.

### 4.7 Salva

O sheet fechou e a tela de origem atualizou. O artboard mostra o resultado, não uma tela de sucesso.

- Sheet e scrim ausentes. A página do livro, rolada até `Frases e trechos`, agora com `15 frases`.
- A frase nova em primeiro: `A gente aprende a ler o céu antes de aprender a ler as letras.` em Newsreader italic, blockquote com borda esquerda de 2px `musgo-fundo`, e `Página 74 · você` abaixo em `caption` `grafite`. As outras duas das três mais recentes descem; a de `@joao.pedrosa` sai da seção e continua na lista completa.
- A frase entra com um fade em `dur-base`. Sem destaque de cor, sem selo de `nova`.
- **Sem toast, sem confete, sem tela de sucesso.** A frase na seção é a confirmação.
- Quando a origem é a lista de frases, a frase nova entra no topo da lista e a linha de cota passa a `Você guardou 3 de 10 frases deste livro.`

### 4.8 Erro de envio

- Sheet ainda aberto, campos preenchidos e habilitados, com a frase de exemplo.
- Abaixo de `Cancelar`, `space-3`, em `caption` `rubi`, com `Warning` (Phosphor, `regular`, 16px, `rubi`) à esquerda: `Não foi possível salvar a frase. Verifique sua conexão e tente de novo.`
- `Salvar frase` ativo, com o rótulo original. Reenviar usa a mesma chave de idempotência e não cria uma segunda frase (RNF-ERR-04).
- **Não existe fila offline para frases.** Sem conexão, o estado é este, e o texto fica no sheet.

### 4.9 Limite atingido no envio

O leitor abriu o sheet com 9 frases, mas guardou outra em outro aparelho, e o servidor recusou a décima primeira.

- Sheet aberto, campos preenchidos e **desabilitados** (fundo `linha`, texto `grafite-suave`): o que foi escrito continua visível, mas não pode ser enviado.
- Entre o formulário e as ações, `space-5`, um banner inline de largura total: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Você já guardou 10 frases deste livro. Exclua uma das suas para guardar esta.`
- As ações trocam: no lugar de `Salvar frase`, botão secundário de largura total, 48px, `radius` 12, borda `linha`, texto `body-strong` `tinta`: `Ver minhas frases`, que fecha o sheet e abre a lista de frases do livro; abaixo, textual `musgo`: `Fechar`.
- Abaixo das ações, em `caption` `grafite`: `O trecho que você escreveu não será guardado.` Por isso sair daqui não pede a confirmação de descarte: a consequência já está dita.

### 4.10 Confirmar descarte

O leitor tocou em `Cancelar`, no scrim ou arrastou a alça para baixo com o trecho preenchido.

- **O conteúdo do mesmo sheet troca**; não abre um segundo sheet por cima. A altura do sheet se ajusta ao conteúdo novo em `dur-base` com `ease-in-out`.
- Título em `title-sm` `tinta`: `Descartar esta frase?`
- `space-3`, em `body` `grafite`: `O trecho que você escreveu não será guardado.`
- `space-6`, dois botões empilhados em largura total, 48px, `space-3` entre eles: em cima o destrutivo em outline, `radius` 12, borda de 1px `rubi`, texto `body-strong` `rubi`: `Descartar`; embaixo o textual `musgo`: `Continuar escrevendo`, que volta ao formulário com tudo preenchido.
- O foco entra em `Continuar escrevendo`, nunca no destrutivo.
- Com os dois campos vazios, fechar não pede confirmação: o sheet simplesmente sai. Só a página preenchida, sem trecho, também fecha direto.

**Variantes sem artboard próprio:**

- **Livro sem total de páginas.** O helper vira `Informe a página em que o trecho está.`, e só o limite inferior é conferido (`Informe uma página a partir de 1.`).
- **Livro pessoal.** Só o dono chega a este formulário, pela página do livro pessoal dele (RN-15). O desenho é o mesmo; o card mostra a capa enviada pelo dono ou o placeholder com o título, sem badge.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

**Web, contexto atrás do scrim.** A página do livro `Torto Arado` em desktop, rolada até `Frases e trechos`, com a sidebar do shell à esquerda: coluna fixa de 248px, fundo `papel-elevado`, borda direita de 1px `linha`; no topo, bloco de 72px com o lockup horizontal da marca (símbolo da folha sobre livro aberto seguido de `Lê Ai`, os dois em `musgo`, `space-3` de gap, 24px de altura) e `SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita; abaixo, os quatro itens de 44px, `radius` 12, ícone de 20px e rótulo em `body-strong`. **Item ativo: `Descobrir`**, com fundo `musgo-fundo`, ícone `fill` `musgo` e rótulo `musgo`; inativos em `grafite`. Sem sino na web: notificações estão fora do escopo do cliente web (REQUISITOS.md §2.1). Nada no rodapé da sidebar. Tudo sob o scrim.

### Anatomia do dialog

- Scrim `#171512` a 40% cobrindo a viewport, inclusive a sidebar.
- Dialog centrado conforme design §4.11: 480px de largura, fundo `papel`, `radius-xl` nos quatro cantos, `elev-3`, padding `space-6`, sem alça. Entra em `dur-base` com deslize curto de 16px e fade; sai em `dur-base` com `ease-in`.
- **Cabeçalho:** `Adicionar frase` em `title-lg` `tinta` à esquerda e, à direita, `X` (Phosphor, `regular`, 20px, `grafite`) num alvo de 40px com rótulo acessível `Fechar`; hover com fundo `linha` e `radius` 12. O `X` segue a mesma regra de `Cancelar`: com trecho preenchido, pede o descarte.
- `space-4`, o card compacto do livro do mobile, igual, com a linha de cota.
- `space-5`, divisor `linha`, `space-5`, os campos, na mesma ordem e com os mesmos helpers e contador. Campos com **44px** de altura (a área de texto mantém a altura mínima de 132px e o teto de 264px); campo `Página` com 160px de largura.
- **Ações no rodapé do dialog, lado a lado, alinhadas à direita**, 40px: `Cancelar` textual à esquerda de `Salvar frase` primário.
- Foco preso dentro do dialog; `Esc` segue a regra do `Cancelar`; o foco volta a `Adicionar frase` ao fechar. `Ctrl` + `Enter` no trecho e `Enter` na página enviam.
- Foco de teclado visível em `X`, campos e botões: nos campos, a borda de 1.5px `musgo`; nos botões, contorno de 2px `musgo` com offset de 2px.
- **Abaixo de 768px** o dialog vira o bottom sheet do mobile, e a sidebar dá lugar à barra inferior.

### 5.1 Aberto, campos vazios

Dialog sobre a página do livro, com `Trecho` em foco, placeholder visível, `0/500`, `Página` vazio com o helper, `Cancelar` e `Salvar frase`.

### 5.2 Preenchido, foco na página

Trecho com a frase de exemplo e `63/500`; `Página` em foco, com `74` digitado e a borda de 1.5px `musgo`. Cursor sobre `Salvar frase`, em hover (`musgo-vivo`).

### 5.3 Erros de validação

`Trecho` com o texto de 534 caracteres, contador `534/500` em `rubi` e `Use até 500 caracteres. Tire 34 para salvar.`; `Página` vazio com `Informe a página em que o trecho está.`. Foco em `Trecho`. A área de texto rola por dentro, sem empurrar o dialog para fora da viewport.

### 5.4 Limite atingido no envio

O estado de 4.9 no dialog: campos desabilitados, banner `rubi-fundo`, as ações trocadas por `Fechar` textual e `Ver minhas frases` secundário, lado a lado à direita, e a linha `O trecho que você escreveu não será guardado.` acima delas, alinhada à esquerda.

### 5.5 Confirmar descarte

O conteúdo do mesmo dialog troca, como em 4.10: sem o cabeçalho do formulário, com `Descartar esta frase?`, a consequência e, lado a lado à direita, `Continuar escrevendo` textual e `Descartar` em outline `rubi`. Foco visível em `Continuar escrevendo`.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, preenchido.** Equivalente a 4.2. Página do livro atrás em `noite`, scrim preto a 60%. Sheet em `noite-elevada`, **mais claro** que o fundo, alça em `linha-noite`. Título e texto digitado em `papel-suave`, labels, helpers e contador em `grafite-claro`, placeholder em `grafite-fundo-escuro`. Campos com fundo `noite` e borda `linha-noite`, para se destacarem do sheet. `Salvar frase` em `musgo-claro` com texto `noite`; `Cancelar` em `musgo-claro`. Divisor em `linha-noite`.
- **Mobile, trecho acima do limite.** Equivalente a 4.4. Borda do campo, mensagem e contador `534/500` em `rubi-claro`.
- **Web, preenchido.** Equivalente a 5.2. Sidebar em `noite-elevada` com borda `linha-noite` e **Descobrir** em `musgo-fundo-escuro` com `musgo-claro`, lockup em `musgo-claro`, tudo sob o scrim. Dialog em `noite-elevada`, foco do campo `Página` com borda de 1.5px `musgo-claro`.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Bottom sheet e dialog de formulário curto | documento-de-design §4.11 |
| Campo, label acima, helper permanente, foco e erro | documento-de-design §4.2 e §7.9 |
| Card compacto do livro no topo do formulário | documento-de-design §5.4 |
| Botão primário pill, secundário, textual e destrutivo em outline | documento-de-design §4.1 |
| Banner de erro inline em `rubi-fundo` | documento-de-design §4.2 |
| Blockquote de frase na tela de origem | documento-de-design §5.2 e §3.2.2; desenho da borda e da referência nasceu na edição da página do livro do Período 2, incorporação pendente |
| Capa em retângulo de canto vivo | documento-de-design §4.5 e §7.6 |
| Escala tipográfica, com JetBrains Mono no contador e na página | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell de navegação atrás do scrim | periodo-0/P0-NAV/shell-de-navegacao.md e documento-de-design §5 |
| Contador de caracteres e área de texto de várias linhas | nasceram em periodo-2/F-LST/criar-lista.md; incorporação pendente |
| Confirmação que troca o conteúdo da mesma sobreposição | nasceu em periodo-2/F-LST/criar-lista.md; aqui aplicada também ao sheet; incorporação pendente |

**Componentes que nascem aqui.** Nenhum deles está no `documento-de-design.md`, e todos precisam ser incorporados pelo controle de mudança (plano §3) antes de valerem como padrão:

1. **Área de texto que cresce até um teto e rola por dentro**, dentro de um sheet que sobe até 92% da viewport com o teclado aberto.
2. **Linha de cota no card compacto do livro** (`Você guardou 2 de 10 frases deste livro.`), com a variante da última frase que cabe.
3. **Estado de limite atingido no envio**: campos desabilitados mantendo o texto visível, banner `rubi-fundo`, ações trocadas por `Ver minhas frases` e `Fechar`, e a linha que diz que o trecho não será guardado.
4. **Descarte com confirmação ao fechar com trecho preenchido**, com `Continuar escrevendo` como saída segura. Diverge de `Criar lista`, que fecha sem confirmar, porque aqui o conteúdo digitado pode ter centenas de caracteres copiados à mão.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do sheet e do dialog | `Adicionar frase` |
| `X` da web, rótulo acessível | `Fechar` |
| Card do livro | `Torto Arado`, `Itamar Vieira Junior` |
| Linha de cota | `Você guardou 2 de 10 frases deste livro.` |
| Linha de cota, última que cabe | `Você guardou 9 de 10 frases deste livro. Esta é a última que cabe.` |
| Label do trecho | `Trecho` |
| Placeholder do trecho | `Copie o trecho como está no livro.` |
| Helper do trecho | `Até 500 caracteres.` |
| Contador | `0/500` · `63/500` · `534/500` |
| Label da página | `Página` |
| Helper da página | `Entre 1 e 264. É a página em que o trecho está.` |
| Helper da página, livro sem total | `Informe a página em que o trecho está.` |
| Ações | `Salvar frase`, `Cancelar` |
| Salvando | `Salvando` |
| Erro, trecho vazio | `Escreva o trecho que você quer guardar.` |
| Erro, trecho longo | `Use até 500 caracteres. Tire 34 para salvar.` |
| Erro, página vazia | `Informe a página em que o trecho está.` |
| Erro, página acima do total | `O livro tem 264 páginas. Informe uma página até 264.` |
| Erro, página zero | `Informe uma página a partir de 1.` |
| Erro de envio | `Não foi possível salvar a frase. Verifique sua conexão e tente de novo.` |
| Limite no envio, banner | `Você já guardou 10 frases deste livro. Exclua uma das suas para guardar esta.` |
| Limite no envio, ações | `Ver minhas frases`, `Fechar` |
| Limite no envio, aviso | `O trecho que você escreveu não será guardado.` |
| Descarte, título | `Descartar esta frase?` |
| Descarte, texto | `O trecho que você escreveu não será guardado.` |
| Descarte, botões | `Descartar`, `Continuar escrevendo` |
| Frase de exemplo | `A gente aprende a ler o céu antes de aprender a ler as letras.` |
| Referência na origem, depois de salvar | `Página 74 · você`, `15 frases` |

O trecho acima do limite é o texto de 534 caracteres da seção 3, literal. Zero em-dash em toda a copy. Zero emoji.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px em campos e botões no mobile. Na web, campos de 44px, botões de 40px e `X` com alvo de 40px.
- Foco preso dentro do sheet e do dialog enquanto abertos. Ao abrir, o foco entra no `Trecho`. Ao fechar, volta ao botão que abriu (`Adicionar frase` ou `Adicionar a primeira`); depois de salvar, vai para a frase nova na origem.
- **Helper, contador e erro ligados ao campo** por descrição acessível: o leitor de tela lê `Trecho. Até 500 caracteres. 63 de 500 caracteres.` O contador é anunciado ao chegar perto do limite (a partir de 450) e ao passar dele, não a cada tecla.
- O campo de página é lido com a faixa: `Página. Entre 1 e 264. É a página em que o trecho está.`
- Erros são anunciados ao tocar em salvar, e o foco vai para o primeiro campo com erro. Falha de envio e limite atingido são anunciados como alerta.
- **Descartar texto digitado pede confirmação** (RNF-USA-04), com o foco em `Continuar escrevendo`. Fechar com campos vazios não pede nada.
- O botão `Salvar frase` fica sempre acionável fora do estado de salvando: nenhuma regra é comunicada só por botão desabilitado.
- Contraste WCAG AA nos dois temas: labels, helpers e contador em `grafite` sobre `papel-elevado` e `papel`; placeholder em `grafite-suave` é dica, não informação essencial, porque o label e o helper dizem tudo. Campos desabilitados usam `grafite-suave` sobre `linha` e não são acionáveis.
- `prefers-reduced-motion` respeitado: o sheet e o dialog aparecem sem deslizar, a troca para a confirmação de descarte não anima a altura, e o fade da frase nova na origem vira estático.
- O texto do sistema pode crescer: o helper e o contador passam para duas linhas, o contador embaixo, em vez de cortar o helper; o sheet rola por dentro se não couber.

---

## 10. O que não fazer nesta tela

**Escopo desta tela**

- **Não desenhe formatação no trecho**: nada de negrito, itálico, Markdown, barra de ferramentas nem pré-visualização. Frase é texto puro.
- Não desenhe aspas automáticas nem prefixo de aspas no campo.
- Não desenhe campo de capítulo, de edição, de comentário ou de marcador. A frase tem só trecho e página.
- Não desenhe `sem página` nem caixa de marcar para tornar a página opcional. Ela é obrigatória.
- Não desenhe seletor de livro. O livro vem da tela de origem e é fixo.
- Não desenhe escolha de visibilidade da frase nem opção de compartilhar no feed. Salvar não gera atividade nem notificação.
- Não desenhe leitura por câmera ou reconhecimento de texto de foto da página.
- Não desenhe corte automático do texto em 500 caracteres: o contador avisa e o leitor escolhe o que tirar.
- Não desenhe a lista de frases completa aqui. Ela é outro prompt.
- Não use `rubi` fora dos erros, do banner de limite e do `Descartar`. Não use `ambar` em nada desta tela.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. O texto digitado no campo é Manrope; a serifa só aparece na frase já exibida, na tela de origem.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção, e nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro. O scrim do escuro é preto a 60% sobre a tela, e nunca vira fundo.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira, nem campo que imita papel pautado.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo.
- Nada de spinner girando. `Salvando` é o botão com 60% de opacidade.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado" ou "Valor inválido". Cada erro diz o que fazer, com o número do caso.
- Nada de label poético do tipo "Eternize este momento". O que é frase se chama frase, e o campo se chama trecho.
- Nada de número fake-preciso.

**Formulário**

- Nada de placeholder no lugar do label. Label sempre acima.
- Nada de helper que só aparece depois do erro: helpers e contador ficam visíveis o tempo todo.
- Nada de botão de salvar desabilitado para indicar erro.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast de sucesso nem tela de sucesso. O sucesso é a frase aparecendo na origem.
- Nada de toast com fundo saturado.

**Interações destrutivas**

- Nada de descartar texto digitado sem confirmação.
- Nada de botão destrutivo preenchido em `rubi`.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de formulário em página cheia na web: é dialog de 480px sobre a página do livro.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de layout que não colapse para o bottom sheet abaixo de 768px.
- Nada de conteúdo essencial escondido em hover.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de número exibido sem unidade fora do contador e do campo de página. Nunca "15" sozinho na origem: é "15 frases".

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação, nem contagem de "frases guardadas no ano".
- Sem ranking de leitores nem de frases.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo, nem importar trecho de e-book.
