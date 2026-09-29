# F-PRG · Registrar progresso

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-PRG.md
**Editada por:** ../../periodo-2/registrar-progresso/registrar-progresso.md
**Requisitos:** RF-PRG-01 (registrar atualização informando em qual página parou e quanto tempo gastou), RF-PRG-02 (exibir página atual e percentual concluído, derivados), RF-PRG-04 (rejeitar página menor ou igual à atual, ou maior que o total do livro)
**Não funcionais:** RNF-ERR-04 (chave de idempotência: retentativa não duplica), RNF-ERR-05 (fila offline no mobile), RNF-SEC-13 (validação por esquema no servidor), RNF-USA-03, RNF-USA-05 (mensagem em pt-BR e acionável)
**Regras de negócio:** RN-17 (a entrada é sempre a **página em que o leitor parou**, valor absoluto e monotônico; páginas lidas e percentual são **derivados** e nunca informados), RN-05 (cada registro zera o contador de inatividade da leitura), RN-18.2 (instante e fuso do dispositivo são capturados automaticamente e não aparecem no formulário)
**Versão web:** sim. RF-PRG-01, RF-PRG-02 e RF-PRG-04 têm marcação na coluna Web de `REQUISITOS.md` §5.4. No mobile é bottom sheet; na web é dialog centrado, conforme `documento-de-design.md` §5.4.

---

## 1. Contexto

O gesto mais repetido do produto: o leitor terminou de ler por hoje e registra onde parou. É o **acompanhar progresso** do ciclo de valor, e é o que sustenta o mecanismo de **meta**, porque a barra de progresso e o contador de inatividade dependem dele.

Duas regras governam o desenho e nenhuma delas é negociável:

- **A entrada é a página em que parou, não quantas páginas leu.** Valor absoluto e monotônico (RN-17). O leitor nunca digita páginas lidas nem percentual: os dois são derivados pelo sistema e apenas exibidos. Se o formulário pedir "quantas páginas você leu", o formulário está errado.
- **A validação de RF-PRG-04 é a razão de o campo existir com helper permanente.** Página menor ou igual à atual e página maior que o total são recusadas. O leitor precisa saber a faixa válida **antes** de digitar, e não descobrir por erro.

O painel abre da estante, da página do livro e do sheet de ações de leitura. Sempre com o mesmo desenho.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, com o sheet sobre o contexto de origem.
- **Linha 2:** estados web, viewport `1440 x 900`, com o dialog centrado sobre o contexto de origem.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Registrar progresso · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- **O contexto de origem aparece atrás em todos os artboards**, escurecido pelo scrim. Ele é desenhado de forma genérica: não é o assunto deste prompt.

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

## 3. Dados que aparecem na tela

**Livro em leitura:** `Torto Arado`, de Itamar Vieira Junior, Todavia, `264 páginas`.

**Estado da leitura antes do registro:**

- Página atual: `148`.
- Percentual concluído: `56%`.
- Faixa válida para a próxima entrada: de `149` a `264`.

**Entrada do artboard preenchido:**

- Página em que parou: `172`.
- Tempo gasto: `0 horas` e `45 minutos`.
- Derivado exibido: `24 páginas lidas`.
- Novo percentual, exibido depois de salvar: `65%`.

**Entradas dos artboards de erro:**

- Página `140`, que é menor que a página atual `148`.
- Página `300`, que é maior que o total `264 páginas`.

**Metadados que o cliente captura sozinho e que não aparecem no formulário** (RN-18.2): instante do registro e fuso horário do dispositivo, no formato IANA. Eles não são campos, não são editáveis e não são exibidos.

---

## 4. Artboards mobile (390 x 844)

O painel é um **bottom sheet**, conforme `documento-de-design.md` §5.4.

### Anatomia do bottom sheet

