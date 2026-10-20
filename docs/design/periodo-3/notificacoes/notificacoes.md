# F-GAM-OPC · Notificações (edição do Período 3)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Notificações`, o canvas que resultou de `docs/design/periodo-2/notificacoes/notificacoes.md` (que por sua vez editou `docs/design/periodo-1/F-NOT/notificacoes.md`). Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-2/notificacoes/notificacoes.md
**Features:** ../../../plano-de-desenvolvimento/periodo-3/feature-F-GAM-OPC.md
**Requisitos que entram:**
- F-GAM-OPC: RF-GAM-05 e RF-NOT-01, tipo `lembrete de sequência` (`lembrete_sequencia`): o leitor com sequência ativa que ainda não registrou progresso no dia corrente recebe **um** lembrete por dia.

**Não funcionais:** RNF-SEC-02 (o lembrete só chega ao dono da sequência), RNF-USA-03 (contraste WCAG AA), RNF-USA-05 (mensagem acionável, sem detalhe técnico)
**Regras de negócio:** RN-18 (sequência em dias com leitura, dia contado pela data local; o lembrete não altera a sequência), RN-17 (não existe registro retroativo de progresso)
**Versão web:** **não.** RF-GAM-05 e RF-NOT-01 estão fora do escopo na coluna Web de `REQUISITOS.md`, e o §2.1 põe notificações e gamificação fora do cliente web. Este canvas continua sem nenhum artboard de 1440 x 900.
**Destinos desenhados em outros prompts:** registrar progresso (`docs/design/periodo-2/registrar-progresso/registrar-progresso.md`, bottom sheet) e a estante (`docs/design/periodo-2/estante/estante.md`). Aqui só existe a navegação até eles.

**F-NOT-OPC não muda esta tela.** As preferências por tipo moram numa tela própria, aberta por `Configurações` (`docs/design/periodo-3/F-NOT-OPC/preferencias-de-notificacao.md`), e o push é entregue pelo sistema operacional, fora do app. A lista continua sem engrenagem, sem filtro e sem banner de permissão.

---

## 1. O que muda e por quê

O Período 2 deixou o lembrete de sequência de fora de propósito: ele é Opcional, depende de push e foi para o Período 3. Com F-GAM-OPC, o tipo `lembrete_sequencia`, que já existe no enum de notificações desde o Período 1, passa a ser gerado por um job diário em `leitura`. Esta edição é a chegada desse **décimo segundo tipo** à lista.

| O que entra | Onde | Feature |
|---|---|---|
| Tipo **lembrete de sequência**, com ícone `Flame` em `grafite` e texto que diz o número da sequência e que hoje ainda não tem leitura registrada | Item de notificação | F-GAM-OPC |
| Destino ao tocar: registrar progresso da leitura em andamento, ou a estante quando não há uma só leitura em andamento | Navegação do item | F-GAM-OPC |
| Texto do estado vazio cita os lembretes da sequência | `Notificações · Nenhuma notificação` | F-GAM-OPC |

**O lembrete é informação, não cobrança.** O tom é o mesmo dos outros tipos: diz o que é, não pede nada com urgência. Ele não tem ação inline: o `Warning` da leitura em risco continua sendo o **único** item com ações e o **único** ícone colorido, porque continua sendo o único que pede uma decisão (abandonar ou registrar).

**Por que `Flame` em `grafite`.** `Flame` é o ícone do streak (design §4.8), e reconhecer o ícone liga o lembrete à sequência do perfil. Mas na lista nenhum tipo além do `Warning` tem cor, e a tela de preferências de notificação já desenha `Flame` em `grafite`. O lembrete segue a regra da lista.

**O que acontece depois que o leitor registra progresso.** O lembrete **continua na lista**, como qualquer notificação: ele vira lido quando é tocado, ou com `Marcar todas`. Ele não some nem muda de texto, e não aparece um segundo lembrete no mesmo dia (a chave de idempotência é leitor e data local).

**O que deixa de valer do prompt do Período 2:** a regra "Não desenhe lembrete de sequência diária. RF-GAM-05 é Opcional, depende de push e ficou para o Período 3". Todas as outras regras daquele prompt continuam valendo, inclusive "Não desenhe preferências por tipo de notificação" e "Não desenhe push, permissão de notificação do sistema nem banner de ative as notificações" **dentro desta tela**: as preferências e o aviso de permissão moram na tela de preferências, não aqui. A seção 10 abaixo repete as regras.

