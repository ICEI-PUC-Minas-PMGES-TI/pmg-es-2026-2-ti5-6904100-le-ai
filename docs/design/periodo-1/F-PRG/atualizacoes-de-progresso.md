# F-PRG · Atualizações de progresso

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-PRG.md
**Requisitos:** RF-PRG-03 (visualizar e excluir atualizações de progresso de uma leitura em andamento, recalculando-se a página atual), RF-PRG-02 (página atual e percentual concluído exibidos como valores derivados)
**Não funcionais:** RNF-DES-02 (lista paginada com teto imposto pelo servidor), RNF-USA-04 (confirmação em ação destrutiva), RNF-SEC-02 (propriedade da leitura validada no servidor), RNF-USA-03, RNF-USA-05
**Regras de negócio:** RN-17.3 (página atual é a maior página informada até o momento), RN-17.4 (excluir uma atualização recalcula a página atual a partir das restantes; esta operação é Essencial justamente porque, com entrada absoluta e monotônica, um valor digitado alto demais bloqueia os registros seguintes), RN-17.1 (páginas lidas de uma atualização são a diferença para a página atual anterior)
**Versão web:** sim. RF-PRG-02 e RF-PRG-03 têm marcação na coluna Web de `REQUISITOS.md` §5.4.

---

## 1. Contexto

O histórico de uma leitura em andamento e, principalmente, a **saída de emergência** de RN-17.4.

A entrada de progresso é absoluta e monotônica: o leitor informa a página em que parou, e a próxima precisa ser maior. Se ele digitar `250` por engano num livro de `264 páginas`, todos os registros seguintes ficam bloqueados pela validação de RF-PRG-04. A única forma de destravar é **excluir aquela atualização**, e é por isso que uma operação de exclusão virou requisito Essencial.

A tela precisa deixar isso óbvio. Ela não é um diário de leitura decorativo: é o lugar onde o leitor conserta o que digitou errado.

Ela sustenta o mecanismo de **meta**: a página atual e o percentual, que a estante e a página do livro exibem, são recalculados aqui.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Atualizações de progresso · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.

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

**Livro em leitura:** `Torto Arado`, de Itamar Vieira Junior, Todavia, `264 páginas`. Leitura iniciada em `12 de agosto de 2026`.

**Resumo derivado, exibido no topo:**

- Página atual: `172`.
- Percentual concluído: `65%`.
- Total acumulado: `172 páginas` em `4 horas e 20 minutos`, ao longo de `6 registros`.

**Lista de atualizações**, da mais recente para a mais antiga:

| Data | Página informada | Páginas lidas (derivado) | Tempo |
|---|---|---|---|
| 08 de setembro de 2026 | página 172 | 24 páginas | 45 minutos |
| 05 de setembro de 2026 | página 148 | 31 páginas | 1 hora e 10 minutos |
| 02 de setembro de 2026 | página 117 | 22 páginas | 35 minutos |
| 28 de agosto de 2026 | página 95 | 40 páginas | 1 hora |
| 20 de agosto de 2026 | página 55 | 33 páginas | 30 minutos |
| 12 de agosto de 2026 | página 22 | 22 páginas | 20 minutos |

**Cenário do artboard de recálculo:** a atualização de `08 de setembro de 2026`, com `página 172`, é excluída. A página atual volta para `148` e o percentual para `56%`. O acumulado passa a `148 páginas` em `3 horas e 35 minutos`, ao longo de `5 registros`.

