# Registrar progresso (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Registrar progresso`, gerado por `docs/design/periodo-1/F-PRG/registrar-progresso.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-PRG/registrar-progresso.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-SESSAO.md
**Requisitos que entram:**
- F-SESSAO: RF-PRG-05 (só a entrada: um botão secundário que troca o registro manual pela sessão cronometrada; o modo de foco é outra tela)

**Não funcionais:** RNF-USA-03 (contraste WCAG AA), RNF-USA-05
**Regras de negócio:** RN-16.1 (a sessão nasce de uma leitura em Lendo ou Relendo, que é justamente quando este sheet existe), RN-16.3 e RN-16.4 (a sessão abre em modo de foco, sem shell), RN-16.7 (na sessão a página é informada ao encerrar, e o tempo é medido), RN-16.10 (iniciar a sessão não chama o servidor)
**Versão web:** a tela tem web, mas **esta edição não muda a web.** RF-PRG-05 tem marcação negativa na coluna Web de `REQUISITOS.md` §5.4: RN-16 não se aplica a uma aba de navegador (§10.9). O dialog da web fica exatamente como está, e a SPA aberta num celular, que usa o desenho mobile, **também não mostra o botão**: ele existe só no app Flutter.

---

## 1. O que muda e por quê

O registro de progresso passa a ter duas formas (F-SESSAO): **informar** o tempo, como já está desenhado, ou **deixar o aplicativo medir**, numa sessão cronometrada em modo de foco. Esta edição acrescenta ao sheet do mobile a porta para a segunda forma, e nada mais.

| O que entra | Onde | Plataforma |
|---|---|---|
| Botão secundário `Iniciar sessão de leitura`, com `Timer`, e uma linha de helper | Entre o card do livro e o formulário, abaixo do divisor | só mobile |

**Por que acima do formulário, e não junto de `Salvar`.** A escolha entre informar e cronometrar acontece **antes** de preencher: quem vai começar a ler agora não tem página para informar. No rodapé, junto de `Salvar`, o botão ficaria escondido pelo teclado numérico que o campo de página abre com foco, e seria lido como uma terceira forma de salvar o que foi digitado. Acima do formulário ele aparece em todos os estados do sheet, com o teclado aberto ou não.

**O toque não aproveita o que foi digitado.** A sessão pede a página só ao encerrar (RN-16.6) e mede o tempo sozinha, então página e tempo digitados aqui não têm onde entrar. Tocar em `Iniciar sessão de leitura` fecha o sheet, descarta o que estava nos campos e abre o modo de foco em tela cheia, **sem shell** (RN-16.3). O helper abaixo do botão diz isso antes do toque. Nada foi salvo ainda, então não há confirmação: nenhum registro se perde.

**O destino é outra tela.** O modo de foco é desenhado em `F-SESSAO/modo-de-foco.md` e o encerramento em `F-SESSAO/encerrar-sessao.md`. Não desenhe nenhum dos dois neste canvas. A outra entrada da sessão é o item `Iniciar sessão de leitura` do sheet de ações de leitura (edição `acoes-de-leitura/acoes-de-leitura.md`), com o mesmo rótulo e o mesmo ícone.

**Quando o botão não aparece.** Quando este sheet é aberto por `Corrigir`, a partir de um registro pausado na fila offline (estado 4.9 do prompt do Período 1), ele está consertando um registro que já existe, com página e tempo do registro pendente. Ali o botão **não existe**: trocar por sessão descartaria o registro sem passar pela confirmação de `Descartar`.

