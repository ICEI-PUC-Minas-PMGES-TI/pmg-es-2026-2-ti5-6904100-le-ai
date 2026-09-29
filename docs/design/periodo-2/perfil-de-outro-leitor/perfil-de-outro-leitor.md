# Perfil de outro leitor (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Perfil de outro leitor`, gerado por `docs/design/periodo-1/F-PERFIL/perfil-de-outro-leitor.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-PERFIL/perfil-de-outro-leitor.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-STA.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-LST.md, ../../../plano-de-desenvolvimento/periodo-2/feature-F-AVA-2.md
**Requisitos que entram:**
- F-STA: RF-STA-01 (só o bloco `Estatísticas do ano` do perfil visitado, com os três totais do ano corrente, sob RN-08, pelo endpoint público de estatísticas). **Sem entrada para o painel**: o painel é só do próprio leitor.
- F-LST: RF-LST-04 (ver as listas de outro leitor respeitando a privacidade do perfil: a seção `Listas` no mobile e a aba `Listas` na web). Fecha a pendência de RF-SOC-02 do Período 1, que citava as listas do leitor.
- F-AVA-2: RF-AVA-05 (curtir ou descurtir a resenha de outro leitor, uma reação por resenha), RF-AVA-08 (contagens de curtidas e descurtidas separadas)

**Não funcionais:** RNF-SEC-03 (RN-08 revalidada no servidor em estatísticas, listas e reações), RNF-SEC-18 (rate limiting em reagir), RNF-ERR-04 (reagir é idempotente), RNF-DES-02 (listas paginadas no índice, não aqui), RNF-USA-03, RNF-USA-05, RNF-ERR-09
**Regras de negócio:** RN-08 (estante, leituras, **listas** e **estatísticas** de perfil privado só para seguidor aceito; resenhas e notas também), RN-04 e RN-17 (o que entra nos totais)
**Versão web:** sim. RF-STA-01, RF-LST-04, RF-AVA-05 e RF-AVA-08 têm marcação na coluna Web de `REQUISITOS.md`.

---

## 1. O que muda e por quê

RN-08 lista quatro coisas que um perfil privado só mostra a seguidor aceito: estante, leituras, **listas** e **estatísticas**. O Período 1 desenhou só estante e resenhas, porque listas (F-LST) e estatísticas (F-STA) eram do Período 2. Três features do Período 2 depositam conteúdo aqui, e todas entram nesta edição de uma vez. **Identidade, botão de relação, contadores, bloco de restrição, modal de deixar de seguir, perfil não encontrado e a linha de solicitação recebida não mudam**, exceto a copy de restrição, que passa a nomear listas e estatísticas.

| O que entra | Onde | Plataforma | Feature |
|---|---|---|---|
| Bloco `Estatísticas do ano` com três totais, **sem `Ver estatísticas`** | Logo abaixo dos contadores no mobile; na coluna de identidade da web, depois dos contadores | mobile e web | F-STA |
| Curtir e descurtir, com contagens separadas, em cada resenha da prévia | Rodapé de cada resenha | mobile e web | F-AVA-2 |
| Seção `Listas` com as três mais recentes e `Ver todas`, **sem `Nova lista`** | Depois de `Resenhas`, última seção | mobile | F-LST |
| Terceira aba `Listas` | Faixa de abas da coluna direita | web | F-LST |

**Ordem das seções no mobile, quando RN-08 permite:** identidade, botão de relação, contadores, `Estatísticas do ano`, `Estante`, `Resenhas`, `Listas`. É a ordem do Meu perfil sem os dois blocos que só o dono tem.

**O que não entra, e por quê:**

- **Sequência diária:** o `documento-de-design.md` §5.5 a põe no perfil **só se dono do perfil**, e o endpoint `GET /me/sequencia` é do próprio usuário (RNF-SEC-02).
- **Desafios:** são dados do próprio leitor, sem endpoint de perfil alheio, e fora do cliente web.
- **Recomendar livro para esta pessoa:** a recomendação parte só da página do livro, com o livro fixo (decisão do grupo). Nenhuma entrada de recomendar aqui.
- **Denunciar resenha a partir da prévia:** a denúncia de resenha entra pela página do livro e pela lista de resenhas; a prévia do perfil não ganha menu.

