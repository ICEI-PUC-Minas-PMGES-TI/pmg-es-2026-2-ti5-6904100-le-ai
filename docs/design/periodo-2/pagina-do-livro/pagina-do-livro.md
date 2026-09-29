# Página do livro (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Página do livro`, gerado por `docs/design/periodo-1/F-ACV-BUSCA/pagina-do-livro.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-ACV-BUSCA/pagina-do-livro.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-ACV-NOTA.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-ACV-DESCOBERTA.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-EST-2.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-AVA-2.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-LST.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-REC-P2P.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-MOD.md
**Requisitos que entram:**
- F-ACV-NOTA: RF-ACV-16 (nota geral e nota dos leitores como indicadores distintos e rotulados), RF-ACV-04 (distribuição das notas dos leitores, que o P1 deixou para quando existisse)
- F-ACV-DESCOBERTA: RF-ACV-21 (assuntos acionáveis como filtro de busca), RF-ACV-10, RF-ACV-11 e RF-ACV-12 (só a entrada: autor, editora e série da ficha levam às páginas respectivas)
- F-EST-2: RF-EST-09 (marcar e desmarcar favorito)
- F-AVA-2: RF-AVA-05 (curtida ou descurtida, uma por resenha), RF-AVA-06 (só a entrada `Adicionar frase`), RF-AVA-07 (ver as frases do livro), RF-AVA-08 (contagens de curtidas e descurtidas separadas), RF-AVA-09 (resenha renderizada em Markdown; o editor é outra edição)
- F-LST: RF-LST-02 (só a entrada `Adicionar à lista`)
- F-REC-P2P: RF-REC-01 (só a entrada `Recomendar a um leitor`)
- F-MOD: RF-MOD-01 (só a entrada `Denunciar resenha`)

**Não funcionais:** RNF-SEC-15 (Markdown com HTML desabilitado e saída sanitizada), RNF-SEC-18 (rate limiting em reagir), RNF-ERR-04 (favoritar e reagir são idempotentes), RNF-DES-02 (frases e resenhas paginadas), RNF-USA-04 (denúncia com confirmação, na tela de denúncia)
**Regras de negócio:** RN-06 (dois indicadores, nunca combinados; ausente é ausente, nunca zero; livro pessoal não tem nenhum dos dois), RN-08 (resenhas filtradas por privacidade), RN-11 (frase com até 500 caracteres e página de referência obrigatória), RN-13 (subconjunto de Markdown), RN-21 (assunto é filtro de busca do conjunto curado)
**Versão web:** sim. RF-ACV-16, RF-ACV-21, RF-EST-09, RF-AVA-05 a 09, RF-LST-02, RF-REC-01 e RF-MOD-01 têm marcação na coluna Web de `REQUISITOS.md`.

---

## 1. O que muda e por quê

Sete features do Período 2 depositam conteúdo na página do livro, e todas entram nesta edição de uma vez, para que não disputem o mesmo espaço em edições separadas. A tela continua sendo a mais editorial do produto: **o hero centralizado, a capa em foco, a serifa em três blocos e a `DESIGN_VARIANCE` 7 não mudam.** O que muda é o que a página faz abaixo e ao redor do hero.

| O que entra | Onde | Feature |
|---|---|---|
| Componente `Nota geral` e `Nota dos leitores`, com o histograma das notas dos leitores | Nova seção logo abaixo da barra de ação (mobile) e logo abaixo do título (web) | F-ACV-NOTA |
| Chips de assunto acionáveis, que abrem o Descobrir filtrado | Nova seção `Assuntos`, depois da sinopse | F-ACV-DESCOBERTA |
| Autor, editora e série da ficha viram links para as páginas de consulta | Seção `Ficha` | F-ACV-DESCOBERTA |
| Botão `Favoritar` só com ícone, ao lado da ação secundária | Barra de ação | F-EST-2 |
| Menu `Mais ações` com `Adicionar à lista` e `Recomendar a um leitor` | Header (mobile) e canto superior direito do conteúdo (web) | F-LST, F-REC-P2P |
| Curtida e descurtida com contagens separadas em cada resenha de outro leitor | Rodapé de cada resenha | F-AVA-2 |
| Corpo da resenha renderizado em Markdown (subconjunto de RN-13) | Corpo de cada resenha | F-AVA-2 |
| Menu da resenha com `Denunciar resenha` | Cabeçalho de cada resenha de outro leitor | F-MOD |
| Seção `Frases e trechos` com as frases do livro, `Ver todas as frases` e `Adicionar frase` | Nova seção depois das resenhas | F-AVA-2 |

**O que deixa de valer do prompt do Período 1:** as proibições de desenhar favoritar, frases, chips de assunto, o componente de nota, links na ficha, Markdown e distribuição de notas. Todas as outras regras daquele prompt continuam valendo, e a seção 10 abaixo as repete.

**Os destinos das novas ações são outras telas, a desenhar em outros prompts.** Esta edição desenha só o ponto de entrada e, quando há, o menu aberto. Não desenhe a tela de destino dentro deste canvas:

| Ação | Destino |
|---|---|
| `Adicionar à lista` | sheet `F-LST/adicionar-a-lista.md`, a desenhar |
| `Recomendar a um leitor` | tela `F-REC-P2P/recomendar-livro.md`, a desenhar |
| `Denunciar resenha` | tela `F-MOD/denunciar.md`, a desenhar; a confirmação e o campo de motivo moram lá |
| `Ver todas as frases` | tela `F-AVA-2/frases-do-livro.md`, a desenhar; exclusão da própria frase e remoção pela moderação moram lá |
| `Adicionar frase` | tela `F-AVA-2/adicionar-frase.md`, a desenhar |
| Valor `Autor`, `Editora`, `Série` na ficha | `F-ACV-DESCOBERTA/pagina-do-autor.md`, `pagina-da-editora.md`, `pagina-da-serie.md` |
| Chip de assunto | aba `Descobrir` com aquele assunto como filtro ativo (`descobrir/descobrir.md`) |

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Página do livro · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
- Os artboards novos entram **no fim da linha** da sua plataforma, depois dos existentes, sem reordenar nenhum.
- Os artboards existentes continuam mostrando o **topo da página**. Os artboards novos marcados como `(rolada)` mostram a página **rolada até a seção indicada**, com o header fixo no topo (com o divisor `linha` na base, porque o conteúdo rola por baixo dele) e a barra inferior fixa no rodapé. É a única forma de mostrar as seções de baixo sem esticar o artboard.

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
ESTA TELA É UMA DELAS: a página do livro opera em DESIGN_VARIANCE 7,
MOTION_INTENSITY 4, VISUAL_DENSITY 3. Hero centralizado com capa em foco,
display grande, serifa em três blocos e densidade menor que a estante.

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

- **O shell inteiro**, exatamente como está no canvas: barra inferior do mobile com `Descobrir` ativo, sidebar da web com `Descobrir` ativo, e a marca na sidebar do jeito que já aparece. Esta edição não mexe em navegação.
- **O hero:** capa centralizada a 40% da largura no mobile e 280 por 420px na web, canto vivo, `elev-2`; título em `display` (mobile) e `display-hero` (web); autor e metadados `Todavia · 2019 · 264 páginas`. **O autor do hero continua texto, não link**: o link para a página do autor fica na ficha.
- **Status e progresso:** pill `Lendo`, barra de 56%, `Página 148 de 264` e `1 conclusão`.
- **O botão primário** da barra de ação (`Registrar progresso` ou `Adicionar à estante`), largo, pill.
- **Sua avaliação:** título, estrelas de 24px com `4,5`, `Escrever resenha`; `Sem nota` com as estrelas vazias no livro fora da estante.
- **Sinopse:** texto em Newsreader, skeleton de quatro barras quando pendente, `Este livro ainda não tem sinopse no acervo.` quando ausente.
- **O bloco de spoiler oculto** da resenha de `Rafael Bittencourt`, com `EyeSlash`, `Esta resenha contém spoiler` e `Mostrar mesmo assim`.
- **O placeholder de capa** de `Becos da Memória` e o **erro de carregamento**, que continua com header só com `ArrowLeft` e `Bell`.
- **O ritmo:** `space-6` entre seções, títulos de seção em `title-lg`, padding lateral `space-5` no mobile e `space-8` na web, densidade menor que a estante.
- **Toda a copy do Período 1** que não aparece na seção 8 como substituída.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas. Onde o mesmo rótulo existe no mobile e na web, a linha é indicada.

### 4.1 Elementos que entram em todos os artboards da página carregada

Estes quatro elementos entram em **todo artboard que mostra a página carregada**: `Padrão, leitura em andamento`, `Livro fora da estante`, `Sinopse pendente`, `Sinopse ausente`, `Capa em placeholder`, `Resenha com spoiler`, `Sem resenhas`, `Resenha com spoiler e hover de card` e `Padrão, modo escuro`. Não entram em `Carregando a página` nem em `Erro de carregamento`, tratados em 4.8 e 4.9.

**A. Header mobile ganha o menu `Mais ações`.**

- A ordem fica: `ArrowLeft` à esquerda; à direita, `DotsThree` (Phosphor, `regular`, 24px, `tinta`) e depois o `Bell`, com `space-4` de gap, na regra de "ações contextuais seguidas do sino" do shell. Alvo de 48px no `DotsThree`.
- O resto do header não muda: 72px mais a área segura, fundo `papel`, sem título, divisor só quando o conteúdo rola por baixo.
- Tocar no `DotsThree` abre o menu de ações do artboard novo 5.1.

**B. Barra de ação ganha o botão `Favoritar`.**

- Abaixo do primário, com `space-3` de respiro, a linha secundária passa a ter **dois elementos lado a lado**, com `space-3` de gap: o botão secundário existente (`Alterar status` ou `Iniciar leitura`), que ocupa o resto da largura, e à direita um **botão quadrado de 48 por 48px** só com ícone.
- O botão quadrado segue a variante secundária do §4.1: `radius` 12, borda de 1px `linha`, fundo transparente, `Heart` (Phosphor, 20px) centralizado.
  - Não favorito: `Heart` peso `regular`, cor `tinta`.
  - Favorito: `Heart` peso `fill`, cor `musgo`. A borda continua `linha`. Sem fundo tingido, sem contagem, sem texto.
- Tocar alterna o estado na hora, com transição de `dur-fast` só na troca de peso e cor do ícone. Sem animação de coração que pulsa, sem partícula, sem toast de sucesso.
- **Favorito é independente da estante.** Favoritar não coloca o livro em `Quero ler` e não muda o botão primário. Por isso o botão aparece também no livro fora da estante, e desfavoritar não remove nada da estante.
- Na web, a mesma linha fica na coluna fixa da esquerda: `Alterar status` com largura flexível e o quadrado de 40 por 40px (medida de web), `space-3` de gap.

**C. Seção de notas, logo abaixo da barra de ação (mobile) ou do bloco do título (web).**

Componente `Nota geral vs Nota dos leitores` conforme design §4.4, seguido do histograma quando houver notas de leitores.

