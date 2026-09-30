# F-CONTA-2 · Recuperar conta

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-CONTA-2.md
**Requisitos:** RF-AUT-07 (recuperar a conta em até 30 dias depois de pedir a exclusão)
**Não funcionais:** RNF-SEC-41 (recuperação em 30 dias), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-04 (repetir o cancelamento não duplica: chave de idempotência), RNF-ERR-09 (cold start do servidor tratado como carregamento), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** RN-23.3 (login válido em conta com exclusão pendente emite acesso restrito exclusivamente ao cancelamento; nenhuma outra área do produto fica disponível), RN-23.4 (cancelar dentro do prazo restaura a conta e a visibilidade sem recriar dados), RN-23.2 (durante a janela, os dados ficam guardados e ocultos)
**Versão web:** sim. RF-AUT-07 tem marcação na coluna Web de `REQUISITOS.md` §5.1.
**De onde se chega:** do login, desenhado em [`../../periodo-1/F-AUT/login.md`](../../periodo-1/F-AUT/login.md), quando e-mail e senha estão corretos e a conta tem exclusão pendente. O login não muda: o que muda é o destino depois dele. O pedido de exclusão é a tela [`excluir-conta.md`](excluir-conta.md). **Para onde se vai:** `Cancelar exclusão` leva a `Conta recuperada`, e dali ao login; `Sair` leva direto ao login, com a exclusão mantida.

---

## 1. Contexto

A tela que o leitor vê quando **entra numa conta que pediu para ser excluída**. Ele digitou e-mail e senha certos no login, mas o servidor não abriu o produto: devolveu um **acesso restrito**, que serve para uma coisa só, cancelar a exclusão. Esta tela é tudo o que esse acesso alcança.

**Ela bloqueia o produto inteiro.** RN-23.3 e o design §7.8 são explícitos: conta com exclusão pendente abre **somente** a tela de recuperação, com a data da remoção definitiva e `Cancelar exclusão` como **única ação principal**. Por isso:

- **Sem shell.** Sem barra inferior, sem sidebar, sem sino, sem header de navegação. É uma tela da família da autenticação, como login e recuperar senha.
- **Nenhum atalho para dentro.** Nada de "dar uma olhada na estante antes de decidir", nada de link para o perfil, nada de notificação.
- **Uma saída secundária, `Sair`.** Para quem entrou só para conferir e quer manter a exclusão. Sair **não é destrutivo**: a exclusão já estava agendada e continua agendada. Por isso sai sem modal de confirmação, e uma linha diz o que acontece.

**Cancelar não abre o produto.** O acesso restrito não tem renovação e não vale para mais nada. Quando o servidor confirma o cancelamento, a tela vira `Conta recuperada`, diz que tudo voltou como estava e leva ao login: o leitor entra de novo, e aí sim com a sessão normal. Um passo a mais, mas que deixa claro que a conta voltou ao estado comum.

**O que a tela precisa dizer, com exatidão:**

1. **Qual conta é.** Nome e `@username`, para quem tem mais de uma conta ou entrou pelo aparelho de outra pessoa.
2. **Até quando dá para voltar atrás**, com a data por extenso e quantos dias faltam.
3. **Que nada foi apagado ainda**, e que o conteúdo está oculto para os outros enquanto isso.

Ela sustenta o mesmo que excluir conta: o controle do leitor sobre os próprios dados. E devolve os três mecanismos do produto a quem mudou de ideia.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o leitor os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Recuperar conta · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

MARCA
Lockup horizontal: símbolo (folha sobre livro aberto) seguido do texto
"Lê Ai", os dois na mesma cor única, musgo sobre fundo claro e musgo-claro
no escuro. Texto em Space Grotesk 600, tracking -0.015em. Gap de space-3
entre símbolo e texto. Mínimo de 24px de altura. Nunca recolorido, nunca com
dois matizes, nunca com sombra.

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

SOBREPOSIÇÃO (bottom sheet e dialog)
Abaixo de 768px: bottom sheet ancorado embaixo, largura total, fundo papel no
claro e noite-elevada no escuro, radius-lg só no topo, padding space-6,
elev-3. Alça de 32 x 4px em linha (linha-noite no escuro), centralizada,
space-5 acima do conteúdo. O padding inferior soma a área segura.
Scrim: #171512 a 40% no claro e preto a 60% no escuro.
O sheet sobe em dur-slow com ease-out e sai em dur-base com ease-in. Foco
preso dentro enquanto aberto; Esc e toque no scrim fecham; o foco volta ao
elemento que abriu.
A partir de 768px: dialog centrado, 480px de largura, radius-xl nos quatro
cantos, sem alça, entra em dur-base com deslize curto de 16px e fade.
Confirmação destrutiva: título em title-sm, consequência em body grafite
nomeando o que se perde, foco inicial em Cancelar, nunca no destrutivo. No
mobile os botões empilham em largura total, destrutivo em cima; na web ficam
lado a lado, alinhados à direita, Cancelar primeiro. Destrutivo é sempre
outline rubi (rubi-claro no escuro), nunca preenchido.

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

