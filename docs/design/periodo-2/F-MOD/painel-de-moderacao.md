# F-MOD · Painel de moderação

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-MOD.md
**Requisitos:** RF-MOD-02 (painel com as denúncias pendentes, ordenadas por data), RF-MOD-03 (remover o conteúdo denunciado ou arquivar a denúncia como improcedente), RF-MOD-05 (log de auditoria de toda ação de moderação, com autor, alvo, ação e timestamp)
**Não funcionais:** RNF-SEC-04 (painel e ações restritos ao administrador, verificados no servidor), RNF-SEC-35 e RNF-SEC-37 (ações de moderação registradas e consultáveis), RNF-SEC-36 (log sem dado sensível excedente), RNF-DES-02 (fila e log paginados), RNF-USA-04 (confirmação na remoção), RNF-SEC-14 (texto de usuário exibido escapado), RNF-USA-05 (mensagem acionável), RNF-ERR-09 (cold start é carregamento)
**Regras de negócio:** RN-10.5 (remover um comentário-raiz remove as respostas), RN-11 (frase é removida direto pelo administrador, sem denúncia, e isso também entra no log), RN-15.4 (resenha de livro pessoal é denunciável e moderável), RN-23.7 (o registro de auditoria permanece sem identificar leitor de conta excluída)
**Versão web:** sim, e **só web**. RF-MOD-02 e RF-MOD-03 têm marcação na coluna Web de `REQUISITOS.md` §5.11, e o arquivo da feature fixa que o painel é do cliente web: o app mobile não o expõe.
**De onde se chega:** o item `Moderação` da sidebar web, visível só para a conta de administrador. Ponto de entrada decidido no lote 4 do Período 2.

---

## 1. Contexto

A tela de trabalho do **administrador**, a conta fixa e única do produto, criada pelo grupo com credenciais do ambiente (RF-AUT-08). Aqui ele lê as denúncias que os leitores enviaram pela tela de denúncia ([`denunciar.md`](denunciar.md)), confere o conteúdo e o motivo, e decide: **remover** o conteúdo ou **arquivar** a denúncia como improcedente. Toda decisão entra no **registro de auditoria**, que é a segunda aba da mesma tela.

**Como o administrador chega aqui.** O administrador entra pelo mesmo login dos leitores e navega pelo mesmo app: Estante, Descobrir, Feed e Perfil continuam lá. O que muda é um **quinto item na sidebar**, `Moderação`, separado das quatro áreas por um divisor, que só existe para essa conta. O documento de design fala em **quatro áreas de navegação** (§5); este item é uma **exceção por papel**, declarada aqui e registrada como pendência de incorporação (seção 7). A verificação de acesso é do servidor: esconder o item para os leitores não é a proteção, é só a forma.

**Duas abas, uma área:**

- **`Denúncias pendentes`:** a fila, **da mais antiga para a mais recente**, à esquerda, e o detalhe da denúncia selecionada à direita. O detalhe mostra o motivo escrito pelo leitor e o **conteúdo denunciado inteiro**, com as duas ações.
- **`Registro de auditoria`:** a lista das ações já tomadas, da mais recente para a mais antiga, com data e hora, autor, ação e alvo. Só leitura.

**Remover é destrutivo e irreversível.** Remover uma resenha a tira da página do livro, do perfil e do feed; remover um comentário-raiz leva as respostas junto (RN-10.5). A remoção passa por confirmação em dialog (RNF-USA-04). Arquivar não apaga nada: tira a denúncia da fila e mantém o conteúdo, e por isso não pede confirmação.

**A remoção de resenha depende de outro serviço e pode demorar.** Se a confirmação não chega a tempo, a tela **não finge** que removeu: a denúncia continua na fila, o detalhe diz que a remoção não foi confirmada e o administrador tenta de novo, sem risco de aplicar duas vezes (artboard 5.5).

**O que esta tela não é.** Não é painel de frases: frases são removidas direto na lista de frases do livro, pela mesma conta, sem denúncia (RN-11), e só aparecem aqui como linha do registro. Não é gestão de contas: suspender e reativar leitor é RF-MOD-04, do Período 3. Não é painel de métricas: sem gráfico, sem contagem de denúncias por período.

O mecanismo que a tela sustenta é **pertencimento**, pelo lado de quem cuida do espaço.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados web, viewport `1440 x 900`, na ordem em que o administrador os encontra. **Não há linha mobile**: a tela é só web (ver seção 4).
- **Linha 2:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Painel de moderação · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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
artesanal. O painel de moderação é uma tela de trabalho, mas continua sendo
o mesmo produto: nada de visual de console administrativo genérico.

Dials: DESIGN_VARIANCE 5, MOTION_INTENSITY 4, VISUAL_DENSITY 4. Layout
previsível em toda navegação principal. Duas exceções em todo o produto: o
modo de foco opera em 1 / 1 / 1, e a página do livro sobe a variance para 7.
Nenhuma das duas é esta tela. Por ser tela de dados na web, a densidade pode
subir um pouco, sem virar dashboard.

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
gradiente em texto, sem sombra preta pura. Nesta tela, rubi aparece só no
botão de remover, no dialog de remoção e no banner de falha: a fila não é
pintada de vermelho.

