# F-EST-2 · Histórico de leituras

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-EST-2.md
**Requisitos:** RF-EST-10 (histórico de leituras concluídas por ano, pesquisa por título ou autor em todo o histórico, cada ocorrência finalizada de leitura ou releitura listada separadamente, e seleção de uma ocorrência para consultar, em modo somente leitura, suas atualizações de progresso)
**Não funcionais:** RNF-DES-02 (histórico paginado com teto do servidor), RNF-SEC-02 (o histórico é do próprio leitor, validado no servidor), RNF-USA-02, RNF-USA-03, RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-04 (só entra leitura ou releitura **finalizada**; releitura incompleta e leitura abandonada não entram; `nº de vezes lido` conta apenas finalizadas), RN-14.4 (ordem de resolução da capa: cópia própria, URL externa, placeholder)
**Versão web:** sim. RF-EST-10 tem marcação na coluna Web de `REQUISITOS.md` §5.3.
**De onde se chega:** da Estante. No mobile, por um ícone no header da estante, ao lado da lupa; na web, por um botão textual no header de conteúdo de `Minha estante`. Esses dois pontos de entrada são desenhados na edição da estante, em outro prompt. Esta tela fica com a área **Estante** ativa no shell.

---

## 1. Contexto

O **registro** olhando para trás: tudo o que o leitor já terminou, ano a ano. É a resposta para perguntas que a estante não responde bem, porque a estante mostra o estado atual de cada livro e não a história dele: "o que eu li em 2025?", "quando foi que eu terminei Dom Casmurro?", "quantas vezes eu já reli esse livro?".

Quem usa é o próprio leitor, e só ele: o histórico é privado, não aparece no perfil de ninguém. Chega-se aqui pela Estante e, daqui, o único destino é a tela `Atualizações de progresso` de uma ocorrência concluída, aberta em **modo histórico somente leitura** (sem registrar, sem excluir). Aquela tela é desenhada em outro prompt; aqui só existe a navegação até ela.

Três coisas que a tela precisa resolver:

- **Uma linha por conclusão, não por livro.** O mesmo livro aparece tantas vezes quantas foi finalizado: a primeira leitura e cada releitura concluída são ocorrências separadas, inclusive duas no mesmo ano. Quem releu Dom Casmurro em fevereiro e de novo em novembro de 2025 vê duas linhas em 2025. Nada de colapsar numa linha com "3x".
- **Pesquisar atravessa todos os anos.** O campo `Pesquisar no histórico` busca por título ou autor em todo o histórico, não só no ano visível. O filtro de ano é opcional e, quando ligado, restringe o resultado da pesquisa. Na pesquisa, o resultado é agrupado **por livro**, e cada livro lista todas as suas conclusões.
- **Só o que terminou.** Leitura abandonada e releitura interrompida não aparecem aqui, nem com marca de "incompleta". O histórico é o que foi concluído, e a estante continua sendo o lugar do resto.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Histórico de leituras · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Ocorrências concluídas do leitor**, uma linha por conclusão, agrupadas pelo ano da data de fim, da mais recente para a mais antiga. Livros reais, editoras coerentes, datas plausíveis. A duração é derivada das datas de início e de fim.

| Ano | Título | Autor | Páginas | Tipo | Início | Conclusão | Duração |
|---|---|---|---|---|---|---|---|
| 2026 | Vidas Secas | Graciliano Ramos | 176 páginas | Leitura | 18 de junho de 2026 | 04 de julho de 2026 | 16 dias |
| 2026 | Quarto de Despejo | Carolina Maria de Jesus | 200 páginas | Leitura | 02 de maio de 2026 | 19 de maio de 2026 | 17 dias |
| 2026 | Marrom e Amarelo | Paulo Scott | 168 páginas | Leitura | 14 de fevereiro de 2026 | 02 de março de 2026 | 16 dias |
| 2026 | Tudo é Rio | Carla Madeira | 210 páginas | Leitura | 08 de janeiro de 2026 | 21 de janeiro de 2026 | 13 dias |
| 2025 | Dom Casmurro | Machado de Assis | 256 páginas | Releitura | 02 de novembro de 2025 | 16 de novembro de 2025 | 14 dias |
| 2025 | Olhos d'Água | Conceição Evaristo | 116 páginas | Leitura | 28 de agosto de 2025 | 12 de setembro de 2025 | 15 dias |
| 2025 | Memórias Póstumas de Brás Cubas | Machado de Assis | 304 páginas | Leitura | 10 de junho de 2025 | 30 de junho de 2025 | 20 dias |
| 2025 | Capitães da Areia | Jorge Amado | 280 páginas | Leitura | 15 de março de 2025 | 03 de abril de 2025 | 19 dias |
| 2025 | Dom Casmurro | Machado de Assis | 256 páginas | Releitura | 20 de janeiro de 2025 | 09 de fevereiro de 2025 | 20 dias |
| 2024 | Becos da Memória | Conceição Evaristo | 200 páginas | Leitura | 25 de outubro de 2024 | 14 de novembro de 2024 | 20 dias |
| 2024 | A Hora da Estrela | Clarice Lispector | 96 páginas | Leitura | 01 de agosto de 2024 | 08 de agosto de 2024 | 7 dias |
| 2024 | Dom Casmurro | Machado de Assis | 256 páginas | Leitura | 01 de março de 2024 | 22 de março de 2024 | 21 dias |

