# Descobrir (edição do Período 2)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Descobrir`, gerado por `docs/design/periodo-1/F-ACV-BUSCA/descobrir.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-ACV-BUSCA/descobrir.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-ACV-DESCOBERTA.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-REC-P2P.md
**Requisitos que entram:** F-ACV-DESCOBERTA: RF-ACV-03 (filtrar a busca por autor, editora, série, ano de publicação e faixa de número de páginas, combinável com o assunto de RF-ACV-02) · F-REC-P2P: RF-REC-13 (a "aba Recomendações", que é uma seção rotulada dentro de `Descobrir`), RF-REC-14 (a seção funciona só com a fonte P2P, sem a algorítmica), RF-REC-04 (cada recomendação mostra o livro, quem recomendou e a mensagem, quando houver), RF-REC-05 (acionar leva à página do livro)
**Não funcionais:** RNF-DES-02 (paginação com teto de itens), RNF-SEC-06 (livro pessoal nunca aparece em busca nem em filtro), RNF-USA-02, RNF-USA-03, RNF-USA-05, RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-03 (livro pessoal fora do catálogo e dos filtros), RN-21 (assunto do conjunto curado, seleção única), RN-22.2 (sem mensagem, a recomendação aparece como "Fulano te recomendou X"), RN-22.6 (sem aceitar nem recusar), RN-22.7 (vários remetentes do mesmo livro coexistem), RN-22.9 (some depois de 90 dias), RN-22.10 (some quando o leitor põe o livro na estante)
**Versão web:** sim. RF-ACV-03, RF-REC-04, RF-REC-05, RF-REC-13 e RF-REC-14 têm marcação na coluna Web de `REQUISITOS.md` §5.2 e §5.13.
**Destinos desenhados em outros prompts:** a página do livro (edição do Período 2 em `docs/design/periodo-2/pagina-do-livro/pagina-do-livro.md`) e a lista completa `Recomendações recebidas` (tela nova, `docs/design/periodo-2/F-REC-P2P/recomendacoes-recebidas.md`, **a desenhar** num lote seguinte). Aqui só existe a navegação até elas.

---

## 1. O que muda e por quê

No Período 1 a aba `Descobrir` aterrissou magra de propósito: campo de busca, faixa de assuntos e nada mais. O próprio prompt original avisava que duas coisas preencheriam a aba no Período 2. Esta edição é a chegada das duas:

- **Filtros avançados (RF-ACV-03).** A busca passa a aceitar autor, editora, série, ano de publicação e faixa de número de páginas, **combináveis** com a consulta digitada e com o assunto. No mobile os filtros moram num **bottom sheet** aberto por um botão `SlidersHorizontal` ao lado do campo de busca, que mostra quantos filtros estão ativos. Os filtros aplicados viram **chips removíveis** acima dos resultados. Na web os campos entram no **painel fixo da esquerda, abaixo dos assuntos**. A faixa de páginas é validada na hora: mínimo menor ou igual ao máximo, e os dois maiores que zero.
- **Seção `Recomendações recebidas` na aterrissagem (RF-REC-13 e RF-REC-14).** A "aba Recomendações" do requisito é uma **seção rotulada dentro de `Descobrir`**, não um quinto item de navegação (decisão de 01/09/2026, registrada em F-REC-P2P e em P0-NAV). No Período 2 só existe a fonte P2P: livros que leitores com seguimento mútuo recomendaram ao leitor. A recomendação algorítmica é F-REC-ALG, opcional, do Período 3, e **não é desenhada nem reservada**. A seção mostra as recomendações mais recentes, cada uma leva à página do livro, e `Ver todas` leva à lista completa, onde fica o descarte (RF-REC-15).

O que deixa de valer do escopo do Período 1: as proibições do prompt original contra filtros por autor, editora, série, ano e páginas, e contra qualquer seção na aterrissagem, **apenas na medida desta edição**. Destaques, mais lidos, sugestão algorítmica, histórico de busca e autocompletar continuam fora.

O mecanismo que a tela sustenta continua sendo **registro** (encontrar a edição certa para registrar) e ganha **pertencimento**: a seção de recomendações é o lugar em que o leitor vê o que os amigos acham que ele deveria ler.

O canvas continua simulando um arquivo de Figma. Os artboards novos entram **lado a lado** com os existentes, cada um simulando o viewport de um aparelho, nunca empilhados dentro do mesmo frame.

- **Linha 1:** mobile, `390 x 844`. Os artboards novos entram **no fim da linha**, na ordem da seção 5.
- **Linha 2:** web, `1440 x 900`. Novos no fim da linha.
- **Linha 3:** modo escuro. Novos no fim da linha.
- Cada artboard novo leva o **rótulo acima**, no formato `Descobrir · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.

### Dados dos artboards novos e alterados

(Os dados do Período 1 continuam valendo para o que não mudou.)

**Filtros de 5.1 e 5.3:** consulta `conceição evaristo`, `Editora: Pallas`, faixa de `100` a `150 páginas`. Resultado: `Ponciá Vicêncio` (Conceição Evaristo, Pallas, 2003, `128 páginas`, `Lendo`, `3 edições`) e `Olhos d'Água` (Conceição Evaristo, Pallas, 2014, `116 páginas`, `Quero ler`). `Becos da Memória` (`200 páginas`) fica fora pela faixa e `Insubmissas Lágrimas de Mulheres` (Nandyala) fica fora pela editora.

