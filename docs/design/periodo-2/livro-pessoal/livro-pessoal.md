# Página do livro pessoal (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Livro pessoal`, gerado por `docs/design/periodo-1/F-ACV-CADASTRO/livro-pessoal.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-ACV-CADASTRO/livro-pessoal.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-AVA-2.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-LST.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-MOD.md
**Requisitos que entram:**
- F-AVA-2: RF-AVA-05 (terceiro com acesso curte ou descurte a resenha do dono, uma reação por resenha), RF-AVA-08 (contagens de curtidas e descurtidas separadas, visíveis a todos que têm acesso à resenha, o dono incluído), RF-AVA-06 (só a entrada `Adicionar frase`, para o dono), RF-AVA-07 (as frases do dono na página, e a entrada `Ver todas as frases`), RF-AVA-09 (resenha renderizada em Markdown; o editor é outra edição)
- F-LST: RF-LST-05 (só a entrada `Adicionar à lista`, para o dono), RF-LST-06 (terceiro chega também pela lista do dono e vê a página em modo consulta)
- F-MOD: RF-MOD-01 (só a entrada `Denunciar resenha`, para o terceiro)

**Não funcionais:** RNF-SEC-02 (propriedade e acesso validados no servidor), RNF-SEC-06 (livro pessoal continua fora de busca, catálogo e páginas de autor, editora e série), RNF-SEC-07 (terceiro não age sobre o livro), RNF-SEC-15 (Markdown com HTML desabilitado e saída sanitizada), RNF-SEC-18 (rate limiting em reagir e denunciar), RNF-ERR-04 (reagir é idempotente), RNF-USA-04 (denúncia com confirmação, na tela de denúncia)
**Regras de negócio:** RN-03 (tabela do livro pessoal: curtir, descurtir e denunciar a resenha são permitidos a terceiros), RN-11 (frase com página obrigatória, até 500 caracteres, 10 por leitor e livro), RN-13 (subconjunto de Markdown), RN-15 (duas vias de acesso de terceiros, feed e lista do dono; modo consulta; privacidade herdada; frases de livro pessoal só do dono)
**Versão web:** sim. RF-AVA-05 a 09, RF-LST-05, RF-LST-06 e RF-MOD-01 têm marcação na coluna Web de `REQUISITOS.md`.

---

## 1. O que muda e por quê

Três features do Período 2 mexem na página do livro pessoal, e entram juntas nesta edição para não disputarem o mesmo espaço (o menu do dono e o rodapé da resenha). **A página continua sendo a mesma:** hero centralizado, etiqueta `Livro pessoal`, ficha só com `Páginas`, bloco de leitura do dono, sinopse, nota e resenha, e os dois públicos, dono e terceiro em modo consulta.

| O que entra | Onde | Para quem | Feature |
|---|---|---|---|
| Item `Adicionar à lista` no menu do header (mobile) e botão ao lado de `Editar` (web), abrindo o sheet `Adicionar à lista` | Menu `DotsThreeVertical` do dono | Dono | F-LST |
| Terceiro chega **também pela lista do dono**, não só pelo feed | Nenhum elemento novo: a página em modo consulta é a mesma nas duas vias | Terceiro | F-LST |
| Curtir e descurtir **ativos**, com as duas contagens separadas | Rodapé da resenha | Terceiro | F-AVA-2 |
| Contagens de curtidas e descurtidas **só para leitura** | Rodapé de `Sua resenha` | Dono | F-AVA-2 |
| Corpo da resenha renderizado em Markdown (subconjunto de RN-13) | Corpo da resenha | Os dois | F-AVA-2 |
| Seção `Frases e trechos` com as frases do dono, `Ver todas as frases` e `Adicionar frase` | Depois da resenha | **Só o dono** | F-AVA-2 |
| Menu da resenha com `Denunciar resenha`, que substitui o botão textual `Denunciar` | Cabeçalho da seção `Resenha de Rafaela` | Terceiro | F-MOD |

**O que deixa de valer do prompt do Período 1:**

