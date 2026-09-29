# Atualizações de progresso (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Atualizações de progresso`, gerado por `docs/design/periodo-1/F-PRG/atualizacoes-de-progresso.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-PRG/atualizacoes-de-progresso.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-EST-2.md
**Requisitos que entram:**
- F-EST-2: RF-EST-10 (só a parte final: selecionar uma ocorrência concluída no histórico e consultar, em **modo somente leitura**, as atualizações de progresso dela)

**Não funcionais:** RNF-SEC-02 (a ocorrência é do próprio leitor, validado no servidor; conhecer o `leituraId` de outra pessoa não dá acesso), RNF-DES-02 (lista paginada com teto do servidor), RNF-USA-03, RNF-USA-05
**Regras de negócio:** RN-04 (só leitura ou releitura **finalizada** chega aqui pelo histórico), RN-17.1 (páginas lidas de cada atualização continuam derivadas da diferença para a anterior)
**Versão web:** sim. RF-EST-10 tem marcação na coluna Web de `REQUISITOS.md` §5.3.
**De onde se chega no modo histórico:** de uma linha de ocorrência do `Histórico de leituras` (`../F-EST-2/historico-de-leituras.md`), no estado padrão por ano ou no resultado de pesquisa agrupado por livro.

---

## 1. O que muda e por quê

No Período 1 esta tela existia para uma coisa: a leitura **em andamento**, com o registro de progresso e a exclusão que destrava um valor digitado errado (RN-17.4). O Período 2 acrescenta o histórico de leituras concluídas (F-EST-2), e cada conclusão do histórico abre esta mesma tela para o leitor olhar como aquela leitura andou.

Essa leitura já terminou. Nada mais pode ser registrado nela e nada pode ser excluído: o servidor recusa as duas operações pelo estado da leitura, e a resposta da consulta já chega marcada como somente leitura (`somenteLeitura`). A tela ganha por isso um **modo histórico**, que é a mesma tela com três diferenças:

| O que muda no modo histórico | Por quê |
|---|---|
| Sem `PlusCircle` no header, sem `Registrar progresso` na web, sem CTA no vazio | Leitura concluída não recebe registro novo |
| Sem `Trash` em nenhuma linha, sem coluna de ação na tabela web, sem aviso de ritmo | Excluir não existe numa leitura concluída, e o aviso de ritmo só serve para mandar excluir |
| Resumo com a barra em `Concluída`, a data de conclusão e a identificação da ocorrência (leitura ou releitura, início, fim, duração) | O mesmo livro pode ter várias conclusões, e o leitor precisa saber qual delas está vendo |

**O modo histórico não é a tela em andamento com botões cinzas.** As ações não existem ali: nada desabilitado, nada escondido atrás de menu, nenhum cadeado sobre um botão. Uma linha informativa, pequena e neutra, diz que a leitura foi concluída e que os registros ficam para consulta.

**O que deixa de valer do prompt do Período 1:** nada. Todos os artboards e regras daquele prompt continuam, para a leitura em andamento. Esta edição **só acrescenta** artboards; nenhum artboard existente muda.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Atualizações de progresso · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame. Os rótulos novos seguem o padrão que o canvas já usa: sem prefixo na linha mobile, prefixo `Web,` na linha web e sufixo `, escuro` na linha escura.
- Os artboards novos entram **no fim da linha** da sua plataforma, depois dos existentes, sem reordenar nenhum.

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
Nenhuma das duas é esta tela. Densidade sobe em telas de dados como esta.

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

## 3. O que permanece intocado

- **Todos os artboards existentes**, com os rótulos que já têm: `Padrão`, `Valor digitado errado`, `Confirmação de exclusão`, `Exclusão conjunta`, `Depois do recálculo`, `Vazio`, `Carregando`, `Erro de carregamento`, `Web, padrão`, `Web, linha em hover`, `Web, confirmação de exclusão`, `Web, exclusão conjunta`, `Web, vazio`, `Mobile, padrão, escuro`, `Mobile, confirmação, escuro` e `Web, padrão, escuro`. Eles são a leitura em andamento e não mudam em nada: header com `PlusCircle`, `Trash` em cada linha, aviso de ritmo, confirmação com o número do recálculo.
- **O shell inteiro**, exatamente como está no canvas: barra inferior do mobile e sidebar da web com o item `Estante` ativo, e a marca na sidebar do jeito que já aparece.
- **O desenho da lista e da tabela:** linha com a página informada em `num-inline` à esquerda e a data em `caption` `grafite-suave` abaixo, detalhe `24 páginas · 45 min` em `caption` `grafite` no meio, divisor `linha` entre os itens, ordem da mais recente para a mais antiga, paginação por rolagem; na web, tabela com cabeçalho `Data`, `Página`, `Páginas lidas`, `Tempo`, linhas de 56px.
- **A linha de três valores com divisor vertical** (`Lidas`, `Tempo`, `Registros`), no mobile lado a lado e na web empilhada.
- **O skeleton e o erro de carregamento.** O modo histórico usa os mesmos artboards `Carregando` e `Erro de carregamento`: enquanto a resposta não chega o `PlusCircle` já não aparece (ele só surge quando o resumo carrega), e a copy do erro serve aos dois modos. Por isso não há artboard novo de carregando nem de erro.
- **Toda a copy do Período 1.** Nenhum texto existente é substituído.

