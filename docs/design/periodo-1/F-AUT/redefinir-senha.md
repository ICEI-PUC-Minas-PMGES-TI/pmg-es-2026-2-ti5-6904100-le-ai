# F-AUT · Redefinir senha

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-AUT.md
**Requisitos:** RF-AUT-04 (redefinir a senha pelo link recebido por e-mail, com token de uso único e prazo de validade)
**Não funcionais:** RNF-SEC-10 (token aleatório, de uso único, validade máxima de 1 hora, guardado como hash), RNF-SEC-27 (senha com no mínimo 8 caracteres e verificação contra lista de senhas comuns), RNF-SEC-30 (redefinir invalida os tokens de renovação existentes), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-09 (cold start do servidor tratado como carregamento)
**Regras de negócio:** nenhuma RN se aplica a esta tela
**Versão web:** sim (RF-AUT-04 tem marcação na coluna Web de `REQUISITOS.md` §5.1)

---

## 1. Contexto

Segundo e último passo da recuperação de senha. O leitor chega aqui **pelo link do e-mail**, nunca pela navegação do aplicativo: na web é uma URL com o token, no mobile é o mesmo link abrindo o aplicativo. Ele escolhe a senha nova e volta ao login.

Vem de [`recuperar-senha.md`](recuperar-senha.md) e sai para a tela de login. Como qualquer tela de autenticação, **não tem shell**: sem barra inferior, sem sidebar, sem sino.

Duas coisas que ela precisa resolver:

- **O token pode estar inválido.** Ele vale por uma hora e por um uso só. Link expirado, já usado ou adulterado não é um erro de digitação do leitor: é um estado de tela inteira, com saída própria, que é pedir um link novo.
- **Redefinir encerra as outras sessões.** RNF-SEC-30 invalida todos os tokens de renovação do usuário. Isso não pode ser surpresa: a tela avisa antes, no helper, e confirma depois, no sucesso.

**A tela não cria sessão.** Depois de redefinir, o leitor vai para o login e entra com a senha nova. Ela também não mostra nada sobre a conta dona do token: nome, e-mail e avatar ficam de fora, porque exibi-los transformaria um link vazado em um revelador de identidade.

**Escopo desta entrega.** Aqui não existe senha atual, porque quem chega por este caminho não lembra a senha. A troca com a senha atual, dentro da área autenticada, é [`alterar-senha.md`](alterar-senha.md).

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Redefinir senha · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
| Campo Nova senha | oito a doze pontos, nunca texto legível no estado padrão |
| Campo Confirmar nova senha | mesmo tratamento |
| Prazo do link, citado no estado de expiração | `1 hora` |

**Nenhum dado da conta aparece.** Sem e-mail, sem e-mail mascarado, sem nome de exibição, sem avatar, sem `@username`. O token identifica a conta para o servidor, não para a tela.

---

## 4. Artboards mobile (390 x 844)

Tela não autenticada: **sem barra inferior, sem sidebar e sem sino.**

**Estrutura comum aos estados de formulário.** Fundo `papel`, viewport inteira, padding lateral `space-5`. De cima para baixo:

1. `space-12` de respiro a partir do topo seguro.
2. **Logo**, lockup horizontal conforme design §3.7, alinhado à esquerda: símbolo do livro aberto com o broto, `space-3` de gap, e o texto `Lê Ai` no token `wordmark`. Ícone e texto em `musgo` sobre `papel`, na mesma cor, com no mínimo 24px de altura de símbolo e a área de proteção do §3.7.
3. `space-10`.
4. Título **Criar uma senha nova** em `display`, cor `tinta`, alinhado à esquerda.
5. `space-4`, texto de apoio em `body` `grafite`: `Escolha a senha que você vai usar para entrar.`
6. `space-8`.
7. Dois campos empilhados com gap `space-5`. Cada um é label em `label` `grafite`, `space-2` de gap, e campo com 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto digitado em `body` `tinta`.
   - Labels: `Nova senha` e `Confirmar nova senha`.
   - Cada campo tem `Eye` (Phosphor, `regular`, 20px, `grafite`) dentro, alinhado à direita, alternando para `EyeSlash` quando a senha está visível.