- **"Um terceiro chega exclusivamente pelo feed" deixou de valer.** RN-15 tem duas vias de acesso de terceiros: o **feed** (atividade do dono que referencia o livro, a via principal) e a **lista do dono** (livro pessoal que o dono pôs numa lista dele, a via secundária). As duas levam à **mesma** página em modo consulta, com a mesma verificação no servidor e a mesma privacidade herdada do perfil do dono (RN-08). Conhecer o endereço da página continua não dando acesso.
- **Os botões de curtir, descurtir e `Denunciar` desenhados no estado inativo** passam a funcionar. O botão textual `Denunciar` sai e dá lugar ao menu da resenha, como na página do livro oficial.
- Todas as outras regras daquele prompt continuam valendo, e a seção 10 abaixo as repete.

**O modo consulta continua sem nenhuma ação sobre o livro.** Nada de adicionar à estante, favoritar, iniciar leitura, registrar progresso, adicionar a uma lista, recomendar, editar ou excluir, e **nada do `DotsThreeVertical` no header**. O que o terceiro pode fazer é só sobre a **resenha**: reagir e denunciar (RN-15.4). Recomendar livro pessoal é proibido em qualquer modo (RF-REC-06), então o menu do dono também não tem `Recomendar a um leitor`. **As frases de livro pessoal são só do dono** (RN-15): o terceiro não vê a seção, nem vazia.

**Os destinos das novas ações são outras telas, desenhadas em outros canvases.** Esta edição desenha só o ponto de entrada e, quando há, o menu aberto:

| Ação | Destino |
|---|---|
| `Adicionar à lista` | sheet `F-LST/adicionar-a-lista.md`, que já desenha o caso do livro pessoal da própria leitora com a faixa `Livro pessoal: quem puder ver a lista vê este livro em modo consulta, sem poder adicioná-lo à estante.` |
| `Ver todas as frases` | tela `F-AVA-2/frases-do-livro.md`, variante de livro pessoal: todas as referências dizem `você` |
| `Adicionar frase` | sheet `F-AVA-2/adicionar-frase.md`, com o helper da página `Entre 1 e 184.` |
| `Denunciar resenha` | tela `F-MOD/denunciar.md`; o motivo e a confirmação moram lá |

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Livro pessoal · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame. Os rótulos novos seguem o padrão que o canvas já usa: sem prefixo na linha mobile, prefixo `Web,` na linha web e prefixo `Escuro,` na linha escura.
- Os artboards novos entram **no fim da linha** da sua plataforma, depois dos existentes, sem reordenar nenhum.
- Os artboards existentes continuam mostrando o **topo da página**. Os artboards novos marcados como `(rolada)` mostram a página **rolada até a seção indicada**, com o header fixo no topo (com o divisor `linha` na base, porque o conteúdo rola por baixo dele) e a barra inferior fixa no rodapé.

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
Esta tela é a página do livro pessoal: herda a linguagem da página do livro
um passo mais contida, em DESIGN_VARIANCE 6 (ver a nota abaixo do bloco).

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

**Nota sobre a variance desta tela.** A página do livro oficial sobe a `DESIGN_VARIANCE` para 7, com hero centrado e serifa em três blocos. Esta página herda aquela linguagem um passo mais contida, em 6, como no Período 1: o livro pessoal é um objeto de uma pessoa só. Nada nesta edição muda isso.

---

## 3. O que permanece intocado

- **O shell inteiro**, exatamente como está no canvas: barra inferior do mobile, sidebar da web e a marca na sidebar do jeito que já aparece. O item ativo continua o da área de onde se chegou à página. Esta edição não mexe em navegação.
- **O header mobile:** 72px mais a área segura, `ArrowLeft` à esquerda, **título vazio**, `DotsThreeVertical` antes do sino **só no modo dono**, `Bell` à direita. No modo consulta, só `ArrowLeft` e `Bell`.
- **O hero:** capa de 140 por 187px ou o `capa-placeholder` com `BookOpen`, título em `display`, autor em `body-lg` `grafite` **sem link**, etiqueta `Livro pessoal`.
- **A linha de atribuição** do modo consulta, `Livro pessoal de Rafaela Siqueira`, com o nome como link para o perfil.
- **A ficha** com a linha única `Páginas` / `184 páginas`. Sem editora, ISBN, série ou assuntos.
- **O bloco de leitura do dono:** status pill `Lendo`, barra de progresso, `página 96 de 184`, `Registrar progresso`.
- **Sinopse**, **Sua nota** com estrelas e `Editar nota`, **Sua resenha** com data e `Editar resenha`, o convite `Você ainda não avaliou este livro.` com `Avaliar`.
- **Nota do dono sem média e sem contagem de avaliações** (RN-03), nos dois modos.
- **Os artboards** `Dono, sem nota e sem resenha`, `Dono, sem sinopse` (fora do rodapé da resenha, ver 4.2), `Terceiro, dono sem nota e sem resenha`, `Carregando` e `Web, confirmação de exclusão`.
- **A confirmação de exclusão do livro**, no mobile e na web.
- **Toda a copy do Período 1** que não aparece na seção 8 como substituída.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas.

