# F-CONTA-2 · Excluir conta

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-CONTA-2.md
**Requisitos:** RF-AUT-07 (solicitar a exclusão da própria conta, recuperar em até 30 dias e, vencido o prazo, ter dados e conteúdos removidos definitivamente)
**Não funcionais:** RNF-SEC-41 (recuperação em 30 dias e remoção definitiva depois), RNF-USA-04 (confirmação explícita em modal antes da ação destrutiva), RNF-USA-05 (erro em pt-BR e acionável), RNF-SEC-30 (todos os tokens de renovação revogados), RNF-SEC-42 (a política de privacidade informa retenção e exclusão), RNF-ERR-04 (repetir o pedido não duplica: chave de idempotência), RNF-ERR-09 (cold start do servidor tratado como carregamento), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** RN-23 (exclusão e recuperação de conta: reautenticação por senha, confirmação explícita, janela de 30 dias com conta e conteúdo ocultos, revogação de tokens, username e e-mail reservados durante a janela, remoção definitiva por job depois do prazo)
**Versão web:** sim. RF-AUT-07 tem marcação na coluna Web de `REQUISITOS.md` §5.1.
**De onde se chega:** a linha `Excluir conta` do grupo `Privacidade e dados` das Configurações, no mobile; o terceiro item da coluna esquerda das Configurações, na web. As duas entradas são desenhadas na edição do Período 2 em [`../configuracoes/configuracoes.md`](../configuracoes/configuracoes.md). **Para onde se vai:** depois de confirmar, a sessão acaba e a tela vira `Exclusão solicitada`, sem shell, com `Ir para o login`. O login seguinte abre a tela de recuperação, em [`recuperar-conta.md`](recuperar-conta.md).

---

## 1. Contexto

A tela em que o leitor **pede para apagar a própria conta**. É a ação mais pesada do produto, e a única que atinge tudo o que ele registrou: estante, leituras, progresso, notas, resenhas, frases, comentários, listas, desafios, quem ele segue e quem o segue.

**Ela não apaga nada na hora.** RN-23 cria uma janela de **30 dias**. O que acontece no toque de confirmar é outra coisa, e a tela precisa dizer isso com exatidão, sem suavizar e sem assustar além do necessário:

1. **Na hora:** a conta, o perfil e todo o conteúdo ficam **ocultos para os outros leitores**. Os dados continuam guardados. O leitor sai deste aparelho e de todos os outros.
2. **Durante 30 dias:** basta entrar com e-mail e senha para **cancelar a exclusão**. Nada terá sido perdido. O nome de usuário e o e-mail continuam reservados para esta conta.
3. **Depois do prazo:** a remoção é **definitiva**. Não há suporte que recupere.

**Três travas antes de pedir, todas exigidas por RN-23.1:**

- **A senha atual.** Reautenticação: quem está com o aparelho desbloqueado de outra pessoa não consegue excluir a conta dela.
- **Uma confirmação explícita na própria tela**, uma caixa de marcar com a frase do que é irreversível. O botão só se habilita com a senha preenchida e a caixa marcada.
- **O modal destrutivo** de RNF-USA-04, depois do botão. É ele que dispara o pedido.

**O que acontece depois.** O servidor responde com a data limite, o aplicativo **limpa a sessão** (na web, o estado de sessão; no mobile, o armazenamento seguro) e a tela vira `Exclusão solicitada`, **fora do shell**: sem barra inferior, sem sidebar, sem sino, porque o leitor não está mais autenticado. Ela mostra a data limite e leva ao login. O próximo login dessa conta não abre o feed: abre a tela de recuperação.

**Onde fica.** No mobile, é uma **tela empilhada** sobre as Configurações, dentro da área `Perfil`, com header de detalhe. Na web, **é a coluna direita das Configurações** com o item `Excluir conta` aberto na coluna esquerda: o mesmo layout de duas colunas que as Configurações já têm, com a política de privacidade no lugar de antes.

A tela não sustenta registro, meta nem pertencimento. Ela sustenta o **controle do leitor sobre os próprios dados**, que é obrigação da LGPD e condição para confiar os outros três ao produto.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o leitor os encontra.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Excluir conta · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
| E-mail da conta | `marina.beltrao@gmail.com` |
| Data do pedido | `29 de setembro de 2026` |
| Data limite para recuperar | `29 de outubro de 2026` (30 dias depois do pedido) |
| Prazo | `30 dias` |
| Campo Senha atual | oito a doze pontos, nunca texto legível no estado padrão |
| Badge de não lidas no sino | `3` |

**A data limite aparece antes do pedido.** Nas consequências e na caixa de confirmação, a tela mostra `29 de outubro de 2026`, calculada no aparelho como hoje mais 30 dias, para que o leitor saiba exatamente até quando pode voltar atrás. Na tela `Exclusão solicitada`, a data exibida é **a que o servidor devolveu** na resposta do pedido. As duas coincidem no exemplo.

