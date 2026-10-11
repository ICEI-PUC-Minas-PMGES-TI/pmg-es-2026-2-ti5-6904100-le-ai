# F-ACV-OPC · Cadastro de livro pessoal (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Cadastro de livro pessoal`, gerado por `docs/design/periodo-1/F-ACV-CADASTRO/cadastro-pessoal.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-ACV-CADASTRO/cadastro-pessoal.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-ACV-OPC.md
**Requisitos que entram:**
- F-ACV-OPC: RF-ACV-22 (o dono informa assuntos ao cadastrar e ao editar um livro pessoal, escolhendo-os do conjunto curado)

**Não funcionais:** RNF-SEC-13 (a entrada é validada por schema: só ids do conjunto curado, nunca texto livre), RNF-SEC-02 (só o dono altera os assuntos do seu livro), RNF-SEC-06 (os assuntos de livro pessoal não entram em busca, filtro nem catálogo), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-21 (conjunto curado e fechado, cerca de 30 gêneros; um livro pode ter mais de um assunto, sem limite rígido, recomendando-se no máximo cinco; em livro pessoal o dono escolhe do mesmo conjunto e o assunto não afeta contadores de catálogo), RN-03 (livro pessoal fora da busca, do catálogo e das páginas de autor, editora e série)
**Versão web:** sim. RF-ACV-22 tem marcação na coluna Web de `REQUISITOS.md` §5.2.

---

## 1. O que muda e por quê

O formulário de livro pessoal ganha **um campo novo, `Assuntos`**, opcional, entre `Número de páginas` e `Sinopse`. É o mesmo formulário de criar e de editar, então o campo aparece nos dois modos: vazio na criação, com os assuntos já escolhidos na edição.

O campo **não é de texto**. O conjunto de assuntos é curado e fechado (RN-21.1): o leitor escolhe, não cria. Por isso o campo mostra os assuntos escolhidos como chips e um botão que abre um **seletor**: bottom sheet no mobile, dialog centrado na web, com a lista inteira do conjunto curado em chips marcáveis e uma busca que só filtra essa lista. A busca nunca oferece "criar assunto".

**Recomendar até cinco não é o mesmo que bloquear em cinco.** RN-21.2 diz "sem limite rígido; recomenda-se no máximo cinco". O sexto assunto pode ser escolhido: o helper troca para um aviso de recomendação, e o formulário continua salvando.

**O seletor carrega a lista do servidor**, e essa carga pode demorar (cold start) ou falhar. O assunto é opcional, então a falha fica restrita ao seletor: o leitor fecha, salva o livro sem assuntos e escolhe depois, na edição.

**O que deixa de valer do prompt do Período 1:** a proibição "Não desenhe campo de editora, série ou assunto" perde a parte do **assunto**, que agora é RF-ACV-22. Editora e série continuam proibidas. Todas as outras regras daquele prompt continuam valendo, e a seção 10 abaixo as repete.

**Dados do conjunto curado** (os 31 nomes da lista fechada do grupo, na ordem alfabética em que aparecem no seletor): `Autoajuda`, `Aventura`, `Biografia`, `Ciência`, `Conto`, `Crônica`, `Distopia`, `Economia`, `Espiritualidade`, `Fantasia`, `Ficção científica`, `Ficção literária`, `Filosofia`, `História`, `Infantojuvenil`, `Jovem adulto`, `Memórias`, `Negócios`, `Poesia`, `Policial`, `Política`, `Psicologia`, `Quadrinhos`, `Romance`, `Romance histórico`, `Saúde e bem-estar`, `Sociologia`, `Suspense`, `Teatro`, `Terror`, `Thriller`.

**Assuntos do livro de exemplo** `Cartas de um sertanejo`: `História` e `Memórias`.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Cadastro de livro pessoal · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
- Os artboards novos entram **no fim da linha** da sua plataforma, depois dos existentes, sem reordenar nenhum.
- Os artboards existentes continuam mostrando o **topo do formulário**. Onde o campo `Assuntos` ficar abaixo da dobra, ele aparece até onde a rolagem alcançar; os artboards novos marcados `(rolada)` mostram o formulário rolado até o campo.

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

CHIPS
Chip de seleção: radius-full, padding space-2 vertical e space-3 horizontal,
texto em caption, altura visível de 32px dentro de alvo de 48px no mobile.
Inativo: borda de 1px linha, fundo transparente, texto tinta.
Ativo: fundo musgo-fundo, sem borda, texto musgo peso 600, com ícone de
estado à esquerda. Seleção nunca comunicada só pela cor.

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