### 4.1 Elementos novos, desenhados uma vez

**A. Corpo da resenha em Markdown** (RN-13), nos dois modos, sempre em **Newsreader** `body-lg` 400 `tinta`:

- negrito em Newsreader 600, itálico em Newsreader italic, tachado com risco de 1px na cor do texto;
- lista não ordenada com marcador de ponto em `tinta` e lista ordenada com numeral, recuo de `space-5`, `space-1` entre itens;
- citação em bloco com borda esquerda de 2px `linha`, padding esquerdo `space-4`, texto em Newsreader 400 `grafite`;
- nada de link, imagem, código, tabela nem HTML: marcação fora do subconjunto aparece **como texto literal**.
- A resenha de exemplo ganha um itálico em `duas noites` (texto cru na seção 8), e é o único efeito visível do Markdown nos artboards existentes.

**B. Contagens da resenha, só leitura, para o dono.** Em `Sua resenha`, `space-3` abaixo da data e antes de `Editar resenha`, uma linha alinhada à esquerda, `space-4` entre as duas partes:

- `ThumbsUp` (Phosphor, `regular`, 16px, `grafite`), `space-1` de gap, `12 curtidas` em `caption` `grafite`.
- `ThumbsDown` (Phosphor, `regular`, 16px, `grafite`), `space-1` de gap, `2 descurtidas` em `caption` `grafite`.
- **Não são botões.** Sem padding de botão, sem hover, sem estado ativo, sem alvo de toque: o dono não reage à própria resenha. São as contagens que RF-AVA-08 manda mostrar a todos que veem a resenha.
- Contagem zero aparece como `0 curtidas` ou `0 descurtidas`, porque é contagem real.
- `Editar resenha` desce `space-3`.

**C. Linha de reações do terceiro** (RF-AVA-05 e 08), no lugar da linha inativa do Período 1, `space-3` abaixo da data de `Resenha de Rafaela`, alinhada à esquerda, `space-4` entre os dois botões:

- Cada botão tem ícone de 20px e a contagem ao lado em `caption`, `space-2` de gap, padding `space-2 space-3`, `radius` 12, sem borda, fundo transparente, alvo de 48px de altura.
- `ThumbsUp` com `12 curtidas`; `ThumbsDown` com `2 descurtidas`.
- Inativo: ícone `regular` `grafite`, texto `grafite`.
- Ativo: ícone `fill` `musgo`, texto `musgo` peso 600. **Só um dos dois pode estar ativo**; tocar no outro troca a reação, tocar no ativo retira.
- As duas contagens ficam sempre separadas, nunca como saldo nem como percentual.
- **O botão textual `Denunciar` sai desta linha.** A denúncia passa para o menu da resenha (D).
- Na web, hover no botão de reação: fundo `linha`, `dur-fast`.

**D. Menu da resenha, só para o terceiro.** Na linha do título da seção `Resenha de Rafaela`, alinhado à direita, `DotsThree` (Phosphor, `regular`, 20px, `grafite`), alvo de 48px, rótulo acessível `Mais ações da resenha`. O título continua à esquerda, em `title-sm` `tinta`.

- **Este não é o menu do livro.** O `DotsThreeVertical` do header continua não existindo no modo consulta. O `DotsThree` da resenha age sobre a resenha, e o único item dele é `Denunciar resenha` (artboard novo 5.3).
- Na web, o mesmo `DotsThree` à direita do título da seção, em botão só de ícone de 40px, `radius` 12, sem borda, hover com fundo `linha`.
- `Sua resenha`, do dono, não tem esse menu.

