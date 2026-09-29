# F-REC-P2P · Recomendar livro

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-REC-P2P.md
**Requisitos:** RF-REC-01 (recomendar um livro a um ou mais leitores de uma vez, só entre perfis com seguimento mútuo), RF-REC-03 (mensagem opcional), RF-REC-06 (livro pessoal não pode ser recomendado), RF-REC-07 (bloquear o envio sem mútuo, para quem já tem o livro na estante e ao atingir o limite de RN-22)
**Não funcionais:** RNF-SEC-02 e RNF-SEC-03 (regras validadas no servidor, não só escondidas na interface), RNF-SEC-18 (limite de envios por intervalo), RNF-ERR-04 (reenviar não duplica), RNF-USA-04 (confirmação ao descartar o que foi digitado), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-22.1 (só seguimento mútuo, vários destinatários, uma recomendação independente por destinatário), RN-22.2 (mensagem opcional), RN-22.3 (bloqueio de quem já tem o livro em qualquer status, com o aviso "Fulano já tem esse livro em sua estante"), RN-22.4 (limite de 50 recomendações ativas por par), RN-22.5 e RN-15 (livro pessoal não é recomendável), RN-22.6 (sem aceitar nem recusar), RN-22.8 (o destinatário é notificado)
**Versão web:** sim. RF-REC-01 e RF-REC-03 têm marcação na coluna Web de `REQUISITOS.md` §5.13.
**De onde se chega:** o item `Recomendar a um leitor` do menu `DotsThree` da página do livro, na edição do Período 2 em [`../pagina-do-livro/pagina-do-livro.md`](../pagina-do-livro/pagina-do-livro.md). Não há outra entrada: recomendar parte sempre de um livro.

---

## 1. Contexto

A tela em que o leitor **manda um livro para amigos**. O livro já vem escolhido, porque a tela só abre a partir da página dele. O leitor escolhe **para quem**, entre os leitores com quem tem seguimento mútuo, pode escrever uma **mensagem curta** e envia. Cada destinatário recebe uma recomendação independente e uma notificação; a recomendação aparece para ele na seção `Recomendações recebidas` da aba `Descobrir`.

**O modelo é de compartilhamento, não de pedido.** A recomendação não tem aceitar nem recusar (RN-22.6). Quem recebe vê o livro, quem mandou e a mensagem, e decide sozinho se abre a página do livro ou descarta. Por isso a tela não promete resposta, não mostra "aguardando" e não abre conversa.

**De onde se chega e para onde se vai:**

- Chega pelo menu `DotsThree` da página do livro, item `Recomendar a um leitor`.
- Enviar com sucesso fecha a tela e **volta à página do livro**, com um aviso curto de confirmação.
- Fechar pelo `X` (mobile) ou por `Cancelar` (web) volta à página do livro sem enviar. Se o leitor já escolheu alguém ou escreveu algo, a volta pede confirmação.
- No estado sem mútuos, a tela oferece ir à busca de leitores, [`../../periodo-1/F-PERFIL/buscar-leitor.md`](../../periodo-1/F-PERFIL/buscar-leitor.md).

**Três coisas que a tela precisa resolver:**

- **O leitor precisa saber, antes de tocar em enviar, quem pode receber.** As regras de envio (RN-22.1, 22.3 e 22.4) são checadas pelo servidor, mas a tela já mostra o resultado: só aparecem leitores com seguimento mútuo, e quem já tem o livro ou atingiu o limite aparece **desabilitado, com o motivo escrito na própria linha**. O leitor nunca descobre um bloqueio só depois de enviar.
- **Vários destinatários de uma vez, sem virar formulário pesado.** A seleção é uma lista de pessoas com caixa de seleção e uma busca local por nome. O botão de envio diz para quantos leitores vai.
- **A mensagem é opcional de verdade.** Sem mensagem, quem recebe vê `Fulano te recomendou <livro>` (RN-22.2), e isso é uma recomendação completa. O campo não é obrigatório, não tem asterisco e não bloqueia o envio.

**Livro pessoal não chega aqui.** O livro pessoal é inacionável para terceiros (RN-15), então o menu da página do livro pessoal não oferece `Recomendar a um leitor` (RF-REC-06). Esta tela não tem estado para livro pessoal, e o servidor recusa o envio mesmo se alguém forçar a chamada. Não desenhe artboard para esse caso.

O mecanismo que a tela sustenta é **pertencimento**: é o gesto de dizer a um amigo "lê isso".

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, na ordem em que o leitor os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Recomendar livro · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
  página do livro. Fora desses três, serifa não aparece. Esta tela não tem
  serifa nenhuma: a mensagem da recomendação é texto de interface.
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
depois do erro. Na web, campo desabilitado tem fundo linha e texto
grafite-suave.
Botão médio: padding de 12 vertical e 20 horizontal, 48px de altura no mobile
e 40px na web, texto em uma linha.

SOBREPOSIÇÃO (bottom sheet e dialog)
Abaixo de 768px: bottom sheet ancorado embaixo, largura total, fundo papel no
claro e noite-elevada no escuro, radius-lg só no topo, padding space-6,
elev-3. Alça de 32 x 4px em linha (linha-noite no escuro), centralizada,
space-5 acima do conteúdo. O padding inferior soma a área segura.
A partir de 768px: dialog centrado, 480px de largura, radius-xl nos quatro
cantos, sem alça.
Scrim: #171512 a 40% no claro e preto a 60% no escuro.
O sheet sobe em dur-slow com ease-out e sai em dur-base com ease-in; o dialog
entra em dur-base com deslize curto de 16px e fade. Foco preso dentro
enquanto aberto; Esc e toque no scrim fecham; o foco volta ao elemento que
abriu. Na confirmação destrutiva o foco entra no botão de manter, nunca no
destrutivo.