**Quando RN-08 não permite** (perfil privado sem seguimento aceito), **nada novo aparece**: nem estatísticas, nem listas, nem a quantidade de listas. O bloco de restrição continua ocupando o lugar do conteúdo, só com a frase atualizada.

**O que deixa de valer do prompt do Período 1:** as proibições de desenhar listas do leitor e estatísticas. Continuam proibidas a sequência diária, os desafios, a recomendação, os favoritos e as frases, e todas as outras regras daquele prompt, repetidas na seção 10.

**Os destinos das novas entradas são outras telas, já escritas em outros prompts.** Não desenhe a tela de destino dentro deste canvas:

| Entrada | Destino |
|---|---|
| `Ver todas`, na seção `Listas` | índice mobile `F-LST/listas-do-leitor.md`, no modo de outro leitor |
| Card de lista | lista `F-LST/lista.md`, no modo de terceiro (só leitura) |

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Perfil de outro leitor · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
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

## 3. O que permanece intocado

- **O shell inteiro**, exatamente como está no canvas: barra inferior do mobile e sidebar da web com o item da área de origem ativo, e a marca na sidebar do jeito que já aparece. Esta edição não mexe em navegação.
- **O header:** `ArrowLeft` e `Bell` no mobile, sem título; botão de retorno `Voltar` na web, sem título e sem sino.
- **O bloco de identidade** com avatar, nome, `@username`, chip de privacidade e biografia, em todos os estados.
- **O botão de relação** nos quatro estados (`Seguir`, `Seguindo`, `Solicitar para seguir`, `Solicitação enviada`) e a linha `Você vê este perfil porque Beatriz aceitou sua solicitação.`
- **Os contadores**, completos ou parciais conforme RN-08, e não acionáveis.
- **O bloco de restrição** de RN-08: `Lock`, `Este perfil é privado`, superfície neutra, sem tint de erro. Só a frase muda (seção 8).
- **O modal `Deixar de seguir`**, com o botão outline `rubi` e `Cancelar`. Só o texto do perfil privado muda (seção 8).
- **`Esta pessoa pediu para seguir você`** e **`Perfil não encontrado`**, exceto o que 4.1 acrescenta ao primeiro.
- **A seção `Estante`** e o **trecho das resenhas** em Newsreader, com capa, estrelas e truncamento em três linhas.
- **Toda a copy do Período 1** que não aparece na seção 8 como substituída.

---

## 4. Artboards que mudam

Os rótulos abaixo são os que já estão no canvas. Onde o mesmo rótulo existe no mobile e na web, a linha é indicada.

### 4.1 Elementos que entram no mobile quando RN-08 permite

Entram em `Público, não sigo`, `Público, sigo`, `Privado, sigo` e `Esta pessoa pediu para seguir você`, e na linha do modo escuro em `Mobile, público e sigo`. **Não entram** em `Privado, não sigo`, `Privado, solicitação enviada`, `Mobile, privado e não sigo`, `Confirmar deixar de seguir` (que só ganha a copy nova), `Carregando` (4.4) nem `Perfil não encontrado`.

Nos artboards existentes, que mostram o **topo da página**, o bloco novo começa logo abaixo dos contadores e é **cortado naturalmente pela barra inferior do shell**. O resto da página só se vê nos artboards `(rolada)` da seção 5.

**A. Bloco `Estatísticas do ano`** (RF-STA-01, design §5.5, "se perfil visível").

- `space-8` abaixo do divisor dos contadores.
- Cabeçalho de seção: título `Estatísticas do ano` em `title-lg` `tinta` à esquerda. **Sem ação à direita**: o painel completo é só do próprio leitor.
- `space-1` abaixo, em `caption` `grafite`: `2026, até hoje`.
- `space-3` abaixo, uma **faixa horizontal de três cards**, rolável na horizontal, gap `space-3`, começando no padding lateral `space-5` e sangrando pela borda direita, com o terceiro card cortado. Cada card:
  - Fundo `papel-elevado`, `radius` 12, padding `space-4`, `elev-0`, largura do conteúdo com mínimo de 136px, altura igual nos três.
  - Rótulo em `caption` `grafite`: `Livros concluídos`, `Páginas lidas`, `Tempo de leitura`.
  - `space-1` abaixo, número em `num-display` `tinta` e unidade em `body-strong` `grafite`, pela linha de base, `space-1` de gap.
