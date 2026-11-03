# F-GAM-OPC · Calendário de sequência

**Feature:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-GAM-OPC.md
**Requisitos:** RF-GAM-04 (ver quais dias recentes tiveram registro de progresso, em formato de calendário)
**Requisitos cujo efeito aparece aqui:** RF-GAM-01 e RF-GAM-02 (sequência atual e recorde, já entregues por F-GAM), RF-GAM-03 (zeramento). O lembrete de sequência (RF-GAM-05) não tem tela aqui: ele chega como notificação e é desenhado na edição de `notificacoes`.
**Não funcionais:** RNF-SEC-02 (só o próprio leitor vê o calendário), RNF-DES-02 (janela limitada pelo servidor), RNF-USA-03 (contraste), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-18 (dia conta com ao menos 1 página lida, data local do aparelho, recorde preservado, sincronização offline recompõe os dias), RN-17 (não existe registro retroativo)
**Versão web:** não. RF-GAM-04 tem a coluna Web negativa em `REQUISITOS.md` §5.12, e gamificação está fora do escopo do cliente web (`REQUISITOS.md` §2.1).

---

## 1. Contexto

Esta tela sustenta a **meta**, o segundo dos três mecanismos do produto. O número da sequência diz quantos dias seguidos o leitor leu; o calendário mostra **quais** foram esses dias, mês a mês, para que o hábito fique visível e o leitor entenda por que a sequência está onde está.

**De onde se chega:** do componente `Sequência diária` do Meu perfil, que passa a ser tocável (essa mudança é uma edição do perfil em lote futuro; aqui ela só é citada). A tela é uma **tela de detalhe empilhada sobre a área Perfil**: header com seta de voltar e a aba `Perfil` ativa na barra inferior.

**Para onde se vai:** de volta ao Meu perfil. A tela não tem outra saída: é **somente leitura**. Nenhum dia é tocável, e não existe forma de marcar ou desmarcar um dia, porque não existe registro retroativo de progresso (RN-17, RN-18.5).

Quatro coisas que ela precisa resolver:

- **O dia que conta é o mesmo que move a sequência.** Um dia aparece marcado só quando teve ao menos uma atualização de progresso com pelo menos uma página lida (RN-18.1). Iniciar, concluir ou abandonar uma leitura não marca o dia. Se o calendário e o número divergirem na mesma tela, o leitor deixa de confiar nos dois.
- **A janela é limitada pelo servidor.** O calendário mostra "dias recentes", não o histórico inteiro (RNF-DES-02). O leitor navega mês a mês para trás até o mês mais antigo que o servidor devolve; ali a seta de voltar desabilita e uma linha explica o limite.
- **Marcado não pode depender só de cor.** O dia com leitura é um **círculo preenchido** com o número do dia dentro; o dia sem leitura é só o número, sem forma. Forma e rótulo acessível carregam a informação, a cor só reforça.
- **Dia sem leitura não é falha.** Nada de `rubi`, `ambar`, `X` ou risco nos dias vazios. O calendário registra, não cobra.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, na ordem em que o leitor os encontra.
- **Linha 2:** não existe. A tela não tem versão web (ver seção 5).
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Calendário de sequência · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

Cor da sequência nesta tela: no modo claro, o número da sequência, a Flame e
o círculo do dia com leitura usam musgo, e não broto. broto sobre
papel-elevado fica abaixo de 3:1 e não serve nem para texto grande nem para
forma que carrega informação. Esta é a decisão já aplicada no app ao streak
do perfil. No modo escuro, número, Flame e círculo do dia usam broto-vivo.

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

**Hoje é quinta-feira, 24 de setembro de 2026**, no fuso do celular da leitora. É a mesma data dos desafios desenhados no Período 2.

**Leitora:** `Marina Beltrão` (`@marinableu`), a mesma do Meu perfil. Os números da sequência são os mesmos daquele canvas: **sequência atual `12 dias seguidos`**, **recorde `31 dias`**.

**Semana começa na segunda-feira** (ISO 8601), o mesmo critério dos desafios (F-DSF) já implementado no serviço `leitura`. O cabeçalho das colunas é `seg ter qua qui sex sáb dom`.

**Dias com leitura** (mock declarado, coerente com a sequência e o recorde):