**Cenário do artboard de valor digitado errado:** a atualização mais recente é `página 250`, de `08 de setembro de 2026`, com `102 páginas lidas` em `15 minutos`. Ela é o que trava os registros seguintes, e a faixa válida passa a ser de `251` a `264`.

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

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px.
- Título `Progresso` em `display` `tinta`, à esquerda, alinhado à base.
- `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita, com o badge de não lidas quando houver.

### Bloco de resumo

Logo abaixo do header, com padding lateral `space-5` e `space-6` de respiro abaixo.

- Card compacto do livro: capa de 60 por 90px em canto vivo à esquerda, `space-4` de gap, título em `title-sm` `tinta`, autor em `caption` `grafite`.
- `space-4` abaixo, barra de progresso conforme design §4.7: track `musgo-fundo` de 6px, fill `musgo` a 65%, percentual à direita em `num-inline` `caption`.
- Abaixo, em `caption` `grafite`: `Página 172 de 264`.
- `space-4` abaixo, três valores em linha, separados por divisor vertical de 1px `linha`, cada um com o número em `num-inline` `tinta` acima e o rótulo em `caption` `grafite` abaixo, centralizados: `172 páginas` sob `Lidas`, `4 h 20 min` sob `Tempo`, `6 registros` sob `Registros`.
- **Estes três valores não são um dashboard.** São três números em uma linha com divisor, conforme design §7.3, que proíbe três cards iguais quando a informação cabe em três linhas ou em uma linha com divisor.
- Divisor de 1px `linha` de largura total abaixo do bloco.

### Lista de atualizações

- Título de seção `Atualizações` em `title-lg` `tinta`, padding lateral `space-5`, com `space-4` abaixo.
- Cada item ocupa uma linha, com padding lateral `space-5` e `space-4` de padding vertical, separado por divisor de 1px `linha`:
  - **À esquerda**, a página informada em `num-inline` `tinta`, no formato `página 172`, e abaixo, em `caption` `grafite-suave`, a data por extenso: `08 de setembro de 2026`.
  - **No meio**, em `caption` `grafite`: `24 páginas · 45 min`.
  - **À direita**, `Trash` (Phosphor, `regular`, 20px, `grafite`) com alvo de toque de 48px, abrindo a confirmação de exclusão.
- A ordem é da mais recente para a mais antiga.
- Paginação por rolagem, com teto de itens imposto pelo servidor. Nada de botão `Carregar mais`, nada de numeração de página no mobile.

### 4.1 Padrão

O estado principal: header, bloco de resumo com `65%`, título de seção e os seis itens da lista.

### 4.2 Valor digitado errado, travando os registros

O caso que justifica RN-17.4 existir. É o artboard mais importante desta tela.

- Bloco de resumo com a barra a `95%` e a linha `Página 250 de 264`.
- Primeiro item da lista: `página 250`, `08 de setembro de 2026`, `102 páginas · 15 min`.
- Abaixo desse item, dentro da mesma linha e antes do divisor, um aviso em `caption` `ambar`, com `Warning` (Phosphor, `regular`, 16px, `ambar`) à esquerda: `102 páginas em 15 minutos. Se você digitou errado, exclua este registro para voltar à página 148.`
- O aviso aparece quando o ritmo do registro é muito acima da média do leitor, e é **informativo, não bloqueante**: nada impede que ele tenha lido rápido mesmo. Por isso `ambar` e não `rubi`, e por isso a copy pergunta em vez de afirmar.
- O ícone `Trash` daquele item recebe cor `ambar` no lugar de `grafite`, para ligar o aviso à ação que o resolve.
- Regra do limiar · incorporado em 27/09/2026: o aviso aparece quando as páginas lidas do registro passam em 40 páginas ou mais a média de páginas lidas dos outros registros carregados da mesma leitura (média zero quando não há outros). Registro sem tempo informado usa a variante sem minutos do aviso.

### 4.3 Confirmação de exclusão

Ação destrutiva. Conforme RNF-USA-04, confirmação em modal.

- Scrim `rgba(23,21,18,0.32)`, tingido no hue de `tinta`.
- Dialog centrado, largura de 320px, fundo `papel-elevado`, `radius-lg` 20, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Excluir esta atualização?`
- Texto em `body` `grafite`, com `space-4` acima: `Sua página atual volta para 148 e o percentual para 56%. Os outros registros não mudam.`
- **A confirmação diz o número que vai resultar do recálculo.** É o que o leitor precisa saber para decidir, e é a diferença entre esta confirmação e uma genérica.
- `space-6` abaixo, dois botões empilhados de largura total:
  - **Botão destrutivo em outline**, `radius` 12, altura 48px, fundo transparente, borda de 1px `rubi`, texto `rubi`: `Excluir atualização`. Nunca preenchido.
  - Botão textual `grafite`: `Cancelar`.

### 4.4 Depois do recálculo

O resultado da exclusão. Não é uma tela de sucesso: é a mesma tela com os números atualizados.

- Bloco de resumo com a barra a `56%` e a linha `Página 148 de 264`.
- Os três valores passam a `148 páginas`, `3 h 35 min` e `5 registros`.
- A lista tem cinco itens, começando por `página 148`.
- **Sem toast, sem banner de sucesso, sem animação.** Os números mudados são a confirmação.

### 4.5 Vazio

Leitura iniciada, sem nenhum registro ainda.

- Bloco de resumo presente, com a barra em zero. Conforme design §4.7, zero por cento **não** mostra `0%`: mostra `Iniciada` em `caption` `grafite` no lugar do percentual, e a linha abaixo passa a `Iniciada em 12 de agosto de 2026`.
- Os três valores mostram `0 páginas`, `0 min` e `0 registros`. Aqui o zero é o valor real de uma contagem, não uma nota ausente, e por isso ele aparece com unidade.
- No lugar da lista, bloco centralizado com `space-6` entre os elementos:
  - `Clock` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhuma atualização ainda`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Registre em qual página você parou para acompanhar seu progresso.`
  - Botão primário pill, altura 48px, `musgo`: `Registrar progresso`.

