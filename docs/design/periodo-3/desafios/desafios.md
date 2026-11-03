# F-DSF-OPC · Desafios (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Desafios`, gerado por `docs/design/periodo-2/F-DSF/desafios.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/F-DSF/desafios.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-DSF-OPC.md
**Requisitos que entram:** F-DSF-OPC: RF-DSF-05 (histórico de janelas concluídas de cada desafio, indicando cumprimento ou não). Nesta tela entra só o **ponto de entrada**; o histórico em si é a tela nova [`../F-DSF-OPC/historico-do-desafio.md`](../F-DSF-OPC/historico-do-desafio.md).
**Regras de negócio:** RN-20.6 (pausa: o desafio pausado também tem janelas encerradas para consultar)
**Versão web:** não. RF-DSF-05 tem a coluna Web negativa em `REQUISITOS.md` §5.7, e desafios estão fora do escopo do cliente web (`REQUISITOS.md` §2.1).

---

## 1. O que muda e por quê

RF-DSF-05, Opcional do Período 3, dá memória à meta: cada desafio passa a ter uma tela de **histórico** com as janelas já encerradas (a semana passada, agosto, ontem), cada uma com o acumulado, a meta daquela janela e se foi cumprida. Essa tela foi desenhada à parte, em [`../F-DSF-OPC/historico-do-desafio.md`](../F-DSF-OPC/historico-do-desafio.md), e chega-se a ela **daqui**.

A entrada, decidida no lote 1 do Período 3, é **um item novo no menu de ações do card**: `Ver histórico`. Ele aparece no menu do desafio ativo **e** no do desafio pausado, porque um desafio pausado continua tendo janelas encerradas de antes da pausa.

O que deixa de valer do prompt do Período 2:

- A seção 3 dizia `Nada de histórico de janelas encerradas` e a seção 10 proibia desenhar histórico (`RF-DSF-05 é Opcional e fica para o Período 3`). **Essas duas proibições deixam de valer só para o item de menu**: o menu passa a ter `Ver histórico`. A lista de desafios continua **sem** nenhum resultado de janela passada dentro do card, e o início de janela (estado `Início de janela`) continua **sem** aviso sobre ontem: o passado mora na tela de histórico, não aqui.

Nada mais muda: o card, a lista, o header, o vazio, o carregamento, o erro, a confirmação de exclusão e o toast de falha ficam como estão.

O canvas continua o mesmo arquivo de Figma: artboards lado a lado, **linha 1** com os estados mobile `390 x 844`, **sem linha 2** (não há web), **linha 3** com o modo escuro. Rótulo acima de cada artboard no formato `Desafios · <estado>` e viewport abaixo, como chrome do canvas.

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
artesanal. Estatísticas e metas existem, mas o produto não é sobre métricas.

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
Fill de progresso de desafio: broto sobre trilha musgo-fundo no claro,
broto-vivo sobre trilha musgo-fundo-escuro no escuro.

TIPOGRAFIA
Space Grotesk (500, 600, 700) no display.
Manrope (400, 500, 600, 700) em toda a interface.
Newsreader (400, 500, regular e italic) APENAS em três lugares do produto:
  corpo da resenha renderizada, frases e trechos do livro, e sinopse na
  página do livro. Fora desses três, serifa não aparece. Esta tela não tem
  serifa nenhuma.
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
radius 12. Chip toggleável é pill. Capa de livro é a exceção declarada do
sistema: retângulo de canto vivo, sem raio nenhum.

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

SOBREPOSIÇÃO MODAL (bottom sheet no mobile)
Fundo papel no claro e noite-elevada no escuro, radius-lg só no topo,
padding space-6, elev-3, alça de 32x4px em linha / linha-noite centralizada
com space-5 acima do conteúdo, padding inferior somando a área segura.
Scrim: #171512 a 40% no claro e preto a 60% no escuro (cor fixa).
Sobe em dur-slow com ease-out, sai em dur-base com ease-in; sob
prefers-reduced-motion entra e sai sem deslizar.

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

- **Shell:** barra inferior com `Estante`, `Descobrir`, `Feed`, `Perfil`, item `Perfil` ativo; header de tela de detalhe com `ArrowLeft`, título `Desafios`, `Plus` e `Bell` com badge.
- **Card de desafio** nas três variantes (ativa, cumprida, pausada): ícone de unidade, título composto, nome da janela, barra `broto` sobre `musgo-fundo`, linha de números com o que falta, `Check` com `Cumprido em setembro`, pill `Pausado` com o texto da pausa. O card inteiro **continua não tocável**: o histórico se abre pelo menu, não pelo toque no card.
- **Dados mock** da seção 3 do prompt original, sem mudança: hoje é quinta-feira, 24 de setembro de 2026; `20 páginas por dia` (12 de 20, `Hoje`), `150 minutos por semana` (95 de 150, `Esta semana`), `600 páginas por mês` (612 de 600, cumprido em setembro), `24 livros por ano` (17 de 24, `2026`) e, no grupo `Pausados`, `4 livros por mês` (pausado desde 15 de setembro).
- **Artboards que não mudam:** `Desafios · Padrão, vários desafios`, `Desafios · Confirmação de exclusão`, `Desafios · Início de janela`, `Desafios · Vazio`, `Desafios · Carregando`, `Desafios · Erro de carregamento`, `Desafios · Falha ao pausar` e, no escuro, o padrão.
- **Ordem dos artboards no canvas:** nenhum artboard existente muda de posição. O artboard novo entra no fim da linha 3.
- **A janela semanal continua nomeada só como `Esta semana`** no card, sem intervalo de datas. O intervalo aparece na tela de histórico, não aqui.
- **Copy existente:** todas as linhas da seção 8 do prompt original continuam valendo; esta edição só acrescenta.