| Elemento | Conteúdo |
|---|---|
| Nome de exibição | `Marina Beltrão` |
| Nome de usuário | `@marinableu` |
| Data do pedido de exclusão | `29 de setembro de 2026` |
| Data da remoção definitiva | `29 de outubro de 2026` |
| Dia do login, no padrão | `6 de outubro de 2026`, faltando `23 dias` |
| Dia do login, no prazo curto | `28 de outubro de 2026`, faltando `1 dia` |

**Os dois dados de data vêm do servidor**, na resposta do login restrito: a data do pedido e a data da remoção definitiva. Os dias que faltam são calculados no aparelho a partir da segunda. Singular e plural corretos: `falta 1 dia`, `faltam 23 dias`.

**Nenhum dado de conteúdo aparece.** Sem avatar, sem contagem de livros, sem capa, sem prévia do perfil: o acesso restrito não alcança nada disso, e a tela não finge que alcança.

Todo número aparece com unidade. Nenhum valor é fake-preciso.

---

## 4. Artboards mobile (390 x 844)

Tela fora do shell: **sem barra inferior, sem sidebar e sem sino.** O acesso restrito não dá direito a navegação nenhuma.

**Estrutura comum a todos os estados mobile.** Fundo `papel`, ocupando a viewport inteira. Padding lateral `space-5`. De cima para baixo:

1. `space-6` de respiro a partir do topo seguro.
2. **Lockup horizontal da marca** em `musgo`, 24px de altura, alinhado à esquerda. Não é acionável e não leva a lugar nenhum.
3. `space-12`.
4. Título em `display` `tinta`, alinhado à esquerda: `Sua conta está em exclusão`.
5. `space-3`, identificação em `body` `grafite`: `Marina Beltrão · @marinableu`.
6. `space-6`, **bloco da data**, largura total, fundo `papel-elevado`, `radius-md`, padding `space-5`:
   - Label em `label` `grafite`: `Remoção definitiva em`.
   - `space-2`, a data em `title` `tinta`: `29 de outubro de 2026`.
   - `space-2`, os dias que faltam em `num-inline` sobre `caption` `grafite`: `Faltam 23 dias`.
7. `space-6`, texto em `body` `grafite`, no máximo quatro linhas: `Nada foi apagado ainda. Enquanto a exclusão estiver pendente, seu perfil, sua estante e suas resenhas ficam ocultos para os outros leitores.`
8. `space-4`, segunda linha em `body` `grafite`: `Cancele para que tudo volte como estava.`
9. `space-8`, botão primário **`Cancelar exclusão`**, largura total, 48px de altura, `radius-full`, fundo `musgo`, texto `papel` em `body-strong`. **É primário, não destrutivo:** cancelar a exclusão é a ação que preserva, e ela usa o acento do produto.
10. `space-5`, botão textual centralizado em `body-strong` `grafite`: `Sair`.
11. `space-2`, linha centralizada em `caption` `grafite`: `Se você sair, a exclusão continua agendada.`

O bloco inteiro fica acima da dobra, sem rolagem.

### 4.1 Padrão

A tela como descrita acima, no dia `6 de outubro de 2026`: `Faltam 23 dias`. Botão primário ativo.

**Não há estado de carregamento próprio.** A tela só abre depois que o login respondeu, e a resposta já traz as datas: a espera acontece no botão `Entrando` do login, que já existe. **Não há estado vazio:** a tela não lista coleção nenhuma.

### 4.2 Prazo terminando

O mesmo desenho, no dia `28 de outubro de 2026`. Isto é **alerta**, porque o prazo está no fim.

- No bloco da data, `Falta 1 dia`.
- Entre o bloco da data e o texto, `space-5`, **faixa de alerta**, largura total, fundo `ambar-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `ambar`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Depois de 29 de outubro de 2026 não será mais possível recuperar a conta.`
- O resto da tela igual. **Sem contagem de horas, sem relógio correndo, sem cor de pânico.** O `ambar` fica só na faixa.
- A faixa aparece quando falta 1 dia. Com 2 dias ou mais, a tela é a de 4.1.

