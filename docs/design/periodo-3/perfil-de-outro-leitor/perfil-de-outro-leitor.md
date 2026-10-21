# Perfil de outro leitor (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Perfil de outro leitor`, gerado por `docs/design/periodo-1/F-PERFIL/perfil-de-outro-leitor.md` e editado por `docs/design/periodo-2/perfil-de-outro-leitor/perfil-de-outro-leitor.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/perfil-de-outro-leitor/perfil-de-outro-leitor.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-STA-OPC.md, ../../../plano-de-desenvolvimento/periodo-3/feature-F-MOD-OPC.md
**Requisitos que entram:**
- F-STA-OPC: RF-STA-04 (a distribuição das notas que o leitor visitado deu, dentro do bloco `Estatísticas do ano`, sob RN-08, pelo endpoint público de estatísticas)
- F-MOD-OPC: RF-MOD-04 (o administrador suspende e reativa a conta a partir do perfil do leitor, com confirmação e motivo; a conta suspensa fica oculta para os outros leitores, com os dados preservados)

**Não funcionais:** RNF-SEC-03 (RN-08 revalidada no servidor também na distribuição), RNF-SEC-04 (suspender e reativar restritos ao administrador, verificados no servidor), RNF-USA-04 (confirmação explícita), RNF-USA-03, RNF-USA-05, RNF-ERR-09 (cold start na ação do administrador é espera, não erro)
**Regras de negócio:** RN-06 (onze notas de 0 a 5; distribuição ausente aparece como ausente), RN-08 (perfil privado só para seguidor aceito, agora também na distribuição)
**Versão web:** sim. RF-STA-04 e RF-MOD-04 têm marcação na coluna Web de `REQUISITOS.md`. A ação do administrador **só existe na web**: o painel de moderação é do cliente web, e o mobile não ganha ação de moderação.

---

## 1. O que muda e por quê

Duas features do Período 3 depositam coisas aqui, e entram juntas nesta edição.

| O que entra | Onde | Plataforma | Feature |
|---|---|---|---|
| Gráfico `Notas dadas em 2026` dentro do bloco `Estatísticas do ano`, só quando RN-08 permite | Mobile: card logo abaixo da faixa dos três totais. Web: na coluna de identidade, abaixo das três métricas empilhadas | mobile e web | F-STA-OPC |
| `DotsThree` de ações de moderação no header de conteúdo, só para o administrador | Web, à direita do header de conteúdo | web | F-MOD-OPC |
| Dialog `Suspender conta`, com motivo obrigatório, e os estados de espera, falha e sucesso | Sobre o perfil | web | F-MOD-OPC |
| Visão do administrador de uma conta suspensa, com `Reativar conta` e o dialog de reativação | O próprio perfil, trocado | web | F-MOD-OPC |
| Conta suspensa vista por qualquer outro leitor | O artboard `Perfil não encontrado`, **sem mudança nenhuma** | mobile e web | F-MOD-OPC |

**Decisões já tomadas, não rediscutir:**

- **A distribuição aparece no perfil alheio**, respeitando RN-08: perfil público para todos, privado só para seguidor aceito. Quando RN-08 não permite, nada aparece, como as outras estatísticas.
- **Formato: contagem.** Cada coluna tem, logo acima, o número de livros com aquela nota. Sem percentual.
- **O recorte é o do bloco**: o ano corrente, `2026, até hoje`, como os três totais ao lado. O painel completo, com os outros anos, continua só do próprio leitor.
- **Conta suspensa, para quem não é administrador, é `Perfil não encontrado`.** A regra do Período 1 de não distinguir perfil inexistente de perfil indisponível já cobre a suspensão: contar a um terceiro que a conta foi suspensa expõe o que aconteceu com ela. Nenhum artboard novo para isso.
- **O dialog de suspensão definido aqui é o mesmo que a edição do painel de moderação vai reaproveitar.** Escreva-o como componente: título, consequência, campo de motivo, botões e estados.

