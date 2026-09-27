# F-SESSAO · Encerrar sessão

**Feature:** ../../../plano-de-desenvolvimento/periodo-2/feature-F-SESSAO.md
**Requisitos:** RF-PRG-07 (ao encerrar, informar a página em que parou; o sistema deriva as páginas lidas e registra a atualização de progresso com o tempo cronometrado), RF-PRG-09 (recuperar sessão interrompida), RF-PRG-12 (sessão encerrada automaticamente pela pausa esgotada pede a página na reabertura)
**Contrato reusado:** `POST /leituras/{leituraId}/progresso` de [F-PRG](../../../plano-de-desenvolvimento/periodo-1/feature-F-PRG.md), com exatamente `{ pagina, minutos, registradoEmDispositivo, fusoHorarioDispositivo }`, a mesma chave de idempotência e a mesma fila offline. Nenhum endpoint novo.
**Não funcionais:** RNF-ERR-04 (chave de idempotência: retentativa não duplica), RNF-ERR-05 (fila offline no mobile), RNF-USA-04 (confirmação antes de descartar), RNF-USA-05 (mensagem em pt-BR e acionável), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** RN-16.6 e RN-16.7 (a página segue RN-17, e página igual à atual encerra sem registro, descartando o tempo), RN-16.11 (sessão acima de 12 horas cronometradas é apresentada como expirada e o tempo registrado é limitado a 12 horas), RN-16.12 (encerrar com registro zera a inatividade), RN-16.15, RN-16.18 e RN-16.19 (pausa esgotada encerra a sessão, preserva o tempo lido sem somar a pausa e deixa a sessão pendente de confirmação na reabertura), RN-17 (a entrada é a página absoluta; páginas lidas são derivadas), RN-18.2 (instante e fuso capturados automaticamente, fora do formulário)
**Versão web:** não. RF-PRG-07, RF-PRG-09 e RF-PRG-12 estão marcados com ❌ na coluna Web de `REQUISITOS.md` §5.4: a sessão cronometrada não se aplica a uma aba de navegador (`REQUISITOS.md` §10.9).
**Tela vizinha:** [`modo-de-foco.md`](modo-de-foco.md), de onde este sheet abre.

---

## 1. Contexto

O fim da sessão cronometrada. O leitor leu com o aplicativo medindo o tempo e agora diz **só a página em que parou**: o tempo já está medido e as páginas lidas são calculadas. É a única escrita remota de todo o fluxo da sessão (RN-16.10), e ela reusa o registro de progresso de F-PRG sem distinguir origem. Sustenta o mecanismo de **meta**: o registro atualiza a barra de progresso, zera a inatividade da leitura (RN-16.12) e o tempo medido alimenta os desafios em minutos (RN-16.13).

**Duas formas de chegar aqui, e as duas estão neste arquivo:**

1. **Encerrar pelo leitor.** O toque em `Encerrar sessão` no modo de foco, correndo ou pausado, abre um **bottom sheet** sobre a própria tela do modo de foco. O modo de foco continua atrás: o leitor ainda não saiu da sessão, e `Voltar à sessão` fecha o sheet.
2. **Sessão pendente na reabertura.** Quando a sessão terminou sem que o leitor informasse a página, o aplicativo abre direto numa **página cheia sem shell**, antes da navegação normal, para que ele informe a página ou descarte o registro. Isso acontece em dois casos, que RN-16.19 manda tratar no mesmo fluxo:
   - a pausa de 5, 10 ou 15 minutos acabou sem retomada (RN-16.18). O tempo lido até a pausa é preservado e o tempo da pausa não soma (RN-16.15);
   - a sessão passou de **12 horas de tempo cronometrado**, verificado na reabertura (RN-16.11). O tempo registrado fica limitado a 12 horas.

   Se a pausa acabar com o aplicativo aberto, a mesma página aparece no lugar do modo de foco, sem esperar a reabertura.

**Três regras governam o formulário:**

- **A entrada é a página em que parou, nunca quantas páginas leu** (RN-17). Páginas lidas é valor derivado, só exibido.
- **Aqui, a página atual é aceita, com um efeito diferente.** No registro manual de F-PRG, a página igual à atual é erro. Na sessão, ela é válida e **encerra a sessão sem registro, descartando o tempo** (RN-16.7). O helper avisa isso antes de a pessoa digitar, e o estado 4.3 mostra o efeito antes de confirmar. Página menor que a atual ou maior que o total continua sendo erro.
- **A sessão só some do aparelho depois que o registro foi aceito pelo servidor ou guardado na fila offline.** Enquanto isso não acontece, nenhum erro perde a sessão: o leitor pode tentar de novo.

