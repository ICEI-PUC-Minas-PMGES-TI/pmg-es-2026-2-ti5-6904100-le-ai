# F-DSF-OPC · Histórico do desafio

**Feature:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-DSF-OPC.md
**Requisitos:** RF-DSF-05 (histórico de janelas concluídas de cada desafio, indicando cumprimento ou não)
**Requisitos de sistema cujo efeito aparece aqui:** RF-DSF-02 e RF-DSF-06 (o acumulado de cada janela é somado pelo servidor a partir dos registros de progresso e das leituras finalizadas). A selagem da janela encerrada é feita pelo servidor, sem job. O cliente só **exibe** o que a listagem devolve.
**Não funcionais:** RNF-DES-02 (listagem paginada com teto do servidor), RNF-SEC-02 (histórico exclusivo do dono, validado no servidor), RNF-USA-03 (cumprimento distinguível sem depender de cor), RNF-USA-05 (mensagem acionável em pt-BR), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-20 (janelas de calendário no fuso do celular; criação no meio da janela; pausa; edição só na janela corrente e configuração histórica preservada; cumprimento; períodos sem progresso; correção por sincronização offline), RN-04 (o que conta como leitura finalizada)
**Contrato:** `GET /desafios/{id}/janelas?page=`, janelas encerradas da mais recente para a mais antiga, cada uma com início, fim, unidade, periodicidade, meta, acumulado e cumprimento **do snapshot daquela janela**, paginada com limite do servidor.
**Versão web:** não. RF-DSF-05 tem a coluna Web negativa em `REQUISITOS.md` §5.7, e desafios estão fora do escopo do cliente web (`REQUISITOS.md` §2.1).
**De onde se chega:** do item `Ver histórico` no menu de ações de cada card em `Desafios` ([`../../periodo-2/F-DSF/desafios.md`](../../periodo-2/F-DSF/desafios.md)), disponível também para desafio pausado. O item é desenhado na edição consolidada `docs/design/periodo-3/desafios/desafios.md`, em outro lote; aqui ele só é citado. A tela é uma **tela de detalhe empilhada sobre a área Perfil**: aba `Perfil` ativa na barra inferior.

---

## 1. Contexto

Esta tela dá **memória à meta**, o segundo dos três mecanismos do produto. Até aqui o leitor via só a janela que está correndo: no dia seguinte, a semana que ele cumpriu deixava de existir. O histórico mostra cada janela encerrada de **um** desafio, uma depois da outra, com quanto foi feito, qual era a meta e se ela foi cumprida.

**De onde se chega:** do menu de ações do card, pelo item `Ver histórico`, com o desafio ativo ou pausado.

**Para onde se vai:** só de volta para `Desafios`, pela seta. O histórico é **somente leitura**: nenhuma linha abre outra tela, nada se edita, nada se exclui aqui. Excluir o desafio continua no menu de `Desafios`, e leva o histórico junto.

Cinco coisas que ela precisa resolver:

- **Cada janela fala com a configuração dela, não com a de hoje.** Se o leitor mudou a meta de 120 para 150 minutos por semana no começo de setembro, as semanas de agosto continuam mostrando `de 120 minutos` (RN-20.7). A tela nunca recalcula o passado com a meta atual, e deixa visível o ponto em que a meta mudou.
- **Cumprido e não cumprido precisam ser legíveis sem cor** (RNF-USA-03). A marcação é ícone mais palavra, e a fração com unidade está sempre escrita.
- **Não cumprido não é erro.** Uma semana em que a meta não foi atingida é um fato, não uma falha do sistema: nada de `rubi`, nada de alerta, nada de tom de cobrança.
- **Janela vazia existe.** Períodos sem nenhum registro aparecem com `0 de 120 minutos` e não cumpridos (RN-20.9). A tela não esconde as semanas vazias para parecer mais bonita, e não inventa períodos anteriores à criação do desafio.
- **Pausa tem nome.** Um período em que o desafio estava pausado também aparece como não cumprido, com acumulado zero (RN-20.6 e RN-20.9), mas a linha diz que o desafio estava pausado, para que a pausa não pareça abandono.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, na ordem em que o leitor os encontra.
- **Linha 2:** não existe. A tela não tem versão web (ver seção 5).
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Histórico do desafio · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

**Hoje é quinta-feira, 24 de setembro de 2026**, no fuso do celular do leitor. É o mesmo dia e são os mesmos desafios do canvas de `Desafios`.