8. `space-3`, helper do primeiro campo em `caption` `grafite`, visível o tempo todo: `Mínimo de 8 caracteres. Evite senhas comuns, como sequências e o seu nome.`
9. `space-4`, segunda linha de aviso em `caption` `grafite`, com `Info` (Phosphor, `regular`, 16px, `grafite`) à esquerda e `space-2` de gap: `Ao salvar, você sai do aplicativo nos outros aparelhos.`
10. `space-8`.
11. Botão primário **Salvar senha**, largura total, 48px de altura, `radius-full`, fundo `musgo`, texto `papel` em `body-strong`.

Não há botão textual de retorno no formulário: quem chega aqui veio do e-mail, e não há tela anterior dentro do aplicativo para onde voltar.

### 4.1 Padrão

Os dois campos vazios, borda de 1px `linha`, sem placeholder. Helper e aviso visíveis. Botão primário ativo.

### 4.2 Senha fora da política

A senha digitada tem menos de 8 caracteres ou está na lista de senhas comuns (RNF-SEC-27). São duas mensagens diferentes, e o artboard mostra a segunda, que é a menos óbvia.

- Campo `Nova senha` com borda de 1.5px `rubi`, valor preservado em pontos.
- Mensagem inline abaixo do campo, `space-2` de gap, em `caption` `rubi`: `Essa senha é muito comum. Escolha uma que não esteja em listas conhecidas.`
- O helper continua visível abaixo da mensagem: a regra não some quando o erro aparece.
- Botão primário desabilitado, com opacidade reduzida.
- **A mensagem reflete a regra que o servidor aplica.** A validação do cliente reforça, não substitui, a do servidor.

### 4.3 Confirmação diferente

- Campo `Confirmar nova senha` com borda de 1.5px `rubi`.
- Mensagem inline em `caption` `rubi`: `As duas senhas precisam ser iguais.`
- O primeiro campo permanece com borda de 1px `linha`: ele não está errado.

### 4.4 Salvando, com cold start

- Os dois campos com opacidade reduzida e sem foco possível.
- Botão primário mantém o fundo `musgo` e troca o texto para `Salvando`. Desabilitado ao toque.
- Abaixo do botão, `space-3` de gap, uma linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- **Sem spinner, sem barra indeterminada, sem ponto pulsando.**

### 4.5 Senha alterada

O formulário sai e a tela inteira vira a confirmação.

- Logo no topo, como nos demais estados.
- `space-10`, e o bloco alinhado à esquerda no mesmo padding lateral:
  - `CheckCircle` (Phosphor, `regular`, 32px, `musgo`).
  - `space-5`.
  - Título em `title-lg` `tinta`: `Senha alterada`.
  - `space-4`.
  - Texto em `body` `grafite`: `Você já pode entrar com a senha nova. Por segurança, encerramos a sessão nos outros aparelhos.`
- `space-8`, botão primário largura total: `Entrar`.
- **Sem ilustração, sem check verde gigante, sem confete.** O acento é o ícone de 32px e nada mais.
- **A tela não entra sozinha no aplicativo.** Redefinir não cria sessão: o botão leva ao login.

### 4.6 Link expirado ou já usado

Estado de tela inteira, não erro de campo. Cobre link vencido, link já consumido e token adulterado, com **a mesma mensagem**, porque distinguir os três diria a um terceiro o que aconteceu com o link.

- Logo no topo.
- `space-10`, bloco alinhado à esquerda:
  - `ClockCounterClockwise` (Phosphor, `regular`, 32px, `ambar`).
  - `space-5`.
  - Título em `title-lg` `tinta`: `Este link não vale mais`.
  - `space-4`.
  - Texto em `body` `grafite`: `O link de recuperação vale por 1 hora e só pode ser usado uma vez. Peça um link novo para continuar.`
- `space-8`, botão primário largura total: `Pedir novo link`, que leva a `Recuperar senha`.
- `space-4`, botão textual centralizado `musgo`: `Voltar para entrar`.
- **Sem formulário atrás, sem campos desabilitados ao fundo, sem banner sobre o formulário.** Se o token não serve, não há o que preencher.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

Mesma estrutura de duas colunas de `Entrar`, `Criar conta` e `Recuperar senha`: as telas de autenticação são a mesma família.

**Coluna esquerda**, 44% da largura, altura total, fundo `papel-elevado`, padding horizontal `space-16`, conteúdo alinhado à esquerda e centralizado na vertical:

- **Logo**, lockup horizontal conforme design §3.7: símbolo do livro aberto com o broto à esquerda, `space-3` de gap, e o texto `Lê Ai` no token `wordmark` (peso 600, tracking -0.015em, fonte definitiva pendente, interino Space Grotesk 600). Ícone e texto na **mesma cor**, `musgo` sobre `papel`. O símbolo ocupa a altura da caixa alta do texto, com a área de proteção de ao menos a largura da folha em todos os lados.
- `space-6`, frase em `title-lg` `tinta`: `Registre suas leituras e acompanhe as de quem você segue.`
- `space-4`, linha de apoio em `body` `grafite`: `Estante, progresso, resenhas e feed em um lugar só.`
- Nada mais. Sem imagem, sem ilustração, sem logo de parceiro.

**Coluna direita**, 56% da largura, fundo `papel`, conteúdo centralizado nos dois eixos numa coluna de no máximo 420px:

- Título **Criar uma senha nova** em `display` `tinta`.
- `space-4`, texto de apoio em `body` `grafite`.
- `space-6`, os dois campos com 44px de altura e gap `space-5`, com helper e aviso abaixo do primeiro.
- `space-8`, botão primário **Salvar senha**, largura total da coluna, 40px de altura, `radius-full`.

**Estados de ponteiro e teclado:** `hover` no botão primário levando `musgo` para `musgo-vivo` em `dur-fast`; `hover` no botão textual com sublinhado; foco de teclado visível com borda de 1.5px `musgo` em campo e botão, na ordem visual.

**Comportamento responsivo.** A coluna esquerda desaparece abaixo de 768px e o formulário ocupa a coluna única, com padding lateral `space-5` e as medidas de mobile.

### 5.1 Padrão

Campos vazios, as duas colunas completas.

### 5.2 Senha alterada

Coluna esquerda inalterada. A coluna direita troca o formulário pelo bloco de 4.5, com o `CheckCircle` de 32px, o título, o texto sobre as outras sessões e o botão `Entrar`.

### 5.3 Link expirado ou já usado

Coluna esquerda inalterada. A coluna direita traz o bloco de 4.6, com o `ClockCounterClockwise` em `ambar`, o botão primário `Pedir novo link` e o botão textual `Voltar para entrar`.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Logo em `musgo-claro`, conforme a regra de acento do §3.1.2 aplicada à marca, e título em `papel-suave`. Label em `grafite-claro`, campo com fundo `noite-elevada`, **mais claro** que o fundo, borda de 1px `linha-noite`, texto digitado em `papel-suave`, ícone `Eye` em `grafite-claro`. Helper e aviso em `grafite-claro`. Botão primário com fundo `musgo-claro` e texto `noite`.
- **Mobile, link expirado.** Mesmo tratamento, com `ClockCounterClockwise` em `ambar-claro` e título em `papel-suave`.
- **Web, padrão.** Coluna esquerda em `noite-elevada` sobre a coluna direita em `noite`, com o mesmo tratamento de campo e botão.

Mensagens de erro inline usam `rubi-claro`, e o `CheckCircle` do sucesso usa `musgo-claro`. Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de formulário com label acima, helper, foco e erro | documento-de-design §4.2 |
| Campo de senha com botão de mostrar | documento-de-design §4.2 e periodo-0/P0-NAV/cadastro.md |
| Botão primário (pill, `musgo`) e botão textual | documento-de-design §4.1 |
| Logo: símbolo, lockup horizontal, cor única, área de proteção e mínimo de 24px | documento-de-design §3.7, token `wordmark` em §3.2.1 e asset em §9.4 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, pesos e tamanhos | documento-de-design §6 |
| Família visual das telas de autenticação, com as duas colunas na web | periodo-0/P0-NAV/login.md e periodo-0/P0-NAV/cadastro.md |

**Componentes que ainda não existem na fonte.** Dois elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **A logo já existe na fonte e este prompt a usa.** O `documento-de-design.md` §3.7 define o símbolo (folha sobre livro aberto), os dois lockups, a regra de cor única, a área de proteção e o mínimo de 24px, e o §3.2.1 criou o token `wordmark`, exclusivo do lockup. O asset é `assets/imagens/logo-leai.svg`, monocromático e recolorido em runtime (§9.4). **A fonte da logo continua pendente**, com Space Grotesk 600 como interino, e isso é decisão do grupo, não deste prompt.
   **Divergência registrada:** os protótipos de `login`, `cadastro` e `shell de navegação`, exportados antes de 02/09/2026, ainda mostram o wordmark **só como texto**, e o §11 de `docs/design/AGENTS.md` ainda descreve a logo como inexistente. As três telas precisam de prompt de edição para adotar o lockup, e a pendência do AGENTS precisa ser fechada.
