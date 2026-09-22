# F-AUT · Configurações

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-AUT.md
**Requisitos:** RF-AUT-06 (encerrar a sessão, invalidando o token de renovação). Dá acesso a RF-AUT-05, cuja tela é [`alterar-senha.md`](alterar-senha.md).
**Não funcionais:** RNF-SEC-42 (política de privacidade informando dados coletados, finalidade e retenção, acessível no cadastro e nas configurações), RNF-SEC-40 (coleta mínima de dados pessoais), RNF-SEC-30 (logout invalida o token de renovação), RNF-USA-03 (contraste WCAG AA), RNF-USA-04 (confirmação explícita antes de encerrar a sessão), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-09 (cold start do servidor tratado como carregamento)
**Regras de negócio:** nenhuma RN se aplica a esta tela
**Versão web:** sim (RF-AUT-06 tem marcação na coluna Web de `REQUISITOS.md` §5.1, e RNF-SEC-42 exige a política nas duas plataformas)

---

## 1. Contexto

O lugar onde o leitor cuida da conta: trocar a senha, ler a política de privacidade e sair. Tela empilhada sobre a área `Perfil`, acessada pelo ícone de engrenagem no header do próprio perfil, em [`../F-PERFIL/meu-perfil.md`](../F-PERFIL/meu-perfil.md).

**Ela existe porque duas obrigações precisam de um lugar.** O `documento-de-design.md` não define tela de configurações, e a Especificação de `feature-F-AUT.md` cita "as configurações" como o lugar em que a política de privacidade fica acessível (RNF-SEC-42) e de onde o logout parte (RF-AUT-06). Este prompt é esse lugar, e o desenho é deliberadamente o mais previsível do produto: lista de linhas agrupadas, sem invenção.

**O que ela não é.** Não é painel de preferências. Preferência de notificação por tipo é RF-NOT-05, opcional, e não existe no Período 1. Tema claro e escuro segue o sistema operacional e não tem seletor. Idioma é só pt-BR, e internacionalização está fora de escopo.

**Escopo desta entrega.** Privacidade de perfil, que é `público` ou `privado` (RF-SOC-04), **não mora aqui**: ela é um campo do formulário de perfil, em [`../F-PERFIL/editar-perfil.md`](../F-PERFIL/editar-perfil.md), junto de nome, biografia e avatar. Excluir a conta (RF-AUT-07) é Desejável e pertence a F-CONTA-2, no Período 2: nenhuma linha dessa ação aparece aqui.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Configurações · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
| Identificação da conta | `Marina Beltrão` e `@marinableu` |
| E-mail da conta | `marina.beltrao@gmail.com` |
| Versão da política de privacidade | `Versão 1.0, de 15 de setembro de 2026` |
| Badge de não lidas no sino | `3` |

**Conteúdo da política de privacidade**, em quatro blocos curtos, exatamente os três assuntos que RNF-SEC-42 exige mais os direitos da LGPD:

| Bloco | Conteúdo |
|---|---|
| `Dados que coletamos` | e-mail, nome de usuário, nome de exibição, data de nascimento, senha guardada apenas como hash, e o que você registra no aplicativo: livros, leituras, progresso, notas, resenhas, comentários e quem você segue. Avatar e capa de livro pessoal, quando você envia. |
| `Para que usamos` | manter sua conta e sua sessão, montar sua estante e seu feed, mostrar seu perfil conforme a privacidade que você escolheu e enviar o e-mail de recuperação de senha. Não vendemos dados e não usamos seus dados para publicidade. |
| `Por quanto tempo guardamos` | enquanto a conta existir. O token de recuperação de senha vale por 1 hora. Registros de acesso ficam por 6 meses. |
| `Seus direitos` | você pode acessar e corrigir seus dados pelo perfil, e pedir suporte pelo e-mail de contato do projeto. |

Os prazos acima são **mock declarado**: o texto final da política é entrega jurídica do grupo, não do protótipo. O que o protótipo fixa é a estrutura de quatro blocos e o lugar dela.

---

## 4. Artboards mobile (390 x 844)

Tela autenticada, desenhada dentro do shell.

Toda tela autenticada é desenhada dentro do shell do produto. O shell é
idêntico em todas elas e precisa ser desenhado por extenso aqui.

