# Comentários (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Comentários`, gerado por `docs/design/periodo-1/F-FEED/comentarios.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-FEED/comentarios.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-SOCIAL-2.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-MOD.md
**Requisitos que entram:**
- F-SOCIAL-2: RF-SOC-13 (editar e excluir os próprios comentários; exclusão física, com modal irreversível), RF-SOC-15 (`@username` existente vira link para o perfil; inexistente continua texto comum)
- F-MOD: RF-MOD-01 (só a entrada `Denunciar comentário`; o campo de motivo e a confirmação moram em [`../F-MOD/denunciar.md`](../F-MOD/denunciar.md))

**Não funcionais:** RNF-SEC-02 (só o autor edita e exclui, verificado no servidor), RNF-SEC-03 (o link de menção revalida RN-08 no destino), RNF-SEC-14 (comentário continua texto puro, escapado), RNF-SEC-18 (rate limiting em menção), RNF-USA-04 (confirmação antes de excluir), RNF-USA-05 (mensagens acionáveis), RNF-ERR-09 (cold start é carregamento, não erro)
**Regras de negócio:** RN-10 (um nível de resposta; 10.1 menção só vira link se o username existir; 10.4 perfil privado notifica normalmente e o link segue RN-08; 10.5 excluir a raiz remove as respostas), RN-08 (o link abre a identidade pública; o conteúdo restrito continua restrito)
**Versão web:** sim. RF-SOC-13, RF-SOC-15 e RF-MOD-01 têm marcação na coluna Web de `REQUISITOS.md` §5.9 e §5.11.

---

## 1. O que muda e por quê

No Período 1 o comentário era escrito uma vez e ficava. A menção era texto em negrito, não navegável, e não havia nenhum menu no comentário. O Período 2 acrescenta três coisas, todas pelo mesmo ponto de entrada: **um `DotsThree` em cada comentário e em cada resposta**.

| O que entra | Onde aparece | Feature |
|---|---|---|
| Menu do próprio comentário com `Editar` e `Excluir` | `DotsThree` de todo comentário ou resposta do leitor logado | F-SOCIAL-2 |
| Modo de edição no campo do rodapé, com a barra `Editando comentário` | Campo de escrita, no lugar do modo de comentar | F-SOCIAL-2 |
| Confirmação de exclusão, que avisa quando as respostas saem junto | Sheet (mobile) ou dialog (web) empilhado sobre a conversa | F-SOCIAL-2 |
| Menção resolvida como link em `musgo` | Texto de qualquer comentário com `@username` existente | F-SOCIAL-2 |
| Marcador `editado` ao lado do tempo | Comentário que já foi editado | F-SOCIAL-2 (proposta deste prompt) |
| Menu de comentário de outro leitor com `Denunciar comentário` | `DotsThree` de todo comentário ou resposta de outra pessoa | F-MOD |

**Para onde cada item leva:**

| Item | Destino |
|---|---|
| `Editar` | fica nesta tela: o texto vai para o campo do rodapé |
| `Excluir` | fica nesta tela: confirmação empilhada |
| `Denunciar comentário` | tela [`../F-MOD/denunciar.md`](../F-MOD/denunciar.md), artboard `Denunciar comentário`: sheet empilhado sobre este sheet; fechar a denúncia devolve a esta conversa, aberta no mesmo ponto |
| Link de menção | perfil do leitor mencionado. Perfil privado sem seguimento abre só nome, avatar e biografia, com o bloco de restrição que o perfil já tem |

**Quem pode o quê.** Editar e excluir são **só do autor do comentário** (RNF-SEC-02). O autor da atividade não apaga comentário de outra pessoa na própria atividade, e a conta admin não ganha remoção direta aqui: remover comentário denunciado é do painel de moderação da web. Ninguém denuncia o próprio comentário. Por isso o menu tem dois conteúdos e **nunca os mistura**.

**O que deixa de valer do Período 1.** A seção 10 do prompt original proibia editar, excluir, denunciar e tornar a menção um link. As quatro proibições caem nesta edição. Continua proibido todo o resto: terceiro nível de recuo, Markdown, URL clicável, imagem, autocompletar de `@`, curtir comentário, comentário otimista, toast para confirmar envio.

### Dados novos

**Leitor logado:** `Marina Beltrão`, `@marinableu`, o avatar `MB` que o canvas já mostra no campo de escrita. No Período 1 nenhum comentário da lista era dela; esta edição acrescenta um, para que o menu do próprio comentário tenha onde aparecer.

**Comentário novo**, terceira raiz, depois do de `Nadia Sampaio`, porque a ordem é cronológica:

| Nível | Quem | Texto publicado | Quando |
|---|---|---|---|
| raiz | Marina Beltrão `@marinableu` | `Comecei semana passada, por indicação da @nadiasampaio. Guardei a sua resenha para quando terminar A Terra.` | `12 min` |
| resposta | Rafael Okamoto `@rafaokamoto` | `Boa. A Terra é a parte que mais afasta, depois engata.` | `8 min` |