**A tela não mostra contagem do que será apagado** (`42 livros, 13 resenhas`): nenhum endpoint devolve esse inventário, e o texto das consequências já nomeia cada tipo de conteúdo. Não mostra avatar: a identidade é do perfil.

Todo número aparece com unidade: `30 dias`. Nenhum valor é fake-preciso.

---

## 4. Artboards mobile (390 x 844)

Os artboards 4.1 a 4.7 são de tela autenticada e são desenhados **dentro do shell**. O artboard 4.8, `Exclusão solicitada`, é **fora do shell**, porque a sessão já acabou.

Toda tela autenticada é desenhada dentro do shell do produto. O shell é
idêntico em todas elas e precisa ser desenhado por extenso aqui.

**Mobile, barra inferior.** Fixa no rodapé da viewport, acima da área segura.
Altura de 64px mais a área segura, fundo `papel-elevado`, divisor de 1px
`linha` no topo, sem sombra. Quatro itens de largura igual: `Estante`,
`Descobrir`, `Feed`, `Perfil`. Cada item empilha ícone de 24px acima e rótulo
em `caption` abaixo, com `space-1` de gap, centralizado, e a área tocável tem
no mínimo 48px de altura. Ícones Phosphor: `Books` para Estante, `Compass`
para Descobrir, `Newspaper` para Feed, `UserCircle` para Perfil. Inativo:
ícone peso `regular`, cor `grafite`; rótulo em `caption` `grafite`. Ativo:
ícone peso `fill`, cor `musgo`; rótulo em `caption` peso 600, cor `musgo`.
Sem pill de fundo atrás do item ativo, sem indicador deslizante, sem ícone
que salta. **Nesta tela o item ativo é `Perfil`.**

**Mobile, header.** Altura de 72px mais a área segura, padding lateral
`space-5`, fundo `papel`, sem sombra. O sino `Bell` (Phosphor, `regular`,
24px, `tinta`) fica à direita e é fixo em toda tela autenticada. Badge de não
lidas: círculo de 18px, fundo `musgo`, encostado no canto superior direito do
ícone, número centralizado em 11px peso 600 cor `papel`; acima de nove mostra
`9+`; sem não lidas, o badge simplesmente não existe.

**Web, sidebar.** Coluna fixa à esquerda, altura total da viewport, expandida
por padrão com 248px de largura, fundo `papel-elevado`, borda direita de 1px
`linha`. Bloco do topo de 72px, padding lateral `space-5`, com o lockup
horizontal da marca à esquerda (símbolo da folha sobre livro aberto seguido
de `Lê Ai`, os dois em `musgo`, `space-3` de gap, 24px de altura) e
`SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita. Abaixo,
`space-4` de respiro e os quatro itens empilhados com `space-1` de gap dentro
de padding lateral `space-3`: altura de 44px, `radius` 12, padding lateral
`space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em
`body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo
transparente. Hover: fundo `linha`, transição `dur-fast`. Ativo: fundo
`musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`. **Nesta tela o item
ativo é `Perfil`.**

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

Tela de detalhe empilhada sobre `Configurações`, dentro da área `Perfil`.

- Altura de 72px mais a área segura, padding lateral `space-5`, fundo `papel`, sem sombra.
- `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, alvo de 48px, voltando a `Configurações` sem pedir nada.
- Título `Excluir conta` em `display` `tinta`, à esquerda, logo depois da seta, alinhado à base.
- `Bell` à direita, com o badge `3`.
- Divisor de 1px `linha` na base do header apenas quando o conteúdo rola por baixo dele.
- **A barra inferior continua visível**, com `Perfil` ativo.

### Corpo

Padding lateral `space-5`, `space-6` de respiro abaixo do header. A tela **rola**: o texto das consequências, o campo e os botões não cabem juntos em 844px, e isso é aceito. Nada é comprimido para caber.

1. **Abertura**, em `body-lg` Manrope 400 `tinta`, no máximo três linhas: `Você pode pedir a exclusão agora e mudar de ideia em até 30 dias.`
2. `space-6`.
3. **Lista das consequências**, quatro itens empilhados com `space-5` entre eles. Cada item é uma linha com ícone Phosphor `regular` de 20px em `grafite` à esquerda, alinhado ao topo do título, `space-3` de gap, e à direita um título em `body-strong` `tinta` com o texto em `body` `grafite` logo abaixo, `space-1` de gap. Sem card, sem fundo, sem divisor entre itens: é leitura corrida.
   - `EyeSlash` · **`Oculta a partir de agora`** · `Seu perfil, sua estante, suas resenhas, frases, comentários e listas deixam de aparecer para os outros leitores assim que você confirmar. Nada é apagado neste momento.`
   - `ClockCounterClockwise` · **`30 dias para voltar atrás`** · `Até 29 de outubro de 2026, basta entrar com seu e-mail e senha para cancelar a exclusão. Tudo volta como estava.`
   - `Trash` · **`Depois do prazo, é definitivo`** · `Sua conta e tudo o que você registrou, como leituras, progresso, notas, resenhas, desafios e quem você segue, são apagados e não podem ser recuperados.`
   - `At` · **`Nome de usuário e e-mail reservados`** · `Durante os 30 dias, @marinableu e marina.beltrao@gmail.com continuam ligados a esta conta e não podem ser usados em outra.`
