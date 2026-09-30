# F-AVA · Avaliar livro

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-AVA.md
**Requisitos:** RF-AVA-01 (atribuir nota de 0 a 5 estrelas, com meia estrela, editável a qualquer momento)
**Não funcionais:** RNF-SEC-02 (propriedade validada no servidor), RNF-SEC-13 (validação por esquema: faixa e passo da nota), RNF-USA-04 (confirmação ao remover a nota), RNF-ERR-04 (repetir a mesma escrita não repete efeito), RNF-USA-03, RNF-USA-05
**Regras de negócio:** RN-06 (a nota é do **livro**, não da leitura: uma por usuário por livro, sempre editável; os onze valores permitidos são 0; 0,5; 1; 1,5; 2; 2,5; 3; 3,5; 4; 4,5; 5), RN-04.5 (nota e resenha sobrevivem ao abandono e não duplicam por releitura), RN-03 (em livro pessoal, só o dono avalia)
**Versão web:** sim. RF-AVA-01 tem marcação na coluna Web de `REQUISITOS.md` §5.5. No mobile é bottom sheet; na web é dialog centrado, conforme `documento-de-design.md` §5.4.

---

## 1. Contexto

O painel de dar nota. Abre da página do livro, da estante e do fluxo de finalizar leitura, sempre com o mesmo desenho.

Ele existe como painel próprio, e não como estrelas tocáveis direto na página do livro, por causa de RN-06: **meia estrela é obrigatória**, e escolher entre onze valores num toque de 24px na página é impreciso demais. O painel dá espaço para as estrelas em tamanho `lg` de 32px, que é o tamanho que design §4.3 define para a ação de dar nota.

Duas distinções que a tela precisa carregar:

- **Nota zero e nota ausente são coisas diferentes.** `0` é um julgamento válido do leitor. Ausente é não ter avaliado. A interface nunca representa ausente como `0,0` nem como cinco estrelas vazias com um número zero ao lado.
- **A nota é do livro, não da leitura.** Ela sobrevive ao abandono e não duplica por releitura. Por isso o painel não pergunta "de qual leitura é esta nota" e não muda de comportamento conforme o status da estante.

Ele sustenta o mecanismo de **pertencimento**: a nota é o que aparece junto da resenha para quem segue o leitor.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`, com o sheet sobre o contexto de origem.
- **Linha 2:** estados web, viewport `1440 x 900`, com o dialog centrado sobre o contexto de origem.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `Avaliar livro · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
- **O contexto de origem aparece atrás em todos os artboards**, escurecido pelo scrim. Ele é a página do livro, desenhada de forma genérica: não é o assunto deste prompt.

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

**Livro dos artboards:** `Torto Arado`, de Itamar Vieira Junior, Todavia, `264 páginas`.

**Nota do leitor:** `4,5`, ou seja, quatro estrelas cheias e uma meia estrela.

**Livro do artboard sem nota:** `Grande Sertão: Veredas`, de João Guimarães Rosa, Nova Fronteira, `624 páginas`, ainda sem avaliação.

**Livro do artboard de nota zero:** `Marrom e Amarelo`, de Paulo Scott, Alfaguara, `168 páginas`, com nota `0`.

**Os onze valores permitidos, por RN-06:** `0`, `0,5`, `1`, `1,5`, `2`, `2,5`, `3`, `3,5`, `4`, `4,5`, `5`. Não existe valor fora dessa escala e não existe casa decimal além da meia.

**Formato do número na interface:** vírgula decimal em pt-BR, sempre. `4,5`, nunca `4.5`. O inteiro aparece sem casa decimal: `4`, nunca `4,0`.

**Estado da resenha:** ainda não escrita neste livro. O painel oferece o caminho, mas escrever a resenha é outra tela.

---

## 4. Artboards mobile (390 x 844)

O painel é um **bottom sheet**, conforme `documento-de-design.md` §5.4.

### Anatomia do bottom sheet

- **Scrim** cobrindo a viewport, `rgba(23,21,18,0.32)`, tingido no hue de `tinta` e nunca preto puro.
- **Sheet** ancorado no rodapé, largura total, fundo `papel-elevado`, cantos superiores em `radius-xl` 24, `elev-3`.
- **Alça** de 36 por 4px em `linha`, `radius-full`, centralizada, com `space-3` acima e abaixo.
- **Card compacto do livro:** capa de 60 por 90px em canto vivo à esquerda, `space-4` de gap, título em `title-sm` `tinta`, autor em `caption` `grafite`. Padding lateral `space-5`.
- Divisor de 1px `linha`.
- **Bloco da nota**, centralizado, com `space-8` de padding vertical.
- **Ações** no rodapé, com `space-5` mais a área segura abaixo.
- Entrada do sheet: desliza de baixo em `dur-base` com `ease-out`. Sob `prefers-reduced-motion`, aparece sem deslizar.

