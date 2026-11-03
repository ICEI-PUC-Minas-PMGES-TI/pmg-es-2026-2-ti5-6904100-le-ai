# F-GAM-OPC · Meu perfil (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Meu perfil`, o canvas que resultou de `docs/design/periodo-2/meu-perfil/meu-perfil.md` (que por sua vez editou `docs/design/periodo-1/F-PERFIL/meu-perfil.md`). Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/meu-perfil/meu-perfil.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-GAM-OPC.md
**Requisitos que entram:**
- F-GAM-OPC: RF-GAM-04 (visualizar em calendário quais dias recentes tiveram registro de progresso). Aqui entra só o **ponto de entrada**: o componente de sequência do perfil passa a abrir o calendário. O calendário em si é outro prompt.

**Não funcionais:** RNF-SEC-02 (a sequência e o calendário são dados do próprio leitor), RNF-USA-03 (contraste WCAG AA), RNF-USA-04 (alvo de toque e estado de interação visíveis)
**Regras de negócio:** RN-18 (sequência em dias com leitura; o calendário mostra os mesmos dias que formam o número)
**Versão web:** **não muda.** RF-GAM-04 está fora do escopo do cliente web (`REQUISITOS.md` §2.1: gamificação não faz parte do cliente Vue), e a sequência já não existe nos artboards web deste canvas. Nenhum artboard de 1440 x 900 é alterado nem criado.
**Destino desenhado em outro prompt:** o calendário de sequência, em `docs/design/periodo-3/F-GAM-OPC/calendario-de-sequencia.md` (tela de detalhe com header `ArrowLeft`, título `Sequência` e `Bell`, aba **Perfil** ativa). Aqui só existe a navegação até ele.

---

## 1. O que muda e por quê

No Período 2 o componente de sequência diária entrou no perfil **sem ação**: o prompt anterior dizia que não havia calendário até o Período 3 e proibia `CaretRight` e toque. O Período 3 traz o calendário (RF-GAM-04), e o ponto de entrada decidido é **o próprio componente de sequência**: o leitor toca no número que quer entender e vê os dias que o formaram.

| O que muda | Onde | Plataforma | Feature |
|---|---|---|---|
| O container da sequência vira um **alvo de toque inteiro**, com `CaretRight` à direita e estado pressionado | Bloco `Sequência diária`, logo abaixo dos contadores | só mobile | F-GAM-OPC |
| No modo claro, número e `Flame` da sequência passam de `broto` para `musgo` | Mesmo bloco | só mobile | F-GAM (decisão do dono em 08/10/2026), alinhada aqui ao calendário |
| O artboard da sequência zerada passa a mostrar o recorde mantido, `31 dias` | `Meu perfil · Sequência zerada, recorde mantido (rolada)` | só mobile | correção do canvas, RN-18.6 |

**Por que a cor muda nesta edição.** O dono de F-GAM decidiu em 08/10/2026 usar `musgo` no número e na `Flame` do streak no modo claro, porque `broto` sobre `papel-elevado` fica abaixo de 3:1 e não serve nem para texto grande. O app já está assim, e o calendário do Período 3 também usa `musgo`. Como o perfil e o calendário ficam a um toque de distância e mostram o **mesmo componente**, o canvas do perfil passa a usar a mesma cor. No modo escuro nada muda: continua `broto-vivo`. O `documento-de-design.md` §4.8 ainda diz `broto`; a divergência continua registrada em F-GAM até o grupo alterar o documento.

**Por que o recorde do artboard zerado muda.** O prompt do Período 2 pedia `Recorde: 31 dias` nesse artboard, e a regra RN-18.6 mantém o recorde quando a sequência atual zera. O protótipo exportado saiu com `Recorde: 0`, e F-GAM já registrou a divergência. Como esta edição toca o mesmo componente em todos os artboards, ela corrige o valor.

