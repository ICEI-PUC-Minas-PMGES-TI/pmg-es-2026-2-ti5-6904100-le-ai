# Notificações (edição do Período 2)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Notificações`, gerado por `docs/design/periodo-1/F-NOT/notificacoes.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-NOT/notificacoes.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-NOT-2.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-SOCIAL-2.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-AVA-2.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-REC-P2P.md
**Requisitos que entram:**
- F-NOT-2: RF-NOT-06 (entrega em tempo real, sem recarga manual, com a contagem de não lidas atualizada)
- F-SOCIAL-2: RF-NOT-01, tipo `menção em comentário` (RN-10.2: a menção resolvida gera notificação ao mencionado)
- F-AVA-2: RF-NOT-01, tipo `curtida em resenha` (só a primeira curtida do par resenha e reator notifica; descurtida não notifica)
- F-REC-P2P: RF-REC-02 e RF-NOT-01, tipo `recomendação de livro recebida` (RN-22.8), com o destino de RF-REC-05 (acionar leva à página do livro)

**Não funcionais:** RNF-ERR-09 (hibernação do servidor derruba a conexão: é reconexão, não erro), RNF-ERR-03 (reconexão com backoff), RNF-SEC-01 e RNF-SEC-02 (o canal só entrega ao dono autenticado), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** RN-10 (menção só vira notificação quando o username existe), RN-22.2 (sem mensagem, a recomendação é apenas "Fulano te recomendou X"), RN-22.8 (o recebimento gera notificação), RN-05 (leitura em risco, que continua como está)
**Versão web:** **não.** RF-NOT-01 a RF-NOT-06 e RF-REC-02 estão marcados como fora do escopo na coluna Web de `REQUISITOS.md` §5.10 e §5.13, e o §2.1 põe notificações fora do escopo do cliente web. Este canvas continua sem nenhum artboard de 1440 x 900.
**Destinos desenhados em outros prompts:** comentários da atividade (edição do Período 2 em `docs/design/periodo-2/comentarios/comentarios.md`, **a escrever**; até lá, a tela do Período 1 em `docs/design/periodo-1/F-FEED/comentarios.md`), a página do livro (edição do Período 2 em `docs/design/periodo-2/pagina-do-livro/pagina-do-livro.md`) e a página do livro pessoal (`docs/design/periodo-1/F-ACV-CADASTRO/livro-pessoal.md`). Aqui só existe a navegação até eles.

---

## 1. O que muda e por quê

No Período 1 a caixa de notificações era carregada pelo cliente e só conhecia oito tipos. O próprio prompt original proibia duas coisas que o Período 2 traz: **atualização em tempo real** e **os tipos que dependiam de features futuras**. Esta edição é a chegada das duas, de uma vez, para que as quatro features não disputem a mesma lista em edições separadas.

| O que entra | Onde | Feature |
|---|---|---|
| Notificação nova aparece no topo da lista **sem recarga**, com a linha de contexto e o `Marcar todas` atualizados | Lista, header e linha de contexto | F-NOT-2 |
| Aviso `N novas notificações` quando o leitor está com a lista rolada e algo chega | Logo abaixo do header, sobre a lista | F-NOT-2 |
| Tipo **menção em comentário**, com ícone `At` | Item de notificação | F-SOCIAL-2 |
| Tipo **curtida em resenha**, com ícone `ThumbsUp`, o mesmo da reação na resenha | Item de notificação | F-AVA-2 |
| Tipo **recomendação recebida**, com ícone `PaperPlaneTilt` e a mensagem do remetente em até duas linhas | Item de notificação | F-REC-P2P |

**Tempo real é transporte, não tela nova.** A notificação continua gravada no servidor, e a conexão só a entrega antes. Três consequências valem para o desenho inteiro:

- **A reconexão é silenciosa.** Quando o servidor hiberna e a conexão cai (RNF-ERR-09), o aplicativo reconecta sozinho, com backoff, e enquanto isso a lista funciona como no Período 1: carregada ao abrir, paginada por rolagem. Ao reconectar, o que chegou nesse meio tempo entra no topo, como qualquer notificação nova. **Não existe artboard de "reconectando", nem ícone de conexão, nem banner de offline:** do ponto de vista do leitor, nada caiu.
- **O badge do sino muda sozinho em todas as telas.** O badge é o do shell, já desenhado em todos os canvases (círculo de 18px em `musgo`, `9+` acima de nove). Com tempo real, o número muda sem o leitor recarregar nada. **Muda só o número**: sem pulso, sem salto, sem cor nova. Não há artboard próprio, porque o desenho do badge não muda.
- **Nenhuma notificação interrompe a tela em que o leitor está.** Não existe banner que desce do topo em outras telas, nem toast de "nova notificação". O sino é a única porta.