| Mês | Primeiro dia cai em | Dias com leitura | Total no mês |
|---|---|---|---|
| Setembro de 2026 (mês corrente) | terça-feira | 1, 2, 3, 5, 6, 8, 9, 10 e de 13 a 24 | `20 dias com leitura` |
| Julho de 2026 | quarta-feira | de 1 a 10 (fim do recorde), 18, 19, 25 | não desenhado |
| Junho de 2026 | segunda-feira | de 10 a 30 (início do recorde) | não desenhado |
| Maio de 2026 | sexta-feira | nenhum | `Nenhum dia com leitura` |
| Abril de 2026 (mês mais antigo da janela) | quarta-feira | 18, 19, 21, 22 e de 25 a 30 | `10 dias com leitura` |

- A sequência de 12 dias são os dias 13 a 24 de setembro: o dia 12 ficou sem leitura, e o dia 24 (hoje) já tem registro.
- O recorde de 31 dias vai de 10 de junho a 10 de julho. Ele não é desenhado no calendário além do número: não existe destaque de "recorde" em nenhum dia.
- **Janela:** o mock assume que o servidor devolve de abril a setembro de 2026. O tamanho real da janela é decisão do contrato (`GET /me/sequencia/calendario`), não deste prompt. A tela nunca escreve o tamanho da janela ("6 meses"): ela só desabilita a seta e diz que chegou ao mês mais antigo disponível.
- Dias futuros do mês corrente (25 a 30 de setembro) aparecem como número em `grafite-suave`, sem forma.

**Segunda situação, para o artboard `Hoje ainda sem registro`:** sexta-feira, 25 de setembro de 2026, de manhã. A sequência continua `12 dias seguidos` (o dia de hoje ainda não terminou, RN-18.4), e o dia 25 aparece com o anel de hoje, sem preenchimento.

**Terceira situação, para o artboard `Conta nova`:** leitora diferente, `Renata Siqueira Prado`, conta criada no **domingo, 20 de setembro de 2026**, sem nenhum progresso registrado. Sequência `0`, recorde `0 dias`. Os dias 1 a 19 de setembro ficam em `grafite-suave`, como dias fora do alcance da conta; o mês de setembro é o mais antigo disponível.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell. O shell é idêntico em todas as telas autenticadas e precisa ser desenhado por extenso aqui.