**Mobile, barra inferior.** Fixa no rodapé da viewport, acima da área segura.
Altura de 64px mais a área segura, fundo `papel-elevado`, divisor de 1px
`linha` no topo, sem sombra. Quatro itens de largura igual: `Estante`,
`Descobrir`, `Feed`, `Perfil`. Cada item empilha ícone de 24px acima e rótulo
em `caption` abaixo, com `space-1` de gap, centralizado, e a área tocável tem
no mínimo 48px de altura. Ícones Phosphor: `Books` para Estante, `Compass`
para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. Inativo:
ícone peso `regular`, cor `grafite`;
rótulo em `caption` `grafite`. Ativo: ícone peso `fill`, cor `musgo`; rótulo
em `caption` peso 600, cor `musgo`. Sem pill de fundo atrás do item ativo,
sem indicador deslizante, sem ícone que salta.

**Mobile, header.** Altura de 72px mais a área segura, padding lateral
`space-5`, fundo `papel`, sem sombra. À esquerda o título da tela em
`display`, cor `tinta`, alinhado à base. À direita, na mesma linha, as ações
contextuais da tela seguidas do sino `Bell` (Phosphor, `regular`, 24px,
`tinta`), com `space-4` de gap. O sino é fixo em toda tela autenticada.
Badge de não lidas: círculo de 18px, fundo `musgo`, encostado no canto
superior direito do ícone, número centralizado em 11px peso 600 cor `papel`;
acima de nove mostra `9+`; sem não lidas, o badge simplesmente não existe.

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida
por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px
`linha`. Bloco do topo de 72px, padding lateral `space-5`, com o wordmark
`Lê Ai` em Space Grotesk 600, token `title`, cor `tinta`, à esquerda, e
`SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo,
`space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro
de padding lateral `space-3`: altura de 44px, `radius` 12, padding lateral
`space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em
`body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo
transparente. Hover: fundo `linha`, transição `dur-fast`. Ativo: fundo
`musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`.

**Sem sino na web.** Notificações estão fora do escopo do cliente web
(REQUISITOS.md §2.1), então o ícone não existe na sidebar nem no header web.
Nada no rodapé da sidebar: sem suporte, sem versão, sem crédito.

**Web, área de conteúdo.** À direita da sidebar, fundo `papel`, padding
lateral `space-8`, com header próprio de 72px: título da tela em `display`
`tinta` à esquerda e ações contextuais à direita, sem o sino.

**Ponto de virada.** Entre 768px e 1024px a sidebar nasce retraída em 72px,
só ícones. Abaixo de 768px a sidebar deixa de existir e a barra inferior do
mobile assume. Não existe menu hamburguer em nenhum tamanho.