**O que deixa de valer do prompt anterior:** a proibição de desenhar gráfico no bloco de estatísticas do perfil, **só para a distribuição das notas**. Continuam proibidos média, tendência, comparação com quem olha, ranking, `Ver estatísticas` e todas as outras regras, repetidas na seção 10.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard com o **rótulo acima**, no formato `Perfil de outro leitor · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
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

GRÁFICOS
Gráfico usa musgo como cor principal, broto como secundária e grafite como
neutra, com no máximo três séries por gráfico. Nesta tela há um gráfico só,
de UMA série, em musgo (musgo-claro no escuro). Contraste da coluna contra o
fundo: musgo sobre papel-elevado 6,15:1; musgo-claro sobre noite-elevada
7,21:1. broto sobre papel fica em 2,5:1, abaixo do mínimo de 3:1 para marca
gráfica, e por isso não pinta coluna nesta tela.

SCRIM DE DIALOG
Camada sobre a tela atrás de um dialog: tinta a 40% no claro, noite a 60% no
escuro. Nunca preto puro.

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

- **O shell inteiro** para quem não é administrador, com o item da área de origem ativo.
- **O header** (`ArrowLeft` e `Bell` no mobile, sem título; `Voltar` na web, sem título e sem sino). Para o administrador, a web ganha só o `DotsThree` à direita (4.3).
- **O bloco de identidade, o botão de relação, os contadores, o bloco de restrição, o modal `Deixar de seguir`, `Esta pessoa pediu para seguir você`** e **`Perfil não encontrado`**, em todos os artboards.
- **Os três totais do bloco `Estatísticas do ano`**, a faixa de cards no mobile e as métricas empilhadas na web.
- **As seções `Estante`, `Resenhas` (com as reações) e `Listas`**, e as abas da web.
- **Toda a copy dos Períodos 1 e 2** que não aparece na seção 8.

### Dados novos

**Notas dadas em 2026** (mock; a soma das colunas é o total de notas):

| Nota | Rafael Okamoto (público) | Beatriz Nogueira (privado) | Sérgio Valadares (público) |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 0,5 | 0 | 0 | 1 |
| 1 | 0 | 0 | 1 |
| 1,5 | 0 | 0 | 1 |
| 2 | 1 | 0 | 2 |
| 2,5 | 0 | 0 | 0 |
| 3 | 1 | 1 | 2 |
| 3,5 | 1 | 1 | 0 |
| 4 | 4 | 2 | 1 |
| 4,5 | 2 | 3 | 0 |
| 5 | 3 | 2 | 1 |
| **Total** | **12 notas** | **9 notas** | **9 notas** |

**Conta usada nos artboards do administrador:** `Sérgio Valadares` (`@svaladares`), perfil público, o autor do comentário denunciado no painel de moderação (`Ataque pessoal ao autor da resenha e a quem comentou.`). Biografia: `Engenheiro aposentado. Romance policial, história militar e opinião sobre tudo.` Contadores: `46 livros lidos`, `89 seguidores`, `40 seguindo`. Estatísticas de 2026: `9 livros`, `2.870 páginas`, `41 h 10 min`. O administrador não segue Sérgio. Hoje é **11 de outubro de 2026**.

**Motivo da suspensão** (mock, escrito pelo administrador): `Ataques pessoais repetidos em comentários, com três denúncias procedentes em setembro.` (86 caracteres). **Motivo da reativação** só aparece digitado como exemplo na descrição do campo, nunca em artboard.

---

## 4. Artboards que mudam

### 4.1 O gráfico `Notas dadas em 2026`, mobile

Entra onde o bloco `Estatísticas do ano` aparece com os três cards. **Não entra** onde RN-08 não permite.

- `space-4` abaixo da faixa dos três cards, um **card** `papel-elevado`, `radius` 12, padding `space-4`, `elev-0`, margem lateral `space-5`, largura total (não rola na horizontal como a faixa de cima).
- Título em `body-strong` `tinta`: `Notas dadas em 2026`. Na mesma linha, à direita, em `caption` `grafite`: `12 notas`.
- `space-3` abaixo, a **área do gráfico**, 112px de altura:
  - **Onze faixas** de largura igual, na ordem da escala, de `0` a `5`. Em cada uma, a coluna de 14px no centro, cor `musgo`, ponta com raio de 4px, base reta, todas na mesma linha de base de 1px `linha`. A coluna mais alta ocupa 80px; as outras são proporcionais. Sem eixo Y, sem grade, sem contorno, sem sombra.
  - **Contagem sobre cada coluna**, em `caption` peso 600 `tinta`, numeral tabular, `space-1` acima da ponta. Nota sem livros: sem coluna, e o `0` em `caption` `grafite` apoiado sobre a linha de base.
  - **Eixo X** abaixo da linha de base, em `caption` `grafite`, numeral tabular: `0`, `0,5`, `1`, `1,5`, `2`, `2,5`, `3`, `3,5`, `4`, `4,5`, `5`.
- `space-2` abaixo, em `caption` `grafite`: `Nota em estrelas. Sobre cada coluna, o número de livros.`
- **O gráfico não é acionável**, como os cards de cima: sem balão, sem faixa de toque, sem `Ver como tabela`. Todos os números já estão escritos.
- **Leitor visitado sem nenhuma nota no ano:** o card fica só com o título e, no lugar da área, em `body` `grafite`: `Rafael não deu notas em 2026.` Sem onze zeros.
- **Leitor sem nenhum registro de progresso no ano** (a frase `Rafael ainda não registrou leituras em 2026.` do Período 2): o card de notas continua aparecendo se houver nota, porque nota não depende de progresso; sem nota, aparece a frase acima.

**Artboard que muda:** `Perfil de outro leitor · Estatísticas e estante (rolada)`. A página continua rolada até o divisor dos contadores. De cima para baixo, agora: o bloco `Estatísticas do ano` com a faixa dos três cards e, abaixo, o card `Notas dadas em 2026` do Rafael completo, com `12 notas`: colunas em `2` (1), `3` (1), `3,5` (1), `4` (4, a mais alta), `4,5` (2) e `5` (3); `0`, `0,5`, `1`, `1,5` e `2,5` sem coluna e com o `0`. `space-8`; a seção `Estante` com a faixa de capas, cortada pela barra inferior. O título `Resenhas` sai do recorte.

**Artboards que não mudam no mobile:** os que mostram o **topo da página** (`Público, não sigo`, `Público, sigo`, `Privado, sigo`, `Esta pessoa pediu para seguir você`) já tinham o bloco cortado pela barra inferior logo abaixo da faixa dos cards; o card novo fica fora do recorte. Os de perfil privado sem seguimento, `Carregando` e `Perfil não encontrado` também não mudam.

### 4.2 O gráfico `Notas dadas em 2026`, web

Na coluna de identidade de 300px, abaixo das três métricas empilhadas de `Estatísticas do ano`:

- `space-5` abaixo da última métrica, título em `body-strong` `tinta`: `Notas dadas em 2026`; à direita, `12 notas` em `caption` `grafite`.
- `space-3` abaixo, a área do gráfico com 96px de altura, sem card (a coluna já é a superfície `papel`): onze faixas de cerca de 27px, colunas de 12px em `musgo`, a mais alta com 64px, contagem sobre cada coluna, `0` apoiado onde não há livros, linha de base de 1px `linha`, eixo X com as onze notas em `caption` `grafite`.
- `space-2` abaixo, a legenda `Nota em estrelas. Sobre cada coluna, o número de livros.` em `caption` `grafite`.
- Não acionável, sem foco de teclado, como as métricas de cima.
- **A coluna de identidade fica mais alta que a viewport.** Ela deixa de ser fixa e passa a rolar com a página quando não cabe; nos artboards, o gráfico aparece cortado pela borda inferior quando não couber inteiro.

**Artboards que mudam na web:** `Público, não sigo`, `Público, sigo, com confirmação aberta` (sob o modal), `Público, sigo, aba Listas` e `Público, sigo, aba Resenhas`, todos com o gráfico do Rafael abaixo das métricas. Na linha do modo escuro, `Web, público e não sigo` muda igual, com o tratamento de 4.6. `Privado, não sigo` não muda.

### 4.3 Header de conteúdo da web, para o administrador

Só quando quem olha é a conta de administrador, e só num perfil que não é o dele:

- À direita do header de conteúdo, alinhado ao `Voltar`, um botão de ícone `DotsThree` (Phosphor, `regular`, 20px, `grafite`), 40 por 40px, `radius` 12, sem borda, fundo transparente, hover com fundo `linha`, `dur-fast`. Rótulo acessível `Ações de moderação`.
- A sidebar do administrador tem o **quinto item `Moderação`** (`ShieldCheck`), depois de um divisor de 1px `linha` abaixo de `Perfil`, como no painel de moderação. Nos artboards do administrador o item ativo é **`Moderação`**, porque ele chegou ao perfil a partir do painel.
- Para qualquer outra conta, nada muda: sem `DotsThree`, sem quinto item. Nenhum artboard existente ganha o botão.
- **Abaixo de 768px** o `DotsThree` continua à direita do header, que passa a ter `ArrowLeft` à esquerda. **No app mobile não existe**: a moderação é do cliente web.

### 4.4 O que um leitor vê de uma conta suspensa

**Nada muda no canvas.** Quem não é administrador e abre o perfil de uma conta suspensa, por link, menção ou busca, cai no artboard existente `Perfil não encontrado`, com o mesmo ícone, a mesma frase e o mesmo `Buscar leitor`. O que vale para o perfil vale para tudo da conta, mas as outras telas não estão neste canvas.

### 4.5 Carregando

Não muda. O skeleton do bloco já tem a forma dos três cards; o card de notas fica abaixo do recorte no mobile, e na web a coluna de identidade em skeleton não chega até ele.

### 4.6 Tratamento escuro dos elementos novos

- Card de notas no mobile em `noite-elevada`, **mais claro** que o fundo; na web, o gráfico fica direto sobre `noite`.
- Colunas em `musgo-claro`; contagens e título em `papel-suave`; `0`, eixo X, legenda e `12 notas` em `grafite-claro`; linha de base em `linha-noite`.
- `DotsThree` em `grafite-claro`, hover com fundo `linha-noite`.
- Dialog em `noite-elevada` sobre o scrim de `noite` a 60%, título em `papel-suave`, texto em `grafite-claro`, campo com fundo `noite` e borda `linha-noite`, destrutivo em outline `rubi-claro`.
- Faixa informativa da conta suspensa em `musgo-fundo-escuro` com texto `papel-suave` e ícone `musgo-claro`; etiqueta `Conta suspensa` com borda `linha-noite` e texto `grafite-claro`.

---

## 5. Artboards novos

### 5.0 Componentes do administrador, descritos uma vez

**Menu de ações de moderação.** Abre ancorado abaixo do `DotsThree`, alinhado pela direita, `space-1` abaixo: 240px de largura, fundo `papel`, borda de 1px `linha`, `radius` 12, `elev-2`, padding `space-1`. **Um item só:** 44px de altura, `radius` 12 (raio interno de `radius-sm`), padding lateral `space-3`, `Prohibit` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, `Suspender conta` em `body-strong` `rubi`. Hover com fundo `rubi-fundo`. Fecha com `Esc`, clique fora ou escolha.

**Dialog de suspensão** (design §4.11), **componente reaproveitado pela edição do painel de moderação.** 480px de largura, `radius-xl`, fundo `papel`, padding `space-6`, `elev-3`, centrado na viewport, sobre o scrim de `tinta` a 40%.

1. Título em `title-sm` `tinta`: `Suspender a conta de Sérgio Valadares?`
2. `space-3` abaixo, a consequência em `body` `grafite`: `Sérgio deixa de conseguir entrar no Lê Ai, e o perfil, as resenhas, as atividades, os comentários e as listas dele ficam ocultos para os outros leitores. Nada é apagado, e a conta pode ser reativada depois.`
3. `space-5` abaixo, o **campo de motivo**, obrigatório:
   - Label `Motivo da suspensão` em `label` `grafite`, `space-2` acima do campo.
   - Área de texto de 96px de altura mínima, que cresce até 160px e depois rola por dentro, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, padding `space-3`, texto em `body` `tinta`. Placeholder em `grafite-suave`: `Por exemplo: ataques pessoais repetidos em comentários.`
   - Foco: borda de 1.5px `musgo`.
   - `space-2` abaixo, na mesma linha: helper à esquerda em `caption` `grafite`, `Fica no registro de auditoria. Sérgio não vê este texto.`, e o contador à direita em `caption` `grafite` com numeral tabular, `0 de 500`. Acima de 500, o contador e a borda ficam `rubi` e o helper dá lugar a `Use até 500 caracteres.` em `caption` `rubi`.
4. `space-6` abaixo, botões **lado a lado, alinhados à direita**, `space-3` entre eles:
   - `Cancelar`, botão textual `grafite`.
   - **Destrutivo em outline `rubi`**, 40px, `radius` 12, `Prohibit` (20px, `rubi`) à esquerda: `Suspender conta`. Hover com fundo `rubi-fundo`, `dur-fast`. **Desabilitado enquanto o motivo está vazio ou só com espaços**: 40% de opacidade, sem hover, cursor padrão. Nunca preenchido.
5. **O foco entra no campo de motivo**, porque sem ele não há o que confirmar. `Esc` e `Cancelar` fecham sem suspender e sem guardar o texto.

**Estados do dialog:**

- **Suspendendo:** o destrutivo mostra `Suspendendo conta`, no mesmo outline, sem spinner e sem esmaecer; `Cancelar` e o campo ficam desabilitados (texto `grafite-suave`, campo sem foco). Depois de três segundos, acima dos botões, alinhado à direita, em `caption` `grafite`: `O serviço está iniciando. Isso pode levar alguns segundos.` Não há estado otimista: a página só muda quando o serviço confirma.
- **Suspensão não confirmada:** o dialog continua aberto, o motivo continua digitado e os botões voltam a habilitar. Entre o título e a consequência, `space-3` acima e abaixo, o banner inline de largura total: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`), texto em `body` `tinta`: `A suspensão não foi confirmada a tempo. A conta continua ativa. Tente de novo: se a suspensão já tiver acontecido, ela não é aplicada duas vezes.`
- **Suspensa:** o dialog fecha, a página vira a visão da conta suspensa (5.5) e aparece o **toast** no canto inferior esquerdo da área de conteúdo, `space-8` das bordas, 400px: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, barra lateral de 4px `musgo`, `Prohibit` (20px, `musgo`), texto em `body` `tinta`: `Conta de Sérgio Valadares suspensa. O perfil e o conteúdo ficaram ocultos para os leitores.`, e `X` (20px, `grafite`) com rótulo acessível `Fechar aviso`.

