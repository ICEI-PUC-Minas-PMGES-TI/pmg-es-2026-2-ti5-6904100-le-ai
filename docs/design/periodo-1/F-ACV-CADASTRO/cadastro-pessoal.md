# F-ACV-CADASTRO · Cadastro de livro pessoal

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-ACV-CADASTRO.md
**Requisitos:** RF-ACV-08 (cadastrar livro pessoal com título, autor, nº de páginas e, opcionalmente, sinopse e capa por upload), RF-ACV-09 (editar e excluir os livros pessoais que cadastrou)
**Não funcionais:** RNF-SEC-20 (upload de imagem valida tipo real, tamanho e dimensões), RNF-SEC-02 (propriedade validada no servidor), RNF-USA-04 (confirmação na exclusão), RNF-USA-02 (responsiva na web), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-02 (livro pessoal não possui ISBN: o campo é ausente, não vazio), RN-03 (edição e exclusão exclusivas do dono; fora da busca, do catálogo e das páginas de autor, editora e série), RN-14.7 (a capa do livro pessoal é enviada pelo dono e não passa pelo cache de capas)
**Versão web:** sim. RF-ACV-08 e RF-ACV-09 têm marcação na coluna Web de `REQUISITOS.md` §5.2.

---

## 1. Contexto

É o formulário do livro que o sistema não tem: um zine, uma edição antiga sem ISBN, um livro de bolso de feira, um PDF impresso da faculdade. O leitor chega aqui por dois caminhos — pela oferta de [`isbn-nao-encontrado.md`](isbn-nao-encontrado.md), ou direto pela saída alternativa de [`cadastro-por-isbn.md`](cadastro-por-isbn.md), quando já sabe que o livro não tem ISBN.

A mesma tela serve para **criar e para editar** (RF-ACV-09). São o mesmo formulário com o mesmo layout: o que muda é o título, o texto do botão, os campos já preenchidos e a presença da ação de excluir. Duas telas separadas para o mesmo conjunto de campos divergiriam com o tempo.

Três coisas definem o desenho:

- **Não existe campo de ISBN.** RN-02: em livro pessoal o campo é **ausente**, não vazio. Não desenhe um campo desabilitado, nem um campo opcional, nem um texto explicando que não tem. O ISBN simplesmente não faz parte deste formulário.
- **Três campos obrigatórios e dois opcionais.** Título, autor e número de páginas são obrigatórios; sinopse e capa são opcionais. As páginas são obrigatórias porque o progresso por página depende delas, e é isso que o helper precisa comunicar sem falar de banco de dados.
- **A capa é upload de verdade**, e upload falha. Arquivo grande demais, formato errado, conexão que cai no meio: cada um desses tem estado próprio, e nenhum deles pode perder o que já foi digitado nos outros campos.

A exclusão vive aqui, no modo edição, com confirmação em modal (RNF-USA-04). Ela não é uma tela: é um estado desta.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Cadastro de livro pessoal · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

Dials: DESIGN_VARIANCE 3, MOTION_INTENSITY 3, VISUAL_DENSITY 4. Layout
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

| Campo | Valor de exemplo | Obrigatório |
|---|---|---|
| Título | `Cartas de um sertanejo` | sim |
| Autor | `Marina Albuquerque` | sim |
| Número de páginas | `184 páginas` | sim |
| Sinopse | `Reunião de cartas trocadas entre 1978 e 1984, organizadas pela própria autora e publicadas em tiragem pequena pela editora da cidade.` | não |
| Capa | imagem enviada pelo leitor, 3 por 4 | não |

No modo edição, os mesmos campos chegam preenchidos com os valores acima. Todo número aparece com unidade: `184 páginas`, `1,8 MB`, nunca o número sozinho.

---

## 4. Artboards mobile (390 x 844)

Dentro do shell autenticado, com barra inferior de quatro itens e header de 72px com o sino. **Estante** ativo quando a origem é a estante, **Descobrir** quando é a busca; desenhe com **Descobrir** ativo. Header com seta `ArrowLeft` à esquerda e título em `display` `tinta`.

Todos os campos seguem o padrão de formulário do §4.2: label acima em `label` `grafite`, campo de 48px, `radius` 12, borda 1px `linha`, fundo `papel-elevado`, foco em borda 1.5px `musgo`, helper em `caption` `grafite` visível o tempo todo. Gap de `space-5` entre campos. Padding lateral `space-5`.

### 4.1 Criação, formulário vazio

