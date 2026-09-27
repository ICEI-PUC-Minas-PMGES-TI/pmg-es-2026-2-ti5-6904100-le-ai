# F-DSF · Desafios

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-DSF.md
**Requisitos:** RF-DSF-01 (um ou mais desafios simultâneos, com unidade, janela e valor-alvo), RF-DSF-03 (progresso de cada desafio na janela corrente), RF-DSF-04 (editar, pausar e excluir)
**Requisitos de sistema cujo efeito aparece aqui:** RF-DSF-02 (desafios de páginas e minutos atualizados a cada atualização de progresso) e RF-DSF-06 (desafios de livros atualizados a cada leitura finalizada). O cliente só **exibe o acumulado**; quem soma é o servidor.
**Não funcionais:** RNF-DES-02 (listagem paginada), RNF-USA-04 (confirmação em ação destrutiva), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-20 (unidades, janelas de calendário no fuso do celular, criação no meio da janela, livros só finalizados, pausa, edição só na janela corrente, cumprimento), RN-04 (o que conta como leitura finalizada), RN-16.13 (minutos cronometrados contam como os informados)
**Versão web:** não. RF-DSF-01 a RF-DSF-06 têm a coluna Web negativa em `REQUISITOS.md` §5.7, e desafios estão fora do escopo do cliente web (`REQUISITOS.md` §2.1).

---

## 1. Contexto

Esta é a tela da **meta**, o segundo dos três mecanismos do produto. O leitor escolhe um alvo curto e alcançável (páginas por dia, minutos por semana, livros por ano) e acompanha aqui quanto já fez **na janela que está correndo agora**.

**De onde se chega:** do bloco `Desafios` do Meu perfil, pelo botão textual `Ver todos`. Esse bloco é uma edição do perfil que entra num lote futuro; aqui ele só é citado. A tela é uma **tela de detalhe empilhada sobre a área Perfil**: header com seta de voltar e a aba `Perfil` ativa na barra inferior.

**Para onde se vai:** para `Novo desafio` e `Editar desafio`, que são a mesma tela ([`criar-desafio.md`](criar-desafio.md)), e para o menu de ações de cada desafio (editar, pausar ou retomar, excluir), que é um bottom sheet desenhado aqui como estado.

Quatro coisas que ela precisa resolver:

- **Vários desafios convivem.** Qualquer unidade combina com qualquer janela, e o leitor pode ter vários ativos ao mesmo tempo (RN-20). A lista precisa deixar claro, em cada card, **o que conta** (páginas, minutos ou livros) e **em que janela** (hoje, esta semana, setembro, 2026), sem o leitor precisar abrir nada.
- **A janela é de calendário, não móvel.** O desafio diário conta o dia de hoje, o mensal conta setembro inteiro, o anual conta 2026 desde janeiro (RN-20.1 e RN-20.2). O card nomeia a janela por esse nome de calendário, e não por "últimos 7 dias".
- **Pausado é diferente de atrasado.** Um desafio pausado não acumula e sua janela não é avaliada (RN-20.6). Ele não pode parecer falhado nem em risco: sai do grupo dos ativos, perde a barra e diz em uma linha o que a pausa significa.
- **Cumprir não vira festa.** A janela cumprida mostra o fato com um `Check` e uma frase. Nada de medalha, confete, animação ou ranking: gamificação aqui é número honesto, não recompensa.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, na ordem em que o leitor os encontra.
- **Linha 2:** não existe. A tela não tem versão web (ver seção 5).
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Desafios · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- Espaçamento generoso entre artboards, com as linhas claramente separadas.

---

## 2. Contexto do design