---

## 4. Artboards que mudam

Nenhum. Esta edição só acrescenta artboards (seção 5).

---

## 5. Artboards novos

### Dados do modo histórico

**Ocorrência aberta no padrão:** a releitura de `Dom Casmurro`, de Machado de Assis, `256 páginas`, que o histórico mostra como `Releitura · Concluído em 16 de novembro de 2025 · 14 dias`. Início em `02 de novembro de 2025`, conclusão em `16 de novembro de 2025`, duração de `14 dias`. Capa real do livro.

**Resumo derivado:** `256 páginas` lidas, `4 h 50 min` de tempo somado, `7 registros`.

**Atualizações**, da mais recente para a mais antiga. As páginas lidas são derivadas (RN-17.1) e somam `256 páginas`; a primeira atualização da releitura conta desde a página 0, porque cada ocorrência tem os próprios registros.

| Data | Página informada | Páginas lidas | Tempo |
|---|---|---|---|
| 16 de novembro de 2025 | página 256 | 38 páginas | 50 minutos |
| 14 de novembro de 2025 | página 218 | 42 páginas | 55 minutos |
| 11 de novembro de 2025 | página 176 | 30 páginas | sem tempo informado |
| 09 de novembro de 2025 | página 146 | 36 páginas | 45 minutos |
| 07 de novembro de 2025 | página 110 | 44 páginas | 1 hora |
| 04 de novembro de 2025 | página 66 | 40 páginas | 50 minutos |
| 02 de novembro de 2025 | página 26 | 26 páginas | 30 minutos |

A atualização de `11 de novembro de 2025` não tem tempo informado e aparece na variante que o canvas já usa: `30 páginas` no item do mobile e célula de tempo vazia na tabela.

**Ocorrência sem registros:** a primeira leitura de `A Hora da Estrela`, de Clarice Lispector, `96 páginas`, de `01 de agosto de 2024` a `08 de agosto de 2024`, `7 dias`. Ela foi marcada como lida sem nenhum registro de página no caminho.

### Anatomia do modo histórico, mobile

Tudo o que não está listado aqui é igual ao artboard `Padrão`.

**Header.**

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, rótulo acessível `Voltar ao histórico`. Volta à tela de histórico no mesmo estado em que o leitor a deixou (ano, pesquisa e posição de rolagem).
- Título `Progresso` em `display` `tinta`, como já está.
- À direita, **só o `Bell`**, com o badge de não lidas quando houver. **Sem `PlusCircle`.**

**Bloco de resumo**, com padding lateral `space-5` e `space-6` de respiro abaixo:

1. Card compacto do livro, como já está: capa de 60 por 90px em canto vivo à esquerda, `space-4` de gap, título em `title-sm` `tinta` e autor em `caption` `grafite`. **Entra uma terceira linha**, `space-1` abaixo do autor, com o **tipo da ocorrência**: na releitura, `ArrowsClockwise` (Phosphor, `regular`, 16px, `broto`), `space-1` de gap e `Releitura` em `caption` peso 600 `grafite`; na primeira leitura, só `Leitura` em `caption` peso 600 `grafite`, sem ícone. É o mesmo desenho do tipo no histórico, para o leitor reconhecer a linha de onde veio.
2. `space-4` abaixo, a barra de progresso conforme design §4.7, **cheia**: track `musgo-fundo` de 6px, fill `musgo` na largura inteira, `radius-full`. No lugar do percentual, à direita, `Concluída` em `caption` `grafite`. Nunca `100%`.
3. Abaixo da barra, duas linhas em `caption` `grafite`, `space-1` entre elas, no lugar de `Página 172 de 264`:
   - `Concluída em 16 de novembro de 2025`
   - `Início em 02 de novembro de 2025 · 14 dias`