**E. Seção `Frases e trechos`, só para o dono** (RF-AVA-07, design §5.2). Depois de `Sua resenha` (ou do bloco `Você ainda não avaliou este livro.`), com o divisor de 1px `linha` antes, como entre as outras seções, e `space-5` de padding vertical:

- Título de seção `Frases e trechos` em `title-sm` `tinta`, o mesmo tamanho dos outros títulos desta página, com a contagem ao lado em `caption` `grafite`: `4 frases`.
- `space-3` abaixo, até **três frases**, as mais recentes, com `space-5` entre elas. Cada frase:
  - Texto em `body-lg` **Newsreader 400 italic** `tinta`, em blockquote com borda esquerda de 2px `musgo-fundo` e padding esquerdo `space-4`. Sem aspas decorativas grandes, sem ícone de aspas. É o segundo lugar da serifa nesta página, depois da sinopse e da resenha.
  - `space-2` abaixo, alinhado ao texto, em `caption` `grafite`: `Página 142 · você`. Todas as frases de livro pessoal são do dono, por isso todas dizem `você`.
- `space-4` abaixo, na mesma linha, `Ver todas as frases` à esquerda e `Adicionar frase` à direita, os dois botões textuais `musgo`, este com `Plus` (Phosphor, `regular`, 20px) à esquerda.
- A seção não tem ação de excluir: isso mora na lista completa de frases.
- **Vazio**, sem nenhuma frase: título de seção, `Nenhuma frase ainda` em `caption` `grafite` ao lado, texto em `body` `grafite`: `Guarde um trecho que marcou você, com a página em que ele está.` e o botão textual `musgo`: `Adicionar a primeira`.
- **No modo consulta a seção não existe**, nem vazia, nem com convite. Frases de livro pessoal são só do dono (RN-15).
- `space-12` de respiro final depois da seção, no lugar do respiro que ficava depois da resenha.

### 4.2 `Dono, com nota e resenha` e `Dono, sem sinopse` (linha mobile)

- `Sua resenha` com o Markdown de 4.1 A (itálico em `duas noites`) e a linha de contagens de 4.1 B, onde a rolagem alcançar.
- A seção `Frases e trechos` fica abaixo da viewport; aparece no artboard novo 5.1.

### 4.3 `Dono, menu de ações aberto` (linha mobile)

O sheet ganha um item, **no topo**, antes de `Editar livro`. A ordem fica:

1. Item `Adicionar à lista`, altura 56px, `ListPlus` (Phosphor, `regular`, 20px, `tinta`) à esquerda, `space-4` de gap, rótulo em `body` `tinta`.
2. Divisor de 1px `linha`.
3. Item `Editar livro`, como está.
4. Divisor de 1px `linha`.
5. Item `Excluir livro`, em `rubi`, como está.
6. `space-4`, `Cancelar`, como está.

Tocar em `Adicionar à lista` fecha este sheet e abre o sheet de listas, desenhado em outro canvas. **Sem `Recomendar a um leitor`**: livro pessoal não pode ser recomendado (RF-REC-06), e o item não aparece nem desabilitado.

### 4.4 `Terceiro, modo consulta` (linha mobile)

- `Resenha de Rafaela` com o Markdown de 4.1 A, o `DotsThree` de 4.1 D à direita do título e a linha de reações de 4.1 C, onde a rolagem alcançar. **A curtida está ativa**, porque quem olha já curtiu.
- O botão textual `Denunciar` sai.
- Sem seção de frases. Sem `DotsThreeVertical` no header, como já está.

### 4.5 `Excluído ou sem acesso` (linha mobile) e `Web, excluído ou sem acesso` (linha web)

- O texto muda para cobrir as duas vias e o que encerra o acesso (RN-15.6: o dono excluiu o livro, apagou a atividade do feed ou tirou o livro da lista): `Quem o cadastrou pode ter excluído o livro ou deixado de compartilhá-lo.`
- O título continua `Este livro não está mais disponível`. **A copy continua sem confirmar a existência do livro** e sem distinguir livro excluído de acesso negado.
- O botão textual volta à via de origem: `Voltar ao feed`, como está no artboard, quando se chegou pelo feed; `Voltar à lista` quando se chegou pela lista do dono. A variante da lista não tem artboard próprio.

### 4.6 `Web, dono com nota e resenha` (linha web)

