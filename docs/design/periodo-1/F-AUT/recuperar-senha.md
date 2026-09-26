# F-AUT · Recuperar senha

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-AUT.md
**Requisitos:** RF-AUT-04 (solicitar recuperação de senha por e-mail, com link de token de uso único e prazo de validade)
**Não funcionais:** RNF-SEC-10 (token aleatório, de uso único, validade máxima de 1 hora, guardado como hash), RNF-SEC-17 (rate limiting na recuperação), RNF-SEC-28 (resposta indistinguível para conta existente e inexistente), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-09 (cold start do servidor tratado como carregamento)
**Regras de negócio:** nenhuma RN se aplica a esta tela
**Versão web:** sim (RF-AUT-04 tem marcação na coluna Web de `REQUISITOS.md` §5.1)

---

## 1. Contexto

Primeiro passo da recuperação de senha. O leitor que não consegue entrar informa o e-mail da conta e recebe um link por e-mail, válido por uma hora e de uso único. A tela não autentica ninguém e não está dentro do shell: ela pertence à família das telas de autenticação, junto de `Entrar` e `Criar conta`.

Chega pelo botão textual `Esqueci minha senha` da tela de login, acrescentado por F-AUT no prompt de edição [`login.md`](login.md). Sai para a confirmação neutra, que é um estado desta mesma tela, e de lá o leitor volta ao login.

Ela não sustenta diretamente registro, meta nem pertencimento: sustenta o acesso à conta, sem o qual nenhum dos três acontece.

**A regra que governa o desenho inteiro é a anti-enumeração (RNF-SEC-28).** A tela responde **exatamente a mesma coisa** exista ou não uma conta com aquele e-mail. Não há estado de "e-mail não encontrado", não há verificação enquanto se digita, não há diferença de texto, de cor, de ícone ou de tempo entre os dois casos. Qualquer diferença visível transforma a tela num verificador de contas cadastradas, que é a vulnerabilidade que o requisito existe para fechar.

**Escopo desta entrega.** A tela pede o e-mail e confirma o recebimento da solicitação. A escolha da nova senha acontece na tela seguinte, que abre pelo link do e-mail, em [`redefinir-senha.md`](redefinir-senha.md). A troca de senha com a senha atual, para quem já está autenticado, é outra tela, em [`alterar-senha.md`](alterar-senha.md).

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Recuperar senha · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

| Elemento | Conteúdo |
|---|---|
| Campo de e-mail | `marina.beltrao@gmail.com` |
| Prazo do link, na confirmação | `1 hora` |

Nenhum outro dado. **Nada nesta tela é derivado da conta:** sem nome, sem avatar, sem e-mail mascarado do tipo `m****@gmail.com`, sem "última tentativa em". Qualquer um desses vazaria a existência da conta.

O e-mail exibido na confirmação é **o que o leitor digitou**, devolvido literalmente, e não um dado que o servidor confirmou.

---

## 4. Artboards mobile (390 x 844)

Tela não autenticada: **sem barra inferior, sem sidebar e sem sino.** O shell só existe depois da sessão.

**Estrutura comum a todos os estados mobile.** Fundo `papel`, ocupando a viewport inteira. Padding lateral `space-5`. De cima para baixo:

1. `space-6` de respiro a partir do topo seguro.
2. `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) alinhado à esquerda, com alvo de 48px, voltando ao login.
3. `space-10`.
4. Título **Recuperar senha** em `display`, cor `tinta`, alinhado à esquerda.
5. `space-4`.
6. Texto de apoio em `body` `grafite`, alinhado à esquerda, em no máximo três linhas: `Informe o e-mail da sua conta. Se existir uma conta com ele, você recebe um link para criar uma senha nova.`
7. `space-8`.
8. Campo único: label `E-mail` em `label` `grafite`, `space-2` de gap, campo com 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto digitado em `body` `tinta`, teclado de e-mail.
9. `space-3`, helper em `caption` `grafite`, visível o tempo todo e não só depois do erro: `O link vale por 1 hora e só pode ser usado uma vez.`
10. `space-8`.
11. Botão primário **Enviar link**, largura total, 48px de altura, `radius-full`, fundo `musgo`, texto `papel` em `body-strong`.
12. `space-5`.
13. Botão textual centralizado em `body-strong` `musgo`: `Voltar para entrar`.

O bloco inteiro fica acima da dobra, sem rolagem.

### 4.1 Padrão

Campo vazio, borda de 1px `linha`, sem placeholder. Helper visível. Botão primário ativo.

### 4.2 Formato de e-mail inválido

O leitor digitou `marina.beltrao@` e saiu do campo. Esta validação é **de formato**, feita no cliente, e **não consulta o servidor**: ela não sabe e não pode saber se a conta existe.

- Campo com borda de 1.5px `rubi`, valor digitado preservado.
- Mensagem inline abaixo do campo, `space-2` de gap, em `caption` `rubi`: `Digite um e-mail completo, como nome@provedor.com.`
- O helper continua visível abaixo da mensagem de erro. Ele não some, porque a regra do prazo continua valendo.
- Botão primário desabilitado, com opacidade reduzida, mantendo o texto `Enviar link`.

### 4.3 Enviando, com cold start

O envio está em curso e o servidor está acordando. Estado de RNF-ERR-09: demora é carregamento, nunca erro.

- Campo com opacidade reduzida e sem foco possível.
- Botão primário mantém o fundo `musgo` e troca o texto para `Enviando`. Desabilitado ao toque.
- Abaixo do botão, `space-3` de gap, uma linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- **Sem spinner, sem barra indeterminada, sem ponto pulsando.**

### 4.4 Confirmação neutra

O estado mais importante da tela, e o único que o leitor vê depois de enviar, **exista ou não a conta**. O formulário sai e a tela inteira vira a confirmação.

- Mesmo header com `ArrowLeft`.
- `space-10` abaixo do header, e o bloco alinhado à esquerda, no mesmo padding lateral:
  - `EnvelopeSimple` (Phosphor, `regular`, 32px, `musgo`).
  - `space-5`.
  - Título em `title-lg` `tinta`: `Verifique seu e-mail`.
  - `space-4`.
  - Texto em `body` `grafite`, em no máximo quatro linhas: `Se existir uma conta com marina.beltrao@gmail.com, enviamos um link para criar uma senha nova. O link vale por 1 hora.`
  - `space-4`.
  - Segunda linha em `body` `grafite`: `Não chegou? Confira a caixa de spam antes de pedir outro link.`
- `space-8`, botão primário largura total `Voltar para entrar`.
- `space-4`, botão textual centralizado `musgo`: `Enviar de novo`, que devolve o formulário com o e-mail preenchido.
- **Sem ilustração, sem check verde gigante, sem confete.** O acento é o ícone de 32px e nada mais.
- A frase começa por `Se existir uma conta`. Essa condicional não é hesitação de copy: é o requisito de anti-enumeração escrito na interface.

### 4.5 Limite de solicitações

O leitor pediu o link várias vezes seguidas e o rate limiting respondeu (RNF-SEC-17). Isto é **alerta**, não erro.

- Banner acima do campo, largura total, fundo `ambar-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `ambar`) à esquerda, `space-3` de gap, e o texto em `body` `tinta`: `Muitas solicitações. Tente de novo em alguns minutos.`
- `space-6` entre o banner e o campo.
- O campo volta à borda de 1px `linha`, sem estado de erro: não é o conteúdo dele que está errado.
- Botão primário desabilitado com opacidade reduzida.
- **Sem contagem regressiva animada.** Se um tempo aparecer, é texto estático.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

Mesma estrutura de duas colunas de `Entrar` e `Criar conta`, deliberadamente: as telas de autenticação precisam ser reconhecíveis como a mesma família.

**Coluna esquerda**, 44% da largura, altura total, fundo `papel-elevado`, padding horizontal `space-16`, conteúdo alinhado à esquerda e centralizado na vertical:

- **Logo**, lockup horizontal conforme design §3.7: símbolo do livro aberto com o broto à esquerda, `space-3` de gap, e o texto `Lê Ai` no token `wordmark` (peso 600, tracking -0.015em, fonte definitiva pendente, interino Space Grotesk 600). Ícone e texto na **mesma cor**, `musgo` sobre `papel`. O símbolo ocupa a altura da caixa alta do texto, com a área de proteção de ao menos a largura da folha em todos os lados.
- `space-6`.
- Frase em `title-lg` `tinta`: `Registre suas leituras e acompanhe as de quem você segue.`
- `space-4`.
- Linha de apoio em `body` `grafite`: `Estante, progresso, resenhas e feed em um lugar só.`
- Nada mais. Sem imagem, sem ilustração, sem logo de parceiro, sem faixa de palavras em maiúsculas.