---

## 4. Artboards que mudam

### `Desafios · Menu de ações`

O sheet do menu sobre `150 minutos por semana`. Cabeçalho do sheet sem mudança (`Clock`, `150 minutos por semana`, `Esta semana: 95 de 150 minutos`), divisor de 1px `linha` abaixo dele.

**Entra um item, no topo da lista**, antes de `Editar desafio`:

- `ClockCounterClockwise` (Phosphor, `regular`, 20px, `tinta`) · `Ver histórico`, rótulo em `body` `tinta`.
- Mesma geometria dos outros itens: altura de 56px, ícone à esquerda, `space-4` de gap, divisor de 1px `linha` abaixo.
- **Uma linha só**, sem segunda linha explicativa: ver histórico não tem consequência a explicar. A segunda linha fica reservada para pausar e retomar, como no Período 2.

A lista do menu passa a ser, de cima para baixo: `Ver histórico`, `Editar desafio`, `Pausar desafio` (com a segunda linha `O que você registrar durante a pausa não conta.`), divisor, `Excluir desafio` em `rubi`. Depois, `space-4` e o botão textual `Cancelar`, como já estão.

**Por que no topo:** é a única ação que só lê, e agrupar as ações por peso (consultar, alterar, pausar, excluir) mantém o destrutivo isolado no fim, onde já estava. Nenhum item existente muda de texto, ícone, cor ou ordem relativa.

Ao tocar em `Ver histórico`, o sheet fecha em `dur-base` com `ease-in` e a tela `Histórico do desafio` entra empilhada sobre `Desafios`, com a aba `Perfil` ativa. Sob `prefers-reduced-motion`, o sheet some sem deslizar.

O sheet cresce 56px para acomodar o item. Se a altura total passar do que cabe acima da área segura, o conteúdo do sheet rola por dentro; `Cancelar` continua visível no fim. Em 390 x 844 o sheet cabe inteiro.

### `Desafios · Menu de ações, desafio pausado`

O sheet do menu sobre `4 livros por mês`. Cabeçalho sem mudança (`Books`, `4 livros por mês`, `Pausado desde 15 de setembro`).

**Entra o mesmo item `Ver histórico` no topo**, idêntico ao do desafio ativo. A lista fica: `Ver histórico`, `Editar desafio`, `Retomar desafio` (com `Volta a contar a partir de agora.`), divisor, `Excluir desafio`.

O histórico de um desafio pausado mostra as janelas encerradas antes e durante a pausa; isso é desenhado na tela de histórico, não aqui.

### `Desafios · Menu de ações` (escuro, linha 3)

O estado escuro do menu recebe o mesmo item no topo: `ClockCounterClockwise` em `papel-suave`, rótulo `Ver histórico` em `papel-suave`, divisor `linha-noite`. Sheet em `noite-elevada`, demais itens como estão, `Excluir desafio` em `rubi-claro`, scrim preto a 60%.

---

## 5. Artboards novos

### `Desafios · Menu de ações, desafio pausado` (escuro)

Posição: **fim da linha 3**, depois do menu de ações escuro.

O artboard `Desafios · Menu de ações, desafio pausado` do item 4, no escuro:

- Fundo da lista atrás do scrim em `noite`, cards em `noite-elevada`, scrim preto a 60%.
- Sheet em `noite-elevada`, alça e divisores em `linha-noite`.
- Cabeçalho: `Books` em `grafite-claro`, título `4 livros por mês` em `papel-suave`, `Pausado desde 15 de setembro` em `grafite-claro`.
- Itens: `Ver histórico` (`ClockCounterClockwise`, `papel-suave`), `Editar desafio` (`PencilSimple`, `papel-suave`), `Retomar desafio` (`Play`, `papel-suave`) com `Volta a contar a partir de agora.` em `grafite-claro`, divisor, `Excluir desafio` (`Trash` e rótulo em `rubi-claro`).
- `Cancelar` textual em `grafite-claro`.
- Shadows com metade da opacidade: a hierarquia vem da superfície e do divisor.