```
Produto: Lê Ai, aplicativo social de leitura brasileiro, no modelo Skoob e
Letterboxd. Público de 18 a 30 anos, interface em pt-BR, uso predominante em
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

## 3. Dados que aparecem na tela

**Hoje é quinta-feira, 24 de setembro de 2026**, no fuso do celular do leitor.

**Desafios do leitor** (mock declarado). O título de cada desafio não é digitado: ele é composto pela configuração, no formato `<alvo> <unidade> por <dia | semana | mês | ano>`, com `livro` no singular quando o alvo é 1.

| Título | Unidade | Janela | Nome da janela no card | Acumulado na janela corrente | Situação |
|---|---|---|---|---|---|
| 20 páginas por dia | Páginas | Diária | `Hoje` | 12 de 20 páginas | ativo, faltam 8 páginas |
| 150 minutos por semana | Minutos | Semanal | `Esta semana` | 95 de 150 minutos | ativo, faltam 55 minutos |
| 600 páginas por mês | Páginas | Mensal | `Setembro` | 612 de 600 páginas | ativo, **cumprido** em setembro |
| 24 livros por ano | Livros | Anual | `2026` | 17 de 24 livros | ativo, faltam 7 livros |
| 4 livros por mês | Livros | Mensal | `Setembro` | parado em 1 de 4 livros | **pausado desde 15 de setembro** |

- A janela semanal é nomeada só como `Esta semana`, **sem intervalo de datas**: o dia em que a semana de calendário começa não está definido nos requisitos (pendência na seção 7).
- **Ordem da lista:** ativos primeiro, da janela mais curta para a mais longa (diária, semanal, mensal, anual); dentro da mesma janela, o mais recente primeiro. Pausados depois, num grupo próprio. A ordem é proposta deste prompt (pendência na seção 7).
- O acumulado já considera tudo o que o servidor somou: páginas e minutos de cada registro de progresso (inclusive minutos de sessão cronometrada), livros de cada leitura ou releitura finalizada, livros pessoais incluídos (RN-20.3, RN-20.4, RN-16.13). A tela não explica essa origem em cada card; ela é explicada no estado vazio e no formulário de criação.

**Segunda situação, para o artboard de início de janela:** sexta-feira, 25 de setembro de 2026, de manhã, antes de qualquer registro. `20 páginas por dia` recomeça em `0 de 20 páginas`; os demais seguem com o acumulado de suas janelas, que continuam correndo.

**Nada de histórico de janelas encerradas.** O resultado de ontem, da semana passada ou de agosto não aparece em lugar nenhum: é RF-DSF-05, Opcional, do Período 3.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell. O shell é idêntico em todas as telas autenticadas e precisa ser desenhado por extenso aqui.

**Mobile, barra inferior.** Fixa no rodapé da viewport, acima da área segura. Altura de 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, sem sombra. Quatro itens de largura igual: `Estante`, `Descobrir`, `Feed`, `Perfil`. Cada item empilha ícone de 24px acima e rótulo em `caption` abaixo, com `space-1` de gap, centralizado, e a área tocável tem no mínimo 48px de altura. Ícones Phosphor: `Books` para Estante, `Compass` para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. Inativo: ícone peso `regular`, cor `grafite`; rótulo em `caption` `grafite`. Ativo: ícone peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`. Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone que salta. **Nesta tela o item ativo é `Perfil`**, porque ela é empilhada sobre o perfil.

**Mobile, header de tela de detalhe.** Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando ao Meu perfil.
- Título `Desafios` em `display` `tinta`, à esquerda, alinhado à base, `space-2` depois da seta.
- À direita, na mesma linha: a ação contextual `Plus` (Phosphor, `regular`, 24px, `tinta`, alvo de 48px, rótulo acessível `Novo desafio`), `space-4` de gap e o sino `Bell` (Phosphor, `regular`, 24px, `tinta`). O sino é fixo em toda tela autenticada. Badge de não lidas: círculo de 18px, fundo `musgo`, encostado no canto superior direito do ícone, número centralizado em 11px peso 600 cor `papel`; acima de nove mostra `9+`; sem não lidas, o badge não existe.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.
- **O `Plus` é o único ponto de criação da tela.** No estado vazio ele some do header, e o botão do vazio assume: nunca dois CTAs de mesma intenção na mesma tela.

### Card de desafio (nasce aqui)

Cada desafio é um card. O `documento-de-design.md` não define este card: ele nasce aqui e vira pendência de incorporação (seção 7).

