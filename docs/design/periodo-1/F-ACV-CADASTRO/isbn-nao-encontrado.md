# F-ACV-CADASTRO · ISBN não encontrado

**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-ACV-CADASTRO.md
**Requisitos:** RF-ACV-06 (ISBN não encontrado em nenhuma fonte externa exibe mensagem específica e oferece o caminho de cadastro pessoal)
**Não funcionais:** RNF-USA-05 (mensagem de erro em pt-BR e acionável), RNF-USA-03 (contraste WCAG AA), RNF-USA-02 (responsiva na web), RNF-ERR-08 (a indisponibilidade da fonte é outro estado, e não este)
**Regras de negócio:** RN-02 (livro pessoal não possui ISBN), RN-03 (livro pessoal fica fora da busca e do catálogo)
**Versão web:** sim. RF-ACV-06 tem marcação na coluna Web de `REQUISITOS.md` §5.2.

---

## 1. Contexto

O leitor digitou um ISBN válido, o servidor consultou a OpenLibrary e depois o Google Books, e **as duas responderam que não conhecem aquele ISBN**. Não é falha de rede nem de serviço: é a resposta. §10.1 do `REQUISITOS.md` fecha o desfecho: "se nenhuma fonte retornar o ISBN, o fluxo termina em erro com oferta de cadastro pessoal".

Esta é uma tela e não um estado de [`cadastro-por-isbn.md`](cadastro-por-isbn.md) porque o que ela faz é diferente: ela não pede um ISBN nem mostra resultado, ela **negocia uma troca de caminho**. O leitor chegou querendo um livro oficial, e vai sair com um livro pessoal, que tem outras regras — fica fora da busca, ninguém mais consegue adicioná-lo à estante, e a nota dele não entra em média nenhuma. Enfiar essa conversa dentro de um banner de erro no formulário anterior esconderia justamente o que a pessoa precisa entender antes de decidir.

Três coisas definem o desenho:

- **A mensagem é específica, não genérica.** RF-ACV-06 pede mensagem específica. "Não encontramos este ISBN em nossas fontes" é diferente de "algo deu errado", e é diferente de "não conseguimos consultar" — que é a outra tela, a de indisponibilidade.
- **O cadastro pessoal é oferta, não imposição.** O caminho principal é seguir para o cadastro manual, mas conferir o ISBN digitado é uma saída legítima e frequente: trocar um dígito é o erro mais comum.
- **A diferença entre livro oficial e pessoal é explicada aqui, uma vez.** Depois que a pessoa aceita, o formulário de [`cadastro-pessoal.md`](cadastro-pessoal.md) não repete a explicação. Este é o momento de dizer o que muda, em uma frase, sem virar aula.

O canvas simula um arquivo de Figma. Todos os artboards ficam **lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.

- **Linha 1:** estados mobile, viewport `390 x 844`.
- **Linha 2:** estados web, viewport `1440 x 900`.
- **Linha 3:** modo escuro.
- Cada artboard leva um **rótulo acima**, no formato `ISBN não encontrado · <estado>`, e o **viewport abaixo**. Rótulo e viewport são chrome do canvas: não aparecem dentro do frame.
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

Dials: DESIGN_VARIANCE 4, MOTION_INTENSITY 3, VISUAL_DENSITY 3. Layout
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

| Dado | Valor |
|---|---|
| ISBN consultado, exibido para conferência | `978-85-359-1484-9` |

É só isso. A tela não tem dados de livro, porque nenhum livro foi encontrado — e inventar um card vazio ou um placeholder de capa aqui seria desenhar a ausência como se fosse um resultado.

---

## 4. Artboards mobile (390 x 844)

Dentro do shell autenticado, com barra inferior de quatro itens e header de 72px com o sino. **Descobrir** ativo. Header com seta `ArrowLeft` à esquerda e título em `display` `tinta`: `Adicionar livro`. O título **não muda** em relação à tela anterior: é o mesmo fluxo, e trocar o título sugeriria que a pessoa mudou de lugar.

### 4.1 Padrão

Este é o estado principal e praticamente o único. De cima para baixo, padding lateral `space-5`, conteúdo alinhado ao topo e **não** centralizado verticalmente — centralizar faria a tela parecer um erro de sistema, e isto é um desfecho previsto.