- No topo da coluna direita, alinhados à direita, os botões textuais passam a ser três, `space-4` de gap, nesta ordem: **`Adicionar à lista`**, `Editar`, `Excluir` (este em `rubi`, como está). `Adicionar à lista` segue o mesmo estilo e a mesma altura de `Editar`, com `ListPlus` (Phosphor, `regular`, 20px) à esquerda do texto e `space-2` de gap. Abre o dialog de listas, desenhado em outro canvas.
- `Sua resenha` com o Markdown de 4.1 A e as contagens de 4.1 B.
- Onde a rolagem alcançar, a seção `Frases e trechos` na coluna direita, com `max-width` de 68ch.

### 4.7 `Web, terceiro em modo consulta` (linha web)

- `Resenha de Rafaela` com o Markdown, o `DotsThree` de 40px à direita do título da seção e a linha de reações, curtida ativa.
- Sem o botão textual `Denunciar`. Sem os botões `Adicionar à lista`, `Editar` e `Excluir`, como já está.

### 4.8 Linha escura: `Escuro, dono com nota e resenha`, `Escuro, menu de ações`, `Escuro, terceiro em modo consulta`

Recebem as mesmas mudanças de 4.2, 4.3 e 4.4, com o tratamento escuro de 4.9.

### 4.9 Tratamento escuro dos elementos novos

Modo escuro é lock de página inteira: nenhuma seção inverte no meio da rolagem. Superfície elevada fica **mais clara** que o fundo. Shadows com metade da opacidade.

- Contagens só leitura do dono: ícones e texto em `grafite-claro`.
- Reações do terceiro: inativas em `grafite-claro`; ativas em `fill` `musgo-claro` com texto `musgo-claro`. Hover na web com fundo `linha-noite`.
- `DotsThree` da resenha em `grafite-claro`.
- Citação em bloco dentro da resenha com borda `linha-noite` e texto `grafite-claro`.
- Blockquote das frases com borda `musgo-fundo-escuro` e texto em Newsreader italic `papel-suave`; referência `Página 142 · você` em `grafite-claro`.
- `Ver todas as frases`, `Adicionar frase` e `Adicionar a primeira` em `musgo-claro`.
- Item `Adicionar à lista` do sheet com ícone e rótulo em `papel-suave`; sheet em `noite-elevada`, alça `linha-noite`, scrim preto a 60%.
- `Denunciar resenha` em `rubi-claro`. Dropdown da web em `noite-elevada` com borda `linha-noite` e hover em `linha-noite`.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Livro pessoal · Dono, frases e trechos (rolada)`

- Modo dono, `Cartas de um sertanejo`. Página rolada até `Sua resenha`, com o header fixo (`ArrowLeft`, `DotsThreeVertical`, `Bell`) e o divisor na base dele.
- De cima para baixo: o fim de `Sua nota` com as estrelas e `Editar nota`; divisor; `Sua resenha` com o corpo em Markdown (itálico em `duas noites`), a data `12 de setembro de 2026`, as contagens `12 curtidas` e `2 descurtidas` só leitura e `Editar resenha`; divisor; a seção `Frases e trechos` com `4 frases`, as três frases da seção 8 e a linha `Ver todas as frases` · `Adicionar frase`.
- Barra inferior com **Estante** ativo, a área de onde o dono chega ao próprio livro.

#### 5.2 `Livro pessoal · Dono, sem frases (rolada)`

- Modo dono, sem nota e sem resenha (a base de `Dono, sem nota e sem resenha`), rolada até o fim da página.
- De cima para baixo: o fim da sinopse; divisor; o bloco `Você ainda não avaliou este livro.` com `Avaliar`; divisor; a seção `Frases e trechos` no **estado vazio** de 4.1 E, com `Adicionar a primeira`; `space-12` de respiro.
- Prova que a seção de frases não depende da avaliação: o dono guarda um trecho mesmo sem nota nem resenha.

#### 5.3 `Livro pessoal · Terceiro, menu da resenha aberto`

- Base: o modo consulta rolado até `Resenha de Rafaela`, com o header fixo só com `ArrowLeft` e `Bell`, a resenha em Markdown, a linha de reações com a curtida ativa, e **nada depois da resenha**: sem frases. Coberta pelo scrim `#171512` a 40%.
- Bottom sheet conforme design §4.11: fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo; padding inferior soma a área segura.
- Cabeçalho do sheet em `caption` `grafite`: `Resenha de Rafaela Siqueira`. Divisor `linha` abaixo.
- Um item de 56px: `Flag` (Phosphor, `regular`, 20px, `rubi`) e `Denunciar resenha` em `body` `rubi`. É destrutivo conforme design §4.1 e §4.11, por isso a cor.
- `space-4` abaixo, botão textual `grafite` de largura total: `Cancelar`.
- Tocar em `Denunciar resenha` abre a tela de denúncia, onde ficam o motivo e a confirmação. Aqui não se pede confirmação, porque o toque ainda não denuncia nada.
- Barra inferior com **Feed** ativo, a via principal de chegada.

