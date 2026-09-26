# F-FEED · Feed

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-FEED.md
**Requisitos:** RF-SOC-09 (feed cronológico com as atividades de quem o leitor segue), RF-SOC-11 (curtir atividades), RF-SOC-12 (comentar, a partir daqui)
**Requisito de sistema cujo efeito aparece aqui:** RF-SOC-10 (o sistema publica como atividade o início, a retomada, a conclusão e o abandono de leitura e a publicação de resenha). É de sistema, com a coluna Web marcada com traço; o cliente apenas **exibe o efeito**.
**Não funcionais:** RNF-SEC-03 (visibilidade revalidada no servidor), RNF-SEC-06 e RN-15 (livro pessoal só pelas vias autorizadas), RNF-SEC-14 (conteúdo do usuário tratado como texto, com escape), RNF-DES-02 (feed paginado), RNF-USA-03, RNF-USA-05, RNF-ERR-09
**Regras de negócio:** RN-09 (feed cronológico de quem se segue; deixar de seguir tira as atividades, e atividade de livro excluído deixa de ser exibida), RN-08 (privacidade de perfil), RN-15 (livro pessoal aberto pela atividade do feed), RN-14.4 (ordem de resolução da capa)
**Versão web:** sim. RF-SOC-09, RF-SOC-11 e RF-SOC-12 têm marcação na coluna Web de `REQUISITOS.md` §5.9.

---

## 1. Contexto

A terceira área de navegação e o coração do **pertencimento**: ver gente lendo. Lista cronológica decrescente das atividades de quem o leitor segue, com curtir e comentar em cada uma.

Daqui sai para a página do livro, para o perfil de quem publicou, para a página autorizada de um livro pessoal e para a tela de comentários, em [`comentarios.md`](comentarios.md). É raiz de aba, então **não tem botão de voltar**.

Três coisas que ela precisa resolver:

- **Cinco tipos de atividade na mesma lista.** Começou a ler, retomou, terminou, abandonou e publicou resenha. O item precisa deixar o tipo claro sem virar cinco desenhos diferentes: o verbo muda, a estrutura não.
- **O feed é o caminho mais lido do app** e precisa ser rápido de varrer. Por isso ele é previsível: mesma estrutura em todo item, capa sempre no mesmo lugar, ações sempre no mesmo lugar.
- **Abandono não é vergonha.** Abandonar é um estado legítimo da máquina de RN-04 e aparece no feed como qualquer outro. Nada de cor de alerta, nada de capa esmaecida, nada de ícone triste.

**O feed não descobre pessoas.** O vazio de quem não segue ninguém leva à busca por nome de usuário exato, porque não existe sugestão de perfis no produto (`REQUISITOS.md` §5.9).

**Escopo desta entrega.** Curtir resenha, editar e excluir comentário, menção resolvida com link e recomendação entre leitores são de períodos seguintes. O feed do Período 1 tem exatamente: listar, curtir, descurtir e abrir os comentários.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Feed · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Cinco atividades**, uma de cada tipo, da mais recente para a mais antiga:

| Quem | Verbo | Livro | Autor | Quando | Curtidas | Comentários |
|---|---|---|---|---|---|---|
| Dandara Lopes `@dandaralp` | `começou a ler` | Torto Arado | Itamar Vieira Junior | `2 h` | `4 curtidas` | `2 comentários` |
| Rafael Okamoto `@rafaokamoto` | `publicou uma resenha` | Os Sertões | Euclides da Cunha | `5 h` | `11 curtidas` | `3 comentários` |
| Júlia Wenceslau `@juwences` | `terminou de ler` | Quarto de Despejo | Carolina Maria de Jesus | `ontem` | `7 curtidas` | sem comentários |
| Nadia Sampaio `@nadiasampaio` | `abandonou a leitura` | Grande Sertão: Veredas | João Guimarães Rosa | `2 dias` | sem curtidas | `1 comentário` |
| Otávio Brandão `@otaviobrandao` | `retomou a leitura` | A Hora da Estrela | Clarice Lispector | `3 dias` | `2 curtidas` | sem comentários |

**Trecho da resenha**, exibido só no item de resenha, truncado em três linhas: `Euclides escreve geologia e termina escrevendo gente. A terceira parte é insuportável no melhor sentido.` com a nota `5 estrelas`.