**Texto depois da edição**, usado nos artboards de edição: `Comecei semana passada, por indicação da @nadiasampaio e da @helenaprof. Guardei a sua resenha para quando terminar A Terra.` O username `@helenaprof` **não existe** no produto (um erro de digitação plausível) e por isso continua texto comum; `@nadiasampaio` existe e vira link.

**Contagem no cabeçalho:** passa a `6 comentários` (quatro do Período 1 mais os dois novos). O canvas do Período 1 mostra `3 comentários` para quatro itens listados; esta edição corrige o número. Depois de excluir o comentário de Marina, que leva a resposta de Rafael junto, a contagem cai para `4 comentários`.

**Menções existentes:** a resposta de `Júlia Wenceslau` começa com `@rafaokamoto`, username que existe: vira link.

**Comentário de terceiro usado no menu de denúncia:** a resposta de `Rafael Okamoto` sob o comentário de `Dandara Lopes`, `Vale. A terceira parte reorganiza tudo o que a segunda parece atrasar.`, a mesma que o canvas de denúncia mostra.

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
A partir de 768px: dialog centrado, 480px de largura, radius-xl nos quatro
cantos, sem alça.
Scrim: #171512 a 40% no claro e preto a 60% no escuro. É cor fixa.
O sheet sobe em dur-slow com ease-out e sai em dur-base com ease-in. O dialog
entra em dur-base com deslize curto de 16px e fade. Foco preso dentro
enquanto aberto; Esc e toque no scrim fecham; o foco volta ao elemento que
abriu.
Menu de ações: itens de 56px com ícone Phosphor regular de 20px e rótulo em
body, space-4 de gap, divisor linha entre eles, item destrutivo em rubi
(rubi-claro no escuro), e space-4 depois um botão textual grafite de largura
total, "Cancelar".
Confirmação destrutiva: título em title-sm, consequência em body grafite
nomeando o que se perde. No mobile os botões empilham em largura total, o
destrutivo em cima; na web ficam lado a lado, alinhados à direita, Cancelar
primeiro. O foco entra em Cancelar, nunca no destrutivo. Botão destrutivo é
sempre outline rubi, nunca preenchido.

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

- **O shell inteiro**, como está no canvas: o feed ao fundo com a barra inferior e `Feed` ativo no mobile, a sidebar com `Feed` ativo e a marca do jeito que já aparece na web, e a camada de escurecimento por cima de tudo. Esta edição não mexe em navegação.
- **O sheet de comentários** do mobile e o **dialog de 640px** da web: superfície, cantos, alça, altura de 88% da viewport, entrada, cabeçalho `Comentários` com a contagem, `X` de fechar e o **resumo da atividade** (`Rafael Okamoto publicou uma resenha`, `Os Sertões, de Euclides da Cunha`) com a capa de 32 por 48px em canto vivo, não acionável.
- **A anatomia do comentário e da resposta:** avatar de iniciais em círculo `musgo-fundo` (32px na raiz, 28px na resposta do mobile, 32px na web), nome em `body-strong`, `·` e tempo em `caption` `grafite-suave`, texto em `body` `tinta`, `Responder` em `caption` 600 `grafite`, e o botão `Ver 2 respostas` com o traço de 16px. O recuo único de `space-10` no mobile e `space-12` na web.
- **O campo de escrita** no modo de comentar: avatar `MB`, campo `radius-full`, placeholder `Escreva um comentário`, `PaperPlaneRight` em `grafite-suave` vazio e `musgo` com texto.
- **A barra de contexto** `Respondendo a Júlia` e a menção pré-preenchida `@juwences ` no campo, que continua **texto comum dentro do campo**: o link só existe no comentário publicado.
- **Artboards que não mudam em nada:** `Comentários · Sem comentários`, `Comentários · Carregando`, `Comentários · Erro ao carregar` e `Comentários · Web, sem comentários`. Neles não há comentário carregado, logo não há menu nem menção.
- **As regras de RN-10:** um nível de recuo, resposta de resposta como irmã, ordem cronológica.
- **Toda a copy do Período 1** que não aparece na seção 8 como substituída.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas.

### 4.1 Elementos que entram em todos os artboards com comentários carregados

Vale para `Comentários · Padrão, respostas recolhidas`, `Comentários · Respostas expandidas`, `Comentários · Respondendo com menção`, `Comentários · Enviando, com cold start`, `Comentários · Limite de comentários`, `Comentários · Web, padrão com respostas expandidas`, `Comentários · Web, respondendo com menção`, `Comentários · Escuro, padrão`, `Comentários · Escuro, respondendo com menção` e `Comentários · Escuro, web padrão`.

**`DotsThree` em cada comentário e em cada resposta:**

- Na primeira linha do comentário, a de nome e tempo, **alinhado à direita** da linha: `DotsThree` (Phosphor, `regular`, 20px, `grafite`). O nome e o tempo continuam à esquerda, como estão.
- Alvo de toque de 48px, centrado no ícone, que pode avançar sobre o padding do comentário sem empurrar o texto para baixo.
- Aparece **sempre**, em todo comentário e toda resposta, do leitor ou de outra pessoa. O conteúdo do menu é que muda (artboards 5.1 e 5.9). Não existe comentário sem `DotsThree`.
- Na web, o mesmo ícone no mesmo lugar, com área de clique de 32px e hover com fundo `linha` em `radius-full`, `dur-fast`. **Não aparece só no hover:** fica visível o tempo todo.