### Linha 2, web, no fim da linha, nesta ordem

#### 5.4 `Livro pessoal · Web, dono, frases e trechos`

- Modo dono, página rolada até a resenha. A coluna esquerda continua fixa, com a capa, a etiqueta, a ficha e o bloco de leitura no topo.
- Coluna direita: o fim de `Sua nota`; `Sua resenha` com Markdown e as contagens só leitura; `space-8` abaixo, a seção `Frases e trechos` com as três frases, em coluna com `max-width` de 68ch, e os dois botões textuais no fim.
- Sidebar com **Estante** ativo.

#### 5.5 `Livro pessoal · Web, terceiro, menu da resenha aberto`

- Base: `Web, terceiro em modo consulta`, rolada até a resenha.
- Dropdown ancorado abaixo do `DotsThree` da resenha, alinhado pela borda direita do botão, `space-2` abaixo dele: 248px de largura, fundo `papel`, borda de 1px `linha`, `radius` 12, `elev-2`, padding `space-2` vertical. **Sem scrim.**
- Um item de 44px, padding lateral `space-4`: `Flag` (Phosphor, `regular`, 20px, `rubi`) e `Denunciar resenha` em `body` `rubi`, `space-3` de gap, em hover com fundo `linha`.
- Sem `Cancelar`: `Esc`, clique fora e novo clique no `DotsThree` fecham.
- Sidebar com **Feed** ativo.

### Linha 3, modo escuro, no fim da linha

#### 5.6 `Livro pessoal · Escuro, dono, frases e trechos (rolada)`

- O artboard 5.1 no modo escuro, para conferir o blockquote das frases, as contagens só leitura e o Markdown no escuro (4.9).

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards do Período 1 continuam, com as mudanças da seção 4.

**Sem artboard próprio, de propósito:**

- **Terceiro vindo de uma lista do dono.** A página é idêntica à do terceiro vindo do feed: mesma atribuição, mesma ausência de ações, mesma resenha com reações e menu. Mudam só o destino do `ArrowLeft` (rótulo acessível `Voltar para Achados de sebo`, uma lista da Rafaela), o item ativo do shell (a área de onde se abriu a lista) e o botão do estado indisponível (`Voltar à lista`, 4.5).
- **O sheet de listas aberto sobre esta página.** Ele está desenhado no canvas de `Adicionar à lista`.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Modo consulta, com as ações do dono ausentes | documento-de-design §5.8 |
| Etiqueta `Livro pessoal` e linha de atribuição de dono | documento-de-design §4.17 e §4.18 |
| Frases e trechos em blockquote Newsreader italic | documento-de-design §5.2 e §3.2 |
| Bottom sheet, menu de ações, item destrutivo em `rubi` e scrim | documento-de-design §4.11 |
| Botão textual e destrutivo | documento-de-design §4.1 |
| Ícone `fill` só para estado ativo (curtida, descurtida) | documento-de-design §6 |
| Resenha em Markdown, subconjunto | REQUISITOS.md RN-13 |