1. `space-6` de respiro abaixo do header. Título da tela: `Novo livro pessoal`.
2. **Capa**, primeiro elemento: área de upload de 120 por 160px alinhada à esquerda, `radius` 12, borda tracejada de 1px `linha`, fundo `papel-elevado`, com `ImageSquare` (Phosphor, `regular`, 24px, `grafite-suave`) centralizado e, abaixo, `caption` `grafite`, `Adicionar capa`. À direita da área, `space-4` de gap, texto em `caption` `grafite-suave`, duas linhas: `Opcional. JPG, PNG ou WEBP, até 5 MB.`
3. `space-6`.
4. Campo **Título**, label `Título`, placeholder `Cartas de um sertanejo`, sem helper.
5. Campo **Autor**, label `Autor`, placeholder `Marina Albuquerque`, sem helper.
6. Campo **Número de páginas**, label `Número de páginas`, teclado numérico, largura de 160px e **não** a largura total, porque a medida do campo comunica o tamanho da entrada esperada. Helper: `Usamos as páginas para calcular seu progresso de leitura.`
7. Campo **Sinopse**, label `Sinopse`, área de texto de 120px de altura mínima, crescendo até 240px, `radius` 12. Helper: `Opcional.` Contador em `caption` `grafite-suave` alinhado à direita abaixo do campo, `0/4000`, que só muda de cor ao passar de 3800, quando vira `ambar`.
8. `space-8`.
9. Botão primário pill, largura total, 48px: `Salvar livro`. Habilitado só com os três obrigatórios preenchidos.
10. `space-3`, botão textual `grafite` centralizado: `Cancelar`.
11. Barra inferior do shell.

### 4.2 Criação, formulário preenchido com capa

Igual a 4.1, com a área de capa substituída pela imagem enviada, 120 por 160px, `radius` 12, `object-fit: cover`, e um botão pequeno de remoção no canto superior direito da imagem: círculo de 28px, fundo `papel` com 90% de opacidade, ícone `X` (Phosphor, `regular`, 16px, `tinta`). Abaixo da imagem, `space-2`, botão textual `musgo` em `caption`: `Trocar capa`.

### 4.3 Enviando a capa

A imagem aparece já posicionada, com uma camada de `papel` a 60% por cima e, no centro, uma barra de progresso horizontal de 4px, largura de 80px, `radius` full, trilha `linha` e preenchimento `musgo`. Abaixo da área, `caption` `grafite`: `Enviando capa`. **O resto do formulário continua editável** — travar os campos de texto durante o upload seria punir quem só quer continuar digitando.

### 4.4 Erro de upload

A área da capa volta ao estado vazio, com borda tracejada 1.5px `rubi`, e a mensagem abaixo em `caption` `rubi`: `Essa imagem tem 8,2 MB. O limite é 5 MB.` Para formato inválido, a mesma área com: `Formato não aceito. Use JPG, PNG ou WEBP.` Nada do que foi digitado nos outros campos se perde.

### 4.5 Erro de validação nos campos

Campos obrigatórios vazios após tentativa de envio: borda de 1.5px `rubi` e mensagem em `caption` `rubi` no lugar do helper, um por campo:

- Título: `Informe o título do livro.`
- Autor: `Informe quem escreveu.`
- Número de páginas: `Informe quantas páginas o livro tem.`

Sem banner no topo: o erro é de campo e mora no campo (§4.2). O foco vai para o primeiro campo inválido.

### 4.6 Salvando

Campos desabilitados com fundo `papel-elevado` e texto `grafite`; botão primário em `Salvando`, sem spinner. Se o servidor demorar além de três segundos, aparece abaixo do botão, em `caption` `grafite`, a linha de cold start: `O serviço está iniciando. Isso pode levar alguns segundos.`

### 4.7 Edição

Igual a 4.2, com quatro diferenças:

1. Título da tela: `Editar livro`.
2. Campos preenchidos com os valores da §3.
3. Botão primário: `Salvar alterações`.
4. Abaixo do botão textual `Cancelar`, `space-8` de respiro, divisor de 1px `linha`, `space-5`, e a **zona de exclusão**: título em `caption` `grafite`, `Excluir este livro`, e abaixo botão destrutivo em **outline** `rubi` (nunca preenchido), largura total, 48px, texto `Excluir livro`.

### 4.8 Confirmação de exclusão

Bottom sheet no mobile, conforme §5.4, sobre um scrim de `tinta` a 40%. Fundo `papel`, `radius` 20 no topo, padding `space-6`, alça de 32 por 4px em `linha` centralizada no topo.

1. Título em `title-sm` `tinta`: `Excluir este livro?`
2. `space-3`, texto em `body` `grafite`: `Cartas de um sertanejo sai da sua estante e sua nota e resenha dele são perdidas. Quem viu esse livro pelo seu feed deixa de conseguir abri-lo. Não dá para desfazer.`
3. `space-6`, botão destrutivo em outline `rubi`, largura total: `Excluir livro`.
4. `space-3`, botão textual `grafite`, largura total: `Cancelar`.

