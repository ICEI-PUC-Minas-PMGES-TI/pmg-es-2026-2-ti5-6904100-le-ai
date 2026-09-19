# F-AUT · Alterar senha

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-AUT.md
**Requisitos:** RF-AUT-05 (alterar a própria senha informando a senha atual)
**Não funcionais:** RNF-SEC-27 (senha com no mínimo 8 caracteres e verificação contra lista de senhas comuns), RNF-SEC-30 (a troca invalida todos os tokens de renovação do usuário), RNF-SEC-35/36 (a troca é registrada em log, sem expor senha), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (erro em pt-BR e acionável), RNF-ERR-09 (cold start do servidor tratado como carregamento)
**Regras de negócio:** nenhuma RN se aplica a esta tela
**Versão web:** sim (RF-AUT-05 tem marcação na coluna Web de `REQUISITOS.md` §5.1)

---

## 1. Contexto

Troca de senha de quem **já está autenticado** e lembra a senha atual. Tela empilhada sobre a área `Perfil`, acessada por `Configurações`, em [`configuracoes.md`](configuracoes.md). Sai de volta para `Configurações`.

Ela não sustenta diretamente registro, meta nem pertencimento: sustenta a segurança da conta que dá acesso aos três.

Duas coisas que ela precisa resolver:

- **A senha atual é a prova de identidade.** O primeiro campo não é burocracia: é o que impede que alguém com o aparelho desbloqueado troque a senha e tome a conta. Por isso ele fica no topo, separado do par de campos da senha nova.
- **A troca encerra as outras sessões** (RNF-SEC-30). O leitor precisa saber disso **antes** de salvar, não descobrir depois que o tablet pediu login de novo.

**Escopo desta entrega.** Quem esqueceu a senha não usa esta tela: o caminho é [`recuperar-senha.md`](recuperar-senha.md), a partir do login. Esta tela **não** tem link de recuperação, porque quem está autenticado e não lembra a senha resolve isso saindo e pedindo o link, e oferecer os dois caminhos na mesma tela só gera dúvida.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Alterar senha · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
| Campo Senha atual | seis a dez pontos, nunca texto legível no estado padrão |
| Campo Nova senha | oito a doze pontos |
| Campo Confirmar nova senha | mesmo tratamento |
| Badge de não lidas no sino | `3` |

Nenhum outro dado. A tela **não** mostra data da última troca, força da senha, histórico de senhas nem lista de aparelhos conectados: nada disso existe em requisito do Período 1.

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

Tela de detalhe empilhada sobre a área `Perfil`, e não raiz de aba: por isso ela tem retorno.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, voltando a `Configurações`.
- Título `Alterar senha` em `display` `tinta`, à esquerda, alinhado à base.
- `Bell` (Phosphor, `regular`, 24px, `tinta`) à direita, com o badge de não lidas quando houver.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.
- **A barra inferior continua visível**, com `Perfil` ativo: esta tela está dentro da área de perfil, não fora do shell.

### Corpo

Padding lateral `space-5`, `space-6` de respiro abaixo do header.

1. Campo `Senha atual`: label em `label` `grafite`, `space-2` de gap, campo de 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, com `Eye` (Phosphor, `regular`, 20px, `grafite`) dentro à direita.
2. `space-8` e um divisor de 1px `linha` de largura total, com `space-8` abaixo. O divisor separa **provar quem você é** de **escolher a senha nova**, que são duas coisas diferentes no mesmo formulário.
3. Campo `Nova senha`, mesmas medidas.
4. `space-3`, helper em `caption` `grafite`, visível o tempo todo: `Mínimo de 8 caracteres. Evite senhas comuns, como sequências e o seu nome.`
5. `space-5`, campo `Confirmar nova senha`, mesmas medidas.
6. `space-4`, linha de aviso em `caption` `grafite`, com `Info` (Phosphor, `regular`, 16px, `grafite`) à esquerda e `space-2` de gap: `Ao salvar, você sai do aplicativo nos outros aparelhos.`
7. `space-8`, botão primário **Salvar nova senha**, largura total, 48px de altura, `radius-full`, fundo `musgo`, texto `papel` em `body-strong`.
8. `space-4`, botão textual centralizado em `body-strong` `grafite`: `Cancelar`, que volta a `Configurações` sem salvar.

### 4.1 Padrão

Os três campos vazios, borda de 1px `linha`, sem placeholder. Helper e aviso visíveis. Botão primário ativo.

### 4.2 Senha atual incorreta

