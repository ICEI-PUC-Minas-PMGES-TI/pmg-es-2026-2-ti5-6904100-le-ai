# F-ACV-OPC · Página do livro pessoal (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Livro pessoal`, gerado por `docs/design/periodo-1/F-ACV-CADASTRO/livro-pessoal.md` e já editado por `docs/design/periodo-2/livro-pessoal/livro-pessoal.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está**, inclusive tudo o que a edição do Período 2 acrescentou.

**Edita:** ../../periodo-2/livro-pessoal/livro-pessoal.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-ACV-OPC.md
**Requisitos que entram:**
- F-ACV-OPC: RF-ACV-22 (os assuntos que o dono escolheu para o livro pessoal aparecem na página, como rótulos não acionáveis, para o dono e para o terceiro em modo consulta)

**Não funcionais:** RNF-SEC-06 (livro pessoal e seus assuntos continuam fora de busca, filtro, catálogo e páginas de autor, editora e série), RNF-SEC-02 (só o dono altera os assuntos, e isso acontece no formulário, não aqui), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** RN-21.5 (em livro pessoal, os assuntos vêm do conjunto curado e não afetam contadores de catálogo), RN-03 (fora da busca e das páginas de catálogo), RN-15 (o terceiro chega pelo feed ou pela lista do dono e vê a página em modo consulta, com os assuntos e sem nenhuma ação sobre o livro)
**Versão web:** sim. RF-ACV-22 tem marcação na coluna Web de `REQUISITOS.md` §5.2.

---

## 1. O que muda e por quê

O dono passa a poder escolher assuntos para o livro pessoal, no formulário de cadastro e de edição (edição `docs/design/periodo-3/cadastro-pessoal/cadastro-pessoal.md`). Esta página **mostra** esses assuntos. É a única mudança.

**Onde:** a **ficha**, que hoje tem uma linha só (`Páginas` / `184 páginas`), ganha uma segunda linha, `Assuntos`, com os nomes em texto. A ficha já é o lugar dos dados do livro nesta página; um bloco à parte, com título de seção, daria aos assuntos um peso que eles não têm aqui.

**Como:** **texto, não chip.** Na página do livro oficial, o assunto é um chip em caixa alta com lupa, que leva à busca filtrada (RF-ACV-21). No livro pessoal, o assunto **não** é acionável: livro pessoal não entra em busca nem em filtro (RN-03, RNF-SEC-06), e um chip com cara de link que não leva a lugar nenhum, ou que leva a uma busca onde este livro não aparece, seria pior que texto. Por isso os nomes ficam em `body` `tinta`, separados por vírgula, sem borda, sem fundo, sem ícone, sem hover.

**Quem vê:** o dono e o terceiro em modo consulta, pelas duas vias (feed e lista do dono). A linha é a mesma para os dois.

**Sem assunto:** a linha `Assuntos` **não aparece**. Ausência é estado válido (RN-21.4); uma linha com traço ou com "Nenhum assunto" seria ruído, como a página já faz com editora e série.

**O que deixa de valer da edição do Período 2:** na seção 3, a frase "A ficha com a linha única `Páginas` / `184 páginas`. Sem editora, ISBN, série ou assuntos." perde a parte dos **assuntos**; e na seção 10, a proibição "não desenhe chips de assunto" passa a ser "não desenhe chips **acionáveis** de assunto". Editora, ISBN e série continuam ausentes. Todo o resto daquelas regras continua valendo, e a seção 10 abaixo o repete.

**Dados:** `Cartas de um sertanejo`, de `Marina Albuquerque`, cadastrado por `Rafaela Siqueira` (`@rafaela.siq`), com os assuntos `História` e `Memórias`, os mesmos do canvas de cadastro. A lista da via secundária continua `Achados de sebo`.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Livro pessoal · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas. Os rótulos novos seguem o padrão do canvas: sem prefixo na linha mobile, prefixo `Web,` na linha web e prefixo `Escuro,` na linha escura.
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
Esta tela é a página do livro pessoal: herda a linguagem da página do livro
um passo mais contida, em DESIGN_VARIANCE 6.

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

FICHA DO LIVRO
Linhas de dado com rótulo em label grafite à esquerda e valor em body tinta
à direita, space-5 de padding vertical no bloco, divisor de 1px linha antes e
depois do bloco. Valor que não cabe numa linha quebra alinhado à direita.

MODO ESCURO
Cidadão de primeira classe e lock de página inteira: nenhuma seção inverte no
meio da rolagem. Superfície elevada fica MAIS CLARA que o fundo, nunca mais
escura.