- Card em `papel-elevado`, `radius-md`, padding `space-5`, **sem sombra**, largura total menos o padding lateral da tela. Cards empilhados com `space-4` de gap.
- **Linha 1:** à esquerda, ícone da unidade (Phosphor, `regular`, 20px, `grafite`): `BookOpen` para páginas, `Clock` para minutos, `Books` para livros. `space-3` de gap, o título do desafio em `title-sm` `tinta` (`20 páginas por dia`), com os números do título em JetBrains Mono. À direita, `DotsThreeVertical` (Phosphor, `regular`, 24px, `grafite`) com alvo de 48px, que abre o menu de ações.
- **Linha 2**, `space-1` abaixo, alinhada ao título: o nome da janela corrente em `caption` `grafite` (`Hoje`, `Esta semana`, `Setembro`, `2026`).
- `space-4`.
- **Barra de progresso do desafio:** a geometria da barra de progresso de leitura do design §4.7 (trilha de 6px, `radius-full`), com as **cores de desafio** do design §3.1.3: trilha `musgo-fundo`, preenchimento `broto`. O preenchimento é proporcional ao acumulado sobre o alvo e para no fim da trilha quando o acumulado passa do alvo.
- `space-2`.
- **Linha de números:** à esquerda, `12 de 20 páginas`, com `12` e `20` em `num-inline` `tinta` e `de` e `páginas` em `body` `grafite`. À direita, em `caption` `grafite`, o que falta: `Faltam 8 páginas`. **Sem percentual**: a fração com unidade já diz tudo, e um `60%` ao lado seria número decorativo.
- O card inteiro não é tocável: não existe página de detalhe do desafio no Período 2. As únicas ações são o `DotsThreeVertical` e o `Plus` do header.

**Variante cumprida.** Quando o acumulado atinge o alvo (RN-20.8):

- A barra fica cheia em `broto`.
- A linha de números mostra o acumulado real, mesmo acima do alvo: `612 de 600 páginas`.
- À direita da linha de números, no lugar de `Faltam`, `Check` (Phosphor, `bold`, 16px, `broto`), `space-1` de gap, e em `caption` peso 600 `tinta`: `Cumprido em setembro`. Para as outras janelas: `Cumprido hoje`, `Cumprido nesta semana`, `Cumprido em 2026`.
- **Nada além disso.** Sem troca de cor de fundo do card, sem selo, sem medalha, sem confete, sem animação de celebração.

**Variante pausada.** RN-20.6: o desafio pausado não acumula e sua janela não é avaliada.

- Mesmo card, **sem barra de progresso** e sem `Faltam`: uma janela que não está sendo avaliada não tem o que preencher.
- Linha 2 troca o nome da janela por um pill `Pausado`: `radius-full`, padding `space-1 space-2`, borda de 1px `linha`, fundo transparente, `PauseCircle` (Phosphor, `regular`, 16px, `grafite`) e texto em `caption` `grafite`. É o mesmo tratamento neutro do pill `Abandonado` da estante (design §4.6), porque pausar não é falhar.
- `space-3`, texto em `body` `grafite`, até duas linhas: `Pausado desde 15 de setembro. O que você registrar enquanto ele estiver pausado não conta para este desafio.`
- O título continua em `title-sm` `tinta`: o desafio não fica acinzentado nem com opacidade reduzida.

### 4.1 Padrão, vários desafios

De cima para baixo:

1. Header de tela de detalhe com `Desafios`, `Plus` e `Bell`.
2. `space-4` de respiro.
3. Os quatro desafios ativos, na ordem da seção 3: `20 páginas por dia`, `150 minutos por semana`, `600 páginas por mês` (variante cumprida) e `24 livros por ano`.
4. `space-8`.
5. Título do grupo em `title-sm` `tinta`: `Pausados`, com `space-3` abaixo.
6. O card `4 livros por mês` na variante pausada.
7. `space-8` antes da barra inferior.

Se a lista for maior que a viewport, ela rola por baixo do header e a barra inferior fica fixa. **Paginação (RNF-DES-02):** ao chegar perto do fim da lista, dois cards de skeleton estático entram no fim, com a forma do card (as mesmas barras do estado 4.7), e são substituídos pelos desafios seguintes. Não há botão `Carregar mais` nem contador de páginas.