TOAST
Fundo papel-elevado (noite-elevada no escuro), radius 12, elev-2, padding
space-4, barra lateral fina de 4px à esquerda: musgo para confirmação, rubi
para falha. Nunca fundo saturado verde ou vermelho.

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

**Livro recomendado** (o mesmo da página do livro de onde se chega):

| Campo | Valor |
|---|---|
| Título | Torto Arado |
| Autor | Itamar Vieira Junior |
| Editora e ano | Todavia · 2019 |
| Páginas | 264 páginas |

**Leitores com seguimento mútuo** (o leitor segue cada um e é seguido por cada um). A lista vem em **ordem alfabética pelo nome**, e os bloqueados ficam no lugar da ordem, desabilitados:

| Nome | Username | Situação para este livro |
|---|---|---|
| Beatriz Okada | `@biaokada` | **já tem o livro na estante** (está em `Quero ler`): desabilitada, RN-22.3 |
| Caio Rezende | `@caiorezende` | pode receber |
| Daniel Ferraz | `@danielferraz` | **limite atingido**: 50 recomendações ativas enviadas pelo leitor para ele, RN-22.4. É raro e está aqui para o artboard mostrar o caso |
| Henrique Sampaio | `@henriquesampaio` | pode receber |
| Júlia Figueiredo | `@juliafigueiredo` | pode receber |
| Lívia Carvalho | `@liviacarvalho` | pode receber |
| Paula Nascimento | `@paulanasc` | pode receber |
| Renato Matsuda | `@renatomatsuda` | pode receber |

Oito leitores no total, seis que podem receber. O status da estante do destinatário **não aparece** na tela: a linha diz só que a pessoa já tem o livro, sem dizer se é `Lendo`, `Lido` ou outro.

**Seleção dos artboards de envio:** `Júlia Figueiredo` e `Caio Rezende`.

**Mensagem de exemplo:** `Lembrei de você no capítulo da Belonísia. Me conta o que achou.` (63 caracteres).

**Limite de caracteres da mensagem:** **ainda não está no contrato** (decisão do dono registrada no arquivo da feature). O protótipo usa **280 caracteres como valor provisório** para desenhar o contador; o número é mock e precisa ser confirmado antes da implementação.

**Busca de 4.3:** o leitor digitou `ca`. A busca olha nome e username, sem diferenciar maiúscula nem acento. Resultado: `Caio Rezende` e `Lívia Carvalho`.

**Envio em parte de 4.9:** o servidor criou a recomendação para `Júlia Figueiredo`, mas recusou `Caio Rezende`, que pôs `Torto Arado` na estante entre a abertura da tela e o envio.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell do produto, **com uma exceção declarada**: a barra inferior de navegação **não aparece** enquanto a tela está aberta, porque é um fluxo com envio e a saída é pelo botão de fechar. É o mesmo tratamento da tela de escrever resenha. Em lugar dela, a tela tem uma **barra de envio** fixa no rodapé.

Para referência, a barra inferior que **fica escondida** aqui, e que reaparece na página do livro de 4.12: fixa no rodapé, 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, quatro itens de largura igual (`Estante` com `Books`, `Descobrir` com `Compass`, `Feed` com `Newspaper`, `Perfil` com `UserCircle`), ícone de 24px acima e rótulo em `caption` abaixo; inativo em `regular` `grafite`, ativo em `fill` `musgo` com rótulo peso 600. Na página do livro de 4.12, o item ativo é o da área de origem, `Descobrir`.

### Header desta tela

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, divisor de 1px `linha` na base apenas quando o conteúdo rola por baixo dele.
- `X` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px. Fecha a tela e volta à página do livro. Rótulo acessível `Fechar`.
- Título `Recomendar` em `title` `tinta`, centralizado. Aqui o título é `title` e não `display`, porque a tela é um fluxo modal, como a de escrever resenha.
- **Sem sino nesta tela.** O leitor está no meio de um envio; a notificação espera. Nada à direita.

### Estrutura do conteúdo

Padding lateral `space-5`. O conteúdo rola entre o header e a barra de envio. De cima para baixo:

**1. Card do livro** (card de livro, variante Confirmação, design §4.5), `space-4` abaixo do header:

- Card em `papel-elevado`, `radius-md` 16, padding `space-5`, sem sombra.
- Capa de 60 por 90px à esquerda, retângulo de **canto vivo**, sem raio.
- `space-4` de gap, e à direita: `Torto Arado` em `title-sm` `tinta` (no máximo duas linhas), `Itamar Vieira Junior` em `body` `grafite`, `Todavia · 2019` e `264 páginas` em `caption` `grafite-suave`, uma linha cada.
- Sem nota, sem status, sem ação dentro do card. **O livro não é trocável aqui**: para recomendar outro, o leitor sai e abre a página do outro livro.

**2. Mensagem**, `space-6` abaixo do card:

- Label `Mensagem (opcional)` em `label` `grafite`, `space-2` acima do campo.
- Área de texto de três linhas visíveis (altura de 96px), largura total, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, padding `space-3 space-4`, texto em `body` `tinta`. Cresce até cinco linhas e depois rola por dentro.
- Placeholder em `grafite-suave`: `Conte por que esse livro combina com a pessoa`. Ele não substitui o label.
- Abaixo do campo, `space-2`, uma linha com dois textos: à esquerda o helper em `caption` `grafite`, visível sempre, `Todos os escolhidos recebem a mesma mensagem.`; à direita o contador em `caption` `grafite`, com os números em JetBrains Mono: `0 de 280 caracteres`.
- Ao passar do limite, o contador vira `rubi`, a borda do campo fica em 1.5px `rubi` e, no lugar do helper, em `caption` `rubi`: `A mensagem passou do limite de 280 caracteres.` O botão de envio fica desabilitado. Este caso não tem artboard próprio.
- Foco: borda de 1.5px `musgo`, transição `dur-fast`.

**3. Para quem**, `space-6` abaixo da mensagem:

- Cabeçalho do bloco em uma linha: `Para quem` em `title-sm` `tinta` à esquerda e, à direita, a contagem de escolhidos em `caption` `grafite`: `Nenhum escolhido`, `1 escolhido`, `2 escolhidos`.
- `space-2` abaixo, texto em `caption` `grafite`: `Aparecem aqui os leitores que você segue e que seguem você.` É a regra de RN-22.1 escrita onde ela vale.
- `space-4` abaixo, **campo de busca local**: label `Buscar entre eles` em `label` `grafite`, campo de 48px, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, `MagnifyingGlass` (Phosphor, `regular`, 20px, `grafite-suave`) dentro à esquerda com `space-3` de gap, placeholder `Nome ou @username`. Com texto, `X` (Phosphor, `regular`, 20px, `grafite`) à direita, alvo de 48px, limpa a busca. A busca filtra a lista enquanto se digita, só entre os mútuos já carregados; não busca outras pessoas no produto e não sugere nada.
- `space-3` abaixo, a **lista de leitores**, separada por divisor de 1px `linha`, sem card em volta.

**Linha de leitor** (nasce aqui, ver seção 7):

- Altura mínima de 64px, padding vertical `space-3`. **A linha inteira é o alvo de toque** e alterna a seleção.
- Avatar circular de 40px à esquerda, `space-3` de gap.
- No meio, empilhados: nome em `body-strong` `tinta`, `@username` em `caption` `grafite-suave`.
- À direita, a **caixa de seleção**: quadrado de 24px, `radius-sm` 6, centralizado verticalmente.
  - Desmarcada: borda de 1.5px `grafite`, fundo transparente.
  - Marcada: fundo `musgo`, sem borda, `Check` (Phosphor, `bold`, 16px, `papel`) centralizado. A troca acontece em `dur-fast`.
- **Linha desabilitada** (quem já tem o livro ou atingiu o limite):
  - Avatar com opacidade de 50%, nome em `body-strong` `grafite`, `@username` escondido para dar lugar ao motivo.
  - No lugar do `@username`, o **motivo em `caption` `grafite`**, com ícone de 16px à esquerda e `space-1` de gap:
    - Já tem o livro: `BookmarkSimple` (Phosphor, `regular`, 16px, `grafite`) e `Já tem esse livro em sua estante`.
    - Limite atingido: `Prohibit` (Phosphor, `regular`, 16px, `grafite`) e `Limite de recomendações para esta pessoa`.
  - No lugar da caixa, **nada**: sem caixa cinza, sem cadeado. A linha não reage ao toque.
  - O motivo é escrito em `grafite`, e não em `grafite-suave`, porque é informação essencial e precisa passar em contraste AA.

### Barra de envio

Fixa no rodapé da viewport, acima da área segura, no lugar da barra de navegação:

- Fundo `papel`, divisor de 1px `linha` no topo, padding `space-4 space-5`, mais a área segura.
- Botão primário pill de largura total, 48px, fundo `musgo`, texto `papel` em `body-strong`, com `PaperPlaneTilt` (Phosphor, `regular`, 20px, `papel`) à esquerda do texto e `space-2` de gap.
- O rótulo diz para quantos vai: sem ninguém escolhido, `Enviar recomendação`; com um, `Enviar para 1 leitor`; com mais, `Enviar para 2 leitores`.
- **Desabilitado** enquanto ninguém estiver escolhido ou a mensagem passar do limite: fundo `linha`, texto e ícone `grafite-suave`.
- Com o teclado aberto, a barra sobe junto e fica acima dele.

### 4.1 Padrão

O leitor acabou de abrir a tela. Nada escolhido, mensagem vazia.

- Header, card do livro, campo de mensagem vazio com o contador em `0 de 280 caracteres`.
- `Para quem` com `Nenhum escolhido`, o texto da regra e a busca vazia.
- A lista começa: `Beatriz Okada` **desabilitada** com `Já tem esse livro em sua estante`, `Caio Rezende` desmarcado, `Daniel Ferraz` **desabilitado** com `Limite de recomendações para esta pessoa`, `Henrique Sampaio` desmarcado. O resto da lista continua abaixo da borda, por baixo da barra de envio.
- Barra de envio com `Enviar recomendação` **desabilitado**.
- **Nada vem pré-selecionado** e o teclado não sobe sozinho.

### 4.2 Leitores escolhidos e mensagem

A tela rolada até o meio da lista, depois de escrever a mensagem e marcar duas pessoas.