A confirmação nomeia o título do livro, e não "este item": é o que impede a exclusão do livro errado.

---

## 5. Artboards web (1440 x 900)

Shell com sidebar retrátil, área de conteúdo com padding lateral `space-8`, sem sino.

A web ganha **duas colunas**, porque o formulário tem um elemento visual grande e vários campos: coluna esquerda de 240px com a capa, coluna direita com os campos, `space-8` de gap, dentro de uma largura máxima total de 880px. Não é o formulário mobile esticado, e também não é um card flutuando sobre fundo vazio: o fundo é `papel`, contínuo.

### 5.1 Criação, formulário vazio

Capa à esquerda, 200 por 267px. Campos à direita, com 44px de altura. O campo de número de páginas tem 180px de largura. Botão primário de 40px, largura automática, alinhado à esquerda abaixo dos campos, com `Cancelar` como botão textual à direita dele, `space-4` de gap. Estados de ponteiro: `hover` em card, link e botão; foco de teclado visível; `disabled` no botão primário enquanto faltam obrigatórios.

### 5.2 Criação, preenchido com capa

Igual a 5.1, com a imagem na coluna esquerda e `Trocar capa` abaixo dela.

### 5.3 Edição

Igual a 5.2, com título `Editar livro`, botão `Salvar alterações`, e a zona de exclusão ocupando a largura da coluna direita, abaixo de um divisor.

### 5.4 Confirmação de exclusão

**Dialog centrado**, não bottom sheet (§5.4): 480px de largura, `radius` 20, fundo `papel`, `elev-3`, sobre scrim `tinta` a 40%. Mesma copy do 4.8. Os dois botões ficam lado a lado no rodapé do dialog, alinhados à direita: `Cancelar` como botão textual e `Excluir livro` em outline `rubi`, nesta ordem.

**Abaixo de 768px** as duas colunas colapsam em uma: a capa vai para o topo, os campos abaixo, o botão primário volta à largura total, a sidebar dá lugar à barra inferior, e o dialog vira bottom sheet.

---

## 6. Artboards em modo escuro

Modo escuro é lock de página inteira (§3.1.2). Superfície elevada fica **mais clara** que o fundo, e os shadows têm metade da opacidade.

- **Mobile, criação preenchida.** Fundo `noite`. Labels em `grafite-claro`, campos em `noite-elevada` com borda `linha-noite`, texto digitado em `papel-suave`, placeholder e helper em `grafite-fundo-escuro`. Área de capa com borda tracejada `linha-noite` e ícone em `grafite-fundo-escuro`. Contador da sinopse em `grafite-fundo-escuro`. Botão primário em `musgo-claro` com texto `noite`. Barra inferior em `noite-elevada`.
- **Mobile, erro de upload.** Borda tracejada em `rubi-claro` e mensagem em `rubi-claro`. Se houver tint de fundo, `rubi-fundo-escuro`.
- **Mobile, confirmação de exclusão.** Sheet em `noite-elevada` sobre scrim preto a 60%, alça em `linha-noite`, título em `papel-suave`, texto em `grafite-claro`, botão destrutivo em outline `rubi-claro`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de texto com label acima, helper e estado de erro | documento-de-design §4.2 |
| Área de texto com contador | documento-de-design §4.2 |
| Botão primário pill, com desabilitado e carregamento | documento-de-design §4.1 |
| Botão textual | documento-de-design §4.1 |
| Botão destrutivo em outline `rubi`, nunca preenchido | documento-de-design §4.1 e §7.8 |
| Bottom sheet no mobile e dialog centrado na web | documento-de-design §5.4 |
| Confirmação de ação destrutiva em modal | documento-de-design §7.8 e RNF-USA-04 |
| Placeholder de capa, retângulo de canto vivo | documento-de-design §4.5 |
| Escala tipográfica, com JetBrains Mono em numeral tabular | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell autenticado, barra inferior e sidebar | ../../periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Área de upload de imagem** com seus quatro estados: vazio, enviando, preenchido e erro. O sistema não tem nenhum componente de upload até aqui.
- **Barra de progresso determinada** para upload. O §4.7 define barra de progresso de leitura, que é outra coisa: aquela mostra quanto do livro foi lido, esta mostra quanto do arquivo subiu.
- **Zona de exclusão** no rodapé de um formulário de edição, separada por divisor e com rótulo próprio.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela, criação | `Novo livro pessoal` |
| Título da tela, edição | `Editar livro` |
| Área de capa, vazia | `Adicionar capa` |
| Área de capa, regra | `Opcional. JPG, PNG ou WEBP, até 5 MB.` |
| Área de capa, enviando | `Enviando capa` |
| Área de capa, preenchida | `Trocar capa` |
| Label do título | `Título` |
| Placeholder do título | `Cartas de um sertanejo` |
| Label do autor | `Autor` |
| Placeholder do autor | `Marina Albuquerque` |
| Label das páginas | `Número de páginas` |
| Helper das páginas | `Usamos as páginas para calcular seu progresso de leitura.` |
| Label da sinopse | `Sinopse` |
| Helper da sinopse | `Opcional.` |
| Botão primário, criação | `Salvar livro` |
| Botão primário, edição | `Salvar alterações` |
| Botão primário, salvando | `Salvando` |
| Botão textual | `Cancelar` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro de título | `Informe o título do livro.` |
| Erro de autor | `Informe quem escreveu.` |
| Erro de páginas | `Informe quantas páginas o livro tem.` |
| Erro de tamanho da capa | `Essa imagem tem 8,2 MB. O limite é 5 MB.` |
| Erro de formato da capa | `Formato não aceito. Use JPG, PNG ou WEBP.` |
| Erro de envio da capa | `Não foi possível enviar a capa. Tente de novo.` |
| Zona de exclusão, rótulo | `Excluir este livro` |
| Zona de exclusão, botão | `Excluir livro` |
| Confirmação, título | `Excluir este livro?` |
| Confirmação, texto | `Cartas de um sertanejo sai da sua estante e sua nota e resenha dele são perdidas. Quem viu esse livro pelo seu feed deixa de conseguir abri-lo. Não dá para desfazer.` |
| Confirmação, botão destrutivo | `Excluir livro` |
| Confirmação, cancelar | `Cancelar` |