**Dialog de reativação**, mesmo desenho, com três diferenças: título `Reativar a conta de Sérgio Valadares?`; consequência `Sérgio volta a conseguir entrar, e o perfil e o conteúdo dele voltam a aparecer para os leitores, conforme a privacidade do perfil.`; label `Motivo da reativação`, placeholder `Por exemplo: suspensão revista depois de nova análise.`; e o botão de confirmar é **primário pill `musgo`**, 40px, texto `papel`, com `ArrowCounterClockwise` (20px) à esquerda: `Reativar conta` (reativar não é destrutivo). Desabilitado com motivo vazio, a 40% de opacidade. Espera: `Reativando conta`. Falha: `A reativação não foi confirmada a tempo. A conta continua suspensa. Tente de novo: se a reativação já tiver acontecido, ela não é aplicada duas vezes.` Sucesso: o perfil volta ao desenho normal e o toast diz `Conta de Sérgio Valadares reativada.`, com `ArrowCounterClockwise` em `musgo`.

**Visão do administrador de uma conta suspensa.** O perfil de uma conta suspensa, aberto pelo administrador, não mostra conteúdo: os dados do leitor continuam guardados, mas a página do administrador não é um caminho para lê-los.

- **Coluna de identidade:** avatar, nome, `@svaladares` e chip de privacidade como sempre. `space-3` abaixo do chip, a **etiqueta de estado** `Conta suspensa`: pill de 24px, `radius-full`, padding horizontal `space-3`, borda de 1px `linha`, fundo transparente, `Prohibit` (16px, `grafite`) e texto em `label` `grafite`, o mesmo desenho da etiqueta de tipo do painel. Sem biografia, sem contadores, sem estatísticas. No lugar do botão de relação, o botão **secundário** `Reativar conta` (40px, largura total da coluna, `radius` 12, borda de 1px `linha`, texto `tinta`, `ArrowCounterClockwise` 20px `musgo`), que abre o dialog de reativação.
- **Coluna direita, sem abas:** a **faixa informativa neutra** (design §4.15): fundo `musgo-fundo`, `radius` 12, padding `space-4`, `Info` (Phosphor, `regular`, 20px, `musgo`), texto em `body` `tinta`: `Conta suspensa em 11 de outubro de 2026, às 14:32. Sérgio não consegue entrar, e o perfil e o conteúdo dele estão ocultos para os leitores. Nada foi apagado.`
  - `space-6` abaixo, título `Motivo registrado` em `title-sm` `tinta`; `space-3` abaixo, o motivo em bloco com borda esquerda de 2px `linha`, padding esquerdo `space-4`, `body-lg` Manrope `tinta`.
  - `space-4` abaixo, botão textual `musgo` com `CaretRight` (16px) à direita: `Ver no registro de auditoria`, que abre o painel na aba `Registro de auditoria`.
