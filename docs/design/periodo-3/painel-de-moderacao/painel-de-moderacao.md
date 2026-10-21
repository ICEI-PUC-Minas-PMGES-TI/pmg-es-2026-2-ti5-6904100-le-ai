# Painel de moderação (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Painel de moderação`, gerado por `docs/design/periodo-2/F-MOD/painel-de-moderacao.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/F-MOD/painel-de-moderacao.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-MOD-OPC.md
**Requisitos que entram:**
- F-MOD-OPC: RF-MOD-04 (o administrador suspende e reativa a conta de um leitor; a suspensão bloqueia o acesso e oculta perfil e conteúdo para os demais leitores, preservando os dados), RF-MOD-05 (suspensão e reativação entram no registro de auditoria, agora com o motivo escrito pelo administrador)

**Não funcionais:** RNF-SEC-04 (suspender e reativar restritos ao administrador, verificados no servidor), RNF-USA-04 (confirmação explícita, com motivo), RNF-SEC-35 e RNF-SEC-37 (ação registrada e consultável), RNF-SEC-36 (o registro guarda só o motivo do administrador, nada do leitor), RNF-ERR-04 (repetir a suspensão não aplica duas vezes), RNF-ERR-09 (cold start é espera, não erro), RNF-USA-05 (mensagem acionável)
**Regras de negócio:** RN-23.7 (conta excluída continua anônima no registro e não tem ação de conta)
**Versão web:** sim, e **só web**, como o painel inteiro. RF-MOD-04 tem marcação na coluna Web de `REQUISITOS.md` §5.11, e o painel continua fora do app mobile.

---

## 1. O que muda e por quê

A F-MOD-OPC fecha a escada de moderação que o Período 2 deixou aberta: **arquivar → remover conteúdo → suspender a conta**. Remover resolve um caso; suspender resolve um padrão de quem escreve. Três coisas entram neste canvas:

| O que entra | Onde |
|---|---|
| `DotsThree` de ações sobre a conta do autor, com o item `Suspender conta do autor` (ou `Reativar conta do autor`, se a conta já está suspensa) | À direita do título do detalhe da denúncia |
| O **dialog de suspensão e o de reativação**, com os estados de espera, falha e sucesso | Sobre o painel |
| Etiqueta `Conta suspensa` no item da fila e faixa neutra no detalhe, quando o autor já está suspenso | Fila e detalhe |
| Linhas `Suspendeu a conta` e `Reativou a conta` no registro de auditoria, **com o motivo do administrador**, e o alvo como link para a conta | Aba `Registro de auditoria` |

**O dialog não é desenhado de novo aqui.** Ele nasceu na edição do Período 3 de `perfil-de-outro-leitor` (o administrador também suspende a partir do perfil do leitor), e este prompt o reaproveita **idêntico**: mesma largura, mesma copy, mesmo campo, mesmos botões, mesmos estados. A descrição completa está na seção 7 deste prompt, transcrita, porque o Claude Design não lê o outro arquivo.

**Decisões já tomadas, não rediscutir:**

- **O registro de auditoria passa a mostrar o motivo do administrador**, e só ele. O motivo da denúncia, escrito pelo leitor, quem denunciou e o conteúdo removido **continuam fora** do registro. Decisão do grupo em 11/10/2026: o motivo da suspensão é a justificativa da própria moderação, não dado do leitor.
- **Suspender não resolve a denúncia.** A denúncia continua na fila, e o administrador ainda decide sobre o conteúdo (remover ou arquivar). As duas decisões são independentes.
- **Motivo obrigatório, nos dois sentidos**, até 500 caracteres. Sem motivo, o botão de confirmar fica desabilitado.
- **Sem estado otimista.** A página só muda quando o serviço confirma; se não confirma a tempo, o dialog continua aberto e diz isso.

**O que deixa de valer do prompt anterior**, e só nestes pontos:

- Seção 1 do P2 (`Não é gestão de contas: suspender e reativar leitor é RF-MOD-04, do Período 3`): a suspensão e a reativação passam a existir **a partir da denúncia**. Continua sem listagem administrativa de contas.
- Seção 3 do P2 (`O registro não guarda nem mostra o texto removido, o motivo da denúncia nem quem denunciou`): continua valendo, com uma exceção só, o motivo **do administrador** nas linhas de suspensão e reativação.
- Seções 5.11 e 8 do P2: a explicação acima da tabela muda de copy (seção 8 deste prompt) e as linhas de conta ganham link.
- Seção 10 do P2, `Não desenhe suspender, bloquear, banir ou reativar conta`: **deixa de valer para suspender e reativar**. Bloquear e banir continuam proibidos.
- Seção 10 do P2, `Não mostre o texto removido, o motivo ou quem denunciou no registro de auditoria`: continua valendo para o motivo **da denúncia**; o motivo do administrador passa a aparecer.

O canvas continua simulando um arquivo de Figma: todos os artboards lado a lado, cada um num viewport de aparelho, nunca uma tela por página. Os novos entram **no fim da linha de cada tipo**, sem reordenar os existentes:

- **Linha 1, web `1440 x 900`:** os existentes 5.1 a 5.11 e, depois de 5.11, os novos 5.12 a 5.17.
- **Linha 2, modo escuro:** os existentes 6.1 a 6.3 e, depois de 6.3, os novos 6.4 e 6.5.
- Rótulo acima no formato `Painel de moderação · <estado>`, viewport abaixo. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.

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
botão de remover, no item e no botão de suspender, nos dois dialogs
destrutivos e nos banners de falha: a fila não é pintada de vermelho, e a
conta suspensa não é marcada com rubi.

TIPOGRAFIA
Space Grotesk (500, 600, 700) no display.
Manrope (400, 500, 600, 700) em toda a interface.
Newsreader (400, 500, regular e italic) APENAS em três lugares do produto:
  corpo da resenha renderizada, frases e trechos do livro, e sinopse na
  página do livro. Nesta tela, a serifa entra só no corpo da resenha
  denunciada, no detalhe e no trecho da fila. Comentário, motivo da
  denúncia, motivo da suspensão, registro e toda a interface são Manrope.
JetBrains Mono (400, 500) em números, com numeral tabular: datas e horas
  da fila e do registro, contador de caracteres.

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
texto em uma linha. Desabilitado: 40% de opacidade, sem hover.

FORMULÁRIO
Label acima do campo, sempre, no token label, cor grafite (grafite-claro no
escuro), com space-2 de gap. Placeholder nunca substitui label.
Campo com radius 12, borda de 1px linha, fundo papel-elevado, texto
digitado em body tinta.
Foco: borda de 1.5px musgo, sem outline padrão do browser, transição
dur-fast.
Erro: borda de 1.5px rubi, mensagem abaixo em caption rubi, space-2 de gap.
Helper abaixo do campo em caption grafite, visível o tempo todo.

SOBREPOSIÇÃO (dialog)
A partir de 768px: dialog centrado, 480px de largura, radius-xl nos quatro
cantos, sem alça, fundo papel (noite-elevada no escuro), padding space-6,
elev-3. Scrim: #171512 a 40% no claro e preto a 60% no escuro. Entra em
dur-base com deslize curto de 16px e fade, sai em dur-base com ease-in. Foco
preso dentro enquanto aberto; Esc e clique no scrim fecham; o foco volta ao
elemento que abriu. Na confirmação destrutiva simples o foco entra em
Cancelar, nunca no destrutivo; no dialog que exige motivo, o foco entra no
campo. Título em title-sm, consequência em body grafite nomeando o que
acontece. Botões lado a lado, alinhados à direita, Cancelar primeiro.

MENU ANCORADO
Abre abaixo do botão que o chamou, alinhado pela direita, space-1 abaixo.
Fundo papel (noite-elevada no escuro), borda 1px linha (linha-noite),
radius 12, elev-2, padding space-1. Itens de 44px, padding lateral space-3,
ícone de 20px à esquerda e space-3 de gap. Fecha com Esc, clique fora ou
escolha.

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

## 3. O que permanece intocado

Não redesenhe nada desta lista. Artboard que não aparece na seção 4 nem na 5 fica exatamente como está no canvas.