**Semana de calendário: segunda a domingo** (ISO 8601), decisão do dono de F-DSF em 09/10/2026, ainda a ratificar pelo grupo. Por isso, aqui a semana já pode ser nomeada pelo intervalo de datas. A semana corrente, de 21 a 27 de setembro, **não aparece**: o histórico só tem janelas encerradas.

**Desafio principal: `150 minutos por semana`** (mock declarado). Criado na quarta-feira, 5 de agosto de 2026. Meta original de **120 minutos por semana**, editada para **150** na quarta-feira, 2 de setembro: a semana corrente daquele dia (31 de agosto a 6 de setembro) já nasceu com 150, e as semanas anteriores ficaram com 120 (RN-20.7). Pausado na segunda-feira, 17 de agosto, e retomado na segunda-feira, 24 de agosto.

| # | Janela | Grupo | Acumulado | Meta da janela | Resultado | Observação |
|---|---|---|---|---|---|---|
| 1 | 14 a 20 de setembro | Setembro de 2026 | 170 | 150 | cumprido | acima da meta: mostra o acumulado real |
| 2 | 7 a 13 de setembro | Setembro de 2026 | 150 | 150 | cumprido | exatamente na meta |
| 3 | 31 de agosto a 6 de setembro | Agosto de 2026 | 85 | 150 | não cumprido | primeira semana com a meta nova |
| 4 | 24 a 30 de agosto | Agosto de 2026 | 130 | 120 | cumprido | meta antiga, retomado no início da semana |
| 5 | 17 a 23 de agosto | Agosto de 2026 | 0 | 120 | não cumprido | **pausado durante toda a semana** |
| 6 | 10 a 16 de agosto | Agosto de 2026 | 0 | 120 | não cumprido | **semana vazia**, sem nenhum registro |
| 7 | 3 a 9 de agosto | Agosto de 2026 | 140 | 120 | cumprido | semana da criação: conta o que foi registrado desde segunda, 3 de agosto (RN-20.2) |

Antes do item 7 não existe nada: períodos anteriores à criação do desafio não são inventados (RN-20.9).

- **Agrupamento por período maior**, para a lista não virar uma sequência sem fim de datas: janelas diárias e semanais agrupadas por mês (`Setembro de 2026`), mensais agrupadas por ano (`2026`), anuais sem grupo. A semana entra no mês do **dia em que começa**: `31 de agosto a 6 de setembro` fica em `Agosto de 2026`. Agrupamento e regra são propostas deste prompt (pendência na seção 7).
- **Ponto de mudança da meta**: entre o item 3 e o item 4, uma linha discreta diz `Meta alterada: de 120 para 150 minutos por semana`. Ela é derivada pelo cliente comparando o snapshot de duas janelas vizinhas; não é um evento separado do contrato.

**Segundo desafio, para o artboard de carregar mais: `20 páginas por dia`.** Criado em 3 de julho de 2026. A lista já mostra setembro inteiro e chegou ao começo do mês:

| Janela | Acumulado | Resultado |
|---|---|---|
| Quinta, 3 de setembro | 22 de 20 páginas | cumprido |
| Quarta, 2 de setembro | 0 de 20 páginas | não cumprido |
| Terça, 1 de setembro | 20 de 20 páginas | cumprido |

**Terceiro desafio, para o artboard sem janela encerrada: `24 livros por ano`.** Criado em 2026: o único ano dele, 2026, ainda está correndo. Nenhuma janela encerrada.

**Quarto desafio, para o artboard do desafio pausado: `4 livros por mês`.** Criado em 10 de junho de 2026, **pausado desde 15 de setembro**. Setembro é a janela corrente e não aparece.

| Janela | Grupo | Acumulado | Resultado |
|---|---|---|---|
| Agosto de 2026 | 2026 | 4 de 4 livros | cumprido |
| Julho de 2026 | 2026 | 2 de 4 livros | não cumprido |
| Junho de 2026 | 2026 | 5 de 4 livros | cumprido (criado no dia 10, conta o mês desde o dia 1) |

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell. O shell é idêntico em todas as telas autenticadas e precisa ser desenhado por extenso aqui.