### Header desta tela

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, voltando ao perfil.
- Título `Configurações` em `display` `tinta`, à esquerda, alinhado à base.
- `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita, com o badge de não lidas quando houver.
- **A barra inferior continua visível**, com `Perfil` ativo.

### Bloco de identificação

Logo abaixo do header, padding lateral `space-5`, `space-6` de respiro abaixo.

- Nome de exibição `Marina Beltrão` em `title-sm` `tinta`.
- `@marinableu` em `caption` `grafite-suave`, logo abaixo.
- `marina.beltrao@gmail.com` em `caption` `grafite`, abaixo.
- **Sem avatar aqui.** O avatar é do perfil, e repetir a identidade visual em configurações não acrescenta nada.
- Divisor de 1px `linha` de largura total abaixo do bloco.

### Grupos de linhas

Dois grupos, cada um com um título de seção em `label` `grafite`, padding lateral `space-5`, `space-4` de respiro acima e `space-3` abaixo. Dentro do grupo, cada linha tem 56px de altura, padding lateral `space-5`, rótulo em `body` `tinta` à esquerda e `CaretRight` (Phosphor, `regular`, 20px, `grafite-suave`) à direita, separadas por divisor de 1px `linha`.

- **Grupo `Conta`:** uma linha, `Alterar senha`, que leva a [`alterar-senha.md`](alterar-senha.md).
- **Grupo `Privacidade e dados`:** uma linha, `Política de privacidade`, que abre o conteúdo no próprio aplicativo, no artboard 4.4.

`space-8` abaixo do último grupo.

### Ação de sair

- Botão de largura total, 48px de altura, `radius` 12, **outline**: borda de 1px `rubi`, fundo transparente, texto `Sair da conta` em `body-strong` `rubi`, com `SignOut` (Phosphor, `regular`, 20px, `rubi`) à esquerda do texto.
- **Botão destrutivo é outline, nunca preenchido** (design §7.8). Sair não apaga dado nenhum, mas invalida o token de renovação e obriga a entrar de novo: é irreversível dentro da sessão, e por isso recebe o mesmo tratamento e a confirmação de RNF-USA-04.
- `space-6` abaixo, linha centralizada em `caption` `grafite-suave`: `Lê Ai · versão 1.0.0`. Esta é a única linha de rodapé da tela.

### 4.1 Padrão

Header, bloco de identificação, os dois grupos com uma linha cada, o botão `Sair da conta` e a linha de versão. Barra inferior com **Perfil** ativo.

A tela é curta e cabe sem rolagem. **Não a preencha:** não invente linhas de suporte, avaliação na loja, convite de amigos ou "sobre nós" para ocupar o espaço.

### 4.2 Confirmar saída

Modal centrado sobre a tela, conforme RNF-USA-04.

- Fundo da tela escurecido por uma camada em `tinta` a 40% de opacidade.
- Card centrado, largura de 320px, `radius-lg`, fundo `papel-elevado`, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Sair da conta?`
- `space-3`, texto em `body` `grafite`: `Você vai precisar entrar de novo neste aparelho. Seus livros, leituras e resenhas continuam salvos.`
- `space-6`, dois botões empilhados com `space-3` de gap:
  - Botão **outline** `rubi`, largura total, 48px, `radius` 12: `Sair`.
  - Botão textual `grafite`, largura total: `Cancelar`.
- O modal entra com fade em `dur-fast` e o card com deslocamento vertical de 8px. Sob `prefers-reduced-motion`, aparece estático.
- **Sem desfazer depois de sair.** A saída é confirmada antes, não revertida depois.

### 4.3 Saindo

- O modal fecha e a tela permanece, com o botão `Sair da conta` desabilitado e o texto trocado para `Saindo`.
- Abaixo do botão, `space-3` de gap, linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- **Sem spinner.** Se o servidor não responder, a sessão local é limpa do mesmo jeito e o leitor vai para o login: nenhum erro é mostrado, porque sair sempre funciona do lado do aparelho.

### 4.4 Política de privacidade

Tela empilhada sobre `Configurações`, com o mesmo padrão de header.

- `ArrowLeft` à esquerda, título `Política de privacidade` em `display` `tinta`, `Bell` à direita.
- Corpo com padding lateral `space-5`, `space-6` de respiro abaixo do header:
  - Linha de versão em `caption` `grafite-suave`: `Versão 1.0, de 15 de setembro de 2026`.
  - `space-6`.
  - Quatro blocos, com `space-6` entre eles. Cada bloco é um título de seção em `title-sm` `tinta` e o texto em `body` `grafite`, com entrelinha do token: `Dados que coletamos`, `Para que usamos`, `Por quanto tempo guardamos`, `Seus direitos`.
- **O texto é interface, não conteúdo editorial: ele usa Manrope, não Newsreader.** A serifa do sistema entra só em resenha, frases e sinopse, e a política não é nenhum dos três.
- A tela rola. O header ganha o divisor de 1px `linha` na base quando o conteúdo passa por baixo dele.
- **Sem aceite, sem checkbox, sem botão de concordar.** É leitura, não contrato assinado na interface.

### 4.5 Carregando

O bloco de identificação depende de `GET /me`; o resto da tela não depende de servidor nenhum.

- Bloco de identificação substituído por **skeleton estático**: três barras em `capa-placeholder` com `radius-sm`, alturas de 17px, 13px e 13px, larguras de 45%, 30% e 60%, com `space-2` de gap.
- Os dois grupos de linhas, o botão de sair e a linha de versão aparecem normalmente: eles não esperam dado nenhum.
- **Um único fade de entrada em `dur-base` com `ease-out`.** Sem shimmer, sem pulso, sem spinner.