TIPOGRAFIA
Space Grotesk (500, 600, 700) no display.
Manrope (400, 500, 600, 700) em toda a interface.
Newsreader (400, 500, regular e italic) APENAS em três lugares do produto:
  corpo da resenha renderizada, frases e trechos do livro, e sinopse na
  página do livro. Nesta tela, a serifa entra só no corpo da resenha
  denunciada, no detalhe e no trecho da fila. Comentário, motivo, registro e
  toda a interface são Manrope.
JetBrains Mono (400, 500) em números, com numeral tabular: datas e horas
  da fila e do registro.

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

BOTÕES
Primário: fundo musgo (musgo-claro no escuro), texto papel (noite no escuro),
sem borda, sempre pill.
Secundário: transparente, texto tinta (papel-suave), borda 1px linha
(linha-noite), radius 12.
Textual: transparente, texto musgo (musgo-claro), sem borda, radius 12.
Destrutivo: transparente, texto rubi (rubi-claro), borda 1px rubi
(rubi-claro), radius 12. Nunca preenchido. Sempre com confirmação.
Botão médio: padding de 12 vertical e 20 horizontal, 40px de altura na web,
texto em uma linha.

SOBREPOSIÇÃO (dialog)
A partir de 768px: dialog centrado, 480px de largura, radius-xl nos quatro
cantos, sem alça, fundo papel (noite-elevada no escuro), padding space-6,
elev-3. Scrim: #171512 a 40% no claro e preto a 60% no escuro. Entra em
dur-base com deslize curto de 16px e fade, sai em dur-base com ease-in. Foco
preso dentro enquanto aberto; Esc e clique no scrim fecham; o foco volta ao
elemento que abriu. Na confirmação destrutiva o foco entra em Cancelar, nunca
no destrutivo. Título em title-sm, consequência em body grafite nomeando o
que se perde. Botões lado a lado, alinhados à direita, Cancelar primeiro.

TOAST
Fundo papel-elevado (noite-elevada no escuro), radius 12, elev-2, padding
space-4, barra lateral fina de 4px à esquerda: musgo para confirmação, rubi
para falha. Nunca fundo saturado verde ou vermelho.

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

**Fila de denúncias pendentes**, da mais antiga para a mais recente. Todos os nomes são mock; a primeira denúncia é a enviada no canvas de `denunciar.md`.

| # | Recebida em | Tipo | Autor do conteúdo | Onde | Motivo | Denunciada por |
|---|---|---|---|---|---|---|
| 1 | `27 set, 21:08` | Resenha | Letícia Nakamura `@lelenakamura` | `Torto Arado` | `A resenha conta quem narra a segunda parte do livro sem avisar que tem spoiler.` | `@otaviobrandao` |
| 2 | `28 set, 09:14` | Comentário | Gustavo Lemes `@gulemes` | atividade `Paula Nascimento terminou de ler Quarto de Despejo` | `Está divulgando cópia pirata do livro em vários comentários.` | `@paulanasc` |
| 3 | `28 set, 16:40` | Comentário | Sérgio Valadares `@svaladares` | atividade `Rafael Okamoto publicou uma resenha` de `Os Sertões` | `Ataque pessoal ao autor da resenha e a quem comentou.` | `@dandaralp` |
| 4 | `29 set, 08:02` | Resenha | Wagner Teles `@wagnerteles` | `Caderno da vó Nair` (livro pessoal) | `Xinga pelo nome uma pessoa real que aparece no livro.` | `@biaokada` |
| 5 | `29 set, 11:25` | Resenha | Rafael Bittencourt `@rbittencourt` | `Torto Arado` | `Copiou a sinopse da editora e publicou como se fosse resenha.` | `@juliafigueiredo` |

**Conteúdos completos:**

- **Resenha de Letícia Nakamura** em `Torto Arado`, 4,5 estrelas, publicada em `12 de setembro de 2026`, sem marcação de spoiler: `A troca de narradora no meio da história é o melhor recurso do romance. Demorei a entender e depois *não consegui parar*.` (o trecho entre asteriscos é itálico renderizado).
- **Comentário de Gustavo Lemes**, raiz, sem respostas, `28 set, 08:50`: `Quem quiser o livro inteiro de graça me chama, tenho o arquivo completo.`
- **Comentário de Sérgio Valadares**, raiz, **com 2 respostas**, `28 set, 16:12`: `Quem gosta desse livro não entendeu nada. Resenha de gente que só finge que lê.`
- **Resenha de Wagner Teles** em livro pessoal `Caderno da vó Nair`, 2 estrelas, publicada em `28 de setembro de 2026`: `Receitas boas, mas o Joaquim do terceiro capítulo continua sendo um sujeito que ninguém devia aguentar.` (mock; o texto é leve de propósito para o protótipo).
- **Resenha de Rafael Bittencourt** em `Torto Arado`, 4 estrelas, publicada em `20 de setembro de 2026`: `Duas irmãs, uma faca e um segredo que atravessa gerações no sertão da Bahia. Um romance sobre terra, trabalho e pertencimento.`

**Registro de auditoria**, da ação mais recente para a mais antiga (mock):

| Data e hora | Autor | Ação | Alvo |
|---|---|---|---|
| `29/09/2026 10:12` | `Administrador` | `Removeu comentário` | `Comentário de @tiagomoreira na atividade de @rafaokamoto` |
| `29/09/2026 10:05` | `Administrador` | `Arquivou denúncia` | `Resenha de @camilarocha em O Avesso da Pele` |
| `28/09/2026 18:30` | `Administrador` | `Removeu frase, sem denúncia` | `Frase de @anabeatrizm em Torto Arado` |
| `27/09/2026 15:47` | `Administrador` | `Removeu resenha` | `Resenha de conta excluída em Quarto de Despejo` |
| `26/09/2026 11:02` | `Administrador` | `Arquivou denúncia` | `Comentário de @lucasferri na atividade de @marinableu` |
| `25/09/2026 20:41` | `Administrador` | `Removeu comentário` | `Comentário de conta excluída na atividade de @helenaprado` |

