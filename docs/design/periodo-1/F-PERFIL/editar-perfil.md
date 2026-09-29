# F-PERFIL · Editar perfil

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-PERFIL.md
**Requisitos:** RF-SOC-01 (editar nome de exibição, biografia, avatar e privacidade), RF-SOC-04 (definir o perfil como público ou privado)
**Não funcionais:** RNF-SEC-20 (o upload de imagem valida tipo real, tamanho e dimensões), RNF-SEC-14 (biografia tratada como texto e escapada na renderização), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-09 (cold start tratado como carregamento)
**Regras de negócio:** RN-08 (privacidade de perfil, e a regra de que passar de público para privado **não remove** seguidores existentes)
**Versão web:** sim (RF-SOC-01 e RF-SOC-04 têm marcação na coluna Web de `REQUISITOS.md` §5.9)

---

## 1. Contexto

Formulário do próprio perfil: nome de exibição, biografia, avatar e privacidade. Tela empilhada sobre a área `Perfil`, aberta pelo botão `Editar perfil` de [`meu-perfil.md`](meu-perfil.md), e que volta para lá ao salvar ou cancelar.

Duas coisas que ela precisa resolver:

- **A privacidade é a decisão mais pesada da tela**, e não é um detalhe de formulário: ela muda quem vê a estante, as resenhas e as notas do leitor (RN-08). Por isso ela não é um `switch` solto no meio dos campos, e sim um bloco com duas opções e a explicação do que cada uma significa.
- **Passar de público para privado não remove seguidores** (RN-08). Quem faz essa troca esperando "zerar" a lista precisa ser avisado antes de salvar, e a remoção de seguidor continua sendo uma ação manual, em [`seguidores-e-seguidos.md`](seguidores-e-seguidos.md).

**O username não se edita.** RF-SOC-01 lista nome de exibição, biografia, avatar e privacidade, e nenhum requisito prevê troca de nome de usuário. Ele aparece na tela como informação fixa, não como campo.

**O avatar vai direto ao Cloudinary.** O cliente envia a imagem ao provedor e manda a URL ao servidor, que valida tipo real, tamanho e dimensões (RNF-SEC-20). Para a tela, isso significa três estados de imagem: a atual, a que está subindo e a que foi recusada.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Editar perfil · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

| Campo | Valor |
|---|---|
| Avatar | foto atual do leitor, círculo de 96px |
| Nome de usuário, fixo | `@marinableu` |
| Nome de exibição | `Marina Beltrão` |
| Biografia | `Leio ficção brasileira contemporânea e um policial de vez em quando. Aceito indicação de conto.` |
| Privacidade | `Público` selecionado no estado padrão |
| Seguidores atuais, citados no aviso de privacidade | `84 seguidores` |

**Limites de campo.** O contrato de `identidade` fixa `60 caracteres` para o nome de exibição, e é esse o número que a tela mostra. **A biografia não tem limite definido em nenhuma fonte:** o schema a descreve como texto simples, sem `maxLength`. Por isso o campo de biografia **não traz contador** neste protótipo. Ver a pendência na seção 7.

**Limites do upload.** Tipos e tamanho máximo são fixados no preset do Cloudinary (P-09) e ainda não estão definidos. O artboard de erro usa `JPG ou PNG de até 5 MB`, que é **mock declarado**: o valor final vem do preset e da validação do servidor.

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

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `X` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, que **descarta** e volta ao perfil. `X` e não `ArrowLeft`: esta é uma tela de formulário que se abandona, não um nível de navegação.
- Título `Editar perfil` em `display` `tinta`, à esquerda, alinhado à base.
- **Sem sino neste header.** É uma tela de edição com ação de salvar, e o sino competiria com ela. Esta é a exceção declarada desta tela ao padrão do shell.
- À direita, botão textual `Salvar` em `body-strong` `musgo`, alvo de 48px.
- **A barra inferior continua visível**, com `Perfil` ativo.

### Bloco do avatar

Padding lateral `space-5`, `space-6` de respiro abaixo do header, centralizado na horizontal.