**Faixa invertida de 5.2 e 5.9:** mínimo `300`, máximo `150`.

**Combinação de 5.8:** consulta `conceição evaristo`, assunto `Conto`, `Editora: Pallas`. Resultado: `Olhos d'Água`, `1 livro encontrado`.

**Vazio com filtros de 5.4 e 5.10:** consulta `conceição evaristo`, `Editora: Companhia das Letras`, `Ano: 2020`.

**Recomendações recebidas** (P2P, ativas, não expiradas, nenhuma de livro que já está na estante do leitor). O leitor tem **5 recomendações**; o mobile mostra as três primeiras, a web as quatro primeiras:

| Livro | Autor | Quem recomendou | Mensagem | Quando |
|---|---|---|---|---|
| A Hora da Estrela | Clarice Lispector | Júlia Figueiredo | `Curtinho e devastador. Dá para ler num fim de semana.` | `há 2 dias` |
| Quarto de Despejo | Carolina Maria de Jesus | Caio Rezende | sem mensagem | `há 5 dias` |
| Tudo É Rio | Carla Madeira | Beatriz Okada | `Você vai odiar e entender a Lucy ao mesmo tempo.` | `há 1 semana` |
| Um Defeito de Cor | Ana Maria Gonçalves | Henrique Sampaio | sem mensagem | `há 3 semanas` |
| O Avesso da Pele | Jeferson Tenório | Júlia Figueiredo | `Lembrei de você na parte da escola.` | `há 1 mês` |

`Quarto de Despejo` usa o placeholder de capa, para o artboard mostrar o caso. A quinta recomendação só existe na lista completa.

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
Scrim: #171512 a 40% no claro e preto a 60% no escuro.
O sheet sobe em dur-slow com ease-out e sai em dur-base com ease-in. Foco
preso dentro enquanto aberto; Esc e toque no scrim fecham; o foco volta ao
elemento que abriu.

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

Tudo o que vem a seguir fica **exatamente como está no canvas**:

- **O shell inteiro.** Barra inferior do mobile com quatro itens (`Estante`, `Descobrir`, `Feed`, `Perfil`) e **Descobrir** ativo; sidebar da web com os mesmos quatro itens e **Descobrir** ativo em `musgo-fundo`. **A marca no topo da sidebar fica como está desenhada neste canvas.** O bloco MARCA da seção 2 é contexto do sistema, não instrução para trocar a marca desta tela: a troca, se houver, é decisão transversal fora desta edição. Nenhum quinto item de navegação.
- **A primeira linha do header mobile:** título `Descobrir` em `display` `tinta` à esquerda e o sino `Bell` com o badge de não lidas à direita. Sem botão de voltar.
- **O header de conteúdo da web:** título `Descobrir` e campo de busca de 44px por 560px na mesma linha, sem sino.
- **A faixa de assuntos do mobile e o painel `Assuntos` da web**, com os nove chips, seleção única, chip ativo em `musgo-fundo` com `X`.
- **O card de resultado**, variante Busca, com capa de 80 por 120px de canto vivo, título, autor, `Pallas · 2003`, `128 páginas`, status pill quando o livro está na estante, **sem nota**, e a indicação `3 edições` de `Ponciá Vicêncio`.
- **A linha de contagem** (`12 livros encontrados`), a paginação por rolagem no mobile e o grid de duas colunas na web.
- **Os estados de carregamento, nenhum resultado e erro** do Período 1, com a copy deles, inclusive o vazio que leva ao cadastro (`Cadastrar por ISBN`, `Cadastrar livro pessoal`). Esse vazio continua valendo para a busca **sem** filtros avançados.
- **A ordem dos artboards existentes** em cada linha. Os novos entram depois deles.

---

## 4. Artboards que mudam

### 4.1 Todos os artboards mobile existentes: botão de filtros na segunda linha do header

Vale para `Descobrir · Resultados`, `Descobrir · Filtro por assunto ativo`, `Descobrir · Carregando`, `Descobrir · Nenhum resultado`, `Descobrir · Erro de carregamento`, `Descobrir · Aterrissagem, antes de buscar` e o mobile do modo escuro.