4. `space-4` abaixo, a linha de três valores, como já está: `256 páginas` sob `Lidas`, `4 h 50 min` sob `Tempo`, `7 registros` sob `Registros`.
5. `space-4` abaixo, a **linha de somente leitura**, alinhada à esquerda: `Info` (Phosphor, `regular`, 16px, `grafite`), `space-2` de gap, texto em `caption` `grafite`: `Leitura concluída. Os registros ficam só para consulta.` Sem fundo, sem borda, sem ícone de cadeado, sem cor de estado: é informação, não alerta nem erro.
6. Divisor de 1px `linha` de largura total, como já está.

**Lista de atualizações.**

- Título de seção `Atualizações` em `title-lg` `tinta`, como já está.
- Cada item mantém a página informada e a data à esquerda e o detalhe no meio. **À direita não há nada:** sem `Trash`, sem `CaretRight`, sem `DotsThree`. O detalhe pode ocupar o espaço que era do ícone. A altura mínima da linha continua a mesma, para o ritmo da lista não mudar.
- A linha não é acionável: tocar nela não abre nada e não dá feedback de toque.
- **Sem aviso de ritmo** em nenhum item, mesmo que as páginas lidas de um registro passem do limiar do Período 1. O aviso existe para sugerir a exclusão, e excluir não existe aqui.
- Paginação por rolagem, como já está.