- **Scrim** cobrindo a viewport, `rgba(23,21,18,0.32)`, tingido no hue de `tinta` e nunca preto puro.
- **Sheet** ancorado no rodapé, largura total, fundo `papel-elevado`, cantos superiores em `radius-xl` 24, `elev-3`.
- **Alça** de 36 por 4px em `linha`, `radius-full`, centralizada, com `space-3` acima e abaixo.
- **Título** `Registrar progresso` em `title` `tinta`, padding lateral `space-5`, alinhado à esquerda.
- **Card compacto do livro** conforme design §5.4: capa de 60 por 90px em canto vivo à esquerda, `space-4` de gap, título em `title-sm` `tinta`, autor em `caption` `grafite`, e abaixo a linha `Página 148 de 264` em `caption` `grafite`.
- Divisor de 1px `linha`.
- **Formulário**, com padding lateral `space-5` e `space-5` entre os campos.
- **Ações** no rodapé do sheet, com `space-6` acima e `space-5` mais a área segura abaixo.
- Entrada do sheet: desliza de baixo em `dur-base` com `ease-out`. Sob `prefers-reduced-motion`, aparece sem deslizar.

### Campos

**Campo 1, página em que parou.** Conforme design §4.2 e §5.4.

- Label acima, em `label` `grafite`: `Página em que parou`.
- Campo numérico de 48px de altura, `radius` 12, borda de 1px `linha`, fundo `papel`, texto digitado em `body` `tinta` com numeral tabular de JetBrains Mono, porque é número.
- Teclado numérico do sistema.
- **Helper permanente** abaixo, em `caption` `grafite`, visível o tempo todo e não só depois de erro: `Entre 149 e 264. Informe onde você parou, não quantas páginas leu.`

**Campo 2, tempo gasto.** Conforme design §5.4, dois sub-campos.

- Label acima, em `label` `grafite`: `Tempo gasto`.
- Dois campos lado a lado com `space-3` de gap, cada um com 48px de altura e o mesmo tratamento do campo 1: o primeiro com sufixo `h` em `caption` `grafite-suave` dentro do campo à direita, o segundo com sufixo `min`.
- Helper abaixo, em `caption` `grafite`: `Opcional. Ajuda a calcular sua média de leitura.`

**Informação derivada.** Conforme design §5.4.

- Linha abaixo dos campos, em `caption` `grafite`, com `Calculator` (Phosphor, `regular`, 16px, `grafite-suave`) à esquerda: `Você leu 24 páginas`.
- Ela **só aparece quando a página informada é válida**. Com o campo vazio ou inválido, a linha não existe: não mostre `Você leu 0 páginas`.
- O número é derivado e não é editável. Não há campo de páginas lidas em lugar nenhum desta tela.

### Ações

- Botão primário pill de largura total, altura 48px, `musgo`, texto `papel`: `Salvar`.
- Botão textual `musgo` de largura total abaixo: `Cancelar`.

### 4.1 Padrão, campos vazios

O estado em que o sheet abre. Título, card do livro com `Página 148 de 264`, os dois campos vazios com os helpers visíveis, **sem a linha de derivado**, e as duas ações. O campo de página está com foco, borda de 1.5px `musgo`, teclado numérico aberto.

### 4.2 Preenchido, com derivado

Campo de página com `172`, tempo com `0` e `45`, e a linha `Você leu 24 páginas` presente. Botão `Salvar` ativo.

### 4.3 Erro, página menor ou igual à atual

Validação de RF-PRG-04 e RN-17.2, exibida **inline no campo**, conforme design §5.4.

- Campo de página com `140`, borda de 1.5px `rubi`.
- Mensagem abaixo do campo, em `caption` `rubi`, com `space-2` de gap: `Você já está na página 148. Informe uma página maior.`
- O helper permanente continua visível abaixo da mensagem de erro, em `caption` `grafite`. Erro e helper convivem: o helper não é substituído.
- Linha de derivado ausente.
- Botão `Salvar` continua visível e acionável: a validação do cliente reforça a do servidor, não substitui, e travar o botão esconderia o motivo.

### 4.4 Erro, página maior que o total

- Campo de página com `300`, borda de 1.5px `rubi`.
- Mensagem em `caption` `rubi`: `O livro tem 264 páginas. Informe uma página até 264.`
- Helper permanente visível abaixo.
- Cada mensagem cita o número concreto do caso. Nada de `Valor inválido`, nada de `Algo deu errado`.

### 4.5 Salvando

- Campos desabilitados, fundo `linha`, texto `grafite-suave`.
- Botão primário desabilitado, fundo `musgo` com 60% de opacidade, rótulo `Salvando`.
- **Sem spinner.** O sistema não tem spinner.