### 4.6 Carregando

- Header e bloco de resumo em skeleton: retângulo `capa-placeholder` de 60 por 90px, duas barras à direita, uma barra fina de 6px na largura total para a barra de progresso, e três blocos curtos na linha dos valores.
- Lista em skeleton: cinco linhas, cada uma com uma barra de 18px e 30% de largura à esquerda e uma de 13px e 25% no meio.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem spinner.

### 4.7 Erro de carregamento

- Header real.
- Banner inline, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar suas atualizações. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Estante** ativo.
- Área de conteúdo com padding lateral `space-8`, `max-width` de 1120px.
- Header de conteúdo de 72px com `Progresso` em `display` `tinta` à esquerda e o botão primário pill de 40px `Registrar progresso` à direita. Sem sino.
- **Duas colunas:**
  - **Coluna da esquerda, 320px, fixa ao rolar:** o bloco de resumo inteiro, com a capa em 200 por 300px, a barra de progresso, `Página 172 de 264` e os três valores empilhados verticalmente com divisor horizontal `linha` entre eles, em vez de lado a lado como no mobile.
  - **Coluna da direita:** a lista de atualizações, em **tabela de quatro colunas** com cabeçalho: `Data`, `Página`, `Páginas lidas`, `Tempo`, e uma quinta coluna estreita à direita com o `Trash`. Cabeçalho em `label` `grafite`, linhas com 56px de altura, divisor de 1px `linha` entre elas.
  - A tabela é o ganho da tela grande: no mobile os mesmos dados são três blocos empilhados dentro de uma linha; aqui são colunas alinhadas, que comparam melhor.
  - A tabela rola dentro do próprio container quando a largura aperta, e **a página nunca rola na horizontal**.
- `hover` na linha da tabela: fundo `papel-elevado`, e o `Trash` passa de `grafite` para `rubi`, transição `dur-fast`.
- Foco de teclado visível em linha, botão e ícone, com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** a tabela vira a lista do mobile, as duas colunas viram uma, e a sidebar dá lugar à barra inferior.

### 5.1 Padrão

Duas colunas, resumo à esquerda com `65%`, tabela à direita com os seis registros.

### 5.2 Linha em hover, com o ícone em rubi

Mesma tela, com o cursor sobre a linha de `05 de setembro de 2026`: fundo `papel-elevado` e `Trash` em `rubi`. Serve para conferir que a ação destrutiva se anuncia antes do clique.

### 5.3 Confirmação de exclusão

Dialog centrado de 400px sobre o scrim, com a copy de 4.3 e os dois botões **lado a lado à direita**: `Cancelar` textual e `Excluir atualização` em outline `rubi`.

### 5.4 Vazio

Coluna da esquerda com o resumo em zero e `Iniciada` no lugar do percentual; coluna da direita com o bloco centralizado de vazio e o botão `Registrar progresso`.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título do header em `papel-suave`. Título do livro em `papel-suave`, autor em `grafite-claro`. Barra de progresso com track `musgo-fundo-escuro` e fill `musgo-claro`. Números dos três valores em `papel-suave`, rótulos em `grafite-claro`, divisores verticais em `linha-noite`. Página informada de cada item em `papel-suave`, data em `grafite-fundo-escuro`, detalhe em `grafite-claro`, `Trash` em `grafite-claro`. Divisores em `linha-noite`. Barra inferior em `noite-elevada`, **mais clara** que o fundo.
- **Mobile, confirmação de exclusão.** Dialog em `noite-elevada`, título em `papel-suave`, texto em `grafite-claro`, botão destrutivo com borda de 1px `rubi-claro` e texto `rubi-claro`, fundo transparente.
- **Web, padrão.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Cabeçalho da tabela em `grafite-claro`, linhas separadas por `linha-noite`, hover com fundo `noite-elevada` e `Trash` em `rubi-claro`.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Barra de progresso de leitura, incluindo a regra de não exibir zero nem cem por cento | documento-de-design §4.7 |
| Card compacto do livro com capa de 60 por 90px | documento-de-design §5.4 |
| Botão primário pill, textual e destrutivo em outline | documento-de-design §4.1 |
| Confirmação de ação destrutiva em modal, com botão em outline `rubi` | documento-de-design §7.8 e RNF-USA-04 |
| Escala tipográfica, com JetBrains Mono e numeral tabular nos números | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que ainda não existem na fonte.** Dois nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **A linha de três valores com divisor vertical.** O §7.3 diz o que não fazer (três cards iguais) mas não desenha a alternativa.
2. **A tabela de dados da web.** O documento não tem tabela em nenhuma seção, e a lista de atualizações é o primeiro lugar do produto que pede uma.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Progresso` |
| Detalhe do progresso | `Página 172 de 264` |
| Progresso em zero | `Iniciada`, `Iniciada em 12 de agosto de 2026` |
| Rótulos dos três valores | `Lidas`, `Tempo`, `Registros` |
| Valores | `172 páginas`, `4 h 20 min`, `6 registros` |
| Título de seção | `Atualizações` |
| Item da lista, página | `página 172` |
| Item da lista, detalhe | `24 páginas · 45 min` |
| Cabeçalho da tabela na web | `Data`, `Página`, `Páginas lidas`, `Tempo` |
| Aviso de ritmo | `102 páginas em 15 minutos. Se você digitou errado, exclua este registro para voltar à página 148.` |
| Confirmação, título | `Excluir esta atualização?` |
| Confirmação, texto | `Sua página atual volta para 148 e o percentual para 56%. Os outros registros não mudam.` |
| Confirmação, botão destrutivo | `Excluir atualização` |
| Cancelar | `Cancelar` |
| Vazio, título | `Nenhuma atualização ainda` |
| Vazio, texto | `Registre em qual página você parou para acompanhar seu progresso.` |
| Vazio, botão | `Registrar progresso` |
| Erro, texto | `Não foi possível carregar suas atualizações. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |
| Aviso de ritmo, registro sem tempo · incorporado em 27/09/2026 | `102 páginas de uma vez. Se você digitou errado, exclua este registro para voltar à página 148.` |
| Item sem tempo informado · incorporado em 27/09/2026 | `24 páginas` no item da lista; célula de tempo vazia na tabela |
| Rótulo do botão excluir · incorporado em 27/09/2026 | `Excluir a atualização da página 172` |
| Ação de editar, só na atualização mais recente · incorporado em 27/09/2026 | ícone `PencilSimple` com o rótulo `Editar a atualização da página 172` |
| Confirmação, alcance · incorporado em 27/09/2026 | `Esta atualização e a seguinte serão excluídas.`, `Esta atualização e as 2 seguintes serão excluídas.` |
| Link a partir da estante e da página do livro · incorporado em 27/09/2026 | `Ver atualizações` |