1. Avatar circular (`radius-full`) de 96px, com borda de 1px `linha`.
2. `space-3`, botão textual `musgo` em `body-strong`, com `Camera` (Phosphor, `regular`, 20px) à esquerda: `Trocar foto`.
3. `space-2`, botão textual `grafite` em `caption`: `Remover foto`, visível somente quando há avatar.
4. Divisor de 1px `linha` de largura total abaixo, com `space-6` acima e abaixo.

### Campos

Padding lateral `space-5`, gap `space-6` entre blocos.

1. **Nome de usuário, fixo.** Label `Nome de usuário` em `label` `grafite`, `space-2`, valor `@marinableu` em `body` `grafite-suave` sobre fundo `papel-elevado`, `radius` 12, 48px de altura, borda de 1px `linha`, com `Lock` (Phosphor, `regular`, 20px, `grafite-suave`) à direita dentro do campo. Não recebe foco e não abre teclado.
   - `space-2`, helper em `caption` `grafite`: `O nome de usuário não muda.`
2. **Nome de exibição.** Label `Nome de exibição`, campo de 48px, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto em `body` `tinta`.
   - `space-2`, contador alinhado à direita em `caption` `grafite-suave`: `14/60`.
3. **Biografia.** Label `Biografia`, campo de múltiplas linhas com altura mínima de 112px, mesmo `radius`, mesma borda, texto em `body` `tinta`, crescendo até quatro linhas antes de rolar internamente.
   - `space-2`, helper em `caption` `grafite`: `Aparece no seu perfil em até três linhas.`
   - **Sem contador**, pela pendência da seção 3.

### Bloco de privacidade

`space-8` acima, divisor de 1px `linha`, `space-6` de respiro.

- Título de seção `Privacidade` em `title-lg` `tinta`, padding lateral `space-5`.
- `space-4`, duas opções empilhadas com `space-3` de gap, cada uma um card de largura total, `radius` 12, padding `space-4`, com o controle de seleção à esquerda, `space-3` de gap, e o texto à direita:
  - **Selecionada:** borda de 1.5px `musgo`, fundo `musgo-fundo`, com `RadioButton` preenchido em `musgo`.
  - **Não selecionada:** borda de 1px `linha`, fundo transparente, controle vazio em `grafite`.
  - Opção 1: ícone `Globe` (Phosphor, `regular`, 20px), título `Público` em `body-strong` `tinta` e descrição em `caption` `grafite`: `Qualquer leitor vê sua estante, suas notas e suas resenhas.`
  - Opção 2: ícone `Lock`, título `Privado` em `body-strong` `tinta` e descrição em `caption` `grafite`: `Só quem você aceitar vê sua estante, suas notas e suas resenhas.`
- **Seleção única, sempre com uma opção marcada.** Não existe estado sem escolha.
- `space-16` de respiro no fim da tela, para que o último card não encoste na barra inferior.

### 4.1 Padrão

Avatar atual, campos preenchidos com os dados da seção 3, `Público` selecionado. Botão `Salvar` ativo no header. Barra inferior com **Perfil** ativo.

### 4.2 Enviando o avatar

- O círculo do avatar mostra a **nova imagem** já escolhida, com uma camada em `tinta` a 40% por cima e, centralizado sobre ela, o texto `Enviando` em `caption` peso 600 `papel`.
- Os botões `Trocar foto` e `Remover foto` ficam com opacidade reduzida e sem foco possível.
- O resto do formulário continua editável: o upload do avatar não trava o nome nem a biografia.
- Botão `Salvar` desabilitado enquanto a imagem sobe, com opacidade reduzida.
- **Sem spinner, sem barra de progresso circular, sem porcentagem.** O sistema não tem spinner.

### 4.3 Avatar recusado

A imagem não passou na validação de tipo, tamanho ou dimensões (RNF-SEC-20).

- O avatar volta a ser **o anterior**, não a imagem recusada.
- Abaixo dos botões do bloco de avatar, `space-3`, banner de largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `WarningCircle` (Phosphor, `regular`, 20px, `rubi`) à esquerda e o texto em `body` `tinta`: `Não foi possível usar essa imagem. Envie um JPG ou PNG de até 5 MB.`
- O formulário continua utilizável e o botão `Salvar` volta a ficar ativo: a foto recusada não impede salvar nome, biografia e privacidade.