Quando não há nenhum desafio pausado, o grupo `Pausados` não existe: nem título, nem espaço reservado.

### 4.2 Menu de ações

O leitor tocou no `DotsThreeVertical` de `150 minutos por semana`. Bottom sheet do design §4.11 sobre o estado 4.1 escurecido pelo scrim.

1. Alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo.
2. Cabeçalho do sheet: `Clock` (Phosphor, `regular`, 20px, `grafite`), `space-3`, título `150 minutos por semana` em `title-sm` `tinta` e, abaixo, `Esta semana: 95 de 150 minutos` em `caption` `grafite`, com os números em JetBrains Mono.
3. `space-4`, divisor de 1px `linha`.
4. Itens de menu de 56px, ícone de 20px `regular` à esquerda, `space-4` de gap, rótulo em `body`, divisor `linha` entre eles:
   - `PencilSimple` `tinta` · `Editar desafio`. Abre [`criar-desafio.md`](criar-desafio.md) em modo edição.
   - `Pause` `tinta` · `Pausar desafio`, com uma segunda linha em `caption` `grafite` dentro do mesmo item: `O que você registrar durante a pausa não conta.` O item cresce o que precisar para as duas linhas, sem cortar texto.
   - `Trash` `rubi` · `Excluir desafio`, rótulo em `rubi`, sempre o último, separado por divisor.
5. `space-4`, botão textual `grafite` de largura total: `Cancelar`.

**Pausar não pede confirmação.** Não é destrutivo e se desfaz com `Retomar`; a consequência está escrita no próprio item. Ao tocar, o sheet fecha em `dur-base` com `ease-in`, e o card se move para o grupo `Pausados` com um crossfade em `dur-base`. Sob `prefers-reduced-motion`, a lista simplesmente se reorganiza.

**Variante do desafio pausado** (desenhe como artboard separado, `Desafios · Menu de ações, desafio pausado`, sobre o card `4 livros por mês`): o cabeçalho mostra `Pausado desde 15 de setembro` na segunda linha, e o item do meio vira `Play` `tinta` · `Retomar desafio`, com a segunda linha `Volta a contar a partir de agora.` Ao retomar, o card volta ao grupo dos ativos na posição da ordem da seção 3, com a barra e os números da janela corrente contando só o que foi registrado a partir da retomada (RN-20.6).

### 4.3 Confirmação de exclusão

O leitor tocou em `Excluir desafio` no menu de `150 minutos por semana`. O menu dá lugar à confirmação destrutiva do design §4.11, sobre o mesmo scrim.

1. Alça.
2. Título em `title-sm` `tinta`: `Excluir o desafio 150 minutos por semana?`
3. `space-3`, texto em `body` `grafite`: `O desafio e o progresso dele saem da sua lista. Seus registros de leitura continuam como estão. Não dá para desfazer.`
4. `space-6`, botão destrutivo em **outline** `rubi` (borda de 1px `rubi`, texto `rubi`, fundo transparente, `radius` 12, 48px, largura total): `Excluir desafio`.
5. `space-3`, botão textual `grafite`, largura total: `Cancelar`.

O foco entra em `Cancelar`, nunca no destrutivo. A confirmação nomeia o desafio pelo título, e não "este item". Confirmada, o sheet fecha e o card sai da lista com um fade de saída em `dur-base`; sem desfazer, sem toast de "desfazer".

### 4.4 Início de janela

Sexta-feira, 25 de setembro, de manhã, antes de qualquer registro. Mesma lista do 4.1, com uma diferença: `20 páginas por dia` recomeçou.

- Barra com a trilha `musgo-fundo` vazia, sem preenchimento nenhum.
- Linha de números: `0 de 20 páginas` e, à direita, `Faltam 20 páginas`. Nunca `0%`.
- **Nenhum aviso sobre ontem.** Nem "você cumpriu ontem", nem "você não cumpriu ontem", nem contagem de dias seguidos: o histórico de janelas é RF-DSF-05, do Período 3, e sequência diária é outra feature.
- Os outros desafios não mudam, porque suas janelas continuam correndo.

