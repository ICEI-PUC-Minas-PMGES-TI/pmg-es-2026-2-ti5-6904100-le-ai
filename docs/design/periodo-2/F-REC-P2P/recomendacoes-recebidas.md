# F-REC-P2P · Recomendações recebidas

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-REC-P2P.md
**Requisitos:** RF-REC-04 (ver as recomendações recebidas, com o livro, quem recomendou e a mensagem, quando houver), RF-REC-05 (acionar leva à página do livro), RF-REC-15 (descartar uma recomendação recebida, sem motivo e sem avisar quem recomendou)
**Não funcionais:** RNF-DES-02 (listagem paginada com teto de itens), RNF-SEC-02 (só o destinatário descarta), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-22.2 (sem mensagem, a recomendação aparece como "Fulano te recomendou X"), RN-22.6 (sem aceitar nem recusar), RN-22.7 (vários remetentes do mesmo livro geram recomendações distintas que coexistem), RN-22.9 (some depois de 90 dias), RN-22.10 (some quando o leitor põe o livro na estante), RN-22.11 (descarte individual, sem motivo, sem aviso ao remetente), RN-22.14 (recomendação removida não é restaurável)
**Versão web:** sim. RF-REC-04, RF-REC-05 e RF-REC-15 têm marcação na coluna Web de `REQUISITOS.md` §5.13.
**De onde se chega:** o botão `Ver todas` da seção `Recomendações recebidas` na aterrissagem da aba `Descobrir`, na edição do Período 2 em [`../descobrir/descobrir.md`](../descobrir/descobrir.md). O item de recomendação desta tela é **o mesmo item** daquela seção.

---

## 1. Contexto

A **lista completa** das recomendações que o leitor recebeu de amigos. Na aterrissagem do `Descobrir` aparecem só as mais recentes; aqui aparecem todas as ativas, e é **só aqui** que o leitor descarta uma recomendação.

**O modelo é de compartilhamento, não de pedido.** Uma recomendação não tem aceitar nem recusar (RN-22.6). Ela fica disponível até uma de quatro coisas acontecer: o leitor descarta, o leitor põe o livro na estante (RN-22.10), passam 90 dias (RN-22.9) ou, no futuro, o descarte em lote de outro período. Nenhuma delas avisa quem recomendou.

**De onde se chega e para onde se vai:**

- Chega pelo `Ver todas` da seção `Recomendações recebidas` do `Descobrir`. A tela é empilhada sobre a aba **Descobrir**, que continua ativa.
- Tocar numa recomendação leva à **página do livro** (RF-REC-05), em [`../pagina-do-livro/pagina-do-livro.md`](../pagina-do-livro/pagina-do-livro.md).
- O menu `DotsThree` de cada item leva ao perfil de quem recomendou ou descarta a recomendação.
- A seta de voltar volta ao `Descobrir`.

**Três coisas que a tela precisa resolver:**

- **Quem recomendou é tão importante quanto o livro.** O que dá peso a uma recomendação é a pessoa. Por isso cada item tem a linha `Júlia Figueiredo te recomendou · há 2 dias` com avatar, e a mensagem, quando há, aparece **inteira**, sem corte.
- **Descartar tem que ser fácil e silencioso.** Sem motivo, sem confirmação, sem aviso ao remetente (RN-22.11). O leitor precisa saber que o remetente não fica sabendo, e isso está escrito no próprio item do menu.
- **Recomendações diferentes do mesmo livro não se fundem.** Se dois leitores recomendaram o mesmo livro, são dois itens, cada um com a sua pessoa e a sua mensagem (RN-22.7).

O mecanismo que a tela sustenta é **pertencimento**: é onde o leitor vê o que os amigos acham que ele deveria ler.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, na ordem em que o leitor os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Recomendações recebidas · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Recomendações recebidas** (P2P, ativas, não expiradas, nenhuma de livro que já está na estante do leitor). São as mesmas cinco da aterrissagem do `Descobrir`, **na mesma ordem**, mais recentes primeiro. A aterrissagem mostra três no mobile e quatro na web; aqui aparecem todas, e a quinta só existe nesta lista:

| Livro | Autor | Quem recomendou | Mensagem | Quando |
|---|---|---|---|---|
| A Hora da Estrela | Clarice Lispector | Júlia Figueiredo | `Curtinho e devastador. Dá para ler num fim de semana.` | `há 2 dias` |
| Quarto de Despejo | Carolina Maria de Jesus | Caio Rezende | sem mensagem | `há 5 dias` |
| Tudo É Rio | Carla Madeira | Beatriz Okada | `Você vai odiar e entender a Lucy ao mesmo tempo.` | `há 1 semana` |
| Um Defeito de Cor | Ana Maria Gonçalves | Henrique Sampaio | sem mensagem | `há 3 semanas` |
| O Avesso da Pele | Jeferson Tenório | Júlia Figueiredo | `Lembrei de você na parte da escola.` | `há 1 mês` |

`Quarto de Despejo` usa o **placeholder de capa**, para o artboard mostrar o caso. Contagem: `5 recomendações`.

**Descarte de 4.2 e 4.3:** `Um Defeito de Cor`, de Henrique Sampaio. Depois do descarte, a contagem vira `4 recomendações`.

**Mesmo livro de duas pessoas, 4.4:** chegou uma recomendação nova, a mais recente da lista: `Tudo É Rio`, de **Lívia Carvalho**, `há 1 hora`, com a mensagem `Terminei ontem e ainda estou pensando na Dalva.` Ela convive com a de Beatriz Okada do mesmo livro, que continua no seu lugar. Contagem: `6 recomendações`.

**Formato do tempo relativo:** `há 1 hora`, `há 2 dias`, `há 1 semana`, `há 3 semanas`, `há 1 mês`. **O formato ainda não está no contrato** (pendência registrada no arquivo da feature); o protótipo usa estes textos como referência.

**Paginação:** a lista é paginada pelo servidor (RNF-DES-02). Com cinco recomendações tudo cabe numa página; o carregamento incremental está descrito em 4.1 e não tem artboard próprio.

**Nome de quem recomendou:** vem com o avatar. Nenhum item mostra a data absoluta nem a data de expiração.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell.

Toda tela autenticada é desenhada dentro do shell do produto. O shell é idêntico em todas elas e precisa ser desenhado por extenso aqui.