**Coluna direita**, 56% da largura, fundo `papel`, conteúdo centralizado nos dois eixos numa coluna de no máximo 420px:

- Botão textual `musgo` com `ArrowLeft` (Phosphor, `regular`, 20px) à esquerda do texto `Voltar para entrar`, alinhado ao topo da coluna. Na web o retorno é link textual, não ícone solto.
- `space-6`.
- Título **Recuperar senha** em `display` `tinta`.
- `space-4`, texto de apoio em `body` `grafite`.
- `space-6`, campo de 44px de altura com label acima e helper abaixo.
- `space-8`, botão primário **Enviar link**, largura total da coluna, 40px de altura, `radius-full`.

**Estados de ponteiro e teclado:** `hover` no botão primário levando `musgo` para `musgo-vivo` em `dur-fast`; `hover` no botão textual com sublinhado; foco de teclado visível com borda de 1.5px `musgo` em campo e botão, na ordem visual.

**Comportamento responsivo.** A coluna esquerda desaparece abaixo de 768px e o formulário passa a ocupar a coluna única, com padding lateral `space-5` e as medidas de mobile.

### 5.1 Padrão

Campo vazio, as duas colunas completas.

### 5.2 Confirmação neutra

A coluna esquerda permanece igual. A coluna direita troca o formulário pelo bloco de confirmação de 4.4, com o mesmo ícone de 32px, o mesmo título e o mesmo texto condicional, e os dois botões empilhados.

### 5.3 Formato de e-mail inválido, com foco visível

Campo com borda de 1.5px `rubi` e a mensagem inline em `caption` `rubi`, com o botão primário desabilitado. Serve para conferir erro e foco de teclado juntos.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título e `ArrowLeft` em `papel-suave`. Texto de apoio em `grafite-claro`. Label em `grafite-claro`, campo com fundo `noite-elevada`, **mais claro** que o fundo da tela, borda de 1px `linha-noite`, texto digitado em `papel-suave`. Helper em `grafite-claro`. Botão primário com fundo `musgo-claro` e texto `noite`. Botão textual em `musgo-claro`.
- **Mobile, confirmação neutra.** Mesmo tratamento, com o `EnvelopeSimple` em `musgo-claro` e o título em `papel-suave`.
- **Web, padrão.** Coluna esquerda em `noite-elevada` sobre a coluna direita em `noite`, com o mesmo tratamento de campo e botão.

O banner de limite, quando aparece no escuro, usa `ambar-fundo-escuro` com ícone `ambar-claro` e texto em `papel-suave`. A mensagem de erro inline usa `rubi-claro`.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de formulário com label acima, helper, foco e erro | documento-de-design §4.2 |
| Botão primário (pill, `musgo`) e botão textual | documento-de-design §4.1 |
| Banner de alerta em `ambar-fundo` | documento-de-design §3.1.3 |
| Logo: símbolo, lockup horizontal, cor única, área de proteção e mínimo de 24px | documento-de-design §3.7, token `wordmark` em §3.2.1 e asset em §9.4 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, pesos e tamanhos | documento-de-design §6 |
| Família visual das telas de autenticação, com as duas colunas na web | periodo-0/P0-NAV/login.md e periodo-0/P0-NAV/cadastro.md |

**Componentes que ainda não existem na fonte.** Dois elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **A logo já existe na fonte e este prompt a usa.** O `documento-de-design.md` §3.7 define o símbolo (folha sobre livro aberto), os dois lockups, a regra de cor única, a área de proteção e o mínimo de 24px, e o §3.2.1 criou o token `wordmark`, exclusivo do lockup. O asset é `assets/imagens/logo-leai.svg`, monocromático e recolorido em runtime (§9.4). **A fonte da logo continua pendente**, com Space Grotesk 600 como interino, e isso é decisão do grupo, não deste prompt.
   **Divergência registrada:** os protótipos de `login`, `cadastro` e `shell de navegação`, exportados antes de 02/09/2026, ainda mostram o wordmark **só como texto**, e o §11 de `docs/design/AGENTS.md` ainda descreve a logo como inexistente. As três telas precisam de prompt de edição para adotar o lockup, e a pendência do AGENTS precisa ser fechada.