### 4.3 Cancelando, com cold start

O leitor tocou em `Cancelar exclusão` e o servidor está acordando. Estado de RNF-ERR-09.

- O botão primário mantém o fundo `musgo`, troca o texto para `Cancelando` e fica desabilitado ao toque.
- `space-3` abaixo do botão, linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- O botão `Sair` e a linha abaixo dele ficam com opacidade reduzida e sem foco possível.
- **Sem spinner, sem barra indeterminada, sem ponto pulsando.**

### 4.4 Erro ao cancelar

O pedido não chegou ou o servidor falhou. **A exclusão continua agendada**, e a tela diz isso.

- Banner acima do botão primário, largura total, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `WarningCircle` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Não foi possível cancelar a exclusão. Ela continua agendada. Verifique sua conexão e tente de novo.`
- `space-5` entre o banner e o botão.
- Botão primário ativo de novo, com o texto `Cancelar exclusão`. Repetir não cria dois pedidos: o aplicativo reenvia com a mesma chave de idempotência.
- `Sair` volta a ficar acionável.

### 4.5 Acesso expirado

O acesso restrito é curto e venceu enquanto a tela estava aberta. O servidor recusou o cancelamento por isso, e não por falha. **A exclusão continua agendada.**

- Banner no mesmo lugar de 4.4, fundo `ambar-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `ambar`) à esquerda, texto em `body` `tinta`: `Seu acesso para cancelar expirou. Entre de novo para cancelar a exclusão.`
- O botão primário troca para `Entrar de novo`, que leva ao login.
- `Sair` e a linha abaixo dele **somem**: com o acesso expirado, sair e entrar de novo são o mesmo caminho, e dois botões para o mesmo lugar só confundem.
- É alerta em `ambar`, não erro em `rubi`: nada deu errado com o que o leitor fez.

### 4.6 Conta recuperada

O servidor confirmou o cancelamento. O aplicativo descarta o acesso restrito.

- O lockup no topo permanece, no mesmo lugar.
- `space-16` abaixo do lockup, `CheckCircle` (Phosphor, `regular`, 32px, `musgo`).
- `space-5`, título em `title-lg` `tinta`: `Conta recuperada`.
- `space-4`, texto em `body` `grafite`: `A exclusão foi cancelada. Seu perfil e tudo o que você registrou voltaram a aparecer para os outros leitores, do jeito que estavam.`
- `space-4`, segunda linha em `body` `grafite`: `Entre de novo para continuar.`
- `space-8`, botão primário `Entrar`, largura total, 48px, `radius-full`, que leva ao login.
- **Sem ilustração, sem check gigante, sem confete, sem toast.** O acento é o ícone de 32px.
- O botão voltar do sistema, no Android, leva ao login, como o botão.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

**Mesma estrutura de duas colunas de `Entrar` e `Recuperar senha`**, deliberadamente: esta tela é da família da autenticação, e o leitor precisa reconhecê-la como a continuação do login, e não como uma área do produto.

**Coluna esquerda**, 44% da largura, altura total, fundo `papel-elevado`, padding horizontal `space-16`, conteúdo alinhado à esquerda e centralizado na vertical:

- **Só o lockup horizontal** da marca em `musgo`, com a área de proteção de ao menos a largura da folha em todos os lados.
- **Sem a frase de apresentação** que o login usa na mesma coluna. O leitor já conhece o produto, e uma frase de boas-vindas sobre registrar leituras soaria fora de lugar numa tela sobre excluir a conta.
- Sem imagem, sem ilustração, sem faixa de palavras em maiúsculas.

**Coluna direita**, 56% da largura, fundo `papel`, conteúdo centralizado nos dois eixos numa coluna de no máximo 420px:

- **Sem link de voltar** no topo da coluna: não há para onde voltar. A saída é o botão `Sair`.
- Título `Sua conta está em exclusão` em `display` `tinta`.
- `space-3`, identificação `Marina Beltrão · @marinableu` em `body` `grafite`.
- `space-6`, o bloco da data em `papel-elevado`, `radius-md`, padding `space-5`, com a mesma anatomia do mobile.
- `space-6`, as duas linhas de texto em `body` `grafite`.
- `space-8`, botão primário `Cancelar exclusão`, largura total da coluna, 40px de altura, `radius-full`.
- `space-4`, botão textual `Sair` centralizado e, `space-2` abaixo, a linha `Se você sair, a exclusão continua agendada.` em `caption` `grafite`.

**Estados de ponteiro e teclado:** `hover` no botão primário levando `musgo` para `musgo-vivo` em `dur-fast`; `hover` em `Sair` com sublinhado; foco de teclado visível com contorno de 2px `musgo` e offset de 2px, na ordem visual: `Cancelar exclusão`, depois `Sair`.

