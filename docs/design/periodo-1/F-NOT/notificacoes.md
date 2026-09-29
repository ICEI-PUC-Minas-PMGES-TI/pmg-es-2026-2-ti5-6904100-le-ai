# F-NOT · Notificações

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-NOT.md
**Requisitos:** RF-NOT-02 (lista paginada com indicação de não lidas), RF-NOT-03 (marcar como lidas, individualmente e em lote), RF-NOT-04 (a notificação de leitura em risco tem ação direta de abandonar a leitura)
**Requisito de sistema cujo efeito aparece aqui:** RF-NOT-01 (o sistema gera as notificações in-app dos eventos desta versão). É de sistema; o cliente apenas **exibe o efeito**.
**Não funcionais:** RNF-SEC-02 (só o dono lê e marca as próprias notificações), RNF-DES-02 (lista paginada com limite imposto pelo servidor), RNF-USA-03 (contraste WCAG AA), RNF-USA-04 (confirmação antes de abandonar a leitura), RNF-USA-05, RNF-ERR-09 (cold start tratado como carregamento)
**Regras de negócio:** RN-05 (inatividade: alerta nos dias 20 e 30, abandono automático no dia 40), RN-04 (máquina de estados da leitura, para o efeito da ação de abandonar), RN-08 (privacidade, para o que a notificação mostra de quem agiu)
**Versão web:** **não.** RF-NOT-01 a RF-NOT-04 estão marcados como fora do escopo na coluna Web de `REQUISITOS.md` §5.10, e o §2.1 põe notificações fora do escopo do cliente web. Não desenhe linha web neste canvas, e o `Bell` não existe na sidebar de P0-NAV.

---

## 1. Contexto

A caixa do que aconteceu com o leitor: alguém o seguiu, pediu para segui-lo, aceitou o pedido dele, curtiu, comentou, respondeu, ou uma leitura dele entrou em risco de abandono automático. Tela empilhada, aberta pelo `Bell` do header de qualquer tela autenticada do mobile.

É a tela que fecha o ciclo de **pertencimento** e a que sustenta **RN-05**: o abandono automático no dia 40 não pode chegar como surpresa, e é aqui que o aviso dos dias 20 e 30 encontra o leitor.

Três coisas que ela precisa resolver:

- **Não lida precisa ser discreto e inequívoco.** O `documento-de-design.md` §5.6 fixa um ponto `musgo` de 8px à esquerda do ícone, e diz por extenso que não é pill grande nem fundo tingido.
- **A notificação de leitura em risco age.** RF-NOT-04 exige a ação de abandonar dentro da própria notificação, e abandonar é destrutivo: precisa de confirmação (RNF-USA-04) e de uma frase que diga o que acontece com o registro.
- **Ler não pode exigir trabalho.** Marcar como lida acontece ao abrir a notificação, e o lote existe no header para quem só quer zerar o badge.

**A ação de abandonar é de outra feature.** Quem executa é `POST /leituras/{leituraId}/abandonar`, de F-EST. Esta tela oferece o botão e a confirmação; o servidor revalida propriedade e estado da leitura.