### 4.6 Salvo

O sheet fecha e o contexto de origem atualiza. O artboard mostra o resultado, não uma tela de sucesso.

- Sheet ausente, scrim ausente.
- Na página do livro atrás, a barra de progresso passou a `65%` e a linha abaixo passou a `Página 172 de 264`.
- **Sem toast com fundo saturado, sem tela de sucesso, sem confete.** O dado atualizado na tela é a confirmação.

### 4.7 Enfileirado offline

Estado exclusivo do mobile, de RNF-ERR-05. Não existe na web.

- Sheet fechado, contexto de origem visível.
- Na página do livro, a barra de progresso já mostra `65%`: o registro vale localmente enquanto espera envio.
- Abaixo da barra, em `caption` `ambar`, com `CloudArrowUp` (Phosphor, `regular`, 16px, `ambar`) à esquerda: `Registro salvo no aparelho. Será enviado quando você voltar a ficar online.`
- **Não é erro.** Nada de `rubi`, nada de `Warning`, nada de banner de falha. É um estado normal de uso.

### 4.8 Erro de envio

- Sheet ainda aberto, campos preenchidos e habilitados.
- Mensagem abaixo do botão, em `caption` `rubi`, com `space-2` de gap: `Não foi possível salvar. Verifique sua conexão e tente de novo.`
- Botão `Salvar` ativo, com o rótulo original. Reenviar usa a mesma chave de idempotência e não cria um segundo registro (RNF-ERR-04).

---

### 4.9 Registro pausado na fila · incorporado em 29/09/2026

Estado exclusivo do mobile, continuação de 4.7. Não existe na web.

- Se o reenvio de um registro enfileirado recebe uma recusa de validação do servidor (4xx, exceto 401, 408 e 429), a fila daquela leitura pausa nele. Os registros seguintes da mesma leitura esperam; as outras leituras continuam enviando.
- Na tela de atualizações, a linha pendente troca o aviso `ambar` por `Warning` (Phosphor, `regular`, 16px, `rubi`) com a mensagem do servidor em `caption` `rubi`: o erro do campo quando vier, ou a mensagem geral. Em 409, a mensagem é `Suas atualizações mudaram em outro lugar. Recarregamos a lista para você conferir.`
- Duas ações textuais abaixo: `Corrigir` e `Descartar`.
- `Corrigir` abre este mesmo sheet, com o título `Registrar progresso`, os campos preenchidos com a página e o tempo do registro pendente e a faixa válida a partir da página anterior a ele. Salvar troca o item da fila por um novo, com nova chave de idempotência, e retoma o envio. Não altera nenhuma atualização já salva no servidor.
- `Descartar` pede confirmação (RNF-USA-04) em modal com o título `Descartar este registro?`, o texto `O registro da página N ainda não foi enviado e será perdido.` e os botões `Descartar` e `Cancelar`. Confirmado, remove o item da fila e retoma o envio dos seguintes.

## 5. Artboards web (1440 x 900)

Na web o painel é **dialog centrado**, conforme `documento-de-design.md` §5.4.

### Anatomia do dialog

- Scrim cobrindo a viewport, `rgba(23,21,18,0.32)`.
- Dialog centrado, largura de 480px, fundo `papel-elevado`, `radius-lg` 20, `elev-3`, padding `space-6`.
- **Sem alça de arraste.**
- `X` (Phosphor, `regular`, 20px, `grafite`) no canto superior direito.
- Campos com 44px de altura, a medida de web de design §4.2. Botões com 40px.
- **Os dois campos ficam lado a lado** na largura de 480px: `Página em que parou` ocupando 50% e `Tempo gasto` com seus dois sub-campos ocupando os outros 50%. No mobile eles são empilhados; esse é o ganho de densidade da tela grande.
- Ações no rodapé do dialog, **lado a lado à direita**: `Cancelar` textual à esquerda de `Salvar` primário. Não empilhados como no mobile.
- Foco de teclado preso dentro do dialog, devolvido ao elemento de origem ao fechar, `Esc` fecha. `Enter` no campo submete.
- O contexto atrás é a página do livro em desktop, com a sidebar do shell visível à esquerda.

