# P0-NAV · Login

**Feature:** ../../../plano-de-desenvolvimento/periodo-0/feature-P0-NAV.md
**Requisitos:** RF-AUT-02 (autenticar por e-mail ou nome de usuário), RF-AUT-03 (emissão de token, subconjunto)
**Não funcionais:** RNF-SEC-17 (rate limiting em autenticação), RNF-SEC-28 (bloqueio progressivo após falhas), RNF-SEC-29 (resposta que não revela se a conta existe), RNF-USA-03, RNF-USA-05, RNF-ERR-09
**Regras de negócio:** nenhuma RN se aplica a esta tela
**Versão web:** sim (RF-AUT-02 e RF-AUT-03 têm marcação na coluna Web de REQUISITOS.md §5.1)

---

## 1. Contexto

Tela de entrada de quem já tem conta. Um campo aceita **e-mail ou nome de usuário**, o outro a senha, e o retorno é a sessão que abre o shell autenticado.

Duas regras de segurança moldam o desenho e não podem ser suavizadas por gosto visual:

- A mensagem de credencial inválida **não revela** se o e-mail ou o nome de usuário existe (RNF-SEC-29). Uma única mensagem cobre os três casos: e-mail errado, usuário errado e senha errada.
- Depois de tentativas seguidas, o acesso é bloqueado por um tempo (RNF-SEC-28). Isso é um estado de **alerta**, não de erro: o usuário não fez nada inválido, ele só precisa esperar.

Entra pelo link "Criar conta" invertido da tela de cadastro, e é para onde a guarda de rota manda quem chega sem sessão.

**Escopo desta entrega.** Esqueleto de autenticação do período 0. Não existe recuperação de senha nesta tela: RF-AUT-04 pertence a F-AUT, no período 1. Também não existe login de administrador com tela própria, login social nem "manter conectado".

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

| Campo | Tipo | Exemplo preenchido |
|---|---|---|
| E-mail ou nome de usuário | texto, um único campo aceitando as duas formas | `marinableu` |
| Senha | senha com botão de mostrar | seis a dez pontos, nunca texto legível no estado padrão |

Nenhum outro dado. Sem contador, sem depoimento, sem número de qualquer natureza.

---

## 4. Artboards mobile (390 x 844)

**Estrutura comum a todos os estados mobile.** Fundo `papel`, ocupando a viewport inteira. Padding lateral `space-5`. De cima para baixo:

1. `space-12` de respiro a partir do topo seguro.
2. Wordmark **Lê Ai** em Space Grotesk 600, token `title`, cor `tinta`, alinhado à esquerda. Texto, nunca símbolo desenhado.
3. `space-12`.
4. Título **Entrar** em `display`, cor `tinta`, alinhado à esquerda.
5. `space-8`.
6. Dois campos empilhados com gap `space-5`. Cada um é label em `label` `grafite`, `space-2` de gap, e campo com 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`.
   - O campo de senha tem `Eye` (Phosphor, `regular`, 20px, `grafite`) alinhado à direita dentro do campo.
7. `space-8`.
8. Botão primário **Entrar**, largura total, 48px de altura, `radius-full`, fundo `musgo`, texto `papel` em `body-strong`, em uma linha.
9. `space-5`.
10. Linha final centralizada em `body` `grafite`: `Ainda não tem conta?` seguido de `Criar conta` em `body-strong` `musgo`, como botão textual.

A tela tem folga vertical de sobra. O bloco inteiro fica acima da dobra, sem rolagem.

### 4.1 Padrão

Os dois campos vazios, borda de 1px `linha`, sem placeholder. O botão primário ativo.

### 4.2 Credencial inválida

O usuário enviou e a combinação não confere. A mensagem é **uma só** e não diz qual dos dois falhou.

- Banner acima do bloco dos campos, largura total, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `WarningCircle` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, e o texto em `body` `tinta`: `E-mail, nome de usuário ou senha incorretos.`
- `space-6` entre o banner e o primeiro campo.
- Os **dois** campos recebem borda de 1.5px `rubi`, porque não se sabe qual está errado. Nenhuma mensagem inline abaixo dos campos: repetir o texto do banner em cada campo seria dizer duas vezes a mesma coisa.
- O campo de e-mail ou nome de usuário mantém o valor digitado. O campo de senha é limpo.

### 4.3 Bloqueio progressivo

Tentativas seguidas dispararam o bloqueio temporário (RNF-SEC-28). Isto é **alerta**, não erro, e usa a cor de alerta do sistema.

- Banner acima do bloco dos campos, fundo `ambar-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `ambar`) à esquerda e o texto em `body` `tinta`: `Muitas tentativas. Tente de novo em alguns minutos.`
- Os campos voltam à borda de 1px `linha`, sem estado de erro: não é o conteúdo deles que está errado.
- O botão primário fica desabilitado, com opacidade reduzida, mantendo o texto `Entrar`.
- Sem contagem regressiva animada. Se um tempo for exibido, é texto estático.

### 4.4 Entrando, com cold start

O envio está em curso e o servidor está acordando. Estado de RNF-ERR-09: carregamento, nunca erro.

- Os dois campos ficam com opacidade reduzida e sem foco possível.
- O botão primário mantém o fundo `musgo` e troca o texto para `Entrando`. Fica desabilitado ao toque.
- Abaixo do botão, `space-3` de gap, uma linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- **Sem spinner, sem barra indeterminada, sem ponto pulsando.**

---

## 5. Artboards web (1440 x 900)

Mesma estrutura de duas colunas do cadastro, deliberadamente: as duas telas de autenticação precisam ser reconhecíveis como a mesma família.