**Escopo desta entrega.** No Período 1 a entrega é **in-app**, carregada pelo cliente: não há tempo real (RF-NOT-06, Desejável) nem push (RF-NOT-07, Opcional). Preferência por tipo de notificação é RF-NOT-05, Opcional, e não existe.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** não existe. Esta tela não tem versão web, conforme o cabeçalho.
- **Linha 3, que aqui é a segunda linha do canvas:** modo escuro, no mínimo o estado padrão.
- Cada artboard leva um **rótulo acima**, no formato `Notificações · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Oito notificações**, uma de cada tipo gerado no Período 1, da mais recente para a mais antiga. As três primeiras estão **não lidas**.

| Tipo | Ícone | Texto | Quando | Estado |
|---|---|---|---|---|
| Leitura em risco (RN-05, dia 30) | `Warning` | `Você não registra progresso em O Avesso da Pele há 30 dias. No dia 40 ele é abandonado automaticamente.` | `há 1 h` | não lida |
| Resposta a comentário | `ChatCircle` | `Júlia Wenceslau respondeu ao seu comentário na atividade de Rafael Okamoto.` | `há 3 h` | não lida |
| Novo seguidor | `UserPlus` | `Caio Ferraz começou a seguir você.` | `há 5 h` | não lida |
| Curtida em atividade | `Heart` | `Dandara Lopes curtiu sua resenha de Vidas Secas.` | `ontem` | lida |
| Comentário em atividade | `ChatCircle` | `Nadia Sampaio comentou a sua leitura de Torto Arado.` | `ontem` | lida |
| Solicitação de seguir | `UserPlus` | `Otávio Brandão pediu para seguir você.` | `há 2 dias` | lida |
| Solicitação aceita | `UserCheck` | `Beatriz Nogueira aceitou sua solicitação para seguir.` | `há 3 dias` | lida |
| Leitura abandonada automaticamente (RN-05, dia 40) | `PauseCircle` | `Cidade de Deus foi abandonado automaticamente depois de 40 dias sem progresso.` | `há 5 dias` | lida |

**Contagem de não lidas:** `3 não lidas`, que é o mesmo número do badge do sino.

**Paginação:** o servidor entrega 20 por página, e a lista carrega a próxima por rolagem.

Todo número aparece com unidade. Nenhum valor é fake-preciso.

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
ícone peso `regular`, cor `grafite`;
rótulo em `caption` `grafite`. Ativo: ícone peso `fill`, cor `musgo`; rótulo
em `caption` peso 600, cor `musgo`. Sem pill de fundo atrás do item ativo,
sem indicador deslizante, sem ícone que salta.

**Mobile, header.** Altura de 72px mais a área segura, padding lateral
`space-5`, fundo `papel`, sem sombra. À esquerda o título da tela em
`display`, cor `tinta`, alinhado à base. À direita, na mesma linha, as ações
contextuais da tela seguidas do sino `Bell` (Phosphor, `regular`, 24px,
`tinta`), com `space-4` de gap. O sino é fixo em toda tela autenticada.
Badge de não lidas: círculo de 18px, fundo `musgo`, encostado no canto
superior direito do ícone, número centralizado em 11px peso 600 cor `papel`;
acima de nove mostra `9+`; sem não lidas, o badge simplesmente não existe.

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida
por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px
`linha`. Bloco do topo de 72px, padding lateral `space-5`, com o wordmark
`Lê Ai` em Space Grotesk 600, token `title`, cor `tinta`, à esquerda, e
`SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo,
`space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro
de padding lateral `space-3`: altura de 44px, `radius` 12, padding lateral
`space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em
`body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo
transparente. Hover: fundo `linha`, transição `dur-fast`. Ativo: fundo
`musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`.

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

Conforme design §5.6.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, voltando à tela de origem.
- Título `Notificações` em `display` `tinta`, à esquerda, alinhado à base.
- À direita, botão textual `Marcar todas` em `caption` peso 600 `musgo`, alvo de 48px. **Ele só existe quando há não lidas**, e some quando não há: um botão que não faz nada é pior do que nenhum botão.
- **Sem `Bell` neste header.** O sino é o que traz até aqui, e repeti-lo na própria tela seria uma porta para o lugar em que já se está.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.
- **A barra inferior continua visível**, com o item da área de origem ativo.

### Linha de contexto

- Padding lateral `space-5`, `space-3` de respiro acima e abaixo, texto em `caption` `grafite`: `3 não lidas`.
- Some quando não há não lidas.
- Divisor de 1px `linha` de largura total abaixo.

### Item de notificação

Conforme design §5.6. Padding lateral `space-5`, `space-4` de padding vertical, itens separados por divisor de 1px `linha`.

- **Indicador de não lida:** ponto `musgo` de 8px, alinhado verticalmente ao centro do ícone, à esquerda dele, com `space-2` de gap. Sob leitura, o ponto some com transição `dur-fast`. **Não é pill grande, não é fundo tingido, não é borda lateral.**
- **Ícone contextual** Phosphor, `regular`, 24px, `grafite`, com `space-3` de gap até o texto: `Heart` para curtida, `ChatCircle` para comentário e resposta, `UserPlus` para novo seguidor e solicitação recebida, `UserCheck` para solicitação aceita, `Warning` para leitura em risco, `PauseCircle` para abandono automático.
  - **Só o `Warning` tem cor própria**, `ambar`, porque é o único que pede ação do leitor. Os demais ficam em `grafite`.
- **Texto principal** em `body` `tinta`, no máximo três linhas, com o nome de quem agiu em `body-strong` `tinta`.
- `space-1`, **tempo** em `caption` `grafite-suave`.
- O item inteiro é acionável e leva ao destino do tipo: perfil de quem seguiu, caixa de solicitações, comentários da atividade, página do livro ou estante. **Abrir marca como lida** (RF-NOT-03, individual).
- **Sem avatar no item.** O §5.6 define ícone contextual à esquerda, e trocar por avatar apagaria a distinção entre os tipos, que é o que a lista precisa comunicar de relance.

### 4.1 Padrão, com não lidas

Estado principal. Header com `Marcar todas`, linha `3 não lidas`, e os oito itens da seção 3 na ordem dada, com os três primeiros marcados pelo ponto `musgo`. Barra inferior do shell com a área de origem ativa.

Este é o artboard que prova que os oito tipos são distinguíveis **pelo ícone e pelo texto**, sem oito cores e sem oito fundos.

### 4.2 Leitura em risco, com ação de abandonar

O caso de RF-NOT-04, e o artboard mais importante da tela. Mesmo enquadramento de 4.1, com o primeiro item detalhado.

- Ponto de não lida, `Warning` em `ambar`, texto em três linhas.
- `space-3` abaixo do texto, alinhado ao começo do texto e não do ícone, um botão textual em `caption` peso 600 `rubi`: `Abandonar leitura`, com alvo de 48px.
- Ao lado dele, `space-4` de gap, um segundo botão textual em `caption` peso 600 `musgo`: `Registrar progresso`, que leva ao registro de progresso daquela leitura.
- **As duas saídas aparecem juntas** porque o aviso de RN-05 tem duas respostas legítimas, e oferecer só a destrutiva empurraria o leitor a abandonar o que ele ainda quer ler.
- **A ação não é um botão preenchido.** Destrutivo é textual ou outline, nunca preenchido (design §7.8).
- Tocar em `Abandonar leitura` abre o modal de 4.3. **Nunca executa direto.**

### 4.3 Confirmar abandono

Modal centrado sobre a tela, conforme RNF-USA-04.

- Fundo da tela escurecido por uma camada em `tinta` a 40% de opacidade.
- Card centrado, largura de 320px, `radius-lg`, fundo `papel-elevado`, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Abandonar O Avesso da Pele?`
- `space-3`, texto em `body` `grafite`: `A leitura passa para Abandonado na sua estante, e seu progresso até a página 62 continua salvo. Você pode retomar depois.`
- `space-6`, dois botões empilhados com `space-3` de gap:
  - Botão **outline** `rubi`, largura total, 48px, `radius` 12: `Abandonar`.
  - Botão textual `grafite`, largura total: `Cancelar`.