**Menção resolvida vira link:**

- `@rafaokamoto`, no começo da resposta de `Júlia Wenceslau`, passa de `body-strong` `tinta` para **`body` peso 600 `musgo`**. Mesmo tamanho e entrelinha do texto em volta, sem sublinhado em repouso, sem fundo, sem ícone.
- No Período 1 a menção era `tinta` justamente porque não navegava, e pintá-la com o acento prometeria uma navegação que não existia. Agora ela navega, então usa a cor de link do produto. É a única mudança de cor no texto do comentário.
- Na web, hover sublinha e leva a cor a `musgo-vivo`, `dur-fast`.
- Menção **não resolvida** (username que não existe) continua **exatamente como o resto do texto**: `body` 400 `tinta`, sem negrito. Não recebe cor, sublinhado, ícone de aviso nem tachado: é texto comum (RN-10.1).

**Comentário de Marina Beltrão:**

- Entra como terceira raiz, depois do de `Nadia Sampaio`, com o avatar `MB`, `Marina Beltrão · 12 min`, o texto publicado da seção 1 (com `@nadiasampaio` em link `musgo`), `Responder` e, abaixo, `Ver 1 resposta` com o traço de 16px.
- Nos artboards em que a lista não cabe, ele fica **cortado pela borda do sheet ou do dialog**, como qualquer conteúdo que rola. Não encolha os outros comentários para fazê-lo caber.
- Não recebe destaque de "seu comentário": nem fundo, nem rótulo `Você`, nem cor diferente no nome. O que o diferencia é o conteúdo do menu.

**Contagem:** `3 comentários` passa a `6 comentários` no cabeçalho de todos esses artboards.

### 4.2 `Comentários · Respostas expandidas`

Além de 4.1: este é o artboard em que o link de menção fica visível, na resposta de `Júlia Wenceslau`. Confira que o `DotsThree` das duas respostas fica alinhado à direita da mesma coluna que o `DotsThree` das raízes, apesar do recuo.

### 4.3 `Comentários · Respondendo com menção` e `Comentários · Web, respondendo com menção`

Além de 4.1: nada muda no campo. `@juwences ` continua texto `tinta` dentro do campo, porque só vira link depois de publicado e resolvido pelo servidor.

### 4.4 `Comentários · Enviando, com cold start` e `Comentários · Limite de comentários`

Só 4.1. Enquanto um comentário está sendo enviado, os `DotsThree` da lista continuam acionáveis.

### 4.5 Modo escuro dos elementos de 4.1

Em `Comentários · Escuro, padrão`, `Comentários · Escuro, respondendo com menção` e `Comentários · Escuro, web padrão`:

- `DotsThree` em `grafite-claro`.
- Menção resolvida em `musgo-claro`, peso 600. Menção não resolvida em `papel-suave`, como o texto.
- Hover do `DotsThree` na web com fundo `linha-noite`.

---

## 5. Artboards novos

Todos entram **no fim da linha** correspondente, na ordem abaixo, sem reordenar os existentes. Em todos, o sheet ou dialog de comentários fica atrás com 4.1 aplicado.

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Comentários · Menu do próprio comentário`

- **Base:** `Comentários · Padrão, respostas recolhidas`, rolado até o comentário de `Marina Beltrão` ficar inteiro visível, com o `Ver 1 resposta` abaixo.
- Sobre o sheet de comentários, um **segundo scrim** `#171512` a 40%, e o **sheet do menu empilhado**, ancorado embaixo, conforme a sobreposição do bloco de contexto: fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha`. Ele é mais baixo que o de comentários e cobre só o rodapé da tela; o topo do sheet de comentários continua visível atrás do scrim.
- Cabeçalho do menu em `caption` `grafite`: `Seu comentário`. Para uma resposta do leitor, `Sua resposta`. Divisor `linha` abaixo.
- Dois itens de 56px, divisor `linha` entre eles:
  - `PencilSimple` (Phosphor, `regular`, 20px, `tinta`) · `Editar`, rótulo em `body` `tinta`.
  - `Trash` (Phosphor, `regular`, 20px, `rubi`) · `Excluir`, rótulo em `body` `rubi`.
- `space-4` abaixo, botão textual `grafite` de largura total: `Cancelar`.
- **Sem `Denunciar comentário` aqui.** Ninguém denuncia o próprio comentário.
- Tocar no scrim, arrastar para baixo ou `Cancelar` fecham só o menu; a conversa continua aberta atrás.

#### 5.2 `Comentários · Editando comentário`