**Para onde se vai.** Registrado, ou guardado na fila offline, o modo de foco termina e o leitor volta à tela de onde iniciou a sessão, com o progresso atualizado. Encerrado sem registro, volta do mesmo jeito, sem progresso novo. Descartado a partir da sessão pendente, entra na navegação normal.

**Motion zero no fluxo inteiro.** O sheet abre sobre o modo de foco e a página pendente pertence à mesma sessão, então as duas seguem o motion zero do modo de foco (`documento-de-design.md` §4.10 e §7.4): sheet, scrim e troca de estado aparecem e somem sem deslizar e sem fade.

**Estados que não se aplicam.** Não há carregamento de dados: livro, página atual e tempo medido já estão no aparelho. O equivalente a carregar é o estado `Salvando` (4.6). Não há vazio além do campo vazio do estado 4.1.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, da esquerda para a direita na ordem em que o leitor os encontra: primeiro o sheet de encerrar, depois o retorno à leitura, depois a sessão pendente.
- **Não existe linha web.** A tela é exclusiva do mobile.
- **Linha 2:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Encerrar sessão · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

Dials: DESIGN_VARIANCE 5, MOTION_INTENSITY 4, VISUAL_DENSITY 4 no produto.
Duas exceções em todo o produto: a página do livro sobe a variance para 7, e
o MODO DE FOCO opera em 1 / 1 / 1. Esta tela é o fim da sessão e continua
dentro do modo de foco: layout previsível, densidade baixa e MOTION ZERO.

CORES, MODO CLARO
papel            #F4F2EC   fundo da tela
papel-elevado    #EDE9DE   superfície elevada: card, container
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
  página do livro. Fora desses três, serifa não aparece. Esta tela não é
  nenhum deles.
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
Exceção do modo de foco: o cronômetro, que aparece atrás do sheet, usa
JetBrains Mono 500 em 72px, com numeral tabular (documento-de-design §4.10).

ESPAÇAMENTO (múltiplos de 4)
space-1 4, space-2 8, space-3 12, space-4 16, space-5 20, space-6 24,
space-8 32, space-10 40, space-12 48, space-16 64, space-24 96.
Padding lateral da tela: space-5 no mobile. Gap entre seções: space-6.

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
Regra geral do produto: todo motion respeita prefers-reduced-motion, zero
loop infinito, zero parallax, zero scroll hijack, press com scale(0.98),
sem ripple de Material. Não existe spinner girando no sistema.
DENTRO DA SESSÃO O MOTION É ZERO. Sheet e scrim aparecem e somem sem
deslizar e sem fade; a troca de estado é instantânea; o botão primário tem
scale(0.98) no toque, e ponto.

ÍCONES
Phosphor Icons, família única em todo o produto. Peso regular como padrão de
tema, fill apenas para indicar estado ativo. Tamanhos: 16px inline em label,
20px em botão e em campo, 24px em barra de navegação e em card, 32px em ação
principal isolada. Nenhum ícone desenhado à mão, nenhum SVG decorativo
inline, nenhum emoji.

FORMULÁRIO
Label acima do campo, sempre, no token label, cor grafite (grafite-claro no
escuro), com space-2 de gap. Placeholder nunca substitui label.
Campo com 48px de altura no mobile, radius 12, borda de 1px linha, texto
digitado em body tinta.
Foco: borda de 1.5px musgo.
Erro: borda de 1.5px rubi, mensagem abaixo em caption rubi, space-2 de gap.
Helper abaixo do campo em caption grafite, visível o tempo todo, não só
depois do erro.
Botão médio: padding de 12 vertical e 20 horizontal, 48px de altura no
mobile, texto em uma linha. Primário: pill, fundo musgo, texto papel.
Textual: sem fundo, texto musgo peso 600, radius 12. Destrutivo: outline de
1px rubi, texto rubi, radius 12, nunca preenchido.

SOBREPOSIÇÃO MODAL (bottom sheet, documento-de-design §4.11)
Bottom sheet ancorado embaixo, largura total, fundo papel no claro e
noite-elevada no escuro, radius-lg 20 só nos cantos de cima, padding
space-6, elev-3. Alça de 32 x 4px em linha / linha-noite, centralizada,
space-5 acima do conteúdo. Padding inferior soma a área segura do aparelho.
Scrim: #171512 a 40% no claro e preto a 60% no escuro.
Confirmação destrutiva: título em title-sm, consequência em body grafite
nomeando o que se perde, botões empilhados em largura total com o
destrutivo em cima, e o foco inicial em Cancelar, nunca no destrutivo.
Dentro da sessão, sem deslizar e sem fade.

