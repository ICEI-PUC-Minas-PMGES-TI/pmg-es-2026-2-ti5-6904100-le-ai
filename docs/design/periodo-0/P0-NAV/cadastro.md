# P0-NAV · Cadastro

**Feature:** ../../../plano-de-desenvolvimento/periodo-0/feature-P0-NAV.md
**Requisitos:** RF-AUT-01
**Não funcionais:** RNF-SEC-09 (senha com hash), RNF-SEC-27 (mínimo de 8 caracteres), RNF-SEC-43 (recusa menor de 18 anos), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-09 (cold start do servidor tratado como carregamento)
**Regras de negócio:** nenhuma RN se aplica a esta tela
**Versão web:** sim (RF-AUT-01 tem marcação na coluna Web de REQUISITOS.md §5.1)

---

## 1. Contexto

Primeira tela do produto para quem ainda não tem conta. O visitante informa e-mail, nome de usuário, nome de exibição, data de nascimento e senha, e sai dela autenticado, dentro do shell de navegação.

É a porta de entrada dos três mecanismos do produto: sem conta não há registro de leitura, não há meta e não há pertencimento. A tela precisa ser rápida de preencher e explícita nas regras que podem barrar o cadastro, porque duas delas rejeitam o usuário depois do envio: senha curta e idade abaixo de 18 anos.

Entra pelo link "Criar conta" da tela de login, e sai para o shell autenticado em caso de sucesso.

**Escopo desta entrega.** Esta é a versão do período 0, um esqueleto de autenticação. Não existe recuperação de senha, não existe troca de senha, não existe login social e não existe verificação de e-mail. Nada disso é desenhado aqui.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `<Nome da tela> · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

## 3. Dados que aparecem na tela

Campos do formulário, nesta ordem, todos com label acima:

| Campo | Tipo | Exemplo preenchido |
|---|---|---|
| E-mail | texto, teclado de e-mail | `marina.beltrao@gmail.com` |
| Nome de usuário | texto, sem espaço | `marinableu` |
| Nome de exibição | texto livre | `Marina Beltrão` |
| Data de nascimento | data, formato dia/mês/ano | `14/03/1999` |
| Senha | senha com botão de mostrar | seis a dez pontos, nunca texto legível no estado padrão |

O campo de senha carrega um helper visível o tempo todo: `Mínimo de 8 caracteres`.

Nenhum outro dado aparece na tela. Sem contador de usuários, sem depoimento, sem logo de parceiro, sem número de qualquer natureza.

---

## 4. Artboards mobile (390 x 844)

**Estrutura comum a todos os estados mobile.** Fundo `papel`, ocupando a viewport inteira. Padding lateral `space-5` em toda a tela. De cima para baixo:

1. `space-10` de respiro a partir do topo seguro.
2. Wordmark **Lê Ai** em Space Grotesk 600, token `title`, cor `tinta`, alinhado à esquerda. É texto, não é imagem e não é símbolo desenhado.
3. `space-10`.
4. Título **Criar conta** em `display`, cor `tinta`, alinhado à esquerda.
5. `space-8`.
6. Bloco do formulário: cinco campos empilhados, gap `space-5` entre eles. Cada campo é label em `label` `grafite`, `space-2` de gap, e o campo com 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`.
   - O campo de data de nascimento tem `CalendarBlank` (Phosphor, `regular`, 20px, `grafite-suave`) alinhado à direita dentro do campo.
   - O campo de senha tem `Eye` (Phosphor, `regular`, 20px, `grafite`) alinhado à direita dentro do campo, e o helper `Mínimo de 8 caracteres` abaixo em `caption` `grafite`, com `space-2` de gap.
7. `space-8`.
8. Botão primário **Criar conta**, largura total, 48px de altura, `radius-full`, fundo `musgo`, texto `papel` em `body-strong`, centralizado, em uma linha.
9. `space-5`.
10. Linha final centralizada em `body` `grafite`: `Já tem conta?` seguido de `Entrar` em `body-strong` `musgo`, como botão textual.
11. `space-10` de respiro no rodapé.

O conteúdo chega perto do limite da viewport. A tela rola verticalmente quando precisa, e o artboard mostra do topo até a linha final.

### 4.1 Padrão

Formulário vazio. Todos os campos com borda de 1px `linha` e sem texto digitado. Placeholder não aparece em nenhum campo: o label acima já diz o que entra ali. O botão primário está ativo desde o início; a validação acontece no envio, não bloqueando o botão.