### 4.5 Vazio

O leitor ainda não criou nenhum desafio. O header **não tem o `Plus`**: só a seta, o título e o sino.

Bloco centralizado verticalmente no espaço entre o header e a barra inferior, padding lateral `space-5`:

1. `Target` (Phosphor, `regular`, 32px, `grafite-suave`).
2. `space-4`, título em `title` `tinta`, centralizado: `Você ainda não tem desafios`.
3. `space-2`, texto em `body` `grafite`, centralizado, até quatro linhas: `Escolha um alvo curto, como páginas por dia, minutos por semana ou livros por ano. Cada registro de progresso e cada leitura finalizada contam sozinhos.`
4. `space-6`, botão primário pill `musgo` com texto `papel`, largura do rótulo mais o padding, 48px: `Novo desafio`.

Sem ilustração elaborada e sem desafio de exemplo sugerido: o leitor escolhe o próprio alvo.

### 4.6 Carregando

- Header real, com `Plus` e `Bell`.
- No lugar da lista, **skeleton estático** de três cards: cada um um retângulo `papel-elevado`, `radius-md`, padding `space-5`, com três barras em `linha` e `radius-sm`: a primeira de 17px de altura e 60% de largura (o título), a segunda de 13px e 30% (a janela) e, `space-4` abaixo, uma de 6px em largura total e `radius-full` (a barra de progresso).
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- É também o estado do **cold start** do serviço (RNF-ERR-09): demora não é erro. Se a espera passar de três segundos, aparece abaixo do skeleton, em `caption` `grafite`, centralizado: `O serviço está iniciando. Isso pode levar alguns segundos.`

### 4.7 Erro de carregamento

- Header real, com `Plus` e `Bell`.
- Banner inline no lugar da lista, largura total menos o padding lateral, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda e `space-3` de gap.
- Texto em `body` `tinta`: `Não foi possível carregar seus desafios. Verifique sua conexão e tente de novo.`
- `space-2`, botão textual `musgo`: `Tentar de novo`.

### 4.8 Falha ao pausar

O leitor tocou em `Pausar desafio` e o servidor não confirmou. O sheet já fechou; o card continua no grupo dos ativos, como estava.

- Toast no rodapé, acima da barra inferior, com `space-4` de margem lateral: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, **barra lateral fina de 4px em `rubi`** à esquerda, texto em `body` `tinta`: `Não foi possível pausar o desafio. Verifique sua conexão e tente de novo.` À direita, botão textual `musgo`: `Tentar de novo`.
- À direita de `Tentar de novo`, `X` (Phosphor, `regular`, 20px, `grafite`, alvo de 48px, rótulo acessível `Fechar aviso`).
- Entra de baixo em `dur-base` com `ease-out` e fica até o leitor tocar em `Tentar de novo` ou em `X`; sai em `dur-base` com `ease-in`. Sob `prefers-reduced-motion`, aparece e some sem deslizar. Não some sozinho num tempo fixo: o documento de design não define duração de toast, e um erro que desaparece antes de ser lido não é acionável.
- A mesma forma serve para `Retomar` e `Excluir`, trocando o verbo: `Não foi possível retomar o desafio.`, `Não foi possível excluir o desafio.`, seguidos de `Verifique sua conexão e tente de novo.`
- Nada de toast verde de sucesso: sucesso é o card mudando de lugar.

---

## 5. Artboards web (1440 x 900)

Não há versão web. RF-DSF-01 a RF-DSF-06 têm a coluna Web negativa em `REQUISITOS.md` §5.7, e desafios estão fora do escopo do cliente web (`REQUISITOS.md` §2.1). Não desenhe a linha 2.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

### 6.1 Padrão, vários desafios

O estado 4.1 no escuro:

- Fundo `noite`. Título do header em `papel-suave`, ícones do header em `papel-suave`.
- Cards em `noite-elevada`, **mais claros** que o fundo, sem sombra. Título em `papel-suave`, nome da janela e ícone de unidade em `grafite-claro`.
- Barra de progresso com trilha `musgo-fundo-escuro` e preenchimento `broto-vivo`. Números em `papel-suave`, `de` e unidade em `grafite-claro`, `Faltam` em `grafite-claro`.
- Variante cumprida: `Check` em `broto-vivo`, texto `Cumprido em setembro` em `papel-suave`.
- Variante pausada: pill com borda `linha-noite`, ícone e texto em `grafite-claro`; texto explicativo em `grafite-claro`.
- Barra inferior em `noite-elevada`, **mais clara** que o fundo, divisor `linha-noite`, item `Perfil` ativo em `musgo-claro`.

### 6.2 Menu de ações

O estado 4.2 no escuro: sheet em `noite-elevada`, alça e divisores em `linha-noite`, rótulos em `papel-suave`, segunda linha em `grafite-claro`, `Excluir desafio` em `rubi-claro`, scrim preto a 60%.

Nos dois, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Barra de progresso (geometria), com as cores de desafio | documento-de-design §4.7 e §3.1.3 |
| Botão primário pill, botão textual e botão destrutivo em outline | documento-de-design §4.1 |
| Bottom sheet, menu de ações e confirmação destrutiva | documento-de-design §4.11 |
| Pill neutro com borda (tratamento do `Abandonado`) | documento-de-design §4.6 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6 |
| Escala tipográfica, com JetBrains Mono em numeral tabular | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, regra do acento único e `broto` só em progresso | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Estado vazio com desenho intencional e CTA | documento-de-design §8 |
| Shell autenticado, barra inferior e header | ../../periodo-0/P0-NAV/shell-de-navegacao.md |
| Header de tela de detalhe (`ArrowLeft`, título, sino) | nasceu nos prompts do Período 1 (`F-AUT/alterar-senha.md`), incorporação pendente |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Card de desafio**, com as variantes ativa, cumprida e pausada: ícone de unidade, título composto pela configuração, nome da janela de calendário, barra com as cores de desafio e linha de números com o que falta.
2. **Pill `Pausado`**, reaproveitando o tratamento neutro do `Abandonado` com `PauseCircle`, fora do contexto da estante.
3. **Item de menu de ações com segunda linha explicativa**, para ações não destrutivas cuja consequência precisa ser dita antes do toque (pausar e retomar).
4. **Agrupamento `Pausados`** no fim da lista, com título em `title-sm`.

**Pendências abertas por este prompt**, a registrar no arquivo da feature:

- **Início da semana de calendário não definido.** RN-20 diz "semana de calendário" sem dizer se começa no domingo ou na segunda. Por isso o card semanal mostra só `Esta semana`, sem intervalo de datas.
- **Ordem da lista não definida no contrato.** Este prompt propõe ativos da janela mais curta para a mais longa e pausados no fim.
- **Faixa do valor-alvo** ainda não fixada no contrato (já registrada no arquivo da feature); afeta o formulário, não esta tela.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header | `Desafios` |
| Rótulo acessível do `Plus` | `Novo desafio` |
| Título do desafio | `<alvo> <unidade> por <dia \| semana \| mês \| ano>`, ex.: `20 páginas por dia`, `150 minutos por semana`, `600 páginas por mês`, `24 livros por ano`, `1 livro por semana` |
| Nome da janela | `Hoje` · `Esta semana` · `Setembro` (nome do mês corrente) · `2026` (ano corrente) |
| Números | `12 de 20 páginas` · `95 de 150 minutos` · `17 de 24 livros` |
| O que falta | `Faltam 8 páginas` · `Faltam 55 minutos` · `Faltam 7 livros` · `Falta 1 livro` |
| Cumprido | `Cumprido hoje` · `Cumprido nesta semana` · `Cumprido em setembro` · `Cumprido em 2026` |
| Pill de pausa | `Pausado` |
| Texto do pausado | `Pausado desde 15 de setembro. O que você registrar enquanto ele estiver pausado não conta para este desafio.` |
| Título do grupo | `Pausados` |
| Menu: cabeçalho, ativo | `Esta semana: 95 de 150 minutos` |
| Menu: cabeçalho, pausado | `Pausado desde 15 de setembro` |
| Menu: editar | `Editar desafio` |
| Menu: pausar | `Pausar desafio` / `O que você registrar durante a pausa não conta.` |
| Menu: retomar | `Retomar desafio` / `Volta a contar a partir de agora.` |
| Menu: excluir | `Excluir desafio` |
| Menu: fechar | `Cancelar` |
| Confirmação: título | `Excluir o desafio 150 minutos por semana?` |
| Confirmação: texto | `O desafio e o progresso dele saem da sua lista. Seus registros de leitura continuam como estão. Não dá para desfazer.` |
| Confirmação: botões | `Excluir desafio` · `Cancelar` |
| Vazio: título | `Você ainda não tem desafios` |
| Vazio: texto | `Escolha um alvo curto, como páginas por dia, minutos por semana ou livros por ano. Cada registro de progresso e cada leitura finalizada contam sozinhos.` |
| Vazio: botão | `Novo desafio` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro de carregamento | `Não foi possível carregar seus desafios. Verifique sua conexão e tente de novo.` |
| Erro: ação | `Tentar de novo` |
| Toast: fechar (acessível) | `Fechar aviso` |
| Falha em ação | `Não foi possível pausar o desafio. Verifique sua conexão e tente de novo.` · `Não foi possível retomar o desafio. Verifique sua conexão e tente de novo.` · `Não foi possível excluir o desafio. Verifique sua conexão e tente de novo.` |

