# F-REC-ALG · Recomendações recebidas (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Recomendações recebidas`, gerado por `docs/design/periodo-2/F-REC-P2P/recomendacoes-recebidas.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/F-REC-P2P/recomendacoes-recebidas.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-REC-ALG.md
**Requisitos que entram:** F-REC-ALG: RF-REC-17 (oferecer o descarte em lote das demais recomendações de um livro, conforme RN-22)
**Não funcionais:** RNF-SEC-02 (só o destinatário descarta), RNF-ERR-04 (descarte em lote idempotente: repetir não muda o resultado), RNF-USA-04 (a pergunta é a confirmação da remoção em lote), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-22.11 (descarte sem aviso ao remetente), RN-22.12 (a pergunta aparece no terceiro descarte do mesmo livro na sessão, havendo outras pendentes daquele livro), RN-22.13 (recusada, a pergunta não volta para aquele livro na sessão; contagem e supressão se perdem ao fechar e reabrir), RN-22.14 (recomendação removida não é restaurável)
**Versão web:** sim. RF-REC-17 tem marcação na coluna Web de `REQUISITOS.md` §5.13.

---

## 1. O que muda e por quê

No Período 2 esta tela ganhou o descarte individual, sem confirmação e sem aviso a quem recomendou, e o prompt original proibia de propósito a pergunta de descarte em lote, porque ela era de outro período. Esta edição é a chegada dela (RF-REC-17):

- **A pergunta de descarte em lote (RN-22.12).** Quando o leitor descarta a **terceira** recomendação de um mesmo livro **na sessão corrente**, e ainda restam outras recomendações daquele livro, a tela pergunta: `Deseja remover todas as recomendações atuais do livro Tudo É Rio?`. No mobile a pergunta é um **bottom sheet**; na web, um **dialog** centrado. É o desenho de sobreposição do sistema, o mesmo que o produto usa em toda confirmação.
- **Sim remove todas as restantes daquele livro, de uma vez.** Elas saem da lista juntas, a contagem cai e um toast confirma quantas saíram. Não há `Desfazer` (RN-22.14), e quem recomendou continua sem saber (RN-22.11).
- **Agora não suprime a pergunta para aquele livro até o fim da sessão (RN-22.13).** Depois da recusa, os próximos descartes daquele livro são descartes individuais comuns, com o toast de sempre. Outro livro tem a sua própria contagem.
- **Contagem e supressão são do cliente, não do servidor.** O servidor só informa, a cada descarte, quantas recomendações daquele livro ainda restam. Fechar e reabrir o aplicativo, ou recarregar a página na web, zera as duas coisas: são precisos três novos descartes daquele livro para a pergunta voltar.

O que deixa de valer do escopo do Período 2: a proibição da seção 10 do prompt original contra a pergunta de descarte em lote, e a nota de 4.3 `Sem pergunta de descarte em lote, mesmo depois do terceiro descarte do mesmo livro`. **Só isso.** `Descartar todas` no topo da lista, seleção múltipla e um item `Descartar todas deste livro` no menu continuam proibidos: o lote só existe como resposta à pergunta.

O mecanismo que a tela sustenta continua sendo **pertencimento**. A pergunta existe para um caso concreto: um livro que muitos amigos recomendaram e que o leitor já decidiu que não vai ler. Descartar um por um, cinco vezes, é trabalho repetido; a pergunta resolve na terceira vez.

O canvas continua simulando um arquivo de Figma. Os artboards novos entram **lado a lado** com os existentes, cada um simulando o viewport de um aparelho, nunca empilhados dentro do mesmo frame.

- **Linha 1:** mobile, `390 x 844`. Os artboards novos entram **no fim da linha**, na ordem da seção 5.
- **Linha 2:** web, `1440 x 900`. Novos no fim da linha.
- **Linha 3:** modo escuro. Novos no fim da linha.
- Cada artboard novo leva o **rótulo acima**, no formato `Recomendações recebidas · <estado>`, e o **viewport abaixo**, como os existentes.

### Dados dos artboards novos

Os artboards existentes continuam com os dados do Período 2. Os novos partem de **outra situação da mesma leitora**: o livro `Tudo É Rio`, de Carla Madeira, foi recomendado por **cinco** leitores. A lista completa, mais recentes primeiro, tem **nove** recomendações:

| # | Livro | Autor | Quem recomendou | Mensagem | Quando |
|---|---|---|---|---|---|
| 1 | Tudo É Rio | Carla Madeira | Lívia Carvalho | `Terminei ontem e ainda estou pensando na Dalva.` | `há 1 hora` |
| 2 | Tudo É Rio | Carla Madeira | Caio Rezende | sem mensagem | `há 1 dia` |
| 3 | A Hora da Estrela | Clarice Lispector | Júlia Figueiredo | `Curtinho e devastador. Dá para ler num fim de semana.` | `há 2 dias` |
| 4 | Tudo É Rio | Carla Madeira | Henrique Sampaio | `Leia sem olhar a orelha antes.` | `há 3 dias` |
| 5 | Quarto de Despejo | Carolina Maria de Jesus | Caio Rezende | sem mensagem | `há 5 dias` |
| 6 | Tudo É Rio | Carla Madeira | Beatriz Okada | `Você vai odiar e entender a Lucy ao mesmo tempo.` | `há 1 semana` |
| 7 | Tudo É Rio | Carla Madeira | Júlia Figueiredo | sem mensagem | `há 2 semanas` |
| 8 | Um Defeito de Cor | Ana Maria Gonçalves | Henrique Sampaio | sem mensagem | `há 3 semanas` |
| 9 | O Avesso da Pele | Jeferson Tenório | Júlia Figueiredo | `Lembrei de você na parte da escola.` | `há 1 mês` |

`Quarto de Despejo` continua com o **placeholder de capa**. As cinco recomendações de `Tudo É Rio` são **cinco itens separados**, cada um no seu lugar da ordem por data, como manda o Período 2 (RN-22.7).

**A sequência que os artboards contam:**

1. A leitora descarta, nesta ordem e na mesma sessão, as recomendações de Lívia Carvalho, Caio Rezende e Henrique Sampaio, as três de `Tudo É Rio`. As duas primeiras são descartes comuns, com o toast `Recomendação descartada.` do Período 2.
2. No **terceiro** descarte, o servidor confirma e informa que ainda restam **2** recomendações daquele livro (as de Beatriz Okada e Júlia Figueiredo). A lista fica com **6 recomendações** e a pergunta abre.
3. **Se ela responde `Remover todas`:** as duas saem, a lista fica com **4 recomendações** (`A Hora da Estrela`, `Quarto de Despejo`, `Um Defeito de Cor`, `O Avesso da Pele`) e o toast diz `2 recomendações de Tudo É Rio descartadas.`
4. **Se ela responde `Agora não`:** a lista continua com 6. Ela descarta depois a de Beatriz Okada: é um descarte comum, sem pergunta, a lista fica com **5 recomendações** e só a de Júlia Figueiredo resta daquele livro.

**Quando a pergunta não aparece** (sem artboard, só regra):

- Terceiro descarte de um livro do qual não resta nenhuma outra recomendação: descarte comum, com o toast de sempre. Não há o que remover em lote.
- Primeiro e segundo descartes de qualquer livro.
- Qualquer descarte de um livro cuja pergunta já foi recusada nesta sessão.
- Recomendação que saiu porque o livro foi para a estante (RN-22.10) ou expirou (RN-22.9): não é descarte do leitor e não conta.
- O mesmo descarte reenviado depois de uma falha conta **uma vez só**.

**Formato do tempo relativo:** o do Período 2, ainda fora do contrato.

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

## 3. O que permanece intocado