- **Container:** fundo `papel-elevado`, `radius` 16, padding `space-5`, sem sombra, largura total da área de conteúdo no mobile e até 480px na web. Sem título de seção acima: os rótulos dos dois blocos já dizem o que é.
- **Dois blocos lado a lado**, de largura igual, separados por um divisor **vertical** de 1px `linha` com a altura do conteúdo. Cada bloco, alinhado à esquerda, de cima para baixo:
  - Rótulo em `label` `grafite`: `Nota geral` no da esquerda, `Nota dos leitores` no da direita.
  - `space-2` abaixo, a nota em `num-display` `tinta`, com `Star` (Phosphor, `fill`, 24px, `musgo`) à esquerda e `space-2` de gap: `4,3` e `4,2`.
  - `space-1` abaixo, a contagem em `caption` `grafite`: `412 avaliações` e `36 leitores`.
- **Indicador ausente** (RN-06.3): o bloco mantém o rótulo, e no lugar da nota e da contagem aparece só `Sem nota` em `caption` `grafite-suave`, sem estrela, sem `0,0`, sem traço. O outro bloco continua normal. **Os dois nunca se combinam num número só**, e nenhum texto explica um pelo outro.
- **Histograma das notas dos leitores** (RF-ACV-04, design §4.4), só quando `Nota dos leitores` existe:
  - `space-4` abaixo do container, fora dele, rótulo em `label` `grafite`: `Distribuição das notas dos leitores`.
  - `space-3` abaixo, **onze linhas**, uma por valor de RN-06, de `5` no topo até `0` embaixo, com `space-1` entre elas. Cada linha tem 20px de altura e três partes:
    - À esquerda, 44px de largura, o valor em `num-inline` no tamanho de `caption`, cor `grafite`, alinhado à direita, seguido de `Star` (Phosphor, `regular`, 16px, `grafite`).
    - No meio, ocupando o resto, trilha de 8px de altura, `radius-full`, fundo `musgo-fundo`, com preenchimento `musgo` proporcional. **A faixa com mais leitores ocupa a trilha inteira** e as outras são proporcionais a ela.
    - À direita, 88px de largura, a contagem em `caption` `grafite`, alinhada à direita: `12 leitores`, `1 leitor`. Faixa sem nenhum leitor mostra a trilha vazia e `nenhum` em `caption` `grafite-suave`.
  - Uma série só, em `musgo`. Sem legenda de cor, sem eixo, sem grade, sem percentual.
- **Sem nota dos leitores, sem histograma.** Nada de histograma zerado, nada de trilhas vazias decorativas.
- **Sem nota geral e sem nota dos leitores**, o container aparece com os dois blocos em `Sem nota` e o histograma não aparece.

**D. Seção `Assuntos`, depois da sinopse** (RF-ACV-21, design §5.2).

- Título de seção `Assuntos` em `title-lg` `tinta`.
- `space-3` abaixo, os chips em linhas que quebram (não faixa rolável, porque um livro tem poucos assuntos), `space-2` de gap.
- Chip conforme design §5.2: `radius-full`, borda de 1px `linha`, fundo transparente, padding `space-2 space-4`, texto em `caption` **em caixa alta**, cor `tinta`, e `MagnifyingGlass` (Phosphor, `regular`, 16px, `grafite`) à esquerda com `space-1` de gap, para dizer que o chip leva à busca e não é só etiqueta.
- Chips de `Torto Arado`: `Romance`, `Literatura brasileira`, `Drama`.
- Tocar leva à aba `Descobrir` com aquele assunto como filtro ativo, e o item ativo do shell passa a ser `Descobrir`.
- Livro sem nenhum assunto reconhecido (RN-21.4): a seção inteira some, sem título e sem aviso.

**E. Seção `Ficha` com links** (RF-ACV-10, 11 e 12).

- As linhas continuam: rótulo em `label` `grafite` à esquerda, valor à direita, divisor de 1px `linha` entre elas, `space-3` de padding vertical.
- **`Autor` e `Editora` viram links:** valor em `body` peso 600 `musgo`, seguido de `CaretRight` (Phosphor, `regular`, 16px, `musgo`) com `space-1` de gap. A linha inteira é a área tocável, com no mínimo 48px de altura.
- **`Série` entra como terceira linha só quando o livro pertence a uma série**, entre `Editora` e `ISBN`. O nome da série é o link, no mesmo tratamento, e o número de ordem vem depois em `body` `grafite`, fora do link: `Filhos do Éden` · `volume 1`. `Torto Arado` não pertence a série, então nos artboards de `Torto Arado` a linha não existe.
- **`ISBN` continua texto** em `body` `tinta`, sem link.
- Na web, hover no link sublinha o valor, com `dur-fast`, e o foco de teclado usa o contorno de 2px `musgo`.

### 4.2 Resenhas: reações, Markdown e menu (entra onde a lista de resenhas aparece)

Vale para `Resenha com spoiler` (mobile), `Resenha com spoiler e hover de card` (web), `Padrão, modo escuro` quando a lista estiver visível e para os artboards novos de 5.3 e 5.4.

- **Cabeçalho da resenha:** avatar de 40px, nome em `title-sm` `tinta`, `@username` em `caption` `grafite-suave`, estrelas `sm` de 16px à direita, como já está. **À direita das estrelas entra o `DotsThree`** (Phosphor, `regular`, 20px, `grafite`), alvo de 48px, com `space-2` de gap. Ele só existe em resenha de **outro leitor**; resenha do próprio leitor não tem esse menu nem reações.
- **Corpo em Markdown** (RN-13), ainda em `body-lg` Newsreader 400 `tinta`:
  - negrito em Newsreader 600, itálico em Newsreader italic, tachado com risco de 1px na cor do texto;
  - lista não ordenada com marcador de ponto em `tinta` e lista ordenada com numeral, recuo de `space-5`, `space-1` entre itens;
  - citação em bloco com borda esquerda de 2px `linha`, padding esquerdo `space-4`, texto em Newsreader 400 `grafite`.
  - Nada de link, imagem, código, tabela nem HTML: marcação fora do subconjunto aparece **como texto literal**.
