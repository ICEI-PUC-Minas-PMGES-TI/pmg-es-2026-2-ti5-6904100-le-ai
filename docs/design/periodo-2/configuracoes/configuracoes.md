# Configurações (edição do Período 2)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Configurações`, gerado por `docs/design/periodo-1/F-AUT/configuracoes.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-1/F-AUT/configuracoes.md
**Features:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-CONTA-2.md
**Requisitos que entram:** F-CONTA-2: RF-AUT-07 (solicitar a exclusão da própria conta, recuperar em até 30 dias e ter dados e conteúdos removidos definitivamente depois do prazo; aqui entra só a **entrada** para a tela de exclusão e o texto da política sobre retenção e exclusão)
**Não funcionais:** RNF-SEC-42 (a política de privacidade informa dados coletados, finalidade, retenção e exclusão), RNF-SEC-41 (recuperação em 30 dias e remoção definitiva depois), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** RN-23 (exclusão e recuperação de conta)
**Versão web:** sim. RF-AUT-07 tem marcação na coluna Web de `REQUISITOS.md` §5.1.
**Destino desenhado em outro prompt:** a tela de exclusão, tela nova do Período 2 em [`../F-CONTA-2/excluir-conta.md`](../F-CONTA-2/excluir-conta.md), com canvas próprio. Aqui só existe a entrada até ela.

---

## 1. O que muda e por quê

No Período 1 as Configurações nasceram com duas linhas, e o prompt original proibia de propósito qualquer linha de excluir conta, porque RF-AUT-07 pertencia a F-CONTA-2, do Período 2. Esta edição é a chegada dessa feature. Entram **duas coisas**:

- **A entrada `Excluir conta`.** No mobile, uma **terceira linha no grupo `Privacidade e dados`**, abaixo de `Política de privacidade`, que abre a tela de exclusão empilhada sobre as Configurações. Na web, um **terceiro item na coluna esquerda**, abaixo de `Política de privacidade`, que abre o conteúdo de exclusão na coluna direita. A linha e o item têm **o mesmo desenho das linhas que já existem**: rótulo em `tinta`, sem `rubi`, sem ícone de alerta. O peso destrutivo mora na tela de exclusão, com as consequências escritas, a senha, a caixa de confirmação e o botão outline `rubi`; aqui é navegação.
- **O texto da política de privacidade sobre exclusão (RNF-SEC-42).** Os blocos `Por quanto tempo guardamos` e `Seus direitos` passam a dizer que a conta pode ser excluída pelas Configurações, que os dados ficam guardados e ocultos por 30 dias e que depois disso são apagados definitivamente, restando só registros técnicos sem nada que identifique o leitor. A linha de versão acompanha a mudança. O texto continua **mock declarado**: o texto jurídico final é entrega do grupo.

**O que deixa de valer do prompt original:** a proibição da seção 10 contra "excluir conta, nem linha, nem botão, nem seção de zona de perigo" deixa de valer **apenas na medida desta edição**: entra uma linha de navegação, e nada mais. Continua proibido desenhar uma "zona de perigo" tingida, um botão destrutivo nesta tela ou qualquer outra ação nova.

O canvas continua simulando um arquivo de Figma. **Nenhum artboard novo entra neste canvas**: os estados da exclusão têm canvas próprio. Os artboards existentes são alterados no lugar, sem mudar de posição.

### Dados dos artboards alterados

(Os dados do Período 1 continuam valendo para o que não mudou.)

**Grupo `Privacidade e dados`, mobile:** duas linhas, `Política de privacidade` e `Excluir conta`, nesta ordem.

**Coluna esquerda, web:** três itens, `Alterar senha`, `Política de privacidade` e `Excluir conta`, nesta ordem.

**Versão da política:** `Versão 1.1, de 29 de setembro de 2026` (antes, `Versão 1.0, de 15 de setembro de 2026`). A data é mock declarado e coincide com a do pedido de exclusão de exemplo do canvas de excluir conta.