O canvas continua simulando um arquivo de Figma, com os artboards lado a lado:

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** modo escuro. Não existe linha web.
- Cada artboard com o **rótulo acima**, no formato `Notificações · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas, não aparecem dentro do frame.
- Os artboards novos entram **no fim da linha** da sua plataforma, depois dos existentes, sem reordenar nenhum.

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

Tudo o que vem a seguir fica **exatamente como está no canvas**:

- **O shell inteiro.** Barra inferior do mobile com os quatro itens (`Estante`, `Descobrir`, `Feed`, `Perfil`) e a área de origem ativa, do jeito que já está em cada artboard. Esta edição não mexe em navegação e não cria linha web.
- **O header da tela:** `ArrowLeft`, título `Notificações` em `display` `tinta`, `Marcar todas` só quando há não lidas, **sem `Bell`**, divisor `linha` na base só quando o conteúdo rola por baixo.
- **A linha de contexto** (`N não lidas`), que muda só o número nos artboards novos.
- **A anatomia do item de notificação:** ponto `musgo` de 8px para não lida, ícone contextual de 24px, texto em `body` `tinta` com o nome de quem agiu em `body-strong`, tempo em `caption` `grafite-suave`, divisor `linha` entre itens, sem avatar. Item lido não esmaece.
- **Os onze tipos do Período 1 e do Período 2**, com os ícones e a copy que já têm, inclusive a linha de mensagem da recomendação.
- **A notificação de leitura em risco**, com `Warning` em `ambar` e as ações `Abandonar leitura` e `Registrar progresso`, o modal de confirmação e o estado `Leitura abandonada.`.
- **O tempo real do Período 2:** a chegada no topo, o aviso `N novas notificações` com a lista rolada, a reconexão silenciosa e o badge que muda só o número.
- **Os artboards existentes, com os dados que já têm.** A lista de doze notificações do Período 2 **não ganha** o lembrete: ele aparece só nos artboards novos da seção 5. Assim, nenhuma contagem de não lidas dos artboards existentes muda.
- **Os estados `Carregando`, `Carregando mais` e `Erro de carregamento`.**
- **A ordem dos artboards existentes** em cada linha e os rótulos deles.

### Dados dos artboards novos

A leitora é **Marina Beltrão** (`@marinableu`), com **sequência atual de `12 dias`**, o mesmo número do Meu perfil e do calendário de sequência. O dia é **sexta-feira, 25 de setembro de 2026**, e até agora ela não registrou progresso hoje. O lembrete chegou pelo job diário.

A lista dos artboards novos é a lista de doze da edição do Período 2, **com o lembrete acima de todas**, como a notificação mais recente:

| # | Tipo | Ícone | Texto | Quando | Estado |
|---|---|---|---|---|---|
| 0 | **Lembrete de sequência** | `Flame` | `Sua sequência está em 12 dias e hoje ainda não tem leitura registrada.` | `há 1 h` | não lida |
| 1 a 12 | os doze do Período 2, na mesma ordem e com o mesmo texto | | | | os seis primeiros não lidos |

**Contagem de não lidas:** `7 não lidas` (o lembrete e as seis do Período 2).

**Destino do lembrete ao tocar**, sempre marcando a notificação como lida (RF-NOT-03), conforme o arquivo de F-GAM-OPC ("leva à tela da leitura em andamento ou da estante"):

| Situação do leitor | Destino |
|---|---|
| Exatamente **uma** leitura em `Lendo` ou `Relendo` | O bottom sheet **Registrar progresso** dessa leitura, sobre a estante |
| **Mais de uma** leitura em andamento (o caso de Marina, com duas em `Lendo` e uma em `Relendo`) | A **estante**, no filtro `Lendo` |
| **Nenhuma** leitura em andamento | A **estante**, no filtro `Todos` |

O destino não é desenhado neste canvas.

**Regra de envio, só para orientar o texto (não aparece na tela):** um lembrete por dia, só para quem tem sequência ativa (maior que zero) e ainda não tem registro no dia local, calculado pelo último fuso do aparelho. Quem não tem sequência ativa não recebe. O atraso do job não altera a sequência.

Todo número aparece com unidade. Nenhum valor é fake-preciso.

---

## 4. Artboards que mudam

### 4.1 Item de notificação: o tipo lembrete de sequência

Vale como regra para **qualquer lista** que contenha o lembrete. Nos artboards existentes ele não aparece (seção 3); a regra vale para os artboards novos e para a implementação.

- **Ícone:** `Flame` (Phosphor, `regular`, 24px, **`grafite`**), no mesmo lugar dos outros ícones contextuais. **Sem cor própria**: nem `musgo`, nem `broto`, nem `ambar`. No escuro, `grafite-claro`.
- **Texto principal** em `body` `tinta`, uma frase, sem nome em `body-strong` (não há quem agiu): `Sua sequência está em 12 dias e hoje ainda não tem leitura registrada.` O número vai com a unidade, `12 dias`, em Manrope como o resto do texto, sem JetBrains Mono, sem destaque.
- **Sem linha de mensagem** e **sem ações inline.** O lembrete é um item comum: o toque leva ao destino da seção 3.
- `space-1` abaixo, o tempo em `caption` `grafite-suave`, como nos outros tipos.
- **Uma sequência de 1 dia** usa o singular: `Sua sequência está em 1 dia e hoje ainda não tem leitura registrada.`

### 4.2 `Notificações · Nenhuma notificação`

- Só a copy do texto muda, para citar os lembretes (seção 8). Ícone, título, largura máxima de 280px e ausência de botão ficam como estão.

Nenhum outro artboard existente muda.

---

## 5. Artboards novos

### Mobile (390 x 844), no fim da linha 1, nesta ordem

#### 5.1 `Notificações · Lembrete de sequência`

A leitora abre a lista de notificações no fim da manhã. O lembrete do dia é a notificação mais recente.

- Base: o artboard `Notificações · Padrão, com não lidas`.
- Header com `ArrowLeft`, `Notificações` e `Marcar todas`. Linha de contexto: `7 não lidas`.
- **Primeiro item da lista: o lembrete** (4.1), com o ponto `musgo` de não lida, `Flame` em `grafite`, o texto e `há 1 h`.
- Abaixo dele, os itens 1 a 12 do Período 2, na ordem, os seis primeiros com o ponto `musgo`, cortados naturalmente pela barra inferior. Os itens 1 (leitura em risco, com `Warning` `ambar` e as duas ações) e 2 (recomendação com mensagem) precisam estar visíveis: é a comparação que prova que o lembrete não pede ação nem tem cor, ao lado do único item que tem as duas coisas.
- Barra inferior do shell com a área de origem ativa.

#### 5.2 `Notificações · Lembrete de sequência, lido`

O mesmo dia, depois que a leitora tocou no lembrete, registrou progresso e voltou para a lista.

- Base: 5.1.
- **O lembrete continua no topo**, agora **sem o ponto `musgo`** (lido). Texto e tempo iguais: o lembrete não muda de texto depois do registro, não ganha check e não some.
- Linha de contexto: `6 não lidas`.
- Nenhum segundo lembrete aparece. Nenhuma notificação nova sobre a sequência aparece (registrar progresso não gera notificação para o próprio leitor).

### Modo escuro, no fim da linha 2, nesta ordem

#### 5.3 `Notificações · Escuro, lembrete de sequência`

Equivalente a 5.1. Fundo `noite`. Header com `ArrowLeft` e título em `papel-suave`, `Marcar todas` em `musgo-claro`. Linha de contexto em `grafite-claro`. Itens com ícones em `grafite-claro` (a `Flame` do lembrete também, sem `broto-vivo`), `Warning` da leitura em risco em `ambar-claro`, texto em `papel-suave`, tempo em `grafite-fundo-escuro`, ponto de não lida em `musgo-claro`, divisores em `linha-noite`. Barra inferior em `noite-elevada`.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Padrão de tela de notificações, com header, lista, ícone contextual e ponto de não lida | documento-de-design §5.6 |
| `Flame` como ícone do streak | documento-de-design §4.8 |
| Iconografia Phosphor, com `fill` só para estado ativo | documento-de-design §6 |
| Ícones dos tipos do Período 2 e regras de tempo real | nasceram em `../../periodo-2/notificacoes/notificacoes.md`; incorporação pendente |
| Linha `Lembrete de sequência` com `Flame` em `grafite` | nasceu em `../F-NOT-OPC/preferencias-de-notificacao.md`; incorporação pendente |
| Shell de navegação e badge do sino | periodo-0/P0-NAV/shell-de-navegacao.md |

**Nascem aqui** e viram pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3:

1. **Ícone do tipo lembrete de sequência:** `Flame` em `grafite` (`grafite-claro` no escuro), sem a cor do streak. Com ele, a lista tem doze tipos, e o §5.6 continua citando quatro ícones.
2. **Item de notificação sem agente:** texto sem nome em `body-strong`, porque o lembrete vem do sistema, não de uma pessoa. A leitura em risco já era assim, mas com ações; o lembrete é o primeiro item de sistema sem ação.

**Decisões deste prompt a ratificar pelo dono (Vicenzo Fonseca):**

- **Destino do toque.** O arquivo de F-GAM-OPC diz "leva à tela da leitura em andamento ou da estante". Este prompt interpreta assim: uma única leitura em andamento abre o **Registrar progresso** dessa leitura; mais de uma abre a estante no filtro `Lendo`; nenhuma abre a estante em `Todos`. A alternativa de abrir o calendário de sequência foi descartada porque o lembrete serve para registrar hoje, e o calendário é somente leitura.
- **Texto:** `Sua sequência está em 12 dias e hoje ainda não tem leitura registrada.`, com o número e sem verbo no imperativo.
- **`Flame` em `grafite`**, sem a cor do streak, seguindo a regra de que só o `Warning` tem cor na lista.
- **O lembrete fica na lista depois do registro**, sem mudar de texto, até ser lido.
- **O lembrete não aparece na lista dos artboards existentes**, só nos novos, para não mexer nas contagens já desenhadas.
- **Texto do push:** não é desenhado aqui (é interface do sistema). A recomendação é usar o mesmo texto do item no corpo do push, com o título `Lê Aí`, mas a decisão é de F-NOT-OPC.

**Contratos a confirmar:**

- O payload de `sequencia.lembrete` (e da notificação `lembrete_sequencia`) precisa trazer o **número da sequência atual** no momento do envio, porque o texto o mostra. O arquivo da feature já lista "sequência atual" no payload do evento; falta garantir que o item da lista receba esse valor.
- O cliente precisa saber, no toque, **quantas leituras estão em andamento** para escolher o destino. Hoje isso vem da estante; confirmar se o app decide com o cache da estante ou se o payload traz uma referência de leitura.
- O horário de envio do job não está fixado (§10.2 aceita imprecisão). O mock usa `há 1 h` num fim de manhã; se o job rodar à noite, o texto não muda.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, e nenhum agente altera `docs/orquestador/` por conta própria.

---

## 8. Copy nova ou alterada

| Onde | Antes (P2) | Agora |
|---|---|---|
| Lembrete de sequência | não existia | `Sua sequência está em 12 dias e hoje ainda não tem leitura registrada.` |
| Lembrete de sequência, singular | não existia | `Sua sequência está em 1 dia e hoje ainda não tem leitura registrada.` |
| Linha de contexto nos artboards novos | não existia | `7 não lidas` (5.1, 5.3) / `6 não lidas` (5.2) |
| Vazio, texto | `Curtidas, comentários, menções, recomendações, novos seguidores e avisos das suas leituras aparecem aqui.` | `Curtidas, comentários, menções, recomendações, novos seguidores, avisos das suas leituras e lembretes da sua sequência aparecem aqui.` |
| Rótulo acessível do lembrete | não existia | `Sua sequência está em 12 dias e hoje ainda não tem leitura registrada, há 1 hora. Não lida. Abre a estante nas leituras em andamento.` |

Toda a outra copy continua. **A notificação diz o que é, não pede nada**: nada de `Não perca sua sequência`, `Corra`, `Só falta hoje`, `Leia agora`, `Confira` nem ponto de exclamação. Nada de contagem regressiva de horas até o fim do dia. Zero em-dash, zero emoji. Todo número aparece com unidade: `12 dias`, `7 não lidas`.

---

## 9. Acessibilidade e interação do que muda

- **Rótulo acessível do lembrete** junta o texto, o tempo, o estado e o destino (seção 8). O destino anunciado acompanha a situação do leitor: `Abre o registro de progresso de <título do livro>`, `Abre a estante nas leituras em andamento` ou `Abre a estante`.
- **O estado de não lida não depende só de cor:** o item é anunciado como não lido, além do ponto.
- **O ícone `Flame` é decorativo** para leitor de tela: o texto já diz que é sobre a sequência.
- **Chegada em tempo real:** se o lembrete chegar com a tela aberta, ele segue as regras do Período 2: região viva educada (`Nova notificação: Sua sequência está em 12 dias e hoje ainda não tem leitura registrada.`), foco que não se move, aviso `1 nova notificação` com a lista rolada.
- **Alvo de toque:** o item inteiro, com altura acima de 48px, como os outros.
- **Contraste:** texto em `tinta`, ícone em `grafite`; o tempo em `grafite-suave` não carrega informação essencial, porque está no rótulo acessível.
- `prefers-reduced-motion`: valem as regras do Período 2 para a entrada do item.
- Nenhuma ação desta edição é destrutiva.

---

## 10. O que não fazer nesta edição

**Regras da própria edição**

- **Não redesenhe o que não foi citado.** Header, linha de contexto, anatomia do item, os onze tipos existentes, leitura em risco, modal, aviso de novas, skeleton, erro e shell ficam como estão no canvas.
- **Não reordene os artboards existentes** e não troque os rótulos deles. Os novos entram no fim de cada linha.
- **Não acrescente o lembrete às listas dos artboards existentes** nem mude as contagens de não lidas deles.
- **Não desenhe as telas de destino** (registrar progresso, estante, calendário de sequência) dentro deste canvas.
- **Não desenhe nenhum artboard de 1440 x 900.**

**Lembrete de sequência**

- **Não dê cor ao lembrete:** nada de `Flame` em `broto`, `musgo` ou `ambar`, nada de fundo tingido, borda lateral ou pill. Só o `Warning` tem cor.
- **Não ponha ações no lembrete:** nada de `Registrar progresso`, `Lembrar mais tarde`, `Desativar lembretes` ou `Ver calendário` inline. O toque leva ao destino; desativar mora nas preferências.
- **Não use tom de urgência ou culpa:** nada de `Não perca`, `Sua sequência vai zerar`, `Corra`, contagem regressiva de horas ou ponto de exclamação.
- **Não anime a `Flame`** nem o item: sem fogo animado, partícula, pulso ou brilho.
- **Não mostre o recorde** no lembrete nem compare com o recorde.
- **Não desenhe um segundo lembrete no mesmo dia**, nem lembrete para quem não tem sequência ativa.
- **Não remova o lembrete da lista** depois do registro de progresso, nem troque o texto por `Sequência mantida`.
- **Não desenhe notificação de sequência zerada, recorde batido ou desafio cumprido.** Nenhum requisito as gera.

**Específico da lista, que continua valendo**

- **Não desenhe preferências por tipo nesta tela**, nem engrenagem no header. As preferências moram na tela própria, aberta por `Configurações`.
- **Não desenhe push, permissão de notificação do sistema nem banner de "ative as notificações"** nesta tela. O aviso de push desligado mora na tela de preferências.
- **Não agrupe por dia** com cabeçalhos do tipo `Hoje` e `Esta semana`.
- **Não agrupe notificações do mesmo tipo** num item só.
- **Não desenhe abas nem filtro por tipo.**
- **Não use fundo tingido, pill grande nem borda lateral colorida** para marcar não lida. O indicador é o ponto `musgo` de 8px.
- **Não esmaeça o item lido.**
- **Não desenhe avatar no item.**
- **Não desenhe excluir notificação, arquivar nem deslizar para apagar.**
- **Não desenhe `Marcar todas` quando não há não lidas.**
- **Não desenhe estado de conexão, banner descendo do topo, toast de notificação nem badge animado.**

**Específico da ação de abandonar, que continua valendo**

- **Não abandone sem confirmação.**
- **Não desenhe o botão de abandonar preenchido.** Destrutivo é textual ou outline.
- **Não ofereça só a ação destrutiva** na notificação de risco.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa fora dos três usos editoriais listados na seção 2. Esta tela não é nenhum deles.
- Nada de mistura de família dentro do mesmo título.
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
- Nada de label poético. O texto diz o que é.
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
- Sem ranking de leitores nem comparação de sequência com amigos.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
