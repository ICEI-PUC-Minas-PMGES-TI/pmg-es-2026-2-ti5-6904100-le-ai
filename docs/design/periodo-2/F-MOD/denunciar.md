# F-MOD · Denunciar

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-MOD.md
**Requisitos:** RF-MOD-01 (denunciar resenhas e comentários com um único campo de motivo em texto livre, obrigatório, sem enum de motivos nem descrição separada; resenhas de livros pessoais são denunciáveis nas mesmas condições)
**Não funcionais:** RNF-USA-04 (confirmação explícita antes de enviar), RNF-SEC-18 (limite de denúncias por intervalo), RNF-SEC-13 e RNF-SEC-14 (motivo com limite de tamanho no schema e escapado na renderização), RNF-SEC-02 (o servidor comprova que o denunciante ainda tem acesso ao conteúdo), RNF-ERR-04 (reenviar não duplica), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-08 (o acesso ao conteúdo é revalidado pela privacidade do perfil do autor), RN-15.4 (terceiros com acesso podem denunciar a resenha do dono de um livro pessoal), RN-10 (comentário e resposta são os dois alvos do tipo comentário)
**Versão web:** sim. RF-MOD-01 tem marcação na coluna Web de `REQUISITOS.md` §5.11.
**De onde se chega:** o item `Denunciar resenha` do menu `DotsThree` de cada resenha de outro leitor na página do livro, na edição do Período 2 em [`../pagina-do-livro/pagina-do-livro.md`](../pagina-do-livro/pagina-do-livro.md); e o item `Denunciar comentário` do menu de cada comentário de outro leitor, que entra na edição de comentários do lote 5, `docs/design/periodo-2/comentarios/comentarios.md` (a escrever). Nos dois casos o menu só abre esta tela: nada é denunciado antes dela.

---

## 1. Contexto

A tela em que o leitor **leva uma resenha ou um comentário à moderação**. O conteúdo já vem escolhido, porque a tela só abre a partir do menu dele. O leitor escreve, com as próprias palavras, **o que há de errado**, revisa e envia. A denúncia vai para a fila do administrador, que decide se remove o conteúdo ou arquiva a denúncia como improcedente. Quem denunciou não acompanha o andamento: o produto não tem tela de "minhas denúncias".

**O motivo é um texto, e só um.** RF-MOD-01 é explícito: um campo de texto livre, obrigatório, sem lista de categorias (`Spam`, `Ofensivo`, `Spoiler`), sem caixa de seleção e sem campo de descrição separado. A tela tem **um** campo. Ele não pode ficar vazio nem só com espaços.

**Denunciar passa por confirmação.** O documento de design trata denunciar como ação destrutiva (§4.1 e §7.8) e o RNF-USA-04 exige confirmação explícita. A tela resolve isso em **dois passos no mesmo sheet (ou dialog)**:

1. **Motivo:** o leitor vê o trecho do conteúdo que está denunciando e escreve o motivo. O botão deste passo é `Revisar denúncia` e não envia nada.
2. **Confirmação:** o conteúdo do mesmo sheet é trocado pela pergunta `Enviar esta denúncia?`, com o motivo digitado repetido para conferência, o botão destrutivo em outline `rubi` `Enviar denúncia` e a volta `Voltar ao motivo`.

A escolha pelos dois passos, e não por um botão final com texto explícito, **é proposta deste prompt e precisa ser ratificada** pelo grupo.

**Conteúdo de livro pessoal é denunciável igual.** Quem chegou a uma página de livro pessoal pelo feed ou por uma lista do dono vê a resenha do dono e pode denunciá-la (RN-15.4). A tela é a mesma, sem artboard próprio: a via de acesso vai junto na chamada e não aparece para o leitor.

**O servidor confere o acesso de novo.** Conhecer o identificador não autoriza denunciar: se, entre abrir a tela e enviar, a resenha foi excluída ou o perfil da autora ficou privado para o leitor, o envio é recusado e a tela diz isso (artboard 4.9).

**De onde se chega e para onde se vai:**

- Chega pelo menu `DotsThree` da resenha (página do livro) ou do comentário (sheet de comentários).
- Enviar com sucesso fecha a tela e **volta ao ponto de onde se veio**, com um aviso curto de confirmação. A resenha ou o comentário continuam visíveis para o leitor até a moderação decidir.
- Fechar pelo `X` (mobile) ou por `Cancelar` (web) volta sem enviar. Com motivo digitado, a volta pede confirmação.

O mecanismo que a tela sustenta é **pertencimento**: é o gesto que mantém a comunidade habitável.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, na ordem em que o leitor os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Denunciar · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
Esta tela é um sheet sobre a página do livro, mas o sheet segue o layout
previsível: 5 / 4 / 4.

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
  página do livro. Nesta tela, a serifa entra só no trecho da resenha
  denunciada, porque é o corpo da resenha. O trecho de comentário e o
  motivo são texto de interface, em Manrope.
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