- O modal entra com fade em `dur-fast` e o card com deslocamento vertical de 8px. Sob `prefers-reduced-motion`, aparece estático.
- **Sem desfazer depois.** A confirmação é antes, e retomar é uma ação da estante, não um "desfazer" desta tela.
- Confirmado, o item da notificação permanece na lista e passa a lido, com os dois botões textuais substituídos por uma linha em `caption` `grafite`: `Leitura abandonada.`

### 4.4 Todas lidas

- Header **sem** o botão `Marcar todas`, e **sem** a linha de contexto.
- Os oito itens presentes, nenhum com o ponto `musgo`.
- **Nada muda além disso:** item lido não fica cinza, não perde peso tipográfico e não recebe opacidade reduzida. Lido é a ausência do ponto, e só.

### 4.5 Nenhuma notificação

- Header sem o botão `Marcar todas`.
- Bloco centralizado no espaço da lista, `space-6` entre os elementos:
  - `Bell` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nada por enquanto`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Curtidas, comentários, novos seguidores e avisos das suas leituras aparecem aqui.`
- **Sem botão:** não há ação que produza notificações, e um CTA aqui seria decorativo.
- **Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.**

### 4.6 Carregando

- Header real, com o botão `Marcar todas` desabilitado e opacidade reduzida.
- Lista substituída por **skeleton estático**: seis itens, cada um com um quadrado de 24px e duas barras em `capa-placeholder` com `radius-sm`, alturas de 15px e 13px, larguras de 85% e 30%.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** (RNF-ERR-09): demora não é erro.

### 4.7 Carregando mais

A rolagem chegou ao fim da primeira página de 20.

- Os itens carregados continuam visíveis e utilizáveis.
- Abaixo do último, **dois itens de skeleton** no mesmo desenho de 4.6, com um único fade.
- **Nada muda no topo.** O carregamento incremental não recarrega a lista, não move o scroll e não remarca nada como não lido.

### 4.8 Erro de carregamento

- Header real.
- Banner inline no lugar da lista, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar suas notificações. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