- O card do livro saiu pela borda superior; o header ganhou o divisor `linha`.
- No topo visível, o fim do campo de mensagem com `Lembrei de você no capítulo da Belonísia. Me conta o que achou.` e o contador `63 de 280 caracteres`.
- `Para quem` com `2 escolhidos`.
- Na lista: `Caio Rezende` **marcado**, `Daniel Ferraz` desabilitado, `Henrique Sampaio` desmarcado, `Júlia Figueiredo` **marcada**, `Lívia Carvalho` desmarcada.
- Barra de envio com `Enviar para 2 leitores`, habilitado.

### 4.3 Busca entre os leitores

- Campo de busca com `ca`, com o `X` de limpar e o foco (borda de 1.5px `musgo`). Teclado aberto cobrindo a parte de baixo, com a barra de envio acima dele.
- Lista filtrada: `Caio Rezende` **marcado** e `Lívia Carvalho` desmarcada. A marcação feita antes da busca **continua valendo**: `Júlia Figueiredo` segue escolhida mesmo fora do filtro, e o cabeçalho continua dizendo `2 escolhidos`.
- Barra de envio com `Enviar para 2 leitores`.
- **Busca sem resultado** não ganha artboard: no lugar da lista, uma linha em `body` `grafite`, alinhada à esquerda, `Ninguém com esse nome entre os leitores que você segue e que seguem você.`

### 4.4 Carregando leitores

A lista de mútuos ainda não chegou. O card do livro já está pronto, porque veio da página do livro.

- Header, card do livro e campo de mensagem reais e utilizáveis.
- `Para quem` com o texto da regra; a contagem e o campo de busca ainda não aparecem.
- No lugar da lista, **quatro linhas de skeleton estático** com a forma da linha de leitor: círculo de 40px em `capa-placeholder`, duas barras em `capa-placeholder` com `radius-sm` (larguras de 45% e 30%, alturas de 15px e 13px, `space-2` entre elas) e um quadrado de 24px em `capa-placeholder` à direita. Divisor `linha` entre elas.
- Um único fade de entrada em `dur-base` com `ease-out`. Sem shimmer, sem spinner. É também o estado do cold start (RNF-ERR-09): se passar de três segundos, abaixo do skeleton aparece em `caption` `grafite`: `O serviço está iniciando. Isso pode levar alguns segundos.`
- Barra de envio com `Enviar recomendação` desabilitado.

### 4.5 Erro ao carregar leitores

- Header, card do livro e mensagem reais.
- `Para quem` com o texto da regra.
- No lugar da lista, banner inline de largura total: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda com `space-3` de gap, texto em `body` `tinta`: `Não foi possível carregar seus leitores. Verifique sua conexão e tente de novo.` Abaixo do texto, botão textual `musgo`: `Tentar de novo`.
- A mensagem digitada, se houver, não se perde.
- Barra de envio desabilitada.

### 4.6 Sem seguimento mútuo

O leitor ainda não tem ninguém com quem trocar recomendações: não segue ninguém que o siga de volta.

- Header e card do livro reais. **Sem campo de mensagem, sem bloco `Para quem`, sem barra de envio**: não há o que enviar.
- Abaixo do card, bloco centralizado no espaço restante, com `space-6` entre os elementos:
  - `UsersThree` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Ninguém para recomendar ainda`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 300px: `Recomendações são trocadas entre leitores que se seguem. Quando alguém que você segue seguir você de volta, essa pessoa aparece aqui.`
  - Botão primário pill, 48px, fundo `musgo`, texto `papel`: `Buscar leitores`. Leva à busca por username.
- Sem ilustração, sem avatares fantasmas, sem lista de sugestões de pessoas.

### 4.7 Enviando

Depois do toque em `Enviar para 2 leitores` com o estado de 4.2.

- Campo de mensagem, busca e caixas de seleção **desabilitados**: as marcações continuam visíveis em `musgo`, os textos das linhas ficam como estão, e o toque não muda nada.
- O `X` do header continua visível mas não fecha enquanto envia.
- Barra de envio com o texto `Enviando recomendação`, em `musgo` pleno, sem spinner e sem esmaecer.
- Se o servidor demorar além de três segundos, acima do botão, em `caption` `grafite`, centralizado: `O serviço está iniciando. Isso pode levar alguns segundos.`

### 4.8 Falha no envio

O servidor não respondeu. Nada foi enviado. **Tudo o que foi escolhido e digitado continua na tela.**

- Tela rolada como em 4.2.
- Logo abaixo do header, fixo no topo do conteúdo, banner inline de largura total menos o padding lateral: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (20px, `rubi`), texto em `body` `tinta`: `Não foi possível enviar a recomendação. Verifique sua conexão e tente de novo.`
- Barra de envio de volta a `Enviar para 2 leitores`, habilitada. Tocar de novo reenvia **a mesma solicitação** (RNF-ERR-04): se a primeira tiver chegado ao servidor, ninguém recebe duas vezes.

### 4.9 Envio em parte

O servidor avalia **cada destinatário separadamente**. Aqui a recomendação chegou a `Júlia Figueiredo`, mas foi recusada para `Caio Rezende`, que pôs o livro na estante depois que a tela abriu. **O comportamento de falha parcial ainda é decisão do dono da feature**; este artboard mostra a proposta.

- A tela **não fecha**, porque ainda há algo a dizer.
- Logo abaixo do header, faixa de alerta de largura total menos o padding lateral: fundo `ambar-fundo`, `radius` 12, padding `space-4`, `Info` (Phosphor, `regular`, 20px, `tinta`) à esquerda com `space-3` de gap, texto em `body` `tinta`, em duas frases: `Recomendação enviada para Júlia Figueiredo. Caio Rezende já tem esse livro em sua estante e não recebeu.` A segunda frase é o aviso literal de RN-22.3.
- Na lista:
  - `Júlia Figueiredo` sem caixa de seleção: no lugar da caixa, `Check` (Phosphor, `bold`, 20px, `musgo`), e no lugar do `@username`, em `caption` `musgo` peso 600, `Recomendação enviada`. A linha não reage ao toque.
  - `Caio Rezende` passa a **desabilitado**, com `Já tem esse livro em sua estante`, e sai da contagem.
  - Os demais como estavam.
- `Para quem` com `Nenhum escolhido`.
- Barra de envio: o primário vira `Concluir`, habilitado, sem ícone, e fecha a tela de volta à página do livro. Se o leitor marcar outra pessoa, o botão volta a `Enviar para 1 leitor`.
- A mesma forma vale quando o motivo é o limite: `Daniel Ferraz atingiu o limite de recomendações suas e não recebeu.`

### 4.10 Muitas recomendações em pouco tempo

O servidor recusou o envio pelo limite de frequência (RNF-SEC-18). Nada foi enviado.

- Estado de 4.2 por baixo.
- Logo abaixo do header, faixa de alerta: fundo `ambar-fundo`, `radius` 12, padding `space-4`, `Clock` (Phosphor, `regular`, 20px, `tinta`), texto em `body` `tinta`: `Você enviou muitas recomendações em pouco tempo. Espere alguns minutos e tente de novo.`
- Seleção e mensagem preservadas. Barra de envio com `Enviar para 2 leitores` habilitado. O tempo de espera **não é exibido** porque o contrato ainda não diz se o servidor informa quanto falta.

### 4.11 Descartar a recomendação?

O leitor tocou no `X` do header com duas pessoas escolhidas e a mensagem escrita. Bottom sheet de confirmação (design §4.11) sobre o estado de 4.2, escurecido pelo scrim `#171512` a 40%.

1. Alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo.
2. Título em `title-sm` `tinta`: `Descartar esta recomendação?`
3. `space-3`, texto em `body` `grafite`: `A mensagem e os leitores escolhidos não serão guardados. Ninguém recebe nada.`
4. `space-6`, botão destrutivo em **outline** `rubi` (borda de 1px `rubi`, texto `rubi`, fundo transparente, `radius` 12), largura total, 48px: `Descartar`.
5. `space-3`, botão textual `grafite`, largura total: `Continuar editando`.

O foco entra em `Continuar editando`. Sem nada escolhido e sem mensagem, o `X` fecha direto, sem esta pergunta.

### 4.12 Recomendação enviada

O envio de 4.2 deu certo para os dois. A tela fechou e o leitor está de volta à **página do livro**.

- Base: o topo da página do livro `Torto Arado`, como no artboard `Padrão, leitura em andamento` daquele canvas, com a barra inferior de volta.
- **Toast** acima da barra inferior, com `space-4` de margem lateral: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, **barra lateral de 4px em `musgo`** à esquerda, `PaperPlaneTilt` (Phosphor, `regular`, 20px, `musgo`) e o texto em `body` `tinta`: `Recomendação enviada para Júlia Figueiredo e Caio Rezende.` À direita, `X` (Phosphor, `regular`, 20px, `grafite`) com alvo de 48px, rótulo acessível `Fechar aviso`.
- Com três ou mais destinatários: `Recomendação enviada para 3 leitores.`
- O toast entra de baixo em `dur-base` com `ease-out` e sai em `dur-base` com `ease-in`. É a única confirmação possível, porque o que foi enviado não aparece para quem enviou. **A duração de permanência não está definida** no documento de design; o artboard mostra o toast parado.
- Sem tela de sucesso, sem confete, sem ilustração.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

**A partir de 768px a tela é um dialog centrado** (design §4.11) sobre a página do livro, e não uma página própria: o livro continua visível atrás do scrim, e fechar devolve o leitor exatamente onde estava.

**Base de todos os artboards web:** a página do livro `Torto Arado` na web, com a sidebar do shell à esquerda, sob o scrim `#171512` a 40%. A sidebar: coluna fixa de 248px, fundo `papel-elevado`, borda direita de 1px `linha`, bloco do topo de 72px com o lockup horizontal da marca em `musgo` (24px de altura) e `SidebarSimple` (20px, `grafite`) à direita; os quatro itens (`Estante`, `Descobrir`, `Feed`, `Perfil`) com 44px, `radius` 12, ícone de 20px e rótulo em `body-strong`; ativo com fundo `musgo-fundo`, ícone `fill` e rótulo `musgo`. Item ativo: **Descobrir**. **Sem sino na web**: notificações estão fora do escopo do cliente web.

**Dialog:**