- **Rodapé da resenha:** a data em `caption` `grafite-suave`, como já está, e, `space-3` abaixo, a **linha de reações**, alinhada à esquerda, `space-4` entre os dois botões:
  - Cada botão tem ícone de 20px e a contagem ao lado em `caption`, `space-2` de gap, padding `space-2 space-3`, `radius` 12, sem borda, fundo transparente, alvo de 48px de altura.
  - `ThumbsUp` com `12 curtidas`; `ThumbsDown` com `1 descurtida`. Contagem zero aparece como `0 descurtidas`, porque é contagem real, não indicador ausente.
  - Inativo: ícone `regular` `grafite`, texto `grafite`.
  - Ativo: ícone `fill` `musgo`, texto `musgo` peso 600. **Só um dos dois pode estar ativo** por resenha; tocar no outro troca a reação, tocar no ativo retira.
  - As duas contagens ficam sempre separadas, nunca como saldo nem como percentual.
- **Resenha com spoiler oculto:** o cabeçalho, o menu e a linha de reações aparecem normalmente; só o corpo continua oculto no bloco existente.
- Na web, o card de resenha ganha o `DotsThree` no canto superior direito do card e a linha de reações no rodapé do card, com as mesmas regras. Hover no botão de reação: fundo `linha`, `dur-fast`.

### 4.3 `Padrão, leitura em andamento` (linha mobile)

- Entram A, B e C de 4.1. O botão `Heart` fica **não favorito**.
- A seção de notas começa logo abaixo da barra de ação e é cortada naturalmente pela barra inferior do shell, como o resto da página.
- Notas: `Nota geral` `4,3` com `412 avaliações`; `Nota dos leitores` `4,2` com `36 leitores`. Valores mock, coerentes com o histograma de 5.2.

### 4.4 `Livro fora da estante` (linha mobile)

- Entram A, B e C. A linha secundária fica `Iniciar leitura` mais o quadrado do `Heart`, e **o `Heart` está favorito**, em `fill` `musgo`, enquanto o primário continua `Adicionar à estante`. É o artboard que prova que favorito é independente da estante: sem status pill, sem progresso, e ainda assim favoritado.
- Notas iguais às de 4.3.

### 4.5 `Sinopse pendente` (linhas mobile e web)

- Entram A, B e C, e as seções D e E onde a rolagem as alcançar. A seção `Assuntos` fica **real** e depois do skeleton da sinopse: só a sinopse espera o fluxo assíncrono.
- Notas iguais às de 4.3.

### 4.6 `Sinopse ausente` (linhas mobile e web)

- Entram A, B e C. Este artboard mostra o caso **só nota geral** (RN-06.1): `Nota geral` com `3,9` e `27 avaliações`; `Nota dos leitores` em `Sem nota`; **sem histograma**.
- Os dados valem para `Insubmissas Lágrimas de Mulheres`, o livro que o artboard já mostra.

### 4.7 `Capa em placeholder` (linha mobile)

- Entram A, B e C. Este artboard mostra o caso **nenhum dos dois indicadores**: os dois blocos em `Sem nota`, sem histograma. `Becos da Memória` não tem nota na fonte externa e ninguém do app avaliou.

### 4.8 `Resenha com spoiler` (linha mobile)

- Entra 4.2 inteiro: `DotsThree` nas três resenhas, Markdown no corpo de `Marina Antunes`, linha de reações nas três.
- Corpo de `Marina Antunes` renderizado (texto cru na seção 8). A curtida de `Marina Antunes` está **ativa**, porque o leitor já curtiu.
- Reações: `Marina Antunes` `12 curtidas`, `1 descurtida`; `Rafael Bittencourt` `4 curtidas`, `3 descurtidas`; `Letícia Nakamura` `7 curtidas`, `0 descurtidas`.

### 4.9 `Sem resenhas` (linha mobile)

- A seção `Resenhas` fica como está.
- Abaixo dela, onde a rolagem alcançar, entra a seção `Frases e trechos` no estado vazio: título de seção, `Nenhuma frase ainda` em `caption` `grafite` ao lado, texto em `body` `grafite`: `Guarde um trecho que marcou você, com a página em que ele está.` e o botão textual `musgo`: `Adicionar a primeira`.

### 4.10 `Carregando a página` (linha mobile)

- Header continua só com `ArrowLeft` e `Bell`: o `DotsThree` age sobre o livro e só aparece quando o livro carrega.
- Na área da barra de ação, o skeleton passa a ter a forma nova: uma barra larga `radius-full` para o primário e, abaixo, uma barra `radius` 12 com o resto da largura mais um quadrado de 48px `radius` 12 para o favorito. Um retângulo `capa-placeholder` de `radius` 16 e 104px de altura abaixo, na forma do container de notas.
- Continua um único fade de entrada, sem shimmer e sem spinner.

### 4.11 `Erro de carregamento` (linha mobile)

Não muda. Header com `ArrowLeft` e `Bell`, sem `DotsThree`, sem favorito.

### 4.12 `Padrão, leitura em andamento` (linha web)

