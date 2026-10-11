# Login (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Login`, gerado por `docs/design/periodo-0/P0-NAV/login.md` e editado por `docs/design/periodo-1/F-AUT/login.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-AUT/login.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-MOD-OPC.md
**Requisitos que entram:**
- F-MOD-OPC: RF-MOD-04 (conta suspensa não autentica: o login e a renovação da sessão são negados com mensagem clara; no app, a sessão de uma conta suspensa termina em logout com a mensagem)

**Não funcionais:** RNF-USA-05 (mensagem pt-BR clara, sem detalhe técnico), RNF-SEC-29 (a tela não ajuda a descobrir quais contas existem), RNF-SEC-30 (sessão revogada na suspensão), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** nenhuma RN nova. RN-23.3 (login de conta com exclusão pendente leva à recuperação) continua valendo e é citada na seção 1 para separar os dois casos.
**Versão web:** sim. RF-MOD-04 tem marcação na coluna Web de `REQUISITOS.md` §5.11, e o login é o mesmo nas duas plataformas.

---

## 1. O que muda e por quê

A F-MOD-OPC dá ao administrador a suspensão de conta. Do lado do leitor suspenso, o efeito aparece **só nesta tela**: a conta não entra mais, e ele precisa saber por quê sem que a tela vire uma porta para descobrir contas alheias.

Entram **três estados**, todos com o mesmo banner novo:

| Estado | Quando | Plataforma |
|---|---|---|
| `Conta suspensa` | O leitor digitou identificador e senha **corretos** de uma conta suspensa | mobile e web |
| `Sessão encerrada por suspensão` | O app estava aberto com sessão válida, a conta foi suspensa e o servidor negou a renovação: o app faz logout e cai aqui | mobile |
| `Conta suspensa, modo escuro` | O primeiro estado no escuro | mobile |

**A regra que molda o desenho: só quem acerta a senha descobre a suspensão.** Com senha errada, a resposta continua sendo a única mensagem de credencial inválida do Período 0, igual para conta inexistente, conta ativa e conta suspensa. A mensagem de suspensão só aparece depois de identificador e senha conferirem, para o dono da conta. Assim ela não ajuda a enumerar contas (RNF-SEC-29), como pede o arquivo da feature.

**Suspensão não é erro de digitação nem bloqueio por tentativas.** O leitor não fez nada errado nesta tentativa e esperar não resolve: é um estado da conta, decidido pela moderação. Por isso o banner novo não é o `rubi-fundo` da credencial inválida nem repete o texto do bloqueio progressivo. Ele usa a cor de **alerta** (`ambar-fundo`) com um ícone próprio, `Prohibit`, e os campos ficam sem estado de erro.

**Conta suspensa e conta com exclusão pendente** (F-CONTA-2): com credenciais corretas, a exclusão pendente leva à tela `Recuperar conta`; a suspensa fica no login com o banner. Se as duas valem ao mesmo tempo, **a suspensão prevalece**: o leitor vê o banner e não chega à recuperação. Proposta deste prompt, para ratificar com os donos de F-MOD-OPC e F-CONTA-2 (seção 10).

**Recuperar a senha não contorna a suspensão** (arquivo da feature): `Esqueci minha senha` continua acionável e leva ao mesmo fluxo, mas depois de redefinir a senha o login continua mostrando o banner. Nenhum artboard muda por isso.

**O que deixa de valer do prompt anterior:** nada. A seção 10 do prompt do Período 1 e a do Período 0 não falavam de suspensão; todas as proibições continuam. A mensagem de credencial inválida e a do bloqueio progressivo não mudam uma vírgula.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado. Os novos entram **no fim da linha de cada tipo**, sem reordenar os existentes:

- **Linha 1, mobile `390 x 844`:** depois de `Login · Entrando, com cold start`, os novos `Login · Conta suspensa` e `Login · Sessão encerrada por suspensão`.
- **Linha 2, web `1440 x 900`:** depois do último artboard web existente, o novo `Login · Conta suspensa (web)`.
- **Linha 3, modo escuro:** depois dos existentes, o novo `Login · Modo escuro, conta suspensa (mobile)`.
- Rótulo acima no formato `Login · <estado>`, viewport abaixo. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.

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
gradiente em texto, sem sombra preta pura. Nesta tela, ambar aparece no
bloqueio progressivo e na conta suspensa; rubi só na credencial inválida.

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

BANNER INLINE
Largura total do bloco do formulário, radius 12, padding space-4, ícone de
20px à esquerda com space-3 de gap, texto em body tinta (papel-suave no
escuro). Erro: fundo rubi-fundo e ícone rubi (rubi-fundo-escuro e rubi-claro
no escuro). Alerta: fundo ambar-fundo e ícone ambar (ambar-fundo-escuro e
ambar-claro no escuro). O banner carrega ícone e texto, nunca só cor.

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

Não redesenhe nada desta lista. Se um artboard não for citado na seção 4 ou na 5, ele fica exatamente como está no canvas.