- A segunda linha do header deixa de ter só o campo. Agora: **campo de busca** ocupando a largura restante, `space-3` de gap, e o **botão de filtros** à direita.
- O campo mantém tudo o que tem (48px, `radius` 12, borda `linha`, fundo `papel-elevado`, `MagnifyingGlass` dentro à esquerda, `X` para limpar quando há texto). Só fica mais estreito.
- **Botão de filtros, sem filtro ativo:** quadrado de 48 por 48px, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, `SlidersHorizontal` (Phosphor, `regular`, 20px, `grafite`) centralizado. Sem texto visível. Rótulo acessível `Filtros`.
- Em todos esses artboards existentes o botão está **sem filtro ativo**. O estado com filtro ativo aparece só nos artboards novos (seção 5).
- Nada mais muda nesses artboards, com exceção da aterrissagem, descrita em 4.2.

### 4.2 `Descobrir · Aterrissagem, antes de buscar` (mobile)

Entra a seção de recomendações. O resto do artboard continua: campo vazio **sem foco automático e sem teclado**, placeholder `Título, autor, editora ou ISBN`, faixa de assuntos sem seleção, barra inferior com **Descobrir** ativo.

Abaixo da faixa de assuntos, com `space-6` de respiro:

1. **Cabeçalho da seção**, padding lateral `space-5`: título `Recomendações recebidas` em `title-lg` `tinta` à esquerda e, à direita, na mesma linha de base, o botão textual `musgo` `Ver todas`. O título diz de onde vem o conteúdo, porque RF-REC-13 pede seções rotuladas por fonte.
2. `space-3` abaixo, **lista de três recomendações**, as mais recentes primeiro, separadas por divisor de 1px `linha`, cada item com `space-4` de padding vertical e padding lateral `space-5`:
   - Capa de 60 por 90px à esquerda, retângulo de canto vivo, sem raio. Placeholder `capa-placeholder` com o título centralizado quando não há capa.
   - `space-4` de gap até o bloco de texto.
   - Título em `title-sm` `tinta`, no máximo duas linhas com reticências.
   - Autor em `body` `grafite`, uma linha.
   - `space-2` abaixo, **linha de atribuição**: avatar circular de 20px, `space-2` de gap, o texto em `caption`: nome de quem recomendou em peso 600 `tinta` seguido de `te recomendou` em `grafite`, e depois ` · há 2 dias` em `grafite-suave`. É a forma literal de RN-22.2: `Júlia Figueiredo te recomendou`.
   - Quando há mensagem, `space-2` abaixo: a mensagem em `body` `grafite`, no máximo duas linhas com reticências. Sem aspas decorativas, sem ícone de balão, sem serifa: é texto do remetente, não resenha nem frase de livro.
   - **O item inteiro é a área acionável** e leva à página do livro (RF-REC-05). Não há botão, menu nem ícone dentro do item: descartar mora na lista completa.
   - **Nenhum item tem status pill.** Recomendação de livro que o leitor já pôs na estante é removida (RN-22.10) e o envio para quem já tem o livro é bloqueado (RN-22.3), então esse caso não existe.
3. O conteúdo passa por baixo da barra inferior normalmente. A seção não tem paginação na aterrissagem: são no máximo três itens, e o resto está em `Ver todas`.

`Ver todas` aparece sempre que existe **pelo menos uma** recomendação, mesmo que sejam três ou menos, porque a lista completa é onde o leitor descarta (RF-REC-15).

Quando o leitor digita uma consulta, toca um assunto ou aplica um filtro, a seção sai e os resultados ocupam o lugar dela. **A seção existe só na aterrissagem.**

### 4.3 Todos os artboards web existentes: bloco `Filtros` no painel da esquerda

Vale para `Descobrir · Resultados`, `Descobrir · Filtro por assunto ativo`, `Descobrir · Carregando`, `Descobrir · Nenhum resultado`, `Descobrir · Aterrissagem, antes de buscar` (web) e o web do modo escuro.

- O painel da esquerda, de 240px, continua começando por `Assuntos`. **Abaixo da lista de assuntos**, `space-6` de respiro e um divisor de 1px `linha` na largura do painel, depois `space-6` e o bloco **`Filtros`**:
  - Título do bloco `Filtros` em `label` `grafite`, no mesmo estilo de `Assuntos`.
  - `space-3` abaixo, os campos empilhados com `space-4` entre eles, todos com 44px de altura (medida de web), largura total do painel, label acima em `label` `grafite`: `Autor`, `Editora`, `Série`, `Ano de publicação`, `Mínimo de páginas`, `Máximo de páginas`. Os dois de páginas têm o sufixo `páginas` em `caption` `grafite-suave` dentro do campo, à direita.
  - Abaixo dos dois campos de páginas, o helper em `caption` `grafite`, visível o tempo todo: `Use números inteiros maiores que zero.`
  - `space-5` abaixo, botão secundário de largura total do painel, 40px, `radius` 12, borda de 1px `linha`, texto `tinta` em `body-strong`: `Aplicar filtros`. Abaixo dele, botão textual `musgo`: `Limpar filtros`, que só aparece quando algum campo está preenchido.