**Os três tipos novos se distinguem pelo ícone e pelo verbo**, como os oito do Período 1. Nenhum ganha cor própria: o `Warning` da leitura em risco continua sendo o único ícone colorido, porque continua sendo o único que pede ação.

**Duas curtidas diferentes passam a conviver na lista**, e o texto precisa separar as duas:

- **Curtida em atividade** (Período 1): alguém curtiu uma atividade do leitor **no feed**, com `Heart`.
- **Curtida em resenha** (Período 2): alguém tocou em `ThumbsUp` **na resenha**, na página do livro.

O exemplo do Período 1 para curtida em atividade dizia `curtiu sua resenha de Vidas Secas`, o que agora se confundiria com o tipo novo. **Essa copy é substituída** (seção 8) por uma atividade de conclusão.

**O que deixa de valer do prompt do Período 1:** a proibição de desenhar atualização em tempo real e indicador de notificações novas chegando, e a proibição de desenhar menção, curtida em resenha e recomendação recebida. **O lembrete de sequência diária continua fora**: RF-GAM-05 é Opcional e foi para o Período 3, junto do push. Todas as outras regras daquele prompt continuam valendo, e a seção 10 abaixo as repete.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** não existe. Esta tela não tem versão web.
- **Linha 3, que aqui é a segunda linha do canvas:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Notificações · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
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

Tudo o que vem a seguir fica **exatamente como está no canvas**:

- **O shell inteiro.** Barra inferior do mobile com os quatro itens (`Estante`, `Descobrir`, `Feed`, `Perfil`) e a área de origem ativa, do jeito que já está desenhada em cada artboard. Esta edição não mexe em navegação e não cria linha web.
- **O header da tela:** `ArrowLeft` à esquerda, título `Notificações` em `display` `tinta`, botão textual `Marcar todas` à direita **só quando há não lidas**, **sem `Bell`**, divisor `linha` na base só quando o conteúdo rola por baixo.
- **A linha de contexto** (`N não lidas`, `caption` `grafite`), que some quando não há não lidas. Muda só o número.
- **A anatomia do item de notificação:** ponto `musgo` de 8px para não lida, ícone contextual de 24px, texto em `body` `tinta` com o nome de quem agiu em `body-strong`, tempo em `caption` `grafite-suave`, divisor `linha` entre itens, **sem avatar**. Item lido não esmaece.
- **Os oito tipos do Período 1**, com os ícones e a copy que já têm, exceto a copy de curtida em atividade, substituída na seção 8.
- **A notificação de leitura em risco**, com `Warning` em `ambar`, `Abandonar leitura` em `rubi` e `Registrar progresso` em `musgo`, o modal de confirmação e o estado `Leitura abandonada.`.
- **Os estados `Carregando`, `Carregando mais` e `Erro de carregamento`**, com a copy e o skeleton que têm. Se a copy antiga de curtida em atividade aparecer em `Carregando mais`, troque pela nova da seção 8, e nada mais.
- **A ordem dos artboards existentes** em cada linha. Os novos entram depois deles.

### Dados dos artboards novos e alterados

A leitora é **Marina Beltrão** (`@marinableu`). A lista passa de oito para **doze notificações**, da mais recente para a mais antiga. As **seis primeiras estão não lidas**. Os tipos novos estão marcados.