**O que deixa de valer do prompt do Período 1:** a proibição de desenhar sessão cronometrada vale agora só para o cronômetro e para o modo de foco, que continuam fora deste canvas. O botão de entrada passa a existir.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`, com o sheet sobre o contexto de origem.
- **Linha 2:** estados web, viewport `1440 x 900`, com o dialog centrado sobre o contexto de origem.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Registrar progresso · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

- **A linha web inteira**: `Web, padrão vazio`, `Web, preenchido`, `Web, erro de validação`, `Web, salvando` e `Web, salvando, escuro`. Nenhum botão entra no dialog.
- **Os artboards sem sheet**: `Mobile, salvo` e `Mobile, enfileirado offline`, que mostram o contexto de origem depois do registro.
- **A anatomia do sheet**: scrim, fundo `papel-elevado`, cantos superiores em `radius-xl`, alça, título `Registrar progresso`, card compacto com capa de 60 por 90px em canto vivo e `Página 148 de 264`, divisor.
- **O formulário**: `Página em que parou` com o helper permanente `Entre 149 e 264. Informe onde você parou, não quantas páginas leu.`, `Tempo gasto` com os sub-campos `h` e `min`, a linha de derivado `Você leu 24 páginas`, os erros inline e os estados de salvando e de erro de envio.
- **As ações do rodapé**: `Salvar` primário pill e `Cancelar` textual, empilhados em largura total.
- **Os dados**: `Torto Arado`, de Itamar Vieira Junior, `264 páginas`, página atual `148`.
- **Toda a copy do Período 1** que não aparece na seção 8 como alterada.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas.

### 4.1 O bloco de sessão

Vale para todo artboard mobile em que o sheet está aberto: `Mobile, padrão vazio`, `Mobile, preenchido`, `Mobile, erro página baixa`, `Mobile, erro página alta`, `Mobile, salvando`, `Mobile, erro de envio`, `Mobile, preenchido, escuro` e `Mobile, erro, escuro`.

- **Posição:** logo abaixo do divisor que fecha o card do livro, com `space-5` acima, e antes do campo `Página em que parou`, com `space-5` abaixo. Padding lateral `space-5`, o mesmo do formulário.
- **Botão secundário de largura total**, conforme design §4.1: altura de 48px, `radius` 12, borda de 1px `linha`, fundo transparente, `Timer` (Phosphor, `regular`, 20px, `tinta`) à esquerda do texto, `space-2` de gap, texto em `body-strong` `tinta`, centralizado: `Iniciar sessão de leitura`. Press com `scale(0.98)`.
- **Helper** logo abaixo, `space-2` de gap, em `caption` `grafite`, alinhado à esquerda: `O app mede o tempo e pede a página quando você encerrar.`
- **Não é ação principal.** O primário do sheet continua `Salvar`, em `musgo`, no rodapé. O botão de sessão não usa `musgo` no texto nem no ícone.
- **Toque:** o sheet some sem deslizar e o modo de foco ocupa a viewport inteira, sem shell e sem motion (design §4.10). Os valores digitados nos campos são descartados sem aviso adicional além do helper.

### 4.2 Por artboard

- **`Mobile, padrão vazio`**: entra 4.1. O campo de página continua com foco e o teclado numérico aberto. O bloco de sessão fica acima do campo e visível; se o sheet precisar rolar para caber o teclado, quem sai de vista primeiro são as ações do rodapé, como já acontecia.
- **`Mobile, preenchido`**: entra 4.1, com os campos em `172`, `0` e `45`. O helper do bloco é o que avisa que esses valores não seguem para a sessão.
- **`Mobile, erro página baixa`** e **`Mobile, erro página alta`**: entra 4.1, sem mudança nos erros. O botão de sessão continua acionável: o erro é do registro manual, não da sessão.
- **`Mobile, salvando`**: entra 4.1 **desabilitado**, como os campos: borda `linha`, fundo `linha`, texto e `Timer` em `grafite-suave`. Enquanto o registro está sendo enviado, trocar de forma não é permitido.
- **`Mobile, erro de envio`**: entra 4.1, acionável. Se o leitor preferir cronometrar depois da falha, o registro que falhou não foi salvo e nada se duplica.
- **`Mobile, preenchido, escuro`** e **`Mobile, erro, escuro`**: entra 4.1 com o tratamento escuro da seção 6.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha

#### 5.1 `Registrar progresso · Mobile, corrigir registro pausado`

O sheet aberto por `Corrigir`, na continuação do estado 4.9 do Período 1, para mostrar o único caso em que o bloco de sessão **não aparece**.

- Contexto atrás, sob o scrim: a tela de atualizações de progresso de `Torto Arado`, desenhada de forma genérica.
- Sheet com o título `Registrar progresso`, o card do livro com `Página 148 de 264` e o divisor, **sem o bloco de sessão**: o campo `Página em que parou` vem logo abaixo do divisor, como no Período 1.
- Campos preenchidos com o registro pendente: página `172`, tempo `0` e `45`, e a linha `Você leu 24 páginas`.
- Rodapé com `Salvar` e `Cancelar`.

### Linha 2, web

Nenhum artboard novo. A web não tem sessão cronometrada.

### Linha 3, modo escuro

Nenhum artboard novo. Os dois artboards mobile escuros que já existem recebem o bloco de sessão (4.2).

---

## 6. Artboards a remover e tratamento escuro

**Nenhum artboard sai.** Todos os do Período 1 continuam, com as mudanças da seção 4.

**Tratamento escuro do bloco de sessão.** Modo escuro é lock de página inteira: o contexto atrás do scrim também está escuro. O sheet em `noite-elevada` fica **mais claro** que o fundo `noite`; `musgo-claro` é o acento e os shadows têm metade da opacidade, porque a hierarquia vem da cor de superfície e do divisor `linha-noite`.

- Botão com borda de 1px `linha-noite`, fundo transparente, `Timer` e texto em `papel-suave`.
- Helper em `grafite-claro`.
- Desabilitado, se aparecer no escuro: fundo `linha-noite`, texto e ícone em `grafite-fundo-escuro`.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Padrão de tela de registrar progresso, sheet no mobile e dialog na web | documento-de-design §5.4 |
| Botão secundário | documento-de-design §4.1 |
| Helper permanente em `caption` `grafite` | documento-de-design §4.2 |
| Modo de foco, destino do botão, sem shell e sem motion | documento-de-design §4.10 |

**Nasce aqui** e vira pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Bloco de escolha da forma de registro** no §5.4: botão secundário com `Timer` e helper, entre o card do livro e o formulário, só no app. O §5.4 lista título, card, dois campos, derivado e ações, e não prevê a sessão.
- **Regra de ausência no modo `Corrigir`**: o bloco não aparece quando o sheet corrige um registro da fila.

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Botão de sessão | não existia | `Iniciar sessão de leitura` |
| Helper do botão de sessão | não existia | `O app mede o tempo e pede a página quando você encerrar.` |

Nenhuma copy do Período 1 é substituída. Zero em-dash, zero emoji.

---

## 9. Acessibilidade e interação do que muda

- **Alvo de 48px** no botão de sessão, que já é a altura do botão.
- **Ordem de foco:** o campo de página continua recebendo o foco ao abrir, porque registrar é a razão do sheet. O botão de sessão vem antes dele na ordem de leitura do leitor de tela, que o anuncia com o helper associado: `Iniciar sessão de leitura. O app mede o tempo e pede a página quando você encerrar.`
- **Ao tocar**, o foco vai para o título do livro no modo de foco. O botão ou gesto de voltar do sistema não devolve o sheet, porque o modo de foco não é contornável (RN-16.4).
- **Desabilitado no salvando**, anunciado como indisponível, não escondido.
- **Na web**, o botão não é renderizado em nenhuma largura. Leitor de tela da web não o encontra.
- Contraste WCAG AA nos dois temas: texto do botão em `tinta` e `papel-suave`, helper em `grafite` e `grafite-claro`, nunca em `grafite-suave`.
- `prefers-reduced-motion`: nada muda, a saída do sheet ao iniciar a sessão já é sem deslize.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Campos, helpers, derivado, erros, ações do rodapé, estados de salvando, salvo, offline e erro de envio ficam como estão no canvas.
- **Não mexa na linha web.** Nada de botão de sessão no dialog, nem desabilitado, nem com aviso de "disponível no app".
- **Não reordene os artboards existentes** e não troque os rótulos deles. O novo entra no fim da linha mobile.
- **Não desenhe o modo de foco nem o sheet de encerrar sessão** neste canvas.

**Específico da entrada da sessão**

- **Não ponha o botão de sessão no rodapé**, junto de `Salvar`. Ele fica acima do formulário.
- **Não pinte o botão de `musgo`** nem o transforme em primário pill: o primário do sheet é `Salvar`.
- Não leve a página nem o tempo digitados para a sessão, e não diga que leva.
- Não peça confirmação ao trocar de forma: nada foi salvo ainda.
- Não desenhe cronômetro, relógio rodando nem prévia do modo de foco dentro do sheet.
- Não desenhe passo de configuração da sessão (duração, meta, alarme). A sessão começa no toque.
- Não mostre o botão quando o sheet foi aberto por `Corrigir`.

**Do registro de progresso, do Período 1, que continua valendo**

- **Não desenhe campo de páginas lidas nem de percentual.** A entrada é a página em que parou (RN-17).
- **Não desenhe slider de progresso.** A entrada é numérica e precisa.
- **Não desenhe campo de data, de hora nem de fuso.** Instante e fuso são capturados automaticamente (RN-18.2).
- **Não exiba `Você leu 0 páginas`** quando o campo está vazio ou inválido.
- Não desabilite o botão `Salvar` quando há erro de validação no cliente.
- Não desenhe o aviso de fila offline como erro. Ele é `ambar` e informativo.
- Não desenhe tela de sucesso, toast de sucesso nem animação de comemoração depois de salvar.
- Não desenhe spinner no botão em salvamento.

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
- Nada de transição animada entre o sheet e o modo de foco.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O botão diz o que faz: `Iniciar sessão de leitura`, não "Entrar no fluxo".
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

**Formulários**

- Nada de placeholder no lugar do label. Label sempre acima do campo.
- Nada de helper que só aparece depois do erro. O helper do botão de sessão é visível o tempo todo.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.

**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "42" sozinho: é "42 páginas", "42 minutos".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