BOTÕES
Primário: fundo musgo (musgo-claro no escuro), texto papel (noite no escuro),
sem borda, sempre pill.
Secundário: transparente, texto tinta (papel-suave), borda 1px linha
(linha-noite), radius 12.
Textual: transparente, texto musgo (musgo-claro), sem borda, radius 12.
Destrutivo: transparente, texto rubi (rubi-claro), borda 1px rubi
(rubi-claro), radius 12. Nunca preenchido. Excluir conta, abandonar leitura e
denunciar são destrutivos e sempre passam por confirmação.
Botão médio: padding de 12 vertical e 20 horizontal, 48px de altura no mobile
e 40px na web, texto em uma linha.

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
destrutivo. Confirmação destrutiva: título em title-sm, consequência em body
grafite. Na web os botões ficam lado a lado, alinhados à direita, o de
manter primeiro; no mobile empilham em largura total, destrutivo em cima.

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

**Resenha denunciada** (a mesma do canvas da página do livro, artboard `Resenhas e frases (rolada)`):

| Campo | Valor |
|---|---|
| Livro | `Torto Arado`, de Itamar Vieira Junior (Todavia, 2019) |
| Autora da resenha | Letícia Nakamura `@lelenakamura` |
| Nota | 4,5 estrelas (não aparece no card do conteúdo denunciado) |
| Corpo | `A troca de narradora no meio da história é o melhor recurso do romance. Demorei a entender e depois não consegui parar.` (no original, `não consegui parar` está em itálico) |

**Motivo de exemplo da resenha:** `A resenha conta quem narra a segunda parte do livro sem avisar que tem spoiler.` (78 caracteres).

**Comentário denunciado** (o mesmo do canvas de comentários do Período 1, atividade `Rafael Okamoto publicou uma resenha` de `Os Sertões`, de Euclides da Cunha):

| Campo | Valor |
|---|---|
| Autor | Rafael Okamoto `@rafaokamoto` |
| Tipo | resposta, sob o comentário de Dandara Lopes |
| Texto | `Vale. A terceira parte reorganiza tudo o que a segunda parece atrasar.` |
| Tempo | `52 min` |

**Motivo de exemplo do comentário:** `Resposta repetida em várias atividades minhas, parece divulgação.` (65 caracteres).

**Limite de caracteres do motivo:** **ainda não está no contrato** (pendência do dono no arquivo da feature: "definir o limite de caracteres no schema de entrada"). O protótipo usa **500 caracteres como valor provisório**, só para desenhar o contador; o número é mock e precisa ser confirmado antes da implementação.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell do produto. A tela é um **bottom sheet** (design §4.11) sobre a tela de onde se veio: a página do livro, com a barra inferior do shell visível atrás do scrim e não acionável.

**Base de 4.1 a 4.10:** o artboard `Página do livro · Resenhas e frases (rolada)` de `Torto Arado`, com a resenha de `Letícia Nakamura` visível, coberto pelo scrim `#171512` a 40%. O shell por baixo: barra inferior fixa no rodapé, 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, quatro itens de largura igual (`Estante` com `Books`, `Descobrir` com `Compass`, `Feed` com `Newspaper`, `Perfil` com `UserCircle`), ícone de 24px acima e rótulo em `caption` abaixo; inativo em `regular` `grafite`, ativo em `fill` `musgo` com rótulo peso 600. Item ativo: **Descobrir**, a área de origem.

### O sheet