- **O shell inteiro**, como está no canvas: barra inferior do mobile com **Descobrir** ativo, sidebar da web, header mobile com `ArrowLeft`, título em `display` e sino.
- **A área de capa** com seus quatro estados (vazio, enviando, preenchido, erro) e a regra `Opcional. JPG, PNG ou WEBP, até 5 MB.`
- **Os campos `Título`, `Autor`, `Número de páginas` e `Sinopse`**, com labels, placeholders, helpers, contador da sinopse e mensagens de erro do Período 1. Nenhum deles muda de tamanho, ordem ou texto.
- **Não existe campo de ISBN, editora nem série**, como antes.
- **Os botões** `Salvar livro`, `Salvar alterações`, `Salvando`, `Cancelar` e a linha de cold start.
- **A zona de exclusão** do modo edição e a **confirmação de exclusão**, no mobile (bottom sheet) e na web (dialog), com a copy do Período 1.
- **Os artboards** `Enviando a capa`, `Erro de upload`, `Confirmação de exclusão` (mobile e web) e os escuros `erro de upload` e `confirmação de exclusão`: não ganham o campo novo porque o enquadramento deles não alcança essa altura do formulário, e o que mostram não muda.
- **As duas colunas da web**: capa à esquerda em 240px, campos à direita, largura máxima de 880px. O campo novo mora na coluna direita.
- **Toda a copy do Período 1** que não aparece na seção 8.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas.

### 4.1 Elemento novo, desenhado uma vez: campo `Assuntos`

Entra **entre `Número de páginas` e `Sinopse`**, com o mesmo gap de `space-5` entre campos. Os assuntos classificam o livro, como o número de páginas o mede; a sinopse, texto longo, continua por último.

**A. Estrutura do campo**

1. Label `Assuntos` em `label` `grafite`, `space-2` acima do conteúdo, como os outros campos.
2. **Sem nenhum assunto escolhido:** um gatilho com o desenho de campo do §2 (48px no mobile, 44px na web, `radius` 12, borda 1px `linha`, fundo `papel-elevado`), largura total da coluna. Dentro, à esquerda, `Tag` (Phosphor, `regular`, 20px, `grafite`), `space-3` de gap, e o texto em `body` `grafite`: `Escolher assuntos`. À direita, `CaretRight` (Phosphor, `regular`, 20px, `grafite`) no mobile, porque abre um sheet, e `CaretDown` na web, porque abre um dialog sobre a mesma página. Não é campo de digitação: não tem cursor nem placeholder em `grafite-suave`.
3. **Com assuntos escolhidos:** o gatilho dá lugar a uma fileira de chips **ativos** que quebram em linhas, `space-2` de gap, um chip por assunto, em ordem alfabética, a mesma do seletor. Cada chip: fundo `musgo-fundo`, texto `musgo` peso 600, e à direita do texto, `space-1` de gap, um `X` (Phosphor, `regular`, 16px, `musgo`) que remove aquele assunto sem abrir o seletor. Alvo de toque do `X` de 48px no mobile. `space-3` abaixo da fileira, botão textual `musgo` com `PencilSimple` (Phosphor, `regular`, 20px) à esquerda: `Alterar assuntos`, que abre o seletor com a seleção atual marcada.
4. **Helper**, `space-2` abaixo, em `caption` `grafite`, visível o tempo todo: `Opcional. Escolha da lista do Lê Ai, de preferência até 5.`

**B. Aviso de recomendação, a partir do sexto assunto.** O helper é substituído por uma linha com `Warning` (Phosphor, `regular`, 16px, `ambar`) à esquerda, `space-2` de gap, e o texto em `caption` `tinta`: `Você escolheu 6 assuntos. Até 5 ajuda a encontrar o livro com mais precisão.` O número acompanha a seleção. **Não é erro:** sem borda `rubi`, sem bloqueio do botão `Salvar`. O ícone carrega a cor de alerta; o texto fica em `tinta`, porque `ambar` sobre `papel` não passa no contraste de corpo.