- Valores de `Rafael Okamoto`: `14` `livros`, `4.920` `páginas`, `96` `h` `40` `min`. Valores de `Beatriz Nogueira`: `11` `livros`, `3.260` `páginas`, `58` `h` `15` `min`. Todos mock.
- **Os cards não são acionáveis.** Nada de gráfico, média, comparação com quem está olhando ("você leu 3 livros a menos"), ranking ou seta de tendência. Comparar leitores é ranking, e ranking está fora de escopo.
- **Perfil sem nenhum registro de progresso:** o bloco mostra só o título e, no lugar da faixa, a frase em `body` `grafite`: `Rafael ainda não registrou leituras em 2026.` Nenhum card com `0`.

**B. Resenhas: curtir e descurtir** (RF-AVA-05 e RF-AVA-08). Vale onde a seção `Resenhas` aparece.

- Em cada resenha da prévia, `space-3` abaixo do trecho, a **linha de reações**, no mesmo desenho da página do livro, alinhada à esquerda, `space-4` entre os dois botões:
  - Cada botão tem ícone de 20px e a contagem ao lado em `caption`, `space-2` de gap, padding `space-2 space-3`, `radius` 12, sem borda, fundo transparente, alvo de 48px de altura.
  - `ThumbsUp` com a contagem de curtidas; `ThumbsDown` com a de descurtidas.
  - Inativo: ícone `regular` `grafite`, texto `grafite`.
  - Ativo: ícone `fill` `musgo`, texto `musgo` peso 600. **Só um dos dois pode estar ativo** por resenha; tocar no outro troca a reação, tocar no ativo retira.
  - As duas contagens ficam sempre separadas, nunca como saldo nem percentual. Zero aparece como `0 descurtidas`.
- Reações nas resenhas de `Rafael Okamoto`: `Os Sertões` com `9 curtidas` e `0 descurtidas`, **curtida ativa**, porque quem olha já curtiu; `O Cortiço` com `5 curtidas` e `2 descurtidas`, nenhuma ativa.
- **Reagir não depende de seguir.** Em perfil público, quem não segue também reage, porque vê a resenha. Em perfil privado, só quem vê a resenha (seguidor aceito) chega aos botões.
- **Sem `DotsThree`, sem menu, sem `Denunciar` na prévia.** A denúncia de resenha mora na página do livro.
- Tocar no trecho continua abrindo a resenha, como no Período 1; os botões de reação são alvos separados.

**C. Seção `Listas`** (RF-LST-04). Última seção do mobile.

- `space-8` abaixo de `Resenhas`.
- Cabeçalho: título `Listas` em `title-lg` `tinta` e, à direita, `Ver todas` em botão textual `musgo` `caption`, que abre o índice de listas no modo de outro leitor.
- `space-3` abaixo, **as três listas atualizadas mais recentemente**, em coluna única, cada uma no **card de lista** do índice (`F-LST/listas-do-leitor.md`), sem mudança de desenho:
  - Linha sem fundo próprio, sem borda e sem sombra, `space-4` de padding vertical, divisor de 1px `linha` entre as linhas.
  - À esquerda, o **mosaico de capas** de 88 por 72px: as três primeiras capas, de 48 por 72px, canto vivo, sobrepostas em leque horizontal com 20px de deslocamento, a primeira na frente, contorno de 1px `papel` entre elas, sem rotação e sem sombra. Posição sem livro: retângulo vazio `papel-elevado` com borda de 1px `linha`.
  - `space-4` de gap, título em `title-sm` `tinta` (até duas linhas), descrição em `caption` `grafite` (até duas linhas, some quando não há) e, `space-1` abaixo, a contagem em `caption` `grafite`.
  - À direita, `CaretRight` (Phosphor, `regular`, 20px, `grafite`). A linha inteira abre a lista.