- **Sidebar do administrador**, com o divisor e `Moderação` ativo, em todos os artboards.
- **Header `Moderação`** e a **faixa de abas** `Denúncias pendentes` e `Registro de auditoria`.
- **A fila inteira**: as cinco denúncias da seção 3 do P2, a ordem da mais antiga para a mais recente, o desenho do item, a etiqueta de tipo, a etiqueta `Livro pessoal`, o selecionado em `musgo-fundo`, `Carregar mais denúncias`. Só ganha a etiqueta `Conta suspensa` nos artboards 5.16 e 6.5.
- **O detalhe da denúncia**: título, metadado de recebimento, seção `Motivo`, seção `Conteúdo denunciado` com o card completo, faixa das respostas, barra de ações com `Arquivar como improcedente` e `Remover resenha` ou `Remover comentário`.
- **O dialog de remoção**, os estados `Removendo`, `Remoção não confirmada`, `Denúncia arquivada`, `Conteúdo já excluído`, a fila vazia, o carregamento e o erro ao carregar, com toda a copy.
- **A tabela do registro**: cabeçalho, colunas, linhas de 56px, divisores, sem zebra, as seis linhas do P2 com o mesmo texto.
- **Artboards 5.8, 5.9 e 5.10** ficam exatamente como estão: não têm detalhe de denúncia.

**Mocks que continuam:** a fila e os conteúdos do P2. A conta suspensa nos artboards novos é **Sérgio Valadares** (`@svaladares`), autor do comentário da denúncia 3 (`Ataque pessoal ao autor da resenha e a quem comentou.`, enviada por `@dandaralp`), a mesma conta que a edição de `perfil-de-outro-leitor` suspende. Hoje é **11 de outubro de 2026**; a suspensão acontece às **14:32**. Os dois canvases mostram a mesma suspensão, iniciada por caminhos diferentes, e a mesma linha de registro.

**Motivo da suspensão** (mock, escrito pelo administrador): `Ataques pessoais repetidos em comentários, com três denúncias procedentes em setembro.` (86 caracteres).

**Linhas novas do registro**, que entram **antes** das seis do P2, da mais recente para a mais antiga:

| Data e hora | Autor | Ação | Alvo | Motivo do administrador |
|---|---|---|---|---|
| `11/10/2026 14:32` | `Administrador` | `Suspendeu a conta` | `Conta de @svaladares` | `Ataques pessoais repetidos em comentários, com três denúncias procedentes em setembro.` |
| `06/10/2026 16:05` | `Administrador` | `Reativou a conta` | `Conta de @tiagomoreira` | `Suspensão revista: os comentários removidos eram de um único dia e não se repetiram.` |
| `03/10/2026 09:40` | `Administrador` | `Suspendeu a conta` | `Conta de @tiagomoreira` | `Comentários ofensivos em série na atividade de @rafaokamoto, mesmo depois da remoção.` |

`@tiagomoreira` é o autor do comentário removido em `29/09/2026 10:12` no registro do P2: a escada inteira aparece no mock (remoção, suspensão, reativação).

---

## 4. Artboards que mudam

### Em todos os artboards com detalhe de denúncia

`5.1`, `5.2`, `5.3` (sob o scrim), `5.4`, `5.5`, `5.6`, `5.7`, `6.1` e `6.2` (sob o scrim).

**Entra o botão de ações sobre a conta do autor**, na mesma linha do título do detalhe, alinhado à direita da coluna:

- `DotsThree` (Phosphor, `regular`, 24px, `grafite`), alvo de 40 por 40px, `radius` 12, sem borda, fundo transparente. Hover com fundo `linha`, `dur-fast`. Pressionado (menu aberto) com fundo `linha`. Foco de teclado com contorno de 2px `musgo` e offset de 2px.
- O título continua à esquerda, com a mesma escala; o botão alinha pelo centro vertical da primeira linha do título.
- Rótulo acessível: `Ações sobre a conta de Letícia Nakamura` (o nome muda com a denúncia).
- **Não aparece** quando o autor é `conta excluída` (RN-23.7): não há conta a suspender. Nenhuma denúncia da fila do P2 tem esse caso; a regra fica declarada, sem artboard.
- Nada mais muda nesses artboards.

