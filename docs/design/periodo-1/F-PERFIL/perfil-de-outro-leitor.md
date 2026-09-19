# F-PERFIL · Perfil de outro leitor

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-PERFIL.md
**Requisitos:** RF-SOC-02 (visualizar o perfil de outro leitor), RF-SOC-05 (seguir perfil público, com efeito imediato), RF-SOC-06 (solicitar para seguir perfil privado), RF-SOC-07 (deixar de seguir)
**Requisito parcialmente atendido:** RF-SOC-02 cita listas do leitor, que dependem de F-LST, no Período 2. Pendência registrada em `feature-F-PERFIL.md` e no README do período.
**Não funcionais:** RNF-SEC-03 (a privacidade é revalidada no servidor em todo endpoint, e esconder na interface não é controle de acesso), RNF-SEC-19/44 (descoberta só por username exato, sem diretório), RNF-DES-02 (listagens paginadas), RNF-USA-03, RNF-USA-04 (confirmação ao deixar de seguir), RNF-USA-05, RNF-ERR-09
**Regras de negócio:** RN-08 (privacidade de perfil: o que todos veem e o que só seguidores aceitos veem), RN-14.4 (ordem de resolução da capa)
**Versão web:** sim. RF-SOC-02, RF-SOC-05, RF-SOC-06 e RF-SOC-07 têm marcação na coluna Web de `REQUISITOS.md` §5.9.

---

## 1. Contexto

O perfil de outra pessoa, e o lugar onde o **pertencimento** começa: é aqui que se segue alguém, e é seguir alguém que faz o feed existir.

Chega de três lugares: da busca por username exato em [`buscar-leitor.md`](buscar-leitor.md), do nome de um autor de atividade no feed e das listas de seguidores e seguidos. Sai para a página do livro, para as resenhas e, no caso do livro pessoal, para a página autorizada daquele livro.

**RN-08 é a tela.** Tudo o que se desenha aqui é uma resposta a duas perguntas: este perfil é público ou privado, e eu sigo esta pessoa? As quatro combinações geram quatro estados diferentes, e é por isso que esta tela é separada de [`meu-perfil.md`](meu-perfil.md).

| Situação | Nome, avatar, biografia | Estante e resenhas | Botão de relação |
|---|---|---|---|
| Público, não sigo | visível | visível | `Seguir`, efeito imediato |
| Público, sigo | visível | visível | `Seguindo`, com confirmação para desfazer |
| Privado, não sigo | visível | **restrito** | `Solicitar para seguir` |
| Privado, sigo | visível | visível | `Seguindo`, com confirmação para desfazer |

Duas coisas que ela precisa resolver:

- **Conteúdo restrito é restrito, não é erro.** Perfil privado que eu não sigo mostra a identidade, explica a restrição e oferece a saída. Nada de tela de erro, nada de `403` na cara do leitor, nada de página vazia.
- **Esconder na interface não é controle de acesso.** O servidor revalida RN-08 em todo endpoint (RNF-SEC-03). O desenho aqui não é a proteção: é a explicação da proteção.

**Escopo desta entrega.** Não existe descoberta aberta de pessoas: não há sugestão de perfis, não há "pessoas que você pode conhecer" e não há diretório (RNF-SEC-19/44). Também não se listam os seguidores de terceiros: só o dono vê as próprias listas.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, na ordem das quatro combinações de RN-08.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Perfil de outro leitor · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Perfil público**, usado nos artboards de 4.1, 4.2, 4.6 e 4.8:

| Campo | Valor |
|---|---|
| Nome de exibição | `Rafael Okamoto` |
| Nome de usuário | `@rafaokamoto` |
| Biografia | `Professor de história. Leio mais não ficção do que deveria e anoto tudo na margem.` |
| Contadores | `31 livros lidos`, `212 seguidores`, `148 seguindo` |

**Perfil privado**, usado nos artboards de 4.3, 4.4 e 4.5:

| Campo | Valor |
|---|---|
| Nome de exibição | `Beatriz Nogueira` |
| Nome de usuário | `@bia.nogueira` |
| Biografia | `Tradutora. Ficção japonesa, poesia brasileira e um caderno de citações.` |
| Contadores visíveis a não seguidores | `57 seguidores`, `63 seguindo` |

