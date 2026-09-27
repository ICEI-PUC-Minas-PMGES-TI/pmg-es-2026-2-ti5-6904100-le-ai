# F-SESSAO · Modo de foco

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-SESSAO.md
**Requisitos:** RF-PRG-05 (iniciar sessão cronometrada a partir de uma leitura em andamento), RF-PRG-06 (modo de foco durante a sessão, não configurável nem contornável), RF-PRG-08 (cancelar a sessão sem registro de progresso), RF-PRG-09 (recuperar sessão interrompida), RF-PRG-10 (ver o tempo transcorrido), RF-PRG-11 (pausar por 5, 10 ou 15 minutos e retomar), RF-PRG-12 (encerramento automático quando a pausa se esgota)
**Não funcionais:** RNF-USA-04 (confirmação antes de cancelar), RNF-USA-03 (contraste WCAG AA), RNF-TST-04 (estados e recuperação testáveis no mobile)
**Regras de negócio:** RN-16 inteira (sessão local ao dispositivo, uma por aparelho, modo de foco obrigatório, cronômetro derivado de `tempo acumulado + início do trecho corrente`, pausa de 5, 10 ou 15 minutos, modo de foco mantido na pausa, limite de 12 horas cronometradas), RN-04 (a sessão só existe para leitura em Lendo ou Relendo)
**Versão web:** não. RF-PRG-05 a RF-PRG-12 estão marcados com ❌ na coluna Web de `REQUISITOS.md` §5.4: RN-16 não se aplica a uma aba de navegador (`REQUISITOS.md` §10.9).
**Tela vizinha:** [`encerrar-sessao.md`](encerrar-sessao.md), que recebe a página ao encerrar e trata a sessão pendente na reabertura.

---

## 1. Contexto

A segunda forma de registrar progresso. Em vez de informar quanto tempo leu, o leitor deixa o aplicativo medir: inicia a sessão, lê, e ao final informa só a página em que parou. Sustenta o mecanismo de **meta**: o tempo medido alimenta os desafios em minutos (RN-16.13) e o registro resultante zera a inatividade da leitura (RN-16.12).

**De onde se chega.** A sessão começa por `Iniciar sessão de leitura` no sheet de Ações de leitura e por um botão secundário no sheet de Registrar progresso, sempre a partir de uma leitura em **Lendo** ou **Relendo**. Esses dois pontos de entrada são edições de outras telas, feitas em outro prompt. Este prompt desenha só o que acontece depois do toque.

**Para onde se vai.** Só existem duas saídas (RN-16.4): `Encerrar sessão`, que abre o sheet de informar a página, desenhado em `encerrar-sessao.md`, e `Cancelar sessão`, que descarta o tempo depois de confirmação.

Quatro regras governam o desenho inteiro e nenhuma é negociável:

- **O aplicativo fica bloqueado.** Enquanto a sessão está ativa, nenhuma outra área é acessível: estante, busca, feed, perfil, notificações e recomendações (RN-16.3). Por isso esta tela **não tem shell**: sem barra inferior, sem sino, sem header, sem seta de voltar. O gesto ou o botão de voltar do sistema não faz nada e não abre outra área. O modo de foco não tem ajuste nem opção de desligar (RN-16.4).
- **Motion zero.** É o componente mais calmo do sistema (`documento-de-design.md` §4.10 e §7.4). O dígito do cronômetro troca em `dur-instant` e o botão primário responde ao toque com `scale(0.98)`. Mais nada se move, nem os sheets que abrem sobre esta tela.
- **A pausa não libera a navegação.** Na pausa o cronômetro de leitura para e um cronômetro de pausa começa, mas o modo de foco continua (RN-16.20). A pausa é outro estado desta mesma tela, e não uma saída.
- **O cronômetro é derivado, não contado.** Ele exibe `tempo acumulado + (agora - início do trecho)`. Por isso, se o aplicativo for fechado, morto pelo sistema ou o aparelho desligar, ao reabrir o leitor cai **direto nesta tela, em modo de foco**, com o tempo certo (RN-16.5 e RN-16.9). Esse retorno não tem artboard próprio: ele é visualmente idêntico ao estado 4.1, sem tela de boas-vindas, sem aviso de "sessão recuperada" e sem passar pela navegação normal.