- **Coluna fixa da esquerda:** capa, pill, progresso, `Registrar progresso` como estão; a linha `Alterar status` mais o quadrado de `Heart` de 40px (não favorito); a ficha com `Autor` e `Editora` como links (4.1 E).
- **Menu `Mais ações`:** a página do livro na web não tem faixa de header própria, e esta edição não cria uma. O `DotsThree` entra no **canto superior direito da área de conteúdo**, alinhado à primeira linha do título, que é onde o shell põe as ações contextuais do header de conteúdo: botão quadrado de 40px, `radius` 12, borda de 1px `linha`, `DotsThree` de 20px `tinta`. Sem sino, como em toda a web.
- **Coluna da direita:** título `display-hero`, autor, metadados como estão; `space-8` abaixo, a seção de notas (4.1 C) com o container de até 480px e o histograma abaixo dele, com a mesma largura; `space-8` abaixo, `Sua avaliação`; depois `Sinopse` e, depois dela, `Assuntos` (4.1 D), onde a rolagem alcançar.
- Notas iguais às de 4.3.

### 4.13 `Resenha com spoiler e hover de card` (linha web)

- Entra 4.2 nos três cards. O card de `Marina Antunes` continua em hover, com a borda `linha` visível; o de `Rafael Bittencourt` continua oculto. A curtida de `Marina Antunes` ativa, como no mobile.
- O `DotsThree` fica no canto superior direito de cada card, à direita das estrelas.

### 4.14 `Padrão, modo escuro` (mobile e web)

- Entram os mesmos elementos de 4.3 e 4.12, com o tratamento escuro de 4.15.

### 4.15 Tratamento escuro dos elementos novos

Modo escuro é lock de página inteira: nenhuma seção inverte no meio da rolagem. Superfície elevada fica **mais clara** que o fundo. Shadows com metade da opacidade.

- Container de notas em `noite-elevada`, divisor vertical `linha-noite`, rótulos em `grafite-claro`, notas em `papel-suave`, estrela em `musgo-claro`, contagens em `grafite-claro`, `Sem nota` em `grafite-fundo-escuro`.
- Histograma: trilha `musgo-fundo-escuro`, preenchimento `musgo-claro`, valores e contagens em `grafite-claro`, `nenhum` em `grafite-fundo-escuro`.
- Botão `Heart`: borda `linha-noite`; não favorito em `papel-suave`; favorito em `fill` `musgo-claro`.
- `DotsThree` do header em `papel-suave`; o das resenhas em `grafite-claro`.
- Chips de assunto com borda `linha-noite`, texto `papel-suave`, lupa `grafite-claro`.
- Links da ficha em `musgo-claro`.
- Reações inativas em `grafite-claro`; ativas em `fill` `musgo-claro` com texto `musgo-claro`.
- Citação em bloco dentro da resenha com borda `linha-noite` e texto `grafite-claro`; blockquote das frases com borda `musgo-fundo-escuro` e texto `papel-suave`.
- Sheet em `noite-elevada`, alça `linha-noite`, scrim preto a 60%. Dropdown da web em `noite-elevada` com borda `linha-noite` e hover em `linha-noite`.
- `Denunciar resenha` em `rubi-claro`.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Página do livro · Menu de ações aberto`

- Base: o artboard `Padrão, leitura em andamento`, coberto pelo scrim, com o sheet aberto.
- Scrim `#171512` a 40%.
- Bottom sheet conforme design §4.11: fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo; padding inferior soma a área segura.
- Cabeçalho do sheet: card compacto do livro, com capa de 60 por 90px, canto vivo, e ao lado `Torto Arado` em `title-sm` `tinta` e `Itamar Vieira Junior` em `caption` `grafite`. Divisor `linha` abaixo.
- Dois itens de 56px, com ícone Phosphor `regular` de 20px `tinta` e rótulo em `body` `tinta`, `space-4` de gap, divisor `linha` entre eles:
  - `ListPlus` · `Adicionar à lista`
  - `PaperPlaneTilt` · `Recomendar a um leitor`
- Nenhum item destrutivo neste menu.
- `space-4` abaixo, botão textual `grafite` de largura total: `Cancelar`.
- Os dois itens aparecem sempre no livro oficial. Quem já tem o livro na estante do destinatário, quem não é seguidor mútuo e o limite de recomendações são tratados na tela de recomendar, não aqui: o menu não esconde nem desabilita o item.

#### 5.2 `Página do livro · Notas dos leitores (rolada)`

- Página rolada até que a seção de notas fique no topo, logo abaixo do header.
- Container de notas completo (4.1 C) com as duas notas de 4.3 e, abaixo, o histograma inteiro com as onze linhas:

| Valor | Leitores |
|---|---|
| 5 | 12 leitores |
| 4,5 | 9 leitores |
| 4 | 7 leitores |
| 3,5 | 3 leitores |
| 3 | 2 leitores |
| 2,5 | 1 leitor |
| 2 | 1 leitor |
| 1,5 | nenhum |
| 1 | 1 leitor |
| 0,5 | nenhum |
| 0 | nenhum |

- A linha `5` é a de maior contagem e ocupa a trilha inteira; as outras são proporcionais a ela.
- Abaixo, `space-6`, a seção `Sua avaliação` como está, e o começo da `Sinopse`, cortada pela barra inferior.

#### 5.3 `Página do livro · Assuntos e ficha de livro em série (rolada)`

- **Outro livro**, para mostrar a linha `Série`: `Filhos do Éden: Herdeiros de Atlântida`, de Eduardo Spohr, Verus, 2011, `476 páginas`, volume 1 da série `Filhos do Éden`. Dados mock.
- Página rolada até o fim da sinopse. De cima para baixo: as últimas três linhas da sinopse em Newsreader; `space-6`; a seção `Assuntos` com os chips `Fantasia` e `Ficção científica`; `space-6`; a seção `Ficha` com quatro linhas: `Autor` / `Eduardo Spohr` (link), `Editora` / `Verus` (link), `Série` / `Filhos do Éden` (link) seguido de `volume 1` em `grafite`, `ISBN` / `9788576860883` em texto; `space-6`; o título da seção `Resenhas`, cortado pela barra inferior.
- Barra inferior com `Descobrir` ativo.