### `Painel de moderação · Registro de auditoria` (5.11)

- **Explicação acima da tabela**, troca de copy: sai `Toda ação de moderação fica registrada, da mais recente para a mais antiga. Conteúdo removido e motivos não ficam no registro.`; entra `Toda ação de moderação fica registrada, da mais recente para a mais antiga. Motivos de denúncia e conteúdo removido não ficam no registro.`
- **Três linhas novas no topo**, as da seção 3, antes das seis do P2.
- **Desenho das linhas de conta** (nasce aqui):
  - Data e hora, autor e ação no mesmo desenho das outras linhas, alinhados pelo topo da linha.
  - Na coluna `Alvo`, primeira linha: `Conta de ` em `body` `tinta` seguido do `@username` como **link** em `body-strong` `musgo` (`@svaladares`), sublinhado no hover, que abre o perfil do leitor na visão do administrador (desenhada em `perfil-de-outro-leitor`).
  - `space-1` abaixo, o **motivo do administrador**, inteiro, sem corte, em `body` `grafite`, precedido de `Motivo: ` em `body-strong` `grafite`. Quebra em quantas linhas precisar dentro da coluna; a linha da tabela cresce (altura mínima de 56px, padding vertical `space-3`).
  - Sem ícone, sem cor de estado, sem etiqueta: `Suspendeu a conta` e `Reativou a conta` são ações como as outras.
- As seis linhas do P2 **não mudam** e continuam sem link e sem motivo.
- `Carregar mais registros` continua no fim.

### `Painel de moderação · Registro de auditoria, modo escuro` (6.3)

As mesmas mudanças de 5.11: copy nova da explicação em `grafite-claro`, três linhas novas no topo, link `@username` em `musgo-claro`, `Motivo:` e o motivo em `grafite-claro`.

---

## 5. Artboards novos

### Componentes descritos uma vez (usados de 5.12 a 6.5)

**Menu de ações sobre a conta do autor** (menu ancorado da seção 2), 280px de largura, aberto abaixo do `DotsThree` do detalhe. **Um item só**:

- Conta ativa: `Prohibit` (20px, `rubi`) e `Suspender conta do autor` em `body-strong` `rubi`. Hover com fundo `rubi-fundo`.
- Conta suspensa: `ArrowCounterClockwise` (20px, `musgo`) e `Reativar conta do autor` em `body-strong` `tinta`. Hover com fundo `musgo-fundo`.

**Dialog de suspensão**, **idêntico** ao da edição de `perfil-de-outro-leitor` (descrição completa na seção 7). O nome é o do autor da denúncia selecionada.

**Etiqueta de estado `Conta suspensa`**: pill de 24px, `radius-full`, padding horizontal `space-3`, borda de 1px `linha`, fundo transparente, `Prohibit` (16px, `grafite`) e texto em `label` `grafite`. O mesmo desenho da etiqueta de tipo, com ícone.

**Faixa da conta suspensa no detalhe** (faixa informativa neutra, design §4.15): fundo `musgo-fundo`, `radius` 12, padding `space-4`, `Info` (Phosphor, `regular`, 20px, `musgo`), texto em `body` `tinta`.

### Linha 1, web, depois de 5.11, nesta ordem

#### 5.12 `Painel de moderação · Menu da conta do autor`

- Base: 5.2, com a denúncia 3, de Sérgio Valadares, selecionada, **sem** o hover no item 4.
- O `DotsThree` do detalhe pressionado (fundo `linha`) e o **menu aberto** com `Suspender conta do autor`, o cursor sobre o item (fundo `rubi-fundo`).
- A barra de ações continua no pé, inalterada.

#### 5.13 `Painel de moderação · Confirmar suspensão`

- Base: 5.12 sob o scrim de `tinta` a 40%, o menu fechado.
- Dialog de suspensão com o motivo **digitado**: `Ataques pessoais repetidos em comentários, com três denúncias procedentes em setembro.`, contador `86 de 500`, o campo com o foco (borda de 1.5px `musgo`), e `Suspender conta` **habilitado**.

#### 5.14 `Painel de moderação · Suspendendo`