O registro **não guarda nem mostra** o texto removido, o motivo da denúncia nem quem denunciou: só autor, ação, alvo e momento (RF-MOD-05, RNF-SEC-36). Conta excluída aparece como `conta excluída`, sem username (RN-23.7). O autor é sempre `Administrador`, porque a conta é única.

**Contagem da fila:** o contrato de `GET /admin/denuncias?page=` não diz se devolve o total de pendentes. O protótipo **não mostra total**: a aba se chama só `Denúncias pendentes` e a fila termina em `Carregar mais denúncias` quando há próxima página.

---

## 4. Artboards mobile (390 x 844)

**Não se aplica.** O painel de moderação é do cliente web; o arquivo da feature fixa que o app mobile não o expõe, e a conta de administrador não tem item de moderação na barra inferior.

A SPA web é responsiva e o administrador pode abri-la num navegador estreito. Esse caso fica **declarado, sem artboard**: abaixo de 1024px a fila e o detalhe deixam de ficar lado a lado; a fila ocupa a largura e selecionar uma denúncia abre o detalhe no lugar dela, com um botão textual `ArrowLeft` `Denúncias pendentes` no topo para voltar. Abaixo de 768px a sidebar dá lugar à barra inferior do mobile, que **não tem** o quinto item; como o administrador chega ao painel nesse tamanho é **pendência** registrada na seção 7.

---

## 5. Artboards web (1440 x 900)

A SPA em Vue é responsiva: o desenho abaixo é o do desktop. O ponto de virada para uma coluna está na seção 4.

### Estrutura da web

**Sidebar do shell, com o item de administrador.** Coluna fixa à esquerda, altura total da viewport, 248px, fundo `papel-elevado`, borda direita de 1px `linha`.

- Bloco do topo de 72px, padding lateral `space-5`, com o lockup horizontal da marca em `musgo` (24px de altura) à esquerda e `SidebarSimple` (Phosphor, `regular`, 20px, `grafite`) à direita.
- `space-4` abaixo, os quatro itens das áreas, empilhados com `space-1` de gap dentro de padding lateral `space-3`: `Estante` (`Books`), `Descobrir` (`Compass`), `Feed` (`Newspaper`), `Perfil` (`UserCircle`). Cada um com 44px de altura, `radius` 12, padding lateral `space-4`, ícone de 20px à esquerda, `space-3` de gap, rótulo em `body-strong`. Inativo: ícone `regular` `grafite`, rótulo `grafite`, fundo transparente. Hover: fundo `linha`, `dur-fast`. Ativo: fundo `musgo-fundo`, ícone `fill` `musgo`, rótulo `musgo`.
- **Divisor de administrador** (nasce aqui): `space-3` abaixo de `Perfil`, uma linha de 1px `linha` na largura interna (padding lateral `space-3` + `space-4`), e `space-3` abaixo dela o **quinto item**, `Moderação`, com `ShieldCheck` (Phosphor, 20px), no mesmo desenho dos outros. **Neste painel, `Moderação` é o item ativo**: fundo `musgo-fundo`, `ShieldCheck` em `fill` `musgo`, rótulo `musgo`. As quatro áreas ficam inativas.
- **Sem sino na web.** Nada no rodapé da sidebar.
- Entre 768px e 1024px a sidebar nasce retraída em 72px, só ícones, com o divisor e o `ShieldCheck` mantidos.

**Área de conteúdo.** À direita da sidebar, fundo `papel`, padding lateral `space-8`.

- **Header de conteúdo** de 72px: `Moderação` em `display` `tinta` à esquerda, alinhado à base. Nada à direita: sem busca, sem filtro, sem exportar.
- `space-4` abaixo, a **faixa de abas**: `Denúncias pendentes` e `Registro de auditoria`, cada aba em `body-strong`, `space-6` entre elas, a ativa em `musgo` com sublinhado de 2px `musgo`, as demais em `grafite`, hover em `tinta`. Divisor de 1px `linha` na base da faixa, na largura do conteúdo.
- `space-6` abaixo, o conteúdo da aba.

**Aba `Denúncias pendentes`: fila e detalhe lado a lado.**

- **Coluna da fila**, 400px, à esquerda. Acima da lista, em `caption` `grafite`: `Da mais antiga para a mais recente`. `space-3` abaixo, a lista, com divisor de 1px `linha` entre os itens. A coluna rola sozinha, dentro da altura da viewport.
- **Coluna do detalhe**, o resto da largura, com `space-8` de gap, separada da fila por uma borda de 1px `linha` à esquerda e padding esquerdo `space-8`. Rola sozinha. A **barra de ações** fica fixa no pé da coluna.

**Item da fila** (nasce aqui):