**Mobile, barra inferior.** Fixa no rodapé da viewport, acima da área segura. Altura de 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, sem sombra. Quatro itens de largura igual: `Estante`, `Descobrir`, `Feed`, `Perfil`. Cada item empilha ícone de 24px acima e rótulo em `caption` abaixo, com `space-1` de gap, centralizado, e a área tocável tem no mínimo 48px de altura. Ícones Phosphor: `Books` para Estante, `Compass` para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. Inativo: ícone peso `regular`, cor `grafite`; rótulo em `caption` `grafite`. Ativo: ícone peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`. Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone que salta. **Nesta tela o item ativo é `Descobrir`.**

**Mobile, header.** Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra. O sino `Bell` (Phosphor, `regular`, 24px, `tinta`) fica à direita e é fixo em toda tela autenticada. Badge de não lidas: círculo de 18px, fundo `musgo`, encostado no canto superior direito do ícone, número centralizado em 11px peso 600 cor `papel`; acima de nove mostra `9+`; sem não lidas, o badge simplesmente não existe.

### Header desta tela

Header de tela de detalhe, empilhada sobre o `Descobrir`.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando ao `Descobrir`. Rótulo acessível `Voltar`.
- Título `Recomendações` em `display` `tinta`, à esquerda, logo depois da seta, alinhado à base. O nome completo, `Recomendações recebidas`, não cabe em `display` ao lado da seta e do sino em 390px; ele aparece por extenso no header da web.
- `Bell` à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Topo da lista

Padding lateral `space-5`, `space-2` abaixo do header:

- Uma linha em `caption` `grafite`, visível sempre que há recomendações: `Recomendações saem daqui depois de 90 dias ou quando você põe o livro na estante.` É a regra de RN-22.9 e RN-22.10 dita uma vez, no topo, sem data de expiração em cada item.
- `space-4` abaixo, a linha de contagem em `caption` `grafite`: `5 recomendações`. O número em JetBrains Mono no tamanho do `caption`.

### Item de recomendação

**É o mesmo item da seção `Recomendações recebidas` do `Descobrir`**, com duas diferenças: a mensagem aparece inteira e o item ganha o botão `DotsThree`.

- Lista vertical, separada por divisor de 1px `linha`, cada item com `space-4` de padding vertical e padding lateral `space-5`. Sem card em volta.
- Capa de 60 por 90px à esquerda, retângulo de **canto vivo**, sem raio. Placeholder `capa-placeholder` com o título centralizado em `title-sm` `tinta` e os dois primeiros nomes do autor abaixo em `caption` `grafite` quando não há capa.
- `space-4` de gap até o bloco de texto.
- Título em `title-sm` `tinta`, no máximo duas linhas com reticências.
- Autor em `body` `grafite`, uma linha.
- `space-2` abaixo, **linha de atribuição**: avatar circular de 20px, `space-2` de gap, o texto em `caption`: nome de quem recomendou em peso 600 `tinta` seguido de `te recomendou` em `grafite`, e depois ` · há 2 dias` em `grafite-suave`.
- Quando há mensagem, `space-2` abaixo: a mensagem em `body` `grafite`, **inteira, sem corte**. Sem aspas decorativas, sem ícone de balão, sem serifa: é texto do remetente, não resenha nem frase de livro. Sem mensagem, a linha de atribuição é tudo, e isso é uma recomendação completa (RN-22.2).
- **Botão `DotsThree`** no canto superior direito do item, alinhado ao topo do título: `DotsThree` (Phosphor, `regular`, 20px, `grafite`), com alvo de toque de 48px. O título e o autor reservam o espaço dele e não passam por baixo. Rótulo acessível: `Mais ações para A Hora da Estrela, recomendado por Júlia Figueiredo`.
- **O resto do item é a área acionável** e leva à página do livro (RF-REC-05). O botão `DotsThree` é um alvo separado, e os dois não se sobrepõem.
- **Nenhum item tem status pill.** Recomendação de livro que o leitor já pôs na estante é removida (RN-22.10), então esse caso não existe.
- **Mesmo livro de duas pessoas são dois itens**, cada um no seu lugar da ordem por data. Não agrupe, não empilhe as pessoas e não escreva "e mais 1".

### 4.1 Padrão

- Header com `ArrowLeft`, `Recomendações` e o sino com o badge `2`.
- Linha da regra e `5 recomendações`.
- Os itens na ordem da seção 3: `A Hora da Estrela` com a mensagem de Júlia Figueiredo, `Quarto de Despejo` com o placeholder de capa e sem mensagem, `Tudo É Rio` com a mensagem de Beatriz Okada e o começo de `Um Defeito de Cor`, cortado naturalmente pela barra inferior. O conteúdo passa por baixo da barra inferior.
- Barra inferior com **Descobrir** ativo.
- **Carregamento incremental**, sem artboard: quando a lista tem mais de uma página e a rolagem chega ao fim do que foi carregado, **duas linhas de skeleton** no desenho de 4.5 aparecem abaixo do último item, com um único fade. Nada muda no topo, o scroll não pula e a lista não recarrega inteira.
- **Volta da página do livro:** se o leitor abriu um livro por aqui e o pôs na estante, ao voltar as recomendações daquele livro já saíram da lista e a contagem diminuiu, sem toast. É RN-22.10 agindo, não descarte do leitor.

### 4.2 Menu da recomendação aberto

O leitor tocou no `DotsThree` de `Um Defeito de Cor`. Bottom sheet de menu de ações (design §4.11) sobre o estado de 4.1 rolado até esse item, escurecido pelo scrim `#171512` a 40%.

- Sheet ancorado embaixo, fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo. O padding inferior soma a área segura.
- **Cabeçalho do sheet:** capa de 60 por 90px de canto vivo e, ao lado, `Um Defeito de Cor` em `title-sm` `tinta` e `Henrique Sampaio te recomendou` em `caption` `grafite`. Divisor `linha` abaixo.
- **Dois itens** de 56px, com ícone Phosphor `regular` de 20px `tinta` e rótulo em `body` `tinta`, `space-4` de gap, divisor `linha` entre eles:
  - `UserCircle` · `Ver perfil de Henrique Sampaio`. Leva ao perfil de quem recomendou.
  - `XCircle` · `Descartar recomendação`. Logo abaixo do rótulo, na mesma coluna, uma linha explicativa em `caption` `grafite`: `Quem recomendou não fica sabendo.` Com a linha, o item cresce para 72px.
- **O descarte não é item destrutivo em `rubi`** e não pede confirmação: ele não apaga nada do leitor, só tira da lista algo que outra pessoa mandou, e o livro continua no acervo para ser encontrado no `Descobrir`. Por isso o item fica em `tinta`, como o outro.
- `space-4` abaixo, botão textual `grafite` de largura total: `Cancelar`.