#### 5.4 `Página do livro · Resenhas e frases (rolada)`

- Livro `Torto Arado`. Página rolada até a seção `Resenhas`.
- Seção `Resenhas` com `28 resenhas`, e duas resenhas completas com 4.2 aplicado:
  - `Marina Antunes`, com o corpo em Markdown da seção 8 renderizado (negrito, lista não ordenada de dois itens e citação em bloco), curtida ativa.
  - `Letícia Nakamura`, com o corpo em texto simples e um trecho em itálico.
- Botão textual `musgo`: `Ver todas as resenhas`.
- `space-6` abaixo, a seção **`Frases e trechos`** (RF-AVA-07, design §5.2):
  - Título de seção `Frases e trechos` em `title-lg` `tinta`, com a contagem ao lado em `caption` `grafite`: `14 frases`.
  - Até **três frases**, as mais recentes, com `space-5` entre elas. Cada frase:
    - Texto em `body-lg` **Newsreader 400 italic** `tinta`, em blockquote com borda esquerda de 2px `musgo-fundo` e padding esquerdo `space-4`. Terceiro dos três lugares da serifa. Sem aspas decorativas grandes, sem ícone de aspas.
    - `space-2` abaixo, alinhado ao texto, em `caption` `grafite`: `Página 57 · @marina.antunes`. Na frase do próprio leitor, `Página 112 · você`.
  - Ao fim, na mesma linha, `Ver todas as frases` à esquerda e `Adicionar frase` à direita, os dois botões textuais `musgo`, este com `Plus` (Phosphor, `regular`, 20px) à esquerda.
  - A seção não tem ação de excluir nem de remover: isso mora na lista completa de frases.
- Parte da seção de frases é cortada pela barra inferior, se não couber.

#### 5.5 `Página do livro · Menu da resenha aberto`

- Base: o artboard 5.4, coberto pelo scrim `#171512` a 40%, com o sheet aberto a partir do `DotsThree` da resenha de `Letícia Nakamura`.
- Bottom sheet conforme design §4.11, com a mesma base de 5.1.
- Cabeçalho do sheet em `caption` `grafite`: `Resenha de Letícia Nakamura`. Divisor `linha` abaixo.
- Um item de 56px: `Flag` (Phosphor, `regular`, 20px, `rubi`) e `Denunciar resenha` em `body` `rubi`. É destrutivo conforme design §4.1 e §4.11, por isso a cor.
- `space-4` abaixo, botão textual `grafite` de largura total: `Cancelar`.
- Tocar em `Denunciar resenha` abre a tela de denúncia, onde fica o campo de motivo e a confirmação. Aqui não se pede confirmação, porque o toque ainda não denuncia nada.

### Linha 2, web, no fim da linha, nesta ordem

#### 5.6 `Página do livro · Menu de ações aberto` (web)

- Base: `Padrão, leitura em andamento` da web.
- Dropdown ancorado abaixo do `DotsThree`, alinhado pela borda direita do botão, `space-2` abaixo dele: 248px de largura, fundo `papel`, borda de 1px `linha`, `radius` 12, `elev-2`, padding `space-2` vertical. **Sem scrim**: o dropdown não bloqueia a página.
- Dois itens de 44px, padding lateral `space-4`, ícone `regular` de 20px `tinta`, rótulo em `body` `tinta`, `space-3` de gap: `ListPlus` · `Adicionar à lista` e `PaperPlaneTilt` · `Recomendar a um leitor`. O primeiro em hover, com fundo `linha`, para mostrar o estado.
- Sem `Cancelar`: `Esc`, clique fora e novo clique no `DotsThree` fecham.

#### 5.7 `Página do livro · Resenhas e frases (rolada)` (web)

- Página rolada até as resenhas. A coluna da esquerda continua fixa, com a capa no topo.
- Coluna da direita: grid de duas colunas de cards de resenha, com gap `space-6`, com 4.2 aplicado. No card de `Letícia Nakamura` o dropdown do `DotsThree` está **aberto**, com a mesma base de 5.6 e um item só: `Flag` · `Denunciar resenha` em `rubi`.
- Abaixo do grid, `Ver todas as resenhas`, e `space-8` abaixo a seção `Frases e trechos` com as três frases de 5.4, em uma coluna com `max-width` de 68ch, e os dois botões textuais no fim.

### Linha 3, modo escuro, no fim da linha

#### 5.8 `Página do livro · Resenhas e frases, modo escuro`