Zero em-dash em toda a copy. Zero emoji. Todo número traz a unidade, inclusive os zeros do estado vazio, que são contagens reais e não valores ausentes.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no ícone de excluir de cada item, mesmo com o ícone desenhado em 20px.
- Toda exclusão passa por confirmação em modal (RNF-USA-04), e a confirmação informa o **resultado numérico** do recálculo, não uma frase genérica sobre irreversibilidade.
- O aviso de ritmo é comunicado **sem depender de cor**: além de `ambar`, ele traz o ícone `Warning` e a frase que explica o motivo.
- A barra de progresso não comunica só por preenchimento: o percentual aparece em número ao lado e a página em texto abaixo.
- Contraste WCAG AA no corpo nos dois temas. A data de cada item usa `grafite-suave` porque é metadado; a página informada e o detalhe de páginas e tempo usam `tinta` e `grafite`, porque são o dado.
- O resumo é anunciado por leitor de tela quando muda depois de uma exclusão, para que o recálculo não seja silencioso.
- Na web, o foco fica preso dentro do dialog de confirmação enquanto ele está aberto, é devolvido à linha de origem ao fechar, e `Esc` fecha. A tabela é navegável por teclado linha a linha.
- `prefers-reduced-motion` respeitado: o fade de entrada do skeleton e o hover da linha viram estáticos.

---

## 10. O que não fazer nesta tela

**Específico das atualizações de progresso**

- **Não ofereça editar uma atualização.** RF-PRG-03 dá visualizar e excluir. Editar não existe, e o caminho para corrigir é excluir e registrar de novo.
- **Não desenhe páginas lidas como campo.** Elas são derivadas de RN-17.1 e só aparecem como texto na lista.
- **Não use confirmação genérica.** A confirmação precisa dizer para qual página e qual percentual o recálculo vai levar.
- **Não desenhe botão destrutivo preenchido.** Destrutivo é outline `rubi`, nos dois temas.
- **Não prometa desfazer.** Excluir é excluir.
- Não desenhe o aviso de ritmo como bloqueio. Ele é informativo: ler rápido é possível.
- Não desenhe o aviso de ritmo em `rubi`. Ele é `ambar`, porque é alerta e não erro.
- Não desenhe gráfico de evolução de páginas por mês nem por dia. Estatísticas e gráficos são RF-STA, do Período 2.
- **Não desenhe sequência diária, streak nem chama.** Gamificação é do Período 2.
- Não exiba `0%` na barra de progresso. Zero é `Iniciada`, conforme design §4.7.
- Não deixe a tabela da web forçar rolagem horizontal na página. Ela rola dentro do próprio container.

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
**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.
- Nada de desfazer em ação destrutiva pesada.
**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