FAIXA INFORMATIVA NEUTRA (documento-de-design §4.15)
Informação que não é erro nem alerta. Fundo musgo-fundo /
musgo-fundo-escuro, radius 12, padding space-4, sem borda. Info (Phosphor,
regular, 20px, musgo / musgo-claro) à esquerda, space-3 de gap, texto em
body: tinta no claro e musgo-claro no escuro. Não fecha, não some sozinha e
não tem ação dentro.

MODO ESCURO
Cidadão de primeira classe e lock de página inteira: nenhuma seção inverte no
meio da tela. Superfície elevada fica MAIS CLARA que o fundo, nunca mais
escura.

CONTRASTE
WCAG AA no corpo, AAA no título quando possível. grafite-suave e
grafite-fundo-escuro passam apenas em tamanho grande: nunca carregam texto de
corpo nem informação essencial.
```

---

## 3. Dados que aparecem na tela

**Livro da sessão:** `Tudo é rio`, de Carla Madeira, Record, `210 páginas`. A leitura está em **Lendo**.

**Estado da leitura antes do encerramento:**

- Página atual: `88`.
- Percentual concluído: `42%`.
- Faixa aceita no encerramento: de `88` a `210`. A `88` encerra sem registro; de `89` a `210` registra.

**Tempo medido pela sessão:**

- Encerramento pelo leitor: `47 minutos`, medidos pelo cronômetro, que marcava `0:47:12`.
- Sessão encerrada pela pausa: `47 minutos` de leitura, com uma pausa de `10 minutos` que terminou sem retomada. A pausa não soma.
- Sessão expirada: `12 horas`, o limite. O cronômetro passou disso porque o aparelho ficou com a sessão aberta desde a véspera, e o excedente não é registrado.

**Entrada do artboard preenchido:**

- Página em que parou: `131`.
- Derivado exibido: `43 páginas em 47 minutos`.
- Novo percentual, exibido na página do livro depois de salvar: `62%`, com `Página 131 de 210`.

**Entradas dos artboards de erro:**

- Página `80`, que é menor que a página atual `88`.
- Página `240`, que é maior que o total `210 páginas`.
- Conflito: durante a sessão, outro aparelho registrou a página `140`. O leitor informa `131` e o servidor recusa, porque a página atual passou a ser `140`.

**Metadados que o aplicativo envia sozinho e que não aparecem na tela** (RN-18.2): o instante do registro e o fuso horário do dispositivo, no formato IANA. Não são campos, não são editáveis e não são exibidos.

---

## 4. Artboards mobile (390 x 844)

### Anatomia do sheet de encerrar

Bottom sheet conforme design §4.11, **sobre a tela do modo de foco**, que continua atrás, escurecida pelo scrim: fundo `papel`, título `Tudo é rio`, autor e o cronômetro de 72px, sem shell. Ela é contexto, não assunto deste prompt.

- Scrim `#171512` a 40%.
- Sheet em `papel`, cantos de cima em `radius-lg` 20, padding `space-6`, `elev-3`. Alça de 32 x 4px em `linha`, com `space-5` até o conteúdo.
- **Título** em `title` `tinta`, alinhado à esquerda: `Encerrar sessão`.
- `space-4` abaixo, **card compacto do livro**, conforme design §5.4: capa de 60 x 90px em canto vivo à esquerda, `space-4` de gap, título em `title-sm` `tinta`, autor em `caption` `grafite` e, abaixo, `Página 88 de 210` em `caption` `grafite`.
- `space-4` abaixo, **linha do tempo medido**, somente leitura: `Timer` (Phosphor, `regular`, 20px, `grafite`) à esquerda, `space-2` de gap, e o texto em `body` `tinta`, com o número em `num-inline`: `47 minutos de leitura`. Não é campo e não é editável: o tempo foi medido. Ela acompanha o cronômetro, que continua correndo atrás enquanto o sheet está aberto, e troca de minuto sem animação.
- Divisor de 1px `linha`, com `space-4` acima e abaixo.
- **Campo de página**, conforme design §4.2:
  - Label em `label` `grafite`: `Página em que parou`.
  - Campo numérico de 48px, `radius` 12, borda de 1px `linha`, fundo `papel-elevado`, texto em `body` `tinta` com numeral tabular de JetBrains Mono. Teclado numérico do sistema.
  - **Helper permanente** abaixo, em `caption` `grafite`: `Entre 88 e 210. Se não avançou, informe 88: a sessão termina sem registrar o tempo.`