**Mobile, barra inferior.** Fixa no rodapé da viewport, acima da área segura. Altura de 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, sem sombra. Quatro itens de largura igual: `Estante`, `Descobrir`, `Feed`, `Perfil`. Cada item empilha ícone de 24px acima e rótulo em `caption` abaixo, com `space-1` de gap, centralizado, e a área tocável tem no mínimo 48px de altura. Ícones Phosphor: `Books` para Estante, `Compass` para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. Inativo: ícone peso `regular`, cor `grafite`; rótulo em `caption` `grafite`. Ativo: ícone peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`. Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone que salta. **Nesta tela o item ativo é `Perfil`**, porque ela é empilhada sobre o perfil.

**Mobile, header de tela de detalhe.** Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.

- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de toque de 48px, voltando ao Meu perfil.
- Título `Sequência` em `display` `tinta`, à esquerda, alinhado à base, `space-2` depois da seta.
- À direita, o sino `Bell` (Phosphor, `regular`, 24px, `tinta`), alvo de 48px. O sino é fixo em toda tela autenticada. Badge de não lidas: círculo de 18px, fundo `musgo`, encostado no canto superior direito do ícone, número centralizado em 11px peso 600 cor `papel`; acima de nove mostra `9+`; sem não lidas, o badge não existe. Nos artboards, desenhe o badge com `2`.
- **Nenhuma ação contextual no header.** A tela é somente leitura.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.

### Resumo da sequência (no topo do conteúdo)

`space-4` abaixo do header, margem lateral `space-5`. É o mesmo componente de streak do Meu perfil (design §4.8), na mesma anatomia, para o leitor reconhecer de onde veio:

- Container `papel-elevado`, `radius-md`, padding `space-5`, `elev-0`, largura total menos o padding lateral.
- Dentro, à esquerda, de cima para baixo:
  - Rótulo em `label` `grafite`: `Sequência diária`.
  - `space-2` abaixo, a **sequência atual**: `Flame` (Phosphor, `regular`, 20px, `musgo`), `space-2` de gap, o número em `num-display` `musgo`: `12`, e `space-2` depois, alinhado pela linha de base, `dias seguidos` em `body-strong` `grafite`.
  - `space-2` abaixo, o **recorde**: `Recorde:` em `caption` `grafite`, `31` em `num-inline` `grafite` e `dias` em `caption` `grafite`.
- À direita do container, alinhado ao topo, em `caption` `grafite`, até duas linhas, largura máxima de 128px: `Conta cada dia em que você registra ao menos 1 página.`
- **Aqui ele não é acionável:** nada de `CaretRight`, nada de toque. `Flame` é estático.

### Navegação de mês

`space-6` abaixo do resumo, margem lateral `space-5`, uma linha de 48px:

- À esquerda, botão de ícone `CaretLeft` (Phosphor, `regular`, 24px, `tinta`), alvo de 48 por 48px, sem fundo nem borda, rótulo acessível `Mês anterior`.
- Ao centro, o mês em `title` `tinta`: `Setembro de 2026`.
- À direita, botão de ícone `CaretRight`, mesmo tratamento, rótulo acessível `Próximo mês`.
- **Desabilitado:** ícone em `grafite-suave`, sem resposta a toque, anunciado como indisponível. No mês corrente o `CaretRight` está sempre desabilitado: não existe mês futuro com leitura. No mês mais antigo da janela o `CaretLeft` está desabilitado.
- `space-1` abaixo, centralizado, em `caption` `grafite`, o total do mês: `20 dias com leitura`, com `20` em JetBrains Mono. Em mês sem nenhum dia marcado: `Nenhum dia com leitura`.
- Deslizar o calendário para a direita ou para a esquerda também troca de mês, com as mesmas regras dos botões. Os botões continuam sendo o caminho principal e acessível.

### Grade do mês (nasce aqui)

O `documento-de-design.md` não define calendário: a grade nasce aqui e vira pendência de incorporação (seção 7).

- `space-4` abaixo da navegação. Largura total menos o padding lateral (350px no artboard), **sem container**: a grade fica direto sobre `papel`.
- **Linha de cabeçalho:** sete colunas de largura igual com `seg`, `ter`, `qua`, `qui`, `sex`, `sáb`, `dom` em `caption` `grafite`, centralizados. Altura de 24px, `space-2` abaixo.
- **Células:** sete colunas de largura igual, 48px de altura cada, sem bordas entre elas. O mês ocupa de quatro a seis linhas conforme cai o primeiro dia. Células antes do dia 1 e depois do último dia ficam vazias, sem número do mês vizinho.
- **Dia com leitura:** círculo de 36px centralizado na célula, preenchido em `musgo`, com o número do dia dentro em `num-inline` cor `papel`. É a forma que carrega a informação.
- **Dias com leitura consecutivos na mesma semana:** uma faixa de 36px de altura em `musgo-fundo`, com `radius-full`, passa por trás dos círculos e os liga, do primeiro ao último dia da corrida dentro daquela linha. A faixa quebra na virada da linha da grade (domingo para segunda-feira) e recomeça na linha seguinte. Dia com leitura isolado não tem faixa. A faixa só reforça a leitura visual da corrida; o rótulo acessível de cada dia é o que conta.
- **Dia sem leitura (passado):** só o número, em `num-inline` `grafite`, sem círculo, sem traço, sem ícone.
- **Hoje:** anel de 2px em `tinta`, 36px, em volta do número. Se hoje já tem leitura, o anel envolve o círculo preenchido com 2px de folga (`papel` entre o anel e o círculo). Se hoje ainda não tem leitura, o anel envolve só o número em `tinta`.
- **Dia futuro do mês corrente e dia anterior à criação da conta:** número em `num-inline` `grafite-suave`, sem forma. Não é informação essencial: é só a posição na grade.
- **Nenhum dia é tocável.** Sem ripple, sem hover, sem tooltip, sem sheet de detalhe do dia.

### Legenda

`space-4` abaixo da grade, margem lateral `space-5`, uma linha em `caption` `grafite`, alinhada à esquerda:

- Um círculo de 12px preenchido em `musgo`, `space-2`, `Dia com leitura`; `space-6` de gap; um anel de 12px com 2px em `tinta`, `space-2`, `Hoje`.

### 4.1 Padrão, mês corrente

De cima para baixo:

1. Header de tela de detalhe com `Sequência` e `Bell`.
2. Resumo da sequência: `12` `dias seguidos`, `Recorde: 31 dias`, helper à direita.
3. Navegação: `CaretLeft` habilitado, `Setembro de 2026`, `CaretRight` desabilitado; abaixo, `20 dias com leitura`.
4. Grade de setembro de 2026, com o dia 1 na terça-feira (a segunda-feira da primeira linha fica vazia), cinco linhas:
   - Linha 1 (1 a 6): 1, 2 e 3 com leitura e ligados pela faixa; 4 sem leitura; 5 e 6 (sábado e domingo) com leitura e ligados.
   - Linha 2 (7 a 13): 7 sem leitura; 8, 9 e 10 com leitura e ligados; 11 e 12 sem leitura; 13 (domingo) com leitura, isolado no fim da linha: é o primeiro dia da sequência atual, e a faixa quebra na virada para a segunda-feira.
   - Linha 3 (14 a 20): todos com leitura, faixa de segunda a domingo.
   - Linha 4 (21 a 27): 21 a 24 com leitura e ligados; 24 com o anel de hoje em volta do círculo; 25, 26 e 27 futuros em `grafite-suave`.
   - Linha 5 (28 a 30): futuros em `grafite-suave`.
5. Legenda.
6. `space-8` antes da barra inferior.

Tudo cabe na viewport sem rolar. Se o texto do sistema estiver ampliado, a tela rola por baixo do header e a barra inferior fica fixa.

### 4.2 Hoje ainda sem registro

Sexta-feira, 25 de setembro, de manhã. Mesma tela do 4.1, com três diferenças:

- O dia 24 perde o anel de hoje e fica como os outros dias com leitura, ligado à corrida de 20 a 24.
- O dia 25 ganha o anel de hoje em volta do número em `tinta`, sem círculo preenchido.
- `space-3` abaixo da legenda, uma linha em `caption` `grafite`, alinhada à esquerda: `Hoje ainda não tem registro. Registre ao menos 1 página até o fim do dia para manter a sequência.`

A sequência continua `12 dias seguidos`: o dia ainda não terminou (RN-18.4). **Nada de alerta:** sem `ambar`, sem ícone de aviso, sem contagem regressiva de horas, sem botão de registrar aqui. A frase informa; o registro acontece na estante ou na página da leitura.

### 4.3 Mês sem leitura

A leitora tocou duas vezes em `CaretLeft` e chegou a maio de 2026.

- Resumo da sequência igual ao 4.1: ele é sempre o estado de hoje, não do mês exibido.
- Navegação: `CaretLeft` e `CaretRight` habilitados, `Maio de 2026`, e abaixo `Nenhum dia com leitura`.
- Grade de maio de 2026, com o dia 1 na sexta-feira (segunda a quinta da primeira linha ficam vazias), cinco linhas, todos os números em `grafite`, sem nenhum círculo, nenhuma faixa e nenhum anel de hoje.
- Legenda igual.
- **Sem estado vazio ilustrado e sem frase de culpa.** O mês vazio é só a grade sem marcas e o total escrito.

### 4.4 Mês mais antigo da janela

A leitora chegou a abril de 2026, o mês mais antigo que o servidor devolve.

- Navegação: `CaretLeft` **desabilitado** em `grafite-suave`, `Abril de 2026`, `CaretRight` habilitado; abaixo, `10 dias com leitura`.
- Grade de abril de 2026, com o dia 1 na quarta-feira (segunda e terça da primeira linha ficam vazias), cinco linhas: 18 e 19 (sábado e domingo) com leitura e ligados no fim da linha 3; 21 e 22 ligados na linha 4; 25 a 30 com leitura, com a faixa quebrando na virada de domingo (26) para segunda-feira (27): 25 e 26 ligados no fim da linha 4, 27 a 30 ligados na linha 5.
- Legenda igual.
- `space-3` abaixo da legenda, em `caption` `grafite`: `Este é o mês mais antigo disponível no calendário.`
- **Não escreva o tamanho da janela** (`6 meses`, `180 dias`): ele é do contrato e pode mudar.

### 4.5 Conta nova

`Renata Siqueira Prado`, conta criada em 20 de setembro de 2026, sem nenhum progresso. Hoje é 24 de setembro.

- Resumo da sequência no estado zero do design §4.8: `Flame` estático em `musgo`, `0` em `num-display` `musgo` e, no lugar de `dias seguidos`, `leia hoje para começar` em `body` `grafite`. Linha do recorde: `Recorde:` `0` `dias`. Helper à direita igual.
- Navegação: `CaretLeft` **desabilitado** (setembro é o mês da criação da conta e o mais antigo disponível), `Setembro de 2026`, `CaretRight` desabilitado; abaixo, `Nenhum dia com leitura`.
- Grade de setembro: dias 1 a 19 em `grafite-suave` (antes da conta), 20 a 23 em `grafite`, 24 com o anel de hoje em volta do número em `tinta`, 25 a 30 em `grafite-suave`.
- Legenda igual.
- `space-4` abaixo da legenda, um texto em `body` `grafite`, alinhado à esquerda, até três linhas: `Cada dia em que você registrar ao menos 1 página aparece marcado aqui.`
- Sem botão de ação: o calendário não é lugar de registrar. Sem ilustração.

### 4.6 Carregando

- Header real com `Sequência` e `Bell`.
- **Skeleton estático** com a forma do layout final, barras em `linha` sobre `papel` e retângulos em `papel-elevado`:
  - O resumo: retângulo `papel-elevado` de `radius-md`, 104px de altura, largura total menos o padding lateral.
  - A navegação: uma barra de 20px de altura e 40% de largura, centralizada, `radius-sm`.
  - A grade: linha de cabeçalho com sete barras curtas de 12px e cinco linhas de sete círculos de 36px em `linha`.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.
- É também o estado do **cold start** do serviço (RNF-ERR-09): demora não é erro. Se a espera passar de três segundos, aparece abaixo do skeleton, em `caption` `grafite`, centralizado: `O serviço está iniciando. Isso pode levar alguns segundos.`

### 4.7 Carregando outro mês

A leitora tocou em `CaretLeft` em setembro. O resumo e a navegação já mostram `Agosto de 2026`; o total do mês ainda não chegou.

- No lugar do total, uma barra de skeleton de 13px e 30% de largura, centralizada.
- No lugar da grade, a grade skeleton do 4.6 (cabeçalho real com `seg` a `dom`, círculos em `linha`).
- Os dois botões de mês continuam habilitados: tocar de novo cancela o pedido anterior e pede o mês seguinte.
- Mesmo fade único, sem spinner.

### 4.8 Erro de carregamento

- Header real com `Sequência` e `Bell`.
- Banner inline no lugar do resumo, da navegação e da grade, largura total menos o padding lateral, `space-4` abaixo do header: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`) à esquerda com `space-3` de gap.
- Texto em `body` `tinta`: `Não foi possível carregar seu calendário. Verifique sua conexão e tente de novo.`
- `space-2`, botão textual `musgo`: `Tentar de novo`.
- **Variante ao trocar de mês** (descrita, sem artboard próprio): resumo e navegação ficam; o mesmo banner ocupa o lugar da grade com o texto `Não foi possível carregar agosto de 2026. Verifique sua conexão e tente de novo.` e o mesmo `Tentar de novo`.