### 4.4 Nome de exibição vazio

- Campo com borda de 1.5px `rubi`.
- Mensagem inline abaixo, `space-2`, em `caption` `rubi`: `Informe um nome de exibição.`
- Contador em `caption` `rubi`: `0/60`.
- Botão `Salvar` desabilitado no header.

### 4.5 Trocando para privado

O leitor selecionou `Privado` e ainda não salvou.

- Card `Privado` selecionado, com borda de 1.5px `musgo` e fundo `musgo-fundo`.
- Abaixo do bloco de privacidade, `space-4`, aviso de largura total menos o padding lateral, fundo `ambar-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `ambar`) à esquerda e o texto em `body` `tinta`: `Seus 84 seguidores atuais continuam seguindo você. Para tirar alguém, use a lista de seguidores.`
- Abaixo do texto, `space-3`, botão textual `musgo`: `Ver seguidores`, que leva a [`seguidores-e-seguidos.md`](seguidores-e-seguidos.md).
- **É aviso, não bloqueio.** O `Salvar` continua ativo, e nenhum modal aparece: a troca de privacidade não é destrutiva, ela só tem uma consequência que precisa estar escrita.

### 4.6 Salvando, com cold start

- Todos os campos com opacidade reduzida e sem foco possível.
- Botão `Salvar` do header trocado por `Salvando` em `caption` `grafite`, sem ação.
- Abaixo do bloco de privacidade, `space-4`, uma linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- **Sem spinner.**

### 4.7 Descartar alterações

O leitor tocou no `X` com alterações não salvas. Modal centrado, conforme RNF-USA-04.

- Fundo da tela escurecido por uma camada em `tinta` a 40% de opacidade.
- Card centrado, largura de 320px, `radius-lg`, fundo `papel-elevado`, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Descartar alterações?`
- `space-3`, texto em `body` `grafite`: `O que você mudou nesta tela não vai ser salvo.`
- `space-6`, dois botões empilhados com `space-3` de gap: botão **outline** `rubi` `Descartar` e botão textual `grafite` `Continuar editando`.
- **Sem este modal quando nada mudou:** tocar no `X` sem alteração volta direto ao perfil.

### 4.8 Carregando

- Header real, com `X`, título e `Salvar` desabilitado.
- Corpo substituído por **skeleton estático**: círculo de 96px e cinco barras retangulares em `capa-placeholder`, com as alturas dos campos, mais dois retângulos de 72px para os cards de privacidade.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.

**Estado vazio não se aplica a esta tela:** o formulário sempre tem os campos do leitor, e biografia em branco é um campo vazio, não um estado de tela.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo.
- Área de conteúdo com padding lateral `space-8` e header de conteúdo de 72px: botão textual de retorno `Perfil` acima, título `Editar perfil` em `display` `tinta` à esquerda e, à direita, o botão primário pill `Salvar`, 40px de altura, mais o botão textual `Cancelar` à esquerda dele. Sem sino.
- **O formulário não estica.** Coluna de no máximo 560px alinhada à esquerda da área de conteúdo, com campos de 44px de altura e biografia de 120px.
- **O bloco de avatar fica à esquerda dos campos**, numa coluna de 160px: avatar de 120px, `Trocar foto` e `Remover foto` empilhados abaixo, alinhados à esquerda. As duas colunas somam a largura do formulário, com gap `space-8`.
- Os dois cards de privacidade ficam **lado a lado**, metade da largura cada, com gap `space-4`.
- À direita do formulário o espaço fica **vazio**. Nada de card decorativo, nada de pré-visualização do perfil, nada de painel de dicas.
- `hover` nos cards de privacidade com fundo `linha` quando não selecionados; foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** as duas colunas do formulário viram uma, o avatar volta ao topo centralizado, os cards de privacidade empilham e a sidebar dá lugar à barra inferior.

### 5.1 Padrão

Sidebar com `Perfil` ativo, avatar à esquerda, campos à direita, cards de privacidade lado a lado com `Público` selecionado, `Salvar` e `Cancelar` no header.