### 5.1 Padrão, campos vazios

Dialog com o card do livro, os dois campos lado a lado e vazios, helpers visíveis, sem derivado, ações à direita.

### 5.2 Preenchido, com derivado

Campos com `172`, `0` e `45`, linha `Você leu 24 páginas` abaixo dos campos, ocupando a largura do dialog.

### 5.3 Erro de validação

Campo de página com `140`, borda de 1.5px `rubi`, mensagem em `caption` `rubi` abaixo, helper permanente visível abaixo dela. O campo de tempo segue no estado normal: o erro é do campo, não do formulário inteiro.

### 5.4 Salvando, com campo desabilitado

Dialog com os dois campos em `disabled`, fundo `linha` e texto `grafite-suave`, e o botão primário desabilitado com o rótulo `Salvando`. `disabled` só existe na web, e este artboard é onde ele aparece.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: o contexto atrás do scrim também está escuro.

- **Mobile, preenchido.** Contexto em `noite`. Sheet em `noite-elevada`, **mais claro** que o fundo. Alça em `linha-noite`. Título em `papel-suave`, autor do card em `grafite-claro`. Label em `grafite-claro`, campo com fundo `noite` para contrastar com o sheet, borda `linha-noite`, texto digitado em `papel-suave`, sufixo em `grafite-fundo-escuro`. Foco com borda de 1.5px `musgo-claro`. Helper em `grafite-claro`. Linha de derivado em `grafite-claro`. Botão primário com fundo `musgo-claro` e texto `noite`; botão textual em `musgo-claro`.
- **Mobile, erro de validação.** Borda do campo em `rubi-claro`, mensagem em `caption` `rubi-claro`, helper permanente em `grafite-claro` abaixo.
- **Web, padrão.** Dialog em `noite-elevada` sobre contexto em `noite`, com a sidebar em `noite-elevada` visível atrás do scrim. Campo em `disabled` com fundo `linha-noite` e texto `grafite-fundo-escuro`.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Padrão de tela de registrar progresso, com sheet no mobile e dialog na web | documento-de-design §5.4 |
| Card compacto do livro com capa de 60 por 90px | documento-de-design §5.4 |
| Input com label acima, helper permanente, foco e erro | documento-de-design §4.2 |
| Botão primário pill e botão textual | documento-de-design §4.1 |
| Barra de progresso de leitura, no contexto atrás | documento-de-design §4.7 |
| Escala tipográfica, com JetBrains Mono e numeral tabular no número | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |

**Componente que ainda não existe na fonte.** O **aviso de registro enfileirado offline** não está no `documento-de-design.md`. RNF-ERR-05 exige a fila no mobile, e o §7.6 proíbe toast com fundo saturado, então o aviso foi desenhado como linha de texto em `ambar` no contexto, e não como toast nem banner. O que for aprovado vira pendência de incorporação ao documento pelo controle de mudança do plano §3.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título | `Registrar progresso` |
| Detalhe do livro | `Página 148 de 264` |
| Label do campo 1 | `Página em que parou` |
| Helper do campo 1 | `Entre 149 e 264. Informe onde você parou, não quantas páginas leu.` |
| Label do campo 2 | `Tempo gasto` |
| Sufixos do campo 2 | `h`, `min` |
| Helper do campo 2 | `Opcional. Ajuda a calcular sua média de leitura.` |
| Derivado | `Você leu 24 páginas` |
| Erro, página baixa demais | `Você já está na página 148. Informe uma página maior.` |
| Erro, página alta demais | `O livro tem 264 páginas. Informe uma página até 264.` |
| Erro, página ausente · incorporado em 27/09/2026 | `Informe a página em que parou, em número inteiro.` |
| Erro, tempo inválido · incorporado em 27/09/2026 | `Informe o tempo em horas e minutos inteiros.` |
| Erro, tempo acima do máximo · incorporado em 27/09/2026 | `Informe até 12 horas de leitura por registro.` |
| Erro, lista desatualizada · incorporado em 27/09/2026 | `Suas atualizações mudaram em outro lugar. Recarregamos a lista para você conferir.` |
| Erro de envio | `Não foi possível salvar. Verifique sua conexão e tente de novo.` |
| Aviso offline | `Registro salvo no aparelho. Será enviado quando você voltar a ficar online.` |
| Botão primário | `Salvar` |
| Botão primário em salvamento | `Salvando` |
| Botão textual | `Cancelar` |
| Registro pausado, ações · incorporado em 29/09/2026 | `Corrigir`, `Descartar` |
| Registro pausado, confirmação de descarte · incorporado em 29/09/2026 | Título `Descartar este registro?`, texto `O registro da página 172 ainda não foi enviado e será perdido.`, botões `Descartar` e `Cancelar` |
| Registro pausado, mensagem em 409 · incorporado em 29/09/2026 | `Suas atualizações mudaram em outro lugar. Recarregamos a lista para você conferir.` |