### 4.9 Sem conexão

O aparelho está sem internet ao abrir a tela, e a leitora acabou de registrar progresso, que ficou na fila do aparelho (RNF-ERR-05).

- Header real com `Sequência` e `Bell`.
- Banner inline no lugar do conteúdo, largura total menos o padding lateral: fundo `papel-elevado`, `radius` 12, padding `space-4`, `WifiSlash` (Phosphor, `regular`, 20px, `grafite`) à esquerda com `space-3` de gap. **Não é erro:** sem `rubi`.
- Texto em `body` `tinta`: `Você está sem conexão. O calendário aparece quando a conexão voltar.`
- `space-2`, botão textual `musgo`: `Tentar de novo`.
- `space-4` abaixo do banner, uma linha em `caption` `grafite` com `CloudArrowUp` (Phosphor, `regular`, 16px, `grafite`) à esquerda: `1 registro ainda não foi enviado. O dia aparece marcado depois que ele chegar ao servidor.` Essa linha só existe quando há registro na fila do aparelho.
- A marcação do dia depende do servidor: o calendário **nunca** marca um dia a partir da fila local, porque a sequência e o calendário precisam vir da mesma apuração (RN-18.5).

---

## 5. Artboards web (1440 x 900)

Não há versão web. RF-GAM-04 tem a coluna Web negativa em `REQUISITOS.md` §5.12, e gamificação está fora do escopo do cliente web (`REQUISITOS.md` §2.1). Não desenhe a linha 2.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