CONTRASTE
WCAG AA no corpo, AAA no título quando possível. grafite-suave e
grafite-fundo-escuro passam apenas em tamanho grande: nunca carregam texto de
corpo nem informação essencial.
```

**Nota sobre a variance desta tela.** A página do livro oficial sobe a `DESIGN_VARIANCE` para 7. Esta página herda aquela linguagem um passo mais contida, em 6, como no Período 1 e no Período 2. Nada nesta edição muda isso.

---

## 3. O que permanece intocado

- **O shell inteiro**, o header mobile (título vazio, `DotsThreeVertical` só no modo dono, `Bell`) e os botões textuais do topo da coluna direita na web (`Adicionar à lista`, `Editar`, `Excluir`).
- **O hero:** capa ou placeholder, título, autor **sem link**, etiqueta `Livro pessoal`.
- **A linha de atribuição** do modo consulta, `Livro pessoal de Rafaela Siqueira`.
- **A linha `Páginas` / `184 páginas`** da ficha, como está, e continua a primeira.
- **O bloco de leitura do dono**, a sinopse, `Sua nota`, `Sua resenha` com Markdown e contagens, a resenha do terceiro com reações e menu, e a seção `Frases e trechos` do dono, tudo como a edição do Período 2 deixou.
- **Os menus** (do dono no header, da resenha para o terceiro) e a confirmação de exclusão do livro.
- **Os artboards** `Carregando`, `Excluído ou sem acesso`, `Web, excluído ou sem acesso`, `Web, confirmação de exclusão` e os seis artboards novos do Período 2 (`Dono, frases e trechos (rolada)`, `Dono, sem frases (rolada)`, `Terceiro, menu da resenha aberto`, `Web, dono, frases e trechos`, `Web, terceiro, menu da resenha aberto`, `Escuro, dono, frases e trechos (rolada)`): o enquadramento deles não mostra a ficha, ou mostra um estado em que a ficha não existe.
- **Toda a copy** dos Períodos 1 e 2 que não aparece na seção 8.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas.

### 4.1 Elemento novo, desenhado uma vez: linha `Assuntos` na ficha

- Dentro do bloco da ficha, **depois** da linha `Páginas`, com `space-3` entre as duas linhas. O padding vertical do bloco (`space-5`) e os dois divisores ficam como estão; o bloco só cresce.
- Rótulo `Assuntos` em `label` `grafite` à esquerda, alinhado ao topo do valor.
- Valor em `body` `tinta` à direita: `História, Memórias`. Os nomes vêm em ordem alfabética, a mesma do seletor, separados por vírgula e espaço, com a grafia exata da lista (maiúscula só na inicial e nos nomes próprios do assunto). **Sem chip, sem borda, sem fundo, sem ícone, sem sublinhado, sem hover, sem cursor de link.**
- Quando os nomes não cabem numa linha, o valor quebra em mais linhas **alinhadas à direita**, com o rótulo continuando alinhado ao topo. O valor ocupa no máximo 70% da largura da linha; o rótulo nunca quebra.
- **Livro sem assunto:** a linha não existe. A ficha volta a ter só `Páginas`, exatamente como no Período 2.

### 4.2 `Dono, com nota e resenha`, `Dono, sem nota e sem resenha` e `Dono, sem sinopse` (linha mobile)

- A ficha ganha a linha `Assuntos` / `História, Memórias` de 4.1. O conteúdo abaixo da ficha desce `space-3` mais a altura da linha; o que sair da viewport sai.

### 4.3 `Dono, menu de ações aberto` (linha mobile)

- A página por baixo do scrim mostra a ficha com a linha nova, como em 4.2. O sheet não muda.

### 4.4 `Terceiro, modo consulta` e `Terceiro, dono sem nota e sem resenha` (linha mobile)

- A ficha ganha a mesma linha. **O terceiro vê os assuntos** (RN-15: modo consulta mostra os dados do livro), e a linha é idêntica à do dono: não há variante "só leitura", porque ela já não tem ação para ninguém.

### 4.5 `Web, dono com nota e resenha` e `Web, terceiro em modo consulta` (linha web)

- Na coluna esquerda de 280px, a ficha ganha a linha `Assuntos` / `História, Memórias` abaixo de `Páginas`. Na largura da coluna, o valor cabe numa linha; o bloco de leitura do dono desce o que for preciso.
- Nenhuma mudança na coluna direita.

### 4.6 Linha escura: `Escuro, dono com nota e resenha`, `Escuro, menu de ações` e `Escuro, terceiro em modo consulta`

- Recebem a linha de 4.1 com o tratamento escuro de 4.7.

### 4.7 Tratamento escuro do elemento novo

- Rótulo `Assuntos` em `grafite-claro`, valor em `papel-suave`, divisores da ficha em `linha-noite`, como os da linha `Páginas`.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha

#### 5.1 `Livro pessoal · Dono, ficha com cinco assuntos`

- Modo dono, topo da página, base `Dono, com nota e resenha`, com o livro marcado com cinco assuntos: `Biografia`, `Crônica`, `História`, `Memórias`, `Política`.
- Na ficha, o valor `Biografia, Crônica, História, Memórias, Política` quebra em duas linhas alinhadas à direita, com o rótulo `Assuntos` no topo. Serve para conferir a quebra no limite recomendado.

### Linha 2, web, no fim da linha

#### 5.2 `Livro pessoal · Web, ficha com cinco assuntos`

- Base `Web, dono com nota e resenha`, com os mesmos cinco assuntos de 5.1.
- Na coluna esquerda de 280px, o valor quebra em três linhas alinhadas à direita. A coluna cresce para baixo; nada passa para a coluna direita.

### Linha 3, modo escuro

Nenhum artboard novo: os três escuros existentes recebem a linha (4.6) e bastam para conferir o contraste.

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards dos Períodos 1 e 2 continuam, com as mudanças da seção 4.

**Sem artboard próprio, de propósito:**

- **Livro sem assunto:** a ficha é a do Período 2, com a linha única `Páginas`.
- **Terceiro vindo da lista do dono:** a página é a mesma do terceiro vindo do feed, com a mesma linha de assuntos.
- **Alterar os assuntos:** acontece no formulário de edição, desenhado no canvas `Cadastro de livro pessoal`, aberto por `Editar livro` (mobile) ou `Editar` (web).

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Ficha do livro com rótulo e valor | documento-de-design §5.2 e o canvas do Período 1 |
| Modo consulta, com as ações do dono ausentes | documento-de-design §5.8 |
| Etiqueta `Livro pessoal` e linha de atribuição | documento-de-design §4.17 e §4.18 |

**Nasce aqui** e vira pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Linha de ficha com lista de valores em texto, não acionável**, quebrando alinhada à direita: a forma de mostrar assunto quando ele não leva à busca. Contrasta com o chip acionável de assunto da página do livro oficial (§5.2), que continua sendo o único chip de assunto do produto.

---

## 8. Copy nova ou alterada

| Onde | Antes (P2) | Agora |
|---|---|---|
| Rótulo da ficha, novo | não existia | `Assuntos` |
| Valor da ficha, exemplo | não existia | `História, Memórias` |
| Valor da ficha, cinco assuntos | não existia | `Biografia, Crônica, História, Memórias, Política` |
| Leitura para leitor de tela | não existia | `Assuntos: História e Memórias` |

Zero em-dash, zero emoji.

---

## 9. Acessibilidade e interação do que muda

- **A linha é texto.** Não recebe foco, não se anuncia como botão nem como link, e não tem estado de hover ou press. Em lista de definição (`dt` / `dd`) ou equivalente semântico, ao lado da linha `Páginas`.
- O leitor de tela lê o rótulo e os nomes, com "e" antes do último: `Assuntos: História e Memórias`.
- A quebra em várias linhas não muda a ordem de leitura: rótulo primeiro, valor depois.
- Contraste WCAG AA nos dois temas: valor em `tinta` ou `papel-suave`, rótulo em `grafite` ou `grafite-claro`, nunca em `grafite-suave`.
- Sem motion novo.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Hero, etiqueta, atribuição, linha `Páginas`, bloco de leitura, sinopse, nota, resenha, frases, menus, confirmação, skeleton e shell ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe o seletor de assuntos** neste canvas: ele mora no canvas `Cadastro de livro pessoal`.

**Específico do livro pessoal**

- **Não desenhe os assuntos como chip**, nem em caixa alta, nem com lupa, nem com borda, nem com fundo. Livro pessoal não entra em busca nem em filtro: o assunto aqui não leva a lugar nenhum e não pode parecer que leva.
- **Não linke os assuntos** para o Descobrir, para uma busca ou para qualquer outra tela.
- **Não crie uma seção `Assuntos`** com título próprio depois da sinopse. Os assuntos moram na ficha.
- **Não desenhe a linha vazia** quando o livro não tem assunto: nada de traço, `Nenhum` ou convite para escolher.
- **Não dê ao terceiro nenhuma ação sobre o livro**, inclusive sugerir ou alterar assunto.
- **Não desenhe o `DotsThreeVertical` do header no modo consulta.**
- **Não desenhe `Recomendar a um leitor`** em nenhum modo.
- **Não mostre a seção de frases ao terceiro.**
- **Não linke autor, editora ou série.** Não mostre ISBN, editora nem série.
- **Não desenhe nota dos leitores nem nota geral**: nada de média, contagem de avaliações ou histograma.
- **Não confirme a existência do livro a quem não tem acesso.**
- Não arredonde o canto da capa.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais. A ficha, com os assuntos, é Manrope.
- Nada de overline em toda seção. No máximo um por tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de cor por gênero literário.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton e nada de spinner girando.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji.
- Nada de label poético. O rótulo diz o que a coisa é: `Assuntos`.

**Componentes**

- Nada de ícone desenhado à mão.
- Nada de capa de livro com canto arredondado.
- Nada de botão destrutivo preenchido.

**Modo escuro**

- Nada de fundo #000000, nada de simples inversão da paleta clara, nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de layout que não colapse para uma coluna abaixo de 768px. Abaixo de 768px, a ficha volta à ordem do mobile, com a linha `Assuntos` depois de `Páginas`.
- Nada de conteúdo essencial escondido em hover.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
- Sem camada de obra.