- Listas de `Rafael Okamoto`: `Para entender o Brasil` (`12 livros`, `Ensaios e romances que uso em sala de aula. A ordem é a que eu sugiro para ler.`), `Romances históricos` (`7 livros`, `Ficção que acerta a época.`) e `Não ficção para começar` (`2 livros`, sem descrição, mosaico com duas capas e um retângulo vazio).
- **Sem `Nova lista`.** Quem olha não cria lista no perfil de outra pessoa.
- **Leitor sem listas:** o cabeçalho fica **sem `Ver todas`**, e no lugar das linhas uma frase em `body` `grafite`, sem ícone e sem botão: `Beatriz ainda não criou listas.` Quem olha não pode agir, então não há convite.
- `space-8` antes da barra inferior, no fim da página.

### 4.2 `Privado, não sigo` e `Privado, solicitação enviada` (linha mobile)

- **Nada novo aparece.** Sem bloco de estatísticas, sem seção `Listas`, sem contagem de listas, **nem desfocado, nem em silhueta, nem atrás de uma camada**.
- Só a frase do bloco de restrição muda em `Privado, não sigo`: `Envie uma solicitação para ver a estante, as resenhas, as listas e as estatísticas de Beatriz.` A frase de `Privado, solicitação enviada` continua `Sua solicitação está aguardando resposta.`

### 4.3 `Confirmar deixar de seguir` (linha mobile) e `Público, sigo, com confirmação aberta` (linha web)

- O modal não muda de desenho. O texto para perfil privado passa a nomear o que se perde: `As atividades dela saem do seu feed, e você perde o acesso à estante, às resenhas, às listas e às estatísticas. Seguir de novo exige uma solicitação nova.`
- O texto para perfil público não muda.

### 4.4 `Carregando` (linhas mobile e web)

- Mobile: abaixo da linha de contadores em skeleton, `space-8`, uma barra de 24px e 50% de largura (o título `Estatísticas do ano`) e três retângulos `capa-placeholder` de `radius` 12, 136 por 88px, em faixa, o terceiro cortado pela borda. O resto do skeleton do Período 1 desce e é cortado pela barra inferior.
- Web: a faixa de abas real passa a ter três abas; na coluna esquerda, abaixo dos contadores, uma barra de 17px e 60% (o título do bloco) e três pares de barras no desenho dos contadores.
- Continua um único fade de entrada, sem shimmer, sem pulso, sem spinner. O skeleton não sabe ainda se o perfil é restrito: mostrar a forma do bloco e depois trocá-la pelo bloco de restrição é aceitável, porque o skeleton não contém dado nenhum.

### 4.5 Linha web: coluna de identidade e abas

Vale para `Público, não sigo`, `Público, sigo, com confirmação aberta` (sob o modal) e, na linha do modo escuro, `Web, público e não sigo`. **Não vale para `Privado, não sigo`**, em que a coluna direita continua sendo o bloco de restrição, sem abas, e a coluna esquerda não ganha estatísticas.

- **Bloco `Estatísticas do ano` na coluna esquerda de 300px**, `space-6` abaixo do último contador, depois de um divisor de 1px `linha`:
  - Título `Estatísticas do ano` em `title-sm` `tinta` e, `space-1` abaixo, `2026, até hoje` em `caption` `grafite`.
  - `space-3` abaixo, as três métricas **empilhadas**, no mesmo desenho dos contadores da coluna, não acionáveis: número em `num-inline` `tinta` à esquerda e rótulo em `body` `grafite` à direita, divisor de 1px `linha` entre elas: `14` `livros concluídos`; `4.920` `páginas lidas`; `96 h 40 min` `de leitura`.
  - **Sem `Ver estatísticas`.**
- **A faixa de abas ganha a terceira aba `Listas`**, depois de `Resenhas`, no mesmo desenho: `body-strong`, ativa em `musgo` com sublinhado de 2px `musgo`, inativas em `grafite`, hover com texto `tinta` sem sublinhado.
- Nos artboards existentes a aba ativa continua `Estante`.