Nenhum artboard novo na linha 1: os dois menus do mobile claro já existem e foram alterados no item 4.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Bottom sheet de menu de ações | documento-de-design §4.11 |
| Item de menu de ações de uma linha, ícone de 20px e divisor | documento-de-design §4.11 |
| Item de menu com segunda linha explicativa (pausar, retomar) | nasceu em `../../periodo-2/F-DSF/desafios.md`, incorporação pendente |
| Header de tela de detalhe (`ArrowLeft`, título, sino) | nasceu nos prompts do Período 1 (`F-AUT/alterar-senha.md`), incorporação pendente |
| Iconografia Phosphor | documento-de-design §6 |

**Nada nasce aqui.** O item `Ver histórico` é um item de menu comum do §4.11; o ícone `ClockCounterClockwise` é Phosphor e entra no catálogo de ícones da tela.

---

## 8. Copy nova ou alterada

Só o delta. Nenhuma linha existente é substituída.

| Onde | Texto que entra |
|---|---|
| Menu: histórico | `Ver histórico` |
| Rótulo acessível do item | `Ver histórico do desafio 150 minutos por semana` (troca o título conforme o desafio do menu) |

---

## 9. Acessibilidade e interação do que muda

- **Alvo de toque de 56px** no item novo, como os demais itens do menu, acima do mínimo de 48px.
- **Ordem de foco no sheet:** cabeçalho, `Ver histórico`, `Editar desafio`, `Pausar desafio` ou `Retomar desafio`, `Excluir desafio`, `Cancelar`. O foco entra no primeiro item acionável, `Ver histórico`, e nunca no destrutivo.
- **Leitor de tela:** o item se anuncia como botão, `Ver histórico do desafio 150 minutos por semana`, e indica que abre outra tela.
- **Voltar:** a seta da tela de histórico volta para `Desafios`, com o sheet já fechado; o foco retorna ao `DotsThreeVertical` do card de onde o menu foi aberto.
- **Contraste:** rótulo em `tinta` sobre `papel` (claro) e `papel-suave` sobre `noite-elevada` (escuro), ambos AAA.
- **Motion:** fechamento do sheet em `dur-base` com `ease-in`; entrada da tela de histórico como empilhamento padrão; estático sob `prefers-reduced-motion`.

---

## 10. O que não fazer nesta edição

**Próprio desta edição**

- **Não redesenhe o que não foi citado.** Card, lista, header, vazio, carregamento, erro, confirmação e toast ficam idênticos.
- **Não reordene artboards existentes.** O único artboard novo entra no fim da linha 3.
- **Não mostre resultado de janela passada dentro do card** (`semana passada: cumprido`, contagem de semanas cumpridas, mini-histórico). O passado mora na tela de histórico.
- **Não torne o card tocável** para abrir o histórico. A entrada é só o item do menu.
- **Não ponha `Ver histórico` no header** nem como botão textual na lista. Um único ponto de entrada.
- **Não dê segunda linha ao item novo** nem cor de destaque: é um item comum, `tinta`.
- **Não mude a posição do `Excluir desafio`**: continua o último, separado por divisor, em `rubi`.
- **Não desenhe versão web.** Desafios estão fora do cliente web.
- **Não reintroduza** o que o prompt original proibia e continua valendo: medalha, conquista, troféu, ranking, comemoração, sequência diária nesta tela, percentual ao lado da barra, intervalo de datas da semana no card, tratamento de pausado como falha, `musgo` na barra de desafio, desafios sugeridos.

**Tipografia (design §7.1)**

- Não use Inter como fonte de interface: a UI é Manrope.
- Não use Instrument Serif nem Fraunces. Esta tela não tem serifa.
- Não ponha overline em cima de título de seção nem de card.

**Cores e superfícies (design §7.2)**

- Não use gradiente de nenhum tipo, nem mesh, nem glow.
- Não use sombra preta pura nem `#000000`.
- Não use a família bege quente com latão, oxblood e expresso.

**Motion (design §7.4)**

- Nada de loop infinito, parallax ou scroll hijack.

**Conteúdo e copy (design §7.5)**

- Zero em-dash em qualquer texto visível.
- Nada de label poético: o item é `Ver histórico`, e não `Sua jornada` ou `Linha do tempo`.
- Nada de emoji.

**Componentes e assets (design §7.6)**

- Nada de ícone desenhado à mão: todos os ícones são Phosphor.

**Modo escuro (design §7.7)**

- Nada de fundo `#000000`: o fundo é `noite`, e o sheet é `noite-elevada`, mais claro que o fundo.
- Nada de meia tela clara e meia escura.

**Interações destrutivas (design §7.8)**

- Nada de excluir sem confirmação; botão destrutivo continua em outline `rubi`.

**Fora de escopo por decisão (design §7.12)**

- Nada de camada de obra, login social, mensagem direta, clube de leitura, grupo, fórum, leitura de e-book, medalha, conquista ou ranking.