### 4.2 Preenchido com foco

Todos os campos preenchidos com os valores da seção 3. O campo **Senha** está em foco: borda de 1.5px `musgo`, o resto dos campos mantém a borda de 1px `linha`. A senha aparece como pontos, com o `Eye` à direita.

### 4.3 Erro de validação

Retorno do servidor com dois campos inválidos ao mesmo tempo. O formulário continua preenchido, sem limpar nada.

- **Data de nascimento** com valor `02/09/2010`: borda de 1.5px `rubi`, mensagem abaixo em `caption` `rubi`: `É necessário ter 18 anos ou mais para criar uma conta.`
- **Senha**: borda de 1.5px `rubi`, mensagem abaixo em `caption` `rubi`: `Use pelo menos 8 caracteres.` O helper `Mínimo de 8 caracteres` continua visível acima da mensagem de erro, porque a regra não deixou de existir.
- Os demais campos permanecem no estado padrão. Nenhum banner no topo: erro de campo mora no campo.

### 4.4 Erro de conflito

O nome de usuário escolhido já existe. Resposta 409 do servidor.

- Banner acima do bloco do formulário, largura total, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `WarningCircle` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, e o texto em `body` `tinta`: `Esse nome de usuário já está em uso. Escolha outro.`
- O campo **Nome de usuário** recebe borda de 1.5px `rubi`.
- `space-6` entre o banner e o primeiro campo.

### 4.5 Enviando, com cold start

O envio está em curso e o servidor está acordando. É o estado de RNF-ERR-09 e ele é carregamento, nunca erro.

- Os cinco campos ficam com a opacidade reduzida e sem foco possível.
- O botão primário mantém o fundo `musgo` e troca o texto para `Criando conta`. Fica desabilitado ao toque.
- Abaixo do botão, `space-3` de gap, uma linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- **Sem spinner, sem barra de progresso indeterminada, sem ponto pulsando.** O sistema não tem indicador em loop.

---

## 5. Artboards web (1440 x 900)

Layout de duas colunas, ocupando a viewport inteira. Não é a tela mobile centralizada num container estreito sobre fundo vazio.

**Coluna esquerda**, 44% da largura, altura total, fundo `papel-elevado`, padding horizontal `space-16`, conteúdo alinhado à esquerda e centralizado na vertical:

- Wordmark **Lê Ai** em Space Grotesk 600, token `display`, cor `tinta`.
- `space-6`.
- Frase em `title-lg` `tinta`: `Registre suas leituras e acompanhe as de quem você segue.`
- `space-4`.
- Linha de apoio em `body` `grafite`: `Estante, progresso, resenhas e feed em um lugar só.`
- Nada mais nesta coluna. Sem imagem, sem ilustração, sem logo de parceiro, sem faixa de palavras em maiúsculas, sem depoimento, sem número.

**Coluna direita**, 56% da largura, fundo `papel`, conteúdo centralizado na horizontal e na vertical, dentro de uma coluna de no máximo 420px de largura:

- Título **Criar conta** em `display` `tinta`.
- `space-6`.
- Os mesmos cinco campos da seção 4, com 44px de altura em vez de 48px, gap `space-5`.
- `space-8`.
- Botão primário **Criar conta**, largura total da coluna, 40px de altura, `radius-full`, fundo `musgo`, texto `papel`.
- `space-5`.
- Linha final `Já tem conta? Entrar`, alinhada à esquerda dentro da coluna.

**Estados de ponteiro e teclado**, que o mobile não tem e a web precisa mostrar:

- `hover` no botão primário: fundo passa de `musgo` para `musgo-vivo` em `dur-fast`.
- `hover` no botão textual `Entrar`: sublinhado.
- Foco de teclado visível em todo campo e em todo botão: borda de 1.5px `musgo`. A ordem de tabulação segue a ordem visual dos campos.

**Comportamento responsivo.** A coluna esquerda desaparece abaixo de 768px e o formulário passa a ocupar a coluna única, com padding lateral `space-5` e as medidas de mobile. Os dois artboards são os dois extremos do mesmo componente responsivo, não dois produtos.

### 5.1 Padrão

Formulário vazio, as duas colunas completas.

### 5.2 Erro de validação

Os mesmos dois erros de 4.3, com as mensagens inline nos campos de data de nascimento e senha. A coluna esquerda não muda.

### 5.3 Enviando, com cold start