### 4.6 Tratamento escuro dos elementos novos

Modo escuro é lock de página inteira. Superfície elevada fica **mais clara** que o fundo. Shadows com metade da opacidade.

- Cards de estatística em `noite-elevada`, rótulo e unidade em `grafite-claro`, número em `papel-suave`.
- Reações inativas em `grafite-claro`; ativas em `fill` `musgo-claro` com texto `musgo-claro`. Hover da web com fundo `linha-noite`.
- Card de lista: título `papel-suave`, descrição e contagem `grafite-claro`, contorno entre as capas em `noite`, retângulo vazio `noite-elevada` com borda `linha-noite`, divisores `linha-noite`, `CaretRight` em `grafite-claro`.
- `Ver todas` em `musgo-claro`.
- Web: aba `Listas` inativa em `grafite-claro`, ativa em `musgo-claro` com sublinhado `musgo-claro`.

---

## 5. Artboards novos

### Linha 1, mobile, no fim da linha, nesta ordem

#### 5.1 `Perfil de outro leitor · Estatísticas e estante (rolada)`

- Perfil de `Rafael Okamoto`, público, que quem olha segue (`Seguindo`). Página rolada até que o divisor dos contadores fique logo abaixo do header.
- De cima para baixo: o bloco `Estatísticas do ano` inteiro (4.1 A), com `Tempo de leitura` cortado pela borda direita; `space-8`; a seção `Estante` com a faixa de seis capas; `space-8`; o título da seção `Resenhas` e o começo da primeira resenha, cortados pela barra inferior.
- Barra inferior com **Feed** ativo, a área de onde se chegou ao perfil.

#### 5.2 `Perfil de outro leitor · Resenhas e listas (rolada)`

- Mesmo perfil, rolado até a seção `Resenhas`.
- De cima para baixo: as duas resenhas com a linha de reações (4.1 B), `Os Sertões` com a curtida ativa; `space-8`; a seção `Listas` (4.1 C) com as três listas do Rafael e `Ver todas`; `space-8` antes da barra inferior.
- É o fim da página. **Sem `Nova lista`**, sem recomendar, sem menu de resenha.
- Barra inferior com **Feed** ativo.

#### 5.3 `Perfil de outro leitor · Privado, sigo, sem listas (rolada)`

- Perfil de `Beatriz Nogueira`, privado, que aceitou quem olha. Página rolada até o fim.
- De cima para baixo: o fim da seção `Resenhas`, com a linha de reações na última resenha, nenhuma ativa; `space-8`; a seção `Listas` no estado sem listas (4.1 C), com `Beatriz ainda não criou listas.` e sem `Ver todas`; `space-8` antes da barra inferior.
- Serve para conferir que seguidor aceito de perfil privado vê listas e reage, e que o vazio de terceiro não convida a nada.

### Linha 2, web, no fim da linha, nesta ordem

#### 5.4 `Perfil de outro leitor · Público, sigo, aba Listas`

O desenho da aba vem do canvas do índice de listas (`F-LST/listas-do-leitor.md`, artboard `Listas do leitor · Perfil de outro leitor, aba Listas, com hover`). Reproduza-o aqui sem mudar nada:

- Sidebar com **Feed** ativo. Header de conteúdo com `ArrowLeft` e `Voltar`.
- Coluna esquerda de `Rafael Okamoto` com o botão secundário `Seguindo` (com `Check` `musgo`), os contadores e o bloco `Estatísticas do ano` de 4.5.
- Coluna direita com a faixa de abas `Estante`, `Resenhas`, `Listas`, **`Listas` ativa**. Abaixo, `space-6`:
  - Linha de topo só com a contagem `3 listas` em `caption` `grafite`. **Sem `Nova lista`** e sem linha de visibilidade, que é do dono. O nome já está na coluna esquerda, então `Listas de Rafael Okamoto` não se repete.
  - `space-5` abaixo, **grid de cards de lista em três colunas**, gap `space-5`: mosaico com capas de 80 por 120px deslocadas 32px, ocupando 144 por 120px; `space-4`; título em `title-sm` `tinta`; descrição em `caption` `grafite`; contagem em `caption` `grafite`. Padding `space-4`, `radius` 12, fundo transparente, sem borda.
  - Uma fileira com `Para entender o Brasil`, `Romances históricos` e `Não ficção para começar`. O cursor sobre `Romances históricos`: fundo `papel-elevado` e título em `musgo`, `dur-fast`.