**Atividade de livro pessoal**, no artboard 4.3:

| Quem | Verbo | Livro | Autor | Quando |
|---|---|---|---|---|
| Caio Ferraz `@caioferraz` | `começou a ler` | Caderno de Contos do Bairro | Caio Ferraz | `6 h` |

Esse livro é pessoal: tem o dono como autor, capa enviada pelo dono e **não existe na busca** (RN-03).

**Capa em placeholder:** `A Hora da Estrela` cai no terceiro nível de RN-14.4 e usa `capa-placeholder`.

**Paginação:** o servidor entrega 20 por página, e a lista carrega a próxima por rolagem.

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

Raiz de aba: **sem `ArrowLeft`**.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- Título `Feed` em `display` `tinta`, à esquerda, alinhado à base.
- `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita, com o badge de não lidas quando houver.
- **Sem o `UserCircle` que o `documento-de-design.md` §5.3 coloca neste header.** Aquele ícone existia antes de o shell fixar quatro áreas de navegação, e `Perfil` agora é uma delas: repetir a porta do perfil no header seria duas rotas para o mesmo lugar na mesma tela. Ver a pendência na seção 7.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Item de atividade

Estrutura fixa, conforme design §4.9, para os cinco tipos. Padding lateral `space-5`, `space-5` de padding vertical, itens separados por divisor de 1px `linha`.

1. **Linha de autoria:** avatar circular de 40px à esquerda, `space-3` de gap, nome em `title-sm` `tinta`, separador `·` com espaço simples e o tempo em `caption` `grafite-suave`. O avatar e o nome levam ao perfil de quem publicou.
2. `space-2`, **verbo da atividade** em `body` `grafite`, em linha própria: `começou a ler`, `retomou a leitura`, `terminou de ler`, `abandonou a leitura`, `publicou uma resenha`. **Nunca inverta:** o verbo fica na sua linha, e o livro vem abaixo, no card.
3. `space-3`, **card do livro:** capa de 80 por 120px em canto vivo à esquerda, `space-4` de gap, título em `title-sm` `tinta` em até duas linhas e autor em `caption` `grafite` abaixo. O card inteiro leva à página do livro.
4. **Só no item de resenha**, `space-3` abaixo do card: estrelas conforme design §4.3 com o valor ao lado em `num-inline` `caption` `grafite`, e o trecho da resenha em `body` **Newsreader** `grafite`, truncado em três linhas, com o botão textual `musgo` em `caption` ao fim: `Ler resenha`. Este é um dos três lugares do produto em que a serifa entra.
5. `space-4`, **linha de ações:** dois botões `radius-full`, altura 32px, padding lateral `space-3`, texto em `caption`, com `space-3` de gap:
   - `Heart` (Phosphor, `regular`, 20px, `grafite`) mais o número: `4`. Curtido, o ícone vira `fill` `musgo` e o texto vira `musgo`.
   - `ChatCircle` (Phosphor, `regular`, 20px, `grafite`) mais o número: `2`. Sem comentários, o botão mostra só o ícone, sem zero.
   - À direita da linha, quando há curtidas, o resumo em `caption` `grafite-suave`: `4 curtidas`. Ele é o número com unidade, e o botão é o controle.

**Nada de menu de três pontos no item.** Denunciar é Desejável e do Período 2, editar e excluir comentário também, e não há outra ação de item no Período 1.

### 4.1 Padrão

Estado principal. Header, cinco itens na ordem da seção 3, um de cada tipo. Barra inferior do shell com **Feed** ativo.

Este é o artboard que prova que os cinco tipos são distinguíveis pelo verbo, **sem** cinco cores, cinco ícones de tipo ou cinco fundos diferentes.

### 4.2 Curtida aplicada

Mesmo enquadramento de 4.1, com o primeiro item curtido.

- `Heart` em `fill` `musgo`, número em `musgo`, e o resumo passa a `5 curtidas`.
- A troca de estado acontece em `dur-instant`, com `scale(0.98)` no press do botão.
- **Sem animação de coração que cresce, sem partículas, sem explosão.** O motion do sistema é contido, e o botão responde ao press, e ponto.
- Curtir e descurtir é a mesma ação, sem confirmação: não é destrutiva.

### 4.3 Atividade de livro pessoal

O caso de RN-15, em que a atividade é a **via autorizada** para abrir o livro.

- Item de `Caio Ferraz` com o verbo `começou a ler` e o card do livro `Caderno de Contos do Bairro`.
- Abaixo do autor no card, `space-2`, um chip: `radius-full`, padding `space-1 space-3`, fundo `papel-elevado`, borda de 1px `linha`, texto em `caption` peso 600 `grafite`, com `BookmarkSimple` (Phosphor, `regular`, 16px) à esquerda: `Livro pessoal`.
- O card leva à página daquele livro pessoal, **abrindo a partir desta atividade**. O servidor revalida a via e o seguimento; a interface não é a proteção, ela é a porta.
- **Sem tratamento visual de segundo nível:** o livro pessoal não é mostrado com capa menor, fundo diferente nem opacidade reduzida. Ele é um livro.

### 4.4 Feed vazio, sem seguir ninguém

Conforme design §5.3.

- Header real.
- Bloco centralizado no espaço da lista, `space-6` entre os elementos:
  - `Newspaper` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Comece seguindo leitores`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `As atividades de quem você segue aparecem aqui, da mais recente para a mais antiga.`
  - Botão primário pill `musgo`, 48px: `Buscar por nome de usuário`, que leva a [`../F-PERFIL/buscar-leitor.md`](../F-PERFIL/buscar-leitor.md).