- **Todos os artboards existentes**, nas três linhas, sem nenhuma alteração: padrão, credencial inválida, bloqueio progressivo, entrando com cold start, as duas versões web e os dois de modo escuro.
- **A estrutura do mobile:** wordmark `Lê Ai` em texto, título `Entrar`, os dois campos, `Esqueci minha senha` alinhado à direita abaixo da senha, o botão primário `Entrar` e a linha final `Ainda não tem conta? Criar conta`, com os mesmos espaçamentos.
- **As duas colunas da web**, com a frase e a linha de apoio da coluna esquerda inalteradas.
- **A copy inteira já existente**, palavra por palavra: `E-mail, nome de usuário ou senha incorretos.`, `Muitas tentativas. Tente de novo em alguns minutos.`, `Entrando`, `O servidor está iniciando. Isso pode levar alguns segundos.`, `Esqueci minha senha`.
- **A ausência de shell:** login continua sem barra inferior, sem sidebar e sem sino.

**Mocks:** a conta suspensa é a de **Sérgio Valadares**, identificador `svaladares`, suspensa pela moderação em 11 de outubro de 2026 (a mesma conta das edições do Período 3 de `perfil-de-outro-leitor` e `painel-de-moderacao`). Os artboards **não mostram** o nome, a data nem o motivo da suspensão: a tela só diz o estado.

---

## 4. Artboards que mudam

**Nenhum.** Todos os artboards existentes ficam como estão. A mudança é só de artboards novos, na seção 5.

---

## 5. Artboards novos

### O banner de conta suspensa, descrito uma vez (nasce aqui)

Banner inline de **alerta**, no mesmo lugar e com o mesmo desenho dos banners do Período 0: acima do bloco dos campos, largura total, `space-6` até o primeiro campo.

- Fundo `ambar-fundo`, `radius` 12, padding `space-4`.
- `Prohibit` (Phosphor, `regular`, 20px, `ambar`) à esquerda, `space-3` de gap.
- Texto em duas partes, empilhadas com `space-1` de gap:
  - Primeira linha em `body-strong` `tinta`: o estado.
  - Segunda parte em `body` `tinta`: o que isso significa.
- Sem botão dentro do banner, sem `X` para fechar, sem link. Não existe canal de contestação no produto, e o banner não promete um.

### Linha 1, mobile, depois de `Login · Entrando, com cold start`

#### `Login · Conta suspensa`

O leitor digitou `svaladares` e a senha certa. O servidor negou a sessão porque a conta está suspensa.

- Estrutura mobile completa, sem mudança de posição: wordmark, título `Entrar`, banner, campos, `Esqueci minha senha`, `Entrar`, linha final.
- **Banner de conta suspensa** acima dos campos:
  - `Esta conta está suspensa.`
  - `A moderação do Lê Ai suspendeu o acesso. Enquanto isso, ninguém consegue entrar nela, e os dados continuam guardados.`
- Campo de identificador **mantém** `svaladares`, com borda de 1px `linha`, sem estado de erro: o que foi digitado está certo.
- Campo de senha **limpo**, borda de 1px `linha`.
- Botão `Entrar` **habilitado**: nada impede uma nova tentativa, que vai dar a mesma resposta. Não há bloqueio de tempo.
- `Esqueci minha senha` e `Criar conta` habilitados.

#### `Login · Sessão encerrada por suspensão`

O app estava aberto na estante. A conta foi suspensa; o servidor negou a renovação da sessão; o app fez logout **uma vez**, sem tentar de novo, e abriu o login.

- Estrutura mobile completa. **Os dois campos vazios**: o logout limpou a sessão e o identificador não é preenchido.
- **Banner de conta suspensa** acima dos campos, com a primeira linha diferente:
  - `Sua sessão foi encerrada porque esta conta foi suspensa.`
  - `A moderação do Lê Ai suspendeu o acesso. Enquanto isso, ninguém consegue entrar nela, e os dados continuam guardados.`
- Botão `Entrar` habilitado.
- Sem toast, sem dialog, sem tela intermediária: o leitor chega direto ao login com o banner, e nenhuma parte do shell aparece.
- Na web, o mesmo comportamento vale quando a renovação é negada com a página aberta: logout e login com este banner. Fica **declarado, sem artboard**.

### Linha 2, web, depois do último artboard web existente

#### `Login · Conta suspensa (web)`

O equivalente web de `Login · Conta suspensa`.

- As duas colunas como sempre: coluna esquerda em `papel-elevado` com wordmark, frase e linha de apoio; coluna direita em `papel` com a coluna de 420px.
- Na coluna direita, o **banner de conta suspensa** acima dos campos, na largura da coluna, com as duas partes do texto do estado `Conta suspensa`.
- Identificador `svaladares` mantido, senha limpa, campos com borda de 1px `linha` e 44px de altura, `Esqueci minha senha`, `Entrar` habilitado com 40px, e a linha final.
- Foco de teclado: depois do envio, o foco vai para o banner, que é anunciado; em seguida a ordem de tabulação segue a ordem visual.