- O painel é uma coluna do fluxo da página: ele **rola junto com a página**, e nos artboards existentes o bloco `Filtros` é cortado naturalmente pela borda inferior da viewport. Nada de artboard esticado.
- Em todos esses artboards existentes os campos estão vazios, com placeholders `Nome do autor`, `Nome da editora`, `Nome da série`, `Ex.: 2019`, e os de páginas sem placeholder.
- **Abaixo de 768px** o bloco `Filtros` sai do painel e vira o botão de filtros com sheet do mobile, assim como o painel de assuntos vira a faixa rolável.

### 4.4 `Descobrir · Aterrissagem, antes de buscar` (web)

A coluna da direita, que no Período 1 ficava vazia de propósito, recebe a seção de recomendações. O painel da esquerda fica como em 4.3, sem seleção e com os filtros vazios. O campo do header continua vazio e **sem foco automático**. Sem linha de contagem.

Na coluna da direita, alinhado ao topo das colunas:

- Cabeçalho da seção: `Recomendações recebidas` em `title-lg` `tinta` à esquerda e `Ver todas` em botão textual `musgo` à direita.
- `space-4` abaixo, **grid de duas colunas** com gap `space-5`, com **quatro** recomendações, as mais recentes primeiro. Cada item tem o mesmo conteúdo do mobile (4.2), com a capa em 80 por 120px, padding `space-4`, `radius` 12 e fundo transparente.
- `hover` no item: fundo `papel-elevado`, transição `dur-fast`, igual ao card de resultado. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Nada de outra seção** ao lado ou abaixo: sem `Sugestões para você`, sem destaques, sem espaço reservado para a recomendação algorítmica.

### 4.5 Artboards do modo escuro existentes

- **Mobile, resultados.** O botão de filtros entra na segunda linha do header, sem filtro ativo: fundo `noite-elevada`, borda de 1px `linha-noite`, `SlidersHorizontal` em `grafite-claro`.
- **Web, resultados.** O bloco `Filtros` entra no painel: divisor `linha-noite`, título em `grafite-claro`, labels em `grafite-claro`, campos com fundo `noite-elevada` e borda `linha-noite`, placeholders em `grafite-fundo-escuro`, `Aplicar filtros` com borda `linha-noite` e texto `papel-suave`.

---

## 5. Artboards novos

### Mobile (390 x 844), no fim da linha 1, nesta ordem

#### 5.1 `Descobrir · Filtros`

O sheet de filtros aberto sobre o artboard de resultados.

- **Fundo:** o estado `Descobrir · Resultados` inteiro (consulta `conceição evaristo`, `12 livros encontrados`) sob o scrim `#171512` a 40%.
- **Bottom sheet** ancorado embaixo, largura total, fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha` centralizada com `space-5` acima do conteúdo. O sheet ocupa a altura que o conteúdo pede, sem cobrir o header inteiro.
- Título `Filtros` em `title` `tinta`, alinhado à esquerda.
- `space-2` abaixo, texto em `body` `grafite`: `Preencha só o que quiser usar. Os filtros valem junto com a busca e o assunto.`
- `space-5` abaixo, os campos, com `space-4` entre grupos, cada um com label acima em `label` `grafite`, 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`:
  - `Autor`, vazio, placeholder `Nome do autor`.
  - `Editora`, preenchido com `Pallas`.
  - `Série`, vazio, placeholder `Nome da série`.
  - `Ano de publicação`, vazio, placeholder `Ex.: 2019`, teclado numérico.
  - **Faixa de páginas:** dois campos lado a lado com `space-3` de gap, cada um com a metade da largura: `Mínimo de páginas` preenchido com `100` e `Máximo de páginas` preenchido com `150`. Cada um com o sufixo `páginas` em `caption` `grafite-suave` dentro do campo, à direita. Teclado numérico.
  - Abaixo da faixa, o helper em `caption` `grafite`, visível o tempo todo: `Use números inteiros maiores que zero.`
- `space-6` abaixo, botão primário pill de largura total, 48px, fundo `musgo`, texto `papel` em `body-strong`: `Aplicar filtros`.
- `space-3` abaixo, botão textual `musgo` centralizado: `Limpar filtros`.
- **Não há `X` de fechar:** a alça, o toque no scrim e o gesto de voltar fecham o sheet sem aplicar.
- Os campos de texto **não têm autocompletar** nem lista de sugestões abaixo deles.

#### 5.2 `Descobrir · Filtros com erro na faixa de páginas`

Mesmo sheet de 5.1, com a faixa invertida.

- `Mínimo de páginas` com `300` e `Máximo de páginas` com `150`, os dois com borda de 1.5px `rubi`.
- Abaixo do par, `space-2`, a mensagem em `caption` `rubi`: `O mínimo não pode ser maior que o máximo.` O helper `Use números inteiros maiores que zero.` continua visível logo abaixo da mensagem.
- A validação acontece quando o leitor sai do campo, não a cada dígito.
- `Aplicar filtros` continua com a aparência normal. Tocar nele com o erro presente **não fecha o sheet**: o foco vai para `Mínimo de páginas` e a mensagem é anunciada.
- Mesma regra para zero ou número negativo, com a mensagem `Use um número de páginas maior que zero.` sob o campo que errou. Este artboard mostra só o caso da faixa invertida.