**Totais:** `12 leituras concluídas` no histórico inteiro; `4 leituras concluídas` em 2026, `5 leituras concluídas` em 2025, `3 leituras concluídas` em 2024.

**O caso que a tela precisa provar:** Dom Casmurro tem **três conclusões**, duas delas em 2025 (fevereiro e novembro, ambas releituras) e uma em 2024 (a primeira leitura). Elas aparecem como três linhas separadas, cada uma no seu ano.

**Capa em placeholder:** `Marrom e Amarelo` cai no terceiro nível de RN-14.4 e usa `capa-placeholder`, com o título centralizado em `title-sm` `tinta` e `Paulo Scott` abaixo em `caption` `grafite`.

**Pesquisa com resultado:** `machado`, que casa pelo autor com dois livros, `Dom Casmurro` (três conclusões) e `Memórias Póstumas de Brás Cubas` (uma conclusão). Contagem: `2 livros no seu histórico, 4 leituras concluídas`.

**Pesquisa combinada com o ano 2025:** `machado` com o filtro `2025` ativo. `Dom Casmurro` com duas conclusões (16 de novembro de 2025 e 09 de fevereiro de 2025) e `Memórias Póstumas de Brás Cubas` com uma. Contagem: `2 livros em 2025, 3 leituras concluídas`.

**Pesquisa sem resultado:** `saramago`, que não casa com nada.

**O que não aparece, de propósito:** a releitura de `A Hora da Estrela` que está em andamento na estante hoje, e qualquer leitura abandonada. Só leitura ou releitura finalizada entra (RN-04).