**Já nascidos em outras edições do Período 2 e reaproveitados aqui**, com a mesma pendência de incorporação já registrada: linha de reações da resenha, estilo do Markdown renderizado, blockquote de frase com a linha de referência e dropdown de menu na web (os quatro vieram da edição da página do livro).

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Contagens de reação só leitura para o autor da resenha**: ícones de 16px e `caption` `grafite`, sem affordance de botão. A página do livro oficial não mostra contagens na resenha do próprio leitor; RF-AVA-08 pede que elas sejam visíveis a todos que têm acesso à resenha, o autor incluído.
- **Menu da resenha como único menu do modo consulta**: `DotsThree` à direita do título da seção, separado do `DotsThreeVertical` do header, que continua só do dono.
- **Terceiro botão textual no topo da coluna direita da web** (`Adicionar à lista`, `Editar`, `Excluir`).

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Menu do dono, novo item | não existia | `Adicionar à lista` |
| Botão do dono na web, novo | não existia | `Adicionar à lista` |
| Contagens só leitura do dono | não existia | `12 curtidas`, `2 descurtidas` |
| Reações do terceiro | ícones sem rótulo, `12` ao lado do polegar | `12 curtidas`, `2 descurtidas` |
| Rótulo acessível das reações | não existia | `Curtir resenha` / `Descurtir resenha` |
| Botão de denúncia do terceiro | `Denunciar` (botão textual) | sai; entra o menu da resenha |
| Rótulo acessível do menu da resenha | não existia | `Mais ações da resenha` |
| Cabeçalho do menu da resenha | não existia | `Resenha de Rafaela Siqueira` |
| Menu da resenha | não existia | `Denunciar resenha`, `Cancelar` |
| Título de seção | não existia | `Frases e trechos` |
| Contagem de frases | não existia | `4 frases` |
| Referência da frase | não existia | `Página 142 · você`, `Página 71 · você`, `Página 23 · você` |
| Ações de frases | não existia | `Ver todas as frases`, `Adicionar frase` |
| Frases vazias, rótulo | não existia | `Nenhuma frase ainda` |
| Frases vazias, texto | não existia | `Guarde um trecho que marcou você, com a página em que ele está.` |
| Frases vazias, ação | não existia | `Adicionar a primeira` |
| Indisponível, texto | `Ele pode ter sido excluído por quem o cadastrou.` | `Quem o cadastrou pode ter excluído o livro ou deixado de compartilhá-lo.` |
| Indisponível, botão, via lista | não existia | `Voltar à lista` |
| Rótulo acessível da seta, via lista | não existia | `Voltar para Achados de sebo` |

**Corpo da resenha** (texto cru, como o dono escreveu; o artboard mostra renderizado): `Comprei numa feira em Feira de Santana por cinco reais e li em *duas noites*. As cartas de 1981 são as melhores.`

**Frases de `Cartas de um sertanejo`**, da mais recente para a mais antiga (texto mock escrito para o protótipo):

| Frase | Referência |
|---|---|
| `Mande notícias, mesmo que sejam poucas. Carta curta também chega.` | `Página 142 · você` |
| `A seca deste ano levou o milho, mas não levou a vontade de plantar de novo.` | `Página 71 · você` |
| `Escrevo daqui do alpendre, que é onde a tarde demora mais a ir embora.` | `Página 23 · você` |

**Dados deste canvas.** O livro, a dona e a resenha continuam os do Período 1: `Cartas de um sertanejo`, de `Marina Albuquerque`, cadastrado por `Rafaela Siqueira` (`@rafaela.siq`). O canvas de `Adicionar à lista` usa outro livro pessoal (`Contos da Rua Direita`, de Helena Prado, da leitora Marina Beltrão); os dois canvases são separados e a diferença é aceitável.

Zero em-dash, zero emoji. Todo número tem unidade, exceto a nota de 0 a 5, que vem com a estrela.

---

## 9. Acessibilidade e interação do que muda