**Estante do perfil visível, prévia de seis capas:**

| Título | Autor | Status |
|---|---|---|
| Os Sertões | Euclides da Cunha | Lido |
| Raízes do Brasil | Sérgio Buarque de Holanda | Lido |
| O Cortiço | Aluísio Azevedo | Lido |
| Memórias Póstumas de Brás Cubas | Machado de Assis | Relendo |
| Casa-Grande e Senzala | Gilberto Freyre | Lendo |
| Formação do Brasil Contemporâneo | Caio Prado Júnior | Quero ler, capa em `capa-placeholder` pelo terceiro nível de RN-14.4 |

**Resenhas recentes do perfil visível**, duas, truncadas em três linhas:

| Livro | Trecho | Nota |
|---|---|---|
| Os Sertões | `Euclides escreve geologia e termina escrevendo gente. A terceira parte é insuportável no melhor sentido.` | 5 estrelas |
| O Cortiço | `O prédio é o personagem, e isso continua sendo a coisa mais moderna do livro.` | 4 estrelas |

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

Tela de detalhe empilhada sobre a área de origem, que pode ser `Feed`, `Perfil` ou `Descobrir`. Por isso ela tem retorno, e o item ativo da barra inferior é o da área de onde se veio.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px.
- **Sem título no header.** O nome aparece grande no bloco de identidade logo abaixo, como na página do livro.
- `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Bloco de identidade

Sempre visível, em todos os estados, porque RN-08 torna nome, avatar e biografia públicos para qualquer perfil. Padding lateral `space-5`, `space-6` de respiro abaixo do header, tudo centralizado na horizontal.

1. Avatar circular (`radius-full`) de 96px, com borda de 1px `linha`.
2. `space-4`, nome em `display` `tinta`.
3. `space-1`, `@username` em `caption` `grafite-suave`.
4. `space-3`, chip de privacidade, igual ao de `meu-perfil.md`: `Perfil público` com `Globe` em `musgo-fundo`, ou `Perfil privado` com `Lock` em `papel-elevado` com borda `linha`.
5. `space-4`, biografia em `body` `grafite`, centralizada, no máximo três linhas.
6. `space-5`, o botão de relação, largura de no máximo 240px, centralizado, 48px de altura. O desenho dele muda por estado e está descrito em cada artboard.

### Contadores

- `space-6` abaixo do botão, três valores em linha com divisor vertical de 1px `linha`, número em `num-inline` `tinta` e rótulo em `caption` `grafite`, centralizados.
- **Os contadores não são acionáveis nesta tela.** Não existe listagem do grafo de terceiros: só o dono vê as próprias listas de seguidores e seguidos (RNF-SEC-19/44).
- Divisor de 1px `linha` de largura total abaixo.

### Seções de conteúdo

Idênticas às de `meu-perfil.md`, e só aparecem quando RN-08 permite: `Estante` com faixa horizontal de capas e `Resenhas` com duas resenhas em Newsreader. As duas seções trazem o botão textual `Ver tudo` e `Ver todas`, que abrem listagens paginadas e **também** revalidadas no servidor.

### 4.1 Público, não sigo

Primeiro artboard da linha.

- Identidade de `Rafael Okamoto`, chip `Perfil público`.
- Botão de relação: **primário pill** `musgo`, texto `papel` em `body-strong`, com `UserPlus` (Phosphor, `regular`, 20px) à esquerda do texto: `Seguir`.
- Contadores completos, estante e resenhas visíveis: perfil público é visível a todos.
- Tocar em `Seguir` tem **efeito imediato** (RF-SOC-05) e leva ao estado 4.2, sem modal e sem confirmação: seguir não é destrutivo.

### 4.2 Público, sigo

- Mesma identidade.
- Botão de relação: **secundário**, `radius` 12, borda de 1px `linha`, fundo transparente, texto `body-strong` `tinta`, com `Check` (Phosphor, `bold`, 20px, `musgo`) à esquerda: `Seguindo`.
- Tocar nele abre a confirmação de 4.6. **Não desfaz direto.**
- O botão não muda para `Deixar de seguir` no hover nem no press: trocar o rótulo embaixo do dedo é como se desfaz sem querer.

### 4.3 Privado, não sigo

O estado que RN-08 existe para desenhar.

- Identidade de `Beatriz Nogueira`, chip `Perfil privado`.
- Botão de relação: **primário pill** `musgo` com `UserPlus` à esquerda: `Solicitar para seguir`.
- **Contadores parciais:** `57 seguidores` e `63 seguindo`, sem o contador de livros lidos, que é derivado da estante e portanto restrito. Ver a pendência na seção 7.
- No lugar das seções de conteúdo, **um bloco de restrição** centralizado, com `space-6` entre os elementos e `space-10` de respiro acima:
  - `Lock` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Este perfil é privado`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Envie uma solicitação para ver a estante e as resenhas de Beatriz.`
- **O bloco não é um erro.** Fundo `papel`, sem `rubi`, sem `ambar`, sem banner, sem ícone de aviso. É uma informação sobre uma escolha que a outra pessoa fez.
- Nenhuma capa, nenhum título de livro e nenhum trecho de resenha aparece em lugar nenhum da tela, **nem desfocado, nem em silhueta, nem atrás de uma camada**. Borrar conteúdo restrito é exibir conteúdo restrito.

### 4.4 Privado, solicitação enviada

- Mesma identidade e mesmo bloco de restrição de 4.3, com o texto trocado para: `Sua solicitação está aguardando resposta.`
- Botão de relação: **secundário desabilitado na aparência**, borda de 1px `linha`, texto `body-strong` `grafite`, com `Clock` (Phosphor, `regular`, 20px, `grafite`) à esquerda: `Solicitação enviada`.
- **Sem ação de cancelar a solicitação.** RF-SOC-06 dá ao destinatário o poder de aceitar ou recusar, e nenhum requisito ou operação do contrato prevê o solicitante desfazer o pedido. Ver a pendência na seção 7.

### 4.5 Privado, sigo

- Identidade de `Beatriz Nogueira`, chip `Perfil privado` mantido: a privacidade continua sendo verdade sobre o perfil, mesmo para quem foi aceito.
- Botão de relação: **secundário** `Seguindo`, igual ao de 4.2.
- Contadores completos, estante e resenhas visíveis.
- Abaixo do chip, `space-2`, uma linha em `caption` `grafite`: `Você vê este perfil porque Beatriz aceitou sua solicitação.`

### 4.6 Confirmar deixar de seguir

Modal centrado sobre a tela, conforme RNF-USA-04.

- Fundo da tela escurecido por uma camada em `tinta` a 40% de opacidade.
- Card centrado, largura de 320px, `radius-lg`, fundo `papel-elevado`, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Deixar de seguir Rafael?`
- `space-3`, texto em `body` `grafite`: `As atividades dele saem do seu feed. Você pode seguir de novo quando quiser.`
- Para perfil privado, o texto é outro: `As atividades dela saem do seu feed, e você perde o acesso à estante e às resenhas. Seguir de novo exige uma solicitação nova.`
- `space-6`, dois botões empilhados com `space-3` de gap:
  - Botão **outline** `rubi`, largura total, 48px, `radius` 12: `Deixar de seguir`.
  - Botão textual `grafite`, largura total: `Cancelar`.