#### 5.3 `Descobrir · Filtros aplicados`

Resultado depois de aplicar os filtros de 5.1.

1. Header de duas linhas: campo com `conceição evaristo` e o **botão de filtros com filtro ativo**: fundo `musgo-fundo`, sem borda, `SlidersHorizontal` em peso `fill` e cor `musgo`, e o **badge de contagem** encostado no canto superior direito do botão: círculo de 18px, fundo `musgo`, número `2` centralizado em 11px peso 600 cor `papel`. É o mesmo badge do sino. Rótulo acessível `Filtros, 2 ativos`. A contagem é de filtros avançados: a faixa de páginas conta como um, e o assunto não entra na conta porque tem a própria faixa.
2. Faixa de assuntos, nenhum chip ativo.
3. `space-3` abaixo, **fileira de filtros aplicados**, padding lateral `space-5`, chips com `space-2` de gap que **quebram em linhas** (não rolam): `Editora: Pallas` e `100 a 150 páginas`. Cada chip no estilo do chip ativo: `radius-full`, padding `space-2 space-4`, fundo `musgo-fundo`, texto em `caption` peso 600 `musgo`, `X` (Phosphor, `regular`, 16px, `musgo`) à direita, que remove só aquele filtro. No fim da fileira, na mesma linha quando couber, botão textual em `caption` peso 600 `musgo`: `Limpar filtros`.
4. `space-3` abaixo, linha de contagem: `2 livros encontrados`.
5. Lista com os dois resultados, no card de busca de sempre: `Ponciá Vicêncio` (`Pallas · 2003`, `128 páginas`, pill `Lendo`, `3 edições`) e `Olhos d'Água` (Pallas · 2014, `116 páginas`, pill `Quero ler`).
6. Barra inferior com **Descobrir** ativo.

Formatos do chip de faixa: com os dois limites, `100 a 150 páginas`; só com o mínimo, `A partir de 100 páginas`; só com o máximo, `Até 150 páginas`. Os demais: `Autor: <nome>`, `Editora: <nome>`, `Série: <nome>`, `Ano: <ano>`.

#### 5.4 `Descobrir · Nenhum resultado com filtros`

O vazio quando a combinação de consulta e filtros não devolve nada. É diferente do vazio do Período 1: aqui o livro pode existir, só não passa nos filtros, então a saída é afrouxar os filtros e não cadastrar.

- Header com `conceição evaristo` e o botão de filtros ativo com badge `2`.
- Faixa de assuntos sem seleção e fileira de filtros aplicados com `Editora: Companhia das Letras` e `Ano: 2020`, mais `Limpar filtros`.
- Sem linha de contagem.
- Bloco centralizado no espaço restante, com `space-6` entre os elementos:
  - `SlidersHorizontal` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhum livro com esses filtros`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 280px: `Remova um filtro ou amplie a faixa de páginas para ver mais resultados.`
  - Botão primário pill, 48px, fundo `musgo`, texto `papel`: `Limpar filtros`.
- **Sem `Cadastrar por ISBN` neste vazio.** O cadastro volta a aparecer se o leitor limpar os filtros e a busca continuar sem resultado, que é o vazio do Período 1.

#### 5.5 `Descobrir · Aterrissagem sem recomendações`

A aterrissagem de quem ainda não recebeu nenhuma recomendação, ou teve todas descartadas, expiradas ou removidas ao pôr o livro na estante.

- Tudo igual a 4.2 até a faixa de assuntos.
- Seção com o título `Recomendações recebidas` em `title-lg` `tinta`, **sem** `Ver todas`, porque não há lista para ver.
- `space-2` abaixo, uma linha em `body` `grafite`, alinhada à esquerda, sem ícone, sem ilustração, sem caixa: `Livros que outros leitores recomendarem para você aparecem aqui.`
- Nada abaixo disso. A seção fica porque é o único lugar do produto que diz onde as recomendações aparecem; ela não vira um bloco de vazio centralizado e não ganha botão.

#### 5.6 `Descobrir · Aterrissagem carregando recomendações`

- Header, botão de filtros e faixa de assuntos completos e reais.
- Seção com o título real `Recomendações recebidas` e sem `Ver todas`.
- No lugar dos itens, **três esqueletos estáticos** com a forma do item: retângulo `capa-placeholder` de 60 por 90px e, à direita, três barras em `capa-placeholder` com `radius-sm`, larguras de 70%, 45% e 55%, alturas de 17px, 15px e 13px, com `space-2` entre elas. Separados pelo divisor `linha`.
- Um único fade de entrada em `dur-base` com `ease-out`. Sem shimmer, sem spinner. Este é também o estado do cold start (RNF-ERR-09).
- A busca e os assuntos funcionam enquanto a seção carrega.

#### 5.7 `Descobrir · Recomendações indisponíveis`

Falha só da seção: a busca e os assuntos continuam utilizáveis.

- Header, botão de filtros e faixa de assuntos completos e reais.
- Seção com o título `Recomendações recebidas`, sem `Ver todas`.
- No lugar dos itens, o banner inline do Período 1: largura total menos o padding `space-5`, fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda com `space-3` de gap, texto em `body` `tinta`: `Não foi possível carregar suas recomendações. Verifique sua conexão e tente de novo.`, e abaixo o botão textual `musgo` `Tentar de novo`.

### Web (1440 x 900), no fim da linha 2, nesta ordem

#### 5.8 `Descobrir · Filtros aplicados com assunto`

Mostra a combinação de consulta, assunto e filtro avançado.

- Campo do header com `conceição evaristo`.
- Painel da esquerda: `Conto` ativo em `Assuntos` (fundo `musgo-fundo`, texto `musgo`); no bloco `Filtros`, `Editora` preenchido com `Pallas` e os demais vazios. O bloco é cortado pela borda inferior da viewport onde a página continua.
- Linha de contagem à direita: `1 livro encontrado`.
- Coluna da direita: no topo, a **fileira de filtros aplicados** com o chip `Editora: Pallas` e `Limpar filtros`, no mesmo estilo do mobile (5.3). O assunto não vira chip nesta fileira: ele já aparece ativo no painel.
- `space-4` abaixo, o grid com um card: `Olhos d'Água`, Conceição Evaristo, `Pallas · 2014`, `116 páginas`, pill `Quero ler`. A segunda coluna do grid fica vazia, sem placeholder.