- Mesmo dialog, depois de `Suspender conta`, há mais de três segundos: o destrutivo com `Suspendendo conta`, `Cancelar` e o campo desabilitados (texto `grafite-suave`), e a linha `O serviço está iniciando. Isso pode levar alguns segundos.` acima dos botões, alinhada à direita.

#### 5.15 `Painel de moderação · Suspensão não confirmada`

- O dialog continua aberto, com o motivo digitado e os botões de novo habilitados.
- Entre o título e a consequência, o banner inline `rubi-fundo` com `Warning` (20px, `rubi`): `A suspensão não foi confirmada a tempo. A conta continua ativa. Tente de novo: se a suspensão já tiver acontecido, ela não é aplicada duas vezes.`
- Atrás do scrim, a fila e o detalhe **sem** nenhuma marca de suspensão.

#### 5.16 `Painel de moderação · Autor suspenso`

O serviço confirmou. A denúncia **continua pendente**.

- **Fila:** o item 3 continua selecionado e no mesmo lugar. Na linha 1, entre a etiqueta de tipo e a data, `space-2` depois da etiqueta `Comentário`, a etiqueta `Conta suspensa`.
- **Detalhe:** título `Denúncia de comentário` e o metadado como antes. `space-4` abaixo do metadado, a **faixa da conta suspensa**: `A conta de Sérgio Valadares está suspensa desde 11 de outubro de 2026, às 14:32. A denúncia continua pendente: decida sobre o comentário como de costume.`
- **Card do conteúdo denunciado:** continua inteiro, porque o administrador precisa dele para decidir. No lugar do link `Ver no feed`, uma linha em `caption` `grafite`: `O comentário está oculto para os leitores enquanto a conta estiver suspensa.`
- **Barra de ações** inalterada: `Arquivar como improcedente` e `Remover comentário`, habilitados.
- O `DotsThree` do detalhe, se aberto, mostra `Reativar conta do autor` (não desenhado aberto aqui).
- **Toast** no canto inferior esquerdo da área de conteúdo, `space-8` das bordas, 400px, barra lateral de 4px `musgo`, `Prohibit` (20px, `musgo`): `Conta de Sérgio Valadares suspensa. O perfil e o conteúdo ficaram ocultos para os leitores.` e `X` com rótulo `Fechar aviso`. O toast aparece parado.

#### 5.17 `Painel de moderação · Confirmar reativação`

- Base: 5.16 sem o toast, sob o scrim.
- Dialog de reativação recém-aberto: título `Reativar a conta de Sérgio Valadares?`, a consequência, o campo `Motivo da reativação` **vazio**, com o foco e o placeholder, contador `0 de 500`, e `Reativar conta` **desabilitado** a 40% de opacidade.

### Linha 2, modo escuro, depois de 6.3, nesta ordem

#### 6.4 `Painel de moderação · Confirmar suspensão, modo escuro`

Equivalente a 5.13. Scrim preto a 60%, dialog em `noite-elevada`, título em `papel-suave`, consequência, label, helper e contador em `grafite-claro`, campo em `noite` com borda de 1.5px `musgo-claro` no foco e texto `papel-suave`, `Cancelar` em `grafite-claro`, destrutivo em outline `rubi-claro` com `Prohibit` `rubi-claro`.

#### 6.5 `Painel de moderação · Autor suspenso, modo escuro`

Equivalente a 5.16, sem o toast. Etiqueta `Conta suspensa` com borda `linha-noite`, ícone e texto `grafite-claro`; faixa da conta suspensa em `musgo-fundo-escuro` com `Info` `musgo-claro` e texto `papel-suave`; linha de conteúdo oculto em `grafite-claro`.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

### Dialog de suspensão e de reativação, transcrito da edição de `perfil-de-outro-leitor`

**Suspensão.** 480px de largura, `radius-xl`, fundo `papel`, padding `space-6`, `elev-3`, centrado na viewport, sobre o scrim de `tinta` a 40%.