4. `space-8` e um divisor de 1px `linha` de largura total, com `space-8` abaixo. Como em `Alterar senha`, o divisor separa **entender o que acontece** de **provar quem você é e confirmar**.
5. **Campo `Senha atual`**: label em `label` `grafite`, `space-2` de gap, campo de 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto digitado em `body` `tinta`, com `Eye` (Phosphor, `regular`, 20px, `grafite`) dentro à direita, alvo de 48px, que alterna para `EyeSlash` quando a senha está visível. Sem placeholder.
6. `space-3`, helper em `caption` `grafite`, visível o tempo todo: `Para confirmar que é você quem está pedindo.`
7. `space-6`, **caixa de confirmação**: linha acionável inteira, altura mínima de 48px, com a caixa de marcar de 20px à esquerda, `radius-sm`, borda de 1.5px `grafite`, fundo transparente, alinhada ao topo do texto, `space-3` de gap, e o texto em `body` `tinta`: `Entendi que, depois de 29 de outubro de 2026, a exclusão não pode ser desfeita.` Marcada: fundo `musgo`, borda `musgo`, `Check` (Phosphor, `bold`, 14px, `papel`) centralizado. **A caixa marcada usa o acento do produto, não `rubi`:** marcar é concordar, e a ação destrutiva é o botão.
8. `space-5`, **linha de aviso** em `caption` `grafite`, com `Info` (Phosphor, `regular`, 16px, `grafite`) à esquerda e `space-2` de gap: `Ao confirmar, você sai do aplicativo neste e em todos os outros aparelhos.`
9. `space-8`, **botão destrutivo** `Excluir conta`: largura total, 48px de altura, `radius` 12, **outline**, borda de 1px `rubi`, fundo transparente, texto `rubi` em `body-strong`. Sem ícone. **Nunca preenchido.** Desabilitado, com opacidade de 40% e sem resposta ao toque, enquanto a senha estiver vazia ou a caixa desmarcada.
10. `space-4`, botão textual centralizado em `body-strong` `grafite`: `Cancelar`, que volta a `Configurações`.
11. `space-8` de respiro antes da barra inferior.

### 4.1 Padrão

A tela aberta, rolada no topo. Header, abertura, as quatro consequências e, abaixo da dobra, o começo do divisor. Campo de senha vazio e caixa desmarcada ficam abaixo da dobra neste artboard. Barra inferior com `Perfil` ativo.

**Não há estado de carregamento.** A tela não depende de servidor para abrir: o texto é fixo, a identidade vem da sessão e a data limite é calculada no aparelho. **Não há estado vazio:** a tela não lista coleção nenhuma.

### 4.2 Pronta para excluir

A mesma tela **rolada até o fim**. O header ganha o divisor de 1px `linha` na base, porque o conteúdo passou por baixo dele.

- Visível do fim da consequência `Nome de usuário e e-mail reservados` para baixo: divisor, campo `Senha atual` preenchido com dez pontos e borda de 1px `linha`, helper, caixa de confirmação **marcada**, linha de aviso, botão `Excluir conta` **habilitado** em outline `rubi`, e `Cancelar`.
- Este artboard serve para conferir o botão habilitado: borda e texto em `rubi` a 100%, fundo transparente.

### 4.3 Confirmar exclusão

O leitor tocou em `Excluir conta`. Confirmação destrutiva conforme RNF-USA-04 e design §4.11, **em bottom sheet**, porque abaixo de 768px toda sobreposição é sheet.

- Atrás, a tela de 4.2, sob o scrim `#171512` a 40%. A barra inferior fica abaixo do scrim e não é acionável.
- Sheet ancorado embaixo, largura total, fundo `papel`, `radius-lg` só no topo, padding `space-6`, `elev-3`, com a alça de 32 por 4px em `linha`, centralizada, `space-5` acima do conteúdo. O padding inferior soma a área segura.
- Título em `title-sm` `tinta`: `Excluir sua conta?`
- `space-3`, consequência em `body` `grafite`: `Sua conta fica oculta a partir de agora e é apagada definitivamente em 29 de outubro de 2026. Até lá, você pode cancelar entrando de novo.`
- `space-6`, dois botões empilhados em largura total, com `space-3` de gap, **destrutivo em cima**:
  - Outline `rubi`, 48px, `radius` 12: `Excluir conta`.
  - Botão textual `grafite`, largura total: `Cancelar`.