### 4.3 Recomendação descartada

O leitor tocou em `Descartar recomendação`. O sheet fechou.

- O item de `Um Defeito de Cor` saiu da lista com um fade de saída em `dur-base` com `ease-in`, e os itens de baixo subiram para o lugar dele em `dur-base` com `ease-in-out`. O artboard mostra o resultado: `O Avesso da Pele` logo depois de `Tudo É Rio`.
- Contagem: `4 recomendações`.
- **Toast** acima da barra inferior, com `space-4` de margem lateral: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, **barra lateral de 4px em `musgo`** à esquerda, texto em `body` `tinta`: `Recomendação descartada.` À direita, `X` (Phosphor, `regular`, 20px, `grafite`) com alvo de 48px, rótulo acessível `Fechar aviso`.
- **Sem `Desfazer`**: recomendação removida não é restaurável (RN-22.14). O toast confirma o que aconteceu e não promete volta.
- Enquanto o servidor responde, o item fica com opacidade de 50% e não reage ao toque; ele só sai da lista quando o servidor confirma. Esse intervalo não tem artboard próprio.
- **Sem pergunta de descarte em lote**, mesmo depois do terceiro descarte do mesmo livro: o descarte em lote é de outro período.

### 4.4 Mesmo livro de duas pessoas

A lista depois de chegar a recomendação de Lívia Carvalho.

- Contagem: `6 recomendações`.
- Primeiro item: `Tudo É Rio`, `Lívia Carvalho te recomendou · há 1 hora`, mensagem `Terminei ontem e ainda estou pensando na Dalva.`
- Depois, `A Hora da Estrela` e `Quarto de Despejo`, e em seguida o **segundo** `Tudo É Rio`, de Beatriz Okada, `há 1 semana`, com a mensagem dela. Os dois itens do mesmo livro são idênticos no desenho e diferentes na pessoa, no tempo e na mensagem.
- Nada liga os dois itens visualmente: sem agrupamento, sem contador `2 pessoas`, sem destaque. Cada um se descarta sozinho.

### 4.5 Carregando

- Header completo e real.
- Linha da regra real; a contagem ainda não aparece.
- No lugar dos itens, **três esqueletos estáticos** com a forma do item: retângulo `capa-placeholder` de 60 por 90px e, à direita, três barras em `capa-placeholder` com `radius-sm`, larguras de 70%, 45% e 55%, alturas de 17px, 15px e 13px, `space-2` entre elas. Separados pelo divisor `linha`. Sem o `DotsThree` no esqueleto.
- Um único fade de entrada em `dur-base` com `ease-out`. Sem shimmer, sem spinner. É também o estado do cold start (RNF-ERR-09): se passar de três segundos, abaixo dos esqueletos aparece em `caption` `grafite`: `O serviço está iniciando. Isso pode levar alguns segundos.`
- Barra inferior com **Descobrir** ativo.

### 4.6 Erro de carregamento

- Header completo e real. Sem a linha da regra e sem contagem.
- `space-4` abaixo do header, banner inline de largura total menos o padding `space-5`: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda com `space-3` de gap, texto em `body` `tinta`: `Não foi possível carregar suas recomendações. Verifique sua conexão e tente de novo.`, e abaixo o botão textual `musgo` `Tentar de novo`. É o mesmo banner da seção no `Descobrir`, com a mesma copy.

### 4.7 Fim da lista

A tela rolada até o fim, com as cinco recomendações.

- O header ganhou o divisor `linha` na base.
- No topo visível, o fim de `Tudo É Rio`, depois `Um Defeito de Cor` inteiro, sem mensagem, e `O Avesso da Pele` com a mensagem `Lembrei de você na parte da escola.`
- `space-6` abaixo do último item, uma linha centralizada em `caption` `grafite-suave`: `Essas são todas as suas recomendações.` Sem ícone, sem botão. Ela só aparece quando o servidor diz que não há próxima página.
- `space-6` de respiro até a barra inferior.

### 4.8 Vazio

O leitor descartou todas, ou todas expiraram, ou ele pôs os livros na estante. Só se chega a este estado estando na tela: o `Descobrir` não mostra `Ver todas` quando não há recomendação.