- O modal entra com fade em `dur-fast` e o card com deslocamento vertical de 8px. Sob `prefers-reduced-motion`, aparece estático.
- **Sem desfazer depois.** A confirmação é antes.

### 4.7 Carregando

- Header real, com `ArrowLeft` e `Bell`.
- Corpo substituído por **skeleton estático**: círculo de 96px, três barras centralizadas, o botão de relação como retângulo de 48px e `radius-full`, a linha de contadores e a faixa de capas, todos em `capa-placeholder`.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** (RNF-ERR-09).

### 4.8 Esta pessoa pediu para seguir você

O contrato de `identidade` prevê a relação `solicitacao_recebida`: quem está sendo visto enviou uma solicitação ao leitor que está olhando. O estado é do perfil do solicitante, e precisa de um lugar.

- Identidade completa, chip de privacidade do perfil visitado, contadores e conteúdo conforme RN-08 daquele perfil.
- Acima do botão de relação, `space-3` de respiro, uma linha de largura total menos o padding lateral, fundo `musgo-fundo`, `radius` 12, padding `space-4`, com `UserPlus` (Phosphor, `regular`, 20px, `musgo`) à esquerda e o texto em `body` `tinta`: `Rafael pediu para seguir você.` e, à direita, `CaretRight` em `musgo`. A linha leva a [`solicitacoes-de-seguir.md`](solicitacoes-de-seguir.md).
- **O botão de relação não muda.** Continua `Seguir` ou `Solicitar para seguir`, conforme a privacidade: aceitar ou recusar o pedido dele é outra decisão, e ela mora na caixa de solicitações.
- **Sem botões de aceitar e recusar dentro do perfil.** Duas telas oferecendo a mesma decisão com desenhos diferentes é onde o erro acontece.