**C. Erro de servidor no campo.** Se o servidor recusar a seleção (um assunto saiu do conjunto curado entre a abertura do seletor e o envio), o campo mostra a mensagem em `caption` `rubi` no lugar do helper, como nos outros campos (§2): `Um dos assuntos escolhidos não está mais na lista do Lê Ai. Revise e salve de novo.` Os chips continuam visíveis, e o foco vai para `Alterar assuntos`. Sem artboard próprio: a forma é a do erro de campo que o canvas já tem.

### 4.2 `Criação, formulário vazio` (mobile) e `Criação, formulário vazio` (web)

- Entra o campo `Assuntos` no estado sem assunto (4.1 A, item 2), entre `Número de páginas` e `Sinopse`.
- No mobile, a sinopse desce e passa a ficar parcialmente abaixo da dobra; o botão `Salvar livro` sai da viewport. Desenhe a viewport como ela fica: o enquadramento continua no topo do formulário.
- Na web, o gatilho ocupa a largura da coluna direita e tem 44px.

### 4.3 `Criação, formulário preenchido com capa` (mobile) e `Criação, preenchido com capa` (web)

- O campo `Assuntos` aparece com os chips `História` e `Memórias` (4.1 A, item 3) e `Alterar assuntos` abaixo deles.

### 4.4 `Erro de validação nos campos` (mobile)

- O campo `Assuntos` aparece **no estado sem assunto e sem erro**, entre `Número de páginas` (com erro) e `Sinopse`. O assunto é opcional: a validação não o marca.

### 4.5 `Salvando` (mobile)

- O campo `Assuntos`, com os dois chips, fica desabilitado como os demais: chips com fundo `papel-elevado` e texto `grafite`, sem o `X`; `Alterar assuntos` em `grafite-suave`, sem ação.

### 4.6 `Edição` (mobile) e `Edição` (web)

- O campo `Assuntos` chega preenchido com `História` e `Memórias`, com `Alterar assuntos`. O resto do modo edição, inclusive a zona de exclusão, fica como está.

### 4.7 Linha escura: o artboard escuro de criação preenchida

- Recebe o campo com os dois chips, no tratamento escuro de 4.8.

### 4.8 Tratamento escuro dos elementos novos

Modo escuro é lock de página inteira. Superfície elevada fica **mais clara** que o fundo. Shadows com metade da opacidade.