### 5.2 Trocando para privado

Card `Privado` selecionado e o aviso em `ambar-fundo` abaixo dos dois cards, ocupando a largura do formulário, com o botão textual `Ver seguidores`.

### 5.3 Avatar recusado

Banner em `rubi-fundo` abaixo dos botões da coluna do avatar, ocupando a largura do formulário, com o avatar anterior de volta no círculo.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título do header e `X` em `papel-suave`, `Salvar` em `musgo-claro`. Labels e helpers em `grafite-claro`. Campos com fundo `noite-elevada`, **mais claro** que o fundo, borda de 1px `linha-noite`, texto digitado em `papel-suave`. Campo fixo de username com texto em `grafite-fundo-escuro`. Card de privacidade selecionado com fundo `musgo-fundo-escuro` e borda `musgo-claro`; não selecionado com borda `linha-noite`. Barra inferior em `noite-elevada`, com **Perfil** ativo em `musgo-claro`.
- **Mobile, trocando para privado.** Aviso com fundo `ambar-fundo-escuro`, ícone `ambar-claro` e texto `papel-suave`.
- **Web, padrão.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, `Perfil` ativo com fundo `musgo-fundo-escuro`.

O banner de avatar recusado no escuro usa `rubi-fundo-escuro` com ícone `rubi-claro` e texto `papel-suave`; mensagens inline usam `rubi-claro`. Nos três, os shadows ficam com **metade da opacidade**.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de formulário com label acima, helper, foco e erro | documento-de-design §4.2 |
| Botão primário pill, botão secundário e botão textual | documento-de-design §4.1 |
| Botão outline destrutivo e modal de confirmação | documento-de-design §4.1, §7.8 e RNF-USA-04 |
| Banner de erro em `rubi-fundo` e aviso em `ambar-fundo` | documento-de-design §3.1.3 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes e decisões que ainda não existem na fonte.** Viram pendência de incorporação pelo controle de mudança do plano §3:

1. **O card de opção com rádio, ícone, título e descrição**, usado no bloco de privacidade. O `documento-de-design.md` §4.2 define input de texto, não seleção com explicação.
2. **O campo de múltiplas linhas.** O §4.2 define altura de campo de uma linha; a biografia precisa de área de texto.
3. **O campo fixo, não editável**, usado no nome de usuário.
4. **O estado de upload sobre o avatar**, com camada e rótulo, sem spinner nem barra de progresso.
5. **O limite de caracteres da biografia.** Não existe em `REQUISITOS.md`, no `documento-de-design.md` nem no schema de [`identidade.yaml`](../../../api/identidade.yaml). Sem fonte, o protótipo não inventa contador. **Registrar como pendência em `feature-F-PERFIL.md`**; quando o limite for definido, o campo ganha contador igual ao do nome de exibição.
6. **Tipos e tamanho máximo do avatar.** Ficam no preset do Cloudinary (P-09), ainda não configurado. O `5 MB` do artboard 4.3 é mock declarado e precisa ser substituído pelo valor real antes da implementação.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Editar perfil` |
| Ação do header | `Salvar` |
| Ação do header, salvando | `Salvando` |
| Trocar avatar | `Trocar foto` |
| Remover avatar | `Remover foto` |
| Label do username | `Nome de usuário` |
| Valor do username | `@marinableu` |
| Helper do username | `O nome de usuário não muda.` |
| Label do nome | `Nome de exibição` |
| Contador do nome | `14/60` |
| Label da biografia | `Biografia` |
| Helper da biografia | `Aparece no seu perfil em até três linhas.` |
| Título da seção | `Privacidade` |
| Opção 1, título | `Público` |
| Opção 1, descrição | `Qualquer leitor vê sua estante, suas notas e suas resenhas.` |
| Opção 2, título | `Privado` |
| Opção 2, descrição | `Só quem você aceitar vê sua estante, suas notas e suas resenhas.` |
| Aviso ao trocar para privado | `Seus 84 seguidores atuais continuam seguindo você. Para tirar alguém, use a lista de seguidores.` |
| Aviso, botão | `Ver seguidores` |
| Erro de nome vazio | `Informe um nome de exibição.` |
| Erro de avatar | `Não foi possível usar essa imagem. Envie um JPG ou PNG de até 5 MB.` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Upload em curso | `Enviando` |
| Modal, título | `Descartar alterações?` |
| Modal, texto | `O que você mudou nesta tela não vai ser salvo.` |
| Modal, botão destrutivo | `Descartar` |
| Modal, botão textual | `Continuar editando` |
| Web, retorno | `Perfil` |
| Web, ação secundária do header | `Cancelar` |

Zero em-dash em toda a copy. Zero emoji. Todo número aparece com unidade, e o `5 MB` do erro de avatar é mock declarado.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no mobile no `X`, no `Salvar`, nos botões do avatar, em cada card de privacidade e nos botões do modal.
- A opção de privacidade selecionada é distinguível **sem depender de cor**: além da borda `musgo` e do fundo `musgo-fundo`, o controle de rádio está preenchido e o estado é anunciado.
- Os dois cards de privacidade formam um grupo de rádio único, navegável pelas setas do teclado, com o título `Privacidade` como rótulo do grupo.
- O campo de nome de usuário é anunciado como não editável, e o `Lock` não é a única pista: o helper diz por extenso que ele não muda.
- A mensagem de erro é associada ao campo, para o leitor de tela lê-la junto do label e do helper.
- O estado de upload é anunciado quando começa e quando termina, e o rótulo `Enviando` é texto, não imagem.
- O modal captura o foco, começa no botão `Continuar editando`, fecha com `Esc` e devolve o foco ao `X`.
- Contraste WCAG AA no corpo nos dois temas. Descrições das opções usam `grafite`.
- Foco de teclado visível na web em todos os controles, na ordem visual: retorno, avatar, nome, biografia, privacidade, salvar.
- `prefers-reduced-motion` respeitado: o fade do modal e o hover dos cards viram estáticos.
- Sair com alterações não salvas sempre passa pelo modal, nas duas plataformas.

---

## 10. O que não fazer nesta tela

**Específico da edição**

- **Não desenhe campo de nome de usuário editável.** Nenhum requisito prevê troca de username.
- **Não desenhe campo de e-mail.** Trocar e-mail não tem requisito no Período 1.
- **Não desenhe troca de senha aqui.** Ela é tela própria, em `../F-AUT/alterar-senha.md`, e chega pelas configurações.
- **Não desenhe contador na biografia** enquanto o limite não estiver definido.
- **Não bloqueie a troca para privado** nem peça confirmação em modal: é aviso, não ação destrutiva.
- **Não prometa remover seguidores** ao virar privado. RN-08 diz o contrário, e o aviso existe justamente para desfazer essa expectativa.
- **Não desenhe barra de progresso nem porcentagem** no upload do avatar.
- **Não mostre a imagem recusada** no círculo depois do erro: volta a anterior.
- **Não desenhe recorte, zoom, filtro nem editor de imagem.** A imagem vai como foi escolhida, e o redimensionamento é transformação por URL do provedor.
- **Não desenhe capa de perfil, tema de cor do perfil nem emoji de destaque.**
- Não use placeholder no lugar de label em nenhum campo.
- Não esconda o helper até o erro acontecer.
- Não desenhe `switch` para a privacidade: são duas opções com consequências diferentes, e cada uma precisa da sua descrição.

**Escopo do Período 1**

- **Não desenhe excluir conta.** RF-AUT-07 é Desejável e pertence a F-CONTA-2, no Período 2.
- **Não desenhe preferências de notificação.** RF-NOT-05 é opcional.
- **Não desenhe opt-out de recomendação.** O campo existe na VIEW de `identidade`, mas a tela dele pertence a F-REC-ALG, no Período 3.

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

- Nada de hero de landing dentro do produto. Esta é tela de formulário.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo em tela de dados.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. Mobile não tem hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.

**Formulário**

- Nada de placeholder no lugar de label.
- Nada de helper que só aparece depois do erro.
- Nada de validação que só existe no cliente: a mensagem reflete a regra que o servidor aplica.