- Bottom sheet conforme design §4.11: largura total, fundo `papel`, `radius-lg` 20 só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha` centralizada com `space-5` acima do conteúdo. O padding inferior soma a área segura.
- Altura pelo conteúdo, até no máximo 88% da viewport. Com o teclado aberto, o sheet sobe junto e o conteúdo rola por dentro, com o botão do passo sempre visível acima do teclado.
- Toque no scrim e arrastar para baixo fecham, com a mesma regra do `X`: com motivo digitado, pede confirmação (4.10).

### Passo 1: motivo

De cima para baixo:

1. **Cabeçalho do sheet**, em uma linha: título `Denunciar resenha` em `title` `tinta` à esquerda; `X` (Phosphor, `regular`, 24px, `tinta`) à direita, alvo de 48px, rótulo acessível `Fechar`. Para comentário, o título é `Denunciar comentário`.
2. `space-4` abaixo, **card do conteúdo denunciado** (nasce aqui, ver seção 7):
   - Fundo `papel-elevado`, `radius-md` 16, padding `space-4`, sem sombra, sem borda.
   - Linha de autoria: avatar circular de 32px, `space-3` de gap, nome em `body-strong` `tinta` e, abaixo, em `caption` `grafite`: `Resenha de Torto Arado` (para comentário: `Resposta em Os Sertões`).
   - `space-3` abaixo, o **trecho** do conteúdo, no máximo **três linhas**, cortado com reticências. Resenha em Newsreader 400, `body` 15/22, `tinta`, com o itálico do original preservado; comentário em Manrope `body` `tinta`. O card não é acionável: não abre nada, não expande.
   - Resenha **com spoiler oculto** (RF-AVA-03): no lugar do trecho, em `body` `grafite`, `Resenha com spoiler. O texto fica oculto aqui.` O denunciante já viu o texto na página se quis vê-lo; o sheet não revela de novo. Sem artboard próprio.
3. `space-6` abaixo, **campo de motivo**:
   - Label `Motivo da denúncia` em `label` `grafite`, `space-2` acima do campo. Sem asterisco: o campo é o único da tela, e a obrigatoriedade está no helper.
   - Área de texto de quatro linhas visíveis (altura de 120px), largura total, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, padding `space-3 space-4`, texto em `body` `tinta`. Cresce até seis linhas e depois rola por dentro.
   - Placeholder em `grafite-suave`: `Por exemplo: conta o final sem aviso de spoiler`. Ele não substitui o label.
   - `space-2` abaixo, uma linha com dois textos: à esquerda o **helper** em `caption` `grafite`, visível sempre, `Obrigatório. Conte o que há de errado com as suas palavras.`; à direita o **contador** em `caption` `grafite`, com os números em JetBrains Mono: `0 de 500 caracteres`.
   - Foco: borda de 1.5px `musgo`, transição `dur-fast`.
4. `space-6` abaixo, botão primário pill de largura total, 48px, fundo `musgo`, texto `papel` em `body-strong`: `Revisar denúncia`. Ele **não envia**: leva ao passo 2. Fica **habilitado** mesmo com o campo vazio, para que o toque mostre o erro de 4.3 em vez de um botão mudo.

### Passo 2: confirmação

O **conteúdo do mesmo sheet é trocado**, sem abrir um segundo sheet por cima. A troca é um fade cruzado em `dur-base` com `ease-in-out`; sob `prefers-reduced-motion`, troca direta. A alça continua.

1. Título em `title-sm` `tinta`: `Enviar esta denúncia?` Sem `X` neste passo: a saída é `Voltar ao motivo`.
2. `space-3` abaixo, consequência em `body` `grafite`: `A resenha de Letícia Nakamura e o seu motivo vão para a moderação. Depois de enviada, a denúncia não pode ser desfeita.` Para comentário: `O comentário de Rafael Okamoto e o seu motivo vão para a moderação. Depois de enviada, a denúncia não pode ser desfeita.`
3. `space-4` abaixo, **o motivo repetido para conferência**: bloco com borda esquerda de 2px `linha`, padding esquerdo `space-4`, sem fundo. Acima, em `label` `grafite`, `Seu motivo`; abaixo, o texto digitado em `body` `tinta`, inteiro, sem corte. Em Manrope, porque é texto do leitor, não resenha.
4. `space-6` abaixo, botão **destrutivo em outline** `rubi` (borda de 1px `rubi`, texto `rubi` em `body-strong`, fundo transparente, `radius` 12), largura total, 48px, com `Flag` (Phosphor, `regular`, 20px, `rubi`) à esquerda do texto e `space-2` de gap: `Enviar denúncia`.
5. `space-3` abaixo, botão textual `grafite`, largura total, 48px: `Voltar ao motivo`. Volta ao passo 1 com o texto intacto.

O foco entra em `Voltar ao motivo`, nunca no destrutivo.

### 4.1 Motivo vazio

O leitor acabou de tocar em `Denunciar resenha` no menu da resenha de Letícia Nakamura.

- Passo 1 com o cabeçalho `Denunciar resenha`, o card da resenha com o trecho em Newsreader (duas linhas e meia de texto, sem corte) e o campo vazio com o placeholder.
- Contador `0 de 500 caracteres`. Botão `Revisar denúncia` habilitado.
- O teclado **não sobe sozinho**: o leitor lê o trecho antes de escrever.

### 4.2 Motivo escrito

- Campo com o motivo de exemplo, com o foco (borda de 1.5px `musgo`) e o cursor no fim. Teclado aberto, cobrindo a parte de baixo da viewport; o sheet subiu junto e o botão `Revisar denúncia` está logo acima do teclado.
- O card do conteúdo continua visível no topo do sheet.
- Contador `78 de 500 caracteres`.

### 4.3 Motivo em branco

O leitor tocou em `Revisar denúncia` com o campo vazio, ou só com espaços.

- Campo com borda de 1.5px `rubi`. No lugar do helper, em `caption` `rubi`, com `space-2` de gap: `Escreva o motivo da denúncia para continuar.` O contador continua à direita, em `grafite`.
- O foco volta ao campo. O sheet não troca de passo.
- **Motivo acima do limite** usa a mesma forma, sem artboard próprio: contador em `rubi` (`512 de 500 caracteres`) e, no lugar do helper, `O motivo passou do limite de 500 caracteres.` O texto não é cortado sozinho.

### 4.4 Confirmar denúncia

Passo 2, depois de 4.2.

- Teclado fechado. Sheet com `Enviar esta denúncia?`, a consequência com o nome de Letícia Nakamura, o bloco `Seu motivo` com `A resenha conta quem narra a segunda parte do livro sem avisar que tem spoiler.`, o destrutivo `Enviar denúncia` e `Voltar ao motivo`.
- O card do conteúdo **não se repete** neste passo: o nome na consequência basta, e o sheet fica curto.

### 4.5 Enviando

Depois do toque em `Enviar denúncia`.

- Passo 2 como em 4.4. O destrutivo mostra `Enviando denúncia`, com o mesmo outline `rubi`, sem spinner e sem esmaecer. `Voltar ao motivo` fica desabilitado, em `grafite-suave`. O scrim não fecha o sheet enquanto envia.
- Se o servidor demorar além de três segundos, abaixo dos botões, em `caption` `grafite`, centralizado: `O serviço está iniciando. Isso pode levar alguns segundos.` É o estado de cold start (RNF-ERR-09).

### 4.6 Falha no envio

O servidor não respondeu. **Nada foi enviado, e o motivo continua na tela.**

- O sheet volta ao **passo 2**, com tudo como em 4.4.
- Entre a consequência e o bloco `Seu motivo`, banner inline de largura total: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda com `space-3` de gap, texto em `body` `tinta`: `Não foi possível enviar a denúncia. Verifique sua conexão e tente de novo.`
- O destrutivo volta a `Enviar denúncia`. Tocar de novo repete **a mesma solicitação** (RNF-ERR-04): se a primeira tiver chegado ao servidor, a moderação não recebe duas denúncias.

### 4.7 Muitas denúncias em pouco tempo

O servidor recusou pelo limite de frequência (RNF-SEC-18). Nada foi enviado.

- Passo 2 como em 4.4. No lugar do banner de 4.6, faixa de alerta: fundo `ambar-fundo`, `radius` 12, padding `space-4`, `Clock` (Phosphor, `regular`, 20px, `tinta`), texto em `body` `tinta`: `Você enviou muitas denúncias em pouco tempo. Espere alguns minutos e tente de novo.`
- O motivo está preservado. O destrutivo `Enviar denúncia` continua habilitado. O tempo de espera **não é exibido**, porque o contrato não diz se o servidor informa quanto falta.

### 4.8 Denúncia enviada

O envio deu certo. O sheet fechou e o leitor está de volta à **página do livro**, rolada no mesmo ponto.

- Base: `Página do livro · Resenhas e frases (rolada)` sem scrim, com a barra inferior acionável de novo. **A resenha de Letícia Nakamura continua lá**, igual: a denúncia não esconde o conteúdo para quem denunciou.
- **Toast** acima da barra inferior, com `space-4` de margem lateral: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, **barra lateral de 4px em `musgo`** à esquerda, `CheckCircle` (Phosphor, `regular`, 20px, `musgo`) e o texto em `body` `tinta`: `Denúncia enviada. A moderação vai analisar.` À direita, `X` (Phosphor, `regular`, 20px, `grafite`) com alvo de 48px, rótulo acessível `Fechar aviso`.
- O toast entra de baixo em `dur-base` com `ease-out` e sai em `dur-base` com `ease-in`. A duração de permanência **não está definida** no documento de design; o artboard mostra o toast parado.
- O foco volta ao `DotsThree` da resenha, que abriu o menu.

### 4.9 Conteúdo indisponível

Entre abrir o sheet e enviar, a resenha foi excluída pela autora ou o perfil dela ficou privado para o leitor. O servidor recusou o envio porque o leitor já não tem acesso ao conteúdo.

- O sheet troca para um terceiro conteúdo, sem campo:
  - Título em `title-sm` `tinta`: `Esta resenha não está mais disponível`.
  - `space-3` abaixo, em `body` `grafite`: `Ela pode ter sido excluída, ou o perfil de quem a escreveu mudou a privacidade. Não há o que denunciar.`
  - `space-6` abaixo, botão secundário de largura total, 48px, borda de 1px `linha`, texto `tinta`: `Fechar`.
- Para comentário: `Este comentário não está mais disponível` e `Ele pode ter sido excluído, ou a atividade deixou de estar visível para você. Não há o que denunciar.`
- O motivo digitado é descartado sem pergunta, porque não há para onde enviá-lo.

### 4.10 Descartar a denúncia?

O leitor tocou no `X` com o motivo de 4.2 escrito. O conteúdo do sheet é trocado por uma confirmação (design §4.11), no mesmo sheet:

1. Título em `title-sm` `tinta`: `Descartar esta denúncia?`
2. `space-3`, texto em `body` `grafite`: `O motivo que você escreveu não será guardado. Nada vai para a moderação.`
3. `space-6`, botão destrutivo em outline `rubi`, largura total, 48px: `Descartar`.
4. `space-3`, botão textual `grafite`, largura total: `Continuar escrevendo`.

O foco entra em `Continuar escrevendo`. Com o campo vazio, o `X` fecha direto, sem esta pergunta.

### 4.11 Denunciar comentário

A variante do alvo comentário, no passo 1 com o motivo escrito.

- **Base:** o sheet de comentários do canvas do Período 1 (`Comentários`, atividade `Rafael Okamoto publicou uma resenha` de `Os Sertões`, com as respostas expandidas), coberto pelo scrim `#171512` a 40%. O sheet de denúncia fica **por cima** do sheet de comentários, ancorado embaixo, com o mesmo desenho de 4.1. Fechar a denúncia devolve ao sheet de comentários, aberto no mesmo ponto.
- Cabeçalho `Denunciar comentário`.
- Card do conteúdo: avatar de 32px, `Rafael Okamoto`, `Resposta em Os Sertões` e o trecho `Vale. A terceira parte reorganiza tudo o que a segunda parece atrasar.` em Manrope `body` `tinta`.
- Campo com `Resposta repetida em várias atividades minhas, parece divulgação.`, contador `65 de 500 caracteres`, sem foco, teclado fechado.
- Botão `Revisar denúncia`.
- O item de menu que abre esta tela, `Denunciar comentário`, é desenhado na edição de comentários do lote 5, não aqui.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