- **Sem `DotsThree`** no header: a única ação é reativar, e ela está na coluna.
- **Sem `rubi` na página.** A suspensão é um estado da conta, não um erro do sistema.

### Linha 2, web, no fim da linha, nesta ordem

#### 5.1 `Perfil de outro leitor · Administrador, menu aberto`

- Sidebar do administrador com o divisor e **`Moderação`** ativo.
- Perfil público de Sérgio Valadares, que o administrador não segue: coluna de identidade com `Seguir`, os contadores, as três métricas de `Estatísticas do ano` e o gráfico `Notas dadas em 2026` com `9 notas` (colunas em `0,5`, `1`, `1,5`, `2`, `3`, `4` e `5`; `0`, `2,5`, `3,5` e `4,5` com `0`), cortado pela borda se não couber. Coluna direita com a aba `Estante` ativa.
- O `DotsThree` do header com o fundo `linha` de pressionado e o **menu aberto** com o único item `Suspender conta`, o cursor sobre ele (fundo `rubi-fundo`).

#### 5.2 `Perfil de outro leitor · Administrador, confirmar suspensão`

- Base: o perfil de 5.1 sob o scrim, menu fechado.
- Dialog de suspensão com o motivo **digitado**: `Ataques pessoais repetidos em comentários, com três denúncias procedentes em setembro.`, contador `86 de 500`, o campo com o foco (borda de 1.5px `musgo`), e `Suspender conta` habilitado.