**Estado vazio não se aplica a esta tela:** ela não lista coleção nenhuma, e o conjunto de linhas é fixo. **Estado de erro de carregamento também não:** se `GET /me` falhar, o bloco de identificação mantém o skeleton e o restante da tela continua utilizável, inclusive o botão de sair.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo.
- Área de conteúdo com padding lateral `space-8`, header de conteúdo de 72px com o botão textual de retorno `Perfil` e o título `Configurações` em `display` `tinta`. Sem sino.
- **Duas colunas dentro da área de conteúdo**, com gap `space-12`:
  - **Coluna esquerda de 320px:** o bloco de identificação e, abaixo, a navegação dos grupos como lista de itens de 44px, `radius` 12, com o item aberto em fundo `musgo-fundo` e texto `musgo`. Os itens são `Alterar senha` e `Política de privacidade`.
  - **Coluna direita, o resto da largura até no máximo 720px:** o conteúdo do item aberto. Na aterrissagem, o item aberto é `Política de privacidade`, porque `Alterar senha` é uma tela própria.
- O botão `Sair da conta` fica no fim da coluna esquerda, outline `rubi`, 40px de altura, largura da coluna.
- `hover` nos itens da coluna esquerda com fundo `linha`, transição `dur-fast`. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px.
- **Abaixo de 768px** as duas colunas viram uma só: a lista de linhas do mobile, com o conteúdo abrindo como tela empilhada, e a sidebar dá lugar à barra inferior.

### 5.1 Padrão, política aberta

Sidebar expandida com `Perfil` ativo, coluna esquerda com identificação, os dois itens e o botão de sair, coluna direita com os quatro blocos da política e a linha de versão no topo.

### 5.2 Confirmar saída

O mesmo modal centrado de 4.2, com 360px de largura, sobre a camada escurecida, com os dois botões **lado a lado** no lugar de empilhados: `Cancelar` textual à esquerda e `Sair` outline `rubi` à direita, alinhados à direita do card.

### 5.3 Item em hover

Coluna esquerda com o cursor sobre `Alterar senha`: fundo `linha` no item, enquanto `Política de privacidade` segue aberto em `musgo-fundo`. Serve para conferir que hover e ativo são distinguíveis.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título do header e ícones em `papel-suave`. Nome em `papel-suave`, `@username` em `grafite-fundo-escuro`, e-mail em `grafite-claro`. Títulos de grupo em `grafite-claro`. Linhas com rótulo em `papel-suave`, `CaretRight` em `grafite-fundo-escuro` e divisores em `linha-noite`. Botão de sair com borda e texto em `rubi-claro`, fundo transparente. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com `Perfil` ativo em `musgo-claro`.
- **Mobile, confirmar saída.** Card em `noite-elevada`, **mais claro** que o fundo, com camada de escurecimento em `noite` a 60%. Título em `papel-suave`, texto em `grafite-claro`, botão `Sair` com borda e texto `rubi-claro`.
- **Web, política aberta.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`. Item aberto com fundo `musgo-fundo-escuro` e texto `musgo-claro`; hover em `linha-noite`. Texto da política em `grafite-claro` com títulos em `papel-suave`.

Nos três, os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Botão outline destrutivo em `rubi`, nunca preenchido | documento-de-design §4.1 e §7.8 |
| Botão textual | documento-de-design §4.1 |
| Modal de confirmação de ação destrutiva | documento-de-design §7.8 e RNF-USA-04 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Skeleton estático com um único fade | documento-de-design §3.6 e §7.4 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que ainda não existem na fonte.** Três elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **A tela de configurações inteira.** O §5 define seis padrões de tela e nenhum deles é este. O desenho adotado é a lista de linhas agrupadas, com 56px por linha e `CaretRight` à direita.
2. **O header de tela de detalhe**, com `ArrowLeft`, título e sino, compartilhado com `alterar-senha.md`, `F-PRG/atualizacoes-de-progresso.md` e `F-ACV-BUSCA/pagina-do-livro.md`.
3. **O layout de duas colunas de configurações na web**, com navegação à esquerda e conteúdo à direita.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Configurações` |
| Nome de exibição | `Marina Beltrão` |
| Nome de usuário | `@marinableu` |
| E-mail | `marina.beltrao@gmail.com` |
| Título do grupo 1 | `Conta` |
| Linha do grupo 1 | `Alterar senha` |
| Título do grupo 2 | `Privacidade e dados` |
| Linha do grupo 2 | `Política de privacidade` |
| Botão de sair | `Sair da conta` |
| Botão de sair, em curso | `Saindo` |
| Rodapé de versão | `Lê Ai · versão 1.0.0` |
| Modal, título | `Sair da conta?` |
| Modal, texto | `Você vai precisar entrar de novo neste aparelho. Seus livros, leituras e resenhas continuam salvos.` |
| Modal, botão destrutivo | `Sair` |
| Modal, botão textual | `Cancelar` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Política, título da tela | `Política de privacidade` |
| Política, versão | `Versão 1.0, de 15 de setembro de 2026` |
| Política, título 1 | `Dados que coletamos` |
| Política, título 2 | `Para que usamos` |
| Política, título 3 | `Por quanto tempo guardamos` |
| Política, título 4 | `Seus direitos` |