**Nenhuma nota aparece.** Nem a do leitor, nem a agregada. O histórico é de conclusões, e a nota mora na página do livro.

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
ícone peso `regular`, cor `grafite`; rótulo em `caption` `grafite`. Ativo:
ícone peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`.
Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone
que salta. **Nesta tela o item ativo é `Estante`.**

**Mobile, header.** Altura de 72px mais a área segura, padding lateral
`space-5`, fundo `papel`, sem sombra. O sino `Bell` (Phosphor, `regular`,
24px, `tinta`) fica à direita e é fixo em toda tela autenticada. Badge de não
lidas: círculo de 18px, fundo `musgo`, encostado no canto superior direito do
ícone, número centralizado em 11px peso 600 cor `papel`; acima de nove mostra
`9+`; sem não lidas, o badge simplesmente não existe.

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida
por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px
`linha`. Bloco do topo de 72px, padding lateral `space-5`, com o lockup
horizontal da marca à esquerda (símbolo da folha sobre livro aberto seguido
de `Lê Ai`, os dois em `musgo`, `space-3` de gap, 24px de altura) e
`SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo,
`space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro
de padding lateral `space-3`: altura de 44px, `radius` 12, padding lateral
`space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em
`body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo
transparente. Hover: fundo `linha`, transição `dur-fast`. Ativo: fundo
`musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`. **Nesta tela o item
ativo é `Estante`.**

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

Header de tela de detalhe, empilhada sobre a Estante.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando à Estante.
- Título `Histórico` em `display` `tinta`, à esquerda, logo depois da seta, alinhado à base. O nome completo, `Histórico de leituras`, não cabe em `display` ao lado da seta e do sino em 390px; ele aparece por extenso no header da web.
- `Bell` à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Bloco de pesquisa

Logo abaixo do header, padding lateral `space-5`, `space-4` de respiro acima.

- Label `Pesquisar no histórico` em `label` `grafite`, acima do campo, com `space-2` de gap.
- Campo de 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, com `MagnifyingGlass` (Phosphor, `regular`, 20px, `grafite-suave`) dentro à esquerda e `space-3` de gap até o texto. Texto digitado em `body` `tinta`. Com texto, `X` (Phosphor, `regular`, 20px, `grafite`) à direita, com alvo de 48px, limpa a pesquisa e devolve a lista por ano.
- Placeholder em `grafite-suave`: `Título ou autor`. O label é quem nomeia o campo; o placeholder só dá o exemplo do que se digita.
- Helper em `caption` `grafite`, visível o tempo todo, com `space-2` de gap: `Busca em todos os anos.`
- A pesquisa roda quando o leitor confirma na tecla de busca do teclado. Ela não sugere nem autocompleta.
- Foco: borda de 1.5px `musgo`, transição `dur-fast`.

### Faixa de anos

Abaixo do bloco de pesquisa, `space-4` de respiro, faixa horizontal rolável de pills, padding lateral `space-5`, `space-2` de gap. Mesmo desenho dos pills de filtro da Estante:

- Pill inativo: `radius-full`, padding `space-2 space-4`, borda de 1px `linha`, fundo transparente, texto em `caption` `grafite`.
- Pill ativo: fundo `musgo-fundo`, sem borda, texto em `caption` peso 600 `musgo`.
- Primeiro pill `Todos os anos`, depois um pill por ano que tem conclusão, do mais recente para o mais antigo: `2026`, `2025`, `2024`. Os anos em `num-inline` no tamanho do `caption`.
- Seleção única. Sem contagem dentro do pill: a contagem do ano está no cabeçalho do grupo. A faixa rola sem seta, sem gradiente de fade e sem indicador de rolagem.

### Linha de contagem

Abaixo da faixa, padding lateral `space-5`, `space-3` de respiro: em `caption` `grafite`, `12 leituras concluídas`. Na pesquisa, a contagem nomeia o escopo: `2 livros no seu histórico, 4 leituras concluídas`.

### Lista por ano (estado padrão, sem pesquisa)

- **Cabeçalho de grupo** por ano: `2026` em `title-lg` `tinta` à esquerda e, na mesma linha, alinhado à base e à direita, `4 leituras concluídas` em `caption` `grafite`. Padding lateral `space-5`, `space-6` de respiro acima e `space-3` abaixo, fundo `papel`. O cabeçalho do ano **fica preso ao topo** da área rolável, logo abaixo do header, enquanto as linhas daquele ano passam por baixo; quando o próximo ano chega, ele empurra o anterior. Sem animação além do próprio rolar.
- **Linha de ocorrência**, uma por conclusão, padding lateral `space-5`, `space-4` de padding vertical, divisor de 1px `linha` entre elas:
  - À esquerda, capa de 48 por 72px, retângulo de canto vivo, sem sombra.
  - `space-4` de gap, e a coluna de texto: título em `title-sm` `tinta` com no máximo duas linhas; autor em `caption` `grafite` com uma linha; e uma terceira linha em `caption` `grafite` com a conclusão e a duração: `Concluído em 04 de julho de 2026 · 16 dias`.
  - Quando a ocorrência é **releitura**, a terceira linha é precedida de `ArrowsClockwise` (Phosphor, `regular`, 16px, `broto`) e da palavra `Releitura` em `caption` peso 600 `grafite`, com `space-1` de gap: `Releitura · Concluído em 16 de novembro de 2025 · 14 dias`. A primeira leitura não recebe marca: é o caso comum.
  - À direita, `CaretRight` (Phosphor, `regular`, 20px, `grafite`), centralizado na altura da linha.
  - A linha inteira é a área acionável e abre `Atualizações de progresso` daquela ocorrência, em modo somente leitura.
- Ordem: grupos do ano mais recente para o mais antigo; dentro do grupo, da conclusão mais recente para a mais antiga.
- Paginação por rolagem, com teto de itens imposto pelo servidor. Nada de botão `Carregar mais`, nada de numeração de página.

### Resultado de pesquisa (agrupado por livro)

Quando há pesquisa, os grupos por ano dão lugar a **grupos por livro**, porque a pergunta passou a ser "quando eu li este livro":

- **Cabeçalho do livro:** capa de 60 por 90px em canto vivo à esquerda, `space-4` de gap, título em `title-sm` `tinta`, autor em `caption` `grafite` e, abaixo, `3 leituras concluídas` em `caption` `grafite`. Padding lateral `space-5`, `space-6` de respiro acima.
- **Abaixo do cabeçalho, as conclusões daquele livro**, uma linha cada, recuadas para alinhar com o texto do cabeçalho (o recuo é a largura da capa mais o gap), sem repetir a capa:
  - À esquerda, o tipo em `caption` peso 600 `grafite`, com `ArrowsClockwise` 16px `broto` antes quando é releitura: `Releitura` ou `Leitura`.
  - Abaixo, em `caption` `grafite`: `Concluído em 16 de novembro de 2025 · 14 dias`.
  - À direita, `CaretRight` 20px `grafite`.
  - Divisor de 1px `linha` entre as conclusões, altura mínima de 48px por linha.
- Da conclusão mais recente para a mais antiga, dentro de cada livro. Os livros seguem a ordem da conclusão mais recente de cada um.

### 4.1 Padrão, todos os anos

Header, bloco de pesquisa vazio, faixa com `Todos os anos` ativo, contagem `12 leituras concluídas`. Grupo `2026` inteiro com as quatro linhas, com `Marrom e Amarelo` em placeholder, e o cabeçalho de `2025` entrando no fim da viewport com a primeira linha, `Dom Casmurro` com a marca de releitura. Barra inferior com **Estante** ativo.

### 4.2 Filtro de ano ativo

Faixa com `2024` ativo, bloco de pesquisa vazio. Contagem `3 leituras concluídas em 2024`. Um único grupo, `2024`, com as três linhas: `Becos da Memória`, `A Hora da Estrela` e `Dom Casmurro`, esta sem marca de releitura, porque em 2024 foi a primeira leitura. Os outros anos continuam na faixa, inativos.

### 4.3 Pesquisa com resultado

Campo preenchido com `machado`, com o `X` visível. Faixa com `Todos os anos` ativo. Contagem `2 livros no seu histórico, 4 leituras concluídas`.

- Grupo `Dom Casmurro`, com `3 leituras concluídas`: `Releitura · Concluído em 16 de novembro de 2025 · 14 dias`, `Releitura · Concluído em 09 de fevereiro de 2025 · 20 dias`, `Leitura · Concluído em 22 de março de 2024 · 21 dias`.
- Grupo `Memórias Póstumas de Brás Cubas`, com `1 leitura concluída`: `Leitura · Concluído em 30 de junho de 2025 · 20 dias`.

Este é o artboard que prova a regra "uma linha por conclusão": três linhas para o mesmo livro, duas no mesmo ano.

### 4.4 Pesquisa combinada com o ano

Campo com `machado` e faixa com `2025` ativo. Contagem `2 livros em 2025, 3 leituras concluídas`. `Dom Casmurro` com as duas releituras de 2025, e `Memórias Póstumas de Brás Cubas` com a leitura de junho. A conclusão de 2024 de `Dom Casmurro` some, porque o filtro de ano restringe a pesquisa.

### 4.5 Pesquisa sem resultado

Campo com `saramago`, faixa com `Todos os anos` ativo, contagem `0 livros no seu histórico`. No lugar da lista, bloco centralizado com `space-6` entre os elementos:

- `MagnifyingGlass` (Phosphor, `regular`, 32px, `grafite-suave`).
- Título em `title` `tinta`: `Nenhuma leitura concluída com esse nome`.
- Texto em `body` `grafite`, centralizado, largura máxima de 280px: `A pesquisa olha o título e o autor de tudo o que você já concluiu, em todos os anos.`
- Botão textual `musgo`: `Limpar pesquisa`.

**Variante com ano ativo**, descrita aqui e sem artboard próprio: quando a pesquisa não encontra nada dentro do ano filtrado, o texto passa a `Nada com esse nome em 2024.` e o botão textual passa a `Pesquisar em todos os anos`, que volta a faixa para `Todos os anos` mantendo o texto digitado.

### 4.6 Vazio, nenhuma leitura concluída

O leitor que ainda não terminou nenhum livro.

- Header real. **Sem bloco de pesquisa e sem faixa de anos**: não há o que pesquisar nem ano para escolher.
- Bloco centralizado no espaço da lista, com `space-6` entre os elementos:
  - `ClockCounterClockwise` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhuma leitura concluída ainda`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Quando você finalizar um livro, ele entra aqui com a data de conclusão. Releituras finalizadas também contam.`
  - Botão primário pill, altura 48px, `musgo`, texto `papel`: `Ver minha estante`, que volta à Estante.
- Nunca "não há dados", nunca ilustração fotográfica, nunca emoji.

### 4.7 Carregando

- Header, bloco de pesquisa e faixa de anos reais. A contagem ainda não aparece.
- Lista em **skeleton estático**: uma barra de 24px de altura e 20% de largura no lugar do cabeçalho do ano e, abaixo, cinco linhas, cada uma com um retângulo `capa-placeholder` de 48 por 72px e duas barras à direita em `capa-placeholder` com `radius-sm`, alturas de 17px e 13px, larguras de 70% e 45%.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- Este é também o estado do **cold start** do serviço (RNF-ERR-09) e o estado enquanto uma pesquisa confirmada está sendo respondida: demora não é erro.

### 4.8 Erro de carregamento

- Header, bloco de pesquisa e faixa de anos reais.
- Banner inline no lugar da lista, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda.
- Texto em `body` `tinta`: `Não foi possível carregar seu histórico. Verifique sua conexão e tente de novo.`
- Botão textual `musgo`: `Tentar de novo`.

### 4.9 Carregando mais

A rolagem chegou ao fim do que foi carregado, no meio do grupo `2025`.

- As linhas já carregadas continuam visíveis e utilizáveis, com o cabeçalho `2025` preso ao topo.
- Abaixo da última linha, **duas linhas de skeleton** no mesmo desenho de 4.7, com um único fade.
- **Nada muda no topo.** O carregamento incremental não recarrega a lista, não move o scroll e não substitui o conteúdo por skeleton inteiro.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Estante** ativo.
- Área de conteúdo com padding lateral `space-8`, `max-width` de 1120px.
- **Header de conteúdo de 72px** com `Histórico de leituras` em `display` `tinta` à esquerda. Nada à direita e sem sino. A volta para a estante é o item `Estante` da sidebar, que continua ativo.
- **Duas colunas**, com `space-8` de gap:
  - **Coluna da esquerda, 280px, fixa ao rolar:** o bloco de pesquisa, com o label `Pesquisar no histórico`, o campo de 44px e o helper `Busca em todos os anos.`; `space-6` abaixo, o label `Ano` em `label` `grafite` e a **lista vertical de anos**, que substitui a faixa de pills do mobile: um item por linha, altura de 44px, `radius` 12, padding lateral `space-4`, com o ano em `num-inline` à esquerda e a contagem em `caption` à direita (`2026` · `4 leituras`). O primeiro item é `Todos os anos` com `12 leituras`. Inativo: texto `grafite`, fundo transparente, hover com fundo `linha`. Ativo: fundo `musgo-fundo`, texto `musgo` peso 600. Mesmo desenho dos itens da sidebar, para que a seleção seja reconhecida sem aprendizado.
  - **Coluna da direita:** a linha de contagem em `caption` `grafite` e a lista em **tabela**, agrupada por ano. Cada grupo abre com o cabeçalho do ano (`2026` em `title-lg` `tinta` e `4 leituras concluídas` em `caption` `grafite` à direita), preso ao topo da coluna ao rolar, como no mobile.
- **Tabela de ocorrências**, cabeçalho em `label` `grafite` repetido só no topo da coluna, linhas de 64px com divisor de 1px `linha`:
  - `Livro`: capa de 32 por 48px em canto vivo, `space-3` de gap, título em `body-strong` `tinta` e autor em `caption` `grafite` empilhados.
  - `Tipo`: `Leitura` em `caption` `grafite`, ou `ArrowsClockwise` 16px `broto` seguido de `Releitura` em `caption` peso 600 `grafite`.
  - `Início` e `Conclusão`: datas por extenso em `caption` `grafite`, como `18 de junho de 2026`.
  - `Duração`: em `num-inline` `tinta`, `16 dias`.
  - Coluna estreita à direita com `CaretRight` 20px `grafite`.
  - A linha inteira é clicável e abre `Atualizações de progresso` da ocorrência, em modo somente leitura.
- **Na pesquisa**, a tabela agrupa **por livro**: cada grupo abre com um cabeçalho de livro (capa de 60 por 90px, título em `title-sm` `tinta`, autor em `caption` `grafite` e `3 leituras concluídas` em `caption` `grafite`), seguido das linhas de conclusão daquele livro, sem repetir capa nem título, só com `Tipo`, `Início`, `Conclusão`, `Duração` e o `CaretRight`.
- `hover` na linha: fundo `papel-elevado` e `CaretRight` em `musgo`, transição `dur-fast`. O cursor vira ponteiro.
- Foco de teclado visível em campo, item de ano e linha, com contorno de 2px `musgo` e offset de 2px.
- A tabela rola dentro do próprio container quando a largura aperta, e **a página nunca rola na horizontal**.
- **Abaixo de 768px:** as duas colunas viram uma; a lista vertical de anos volta a ser a faixa horizontal de pills do mobile, abaixo do campo de pesquisa; a tabela vira as linhas de ocorrência do mobile; o título do header passa a `Histórico`, com `ArrowLeft` à esquerda; e a sidebar dá lugar à barra inferior.

### 5.1 Padrão, todos os anos

Coluna da esquerda com o campo vazio e `Todos os anos` ativo na lista de anos. Coluna da direita com `12 leituras concluídas`, o grupo `2026` com as quatro linhas e o grupo `2025` com as cinco, as duas releituras de `Dom Casmurro` visíveis como linhas separadas. `Marrom e Amarelo` em placeholder.

### 5.2 Pesquisa com resultado

Campo com `machado`, `Todos os anos` ativo. Contagem `2 livros no seu histórico, 4 leituras concluídas`. Grupo `Dom Casmurro` com três linhas de conclusão (duas releituras de 2025 e a leitura de 2024) e grupo `Memórias Póstumas de Brás Cubas` com uma.

### 5.3 Pesquisa combinada com o ano, com hover

Campo com `machado` e `2025` ativo na lista de anos. Contagem `2 livros em 2025, 3 leituras concluídas`. O cursor sobre a linha da releitura de `09 de fevereiro de 2025`: fundo `papel-elevado` e `CaretRight` em `musgo`. Serve para conferir que a linha se anuncia como clicável antes do clique.

### 5.4 Pesquisa sem resultado

Campo com `saramago`. A coluna da direita mostra o mesmo bloco centralizado do mobile, com `Nenhuma leitura concluída com esse nome`, o texto e o botão textual `Limpar pesquisa`. A coluna da esquerda continua inteira, com a lista de anos visível.

### 5.5 Carregando

Coluna da esquerda real. Coluna da direita em skeleton: barra no lugar do cabeçalho do ano e seis linhas de tabela, cada uma com um retângulo `capa-placeholder` de 32 por 48px e barras curtas nas colunas. Um único fade de entrada, sem shimmer.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título do header, `ArrowLeft` e sino em `papel-suave`. Label em `grafite-claro`; campo em `noite-elevada`, **mais claro** que o fundo, com borda `linha-noite`, placeholder em `grafite-fundo-escuro` e helper em `grafite-claro`. Pill inativo com borda `linha-noite` e texto `grafite-claro`; pill ativo com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Cabeçalho do ano em `papel-suave`, contagem em `grafite-claro`, fundo `noite` quando preso ao topo. Título da linha em `papel-suave`, autor e terceira linha em `grafite-claro`, `ArrowsClockwise` em `broto-vivo`, `CaretRight` em `grafite-claro`. Placeholder de capa em `capa-placeholder-noite`. Divisores em `linha-noite`. Barra inferior em `noite-elevada`, **mais clara** que o fundo.
- **Mobile, pesquisa com resultado.** Mesmo tratamento, com o cabeçalho de livro em `papel-suave` e as linhas de conclusão em `grafite-claro`.
- **Web, padrão.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, lockup em `musgo-claro`, item **Estante** ativo com fundo `musgo-fundo-escuro`. Item de ano ativo com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Cabeçalho da tabela em `grafite-claro`, linhas separadas por `linha-noite`, hover com fundo `noite-elevada` e `CaretRight` em `musgo-claro`.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Pill de filtro com seleção única (reusado na faixa de anos) | documento-de-design §5.1 |
| Placeholder de capa em retângulo de canto vivo, com título e autor | documento-de-design §4.5 e §7.6 |
| Marca de releitura `ArrowsClockwise` em `broto` | documento-de-design §4.5 e §4.6 |
| Campo de formulário com label acima, helper e foco | documento-de-design §4.2 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Lockup da marca na sidebar | documento-de-design §3.7 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md e documento-de-design §5 |
| Header de tela de detalhe com `ArrowLeft`, título e sino | nasceu nos prompts do Período 1 (F-PRG, F-PERFIL, F-NOT); incorporação pendente |
| Carregamento incremental com duas linhas de skeleton no fim da lista | nasceu em periodo-1/F-PERFIL/seguidores-e-seguidos.md; incorporação pendente |

**Componentes que nascem aqui.** Nenhum deles está no `documento-de-design.md`, e todos precisam ser incorporados pelo controle de mudança (plano §3) antes de valerem como padrão:

1. **Linha de ocorrência de conclusão.** Capa de 48 por 72px, título, autor e uma terceira linha com data de conclusão e duração, marca de releitura opcional e `CaretRight`. Não é nenhuma das quatro variantes do card de livro do §4.5: é item de lista, não card.
2. **Cabeçalho de grupo por ano, preso ao topo.** Ano em `title-lg` com a contagem à direita, fixo enquanto o grupo rola.
3. **Agrupamento por livro no resultado de pesquisa.** Cabeçalho de livro seguido das conclusões recuadas, sem repetir capa.
4. **Lista vertical de filtro na coluna lateral da web**, com o mesmo desenho do item da sidebar.
5. **Duração da leitura em dias**, derivada das datas de início e de fim, exibida como `16 dias`.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header, mobile | `Histórico` |
| Título do header, web | `Histórico de leituras` |
| Label do campo | `Pesquisar no histórico` |
| Placeholder do campo | `Título ou autor` |
| Helper do campo | `Busca em todos os anos.` |
| Label da lista de anos, web | `Ano` |
| Pills e itens de ano | `Todos os anos`, `2026`, `2025`, `2024` |
| Contagem por ano na lista da web | `12 leituras`, `4 leituras`, `5 leituras`, `3 leituras` |
| Contagem, padrão | `12 leituras concluídas` |
| Contagem, filtro de ano | `3 leituras concluídas em 2024` |
| Cabeçalho de grupo por ano | `2026` com `4 leituras concluídas`; `2025` com `5 leituras concluídas`; `2024` com `3 leituras concluídas` |
| Terceira linha da ocorrência | `Concluído em 04 de julho de 2026 · 16 dias` |
| Marca de releitura | `Releitura` |
| Tipo, primeira leitura | `Leitura` |
| Contagem, pesquisa | `2 livros no seu histórico, 4 leituras concluídas` |
| Contagem, pesquisa com ano | `2 livros em 2025, 3 leituras concluídas` |
| Contagem, pesquisa sem resultado | `0 livros no seu histórico` |
| Cabeçalho de livro na pesquisa | `3 leituras concluídas`, `1 leitura concluída` |
| Cabeçalho da tabela, web | `Livro`, `Tipo`, `Início`, `Conclusão`, `Duração` |
| Pesquisa sem resultado, título | `Nenhuma leitura concluída com esse nome` |
| Pesquisa sem resultado, texto | `A pesquisa olha o título e o autor de tudo o que você já concluiu, em todos os anos.` |
| Pesquisa sem resultado, botão | `Limpar pesquisa` |
| Pesquisa sem resultado com ano, texto | `Nada com esse nome em 2024.` |
| Pesquisa sem resultado com ano, botão | `Pesquisar em todos os anos` |
| Vazio, título | `Nenhuma leitura concluída ainda` |
| Vazio, texto | `Quando você finalizar um livro, ele entra aqui com a data de conclusão. Releituras finalizadas também contam.` |
| Vazio, botão | `Ver minha estante` |
| Erro, texto | `Não foi possível carregar seu histórico. Verifique sua conexão e tente de novo.` |
| Erro, botão | `Tentar de novo` |

Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade, com a exceção dos anos, que são rótulo e não medida.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no `ArrowLeft`, no sino, no `X` do campo, em cada pill de ano e em cada linha de ocorrência. As linhas de conclusão dentro de um grupo de livro têm altura mínima de 48px.
- A linha inteira é a área acionável, e o `CaretRight` é só o sinal visual. Leitor de tela anuncia a linha como um único botão com o conteúdo completo: `Dom Casmurro, Machado de Assis, releitura, concluído em 16 de novembro de 2025, 14 dias. Abrir atualizações de progresso.`
- A releitura não é comunicada só pela cor `broto`: ela traz o ícone `ArrowsClockwise` e a palavra `Releitura` em `grafite`, com contraste AA. O `broto` fica só no ícone, que é tamanho de ícone e não texto.
- A contagem de resultado é anunciada por leitor de tela depois de cada pesquisa e de cada troca de ano, com o escopo junto (`2 livros no seu histórico, 4 leituras concluídas`), para que a filtragem não seja silenciosa.
- O cabeçalho do ano preso ao topo é marcado como título de seção, para que a navegação por títulos do leitor de tela pule de ano em ano.
- Contraste WCAG AA no corpo nos dois temas. Autor e data usam `grafite`, não `grafite-suave`, porque são informação essencial: a data é a razão de existir da tela.
- Na web, foco de teclado visível em campo, item de ano e linha, com contorno de 2px `musgo` e offset de 2px. A ordem de tabulação vai da sidebar para o campo, depois para a lista de anos e daí para a tabela. `Enter` na linha abre a ocorrência.
- `prefers-reduced-motion` respeitado: o fade do skeleton e o hover da linha viram estáticos.
- O skeleton preserva a altura da lista para que o conteúdo não salte quando os dados chegam. O carregamento incremental é anunciado como região ocupada, sem roubar o foco de quem está lendo.
- O texto do sistema pode crescer: título e autor quebram linha em vez de cortar, e a terceira linha da ocorrência quebra antes do ponto médio se não couber.

---

## 10. O que não fazer nesta tela

**Escopo desta tela**

- **Não colapse as conclusões de um livro numa linha só.** Nada de `Dom Casmurro · 3x`, nada de "lido 3 vezes" no lugar das linhas. Cada conclusão é uma linha, inclusive duas no mesmo ano.
- **Não mostre leitura abandonada nem releitura interrompida**, nem com marca de "incompleta" ou "não concluída". Só leitura ou releitura finalizada entra.
- **Não restrinja a pesquisa ao ano visível.** A pesquisa atravessa todos os anos; só o filtro de ano, escolhido pelo leitor, restringe.
- Não desenhe a tela de atualizações de progresso aqui. Selecionar uma ocorrência leva a ela, e ela é outro prompt.
- Não ofereça excluir, editar ou "desfazer conclusão" em nenhuma linha. O histórico é consulta.
- Não desenhe favoritos, nem coração, nem filtro de favoritos. É outra parte desta feature, em outra tela.
- Não desenhe nota, estrelas, nota geral nem nota dos leitores. A nota mora na página do livro.
- Não desenhe estatísticas, totais de páginas no ano, média de dias por livro, meta anual nem gráfico de livros por mês. Estatísticas são outra feature.
- Não desenhe sequência diária, streak nem chama. Gamificação é outra feature.
- Não desenhe compartilhar, exportar nem tornar o histórico público. Ele é do próprio leitor.
- Não desenhe sugestão, autocompletar nem histórico de pesquisas.
- Não use o placeholder do acervo (`Título, autor, editora ou ISBN`) nem o da estante (`Buscar na minha estante`). O campo desta tela tem label próprio, `Pesquisar no histórico`.
- Não desenhe o histórico como grid de capas. Ele é lista, porque a data de conclusão é a informação principal e precisa de espaço de texto.
- Não use `rubi` nem `ambar` em nada desta tela, a não ser o banner de erro. Não há alerta nem ação destrutiva aqui.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. Esta tela não é nenhum deles.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. O cabeçalho do ano é `title-lg`, não overline.
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
- Nada de animação no cabeçalho do ano preso ao topo. Ele acompanha a rolagem, e só.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético do tipo "Sua jornada literária" ou "Memórias de leitura". O título diz o que a coisa é.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de placeholder de capa com ícone de livro genérico. O placeholder mostra título e autor.
- Nada de toast com fundo saturado.

**Formulário**

- Nada de placeholder no lugar do label.
- Nada de helper que só aparece depois do erro.
- Nada de mensagem de erro genérica.

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

- Nada de número exibido sem unidade. Nunca "16" sozinho: é "16 dias", "12 leituras concluídas", "176 páginas".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".
- Nada de gráfico nesta tela. Se um dia houver, ele usa musgo como principal, broto como secundário e grafite como neutro, com no máximo três séries, e pertence às estatísticas.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação, nem "selo de 10 livros no ano".
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