#### 5.9 `Descobrir · Filtros com erro na faixa de páginas`

- A página aparece **rolada até o bloco `Filtros`**: o header de conteúdo saiu pela borda superior, a sidebar continua fixa na altura total. O fim da lista de assuntos aparece no topo do painel.
- No bloco `Filtros`: `Mínimo de páginas` com `300` e `Máximo de páginas` com `150`, os dois com borda de 1.5px `rubi`, e abaixo deles a mensagem em `caption` `rubi` `O mínimo não pode ser maior que o máximo.` seguida do helper `Use números inteiros maiores que zero.`
- `Aplicar filtros` com o foco de teclado visível (contorno de 2px `musgo`, offset de 2px), como quem acabou de tentar aplicar. A coluna da direita continua mostrando os resultados anteriores, sem mudança: o filtro inválido não é enviado.

#### 5.10 `Descobrir · Nenhum resultado com filtros`

- Campo com `conceição evaristo`, painel com `Editora` `Companhia das Letras` e `Ano de publicação` `2020`.
- Coluna da direita: fileira de filtros aplicados no topo, e abaixo o bloco centralizado de 5.4, com a mesma copy e o botão primário pill de 40px `Limpar filtros`.

#### 5.11 `Descobrir · Aterrissagem sem recomendações`

- Painel da esquerda como em 4.3, sem seleção, filtros vazios.
- Coluna da direita: o título `Recomendações recebidas` e a linha `Livros que outros leitores recomendarem para você aparecem aqui.` em `body` `grafite`, alinhados à esquerda no topo da coluna. Nada mais.

### Modo escuro, no fim da linha 3, nesta ordem

Lock de página inteira. Superfície elevada **mais clara** que o fundo, `musgo-claro` como acento, shadows com metade da opacidade.

#### 5.12 `Descobrir · Filtros` (escuro, mobile)

Equivalente a 5.1. Resultados atrás em `noite`, sob scrim preto a 60%. Sheet em `noite-elevada`, **mais claro** que o fundo, alça em `linha-noite`. Título em `papel-suave`, texto de apoio e labels em `grafite-claro`. Campos com fundo `noite` para contrastar com o sheet, borda `linha-noite`, texto digitado em `papel-suave`, placeholder e sufixo `páginas` em `grafite-fundo-escuro`, foco com borda de 1.5px `musgo-claro`. Helper em `grafite-claro`. `Aplicar filtros` com fundo `musgo-claro` e texto `noite`; `Limpar filtros` em `musgo-claro`.

#### 5.13 `Descobrir · Aterrissagem` (escuro, mobile)

Equivalente a 4.2. Fundo `noite`. Campo em `noite-elevada` com borda `linha-noite` e placeholder `grafite-fundo-escuro`. Botão de filtros com fundo `noite-elevada`, borda `linha-noite` e ícone `grafite-claro`. Chips inativos com borda `linha-noite` e texto `grafite-claro`. Título da seção em `papel-suave`, `Ver todas` em `musgo-claro`. Título do livro em `papel-suave`, autor e mensagem em `grafite-claro`, nome de quem recomendou em `papel-suave`, `te recomendou` em `grafite-claro`, tempo em `grafite-fundo-escuro`. Divisor `linha-noite`. Placeholder de capa em `capa-placeholder-noite`. Barra inferior em `noite-elevada` com **Descobrir** em `musgo-claro`.

#### 5.14 `Descobrir · Filtros aplicados com assunto` (escuro, web)