#### 5.3 `Perfil de outro leitor · Administrador, suspendendo`

- Mesmo dialog, depois de `Suspender conta`, há mais de três segundos: o destrutivo com `Suspendendo conta`, `Cancelar` e o campo desabilitados, e a linha `O serviço está iniciando. Isso pode levar alguns segundos.` acima dos botões.

#### 5.4 `Perfil de outro leitor · Administrador, suspensão não confirmada`

- Mesmo dialog, com o banner `rubi-fundo` entre o título e a consequência, o motivo ainda digitado e os dois botões habilitados.

#### 5.5 `Perfil de outro leitor · Administrador, conta suspensa`

- Sidebar com **`Moderação`** ativo. A visão do administrador de uma conta suspensa (5.0), com a etiqueta `Conta suspensa`, `Reativar conta`, a faixa neutra, `Motivo registrado` e `Ver no registro de auditoria`.
- O **toast** de sucesso no canto inferior esquerdo da área de conteúdo, parado: `Conta de Sérgio Valadares suspensa. O perfil e o conteúdo ficaram ocultos para os leitores.`

#### 5.6 `Perfil de outro leitor · Administrador, confirmar reativação`

- Base: 5.5 sem o toast, sob o scrim.
- Dialog de reativação recém-aberto: campo `Motivo da reativação` **vazio**, com o foco e o placeholder, contador `0 de 500`, e `Reativar conta` **desabilitado** a 40% de opacidade. É o artboard que mostra o botão de confirmar bloqueado sem motivo.