- **Linha de derivado**, conforme design §5.4: `Calculator` (Phosphor, `regular`, 16px, `grafite-suave`) à esquerda e o texto em `caption` `grafite`: `Você leu 43 páginas em 47 minutos`. Só aparece com página válida e maior que a atual.
- **Ações** com `space-6` acima e `space-5` mais a área segura abaixo:
  - Botão primário pill de largura total, 48px, `musgo`, texto `papel`: `Salvar e encerrar`.
  - `space-3` abaixo, botão textual `musgo` de largura total: `Voltar à sessão`. Fecha o sheet e devolve o leitor ao modo de foco, com o cronômetro continuando.
- **Sem opção de descartar dentro deste sheet.** Descartar o tempo já é `Cancelar sessão`, no modo de foco. O sheet só encerra ou volta.

### 4.1 Padrão, campo vazio

O estado em que o sheet abre. Título, card do livro com `Página 88 de 210`, a linha `47 minutos de leitura`, o campo vazio com foco (borda de 1.5px `musgo`), o teclado numérico aberto, o helper visível, **sem linha de derivado**, e as duas ações.

Se o leitor tocar em `Salvar e encerrar` com o campo vazio, o campo recebe borda `rubi` e a mensagem em `caption` `rubi`: `Informe a página em que parou.` O helper continua abaixo dela. Não desenhe esse caso como artboard separado.

### 4.2 Preenchido, com derivado

Campo com `131`, borda em foco, linha `Você leu 43 páginas em 47 minutos` presente, `Salvar e encerrar` ativo.

### 4.3 Mesma página, encerra sem registro

Regra de RN-16.7, mostrada **antes** de confirmar.

- Campo com `88`, borda normal: não é erro.
- No lugar da linha de derivado, a **faixa informativa neutra** do design §4.15: fundo `musgo-fundo`, `Info` em `musgo`, texto em `body` `tinta`: `Você continua na página 88. A sessão termina sem registrar progresso e os 47 minutos não são contados.`
- O botão primário muda de rótulo para `Encerrar sem registrar`. Continua `musgo`: é uma escolha válida, não destrutiva, e já está explicada na faixa.
- `Voltar à sessão` continua abaixo.
- Confirmado, a sessão some do aparelho sem chamar o servidor, o modo de foco termina e o leitor volta à tela de origem sem progresso novo, sem toast.

### 4.4 Erro, página menor que a atual

Validação de RN-17.2, **inline no campo**.

- Campo com `80`, borda de 1.5px `rubi`.
- Mensagem em `caption` `rubi`, `space-2` abaixo: `Você já está na página 88. Informe 88 ou uma página maior.`
- Helper permanente continua visível abaixo da mensagem.
- Sem linha de derivado e sem faixa.
- `Salvar e encerrar` continua visível e acionável: a validação do cliente reforça a do servidor e travar o botão esconderia o motivo.

### 4.5 Erro, página maior que o total

- Campo com `240`, borda de 1.5px `rubi`.
- Mensagem em `caption` `rubi`: `O livro tem 210 páginas. Informe uma página até 210.`
- Helper permanente visível abaixo.

### 4.6 Salvando

- Campo somente leitura, com o valor `131` mantido em `tinta` sobre `papel-elevado`: o número continua legível enquanto envia.
- Botão primário em `musgo` pleno, com o rótulo `Salvando`, sem responder a novo toque. **Sem spinner.**
- `Voltar à sessão` some durante o envio, para não criar dois caminhos ao mesmo tempo.

### 4.7 Erro, a leitura avançou em outro aparelho

O servidor recusou a página porque, durante a sessão, outro aparelho registrou progresso mais adiante. A sessão continua guardada.

- Sheet aberto, campo com `131` e borda de 1.5px `rubi`.
- Mensagem em `caption` `rubi`: `Esta leitura já está na página 140, registrada em outro aparelho. Informe uma página a partir de 140.`
- O card do livro atualiza para `Página 140 de 210` e o helper para `Entre 140 e 210. Se não avançou, informe 140: a sessão termina sem registrar o tempo.`
- `Salvar e encerrar` ativo. A linha `47 minutos de leitura` não muda: o tempo medido é desta sessão.

### 4.8 Erro de envio, sessão guardada

Falha do servidor depois das retentativas, com o aparelho online. Se o aparelho estivesse sem rede, o registro iria para a fila offline (4.10) e este erro não apareceria.