**Mobile, barra inferior.** Fixa no rodapé da viewport, acima da área segura. Altura de 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, sem sombra. Quatro itens de largura igual: `Estante`, `Descobrir`, `Feed`, `Perfil`. Cada item empilha ícone de 24px acima e rótulo em `caption` abaixo, com `space-1` de gap, centralizado, e a área tocável tem no mínimo 48px de altura. Ícones Phosphor: `Books` para Estante, `Compass` para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. Inativo: ícone peso `regular`, cor `grafite`; rótulo em `caption` `grafite`. Ativo: ícone peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`. Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone que salta. **Nesta tela o item ativo é `Perfil`**, porque ela é empilhada sobre `Desafios`, que é empilhada sobre o perfil.

**Mobile, header de tela de detalhe.** Padding lateral `space-5`, fundo `papel`, sem sombra, altura de 72px mais a área segura, crescendo se o título quebrar.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando a `Desafios`.
- `space-2` depois da seta, uma coluna de texto: o **título do desafio** em `title` `tinta` (`150 minutos por semana`), com os números em JetBrains Mono, até duas linhas; abaixo, `space-1`, em `caption` `grafite`, `Histórico`. Quando o desafio está pausado, a linha de baixo vira `Histórico · Pausado desde 15 de setembro`.
- À direita, o sino `Bell` (Phosphor, `regular`, 24px, `tinta`), fixo em toda tela autenticada. Badge de não lidas: círculo de 18px, fundo `musgo`, encostado no canto superior direito do ícone, número centralizado em 11px peso 600 cor `papel`; acima de nove mostra `9+`; sem não lidas, o badge não existe.
- **Nenhuma ação contextual no header.** Não há `Plus`, lápis nem três pontos: a tela é somente leitura.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Cabeçalho de grupo (nasce aqui)

- `Setembro de 2026` em `title-sm` `tinta`, padding lateral `space-5`, `space-6` de respiro acima e `space-2` abaixo, fundo `papel`.
- **Fica preso ao topo** da área rolável, logo abaixo do header, enquanto as linhas do grupo passam por baixo; o grupo seguinte empurra o anterior, como os anos do histórico de leituras. Sem animação além do próprio rolar.
- Sem contagem ao lado: o contrato não traz total por grupo, e uma contagem de janelas cumpridas seria um placar.

### Linha de janela (nasce aqui)

Uma linha por janela encerrada, sobre o fundo `papel`, padding lateral `space-5`, `space-4` de padding vertical, divisor de 1px `linha` entre linhas do mesmo grupo. **Não é card**: é uma linha de lista, sem fundo próprio, sem sombra, sem raio.

- **Linha 1:** à esquerda, o nome da janela em `body-strong` `tinta` (`14 a 20 de setembro`). À direita, a **marcação de resultado**:
  - **Cumprido:** `CheckCircle` (Phosphor, `fill`, 20px, `broto`), `space-1`, `Cumprido` em `caption` peso 600 `tinta`.
  - **Não cumprido:** `Circle` (Phosphor, `regular`, 20px, `grafite`), `space-1`, `Não cumprido` em `caption` peso 600 `grafite`.
  - As duas marcações têm **forma e palavra diferentes**: círculo preenchido com check contra círculo vazio. Quem não distingue `broto` de `grafite` lê a palavra.
- `space-2`.
- **Barra de progresso do desafio**, a mesma do card de `Desafios`: geometria do design §4.7 (trilha de 6px, `radius-full`), trilha `musgo-fundo`, preenchimento `broto` proporcional ao acumulado sobre a **meta daquela janela**, parando no fim da trilha quando passa da meta. Janela com zero mostra só a trilha.
- `space-2`.
- **Linha de números:** `170 de 150 minutos`, com `170` e `150` em `num-inline` `tinta` e `de` e `minutos` em `body` `grafite`. Sem `Faltam`, sem percentual, sem diferença do tipo `+20`: a janela acabou, e a fração com unidade diz tudo.
- **Linha de pausa**, só quando o desafio esteve pausado na janela: `space-2` abaixo dos números, `PauseCircle` (Phosphor, `regular`, 16px, `grafite`), `space-1`, em `caption` `grafite`: `Desafio pausado nesta semana`. Para pausa que cobriu só parte da janela: `Desafio pausado em parte desta semana`. Trocam `semana` por `dia`, `mês` ou `ano` conforme a janela.
- A linha **não é tocável**. Sem `CaretRight`, sem estado de press.

### Marca de mudança de configuração (nasce aqui)

Entre duas janelas vizinhas cujo snapshot difere (meta, unidade ou periodicidade), uma faixa no lugar do divisor:

- Padding lateral `space-5`, `space-3` de padding vertical, fundo `papel`, divisor de 1px `linha` acima e abaixo.
- `PencilSimple` (Phosphor, `regular`, 16px, `grafite`), `space-2`, texto em `caption` `grafite`: `Meta alterada: de 120 para 150 minutos por semana`. Com os números em JetBrains Mono.
- Para outras mudanças: `Unidade alterada: de páginas para minutos` e `Período alterado: de mensal para semanal`. Se mais de uma coisa mudou, uma linha por mudança, na ordem unidade, período, meta.
- A faixa fica **entre** a janela mais nova (já com a configuração nova) e a mais antiga (ainda com a antiga). Ela não usa `ambar` nem nenhum tom de alerta: editar o desafio não é problema.

### Rodapé de criação (nasce aqui)

Depois da última janela, quando a listagem acabou:

- `space-6` de respiro, padding lateral `space-5`, texto centralizado em `caption` `grafite`, até três linhas: `Desafio criado em 5 de agosto de 2026. A primeira semana conta o que você registrou desde o início dela.`
- Para janela diária, a segunda frase não existe. Para mensal e anual, a segunda frase é `O primeiro mês conta o que você registrou desde o início dele.` e `O primeiro ano conta o que você registrou desde o início dele.`
- `space-8` antes da barra inferior.

### 4.1 Padrão, desafio semanal

O leitor abriu o histórico de `150 minutos por semana`. Topo da lista:

1. Header com `150 minutos por semana`, `Histórico` e `Bell`.
2. Grupo `Setembro de 2026`: linhas 1 e 2 da seção 3, as duas cumpridas. A linha 1 mostra `170 de 150 minutos` com a barra cheia.
3. Grupo `Agosto de 2026`: linha 3 (`85 de 150 minutos`, não cumprido), a **marca de mudança** `Meta alterada: de 120 para 150 minutos por semana` e, abaixo dela, a linha 4 (`130 de 120 minutos`, cumprido), cortada pela barra inferior.

A lista rola por baixo do header; a barra inferior fica fixa.

### 4.2 Rolado até o fim

O mesmo histórico, rolado até a última janela. O cabeçalho `Agosto de 2026` está preso ao topo.

1. Final da linha 4.
2. Linha 5: `17 a 23 de agosto`, `0 de 120 minutos`, trilha vazia, `Não cumprido`, e a linha de pausa `Desafio pausado nesta semana`.
3. Linha 6: `10 a 16 de agosto`, `0 de 120 minutos`, trilha vazia, `Não cumprido`, **sem** linha de pausa: é uma semana vazia comum.
4. Linha 7: `3 a 9 de agosto`, `140 de 120 minutos`, cumprido.
5. Rodapé de criação.

As linhas 5 e 6 têm o mesmo número e o mesmo resultado; só a linha de pausa as distingue. É exatamente isso que o artboard precisa mostrar.

### 4.3 Carregando mais, desafio diário

Histórico de `20 páginas por dia`, rolado até o começo de setembro, com o cabeçalho `Setembro de 2026` preso ao topo.

- Linhas da seção 3: `Quinta, 3 de setembro` (`22 de 20 páginas`, cumprido), `Quarta, 2 de setembro` (`0 de 20 páginas`, não cumprido) e `Terça, 1 de setembro` (`20 de 20 páginas`, cumprido).
- Abaixo da última linha, **duas linhas de skeleton estático** com a forma da linha de janela: uma barra de 15px de altura e 45% de largura à esquerda e outra de 13px e 20% à direita (o nome e a marcação), `space-2`, uma barra de 6px em largura total e `radius-full` (a barra de progresso), `space-2`, uma barra de 15px e 35% (os números). Todas em `linha`, com `radius-sm` exceto a de progresso. Um único fade de entrada.
- **Nada muda no topo.** O carregamento incremental não recarrega a lista, não move o scroll e não substitui o conteúdo por skeleton inteiro. Sem botão `Carregar mais` e sem numeração de página.
- Quando a próxima página chega, o cabeçalho `Agosto de 2026` entra naturalmente abaixo de `Terça, 1 de setembro`.

### 4.4 Nenhuma janela encerrada

Histórico de `24 livros por ano`. O único ano do desafio ainda está correndo.

- Header real, com `24 livros por ano` e `Histórico`.
- Bloco centralizado verticalmente no espaço entre o header e a barra inferior, padding lateral `space-5`:
  1. `ClockCounterClockwise` (Phosphor, `regular`, 32px, `grafite-suave`).
  2. `space-4`, título em `title` `tinta`, centralizado: `Nenhum ano encerrado ainda`.
  3. `space-2`, texto em `body` `grafite`, centralizado, até três linhas: `Cada ano entra aqui quando termina. 2026 aparece a partir de 1º de janeiro de 2027.`
- **Sem botão.** Não há ação a tomar: voltar é a seta. Nada de `Ver desafio` ou `Criar outro desafio`.
- Para outras janelas, o título troca a unidade de tempo e o texto nomeia quando a janela corrente fecha: `Nenhum dia encerrado ainda` / `Hoje aparece aqui a partir de amanhã.`; `Nenhuma semana encerrada ainda` / `Esta semana aparece aqui a partir de segunda-feira, 28 de setembro.`; `Nenhum mês encerrado ainda` / `Setembro aparece aqui a partir de 1º de outubro.`

Este estado é diferente de uma janela vazia: aqui **não existe** período encerrado; uma janela vazia é um período que existiu e ficou em zero (item próprio do Definition of Done da feature).

### 4.5 Carregando

- Header real: o título do desafio já é conhecido, porque vem do card que abriu a tela.
- No lugar da lista, **skeleton estático**: uma barra de 17px de altura e 40% de largura no lugar do cabeçalho de grupo e, abaixo, quatro linhas de skeleton no desenho do 4.3, com divisor `linha` entre elas.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- É também o estado do **cold start** do serviço (RNF-ERR-09): demora não é erro. Se a espera passar de três segundos, aparece abaixo do skeleton, em `caption` `grafite`, centralizado: `O serviço está iniciando. Isso pode levar alguns segundos.`

### 4.6 Erro de carregamento

O servidor não respondeu depois das retentativas, com o aparelho online.

- Header real.
- Banner inline no lugar da lista, largura total menos o padding lateral, `space-4` abaixo do header, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda e `space-3` de gap.
- Texto em `body` `tinta`: `Não foi possível carregar o histórico deste desafio. Tente de novo em instantes.`
- `space-2`, botão textual `musgo`: `Tentar de novo`. Ao tocar, a lista volta ao estado 4.5.

### 4.7 Sem conexão

O aparelho está sem rede ao abrir a tela. O histórico não fica guardado no aparelho: sem conexão, não há o que mostrar.

- Header real.
- Banner inline no lugar da lista, mesmo desenho do 4.6, mas com fundo `ambar-fundo` e `WifiSlash` (Phosphor, `regular`, 20px, `ambar`): falta de rede é aviso, não erro do sistema.
- Texto em `body` `tinta`: `Você está sem conexão. O histórico aparece quando a conexão voltar.`
- `space-2`, botão textual `musgo`: `Tentar de novo`.

### 4.8 Sem conexão ao carregar mais

O leitor estava rolando o histórico de `20 páginas por dia` (mesma posição do 4.3) e a rede caiu ao pedir a página seguinte.

- As linhas já carregadas continuam visíveis e utilizáveis.
- No lugar das duas linhas de skeleton, uma linha inline, padding lateral `space-5`, `space-4` de padding vertical: `WifiSlash` (Phosphor, `regular`, 16px, `grafite`), `space-2`, em `caption` `grafite`, `Sem conexão para carregar janelas mais antigas.` e, à direita, botão textual `musgo`: `Tentar de novo`.
- Sem banner no topo e sem toast: o problema está no fim da lista, e é lá que ele aparece.
- Com o servidor fora em vez da rede, a mesma linha usa `Warning` e `Não foi possível carregar janelas mais antigas.`

### 4.9 Desafio pausado, janelas mensais

Histórico de `4 livros por mês`, aberto pelo menu do card pausado.

- Header com `4 livros por mês` e, na linha de baixo, `Histórico · Pausado desde 15 de setembro`.
- Grupo `2026` com as três janelas da seção 3: `Agosto de 2026` (`4 de 4 livros`, cumprido), `Julho de 2026` (`2 de 4 livros`, não cumprido) e `Junho de 2026` (`5 de 4 livros`, cumprido).
- Rodapé de criação: `Desafio criado em 10 de junho de 2026. O primeiro mês conta o que você registrou desde o início dele.`
- Setembro não aparece: é a janela corrente, ainda não encerrada, e não está sendo avaliada (RN-20.6). O histórico não ganha nenhuma linha de "em pausa" para a janela corrente: a pausa já está dita no header.

---

## 5. Artboards web (1440 x 900)

Não há versão web. RF-DSF-05 tem a coluna Web negativa em `REQUISITOS.md` §5.7, e desafios estão fora do escopo do cliente web (`REQUISITOS.md` §2.1). Não desenhe a linha 2.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

### 6.1 Padrão, desafio semanal

O estado 4.1 no escuro:

- Fundo `noite`. Título do header e ícones em `papel-suave`; `Histórico` em `grafite-claro`.
- Cabeçalho de grupo em `papel-suave` sobre `noite`, e o fundo preso ao topo também `noite`.
- Nome da janela e números em `papel-suave`; `de` e unidade em `grafite-claro`. Divisores em `linha-noite`.
- Barra com trilha `musgo-fundo-escuro` e preenchimento `broto-vivo`.
- Cumprido: `CheckCircle` em `broto-vivo` e texto em `papel-suave`. Não cumprido: `Circle` e texto em `grafite-claro`.
- Marca de mudança: ícone e texto em `grafite-claro`, divisores `linha-noite`.
- Barra inferior em `noite-elevada`, **mais clara** que o fundo, divisor `linha-noite`, item `Perfil` ativo em `musgo-claro`.

### 6.2 Rolado até o fim

O estado 4.2 no escuro, com as mesmas cores do 6.1. Linha de pausa com `PauseCircle` e texto em `grafite-claro`; rodapé de criação em `grafite-claro`.

### 6.3 Nenhuma janela encerrada

O estado 4.4 no escuro: ícone em `grafite-fundo-escuro`, título em `papel-suave`, texto em `grafite-claro`.

Nos três, nenhuma sombra: a tela não tem superfície elevada além da barra inferior.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Barra de progresso (geometria), com as cores de desafio | documento-de-design §4.7 e §3.1.3 |
| Botão textual | documento-de-design §4.1 |
| Escala tipográfica, com JetBrains Mono em numeral tabular | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, regra do acento único e `broto` só em progresso | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Estado vazio com desenho intencional | documento-de-design §8 |
| Shell autenticado, barra inferior e header | ../../periodo-0/P0-NAV/shell-de-navegacao.md |
| Header de tela de detalhe (`ArrowLeft`, título, sino) | nasceu nos prompts do Período 1 (`F-AUT/alterar-senha.md`), incorporação pendente |
| Cabeçalho de grupo preso ao topo, skeleton de carregar mais | nasceram em `../../periodo-2/F-EST-2/historico-de-leituras.md`, incorporação pendente |
| Barra com cores de desafio e marcação `Check` de cumprido | nasceram em `../../periodo-2/F-DSF/desafios.md`, incorporação pendente |
| Banner inline de erro em `rubi-fundo` | prompts do Período 1 e 2, incorporação pendente |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Linha de janela encerrada**: nome do período, marcação de resultado, barra com as cores de desafio sobre a meta da própria janela, fração com unidade e linha de pausa opcional.
2. **Marcação de resultado em dois desenhos**: `CheckCircle` `fill` `broto` com `Cumprido` e `Circle` `regular` `grafite` com `Não cumprido`. Distinção por forma e palavra, nunca só por cor.
3. **Marca de mudança de configuração** entre duas linhas vizinhas, com `PencilSimple` e a mudança escrita (`de 120 para 150 minutos por semana`).
4. **Rodapé de criação** no fim de uma listagem cronológica.
5. **Banner inline de sem conexão** em `ambar-fundo` com `WifiSlash`, e a **linha de falha ao carregar mais** no fim da lista.

**Pendências abertas por este prompt**, a registrar no arquivo da feature:

- **Pausa por janela não está no contrato.** `GET /desafios/{id}/janelas` traz início, fim, unidade, periodicidade, meta, acumulado e cumprimento. A linha `Desafio pausado nesta semana` precisa de um campo por janela (pausada inteira, em parte ou não), cruzando com `pausa_desafio`, como F-DSF já prevê.
- **Data de criação do desafio** para o rodapé: vem do próprio desafio, não da listagem de janelas. Confirmar que o cliente a tem ao abrir a tela.
- **Agrupamento** por mês (diária e semanal) e por ano (mensal), com a semana no mês em que começa: proposta deste prompt.
- **Marca de mudança derivada no cliente**, comparando janelas vizinhas. Na fronteira entre duas páginas, a comparação usa a última janela da página anterior.
- **Semana de segunda a domingo** ainda a ratificar pelo grupo; se mudar para domingo, só os intervalos do mock mudam.
- **Correção tardia sem aviso.** Um registro feito sem conexão pode mudar o resultado de uma janela já encerrada quando sincroniza (RN-20.10). A tela mostra o resultado atual a cada abertura, sem marcar que ele mudou.
- **Sem total de janelas cumpridas.** Não há resumo do tipo `5 de 7 semanas cumpridas`: o contrato não traz total e o produto não é sobre placar. Se o grupo quiser, entra como linha de contagem acima da lista.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Header: título | título do desafio, ex.: `150 minutos por semana`, `20 páginas por dia`, `24 livros por ano`, `4 livros por mês` |
| Header: linha de baixo | `Histórico` · `Histórico · Pausado desde 15 de setembro` |
| Cabeçalho de grupo | `Setembro de 2026` · `Agosto de 2026` · `2026` |
| Nome da janela, diária | `Quinta, 3 de setembro` |
| Nome da janela, semanal | `14 a 20 de setembro` · `31 de agosto a 6 de setembro` |
| Nome da janela, mensal | `Agosto de 2026` |
| Nome da janela, anual | `2025` |
| Resultado | `Cumprido` · `Não cumprido` |
| Números | `170 de 150 minutos` · `0 de 120 minutos` · `22 de 20 páginas` · `4 de 4 livros` · `1 de 1 livro` |
| Linha de pausa | `Desafio pausado neste dia` · `Desafio pausado nesta semana` · `Desafio pausado em parte desta semana` · `Desafio pausado neste mês` · `Desafio pausado em parte deste mês` · `Desafio pausado neste ano` · `Desafio pausado em parte deste ano` |
| Marca de mudança | `Meta alterada: de 120 para 150 minutos por semana` · `Unidade alterada: de páginas para minutos` · `Período alterado: de mensal para semanal` |
| Rodapé de criação | `Desafio criado em 5 de agosto de 2026. A primeira semana conta o que você registrou desde o início dela.` · `Desafio criado em 10 de junho de 2026. O primeiro mês conta o que você registrou desde o início dele.` · `Desafio criado em 3 de julho de 2026.` |
| Nenhuma janela: títulos | `Nenhum dia encerrado ainda` · `Nenhuma semana encerrada ainda` · `Nenhum mês encerrado ainda` · `Nenhum ano encerrado ainda` |
| Nenhuma janela: textos | `Hoje aparece aqui a partir de amanhã.` · `Esta semana aparece aqui a partir de segunda-feira, 28 de setembro.` · `Setembro aparece aqui a partir de 1º de outubro.` · `Cada ano entra aqui quando termina. 2026 aparece a partir de 1º de janeiro de 2027.` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro de carregamento | `Não foi possível carregar o histórico deste desafio. Tente de novo em instantes.` |
| Sem conexão | `Você está sem conexão. O histórico aparece quando a conexão voltar.` |
| Falha ao carregar mais | `Sem conexão para carregar janelas mais antigas.` · `Não foi possível carregar janelas mais antigas.` |
| Ação de erro | `Tentar de novo` |

---

## 9. Acessibilidade e interação

- **Alvo de toque de 48px** na seta, no sino e em cada `Tentar de novo`, mesmo quando o ícone ou o texto é menor.
- **Contraste:** nome da janela, números e `Cumprido` em `tinta` sobre `papel` passam em AAA; `Não cumprido`, `de`, unidade e linha de pausa em `grafite` sobre `papel` passam em AA para corpo. `broto` só aparece no ícone e na barra, nunca em texto. `grafite-suave` só no ícone do vazio. No escuro, `papel-suave` e `grafite-claro` sobre `noite`.
- **Resultado sem depender de cor** (RNF-USA-03): forma do ícone diferente (círculo preenchido com check contra círculo vazio) e a palavra escrita ao lado. A barra é complemento, nunca a única pista.
- **Leitor de tela lê cada janela como uma frase:** `14 a 20 de setembro. 170 de 150 minutos. Cumprido.` · `17 a 23 de agosto. 0 de 120 minutos. Não cumprido. Desafio pausado nesta semana.` Os ícones de resultado e de pausa são decorativos para o leitor de tela, porque a palavra já está na frase. A barra não é anunciada separadamente: ela repete a fração.
- **Cabeçalho de grupo** é anunciado como título de seção, para navegação por títulos. A marca de mudança é lida como texto comum, na posição em que aparece.
- **Linhas não são botões.** Sem papel de botão, sem estado de foco de toque, sem dica de "toque duas vezes para ativar".
- **Carregar mais** é anunciado de forma educada quando termina (`Mais janelas carregadas`), sem mover o foco. A linha de falha ao carregar mais recebe o foco do leitor de tela quando aparece.
- **Motion:** só o fade de entrada do skeleton, em `dur-base`. Tudo estático sob `prefers-reduced-motion`. Nada em loop, nenhuma barra que "enche" ao aparecer.
- **Texto grande:** com o escalonamento de fonte do sistema aumentado, o nome da janela quebra em duas linhas e a marcação de resultado desce para baixo dele, alinhada à esquerda, em vez de cortar.

---

## 10. O que não fazer nesta tela

**Específico desta tela**

- **Não desenhe versão web.** Desafios estão fora do cliente web.
- **Não recalcule o passado com a meta atual.** Cada linha usa a meta da própria janela: `130 de 120 minutos`, nunca `130 de 150 minutos` numa semana de agosto.
- **Não esconda janelas vazias** nem as de pausa. Elas aparecem com zero.
- **Não invente janelas antes da criação** do desafio, e não mostre a janela corrente.
- **Não pinte não cumprido de `rubi` nem de `ambar`.** Não cumprido é um resultado, não um erro. Nada de `X` vermelho, nada de tom de alerta.
- **Não comemore cumprido.** Nada de confete, brilho, medalha, selo, troféu, chama ou mudança de fundo da linha. O `CheckCircle` e a palavra bastam.
- **Não desenhe placar nem sequência.** Nada de `5 de 7 semanas cumpridas`, `3 semanas seguidas`, taxa de sucesso, recorde ou gráfico de cumprimento. Sequência diária é outra feature.
- **Não desenhe calendário.** O histórico é lista; calendário de dias com progresso é outra tela (F-GAM-OPC).
- **Não torne as linhas tocáveis.** Não existe detalhe de janela: sem `CaretRight`, sem press.
- **Não ponha ações no header.** Sem editar, excluir, compartilhar ou exportar: a tela é somente leitura.
- **Não mostre percentual** nem diferença como `+20` ou `-65`. A fração com unidade é o número.
- **Não use `musgo` na barra.** Progresso de desafio é `broto` sobre `musgo-fundo`.

**Tipografia (design §7.1)**

- Não use Inter como fonte de interface: a UI é Manrope.
- Não use Instrument Serif nem Fraunces. A serifa do produto é Newsreader, e ela não aparece nesta tela.
- Não misture família dentro de um título: ênfase é itálico da mesma família.
- Não ponha overline em cima de título de grupo. `Setembro de 2026` é `title-sm`, não `SETEMBRO` em caixa alta.
- Não use eyebrow numerado do tipo `01 · SEÇÃO`.

**Cores e superfícies (design §7.2)**

- Não use a família bege quente com latão, oxblood e expresso. O acento é `musgo`, e a cor de progresso de desafio é `broto`.
- Não use gradiente roxo, rosa ou azul, nem mesh, nem glow neon.
- Não use gradiente em botão nem em texto de título.
- Não use sombra preta pura nem `#000000` em lugar nenhum. As linhas não têm sombra.
- Não use textura de papel ou de madeira no fundo.