- Padding `space-4`, `radius` 12, altura pelo conteúdo, a linha inteira clicável.
- Linha 1: a **etiqueta do tipo** à esquerda e a data à direita. Etiqueta: pill de 24px, `radius-full`, padding horizontal `space-3`, borda de 1px `linha`, fundo transparente, texto em `label` `grafite`: `Resenha` ou `Comentário`. Data em `caption` `grafite`, com os números em JetBrains Mono: `27 set, 21:08`.
- Linha 2, `space-2` abaixo: autor do conteúdo em `body-strong` `tinta` e, na mesma linha, `·` e o lugar em `body` `grafite`: `Letícia Nakamura · Torto Arado`. Para comentário: `Gustavo Lemes · atividade de Paula Nascimento`. Uma linha, com reticências.
- Linha 3, `space-1` abaixo: o **motivo**, em `body` `grafite`, no máximo duas linhas com reticências. Em Manrope: é texto do leitor.
- Resenha de livro pessoal: ao lado da etiqueta do tipo, `space-2` de gap, a **etiqueta de natureza** `Livro pessoal` (design §4.17): pill de 24px, `radius-full`, fundo `musgo-fundo`, texto em `label` `musgo`.
- Hover: fundo `papel-elevado`, `dur-fast`. **Selecionado:** fundo `musgo-fundo`, sem borda, e o autor em `musgo`. Foco de teclado com contorno de 2px `musgo` e offset de 2px.
- No fim da lista, quando há próxima página, botão textual `musgo` alinhado à esquerda: `Carregar mais denúncias`. Carregando a próxima página, três itens de skeleton no fim da lista.

**Detalhe da denúncia**, de cima para baixo:

1. **Título** em `title-lg` `tinta`: `Denúncia de resenha` ou `Denúncia de comentário`. `space-2` abaixo, em `caption` `grafite`: `Recebida em 27 de setembro de 2026, às 21:08, de @otaviobrandao`.
2. `space-6` abaixo, seção **`Motivo`**: título em `title-sm` `tinta`; `space-3` abaixo, o motivo inteiro em bloco com borda esquerda de 2px `linha`, padding esquerdo `space-4`, texto em `body-lg` Manrope `tinta`. Texto escapado, sem Markdown.
3. `space-6` abaixo, seção **`Conteúdo denunciado`**: título em `title-sm` `tinta`; `space-3` abaixo, o **card do conteúdo denunciado** na versão completa (nasce em `denunciar.md`):
   - Fundo `papel-elevado`, `radius-md` 16, padding `space-5`, sem sombra.
   - Autoria: avatar de 40px, nome em `title-sm` `tinta`, `@username` em `caption` `grafite-suave`; para resenha, estrelas de 16px à direita, em `musgo`, como na página do livro.
   - `space-2` abaixo, a linha de lugar em `caption` `grafite`: `Resenha de Torto Arado · publicada em 12 de setembro de 2026`. Para comentário: `Comentário na atividade Rafael Okamoto publicou uma resenha de Os Sertões · 28 set, 16:12`.
   - `space-4` abaixo, o **texto inteiro**, sem corte: resenha em Newsreader 400 `body-lg` `tinta`, com o Markdown renderizado; comentário em Manrope `body` `tinta`.
   - Resenha **com spoiler**: o texto aparece inteiro, sem ocultar, com uma linha acima em `caption` `grafite`: `Marcada com spoiler por quem escreveu.` O administrador precisa ler para decidir.
   - `space-4` abaixo, botão textual `musgo` com `CaretRight` (Phosphor, `regular`, 16px) à direita: `Ver na página do livro` (resenha) ou `Ver no feed` (comentário). Abre o lugar original no app, na mesma aba.
4. **Comentário-raiz com respostas:** `space-4` abaixo do card, a **faixa informativa neutra** (design §4.15): fundo `musgo-fundo`, `radius` 12, padding `space-4`, `Info` (Phosphor, `regular`, 20px, `musgo`), texto em `body` `tinta`: `Este comentário tem 2 respostas. Remover o comentário remove as respostas também.`
5. **Barra de ações**, fixa no pé da coluna do detalhe: fundo `papel`, divisor de 1px `linha` no topo, padding `space-4` vertical. Botões **alinhados à direita**, `space-3` entre eles:
   - Secundário de 40px, borda de 1px `linha`, texto `tinta`, com `Archive` (Phosphor, `regular`, 20px) à esquerda: `Arquivar como improcedente`.
   - Destrutivo em **outline** `rubi` de 40px, com `Trash` (Phosphor, `regular`, 20px, `rubi`) à esquerda: `Remover resenha` ou `Remover comentário`.
   - Hover: secundário com fundo `papel-elevado`; destrutivo com fundo `rubi-fundo`. `dur-fast`.

**Dialog de remoção** (design §4.11), 480px, `radius-xl`, sobre o painel sob o scrim `#171512` a 40%:

1. Título em `title-sm` `tinta`: `Remover a resenha de Letícia Nakamura?` ou `Remover o comentário de Sérgio Valadares?`.
2. `space-3` abaixo, consequência em `body` `grafite`:
   - Resenha: `A resenha sai da página do livro, do perfil de quem escreveu e do feed. A remoção não pode ser desfeita e fica no registro de auditoria.`
   - Comentário com respostas: `O comentário e as 2 respostas a ele saem da atividade para todos os leitores. A remoção não pode ser desfeita e fica no registro de auditoria.`
   - Comentário sem respostas: `O comentário sai da atividade para todos os leitores. A remoção não pode ser desfeita e fica no registro de auditoria.`
3. `space-6` abaixo, botões lado a lado, alinhados à direita: `Cancelar` textual `grafite` primeiro e o destrutivo em outline `rubi` de 40px, `Remover resenha` ou `Remover comentário`. **O foco entra em `Cancelar`.**