#### 5.5 `Perfil de outro leitor · Público, sigo, aba Resenhas`

- Mesmo perfil, com a aba `Resenhas` ativa.
- Coluna direita: a lista de resenhas em coluna única de no máximo 720px, capa de 60 por 90px à esquerda e texto em Newsreader à direita, separadas por divisor de 1px `linha`, como no Período 1, e cada uma com a linha de reações de 4.1 B no rodapé.
- `Os Sertões` com a curtida ativa. O cursor sobre o `ThumbsDown` de `O Cortiço`: fundo `linha`, `dur-fast`, sem mudar o estado.
- **Abaixo de 768px:** as duas colunas viram uma, as três abas viram as seções empilhadas do mobile (estatísticas, estante, resenhas com reações e listas com `Ver todas`), e a sidebar dá lugar à barra inferior.

### Linha 3, modo escuro, no fim da linha

#### 5.6 `Perfil de outro leitor · Resenhas e listas (rolada), modo escuro`

- O artboard 5.2 no modo escuro, com o tratamento de 4.6. Serve para conferir no escuro a curtida ativa em `musgo-claro` e o mosaico das listas.

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards do Período 1 continuam, com as mudanças da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Padrão de perfil com estatísticas do ano "se perfil visível" | documento-de-design §5.5 |
| Linha de reações da resenha (dois botões com contagem, um ativo por vez) | nasceu na edição `pagina-do-livro/pagina-do-livro.md`; incorporação pendente |
| Card de lista e mosaico de capas em leque, aba `Listas` da web | nasceram em `F-LST/listas-do-leitor.md`; incorporação pendente |
| Card de estatística do bloco do perfil e bloco empilhado na coluna da web | nasceram na edição `meu-perfil/meu-perfil.md`; incorporação pendente |
| Bloco de restrição de RN-08 | nasceu em `periodo-1/F-PERFIL/perfil-de-outro-leitor.md`; incorporação pendente |
| Ícone `fill` só para estado ativo | documento-de-design §6 |
| Botão textual e secundário | documento-de-design §4.1 |
| Capa em canto vivo e placeholder | documento-de-design §4.5 e §7.6 |

**Nasce aqui** e vira pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Bloco de estatísticas de terceiro**, sem ação de painel, e a frase de ausência de registro no ano (`Rafael ainda não registrou leituras em 2026.`).
2. **Vazio de seção de terceiro em uma linha**, sem ícone e sem convite (`Beatriz ainda não criou listas.`), que já existia no índice de listas e passa a valer dentro do perfil.

**Decisões deste prompt a ratificar pelo dono das features:**

- Sem denúncia de resenha na prévia do perfil (a denúncia entra pela página do livro).
- Reação disponível para quem não segue perfil público.
- Ordem das seções no mobile (estatísticas, estante, resenhas, listas), alinhada ao Meu perfil.
- A frase de restrição e o texto do modal passam a nomear listas e estatísticas, e ficaram mais longos.

**Conflitos a levar ao grupo:**

- **Campos do DTO público de estatísticas.** O `feature-F-STA.md` diz que `GET /perfis/{usuarioId}/estatisticas` "pode omitir métricas privadas" e deixa os campos para a implementação. O desenho mostra os três totais do ano, inclusive o tempo de leitura; se o grupo decidir que o tempo é privado, o card sai e a faixa fica com dois.
- **Reações na prévia do perfil:** o endpoint que serve as resenhas do perfil precisa trazer as contagens e a reação de quem olha (RF-AVA-08 fala em "adição compatível" ao endpoint do perfil). Falha ao reagir por limite de frequência volta o estado anterior com mensagem, mas o formato da mensagem (toast ou inline) continua sem definição no design, como na página do livro.
- **Listas no perfil:** a seção pede as três mais recentes com as três primeiras capas de cada uma, que é o mesmo recorte do índice com página de três itens; `GET /perfis/{usuarioId}/listas` precisa devolver a contagem de livros e as capas.