- O artboard 5.4 no modo escuro, para conferir no escuro as reações ativas, o Markdown e o blockquote das frases (4.15).

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards do Período 1 continuam, com as mudanças da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Nota geral vs Nota dos leitores e histograma | documento-de-design §4.4 |
| Chips de assunto acionáveis | documento-de-design §5.2 |
| Autor, editora e série levando às páginas respectivas | documento-de-design §5.2 |
| Frases e trechos em blockquote Newsreader italic | documento-de-design §5.2 e §3.2.2 |
| Botão secundário e textual; destrutivo em `rubi` | documento-de-design §4.1 |
| Bottom sheet, menu de ações e scrim | documento-de-design §4.11 |
| Estrela `Star` e `StarHalf` | documento-de-design §4.3 |
| Ícone `fill` só para estado ativo (favorito, curtida) | documento-de-design §6 |
| Resenha em Markdown, subconjunto | REQUISITOS.md RN-13 |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Botão quadrado de ícone** do favorito, na variante secundária, 48px no mobile e 40px na web, com o estado ativo só pelo ícone.
- **Superfície do componente de notas** (`papel-elevado`, `radius` 16, padding `space-5`, largura máxima de 480px na web). O §4.4 mostra uma caixa, mas não define a superfície.
- **Anatomia do histograma**: onze linhas de 20px, trilha de 8px, maior faixa ocupando a trilha inteira, contagem com unidade e `nenhum` na faixa vazia. O §4.4 fixa só "compacto, com meia estrela, contagem e barras em `musgo`".
- **Lupa dentro do chip de assunto** e chips em linhas que quebram na página do livro, em vez da faixa rolável do Descobrir.
- **Linha de ficha com link**, com `CaretRight`, e o número de ordem da série fora do link.
- **Linha de reações da resenha**: dois botões de ícone com contagem, ativo em `fill` `musgo`, um ativo por vez.
- **Estilo do Markdown renderizado** na resenha: pesos, listas e citação em bloco com borda `linha` e texto `grafite`.
- **Blockquote de frase**: borda esquerda de 2px `musgo-fundo` e linha de referência `Página N · @username`.
- **Dropdown de menu na web**, ancorado ao botão e sem scrim. O §4.11 diz que a partir de 768px a sobreposição vira dialog centrado; aqui o menu de ações vira dropdown, por decisão do grupo em 28/09/2026. Precisa ser ratificado no §4.11.
- **Ações contextuais da web sem faixa de header**: o `DotsThree` no canto superior direito do conteúdo, alinhado ao título.

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Rótulo do bloco esquerdo de notas | não existia | `Nota geral` |
| Rótulo do bloco direito de notas | não existia | `Nota dos leitores` |
| Nota geral | não existia | `4,3` / `3,9` |
| Contagem da nota geral | não existia | `412 avaliações` / `27 avaliações` / `1 avaliação` |
| Nota dos leitores | não existia | `4,2` |
| Contagem da nota dos leitores | não existia | `36 leitores` / `1 leitor` |
| Indicador ausente | não existia | `Sem nota` |
| Rótulo do histograma | não existia | `Distribuição das notas dos leitores` |
| Faixa do histograma | não existia | `12 leitores`, `1 leitor`, `nenhum` |
| Título de seção | não existia | `Assuntos` |
| Chips | não existia | `Romance`, `Literatura brasileira`, `Drama`, `Fantasia`, `Ficção científica` |
| Rótulo novo da ficha | não existia | `Série` |
| Ordem na série | não existia | `volume 1` |
| Rótulo acessível do favorito | não existia | `Favoritar` / `Remover dos favoritos` |
| Rótulo acessível do menu | não existia | `Mais ações` / `Mais ações da resenha` |
| Menu de ações | não existia | `Adicionar à lista`, `Recomendar a um leitor`, `Cancelar` |
| Cabeçalho do menu da resenha | não existia | `Resenha de Letícia Nakamura` |
| Menu da resenha | não existia | `Denunciar resenha`, `Cancelar` |
| Reações | não existia | `12 curtidas`, `1 curtida`, `1 descurtida`, `3 descurtidas`, `0 descurtidas` |
| Rótulo acessível das reações | não existia | `Curtir resenha` / `Descurtir resenha` |
| Título de seção | não existia | `Frases e trechos` |
| Contagem de frases | não existia | `14 frases` |
| Referência da frase | não existia | `Página 57 · @marina.antunes`, `Página 112 · você` |
| Ações de frases | não existia | `Ver todas as frases`, `Adicionar frase` |
| Frases vazias, rótulo | não existia | `Nenhuma frase ainda` |
| Frases vazias, texto | não existia | `Guarde um trecho que marcou você, com a página em que ele está.` |
| Frases vazias, ação | não existia | `Adicionar a primeira` |

**Corpo em Markdown de `Marina Antunes`** (texto cru, como o leitor escreveu; o artboard mostra renderizado):

```
A terra e a fala são a mesma disputa no livro inteiro. **Levei três dias** e ainda estou pensando na parte final.

O que ficou comigo:

- a troca de narradora no meio da história
- o silêncio como *herança*

> Não é um livro sobre o passado.
```

**Corpo de `Letícia Nakamura`**, com itálico: `A troca de narradora no meio da história é o melhor recurso do romance. Demorei a entender e depois *não consegui parar*.`

**Frases de `Torto Arado`** (texto mock escrito para o protótipo, não é citação do livro):

| Frase | Referência |
|---|---|
| `A terra não era nossa, mas era a gente que sabia o nome de cada pedaço dela.` | `Página 57 · @marina.antunes` |
| `Aprendi cedo que o silêncio também é uma forma de dizer quem manda.` | `Página 112 · você` |
| `Quando a chuva voltou, ninguém comemorou em voz alta, com medo de espantar.` | `Página 203 · @joao.pedrosa` |

Nenhuma copy do Período 1 é substituída. Zero em-dash, zero emoji. Todo número tem unidade, exceto as notas de 0 a 5, que vêm com a estrela, e o percentual da barra.

---

## 9. Acessibilidade e interação do que muda