Zero em-dash em toda a copy. Zero emoji. Nenhum número aparece sem unidade, e as duas mensagens de erro citam o número concreto do caso em vez de descrever a regra no abstrato.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px nos campos e nos botões, que já é a altura de campo do mobile.
- O campo de página abre com foco e teclado numérico, porque digitar o número é a razão de o painel existir.
- O erro é comunicado **sem depender de cor**: além da borda `rubi`, existe a mensagem em texto abaixo do campo, e ela é associada ao campo para leitor de tela.
- O helper permanente continua visível quando o erro aparece. A regra não some no momento em que ela é mais necessária.
- A linha de derivado é anunciada quando muda, para que o leitor de tela saiba quantas páginas o valor digitado representa.
- Contraste WCAG AA no corpo nos dois temas. Helper e derivado usam `grafite`, não `grafite-suave`, porque a faixa válida é informação essencial.
- No dialog da web, o foco fica preso dentro dele enquanto aberto, entra no campo de página, é devolvido ao elemento de origem ao fechar, e `Esc` fecha.
- `prefers-reduced-motion` respeitado: o sheet aparece sem deslizar e o dialog sem escala de entrada.
- O sheet do mobile é fechável por toque no scrim e por arraste, e o botão `Cancelar` continua existindo para quem não usa gesto.

---

## 10. O que não fazer nesta tela

**Específico do registro de progresso**

- **Não desenhe campo de páginas lidas.** A entrada é a página em que parou, absoluta. Páginas lidas é valor derivado, só exibido (RN-17).
- **Não desenhe campo de percentual.** Percentual também é derivado. O leitor nunca informa percentual.
- **Não desenhe slider de progresso** para escolher a página arrastando. A entrada é numérica e precisa.
- **Não desenhe campo de data, de hora nem de fuso.** Instante e fuso são capturados automaticamente pelo dispositivo e não são editáveis (RN-18.2).
- **Não exiba `Você leu 0 páginas`** quando o campo está vazio ou inválido. A linha de derivado simplesmente não existe nesses casos.
- Não desabilite o botão `Salvar` quando há erro de validação no cliente. A validação do cliente reforça a do servidor; travar o botão esconde o motivo.
- Não desenhe o aviso de fila offline como erro. Ele é `ambar` e informativo, nunca `rubi`.
- Não desenhe tela de sucesso, toast de sucesso nem animação de comemoração depois de salvar. O dado atualizado na tela é a confirmação.
- Não desenhe spinner no botão em salvamento. O botão fica desabilitado e o rótulo muda.
- **Não desenhe sessão de leitura cronometrada, cronômetro nem modo de foco.** RF-PRG-05 a RF-PRG-12 são do Período 2, em F-SESSAO, e a coluna Web deles é negativa.

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

**Formulários**

- Nada de placeholder no lugar do label. Label sempre acima do campo.
- Nada de helper que só aparece depois do erro. Se a regra existe, o helper é visível o tempo todo.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.
- Nada de campo de senha sem o botão de mostrar a senha.
**Métricas e dados**

- Nada de número exibido sem unidade. Nunca "42" sozinho: é "42 páginas", "42 minutos", "42 livros".
- Nada de número fake-preciso do tipo "94%" ou "48k leitores".
- Nada de gráfico em roxo ou teal de IA. Gráfico usa musgo como principal, broto como secundário e grafite como neutro.
- Nada de gráfico com mais de três séries.
- Nada de repetir o símbolo de percentual quando o contexto já é percentual.
**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.