- **Reações do terceiro:** cada botão com `aria-pressed` e rótulo `Curtir resenha` ou `Descurtir resenha`, seguido da contagem. O estado ativo muda o peso do ícone (`regular` para `fill`), não só a cor. Alvo de 48px no mobile.
- **Reações, falha:** a troca é otimista; se o servidor recusar (limite de frequência, ou acesso que deixou de valer), a reação volta ao estado anterior e o leitor recebe mensagem em pt-BR acionável. A reação é idempotente: tocar duas vezes não cria duas.
- **Contagens do dono:** lidas como texto, "12 curtidas e 2 descurtidas na sua resenha". Não recebem foco e não se anunciam como botão.
- **Menus:** `DotsThreeVertical` com rótulo `Mais ações`, `DotsThree` da resenha com rótulo `Mais ações da resenha`. Sheet e dropdown prendem o foco enquanto abertos, `Esc` e toque ou clique fora fecham, e o foco volta ao botão que abriu. No dropdown da web, setas navegam entre os itens.
- **Denunciar:** o item do menu só abre a tela de denúncia. A confirmação explícita (RNF-USA-04) fica naquela tela, antes do envio.
- **Markdown:** a resenha renderizada preserva a semântica (lista é lista, citação é citação) para leitor de tela. Marcação não suportada aparece literal.
- **Frases:** cada blockquote é marcado como citação, com a referência de página associada a ele. `Adicionar frase` e `Ver todas as frases` com alvo de 48px no mobile.
- **Modo consulta:** as ações ausentes não deixam rastro para leitor de tela; não há botão oculto, desabilitado ou com `aria-hidden` que o terceiro possa alcançar.
- `prefers-reduced-motion`: a troca das reações vira instantânea, e sheet e dropdown entram sem deslizar.
- Contraste WCAG AA no corpo nos dois temas. As contagens do dono e a referência das frases usam `grafite`, não `grafite-suave`.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Hero, etiqueta, atribuição, ficha, bloco de leitura, sinopse, nota, confirmação de exclusão, skeleton e shell ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe as telas de destino** (sheet de listas, lista completa de frases, formulário de frase, denúncia) dentro deste canvas.

**Específico do livro pessoal**

- **Não dê ao terceiro nenhuma ação sobre o livro.** Nada de adicionar à estante, favoritar, iniciar leitura, registrar progresso, adicionar a uma lista, recomendar, editar ou excluir, em nenhuma forma, nem desabilitado, nem em cinza, nem dentro de menu.
- **Não desenhe o `DotsThreeVertical` do header no modo consulta.** O único menu do terceiro é o da resenha, com um item só.
- **Não desenhe `Recomendar a um leitor`** em nenhum modo. Livro pessoal não pode ser recomendado.
- **Não mostre a seção de frases ao terceiro**, nem vazia, nem com convite.
- Não desenhe reações clicáveis nem `Denunciar resenha` na resenha do próprio dono. Ele vê só as contagens.
- Não mostre as curtidas e descurtidas como saldo, percentual ou barra de proporção.
- Não deixe as duas reações ativas ao mesmo tempo.
- Não diferencie visualmente a página vinda do feed e a vinda da lista: é a mesma página.
- **Não desenhe nota dos leitores nem nota geral.** Nada de média, nada de contagem de avaliações, nada de histograma.
- **Não desenhe lista de resenhas.** Só existe a resenha do dono.
- **Não linke autor, editora ou série**, e não desenhe chips de assunto. Livro pessoal fica fora dessas páginas e da busca.
- **Não mostre ISBN.**
- **Não confirme a existência do livro a quem não tem acesso.** O estado indisponível é o mesmo para livro excluído, compartilhamento desfeito e acesso negado.
- **Não repita o título do livro no header** e no hero.
- **Não trate a ausência de nota, resenha, sinopse ou frases como erro.**
- Não desenhe link, imagem, bloco de código nem tabela dentro da resenha.
- Não desenhe excluir frase nesta página: isso mora na lista completa de frases.
- Não use aspas decorativas grandes nem ícone de aspas nas frases.
- Não arredonde o canto da capa. Não desenhe placeholder de capa com livro genérico ilustrado.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais: corpo da resenha, frases e trechos, sinopse. Contagens, menus e reações são Manrope.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão ou em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.
- Nada de animação de polegar, confete ou partícula ao reagir.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface, inclusive nas estrelas e nas reações: são ícones Phosphor.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline ou texto `rubi`.

**Interações destrutivas**

- Excluir o livro continua com confirmação em modal, botão destrutivo em outline `rubi`.
- Denunciar passa por confirmação, na tela de denúncia. Nada de denúncia em um toque só.
- Nada de undo em ação destrutiva pesada.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px. Abaixo de 768px, os três botões do topo voltam para o menu `DotsThreeVertical` do header e o dropdown da resenha vira o bottom sheet do mobile.
- Nada de conteúdo essencial escondido em hover. As reações e o menu da resenha aparecem sempre.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores nem "mais curtidas".
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
- Sem camada de obra.