- **Shell**: barra inferior no mobile e sidebar na web, com **Descobrir** ativo. Sem sino na web.
- **Header** mobile (`ArrowLeft`, `Recomendações`, sino com badge) e header de conteúdo web (`Recomendações recebidas`).
- **Linha da regra** no topo (`Recomendações saem daqui depois de 90 dias ou quando você põe o livro na estante.`) e a linha de contagem. A regra **não** ganha frase sobre o descarte em lote: a pergunta se explica sozinha quando aparece.
- **O item de recomendação**, com capa de canto vivo, título, autor, linha de atribuição, mensagem inteira e o `DotsThree`. Nenhum item ganha selo, contador de quantas pessoas recomendaram o mesmo livro nem agrupamento.
- **O menu do item**, nos dois desenhos (sheet no mobile, menu suspenso na web), com os mesmos dois itens: `Ver perfil de <remetente>` e `Descartar recomendação` com a linha `Quem recomendou não fica sabendo.`. **Nenhum item novo no menu.**
- **O descarte individual**: sem confirmação, em `tinta`, com o item a 50% enquanto o servidor responde, o fade de saída, o toast `Recomendação descartada.` sem `Desfazer` e o toast de falha que não some sozinho.
- **Todos os artboards do Período 2**, mobile, web e escuro: `Padrão`, `Menu da recomendação aberto`, `Recomendação descartada`, `Mesmo livro de duas pessoas`, `Carregando`, `Erro de carregamento`, `Fim da lista`, `Vazio`, `Falha ao descartar` e os equivalentes da web e do escuro. Os dados deles continuam os do Período 2.
- Estados de carregamento, erro, fim de lista e vazio.
- Toda a copy existente.

---

## 4. Artboards que mudam

**Nenhum artboard existente muda no desenho.** O lote só aparece a partir do terceiro descarte do mesmo livro, e nenhum artboard do Período 2 chega lá: em `Recomendações recebidas · Recomendação descartada` a leitora descarta a única recomendação de `Um Defeito de Cor`, e em `Recomendações recebidas · Mesmo livro de duas pessoas` `Tudo É Rio` tem só duas.

Muda só o **sentido** de uma nota do prompt original: em `Recomendações recebidas · Recomendação descartada`, a regra `Sem pergunta de descarte em lote, mesmo depois do terceiro descarte do mesmo livro` deixa de valer. Aquele artboard continua igual porque é o primeiro descarte daquele livro. Não acrescente nada visível a ele.

---

## 5. Artboards novos

### Mobile (390 x 844), no fim da linha 1, nesta ordem

Todos os artboards novos mobile são a mesma tela do Período 2: header de detalhe com `ArrowLeft`, `Recomendações` e o sino com o badge `2`, a linha da regra, a contagem e a lista com divisores, e a barra inferior com **Descobrir** ativo.

#### 5.1 `Recomendações recebidas · Mesmo livro de cinco pessoas`

O ponto de partida da sequência, antes de qualquer descarte.

- Contagem: `9 recomendações`.
- Na viewport, na ordem da seção 1: `Tudo É Rio` de Lívia Carvalho com a mensagem, `Tudo É Rio` de Caio Rezende sem mensagem, `A Hora da Estrela` de Júlia Figueiredo com a mensagem, `Tudo É Rio` de Henrique Sampaio com a mensagem `Leia sem olhar a orelha antes.` e o começo de `Quarto de Despejo`, cortado naturalmente pela barra inferior.
- Os três `Tudo É Rio` são **idênticos no desenho e diferentes na pessoa, no tempo e na mensagem**. Nada os liga: sem agrupamento, sem `5 pessoas recomendaram`, sem destaque.

#### 5.2 `Recomendações recebidas · Pergunta de descarte em lote`

A leitora acabou de descartar a terceira recomendação de `Tudo É Rio`, a de Henrique Sampaio. O servidor confirmou e informou que restam 2. O item já saiu da lista e o sheet abriu.

**Atrás do sheet**, escurecida pelo scrim do modo claro (`tinta` a 40%): a lista com `6 recomendações`, na ordem `A Hora da Estrela`, `Quarto de Despejo`, `Tudo É Rio` de Beatriz Okada e o começo de `Tudo É Rio` de Júlia Figueiredo. **Não há toast** `Recomendação descartada.` deste terceiro descarte: a pergunta toma o lugar dele, e a saída do item já mostrou que o descarte deu certo.