**A partir de 768px a tela é um dialog centrado** (design §4.11) sobre a página do livro, e não uma página própria: a resenha continua visível atrás do scrim, e fechar devolve o leitor exatamente onde estava.

**Base de todos os artboards web:** o artboard `Página do livro · Resenhas e frases (rolada)` da web, com o grid de resenhas na coluna da direita, sob o scrim `#171512` a 40%. A sidebar do shell à esquerda: coluna fixa de 248px, fundo `papel-elevado`, borda direita de 1px `linha`; bloco do topo de 72px, padding lateral `space-5`, com o lockup horizontal da marca em `musgo` (24px de altura) à esquerda e `SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita; `space-4` abaixo, os quatro itens (`Estante`, `Descobrir`, `Feed`, `Perfil`) empilhados com `space-1` de gap, 44px de altura, `radius` 12, padding lateral `space-4`, ícone de 20px e rótulo em `body-strong`; inativo em `regular` `grafite`, ativo com fundo `musgo-fundo`, ícone `fill` e rótulo `musgo`. Item ativo: **Descobrir**. **Sem sino na web**: notificações estão fora do escopo do cliente web. Nada no rodapé da sidebar.

**Dialog:**

- 480px de largura, fundo `papel`, `radius-xl` 24 nos quatro cantos, `elev-3`, sem alça, padding `space-6`. Altura pelo conteúdo, máximo de 760px; o que não cabe rola dentro do corpo.
- **Passo 1:** cabeçalho com `Denunciar resenha` em `title` `tinta` à esquerda e `X` (Phosphor, `regular`, 20px, `grafite`) à direita, área de clique de 40px, rótulo acessível `Fechar`. `space-4` abaixo, o card do conteúdo igual ao mobile. `space-6` abaixo, o campo de motivo com label, área de texto de quatro linhas, helper e contador, iguais ao mobile. `space-6` abaixo, o rodapé com os botões **alinhados à direita**, `space-3` entre eles: `Cancelar` textual `grafite` primeiro e o primário pill de 40px `Revisar denúncia`.
- **Passo 2:** o conteúdo do mesmo dialog é trocado, com a mesma largura: título `Enviar esta denúncia?` em `title-sm`, consequência, bloco `Seu motivo` e, no rodapé alinhado à direita, `Voltar ao motivo` textual `grafite` primeiro e o destrutivo outline `rubi` de 40px com `Flag` e `Enviar denúncia`.
- `hover`: `Cancelar` e `Voltar ao motivo` ganham fundo `papel-elevado`; o primário passa a `musgo-vivo`; o destrutivo ganha fundo `rubi-fundo`. Transição `dur-fast`.
- Foco de teclado visível em todo elemento interativo, com contorno de 2px `musgo` e offset de 2px. `Esc` e clique no scrim fecham, com a mesma confirmação de 4.10 quando há motivo escrito.
- **Abaixo de 768px** o dialog vira o bottom sheet do mobile.

### 5.1 Motivo escrito

- Dialog no passo 1 sobre a página do livro, aberto a partir do card de `Letícia Nakamura`, que aparece atrás do scrim.
- Card do conteúdo com o trecho em Newsreader.
- Campo com o motivo de exemplo, com foco (borda de 1.5px `musgo`), contador `78 de 500 caracteres`.
- Rodapé com `Cancelar` e `Revisar denúncia`, este em hover (`musgo-vivo`, cursor de ponteiro).

### 5.2 Confirmar denúncia

- Mesmo dialog, passo 2, com a consequência, o bloco `Seu motivo` e o rodapé `Voltar ao motivo` e `Enviar denúncia`.
- Foco de teclado visível em `Voltar ao motivo`, com o contorno de 2px `musgo`.

### 5.3 Muitas denúncias em pouco tempo

- Dialog no passo 2 com a faixa `ambar-fundo` de 4.7 entre a consequência e o bloco `Seu motivo`. Rodapé igual a 5.2.

### 5.4 Denúncia enviada

- O dialog fechou. A página do livro está sem scrim, com a sidebar e o **Descobrir** ativo, e o card de Letícia Nakamura continua no grid.
- Toast no canto inferior esquerdo da área de conteúdo, `space-8` da borda esquerda do conteúdo e `space-8` da borda inferior, largura de 400px, com o mesmo desenho de 4.8: barra lateral de 4px `musgo`, `CheckCircle` `musgo`, `Denúncia enviada. A moderação vai analisar.` e `X` para fechar.
- O foco volta ao `DotsThree` do card da resenha.

---

## 6. Artboards em modo escuro

Lock de página inteira. Superfície elevada **mais clara** que o fundo, `musgo-claro` como acento, shadows com metade da opacidade: a hierarquia vem da cor de superfície e do divisor `linha-noite`. Scrim preto a 60%.

### 6.1 Motivo escrito (mobile)

Equivalente a 4.2, com o teclado fechado.

- Página do livro atrás em `noite`, sob o scrim. Sheet em `noite-elevada`, **mais claro** que o fundo, alça em `linha-noite`.
- Título e `X` em `papel-suave`. Card do conteúdo em `noite`, para contrastar com o sheet, com nome e trecho em `papel-suave` e a linha `Resenha de Torto Arado` em `grafite-claro`.
- Campo com fundo `noite` e borda `linha-noite`, texto em `papel-suave`, label, helper e contador em `grafite-claro`, placeholder em `grafite-fundo-escuro`.
- Primário com fundo `musgo-claro` e texto `noite`.

### 6.2 Confirmar denúncia (mobile)

Equivalente a 4.4. Título em `papel-suave`, consequência em `grafite-claro`, bloco `Seu motivo` com borda `linha-noite` e texto em `papel-suave`. Destrutivo em outline `rubi-claro`, com texto e `Flag` em `rubi-claro`. `Voltar ao motivo` em `grafite-claro`.

### 6.3 Motivo escrito (web)

Equivalente a 5.1. Página do livro atrás em `noite`, sidebar em `noite-elevada` com **Descobrir** ativo em `musgo-fundo-escuro`, tudo sob o scrim preto a 60%. Dialog em `noite-elevada`, card do conteúdo e campo em `noite` com borda `linha-noite`. `Cancelar` em `grafite-claro`, primário em `musgo-claro` com texto `noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Bottom sheet, dialog centrado e confirmação destrutiva | documento-de-design §4.11 e §7.8 |
| Botão primário pill, secundário, textual e destrutivo em outline | documento-de-design §4.1 |
| Área de texto com label, foco, erro e helper | documento-de-design §4.2 e §7.9 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6 |
| Corpo de resenha em Newsreader | documento-de-design §3.2.2 |
| Banner inline de erro | nasceu no Período 1, usado em `descobrir.md` e `criar-desafio.md` |
| Faixa de alerta em `ambar-fundo` | nasceu no lote 3 do Período 2, em `F-REC-P2P/recomendar-livro.md`, incorporação pendente |
| Confirmação que troca o conteúdo do mesmo sheet ou dialog | nasceu no lote 3 do Período 2, em `F-LST/criar-lista.md`, incorporação pendente |
| Contador de caracteres na linha do helper | nasceu no lote 3 do Período 2, incorporação pendente |
| Toast de confirmação com ícone e posição | nasceu no lote 3 do Período 2, em `F-REC-P2P/recomendar-livro.md`, incorporação pendente |
| Sheet de comentários (base de 4.11) | `periodo-1/F-FEED/comentarios.md` |
| Shell (barra inferior e sidebar) | `periodo-0/P0-NAV/shell-de-navegacao.md` |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3, não ficam decididos só neste prompt:

1. **Card do conteúdo denunciado:** `papel-elevado`, `radius-md`, autoria com avatar de 32px e a linha `Resenha de <livro>` ou `Resposta em <livro>`, trecho de até três linhas (Newsreader para resenha, Manrope para comentário), variante de spoiler que não revela o texto. O painel de moderação usa o mesmo card na versão completa.
2. **Denúncia em dois passos no mesmo sheet:** motivo com `Revisar denúncia`, e confirmação com o motivo repetido e o destrutivo `Enviar denúncia`. É a forma escolhida aqui para a confirmação de RNF-USA-04; a alternativa, um único passo com o destrutivo `Enviar denúncia` direto sob o campo, fica registrada para o grupo decidir.
3. **Bloco de conferência do texto digitado** (`Seu motivo`, borda esquerda de 2px `linha`), no passo de confirmação.
4. **Destrutivo com ícone** (`Flag` à esquerda do texto em outline `rubi`). O §4.1 não diz se o destrutivo leva ícone.
5. **Estado de conteúdo indisponível** dentro do sheet, quando o servidor recusa por falta de acesso.
6. **Sheet sobre sheet** no caso do comentário: o de denúncia empilhado sobre o de comentários. O §4.11 não trata empilhamento.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do passo 1, resenha | `Denunciar resenha` |
| Título do passo 1, comentário | `Denunciar comentário` |
| Rótulo acessível do fechar | `Fechar` |
| Linha do card, resenha | `Resenha de Torto Arado` |
| Linha do card, comentário | `Resposta em Os Sertões` |
| Trecho da resenha | `A troca de narradora no meio da história é o melhor recurso do romance. Demorei a entender e depois não consegui parar.` |
| Trecho do comentário | `Vale. A terceira parte reorganiza tudo o que a segunda parece atrasar.` |
| Card de resenha com spoiler | `Resenha com spoiler. O texto fica oculto aqui.` |
| Label do campo | `Motivo da denúncia` |
| Placeholder | `Por exemplo: conta o final sem aviso de spoiler` |
| Helper | `Obrigatório. Conte o que há de errado com as suas palavras.` |
| Contador | `0 de 500 caracteres`, `78 de 500 caracteres`, `65 de 500 caracteres`, `512 de 500 caracteres` |
| Erro, motivo em branco | `Escreva o motivo da denúncia para continuar.` |
| Erro, acima do limite | `O motivo passou do limite de 500 caracteres.` |
| Motivo de exemplo, resenha | `A resenha conta quem narra a segunda parte do livro sem avisar que tem spoiler.` |
| Motivo de exemplo, comentário | `Resposta repetida em várias atividades minhas, parece divulgação.` |
| Botão do passo 1 | `Revisar denúncia` |
| Botão secundário da web, passo 1 | `Cancelar` |
| Título do passo 2 | `Enviar esta denúncia?` |
| Consequência, resenha | `A resenha de Letícia Nakamura e o seu motivo vão para a moderação. Depois de enviada, a denúncia não pode ser desfeita.` |
| Consequência, comentário | `O comentário de Rafael Okamoto e o seu motivo vão para a moderação. Depois de enviada, a denúncia não pode ser desfeita.` |
| Rótulo do bloco de conferência | `Seu motivo` |
| Destrutivo | `Enviar denúncia` |
| Destrutivo enviando | `Enviando denúncia` |
| Voltar | `Voltar ao motivo` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Falha no envio | `Não foi possível enviar a denúncia. Verifique sua conexão e tente de novo.` |
| Limite de frequência | `Você enviou muitas denúncias em pouco tempo. Espere alguns minutos e tente de novo.` |
| Indisponível, resenha, título | `Esta resenha não está mais disponível` |
| Indisponível, resenha, texto | `Ela pode ter sido excluída, ou o perfil de quem a escreveu mudou a privacidade. Não há o que denunciar.` |
| Indisponível, comentário, título | `Este comentário não está mais disponível` |
| Indisponível, comentário, texto | `Ele pode ter sido excluído, ou a atividade deixou de estar visível para você. Não há o que denunciar.` |
| Indisponível, botão | `Fechar` |
| Descartar, título | `Descartar esta denúncia?` |
| Descartar, texto | `O motivo que você escreveu não será guardado. Nada vai para a moderação.` |
| Descartar, destrutivo | `Descartar` |
| Descartar, manter | `Continuar escrevendo` |
| Toast | `Denúncia enviada. A moderação vai analisar.` |
| Rótulo acessível do fechar do toast | `Fechar aviso` |