- 480px de largura, fundo `papel`, `radius-xl` 24 nos quatro cantos, `elev-3`, sem alça. Altura máxima de 760px; o que não cabe rola **dentro** do corpo do dialog, com cabeçalho e rodapé fixos.
- **Cabeçalho**, padding `space-6`, `space-4` abaixo: título `Recomendar a um leitor` em `title` `tinta` à esquerda e `X` (Phosphor, `regular`, 20px, `grafite`) à direita, com área de clique de 40px e rótulo acessível `Fechar`.
- **Corpo**, padding lateral `space-6`, na mesma ordem do mobile:
  - Linha compacta do livro, sem card: capa de 48 por 72px de canto vivo, `space-4` de gap, `Torto Arado` em `title-sm` `tinta` e `Itamar Vieira Junior` em `caption` `grafite`. Divisor `linha` abaixo, `space-4` de respiro.
  - `Mensagem (opcional)` com a área de texto de três linhas, helper e contador, iguais ao mobile.
  - `Para quem` com a contagem, o texto da regra, a busca de 44px e a lista de leitores. As linhas têm 56px de altura mínima, avatar de 40px e a caixa de seleção de 20px à direita.
  - `hover` na linha habilitada: fundo `papel-elevado`, transição `dur-fast`. Linha desabilitada não tem hover e o cursor fica padrão.
- **Rodapé**, padding `space-6`, divisor `linha` no topo apenas quando o corpo rola por baixo: botões alinhados à direita, `space-3` entre eles, `Cancelar` textual `grafite` primeiro e o primário pill de 40px com `PaperPlaneTilt` e o rótulo com a contagem (`Enviar para 2 leitores`).
- Foco de teclado visível em todo elemento interativo, com contorno de 2px `musgo` e offset de 2px. `Esc` e clique no scrim fecham, com a mesma confirmação de 4.11 quando há algo escolhido ou digitado.
- **Abaixo de 768px** o dialog vira a tela cheia do mobile, com o header de `X` e a barra de envio no rodapé.

### 5.1 Leitores escolhidos, com hover

- Mensagem preenchida com o texto de exemplo e `63 de 280 caracteres`.
- `Para quem` com `2 escolhidos`, busca vazia.
- Lista visível: `Beatriz Okada` desabilitada, `Caio Rezende` marcado, `Daniel Ferraz` desabilitado, `Henrique Sampaio` **em hover** (fundo `papel-elevado`, cursor de ponteiro), `Júlia Figueiredo` marcada, `Lívia Carvalho` desmarcada. O resto está abaixo, alcançável pela rolagem interna do corpo, e o rodapé mostra o divisor.
- Rodapé com `Cancelar` e `Enviar para 2 leitores`.

### 5.2 Envio em parte

Equivalente a 4.9, dentro do dialog.

- No topo do corpo, abaixo do cabeçalho, a faixa `ambar-fundo` com `Recomendação enviada para Júlia Figueiredo. Caio Rezende já tem esse livro em sua estante e não recebeu.`
- `Júlia Figueiredo` com `Check` `musgo` e `Recomendação enviada`; `Caio Rezende` desabilitado com `Já tem esse livro em sua estante`.
- Rodapé com um único botão, primário pill de 40px, `Concluir`, à direita.

### 5.3 Sem seguimento mútuo

- Dialog com o cabeçalho, a linha compacta do livro e, abaixo, o bloco de 4.6 centralizado no corpo, com `UsersThree` de 32px, título, texto e o primário pill de 40px `Buscar leitores`.
- **Sem rodapé**: não há o que enviar. O `X` fecha.

### 5.4 Recomendação enviada

- O dialog fechou. A página do livro está sem scrim, com a sidebar e o **Descobrir** ativo.
- Toast no canto inferior esquerdo da área de conteúdo, `space-8` da borda esquerda do conteúdo e `space-8` da borda inferior, largura de 400px, com o mesmo desenho de 4.12: fundo `papel-elevado`, barra lateral de 4px `musgo`, `PaperPlaneTilt` `musgo`, texto `Recomendação enviada para Júlia Figueiredo e Caio Rezende.` e `X` para fechar.
- O foco volta ao `DotsThree` da página do livro, que abriu o menu.

---

## 6. Artboards em modo escuro

Lock de página inteira. Superfície elevada **mais clara** que o fundo, `musgo-claro` como acento, shadows com metade da opacidade: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

### 6.1 Leitores escolhidos e mensagem (mobile)

Equivalente a 4.2.

- Fundo `noite`. Header em `noite`, `X` e título em `papel-suave`, divisor `linha-noite`.
- Campo de mensagem com fundo `noite-elevada` e borda `linha-noite`, texto em `papel-suave`, label, helper e contador em `grafite-claro`, placeholder em `grafite-fundo-escuro`.
- `Para quem` em `papel-suave`, contagem e texto da regra em `grafite-claro`. Busca em `noite-elevada` com borda `linha-noite`.
- Linhas: nome em `papel-suave`, `@username` em `grafite-fundo-escuro`, divisor `linha-noite`. Caixa desmarcada com borda de 1.5px `grafite-claro`; marcada com fundo `musgo-claro` e `Check` em `noite`. Linha desabilitada com nome e motivo em `grafite-claro` e avatar a 50%.
- Barra de envio com fundo `noite` e divisor `linha-noite`; primário com fundo `musgo-claro` e texto e ícone em `noite`.

### 6.2 Leitores escolhidos (web)

Equivalente a 5.1. Página do livro atrás em `noite`, sidebar em `noite-elevada` com **Descobrir** ativo em `musgo-fundo-escuro`, tudo sob o scrim preto a 60%. Dialog em `noite-elevada`, **mais claro** que o fundo, com campos em `noite` e borda `linha-noite` para contrastar com o dialog. Hover da linha em `linha-noite`. `Cancelar` em `grafite-claro`, primário em `musgo-claro` com texto `noite`.

### 6.3 Envio em parte (mobile)