1. Título em `title-sm` `tinta`: `Suspender a conta de Sérgio Valadares?`
2. `space-3` abaixo, a consequência em `body` `grafite`: `Sérgio deixa de conseguir entrar no Lê Ai, e o perfil, as resenhas, as atividades, os comentários e as listas dele ficam ocultos para os outros leitores. Nada é apagado, e a conta pode ser reativada depois.`
3. `space-5` abaixo, o **campo de motivo**, obrigatório:
   - Label `Motivo da suspensão` em `label` `grafite`, `space-2` acima do campo.
   - Área de texto de 96px de altura mínima, que cresce até 160px e depois rola por dentro, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, padding `space-3`, texto em `body` `tinta`. Placeholder em `grafite-suave`: `Por exemplo: ataques pessoais repetidos em comentários.`
   - Foco: borda de 1.5px `musgo`.
   - `space-2` abaixo, na mesma linha: helper à esquerda em `caption` `grafite`, `Fica no registro de auditoria. Sérgio não vê este texto.`, e o contador à direita em `caption` `grafite` com numeral tabular, `0 de 500`. Acima de 500, o contador e a borda ficam `rubi` e o helper dá lugar a `Use até 500 caracteres.` em `caption` `rubi`.
4. `space-6` abaixo, botões lado a lado, alinhados à direita, `space-3` entre eles:
   - `Cancelar`, botão textual `grafite`.
   - **Destrutivo em outline `rubi`**, 40px, `radius` 12, `Prohibit` (20px, `rubi`) à esquerda: `Suspender conta`. Hover com fundo `rubi-fundo`, `dur-fast`. **Desabilitado enquanto o motivo está vazio ou só com espaços**: 40% de opacidade, sem hover. Nunca preenchido.
5. **O foco entra no campo de motivo.** `Esc` e `Cancelar` fecham sem suspender e sem guardar o texto.

Estados:

- **Suspendendo:** o destrutivo mostra `Suspendendo conta`, no mesmo outline, sem spinner e sem esmaecer; `Cancelar` e o campo desabilitados. Depois de três segundos, acima dos botões, alinhado à direita, em `caption` `grafite`: `O serviço está iniciando. Isso pode levar alguns segundos.` Sem estado otimista.
- **Suspensão não confirmada:** o dialog continua aberto, o motivo continua digitado, os botões voltam a habilitar e, entre o título e a consequência, `space-3` acima e abaixo, o banner `rubi-fundo`, `radius` 12, padding `space-4`, `Warning` (20px, `rubi`), texto em `body` `tinta`: `A suspensão não foi confirmada a tempo. A conta continua ativa. Tente de novo: se a suspensão já tiver acontecido, ela não é aplicada duas vezes.`
- **Suspensa:** o dialog fecha e aparece o toast `Conta de Sérgio Valadares suspensa. O perfil e o conteúdo ficaram ocultos para os leitores.`, com `Prohibit` em `musgo`.

**Reativação**, mesmo desenho, com estas diferenças: título `Reativar a conta de Sérgio Valadares?`; consequência `Sérgio volta a conseguir entrar, e o perfil e o conteúdo dele voltam a aparecer para os leitores, conforme a privacidade do perfil.`; label `Motivo da reativação`; placeholder `Por exemplo: suspensão revista depois de nova análise.`; confirmar é **primário pill `musgo`**, 40px, texto `papel`, `ArrowCounterClockwise` (20px) à esquerda: `Reativar conta`, desabilitado com motivo vazio. Espera `Reativando conta`. Falha: `A reativação não foi confirmada a tempo. A conta continua suspensa. Tente de novo: se a reativação já tiver acontecido, ela não é aplicada duas vezes.` Sucesso: toast `Conta de Sérgio Valadares reativada.` com `ArrowCounterClockwise` em `musgo`; a etiqueta e a faixa saem, e o link `Ver no feed` volta.

### Tabela de componentes