**Motion (design §7.4)**

- Nada de scroll hijacking, parallax ou marquee.
- Nada de loop infinito: sem shimmer no skeleton, sem barra que pulsa, sem ícone que gira.
- Nada de barra que "enche" animada ao aparecer: ela aparece no valor.

**Conteúdo e copy (design §7.5)**

- Zero em-dash em qualquer texto visível. Use dois pontos, vírgula ou reescreva.
- Nada de número fake-preciso. Os números desta tela são mock declarado e sempre vêm com unidade: `170 de 150 minutos`, nunca `170/150`.
- Nada de label poético: a linha de baixo do header é `Histórico`, não `Sua jornada`.
- Nada de emoji na copy.

**Componentes e assets (design §7.6)**

- Nada de ícone desenhado à mão: todos os ícones são Phosphor.
- Nada de toast nesta tela: erros são banner ou linha inline.

**Modo escuro (design §7.7)**

- Nada de fundo `#000000`: o fundo é `noite`.
- Nada de só inverter a paleta: no escuro a barra usa `broto-vivo` sobre `musgo-fundo-escuro`.
- Nada de meia tela clara e meia escura.

**Métricas e dados (design §7.10)**

- Nada de cor fora do sistema na barra: `broto` sobre `musgo-fundo`, e só.
- Nada de número sem unidade.
- Nada de `%` quando a fração já mostra a proporção.

**Fora de escopo por decisão (design §7.12)**

- Nada de camada de obra, login social, mensagem direta, clube de leitura, grupo, fórum, leitura de e-book, medalha, conquista ou ranking.