**Não existem.** Notificações estão fora do escopo do cliente web: RF-NOT-01 a RF-NOT-04 estão marcados como fora do escopo na coluna Web de `REQUISITOS.md` §5.10, e o §2.1 lista notificações entre os assuntos que a web não cobre.

Consequências que valem para o canvas inteiro:

- **Não desenhe nenhum artboard de 1440 x 900 neste canvas.**
- **Não desenhe o `Bell` na sidebar nem no header de conteúdo da web** em nenhum prompt: o shell de P0-NAV já fixa essa ausência.
- A solicitação de seguir, que no mobile também chega por notificação, tem no cliente web a tela própria de [`../F-PERFIL/solicitacoes-de-seguir.md`](../F-PERFIL/solicitacoes-de-seguir.md), alcançada pelo perfil. É por isso que aquela tela tem versão web e esta não.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão com não lidas.** Fundo `noite`. Título do header e `ArrowLeft` em `papel-suave`, `Marcar todas` em `musgo-claro`. Linha de contexto em `grafite-claro`. Ponto de não lida em `musgo-claro`. Ícones em `grafite-claro`, com o `Warning` em `ambar-claro`. Texto principal em `papel-suave`, com o nome de quem agiu em `body-strong` `papel-suave`; tempo em `grafite-fundo-escuro`. Divisores em `linha-noite`. Barra inferior em `noite-elevada`, **mais clara** que o fundo.
- **Mobile, leitura em risco com ação.** `Abandonar leitura` em `rubi-claro` e `Registrar progresso` em `musgo-claro`.
- **Mobile, confirmar abandono.** Card em `noite-elevada`, **mais claro** que o fundo, camada de escurecimento em `noite` a 60%, título em `papel-suave`, texto em `grafite-claro`, botão destrutivo com borda e texto `rubi-claro`.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Padrão de tela de notificações, com header, lista, ícone contextual e ponto de não lida | documento-de-design §5.6 |
| Ação inline de abandonar leitura, textual em `rubi` | documento-de-design §5.6 |
| Botão outline destrutivo e modal de confirmação | documento-de-design §4.1, §7.8 e RNF-USA-04 |
| Botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` | documento-de-design §3.1.3 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação, header e barra inferior, e o badge do sino | periodo-0/P0-NAV/shell-de-navegacao.md |
| Carregamento incremental com skeleton no fim da lista | periodo-1/F-PERFIL/seguidores-e-seguidos.md |

**Componentes que ainda não existem na fonte.** Quatro elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **O botão `Marcar todas` no header**, que só existe quando há não lidas. O §5.6 prevê o botão textual `Marcar todas como lidas`; o rótulo foi encurtado para caber em 390px ao lado do título em `display`. **A troca de copy precisa ser confirmada pelo grupo.**
2. **A linha de contexto `3 não lidas`**, que dá ao número do badge uma forma escrita com unidade.
3. **A segunda ação na notificação de leitura em risco**, `Registrar progresso`. O §5.6 e RF-NOT-04 preveem só a ação de abandonar; oferecer apenas a destrutiva enviesaria a decisão.
4. **O mapeamento de ícone por tipo**, com `UserCheck` para solicitação aceita e `PauseCircle` para abandono automático. O §5.6 cita quatro ícones e os tipos do Período 1 são oito.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Notificações` |
| Ação do header | `Marcar todas` |
| Linha de contexto | `3 não lidas` |
| Leitura em risco | `Você não registra progresso em O Avesso da Pele há 30 dias. No dia 40 ele é abandonado automaticamente.` |
| Resposta a comentário | `Júlia Wenceslau respondeu ao seu comentário na atividade de Rafael Okamoto.` |
| Novo seguidor | `Caio Ferraz começou a seguir você.` |
| Curtida em atividade | `Dandara Lopes curtiu sua resenha de Vidas Secas.` |
| Comentário em atividade | `Nadia Sampaio comentou a sua leitura de Torto Arado.` |
| Solicitação de seguir | `Otávio Brandão pediu para seguir você.` |
| Solicitação aceita | `Beatriz Nogueira aceitou sua solicitação para seguir.` |
| Abandono automático | `Cidade de Deus foi abandonado automaticamente depois de 40 dias sem progresso.` |
| Ação destrutiva do item | `Abandonar leitura` |
| Ação alternativa do item | `Registrar progresso` |
| Item após abandonar | `Leitura abandonada.` |
| Modal, título | `Abandonar O Avesso da Pele?` |
| Modal, texto | `A leitura passa para Abandonado na sua estante, e seu progresso até a página 62 continua salvo. Você pode retomar depois.` |
| Modal, botão destrutivo | `Abandonar` |
| Modal, botão textual | `Cancelar` |
| Vazio, título | `Nada por enquanto` |
| Vazio, texto | `Curtidas, comentários, novos seguidores e avisos das suas leituras aparecem aqui.` |
| Erro, texto | `Não foi possível carregar suas notificações. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |

**A notificação diz o que aconteceu, não pede nada.** Nada de `Veja agora`, `Não perca` nem ponto de exclamação.

Zero em-dash em toda a copy. Zero emoji. Todo número aparece com unidade: `30 dias`, `40 dias`, `3 não lidas`, `página 62`.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px em cada item, no `ArrowLeft`, no `Marcar todas`, nos dois botões textuais da notificação de risco e nos botões do modal. Os dois botões textuais têm `space-4` entre si, para que o destrutivo não seja tocado por engano.
- O estado de não lida **não depende só de cor**: o item não lido é anunciado como não lido por leitor de tela, além do ponto `musgo`.
- Cada item é anunciado como unidade, com o texto inteiro e o tempo, e o destino é anunciado junto da ação.
- A notificação de leitura em risco não comunica urgência só pelo `ambar`: ela traz o ícone `Warning`, o número de dias e a consequência escrita.
- Marcar como lida ao abrir é anunciado, e `Marcar todas` anuncia o resultado, no formato `3 notificações marcadas como lidas`.
- O modal captura o foco, começa no botão `Cancelar`, fecha com `Esc` e devolve o foco ao botão `Abandonar leitura`.
- O carregamento incremental é anunciado como região ocupada, sem roubar o foco de quem está lendo.
- Contraste WCAG AA no corpo nos dois temas. O texto principal usa `tinta`; só o tempo usa `grafite-suave`.
- `prefers-reduced-motion` respeitado: o fade do skeleton, a saída do ponto de não lida e o fade do modal viram estáticos.
- Abandonar a leitura é ação destrutiva e sempre passa pelo modal.

---

## 10. O que não fazer nesta tela

**Escopo e plataforma**

- **Não desenhe versão web desta tela.** Notificações estão fora do escopo do cliente web.
- **Não desenhe preferências por tipo de notificação.** RF-NOT-05 é Opcional e não existe no Período 1.
- **Não desenhe atualização em tempo real** nem indicador de "novas notificações chegando". RF-NOT-06 é Desejável e posterior.
- **Não desenhe push, permissão de notificação do sistema nem banner de "ative as notificações".** RF-NOT-07 é Opcional.
- **Não desenhe tipos que o Período 1 não gera:** menção resolvida, curtida em resenha, recomendação recebida e lembrete de sequência diária dependem de features futuras, que precisam definir evento, schema e consumidor antes.

**Específico da lista**

- **Não agrupe por dia** com cabeçalhos do tipo `Hoje` e `Esta semana`. A lista é cronológica decrescente contínua, e o tempo de cada item já diz quando foi.
- **Não agrupe notificações do mesmo tipo** em `Fulano e outras 4 pessoas curtiram`. Cada fato é uma notificação, e a deduplicação do servidor é por chave de negócio, não por exibição.
- **Não desenhe abas nem filtro por tipo.**
- **Não use fundo tingido, pill grande nem borda lateral colorida** para marcar não lida. O indicador é o ponto `musgo` de 8px.
- **Não esmaeça o item lido.** Lido é a ausência do ponto.
- **Não desenhe avatar no item.** O ícone contextual é o que distingue os tipos.
- **Não desenhe excluir notificação, arquivar nem deslizar para apagar.** Não há requisito.
- **Não desenhe `Marcar todas` quando não há não lidas.**
- **Não recarregue a lista inteira** ao carregar a próxima página.

**Específico da ação de abandonar**

- **Não abandone sem confirmação.**
- **Não desenhe o botão de abandonar preenchido.** Destrutivo é textual ou outline.
- **Não ofereça só a ação destrutiva** na notificação de risco: `Registrar progresso` fica ao lado.
- **Não desenhe desfazer** depois de abandonar. Retomar é uma ação da estante, com as regras de RN-04.
- **Não remova o item da lista** depois de abandonar: ele vira lido e informa o que foi feito.
- **Não duplique aqui as ações de aceitar e recusar solicitação.** A notificação leva à caixa de solicitações, e a decisão acontece lá.

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