**Por que não há estado de "já existe uma sessão ativa".** RN-16.2 limita a uma sessão por aparelho. Como a sessão bloqueia toda a navegação, a pessoa não alcança nenhum ponto de entrada de outra sessão enquanto esta existe. O escopo é o aparelho e não a conta, então uma sessão em outro celular não interfere. Não desenhe esse estado.

**Por que não há estados de carregando, vazio ou erro.** A sessão é estado exclusivamente local (RN-16.10): iniciar, pausar, retomar e cancelar não chamam o servidor. Não há o que carregar, não há lista que possa estar vazia e não há requisição que possa falhar nesta tela. A única escrita remota do fluxo acontece no encerramento, em `encerrar-sessao.md`, e é lá que ficam os estados de envio, erro e fila offline.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o leitor os encontra.
- **Não existe linha web.** A tela é exclusiva do mobile.
- **Linha 2:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Modo de foco · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

Dials: DESIGN_VARIANCE 5, MOTION_INTENSITY 4, VISUAL_DENSITY 4 no produto.
Duas exceções em todo o produto: a página do livro sobe a variance para 7, e
o MODO DE FOCO opera em 1 / 1 / 1. ESTA TELA É O MODO DE FOCO: variance 1,
motion 1, densidade 1. Um elemento por vez, centralizado, sem ornamento.

CORES, MODO CLARO
papel            #F4F2EC   fundo da tela
papel-elevado    #EDE9DE   superfície elevada: card, container
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
  página do livro. Fora desses três, serifa não aparece. Esta tela não é
  nenhum deles.
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
Exceção do modo de foco: o cronômetro usa JetBrains Mono 500 em 72px, com
numeral tabular, conforme documento-de-design §4.10.

ESPAÇAMENTO (múltiplos de 4)
space-1 4, space-2 8, space-3 12, space-4 16, space-5 20, space-6 24,
space-8 32, space-10 40, space-12 48, space-16 64, space-24 96.
Padding lateral da tela: space-5 no mobile.

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
Regra geral do produto: todo motion respeita prefers-reduced-motion, zero
loop infinito, zero parallax, zero scroll hijack, press com scale(0.98),
sem ripple de Material, sem spinner.
NO MODO DE FOCO O MOTION É ZERO. O dígito do cronômetro troca em
dur-instant, o botão primário tem scale(0.98) no toque, e ponto. Nenhum
sheet desliza, nenhum scrim faz fade, nenhum número pulsa.

ÍCONES
Phosphor Icons, família única em todo o produto. Peso regular como padrão de
tema, fill apenas para indicar estado ativo. Tamanhos: 16px inline em label,
20px em botão e em campo, 24px em barra de navegação e em card, 32px em ação
principal isolada. Nenhum ícone desenhado à mão, nenhum SVG decorativo
inline, nenhum emoji.

BOTÕES
Botão médio: padding de 12 vertical e 20 horizontal, 48px de altura no
mobile, texto em uma linha. Primário: pill, fundo musgo, texto papel.
Textual: sem fundo, texto musgo peso 600, radius 12. Destrutivo: outline de
1px rubi, texto rubi, radius 12, nunca preenchido.

SOBREPOSIÇÃO MODAL (bottom sheet, documento-de-design §4.11)
Bottom sheet ancorado embaixo, largura total, fundo papel no claro e
noite-elevada no escuro, radius-lg 20 só nos cantos de cima, padding
space-6, elev-3. Alça de 32 x 4px em linha / linha-noite, centralizada,
space-5 acima do conteúdo. Padding inferior soma a área segura do aparelho.
Scrim: #171512 a 40% no claro e preto a 60% no escuro.
Confirmação destrutiva: título em title-sm, consequência em body grafite
nomeando o que se perde, botões empilhados em largura total com o
destrutivo em cima, e o foco inicial em Cancelar, nunca no destrutivo.
Menu de ações: itens de 56px com ícone Phosphor regular de 20px e rótulo em
body, space-4 de gap, divisor linha entre eles, e space-4 depois um botão
textual grafite de largura total, Cancelar.
Dentro do modo de foco, o sheet e o scrim aparecem e somem SEM deslizar e
sem fade, por causa do motion zero.