---

## 8. Copy nova ou alterada

| Onde | Antes (P1) | Agora |
|---|---|---|
| Título do bloco | não existia | `Estatísticas do ano` |
| Período do bloco | não existia | `2026, até hoje` |
| Rótulos dos cards | não existia | `Livros concluídos`, `Páginas lidas`, `Tempo de leitura` |
| Valores, Rafael | não existia | `14 livros`, `4.920 páginas`, `96 h 40 min` |
| Valores, Beatriz | não existia | `11 livros`, `3.260 páginas`, `58 h 15 min` |
| Web, métricas empilhadas | não existia | `14` `livros concluídos`, `4.920` `páginas lidas`, `96 h 40 min` `de leitura` |
| Estatísticas sem registro no ano | não existia | `Rafael ainda não registrou leituras em 2026.` |
| Estatísticas, falha | não existia | `Não foi possível carregar as estatísticas de Rafael. Verifique sua conexão e tente de novo.` |
| Reações | não existia | `9 curtidas`, `0 descurtidas`, `5 curtidas`, `2 descurtidas` |
| Rótulo acessível das reações | não existia | `Curtir resenha` / `Descurtir resenha` |
| Falha ao reagir | não existia | `Não foi possível registrar sua reação. Tente de novo em alguns instantes.` |
| Título da seção | não existia | `Listas` |
| Ação da seção | não existia | `Ver todas` |
| Listas, Rafael | não existia | `Para entender o Brasil`, `12 livros`; `Romances históricos`, `7 livros`; `Não ficção para começar`, `2 livros` |
| Descrições das listas | não existia | `Ensaios e romances que uso em sala de aula. A ordem é a que eu sugiro para ler.`; `Ficção que acerta a época.` |
| Listas, vazio de terceiro | não existia | `Beatriz ainda não criou listas.` |
| Listas, falha | não existia | `Não foi possível carregar as listas de Rafael. Verifique sua conexão e tente de novo.` |
| Web, abas | `Estante` e `Resenhas` | `Estante`, `Resenhas` e `Listas` |
| Web, aba Listas | não existia | `3 listas` |
| Restrição, texto | `Envie uma solicitação para ver a estante e as resenhas de Beatriz.` | `Envie uma solicitação para ver a estante, as resenhas, as listas e as estatísticas de Beatriz.` |
| Modal, texto para perfil privado | `As atividades dela saem do seu feed, e você perde o acesso à estante e às resenhas. Seguir de novo exige uma solicitação nova.` | `As atividades dela saem do seu feed, e você perde o acesso à estante, às resenhas, às listas e às estatísticas. Seguir de novo exige uma solicitação nova.` |

As mensagens de falha de bloco e de reação não têm artboard próprio: o bloco que falha mostra o banner inline do Meu perfil (`rubi-fundo`, `Warning`, texto e `Tentar de novo`) no lugar do seu conteúdo, e o resto da página continua carregado.

Zero em-dash, zero emoji. Todo número tem unidade.

---

## 9. Acessibilidade e interação do que muda