### Bloco da nota

Componente de **input** de design §4.3, tamanho `lg` de 32px, que é o tamanho definido para a ação de dar nota.

- Cinco estrelas em linha, centralizadas, com `space-3` de gap entre elas.
  - Estrela cheia: `Star` (Phosphor, `fill`), cor `musgo`.
  - Meia estrela: `StarHalf` (Phosphor, `fill`), cor `musgo`. O preenchimento é **hard-stop 50/50 sólido**, nunca um `linear-gradient`.
  - Estrela vazia: `Star` (Phosphor, `regular`), contorno `grafite-suave`, sem preenchimento.
- Abaixo das estrelas, `space-4` de gap, o valor em `num-display` `tinta`: `4,5`.
- Abaixo do valor, `space-2` de gap, a escala em `caption` `grafite`: `de 0 a 5, com meia estrela`.
- A escolha da meia estrela acontece pela metade esquerda de cada estrela, e por arraste horizontal contínuo sobre a linha de estrelas.
- A troca de valor anima só a estrela que mudou, com `dur-instant`. **Sem estrela que salta, sem partícula, sem brilho, sem escala elástica.**

### Ações

- Botão primário pill de largura total, altura 48px, `musgo`, texto `papel`: `Salvar nota`.
- Botão textual `musgo` de largura total: `Escrever resenha`. Leva à tela de resenha e salva a nota no caminho.
- Quando já existe nota salva, aparece abaixo um terceiro botão, **textual em `rubi`**: `Remover nota`. Ação destrutiva, sempre a última.

### 4.1 Sem nota

Estado do livro nunca avaliado.

- Cinco estrelas **vazias**, contorno `grafite-suave`, sem preenchimento.
- No lugar do valor, em `body` `grafite-suave`: `Sem nota`. **Nunca `0,0`, nunca `0`, nunca um traço.**
- Escala em `caption` `grafite` abaixo.
- Botão `Salvar nota` desabilitado, fundo `musgo` com 60% de opacidade: ainda não há o que salvar.
- Botão textual `Escrever resenha` ativo: resenha não depende de nota.
- **Sem o botão `Remover nota`**: não há nota para remover.

### 4.2 Nota escolhida

- Quatro `Star` em `fill` `musgo` e uma `StarHalf` em `fill` `musgo`.
- Valor `4,5` em `num-display` `tinta`.
- Botão `Salvar nota` ativo.
- **Sem o botão `Remover nota`**: a nota ainda não foi salva; cancelar é fechar o sheet.

### 4.3 Nota salva, com opção de remover

O estado de reabrir o painel de um livro já avaliado.

- Estrelas em `4,5`, valor `4,5`.
- Botão primário `Salvar nota`, para o caso de alterar.
- Botão textual `Escrever resenha`.
- Botão textual em `rubi`: `Remover nota`.

### 4.4 Nota zero

O artboard que prova que zero é um valor, e não ausência.

- Cinco estrelas **vazias**, com o mesmo desenho de 4.1.
- Mas o valor abaixo é `0` em `num-display` `tinta`, e não `Sem nota` em `grafite-suave`.
- Abaixo do valor, em `caption` `grafite`: `Você deu nota 0 a este livro.`
- Botão `Remover nota` presente, porque existe nota salva.
- A diferença entre 4.1 e 4.4 é a razão de os dois artboards existirem lado a lado no canvas: as estrelas são idênticas e só o texto distingue os dois estados. **Se o desenho não distinguir, o desenho está errado.**

### 4.5 Confirmação de remover nota

Ação destrutiva. Conforme RNF-USA-04, confirmação em modal.

- O sheet dá lugar a um **dialog centrado** sobre o mesmo scrim: largura de 320px, fundo `papel-elevado`, `radius-lg` 20, `elev-3`, padding `space-6`.
- Título em `title` `tinta`: `Remover sua nota?`
- Texto em `body` `grafite`: `O livro volta a ficar sem nota sua. Sua resenha, se houver, continua publicada.`
- `space-6` abaixo, dois botões empilhados de largura total:
  - **Botão destrutivo em outline**, `radius` 12, altura 48px, fundo transparente, borda de 1px `rubi`, texto `rubi`: `Remover nota`. Nunca preenchido.
  - Botão textual `grafite`: `Cancelar`.