- O menu fechou. O sheet de comentários continua aberto, rolado até o comentário de Marina, com o teclado aberto.
- **O comentário em edição na lista** ganha fundo `musgo-fundo` em `radius` 12, ocupando a largura do comentário dentro do padding lateral, para mostrar qual texto está sendo trocado. O texto dele na lista **ainda é o publicado**, sem mudança: a lista só muda depois que o servidor confirma.
- Acima do campo de escrita, a **barra de contexto de edição**, com o mesmo desenho da barra `Respondendo a Júlia`: largura total, fundo `musgo-fundo`, padding `space-3 space-5`, `PencilSimple` (Phosphor, `regular`, 16px, `musgo`) e `space-2`, texto em `caption` `musgo`: `Editando comentário`. À direita, `X` (Phosphor, `regular`, 20px, `musgo`), alvo de 48px, rótulo acessível `Cancelar edição`.
- **O campo** traz o texto do comentário em `body` `tinta`, já alterado pelo leitor: `Comecei semana passada, por indicação da @nadiasampaio e da @helenaprof. Guardei a sua resenha para quando terminar A Terra.` Dentro do campo as menções são **texto comum**, sem cor. O campo cresceu até três linhas, abaixo do limite de quatro do Período 1. Cursor logo depois de `@helenaprof`.
- **O botão de envio vira `Salvar`:** no lugar do `PaperPlaneRight`, botão textual `Salvar` em `body-strong` `musgo`, alvo de 48px. Fica **desabilitado em `grafite-suave`** enquanto o texto está igual ao publicado ou vazio. Esvaziar o campo não apaga o comentário: apagar é `Excluir`, no menu.
- **Enquanto edita, a lista não oferece outra ação de escrita:** os `Responder` e os `DotsThree` dos outros comentários ficam em `grafite-suave`, desabilitados. Isso evita que o texto em edição seja trocado por uma resposta sem aviso.
- `X` da barra cancela a edição: o campo volta vazio, ao modo de comentar, o fundo `musgo-fundo` sai do comentário e a lista volta a ficar acionável. Sem confirmação, porque o comentário publicado não muda. Fechar o sheet no `X` do cabeçalho ou arrastando para baixo tem o mesmo efeito.
- **Editar mantém o nível.** Editar uma resposta continua resposta, no mesmo recuo e sob a mesma raiz (RN-10).
- Sem autocompletar ao digitar `@`, sem sugestão de nomes.

#### 5.3 `Comentários · Salvando edição`

- Igual a 5.2, com o texto no campo em opacidade reduzida e sem foco possível.
- `Salvar` desabilitado, em `grafite-suave`, com o rótulo trocado para `Salvando`.
- No lugar da barra de contexto, como no `Enviando` do Período 1, uma linha em `caption` `grafite`, padding `space-2 space-5`: `Salvando. O servidor está iniciando e isso pode levar alguns segundos.`
- O comentário na lista **continua com o texto antigo** e o fundo `musgo-fundo`. Sem edição otimista, sem spinner, sem barra indeterminada.

#### 5.4 `Comentários · Erro ao salvar edição`

- Igual a 5.2, com o texto do leitor **intacto no campo** e `Salvar` ativo de novo.
- Acima da barra de contexto, banner largura total, fundo `rubi-fundo`, padding `space-3 space-5`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Não foi possível salvar a edição. O texto continua no campo. Tente de novo.`
- O comentário na lista continua com o texto publicado.
- **Variantes da mesma faixa, sem artboard próprio:**
  - Limite de menções do servidor (RNF-SEC-18): fundo `ambar-fundo`, `Warning` em `ambar`, texto `Muitas menções seguidas. Espere alguns minutos para salvar de novo.` O campo fica desabilitado com o texto preservado, como no `Limite de comentários`.
  - O comentário deixou de existir (excluído em outro aparelho): fundo `rubi-fundo`, texto `Este comentário não existe mais. Ele pode ter sido excluído em outro aparelho.` e botão textual `musgo` `Fechar edição`, que devolve o campo ao modo de comentar; o comentário sai da lista.

#### 5.5 `Comentários · Comentário editado, com menções`

- O servidor confirmou. Campo de volta ao modo de comentar, vazio, com `PaperPlaneRight` em `grafite-suave`. Barra de contexto e fundo `musgo-fundo` saíram. Lista acionável de novo.
- O comentário de Marina mostra o **texto novo**: `@nadiasampaio` em link `musgo` peso 600; `@helenaprof` em `body` 400 `tinta`, igual ao texto em volta, porque o username não existe.
- **Marcador de edição:** na primeira linha, depois do tempo, `· editado` em `caption` `grafite-suave`: `Marina Beltrão · 12 min · editado`. O tempo continua sendo o da publicação.
- `Ver 1 resposta` continua abaixo. A resposta de Rafael não muda.
- **Sem toast.** O texto novo na lista é a confirmação, como o comentário novo era no Período 1.
- A contagem não muda: `6 comentários`.

#### 5.6 `Comentários · Confirmar exclusão com respostas`

- **Base:** `Comentários · Padrão, respostas recolhidas`, rolado até o comentário de Marina, com o segundo scrim `#171512` a 40% por cima.
- **Sheet de confirmação empilhado**, com o mesmo desenho do menu de 5.1: fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça em `linha`.
- Título em `title-sm` `tinta`: `Excluir comentário?`
- `space-3`, consequência em `body` `grafite`: `Seu comentário e a resposta de Rafael Okamoto serão apagados. Não dá para desfazer.`
- `space-6`, dois botões empilhados de largura total, `space-3` de gap:
  - **Destrutivo em cima:** outline, borda de 1px `rubi`, fundo transparente, 48px, `radius` 12, texto `body-strong` `rubi`: `Excluir comentário`. Nunca preenchido.
  - Botão textual `grafite`: `Cancelar`, com o **foco inicial**.