**O que deixa de valer do prompt do Período 2:** a regra "O componente não é acionável. Não há tela de calendário no Período 2: nada de `CaretRight`, nada de toque", e a proibição "Não desenhe calendário de dias com leitura" **como entrada**. O calendário continua **sem ser desenhado dentro deste canvas**: ele é outra tela. O lembrete de sequência continua fora deste canvas: ele mora na lista de notificações. Todas as outras regras do prompt do Período 2 continuam valendo, e a seção 10 abaixo as repete.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`. **Não muda.**
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Meu perfil · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
- O artboard novo entra **no fim da linha 1**, depois dos existentes, sem reordenar nenhum.

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

Cor da sequência nesta tela: no modo claro, o número da sequência e a Flame
usam musgo, e não broto. broto sobre papel-elevado fica abaixo de 3:1 e não
serve nem para texto grande. É a decisão do dono de F-GAM de 08/10/2026, já
aplicada no app e no calendário de sequência. No modo escuro, número e Flame
usam broto-vivo. A barra de progresso de desafio continua broto sobre
musgo-fundo.

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

- **O shell inteiro**, exatamente como está no canvas: barra inferior do mobile com **Perfil** ativo, sidebar da web com **Perfil** ativo, marca na sidebar como já aparece.
- **O header:** título `Perfil` em `display`, `MagnifyingGlass`, `Gear` e `Bell` no mobile; `Buscar leitor` e `Configurações` no header de conteúdo da web. Nenhuma ação nova entra no header.
- **O bloco de identidade, os contadores e a linha de solicitações pendentes.**
- **A anatomia interna da sequência:** container `papel-elevado`, `radius-md`, padding `space-5`, `elev-0`; rótulo `Sequência diária` em `label` `grafite`; `Flame` de 20px, número em `num-display` e `dias seguidos` em `body-strong` `grafite`; linha `Recorde:` em `caption` `grafite` com o número em `num-inline` `grafite`; helper `Conta cada dia em que você registra ao menos 1 página.` em `caption` `grafite`, até duas linhas. Muda só o que a seção 4 descreve: a cor do número e da `Flame` no claro, o `CaretRight` e a largura do helper.
- **Os blocos `Estatísticas do ano`, `Desafios`, `Estante`, `Resenhas` e `Listas`**, com o desenho, os dados e as entradas que já têm.
- **Toda a linha web**, inclusive `Meu perfil · Aba Listas` e o `Carregando` da web. A web não tem sequência.
- **Os artboards `Erro de carregamento` (mobile)** e **`Meu perfil · Fim da página, sem listas (rolada)`**, que não mostram a sequência.
- **O banner de falha de bloco** (`Não foi possível carregar sua sequência. ...`): quando a sequência falha, o banner ocupa o lugar do container e **não** é tocável como entrada do calendário. Só `Tentar de novo` age.
- **A ordem dos artboards existentes** em cada linha e os rótulos deles.

---

## 4. Artboards que mudam

### 4.1 O componente de sequência passa a ser uma entrada

Vale para **todo artboard que mostra o container da sequência carregado**, na linha mobile e na linha escura:

- Linha 1: `Meu perfil · Padrão, perfil público`, `Meu perfil · Perfil privado`, `Meu perfil · Com solicitações pendentes`, `Meu perfil · Sem estante e sem resenhas`, `Meu perfil · Sequência, estatísticas e desafios (rolada)`, `Meu perfil · Sequência zerada, recorde mantido (rolada)` e `Meu perfil · Estatísticas indisponíveis (rolada)`.
- Linha 3: `Mobile, padrão`, `Mobile, com solicitações` e `Meu perfil · Sequência, estatísticas e desafios (rolada), modo escuro`.

Nos artboards em que a sequência aparece só cortada pela barra inferior (a variante com solicitações), o que estiver visível segue as mesmas regras.

**A. `CaretRight` à direita do container.**

- `CaretRight` (Phosphor, `regular`, 20px, `grafite`), **centralizado na vertical** do container, encostado no padding direito (`space-5` da borda interna).
- O helper de regra continua à direita, alinhado ao topo, mas agora termina `space-3` antes do `CaretRight`. A largura máxima do helper passa de 128px para **112px**, e ele pode ocupar até **três linhas**. O texto não muda.
- O `CaretRight` é o mesmo sinal usado nas linhas tocáveis do produto (linhas de lista, linhas de configuração). Ele diz "abre outra tela" sem acrescentar palavra.
- **Nada de botão textual** do tipo `Ver calendário` dentro ou abaixo do container: o container inteiro já é a entrada, e dois alvos com a mesma intenção no mesmo bloco seriam redundantes.

**B. O container inteiro é o alvo de toque.**

- Toda a área do container, `papel-elevado` incluído, é um único botão. O toque abre o calendário de sequência.
- Altura mínima do alvo: a do próprio container (maior que 48px). Sem área morta entre o número e o `CaretRight`.
- Vale também para a **sequência zerada** e para a **conta nova** (`Sem estante e sem resenhas`): o calendário tem estado próprio para conta nova e para mês sem leitura. Um leitor com `0` também pode querer ver os dias.

**C. Cor no modo claro: `musgo`.**

- `Flame` (`regular`, 20px) e o número em `num-display` passam de `broto` para **`musgo`**, em todos os artboards claros da lista acima, inclusive no zero (`0` em `musgo`).
- `dias seguidos`, `leia hoje para começar`, recorde e helper continuam em `grafite`.
- **O modo escuro não muda:** número e `Flame` continuam `broto-vivo`. `CaretRight` no escuro em `grafite-claro`.
- A barra de progresso do bloco `Desafios` **não muda**: continua `broto` sobre `musgo-fundo`, porque a regra de progresso de desafio é outra (design §4.7 e §3.1.3) e a decisão de F-GAM vale só para o número do streak.

### 4.2 `Meu perfil · Sequência zerada, recorde mantido (rolada)` (linha mobile)

- Além de 4.1, a linha do recorde mostra **`Recorde:` `31` `dias`**, como o prompt do Período 2 já pedia. Se o canvas estiver com `Recorde: 0`, corrija para `31`.
- `0` em `num-display` `musgo`, `Flame` estático em `musgo`, `leia hoje para começar` em `body` `grafite`. Zerar continua não sendo erro: sem `rubi`, sem `ambar`, sem alerta.

### 4.3 `Meu perfil · Carregando` (linha mobile)

- O retângulo `capa-placeholder` de 104px que faz a forma da sequência **não ganha `CaretRight`**: skeleton não tem ícone nem ação. Nada muda neste artboard.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha

#### 5.1 `Meu perfil · Sequência pressionada (rolada)`

O instante do toque no componente, antes de a tela do calendário abrir. Serve para conferir que o container inteiro é o alvo e que o estado de interação é visível.

- Mesma rolagem de `Meu perfil · Sequência, estatísticas e desafios (rolada)`: o divisor dos contadores logo abaixo do header, a sequência inteira, `space-8`, o bloco `Estatísticas do ano`, o começo do bloco `Desafios` cortado pela barra inferior.
- **Container da sequência pressionado:**
  - Fundo passa de `papel-elevado` para **`musgo-fundo`**, em `dur-instant`.
  - Escala `0.98` no container inteiro (a regra de press do sistema, sem ripple de Material).
  - Número e `Flame` continuam `musgo`, `CaretRight` continua `grafite`, textos continuam como estão.
- No modo escuro, o pressionado usa `musgo-fundo-escuro` (descrito aqui para a implementação; não há artboard escuro próprio).
- Sob `prefers-reduced-motion`, sem escala: só a troca de fundo.
- Barra inferior com **Perfil** ativo.

### Linha 2, web

Nenhum artboard novo.

### Linha 3, modo escuro

Nenhum artboard novo. O tratamento escuro do componente alterado já aparece nos três artboards escuros da lista de 4.1.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Streak (sequência diária), atual e recorde | documento-de-design §4.8 |
| Superfície e anatomia do streak no perfil (container, rótulo, helper) | nasceu em `../../periodo-2/meu-perfil/meu-perfil.md`; incorporação pendente |
| `CaretRight` como sinal de linha tocável que abre outra tela | documento-de-design §6 (iconografia) e linhas de lista dos prompts anteriores |
| Press com `scale(0.98)`, sem ripple | documento-de-design §3.6 |
| Iconografia Phosphor, `fill` só para estado ativo | documento-de-design §6 |
| Calendário de sequência (destino) | nasceu em `../F-GAM-OPC/calendario-de-sequencia.md`; incorporação pendente |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Streak acionável no perfil:** o container inteiro como alvo, `CaretRight` centralizado à direita, helper estreitado para 112px.
2. **Estado pressionado de container `papel-elevado` tocável:** fundo `musgo-fundo` (`musgo-fundo-escuro` no escuro) e `scale(0.98)`.

**Decisões deste prompt a ratificar pelo dono (Vicenzo Fonseca):**

- O ponto de entrada é o container inteiro, sem botão textual `Ver calendário`.
- O zero e a conta nova também abrem o calendário.
- A cor `musgo` no número e na `Flame` do streak no modo claro passa para o canvas do perfil, estendendo a decisão de F-GAM de 08/10/2026. O §4.8 continua dizendo `broto` até o grupo alterar o documento.
- O banner de falha da sequência não é entrada do calendário.
- O helper passa a quebrar em até três linhas para caber o `CaretRight`.

**Contrato:** nenhum novo nesta tela. O perfil continua lendo `/me/sequencia`; o calendário lê `GET /me/sequencia/calendario` na tela de destino.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, e nenhum agente altera `docs/orquestador/` por conta própria.

---

## 8. Copy nova ou alterada

| Onde | Antes (P2) | Agora |
|---|---|---|
| Recorde no artboard zerado | `Recorde: 0 dias` (como saiu no protótipo) | `Recorde: 31 dias` |
| Rótulo acessível da sequência | `Sequência diária: 12 dias seguidos. Recorde: 31 dias.` | `Sequência diária: 12 dias seguidos. Recorde: 31 dias. Abrir calendário da sequência.` |
| Rótulo acessível da sequência zerada | não existia | `Sequência diária: nenhum dia seguido, leia hoje para começar. Recorde: 31 dias. Abrir calendário da sequência.` |

Nenhum texto visível novo. O helper `Conta cada dia em que você registra ao menos 1 página.` continua igual, só quebra diferente. Zero em-dash, zero emoji. Todo número tem unidade.

---

## 9. Acessibilidade e interação do que muda

- **O container da sequência passa a ser um botão.** Papel de botão, um único elemento de foco, rótulo da seção 8. Antes ele era texto sem foco; agora entra na ordem de foco **depois dos contadores e da linha de solicitações, antes de `Ver estatísticas`**.
- **O destino é anunciado no rótulo** (`Abrir calendário da sequência`), porque o `CaretRight` sozinho não diz para onde vai.
- **O número não depende de cor:** `dias seguidos` continua escrito ao lado. Com `musgo` sobre `papel-elevado`, o número passa a ter contraste acima de 4,5:1, o que resolve o conflito do `broto` registrado no prompt do Período 2 para este componente.
- **Alvo de toque:** o container inteiro, com altura bem acima de 48px. O `CaretRight` não é um alvo separado.
- **Estado pressionado visível** por cor de fundo, não só por escala, para continuar perceptível sob `prefers-reduced-motion`.
- Foco de teclado (navegação por teclado físico ou switch access no Android): contorno de 2px `musgo` com offset de 2px em volta do container, `radius-md`.
- O helper continua em `grafite`, nunca em `grafite-suave`.
- Nenhuma ação desta edição é destrutiva.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Header, identidade, contadores, solicitações, estatísticas, desafios, estante, resenhas, listas, estados vazios, erro e shell ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. O novo entra no fim da linha 1.
- **Não desenhe o calendário dentro deste canvas**, nem como prévia, miniatura de semana, faixa de dias ou pontinhos dentro do container da sequência. O calendário é a tela de destino.
- **Não mexa na linha web.** Nada de sequência, calendário ou aviso de "disponível no app" na web.
- Não acrescente botão textual `Ver calendário`, link sublinhado nem segundo alvo dentro do bloco.
- Não troque a cor da barra de progresso dos desafios: a decisão de `musgo` vale só para o número e a `Flame` do streak.

**Específico do perfil, que continua valendo**

- **Não anime a sequência.** Nada de fogo animado, partícula, chama que cresce, número que conta subindo, emoji de fogo ou contagem regressiva para o fim do dia.
- **Não trate a sequência zerada como falha.** Sem `rubi`, sem `ambar`, sem ícone de alerta, sem frase de culpa. O recorde continua visível e no mesmo peso.
- Não desenhe lembrete de sequência neste canvas: ele mora na lista de notificações.
- Não desenhe gráfico, média, comparação com o ano anterior ou seta de tendência no bloco de estatísticas.
- Não use `musgo` na barra de desafio: progresso de desafio é `broto` sobre `musgo-fundo`.
- Não desenhe `DotsThreeVertical`, editar, pausar ou excluir desafio dentro do perfil.
- Não transforme as contagens da própria resenha em botões.
- **Não restrinja nada do dono.** Perfil privado não esconde nada de quem é dono.
- Não desenhe botão de seguir, compartilhar perfil, QR code nem métrica de vaidade.
- Não desenhe o nome do leitor no título do header. O título é `Perfil`.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais: corpo da resenha, frases e trechos, sinopse.
- Nada de mistura de família dentro do mesmo título.
- Nada de overline em toda seção. No máximo um por tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão, em texto de título ou no container da sequência.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura. O container pressionado não ganha sombra.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando.
- Nada de ripple de Material no toque: o press é `scale(0.98)` e troca de fundo.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de label poético. O rótulo continua `Sequência diária`.
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

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação, nem ao bater recorde.
- Sem ranking de leitores nem comparação de sequência com amigos.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
