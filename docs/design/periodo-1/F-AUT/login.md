# F-AUT · Login (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Login`, gerado por `docs/design/periodo-0/P0-NAV/login.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-0/P0-NAV/login.md
**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-AUT.md
**Requisitos que entram:** RF-AUT-04 (solicitar recuperação de senha por e-mail)
**Não funcionais:** RNF-USA-03 (contraste WCAG AA), RNF-SEC-28 (a recuperação não revela se a conta existe, e a porta de entrada dela também não)
**Regras de negócio:** nenhuma RN se aplica a esta tela
**Versão web:** sim (RF-AUT-04 tem marcação na coluna Web de `REQUISITOS.md` §5.1)

---

## 1. O que muda e por quê

Entra **uma coisa só**: o botão textual `Esqueci minha senha`, que leva à tela de recuperação.

O prompt original proibia esse link com uma razão explícita, registrada na seção 10 dele: no período 0 a recuperação de senha não existia, e um link que não leva a lugar nenhum contradiz o requisito. Com F-AUT, RF-AUT-04 entra e o destino passa a existir, em [`recuperar-senha.md`](recuperar-senha.md). **A proibição da seção 10 do prompt original deixa de valer neste ponto específico, e só neste.** Todas as outras continuam.

Nada mais muda. A tela não ganha "manter conectado", não ganha login social, não ganha tela própria de administrador e não muda uma vírgula das mensagens de credencial inválida e de bloqueio progressivo.

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

## 3. O que permanece intocado

Não redesenhe nada do que está nesta lista. Se um artboard não for citado na seção 4 ou na 5, ele fica exatamente como está no canvas.

- **A estrutura de todos os estados mobile:** wordmark, título `Entrar`, os dois campos, o botão primário e a linha final `Ainda não tem conta? Criar conta`, com os mesmos espaçamentos.
- **As duas colunas da web**, com a frase e a linha de apoio da coluna esquerda inalteradas.
- **A copy inteira já existente**, palavra por palavra, inclusive `E-mail, nome de usuário ou senha incorretos.`, `Muitas tentativas. Tente de novo em alguns minutos.`, `Entrando` e `O servidor está iniciando. Isso pode levar alguns segundos.`
- **Os estados de erro e de alerta**, com os mesmos banners, as mesmas cores e o mesmo comportamento dos campos.
- **O estado de cold start**, sem spinner.
- **O tratamento de modo escuro** dos artboards existentes.
- **A ausência de shell:** login continua sem barra inferior, sem sidebar e sem sino.

---

## 4. Artboards que mudam

Em todos eles, o acréscimo é o mesmo e entra no mesmo lugar: **abaixo do campo de senha, antes do botão primário.**

- Botão textual `Esqueci minha senha` em `body-strong` `musgo`, **alinhado à direita**, na largura do campo.
- `space-3` de gap entre o campo de senha e o botão textual, e o `space-8` que já existia passa a ficar entre o botão textual e o botão primário `Entrar`.
- Alvo de toque de 48px no mobile, mesmo que o texto ocupe menos.
- Sem ícone, sem sublinhado no estado padrão, sem caixa alta.

### Login · Padrão (mobile)

Entra o botão textual `Esqueci minha senha` alinhado à direita, abaixo do campo de senha. O resto do artboard fica idêntico.

### Login · Credencial inválida (mobile)

Entra o mesmo botão textual, no mesmo lugar. **O banner em `rubi-fundo` continua acima dos campos, com a mesma frase**, e os dois campos continuam com borda de 1.5px `rubi`. Este é o artboard em que o link mais importa, porque é onde o leitor descobre que não lembra a senha: ele fica visível sem rolagem, logo abaixo do campo.

### Login · Bloqueio progressivo (mobile)

Entra o mesmo botão textual. **Ele continua acionável** mesmo com o botão primário `Entrar` desabilitado: o bloqueio é da tentativa de login, não da recuperação. O banner em `ambar-fundo` permanece.

### Login · Entrando, com cold start (mobile)

Entra o mesmo botão textual, com opacidade reduzida e sem foco possível, junto dos campos, enquanto o envio está em curso.

### Login · Padrão (web)

Na coluna direita, entra o botão textual `Esqueci minha senha` alinhado à direita da coluna de 420px, abaixo do campo de senha. Ganha `hover` com sublinhado, em `dur-fast`, e foco de teclado visível, entrando na ordem de tabulação entre o campo de senha e o botão `Entrar`.

### Login · Credencial inválida (web)

O mesmo acréscimo da coluna direita, com o banner e as bordas de erro inalterados.

### Login · Modo escuro, mobile padrão

Entra o botão textual em `musgo-claro`, no mesmo lugar e com o mesmo alinhamento.

### Login · Modo escuro, web padrão

Entra o botão textual em `musgo-claro` na coluna direita.

---

## 5. Artboards novos

Nenhum. A recuperação de senha tem prompt e canvas próprios, em [`recuperar-senha.md`](recuperar-senha.md), e não é desenhada aqui.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

Nenhum componente novo. O botão textual já está definido no `documento-de-design.md` §4.1 e já é usado nesta tela, na linha `Criar conta`.

**Nada nasce aqui**, portanto não há pendência de incorporação ao `documento-de-design.md` vinda desta edição.

---

## 8. Copy nova ou alterada

| Onde | Texto que entra | Texto que sai |
|---|---|---|
| Botão textual abaixo do campo de senha | `Esqueci minha senha` | nada, o elemento não existia |

Nenhuma copy existente é substituída. Zero em-dash. Zero emoji.

---

## 9. Acessibilidade e interação do que muda

- Alvo de toque de 48px no mobile no botão textual, mesmo com o texto curto.
- Foco de teclado visível na web, com a ordem de tabulação seguindo a ordem visual: identificador, senha, `Esqueci minha senha`, `Entrar`, `Criar conta`.
- O botão textual é distinguível do corpo **sem depender só de cor**: ele usa `body-strong`, com peso 600, além do `musgo`.
- Contraste WCAG AA nos dois temas: `musgo` sobre `papel` no claro e `musgo-claro` sobre `noite` no escuro.
- No estado de bloqueio progressivo, o botão textual continua acionável e não é anunciado como desabilitado.
- `prefers-reduced-motion` respeitado: o sublinhado de hover aparece sem transição.

---

## 10. O que não fazer nesta edição

**Regra da edição**

- **Não redesenhe o que não foi citado.** Nenhum artboard existente muda de posição, de tamanho ou de conteúdo além do acréscimo descrito na seção 4.
- **Não reordene os artboards** no canvas.
- **Não reintroduza nada que a seção 10 do prompt original proíbe**, com a única exceção declarada aqui: o link de recuperação, que agora tem destino.
- Não altere nenhuma copy existente.

**Específico deste acréscimo**

- **Não transforme o link em botão preenchido** nem em item de mesma hierarquia do `Entrar`. Ele é textual e secundário.
- **Não o coloque no rodapé**, junto de `Ainda não tem conta? Criar conta`. Ali ele compete com o cadastro e fica longe do campo que o motivou.
- **Não desenhe dois caminhos de recuperação.** Nada de "recuperar por SMS", "entrar com link mágico" nem código de verificação.
- Não acrescente "manter conectado", "lembrar de mim" nem login social.
- Não acrescente contagem regressiva no estado de bloqueio.

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
