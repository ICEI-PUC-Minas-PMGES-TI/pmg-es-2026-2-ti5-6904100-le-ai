# F-ACV-CADASTRO · Cadastro por ISBN

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-ACV-CADASTRO.md
**Requisitos:** RF-ACV-05 (cadastrar livro na base oficial informando o ISBN), RF-ACV-07 (ISBN já existente bloqueia e direciona à página do livro)
**Não funcionais:** RNF-SEC-38 (o campo aceita ISBN, nunca URL), RNF-ERR-08 (a busca externa tem timeout e retentativa, e o cliente precisa mostrar isso sem parecer travado), RNF-ERR-09 (cold start é carregamento, não erro), RNF-USA-02 (responsiva na web), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (mensagem de erro em pt-BR e acionável)
**Regras de negócio:** RN-01 (o livro é a edição), RN-02 (ISBN-13 é chave natural única da base oficial)
**Versão web:** sim. RF-ACV-05 e RF-ACV-07 têm marcação na coluna Web de `REQUISITOS.md` §5.2.

---

## 1. Contexto

Esta tela é a saída de emergência da busca. O leitor procurou um livro em **Descobrir**, não achou, e o estado vazio de lá ofereceu `Cadastrar por ISBN` ([`../F-ACV-BUSCA/descobrir.md`](../F-ACV-BUSCA/descobrir.md), §4.4). A estante vazia oferece o mesmo caminho ([`../F-EST/estante.md`](../F-EST/estante.md), §4.2). Daqui o leitor sai para a página do livro recém-criado e, dali, para a estante — ou seja, a tela existe para destravar o mecanismo de **registro** quando o acervo carregado não tem a edição que a pessoa tem na mão.

Três coisas definem o desenho:

- **O campo aceita um ISBN e nada mais.** Não é um campo de busca, não aceita título, não aceita link de loja e não aceita URL (RNF-SEC-38). O rótulo, o placeholder e o helper existem para deixar isso óbvio antes do erro acontecer.
- **A espera é o assunto principal da tela.** O servidor aceita a solicitação e responde em seguida, mas quem realmente demora é a consulta à fonte externa, que roda depois. O leitor fica olhando um estado de progresso por alguns segundos, e esse estado precisa parecer trabalho em andamento, não travamento. É o oposto de um formulário comum, em que o envio é instantâneo.
- **O ISBN já cadastrado não é erro do leitor.** É a descoberta de que o livro já existe, e o desfecho certo é levar a pessoa até ele (RF-ACV-07). A tela trata isso como um caminho bem-sucedido, com copy afirmativa, e não com banner vermelho.

O caminho do ISBN que nenhuma fonte conhece é a tela seguinte, [`isbn-nao-encontrado.md`](isbn-nao-encontrado.md). O cadastro manual é [`cadastro-pessoal.md`](cadastro-pessoal.md).

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Cadastro por ISBN · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

Dials: DESIGN_VARIANCE 4, MOTION_INTENSITY 4, VISUAL_DENSITY 3. Layout
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

A tela tem um campo de entrada e, depois do envio, o resultado. Valores de exemplo:

| Dado | Valor |
|---|---|
| ISBN digitado | `978-85-359-1484-9` |
| ISBN normalizado, exibido no acompanhamento | `9788535914849` |
| Título encontrado | `Memórias Póstumas de Brás Cubas` |
| Autor encontrado | `Machado de Assis` |
| Editora encontrada | `Penguin-Companhia` |
| Ano da edição | `2014` |
| Total de páginas | `288 páginas` |
| Título do livro já existente, no estado de duplicata | `Torto Arado` |
| Autor do livro já existente | `Itamar Vieira Junior` |
| Editora do livro já existente | `Todavia` |

Todo número aparece com unidade: `288 páginas`, nunca `288` sozinho. Nenhum número inventado de precisão falsa: não existe percentual de progresso da busca, porque o servidor não informa progresso.

---