- O foco entra em `Cancelar`, nunca no destrutivo. `Esc`, toque no scrim ou arrastar a alça para baixo fecham sem pedir nada.
- **Sem campo de digitar "EXCLUIR"**, sem contagem regressiva no botão. A senha e a caixa já são as travas; o modal é a última palavra.

### 4.4 Excluindo, com cold start

O pedido foi enviado e o servidor está acordando. Estado de RNF-ERR-09: demora é carregamento, nunca erro.

- O sheet fecha. A tela de 4.2 permanece, com o campo de senha e a caixa com opacidade reduzida e sem foco possível.
- O botão `Excluir conta` mantém a borda `rubi`, troca o texto para `Excluindo` e fica desabilitado ao toque.
- `space-3` abaixo do botão, linha em `caption` `grafite`: `O servidor está iniciando. Isso pode levar alguns segundos.`
- O `ArrowLeft` e o `Cancelar` ficam desabilitados enquanto o pedido está em curso: sair no meio deixaria o leitor sem saber se a conta foi ou não posta em exclusão.
- **Sem spinner, sem barra indeterminada, sem ponto pulsando.**

### 4.5 Senha incorreta

O servidor recusou a senha. Nada foi pedido.

- A tela rola até o campo, de modo que o banner e o campo fiquem visíveis abaixo do header.
- Banner acima do campo `Senha atual`, largura total, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `WarningCircle` (Phosphor, `regular`, 20px, `rubi`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Senha incorreta. Sua conta continua como estava.`
- `space-6` entre o banner e o campo.
- Campo `Senha atual` com borda de 1.5px `rubi` e **valor limpo**, com o foco nele.
- A caixa de confirmação **continua marcada**: não é ela que está errada.
- Botão `Excluir conta` desabilitado até a senha ser digitada de novo.
- Sem mensagem inline repetindo o banner abaixo do campo.

### 4.6 Muitas tentativas

O leitor errou a senha várias vezes seguidas e o limite de tentativas respondeu. Isto é **alerta**, não erro de conteúdo.

- Banner no mesmo lugar de 4.5, fundo `ambar-fundo`, `radius` 12, padding `space-4`, com `Warning` (Phosphor, `regular`, 20px, `ambar`) à esquerda, `space-3` de gap, texto em `body` `tinta`: `Muitas tentativas com a senha errada. Espere alguns minutos para tentar de novo.`
- Campo `Senha atual` volta à borda de 1px `linha`, desabilitado com opacidade reduzida.
- Botão `Excluir conta` desabilitado.
- **Sem contagem regressiva animada.**

### 4.7 Erro ao enviar

O pedido não chegou ao servidor ou o servidor falhou. **Nada mudou na conta**, e a tela diz isso.

- Banner acima do botão `Excluir conta`, largura total, fundo `rubi-fundo`, `radius` 12, padding `space-4`, com `WarningCircle` (Phosphor, `regular`, 20px, `rubi`) à esquerda, texto em `body` `tinta`: `Não foi possível pedir a exclusão. Sua conta continua como estava. Verifique sua conexão e tente de novo.`
- `space-5` entre o banner e o botão.
- Senha **preservada** no campo e caixa **marcada**: o leitor tenta de novo com um toque, que abre de novo a confirmação de 4.3.
- Repetir o pedido não cria dois pedidos: o aplicativo reenvia com a mesma chave de idempotência.

### 4.8 Exclusão solicitada

O servidor aceitou o pedido. O aplicativo **limpou a sessão** e o armazenamento seguro do aparelho. A tela sai do shell.

**Tela fora do shell: sem barra inferior, sem header de detalhe, sem sino.** Fundo `papel`, ocupando a viewport inteira. Padding lateral `space-5`. De cima para baixo:

1. `space-6` de respiro a partir do topo seguro.
2. **Lockup horizontal da marca** em `musgo`, 24px de altura, alinhado à esquerda. Não é acionável.
3. `space-16`.
4. `CalendarX` (Phosphor, `regular`, 32px, `grafite`). O ícone é `grafite`, não `musgo`: a tela confirma um pedido, não comemora nada.
5. `space-5`, título em `title-lg` `tinta`: `Exclusão solicitada`.
6. `space-4`, texto em `body` `grafite`: `Sua conta já está oculta para os outros leitores e você saiu de todos os aparelhos.`
7. `space-5`, **bloco da data**, largura total, fundo `papel-elevado`, `radius-md`, padding `space-5`:
   - Label em `label` `grafite`: `Remoção definitiva em`.
   - `space-2`, a data em `title` `tinta`: `29 de outubro de 2026`.
   - `space-2`, em `caption` `grafite`: `Até essa data, entre com seu e-mail e senha para cancelar a exclusão.`
8. `space-8`, botão primário `Ir para o login`, largura total, 48px, `radius-full`, fundo `musgo`, texto `papel` em `body-strong`.
9. Nada mais. **Sem botão de desfazer aqui**: a sessão acabou, e o caminho de volta é o login, que abre a recuperação.

O botão voltar do sistema, no Android, **não** devolve às Configurações: a sessão não existe mais. Ele leva ao login, como o botão.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: no viewport de celular usa o desenho mobile, no desktop usa o desenho abaixo. Os dois são os **dois extremos do mesmo componente responsivo**, não dois produtos.

### Estrutura da web

**A tela é as Configurações com o item `Excluir conta` aberto.** Desenhe as Configurações inteiras, como já existem, e troque só o conteúdo da coluna direita:

- Sidebar do shell à esquerda, expandida em 248px, item **Perfil** ativo.
- Área de conteúdo com padding lateral `space-8`, header de conteúdo de 72px com o botão textual `musgo` de retorno, `ArrowLeft` (Phosphor, `regular`, 20px) mais o texto `Perfil`, e o título `Configurações` em `display` `tinta`. Sem sino.
- **Duas colunas dentro da área de conteúdo**, com gap `space-12`:
  - **Coluna esquerda de 320px**, igual à das Configurações: bloco de identificação (`Marina Beltrão` em `title-sm` `tinta`, `@marinableu` em `caption` `grafite-suave`, `marina.beltrao@gmail.com` em `caption` `grafite`), e a lista de itens de 44px, `radius` 12, padding lateral `space-4`, rótulo em `body-strong`: `Alterar senha`, `Política de privacidade` e **`Excluir conta`, aberto**, com fundo `musgo-fundo` e texto `musgo`, como qualquer item aberto. No fim da coluna, o botão `Sair da conta`, outline `rubi`, 40px de altura, largura da coluna, e abaixo a linha `Lê Ai · versão 1.0.0` em `caption` `grafite-suave`.
  - **Coluna direita**, o resto da largura até no máximo **560px** de conteúdo, alinhada ao topo da coluna esquerda: o conteúdo de excluir conta.
- **Conteúdo da coluna direita**, de cima para baixo:
  1. Título em `title-lg` `tinta`: `Excluir sua conta`.
  2. `space-4`, a abertura em `body-lg` Manrope `tinta`: `Você pode pedir a exclusão agora e mudar de ideia em até 30 dias.`
  3. `space-6`, as **quatro consequências** com o mesmo desenho do mobile (ícone de 20px `grafite`, título `body-strong`, texto `body` `grafite`), com `space-5` entre elas.
  4. `space-8`, divisor de 1px `linha` na largura da coluna, `space-8`.
  5. Campo `Senha atual`, 44px de altura, largura máxima de 400px, com `Eye` dentro, e o helper abaixo.
  6. `space-6`, caixa de confirmação com o texto ao lado.
  7. `space-5`, linha de aviso com `Info`.
  8. `space-8`, linha de botões alinhada à esquerda: `Excluir conta` outline `rubi`, 40px de altura, `radius` 12, padding lateral `space-5`, e à direita dele, `space-4` de gap, `Cancelar` textual `grafite`, que volta ao item `Política de privacidade`.
- A coluna direita rola **dentro da área de conteúdo**; a coluna esquerda fica fixa.
- **Estados de ponteiro e teclado:** `hover` no item `Excluir conta` já aberto não muda nada; `hover` nos outros itens com fundo `linha`, `dur-fast`. `hover` no botão `Excluir conta` com fundo `rubi-fundo` sob a borda `rubi`, `dur-fast`, continuando outline. `hover` em `Cancelar` com sublinhado. Foco de teclado visível com contorno de 2px `musgo` e offset de 2px em item, campo, caixa e botões, na ordem visual.
- **Abaixo de 768px** as duas colunas viram a lista de linhas do mobile, esta tela abre empilhada com o header de 4.1, e a sidebar dá lugar à barra inferior.

### 5.1 Padrão, pronta para excluir

Configurações com `Excluir conta` aberto. Coluna direita com o título, a abertura, as quatro consequências, o divisor, o campo com dez pontos, a caixa **marcada**, a linha de aviso e os dois botões, com `Excluir conta` habilitado. Tudo cabe em 900px sem rolar.

### 5.2 Confirmar exclusão

A tela de 5.1 sob o scrim `#171512` a 40%. **Dialog centrado** de 480px, `radius-xl`, fundo `papel`, `elev-3`, padding `space-6`, sem alça:

- Título em `title-sm` `tinta`: `Excluir sua conta?`
- `space-3`, a consequência de 4.3 em `body` `grafite`.
- `space-6`, botões **lado a lado, alinhados à direita**, `space-3` de gap: `Cancelar` textual `grafite` primeiro, depois `Excluir conta` outline `rubi`, 40px.
- Foco inicial em `Cancelar`, com o contorno de foco visível. `Esc` fecha.

### 5.3 Senha incorreta

Coluna direita com o banner `rubi-fundo` de 4.5 acima do campo, `Senha incorreta. Sua conta continua como estava.`, campo com borda de 1.5px `rubi`, valor limpo e foco nele, caixa ainda marcada e o botão `Excluir conta` desabilitado.

### 5.4 Exclusão solicitada

A sessão acabou: **sem sidebar**. O desenho é o das telas de autenticação, em **duas colunas**, para que a família seja reconhecível:

- **Coluna esquerda**, 44% da largura, altura total, fundo `papel-elevado`, padding horizontal `space-16`, conteúdo alinhado à esquerda e centralizado na vertical: **só o lockup horizontal** da marca em `musgo`, com a área de proteção de ao menos a largura da folha. Sem a frase de apresentação do login: esta não é tela de boas-vindas.
- **Coluna direita**, 56% da largura, fundo `papel`, conteúdo centralizado nos dois eixos numa coluna de no máximo 420px: `CalendarX` de 32px `grafite`, o título `Exclusão solicitada` em `title-lg`, o texto, o bloco da data em `papel-elevado` com `radius-md` e o botão primário `Ir para o login` em largura total, 40px, `radius-full`.
- `hover` no botão primário levando `musgo` para `musgo-vivo` em `dur-fast`; foco visível.
- Abaixo de 768px a coluna esquerda desaparece e a direita vira o desenho de 4.8.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: nenhuma seção inverte no meio da rolagem. Superfície elevada fica **mais clara** que o fundo. `musgo-claro` é o acento. Os shadows ficam com **metade da opacidade**: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

- **`Excluir conta · Escuro, pronta para excluir` (mobile).** Equivalente a 4.2. Fundo `noite`. Título do header, `ArrowLeft` e `Bell` em `papel-suave`, badge em `musgo-claro` com número em `noite`. Títulos das consequências em `papel-suave`, textos e ícones em `grafite-claro`. Divisores em `linha-noite`. Label em `grafite-claro`, campo com fundo `noite-elevada`, **mais claro** que o fundo, borda de 1px `linha-noite`, pontos em `papel-suave`, `Eye` em `grafite-claro`. Caixa marcada com fundo `musgo-claro` e `Check` em `noite`; texto da caixa em `papel-suave`. Linha de aviso em `grafite-claro`. Botão `Excluir conta` com borda e texto em `rubi-claro`, fundo transparente. `Cancelar` em `grafite-claro`. Barra inferior em `noite-elevada` com `Perfil` ativo em `musgo-claro`.
- **`Excluir conta · Escuro, confirmar exclusão` (mobile).** Equivalente a 4.3. Scrim preto a 60%. Sheet em `noite-elevada`, alça em `linha-noite`, título em `papel-suave`, texto em `grafite-claro`, destrutivo com borda e texto `rubi-claro`, `Cancelar` em `grafite-claro`.
- **`Excluir conta · Escuro, exclusão solicitada` (mobile).** Equivalente a 4.8. Fundo `noite`, lockup em `musgo-claro`, `CalendarX` em `grafite-claro`, título em `papel-suave`, texto em `grafite-claro`, bloco da data em `noite-elevada` com label em `grafite-claro` e data em `papel-suave`, botão primário com fundo `musgo-claro` e texto `noite`.
- **`Excluir conta · Escuro, web pronta para excluir`.** Equivalente a 5.1. Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, lockup em `musgo-claro`, item **Perfil** com fundo `musgo-fundo-escuro` e texto `musgo-claro`. Na coluna esquerda das Configurações, item `Excluir conta` aberto com fundo `musgo-fundo-escuro` e texto `musgo-claro`; `Sair da conta` com borda e texto `rubi-claro`. Coluna direita com o mesmo tratamento do mobile escuro.

Os banners, quando aparecem no escuro, usam `rubi-fundo-escuro` com ícone `rubi-claro` (erro) e `ambar-fundo-escuro` com ícone `ambar-claro` (alerta), texto em `papel-suave`. Borda de erro do campo em `rubi-claro`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Botão outline destrutivo em `rubi`, nunca preenchido | documento-de-design §4.1 e §7.8 |
| Botão primário pill, botão textual | documento-de-design §4.1 |
| Campo com label acima, helper permanente, erro inline e toggle de mostrar senha | documento-de-design §4.2 e §7.9 |
| Bottom sheet no mobile e dialog centrado de 480px na web, com a confirmação destrutiva | documento-de-design §4.11 e §7.8 |
| Tela única de recuperação para conta com exclusão pendente (destino do login seguinte) | documento-de-design §7.8 |
| Banner de erro em `rubi-fundo` e de alerta em `ambar-fundo` | documento-de-design §3.1.3 |
| Lockup horizontal da marca | documento-de-design §3.7 |
| Escala tipográfica, paleta, espaçamento, raio, elevação e motion | documento-de-design §3.1 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell, header de detalhe e layout de duas colunas das Configurações | periodo-0/P0-NAV/shell-de-navegacao.md e periodo-1/F-AUT/configuracoes.md |
| Duas colunas das telas de autenticação, na web | periodo-1/F-AUT/login.md e recuperar-senha.md |

**Nasce aqui**, e vira pendência de incorporação ao `documento-de-design.md` pelo controle de mudança (plano §3), junto com os demais componentes do lote 5 do Período 2:

1. **Lista de consequências** com ícone de 20px, título em `body-strong` e texto em `body` `grafite`, sem card.
2. **Caixa de marcar de confirmação explícita** (20px, `radius-sm`, marcada em `musgo` com `Check`). O `documento-de-design.md` não define caixa de marcar; a do seletor de destinatários de `recomendar-livro` é o precedente mais próximo.
3. **Botão destrutivo desabilitado** (outline `rubi` a 40%) e **hover do destrutivo** com fundo `rubi-fundo` sob a borda.
4. **Tela de resultado fora do shell** depois de a sessão acabar (`Exclusão solicitada`), com o **bloco da data** em `papel-elevado` e `radius-md`, e a variante da coluna esquerda de autenticação **só com o lockup**, sem a frase.
5. **Confirmação destrutiva em bottom sheet no mobile.** Segue o §4.11; o modal de sair das Configurações do Período 1 é um card centrado de 320px, e os dois convivem no mesmo fluxo até o grupo decidir.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do header, mobile | `Excluir conta` |
| Título da coluna direita, web | `Excluir sua conta` |
| Abertura | `Você pode pedir a exclusão agora e mudar de ideia em até 30 dias.` |
| Consequência 1, título | `Oculta a partir de agora` |
| Consequência 1, texto | `Seu perfil, sua estante, suas resenhas, frases, comentários e listas deixam de aparecer para os outros leitores assim que você confirmar. Nada é apagado neste momento.` |
| Consequência 2, título | `30 dias para voltar atrás` |
| Consequência 2, texto | `Até 29 de outubro de 2026, basta entrar com seu e-mail e senha para cancelar a exclusão. Tudo volta como estava.` |
| Consequência 3, título | `Depois do prazo, é definitivo` |
| Consequência 3, texto | `Sua conta e tudo o que você registrou, como leituras, progresso, notas, resenhas, desafios e quem você segue, são apagados e não podem ser recuperados.` |
| Consequência 4, título | `Nome de usuário e e-mail reservados` |
| Consequência 4, texto | `Durante os 30 dias, @marinableu e marina.beltrao@gmail.com continuam ligados a esta conta e não podem ser usados em outra.` |
| Label do campo | `Senha atual` |
| Helper do campo | `Para confirmar que é você quem está pedindo.` |
| Rótulo acessível do olho | `Mostrar senha` / `Ocultar senha` |
| Caixa de confirmação | `Entendi que, depois de 29 de outubro de 2026, a exclusão não pode ser desfeita.` |
| Linha de aviso | `Ao confirmar, você sai do aplicativo neste e em todos os outros aparelhos.` |
| Botão destrutivo | `Excluir conta` |
| Botão destrutivo, em curso | `Excluindo` |
| Botão textual | `Cancelar` |
| Aviso de cold start | `O servidor está iniciando. Isso pode levar alguns segundos.` |
| Confirmação, título | `Excluir sua conta?` |
| Confirmação, texto | `Sua conta fica oculta a partir de agora e é apagada definitivamente em 29 de outubro de 2026. Até lá, você pode cancelar entrando de novo.` |
| Confirmação, destrutivo | `Excluir conta` |
| Confirmação, textual | `Cancelar` |
| Senha incorreta | `Senha incorreta. Sua conta continua como estava.` |
| Muitas tentativas | `Muitas tentativas com a senha errada. Espere alguns minutos para tentar de novo.` |
| Erro ao enviar | `Não foi possível pedir a exclusão. Sua conta continua como estava. Verifique sua conexão e tente de novo.` |
| Exclusão solicitada, título | `Exclusão solicitada` |
| Exclusão solicitada, texto | `Sua conta já está oculta para os outros leitores e você saiu de todos os aparelhos.` |
| Bloco da data, label | `Remoção definitiva em` |
| Bloco da data, valor | `29 de outubro de 2026` |
| Bloco da data, apoio | `Até essa data, entre com seu e-mail e senha para cancelar a exclusão.` |
| Botão da tela final | `Ir para o login` |
| Retorno web | `Perfil` |
| Itens da coluna esquerda, web | `Alterar senha`, `Política de privacidade`, `Excluir conta` |

Zero em-dash em toda a copy. Zero emoji. O prazo aparece sempre com unidade, `30 dias`, e a data sempre por extenso, sem `29/10`.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo nos dois temas. As consequências usam `grafite` no texto, nunca `grafite-suave`, porque são a informação essencial da tela. `rubi` sobre `papel` e `rubi-claro` sobre `noite` passam AA no botão.
- Alvo de toque de 48px no mobile no `ArrowLeft`, no olho do campo, na linha inteira da caixa de confirmação (tocar no texto marca a caixa), no botão destrutivo, em `Cancelar` e nos botões do sheet.
- A caixa de confirmação é um checkbox real, com o texto como rótulo associado, anunciado como `marcado` ou `não marcado`. O botão desabilitado é anunciado como indisponível, e a razão está nos dois controles acima dele.
- A ação destrutiva é distinguível **sem depender de cor**: rótulo explícito, posição depois das travas e a confirmação em modal.
- O sheet e o dialog prendem o foco, começam em `Cancelar`, fecham com `Esc` e devolvem o foco ao botão `Excluir conta`.
- No erro de senha, o foco vai para o campo e o banner é anunciado como alerta. Em `Exclusão solicitada`, o foco inicial vai para o título.
- **O pedido não duplica.** O botão fica desabilitado durante o envio, e um reenvio depois de erro usa a mesma chave de idempotência.
- **Limpeza de sessão:** ao receber a resposta, o aplicativo apaga o token de acesso e qualquer dado de sessão (no mobile, o armazenamento seguro) **antes** de mostrar `Exclusão solicitada`. Voltar pelo histórico do navegador ou pelo botão do sistema não reabre tela autenticada.
- Foco de teclado visível na web em itens da coluna esquerda, campo, olho, caixa e botões, na ordem visual.
- `prefers-reduced-motion` respeitado: sheet e dialog entram sem deslizar, e o hover vira troca instantânea.

---

## 10. O que não fazer nesta tela

**Escopo desta tela**

- **Não apague nada na hora.** A tela pede a exclusão; a remoção acontece só depois de 30 dias. Nenhuma copy diz "sua conta foi apagada".
- **Não ofereça desfazer** depois do pedido, nem toast com `Desfazer`. O caminho de volta é entrar de novo, na tela de recuperação.
- **Não peça motivo da exclusão**, nem pesquisa de saída, nem "antes de ir, que tal...". Não há requisito, e reter o leitor com fricção é o oposto do que a tela promete.
- **Não ofereça "desativar temporariamente"** nem pausar a conta. Não existe esse estado.
- **Não ofereça exportar os dados** antes de excluir. Não há requisito de portabilidade no produto.
- **Não peça para digitar "EXCLUIR"** nem o nome de usuário. As travas são a senha, a caixa e o modal.
- **Não mostre contagem do que será apagado** (`42 livros`, `13 resenhas`): o dado não existe em endpoint nenhum.
- **Não use link externo nem e-mail** para concluir o pedido. Tudo acontece dentro do aplicativo.
- **Não desenhe a tela `Exclusão solicitada` dentro do shell.** A sessão acabou: sem barra inferior, sem sidebar, sem sino.

**Ações destrutivas**

- Nada de ação destrutiva sem confirmação em modal (RNF-USA-04).
- Nada de botão destrutivo preenchido em `rubi`. Destrutivo é outline `rubi`, no botão da tela e no do modal.
- Nada de foco inicial no botão destrutivo do modal. O foco entra em `Cancelar`.
- Nada de undo em ação destrutiva pesada. Excluir conta é excluir: a janela de 30 dias é a recuperação, não um desfazer.

**Formulários**

- Nada de placeholder no lugar do label. O label `Senha atual` fica acima do campo, sempre.
- Nada de helper que só aparece depois do erro. O helper do campo é permanente.
- Nada de mensagem genérica do tipo "Algo deu errado" ou "Erro". Toda mensagem diz o que aconteceu e o que fazer, e diz que a conta continua como estava quando for o caso.
- Nada de campo de senha sem o toggle de mostrar.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela. Newsreader é só corpo de resenha, frases e sinopse; a abertura em `body-lg` é Manrope.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline e nada de eyebrow numerado do tipo "01 · SEÇÃO". As consequências não são numeradas.

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão nem em texto de título.
- Nada de tela inteira tingida de `rubi` ou de `rubi-fundo`. O vermelho fica no botão, no banner de erro e na borda de erro, e em nada mais.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de contagem regressiva animada, nem no botão nem na tela final.
- Nada de shimmer perpétuo nem de spinner girando. Carregamento é texto estático no botão e a linha de cold start.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de label poético ("Sentiremos sua falta", "Hora de dizer adeus"). O título diz o que a coisa é.
- Nada de número sem unidade, nada de data abreviada.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de ilustração, de personagem triste ou de imagem de despedida.
- Nada de toast com fundo saturado. Esta tela não usa toast.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de página própria de excluir conta com a coluna mobile centralizada sobre fundo vazio. Na web, a tela é a coluna direita das Configurações.
- Nada de hero de landing, bento grid ou três colunas de ícones para as consequências. É uma lista vertical.
- Nada de layout que não colapse para uma coluna abaixo de 768px.
- Nada de conteúdo essencial escondido em hover.
- Nada de logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