Equivalente a 4.9. Faixa de alerta com fundo `ambar-fundo-escuro`, ícone e texto em `papel-suave`. `Check` e `Recomendação enviada` em `musgo-claro`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Card de livro, variante Confirmação | documento-de-design §4.5 |
| Botão primário pill, textual e destrutivo em outline | documento-de-design §4.1 |
| Input e área de texto com label, foco, erro e helper | documento-de-design §4.2 |
| Bottom sheet de confirmação destrutiva e dialog centrado | documento-de-design §4.11 |
| Faixa informativa com ícone | documento-de-design §4.15 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6 |
| Banner inline de erro | nasceu no Período 1, usado em `descobrir.md` e `criar-desafio.md` |
| Header de fluxo com `X` e título `title`, sem barra inferior | nasceu em `periodo-1/F-AVA/escrever-resenha.md`, incorporação pendente |
| Avatar, nome e `@username` do item de pessoa | nasceu em `periodo-1/F-PERFIL/buscar-leitor.md`, incorporação pendente |
| Shell (barra inferior e sidebar) | shell, `periodo-0/P0-NAV/shell-de-navegacao.md` |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3, não ficam decididos só neste prompt:

1. **Seletor de destinatários:** linha de pessoa com caixa de seleção à direita (24px no mobile, 20px na web, `radius-sm`, marcada em `musgo` com `Check` `bold`), a linha inteira como alvo, e busca local acima da lista.
2. **Linha de pessoa desabilitada com motivo:** avatar a 50%, nome em `grafite`, motivo com ícone de 16px no lugar do `@username`, sem caixa.
3. **Linha de pessoa com envio concluído:** `Check` `musgo` no lugar da caixa e `Recomendação enviada` no lugar do `@username`.
4. **Barra de envio fixa no rodapé** com o primário de largura total e o rótulo com a contagem (`Enviar para 2 leitores`).
5. **Contador de caracteres na mesma linha do helper**, à direita.
6. **Faixa de alerta em `ambar-fundo`** para resultado parcial e limite de frequência. O §4.15 define a faixa neutra em `musgo-fundo`; a variante de alerta não está na fonte.
7. **Toast de confirmação com ícone**, posicionado acima da barra inferior no mobile e no canto inferior esquerdo do conteúdo na web. O §7.6 define a aparência, mas não a posição nem a duração.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Header mobile | `Recomendar` |
| Título do dialog web | `Recomendar a um leitor` |
| Rótulo acessível do fechar | `Fechar` |
| Card do livro | `Torto Arado`, `Itamar Vieira Junior`, `Todavia · 2019`, `264 páginas` |
| Label da mensagem | `Mensagem (opcional)` |
| Placeholder da mensagem | `Conte por que esse livro combina com a pessoa` |
| Helper da mensagem | `Todos os escolhidos recebem a mesma mensagem.` |
| Contador | `0 de 280 caracteres`, `63 de 280 caracteres` |
| Erro de limite da mensagem | `A mensagem passou do limite de 280 caracteres.` |
| Título do bloco | `Para quem` |
| Contagem de escolhidos | `Nenhum escolhido`, `1 escolhido`, `2 escolhidos` |
| Regra do bloco | `Aparecem aqui os leitores que você segue e que seguem você.` |
| Label da busca | `Buscar entre eles` |
| Placeholder da busca | `Nome ou @username` |
| Busca sem resultado | `Ninguém com esse nome entre os leitores que você segue e que seguem você.` |
| Motivo, já tem o livro | `Já tem esse livro em sua estante` |
| Motivo, limite | `Limite de recomendações para esta pessoa` |
| Envio concluído na linha | `Recomendação enviada` |
| Botão de envio | `Enviar recomendação`, `Enviar para 1 leitor`, `Enviar para 2 leitores` |
| Botão enviando | `Enviando recomendação` |
| Botão depois do envio em parte | `Concluir` |
| Botão secundário da web | `Cancelar` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro ao carregar leitores | `Não foi possível carregar seus leitores. Verifique sua conexão e tente de novo.` |
| Ação do erro | `Tentar de novo` |
| Falha no envio | `Não foi possível enviar a recomendação. Verifique sua conexão e tente de novo.` |
| Envio em parte, já tem o livro | `Recomendação enviada para Júlia Figueiredo. Caio Rezende já tem esse livro em sua estante e não recebeu.` |
| Envio em parte, limite | `Daniel Ferraz atingiu o limite de recomendações suas e não recebeu.` |
| Limite de frequência | `Você enviou muitas recomendações em pouco tempo. Espere alguns minutos e tente de novo.` |
| Sem mútuo, título | `Ninguém para recomendar ainda` |
| Sem mútuo, texto | `Recomendações são trocadas entre leitores que se seguem. Quando alguém que você segue seguir você de volta, essa pessoa aparece aqui.` |
| Sem mútuo, ação | `Buscar leitores` |
| Confirmação, título | `Descartar esta recomendação?` |
| Confirmação, texto | `A mensagem e os leitores escolhidos não serão guardados. Ninguém recebe nada.` |
| Confirmação, destrutivo | `Descartar` |
| Confirmação, manter | `Continuar editando` |
| Toast, até dois | `Recomendação enviada para Júlia Figueiredo e Caio Rezende.` |
| Toast, três ou mais | `Recomendação enviada para 3 leitores.` |
| Toast, rótulo acessível do fechar | `Fechar aviso` |

Zero em-dash, zero emoji, nenhum número sem unidade. O ponto médio entre editora e ano é separador de metadado, e não travessão.

---

## 9. Acessibilidade e interação