- **Variantes de copy, sem artboard próprio:**
  - Raiz sem respostas, ou resposta: título `Excluir comentário?` ou `Excluir resposta?`, consequência `Seu comentário será apagado. Não dá para desfazer.` ou `Sua resposta será apagada. Não dá para desfazer.`
  - Raiz com mais de uma resposta: `Seu comentário e as 3 respostas a ele serão apagados. Não dá para desfazer.`
- **Excluindo:** depois do toque, o destrutivo fica desabilitado com `Excluindo`, e abaixo dos botões, em `caption` `grafite`, `O servidor está iniciando. Isso pode levar alguns segundos.` quando demora. Sem spinner.
- **Sem undo depois.** A exclusão é física: não existe `Desfazer`, lixeira nem estado de comentário excluído.

#### 5.7 `Comentários · Erro ao excluir`

- O mesmo sheet de 5.6, **aberto**, com o destrutivo ativo de novo.
- Entre a consequência e os botões, `space-4` acima e abaixo, banner fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`), texto em `body` `tinta`: `Não foi possível excluir o comentário. Ele continua publicado. Tente de novo.`
- O rótulo do destrutivo não muda: tocar nele de novo é a tentativa. Atrás, o comentário de Marina segue na lista.

#### 5.8 `Comentários · Depois de excluir`

- O sheet de confirmação fechou. Sheet de comentários sem o comentário de Marina **e sem a resposta de Rafael** que estava sob ele (RN-10.5).
- A lista termina no comentário de `Nadia Sampaio`. **Nenhum espaço vazio, nenhuma linha `Comentário excluído`, nenhum placeholder.** O comentário simplesmente não existe mais.
- Contagem no cabeçalho: `4 comentários`.
- Sem toast. O foco vai para o comentário que ficou imediatamente acima, o de Nadia.

#### 5.9 `Comentários · Menu de comentário de outro leitor`

- **Base:** `Comentários · Respostas expandidas`, com o segundo scrim por cima, aberto a partir do `DotsThree` da **resposta de `Rafael Okamoto`** sob o comentário de `Dandara Lopes`.
- Sheet do menu com o desenho de 5.1.
- Cabeçalho em `caption` `grafite`: `Resposta de Rafael Okamoto`. Para uma raiz, `Comentário de <nome>`. Divisor `linha` abaixo.
- **Um item** de 56px: `Flag` (Phosphor, `regular`, 20px, `rubi`) · `Denunciar comentário` em `body` `rubi`. É destrutivo conforme o menu de ações do bloco de contexto, por isso a cor.
- `space-4` abaixo, `Cancelar` textual `grafite` de largura total.
- Tocar em `Denunciar comentário` troca este menu pelo sheet de denúncia, desenhado em outro canvas (`F-MOD/denunciar.md`). Aqui não se pede confirmação, porque o toque ainda não denuncia nada. Não desenhe o sheet de denúncia neste canvas.
- **Sem `Editar` nem `Excluir`**, mesmo sendo Rafael o autor da atividade: quem apaga um comentário é só quem o escreveu.

### Linha 2, web, no fim da linha, nesta ordem

A SPA em Vue é responsiva: no viewport de celular usa o bottom sheet e o menu em sheet; no desktop usa o dialog e o menu em dropdown. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos. Abaixo de 768px, o dropdown vira o sheet de 5.1 e a confirmação vira o sheet de 5.6.

#### 5.10 `Comentários · Web, menu do próprio comentário`

- **Base:** `Comentários · Web, padrão com respostas expandidas`, com a lista do dialog rolada até o comentário de Marina.
- **Dropdown** ancorado abaixo do `DotsThree` do comentário de Marina, alinhado pela borda direita do ícone, `space-2` abaixo: 220px de largura, fundo `papel`, borda de 1px `linha`, `radius` 12, `elev-2`, padding `space-2` vertical. **Sem scrim**: o dropdown fica dentro do dialog e não o cobre.
- Dois itens de 44px, padding lateral `space-4`, ícone `regular` de 20px, `space-3` de gap: `PencilSimple` · `Editar` em `tinta`, e `Trash` · `Excluir` em `rubi`. O primeiro em hover, com fundo `linha`.
- Sem `Cancelar`: `Esc`, clique fora e novo clique no `DotsThree` fecham só o dropdown.

#### 5.11 `Comentários · Web, editando comentário`

- Equivalente a 5.2 no dialog: fundo `musgo-fundo` no comentário de Marina na lista, barra `Editando comentário` com `X` acima do campo, campo com o texto alterado, `Salvar` textual `body-strong` `musgo` no lugar do `PaperPlaneRight`, `Responder` e `DotsThree` dos outros desabilitados.
- `Esc` durante a edição **cancela a edição** primeiro; um segundo `Esc` fecha o dialog. `Enter` quebra linha; salvar é o botão ou `Ctrl` + `Enter`.
- Foco de teclado visível no campo, com borda de 1.5px `musgo`.

#### 5.12 `Comentários · Web, confirmar exclusão com respostas`

- **Base:** `Comentários · Web, padrão com respostas expandidas`, com o dialog de comentários e o feed atrás.
- **Segundo scrim** `#171512` a 40% por cima do dialog de comentários, e o **dialog de confirmação** centrado na viewport: 480px, `radius-xl`, fundo `papel`, `elev-3`, padding `space-6`.
- Título `Excluir comentário?` em `title-sm` `tinta`, consequência `Seu comentário e a resposta de Rafael Okamoto serão apagados. Não dá para desfazer.` em `body` `grafite`.
- Rodapé alinhado à direita, `space-3` de gap: `Cancelar` textual `grafite` primeiro, com o foco inicial visível (contorno de 2px `musgo`, offset de 2px), e `Excluir comentário` em outline `rubi`, 40px de altura, `radius` 12.
- Fechar ou cancelar devolve ao dialog de comentários, com o foco no `DotsThree` do comentário de Marina.