| # | Tipo | Ícone | Texto | Quando | Estado |
|---|---|---|---|---|---|
| 1 | Leitura em risco (RN-05, dia 30) | `Warning` | `Você não registra progresso em O Avesso da Pele há 30 dias. No dia 40 ele é abandonado automaticamente.` | `há 1 h` | não lida |
| 2 | **Recomendação recebida, com mensagem** | `PaperPlaneTilt` | `Lívia Carvalho te recomendou Tudo É Rio.` Mensagem: `Terminei ontem e ainda estou pensando na Dalva.` | `há 1 h` | não lida |
| 3 | **Menção em comentário** | `At` | `Tiago Moreira mencionou você num comentário na atividade de Rafael Okamoto.` | `há 2 h` | não lida |
| 4 | Resposta a comentário | `ChatCircle` | `Júlia Wenceslau respondeu ao seu comentário na atividade de Rafael Okamoto.` | `há 3 h` | não lida |
| 5 | **Curtida em resenha** | `ThumbsUp` | `Heloísa Barreto curtiu sua resenha de Torto Arado.` | `há 4 h` | não lida |
| 6 | Novo seguidor | `UserPlus` | `Caio Ferraz começou a seguir você.` | `há 5 h` | não lida |
| 7 | Curtida em atividade | `Heart` | `Dandara Lopes curtiu que você terminou de ler Vidas Secas.` | `ontem` | lida |
| 8 | Comentário em atividade | `ChatCircle` | `Nadia Sampaio comentou a sua leitura de Torto Arado.` | `ontem` | lida |
| 9 | Solicitação de seguir | `UserPlus` | `Otávio Brandão pediu para seguir você.` | `há 2 dias` | lida |
| 10 | Solicitação aceita | `UserCheck` | `Beatriz Nogueira aceitou sua solicitação para seguir.` | `há 3 dias` | lida |
| 11 | **Recomendação recebida, sem mensagem** | `PaperPlaneTilt` | `Caio Rezende te recomendou Quarto de Despejo.` | `há 5 dias` | lida |
| 12 | Leitura abandonada automaticamente (RN-05, dia 40) | `PauseCircle` | `Cidade de Deus foi abandonado automaticamente depois de 40 dias sem progresso.` | `há 5 dias` | lida |

**Contagem de não lidas:** `6 não lidas`. É o mesmo número do badge do sino nas outras telas.

**Destino de cada tipo novo ao tocar**, sempre marcando a notificação como lida (RF-NOT-03):

| Tipo | Destino |
|---|---|
| Menção em comentário | Os comentários da atividade em que a menção foi feita (a atividade de Rafael Okamoto) |
| Curtida em resenha | A página do livro, na resenha da leitora. Se a resenha é de um livro pessoal dela, a página do livro pessoal |
| Recomendação recebida | A página do livro recomendado (RF-REC-05), mesmo que a recomendação já tenha saído da lista de recebidas porque o livro entrou na estante ou expirou |

**Notificações que chegam em tempo real**, para os artboards novos:

- Com a lista no topo e tudo lido (5.1): `Renata Albuquerque mencionou você num comentário na atividade de Dandara Lopes.`, `At`, `agora`, não lida. A contagem vira `1 não lida`.
- Com a lista rolada (5.2): duas chegam acima da área visível, a mesma menção de Renata Albuquerque e `Beatriz Okada curtiu sua resenha de Torto Arado.`, `ThumbsUp`, as duas `agora`. O aviso diz `2 novas notificações`, e a contagem passa a `8 não lidas`.

**Tempo relativo:** `agora` entra para o que chegou há menos de 1 minuto, antes de `há 1 h`. Os outros formatos são os do Período 1.

**Paginação:** continua a do Período 1, 20 por página, carregada por rolagem. As notificações empurradas pela conexão entram no topo sem recarregar nem remarcar a página.

Todo número aparece com unidade. Nenhum valor é fake-preciso.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas.

### 4.1 Item de notificação: três tipos novos

Vale para **todo artboard que mostra a lista carregada**. A anatomia não muda; entram três ícones e uma linha opcional.

- **Mapeamento de ícone**, Phosphor, `regular`, 24px, `grafite`, somado ao do Período 1:
  - `At` para menção em comentário.
  - `ThumbsUp` para curtida em resenha. É o mesmo ícone do botão de curtir na resenha da página do livro, e é ele que separa este tipo da curtida em atividade, que continua com `Heart`.
  - `PaperPlaneTilt` para recomendação recebida. É o mesmo ícone do envio de recomendação e do vazio de `Recomendações recebidas`.
  - **Nenhum dos três tem cor própria.** `Warning` em `ambar` continua sendo o único ícone colorido.