**Política, bloco `Por quanto tempo guardamos`**, texto novo:
`Enquanto a conta existir. Se você pedir a exclusão, seus dados ficam guardados e ocultos para os outros leitores por 30 dias, e você pode cancelar nesse prazo. Depois disso, eles são apagados definitivamente, e só restam registros técnicos sem nada que identifique você. O token de recuperação de senha vale por 1 hora. Registros de acesso ficam por 6 meses.`

**Política, bloco `Seus direitos`**, texto novo:
`Você pode acessar e corrigir seus dados pelo perfil, pedir a exclusão da conta em Configurações e pedir suporte pelo e-mail de contato do projeto.`

Os blocos `Dados que coletamos` e `Para que usamos` **não mudam**.

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

## 3. O que permanece intocado

Tudo o que vem a seguir fica **exatamente como está no canvas**:

- **O shell inteiro.** Barra inferior do mobile com quatro itens (`Estante`, `Descobrir`, `Feed`, `Perfil`) e **Perfil** ativo; sidebar da web com os mesmos quatro itens e **Perfil** ativo em `musgo-fundo`. **A marca no topo da sidebar fica como está desenhada neste canvas.** O bloco MARCA da seção 2 é contexto do sistema, não instrução para trocar a marca desta tela. Nenhum quinto item de navegação.
- **O header mobile:** `ArrowLeft`, título `Configurações` em `display` `tinta` e o sino `Bell` com o badge `3`.
- **O header de conteúdo da web:** retorno textual `Perfil` e título `Configurações` em `display` `tinta`, sem sino.
- **O bloco de identificação:** `Marina Beltrão`, `@marinableu` e `marina.beltrao@gmail.com`, sem avatar, com o divisor abaixo.
- **O grupo `Conta`** com a linha `Alterar senha`, e os títulos dos dois grupos, `Conta` e `Privacidade e dados`.
- **A linha `Política de privacidade`**, na mesma posição, com o mesmo desenho.
- **O botão `Sair da conta`**, outline `rubi` com `SignOut`, e a linha `Lê Ai · versão 1.0.0` abaixo dele. O botão continua sendo **a única ação destrutiva desta tela**.
- **O modal `Sair da conta?`**, com a mesma copy, os mesmos botões e o mesmo scrim, no mobile e na web.
- **O estado `Saindo`**, com a mesma copy e sem spinner.
- **O skeleton do estado `Carregando`**, com as mesmas três barras.
- **Os blocos `Dados que coletamos` e `Para que usamos`** da política, palavra por palavra, e os quatro títulos de bloco.
- **O layout de duas colunas da web**, com a coluna esquerda de 320px, a coluna direita de no máximo 720px e o gap `space-12`.
- **A ordem e a posição dos artboards** em cada linha.

---

## 4. Artboards que mudam

**A linha nova, no mobile**, é idêntica às outras: 56px de altura, padding lateral `space-5`, rótulo `Excluir conta` em `body` `tinta` à esquerda e `CaretRight` (Phosphor, `regular`, 20px, `grafite-suave`) à direita, com divisor de 1px `linha` entre ela e `Política de privacidade`. Ela entra **no fim do grupo `Privacidade e dados`**, e o `space-8` que existia abaixo do último grupo passa a ficar abaixo dela. Tocar abre a tela `Excluir conta`, empilhada, do canvas próprio.

**O item novo, na web**, é idêntico aos outros da coluna esquerda: 44px de altura, `radius` 12, padding lateral `space-4`, rótulo `Excluir conta` em `body-strong`, com o mesmo tratamento de inativo, `hover` com fundo `linha` em `dur-fast` e aberto com fundo `musgo-fundo` e texto `musgo`. Ele entra **abaixo de `Política de privacidade`**, com o mesmo gap entre itens. O botão `Sair da conta` continua no fim da coluna, abaixo do item novo. Clicar abre o conteúdo de exclusão na coluna direita, desenhado no canvas próprio.

**Nem a linha nem o item usam `rubi`**, ícone de alerta ou qualquer destaque. Eles levam a uma tela; não excluem nada.

### 4.1 `Configurações · Padrão`