- **Estatísticas:** a faixa é uma lista rolável com rótulo `Estatísticas de Rafael em 2026`; cada card é lido como `Livros concluídos: 14 livros`. Não recebe foco como botão, porque não é acionável.
- **Reações:** cada botão com `aria-pressed` e rótulo `Curtir resenha` ou `Descurtir resenha`, seguido da contagem. O estado ativo muda o peso do ícone (`regular` para `fill`), não só a cor. Alvo de 48px no mobile. A troca é otimista; se o servidor recusar (limite de frequência ou perda de acesso por RN-08), a reação volta ao estado anterior e a mensagem da seção 8 é anunciada. A escrita é idempotente: tocar duas vezes não cria duas curtidas.
- **Listas:** cada linha é um botão, lido como `Para entender o Brasil, 12 livros. Ensaios e romances que uso em sala de aula. Abrir lista.` O mosaico é decorativo para leitor de tela. `Ver todas` com alvo de 48px.
- **Restrição:** continua anunciada como informação, não como erro, e agora nomeia listas e estatísticas.
- **Web:** a terceira aba segue o padrão de abas: setas trocam de aba, `Tab` entra no conteúdo, a troca move o foco para o conteúdo da aba. Foco visível com contorno de 2px `musgo` e offset de 2px na aba `Listas`, em cada card de lista e em cada botão de reação. Ordem de tabulação: sidebar, retorno, coluna de identidade (as estatísticas não recebem foco), abas, conteúdo.
- Contraste: rótulos, contagens e descrições em `grafite`, nunca em `grafite-suave`.
- `prefers-reduced-motion`: a troca de reação vira instantânea; o hover do card de lista e o fade do skeleton viram estáticos.
- Nenhuma ação nova é destrutiva. Deixar de seguir continua passando pelo modal.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Header, identidade, botão de relação, contadores, bloco de restrição, modal, estante, trecho das resenhas, perfil não encontrado e shell ficam como estão.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe as telas de destino** (índice de listas, lista) dentro deste canvas.

**RN-08, a regra dura desta tela**

- **Não mostre estatísticas nem listas de perfil privado a quem não é seguidor aceito**, de forma nenhuma: nada de cards desfocados, contagem de listas, mosaico em silhueta, "3 listas" em cinza nem "prévia" atrás de camada. Borrar é exibir.
- Não trate perfil privado como erro. Sem `rubi`, sem banner, sem código de status.
- Não distinga perfil inexistente de perfil indisponível.
- Não desenhe a lista de seguidores ou de seguidos deste leitor, e não torne os contadores acionáveis.
- Não sugira outros perfis.

**Específico do perfil de outro leitor no Período 2**

- **Não desenhe sequência diária nem desafios deste leitor.** Os dois são só do dono.
- **Não desenhe `Ver estatísticas`** nem qualquer caminho para o painel completo de outra pessoa.
- **Não compare** as estatísticas do visitado com as de quem olha, e não desenhe ranking, posição ou "leu mais que você".
- Não desenhe gráfico, média ou tendência no bloco de estatísticas.
- **Não desenhe `Nova lista`**, editar lista, reordenar ou excluir lista no perfil de outra pessoa.
- **Não desenhe recomendar livro para esta pessoa.** A recomendação parte da página do livro.
- Não desenhe menu `DotsThree`, `Denunciar` nem denunciar perfil na prévia das resenhas.
- Não deixe as duas reações ativas ao mesmo tempo, e não mostre curtidas e descurtidas como saldo, percentual ou barra.
- Não desenhe favoritos nem frases deste leitor.

**Específico da relação (continua valendo do Período 1)**

- Não desfaça o seguimento sem confirmação. `Seguindo` abre o modal, sempre.
- Não troque o rótulo `Seguindo` por `Deixar de seguir` no hover ou no press.
- Não desenhe botão de cancelar solicitação.
- Não desenhe bloquear, silenciar nem mensagem direta.
- Não peça confirmação para seguir.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais: corpo da resenha, frases e trechos, sinopse. Estatísticas, reações e listas são Manrope e JetBrains Mono.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão, em texto de título ou no card de estatística.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.
- Nada de animação de coração, polegar pulsando, confete ou partícula ao reagir.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado, nem no mosaico das listas.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.

**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de desfazer em ação destrutiva pesada.

**Métricas e dados**

- Nada de número exibido sem unidade: `14 livros`, `4.920 páginas`, `96 h 40 min`, `9 curtidas`.
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".
- Nada de gráfico no perfil, e nenhum gráfico em roxo ou teal de IA.
- Nada de repetir o símbolo de percentual quando o contexto já é percentual.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de dados.
- Nada de três colunas de features iguais com três ícones e três títulos. As estatísticas da web são linhas empilhadas.
- Nada de bento grid decorativo.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. As reações aparecem sempre, não só no hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