Zero em-dash em toda a copy. Zero emoji. O tamanho do arquivo usa vírgula decimal de pt-BR: `8,2 MB`, nunca `8.2 MB`.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo e AAA no título quando possível. `grafite-suave` e `grafite-fundo-escuro` carregam só placeholder, contador e metadado.
- Alvo de toque de no mínimo 48px no mobile, inclusive no botão de remover a capa, que por isso tem 28px de círculo visível dentro de uma área tocável de 48px.
- Campo obrigatório marcado por `aria-required`, e a mensagem de erro ligada ao campo por `aria-describedby`. O asterisco visual não é usado: o helper e a validação comunicam a obrigatoriedade.
- Foco de teclado visível em todo elemento interativo na web. No dialog de confirmação, o foco entra no botão `Cancelar`, **não** no destrutivo, e fica preso dentro do dialog enquanto ele estiver aberto; `Esc` fecha e devolve o foco ao botão que o abriu.
- O erro de upload é anunciado por região viva, porque acontece fora do fluxo de digitação.
- `prefers-reduced-motion` respeitado: sob `reduce`, o sheet e o dialog entram sem deslizar, e a barra de progresso do upload não pulsa.
- Toda ação destrutiva pede confirmação em modal (RNF-USA-04), com botão destrutivo em outline `rubi`, nunca preenchido.

---

## 10. O que não fazer nesta tela

- **Não desenhe campo de ISBN.** Nem desabilitado, nem opcional, nem com texto explicando que não se aplica. RN-02: em livro pessoal o campo é ausente.
- **Não desenhe campo de editora, série ou assunto.** Editora e série não existem em livro pessoal, e assunto em livro pessoal é RF-ACV-22, que está em F-ACV-OPC no Período 3. Não antecipe com campo desabilitado nem com "em breve".
- **Não faça a capa parecer obrigatória.** Ela é opcional, e a área vazia precisa parecer um convite, não um campo faltando.
- **Não perca o que já foi digitado** quando o upload falhar. O erro é da imagem, não do formulário.
- **Não trave os campos de texto durante o upload da capa.** São operações independentes.
- **Não use botão destrutivo preenchido.** Sempre outline `rubi` (§7.8).
- **Não escreva "este item" na confirmação.** A confirmação nomeia o título do livro.
- **Não prometa desfazer.** Não existe lixeira nesta entrega, e a copy diz isso.
- **Não duplique a explicação de livro pessoal** que já foi dada em [`isbn-nao-encontrado.md`](isbn-nao-encontrado.md). Quem chega aqui já decidiu.
- Nada de gradiente de acento, nada de `#000000`, nada de sombra preta pura, nada de emoji, nada de loop infinito de motion (§7).
- Nada de formulário em múltiplos passos com indicador de etapa: são cinco campos, e um wizard aqui seria cerimônia sem ganho.