MODO DE FOCO (documento-de-design §4.10)
Fundo sólido papel / noite. Nenhuma imagem, nenhum gradiente, nenhuma capa
como fundo desfocado. Conteúdo centralizado verticalmente, ocupando a
viewport inteira. Elementos permitidos, de cima para baixo: título do livro
(title, tinta, centralizado), autor (body, grafite, centralizado),
cronômetro (JetBrains Mono 72px, tinta, centralizado), ação textual
"Pausar", botão único primário "Encerrar sessão" no fundo, e ação textual
"Cancelar sessão", sempre com confirmação. Nada mais na tela: sem barra de
status própria, sem menu, sem voltar próprio, sem barra de navegação.

MODO ESCURO
Cidadão de primeira classe e lock de página inteira: nenhuma seção inverte no
meio da tela. Superfície elevada fica MAIS CLARA que o fundo, nunca mais
escura.

CONTRASTE
WCAG AA no corpo, AAA no título quando possível. grafite-suave e
grafite-fundo-escuro passam apenas em tamanho grande: nunca carregam texto de
corpo nem informação essencial.
```

---

## 3. Dados que aparecem na tela

**Livro da sessão:** `Tudo é rio`, de Carla Madeira, Record, `210 páginas`. A leitura está em **Lendo**, na página `88`.

**Tempo de leitura medido:**

- Estado padrão: `0:47:12`, que é 47 minutos e 12 segundos.
- Estado com mais de uma hora: `1:12:05`, que é 1 hora, 12 minutos e 5 segundos. Serve para conferir que o cronômetro na largura máxima cabe na viewport.
- Formato sempre `h:mm:ss`, com a hora sem zero à esquerda: `0:47:12`, nunca `00:47:12` e nunca `47:12`. A largura do número não muda quando a primeira hora vira, e o layout não pula.

**Pausa:**

- Durações oferecidas: `5 minutos`, `10 minutos`, `15 minutos`.
- Estado pausado: pausa de `10 minutos` escolhida, com `6:38` restantes. O tempo de leitura fica congelado em `0:47:12` durante a pausa.

**Cancelamento:** o texto de confirmação cita o tempo que se perde, `47 minutos`.

**O que não aparece:** capa do livro, página atual, percentual, número de páginas, avatar, nome do leitor, nome do produto, logo, hora do dia, meta de desafio. O modo de foco mostra título, autor e tempo, e só.

---

## 4. Artboards mobile (390 x 844)

### Estrutura comum

- Fundo sólido `papel` ocupando a viewport inteira, inclusive atrás da barra de status do sistema, que continua sendo a do aparelho e não é redesenhada.
- **Sem shell.** Sem barra inferior, sem header, sem sino, sem seta de voltar, sem menu de três pontos.
- **Bloco central**, centralizado vertical e horizontalmente, padding lateral `space-5`:
  - Título do livro em `title` `tinta`, centralizado, no máximo duas linhas.
  - `space-2` abaixo, autor em `body` `grafite`, centralizado.
  - `space-12` abaixo, o **cronômetro**: JetBrains Mono 500 em 72px, numeral tabular, `tinta`, centralizado, em uma linha só.
- **Bloco de ações**, ancorado no rodapé, padding lateral `space-5`, `space-6` mais a área segura abaixo:
  - Botão textual `musgo` de largura total, 48px de altura, com `Pause` (Phosphor, `regular`, 20px, `musgo`) à esquerda do rótulo: `Pausar`.
  - `space-3` abaixo, o botão primário pill de largura total, 48px de altura, fundo `musgo`, texto `papel`: `Encerrar sessão`.
  - `space-3` abaixo, botão textual de largura total, 48px de altura, texto `grafite` peso 600: `Cancelar sessão`. Ele é `grafite`, e não `rubi`, porque é o caminho de saída, calmo; o peso destrutivo fica na confirmação.
- Nenhum divisor, nenhum card, nenhuma superfície elevada na tela principal. A hierarquia vem só do tamanho do cronômetro e do espaço vazio.

### 4.1 Rodando

O estado em que a tela abre ao iniciar a sessão, e o mesmo estado em que o leitor cai ao reabrir o aplicativo com sessão ativa (RN-16.5).

- Título `Tudo é rio`, autor `Carla Madeira`, cronômetro `0:47:12` em `tinta`.
- Ações: `Pausar`, `Encerrar sessão`, `Cancelar sessão`.
- O segundo muda a cada segundo, com troca de dígito em `dur-instant`. Sem rolagem de dígito, sem pulsar, sem anel de progresso em volta, sem ponto piscando entre os números.

### 4.2 Escolher a duração da pausa

Aberto por `Pausar`. Bottom sheet conforme design §4.11, na variante de menu de ações, sobre a tela 4.1 escurecida pelo scrim.

- A tela 4.1 continua atrás, com o cronômetro ainda correndo: escolher a duração não pausa nada. A pausa começa no toque em uma das opções.
- Sheet em `papel`, cantos de cima em `radius-lg`, alça de 32 x 4px em `linha`.
- Título em `title-sm` `tinta`: `Pausar por quanto tempo?`
- `space-2` abaixo, texto em `body` `grafite`: `O tempo em pausa não conta como leitura. Se a pausa acabar sem você voltar, a sessão é encerrada e o tempo lido fica guardado.`
- `space-4` abaixo, três itens de 56px, cada um com `Timer` (Phosphor, `regular`, 20px, `grafite`) e o rótulo em `body` `tinta`, com divisor `linha` entre eles: `5 minutos`, `10 minutos`, `15 minutos`.
- `space-4` abaixo, botão textual `grafite` de largura total: `Voltar`.
- O sheet aparece sem deslizar e o scrim sem fade. Toque no scrim fecha, sem pausar.

### 4.3 Pausado

Depois de tocar em `10 minutos`. O modo de foco continua: mesma tela, sem shell, sem nenhuma saída nova.

- Título e autor iguais.
- Cronômetro de leitura congelado em `0:47:12`, na mesma posição e tamanho, mas em `grafite`: parado, e não apagado.
- `space-4` abaixo do cronômetro, centralizado, a linha da pausa em `body` `grafite`, com o número em `num-inline` `tinta`: `Pausa termina em 6:38`. O número decresce a cada segundo, com troca de dígito em `dur-instant`.
- Ações no rodapé, com a ordem de peso trocada porque a ação esperada agora é voltar a ler:
  - Botão textual `musgo`, com `Stop` (Phosphor, `regular`, 20px, `musgo`) à esquerda: `Encerrar sessão`.
  - Botão primário pill `musgo`, com `Play` (Phosphor, `regular`, 20px, `papel`) à esquerda: `Retomar leitura`.
  - Botão textual `grafite`: `Cancelar sessão`.
- Sem barra ou anel de contagem regressiva, sem cor de alerta enquanto o tempo acaba, sem vibração desenhada. O número é a informação.
- `Retomar leitura` volta ao estado 4.1, com o cronômetro continuando de `0:47:12`. `Encerrar sessão` abre o sheet de `encerrar-sessao.md` com os 47 minutos já medidos.
- Se a pausa acabar sem retomada, a sessão é encerrada automaticamente e o leitor vê o estado `Sessão encerrada pela pausa` de `encerrar-sessao.md`, com o tempo de leitura preservado (RN-16.18 e RN-16.19). Não desenhe esse estado aqui.

### 4.4 Confirmar cancelamento

Aberto por `Cancelar sessão`, tanto no estado 4.1 quanto no 4.3. Confirmação destrutiva conforme design §4.11 e §7.8, sobre a tela escurecida pelo scrim.

- Sheet em `papel`, alça em `linha`.
- Título em `title-sm` `tinta`: `Cancelar esta sessão?`
- `space-2` abaixo, consequência em `body` `grafite`, nomeando o que se perde: `Os 47 minutos medidos serão descartados e nenhum progresso será registrado.`
- `space-6` abaixo, botões empilhados em largura total, 48px cada, `space-3` entre eles:
  - Destrutivo em cima, outline de 1px `rubi`, texto `rubi`, `radius` 12: `Descartar sessão`.
  - Botão textual `musgo` embaixo: `Continuar lendo`.
- O foco entra em `Continuar lendo`, nunca no destrutivo.
- Confirmado, a sessão some do aparelho sem chamar o servidor (RN-16.8 e RN-16.10), o modo de foco termina e o leitor volta à tela de onde iniciou a sessão, sem toast e sem mensagem. Não há desfazer.
- O sheet aparece sem deslizar.

### 4.5 Rodando, mais de uma hora

Igual ao 4.1, com o cronômetro em `1:12:05`. Existe para conferir a largura máxima: o número cabe em uma linha dentro do padding `space-5`, sem quebrar e sem reduzir o corpo do resto da tela. Com o limite de 12 horas (RN-16.11), o cronômetro nunca passa de dois dígitos de hora, e a forma mais larga possível é `11:59:59`: ela também precisa caber em uma linha.

---

## 5. Artboards web

Não há versão web. RF-PRG-05 a RF-PRG-12 estão marcados com ❌ na coluna Web de `REQUISITOS.md` §5.4, porque o modo de foco não se aplica a uma aba de navegador (§10.9).

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**. Os mesmos shadows ficam com metade da opacidade.

- **Rodando.** Fundo `noite` na viewport inteira. Título em `papel-suave`, autor em `grafite-claro`, cronômetro em `papel-suave`. `Pausar` em `musgo-claro`, com o ícone em `musgo-claro`. Botão primário com fundo `musgo-claro` e texto `noite`. `Cancelar sessão` em `grafite-claro`.
- **Pausado.** Fundo `noite`. Cronômetro congelado em `grafite-claro`. Linha da pausa em `grafite-claro`, com `6:38` em `papel-suave`. `Retomar leitura` como primário `musgo-claro` com texto `noite`, `Encerrar sessão` textual em `musgo-claro`, `Cancelar sessão` em `grafite-claro`.
- **Confirmar cancelamento.** Scrim preto a 60% sobre o estado Rodando escuro. Sheet em `noite-elevada`, **mais claro** que o fundo, alça em `linha-noite`. Título em `papel-suave`, consequência em `grafite-claro`. Destrutivo com outline e texto `rubi-claro`. `Continuar lendo` em `musgo-claro`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Modo de foco: fundo sólido, bloco central, cronômetro de 72px, ações permitidas, motion zero | documento-de-design §4.10 e §7.4 |
| Bottom sheet em variante de menu de ações e em variante de confirmação destrutiva | documento-de-design §4.11 |
| Botão primário pill, botão textual e botão destrutivo em outline | documento-de-design §4.1 e §7.8 |
| Escala tipográfica, com JetBrains Mono e numeral tabular no número | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |

**Nasce aqui, e não está no `documento-de-design.md`.** O que for aprovado no protótipo vira pendência de incorporação pelo controle de mudança do plano §3:

1. **Estado pausado do modo de foco.** O §4.10 descreve só a sessão correndo. Aqui nascem o cronômetro de leitura congelado em `grafite`, a linha `Pausa termina em` com a contagem regressiva em `num-inline`, e a troca de peso das ações: `Retomar leitura` vira o primário e `Encerrar sessão` vira textual.
2. **Seletor de duração da pausa** com as três opções de RN-16.14, montado sobre o menu de ações do §4.11.
3. **Sobreposição sem motion dentro do modo de foco.** O §4.11 manda o sheet subir em `dur-slow`. O §4.10 e o §7.4 proíbem motion no modo de foco. Aqui prevalece o modo de foco: sheet e scrim aparecem e somem sem transição.
4. **Formato do cronômetro `h:mm:ss`**, com a hora sem zero à esquerda. O §4.10 fixa fonte e tamanho, mas não o formato.
5. **Ícones das ações** `Pause`, `Play` e `Stop` ao lado dos rótulos. O §4.10 lista as ações sem ícone.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do livro | `Tudo é rio` |
| Autor | `Carla Madeira` |
| Cronômetro, padrão | `0:47:12` |
| Cronômetro, mais de uma hora | `1:12:05` |
| Ação de pausa | `Pausar` |
| Botão primário, rodando | `Encerrar sessão` |
| Ação de cancelamento | `Cancelar sessão` |
| Título do sheet de pausa | `Pausar por quanto tempo?` |
| Texto do sheet de pausa | `O tempo em pausa não conta como leitura. Se a pausa acabar sem você voltar, a sessão é encerrada e o tempo lido fica guardado.` |
| Opções de pausa | `5 minutos`, `10 minutos`, `15 minutos` |
| Fechar o sheet de pausa | `Voltar` |
| Linha da pausa | `Pausa termina em 6:38` |
| Botão primário, pausado | `Retomar leitura` |
| Ação textual de encerrar, pausado | `Encerrar sessão` |
| Título da confirmação | `Cancelar esta sessão?` |
| Consequência da confirmação | `Os 47 minutos medidos serão descartados e nenhum progresso será registrado.` |
| Botão destrutivo | `Descartar sessão` |
| Botão de permanecer | `Continuar lendo` |

Zero em-dash em toda a copy. Zero emoji. O tempo de leitura aparece em formato de relógio no cronômetro e em minutos por extenso na confirmação; nenhum número solto sem unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px nos três botões do rodapé e em cada item do sheet de pausa.
- O cronômetro tem rótulo para leitor de tela por extenso, `47 minutos e 12 segundos de leitura`, e **não é anunciado a cada segundo**: a região não é viva. O leitor de tela lê o tempo quando o foco chega nele. Na pausa, `Pausa termina em 6 minutos e 38 segundos`, também sem anúncio contínuo.
- O estado pausado não depende só de cor: além do cronômetro ir para `grafite`, existem a linha `Pausa termina em` e o botão `Retomar leitura`.
- O gesto e o botão de voltar do sistema não saem do modo de foco e não mostram aviso. As saídas estão sempre visíveis no rodapé.
- Na confirmação de cancelamento, o foco inicial fica em `Continuar lendo`, e o destrutivo vem em outline `rubi`, nunca preenchido (RNF-USA-04).
- O sheet de pausa e a confirmação fecham por toque no scrim, e cada um tem botão explícito para quem não usa gesto.
- Contraste WCAG AA no corpo nos dois temas. O cronômetro congelado em `grafite` sobre `papel` e em `grafite-claro` sobre `noite` passa com folga, por ser texto de 72px.
- Motion zero vale também sob `prefers-reduced-motion`, que aqui não muda nada, porque já não há o que reduzir.
- A tela precisa acomodar o escalonamento de fonte do sistema: título longo quebra em até duas linhas e o cronômetro nunca é cortado.

---

## 10. O que não fazer nesta tela

**Específico do modo de foco**

- **Não desenhe shell.** Nada de barra inferior, header, sino, avatar, seta de voltar ou menu de três pontos. O aplicativo está bloqueado (RN-16.3).
- **Não desenhe ajuste do modo de foco.** Nada de chave para desligar, nada de "permitir notificações", nada de "sair do modo de foco" que não seja encerrar ou cancelar (RN-16.4).
- **Não desenhe capa do livro, nem como imagem, nem como fundo desfocado.** Fundo sólido e só.
- **Não desenhe página atual, percentual nem barra de progresso de leitura.** A página é informada só no encerramento.
- **Não desenhe anel, barra ou gráfico de contagem** em volta do cronômetro nem na pausa.
- **Não anime nada.** Nada de dígito rolando, número pulsando, dois-pontos piscando, sheet deslizando, scrim com fade ou transição de tela.
- **Não desenhe estado de sessão já ativa, de carregamento, de vazio ou de erro.** A seção 1 explica por que nenhum deles existe nesta tela.
- **Não desenhe tela de "sessão recuperada"** nem aviso ao reabrir. A recuperação cai direto no estado 4.1.
- Não desenhe o formulário de informar a página nem a sessão pendente. Os dois estão em `encerrar-sessao.md`.
- Não desenhe frase motivacional, dica de leitura, citação, som ambiente, música ou qualquer outro elemento além dos listados.
- Não use `rubi` fora da confirmação de cancelamento. `Cancelar sessão` na tela principal é `grafite`.
- Não use `broto` no cronômetro. O cronômetro não é progresso de desafio: é `tinta`.
- Não desenhe versão web.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela: ela não é resenha, não é frase de livro e não é sinopse.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline nesta tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de motion no modo de foco. Nada.
- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de spinner girando.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de label poético. `Pausar por quanto tempo?` diz o que é.
- Nada de número sem unidade e nada de número fake-preciso.
- Nomes e livros plausíveis, variados e coerentes com a editora.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de toast com fundo saturado, e nenhum toast nesta tela.
- Nada de botão destrutivo preenchido. Destrutivo é outline `rubi`.

**Interações destrutivas**

- Nada de cancelar a sessão sem confirmação (RNF-USA-04).
- Nada de desfazer depois de descartar a sessão.

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