O mesmo tratamento de 4.5: campos com opacidade reduzida, botão com o texto `Criando conta` e a linha `O servidor está iniciando. Isso pode levar alguns segundos.` abaixo dele.

---

## 6. Artboards em modo escuro

Dois artboards, um por plataforma, no estado padrão.

- **Mobile, padrão.** Fundo `noite`. Wordmark e título em `papel-suave`. Label em `grafite-claro`. Campo com fundo `noite-elevada`, que é **mais claro** que o fundo da tela, e borda de 1px `linha-noite`. Helper em `grafite-claro`. Botão primário com fundo `musgo-claro` e texto `noite`. Botão textual `Entrar` em `musgo-claro`.
- **Web, padrão.** Coluna esquerda em `noite-elevada` sobre a coluna direita em `noite`. O mesmo tratamento de campo e de botão do mobile.

Em ambos, os shadows ficam com metade da opacidade: a hierarquia vem da diferença de superfície e do divisor `linha-noite`, não da sombra.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de formulário com label acima, foco, erro e helper | documento-de-design §4.2 |
| Botão primário (pill, `musgo`) e botão textual | documento-de-design §4.1 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, pesos e tamanhos | documento-de-design §6 |

**Componente que ainda não existe na fonte:** o **wordmark** da marca. O `documento-de-design.md` §10 fixa o nome do produto, mas não define logo. Até existir um, o wordmark é o texto `Lê Ai` em Space Grotesk 600. Não desenhe símbolo, monograma nem lettering customizado.

---

## 8. Copy completa

Todo o texto visível da tela, literal, em pt-BR, sem em-dash e sem emoji.

| Onde | Texto |
|---|---|
| Wordmark | `Lê Ai` |
| Título | `Criar conta` |
| Label 1 | `E-mail` |
| Label 2 | `Nome de usuário` |
| Label 3 | `Nome de exibição` |
| Label 4 | `Data de nascimento` |
| Label 5 | `Senha` |
| Helper da senha | `Mínimo de 8 caracteres` |
| Erro de senha curta | `Use pelo menos 8 caracteres.` |
| Erro de idade | `É necessário ter 18 anos ou mais para criar uma conta.` |
| Erro de conflito | `Esse nome de usuário já está em uso. Escolha outro.` |
| Botão primário | `Criar conta` |
| Botão primário enviando | `Criando conta` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Rodapé | `Já tem conta?` seguido do botão textual `Entrar` |
| Web, frase da coluna esquerda | `Registre suas leituras e acompanhe as de quem você segue.` |
| Web, linha de apoio | `Estante, progresso, resenhas e feed em um lugar só.` |

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo em ambos os temas. `grafite-suave` aparece só no ícone do campo de data, nunca em texto de corpo nem em informação essencial.
- Alvo de toque mínimo de 48px em todo elemento interativo no mobile: campo, botão de mostrar senha, botão primário e botão textual.
- Cada mensagem de erro fica **junto do campo** que a causou, para que a associação seja óbvia sem depender de cor. O ícone e o texto do banner de conflito carregam a informação, e a cor apenas reforça.
- Foco de teclado visível na web em todo campo e botão, na ordem visual.
- O botão de mostrar senha alterna entre `Eye` e `EyeSlash` (Phosphor, `regular`), e é o único ponto em que a senha vira texto legível.
- `prefers-reduced-motion` respeitado: as transições de foco e de hover viram estáticas.
- Nenhuma ação desta tela é destrutiva, então não há modal de confirmação.

---

## 10. O que não fazer nesta tela

**Específico do cadastro**

- Não desenhe **login social** com Google, Apple ou qualquer outro provedor. Está fora de escopo por decisão de produto.
- Não desenhe **verificação de e-mail** nem tela de confirmação por código.
- Não desenhe **medidor de força de senha** com barra colorida. A regra é uma só: mínimo de 8 caracteres, e ela vive no helper.
- Não desenhe **aceite de termos** com checkbox. Não existe esse fluxo nesta entrega.
- Não use placeholder no lugar de label em nenhum campo.
- Não esconda o helper da senha até o erro acontecer.
- Não desenhe um símbolo, monograma ou lettering para a marca. O wordmark é texto.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. Esta tela não é nenhum deles.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando. Carregamento é skeleton estático com um único fade.

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
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.

**Formulário**

- Nada de placeholder no lugar de label.
- Nada de helper que só aparece depois do erro.
- Nada de campo de senha sem o botão de mostrar.
- Nada de validação que só existe no cliente: a mensagem reflete a regra que o servidor aplica.