- Sheet aberto, campo com `131`, habilitado, borda normal.
- Abaixo do botão primário, em `caption` `rubi`, `space-2` de gap: `Não foi possível salvar agora. Sua sessão continua guardada neste aparelho: tente de novo.`
- `Salvar e encerrar` ativo com o rótulo original. Reenviar usa a mesma chave de idempotência e não cria um segundo registro (RNF-ERR-04).
- `Voltar à sessão` presente.

### 4.9 Registrada, de volta à leitura

O resultado, e não uma tela de sucesso. O modo de foco terminou e o leitor está de volta à tela de onde iniciou a sessão, com a navegação normal.

- Artboard com a **página do livro** de `Tudo é rio`, desenhada de forma genérica, **com o shell do aplicativo de volta**: barra inferior fixa no rodapé, 64px mais a área segura, fundo `papel-elevado`, divisor de 1px `linha` no topo, sem sombra, com quatro itens de largura igual, `Estante` (`Books`), `Descobrir` (`Compass`), `Feed` (`Newspaper`) e `Perfil` (`UserCircle`), ícone Phosphor de 24px acima do rótulo em `caption`. Ativo `Estante`: ícone `fill` e rótulo peso 600, os dois em `musgo`. Inativos: ícone `regular` e rótulo em `grafite`. Sem pill de fundo atrás do item ativo. A página do livro não é o assunto deste prompt.
- No bloco de leitura, a barra de progresso de leitura (design §4.7) mostra `62%`, e a linha abaixo diz `Página 131 de 210`.
- **Sem sheet, sem scrim, sem toast, sem tela de parabéns, sem confete.** O dado atualizado é a confirmação.

### 4.10 Guardada na fila offline

Sem rede no momento de salvar. O registro foi guardado no aparelho, na fila offline, com a mesma chave de idempotência (RNF-ERR-05). Só então a sessão local foi apagada e o modo de foco terminou.

- Mesmo contexto do 4.9, com o shell de volta e a barra em `62%`: o registro vale localmente enquanto espera envio.
- Abaixo da barra, em `caption` `ambar`, com `CloudArrowUp` (Phosphor, `regular`, 16px, `ambar`) à esquerda: `Registro salvo no aparelho. Será enviado quando você voltar a ficar online.` É o mesmo aviso do registro manual de progresso.
- **Não é erro.** Nada de `rubi`, nada de `Warning`, nada de banner de falha.

### Anatomia da página de sessão pendente

Página cheia, **sem shell**, que o aplicativo abre antes da navegação normal nos casos da seção 1. Mesmo fundo sólido `papel` do modo de foco, conteúdo alinhado à esquerda, padding lateral `space-5`, sem header e sem seta de voltar.

- No topo, `space-12` abaixo da barra de status do sistema, **título** em `title-lg` `tinta`.
- `space-3` abaixo, **explicação** em `body` `grafite`, dizendo o que aconteceu e o que vale.
- `space-6` abaixo, **card compacto do livro** conforme design §5.4, em `papel-elevado`, `radius-md`, padding `space-4`, sem sombra: capa de 60 x 90px em canto vivo, título, autor e `Página 88 de 210`.
- `space-4` abaixo, **linha do tempo medido**, igual à do sheet: `Timer` e o texto em `body` `tinta`.
- `space-6` abaixo, o **mesmo campo de página** do sheet, com label, helper permanente, linha de derivado, faixa de mesma página e mensagens de erro iguais às dos estados 4.1 a 4.8.
- **Ações** ancoradas no rodapé, `space-6` mais a área segura abaixo, empilhadas em largura total, 48px cada, `space-3` entre elas:
  - Botão primário pill `musgo`: `Salvar leitura`.
  - Botão destrutivo em outline de 1px `rubi`, texto `rubi`, `radius` 12: `Descartar sessão`. Sempre com confirmação (4.13).
- Não há `Voltar à sessão` aqui: a sessão já terminou, e o leitor só informa a página ou descarta.

### 4.11 Sessão encerrada pela pausa

RN-16.18 e RN-16.19. Campo vazio, com foco.

- Título: `Sua pausa terminou`
- Explicação: `A pausa de 10 minutos acabou sem você voltar, então a sessão foi encerrada. Guardamos os 47 minutos que você leu antes da pausa. Informe onde parou para registrar.`
- Card do livro com `Página 88 de 210`.
- Linha do tempo: `47 minutos de leitura`.
- Campo vazio, helper `Entre 88 e 210. Se não avançou, informe 88: a sessão termina sem registrar o tempo.`
- Ações `Salvar leitura` e `Descartar sessão`.

### 4.12 Sessão expirada

RN-16.11. Campo preenchido com `131`, para mostrar o derivado limitado.