- **Linha de mensagem, só na recomendação com mensagem.** `space-1` abaixo do texto principal, a mensagem do remetente em `body` `grafite`, **no máximo duas linhas**, cortada com reticências. Sem aspas decorativas, sem ícone de balão, sem serifa: é texto de interface, não resenha nem frase de livro. Depois dela, `space-1`, o tempo. Recomendação sem mensagem é só o texto principal e o tempo, e está completa assim (RN-22.2).
- **Título de livro no texto** continua sem destaque, como nos tipos do Período 1: só o nome de quem agiu vai em `body-strong`.
- **Menção não mostra trecho do comentário.** O texto diz quem mencionou e em qual atividade; o comentário se lê no destino.

### 4.2 `Notificações · Padrão, com não lidas`

- A lista passa a ser a da seção 3.1, na ordem dada, com os **seis primeiros** marcados pelo ponto `musgo`.
- Linha de contexto: `6 não lidas`.
- O artboard mostra do topo para baixo o que couber no viewport, com a lista cortada naturalmente pela barra inferior. Os itens 1 a 6 precisam estar visíveis; o item 2 mostra a linha de mensagem.
- Continua sendo o artboard que prova que os tipos são distinguíveis **pelo ícone e pelo texto**, agora onze tipos, sem onze cores e sem onze fundos.

### 4.3 `Notificações · Leitura em risco, com ação`, `Notificações · Confirmar abandono` e `Notificações · Abandono confirmado`

- O primeiro item, a leitura em risco com as duas ações, **não muda**. O modal de `Confirmar abandono` **não muda**.
- O restante da lista, abaixo do primeiro item (e atrás do scrim no modal), passa a seguir a seção 3.1, com os itens 2 a 6 não lidos.
- Linha de contexto: `6 não lidas` nos dois primeiros. Em `Abandono confirmado`, a leitura em risco passou a lida, e a linha fica `5 não lidas`.

### 4.4 `Notificações · Todas lidas`

- A lista da seção 3.1, **nenhum item** com o ponto `musgo`. Header sem `Marcar todas` e sem linha de contexto, como já está.

### 4.5 `Notificações · Nenhuma notificação`

- Só a copy do texto muda, para citar os tipos novos (seção 8). Ícone, título, largura máxima de 280px e ausência de botão ficam como estão.

### 4.6 Artboards do modo escuro existentes

`Notificações · Escuro, padrão`, `Notificações · Escuro, leitura em risco` e `Notificações · Escuro, confirmar abandono` recebem as mesmas mudanças dos equivalentes claros (4.2 e 4.3). Os ícones novos ficam em `grafite-claro`, e a linha de mensagem da recomendação também em `grafite-claro`. O resto do tratamento escuro fica como está.

---

## 5. Artboards novos

### Mobile (390 x 844), no fim da linha 1, nesta ordem

#### 5.1 `Notificações · Nova notificação em tempo real`

A leitora está com a tela aberta, no topo da lista, e tudo estava lido. Uma notificação chega pela conexão. O artboard mostra o estado **depois** da chegada.

- Base: o artboard `Todas lidas`, com a lista da seção 3.1 inteira lida.
- **O header ganha `Marcar todas`**, porque agora há uma não lida.
- **A linha de contexto aparece**, abaixo do header: `1 não lida`.
- **No topo da lista, um item novo:** ponto `musgo`, `At`, `Renata Albuquerque mencionou você num comentário na atividade de Dandara Lopes.`, tempo `agora`.
- Abaixo dele, os doze itens da seção 3.1, todos lidos, cortados pela barra inferior.
- **Motion da chegada**, descrito para a implementação (o artboard é estático): o item novo entra com fade e deslocamento vertical de 8px, de cima para baixo, em `dur-base` com `ease-out`; os itens abaixo descem em `dur-base` com `ease-in-out`; a linha de contexto e o `Marcar todas` aparecem com fade em `dur-fast`. Sob `prefers-reduced-motion`, tudo aparece estático.
- **Nada mais muda.** A posição de rolagem fica no topo, nada é marcado como lido sozinho e nenhum item existente se move de lugar na ordem.

#### 5.2 `Notificações · Novas notificações com a lista rolada`

A leitora rolou a lista para baixo, e duas notificações chegaram acima da área que ela está lendo. Empurrar o conteúdo para baixo faria o item que ela lê fugir do dedo; por isso a lista **não se mexe**, e um aviso oferece voltar ao topo.