### 6.1 Padrão, mês corrente

O estado 4.1 no escuro:

- Fundo `noite`. Título do header e ícones em `papel-suave`.
- Resumo em `noite-elevada`, **mais claro** que o fundo, sem sombra. `Flame` e `12` em `broto-vivo`; `Sequência diária`, `dias seguidos`, recorde e helper em `grafite-claro`.
- Navegação: carets habilitados em `papel-suave`, desabilitado em `grafite-fundo-escuro`; mês em `papel-suave`; total em `grafite-claro`.
- Grade: cabeçalho em `grafite-claro`. Dia com leitura: círculo `broto-vivo` com o número em `noite`. Faixa de dias consecutivos em `musgo-fundo-escuro`. Dia sem leitura em `grafite-claro`. Futuro em `grafite-fundo-escuro`. Anel de hoje em `papel-suave`, com folga em `noite` entre o anel e o círculo.
- Legenda com o círculo em `broto-vivo` e o anel em `papel-suave`, texto em `grafite-claro`.
- Barra inferior em `noite-elevada`, **mais clara** que o fundo, divisor `linha-noite`, item `Perfil` ativo em `musgo-claro`.

### 6.2 Mês mais antigo da janela

O estado 4.4 no escuro, com o tratamento do 6.1, para conferir o caret desabilitado e a faixa quebrando na virada da linha.