Zero em-dash, zero emoji, nenhum número sem unidade.

---

## 9. Acessibilidade e interação

- **Contraste:** trecho, motivo e consequência em `tinta` ou `grafite`, que passam em AA no corpo. `grafite-suave` só no placeholder e no botão desabilitado de 4.5. O destrutivo em `rubi` sobre `papel` e `rubi-claro` sobre `noite-elevada` passam em AA.
- **Alvos:** `X`, botões e o `X` do toast com 48px de alvo no mobile; na web, botões de 40px e área de clique de 40px no `X`.
- **Campo obrigatório anunciado:** a área de texto é marcada como obrigatória para leitor de tela e tem o helper associado a ela. O erro de 4.3 é associado ao campo e anunciado quando aparece; o foco volta ao campo.
- **Contador:** anunciado ao passar do limite, não a cada tecla.
- **Troca de passo:** ao ir para o passo 2, o foco vai para o título `Enviar esta denúncia?` e, em seguida, a ordem leva a `Voltar ao motivo` antes do destrutivo. Ao voltar, o foco retorna ao campo com o texto intacto.
- **Confirmação:** nada é enviado sem o toque em `Enviar denúncia`, no passo 2 (RNF-USA-04). O foco inicial do passo 2 nunca é o destrutivo. Fechar com motivo escrito pede confirmação, com o foco em `Continuar escrevendo`.
- **Resultado:** o banner de falha, a faixa de limite, o estado indisponível e o toast são regiões anunciadas quando aparecem. O toast não rouba o foco; o foco volta ao `DotsThree` que abriu o menu.
- **Reenvio seguro:** tocar de novo depois de uma falha repete a mesma solicitação, sem duplicar a denúncia (RNF-ERR-04).
- **Texto do usuário:** o motivo é mostrado escapado, como texto puro, no bloco de conferência (RNF-SEC-14). Nada de Markdown ou link no motivo.
- **Motion:** sheet, dialog, troca de passo e toast respeitam `prefers-reduced-motion`: sob reduce, aparecem e somem sem deslizar.
- **Teclado do aparelho:** o botão do passo 1 acompanha o teclado e continua alcançável com ele aberto.