- Header fixo no topo, com `ArrowLeft`, `Notificações` e `Marcar todas`, e **com o divisor de 1px `linha` na base**, porque o conteúdo rola por baixo dele. A linha de contexto rolou junto com a lista e não aparece.
- Lista rolada: no topo visível, o fim do item 5 (`Heloísa Barreto curtiu sua resenha de Torto Arado.`), depois os itens 6 a 12 da seção 3.1. O item 6 continua com o ponto `musgo`. O item 11, recomendação **sem mensagem**, fica visível, e prova que o item sem mensagem é só o texto e o tempo.
- **Aviso de notificações novas**, centralizado na horizontal, `space-3` abaixo da base do header, sobre a lista:
  - Botão em pill, 36px de altura, padding lateral `space-4`, `radius-full`, fundo `papel-elevado`, borda de 1px `linha`, `elev-2`.
  - `ArrowUp` (Phosphor, `regular`, 16px, `musgo`), `space-2`, texto em `caption` peso 600 `musgo`: `2 novas notificações`.
  - Área de toque de 48px de altura, maior que o desenho.
  - Tocar rola a lista até o topo em `dur-slow` com `ease-in-out` (instantâneo sob `prefers-reduced-motion`), onde as duas novas aparecem com o ponto `musgo`. O aviso some ao chegar ao topo, com fade em `dur-fast`, e também some se a leitora rolar até o topo sozinha.
  - O aviso **não fecha com `X`** e **não some por tempo**: ele existe enquanto houver notificação nova acima da área visível.
  - O número acumula: se chegar mais uma, o texto vira `3 novas notificações`, sem animação além da troca do número. Com uma só: `1 nova notificação`.
- **É o mesmo desenho depois de uma reconexão.** Se a conexão caiu e voltou com notificações acumuladas, elas chegam como aqui: no topo, se a leitora está no topo; com o aviso, se ela está rolada. Nada indica que houve queda.
- Barra inferior do shell com a área de origem ativa.

### Modo escuro, no fim da linha 2 (a linha do escuro), nesta ordem

#### 5.3 `Notificações · Escuro, novas notificações com a lista rolada`

Equivalente a 5.2. Fundo `noite`. Header com `ArrowLeft` e título em `papel-suave`, `Marcar todas` em `musgo-claro`, divisor da base em `linha-noite`. Itens com ícones em `grafite-claro`, texto em `papel-suave`, tempo em `grafite-fundo-escuro`, ponto de não lida em `musgo-claro`, divisores em `linha-noite`. **O aviso** tem fundo `noite-elevada`, **mais claro** que o fundo, borda de 1px `linha-noite`, `ArrowUp` e texto em `musgo-claro`, shadow `elev-2` com metade da opacidade. Barra inferior em `noite-elevada`.

---

## 6. Artboards a remover