- Header completo. Sem a linha da regra e sem contagem.
- Bloco centralizado no espaço entre o header e a barra inferior, com `space-6` entre os elementos:
  - `PaperPlaneTilt` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhuma recomendação agora`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Quando um leitor que você segue e que segue você recomendar um livro, ele aparece aqui.`
  - Botão primário pill, 48px, fundo `musgo`, texto `papel`: `Voltar para Descobrir`.
- Sem ilustração, sem sugestão de livros para preencher o vazio.

### 4.9 Falha ao descartar

O leitor tocou em `Descartar recomendação` de `Um Defeito de Cor` e o servidor não respondeu.

- O item volta ao normal, no mesmo lugar, com a opacidade cheia. Contagem continua `5 recomendações`.
- Toast acima da barra inferior, no desenho de 4.3, com **barra lateral de 4px em `rubi`** e o texto em `body` `tinta`: `Não foi possível descartar a recomendação. Verifique sua conexão e tente de novo.` À direita, botão textual `musgo`: `Tentar de novo`, e o `X` de fechar.
- O toast de falha **não some sozinho**: ele fica até o leitor tocar em `Tentar de novo` ou no `X`. Um erro que desaparece antes de ser lido não é acionável.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Shell da web

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px `linha`. Bloco do topo de 72px, padding lateral `space-5`, com o lockup horizontal da marca à esquerda (símbolo da folha sobre livro aberto seguido de `Lê Ai`, os dois em `musgo`, `space-3` de gap, 24px de altura) e `SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo, `space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro de padding lateral `space-3`: altura de 44px, `radius` 12, padding lateral `space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em `body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo transparente. Hover: fundo `linha`, transição `dur-fast`. Ativo: fundo `musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`. **Nesta tela o item ativo é `Descobrir`.**

**Sem sino na web.** Notificações estão fora do escopo do cliente web, então o ícone não existe na sidebar nem no header web. Nada no rodapé da sidebar: sem suporte, sem versão, sem crédito.

**Ponto de virada.** Entre 768px e 1024px a sidebar nasce retraída em 72px, só ícones. Abaixo de 768px a sidebar deixa de existir e a barra inferior do mobile assume. Não existe menu hamburguer em nenhum tamanho.

### Estrutura da web

- Área de conteúdo à direita da sidebar, fundo `papel`, padding lateral `space-8`.
- **Header de conteúdo de 72px** com `Recomendações recebidas` em `display` `tinta` à esquerda. Nada à direita e sem sino. A volta para o `Descobrir` é o item `Descobrir` da sidebar, que continua ativo.
- Abaixo do header, a linha da regra em `caption` `grafite` e, `space-4` abaixo, a contagem `5 recomendações` em `caption` `grafite`.
- `space-5` abaixo, **grid de duas colunas** com gap `space-5`, largura máxima de 1040px, alinhado à esquerda, com os itens na ordem por data, preenchendo linha a linha. É o mesmo grid da seção no `Descobrir` web.
- Cada item tem o mesmo conteúdo do mobile, com a **capa em 80 por 120px**, padding `space-4`, `radius` 12, fundo transparente e a mensagem inteira. O `DotsThree` fica no canto superior direito do item, **sempre visível**, com área de clique de 40px.
- `hover` no item: fundo `papel-elevado`, transição `dur-fast`, cursor de ponteiro. `hover` no `DotsThree`: fundo `linha` no círculo de 40px. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px, no item e no `DotsThree` separadamente.
- Itens de alturas diferentes (com e sem mensagem) alinham pelo topo na linha do grid; não se esticam para igualar.
- **Carregamento incremental:** ao rolar até o fim, duas células de esqueleto na forma do item entram no fim do grid.
- **Abaixo de 768px** o grid vira a lista de uma coluna do mobile, o título do header passa a `Recomendações`, com `ArrowLeft` à esquerda, e a sidebar dá lugar à barra inferior.

### 5.1 Padrão, com hover

- Header de conteúdo, linha da regra e `5 recomendações`.
- Grid com as cinco: na primeira linha `A Hora da Estrela` e `Quarto de Despejo`; na segunda `Tudo É Rio` e `Um Defeito de Cor`; na terceira `O Avesso da Pele` e a célula da direita vazia, sem placeholder.
- `Tudo É Rio` **em hover**, com fundo `papel-elevado` e cursor de ponteiro.
- Abaixo da terceira linha, `space-6`, a linha centralizada na largura do grid `Essas são todas as suas recomendações.` em `caption` `grafite-suave`.