- Gatilho sem assunto: fundo `noite-elevada`, borda `linha-noite`, `Tag`, texto e caret em `grafite-claro`.
- Chips ativos: fundo `musgo-fundo-escuro`, texto e ícones em `musgo-claro`.
- Chips inativos (no seletor): borda `linha-noite`, texto `papel-suave`.
- `Alterar assuntos` em `musgo-claro`. Helper em `grafite-claro`.
- Aviso de recomendação: `Warning` em `ambar-claro`, texto em `papel-suave`.
- Sheet do seletor em `noite-elevada` sobre scrim preto a 60%, alça `linha-noite`; campo de busca em `noite` com borda `linha-noite`.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Cadastro de livro pessoal · Escolher assuntos`

- Base: o modo criação preenchido, coberto pelo scrim `tinta` a 40%.
- **Bottom sheet** conforme §4.11 do design: fundo `papel`, `radius-lg` só no topo, padding `space-6` lateral e no topo, `elev-3`, alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo. Altura de até 85% da viewport, com a área de chips rolando por dentro e o rodapé fixo.
- De cima para baixo:
  1. Linha do título: `Assuntos` em `title-sm` `tinta` à esquerda; à direita, `2 escolhidos` em `caption` `grafite`.
  2. `space-2`, texto em `caption` `grafite`: `Os assuntos vêm de uma lista fixa do Lê Ai.`
  3. `space-4`, campo de busca de 48px conforme §2, com `MagnifyingGlass` (Phosphor, `regular`, 20px, `grafite`) dentro à esquerda e placeholder `Buscar assunto`. Label visualmente oculto `Buscar assunto` para leitor de tela; o título do sheet faz o papel de label visível.
  4. `space-4`, os **31 chips** do conjunto curado, em ordem alfabética, em linhas que quebram, `space-2` de gap. `História` e `Memórias` ativos, cada um com `Check` (Phosphor, `regular`, 16px, `musgo`) à esquerda do texto, `space-1` de gap. Os demais inativos, sem ícone. A viewport mostra os primeiros chips e corta o resto na rolagem interna, com um fade de 24px de `papel` sobre a borda inferior da área.
  5. **Rodapé fixo**, com divisor de 1px `linha` acima e `space-4` de padding vertical: botão textual `grafite` `Limpar` à esquerda (some quando nada está marcado) e botão primário pill `Concluir` à direita, largura automática. Padding inferior soma a área segura.
- Marcar ou desmarcar um chip só muda a seleção dentro do sheet. `Concluir` aplica a seleção ao formulário e fecha; arrastar para baixo, tocar no scrim ou voltar **descartam** as mudanças feitas no sheet, sem pedir confirmação, porque nada foi salvo ainda.

#### 5.2 `Cadastro de livro pessoal · Escolher assuntos, busca`

- O sheet de 5.1 com `hist` digitado na busca e o `X` de limpar a busca à direita do campo (Phosphor `X`, 20px, `grafite`, alvo de 48px).
- A área de chips mostra só os que contêm o texto, sem diferenciar acento: `História` (ativo) e `Romance histórico` (inativo). Acima deles, em `caption` `grafite`: `2 assuntos`.
- O cabeçalho continua dizendo `2 escolhidos`: a busca filtra o que se vê, não a seleção.

#### 5.3 `Cadastro de livro pessoal · Escolher assuntos, sem resultado`

- O sheet com `realismo mágico` digitado na busca.
- No lugar dos chips, `space-6` de respiro e, alinhado à esquerda, `Nenhum assunto com "realismo mágico".` em `body-strong` `tinta`, e `space-2` abaixo, em `body` `grafite`: `A lista é fixa: escolha o assunto mais próximo, como Ficção literária ou Fantasia.`
- **Não existe** botão de criar assunto, nem sugestão de "adicionar à lista". O rodapé fica como em 5.1.

#### 5.4 `Cadastro de livro pessoal · Escolher assuntos, carregando`

- O sheet aberto antes de a lista chegar: título `Assuntos` sem a contagem, a frase de 5.1 item 2, o campo de busca desabilitado (fundo `papel-elevado`, borda `linha`, placeholder em `grafite-suave`) e, no lugar dos chips, um **skeleton estático**: três linhas de pílulas de 32px em `linha` com larguras variadas, com um único fade de entrada. Sem spinner.
- `Concluir` desabilitado a 40%.
- Se a espera passar de três segundos, abaixo do skeleton, em `caption` `grafite`: `O serviço está iniciando. Isso pode levar alguns segundos.`

#### 5.5 `Cadastro de livro pessoal · Escolher assuntos, falha`

- O sheet com a lista que não carregou. No lugar dos chips, alinhado à esquerda: `WarningCircle` (Phosphor, `regular`, 24px, `rubi`), `space-3`, `Não foi possível carregar os assuntos.` em `body-strong` `tinta`, `space-2`, em `body` `grafite`: `Você pode salvar o livro agora e escolher os assuntos depois, em Editar livro.` `space-4`, botão secundário de 48px, `radius` 12, borda 1px `linha`, texto `tinta`, com `ArrowClockwise` (Phosphor, `regular`, 20px) à esquerda: `Tentar de novo`.
- Campo de busca desabilitado. No rodapé, `Concluir` dá lugar ao botão textual `grafite` `Fechar`.
- O formulário por baixo do scrim continua com tudo o que foi digitado.

#### 5.6 `Cadastro de livro pessoal · Mais de 5 assuntos (rolada)`

- Formulário no modo criação, rolado até o campo `Assuntos`, com o header fixo (divisor `linha` na base) e a barra inferior fixa.
- Seis chips: `Biografia`, `Crônica`, `História`, `Memórias`, `Política`, `Sociologia`, quebrando em duas linhas.
- No lugar do helper, o aviso de 4.1 B: `Você escolheu 6 assuntos. Até 5 ajuda a encontrar o livro com mais precisão.`
- Abaixo, a sinopse e o botão `Salvar livro` **habilitado**: o aviso não bloqueia.

### Linha 2, web, no fim da linha, nesta ordem

#### 5.7 `Cadastro de livro pessoal · Web, escolher assuntos`

- Base: `Criação, preenchido com capa` da web, coberto pelo scrim `tinta` a 40%.
- **Dialog centrado** conforme §5.4 do design, 560px de largura, `radius` 20, fundo `papel`, `elev-3`, padding `space-6`, altura de até 640px com a área de chips rolando por dentro.
- Mesmo conteúdo de 5.1: título `Assuntos` com `2 escolhidos`, a frase da lista fixa, campo de busca de 44px, os 31 chips em linhas que quebram com `História` e `Memórias` ativos. Botão `X` de fechar no canto superior direito (Phosphor `X`, 20px, `grafite`, botão de 40px, `radius` 12, hover com fundo `linha`).
- Rodapé alinhado à direita: `Limpar` textual `grafite` e `Concluir` primário pill de 40px, `space-4` de gap.
- `hover` nos chips inativos com fundo `papel-elevado`; foco de teclado visível em cada chip, com contorno de 2px `musgo` e offset de 2px.

#### 5.8 `Cadastro de livro pessoal · Web, mais de 5 assuntos`

- O formulário web com os seis chips de 5.6 na coluna direita, quebrando em duas linhas na largura da coluna, e o aviso de recomendação no lugar do helper. `Salvar livro` habilitado.

### Linha 3, modo escuro, no fim da linha

#### 5.9 `Cadastro de livro pessoal · Escuro, escolher assuntos`

- O artboard 5.1 no tratamento escuro de 4.8.

#### 5.10 `Cadastro de livro pessoal · Escuro, mais de 5 assuntos (rolada)`

- O artboard 5.6 no tratamento escuro de 4.8, para conferir o contraste do aviso.

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards do Período 1 continuam, com as mudanças da seção 4.

**Sem artboard próprio, de propósito:**

- **Erro de servidor no campo** (4.1 C): usa a forma de erro de campo que o canvas já tem.
- **Remover um chip pelo `X`** no formulário: o chip some e a fileira se reorganiza, sem toast nem confirmação.
- **Seletor no modo edição:** é o mesmo sheet de 5.1, aberto com a seleção atual.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Campo com label acima, helper e erro | documento-de-design §4.2 |
| Chip ativo em `musgo-fundo` com texto `musgo` peso 600 | documento-de-design §5.7 (filtro por assunto do Descobrir) |
| Bottom sheet no mobile e dialog centrado na web | documento-de-design §4.11 e §5.4 |
| Campo de busca com `MagnifyingGlass` | documento-de-design §4.2 e §5.7 |
| Botão primário pill, secundário e textual | documento-de-design §4.1 |
| Skeleton estático com fade único | documento-de-design §3.6 |
| Linha de cold start | prompts do Período 1 (`cadastro-pessoal.md` 4.6) |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

- **Seletor múltiplo de lista fechada:** gatilho com desenho de campo e caret, chips ativos removíveis com `X` dentro do formulário, sheet ou dialog com busca que só filtra, chips marcáveis com `Check` e rodapé fixo `Limpar` / `Concluir`. O sistema tinha só a seleção única do Descobrir.
- **Aviso de recomendação que não bloqueia:** ícone `Warning` em `ambar` com texto em `tinta` no lugar do helper, sem borda de erro e sem desabilitar o envio.
- **Busca sem resultado numa lista fechada**, que aponta a escolha mais próxima em vez de oferecer criação.

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Label do campo | não existia | `Assuntos` |
| Gatilho sem assunto | não existia | `Escolher assuntos` |
| Ação com assuntos | não existia | `Alterar assuntos` |
| Helper | não existia | `Opcional. Escolha da lista do Lê Ai, de preferência até 5.` |
| Aviso a partir de 6 | não existia | `Você escolheu 6 assuntos. Até 5 ajuda a encontrar o livro com mais precisão.` |
| Erro de servidor | não existia | `Um dos assuntos escolhidos não está mais na lista do Lê Ai. Revise e salve de novo.` |
| Título do seletor | não existia | `Assuntos` |
| Contagem do seletor | não existia | `2 escolhidos` (`1 escolhido`, `Nenhum escolhido`) |
| Frase do seletor | não existia | `Os assuntos vêm de uma lista fixa do Lê Ai.` |
| Placeholder da busca | não existia | `Buscar assunto` |
| Resultado da busca | não existia | `2 assuntos` (`1 assunto`) |
| Busca sem resultado, título | não existia | `Nenhum assunto com "realismo mágico".` |
| Busca sem resultado, texto | não existia | `A lista é fixa: escolha o assunto mais próximo, como Ficção literária ou Fantasia.` |
| Falha ao carregar, título | não existia | `Não foi possível carregar os assuntos.` |
| Falha ao carregar, texto | não existia | `Você pode salvar o livro agora e escolher os assuntos depois, em Editar livro.` |
| Falha ao carregar, ação | não existia | `Tentar de novo` |
| Rodapé do seletor | não existia | `Limpar`, `Concluir`, `Fechar` (na falha) |
| Rótulo acessível do `X` do chip | não existia | `Remover Memórias` |
| Rótulo acessível do `X` da busca | não existia | `Limpar busca` |

Os nomes dos 31 assuntos estão na seção 1, literais. Zero em-dash, zero emoji. A contagem tem singular e plural.

---

## 9. Acessibilidade e interação do que muda

- **Gatilho e `Alterar assuntos`:** botões com rótulo que diz o estado, "Assuntos, nenhum escolhido, escolher" ou "Assuntos, 2 escolhidos: História e Memórias, alterar". Alvo de 48px no mobile.
- **Chips do seletor:** cada um é uma caixa de marcar, com `aria-checked` e o nome do assunto como rótulo. O estado ativo muda fundo, peso **e** acrescenta o `Check`: a seleção não depende só da cor.
- **Chips do formulário:** o chip é texto; o `X` é o botão, com rótulo `Remover <assunto>`. Ao remover, o foco vai para o chip seguinte ou, se não houver, para `Alterar assuntos` ou para o gatilho.
- **Busca:** filtra enquanto se digita, sem debounce perceptível; o número de resultados (`2 assuntos`) é anunciado por região viva educada.
- **Aviso de recomendação:** anunciado por região viva educada quando aparece, uma vez, sem roubar o foco.
- **Sheet e dialog:** prendem o foco enquanto abertos; o foco entra no campo de busca; `Esc` (web) e voltar (mobile) fecham descartando, e o foco volta ao gatilho. No dialog, `Tab` percorre a busca, os chips e o rodapé; setas não são exigidas.
- **Falha e carregando:** o carregamento é anunciado como "Carregando assuntos"; a falha, por região viva, com o foco movido para `Tentar de novo`.
- `prefers-reduced-motion`: sheet e dialog entram sem deslizar; chips marcam sem transição.
- Contraste WCAG AA nos dois temas: texto de chip ativo `musgo` sobre `musgo-fundo` e `musgo-claro` sobre `musgo-fundo-escuro`; aviso em `tinta` ou `papel-suave`, nunca em `ambar` como cor de texto.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Capa, campos do Período 1, botões, zona de exclusão, confirmação e shell ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não mude a ordem dos campos do Período 1.** O campo novo entra entre `Número de páginas` e `Sinopse`, e só ali.

**Específico deste campo**

- **Não desenhe campo de texto livre para assunto**, nem "criar assunto", nem "sugerir assunto". A lista é fechada (RN-21.1, RN-21.4).
- **Não bloqueie o sexto assunto.** Cinco é recomendação, não limite. O aviso não é erro, não tem borda `rubi` e não desabilita `Salvar`.
- **Não marque o campo como obrigatório** nem o destaque na validação.
- **Não use chip de assunto em caixa alta com lupa** aqui. Esse é o chip acionável da página do livro oficial, que leva à busca; neste formulário o chip só mostra uma escolha.
- **Não prometa que os assuntos do livro pessoal aparecem na busca ou no Descobrir.** Eles não aparecem (RN-03).
- **Não perca o que foi digitado** quando o seletor falhar ou for fechado.
- **Não desenhe campo de ISBN, editora ou série.** Continuam ausentes em livro pessoal.
- **Não faça a capa parecer obrigatória.** Ela continua opcional.
- **Não trave os campos de texto durante o upload da capa.**
- **Não escreva "este item" na confirmação de exclusão** e não prometa desfazer.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa neste formulário: Newsreader só aparece na sinopse da página do livro, não no campo de sinopse.
- Nada de overline em toda seção. No máximo um por tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão ou em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de chip colorido por gênero: todos os assuntos têm o mesmo desenho.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.
- Nada de animação de pulo ou de confete ao marcar um chip.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é.
- Nada de número sem unidade: `6 assuntos`, `2 escolhidos`.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de dropdown nativo do sistema nem de lista com caixas de marcar quadradas: a seleção é por chips.
- Nada de botão destrutivo preenchido. Destrutivo é outline ou texto `rubi`.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de layout que não colapse para uma coluna abaixo de 768px. Abaixo de 768px, o dialog do seletor vira o bottom sheet do mobile.
- Nada de painel lateral fixo com os 31 assuntos sempre abertos no formulário.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
- Sem camada de obra.