- Banner acima do campo `Senha atual`, largura total, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `WarningCircle` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Senha atual incorreta.`
- `space-6` entre o banner e o campo.
- Campo `Senha atual` com borda de 1.5px `rubi` e valor limpo. Os campos da senha nova mantêm o que foi digitado e continuam com borda de 1px `linha`: não é o conteúdo deles que está errado.
- Sem mensagem inline repetindo o banner abaixo do campo.

### 4.3 Nova senha fora da política

- Campo `Nova senha` com borda de 1.5px `rubi`.
- Mensagem inline abaixo, `space-2` de gap, em `caption` `rubi`: `Essa senha é muito comum. Escolha uma que não esteja em listas conhecidas.`
- O helper continua visível abaixo da mensagem.
- Botão primário desabilitado, com opacidade reduzida.
- A outra mensagem possível, para senha curta, é `Escolha uma senha com pelo menos 8 caracteres.`

### 4.4 Confirmação diferente

- Campo `Confirmar nova senha` com borda de 1.5px `rubi` e a mensagem inline em `caption` `rubi`: `As duas senhas precisam ser iguais.`
- Os outros dois campos permanecem com borda de 1px `linha`.

### 4.5 Salvando, com cold start

- Os três campos com opacidade reduzida e sem foco possível.
- Botão primário mantém o fundo `musgo` e troca o texto para `Salvando`. Desabilitado ao toque.
- Abaixo do botão, `space-3` de gap, linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- **Sem spinner, sem barra indeterminada, sem ponto pulsando.**

### 4.6 Senha alterada

O formulário sai e o corpo vira o bloco de confirmação. Header e barra inferior permanecem.

- `space-10` abaixo do header, bloco alinhado à esquerda no mesmo padding lateral:
  - `CheckCircle` (Phosphor, `regular`, 32px, `musgo`).
  - `space-5`, título em `title-lg` `tinta`: `Senha alterada`.
  - `space-4`, texto em `body` `grafite`: `Sua senha foi trocada. Encerramos a sessão nos outros aparelhos, e aqui você continua conectado.`
- `space-8`, botão primário largura total: `Voltar para configurações`.
- **Sem ilustração, sem check verde gigante, sem confete, sem toast.** O acento é o ícone de 32px.
- A sessão deste aparelho **não cai**. A frase diz isso explicitamente, porque o leitor acabou de ler que as outras sessões foram encerradas e precisa saber que esta não é uma delas.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo: `Alterar senha` é uma tela dentro da área de perfil.
- Área de conteúdo com padding lateral `space-8`.
- **Header de conteúdo de 72px** com um botão textual `musgo` de retorno, `ArrowLeft` (Phosphor, `regular`, 20px) mais o texto `Configurações`, acima do título `Alterar senha` em `display` `tinta`. Sem sino.
- **O formulário não estica.** Ele vive numa coluna de no máximo 480px alinhada à esquerda da área de conteúdo, com os campos em 44px de altura e o botão primário de 40px. Formulário de três campos ocupando 1440px de largura é o erro que esta regra existe para evitar.
- À direita da coluna do formulário o espaço fica **vazio**. Nada de card decorativo, nada de ilustração, nada de painel de dicas de segurança.
- `hover` no botão primário levando `musgo` para `musgo-vivo` em `dur-fast`; foco de teclado visível com borda de 1.5px `musgo`.
- **Abaixo de 768px** a sidebar dá lugar à barra inferior, o retorno vira o `ArrowLeft` do header e a coluna passa a ocupar a largura inteira com padding lateral `space-5`.

### 5.1 Padrão

Sidebar expandida com `Perfil` ativo, retorno e título no header, coluna de 480px com os três campos, helper, aviso e os dois botões.

### 5.2 Senha atual incorreta

O mesmo banner em `rubi-fundo` de 4.2, dentro da coluna de 480px, com o campo `Senha atual` em borda de 1.5px `rubi` e valor limpo.

### 5.3 Senha alterada

Coluna de 480px com o bloco de 4.6: `CheckCircle`, título, texto e o botão `Voltar para configurações`.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem.

- **Mobile, padrão.** Fundo `noite`. Título do header e ícones em `papel-suave`. Label em `grafite-claro`, campo com fundo `noite-elevada`, **mais claro** que o fundo, borda de 1px `linha-noite`, texto digitado em `papel-suave`. Divisor entre os blocos em `linha-noite`. Helper e aviso em `grafite-claro`. Botão primário com fundo `musgo-claro` e texto `noite`; botão textual `Cancelar` em `grafite-claro`. Barra inferior em `noite-elevada`, **mais clara** que o fundo, com `Perfil` ativo em `musgo-claro`.
- **Web, padrão.** Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, `Perfil` ativo com fundo `musgo-fundo-escuro`. Coluna do formulário com o mesmo tratamento de campo e botão.

Banner de erro no escuro usa `rubi-fundo-escuro` com ícone `rubi-claro` e texto em `papel-suave`; mensagens inline usam `rubi-claro`; o `CheckCircle` do sucesso usa `musgo-claro`. Nos dois, os shadows ficam com **metade da opacidade**.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Campo de formulário com label acima, helper, foco e erro | documento-de-design §4.2 |
| Campo de senha com botão de mostrar | documento-de-design §4.2 e periodo-0/P0-NAV/cadastro.md |
| Botão primário (pill, `musgo`) e botão textual | documento-de-design §4.1 |
| Banner de erro em `rubi-fundo` | documento-de-design §3.1.3 |
| Escala tipográfica e as quatro famílias | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Shell de navegação, header, barra inferior e sidebar | periodo-0/P0-NAV/shell-de-navegacao.md |

**Componentes que ainda não existem na fonte.** Dois elementos nascem aqui e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **O header de tela de detalhe**, com `ArrowLeft` à esquerda, título e sino à direita. O §5 define os headers das telas de área, não o das telas empilhadas. Ele já aparece em `F-PRG/atualizacoes-de-progresso.md` e `F-ACV-BUSCA/pagina-do-livro.md`, e precisa ser incorporado uma vez só, para as três.
2. **A coluna de formulário de 480px na web**, com o espaço à direita deliberadamente vazio. O documento não define largura de formulário em tela larga.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela | `Alterar senha` |
| Retorno, na web | `Configurações` |
| Label 1 | `Senha atual` |
| Label 2 | `Nova senha` |
| Label 3 | `Confirmar nova senha` |
| Helper da nova senha | `Mínimo de 8 caracteres. Evite senhas comuns, como sequências e o seu nome.` |
| Aviso de sessões | `Ao salvar, você sai do aplicativo nos outros aparelhos.` |
| Erro de senha atual | `Senha atual incorreta.` |
| Erro de senha curta | `Escolha uma senha com pelo menos 8 caracteres.` |
| Erro de senha comum | `Essa senha é muito comum. Escolha uma que não esteja em listas conhecidas.` |
| Erro de confirmação | `As duas senhas precisam ser iguais.` |
| Botão primário | `Salvar nova senha` |
| Botão primário salvando | `Salvando` |
| Botão textual | `Cancelar` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Sucesso, título | `Senha alterada` |
| Sucesso, texto | `Sua senha foi trocada. Encerramos a sessão nos outros aparelhos, e aqui você continua conectado.` |
| Sucesso, botão | `Voltar para configurações` |

Zero em-dash em toda a copy. Zero emoji. O número da tela, `8 caracteres`, aparece com unidade.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo nos dois temas. Helper e aviso usam `grafite`, não `grafite-suave`.
- Alvo de toque mínimo de 48px no mobile no `ArrowLeft`, nos campos, no botão de mostrar senha e nos dois botões.
- Cada botão de mostrar senha alterna entre `Eye` e `EyeSlash` e tem rótulo acessível dizendo o que faz, referindo o campo a que pertence.
- A mensagem de erro inline é associada ao campo, para o leitor de tela lê-la junto do label e do helper.
- O banner de senha atual incorreta carrega **ícone e texto**, não só cor.
- Ao trocar o formulário pelo bloco de sucesso, o foco vai para o título `Senha alterada` e a mudança é anunciada.
- Foco de teclado visível na web em campos e botões, na ordem visual: retorno, senha atual, nova senha, confirmação, salvar, cancelar.
- `prefers-reduced-motion` respeitado: transições de foco e de hover viram estáticas.
- Nenhuma ação desta tela é destrutiva. Encerrar as outras sessões é consequência declarada da ação principal, não uma ação separada, e por isso não abre modal de confirmação.

---

## 10. O que não fazer nesta tela

**Específico da tela**

- **Não dispense a senha atual.** Ela é o controle que existe nesta tela e não pode virar opcional, nem para quem acabou de entrar.
- **Não esconda o aviso das outras sessões até depois de salvar.** Ele aparece junto do formulário.
- **Não desenhe link de recuperação de senha aqui.** Quem não lembra a senha sai e usa `Esqueci minha senha`, na tela de login.
- **Não desenhe medidor de força de senha** com barra colorida ou rótulo do tipo `Fraca`, `Média`, `Forte`.
- Não desenhe lista de aparelhos conectados nem botão de encerrar sessões avulsas. Nada disso tem requisito no Período 1.
- Não desenhe data da última troca de senha nem histórico de senhas.
- Não use placeholder no lugar de label em nenhum campo.
- Não esconda o helper até o erro acontecer.
- Não confirme o sucesso com toast. O sucesso é um bloco na própria tela.
- **Não desenhe exclusão de conta nesta tela.** RF-AUT-07 é do Período 2, em F-CONTA-2.

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
- Nada de campo de senha sem o botão de mostrar.
- Nada de validação que só existe no cliente: a mensagem reflete a regra que o servidor aplica.