**Comportamento responsivo.** A coluna esquerda desaparece abaixo de 768px e o conteúdo passa à coluna única com o desenho de 4.1, com padding lateral `space-5`.

### 5.1 Padrão

As duas colunas, `Faltam 23 dias`, os dois botões.

### 5.2 Prazo terminando

A coluna direita com `Falta 1 dia` e a faixa `ambar-fundo` entre o bloco da data e o texto, como em 4.2.

### 5.3 Erro ao cancelar

A coluna direita com o banner `rubi-fundo` de 4.4 acima do botão primário, com o foco de teclado visível em `Cancelar exclusão`.

### 5.4 Conta recuperada

A coluna esquerda igual. A coluna direita troca o conteúdo pelo bloco de 4.6: `CheckCircle` de 32px `musgo`, título, as duas linhas e o botão primário `Entrar`.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem. Superfície elevada fica **mais clara** que o fundo. `musgo-claro` é o acento. Os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

- **`Recuperar conta · Escuro, padrão` (mobile).** Equivalente a 4.1. Fundo `noite`, lockup em `musgo-claro`. Título em `papel-suave`, identificação e textos em `grafite-claro`. Bloco da data em `noite-elevada`, **mais claro** que o fundo, com label e dias em `grafite-claro` e a data em `papel-suave`. Botão primário com fundo `musgo-claro` e texto `noite`. `Sair` e a linha abaixo em `grafite-claro`.
- **`Recuperar conta · Escuro, prazo terminando` (mobile).** Equivalente a 4.2, com a faixa em `ambar-fundo-escuro`, ícone `ambar-claro` e texto em `papel-suave`.
- **`Recuperar conta · Escuro, conta recuperada` (mobile).** Equivalente a 4.6, com `CheckCircle` em `musgo-claro`, título em `papel-suave` e texto em `grafite-claro`.
- **`Recuperar conta · Escuro, web padrão`.** Equivalente a 5.1. Coluna esquerda em `noite-elevada` com o lockup em `musgo-claro`, coluna direita em `noite`, com o mesmo tratamento do mobile escuro.