Equivalente a 5.8. Sidebar em `noite-elevada` sobre conteúdo em `noite`, **Descobrir** ativo em `musgo-fundo-escuro`. Painel com `Conto` ativo em `musgo-fundo-escuro` e texto `musgo-claro`, campos em `noite-elevada` com borda `linha-noite`. Chip `Editora: Pallas` com fundo `musgo-fundo-escuro`, texto e `X` em `musgo-claro`. Card com título `papel-suave`, autor `grafite-claro`, metadados `grafite-fundo-escuro`, pill `Quero ler` com borda `linha-noite` e texto `papel-suave`.

---

## 6. Artboards a remover

Nenhum sai. Os artboards do Período 1 continuam no canvas com as mudanças da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Bottom sheet de formulário curto | documento-de-design §4.11 |
| Input com label, foco, erro e helper | documento-de-design §4.2 |
| Botão primário pill, secundário e textual | documento-de-design §4.1 |
| Card de livro, variante Busca | documento-de-design §4.5 |
| Padrão de tela Descobrir | documento-de-design §5.7 |
| Badge de contagem (o mesmo do sino) | shell, periodo-0/P0-NAV/shell-de-navegacao.md |
| Chip de assunto com estado ativo | nasceu em periodo-1/F-ACV-BUSCA/descobrir.md, incorporação pendente |
| Campo com sufixo de unidade dentro | nasceu em periodo-1/F-PRG/registrar-progresso.md, incorporação pendente |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3, não ficam decididos só neste prompt:

1. **Botão de filtros com contagem:** quadrado de 48px ao lado do campo de busca, estado inativo com borda e estado ativo em `musgo-fundo` com ícone `fill` e o badge de contagem do sino.
2. **Fileira de filtros aplicados:** chips no estilo do chip ativo, com rótulo `Campo: valor`, que quebram em linhas, mais `Limpar filtros` no fim.
3. **Faixa numérica com validação cruzada:** dois campos (mínimo e máximo) com sufixo de unidade, erro nos dois quando a faixa se inverte e mensagem única abaixo do par.
4. **Bloco `Filtros` no painel lateral da web**, abaixo dos assuntos, com aplicação explícita por `Aplicar filtros`.
5. **Item de recomendação recebida:** capa, título, autor, linha de atribuição com avatar de 20px no formato `<nome> te recomendou · <tempo>` e mensagem opcional em duas linhas. A tela `Recomendações recebidas` deve reutilizar o mesmo item.
6. **Seção de aterrissagem** com título e `Ver todas`, e o vazio em uma linha de texto, sem ícone nem botão.

O §5.7 do `documento-de-design.md` diz que a aterrissagem não tem destaques nem histórico. Esta edição acrescenta a seção de recomendações recebidas, que não é curadoria de destaque; a frase do §5.7 precisa ser ajustada no mesmo controle de mudança.

---

## 8. Copy nova ou alterada

| Onde | Antes | Agora |
|---|---|---|
| Rótulo acessível do botão de filtros | não existia | `Filtros` / `Filtros, 2 ativos` |
| Título do sheet e do bloco web | não existia | `Filtros` |
| Texto de apoio do sheet | não existia | `Preencha só o que quiser usar. Os filtros valem junto com a busca e o assunto.` |
| Labels | não existiam | `Autor`, `Editora`, `Série`, `Ano de publicação`, `Mínimo de páginas`, `Máximo de páginas` |
| Placeholders | não existiam | `Nome do autor`, `Nome da editora`, `Nome da série`, `Ex.: 2019` |
| Sufixo dos campos de páginas | não existia | `páginas` |
| Helper da faixa | não existia | `Use números inteiros maiores que zero.` |
| Erro de faixa invertida | não existia | `O mínimo não pode ser maior que o máximo.` |
| Erro de zero ou negativo | não existia | `Use um número de páginas maior que zero.` |
| Ação de aplicar (mobile e web) | não existia | `Aplicar filtros` |
| Ação de limpar | não existia | `Limpar filtros` |
| Chips aplicados | não existiam | `Autor: <nome>`, `Editora: Pallas`, `Série: <nome>`, `Ano: 2020`, `100 a 150 páginas`, `A partir de 100 páginas`, `Até 150 páginas` |
| Contagem, filtros | não existia | `2 livros encontrados`, `1 livro encontrado` |
| Vazio com filtros, título | não existia | `Nenhum livro com esses filtros` |
| Vazio com filtros, texto | não existia | `Remova um filtro ou amplie a faixa de páginas para ver mais resultados.` |
| Título da seção | não existia | `Recomendações recebidas` |
| Ação da seção | não existia | `Ver todas` |
| Atribuição | não existia | `Júlia Figueiredo te recomendou · há 2 dias` |
| Tempos | não existiam | `há 2 dias`, `há 5 dias`, `há 1 semana`, `há 3 semanas`, `há 1 mês` |
| Seção vazia | não existia | `Livros que outros leitores recomendarem para você aparecem aqui.` |
| Erro da seção | não existia | `Não foi possível carregar suas recomendações. Verifique sua conexão e tente de novo.` |
| Ação do erro | já existia | `Tentar de novo` |