### 6.3 Conta nova

O estado 4.5 no escuro: `0` e `Flame` em `broto-vivo`, `leia hoje para começar` em `grafite-claro`, dias antes da conta em `grafite-fundo-escuro`, anel de hoje em `papel-suave`.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Streak (sequência atual, recorde, estado zero com `leia hoje para começar`, `Flame` estático) | documento-de-design §4.8 |
| Superfície do streak no perfil (container, rótulo, helper à direita) | `docs/design/periodo-2/meu-perfil/meu-perfil.md`, incorporação pendente |
| Botão textual | documento-de-design §4.1 |
| Banner inline de erro | documento-de-design §4.2 |
| Escala tipográfica, com JetBrains Mono em numeral tabular | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, regra do acento único e `broto` só em progresso | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell autenticado, barra inferior e header | ../../periodo-0/P0-NAV/shell-de-navegacao.md |
| Header de tela de detalhe (`ArrowLeft`, título, sino) | nasceu nos prompts do Período 1 (`F-AUT/alterar-senha.md`), incorporação pendente |

**Componentes que nascem aqui e viram pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Grade de calendário mensal somente leitura:** cabeçalho `seg` a `dom`, células de 48px, dia com leitura em círculo preenchido de 36px, dia sem leitura só com o número, dia futuro ou fora do alcance em `grafite-suave`, sem dias de meses vizinhos.
2. **Faixa de dias consecutivos** em `musgo-fundo` (`musgo-fundo-escuro` no escuro) ligando os círculos dentro da mesma linha.
3. **Anel de hoje** de 2px em `tinta` (`papel-suave` no escuro), com folga quando envolve o círculo preenchido.
4. **Navegação de mês** com `CaretLeft` e `CaretRight` de 48px, mês em `title` e total do mês em `caption`, com estado desabilitado no limite da janela.
5. **Legenda de uma linha** com amostra de forma e rótulo.
6. **Banner de sem conexão** em `papel-elevado` com `WifiSlash`, neutro, distinto do banner de erro em `rubi-fundo`.

**Decisão já tomada:** a semana começa na segunda-feira (ISO 8601), alinhada a F-DSF e ao que o serviço `leitura` implementa.

**Decisões deste prompt a ratificar**, a registrar no arquivo da feature:

- **Cor da sequência no claro:** número, `Flame` e círculo do dia em `musgo`, seguindo a decisão do dono de F-GAM de 08/10/2026 para o streak (contraste do `broto` abaixo de 3:1). O §4.8 ainda diz `broto`; enquanto o grupo não altera o documento, a divergência continua registrada em F-GAM e passa a valer também aqui. No escuro, `broto-vivo`.
- **Título do header `Sequência`**, mais curto que `Sequência diária` para caber ao lado da seta e do sino em `display`.
- **Resumo da sequência repetido no topo**, não acionável, sempre com o estado de hoje e não do mês exibido.
- **Faixa de dias consecutivos quebrando na virada da linha** da grade, e não atravessando para a linha seguinte.
- **Frase de hoje sem registro** em `caption` `grafite`, sem alerta e sem atalho para registrar.
- **Mês mais antigo explicado por frase**, sem escrever o tamanho da janela.
- **Conta nova:** dias anteriores à criação em `grafite-suave` e o mês de criação como limite, mesmo que a janela do servidor seja maior.
- **Deslizar troca de mês**, como atalho dos botões.
- **Sem conexão:** banner neutro, sem cache local do calendário, e a fila do aparelho nunca marca dia.