**Coluna esquerda**, 44% da largura, altura total, fundo `papel-elevado`, padding horizontal `space-16`, conteúdo alinhado à esquerda e centralizado na vertical:

- Wordmark **Lê Ai** em Space Grotesk 600, token `display`, cor `tinta`.
- `space-6`.
- Frase em `title-lg` `tinta`: `Registre suas leituras e acompanhe as de quem você segue.`
- `space-4`.
- Linha de apoio em `body` `grafite`: `Estante, progresso, resenhas e feed em um lugar só.`
- Nada mais. Sem imagem, sem ilustração, sem logo de parceiro, sem faixa de palavras em maiúsculas.

**Coluna direita**, 56% da largura, fundo `papel`, conteúdo centralizado nos dois eixos numa coluna de no máximo 420px:

- Título **Entrar** em `display` `tinta`.
- `space-6`.
- Os dois campos com 44px de altura, gap `space-5`.
- `space-8`.
- Botão primário **Entrar**, largura total da coluna, 40px de altura, `radius-full`.
- `space-5`.
- Linha final `Ainda não tem conta? Criar conta`, alinhada à esquerda dentro da coluna.

**Estados de ponteiro e teclado:** `hover` no botão primário levando `musgo` para `musgo-vivo` em `dur-fast`; `hover` no botão textual com sublinhado; foco de teclado visível com borda de 1.5px `musgo` em campo e botão, na ordem visual.

**Comportamento responsivo.** A coluna esquerda desaparece abaixo de 768px e o formulário passa a ocupar a coluna única com padding lateral `space-5` e as medidas de mobile. Os dois artboards são os dois extremos do mesmo componente responsivo.

### 5.1 Padrão

Campos vazios, as duas colunas completas.

### 5.2 Credencial inválida

O mesmo banner em `rubi-fundo` de 4.2 acima dos campos, com os dois campos em borda de 1.5px `rubi` e a senha limpa.

### 5.3 Entrando, com cold start

O mesmo tratamento de 4.4: campos com opacidade reduzida, botão com texto `Entrando` e a linha de aviso abaixo dele.

---

## 6. Artboards em modo escuro

Dois artboards, um por plataforma, no estado padrão.

- **Mobile, padrão.** Fundo `noite`. Wordmark e título em `papel-suave`. Label em `grafite-claro`. Campo com fundo `noite-elevada`, **mais claro** que o fundo da tela, e borda de 1px `linha-noite`. Botão primário com fundo `musgo-claro` e texto `noite`. Botão textual `Criar conta` em `musgo-claro`.
- **Web, padrão.** Coluna esquerda em `noite-elevada` sobre a coluna direita em `noite`, com o mesmo tratamento de campo e botão.

Os banners de erro e de alerta, quando aparecem no escuro, usam `rubi-fundo-escuro` com ícone `rubi-claro` e `ambar-fundo-escuro` com ícone `ambar-claro`, e o texto em `papel-suave`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de formulário com label acima, foco e erro | documento-de-design §4.2 |
| Botão primário (pill, `musgo`) e botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` e banner de alerta em `ambar-fundo` | documento-de-design §3.1.3 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, pesos e tamanhos | documento-de-design §6 |

**Componente que ainda não existe na fonte:** o **wordmark** da marca, pelo mesmo motivo descrito no prompt de cadastro. Até existir um logo, é o texto `Lê Ai` em Space Grotesk 600.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Wordmark | `Lê Ai` |
| Título | `Entrar` |
| Label 1 | `E-mail ou nome de usuário` |
| Label 2 | `Senha` |
| Erro de credencial | `E-mail, nome de usuário ou senha incorretos.` |
| Alerta de bloqueio | `Muitas tentativas. Tente de novo em alguns minutos.` |
| Botão primário | `Entrar` |
| Botão primário enviando | `Entrando` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Rodapé | `Ainda não tem conta?` seguido do botão textual `Criar conta` |
| Web, frase da coluna esquerda | `Registre suas leituras e acompanhe as de quem você segue.` |
| Web, linha de apoio | `Estante, progresso, resenhas e feed em um lugar só.` |

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo nos dois temas.
- Alvo de toque mínimo de 48px no mobile em campo, botão de mostrar senha, botão primário e botão textual.
- O banner de erro e o de alerta carregam **ícone e texto**, não só cor: a diferença entre erro e alerta continua legível para quem não distingue vermelho de âmbar.
- Foco de teclado visível na web em campo e botão, na ordem visual.
- O botão de mostrar senha alterna entre `Eye` e `EyeSlash` (Phosphor, `regular`).
- `prefers-reduced-motion` respeitado: transições de foco e hover viram estáticas.
- Nenhuma ação desta tela é destrutiva.

---

## 10. O que não fazer nesta tela

**Específico do login**

- **Não desenhe "Esqueci minha senha".** A recuperação de senha é RF-AUT-04 e pertence a F-AUT, no período 1. `feature-P0-NAV.md` diz que este esqueleto não pode contradizer F-AUT, e um link que não leva a lugar nenhum contradiz. O link entra quando F-AUT entrar.
- Não desenhe **login social** com Google, Apple ou qualquer provedor.
- Não desenhe **"manter conectado"** nem checkbox de sessão persistente.
- Não desenhe **tela separada de administrador**. RF-AUT-08 usa o mesmo fluxo, e a distinção é de credencial, não de interface.
- Não escreva mensagem que revele se o e-mail ou o nome de usuário existe, do tipo `Usuário não encontrado` ou `Senha incorreta`. Isso quebra RNF-SEC-29.
- Não trate o bloqueio por tentativas como erro em `rubi`. É alerta em `ambar`.
- Não use placeholder no lugar de label.
- Não desenhe símbolo, monograma ou lettering para a marca. O wordmark é texto.

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