**Arquivar não tem dialog.** O toque tira a denúncia da fila, seleciona a próxima e mostra o toast de 5.6. A decisão de não confirmar o arquivamento é proposta deste prompt, para ratificar: arquivar não apaga conteúdo.

### 5.1 Denúncias pendentes, resenha selecionada

Estado principal.

- Sidebar com **Moderação** ativo. Header `Moderação`, aba `Denúncias pendentes` ativa.
- Fila com as cinco denúncias da seção 3; a **primeira**, de Letícia Nakamura, **selecionada**. O item 4 mostra a etiqueta `Livro pessoal` ao lado de `Resenha`. Sem `Carregar mais denúncias`: as cinco cabem numa página.
- Detalhe de `Denúncia de resenha`, com `Recebida em 27 de setembro de 2026, às 21:08, de @otaviobrandao`, o motivo, o card com a resenha inteira em Newsreader com o itálico renderizado, estrelas de 4,5, `Ver na página do livro`, e a barra de ações com `Arquivar como improcedente` e `Remover resenha`.

### 5.2 Comentário com respostas selecionado, com hover

- Fila com o item 3, de Sérgio Valadares, **selecionado**, e o item 4 **em hover** (fundo `papel-elevado`, cursor de ponteiro).
- Detalhe de `Denúncia de comentário`, com `Recebida em 28 de setembro de 2026, às 16:40, de @dandaralp`, o motivo, o card do comentário em Manrope com a linha de lugar da atividade, `Ver no feed`, e a faixa neutra das `2 respostas`.
- Barra de ações com `Arquivar como improcedente` e `Remover comentário`.

### 5.3 Confirmar remoção

- Base: 5.2, sob o scrim.
- Dialog com `Remover o comentário de Sérgio Valadares?`, a consequência com as 2 respostas, `Cancelar` com o **foco de teclado visível** (contorno de 2px `musgo`) e o destrutivo `Remover comentário`.

### 5.4 Removendo resenha

Remoção de resenha confirmada, esperando o serviço.

- Fila com o item 5, de Rafael Bittencourt, selecionado.
- Detalhe da resenha. Na barra de ações, o destrutivo mostra `Removendo resenha`, no mesmo outline `rubi`, sem spinner e sem esmaecer; `Arquivar como improcedente` fica desabilitado (borda `linha`, texto `grafite-suave`). A fila continua navegável.
- Se passar de três segundos, acima dos botões, alinhado à direita, em `caption` `grafite`: `O serviço está iniciando. Isso pode levar alguns segundos.`

### 5.5 Remoção não confirmada

A confirmação do serviço não chegou a tempo. A denúncia **continua pendente**, e a tela não afirma nada que não saiba.

- Mesmo item selecionado; ele **continua na fila**, no mesmo lugar.
- No topo do detalhe, acima do título, banner inline de largura total: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (Phosphor, `regular`, 20px, `rubi`), texto em `body` `tinta`: `A remoção não foi confirmada a tempo. A denúncia continua pendente. Tente de novo: se a remoção já tiver acontecido, ela não é aplicada duas vezes.`
- Barra de ações de volta a `Arquivar como improcedente` e `Remover resenha`, habilitados. Remover de novo abre o dialog de novo.

### 5.6 Denúncia arquivada

Depois de `Arquivar como improcedente` na denúncia de Letícia Nakamura de 5.1.

- A denúncia **saiu da fila**; a fila tem quatro itens e o de Gustavo Lemes, agora o primeiro, está **selecionado**.
- Detalhe de `Denúncia de comentário` de Gustavo Lemes, sem a faixa de respostas.
- **Toast** no canto inferior esquerdo da área de conteúdo, `space-8` da borda esquerda do conteúdo e `space-8` da borda inferior, 400px de largura: fundo `papel-elevado`, `radius` 12, `elev-2`, padding `space-4`, barra lateral de 4px `musgo`, `Archive` (Phosphor, `regular`, 20px, `musgo`), texto em `body` `tinta`: `Denúncia arquivada como improcedente. A resenha continua publicada.` e `X` (20px, `grafite`) para fechar, rótulo acessível `Fechar aviso`.
- Depois de uma remoção, o mesmo toast diz `Resenha removida. A denúncia saiu da fila.` ou `Comentário removido. A denúncia saiu da fila.`, com `Trash` em `musgo`: é confirmação, não falha.
- A duração de permanência do toast **não está definida** no documento de design; o artboard mostra o toast parado.

### 5.7 Conteúdo já excluído

**Proposta, para ratificar com o contrato.** A autora excluiu a resenha depois da denúncia; o conteúdo não existe mais.

- Fila com o item 1 selecionado.
- Detalhe com o título, a data e o motivo. Na seção `Conteúdo denunciado`, no lugar do card, a faixa informativa neutra (design §4.15): `Quem escreveu excluiu esta resenha depois da denúncia. Não há o que remover.`
- Barra de ações só com `Arquivar denúncia` (secundário, `Archive`). Sem destrutivo.

### 5.8 Fila vazia

- Aba `Denúncias pendentes` ativa. Sem as duas colunas: um bloco centralizado na área de conteúdo, com `space-6` entre os elementos:
  - `ShieldCheck` (Phosphor, `regular`, 32px, `grafite-suave`).
  - Título em `title` `tinta`: `Nenhuma denúncia pendente`.
  - Texto em `body` `grafite`, centralizado, largura máxima de 420px: `Quando um leitor denunciar uma resenha ou um comentário, a denúncia aparece aqui, da mais antiga para a mais recente.`
  - Botão textual `musgo`: `Ver registro de auditoria`, que troca para a outra aba.