- Título: `Sua sessão passou de 12 horas`
- Explicação: `A sessão ficou aberta por mais de 12 horas de leitura cronometrada, o limite. Se você registrar, contamos no máximo 12 horas.`
- Card do livro com `Página 88 de 210`.
- Linha do tempo: `12 horas de leitura, o limite da sessão`.
- Campo com `131`, linha de derivado `Você leu 43 páginas em 12 horas`.
- Ações `Salvar leitura` e `Descartar sessão`.
- Não use `ambar` nem `rubi` na página: expirar não é erro de quem lê, é o limite do sistema, explicado em texto.

### 4.13 Confirmar descarte

Aberto por `Descartar sessão`, sobre a página 4.11 escurecida pelo scrim. Confirmação destrutiva conforme design §4.11 e §7.8.

- Sheet em `papel`, alça em `linha`.
- Título em `title-sm` `tinta`: `Descartar esta sessão?`
- Consequência em `body` `grafite`, nomeando o que se perde: `Os 47 minutos de leitura serão perdidos e nenhum progresso será registrado.`
- Botões empilhados em largura total, destrutivo em cima: outline de 1px `rubi`, texto `rubi`, `radius` 12, `Descartar sessão`; embaixo, botão textual `musgo`, `Voltar`.
- Foco inicial em `Voltar`, nunca no destrutivo.
- Confirmado, a sessão some do aparelho sem chamar o servidor e o leitor entra na navegação normal. Não há desfazer.

---

## 5. Artboards web

Não há versão web. RF-PRG-07, RF-PRG-09 e RF-PRG-12 estão marcados com ❌ na coluna Web de `REQUISITOS.md` §5.4, porque a sessão cronometrada não se aplica a uma aba de navegador (§10.9).

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: o modo de foco atrás do scrim também está escuro. Os shadows ficam com metade da opacidade.

- **Sheet preenchido (equivalente ao 4.2).** Modo de foco atrás em `noite`, com título em `papel-suave` e cronômetro em `papel-suave`, sob scrim preto a 60%. Sheet em `noite-elevada`, **mais claro** que o fundo, alça em `linha-noite`. Título do sheet em `papel-suave`, autor e `Página 88 de 210` em `grafite-claro`. `Timer` em `grafite-claro` e `47 minutos de leitura` em `papel-suave`. Divisor `linha-noite`. Label em `grafite-claro`, campo com fundo `noite` para contrastar com o sheet, borda de 1.5px `musgo-claro` em foco, texto em `papel-suave`. Helper e derivado em `grafite-claro`. Primário com fundo `musgo-claro` e texto `noite`; `Voltar à sessão` em `musgo-claro`.
- **Mesma página (equivalente ao 4.3).** Faixa em `musgo-fundo-escuro`, com `Info` e texto em `musgo-claro`.
- **Sessão encerrada pela pausa (equivalente ao 4.11).** Página em `noite`, título em `papel-suave`, explicação em `grafite-claro`, card do livro em `noite-elevada`, campo com fundo `noite-elevada` e borda `linha-noite`. `Salvar leitura` com fundo `musgo-claro` e texto `noite`; `Descartar sessão` com outline e texto `rubi-claro`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Bottom sheet e confirmação destrutiva | documento-de-design §4.11 e §7.8 |
| Card compacto do livro com capa de 60 x 90px, campo de página, linha de derivado | documento-de-design §5.4 |
| Input com label acima, helper permanente, foco e erro | documento-de-design §4.2 e §7.9 |
| Faixa informativa neutra, no estado de mesma página | documento-de-design §4.15 |
| Botão primário pill, botão textual e botão destrutivo em outline | documento-de-design §4.1 e §7.8 |
| Barra de progresso de leitura, no contexto de volta | documento-de-design §4.7 |
| Modo de foco atrás do sheet, e motion zero | documento-de-design §4.10 e §7.4 |
| Escala tipográfica, com JetBrains Mono e numeral tabular no número | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, espaçamento, raio, elevação e motion | documento-de-design §3.1 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |

**Nasce aqui, e não está no `documento-de-design.md`.** O que for aprovado no protótipo vira pendência de incorporação pelo controle de mudança do plano §3:

1. **Variante de encerrar sessão do formulário do §5.4.** Sai o campo `Tempo gasto`, que vira a **linha do tempo medido**, somente leitura com `Timer`. A página atual passa a ser aceita, e o efeito dela é explicado na faixa neutra. O botão muda para `Salvar e encerrar` ou `Encerrar sem registrar`.
2. **Página de sessão pendente**, sem shell, com título, explicação, card do livro, tempo medido e o mesmo campo, nas variantes pausa esgotada e sessão expirada.
3. **Sobreposição sem motion dentro da sessão.** O §4.11 manda o sheet subir em `dur-slow`. O §4.10 e o §7.4 proíbem motion no modo de foco, e aqui prevalece o modo de foco.
4. **Aviso de registro guardado na fila offline**, em linha `ambar` no contexto. Ele nasceu no prompt de registrar progresso do Período 1 e continua fora do documento. Aqui é reusado igual.

**Pendências para o dono de F-SESSAO, que este prompt não decide:**

- **Arredondamento do tempo.** O contrato de F-PRG recebe `minutos` inteiros, e o cronômetro mede segundos. O prompt mostra `0:47:12` virando `47 minutos`, mas a regra de arredondamento não está em nenhuma fonte, e também não está o caso de sessão com menos de 1 minuto.
- **Pausa esgotada com o aplicativo aberto.** RN-16.19 fala em apresentar a sessão pendente "na reabertura". O prompt a mostra no mesmo momento, no lugar do modo de foco, se o aplicativo estiver aberto. Confirmar.
- **A página pendente bloqueia a navegação.** O prompt a abre antes da navegação normal e só oferece `Salvar leitura` ou `Descartar sessão`, como RN-16.19 descreve. As fontes não dizem se o leitor pode adiar a decisão.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título do sheet | `Encerrar sessão` |
| Detalhe do livro | `Página 88 de 210` |
| Tempo medido, encerramento pelo leitor | `47 minutos de leitura` |
| Label do campo | `Página em que parou` |
| Helper do campo | `Entre 88 e 210. Se não avançou, informe 88: a sessão termina sem registrar o tempo.` |
| Derivado | `Você leu 43 páginas em 47 minutos` |
| Faixa de mesma página | `Você continua na página 88. A sessão termina sem registrar progresso e os 47 minutos não são contados.` |
| Primário, com registro | `Salvar e encerrar` |
| Primário, mesma página | `Encerrar sem registrar` |
| Primário, enviando | `Salvando` |
| Textual do sheet | `Voltar à sessão` |
| Erro, campo vazio | `Informe a página em que parou.` |
| Erro, página menor | `Você já está na página 88. Informe 88 ou uma página maior.` |
| Erro, página maior | `O livro tem 210 páginas. Informe uma página até 210.` |
| Erro, outro aparelho | `Esta leitura já está na página 140, registrada em outro aparelho. Informe uma página a partir de 140.` |
| Helper depois do conflito | `Entre 140 e 210. Se não avançou, informe 140: a sessão termina sem registrar o tempo.` |
| Detalhe do livro depois do conflito | `Página 140 de 210` |
| Erro de envio | `Não foi possível salvar agora. Sua sessão continua guardada neste aparelho: tente de novo.` |
| Contexto de volta | `Página 131 de 210` |
| Aviso de fila offline | `Registro salvo no aparelho. Será enviado quando você voltar a ficar online.` |
| Título, pausa esgotada | `Sua pausa terminou` |
| Explicação, pausa esgotada | `A pausa de 10 minutos acabou sem você voltar, então a sessão foi encerrada. Guardamos os 47 minutos que você leu antes da pausa. Informe onde parou para registrar.` |
| Título, sessão expirada | `Sua sessão passou de 12 horas` |
| Explicação, sessão expirada | `A sessão ficou aberta por mais de 12 horas de leitura cronometrada, o limite. Se você registrar, contamos no máximo 12 horas.` |
| Tempo medido, sessão expirada | `12 horas de leitura, o limite da sessão` |
| Derivado, sessão expirada | `Você leu 43 páginas em 12 horas` |
| Primário da página pendente | `Salvar leitura` |
| Destrutivo da página pendente | `Descartar sessão` |
| Título da confirmação | `Descartar esta sessão?` |
| Consequência da confirmação | `Os 47 minutos de leitura serão perdidos e nenhum progresso será registrado.` |
| Botão de permanecer | `Voltar` |