#### 5.13 `Comentários · Web, menu de comentário de outro leitor`

- Base: `Comentários · Web, padrão com respostas expandidas`.
- Dropdown de 5.10 aberto a partir do `DotsThree` da resposta de `Rafael Okamoto`, com **um item**: `Flag` · `Denunciar comentário` em `rubi`, em hover com fundo `linha`.
- O clique abre o dialog de denúncia sobre o dialog de comentários, desenhado em outro canvas.

### Linha 3, modo escuro, no fim da linha, nesta ordem

Modo escuro é lock de página inteira, e isso inclui o que está atrás dos sheets. Superfície elevada fica mais clara que o fundo, `musgo-claro` é o acento, `rubi-claro` é o destrutivo, e os shadows têm metade da opacidade: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

#### 5.14 `Comentários · Escuro, menu do próprio comentário`

Equivalente a 5.1. Feed em `noite`, sheet de comentários em `noite-elevada`, segundo scrim preto a 60%, sheet do menu em `noite-elevada` com alça `linha-noite` e divisores `linha-noite`. `Seu comentário` em `grafite-claro`. `Editar` e o ícone em `papel-suave`; `Excluir` e o `Trash` em `rubi-claro`. `Cancelar` em `grafite-claro`.

#### 5.15 `Comentários · Escuro, editando comentário`

Equivalente a 5.2. Comentário em edição com fundo `musgo-fundo-escuro`; barra de contexto em `musgo-fundo-escuro` com texto, `PencilSimple` e `X` em `musgo-claro`; campo com fundo `noite`, borda `linha-noite` e texto `papel-suave`; `Salvar` em `musgo-claro`; `Responder` e `DotsThree` desabilitados em `grafite-fundo-escuro`.

#### 5.16 `Comentários · Escuro, confirmar exclusão`

Equivalente a 5.6. Sheet em `noite-elevada`, título em `papel-suave`, consequência em `grafite-claro`, `Excluir comentário` em outline `rubi-claro` com texto `rubi-claro`, `Cancelar` em `grafite-claro`.

---

## 6. Artboards a remover