O banner de erro, quando aparece no escuro, usa `rubi-fundo-escuro` com ícone `rubi-claro` e texto em `papel-suave`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Tela única de recuperação para conta com exclusão pendente, com `Cancelar exclusão` como única ação principal | documento-de-design §7.8 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` e faixa de alerta em `ambar-fundo` | documento-de-design §3.1.3 |
| Lockup horizontal da marca | documento-de-design §3.7 |
| Escala tipográfica, paleta, espaçamento, raio, elevação e motion | documento-de-design §3.1 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Duas colunas das telas de autenticação, na web | periodo-1/F-AUT/login.md e recuperar-senha.md |
| Bloco de resultado com ícone de 32px, título e botão primário | periodo-1/F-AUT/recuperar-senha.md (confirmação neutra) |

**Nasce aqui**, e vira pendência de incorporação ao `documento-de-design.md` pelo controle de mudança (plano §3), junto com os demais componentes do lote 5 do Período 2:

1. **O desenho da tela de recuperação** que o §7.8 só descreve em uma frase: lockup no topo, título, identificação da conta, bloco da data e as duas ações.
2. **Bloco da data** em `papel-elevado` e `radius-md`, com label, data em `title` e dias restantes, compartilhado com `Exclusão solicitada` em `excluir-conta.md`.
3. **Faixa de prazo terminando** em `ambar-fundo`, a partir de 1 dia restante. O limite de 1 dia é decisão deste prompt.
4. **Estado de acesso restrito expirado**, com o primário trocado para `Entrar de novo`.
5. **Coluna esquerda de autenticação só com o lockup**, sem a frase de apresentação, para as telas de estado da conta.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título | `Sua conta está em exclusão` |
| Identificação | `Marina Beltrão · @marinableu` |
| Bloco da data, label | `Remoção definitiva em` |
| Bloco da data, valor | `29 de outubro de 2026` |
| Dias restantes, plural | `Faltam 23 dias` |
| Dias restantes, singular | `Falta 1 dia` |
| Texto 1 | `Nada foi apagado ainda. Enquanto a exclusão estiver pendente, seu perfil, sua estante e suas resenhas ficam ocultos para os outros leitores.` |
| Texto 2 | `Cancele para que tudo volte como estava.` |
| Botão primário | `Cancelar exclusão` |
| Botão primário, em curso | `Cancelando` |
| Botão textual | `Sair` |
| Linha abaixo de Sair | `Se você sair, a exclusão continua agendada.` |
| Faixa de prazo terminando | `Depois de 29 de outubro de 2026 não será mais possível recuperar a conta.` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Erro ao cancelar | `Não foi possível cancelar a exclusão. Ela continua agendada. Verifique sua conexão e tente de novo.` |
| Acesso expirado | `Seu acesso para cancelar expirou. Entre de novo para cancelar a exclusão.` |
| Botão do acesso expirado | `Entrar de novo` |
| Conta recuperada, título | `Conta recuperada` |
| Conta recuperada, texto 1 | `A exclusão foi cancelada. Seu perfil e tudo o que você registrou voltaram a aparecer para os outros leitores, do jeito que estavam.` |
| Conta recuperada, texto 2 | `Entre de novo para continuar.` |
| Conta recuperada, botão | `Entrar` |

Zero em-dash em toda a copy. Zero emoji. Datas sempre por extenso; dias sempre com unidade e com singular correto.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo nos dois temas. A identificação e os textos usam `grafite`, nunca `grafite-suave`, porque dizem qual conta é e o que acontece com ela.
- Alvo de toque de 48px no mobile nos dois botões, mesmo com o texto de `Sair` curto.
- Ao abrir, o foco vai para o título, e o leitor de tela anuncia título, identificação e a data antes dos botões. O bloco da data é lido como uma frase: `Remoção definitiva em 29 de outubro de 2026, faltam 23 dias.`
- Banners de erro, de alerta e de acesso expirado são anunciados como alerta quando aparecem. A faixa de prazo terminando faz parte da tela e é lida na ordem.
- `Sair` não abre confirmação: não é destrutivo, porque a exclusão já estava agendada. A linha abaixo dele diz a consequência antes do toque.
- **O cancelamento não duplica.** O botão fica desabilitado durante o envio, e um reenvio depois de erro usa a mesma chave de idempotência.
- O acesso restrito é descartado ao sair, ao recuperar a conta e ao expirar. O botão voltar do sistema e o histórico do navegador nunca levam a uma tela do produto.
- Foco de teclado visível na web, na ordem visual: `Cancelar exclusão`, depois `Sair`.
- `prefers-reduced-motion` respeitado: a troca entre o formulário e `Conta recuperada` é um único fade em `dur-base`, estático sob reduce.

---

## 10. O que não fazer nesta tela

**Escopo desta tela**

- **Não desenhe shell.** Sem barra inferior, sem sidebar, sem sino, sem header com seta de voltar. Nenhuma área do produto é acessível daqui (RN-23.3).
- **Não ofereça atalho para dentro do produto**: nada de "ver minha estante", prévia do perfil, contagem de livros ou notificações.
- **Não trate `Cancelar exclusão` como destrutivo.** É o botão primário, pill, em `musgo`. Não é outline `rubi`.
- **Não ponha dois botões primários.** `Cancelar exclusão` é a única ação principal; `Sair` é textual.
- **Não leve direto ao feed depois de cancelar.** O acesso restrito não abre o produto: a tela vira `Conta recuperada` e leva ao login.
- **Não peça a senha de novo** para cancelar. O login acabou de prová-la.
- **Não ofereça "excluir agora"**, antecipar a remoção nem mudar a data limite. A janela é fixa em 30 dias.
- **Não use contagem regressiva em horas, minutos ou segundos**, nem relógio correndo.
- **Não mude o login.** A tela de login continua como está; só o destino depois dela é diferente.

**Formulários e mensagens**

- Nada de mensagem genérica do tipo "Algo deu errado" ou "Erro". Toda mensagem diz o que aconteceu, o estado da exclusão e o que fazer.
- Nada de helper condicional: a linha abaixo de `Sair` é permanente.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela. Newsreader é só corpo de resenha, frases e sinopse.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline e nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão nem em texto de título.
- Nada de tela tingida de `rubi` ou de `ambar`. O `ambar` fica na faixa de prazo e no aviso de acesso expirado; o `rubi`, no banner de erro.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo nem de spinner girando.
- Nada de pulso ou piscar na faixa de prazo terminando.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de label poético ("Que bom te ver de novo", "Bem-vindo de volta"). O título diz o estado da conta.
- Nada de número sem unidade, nada de data abreviada, nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de ilustração, de confete ou de check verde gigante em `Conta recuperada`.
- Nada de toast. Os estados são a própria tela.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de tela mobile centralizada num container estreito sobre fundo vazio. A web usa as duas colunas da família de autenticação.
- Nada de hero de landing, logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