**Contratos a confirmar com o dono:** o `GET /me/sequencia/calendario` precisa devolver, além dos dias, o limite da janela (mês mais antigo disponível) e a data de criação da conta, ou o cliente não sabe quando desabilitar `CaretLeft`; o total do mês pode ser contado no cliente a partir dos dias; a sequência atual e o recorde do resumo vêm de `GET /me/sequencia`, já existente.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header | `Sequência` |
| Rótulo do resumo | `Sequência diária` |
| Sequência atual | `12` `dias seguidos` |
| Sequência zerada | `0` `leia hoje para começar` |
| Recorde | `Recorde: 31 dias` · `Recorde: 0 dias` |
| Helper do resumo | `Conta cada dia em que você registra ao menos 1 página.` |
| Rótulo acessível do caret esquerdo | `Mês anterior` |
| Rótulo acessível do caret direito | `Próximo mês` |
| Mês | `Setembro de 2026` · `Agosto de 2026` · `Maio de 2026` · `Abril de 2026` |
| Total do mês | `20 dias com leitura` · `10 dias com leitura` · `1 dia com leitura` · `Nenhum dia com leitura` |
| Cabeçalho da grade | `seg` `ter` `qua` `qui` `sex` `sáb` `dom` |
| Legenda | `Dia com leitura` · `Hoje` |
| Hoje sem registro | `Hoje ainda não tem registro. Registre ao menos 1 página até o fim do dia para manter a sequência.` |
| Mês mais antigo | `Este é o mês mais antigo disponível no calendário.` |
| Conta nova | `Cada dia em que você registrar ao menos 1 página aparece marcado aqui.` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro de carregamento | `Não foi possível carregar seu calendário. Verifique sua conexão e tente de novo.` |
| Erro ao trocar de mês | `Não foi possível carregar agosto de 2026. Verifique sua conexão e tente de novo.` |
| Sem conexão | `Você está sem conexão. O calendário aparece quando a conexão voltar.` |
| Registro na fila | `1 registro ainda não foi enviado. O dia aparece marcado depois que ele chegar ao servidor.` · `3 registros ainda não foram enviados. Os dias aparecem marcados depois que eles chegarem ao servidor.` |
| Ação dos banners | `Tentar de novo` |
| Rótulo acessível do resumo | `Sequência diária: 12 dias seguidos. Recorde: 31 dias.` |
| Rótulo acessível de dia | `24 de setembro, hoje, com leitura` · `23 de setembro, com leitura` · `12 de setembro, sem leitura` · `25 de setembro, hoje, sem leitura ainda` · `28 de setembro, dia futuro` |

---

## 9. Acessibilidade e interação

- **A marcação não depende de cor.** Dia com leitura é círculo preenchido, dia sem leitura é número sem forma, hoje é anel. Quem não distingue as cores distingue as formas, e o leitor de tela lê o rótulo de cada dia.
- **Contraste:** `musgo` sobre `papel` passa de 3:1 como forma gráfica e o número em `papel` dentro do círculo `musgo` passa em AA. `grafite` nos dias sem leitura passa em AA. `grafite-suave` só nos dias futuros ou anteriores à conta, que não são informação essencial, e nos carets desabilitados. No escuro, o número em `noite` dentro do círculo `broto-vivo` passa em AA.
- **Leitor de tela:** a grade é anunciada como tabela com o nome do mês (`Setembro de 2026, 20 dias com leitura`), cabeçalhos de coluna com o nome completo do dia da semana e cada célula com o rótulo da seção 8. Células vazias antes do dia 1 não são anunciadas. A faixa de dias consecutivos é decorativa e não é anunciada.
- **Nada na grade recebe foco nem responde a toque**, porque nada ali é acionável. O foco percorre seta de voltar, sino, `Mês anterior` e `Próximo mês`; depois a leitura segue pela grade.
- **Ao trocar de mês**, o anúncio é o novo mês e o total (`Agosto de 2026, 15 dias com leitura`), e o foco fica no botão tocado.
- **Alvo de toque de 48px** na seta de voltar, no sino e nos dois carets, mesmo quando o ícone é menor.
- **Desabilitado** é anunciado como indisponível, e não some: o leitor entende que chegou ao limite.
- **Motion:** troca de mês em crossfade da grade em `dur-base` com `ease-in-out`, sem deslizar a grade inteira; skeleton com um fade único de entrada; press em `scale(0.98)` com `dur-instant` nos carets. Tudo estático sob `prefers-reduced-motion`. Nada em loop.
- **Texto grande:** com o escalonamento de fonte do sistema aumentado, o resumo empilha o helper abaixo dos números, o cabeçalho da grade passa a usar uma letra (`s`, `t`, `q`, `q`, `s`, `s`, `d`) mantendo o nome completo no rótulo acessível, e a tela rola em vez de cortar.