### 5.2 Menu da recomendação aberto

- Base: 5.1 sem hover.
- O `DotsThree` de `Um Defeito de Cor` está pressionado (fundo `linha`) e abre um **menu suspenso** ancorado abaixo dele, alinhado pela borda direita do botão, `space-2` abaixo: 280px de largura, fundo `papel`, borda de 1px `linha`, `radius` 12, `elev-2`, padding `space-2` vertical. **Sem scrim**: o menu não bloqueia a página. É o mesmo menu suspenso do `DotsThree` da página do livro na web.
- Dois itens, padding lateral `space-4`, ícone `regular` de 20px `tinta`, rótulo em `body` `tinta`, `space-3` de gap:
  - `UserCircle` · `Ver perfil de Henrique Sampaio`, 44px.
  - `XCircle` · `Descartar recomendação`, com a linha `Quem recomendou não fica sabendo.` em `caption` `grafite` abaixo do rótulo, 60px. Em hover, com fundo `linha`, para mostrar o estado.
- Sem `Cancelar`: `Esc`, clique fora e novo clique no `DotsThree` fecham, e o foco volta ao `DotsThree`.

### 5.3 Recomendação descartada

- Grid com quatro itens: `A Hora da Estrela` e `Quarto de Despejo`, depois `Tudo É Rio` e `O Avesso da Pele`, que subiu para o lugar de `Um Defeito de Cor`. Contagem `4 recomendações`.
- Toast no canto inferior esquerdo da área de conteúdo, `space-8` da borda esquerda do conteúdo e `space-8` da borda inferior, largura de 400px, com o desenho de 4.3: barra lateral de 4px `musgo`, `Recomendação descartada.` e `X` para fechar. Sem `Desfazer`.

### 5.4 Carregando

- Header de conteúdo e linha da regra reais, sem contagem.
- Grid com **quatro esqueletos** em duas linhas, na forma do item web: retângulo `capa-placeholder` de 80 por 120px e três barras à direita, com as mesmas proporções do mobile. Um único fade, sem shimmer.

### 5.5 Vazio

- Header de conteúdo. Sem linha da regra e sem contagem.
- Bloco de 4.8 centralizado na área de conteúdo, alinhado ao topo com `space-16` de respiro, com `PaperPlaneTilt` de 32px, título, texto e o primário pill de 40px `Voltar para Descobrir`.

---

## 6. Artboards em modo escuro

Lock de página inteira. Superfície elevada **mais clara** que o fundo, `musgo-claro` como acento, shadows com metade da opacidade: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

### 6.1 Padrão (mobile)

Equivalente a 4.1. Fundo `noite`. Header com `ArrowLeft`, título e sino em `papel-suave`, badge com fundo `musgo-claro` e número em `noite`. Linha da regra e contagem em `grafite-claro`. Título do livro em `papel-suave`, autor e mensagem em `grafite-claro`, nome de quem recomendou em `papel-suave`, `te recomendou` em `grafite-claro`, tempo em `grafite-fundo-escuro`. `DotsThree` em `grafite-claro`. Divisor `linha-noite`. Placeholder de capa em `capa-placeholder-noite` com o título em `papel-suave`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com divisor `linha-noite` e **Descobrir** em `musgo-claro`.

### 6.2 Menu da recomendação aberto (mobile)

Equivalente a 4.2. Lista atrás em `noite` sob scrim preto a 60%. Sheet em `noite-elevada`, **mais claro** que o fundo, alça em `linha-noite`. Título do livro e rótulos dos itens em `papel-suave`, ícones em `papel-suave`, `Henrique Sampaio te recomendou` e a linha `Quem recomendou não fica sabendo.` em `grafite-claro`, divisores `linha-noite`, `Cancelar` em `grafite-claro`.

### 6.3 Padrão (web)