Entra a linha `Excluir conta` no fim do grupo `Privacidade e dados`. O botão `Sair da conta` e a linha de versão descem 56px. A tela continua cabendo sem rolagem em 844px: se não couber, a linha de versão é a que passa da dobra, e nada é comprimido.

### 4.2 `Configurações · Confirmar saída`

A tela ao fundo, sob o scrim, ganha a mesma linha `Excluir conta`. O modal não muda.

### 4.3 `Configurações · Saindo`

A mesma linha entra no grupo, com o mesmo desenho, enquanto o botão mostra `Saindo`.

### 4.4 `Configurações · Política de privacidade`

- A linha de versão passa de `Versão 1.0, de 15 de setembro de 2026` para `Versão 1.1, de 29 de setembro de 2026`.
- O texto do bloco `Por quanto tempo guardamos` é substituído pelo texto novo da seção 1.
- O texto do bloco `Seus direitos` é substituído pelo texto novo da seção 1.
- O resto do artboard, com os títulos, o header e os dois primeiros blocos, fica igual. O texto novo é mais longo, e a tela continua rolando como antes.

### 4.5 `Configurações · Carregando`

A linha `Excluir conta` aparece normalmente no grupo, como as outras: nenhuma linha espera dado do servidor.

### 4.6 `Configurações · Web, padrão, política aberta`

- Entra o item `Excluir conta` na coluna esquerda, abaixo de `Política de privacidade`, inativo.
- Na coluna direita, a política aberta recebe as mesmas trocas de 4.4: versão `Versão 1.1, de 29 de setembro de 2026` e os textos novos de `Por quanto tempo guardamos` e `Seus direitos`.

### 4.7 `Configurações · Web, confirmar saída`

Ao fundo, a coluna esquerda com o item `Excluir conta` e a política com os textos novos. O dialog não muda.

### 4.8 `Configurações · Web, item em hover`

Entra o item `Excluir conta`, inativo, abaixo de `Política de privacidade`. O hover continua sobre `Alterar senha`, e `Política de privacidade` continua aberto. A política na coluna direita recebe os textos novos.

### 4.9 `Configurações · Escuro, padrão`

Entra a linha `Excluir conta` no grupo `Privacidade e dados`, com rótulo em `papel-suave`, `CaretRight` em `grafite-fundo-escuro` e divisor em `linha-noite`, como as outras linhas no escuro.

### 4.10 `Configurações · Escuro, confirmar saída`

A tela ao fundo ganha a mesma linha, no tratamento escuro de 4.9. O modal não muda.

### 4.11 `Configurações · Escuro, política de privacidade`

As trocas de 4.4, com a versão em `grafite-fundo-escuro`, os títulos em `papel-suave` e os textos em `grafite-claro`, como já estão.

### 4.12 `Configurações · Escuro, web política aberta`

Entra o item `Excluir conta` na coluna esquerda, inativo, com rótulo no mesmo tom dos outros itens inativos no escuro e hover em `linha-noite`. A política na coluna direita recebe os textos novos.

---

## 5. Artboards novos

**Nenhum.** A tela de exclusão, com a explicação dos 30 dias, a senha, a caixa de confirmação, o modal, os erros e o estado `Exclusão solicitada`, tem canvas próprio, gerado por `docs/design/periodo-2/F-CONTA-2/excluir-conta.md`. Na web, aquele canvas redesenha as Configurações com o item `Excluir conta` aberto; este canvas mostra só a entrada.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

Nenhum componente novo. A linha de grupo e o item da coluna esquerda já existem neste canvas e são reaproveitados sem mudança de desenho. O conteúdo da política é texto.

**Nada nasce aqui.** Os componentes da exclusão nascem em `excluir-conta.md` e são registrados lá. Uma decisão desta edição fica para o grupo ratificar: a entrada `Excluir conta` **sem cor destrutiva** na lista, deixando o `rubi` só para o botão da tela de exclusão e para `Sair da conta`.

---

## 8. Copy nova ou alterada