| Componente | Onde está definido |
|---|---|
| Dialog de confirmação | documento-de-design §4.11 e §7.8 |
| Dialog de suspensão e reativação com motivo | nasceu na edição do Período 3 de `perfil-de-outro-leitor`, incorporação pendente; reaproveitado aqui sem mudança |
| Menu ancorado de ações | nasceu nos prompts de lista e de desafios do Período 2, incorporação pendente |
| Etiqueta de estado `Conta suspensa` | nasceu na edição do Período 3 de `perfil-de-outro-leitor`, no desenho da etiqueta de tipo deste painel |
| Faixa informativa neutra | documento-de-design §4.15 |
| Banner inline de erro | nasceu no Período 1 |
| Toast em `papel-elevado` com barra lateral | documento-de-design §7.6 |
| Área de texto com contador | nasceu em `denunciar.md` (Período 2), incorporação pendente |
| Tabela de registro | nasceu neste painel no Período 2, incorporação pendente |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **`DotsThree` de ações sobre a conta do autor** no título do detalhe da denúncia, com um item só, que alterna entre suspender e reativar.
2. **Linha de registro de conta**: alvo com `@username` como link para a visão do administrador e o motivo do administrador inteiro abaixo, com a linha crescendo.
3. **Marca de conta suspensa na fila e no detalhe**: etiqueta ao lado da etiqueta de tipo e faixa neutra no topo do detalhe, com a troca do link do card por uma linha de conteúdo oculto.

---

## 8. Copy nova ou alterada

| Onde | Texto que entra | Texto que sai |
|---|---|---|
| Explicação do registro | `Toda ação de moderação fica registrada, da mais recente para a mais antiga. Motivos de denúncia e conteúdo removido não ficam no registro.` | `Toda ação de moderação fica registrada, da mais recente para a mais antiga. Conteúdo removido e motivos não ficam no registro.` |
| Rótulo do `DotsThree` | `Ações sobre a conta de Letícia Nakamura` (com o nome do autor) | nada, não existia |
| Item do menu, conta ativa | `Suspender conta do autor` | nada |
| Item do menu, conta suspensa | `Reativar conta do autor` | nada |
| Dialog de suspensão | título, consequência, label, placeholder, helper, contador, erro, botões, espera e falha da seção 7, literais | nada |
| Dialog de reativação | título, consequência, label, placeholder, espera e falha da seção 7, literais | nada |
| Toast, suspensa | `Conta de Sérgio Valadares suspensa. O perfil e o conteúdo ficaram ocultos para os leitores.` | nada |
| Toast, reativada | `Conta de Sérgio Valadares reativada.` | nada |
| Etiqueta | `Conta suspensa` | nada |
| Faixa do detalhe | `A conta de Sérgio Valadares está suspensa desde 11 de outubro de 2026, às 14:32. A denúncia continua pendente: decida sobre o comentário como de costume.` (para resenha: `decida sobre a resenha como de costume.`) | nada |
| Card, conteúdo oculto | `O comentário está oculto para os leitores enquanto a conta estiver suspensa.` (para resenha: `A resenha está oculta para os leitores enquanto a conta estiver suspensa.`) | `Ver no feed` ou `Ver na página do livro`, só enquanto a conta está suspensa |
| Ações do registro | `Suspendeu a conta`, `Reativou a conta` | nada |
| Alvo do registro | `Conta de @svaladares`, `Conta de @tiagomoreira` | nada |
| Motivo no registro | `Motivo: ` seguido do texto do administrador | nada |
| Linhas novas do registro | as três da seção 3, literais | nada |

Nenhuma outra copy muda. Zero em-dash, zero emoji. O contador `86 de 500` é a única contagem sem unidade escrita, porque `de 500` já diz o que conta.

---

## 9. Acessibilidade e interação do que muda

- **`DotsThree`:** botão com rótulo acessível que nomeia o autor, alvo de 40px, foco visível. Entra na ordem de tabulação depois do título do detalhe e antes do link do card. O menu abre com `Enter` ou espaço, o foco vai para o item, `Esc` fecha e devolve o foco ao `DotsThree`.
- **Confirmação** (RNF-USA-04): suspender e reativar só acontecem depois do dialog, com motivo. O destrutivo é outline `rubi`, nunca preenchido. O foco entra no campo de motivo; o botão desabilitado é anunciado como indisponível, com o motivo de estar indisponível no helper.
- **Contador:** associado ao campo e anunciado de forma educada quando passa do limite, não a cada tecla.
- **Espera, falha e sucesso:** a troca para `Suspendendo conta`, o banner de falha e o toast ficam numa região viva educada. O toast não rouba o foco; depois do sucesso o foco volta ao `DotsThree` do detalhe.
- **Reenvio seguro:** confirmar de novo depois da falha repete a mesma solicitação, sem aplicar duas vezes.
- **Estado sem depender de cor:** `Conta suspensa` tem ícone e texto; a faixa nomeia o estado por extenso. A faixa é informação, sem `role="alert"`.
- **Registro:** o link `@username` é um link de verdade, com foco visível e rótulo `Abrir a conta de @svaladares`. O motivo é texto puro, escapado (RNF-SEC-14), lido inteiro pelo leitor de tela como parte da célula.
- **Motion:** dialog, menu e toast respeitam `prefers-reduced-motion`.