Equivalente a 5.1. Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, **Descobrir** ativo com fundo `musgo-fundo-escuro`, ícone e rótulo em `musgo-claro`. Título do header em `papel-suave`. Item em hover com fundo `noite-elevada`. Textos como em 6.1. Toast, quando aparece, em `noite-elevada` com barra `musgo-claro` e texto `papel-suave`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Bottom sheet de menu de ações | documento-de-design §4.11 |
| Botão primário pill e textual | documento-de-design §4.1 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6 |
| Placeholder de capa com título | documento-de-design §4.5 |
| Item de recomendação recebida | nasceu em `periodo-2/descobrir/descobrir.md`, incorporação pendente |
| Header de tela de detalhe (`ArrowLeft`, título, sino) | nasceu no Período 1, incorporação pendente |
| Banner inline de erro | nasceu no Período 1, usado em `descobrir.md` |
| Carregamento incremental com skeleton no fim da lista | nasceu em `periodo-1/F-PERFIL/seguidores-e-seguidos.md`, incorporação pendente |
| Item de menu com linha explicativa | nasceu em `periodo-2/F-DSF/desafios.md`, incorporação pendente |
| Menu suspenso da web ancorado no `DotsThree` | nasceu em `periodo-2/pagina-do-livro/pagina-do-livro.md`, incorporação pendente e em divergência com o §4.11 |
| Shell (barra inferior e sidebar) | shell, `periodo-0/P0-NAV/shell-de-navegacao.md` |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3, não ficam decididos só neste prompt:

1. **Variante do item de recomendação com `DotsThree`** no canto superior direito e a mensagem inteira, sem corte. A seção do `Descobrir` usa a variante sem ação e com a mensagem em duas linhas.
2. **Linha de regra no topo da lista** (`caption` `grafite`), que explica uma vez como os itens saem da lista.
3. **Linha de fim de lista** em `caption` `grafite-suave`, centralizada.
4. **Toast de confirmação sem `Desfazer`**, posicionado acima da barra inferior no mobile e no canto inferior esquerdo do conteúdo na web; o toast de falha com `Tentar de novo`, que não some sozinho. O §7.6 define a aparência, mas não a posição nem a duração.
5. **Descarte sem confirmação e fora do estilo destrutivo:** item de menu em `tinta` para uma remoção irreversível de conteúdo de terceiro. Ver a nota da seção 9.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Header mobile | `Recomendações` |
| Header web | `Recomendações recebidas` |
| Rótulo acessível da seta | `Voltar` |
| Linha da regra | `Recomendações saem daqui depois de 90 dias ou quando você põe o livro na estante.` |
| Contagem | `5 recomendações`, `4 recomendações`, `6 recomendações`, `1 recomendação` |
| Atribuição | `Júlia Figueiredo te recomendou · há 2 dias`, `Caio Rezende te recomendou · há 5 dias`, `Beatriz Okada te recomendou · há 1 semana`, `Henrique Sampaio te recomendou · há 3 semanas`, `Júlia Figueiredo te recomendou · há 1 mês`, `Lívia Carvalho te recomendou · há 1 hora` |
| Mensagens | `Curtinho e devastador. Dá para ler num fim de semana.`, `Você vai odiar e entender a Lucy ao mesmo tempo.`, `Lembrei de você na parte da escola.`, `Terminei ontem e ainda estou pensando na Dalva.` |
| Rótulo acessível do menu | `Mais ações para A Hora da Estrela, recomendado por Júlia Figueiredo` |
| Cabeçalho do sheet | `Um Defeito de Cor`, `Henrique Sampaio te recomendou` |
| Item do menu | `Ver perfil de Henrique Sampaio` |
| Item do menu | `Descartar recomendação` |
| Linha explicativa do descarte | `Quem recomendou não fica sabendo.` |
| Fechar o sheet | `Cancelar` |
| Toast de descarte | `Recomendação descartada.` |
| Toast de falha | `Não foi possível descartar a recomendação. Verifique sua conexão e tente de novo.` |
| Ação do toast de falha | `Tentar de novo` |
| Rótulo acessível do fechar do toast | `Fechar aviso` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro de carregamento | `Não foi possível carregar suas recomendações. Verifique sua conexão e tente de novo.` |
| Ação do erro | `Tentar de novo` |
| Fim da lista | `Essas são todas as suas recomendações.` |
| Vazio, título | `Nenhuma recomendação agora` |
| Vazio, texto | `Quando um leitor que você segue e que segue você recomendar um livro, ele aparece aqui.` |
| Vazio, ação | `Voltar para Descobrir` |

Zero em-dash, zero emoji, nenhum número sem unidade. O ponto médio da atribuição é separador de metadado, e não travessão.

---

## 9. Acessibilidade e interação