2. **O bloco de estado terminal de tela inteira**, com ícone de 32px, título, texto e um botão primário, usado tanto no sucesso quanto no link expirado. O documento não define esse padrão. Ele é o mesmo bloco da confirmação de `recuperar-senha.md`, e as duas telas precisam continuar usando o mesmo desenho.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título | `Criar uma senha nova` |
| Texto de apoio | `Escolha a senha que você vai usar para entrar.` |
| Label 1 | `Nova senha` |
| Label 2 | `Confirmar nova senha` |
| Helper da senha | `Mínimo de 8 caracteres. Evite senhas comuns, como sequências e o seu nome.` |
| Aviso de sessões | `Ao salvar, você sai do aplicativo nos outros aparelhos.` |
| Erro de senha curta | `Escolha uma senha com pelo menos 8 caracteres.` |
| Erro de senha comum | `Essa senha é muito comum. Escolha uma que não esteja em listas conhecidas.` |
| Erro de confirmação | `As duas senhas precisam ser iguais.` |
| Botão primário | `Salvar senha` |
| Botão primário salvando | `Salvando` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Sucesso, título | `Senha alterada` |
| Sucesso, texto | `Você já pode entrar com a senha nova. Por segurança, encerramos a sessão nos outros aparelhos.` |
| Sucesso, botão | `Entrar` |
| Link inválido, título | `Este link não vale mais` |
| Link inválido, texto | `O link de recuperação vale por 1 hora e só pode ser usado uma vez. Peça um link novo para continuar.` |
| Link inválido, botão primário | `Pedir novo link` |
| Link inválido, botão textual | `Voltar para entrar` |

Zero em-dash em toda a copy. Zero emoji. Os dois números da tela, `8 caracteres` e `1 hora`, aparecem com unidade.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo nos dois temas. Helper e aviso usam `grafite`, não `grafite-suave`, porque carregam regras que mudam o resultado da ação.
- Alvo de toque mínimo de 48px no mobile em campo, botão de mostrar senha e botão primário.
- O botão de mostrar senha alterna entre `Eye` e `EyeSlash` e tem rótulo acessível que diz o que ele faz, não só o nome do ícone.
- A mensagem de erro é associada ao campo, de modo que o leitor de tela a leia junto do label e do helper.
- O estado de link inválido não depende só do `ambar`: ele carrega ícone, título e texto.
- Ao trocar o formulário pelo bloco de sucesso ou de link inválido, o foco vai para o título do bloco e a mudança é anunciada.
- Foco de teclado visível na web em campos e botões, na ordem visual.
- `prefers-reduced-motion` respeitado: transições de foco e de hover viram estáticas.
- Nenhuma ação desta tela é destrutiva. Encerrar as outras sessões é consequência declarada da ação principal, não uma ação separada.

---

## 10. O que não fazer nesta tela

**Segurança do token**

- **Não exiba nada da conta dona do link.** Sem e-mail, sem e-mail mascarado, sem nome, sem avatar, sem `@username`. Um link vazado não pode virar um revelador de identidade.
- **Não distinga link expirado de link já usado ou adulterado.** Os três têm a mesma tela e a mesma frase.
- **Não mostre o token** na interface, nem em parte, nem como "código de verificação".
- **Não leve o leitor direto ao aplicativo autenticado** depois de salvar. Redefinir não cria sessão.
- Não desenhe um campo de senha atual aqui. Quem chega por este caminho não lembra a senha.

**Específico da tela**

- **Não desenhe medidor de força de senha** com barra colorida ou rótulo do tipo `Fraca`, `Média`, `Forte`. A regra é objetiva e mora no helper: mínimo de 8 caracteres e fora da lista de senhas comuns.
- Não esconda o helper até o erro acontecer.
- Não esconda o aviso de que as outras sessões serão encerradas: ele aparece **antes** de salvar, não só depois.
- Não use placeholder no lugar de label em nenhum campo.
- Não desenhe verificação por código de seis dígitos, SMS ou pergunta de segurança.
- Não desenhe captcha.
- Não desenhe contagem regressiva do prazo do link.

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