1. `space-8` de respiro abaixo do header.
2. Ilustração de estado vazio conforme o §5.1 e §8 do documento-de-design: **não** é um ícone de erro. Use `MagnifyingGlass` (Phosphor, `regular`, 32px, `grafite-suave`) dentro de um círculo de 72px com fundo `papel-elevado`, centralizado. Sem `rubi`, sem `ambar`, sem ícone de alerta: o sistema funcionou.
3. `space-6`.
4. Título do estado em `title` `tinta`, centralizado, uma linha: `Não encontramos este livro`.
5. `space-3`.
6. Texto em `body` `grafite`, centralizado, largura máxima de 300px, duas linhas: `Procuramos em todas as nossas fontes e nenhuma conhece o ISBN 9788535914849.`
7. `space-2`.
8. O ISBN consultado em `num-inline` (JetBrains Mono, numeral tabular) `grafite-suave`, centralizado, para conferência dígito a dígito contra o livro. Renderizado **sem separadores**, como foi normalizado.
9. `space-8`.
10. Bloco de decisão, em card `papel-elevado`, `radius` 16, padding `space-5`, alinhado à esquerda:
    - Título em `body-strong` `tinta`: `Cadastrar como livro pessoal?`
    - `space-3`.
    - Texto em `body` `grafite`, três linhas: `Um livro pessoal é só seu: ele não entra na busca do acervo e ninguém mais pode adicioná-lo à estante. Sua nota e sua resenha continuam valendo normalmente.`
    - `space-5`.
    - Botão primário pill, largura total, 48px: `Cadastrar livro pessoal`.
11. `space-5`.
12. Botão textual `musgo` centralizado, `body-strong`: `Conferir o ISBN`. Volta para [`cadastro-por-isbn.md`](cadastro-por-isbn.md) com o campo preenchido com o valor digitado, pronto para correção, e não em branco.
13. Barra inferior do shell com **Descobrir** ativo.

### 4.2 Sem dados para conferir

Variação rara, para quando a tela é aberta a partir de um acompanhamento antigo e o ISBN já não está em mãos no cliente. Igual a 4.1, com os itens 6 a 8 substituídos por uma linha única em `body` `grafite`, centralizada: `Procuramos em todas as nossas fontes e nenhuma conhece esse ISBN.` O bloco de decisão e os botões permanecem idênticos. Desenhe este artboard para deixar claro que a ausência do número **não** quebra o layout.

---

## 5. Artboards web (1440 x 900)

Shell com sidebar retrátil, **Descobrir** ativo, área de conteúdo com padding lateral `space-8`, sem sino.

O conteúdo vive na mesma **coluna central de 640px** da tela anterior, para o fluxo não mudar de largura no meio do caminho. A ilustração e os dois primeiros blocos ficam centralizados dentro da coluna; o card de decisão ocupa a largura da coluna.

### 5.1 Padrão

Mesma ordem do 4.1, com as medidas de web: botão primário de 40px de altura, com largura automática e padding horizontal `space-8`, **centralizado dentro do card** de decisão. `hover` do botão em `musgo-vivo`, `hover` do botão textual com sublinhado, foco de teclado visível.

### 5.2 Padrão, sidebar retraída

O mesmo estado com a sidebar em 72px, só ícones, para mostrar que a coluna central permanece centralizada na área restante e não gruda na borda.

**Abaixo de 768px** a coluna passa a ocupar a largura disponível com padding lateral `space-5`, o botão primário volta à largura total, a sidebar dá lugar à barra inferior, e o layout fica idêntico ao mobile.

---

## 6. Artboards em modo escuro

Modo escuro é lock de página inteira (§3.1.2). Superfície elevada fica **mais clara** que o fundo, e os shadows têm metade da opacidade: a hierarquia vem da cor de superfície e do divisor `linha-noite`.

- **Mobile, padrão.** Fundo `noite`. Header e sino em `papel-suave`. Círculo da ilustração em `noite-elevada` com ícone em `grafite-fundo-escuro`. Título do estado em `papel-suave`, texto em `grafite-claro`, ISBN em `grafite-fundo-escuro`. Card de decisão em `noite-elevada`, título em `papel-suave`, texto em `grafite-claro`. Botão primário com fundo `musgo-claro` e texto `noite`. Botão textual em `musgo-claro`. Barra inferior em `noite-elevada`.
- **Web, padrão.** O mesmo, com sidebar em `noite-elevada`, borda direita `linha-noite` e **Descobrir** ativo em `musgo-fundo-escuro` com ícone e rótulo em `musgo-claro`.