- **Contraste:** título, autor, nome, mensagem e contagem em `tinta` ou `grafite`, que passam em AA no corpo. O tempo relativo em `grafite-suave` e a linha de fim de lista não carregam informação essencial: o tempo também está no rótulo acessível do item.
- **Dois alvos por item, sem sobreposição:** o item leva à página do livro e o `DotsThree` abre o menu. O `DotsThree` tem 48px de alvo no mobile e 40px de área de clique na web, e o texto do item não passa por baixo dele.
- **Rótulo acessível do item** junta livro, autor, quem recomendou, quando e a mensagem: `A Hora da Estrela, de Clarice Lispector. Júlia Figueiredo te recomendou há 2 dias: Curtinho e devastador. Dá para ler num fim de semana.` Sem mensagem: `Quarto de Despejo, de Carolina Maria de Jesus. Caio Rezende te recomendou há 5 dias.`
- **Descarte sem confirmação, de propósito.** RNF-USA-04 pede confirmação em ação destrutiva. O descarte não apaga nada do leitor: tira da lista um conteúdo que outra pessoa mandou, o livro continua no acervo e o menu já é um passo intermediário entre o toque e a ação. Por isso não há modal. A decisão está registrada para ratificação; se o grupo entender que é destrutivo, entra a confirmação do §4.11 com o botão em outline `rubi`.
- **Foco:** o sheet prende o foco enquanto aberto e, ao fechar, o foco volta ao `DotsThree` que o abriu. Depois do descarte, o foco vai para o item seguinte da lista, ou para o título da tela se a lista ficou vazia; nunca se perde no topo da página.
- **Anúncios:** a contagem é anunciada quando muda. Toasts de descarte e de falha são regiões anunciadas quando aparecem e não roubam o foco.
- **Web:** ordem de tabulação da sidebar para o conteúdo, e dentro do grid item e `DotsThree` alternados, na ordem visual. `Enter` no item abre a página do livro. `Esc` fecha o menu suspenso. Setas navegam entre os itens do menu aberto.
- **Motion:** o fade de saída do item descartado, o deslize dos itens de baixo, o sheet e o toast respeitam `prefers-reduced-motion`: sob reduce, o item some e os outros ocupam o lugar sem transição.
- **Alvo de toque** de 48px no mobile em seta, sino, `DotsThree`, itens do menu, `Cancelar`, `X` e `Tentar de novo` do toast.

---

## 10. O que não fazer nesta tela

**Recomendações**

- Não desenhe `Aceitar`, `Recusar`, `Responder` nem "marcar como lida". Recomendação não é pedido.
- Não desenhe conversa com quem recomendou, nem campo de resposta à mensagem.
- Não agrupe recomendações do mesmo livro, não empilhe avatares e não escreva "e mais 1". Cada recomendação é um item.
- Não desenhe `Descartar todas`, seleção múltipla nem a pergunta de descarte em lote: isso é de outro período.
- Não desenhe `Desfazer` depois do descarte: recomendação removida não volta.
- Não peça motivo do descarte e não mostre confirmação em modal.
- Não desenhe a recomendação algorítmica: nada de `Sugestões para você`, `Porque você leu` ou seção reservada para ela.
- Não desenhe status pill no item, nem botão de adicionar à estante dentro do item: a ação sobre o livro mora na página do livro.
- Não desenhe data de expiração, contagem regressiva nem "expira em 12 dias" em cada item.
- Não desenhe botão `Recomendar` nesta tela: recomendar parte da página do livro.
- Não desenhe filtro, ordenação nem abas: a lista é por data, mais recente primeiro.
- Não corte a mensagem em duas linhas: aqui ela é inteira.
- Não use serifa na mensagem do remetente.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela. Ela não é nenhum dos três usos editoriais da seção 2.
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

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.
- Nada de gesto de deslizar para descartar com animação elástica. O descarte é pelo menu.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. `Recomendações recebidas`, não "Para você" nem "Escolhas dos amigos".
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de placeholder de capa com livro genérico ilustrado.
- Nada de toast com fundo saturado verde ou vermelho. Toast é `papel-elevado` com barra lateral fina.
- Nada de botão destrutivo preenchido.
- Nada de card com borda e sombra em volta de cada item no mobile: a lista usa divisor.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo em tela de dados: o grid é de duas colunas iguais de itens.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. O `DotsThree` está sempre visível, não só no hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "5" sozinho: é "5 recomendações".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos por recomendações recebidas.
- Sem ranking de quem mais recomenda.
- Sem mensagem direta entre usuários. A mensagem da recomendação é opcional, de uma via, e não abre conversa.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