---

## 9. Acessibilidade e interação

- **Alvo de toque de 48px** na seta, no `Plus`, no sino, em cada `DotsThreeVertical` e em cada item do menu, mesmo quando o ícone é menor.
- **Contraste:** título e números em `tinta` sobre `papel-elevado` passam em AAA; `grafite` sobre `papel-elevado` passa em AA para corpo. `grafite-suave` só aparece no ícone do vazio, nunca em texto. No escuro, `papel-suave` e `grafite-claro` sobre `noite-elevada`.
- **A barra não carrega informação sozinha.** Ela tem papel `progressbar` com valor atual, mínimo e máximo e rótulo com o título do desafio, e a fração com unidade está sempre escrita ao lado. Quem não distingue `broto` de `musgo-fundo` lê o número.
- **Leitor de tela lê cada card como uma frase:** `20 páginas por dia. Hoje: 12 de 20 páginas. Faltam 8 páginas.` · `600 páginas por mês. Cumprido em setembro: 612 de 600 páginas.` · `4 livros por mês. Pausado desde 15 de setembro.` O botão de três pontos se anuncia como `Ações do desafio 20 páginas por dia`.
- **Sheet:** foco preso dentro enquanto aberto, toque no scrim e o voltar do sistema fecham, e o foco volta ao `DotsThreeVertical` que abriu. Na confirmação de exclusão, o foco entra em `Cancelar`.
- **Toda exclusão passa por confirmação** (RNF-USA-04), com botão destrutivo em outline `rubi`, nunca preenchido. Pausar e retomar não pedem confirmação porque se desfazem um ao outro.
- **Motion:** sheet em `dur-slow` na entrada e `dur-base` na saída; reorganização da lista em crossfade de `dur-base`; press em `scale(0.98)` com `dur-instant`. Tudo estático sob `prefers-reduced-motion`. Nada em loop.
- **Texto grande:** com o escalonamento de fonte do sistema aumentado, o título do desafio quebra em duas linhas e a linha de números empilha (fração em cima, `Faltam` embaixo) em vez de cortar.

---

## 10. O que não fazer nesta tela

**Específico desta tela**