- **Sem sugestão de perfis, sem leitores populares, sem "siga estas pessoas para começar".** A descoberta é deliberada e por nome de usuário exato.

### 4.5 Feed vazio, seguindo pessoas

O leitor segue gente, mas ninguém publicou nada ainda. **É outro vazio, com outra saída.**

- Bloco centralizado, com:
  - `Clock` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nada por aqui ainda`.
  - Texto em `body` `grafite`: `Quando quem você segue começar, terminar ou resenhar um livro, aparece aqui.`
  - Botão textual `musgo`: `Ver minha estante`.
- **Não repita o CTA de buscar pessoas neste estado:** quem já segue alguém não precisa ser mandado de volta à busca.

### 4.6 Carregando

- Header real.
- Lista substituída por **skeleton estático**: três itens, cada um com círculo de 40px, uma barra de 17px, uma barra de 15px, um retângulo de 80 por 120px em `capa-placeholder` com duas barras ao lado e dois retângulos de 32px com `radius-full` na linha de ações.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** (RNF-ERR-09): demora não é erro.

### 4.7 Carregando mais

A rolagem chegou ao fim da primeira página de 20.

- Os itens carregados continuam visíveis e utilizáveis.
- Abaixo do último, **um item de skeleton** no mesmo desenho de 4.6, com um único fade.
- **Nada muda no topo.** O carregamento incremental não recarrega o feed, não move o scroll e não empurra o conteúdo já lido.
- **Sem botão `Carregar mais`** e sem rolagem infinita que volte ao topo sozinha.

### 4.8 Erro de carregamento

- Header real.
- Banner inline no lugar da lista, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar seu feed. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Feed** ativo. Sem sino.
- Área de conteúdo com padding lateral `space-8` e header de conteúdo de 72px com `Feed` em `display` `tinta` à esquerda.
- **Coluna única de no máximo 760px, alinhada à esquerda da área de conteúdo**, não centralizada na viewport.
- **Não existe segunda coluna.** A coluna lateral de um feed costuma ser ocupada por sugestão de perfis, tendências ou publicidade, e nenhuma das três existe neste produto: sugerir pessoas contraria `REQUISITOS.md` §5.9. Preencher o espaço com um bloco decorativo seria bento grid em tela de dados. O espaço à direita fica **vazio**, e o alinhamento à esquerda com a sidebar é o que impede a leitura de "tela mobile centralizada sobre fundo vazio".
- **O item ganha densidade de web:** capa de 100 por 150px, título em `title`, autor em `body`, e a linha de ações com botões de 36px de altura. O trecho de resenha passa a quatro linhas antes de truncar.
- `hover` no item com fundo `papel-elevado` em toda a área do card do livro; `hover` no botão de curtir com fundo `musgo-fundo`. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** a coluna ocupa a largura inteira com padding lateral `space-5`, o item volta às medidas do mobile e a sidebar dá lugar à barra inferior.

### 5.1 Padrão

Sidebar com `Feed` ativo, cinco itens na coluna de 760px, espaço à direita vazio.

### 5.2 Curtida aplicada, com hover

Primeiro item curtido, com `Heart` em `fill` `musgo`, e o cursor sobre o card do livro do segundo item, que ganha fundo `papel-elevado`.

### 5.3 Feed vazio, sem seguir ninguém

Bloco de vazio alinhado ao topo da coluna de 760px, com `space-16` de respiro acima, e o botão `Buscar por nome de usuário`.

### 5.4 Carregando

Skeleton estático de quatro itens na coluna de 760px, com header real. Um único fade de entrada, sem shimmer.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título do header e `Bell` em `papel-suave`. Nome em `papel-suave`, tempo em `grafite-fundo-escuro`, verbo em `grafite-claro`. Card do livro com título em `papel-suave` e autor em `grafite-claro`. Capa em `capa-placeholder-noite` quando não há imagem. Divisores em `linha-noite`. Botões de ação com ícone e texto em `grafite-claro`; curtido, `Heart` em `fill` `musgo-claro` com o texto em `musgo-claro`. Estrelas preenchidas em `musgo-claro`. Trecho de resenha em Newsreader `grafite-claro`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com **Feed** ativo em `musgo-claro`.
- **Mobile, livro pessoal.** Chip `Livro pessoal` com fundo `noite-elevada`, borda `linha-noite` e texto `grafite-claro`.
- **Web, padrão.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, `Feed` ativo com fundo `musgo-fundo-escuro`. Hover do item em `noite-elevada`.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Item de feed, com avatar, nome, tempo, verbo, card do livro e ações | documento-de-design §4.9 |
| Padrão de tela do feed, com header, lista e vazio | documento-de-design §5.3 |
| Card de livro, variante Feed | documento-de-design §4.5 |
| Estrela de avaliação, com meia estrela | documento-de-design §4.3 |
| Capa de livro em retângulo de canto vivo e placeholder | documento-de-design §4.5 e §7.6 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` | documento-de-design §3.1.3 |
| Escala tipográfica e as quatro famílias, com Newsreader no corpo da resenha | documento-de-design §3.2 e §3.2.2 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |
| Carregamento incremental com skeleton no fim da lista | periodo-1/F-PERFIL/seguidores-e-seguidos.md |