---

## 10. O que não fazer nesta tela

**Específico desta tela**

- **Não desenhe versão web.** Gamificação está fora do cliente web.
- **Não torne nenhum dia tocável.** Nada de sheet de detalhe do dia, tooltip, lista dos livros lidos naquele dia ou contagem de páginas por dia.
- **Não desenhe forma de marcar ou desmarcar dia.** Não existe registro retroativo.
- **Não pinte dia sem leitura de erro.** Nada de `rubi`, `ambar`, `X`, risco, ponto vermelho ou opacidade de "perdido".
- **Não desenhe mapa de calor com intensidade.** O dia tem leitura ou não tem: nada de tons diferentes por quantidade de páginas, nada de escala de cor.
- **Não destaque o recorde no calendário.** Nada de coroa, moldura ou cor especial nos dias do recorde. O recorde é só o número do resumo.
- **Não desenhe medalha, conquista, troféu, selo de marco ("30 dias!"), nem ranking.** Estão fora do escopo do produto por decisão.
- **Não comemore.** Nada de confete, brilho, chama crescendo ou animação quando o dia de hoje é marcado.
- **Não anime a `Flame`.** Ela é estática.
- **Não cobre o leitor.** Nada de contagem regressiva de horas, `Não perca sua sequência!`, aviso em `ambar` ou botão de registrar nesta tela.
- **Não mostre dias de meses vizinhos** nas células vazias da grade.
- **Não escreva o tamanho da janela** do servidor.
- **Não use `broto` no claro** no número, na `Flame` nem no círculo do dia: o contraste não passa. `broto` também não vira faixa: a faixa é `musgo-fundo`.
- **Não desenhe ação no header.** Só seta, título e sino.

**Tipografia (design §7.1)**

- Não use Inter como fonte de interface: a UI é Manrope.
- Não use Instrument Serif nem Fraunces. A serifa do produto é Newsreader, e ela não aparece nesta tela.
- Não misture família dentro de um título: ênfase é itálico da mesma família.
- Não ponha overline em cima de título de seção nem do mês. `Setembro de 2026` é `title`, não caixa alta.
- Não use eyebrow numerado do tipo `01 · SEÇÃO`.

**Cores e superfícies (design §7.2)**

- Não use a família bege quente com latão, oxblood e expresso. O acento é `musgo`.
- Não use gradiente roxo, rosa ou azul, nem mesh, nem glow neon.
- Não use gradiente em botão, na faixa nem em texto de título.
- Não use sombra preta pura nem `#000000` em lugar nenhum. O resumo e a grade não têm sombra.
- Não use textura de papel ou de madeira no fundo.

**Motion (design §7.4)**

- Nada de scroll hijacking, parallax ou marquee.
- Nada de loop infinito: sem shimmer no skeleton, sem círculo que pulsa, sem ícone que gira.
- Nada de dias "acendendo" um por um ao abrir a tela: a grade aparece pronta.

**Conteúdo e copy (design §7.5)**

- Zero em-dash em qualquer texto visível. Use dois pontos, vírgula ou reescreva.
- Nada de número fake-preciso nem percentual (`67% dos dias`). Os números são mock declarado e sempre vêm com unidade: `20 dias com leitura`, `12 dias seguidos`.
- Nada de label poético: o título é `Sequência`, não "Sua jornada" nem "Hábito".
- Nada de emoji na copy. Nada de chama, alvo ou troféu em emoji.

**Componentes e assets (design §7.6)**

- Nada de ícone desenhado à mão: todos os ícones são Phosphor.
- Nada de toast: erro e sem conexão são banners inline.

**Modo escuro (design §7.7)**

- Nada de fundo `#000000`: o fundo é `noite`.
- Nada de só inverter a paleta: no escuro o resumo é `noite-elevada`, mais claro que o fundo, e o círculo do dia é `broto-vivo`.
- Nada de meia tela clara e meia escura.

**Métricas e dados (design §7.10)**

- Nada de cor fora do sistema na grade: `musgo` (`broto-vivo` no escuro) para o dia com leitura e `musgo-fundo` (`musgo-fundo-escuro`) para a faixa, e só.
- Nada de número sem unidade.
- Nada de gráfico de barras, linha ou pizza nesta tela: estatística mora em outra tela.

**Fora de escopo por decisão (design §7.12)**

- Nada de camada de obra, login social, mensagem direta, clube de leitura, grupo, fórum, leitura de e-book, medalha, conquista ou ranking.