Toda a copy do Período 1 que não aparece nesta tabela continua igual. Zero em-dash, zero emoji, nenhum número sem unidade.

---

## 9. Acessibilidade e interação do que muda

- O botão de filtros tem 48 por 48px de área de toque e rótulo acessível que inclui a contagem (`Filtros, 2 ativos`). A contagem **não depende de cor**: o número está escrito no badge, e o estado ativo também troca o ícone para `fill`.
- Cada `X` dos chips aplicados tem área de toque de 48px e rótulo acessível `Remover filtro Editora: Pallas`. `Limpar filtros` também tem 48px de altura tocável, mesmo com o texto em `caption`.
- O sheet prende o foco enquanto aberto; ao fechar, o foco volta ao botão de filtros. Ao abrir, o foco vai para o título `Filtros`, não para o primeiro campo, para o teclado não subir sozinho.
- Erro da faixa: os dois campos ficam com borda `rubi` **e** a mensagem em texto, anunciada por leitor de tela quando aparece. A cor nunca é o único sinal.
- Campos de ano e de páginas abrem teclado numérico no mobile e aceitam só inteiros.
- Na web, a ordem de tabulação vai da sidebar para o campo de busca, do campo para `Assuntos`, de `Assuntos` para os campos de `Filtros`, depois `Aplicar filtros`, `Limpar filtros`, a fileira de chips aplicados e os resultados. `Enter` num campo do bloco `Filtros` equivale a `Aplicar filtros`.
- A contagem de resultados continua anunciada quando muda, inclusive ao remover um chip.
- Cada item de recomendação é um único alvo acionável, com rótulo acessível que junta livro, autor, quem recomendou e a mensagem: `A Hora da Estrela, de Clarice Lispector. Júlia Figueiredo te recomendou há 2 dias: Curtinho e devastador. Dá para ler num fim de semana.`
- A mensagem cortada em duas linhas não esconde informação essencial: a mensagem inteira está na lista completa e no rótulo acessível.
- A aterrissagem continua **sem foco automático no campo**, com ou sem recomendações.
- `prefers-reduced-motion` respeitado: o sheet entra e sai sem deslizar, e o fade dos esqueletos vira estático.

---

## 10. O que não fazer nesta edição

**Regras da edição**

- **Não redesenhe o que não foi citado.** Shell, primeira linha do header, cards de resultado, estados de carregamento, erro e vazio do Período 1 ficam como estão.
- **Não reordene os artboards existentes.** Os novos entram no fim de cada linha.
- **Não troque a marca da sidebar** neste canvas.
- Não reintroduza o que o prompt original proibia e continua valendo: livro pessoal nos resultados, nota nos cards, multisseleção de assunto, quinto item de navegação, botão de voltar no header, campo com foco automático, numeração de página no mobile, fusão de edições.

**Filtros**

- Não desenhe autocompletar, sugestão de busca nem lista suspensa nos campos de autor, editora ou série.
- Não transforme os filtros avançados em faixa rolável de chips como a dos assuntos, nem em tela cheia.
- Não conte o assunto no badge do botão de filtros.
- Não repita o assunto ativo na fileira de filtros aplicados.
- Não desenhe slider de faixa para as páginas: são dois campos numéricos com label.
- Não aplique os filtros a cada tecla. Aplicar é explícito, por `Aplicar filtros`.
- Não ofereça cadastro no vazio com filtros.

**Recomendações**

- **Não desenhe a recomendação algorítmica.** Nada de `Sugestões para você`, `Porque você leu`, `Do seu gosto` ou qualquer seção ou espaço reservado para ela: é opcional e de outro período.
- Não desenhe destaques, mais lidos, lançamentos nem livros populares.
- Não desenhe `Aceitar`, `Recusar`, `Descartar`, menu de três pontos nem qualquer ação dentro do item de recomendação. O descarte mora na lista completa.
- Não desenhe status pill no item de recomendação.
- Não desenhe contagem regressiva de expiração nem data de expiração.
- Não desenhe botão `Recomendar` nesta tela: recomendar parte da página do livro.
- Não desenhe a seção junto com resultados de busca: ela existe só na aterrissagem.
- Não desenhe carrossel horizontal de recomendações no mobile: é lista vertical.
- Não use serifa na mensagem do remetente.

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
- Nada de label poético. O título diz o que a coisa é: `Recomendações recebidas`, não "Para você" nem "Escolhas dos amigos".
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de placeholder de capa com livro genérico ilustrado.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.

**Formulários**

- Nada de placeholder no lugar do label. Label sempre acima do campo.
- Nada de helper que só aparece depois do erro. O helper da faixa é visível o tempo todo.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.

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

- Nada de número exibido sem unidade. Nunca "150" sozinho: é "150 páginas", "2 livros encontrados".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários. A mensagem da recomendação é opcional, de uma via, e não abre conversa.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