2. **O bloco de confirmação neutra**, com ícone de 32px, título e texto condicional. O documento não tem padrão de tela de confirmação sem dados. O desenho aqui é deliberadamente contido para não virar uma tela de sucesso festiva.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título | `Recuperar senha` |
| Texto de apoio | `Informe o e-mail da sua conta. Se existir uma conta com ele, você recebe um link para criar uma senha nova.` |
| Label do campo | `E-mail` |
| Helper do campo | `O link vale por 1 hora e só pode ser usado uma vez.` |
| Erro de formato | `Digite um e-mail completo, como nome@provedor.com.` |
| Botão primário | `Enviar link` |
| Botão primário enviando | `Enviando` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Alerta de limite | `Muitas solicitações. Tente de novo em alguns minutos.` |
| Confirmação, título | `Verifique seu e-mail` |
| Confirmação, texto | `Se existir uma conta com marina.beltrao@gmail.com, enviamos um link para criar uma senha nova. O link vale por 1 hora.` |
| Confirmação, segunda linha | `Não chegou? Confira a caixa de spam antes de pedir outro link.` |
| Confirmação, botão primário | `Voltar para entrar` |
| Confirmação, botão textual | `Enviar de novo` |
| Botão textual do formulário | `Voltar para entrar` |
| Web, frase da coluna esquerda | `Registre suas leituras e acompanhe as de quem você segue.` |
| Web, linha de apoio | `Estante, progresso, resenhas e feed em um lugar só.` |

Zero em-dash em toda a copy. Zero emoji. O único número da tela, `1 hora`, aparece com unidade.

**Nenhuma variante desta copy pode existir.** Não há uma frase para conta existente e outra para conta inexistente: é a mesma, sempre.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo nos dois temas. O helper usa `grafite`, não `grafite-suave`, porque carrega a regra do prazo.
- Alvo de toque mínimo de 48px no mobile no `ArrowLeft`, no campo, no botão primário e no botão textual.
- O banner de alerta carrega **ícone e texto**, não só cor: a diferença entre alerta e erro continua legível para quem não distingue âmbar de vermelho.
- A confirmação é anunciada por leitor de tela ao substituir o formulário, e o foco vai para o título `Verifique seu e-mail`, não para o fim da página.
- A mensagem de erro do campo é associada ao campo, de modo que o leitor de tela a leia junto do label e do helper.
- Foco de teclado visível na web em campo e botões, na ordem visual: retorno, campo, botão primário.
- `prefers-reduced-motion` respeitado: as transições de foco e de hover viram estáticas.
- Nenhuma ação desta tela é destrutiva.

---

## 10. O que não fazer nesta tela

**Anti-enumeração, a regra dura desta tela**

- **Não desenhe estado de e-mail não cadastrado.** Não existe `Não encontramos essa conta`, não existe `E-mail não cadastrado`, não existe ícone vermelho para conta inexistente.
- **Não valide a existência do e-mail enquanto o leitor digita.** Nada de check verde, nada de "conta encontrada", nada de consulta ao servidor a cada tecla.
- **Não mascare o e-mail da conta** no estilo `m****@gmail.com`. O e-mail mostrado é o digitado, e mascarar só faz sentido se o servidor confirmou que a conta existe.
- **Não mostre nome, avatar nem qualquer dado do dono da conta** em nenhum estado.
- **Não diferencie o tempo de resposta** desenhando um estado de espera mais longo para um caso do que para o outro.
- Não ofereça `Criar conta` como saída do estado de confirmação: sugerir cadastro depois do envio insinua que a conta não existe.

**Específico da recuperação**

- **Não desenhe o formulário de nova senha aqui.** Ele mora em `redefinir-senha.md` e só abre pelo link do e-mail.
- Não desenhe campo de código de seis dígitos. A recuperação é por link, não por código.
- Não desenhe recuperação por SMS, por telefone ou por pergunta de segurança.
- Não desenhe captcha. Ele não está em nenhum requisito e o controle é o rate limiting do servidor.
- Não desenhe contagem regressiva animada no estado de limite.
- Não use placeholder no lugar do label no campo de e-mail.
- Não esconda o helper até o erro acontecer.

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

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de formulário.
- Nada de três colunas de features iguais com três ícones e três títulos.
- Nada de bento grid decorativo em tela de dados.
- Nada de zigzag de imagem à esquerda e texto à direita.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover. Mobile não tem hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

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
- Nada de validação que só existe no cliente: a mensagem reflete a regra que o servidor aplica.