### 4.6 Salvando e erro

**Salvando:** estrelas em estado somente leitura, botão primário desabilitado com o rótulo `Salvando`, sem spinner.

**Erro:** mensagem abaixo do botão, em `caption` `rubi`, com `space-2` de gap: `Não foi possível salvar sua nota. Verifique sua conexão e tente de novo.` Botão volta ao rótulo original e continua ativo. Reenviar usa a mesma chave de idempotência e não cria uma segunda nota.

---

## 5. Artboards web (1440 x 900)

Na web o painel é **dialog centrado**, conforme `documento-de-design.md` §5.4.

### Anatomia do dialog

- Scrim cobrindo a viewport, `rgba(23,21,18,0.32)`.
- Dialog centrado, largura de 420px, fundo `papel-elevado`, `radius-lg` 20, `elev-3`, padding `space-6`.
- **Sem alça de arraste.**
- `X` (Phosphor, `regular`, 20px, `grafite`) no canto superior direito.
- Card do livro com capa de 72 por 108px.
- Estrelas em 32px, com **hover** que pré-visualiza o valor sob o cursor: as estrelas até o ponto do cursor ficam em `musgo` com 60% de opacidade e o valor abaixo mostra o que seria escolhido, em `grafite-suave`. Ao sair do cursor, volta ao valor real.
- Botões com 40px de altura. Ações no rodapé **lado a lado à direita**: `Escrever resenha` textual à esquerda de `Salvar nota` primário. O `Remover nota` em `rubi` fica no canto inferior esquerdo, separado das duas ações positivas.
- Foco de teclado preso dentro do dialog, devolvido ao elemento de origem ao fechar, `Esc` fecha.
- **Setas do teclado mudam a nota em passos de 0,5**, e o valor atual é anunciado como texto.

### 5.1 Nota escolhida

Dialog com `4,5`, botões à direita e `Remover nota` no canto inferior esquerdo.

### 5.2 Sem nota

Estrelas vazias, texto `Sem nota` em `grafite-suave`, botão `Salvar nota` desabilitado, sem `Remover nota`.

### 5.3 Hover pré-visualizando

Cursor sobre a metade esquerda da quarta estrela: três estrelas e meia em `musgo` a 60% de opacidade, valor `3,5` em `grafite-suave` abaixo, e a nota real `4,5` ainda não alterada. Serve para conferir que a pré-visualização é distinguível do valor salvo.

### 5.4 Confirmação de remover nota

Dialog de 400px com a copy de 4.5 e os dois botões **lado a lado à direita**: `Cancelar` textual e `Remover nota` em outline `rubi`.

---

## 6. Artboards em modo escuro

Modo escuro é **lock de página inteira**: o contexto atrás do scrim também está escuro.

- **Mobile, nota escolhida.** Contexto em `noite`. Sheet em `noite-elevada`, **mais claro** que o fundo. Alça em `linha-noite`. Título do livro em `papel-suave`, autor em `grafite-claro`. Estrelas cheias e meia estrela em `musgo-claro`; estrela vazia em contorno `grafite-fundo-escuro`. Valor em `num-display` `papel-suave`. Escala em `grafite-claro`. Botão primário com fundo `musgo-claro` e texto `noite`; botão textual em `musgo-claro`; `Remover nota` em `rubi-claro`.
- **Mobile, sem nota.** Estrelas vazias em `grafite-fundo-escuro`, texto `Sem nota` em `grafite-fundo-escuro`, botão primário desabilitado.
- **Web, confirmação de remover nota.** Dialog em `noite-elevada` sobre contexto em `noite`, botão destrutivo com borda de 1px `rubi-claro` e texto `rubi-claro`, fundo transparente.

Nos três, os shadows ficam com **metade da opacidade**: no escuro a hierarquia vem da cor de superfície e do divisor `linha-noite`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Estrela de avaliação, variante de input, tamanho `lg` 32px, com meia estrela em hard-stop | documento-de-design §4.3 |
| Bottom sheet no mobile e dialog centrado na web | documento-de-design §5.4 |
| Card compacto do livro com capa de 60 por 90px | documento-de-design §5.4 |
| Botão primário pill, textual e destrutivo em outline | documento-de-design §4.1 |
| Confirmação de ação destrutiva em modal, com botão em outline `rubi` | documento-de-design §7.8 e RNF-USA-04 |
| Escala tipográfica, com JetBrains Mono no `num-display` | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |

**Componente que ainda não existe na fonte.** O §4.3 define o componente de input com "tap com feedback tátil e swipe para escolher meia estrela", mas não desenha o **painel** em que ele vive, nem o texto de valor abaixo, nem a distinção entre `Sem nota` e `0`. O painel desenhado aqui nasce neste prompt e vira pendência de incorporação ao `documento-de-design.md` pelo controle de mudança do plano §3.

**Componente deliberadamente ausente.** O componente `Nota geral vs Nota dos leitores` do §4.4 **não aparece** neste painel. Ele é da página do livro e, no Período 1, nem lá existe: a projeção de nota é F-ACV-NOTA, do Período 2.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Escala | `de 0 a 5, com meia estrela` |
| Sem avaliação | `Sem nota` |
| Nota zero, explicação | `Você deu nota 0 a este livro.` |
| Botão primário | `Salvar nota` |
| Botão primário em salvamento | `Salvando` |
| Botão textual | `Escrever resenha` |
| Ação destrutiva | `Remover nota` |
| Confirmação, título | `Remover sua nota?` |
| Confirmação, texto | `O livro volta a ficar sem nota sua. Sua resenha, se houver, continua publicada.` |
| Cancelar | `Cancelar` |
| Erro | `Não foi possível salvar sua nota. Verifique sua conexão e tente de novo.` |

Zero em-dash em toda a copy. Zero emoji, e isso vale especialmente aqui: **a estrela é o ícone `Star` da Phosphor, nunca o emoji de estrela.** O número da nota usa vírgula decimal de pt-BR e não recebe casa decimal quando é inteiro.

---

## 9. Acessibilidade e interação

- Alvo de toque mínimo de 48px em cada estrela do seletor, mesmo com o glifo desenhado em 32px. As áreas tocáveis de meia estrela dividem esse alvo ao meio na horizontal, e por isso o arraste contínuo também existe: quem não acerta a metade consegue pelo arraste.
- O valor é comunicado **sem depender do preenchimento das estrelas**: ele aparece em número logo abaixo, e é o número que o leitor de tela anuncia.
- Na web, as setas do teclado mudam a nota em passos de 0,5 e o valor é anunciado a cada mudança. O componente é operável inteiro por teclado.
- A pré-visualização em hover na web nunca substitui o valor salvo sem uma ação: ela usa opacidade menor e um texto em `grafite-suave`, distinguível do valor real em `tinta`.
- `Sem nota` e nota `0` são distinguíveis por texto, não só por desenho de estrela. Este é o requisito de acessibilidade mais importante da tela.
- Remover a nota passa por confirmação em modal (RNF-USA-04), e a confirmação esclarece que a resenha não é afetada.
- Contraste WCAG AA no corpo nos dois temas. O texto `Sem nota` usa `grafite-suave`, que passa apenas em tamanho grande, e por isso ele é desenhado no tamanho `body` e reforçado pelas estrelas vazias.
- No dialog da web, o foco fica preso dentro dele, entra no seletor de estrelas, é devolvido ao elemento de origem ao fechar, e `Esc` fecha.
- `prefers-reduced-motion` respeitado: a transição da estrela que muda vira estática, e o sheet aparece sem deslizar.

---

## 10. O que não fazer nesta tela

**Específico da avaliação**

- **Nunca use emoji como estrela.** A estrela é `Star` e `StarHalf` da Phosphor.
- **Nunca represente ausência de nota como `0,0`, `0` ou um traço.** Ausente é `Sem nota` em texto; `0` é uma nota válida e aparece como `0`.
- **Não use `linear-gradient` na meia estrela.** O preenchimento é hard-stop 50/50 sólido.
- **Não desenhe escala de dez estrelas, de cem pontos nem de emoji de rosto.** RN-06 fixa onze valores de 0 a 5 em passos de 0,5.
- **Não peça justificativa obrigatória junto da nota.** Nota e resenha são independentes: resenha não exige nota e nota não exige resenha.
- Não vincule a nota a uma leitura específica. A nota é do livro, sobrevive ao abandono e não duplica por releitura.
- Não desenhe botão destrutivo preenchido. `Remover nota` é textual `rubi` no painel e outline `rubi` na confirmação.
- Não desenhe animação de comemoração ao salvar. Sem confete, sem estrela que pulsa, sem partícula.
- **Não desenhe curtida ou descurtida de resenha.** RF-AVA-05 e RF-AVA-08 são do Período 2.
- **Não desenhe o componente de nota geral e nota dos leitores.** É do Período 2.
- Não ofereça avaliar livro pessoal de outra pessoa. Em livro pessoal só o dono avalia (RN-03), e o painel não abre para terceiros.

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