Nenhum sai. Os 14 artboards do Período 1 permanecem, com os rótulos e a ordem que já têm.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Menu de ações e confirmação destrutiva, em sheet e dialog | documento-de-design §4.11 e §7.8 |
| Botão destrutivo em outline e botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` e alerta em `ambar-fundo` | documento-de-design §3.1.3 |
| Campo, foco e desabilitado | documento-de-design §4.2 |
| Iconografia Phosphor (`DotsThree`, `PencilSimple`, `Trash`, `Flag`, `Warning`) | documento-de-design §6 |
| Paleta, tipografia, espaçamento, raio, elevação, motion | documento-de-design §3.1 a §3.6 |
| Dropdown de menu na web, ancorado e sem scrim | nasceu no lote 2 do Período 2, em `pagina-do-livro/pagina-do-livro.md`, incorporação pendente |
| Sheet sobre sheet | nasceu no lote 4 do Período 2, em `F-MOD/denunciar.md`, incorporação pendente |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança (plano §3):

1. **`DotsThree` por comentário**, alinhado à direita da linha de nome e tempo, com dois conteúdos de menu que nunca se misturam (próprio: `Editar` e `Excluir`; de outra pessoa: `Denunciar comentário`).
2. **Barra de contexto de edição**, variante da barra de resposta do Período 1, com `PencilSimple` e `Editando comentário`.
3. **Botão textual `Salvar` no lugar do ícone de envio** no campo ancorado, no modo de edição.
4. **Destaque do comentário em edição** com fundo `musgo-fundo` e `radius` 12, e a lista com as outras ações desabilitadas enquanto se edita.
5. **Marcador `· editado`** na linha de tempo.
6. **Menção como link inline** em `musgo` peso 600, sem sublinhado em repouso, e menção não resolvida idêntica ao texto.
7. **Confirmação destrutiva empilhada** sobre a conversa (segundo scrim) no mobile e **dialog sobre dialog** na web.
8. **Erro dentro do sheet de confirmação**, que mantém a confirmação aberta para tentar de novo.
9. **Dropdown dentro de dialog**, sem scrim, preso ao `DotsThree` do comentário.

**Decisão do Período 1 que muda:** a seção 7 do prompt original registrava a menção em `body-strong` `tinta` "porque no Período 1 ela não é navegável", e previa que a edição de F-SOCIAL-2 mudaria a regra. Esta é a mudança: menção resolvida passa a `musgo` peso 600, e só ela.

**Exportar e commitar o protótipo não decide nada disto.** Os itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, e nenhum agente altera `docs/orquestador/` por conta própria.

---

## 8. Copy nova ou alterada

| Onde | Antes | Depois |
|---|---|---|
| Contagem no cabeçalho | `3 comentários` | `6 comentários` |
| Contagem depois de excluir | não existia | `4 comentários` |
| Comentário de Marina, publicado | não existia | `Comecei semana passada, por indicação da @nadiasampaio. Guardei a sua resenha para quando terminar A Terra.` |
| Comentário de Marina, editado | não existia | `Comecei semana passada, por indicação da @nadiasampaio e da @helenaprof. Guardei a sua resenha para quando terminar A Terra.` |
| Resposta de Rafael a Marina | não existia | `Boa. A Terra é a parte que mais afasta, depois engata.` |
| Expandir uma resposta | não existia | `Ver 1 resposta` |
| Marcador de edição | não existia | `editado` (depois do tempo, com `·`) |
| Cabeçalho do menu, próprio | não existia | `Seu comentário` / `Sua resposta` |
| Itens do menu, próprio | não existia | `Editar`, `Excluir`, `Cancelar` |
| Cabeçalho do menu, de outro | não existia | `Resposta de Rafael Okamoto` / `Comentário de <nome>` |
| Item do menu, de outro | não existia | `Denunciar comentário`, `Cancelar` |
| Barra de contexto de edição | não existia | `Editando comentário` |
| Botão do campo em edição | ícone `PaperPlaneRight` | `Salvar` / `Salvando` |
| Salvando, com cold start | não existia | `Salvando. O servidor está iniciando e isso pode levar alguns segundos.` |
| Erro ao salvar | não existia | `Não foi possível salvar a edição. O texto continua no campo. Tente de novo.` |
| Limite de menções | não existia | `Muitas menções seguidas. Espere alguns minutos para salvar de novo.` |
| Comentário que deixou de existir | não existia | `Este comentário não existe mais. Ele pode ter sido excluído em outro aparelho.` |
| Botão desse aviso | não existia | `Fechar edição` |
| Confirmação, título | não existia | `Excluir comentário?` / `Excluir resposta?` |
| Confirmação, raiz com uma resposta | não existia | `Seu comentário e a resposta de Rafael Okamoto serão apagados. Não dá para desfazer.` |
| Confirmação, raiz com várias respostas | não existia | `Seu comentário e as 3 respostas a ele serão apagados. Não dá para desfazer.` |
| Confirmação, sem respostas | não existia | `Seu comentário será apagado. Não dá para desfazer.` |
| Confirmação, resposta | não existia | `Sua resposta será apagada. Não dá para desfazer.` |
| Botões da confirmação | não existia | `Excluir comentário` / `Excluir resposta`, `Cancelar` |
| Excluindo | não existia | `Excluindo` |
| Excluindo, com cold start | não existia | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Erro ao excluir | não existia | `Não foi possível excluir o comentário. Ele continua publicado. Tente de novo.` |
| Rótulos acessíveis | não existia | `Ações do seu comentário`, `Ações do comentário de Rafael Okamoto`, `Cancelar edição`, `Perfil de @nadiasampaio` |

Zero em-dash em toda a copy. Zero emoji na interface.

---

## 9. Acessibilidade e interação do que muda

- **Alvos:** `DotsThree` com 48px no mobile e 32px de área de clique na web; itens do menu com 56px no sheet e 44px no dropdown; `X` da barra de edição e `Salvar` com 48px. O link de menção é inline, e a área de toque dele se estende verticalmente até 44px sem alterar a entrelinha.
- **Rótulo do menu:** o `DotsThree` é anunciado como `Ações do seu comentário` ou `Ações do comentário de <nome>`, para que quem navega por leitor de tela saiba qual menu vai abrir sem ouvir o conteúdo antes.
- **Link de menção:** anunciado como link, com o nome acessível `Perfil de @<username>`. A menção não resolvida não é anunciada como nada além de texto.
- **Menu e confirmação** prendem o foco enquanto abertos; `Esc` e toque ou clique fora fecham; o foco volta ao `DotsThree` que abriu. No dropdown, as setas navegam entre os itens. **Na confirmação, o foco entra em `Cancelar`**, nunca no destrutivo.
- **Edição:** ao escolher `Editar`, o foco vai para o campo com o cursor no fim do texto, e a barra `Editando comentário` é anunciada antes. Cancelar ou salvar devolve o foco ao comentário editado.
- **Depois de excluir**, o foco vai para o comentário imediatamente acima, e a nova contagem é anunciada.
- **Erros e alertas** carregam ícone e texto, não só cor, e são anunciados quando aparecem.
- **Contraste:** `musgo` sobre `papel-elevado` e `musgo-claro` sobre `noite-elevada` passam AA como texto de corpo; o link usa peso 600 para não depender só da cor. `rubi` e `rubi-claro` sobre as superfícies dos sheets passam AA. `grafite-suave` fica restrito ao tempo, ao `· editado` e aos controles desabilitados, que não são informação essencial.
- **`prefers-reduced-motion`:** sheet do menu, sheet de confirmação, dialog e dropdown aparecem sem deslizar; o fundo `musgo-fundo` do comentário em edição entra sem transição.
- **Confirmação de ação destrutiva:** excluir sempre passa pela confirmação (RNF-USA-04), com botão outline `rubi`. Denunciar passa pela confirmação da tela de denúncia; o item do menu apenas abre essa tela.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Shell, feed ao fundo, sheet, dialog, cabeçalho, resumo da atividade, anatomia do comentário, recuo, campo de escrita e os artboards de vazio, carregando e erro ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe a tela de denúncia** neste canvas. Ela tem canvas próprio.
- Não desenhe a tela de perfil que o link de menção abre.

**Específico de comentários no Período 2**

- **Não misture os dois menus.** Comentário próprio nunca mostra `Denunciar comentário`; comentário de outra pessoa nunca mostra `Editar` nem `Excluir`, nem para o autor da atividade, nem para a conta admin.
- **Não esconda o `DotsThree`** atrás de hover, de toque longo ou de deslizar o comentário. Ele fica visível em todo comentário.
- **Não edite no lugar do comentário.** A edição acontece no campo do rodapé, com a barra `Editando comentário`.
- **Não atualize a lista antes do servidor confirmar**, nem ao salvar, nem ao excluir.
- **Não deixe estado de comentário excluído.** Nada de `Comentário excluído`, `[removido]`, texto riscado ou espaço vazio no lugar. Excluir a raiz leva as respostas junto.
- **Não ofereça desfazer** depois de excluir: nada de `Desfazer`, lixeira ou toast com ação.
- Não use toast para confirmar edição ou exclusão.
- **Não pinte menção não resolvida** de nenhuma forma: nada de cor, sublinhado, ícone de aviso, tachado ou tooltip "usuário não encontrado".
- Não transforme a menção dentro do campo de escrita em link, chip ou etiqueta: dentro do campo ela é texto comum.
- Não desenhe autocompletar ao digitar `@`, nem lista de sugestões de pessoas.
- Não desenhe histórico de versões nem "ver original" do comentário editado.
- Não mude o tempo do comentário para a hora da edição.

**Continua valendo do Período 1**

- **Não desenhe um terceiro nível de recuo**, nem linha de árvore ou fio de conexão. Editar uma resposta não muda o nível dela.
- **Não renderize Markdown, HTML ou BBCode** no comentário. O link de menção é o único elemento não textual, e só existe para username resolvido.
- **Não transforme URL em link clicável** dentro do comentário.
- **Não embuta imagem, GIF, vídeo, áudio nem prévia de link.**
- Não desenhe seletor de emoji, curtir comentário, fixar comentário nem ordenação por curtidas.
- Não torne o resumo da atividade acionável dentro do sheet.

**Interações destrutivas**

- Nada de ação destrutiva sem confirmação em modal. Excluir comentário passa pela confirmação; denunciar passa pela confirmação da tela de denúncia.
- Nada de botão destrutivo preenchido com fundo `rubi`. Destrutivo é outline `rubi`.
- Nada de undo em ação destrutiva: confirmada, a exclusão é física.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela. Comentário não é resenha, frase nem sinopse.
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
- Um único acento: `musgo` no link e no `Salvar`, `rubi` só no destrutivo e no erro, `ambar` só no alerta de limite.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. `Salvando` e `Excluindo` são texto, não animação.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é.
- Nada de número sem unidade e nada de número fake-preciso: `6 comentários`, `1 resposta`, `3 respostas`.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado, nem no resumo da atividade.
- Nada de toast com fundo saturado.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura: sheet empilhado, dialog e dropdown seguem o tema da página.

**Formulário**

- Nada de placeholder no lugar de label, com a exceção declarada do campo ancorado, que já existia.
- Nada de helper que só aparece depois do erro.
- Nada de validação que só existe no cliente: `Salvar` desabilitado reflete texto vazio ou igual ao publicado, e o resto é o servidor que responde.

**Layout (web)**

- Nada de layout que não colapse abaixo de 768px: o dropdown vira o sheet de 5.1 e a confirmação vira o sheet de 5.6.
- Nada de conteúdo essencial escondido em hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de hero de landing, bento grid, logo wall, faixa decorativa em mono-caps ou botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários, nem "responder em particular" no menu.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