- **Favorito:** botão com `aria-pressed`, rótulo acessível `Favoritar` quando não favorito e `Remover dos favoritos` quando favorito. O estado não depende só de cor: muda o peso do ícone (`regular` para `fill`). Alvo de 48px no mobile.
- **Favorito, falha:** a troca é otimista; se o servidor recusar, o ícone volta ao estado anterior e o leitor recebe mensagem em pt-BR acionável. A escrita é idempotente, então tocar duas vezes não cria dois favoritos.
- **Menu `Mais ações`:** `DotsThree` com rótulo acessível `Mais ações`. Sheet e dropdown prendem o foco enquanto abertos, `Esc` e toque ou clique fora fecham, e o foco volta ao `DotsThree`. No dropdown da web, setas navegam entre os itens.
- **Notas:** cada bloco é lido como texto completo, por exemplo "Nota geral, 4,3 de 5, 412 avaliações" e "Nota dos leitores, sem nota". O histograma é uma lista legível por leitor de tela, uma linha por valor, por exemplo "5 estrelas, 12 leitores", e não depende da largura da barra para comunicar.
- **Chips de assunto:** são links com rótulo acessível "Buscar livros de Romance". Foco visível com contorno de 2px `musgo` e offset de 2px.
- **Ficha:** a linha inteira é o alvo, com no mínimo 48px de altura no mobile. O link se distingue do texto também pelo `CaretRight` e pelo peso 600, não só pela cor.
- **Reações:** cada botão com `aria-pressed` e rótulo `Curtir resenha` ou `Descurtir resenha`, seguido da contagem. O estado ativo muda o peso do ícone, não só a cor. A reação é idempotente e tem limite de frequência no servidor; quando o limite bater, a reação volta ao estado anterior com mensagem acionável.
- **Markdown:** a resenha renderizada preserva a semântica (lista é lista, citação é citação) para leitor de tela. Marcação não suportada aparece literal.
- **Denunciar:** o item do menu só abre a tela de denúncia. A confirmação explícita (RNF-USA-04) fica naquela tela, antes do envio.
- **Frases:** o blockquote é marcado como citação, com a referência de página associada a ele.
- `prefers-reduced-motion`: a troca do favorito e das reações vira instantânea, e sheet e dropdown entram sem deslizar.
- Contraste: `Sem nota` e `nenhum` usam `grafite-suave` porque o rótulo do bloco e a ausência da barra já carregam a informação; nenhum texto de corpo usa `grafite-suave`.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Hero, status, progresso, sinopse, spoiler, placeholder de capa, erro e shell ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe as telas de destino** (adicionar à lista, recomendar, denunciar, lista de frases, adicionar frase, páginas de autor, editora e série) dentro deste canvas.
- Não crie faixa de header na web para acomodar o menu.
- Não transforme o autor do hero em link: o link fica na ficha.

**Específico da página do livro no Período 2**

- **Não combine as duas notas.** Nada de média das duas, nada de "nota final", nada de uma nota grande com a outra pequena embaixo.
- **Não mostre nota ausente como `0,0`, `0` ou traço.** Ausente é `Sem nota`.
- Não desenhe histograma zerado quando não há notas de leitores.
- Não desenhe mais de uma série no histograma nem use outra cor que não `musgo`.
- Não mostre as curtidas e descurtidas como saldo, percentual ou barra de proporção.
- Não deixe as duas reações ativas ao mesmo tempo.
- Não desenhe reações nem `Denunciar resenha` na resenha do próprio leitor.
- Não desenhe botão de favoritar com texto, contagem ou coração vermelho. É ícone `Heart`, e o estado ativo é `musgo`.
- Não faça o favorito mudar o status da estante nem o botão primário.
- Não desenhe `Adicionar à lista` e `Recomendar` como botões soltos na barra de ação: eles moram no menu.
- Não desabilite nem esconda `Recomendar a um leitor` por antecipação: os bloqueios são explicados na tela de recomendar.
- Não desenhe link, imagem, bloco de código nem tabela dentro da resenha.
- Não desenhe excluir frase nem remover frase nesta página.
- Não use aspas decorativas grandes nem ícone de aspas nas frases.
- **Ausência de sinopse continua não sendo erro.** Nada de `rubi`, `ambar`, ícone de alerta ou botão de tentar de novo na sinopse.
- A página continua abrindo sem esperar a sinopse.
- Não use a capa como fundo desfocado do hero. O fundo do hero é `papel` sólido.
- Não arredonde o canto da capa, nem no card compacto do sheet.
- Não desenhe placeholder de capa com livro genérico ilustrado.
- Não desenhe dois CTAs com a mesma intenção.
- Não desenhe o corpo do spoiler borrado, censurado por caractere ou coberto por sobreposição translúcida.
- Não desenhe a nota do leitor como `0,0` quando não há nota.
- Não desenhe o percentual como `0%` nem `100%`. Zero é `Iniciada`, cem é `Concluída`.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais: corpo da resenha, frases e trechos, sinopse. Notas, histograma, chips, ficha, menu e reações são Manrope e JetBrains Mono.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela. A caixa alta do chip de assunto vem do §5.2 e não é overline.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão, em texto de título ou na barra do histograma.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.
- Nada de animação de coração pulsando, confete ou partícula ao favoritar ou curtir.

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
- Nada de botão destrutivo preenchido. Destrutivo é outline ou texto `rubi`.

**Interações destrutivas**

- Denunciar passa por confirmação, na tela de denúncia. Nada de denúncia em um toque só.
- Nada de undo em ação destrutiva pesada.

**Métricas e dados**

- Nada de gráfico em roxo ou teal de IA. Gráfico usa `musgo` como principal.
- Nada de gráfico com mais de três séries. O histograma tem uma.
- Nada de número exibido sem unidade: `12 leitores`, `412 avaliações`, `14 frases`.
- Nada de percentual no histograma.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo com as notas, os assuntos e a ficha.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px. Abaixo de 768px, o dropdown vira o bottom sheet do mobile.
- Nada de conteúdo essencial escondido em hover. As reações e o menu da resenha aparecem sempre, não só no hover do card.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores nem "mais curtidas da semana".
- Sem mensagem direta entre usuários: recomendar não é conversa.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
- Sem camada de obra: a página é da edição, e nada agrupa edições nela.