### 4.9 Perfil não encontrado

O username não existe, ou a conta deixou de estar visível. **A tela é a mesma nos dois casos**, porque distinguir contaria a um terceiro o que aconteceu com aquela conta.

- Header real.
- Bloco centralizado no corpo, `space-6` entre os elementos:
  - `UserCircle` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Perfil não encontrado`.
  - Texto em `body` `grafite`, centralizado: `Confira o nome de usuário e tente de novo.`
  - Botão primário pill `musgo`: `Buscar leitor`, que leva a [`buscar-leitor.md`](buscar-leitor.md).
- **Sem `rubi`, sem banner de erro.** Não é falha do sistema.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

Mesma estrutura de `meu-perfil.md`: **identidade fixa à esquerda e conteúdo em abas à direita.**

- Sidebar do shell à esquerda, expandida em 248px, com o item da área de origem ativo. **Sem sino.**
- Área de conteúdo com padding lateral `space-8` e header de conteúdo de 72px com o botão textual de retorno, `ArrowLeft` (Phosphor, `regular`, 20px) mais o texto `Voltar`, à esquerda. Sem título: o nome está na coluna de identidade.
- **Coluna esquerda de 300px, fixa:** avatar de 120px, nome em `title-lg`, `@username`, chip de privacidade, biografia alinhada à esquerda, botão de relação de largura total e 40px de altura, e os contadores empilhados, um por linha, **não acionáveis**, separados por divisor de 1px `linha`.
- **Coluna direita:** faixa de abas com `Estante` e `Resenhas` e o conteúdo da aba, com o mesmo desenho de `meu-perfil.md`, quando RN-08 permite. Quando não permite, a coluna direita inteira é o bloco de restrição, centralizado na horizontal e alinhado ao topo com `space-16` de respiro.
- `hover` no card da estante com `elev-2` na capa e título em `musgo`; foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** as duas colunas viram uma só, na ordem identidade, botão de relação, contadores e conteúdo, e a sidebar dá lugar à barra inferior.

### 5.1 Público, não sigo

Coluna esquerda com `Rafael Okamoto`, chip `Perfil público` e botão primário `Seguir`. Coluna direita com a aba `Estante` ativa e o grid de seis colunas.

### 5.2 Privado, não sigo

Coluna esquerda com `Beatriz Nogueira`, chip `Perfil privado`, botão primário `Solicitar para seguir` e os dois contadores. Coluna direita inteira com o bloco de restrição: `Lock` de 32px, título e texto. **Sem abas na coluna direita:** não há conteúdo para abas organizarem.

### 5.3 Público, sigo, com confirmação aberta

O modal de 4.6 centrado na viewport, com 360px de largura, sobre a camada escurecida, com os dois botões **lado a lado** no lugar de empilhados: `Cancelar` textual à esquerda e `Deixar de seguir` outline `rubi` à direita, alinhados à direita do card.

### 5.4 Carregando

Skeleton estático nas duas colunas, com o botão de relação como retângulo `radius-full` e doze retângulos no grid da coluna direita. Um único fade de entrada, sem shimmer.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, público e sigo.** Fundo `noite`. Ícones do header em `papel-suave`. Nome em `papel-suave`, `@username` em `grafite-fundo-escuro`, biografia em `grafite-claro`. Chip `Perfil público` com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Botão `Seguindo` com borda `linha-noite`, texto `papel-suave` e `Check` em `musgo-claro`. Contadores com número em `papel-suave` e rótulo em `grafite-claro`. Capa em `capa-placeholder-noite`. Texto da resenha em Newsreader `grafite-claro`. Barra inferior em `noite-elevada`, **mais clara** que o fundo.
- **Mobile, privado e não sigo.** Chip `Perfil privado` com fundo `noite-elevada`, borda `linha-noite` e texto `grafite-claro`. Botão primário `Solicitar para seguir` com fundo `musgo-claro` e texto `noite`. Bloco de restrição com `Lock` em `grafite-fundo-escuro`, título em `papel-suave` e texto em `grafite-claro`, **sem nenhum tint de erro**.
- **Web, público e não sigo.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Aba ativa em `musgo-claro` com sublinhado `musgo-claro`.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Padrão de tela de perfil, com avatar, nome, bio, contadores, estante e resenhas | documento-de-design §5.5 |
| Estrela de avaliação, com meia estrela | documento-de-design §4.3 |
| Capa de livro em retângulo de canto vivo e placeholder | documento-de-design §4.5 e §7.6 |
| Botão primário pill, botão secundário, botão outline destrutivo e botão textual | documento-de-design §4.1 e §7.8 |
| Modal de confirmação de ação destrutiva | documento-de-design §7.8 e RNF-USA-04 |
| Escala tipográfica e as quatro famílias, com Newsreader no corpo da resenha | documento-de-design §3.2 e §3.2.2 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |
| Chip de privacidade e faixa de abas da web | periodo-1/F-PERFIL/meu-perfil.md |

**Componentes e decisões que ainda não existem na fonte.** Viram pendência de incorporação pelo controle de mudança do plano §3, e as duas últimas precisam de decisão do grupo antes de virar implementação:

1. **O botão de relação com seus quatro estados**, `Seguir`, `Seguindo`, `Solicitar para seguir` e `Solicitação enviada`. O `documento-de-design.md` §4.1 define os tipos de botão, não este componente de estado.
2. **O bloco de restrição de RN-08**, com ícone, título e texto, em superfície neutra e sem tint de erro. O documento não tem padrão para conteúdo restrito.
3. **O contador de livros lidos.** O schema `ContadoresPerfil` de [`identidade.yaml`](../../../api/identidade.yaml) traz somente `seguidores` e `seguidos`, e o `Perfil` os entrega em qualquer privacidade: por isso os dois aparecem também em 4.3. O número de livros lidos vem do endpoint autorizado de `leitura` e, em perfil privado sem seguimento, esse endpoint não responde com conteúdo. O desenho segue essa leitura e omite o contador nesse estado. **Registrar em `feature-F-PERFIL.md`** para que a implementação confirme a composição.
4. **Cancelar uma solicitação enviada.** Não há RF nem operação no contrato de `identidade`. O artboard 4.4 mostra o estado sem ação de cancelamento. **Registrar como pendência em `feature-F-PERFIL.md`**; não desenhe o botão antes da decisão.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Nome, perfil público | `Rafael Okamoto` |
| Username, perfil público | `@rafaokamoto` |
| Biografia, perfil público | `Professor de história. Leio mais não ficção do que deveria e anoto tudo na margem.` |
| Nome, perfil privado | `Beatriz Nogueira` |
| Username, perfil privado | `@bia.nogueira` |
| Biografia, perfil privado | `Tradutora. Ficção japonesa, poesia brasileira e um caderno de citações.` |
| Chip, público | `Perfil público` |
| Chip, privado | `Perfil privado` |
| Botão, não sigo perfil público | `Seguir` |
| Botão, sigo | `Seguindo` |
| Botão, não sigo perfil privado | `Solicitar para seguir` |
| Botão, solicitação pendente | `Solicitação enviada` |
| Linha de quem foi aceito | `Você vê este perfil porque Beatriz aceitou sua solicitação.` |
| Restrição, título | `Este perfil é privado` |
| Restrição, texto | `Envie uma solicitação para ver a estante e as resenhas de Beatriz.` |
| Restrição, texto com solicitação pendente | `Sua solicitação está aguardando resposta.` |
| Contadores | `31` sob `livros lidos`, `212` sob `seguidores`, `148` sob `seguindo` |
| Títulos de seção | `Estante` e `Resenhas` |
| Ações de seção | `Ver tudo` e `Ver todas` |
| Modal, título | `Deixar de seguir Rafael?` |
| Modal, texto para perfil público | `As atividades dele saem do seu feed. Você pode seguir de novo quando quiser.` |
| Modal, texto para perfil privado | `As atividades dela saem do seu feed, e você perde o acesso à estante e às resenhas. Seguir de novo exige uma solicitação nova.` |
| Modal, botão destrutivo | `Deixar de seguir` |
| Modal, botão textual | `Cancelar` |
| Solicitação recebida, linha | `Rafael pediu para seguir você.` |
| Não encontrado, título | `Perfil não encontrado` |
| Não encontrado, texto | `Confira o nome de usuário e tente de novo.` |
| Não encontrado, botão | `Buscar leitor` |
| Web, retorno | `Voltar` |

O modal usa o **primeiro nome** da pessoa, não o username: é uma pergunta sobre uma pessoa, não sobre um identificador.

Zero em-dash em toda a copy. Zero emoji. Todo número aparece com unidade.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no mobile no `ArrowLeft`, no botão de relação, nas ações de seção e nos botões do modal.
- O estado da relação é distinguível **sem depender de cor**: `Seguir` é primário preenchido com `UserPlus`, `Seguindo` é secundário com `Check`, `Solicitação enviada` é secundário com `Clock`. O rótulo diz o estado por extenso.
- A privacidade é distinguível sem cor: o chip traz `Globe` ou `Lock` mais a palavra.
- O bloco de restrição é anunciado como informação, não como erro, e o botão de solicitar fica na ordem de leitura logo antes dele.
- Contraste WCAG AA no corpo nos dois temas. Biografia e textos de restrição usam `grafite`.
- Os contadores são anunciados por extenso, no formato `212 seguidores`, e **não recebem foco**, porque não são acionáveis nesta tela.
- O modal captura o foco, começa com o foco no botão `Cancelar`, fecha com `Esc` e devolve o foco ao botão `Seguindo`.
- Foco de teclado visível na web em retorno, botão de relação, abas e cards, na ordem visual.
- `prefers-reduced-motion` respeitado: o fade do modal, o fade do skeleton e o hover viram estáticos.
- Deixar de seguir é ação destrutiva e sempre passa pelo modal, nas duas plataformas.

---

## 10. O que não fazer nesta tela

**RN-08, a regra dura desta tela**

- **Não mostre conteúdo restrito de forma nenhuma.** Nada de capa desfocada, silhueta, contagem de livros por status, título de resenha, nota agregada nem "prévia" atrás de camada. Borrar é exibir.
- **Não trate perfil privado como erro.** Sem `rubi`, sem banner, sem `WarningCircle`, sem código de status na tela.
- **Não distinga perfil inexistente de perfil indisponível.** Os dois têm a mesma tela e a mesma frase.
- **Não desenhe a lista de seguidores ou de seguidos deste leitor.** O grafo de terceiros não é navegável, e os contadores não são acionáveis aqui.
- **Não sugira outros perfis** em nenhum estado, nem no de perfil não encontrado. Não existe descoberta aberta de pessoas.

**Específico da relação**

- **Não desfaça o seguimento sem confirmação.** `Seguindo` abre o modal, sempre.
- **Não troque o rótulo `Seguindo` por `Deixar de seguir` no hover ou no press.**
- **Não desenhe botão de cancelar solicitação** enquanto a pendência da seção 7 não for resolvida pelo grupo.
- **Não desenhe bloquear, silenciar, denunciar perfil nem mensagem direta.** Denúncia é só de resenha e comentário, é Desejável, e perfil não tem fluxo de denúncia. Mensagem direta está fora de escopo por decisão.
- Não peça confirmação para seguir: seguir não é destrutivo e o efeito é imediato.
- Não desenhe seguir de volta automático nem sugestão de reciprocidade.

**Escopo do Período 1**

- **Não desenhe listas do leitor.** F-LST é do Período 2.
- **Não desenhe estatísticas nem sequência diária.** F-STA e F-GAM são do Período 2.
- **Não desenhe recomendar livro para esta pessoa.** F-REC-P2P é do Período 2.
- Não desenhe favoritos, frases, trechos nem desafios.

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

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo em tela de dados.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. Mobile não tem hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

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