Zero em-dash em toda a copy. Zero emoji. Todo número tem unidade (`47 minutos`, `43 páginas`, `12 horas`, `210 páginas`), e cada mensagem de erro cita o número concreto do caso.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px no campo e em todos os botões.
- O campo de página abre com foco e teclado numérico, porque digitar a página é a razão de o sheet existir.
- O erro é comunicado **sem depender de cor**: além da borda `rubi`, há a mensagem em texto, associada ao campo para leitor de tela. O helper continua visível quando o erro aparece.
- A linha de derivado e a faixa de mesma página são anunciadas quando aparecem, para que o leitor de tela saiba o efeito antes de confirmar.
- A troca de rótulo do botão para `Encerrar sem registrar` é anunciada junto com a faixa.
- A linha do tempo medido tem rótulo por extenso (`47 minutos de leitura`) e não é anunciada a cada minuto.
- O sheet de encerrar fecha por toque no scrim e por `Voltar à sessão`. Fechar volta ao modo de foco, nunca à navegação normal.
- A página de sessão pendente não tem seta de voltar, e o voltar do sistema não a fecha: as duas saídas estão sempre visíveis no rodapé.
- Na confirmação de descarte, o foco inicial fica em `Voltar`, e o destrutivo vem em outline `rubi`, nunca preenchido (RNF-USA-04).
- Contraste WCAG AA no corpo nos dois temas. Helper, derivado e explicação usam `grafite` e `grafite-claro`, e não os tons suaves, porque carregam informação essencial.
- Motion zero em todo o fluxo, inclusive sob `prefers-reduced-motion`, que aqui não muda nada.
- A tela acomoda o escalonamento de fonte do sistema: a explicação da página pendente quebra em quantas linhas precisar, e as ações continuam alcançáveis por rolagem.

---

## 10. O que não fazer nesta tela

**Específico do encerramento da sessão**

- **Não desenhe campo de tempo.** O tempo foi medido pelo aplicativo e aparece como linha somente leitura. Nada de horas e minutos editáveis.
- **Não desenhe campo de páginas lidas nem de percentual.** A entrada é a página em que parou, absoluta (RN-17).
- **Não trate a página atual como erro.** Aqui ela é válida e encerra sem registro, com a faixa neutra explicando (RN-16.7).
- **Não exiba `Você leu 0 páginas`.** Com campo vazio, inválido ou igual à atual, a linha de derivado não existe.
- **Não desenhe campo de data, hora ou fuso.** São capturados automaticamente (RN-18.2).
- **Não ponha `Descartar` no sheet de encerrar.** Descartar a sessão em andamento é `Cancelar sessão`, no modo de foco. Descarte só aparece na página de sessão pendente.
- **Não desenhe shell no sheet nem na página pendente.** O shell só volta nos artboards de resultado (4.9 e 4.10).
- **Não perca a sessão em nenhum erro.** Os estados 4.7 e 4.8 mantêm o campo preenchido e a sessão guardada.
- Não desenhe o aviso de fila offline como erro. Ele é `ambar` e informativo.
- Não desenhe tela de sucesso, toast de sucesso, parabéns ou animação de comemoração. O dado atualizado é a confirmação.
- Não use `ambar` nem `rubi` para explicar a sessão expirada ou a pausa esgotada. É texto em `grafite`.
- Não desenhe spinner no botão em envio.
- Não anime nada: nem o sheet, nem o scrim, nem a troca de estado.
- Não desenhe versão web.

**Tipografia**

- Nada de Inter. Manrope é a fonte de interface.
- Nada de Instrument Serif e nada de Fraunces.
- Nada de serifa nesta tela: ela não é resenha, não é frase de livro e não é sinopse.
- Nada de mistura de família dentro do mesmo título. Ênfase é itálico da mesma família.
- Nada de overline nesta tela.
- Nada de eyebrow numerado do tipo "01 · SEÇÃO".

**Cor e superfície**

- Nada da paleta bege quente com latão, oxblood e expresso.
- Nada de gradiente roxo, rosa ou azul. Nada de aurora, mesh ou glow neon.
- Nada de gradiente em botão. Nada de gradiente em texto.
- Nada de #000000 em lugar nenhum, nem no claro nem no escuro.
- Nada de sombra preta pura.
- Nada de fundo com textura de papel ou de madeira.

**Motion**

- Nada de motion no modo de foco, e este fluxo é parte dele.
- Nada de scroll hijacking, parallax, marquee ou loop infinito.
- Nada de spinner girando.

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
- Nada de botão destrutivo preenchido. Destrutivo é outline `rubi`.

**Interações destrutivas**

- Nada de descartar a sessão sem confirmação (RNF-USA-04).
- Nada de desfazer depois de descartar.

**Formulários**

- Nada de placeholder no lugar do label. Label sempre acima do campo.
- Nada de helper que só aparece depois do erro.
- Nada de mensagem de erro genérica. Mensagem em pt-BR, específica e acionável.
- Nada de travar o botão de salvar por erro de validação do cliente.

**Métricas e dados**

- Nada de número exibido sem unidade. É `47 minutos`, `43 páginas`, nunca o número sozinho.
- Nada de número fake-preciso.

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