### Linha 3, modo escuro, no fim da linha, nesta ordem

#### 5.7 `Perfil de outro leitor · Estatísticas e estante (rolada), modo escuro`

O artboard mobile `Estatísticas e estante (rolada)`, já com o card de notas, no escuro, com o tratamento de 4.6. Barra inferior em `noite-elevada` com **Feed** ativo em `musgo-claro`.

#### 5.8 `Perfil de outro leitor · Administrador, confirmar suspensão, modo escuro`

O artboard 5.2 no escuro: sidebar em `noite-elevada` com o divisor `linha-noite` e **`Moderação`** ativo em `musgo-fundo-escuro` com `ShieldCheck` `fill` `musgo-claro`; o perfil em `noite` sob o scrim de `noite` a 60%; o dialog em `noite-elevada` com o campo em foco (borda `musgo-claro`) e o destrutivo em outline `rubi-claro`.

#### 5.9 `Perfil de outro leitor · Administrador, conta suspensa, modo escuro`

O artboard 5.5 no escuro, sem o toast: etiqueta `Conta suspensa` com borda `linha-noite`, `Reativar conta` com borda `linha-noite` e texto `papel-suave`, faixa neutra em `musgo-fundo-escuro`, bloco do motivo com borda `linha-noite` e texto `papel-suave`, `Ver no registro de auditoria` em `musgo-claro`.

---

## 6. Artboards a remover

Nenhum sai. Todos os artboards dos Períodos 1 e 2 continuam, com as mudanças da seção 4.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Dialog de confirmação destrutiva | documento-de-design §4.11 e §7.8 |
| Faixa informativa neutra | documento-de-design §4.15 |
| Formulário: label acima, helper visível, erro em `rubi` | documento-de-design §4.2 e o bloco da seção 2 |
| Botão primário pill, secundário, textual e destrutivo em outline | documento-de-design §4.1 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6; posição na web nasceu no lote 3 do Período 2 |
| Quinto item `Moderação` da sidebar e divisor de administrador | nasceram em `periodo-2/F-MOD/painel-de-moderacao.md`; incorporação pendente |
| Etiqueta de tipo em outline neutro | nasceu em `periodo-2/F-MOD/painel-de-moderacao.md`; incorporação pendente |
| Bloco de motivo com borda esquerda de 2px | nasceu em `periodo-2/F-MOD/painel-de-moderacao.md`; incorporação pendente |
| Banner inline de erro | nasceu no Período 1 |
| Card de estatística do bloco do perfil | nasceu na edição `periodo-2/meu-perfil/meu-perfil.md`; incorporação pendente |
| Histograma de notas com contagem sobre cada coluna | nasce na edição `periodo-3/estatisticas/estatisticas.md`, no mesmo lote; aqui na versão compacta |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Histograma compacto e não acionável** dentro do bloco de estatísticas do perfil alheio: onze faixas, contagem sobre cada coluna, sem balão e sem tabela.
2. **Menu de ações de moderação** no header de conteúdo da web, só para o administrador, com um item destrutivo em `rubi`.
3. **Dialog de confirmação com motivo obrigatório**: campo com contador, confirmar desabilitado a 40% enquanto vazio, foco inicial no campo, estados de espera e de falha dentro do dialog. Reaproveitado na edição do painel de moderação.
4. **Visão do administrador de uma conta suspensa**: etiqueta `Conta suspensa`, faixa neutra com a data, motivo registrado, `Reativar conta` no lugar do botão de relação.
5. **Etiqueta de estado de conta** (`Conta suspensa`), com ícone, no desenho da etiqueta de tipo.

**Decisões deste prompt a ratificar pelos donos das features:**

- F-STA-OPC (Ana Luiza de Freitas): o gráfico do perfil alheio cobre só o ano corrente, como o bloco; não é acionável e não tem tabela; a coluna de identidade da web deixa de ser fixa quando fica mais alta que a viewport.
- F-MOD-OPC (Renato Douglas): a ação de suspender entra por um `DotsThree` no header, só na web; motivo obrigatório também na reativação, com até 500 caracteres (mock, como o motivo da denúncia); foco inicial no campo e não em `Cancelar`; o administrador vê a conta suspensa sem conteúdo, com a data e o motivo; no app, o administrador vê a conta suspensa como `Perfil não encontrado`, igual a qualquer leitor; nenhum `rubi` na página da conta suspensa.

**Contratos a confirmar:**