**Bottom sheet** ancorado embaixo, largura total, fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`. Alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo. O padding inferior soma a área segura. De cima para baixo:

- **Cabeçalho do livro**, igual ao do sheet de menu do Período 2: capa de 60 por 90px, de canto vivo, e ao lado `Tudo É Rio` em `title-sm` `tinta` e `Carla Madeira` em `caption` `grafite`. Divisor de 1px `linha` abaixo, `space-5` de respiro.
- **A pergunta**, em `title` `tinta`, alinhada à esquerda, até três linhas: `Deseja remover todas as recomendações atuais do livro Tudo É Rio?`. É o texto de RN-22.12, sem adaptação. O título do livro vai no mesmo peso e na mesma cor do resto da frase, sem aspas e sem itálico.
- `space-3` abaixo, o texto em `body` `grafite`: `Ainda restam 2 recomendações deste livro na sua lista. Quem recomendou não fica sabendo, e elas não voltam depois.` O número em JetBrains Mono no tamanho do `body`.
- `space-6` abaixo, **dois botões empilhados**, de largura total:
  - **Primário pill**, 48px de altura, fundo `musgo`, texto `papel` em `body-strong`: `Remover todas`.
  - `space-2` abaixo, **botão textual** `grafite`, 48px de altura, `radius` 12: `Agora não`.
- **O botão de remover não é `rubi`**, pelo mesmo motivo do descarte individual do Período 2: tirar da lista o que outra pessoa mandou não apaga nada da leitora, e o livro continua no acervo. A pergunta já é o passo de confirmação.
- **O foco entra em `Agora não`**, o botão de manter, como em toda confirmação do sistema. O leitor de tela lê a pergunta ao abrir.
- **Fechar sem escolher conta como recusa.** Arrastar o sheet para baixo, tocar no scrim ou usar o voltar do sistema tem o mesmo efeito de `Agora não`: a pergunta não volta para `Tudo É Rio` nesta sessão.

#### 5.3 `Recomendações recebidas · Removendo todas`

A leitora tocou em `Remover todas`. O servidor ainda não respondeu.

- O mesmo sheet de 5.2, aberto.
- O primário fica com opacidade de 50%, não reage ao toque e troca o texto para `Removendo…`. `Agora não` também fica a 50% e desabilitado. Sem spinner: o texto e a opacidade são o estado.
- Atrás do sheet, os dois itens de `Tudo É Rio` que vão sair ficam a 50% de opacidade, como no descarte individual do Período 2. Eles só saem quando o servidor confirma.
- Arrastar, tocar no scrim e o voltar do sistema não fecham o sheet enquanto o pedido está em curso.

#### 5.4 `Recomendações recebidas · Todas removidas`

O servidor confirmou. O sheet fechou.

- Os dois itens de `Tudo É Rio` saíram **juntos**, com o fade de saída em `dur-base` e `ease-in`, e os itens de baixo subiram em `dur-base` e `ease-in-out`. O artboard mostra o resultado.
- Contagem: `4 recomendações`.
- Lista: `A Hora da Estrela`, `Quarto de Despejo` com o placeholder, `Um Defeito de Cor` sem mensagem e `O Avesso da Pele` com a mensagem de Júlia Figueiredo. Nenhum `Tudo É Rio`.
- **Toast** acima da barra inferior, com `space-4` de margem lateral, no desenho do Período 2: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, barra lateral de 4px em `musgo`, texto em `body` `tinta`: `2 recomendações de Tudo É Rio descartadas.` À direita, o `X` de fechar, com alvo de 48px. **Sem `Desfazer`** (RN-22.14).
- Com uma só restante, o toast diz `1 recomendação de Tudo É Rio descartada.`

#### 5.5 `Recomendações recebidas · Falha ao remover todas`

A leitora tocou em `Remover todas` e o servidor não respondeu.

- **O sheet continua aberto**, no desenho de 5.2, com os dois botões de volta ao normal e o primário com o texto `Remover todas`.
- Entre o texto e os botões, `space-4` acima e abaixo, **banner inline de erro** de largura total do conteúdo do sheet: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda com `space-3` de gap, texto em `body` `tinta`: `Não foi possível remover as recomendações. Verifique sua conexão e tente de novo.` É o mesmo banner do erro de carregamento do Período 2.
- Tentar de novo é tocar em `Remover todas` outra vez. Não há um terceiro botão.
- Atrás do sheet, os dois itens de `Tudo É Rio` voltaram à opacidade cheia, no mesmo lugar. Contagem continua `6 recomendações`.
- **A remoção em lote é tudo ou nada para o leitor.** O pedido é um só e o desenho não mostra falha parcial (algumas saíram, outras não). Se o servidor confirmar, todas saem; se falhar, todas ficam. Repetir é seguro: o servidor ignora o que já saiu.
- O foco vai para o banner, que é anunciado, e depois segue para `Remover todas`.

#### 5.6 `Recomendações recebidas · Pergunta recusada, novo descarte`

A leitora respondeu `Agora não` em 5.2. Depois abriu o menu do `Tudo É Rio` de Beatriz Okada e tocou em `Descartar recomendação`.

- Contagem: `5 recomendações`.
- Lista: `A Hora da Estrela`, `Quarto de Despejo`, `Tudo É Rio` de Júlia Figueiredo (a única que resta daquele livro), `Um Defeito de Cor` e o começo de `O Avesso da Pele`.
- **Toast comum** do Período 2, barra de 4px `musgo`: `Recomendação descartada.` **Sem pergunta**: ela foi recusada para `Tudo É Rio` nesta sessão (RN-22.13). O artboard existe para mostrar exatamente essa ausência.
- Nada na tela diz que a pergunta foi suprimida. Nenhum aviso, nenhum ícone, nenhuma linha do tipo "não perguntaremos de novo".

### Web (1440 x 900), no fim da linha 2, nesta ordem

Mesma estrutura do Período 2: sidebar com **Descobrir** ativo, header de conteúdo `Recomendações recebidas`, linha da regra, contagem e o grid de duas colunas com gap `space-5`, largura máxima de 1040px. Itens com capa de 80 por 120px e o `DotsThree` sempre visível.

#### 5.7 `Recomendações recebidas · Pergunta de descarte em lote` (web)

A mesma situação de 5.2, na web. A leitora descartou o terceiro `Tudo É Rio` pelo menu suspenso.

- **Atrás do dialog**, escurecida pelo scrim do modo claro (`tinta` a 40%): contagem `6 recomendações` e o grid com `A Hora da Estrela` e `Quarto de Despejo` na primeira linha, os dois `Tudo É Rio` (Beatriz Okada e Júlia Figueiredo) na segunda, `Um Defeito de Cor` e `O Avesso da Pele` na terceira.
- **Dialog centrado** na viewport, 480px de largura, fundo `papel`, `radius-xl` nos quatro cantos, padding `space-6`, `elev-3`, sem alça. Mesmo conteúdo de 5.2, na mesma ordem: cabeçalho do livro com capa de 60 por 90px, divisor, a pergunta em `title`, o texto em `body` `grafite`.
- **Botões lado a lado**, alinhados à direita, `space-3` entre eles: o textual `grafite` `Agora não` à esquerda e o primário pill de 40px `musgo` `Remover todas` à direita.
- Foco inicial em `Agora não`. `Esc` e clique no scrim fecham e contam como recusa. Ao fechar, o foco volta ao item seguinte do grid, ou ao título se o grid ficou vazio.

#### 5.8 `Recomendações recebidas · Todas removidas` (web)

- Dialog fechado. Grid com quatro itens: `A Hora da Estrela` e `Quarto de Despejo` na primeira linha, `Um Defeito de Cor` e `O Avesso da Pele` na segunda. Contagem `4 recomendações`.
- Toast no canto inferior esquerdo da área de conteúdo, na posição e no desenho do Período 2, com largura de 400px, barra de 4px `musgo` e `2 recomendações de Tudo É Rio descartadas.` Sem `Desfazer`.

#### 5.9 `Recomendações recebidas · Falha ao remover todas` (web)

- O dialog de 5.7 continua aberto, com o banner inline de erro de 5.5 entre o texto e os botões, e os dois botões de volta ao normal.
- Atrás, o grid com `6 recomendações`, os dois `Tudo É Rio` com a opacidade cheia.

### Modo escuro, no fim da linha 3, nesta ordem

Lock de página inteira. Superfície elevada **mais clara** que o fundo, `musgo-claro` como acento, shadows com metade da opacidade.

#### 5.10 `Recomendações recebidas · Escuro, pergunta de descarte em lote` (mobile)

Equivalente a 5.2. Lista atrás em `noite` sob scrim preto a 60%. Sheet em `noite-elevada`, alça em `linha-noite`. Título do livro e a pergunta em `papel-suave`; autor e texto em `grafite-claro`; divisor `linha-noite`. Primário pill com fundo `musgo-claro` e texto `noite`; `Agora não` em `grafite-claro`. Barra inferior em `noite-elevada` com **Descobrir** em `musgo-claro`.

#### 5.11 `Recomendações recebidas · Escuro, falha ao remover todas` (mobile)

Equivalente a 5.5. Sheet em `noite-elevada`. Banner com fundo `rubi-fundo-escuro`, `Warning` em `rubi-claro` e texto em `papel-suave`.

#### 5.12 `Recomendações recebidas · Escuro, pergunta de descarte em lote` (web)

Equivalente a 5.7. Sidebar em `noite-elevada` sobre conteúdo em `noite`, **Descobrir** ativo com fundo `musgo-fundo-escuro` e ícone e rótulo em `musgo-claro`. Dialog em `noite-elevada`, **mais claro** que o fundo, sobre scrim preto a 60%. Textos e botões como em 5.10.

---

## 6. Artboards a remover

Nenhum sai. Os artboards do Período 2 continuam valendo: o descarte individual não mudou.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Bottom sheet e dialog de confirmação | documento-de-design §4.11, sobreposição na seção 2 deste prompt |
| Botão primário pill e textual | documento-de-design §4.1 |
| Toast com barra lateral fina | documento-de-design §7.6 |
| Banner inline de erro | nasceu no Período 1, usado em `periodo-2/F-REC-P2P/recomendacoes-recebidas.md` |
| Cabeçalho de livro no sheet (capa de 60 por 90px, título e linha secundária) | nasceu em `periodo-2/F-REC-P2P/recomendacoes-recebidas.md`, incorporação pendente |
| Toast de confirmação sem `Desfazer` | nasceu em `periodo-2/F-REC-P2P/recomendacoes-recebidas.md`, incorporação pendente |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Pergunta oferecida pelo sistema depois de uma ação**, não antes dela: o sheet ou dialog abre como consequência de um descarte que já aconteceu, com o cabeçalho do livro, a pergunta, o texto e os botões `Remover todas` e `Agora não`. É diferente da confirmação destrutiva do §4.11, que antecede a ação.
2. **Confirmação de remoção irreversível fora do estilo destrutivo**: primário `musgo` em vez de outline `rubi`, estendendo a decisão do descarte individual do Período 2.
3. **Estado de envio dentro do sheet**: primário e textual a 50%, texto `Removendo…`, sheet que não fecha enquanto o pedido está em curso.
4. **Banner inline de erro dentro de sheet e dialog**, com a ação de repetir no próprio primário.
5. **Toast com contagem e nome do livro** (`2 recomendações de Tudo É Rio descartadas.`).

---

## 8. Copy nova ou alterada

Nenhuma copy existente muda. Entram:

| Onde | Texto |
|---|---|
| Pergunta | `Deseja remover todas as recomendações atuais do livro Tudo É Rio?` |
| Texto da pergunta | `Ainda restam 2 recomendações deste livro na sua lista. Quem recomendou não fica sabendo, e elas não voltam depois.` |
| Texto da pergunta, uma restante | `Ainda resta 1 recomendação deste livro na sua lista. Quem recomendou não fica sabendo, e ela não volta depois.` |
| Primário | `Remover todas` |
| Primário enquanto envia | `Removendo…` |
| Textual | `Agora não` |
| Erro no sheet e no dialog | `Não foi possível remover as recomendações. Verifique sua conexão e tente de novo.` |
| Toast do lote | `2 recomendações de Tudo É Rio descartadas.`, `1 recomendação de Tudo É Rio descartada.` |
| Contagens novas | `9 recomendações`, `6 recomendações`, `5 recomendações`, `4 recomendações` |
| Mensagem nova nos dados | `Leia sem olhar a orelha antes.` |
| Atribuições novas | `Caio Rezende te recomendou · há 1 dia`, `Henrique Sampaio te recomendou · há 3 dias`, `Júlia Figueiredo te recomendou · há 2 semanas` |

Com uma só restante, o primário continua `Remover todas`: a pergunta de RN-22.12 fala em todas, e o texto acima diz quantas são.

Zero em-dash, zero emoji, nenhum número sem unidade. As reticências de `Removendo…` são um único caractere.

---

## 9. Acessibilidade e interação do que muda

- **A pergunta é anunciada ao abrir.** O sheet e o dialog têm papel de diálogo de alerta, com a pergunta como título acessível e o texto como descrição. O foco entra em `Agora não`.
- **Foco preso** dentro do sheet e do dialog enquanto abertos. Ao fechar por qualquer via, o foco vai para o item que ocupou o lugar do item descartado; se a lista ficou vazia, para o título da tela. Nunca se perde no topo da página.
- **Fechar sem escolher é recusar.** Arrastar, tocar no scrim, `Esc` e o voltar do sistema têm o efeito de `Agora não`. Isso evita que a pergunta reapareça no próximo descarte para quem só quis tirá-la da frente.
- **Estado de envio anunciado**: `Removendo…` é lido quando o primário muda. O resultado também: o toast é região anunciada e não rouba o foco; o banner de erro recebe o foco.
- **Contagem anunciada** quando muda, como no Período 2.
- **Alvo de toque** de 48px nos dois botões do sheet e no `X` do toast. Na web, os botões do dialog têm foco visível com contorno de 2px `musgo` e offset de 2px.
- **Contraste**: a pergunta em `tinta` e o texto em `grafite` passam em AA no corpo. O número do texto não depende de cor.
- **Motion**: o sheet sobe em `dur-slow` com `ease-out` e sai em `dur-base` com `ease-in`; o dialog entra em `dur-base` com deslize de 16px e fade; a saída conjunta dos itens usa o fade e o deslize do Período 2. Tudo respeita `prefers-reduced-motion`: sob reduce, sheet, dialog e itens aparecem e somem sem transição.
- **Nada de gesto**: a pergunta não aparece por deslizar nem por toque longo. Ela só existe como consequência do terceiro descarte.

---

## 10. O que não fazer nesta edição

**Regras da edição**

- **Não redesenhe o que não foi citado.** Shell, header, item de recomendação, menu do item, descarte individual, toasts, carregamento, erro, fim de lista e vazio do Período 2 ficam como estão.
- **Não reordene os artboards existentes.** Os novos entram no fim de cada linha, na ordem da seção 5.
- **Não troque os dados dos artboards existentes.** Os de `Tudo É Rio` com cinco pessoas são só dos artboards novos.
- Não reintroduza o que o prompt original proibia e continua valendo: aceitar, recusar, responder, conversa com quem recomendou, agrupamento do mesmo livro, `Desfazer`, motivo do descarte, confirmação em modal no descarte individual, recomendação algorítmica, status pill, expiração por item, botão `Recomendar`, filtro, ordenação, abas, mensagem cortada e serifa na mensagem.

**Descarte em lote**

- Não desenhe `Descartar todas` no topo da lista, seleção múltipla, modo de edição nem caixa de marcar nos itens. O lote só existe como resposta à pergunta.
- Não acrescente `Descartar todas deste livro` ao menu do item.
- Não mostre a pergunta no primeiro nem no segundo descarte, nem quando não resta outra recomendação do livro.
- Não mostre a pergunta de novo depois de `Agora não`, nem desenhe aviso de que ela foi suprimida.
- Não desenhe contador de descartes, barra de progresso até a pergunta nem frase do tipo "mais 1 descarte para remover todas".
- Não desenhe caixa de marcar "não perguntar de novo": a supressão já é automática e dura só a sessão.
- Não use `rubi` no primário, nem botão destrutivo preenchido.
- Não liste os nomes de quem recomendou na pergunta: o texto diz quantas restam, não de quem.
- Não desenhe falha parcial, com algumas removidas e outras não: o lote é um pedido só.
- Não desenhe `Desfazer` no toast do lote.
- Não mostre os dois toasts juntos: no terceiro descarte, a pergunta toma o lugar de `Recomendação descartada.`

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela, nem na pergunta.
- Nada de itálico, aspas ou negrito no título do livro dentro da pergunta.
- Nada de overline e nada de eyebrow numerado.

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão ou em texto.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.

**Motion**

- Nada de spinner girando. O envio é texto e opacidade.
- Nada de shimmer, parallax, marquee, loop infinito ou scroll hijacking.
- Nada de animação elástica na saída dos itens.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de número sem unidade: `2 recomendações`, nunca `2` sozinho.

**Componentes**

- Nada de ícone desenhado à mão. Phosphor, família única.
- Nada de capa com canto arredondado.
- Nada de toast com fundo saturado verde ou vermelho.

**Modo escuro**

- Nada de fundo #000000, nada de simples inversão da paleta clara, nada de meia tela clara e meia escura.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas, ranking, mensagem direta, clubes de leitura, login social, autenticação de dois fatores ou leitura de e-book dentro do aplicativo.