---

## 7. Componentes do design system usados

| Componente | Onde está definido |
|---|---|
| Estado vazio com desenho intencional e CTA claro | documento-de-design §5.1 e §8 |
| Botão primário pill | documento-de-design §4.1 |
| Botão textual | documento-de-design §4.1 |
| Card em superfície elevada | documento-de-design §3.1 e §3.5 |
| Escala tipográfica, com JetBrains Mono em numeral tabular | documento-de-design §3.2 e §3.2.1 |
| Paleta clara e escura, e a regra do acento único | documento-de-design §3.1 |
| Espaçamento, raio, elevação e motion | documento-de-design §3.3 a §3.6 |
| Iconografia Phosphor | documento-de-design §6 |
| Shell autenticado, barra inferior e sidebar | ../../periodo-0/P0-NAV/shell-de-navegacao.md |

**Componente que nasce aqui e vira pendência de incorporação** ao `documento-de-design.md` pelo controle de mudança do plano §3: o **card de decisão**, que explica uma consequência e carrega o CTA que a aceita. É diferente do estado vazio comum, porque o estado vazio convida a uma ação óbvia e este pede uma escolha informada.

---

## 8. Copy completa

| Onde | Texto |
|---|---|
| Título da tela, no header | `Adicionar livro` |
| Título do estado | `Não encontramos este livro` |
| Texto do estado | `Procuramos em todas as nossas fontes e nenhuma conhece o ISBN 9788535914849.` |
| Texto do estado, sem número | `Procuramos em todas as nossas fontes e nenhuma conhece esse ISBN.` |
| Título do card de decisão | `Cadastrar como livro pessoal?` |
| Texto do card de decisão | `Um livro pessoal é só seu: ele não entra na busca do acervo e ninguém mais pode adicioná-lo à estante. Sua nota e sua resenha continuam valendo normalmente.` |
| Botão primário | `Cadastrar livro pessoal` |
| Botão textual | `Conferir o ISBN` |

Zero em-dash em toda a copy. Zero emoji. A palavra "erro" não aparece em lugar nenhum desta tela: o sistema perguntou e recebeu resposta.

---

## 9. Acessibilidade e interação

- Contraste WCAG AA no corpo e AAA no título quando possível. O ISBN em `grafite-suave` é metadado de conferência e vem acompanhado da frase completa acima, que já carrega a informação essencial.
- Alvo de toque de no mínimo 48px no mobile, nos dois botões.
- Foco de teclado visível na web em borda de 1.5px `musgo`, sem `outline` padrão do browser. A ordem de foco é: botão primário do card, depois botão textual.
- A chegada nesta tela é anunciada por região viva, para leitor de tela receber o desfecho da busca sem precisar procurar na página.
- `prefers-reduced-motion` respeitado: sob `reduce`, a entrada da tela é estática.
- O ícone da ilustração é decorativo e fica fora da árvore de acessibilidade; o título do estado é que carrega o significado.
- Nenhuma ação destrutiva nesta tela, portanto nenhuma confirmação.

---

## 10. O que não fazer nesta tela

- **Não desenhe como erro de sistema.** Sem `rubi`, sem ícone de alerta, sem banner, sem a palavra "erro", sem código de erro visível. A busca funcionou.
- **Não use a copy de indisponibilidade.** "Não conseguimos consultar nossas fontes" é outro estado, com outro desfecho, e mora em [`cadastro-por-isbn.md`](cadastro-por-isbn.md) §4.7. Trocar as duas faria o leitor cadastrar um livro pessoal de um título que já existe no acervo.
- **Não centralize verticalmente o conteúdo na tela inteira.** Conteúdo flutuando no meio do vazio parece falha; alinhado ao topo parece etapa.
- **Não pule direto para o formulário de cadastro pessoal.** A troca de caminho tem consequência (RN-03) e precisa de uma escolha explícita.
- **Não repita a explicação de livro pessoal** na tela seguinte. Ela é dita aqui, uma vez.
- **Não ofereça "tentar de novo"** com o mesmo ISBN. As fontes responderam; repetir a pergunta dá a mesma resposta e só gasta o rate limit do leitor (RNF-SEC-18).
- **Não desenhe card de livro vazio nem placeholder de capa.** Não há livro.
- Nada de gradiente de acento, nada de `#000000`, nada de sombra preta pura, nada de emoji, nada de ilustração decorativa fora do sistema (§7).