**Barra inferior** com **Estante** ativo, a área de onde se chegou ao histórico.

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Atualizações de progresso · Modo histórico, releitura concluída`

A releitura de `Dom Casmurro` com a anatomia acima.

- Header com `ArrowLeft`, `Progresso` e `Bell`, sem `PlusCircle`.
- Resumo com `Releitura` e `ArrowsClockwise` no card, barra cheia com `Concluída`, `Concluída em 16 de novembro de 2025`, `Início em 02 de novembro de 2025 · 14 dias`, os três valores `256 páginas`, `4 h 50 min`, `7 registros` e a linha `Leitura concluída. Os registros ficam só para consulta.`
- Lista com as sete atualizações, da `página 256` à `página 26`, as que couberem na viewport. A de `11 de novembro de 2025` mostra só `30 páginas`, sem minutos. Nenhum ícone à direita em nenhuma linha.
- Barra inferior com **Estante** ativo.

Este é o artboard que prova o modo: comparado com `Padrão`, ao lado na mesma linha, ele tem as mesmas partes e **nenhuma ação**.

#### 5.2 `Atualizações de progresso · Modo histórico, leitura sem registros`

A primeira leitura de `A Hora da Estrela`, concluída sem nenhum registro.

- Header igual ao de 5.1.
- Resumo: card com `A Hora da Estrela`, `Clarice Lispector` e `Leitura` (sem ícone); barra cheia com `Concluída`; `Concluída em 08 de agosto de 2024` e `Início em 01 de agosto de 2024 · 7 dias`. **A linha de três valores não aparece**: `0 páginas lidas` numa leitura concluída diria uma coisa falsa. A linha de somente leitura aparece logo abaixo das datas.
- Divisor, e no lugar da lista, bloco centralizado com `space-6` entre os elementos e `space-10` de respiro acima:
  - `Clock` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhuma atualização registrada`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Esta leitura foi concluída sem registros de página.`
  - **Sem botão.** Diferente do `Vazio` da leitura em andamento, aqui não há o que convidar a fazer: `Registrar progresso` não existe numa leitura concluída.
- Barra inferior com **Estante** ativo.

### Anatomia do modo histórico, web

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

Tudo o que não está listado aqui é igual ao artboard `Web, padrão`.

- Sidebar do shell à esquerda, expandida em 248px, item **Estante** ativo, como já está. Sem sino, como em toda a web.
- **Header de conteúdo de 72px** com `Progresso` em `display` `tinta` à esquerda e **nada à direita**: o botão `Registrar progresso` não existe no modo histórico. Sem botão de voltar, como no histórico de leituras da web: a volta é o item `Estante` da sidebar ou o voltar do navegador.
- **Coluna da esquerda, 320px, fixa ao rolar:** capa de 200 por 300px, o tipo da ocorrência abaixo do autor (mesmo desenho do mobile), a barra cheia com `Concluída`, as duas linhas de data, os três valores empilhados com divisor horizontal `linha` entre eles, como já estão, e, `space-4` abaixo do último valor, a linha de somente leitura.
- **Coluna da direita:** a tabela com as **quatro colunas** `Data`, `Página`, `Páginas lidas`, `Tempo`. **A quinta coluna, a do `Trash`, não existe**: a tabela termina em `Tempo`, e as quatro colunas ocupam a largura toda.
- **Sem hover de linha.** A linha não é acionável, então não muda de fundo, o cursor continua o padrão e a linha não recebe foco de teclado. O foco de teclado continua visível no que é interativo na tela (sidebar e a própria tabela como região rolável).
- **Abaixo de 768px** a tabela vira a lista do mobile do modo histórico, as duas colunas viram uma, a sidebar dá lugar à barra inferior e o header ganha o `ArrowLeft` do mobile.

### Linha 2, web, no fim da linha, nesta ordem

#### 5.3 `Atualizações de progresso · Web, modo histórico`

A releitura de `Dom Casmurro`. Coluna da esquerda com o resumo concluído e a linha de somente leitura; coluna da direita com a tabela das sete atualizações, a de `11 de novembro de 2025` com a célula de tempo vazia.

#### 5.4 `Atualizações de progresso · Web, modo histórico, leitura sem registros`

A leitura de `A Hora da Estrela`. Coluna da esquerda com o resumo concluído **sem os três valores**, as duas datas e a linha de somente leitura. Coluna da direita sem tabela, com o bloco de vazio de 5.2 centralizado na coluna, alinhado ao topo, sem botão.

### Linha 3, modo escuro, no fim da linha

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem. Superfície elevada fica **mais clara** que o fundo, e os shadows ficam com metade da opacidade, porque a hierarquia vem da cor de superfície e do divisor `linha-noite`.

#### 5.5 `Atualizações de progresso · Modo histórico, escuro`

O artboard 5.1 no escuro. Fundo `noite`. Título do header, título do livro, páginas informadas e números dos três valores em `papel-suave`. Autor, rótulos, detalhe dos itens, as duas linhas de data, `Concluída`, o tipo `Releitura` e a linha de somente leitura (texto e `Info`) em `grafite-claro`. `ArrowsClockwise` em `broto-vivo`. Data de cada item em `grafite-fundo-escuro`. Barra com track `musgo-fundo-escuro` e fill `musgo-claro` na largura inteira. Divisores em `linha-noite`. Barra inferior em `noite-elevada`.

#### 5.6 `Atualizações de progresso · Web, modo histórico, escuro`

O artboard 5.3 no escuro. Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Cabeçalho da tabela em `grafite-claro`, linhas separadas por `linha-noite`, células em `papel-suave` e `grafite-claro`, sem hover. Coluna da esquerda com o mesmo tratamento de 5.5.

---

## 6. Artboards a remover

Nenhum sai. Os artboards do Período 1 continuam valendo para a leitura em andamento.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Barra de progresso, com `Concluída` e data de fim no lugar de `100%` | documento-de-design §4.7 |
| Mesma página com um conjunto de ações ausente, nunca desabilitado | documento-de-design §5.8 (modo consulta), aplicado aqui ao próprio leitor |
| Card compacto do livro com capa de 60 por 90px | documento-de-design §5.4 |
| Estado vazio com desenho intencional | documento-de-design §5.1 e §8 |
| Escala tipográfica, com JetBrains Mono nos números | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell de navegação, header e barra inferior | periodo-0/P0-NAV/shell-de-navegacao.md |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Modo histórico como variante de página do próprio dono.** O §5.8 define o modo consulta para quem **não** é o dono. Aqui o dono vê a própria leitura concluída com as ações ausentes pelo **estado** do registro, não pela autoria. Vale registrar como segunda aplicação do mesmo princípio.
- **Variante concluída do bloco de resumo:** tipo da ocorrência (`Leitura` ou `Releitura` com `ArrowsClockwise` `broto`) no card compacto, barra cheia com `Concluída`, e as duas linhas `Concluída em <data>` e `Início em <data> · <N> dias`.
- **Linha de somente leitura:** `Info` de 16px e `caption` `grafite`, sem fundo, sem borda.
- **Linha de atualização sem ação** e **tabela sem coluna de ação e sem hover**.
- **Vazio sem CTA** para registro concluído sem histórico, com a linha de três valores ausente.

---

## 8. Copy nova ou alterada

Nenhuma copy do Período 1 é substituída. Entra:

| Onde | Texto |
|---|---|
| Rótulo acessível da seta, modo histórico | `Voltar ao histórico` |
| Tipo da ocorrência | `Releitura`, `Leitura` |
| Barra concluída | `Concluída` |
| Data de conclusão | `Concluída em 16 de novembro de 2025`, `Concluída em 08 de agosto de 2024` |
| Início e duração | `Início em 02 de novembro de 2025 · 14 dias`, `Início em 01 de agosto de 2024 · 7 dias` |
| Linha de somente leitura | `Leitura concluída. Os registros ficam só para consulta.` |
| Valores | `256 páginas`, `4 h 50 min`, `7 registros` |
| Itens | `página 256`, `38 páginas · 50 min`, `30 páginas` (sem tempo) |
| Vazio concluído, título | `Nenhuma atualização registrada` |
| Vazio concluído, texto | `Esta leitura foi concluída sem registros de página.` |

**Regra da duração:** `1 dia` no singular, `14 dias` no plural, sempre com unidade. **Ocorrência que atravessa o ano** usa as datas completas nas duas linhas (`Concluída em 10 de janeiro de 2026`, `Início em 28 de dezembro de 2025 · 13 dias`); sem artboard próprio.

Zero em-dash, zero emoji. Todo número tem unidade.

---

## 9. Acessibilidade e interação do que muda

- **O modo não depende de cor nem de ausência silenciosa.** A linha `Leitura concluída. Os registros ficam só para consulta.` diz em texto por que não há como registrar nem excluir, e é lida pelo leitor de tela logo depois do resumo.
- O resumo é lido como texto completo: "Releitura de Dom Casmurro, concluída em 16 de novembro de 2025, iniciada em 02 de novembro de 2025, 14 dias, 256 páginas lidas, 4 horas e 50 minutos, 7 registros".
- A barra cheia é marcada como progresso com o valor textual `Concluída`, não `100 por cento`.
- As linhas da lista e da tabela são conteúdo, não controles: não recebem foco, não têm rótulo de ação e não anunciam "botão". Na web a tabela continua navegável por teclado como tabela, com cabeçalhos associados às células.
- `ArrowLeft` com alvo de 48px e rótulo `Voltar ao histórico`; o retorno preserva ano, pesquisa e rolagem do histórico.
- Contraste WCAG AA no corpo nos dois temas. A data de cada item continua em `grafite-suave` por ser metadado; a linha de somente leitura usa `grafite`, porque é informação que o leitor precisa entender.
- `prefers-reduced-motion`: nada novo se move nesta edição; o fade único do skeleton continua como está.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não altere nenhum artboard existente.** Eles são a leitura em andamento e continuam com `PlusCircle`, `Trash`, aviso de ritmo e confirmação.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe a tela de histórico de leituras** dentro deste canvas. Ela tem canvas próprio.

**Específico do modo histórico**

- **Não desenhe as ações desabilitadas.** Nada de `Trash` em cinza, `PlusCircle` apagado, botão `Registrar progresso` desabilitado ou cadeado sobre um botão. As ações não existem neste modo.
- Não desenhe o aviso de ritmo em nenhum registro de leitura concluída.
- Não ofereça editar uma atualização. Editar não existe em nenhum modo.
- Não ofereça reabrir, retomar nem reler a partir desta tela. Uma nova releitura começa pela estante, não aqui.
- Não exiba `100%` nem `0%` na barra. Cem é `Concluída` com a data de fim, zero é `Iniciada`.
- Não mostre `0 páginas lidas` numa leitura concluída sem registros: a linha de três valores some.
- Não misture ocorrências: esta tela mostra os registros de **uma** conclusão, nunca a soma das leituras do mesmo livro.
- Não mostre nota, resenha nem estatística do ano. O histórico é de conclusões, e a nota mora na página do livro.
- Não desenhe gráfico de evolução de páginas por dia nem por mês. Estatísticas têm tela própria.
- **Não desenhe sequência diária, streak nem chama.**
- Não deixe a tabela da web forçar rolagem horizontal na página.

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
- Nada de gradiente em botão, em texto de título ou na barra de progresso.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.
- Nada de `ambar` ou `rubi` na linha de somente leitura: ela não é alerta nem erro.

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

**Métricas e dados**

- Nada de número exibido sem unidade: `256 páginas`, `4 h 50 min`, `7 registros`, `14 dias`.
- Nada de gráfico em roxo ou teal de IA, nada de gráfico com mais de três séries: esta edição não tem gráfico.
- Nada de percentual quando o valor é cem: é `Concluída`.

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
- Nada de conteúdo essencial escondido em hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