- `GET /perfis/{usuarioId}/estatisticas` com a distribuição do ano corrente, sob RN-08.
- A página do administrador de uma conta suspensa depende de `GET /interno/usuarios/{id}/moderacao` devolver nome, `@username`, avatar, privacidade, data e hora da suspensão e o motivo; as VIEWs públicas omitem a conta suspensa.
- **Motivo no registro de auditoria:** o painel do Período 2 diz que o registro não mostra motivos (eram motivos de denúncia, escritos por leitores). O arquivo de F-MOD-OPC grava o motivo da suspensão em `log_moderacao`. A edição do painel precisa decidir se a tabela mostra esse motivo; esta tela mostra o da suspensão vigente.
- Resposta do comando de suspender com a data e a hora, para a faixa e o toast.

---

## 8. Copy nova ou alterada

| Onde | Texto |
|---|---|
| Título do gráfico | `Notas dadas em 2026` |
| Total | `12 notas`, `9 notas` |
| Eixo X | `0`, `0,5`, `1`, `1,5`, `2`, `2,5`, `3`, `3,5`, `4`, `4,5`, `5` |
| Legenda | `Nota em estrelas. Sobre cada coluna, o número de livros.` |
| Sem nota no ano | `Rafael não deu notas em 2026.` |
| Rótulo acessível do gráfico | `Notas que Rafael deu em 2026, 12 notas. Nota 2: 1 livro. Nota 3: 1 livro. Nota 3,5: 1 livro. Nota 4: 4 livros. Nota 4,5: 2 livros. Nota 5: 3 livros. As outras notas: nenhum livro.` |
| Botão do header, rótulo acessível | `Ações de moderação` |
| Item do menu | `Suspender conta` |
| Dialog, título | `Suspender a conta de Sérgio Valadares?` |
| Dialog, consequência | `Sérgio deixa de conseguir entrar no Lê Ai, e o perfil, as resenhas, as atividades, os comentários e as listas dele ficam ocultos para os outros leitores. Nada é apagado, e a conta pode ser reativada depois.` |
| Campo, label | `Motivo da suspensão` |
| Campo, placeholder | `Por exemplo: ataques pessoais repetidos em comentários.` |
| Campo, helper | `Fica no registro de auditoria. Sérgio não vê este texto.` |
| Campo, contador | `0 de 500`, `86 de 500` |
| Campo, erro | `Use até 500 caracteres.` |
| Botões | `Cancelar`, `Suspender conta` |
| Espera | `Suspendendo conta` · `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Falha | `A suspensão não foi confirmada a tempo. A conta continua ativa. Tente de novo: se a suspensão já tiver acontecido, ela não é aplicada duas vezes.` |
| Toast de sucesso | `Conta de Sérgio Valadares suspensa. O perfil e o conteúdo ficaram ocultos para os leitores.` |
| Toast, fechar | `Fechar aviso` |
| Etiqueta de estado | `Conta suspensa` |
| Faixa da conta suspensa | `Conta suspensa em 11 de outubro de 2026, às 14:32. Sérgio não consegue entrar, e o perfil e o conteúdo dele estão ocultos para os leitores. Nada foi apagado.` |
| Título do motivo | `Motivo registrado` |
| Link do registro | `Ver no registro de auditoria` |
| Botão da coluna | `Reativar conta` |
| Reativação, título | `Reativar a conta de Sérgio Valadares?` |
| Reativação, consequência | `Sérgio volta a conseguir entrar, e o perfil e o conteúdo dele voltam a aparecer para os leitores, conforme a privacidade do perfil.` |
| Reativação, label e placeholder | `Motivo da reativação` · `Por exemplo: suspensão revista depois de nova análise.` |
| Reativação, espera | `Reativando conta` |
| Reativação, falha | `A reativação não foi confirmada a tempo. A conta continua suspensa. Tente de novo: se a reativação já tiver acontecido, ela não é aplicada duas vezes.` |
| Reativação, toast | `Conta de Sérgio Valadares reativada.` |

As contagens sobre as colunas e as marcas do eixo X são as únicas exceções à regra "todo número com unidade": a unidade está na legenda sob o eixo. Zero em-dash, zero emoji, zero `%`. A palavra `suspensa` nunca aparece para quem não é administrador.

---

## 9. Acessibilidade e interação do que muda

- **Gráfico do perfil:** não recebe foco nem é acionável, como os cards de estatística; é lido como uma imagem com o rótulo da seção 8, que traz todas as contagens. Colunas com 6,15:1 contra `papel-elevado` no mobile e acima disso contra `papel` na web; 7,21:1 em `musgo-claro` contra `noite-elevada`. Cada contagem está escrita, e o `0` também.
- **`DotsThree`:** botão com `aria-haspopup="menu"` e `aria-expanded`; o menu abre com `Enter` ou `Space`, o foco vai para o item, `Esc` fecha e devolve o foco ao botão.
- **Dialogs:** `role="dialog"` com `aria-modal`, título como rótulo e a consequência como descrição. O foco fica preso no dialog; ao fechar, volta ao elemento que o abriu. O campo tem o label ligado, o helper e o contador como descrição, e o erro anunciado quando aparece. O botão desabilitado é anunciado como indisponível, com o motivo `Escreva o motivo para continuar.` na descrição.
- **Espera e falha:** a troca para `Suspendendo conta` e o banner de falha são anunciados numa região viva educada; o toast de sucesso também, e não some sozinho enquanto tem o foco do leitor de tela.
- **Visão da conta suspensa:** a faixa neutra é informação, não erro, sem `role="alert"`. A ordem de tabulação: sidebar, `Voltar`, `Reativar conta`, `Ver no registro de auditoria`.
- Foco de teclado visível na web: contorno de 2px `musgo` com offset de 2px no `DotsThree`, no item do menu, no campo (borda de 1.5px `musgo`), nos botões e no link.
- Contraste: helper, contador e consequência em `grafite`, nunca em `grafite-suave`. O placeholder em `grafite-suave` nunca é a única instrução, porque o label está sempre visível.
- `prefers-reduced-motion`: menu, dialog e toast entram sem transição.
- **Ação destrutiva com confirmação em modal** (RNF-USA-04): suspender só acontece depois do dialog, com motivo. O destrutivo é outline `rubi`, nunca preenchido.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Header, identidade, botão de relação, contadores, bloco de restrição, modal, estante, resenhas, listas, perfil não encontrado e shell ficam como estão.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não desenhe o painel de moderação** neste canvas. O link `Ver no registro de auditoria` leva até ele, mas ele mora em outro prompt.

**RN-08 e suspensão, as regras duras desta tela**

- **Não mostre a distribuição de perfil privado a quem não é seguidor aceito**, nem desfocada, nem em silhueta, nem como "12 notas" em cinza.
- **Não diga a quem não é administrador que uma conta foi suspensa.** Sem `Conta suspensa`, sem `Perfil indisponível`, sem `Esta conta foi suspensa`: é `Perfil não encontrado`, o mesmo de um username que nunca existiu.
- **Não mostre o conteúdo da conta suspensa ao administrador** nesta página (estante, resenhas, listas, estatísticas). A conta está oculta; a página do administrador mostra o estado e a ação.
- Não desenhe a ação de suspender no app mobile, em perfil que não é de leitor, nem no perfil do próprio administrador.
- Não desenhe suspender sem confirmação, nem confirmar sem motivo, nem botão destrutivo preenchido.
- Não desenhe prazo de suspensão, suspensão temporária, contagem regressiva, banimento, exclusão de conta pelo administrador ou remoção de conteúdo nesta tela. Suspender é bloqueio de acesso reversível.
- Não desenhe denunciar perfil. A denúncia cobre só resenhas e comentários.
- Não distinga perfil inexistente de perfil indisponível.

**Específico do perfil de outro leitor, continua valendo**

- Não desenhe sequência diária nem desafios deste leitor.
- Não desenhe `Ver estatísticas` nem caminho para o painel completo de outra pessoa.
- Não compare as notas do visitado com as de quem olha, não desenhe média, tendência, ranking ou "avalia mais alto que você".
- Não desenhe `Nova lista`, recomendar livro, menu `DotsThree` nas resenhas, favoritos nem frases deste leitor.
- Não deixe as duas reações ativas ao mesmo tempo.
- Não desfaça o seguimento sem confirmação, não troque `Seguindo` por `Deixar de seguir` no hover, não desenhe cancelar solicitação, bloquear, silenciar nem mensagem direta.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais. O motivo da suspensão é Manrope.
- Nada de mistura de família dentro do mesmo título, nada de overline em toda seção, nada de eyebrow numerado.

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão, em coluna ou em texto.
- Nada de cor por nota no gráfico: é uma série, uma cor.
- Nada de `rubi` na página da conta suspensa nem na etiqueta `Conta suspensa`. `rubi` fica no item do menu, no destrutivo e nos erros.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro, nem no scrim. Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de coluna crescendo animada.
- Nada de shimmer perpétuo e nada de spinner girando.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. O título diz o que a coisa é.
- Nada de tom punitivo no texto da suspensão: sem "banido", "infrator", "violação".

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.

**Métricas e dados**

- Nada de número sem unidade, salvo as contagens e as marcas do eixo, explicadas pela legenda.
- Nada de percentual, nada de número fake-preciso.
- Nada de gráfico de pizza, rosca ou linha para as notas.

**Modo escuro**

- Nada de fundo #000000, nada de simples inversão da paleta clara, nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing dentro do produto, nada de bento grid decorativo, nada de três colunas de features com ícone.
- Nada de visual de console administrativo genérico: sem topbar escura, sem sidebar diferente da do produto.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