- **Contraste:** nome, motivo de bloqueio e contagem em `tinta` ou `grafite`, que passam em AA no corpo. `grafite-suave` fica só no `@username` e no placeholder, que não carregam informação essencial: o motivo de bloqueio nunca usa `grafite-suave`.
- **Alvos:** cada linha de leitor tem no mínimo 64px de altura no mobile e é inteira tocável; o `X` do header, o `X` da busca e o `X` do toast têm 48px de alvo. Na web, linhas de 56px.
- **Seleção sem depender de cor:** a caixa marcada muda de forma (preenchida com `Check`), não só de cor. Cada linha é um controle de caixa de seleção com rótulo acessível que junta nome e username: `Júlia Figueiredo, @juliafigueiredo, selecionada`. A linha desabilitada é anunciada com o motivo: `Beatriz Okada, já tem esse livro em sua estante, indisponível`.
- **Contagens anunciadas:** a mudança de `2 escolhidos`, o contador de caracteres ao passar do limite e o rótulo do botão de envio são anunciados por leitor de tela quando mudam.
- **Resultado do envio:** a faixa de envio em parte, a faixa de limite de frequência, o banner de falha e o toast de confirmação são regiões anunciadas quando aparecem. O toast não rouba o foco.
- **Foco:** ao abrir, o foco vai para o título (`Recomendar` no mobile, `Recomendar a um leitor` na web), não para o campo de mensagem, para o teclado não subir sozinho. No dialog, o foco fica preso até fechar e volta ao `DotsThree` que abriu o menu.
- **Ordem de tabulação na web:** fechar, mensagem, busca, linhas da lista na ordem visual, `Cancelar`, envio. Espaço marca e desmarca a linha em foco.
- **Confirmação:** fechar com algo escolhido ou digitado pede confirmação em modal (RNF-USA-04), com o foco em `Continuar editando` e o destrutivo em outline `rubi`. Nada é descartado em silêncio.
- **Reenvio seguro:** tocar em enviar de novo depois de uma falha repete a mesma solicitação, sem duplicar para quem já recebeu (RNF-ERR-04).
- **Motion:** sheet, dialog, toast e a troca da caixa respeitam `prefers-reduced-motion`: sob reduce, aparecem e somem sem deslizar.
- **Teclado do aparelho:** a barra de envio acompanha o teclado e continua alcançável com ele aberto.

---

## 10. O que não fazer nesta tela

**Recomendação**

- Não desenhe `Aceitar`, `Recusar`, "aguardando resposta" nem qualquer estado de pedido. Recomendação é compartilhamento, não solicitação.
- Não desenhe conversa, resposta, histórico de mensagens nem "responder" dentro da tela. A mensagem é opcional, de uma via, e não abre chat.
- Não liste pessoas sem seguimento mútuo, nem seguidores de mão única, nem sugestões de pessoas para seguir. A busca desta tela só filtra os mútuos já carregados.
- Não esconda quem já tem o livro ou atingiu o limite: mostre a pessoa desabilitada, com o motivo escrito na linha.
- Não mostre o status da estante do destinatário (`Lendo`, `Lido` etc.): a linha diz só que a pessoa já tem o livro.
- Não mostre quantas recomendações faltam para o limite, nem contador de `48 de 50`.
- Não deixe o leitor trocar de livro nesta tela, nem desenhe seletor de livro.
- Não desenhe estado para livro pessoal: a entrada não existe no menu do livro pessoal.
- Não pré-selecione ninguém e não desenhe `Selecionar todos`.
- Não mostre, depois de enviar, uma lista de "recomendações enviadas": o produto não tem essa tela.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela, nem na mensagem: ela é texto de interface, não resenha nem frase de livro.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela, e esta não precisa de nenhum.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.
- Nada de acento fora do `musgo`: a caixa marcada, o botão de envio e o `Check` de enviado são `musgo`. `ambar` só nas faixas de alerta, `rubi` só em erro e no destrutivo.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.
- Nada de avião de papel voando, confete ou animação de comemoração ao enviar.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface, nem na mensagem de exemplo.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. `Para quem`, não "Quem vai amar esse livro?". `Recomendar`, não "Espalhe a leitura".
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de placeholder de capa com livro genérico ilustrado.
- Nada de toast com fundo saturado verde ou vermelho. Toast é `papel-elevado` com barra lateral fina.
- Nada de botão destrutivo preenchido. `Descartar` é outline `rubi`.
- Nada de chips de pessoas escolhidas empilhados acima da lista: a contagem no cabeçalho e as caixas marcadas bastam.

**Formulários**

- Nada de placeholder no lugar do label. Label sempre acima do campo.
- Nada de helper que só aparece depois do erro. O helper da mensagem e o contador são visíveis o tempo todo.
- Nada de asterisco ou "obrigatório" na mensagem: ela é opcional.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de página própria de recomendar na web: é dialog sobre a página do livro.
- Nada de dialog mais largo que 480px nem de lista em duas colunas dentro dele.
- Nada de conteúdo essencial escondido em hover. O motivo de bloqueio está sempre visível.
- Nada de layout que não colapse para a tela cheia do mobile abaixo de 768px.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de hero, logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos por recomendar.
- Sem ranking de leitores que mais recomendam.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns: não existe "recomendar para um grupo".
- Sem login social e sem compartilhamento para outras redes.
- Sem leitura de e-book dentro do aplicativo.
- Sem recomendação algorítmica: esta tela é só a recomendação entre leitores.