O corpo dos quatro blocos da política está na seção 3 e é **mock declarado**: o texto jurídico final é entrega do grupo.

Zero em-dash em toda a copy. Zero emoji. Os números da política, `1 hora` e `6 meses`, aparecem com unidade.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo nos dois temas. O e-mail usa `grafite`, não `grafite-suave`, porque identifica a conta; só o `@username` usa o terciário, e ele repete uma informação já presente.
- Alvo de toque mínimo de 48px no mobile em cada linha de grupo, no `ArrowLeft`, no botão de sair e nos botões do modal. As linhas têm 56px, com folga.
- A ação de sair é distinguível **sem depender de cor**: além do `rubi`, ela tem o ícone `SignOut`, o rótulo explícito e a confirmação em modal.
- O modal captura o foco, começa com o foco no botão `Cancelar`, fecha com `Esc` e devolve o foco ao botão que o abriu.
- A linha de versão não é interativa e não recebe foco.
- Foco de teclado visível na web em itens da coluna esquerda, botão de sair e botões do modal, na ordem visual.
- O conteúdo da política é texto real e navegável por leitor de tela, com os quatro títulos como cabeçalhos de seção, nunca uma imagem de documento nem um PDF embutido.
- `prefers-reduced-motion` respeitado: o fade do modal e o hover dos itens viram estáticos.

---

## 10. O que não fazer nesta tela

**Escopo do Período 1**

- **Não desenhe excluir conta.** RF-AUT-07 é Desejável e pertence a F-CONTA-2, no Período 2. Nem linha, nem botão, nem seção de zona de perigo.
- **Não desenhe preferências de notificação por tipo.** RF-NOT-05 é opcional e não existe no Período 1.
- **Não desenhe seletor de tema.** O modo escuro segue o sistema operacional.
- **Não desenhe seletor de idioma.** O produto é só pt-BR e internacionalização está fora de escopo.
- **Não desenhe a privacidade do perfil aqui.** Público e privado é campo do formulário de perfil, em F-PERFIL.
- Não desenhe lista de aparelhos conectados nem sessões ativas. Não há requisito.

**Específico das configurações**

- **Não preencha a tela.** Se sobrar espaço, ele sobra. Nada de linhas de suporte, avaliação na loja, convidar amigos, sobre nós, termos de uso separados nem redes sociais.
- **Não desenhe botão de sair preenchido em `rubi`.** Destrutivo é outline.
- **Não desenhe undo depois de sair.** A confirmação é antes.
- **Não use toast** para confirmar a saída: o leitor já está em outra tela.
- **Não desenhe a política de privacidade como PDF embutido, imagem ou link externo que sai do aplicativo.** Ela é texto dentro do produto.
- **Não peça aceite da política** com checkbox ou botão de concordar nesta tela.
- Não desenhe a política em Newsreader. Serifa é só resenha, frases e sinopse.
- Não use `switch` em nenhuma linha desta tela: as duas linhas são navegação, não preferência.
- Não desenhe engrenagem dentro desta tela. A engrenagem é o que leva até aqui, e mora no header do perfil.

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


**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal.
- Nada de botão destrutivo preenchido. Destrutivo é outline rubi.
- Nada de desfazer em ação destrutiva pesada.

**Layout (web)**

- Nada de hero de landing dentro do produto. Esta é tela de conta.
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