- **Não desenhe versão web.** Desafios estão fora do cliente web.
- **Não desenhe histórico de janelas encerradas.** Nem "semana passada: cumprido", nem calendário de dias cumpridos, nem lista de meses. RF-DSF-05 é Opcional e fica para o Período 3.
- **Não desenhe medalha, conquista, troféu, badge de gamificação, selo de "desafio concluído" nem ranking de leitores.** Estão fora do escopo do produto por decisão, e reintroduzi-los é mudança de requisito, não de design.
- **Não comemore.** Nada de confete, partícula, brilho, animação de sucesso ou mudança de cor do card quando a janela é cumprida. O `Check` e a frase bastam.
- **Não desenhe sequência diária** (chama, dias seguidos, recorde). É outra feature e mora no perfil.
- **Não trate pausado como falha ou risco.** Nada de `ambar`, `rubi`, opacidade reduzida ou acinzentamento no card pausado.
- **Não use `musgo` na barra de desafio.** Progresso de desafio é `broto` sobre `musgo-fundo`; `musgo` fica para a barra de leitura e para ação.
- **Não mostre percentual** ao lado da barra nem `0%` na janela que começou. A fração com unidade é o número.
- **Não mostre intervalo de datas da semana.** O início da semana de calendário não está definido.
- **Não abra página de detalhe ao tocar no card.** Ela não existe no Período 2.
- **Não desenhe dois pontos de criação ao mesmo tempo.** No vazio, o `Plus` do header some.
- **Não sugira desafios prontos** ("Que tal 10 páginas por dia?") nem pré-preencha exemplo: o leitor escolhe o próprio alvo.

**Tipografia (design §7.1)**

- Não use Inter como fonte de interface: a UI é Manrope.
- Não use Instrument Serif nem Fraunces. A serifa do produto é Newsreader, e ela não aparece nesta tela.
- Não misture família dentro de um título: ênfase é itálico da mesma família.
- Não ponha overline em cima de título de seção nem de card. `Pausados` é título em `title-sm`, não `PAUSADOS` em caixa alta.
- Não use eyebrow numerado do tipo `01 · SEÇÃO`.

**Cores e superfícies (design §7.2)**

- Não use a família bege quente com latão, oxblood e expresso. O acento é `musgo`, e a cor de progresso de desafio é `broto`.
- Não use gradiente roxo, rosa ou azul, nem mesh, nem glow neon.
- Não use gradiente em botão nem em texto de título.
- Não use sombra preta pura nem `#000000` em lugar nenhum. Cards de desafio não têm sombra.
- Não use textura de papel ou de madeira no fundo.

**Motion (design §7.4)**

- Nada de scroll hijacking, parallax ou marquee.
- Nada de loop infinito: sem shimmer no skeleton, sem barra que pulsa, sem ícone que gira.
- Nada de barra que "enche" animada ao abrir a tela: ela aparece no valor.

**Conteúdo e copy (design §7.5)**

- Zero em-dash em qualquer texto visível. Use dois pontos, vírgula ou reescreva.
- Nada de número fake-preciso. Os números desta tela são mock declarado e sempre vêm com unidade: `12 de 20 páginas`, nunca `12/20`.
- Nada de label poético: o título é `Desafios`, o grupo é `Pausados`.
- Nada de emoji na copy. Nada de chama, alvo ou troféu em emoji.

**Componentes e assets (design §7.6)**

- Nada de ícone desenhado à mão: todos os ícones são Phosphor.
- Nada de toast com fundo saturado verde ou vermelho: toast é `papel-elevado` com barra lateral fina `rubi`.

**Modo escuro (design §7.7)**

- Nada de fundo `#000000`: o fundo é `noite`.
- Nada de só inverter a paleta: no escuro o card é `noite-elevada`, mais claro que o fundo, e a barra usa `broto-vivo` sobre `musgo-fundo-escuro`.
- Nada de meia tela clara e meia escura.

**Interações destrutivas (design §7.8)**

- Nada de excluir sem confirmação.
- Nada de botão destrutivo preenchido em `rubi`: é outline.
- Nada de desfazer depois de excluir.

**Métricas e dados (design §7.10)**

- Nada de cor fora do sistema na barra: `broto` sobre `musgo-fundo`, e só.
- Nada de número sem unidade.
- Nada de `%` quando a fração já mostra a proporção.

**Fora de escopo por decisão (design §7.12)**

- Nada de camada de obra, login social, mensagem direta, clube de leitura, grupo, fórum, leitura de e-book, medalha, conquista ou ranking.