**Componentes e divergências que ainda não existem na fonte.** Viram pendência de incorporação pelo controle de mudança do plano §3:

1. **O `UserCircle` no header do feed.** O `documento-de-design.md` §5.3 o prevê, e o shell de P0-NAV tornou `Perfil` uma das quatro áreas de navegação. Este prompt segue o shell e **não desenha o ícone**. O §5.3 precisa ser corrigido, ou a decisão precisa ser revista pelo grupo.
2. **O chip `Livro pessoal`** no card do livro. O §4.5 não distingue livro pessoal de livro oficial, e RN-15 torna essa distinção necessária no feed.
3. **O resumo de curtidas ao lado do botão**, no formato `4 curtidas`. O §4.9 prevê o contador dentro do botão; o número com unidade ao lado existe porque a banlist proíbe número sem unidade.
4. **Os cinco verbos de atividade.** O §4.9 só cita `começou a ler`. Os outros quatro nascem aqui e precisam ser os mesmos em todo o produto.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Feed` |
| Verbo, início de leitura | `começou a ler` |
| Verbo, retomada | `retomou a leitura` |
| Verbo, conclusão | `terminou de ler` |
| Verbo, abandono | `abandonou a leitura` |
| Verbo, resenha | `publicou uma resenha` |
| Tempos | `2 h`, `5 h`, `ontem`, `2 dias`, `3 dias`, `6 h` |
| Ação da resenha | `Ler resenha` |
| Chip de livro pessoal | `Livro pessoal` |
| Resumo de curtidas | `4 curtidas` |
| Vazio sem seguir, título | `Comece seguindo leitores` |
| Vazio sem seguir, texto | `As atividades de quem você segue aparecem aqui, da mais recente para a mais antiga.` |
| Vazio sem seguir, botão | `Buscar por nome de usuário` |
| Vazio seguindo, título | `Nada por aqui ainda` |
| Vazio seguindo, texto | `Quando quem você segue começar, terminar ou resenhar um livro, aparece aqui.` |
| Vazio seguindo, botão | `Ver minha estante` |
| Erro, texto | `Não foi possível carregar seu feed. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |

**O verbo nunca inclui o título do livro.** `começou a ler Torto Arado` quebraria a estrutura fixa do §4.9, em que o livro mora no card.

Zero em-dash em toda a copy. Zero emoji, inclusive nos verbos de atividade. Todo número aparece com unidade, e os contadores dentro dos botões têm o ícone como unidade, com o resumo por extenso ao lado.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no mobile no avatar, no nome, no card do livro e em cada botão de ação, mesmo que o botão tenha 32px de altura visual.
- Cada item é anunciado como uma unidade coerente: `Dandara Lopes, há 2 horas, começou a ler Torto Arado, de Itamar Vieira Junior`.
- O botão de curtir tem rótulo acessível que diz o estado e a ação, no formato `Curtir, 4 curtidas` e `Descurtir, 5 curtidas`, e o estado curtido não depende só de cor: o ícone muda de `regular` para `fill`.
- O botão de comentar é anunciado com a contagem, no formato `2 comentários`, e sem comentários é anunciado como `Comentar`.
- O tipo de atividade é texto, nunca só um ícone ou uma cor.
- O chip `Livro pessoal` é texto, e não uma marca visual que só quem enxerga cor entende.
- O trecho truncado de resenha é anunciado como truncado, e `Ler resenha` abre o texto inteiro.
- O carregamento incremental é anunciado como região ocupada, sem roubar o foco de quem está lendo.
- Contraste WCAG AA no corpo nos dois temas. O verbo e o autor usam `grafite`; só o tempo usa `grafite-suave`.
- Foco de teclado visível na web em nome, card, botões e ações, na ordem visual, item por item.
- `prefers-reduced-motion` respeitado: o fade do skeleton, a troca de estado do curtir e o hover viram estáticos.
- Nenhuma ação desta tela é destrutiva. Descurtir desfaz curtir e não pede confirmação.

---

## 10. O que não fazer nesta tela

**Escopo do Período 1**

- **Não desenhe curtir resenha.** RF-AVA-10 e o evento `resenha.curtida` são de F-AVA-2, no Período 2. Aqui se curte a **atividade**.
- **Não desenhe editar nem excluir comentário.** RF-SOC-13 é Desejável, de F-SOCIAL-2.
- **Não desenhe menção como link navegável.** RF-SOC-15 é Desejável, de F-SOCIAL-2. No Período 1 a menção é texto pré-preenchido ao responder, e isso acontece na tela de comentários.
- **Não desenhe denunciar.** RF-MOD-01 é Desejável e do Período 2.
- **Não desenhe recomendação de livro entre leitores.** F-REC-P2P é do Período 2.
- **Não desenhe compartilhar atividade** para fora do aplicativo. Não há requisito.
- Não desenhe desafios, sequência diária, estatísticas nem medalhas no feed.

**Específico do feed**

- **Não inverta a estrutura do item.** O verbo fica na própria linha, e o título do livro mora no card abaixo.
- **Não trate abandono como alerta.** Sem `ambar`, sem `rubi`, sem capa esmaecida, sem ícone de aviso. É um estado da leitura como qualquer outro.
- **Não desenhe filtro, aba, ordenação nem "ver primeiro".** RN-09 define feed cronológico decrescente, e só.
- **Não desenhe algoritmo:** nada de "em alta", "sugerido para você" ou reordenação por relevância.
- **Não desenhe sugestão de perfis** em nenhum estado, inclusive nos vazios.
- **Não desenhe publicação manual.** O leitor não escreve no feed: as atividades são publicadas pelo sistema a partir do que ele registra (RF-SOC-10).
- **Não desenhe atualização automática que empurra o conteúdo lido** para baixo enquanto o leitor rola.
- **Não desenhe botão `Carregar mais`.** O carregamento é incremental.
- **Não desenhe menu de três pontos no item.**
- **Não desenhe a lista de quem curtiu.** Não há requisito, e expor o grafo de quem curtiu abre uma porta que RNF-SEC-19 fecha em outros lugares.
- **Não anime o curtir** com coração que cresce, partículas ou brilho.
- **Não desenhe estado de atividade cujo livro foi excluído.** Por RN-09 ela deixa de ser exibida, e isso acontece no servidor: não existe item fantasma com aviso de livro removido.

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

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