| Onde | Texto que entra | Texto que sai |
|---|---|---|
| Linha nova do grupo `Privacidade e dados`, mobile | `Excluir conta` | nada, o elemento não existia |
| Item novo da coluna esquerda, web | `Excluir conta` | nada, o elemento não existia |
| Versão da política | `Versão 1.1, de 29 de setembro de 2026` | `Versão 1.0, de 15 de setembro de 2026` |
| Bloco `Por quanto tempo guardamos` | `Enquanto a conta existir. Se você pedir a exclusão, seus dados ficam guardados e ocultos para os outros leitores por 30 dias, e você pode cancelar nesse prazo. Depois disso, eles são apagados definitivamente, e só restam registros técnicos sem nada que identifique você. O token de recuperação de senha vale por 1 hora. Registros de acesso ficam por 6 meses.` | `Enquanto a conta existir. O token de recuperação de senha vale por 1 hora. Registros de acesso ficam por 6 meses.` |
| Bloco `Seus direitos` | `Você pode acessar e corrigir seus dados pelo perfil, pedir a exclusão da conta em Configurações e pedir suporte pelo e-mail de contato do projeto.` | `Você pode acessar e corrigir seus dados pelo perfil, e pedir suporte pelo e-mail de contato do projeto.` |

Nenhuma outra copy é substituída. Zero em-dash. Zero emoji. Os prazos aparecem com unidade: `30 dias`, `1 hora`, `6 meses`.

---

## 9. Acessibilidade e interação do que muda

- Alvo de toque de 48px no mobile na linha nova: ela tem 56px, com folga.
- A linha e o item são anunciados como navegação, `Excluir conta, abre uma tela`, e não como ação: tocar não exclui nada.
- Foco de teclado visível na web no item novo, com contorno de 2px `musgo` e offset de 2px, e a ordem de tabulação seguindo a ordem visual: `Alterar senha`, `Política de privacidade`, `Excluir conta`, `Sair da conta`.
- Contraste WCAG AA nos dois temas: rótulo em `tinta` sobre `papel` e em `papel-suave` sobre `noite`.
- O texto novo da política continua texto real, navegável por leitor de tela, com os quatro títulos como cabeçalhos de seção.
- `prefers-reduced-motion` respeitado: o hover do item novo vira troca instantânea.

---

## 10. O que não fazer nesta edição

**Regras da edição**

- **Não redesenhe o que não foi citado.** Header, identificação, grupos existentes, botão de sair, modais e skeleton ficam como estão.
- **Não reordene artboards** nem crie artboards novos neste canvas.
- **Não crie uma "zona de perigo"** tingida de `rubi` ou `rubi-fundo`, nem uma seção separada para a exclusão. É uma linha no grupo `Privacidade e dados`.
- **Não pinte a linha nem o item `Excluir conta` de `rubi`**, e não ponha ícone de alerta, `Trash` ou `Warning` neles.
- **Não ponha botão destrutivo nesta tela** além de `Sair da conta`. O botão `Excluir conta` mora na tela de exclusão.
- **Não desenhe a tela de exclusão aqui**, nem a abra dentro da coluna direita deste canvas. Ela tem canvas próprio.
- **Não mova `Sair da conta`** para outro lugar, nem o transforme em linha de grupo.
- Continua valendo do prompt original: sem preferências de notificação por tipo, sem seletor de tema, sem seletor de idioma, sem privacidade de perfil aqui, sem lista de aparelhos conectados, sem linhas de suporte, avaliação na loja, convite de amigos ou "sobre nós", sem `switch` em linha, sem engrenagem dentro da tela, sem undo depois de sair, sem toast, sem política em PDF, imagem ou link externo, e sem aceite da política com checkbox.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela: a política é texto de interface, em Manrope.
- Nada de mistura de família dentro do mesmo título.
- Nada de overline em toda seção e nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão nem em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo nem de spinner girando.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de label poético. A linha diz o que faz: `Excluir conta`.
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão.
- Nada de toast com fundo saturado.
- Nada de botão destrutivo preenchido. Destrutivo é outline `rubi`.

**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal. A exclusão tem modal, na tela dela.
- Nada de desfazer em ação destrutiva pesada.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de hero de landing, bento grid ou três colunas de ícones.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