---

## 10. O que não fazer nesta tela

**Denúncia**

- Não desenhe lista de motivos, categorias, chips (`Spam`, `Ofensivo`, `Spoiler`), botões de opção nem caixa de seleção. O motivo é um campo de texto e só um.
- Não desenhe campo de descrição separado, campo de "detalhes" nem anexo.
- Não envie nada no passo 1. `Revisar denúncia` só leva à confirmação.
- Não esconda nem borre a resenha ou o comentário depois de denunciar: o conteúdo continua visível até a moderação decidir.
- Não desenhe tela de "minhas denúncias", acompanhamento, protocolo nem status da denúncia.
- Não ofereça bloquear, silenciar ou deixar de seguir o autor dentro desta tela: o produto não tem essas ações.
- Não mostre `Denunciar` em conteúdo do próprio leitor.
- Não desenhe denúncia de lista, frase, perfil ou livro: só resenha e comentário são denunciáveis.
- Não diga ao leitor que o autor "não vai saber quem denunciou": o contrato não afirma isso.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora do trecho da resenha: o motivo, o trecho de comentário e toda a interface são Manrope.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela, e esta não precisa de nenhum.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO" nem de indicador `Passo 1 de 2`.

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.
- Nada de sheet inteiro em `rubi` ou `rubi-fundo`: o vermelho fica no destrutivo, no erro e no banner de falha. `ambar` só na faixa de limite.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando.
- Nada de animação de bandeira, sacudida ou alarme ao enviar.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético nem de tom acusatório. `Motivo da denúncia`, não "O que te incomodou?". Nada de "Obrigado por proteger a comunidade".
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast com fundo saturado verde ou vermelho.
- Nada de botão destrutivo preenchido. `Enviar denúncia` e `Descartar` são outline `rubi`.
- Nada de undo depois de enviada: a denúncia não se desfaz.

**Formulários**

- Nada de placeholder no lugar do label. Label sempre acima do campo.
- Nada de helper que só aparece depois do erro. O helper e o contador são visíveis o tempo todo.
- Nada de botão mudo: `Revisar denúncia` fica habilitado e o toque mostra o erro.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de página própria de denúncia na web: é dialog sobre a página do livro.
- Nada de dialog mais largo que 480px.
- Nada de conteúdo essencial escondido em hover.
- Nada de layout que não vire o bottom sheet do mobile abaixo de 768px.
- Nada de hero, logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos por denunciar.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários nem canal de contato com a moderação.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social.
- Sem leitura de e-book dentro do aplicativo.
- Sem suspensão de conta: isso é RF-MOD-04, do Período 3.