## 4. Artboards mobile (390 x 844)

Todos dentro do shell autenticado, com a barra inferior de quatro itens e o header de 72px com o sino. **Estante** fica ativo na barra quando a tela é aberta a partir da estante, e **Descobrir** quando é aberta a partir da busca; desenhe os artboards com **Descobrir** ativo, que é o caminho principal.

O header traz o título da tela em `display` `tinta`, `Adicionar livro`, com uma seta `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda do título, com `space-3` de gap, e o sino à direita.

### 4.1 Aterrissagem

De cima para baixo, com padding lateral `space-5`:

1. `space-6` de respiro abaixo do header.
2. Texto de apoio em `body` `grafite`, largura máxima confortável, duas linhas: `Informe o ISBN de 13 dígitos impresso no livro, geralmente perto do código de barras.`
3. `space-6`.
4. Campo de ISBN conforme o padrão de formulário do §4.2 do documento-de-design: label acima em `label` `grafite`, `ISBN`; campo de 48px de altura, `radius` 12, borda 1px `linha`, fundo `papel-elevado`; texto digitado em `body` `tinta` com **numeral tabular da JetBrains Mono**, porque a pessoa vai conferir dígito a dígito contra o livro; placeholder em `grafite-suave`, `978-85-359-1484-9`.
5. Helper abaixo do campo, em `caption` `grafite`, `space-2` de gap, visível o tempo todo e não só depois do erro: `Só o ISBN. Links e títulos não funcionam aqui.`
6. `space-6`.
7. Botão primário pill, largura total, 48px de altura, fundo `musgo`, texto `papel` em `body-strong`: `Buscar livro`. **Desabilitado** enquanto o campo não tiver 13 dígitos: fundo `linha`, texto `grafite-suave`, sem sombra.
8. `space-8`.
9. Bloco de saída alternativa, separado por divisor de 1px `linha` acima, com `space-6` de respiro: texto em `caption` `grafite`, `Não tem o ISBN em mãos?`, e abaixo botão textual `musgo` em `body-strong`, `Cadastrar livro pessoal`. Este caminho leva a [`cadastro-pessoal.md`](cadastro-pessoal.md) e existe desde o início, não só depois do erro.
10. Barra inferior do shell com **Descobrir** ativo.

### 4.2 Campo preenchido, pronto para enviar

Igual a 4.1, com o campo contendo `978-85-359-1484-9` em `tinta`, e o botão primário em estado ativo, fundo `musgo`.

### 4.3 Buscando

Este é o estado que a tela existe para desenhar bem. O envio não volta em milissegundos: o servidor aceita a solicitação e a consulta à fonte externa acontece depois, com timeout e retentativa (RNF-ERR-08).

1. O campo fica **desabilitado**, sem virar cinza ilegível: fundo `papel-elevado`, texto em `grafite`, borda `linha`.
2. O botão primário vira estado de carregamento: fundo `musgo`, texto `papel`, `Buscando`, sem spinner girando — o sistema não tem spinner (§3.6).
3. Abaixo do botão, `space-5` de gap, um **cartão de progresso** em `papel-elevado`, `radius` 16, padding `space-5`, sem sombra:
   - Linha superior: três barras de skeleton estáticas simulando título, autor e editora, com `radius` 6, cor `linha`, alturas de 16, 14 e 14px e larguras de 70%, 45% e 35%, com `space-3` de gap, e um único fade de entrada (§3.6).
   - Abaixo, `space-4`, texto em `caption` `grafite`: `Procurando em nossas fontes. Isso pode levar alguns segundos.`
4. Depois de **oito segundos** no mesmo estado, a linha de texto troca, sem trocar o layout: `Ainda procurando. As fontes externas estão lentas agora.` A troca é um crossfade em `dur-base`. Não existe barra de progresso nem contagem regressiva: o servidor não informa progresso, e inventar um seria número fake-preciso (§7.10).

### 4.4 Livro encontrado

1. O cartão de progresso é substituído, no mesmo lugar, por um **card do livro encontrado**: fundo `papel-elevado`, `radius` 16, padding `space-5`.
   - Capa à esquerda, 60 por 90px, `radius` 6. Enquanto a imagem não carrega, retângulo `capa-placeholder` de canto vivo.
   - À direita, `space-4` de gap: título em `title-sm` `tinta`, duas linhas no máximo com reticências; autor em `body` `grafite`; editora e ano em `caption` `grafite-suave`, separados por ponto médio; `288 páginas` em `caption` `grafite-suave`.
2. Acima do card, `space-4` de gap, uma linha de confirmação com ícone `CheckCircle` (Phosphor, `fill`, 20px, `musgo`) e texto em `body-strong` `musgo`: `Livro adicionado ao acervo.`
3. Abaixo do card, `space-5`, botão primário pill de largura total: `Abrir página do livro`.
4. Abaixo, `space-3`, botão textual `musgo`: `Cadastrar outro ISBN`. Ele limpa o campo e devolve a tela ao estado 4.1.

### 4.5 ISBN já cadastrado

RF-ACV-07. **Não é um estado de erro**, e não usa `rubi`: o livro existe, e o desfecho é levar a pessoa até ele.

1. No lugar do cartão de progresso, uma faixa informativa com fundo `musgo-fundo`, `radius` 12, padding `space-4`, ícone `Info` (Phosphor, `regular`, 20px, `musgo`) à esquerda e texto em `body` `tinta`: `Este livro já está no acervo.`
2. Abaixo, `space-4`, o mesmo card do livro de 4.4, agora com os dados do livro existente.
3. Abaixo, `space-5`, botão primário pill de largura total: `Abrir página do livro`.
4. Abaixo, `space-3`, botão textual `musgo`: `Cadastrar outro ISBN`.

### 4.6 ISBN inválido

Erro de validação do campo, resolvido antes de qualquer chamada. Não existe banner: o erro é do campo e mora no campo (§4.2).

1. Campo com borda de 1.5px `rubi`.
2. Mensagem abaixo em `caption` `rubi`, `space-2` de gap, substituindo o helper: `Esse ISBN não confere. Verifique os 13 dígitos impressos no livro.`
3. Botão primário volta ao estado desabilitado.

### 4.7 Fonte indisponível

O ISBN é válido, mas as fontes externas não responderam depois das retentativas. É diferente de "livro não existe", e a copy não pode sugerir que o livro não existe.

1. No lugar do cartão de progresso, `BannerAviso` na variante alerta: fundo `ambar-fundo`, borda 1px `ambar`, `radius` 12, padding `space-4`, ícone `Warning` (Phosphor, `regular`, 20px, `ambar`), texto em `body` `tinta`: `Não conseguimos consultar nossas fontes agora. Seu pedido foi guardado.`
2. Abaixo, `space-4`, botão primário pill de largura total: `Tentar de novo`.
3. Abaixo, `space-3`, botão textual `musgo`: `Cadastrar livro pessoal`.

### 4.8 Serviço iniciando

Cold start do Render (RNF-ERR-09). Visualmente idêntico a 4.3, com a linha de texto do cartão trocada por: `O serviço está iniciando. Isso pode levar alguns segundos.` **Não é erro** e não usa `ambar` nem `rubi`.

---

## 5. Artboards web (1440 x 900)

Shell com a sidebar retrátil à esquerda, **Descobrir** ativo, e área de conteúdo com padding lateral `space-8`. Sem sino na web.

A web **não** é a coluna do mobile esticada. O conteúdo vive em uma **coluna central de 640px de largura máxima**, centralizada na área de conteúdo, porque a tela tem um campo só e uma linha de medida longa demais tornaria o formulário desconfortável. O espaço restante fica vazio, sem seção decorativa e sem card flutuando sobre fundo vazio: o fundo é `papel`, contínuo, e o conteúdo apenas respeita a medida.

### 5.1 Aterrissagem

Mesma ordem do 4.1, com as medidas de web: campo de 44px de altura, botão de 40px. O botão primário **não ocupa a largura total**: tem largura automática com padding horizontal `space-8`, alinhado à esquerda, abaixo do campo. Estados de ponteiro: `hover` do botão em `musgo-vivo`, `hover` do botão textual com sublinhado, foco de teclado visível em borda de 1.5px `musgo` em todo elemento interativo.

### 5.2 Buscando

Igual a 4.3, com o cartão de progresso ocupando a largura da coluna central.

### 5.3 Livro encontrado

Igual a 4.4. O card do livro ganha capa de 80 por 120px, aproveitando a tela maior sem virar dashboard.

### 5.4 ISBN já cadastrado

Igual a 4.5, nas medidas de web.

### 5.5 ISBN inválido

Igual a 4.6, nas medidas de web.

**Abaixo de 768px** a coluna central passa a ocupar a largura disponível com padding lateral `space-5`, o botão primário volta a ocupar a largura total, a sidebar dá lugar à barra inferior e o layout fica idêntico ao mobile.

---

## 6. Artboards em modo escuro

Modo escuro é lock de página inteira (§3.1.2): nenhuma seção inverte no meio da rolagem. Superfície elevada fica **mais clara** que o fundo, e os shadows têm metade da opacidade — a hierarquia vem da cor de superfície e do divisor `linha-noite`, não da sombra.

Repita, no mínimo, três estados:

- **Mobile, aterrissagem.** Fundo `noite`. Título do header e sino em `papel-suave`. Label em `grafite-claro`. Campo em `noite-elevada`, **mais claro** que o fundo, borda `linha-noite`, texto digitado em `papel-suave`, placeholder em `grafite-fundo-escuro`. Helper em `grafite-fundo-escuro`. Botão primário com fundo `musgo-claro` e texto `noite`. Divisor `linha-noite`. Botão textual em `musgo-claro`. Barra inferior em `noite-elevada`.
- **Mobile, buscando.** Cartão de progresso em `noite-elevada`, barras de skeleton em `linha-noite`, texto em `grafite-claro`.
- **Mobile, ISBN já cadastrado.** Faixa informativa com fundo `musgo-fundo-escuro`, ícone e texto em `musgo-claro`. Card do livro em `noite-elevada`, título em `papel-suave`, autor em `grafite-claro`, editora e páginas em `grafite-fundo-escuro`, placeholder de capa em `capa-placeholder-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de texto com label acima, helper e estado de erro | documento-de-design §4.2 |
| Botão primário pill, com estado desabilitado e de carregamento | documento-de-design §4.1 |
| Botão textual | documento-de-design §4.1 |
| Banner de alerta e de erro | documento-de-design §4.2 |
| Skeleton estático com a forma do layout final | documento-de-design §3.6 e §7.4 |
| Placeholder de capa, retângulo de canto vivo | documento-de-design §4.5 e RN-14.4 |
| Escala tipográfica, com JetBrains Mono em numeral tabular | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell autenticado, barra inferior e sidebar | ../../periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Cartão de progresso de operação longa**, com skeleton e linha de estado que troca de texto ao passar do tempo. O §3.6 define skeleton, mas não define o padrão de uma espera de vários segundos com mensagem que evolui.
- **Card de livro em variante de confirmação**, com capa pequena e ficha reduzida. O card de livro da busca existe em `../F-ACV-BUSCA/descobrir.md`, mas em outra proporção e com outra finalidade.
- **Faixa informativa neutra** em `musgo-fundo`, para o caso em que a informação não é alerta nem erro. Hoje o sistema só tem banner de erro e de alerta, e usar `ambar` no ISBN já cadastrado passaria a ideia errada.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Adicionar livro` |
| Texto de apoio | `Informe o ISBN de 13 dígitos impresso no livro, geralmente perto do código de barras.` |
| Label do campo | `ISBN` |
| Placeholder | `978-85-359-1484-9` |
| Helper | `Só o ISBN. Links e títulos não funcionam aqui.` |
| Botão primário | `Buscar livro` |
| Botão primário buscando | `Buscando` |
| Cartão de progresso | `Procurando em nossas fontes. Isso pode levar alguns segundos.` |
| Cartão de progresso, depois de oito segundos | `Ainda procurando. As fontes externas estão lentas agora.` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Sucesso | `Livro adicionado ao acervo.` |
| Sucesso, botão | `Abrir página do livro` |
| Sucesso, botão textual | `Cadastrar outro ISBN` |
| ISBN já cadastrado | `Este livro já está no acervo.` |
| ISBN inválido | `Esse ISBN não confere. Verifique os 13 dígitos impressos no livro.` |
| Fonte indisponível | `Não conseguimos consultar nossas fontes agora. Seu pedido foi guardado.` |
| Fonte indisponível, botão | `Tentar de novo` |
| Saída alternativa, pergunta | `Não tem o ISBN em mãos?` |
| Saída alternativa, botão textual | `Cadastrar livro pessoal` |
| Rótulo de páginas | `288 páginas` |

Zero em-dash em toda a copy. Zero emoji. Nenhuma mensagem diz "Algo deu errado": cada erro nomeia o que houve e o que fazer em seguida (RNF-USA-05).

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo e AAA no título quando possível. `grafite-suave` e `grafite-fundo-escuro` só carregam placeholder e metadado, nunca informação essencial.
- Alvo de toque de no mínimo 48px no mobile, inclusive no botão textual da saída alternativa.
- Foco de teclado visível em todo elemento interativo na web: borda de 1.5px `musgo`, sem `outline` padrão do browser.
- O campo de ISBN usa teclado numérico no mobile e aceita colar com separadores; a normalização é do servidor, e o cliente não reescreve o que a pessoa digitou enquanto ela digita.
- A transição entre buscando, encontrado e erro é anunciada por região viva, para leitor de tela perceber a mudança sem foco se mover sozinho. O foco **não** salta para o resultado.
- `prefers-reduced-motion` respeitado: sob `reduce`, o fade do skeleton e o crossfade da linha de texto viram troca estática.
- Nenhuma ação destrutiva nesta tela, portanto nenhuma confirmação.

---

## 10. O que não fazer nesta tela

- **Não transforme o campo em busca.** Nada de autocompletar por título, nada de sugestão enquanto digita, nada de aceitar link de loja. O campo aceita ISBN, e aceitar URL contraria RNF-SEC-38 diretamente.
- **Não use spinner girando.** O sistema não tem spinner (§3.6); a espera é skeleton estático com um único fade.
- **Não invente progresso.** Sem barra de porcentagem, sem contagem regressiva, sem "2 de 3 fontes consultadas". O servidor não informa nada disso, e número fake-preciso é banido (§7.10).
- **Não trate ISBN já cadastrado como erro.** Sem `rubi`, sem ícone de alerta, sem a palavra "erro". O livro existe, e isso é uma boa notícia.
- **Não misture as duas falhas.** "Não encontramos este livro" e "não conseguimos consultar" são estados diferentes com desfechos diferentes, e a copy de um nunca pode aparecer no outro.
- **Não esconda a saída para o cadastro pessoal atrás do erro.** Ela existe desde a aterrissagem, porque muita gente chega aqui já sabendo que o livro não tem ISBN.
- Nada de gradiente de acento, nada de `#000000`, nada de sombra preta pura, nada de emoji, nada de loop infinito de motion (§7).
- Nada de hero de landing dentro do produto, nada de card do formulário flutuando centralizado sobre fundo vazio na web (§7.3, §7.11).
- Não desenhe o resultado em tela nova: o acompanhamento acontece **nesta** tela, no lugar do cartão de progresso. Trocar de rota no meio da espera perderia o contexto de quem digitou o ISBN.