Nenhum sai. Os doze artboards do Período 1 continuam, com as mudanças da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Padrão de tela de notificações, com header, lista, ícone contextual e ponto de não lida | documento-de-design §5.6 |
| Ação inline de abandonar leitura, textual em `rubi` | documento-de-design §5.6 |
| Botão textual e botão outline destrutivo | documento-de-design §4.1 e §7.8 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação e badge do sino | periodo-0/P0-NAV/shell-de-navegacao.md |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Aviso `N novas notificações`**: pill de 36px em `papel-elevado` com borda `linha`, `elev-2`, `ArrowUp` e texto em `musgo`, que aparece só com a lista rolada, acumula a contagem, não fecha e não some por tempo. O §5.6 não prevê chegada de notificação com a tela aberta.
2. **Entrada no topo com a lista no topo**: o item novo entra com fade e 8px de deslocamento, e a lista desce; com a lista rolada, nada se move.
3. **Linha de mensagem na notificação de recomendação**, em `body` `grafite`, no máximo duas linhas. A mesma mensagem aparece inteira em `Recomendações recebidas` e em duas linhas na seção do `Descobrir`.
4. **Ícones dos três tipos novos**: `At` para menção, `ThumbsUp` para curtida em resenha e `PaperPlaneTilt` para recomendação recebida. O §5.6 cita quatro ícones, e com estes a lista tem onze tipos.
5. **Tempo relativo `agora`**, para o que chegou há menos de 1 minuto.
6. **Regras de tempo real sem superfície própria**: badge do sino muda só o número, sem pulso; nenhuma notificação aparece como banner ou toast fora desta tela; reconexão sem indicador.
7. **Copy nova de curtida em atividade** (`curtiu que você terminou de ler`), para separar do tipo curtida em resenha.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria.

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Linha de contexto | `3 não lidas` | `6 não lidas` / `5 não lidas` (abandono confirmado) / `1 não lida` (5.1) |
| Curtida em atividade | `Dandara Lopes curtiu sua resenha de Vidas Secas.` | `Dandara Lopes curtiu que você terminou de ler Vidas Secas.` |
| Recomendação recebida, com mensagem | não existia | `Lívia Carvalho te recomendou Tudo É Rio.` |
| Mensagem da recomendação | não existia | `Terminei ontem e ainda estou pensando na Dalva.` |
| Recomendação recebida, sem mensagem | não existia | `Caio Rezende te recomendou Quarto de Despejo.` |
| Menção em comentário | não existia | `Tiago Moreira mencionou você num comentário na atividade de Rafael Okamoto.` |
| Menção em tempo real | não existia | `Renata Albuquerque mencionou você num comentário na atividade de Dandara Lopes.` |
| Curtida em resenha | não existia | `Heloísa Barreto curtiu sua resenha de Torto Arado.` |
| Curtida em resenha em tempo real | não existia | `Beatriz Okada curtiu sua resenha de Torto Arado.` |
| Tempo relativo | não existia | `agora` |
| Aviso de novas | não existia | `1 nova notificação` / `2 novas notificações` / `3 novas notificações` |
| Rótulo acessível do aviso | não existia | `2 novas notificações. Voltar ao topo da lista` |
| Vazio, texto | `Curtidas, comentários, novos seguidores e avisos das suas leituras aparecem aqui.` | `Curtidas, comentários, menções, recomendações, novos seguidores e avisos das suas leituras aparecem aqui.` |

Toda a outra copy do Período 1 continua. **A notificação diz o que aconteceu, não pede nada**: nada de `Veja agora`, `Não perca`, `Confira` nem ponto de exclamação, também nos tipos novos. Zero em-dash, zero emoji. Todo número aparece com unidade: `6 não lidas`, `2 novas notificações`, `30 dias`.

---

## 9. Acessibilidade e interação do que muda

- **Chegada em tempo real:** cada notificação nova é anunciada numa região viva **educada**, que não interrompe a leitura nem rouba o foco: `Nova notificação: Renata Albuquerque mencionou você num comentário na atividade de Dandara Lopes.` Quando várias chegam juntas, por exemplo depois de uma reconexão, o anúncio é um só: `2 novas notificações`.
- **O foco nunca se move sozinho.** A chegada de um item no topo não tira o foco do item em que ele está, e a lista rolada não salta.
- **Aviso de novas:** é um botão, com o rótulo acessível `2 novas notificações. Voltar ao topo da lista`, alvo de 48px de altura. Ao tocar, o foco vai para o primeiro item da lista.
- **Rótulo acessível dos itens novos** junta o texto, o tempo, a mensagem quando há e o estado: `Lívia Carvalho te recomendou Tudo É Rio, há 1 hora: Terminei ontem e ainda estou pensando na Dalva. Não lida.` O destino é anunciado junto da ação: `Abre a página do livro`, `Abre os comentários da atividade`, `Abre a sua resenha`.
- **O estado de não lida continua não dependendo só de cor**: o item não lido é anunciado como não lido, além do ponto.
- **O badge do sino**, nas outras telas, tem rótulo acessível com a contagem (`Notificações, 6 não lidas`) e é atualizado sem anúncio próprio, para não duplicar o anúncio desta tela.
- **Reconexão:** nada é anunciado. Queda e volta da conexão não são eventos para o leitor.
- **Contraste:** a mensagem da recomendação usa `grafite`, que passa AA no corpo; o tempo continua em `grafite-suave` e não carrega informação essencial, porque está no rótulo acessível. O aviso usa `musgo` sobre `papel-elevado` no claro e `musgo-claro` sobre `noite-elevada` no escuro.
- `prefers-reduced-motion`: a entrada do item novo, o deslocamento da lista, o fade do aviso e a rolagem até o topo viram estáticos ou instantâneos.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Header, linha de contexto, anatomia do item, leitura em risco, modal, skeleton, erro e shell ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe as telas de destino** (comentários, página do livro, página do livro pessoal) dentro deste canvas.
- **Não desenhe nenhum artboard de 1440 x 900.** Notificações estão fora do escopo do cliente web, e o `Bell` não existe na sidebar nem no header de conteúdo da web.