- Sem ilustração, sem confete, sem "tudo limpo".

### 5.9 Carregando

- Header e faixa de abas reais.
- Coluna da fila com **cinco itens de skeleton estático**: pill de 24 por 72px, barra da data de 64px à direita, duas barras de texto (60% e 90% da largura), tudo em `capa-placeholder` com `radius-sm`. Divisor `linha` entre eles.
- Coluna do detalhe com o skeleton do título (40% da largura), de um bloco de motivo (duas barras) e de um card em `capa-placeholder` de 240px de altura com `radius-md`.
- Um único fade de entrada em `dur-base` com `ease-out`. Sem shimmer, sem spinner. Cold start: depois de três segundos, abaixo do skeleton da fila, em `caption` `grafite`: `O serviço está iniciando. Isso pode levar alguns segundos.`

### 5.10 Erro ao carregar

- Header e faixa de abas reais.
- No lugar das duas colunas, banner inline na largura do conteúdo, máximo de 720px, alinhado à esquerda: fundo `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (20px, `rubi`), texto em `body` `tinta`: `Não foi possível carregar as denúncias. Verifique sua conexão e tente de novo.` Abaixo do texto, botão textual `musgo`: `Tentar de novo`.

### 5.11 Registro de auditoria

- Aba `Registro de auditoria` ativa. **Sem colunas de fila e detalhe**: o registro ocupa a largura do conteúdo, com máximo de 1080px.
- Acima da tabela, em `caption` `grafite`: `Toda ação de moderação fica registrada, da mais recente para a mais antiga. Conteúdo removido e motivos não ficam no registro.`
- `space-4` abaixo, a **tabela do registro** (nasce aqui):
  - Linha de cabeçalho de 40px, em `label` `grafite`, divisor de 1px `linha` na base: `Data e hora` (180px), `Autor` (160px), `Ação` (240px), `Alvo` (o resto).
  - Linhas de 56px, divisor de 1px `linha` entre elas, sem zebra, sem fundo. Data e hora em `num-inline` `tinta`; autor em `body` `grafite`; ação em `body-strong` `tinta`; alvo em `body` `tinta`, uma linha com reticências e o texto inteiro no rótulo acessível.
  - As seis linhas da seção 3. As linhas de `conta excluída` aparecem iguais às outras, só com o texto anônimo. A linha de frase diz `Removeu frase, sem denúncia`.
  - Sem ação por linha, sem link, sem hover de linha: o registro é só leitura.
- No fim, botão textual `musgo`, alinhado à esquerda: `Carregar mais registros`.
- **Registro vazio** não ganha artboard: no lugar da tabela, em `body` `grafite`, `Nenhuma ação de moderação registrada ainda.`

---

## 6. Artboards em modo escuro

Lock de página inteira. Superfície elevada **mais clara** que o fundo, `musgo-claro` como acento, shadows com metade da opacidade: a hierarquia vem da cor de superfície e do divisor `linha-noite`. Scrim preto a 60%.

### 6.1 Denúncias pendentes, resenha selecionada

Equivalente a 5.1.

- Sidebar em `noite-elevada` sobre conteúdo em `noite`, borda direita `linha-noite`, divisor de administrador em `linha-noite`, **Moderação** ativo com fundo `musgo-fundo-escuro`, `ShieldCheck` `fill` e rótulo em `musgo-claro`. Itens inativos em `grafite-claro`.
- Header em `papel-suave`. Aba ativa em `musgo-claro` com sublinhado `musgo-claro`, inativa em `grafite-claro`, divisor `linha-noite`.
- Fila: etiqueta de tipo com borda `linha-noite` e texto `grafite-claro`; etiqueta `Livro pessoal` com fundo `musgo-fundo-escuro` e texto `musgo-claro`; autor em `papel-suave`; data e motivo em `grafite-claro`. Item selecionado com fundo `musgo-fundo-escuro` e autor em `musgo-claro`.
- Detalhe: título em `papel-suave`, metadado em `grafite-claro`, bloco do motivo com borda `linha-noite`. Card do conteúdo em `noite-elevada`, **mais claro** que o fundo, com o corpo da resenha em `papel-suave`.
- Barra de ações com fundo `noite` e divisor `linha-noite`; secundário com borda `linha-noite` e texto `papel-suave`; destrutivo em outline `rubi-claro`.

### 6.2 Confirmar remoção

Equivalente a 5.3. Dialog em `noite-elevada` sobre o scrim preto a 60%, título em `papel-suave`, consequência em `grafite-claro`, `Cancelar` em `grafite-claro` com o foco em `musgo-claro`, destrutivo em outline `rubi-claro`.

### 6.3 Registro de auditoria

Equivalente a 5.11. Cabeçalho da tabela em `grafite-claro`, divisores `linha-noite`, data e ação em `papel-suave`, autor em `grafite-claro`, alvo em `papel-suave`. `Carregar mais registros` em `musgo-claro`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Botão secundário, textual e destrutivo em outline | documento-de-design §4.1 |
| Dialog de confirmação destrutiva | documento-de-design §4.11 e §7.8 |
| Faixa informativa neutra | documento-de-design §4.15 |
| Etiqueta de natureza do registro (`Livro pessoal`) | documento-de-design §4.17 |
| Corpo de resenha em Newsreader com Markdown | documento-de-design §3.2.2; Markdown renderizado nasceu na edição `pagina-do-livro` do lote 2 |
| Estrela de avaliação, tamanho de 16px | documento-de-design §4.3 |
| Toast em `papel-elevado` com barra lateral fina | documento-de-design §7.6; posição na web nasceu no lote 3 |
| Banner inline de erro | nasceu no Período 1, usado em `descobrir.md` e `criar-desafio.md` |
| Faixa de abas da web | nasceu em `periodo-1/F-PERFIL/meu-perfil.md`, incorporação pendente |
| Card do conteúdo denunciado | nasce em [`denunciar.md`](denunciar.md), no mesmo lote; aqui na versão completa |
| Shell, sidebar | `periodo-0/P0-NAV/shell-de-navegacao.md` |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3, não ficam decididos só neste prompt:

1. **Quinto item da sidebar, `Moderação` (`ShieldCheck`), só para a conta de administrador**, depois de um divisor de 1px `linha`. **Contraria o §5**, que fixa quatro áreas de navegação: é uma exceção por papel, decidida com o usuário no lote 4. Falta decidir como o administrador chega ao painel abaixo de 768px, onde a barra inferior não tem o quinto item.
2. **Fila e detalhe lado a lado** (lista de 400px com item selecionado em `musgo-fundo`, detalhe com borda à esquerda e barra de ações fixa no pé), e o colapso para uma coluna abaixo de 1024px.
3. **Item da fila:** etiqueta de tipo em outline neutro (`Resenha`, `Comentário`), data em JetBrains Mono, autor e lugar, motivo em duas linhas.
4. **Etiqueta de tipo em outline** (borda `linha`, texto `grafite`), distinta da etiqueta de natureza do §4.17. O §4.17 diz que hoje a etiqueta de natureza só existe na página do livro; aqui ela é reaproveitada na fila e no detalhe.
5. **Bloco de motivo** com borda esquerda de 2px `linha` e texto em Manrope `body-lg`.
6. **Tabela de registro somente leitura** com cabeçalho em `label`, linhas de 56px e carregar mais no fim.
7. **Destrutivo e secundário com ícone** (`Trash`, `Archive`).
8. **Estado de ação não confirmada** (banner `rubi-fundo` no topo do detalhe, item mantido na fila).

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Item da sidebar | `Moderação` |
| Header | `Moderação` |
| Abas | `Denúncias pendentes`, `Registro de auditoria` |
| Ordem da fila | `Da mais antiga para a mais recente` |
| Etiquetas de tipo | `Resenha`, `Comentário` |
| Etiqueta de natureza | `Livro pessoal` |
| Datas da fila | `27 set, 21:08`, `28 set, 09:14`, `28 set, 16:40`, `29 set, 08:02`, `29 set, 11:25` |
| Linha 2 dos itens | `Letícia Nakamura · Torto Arado`, `Gustavo Lemes · atividade de Paula Nascimento`, `Sérgio Valadares · atividade de Rafael Okamoto`, `Wagner Teles · Caderno da vó Nair`, `Rafael Bittencourt · Torto Arado` |
| Motivos | os cinco da seção 3, literais |
| Carregar mais da fila | `Carregar mais denúncias` |
| Título do detalhe | `Denúncia de resenha`, `Denúncia de comentário` |
| Metadado do detalhe | `Recebida em 27 de setembro de 2026, às 21:08, de @otaviobrandao`, `Recebida em 28 de setembro de 2026, às 16:40, de @dandaralp` |
| Seções do detalhe | `Motivo`, `Conteúdo denunciado` |
| Lugar, resenha | `Resenha de Torto Arado · publicada em 12 de setembro de 2026` |
| Lugar, comentário | `Comentário na atividade Rafael Okamoto publicou uma resenha de Os Sertões · 28 set, 16:12` |
| Resenha com spoiler | `Marcada com spoiler por quem escreveu.` |
| Links do card | `Ver na página do livro`, `Ver no feed` |
| Faixa de respostas | `Este comentário tem 2 respostas. Remover o comentário remove as respostas também.` |
| Ação secundária | `Arquivar como improcedente` |
| Ação secundária, conteúdo já excluído | `Arquivar denúncia` |
| Ação destrutiva | `Remover resenha`, `Remover comentário` |
| Removendo | `Removendo resenha`, `Removendo comentário` |
| Dialog, título | `Remover a resenha de Letícia Nakamura?`, `Remover o comentário de Sérgio Valadares?` |
| Dialog, resenha | `A resenha sai da página do livro, do perfil de quem escreveu e do feed. A remoção não pode ser desfeita e fica no registro de auditoria.` |
| Dialog, comentário com respostas | `O comentário e as 2 respostas a ele saem da atividade para todos os leitores. A remoção não pode ser desfeita e fica no registro de auditoria.` |
| Dialog, comentário sem respostas | `O comentário sai da atividade para todos os leitores. A remoção não pode ser desfeita e fica no registro de auditoria.` |
| Dialog, manter | `Cancelar` |
| Remoção não confirmada | `A remoção não foi confirmada a tempo. A denúncia continua pendente. Tente de novo: se a remoção já tiver acontecido, ela não é aplicada duas vezes.` |
| Toast, arquivada | `Denúncia arquivada como improcedente. A resenha continua publicada.` (para comentário: `Denúncia arquivada como improcedente. O comentário continua publicado.`) |
| Toast, removida | `Resenha removida. A denúncia saiu da fila.`, `Comentário removido. A denúncia saiu da fila.` |
| Toast, fechar | `Fechar aviso` |
| Conteúdo já excluído | `Quem escreveu excluiu esta resenha depois da denúncia. Não há o que remover.` |
| Fila vazia, título | `Nenhuma denúncia pendente` |
| Fila vazia, texto | `Quando um leitor denunciar uma resenha ou um comentário, a denúncia aparece aqui, da mais antiga para a mais recente.` |
| Fila vazia, ação | `Ver registro de auditoria` |
| Cold start | `O serviço está iniciando. Isso pode levar alguns segundos.` |
| Erro ao carregar | `Não foi possível carregar as denúncias. Verifique sua conexão e tente de novo.` |
| Ação do erro | `Tentar de novo` |
| Explicação do registro | `Toda ação de moderação fica registrada, da mais recente para a mais antiga. Conteúdo removido e motivos não ficam no registro.` |
| Cabeçalho da tabela | `Data e hora`, `Autor`, `Ação`, `Alvo` |
| Ações do registro | `Removeu comentário`, `Arquivou denúncia`, `Removeu frase, sem denúncia`, `Removeu resenha` |
| Linhas do registro | as seis da seção 3, literais |
| Carregar mais do registro | `Carregar mais registros` |
| Registro vazio | `Nenhuma ação de moderação registrada ainda.` |

Zero em-dash, zero emoji, nenhum número sem unidade. O ponto médio entre autor e lugar é separador de metadado, e não travessão.

---

## 9. Acessibilidade e interação

- **Contraste:** motivo, texto do conteúdo, alvo e ação em `tinta`; metadados em `grafite`, que passa em AA. `grafite-suave` só no `@username` do card e em botão desabilitado. O destrutivo em `rubi` sobre `papel` passa em AA.
- **Teclado:** a fila é uma lista navegável por setas; `Enter` seleciona e move o foco para o título do detalhe. A ordem de tabulação é abas, fila, detalhe (links do card), barra de ações. Foco visível em todo elemento, com contorno de 2px `musgo` e offset de 2px.
- **Abas:** faixa com semântica de abas, a ativa marcada como selecionada; setas trocam de aba.
- **Seleção sem depender de cor:** o item selecionado muda de fundo e o autor muda de cor, e é anunciado como selecionado.
- **Confirmação:** remover sempre passa pelo dialog (RNF-USA-04), com o foco em `Cancelar` e o destrutivo em outline `rubi`. Nada é removido com um clique só.
- **Resultado:** o toast, o banner de remoção não confirmada e o banner de erro são regiões anunciadas. O toast não rouba o foco; depois de arquivar ou remover, o foco vai para o título do detalhe da próxima denúncia.
- **Reenvio seguro:** remover de novo depois de 5.5 repete a mesma solicitação, sem aplicar a remoção duas vezes.
- **Tabela:** cabeçalhos associados às colunas; o alvo cortado com reticências tem o texto inteiro no rótulo acessível.
- **Texto de usuário:** motivo e comentário exibidos escapados, como texto puro (RNF-SEC-14); a resenha, com o subconjunto de Markdown sanitizado.
- **Motion:** dialog e toast respeitam `prefers-reduced-motion`.

---

## 10. O que não fazer nesta tela

**Moderação**

- Não desenhe suspender, bloquear, banir ou reativar conta: isso é RF-MOD-04, do Período 3.
- Não desenhe listagem administrativa de frases, listas, perfis ou livros. Frase aparece só como linha do registro.
- Não desenhe editar o conteúdo denunciado, responder ao denunciante, mandar aviso ao autor nem campo de observação do administrador.
- Não desenhe seleção múltipla, ação em lote, filtros, busca ou ordenação alternativa na fila.
- Não desenhe contagem total de pendentes, badge no item da sidebar nem gráfico de denúncias.
- Não mostre o texto removido, o motivo ou quem denunciou no registro de auditoria.
- Não desenhe desfazer remoção, lixeira ou restaurar.
- Não mostre o item `Moderação` para leitores comuns em nenhum artboard de outras telas.
- Não pinte a fila de vermelho nem marque denúncias com cor de urgência.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora do corpo da resenha denunciada.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção. No máximo um por tela, e esta não precisa de nenhum.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.
- Nada de acento fora do `musgo`. `rubi` só no destrutivo, no dialog e no banner de falha.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando.
- Nada de item saindo da fila com animação de varrer, riscar ou explodir.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. `Denúncias pendentes`, não "Caixa de entrada da comunidade".
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast com fundo saturado verde ou vermelho.
- Nada de botão destrutivo preenchido. `Remover resenha` é outline `rubi`.
- Nada de tabela zebrada, com borda em volta de cada célula ou com fundo colorido no cabeçalho.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de visual de console administrativo genérico: sem topbar escura, sem cards de KPI, sem sidebar diferente da do produto.
- Nada de bento grid ou de painel com vários cards de métricas.
- Nada de conteúdo essencial escondido em hover: motivo e ações estão sempre visíveis.
- Nada de layout que não colapse para uma coluna abaixo de 1024px.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio.
- Nada de hero, logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos.
- Sem ranking de leitores, nem de "mais denunciados".
- Sem mensagem direta entre usuários ou entre administrador e leitor.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem tela própria de login de administrador.
- Sem leitura de e-book dentro do aplicativo.