### Linha 3, modo escuro, depois dos existentes

#### `Login · Modo escuro, conta suspensa (mobile)`

Equivalente a `Login · Conta suspensa`.

- Fundo `noite`. Wordmark e título em `papel-suave`. Labels em `grafite-claro`. Campos em `noite-elevada`, mais claros que o fundo, com borda de 1px `linha-noite` e texto `papel-suave`.
- Banner em `ambar-fundo-escuro`, `Prohibit` em `ambar-claro`, as duas partes do texto em `papel-suave`.
- `Esqueci minha senha` e `Criar conta` em `musgo-claro`; `Entrar` com fundo `musgo-claro` e texto `noite`.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Banner inline de alerta em `ambar-fundo` | `periodo-0/P0-NAV/login.md` (bloqueio progressivo), documento-de-design §3.1.3 |
| Formulário de login com `Esqueci minha senha` | `periodo-0/P0-NAV/login.md` e `periodo-1/F-AUT/login.md` |

**Nasce aqui** e vira pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Banner de estado de conta** no login: alerta em `ambar-fundo` com `Prohibit`, texto em duas partes (estado em `body-strong`, significado em `body`), sem ação. É distinto do banner de credencial inválida (erro, `rubi`, `WarningCircle`) e do de bloqueio progressivo (alerta, `Warning`, uma linha).

---

## 8. Copy nova ou alterada

| Onde | Texto que entra | Texto que sai |
|---|---|---|
| Banner, conta suspensa, primeira linha | `Esta conta está suspensa.` | nada, o estado não existia |
| Banner, sessão encerrada, primeira linha | `Sua sessão foi encerrada porque esta conta foi suspensa.` | nada |
| Banner, segunda parte (os dois casos) | `A moderação do Lê Ai suspendeu o acesso. Enquanto isso, ninguém consegue entrar nela, e os dados continuam guardados.` | nada |

Nenhuma copy existente é substituída. A credencial inválida continua `E-mail, nome de usuário ou senha incorretos.` também para conta suspensa com senha errada. Zero em-dash. Zero emoji.

---

## 9. Acessibilidade e interação do que muda

- **Anúncio:** o banner de conta suspensa é uma região de alerta anunciada quando aparece, com o texto inteiro, nas duas plataformas. Na web, o foco vai para ele depois do envio; no mobile, o leitor de tela lê o banner ao abrir o estado.
- **Sem depender de cor:** o banner tem ícone (`Prohibit`, diferente do `Warning` do bloqueio e do `WarningCircle` do erro) e texto que nomeia o estado.
- **Campos sem erro:** como o que foi digitado está certo, os campos não são anunciados como inválidos.
- **Sessão encerrada:** o logout acontece uma vez, sem loop de retentativa; o banner explica por que o leitor saiu, em vez de uma volta silenciosa ao login.
- **Contraste:** `tinta` sobre `ambar-fundo` no claro e `papel-suave` sobre `ambar-fundo-escuro` no escuro passam em AA.
- **Alvo de toque** de 48px mantido em todos os controles do mobile.
- `prefers-reduced-motion` respeitado: o banner entra sem transição sob reduce.

---

## 10. O que não fazer nesta edição

**Regra da edição**

- **Não redesenhe o que não foi citado.** Nenhum artboard existente muda de posição, de tamanho ou de conteúdo.
- **Não reordene os artboards** no canvas. Os novos entram no fim de cada linha.
- **Não reintroduza nada que as seções 10 dos prompts do Período 0 e do Período 1 proíbem.**
- Não altere nenhuma copy existente.

**Específico da suspensão**

- **Não mostre a suspensão a quem errou a senha.** Senha errada em conta suspensa recebe a mensagem de credencial inválida, como qualquer outra conta.
- Não mostre o motivo, a data, o nome do administrador nem quanto tempo falta. A suspensão não tem prazo e o motivo é da auditoria.
- Não desenhe botão de contestar, link de suporte, e-mail de contato nem formulário de recurso: o produto não tem esse canal.
- Não use `rubi` nem `WarningCircle` no banner de suspensão: não é erro de digitação.
- Não desabilite o botão `Entrar` nem mostre contagem regressiva: suspensão não é bloqueio por tentativas.
- Não leve a conta suspensa à tela `Recuperar conta`, mesmo com exclusão pendente (proposta da seção 1, a ratificar).
- Não desenhe tela própria de conta suspensa, dialog nem toast: o estado mora no login.
- Não acrescente "manter conectado", "lembrar de mim", login social nem dois fatores.

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
- Nada de tom punitivo ou jurídico ("violação", "banido", "infração").
- Nada de label poético. O banner diz o estado.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários ou entre administrador e leitor.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem tela própria de login de administrador.
- Sem leitura de e-book dentro do aplicativo.