**Tempo real**

- **Não desenhe estado de conexão:** nada de `Reconectando`, `Você está offline`, `Conectado`, ícone de sinal, ponto verde ou banner de queda. A reconexão é silenciosa.
- **Não desenhe banner descendo do topo nem toast de notificação** em outras telas. O sino é a única porta.
- **Não anime o badge do sino** com pulso, salto, brilho ou troca de cor. Muda só o número.
- **Não empurre a lista** quando a leitora está rolada. O item novo entra acima da área visível, e o aviso oferece voltar ao topo.
- **Não feche o aviso por tempo** nem com `X`. Ele existe enquanto houver novidade acima.
- **Não marque como lida** a notificação que chegou só porque ela ficou visível. Ler continua sendo abrir, ou `Marcar todas`.
- **Não use spinner** para a chegada nem para a reconexão.

**Tipos novos**

- **Não desenhe lembrete de sequência diária.** RF-GAM-05 é Opcional, depende de push e ficou para o Período 3.
- **Não desenhe notificação de desafio** cumprido, de meta nem de estatística. Nenhum requisito as gera.
- **Não desenhe notificação de descurtida.** Descurtir não notifica.
- **Não desenhe notificação de frase, lista ou denúncia.** Nenhum requisito as gera.
- **Não ponha ações na notificação de recomendação:** nada de `Descartar`, `Adicionar à estante` ou `Responder`. Descartar mora em `Recomendações recebidas`, e a recomendação não tem aceitar nem recusar.
- **Não ponha resposta inline na menção** nem trecho do comentário. O comentário se lê no destino.
- **Não use serifa** na mensagem da recomendação, nem aspas decorativas, nem ícone de balão.
- **Não dê cor própria** a `At`, `ThumbsUp` ou `PaperPlaneTilt`. Só o `Warning` tem cor.
- **Não use `Heart` para a curtida em resenha**, nem `ThumbsUp` para a curtida em atividade.

**Específico da lista, que continua valendo**

- **Não desenhe preferências por tipo de notificação.** RF-NOT-05 é Opcional e não existe no Período 2.
- **Não desenhe push, permissão de notificação do sistema nem banner de "ative as notificações".** RF-NOT-07 é Opcional.
- **Não agrupe por dia** com cabeçalhos do tipo `Hoje` e `Esta semana`. A lista é cronológica decrescente contínua.
- **Não agrupe notificações do mesmo tipo** em `Fulano e outras 4 pessoas curtiram`, nem duas recomendações do mesmo livro num item só. Cada fato é uma notificação.
- **Não desenhe abas nem filtro por tipo.**
- **Não use fundo tingido, pill grande nem borda lateral colorida** para marcar não lida. O indicador é o ponto `musgo` de 8px.
- **Não esmaeça o item lido.** Lido é a ausência do ponto.
- **Não desenhe avatar no item.** O ícone contextual é o que distingue os tipos.
- **Não desenhe excluir notificação, arquivar nem deslizar para apagar.** Não há requisito.
- **Não desenhe `Marcar todas` quando não há não lidas.**
- **Não recarregue a lista inteira** ao carregar a próxima página nem ao receber uma notificação.
- **Não duplique aqui as ações de aceitar e recusar solicitação.**

**Específico da ação de abandonar, que continua valendo**

- **Não abandone sem confirmação.**
- **Não desenhe o botão de abandonar preenchido.** Destrutivo é textual ou outline.
- **Não ofereça só a ação destrutiva** na notificação de risco: `Registrar progresso` fica ao lado.
- **Não desenhe desfazer** depois de abandonar.
- **Não remova o item da lista** depois de abandonar: ele vira lido e informa o que foi feito.

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
- Nada de animação chamativa na chegada: sem salto, sem sacudida, sem destaque piscando no item novo.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast com fundo saturado. Toast é `papel-elevado` com barra lateral fina em `musgo` ou `rubi`, e esta tela não usa toast.
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

- Nada de número exibido sem unidade: `6 não lidas`, `2 novas notificações`.
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários: a mensagem da recomendação é de uma via e não abre conversa.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