---

## 10. O que não fazer nesta edição

**Regra da edição**

- **Não redesenhe o que não foi citado.** Nenhum artboard existente muda de posição, de tamanho ou de conteúdo além do descrito na seção 4.
- **Não reordene os artboards** no canvas. Os novos entram no fim de cada linha.
- **Não reintroduza nada que a seção 10 do prompt original proíbe**, com as exceções declaradas na seção 1: suspender e reativar, e o motivo do administrador no registro.
- Não altere o dialog de suspensão em relação ao da edição de `perfil-de-outro-leitor`: mesma copy, mesmos tamanhos, mesmos estados.

**Moderação**

- Não desenhe lista de contas suspensas, busca de contas, filtro por estado ou qualquer gestão de contas fora da denúncia e do registro.
- Não desenhe bloquear, banir, suspensão temporária, prazo, contagem regressiva nem exclusão de conta pelo administrador.
- Não faça a suspensão resolver a denúncia: ela continua na fila até remover ou arquivar.
- Não desenhe suspender sem dialog, confirmar sem motivo, nem botão destrutivo preenchido.
- Não mostre o motivo da denúncia, quem denunciou nem o texto removido no registro. Só o motivo do administrador, só nas linhas de conta.
- Não desenhe aviso ao autor, mensagem para o leitor suspenso, resposta ao denunciante nem campo de observação na denúncia.
- Não pinte a conta suspensa de `rubi` nem a fila de vermelho. Suspensão é estado da conta, não erro.
- Não mostre `DotsThree` de conta quando o autor é `conta excluída`.
- Não desenhe seleção múltipla, ação em lote, contagem total, badge na sidebar nem gráfico.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora do corpo da resenha denunciada. O motivo da suspensão é Manrope.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline em toda seção, e esta edição não precisa de nenhum.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto de título.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.
- Nada de acento fora do `musgo`. `rubi` só nos lugares listados na seção 2.

**Motion**

- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de shimmer perpétuo em skeleton.
- Nada de spinner girando.

**Copy**

- Zero em-dash. Use hífen, dois pontos ou reescreva a frase.
- Zero emoji na interface.
- Nada de mensagem de erro genérica do tipo "Algo deu errado".
- Nada de label poético. `Suspender conta do autor`, não "Afastar da comunidade".
- Nada de número sem unidade e nada de número fake-preciso.

**Componentes**

- Nada de ícone desenhado à mão. Se faltar um glifo, use outro da Phosphor.
- Nada de capa de livro com canto arredondado.
- Nada de toast com fundo saturado verde ou vermelho.
- Nada de tabela zebrada, com borda em cada célula ou com fundo colorido no cabeçalho.
- Nada de conteúdo essencial escondido em hover: o motivo do registro aparece inteiro.

**Modo escuro**

- Nada de fundo #000000.
- Nada de simples inversão da paleta clara.
- Nada de meia tela clara e meia escura.

**Layout (web)**

- Nada de visual de console administrativo genérico: sem topbar escura, sem cards de KPI, sem sidebar diferente da do produto.
- Nada de layout que não colapse para uma coluna abaixo de 1024px.
- Nada de hero, logo wall, faixa decorativa em mono-caps nem botão flutuante de suporte.

**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos.
- Sem ranking de leitores, nem de "mais denunciados" ou "mais suspensos".
- Sem mensagem direta entre usuários ou entre administrador e leitor.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem tela própria de login de administrador.
- Sem leitura de e-book dentro do aplicativo.
