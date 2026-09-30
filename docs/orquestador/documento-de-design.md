# Documento de Design

**Versão:** v1.2 - 01/09/2026
**Status:** baseline de design aberta para o período-0

> Este documento define **a linguagem visual e de interação** do aplicativo. Ele é a fonte de verdade de todo tema, componente, layout e prompt de protótipo. `docs/orquestador/REQUISITOS.md` continua sendo a fonte de verdade do produto; este arquivo deriva dele: nada aqui contradiz um requisito, e cada decisão de design existe para atender um ou mais requisitos funcionais ou não funcionais.
>
> Em caso de conflito, `docs/orquestador/REQUISITOS.md` vence e a divergência segue o controle de mudança do `docs/orquestador/plano-de-projeto.md` §3.

---

## 1. Design Read

Aplicativo social de leitura brasileiro no modelo Skoob/Letterboxd. Público-alvo formado por pessoas com 18 anos ou mais, interface em pt-BR e uso predominante em celular. O produto se sustenta em três mecanismos declarados nos requisitos: **registro** (o que já foi lido), **meta** (alvo curto e alcançável) e **pertencimento** (ver amigos lendo). A linguagem de design deve reforçar esses três mecanismos, e não competir com eles.

**Personalidade da marca:**

- **Editorial, não literário-nostálgico.** Não é sebo de faculdade, não é biblioteca antiga. O produto respeita o livro sem transformar a interface em textura de papel envelhecido.
- **Calmo, não silencioso.** Reading apps que exageram no minimalismo perdem energia social. Este produto tem feed, curtidas, comentários, resenhas: precisa de calor.
- **Contemporâneo brasileiro.** Neutros quentes, verde profundo como acento, tipografia que se parece com o que designers brasileiros usam em 2025-2026. Nada de "café artesanal americano".
- **Sério com leitura, leve com o resto.** A tela de leitura cronometrada (modo de foco, RN-16) é o momento mais calmo do app; o feed é o momento mais social. O sistema tem que aguentar os dois extremos sem parecer dois produtos diferentes.

**O que o design NÃO é:**

- Não é um clone visual do Skoob (visual datado) nem do Letterboxd (paleta muito escura e centrada em cinema).
- Não é um app de produtividade / dashboard. Estatísticas existem, mas o produto não é sobre métricas.
- Não é um app de café artesanal / cerâmica / cutelaria (beje + latão + oxblood + expresso). Essa paleta é o vício visual de IA de qualquer projeto "premium com alma" e está explicitamente banida na §10.2.

---

## 2. Dials

| Dial | Valor | Consequência |
|---|---|---|
| `DESIGN_VARIANCE` | 5 | Layouts previsíveis em toda navegação principal (estante, feed, perfil, notificações). Variação editorial reservada às páginas de livro, resenha longa e recomendação. |
| `MOTION_INTENSITY` | 4 | Motion serve para hierarquia (fade + slide na navegação), feedback (tap tactile) e state transition (mudança de status na estante). Zero loops infinitos, zero parallax, zero scroll-hijack. |
| `VISUAL_DENSITY` | 4 | Respirando em mobile, ainda funcional em web. Densidade sobe em telas de dados (estatísticas, histórico) e cai em páginas de livro e no modo de foco. |

Modo de foco (RN-16) opera com dials efetivos **`1 / 1 / 1`**: layout centralizado e simétrico, sem motion, com o mínimo de elementos possível na tela.

---

## 3. Fundamentos

### 3.1 Cores

Os tokens são definidos por **valor neutro** (hex + nome semântico), e não como classes de framework. Isso é obrigatório pelo RNF-USA-06: os mesmos tokens alimentam `tailwind.config` na web e `ThemeData` no Flutter.

#### 3.1.1 Paleta base (modo claro)

| Token | Hex | Uso |
|---|---|---|
| `papel` | `#F4F2EC` | Background da tela. Aveia quente com puxada para cinza, distante da família bege AI-default. |
| `papel-elevado` | `#EDE9DE` | Superfície elevada. Cards, sheets, containers com conteúdo próprio. |
| `linha` | `#DFD9C9` | Divisor de 1px. Usado em `divide-y` de listas e em contornos suaves. |
| `tinta` | `#171512` | Texto primário. Preto quente, nunca `#000000`. |
| `grafite` | `#5C544B` | Texto secundário e labels. Passa em contraste WCAG AA sobre `papel`. |
| `grafite-suave` | `#8A8175` | Texto terciário, metadados, placeholders. Contraste mínimo WCAG AA para tamanho grande apenas. |
| `musgo` | `#3E5C42` | **Acento primário.** CTAs, links, ícones ativos, indicador de progresso de leitura, cor do streak. |
| `musgo-vivo` | `#4E7455` | Estado hover / press do acento primário. |
| `musgo-fundo` | `#E4EAE0` | Tint suave para badges, chips e área ativa de menu. |
| `broto` | `#8AA274` | Cor secundária da gamificação. Fill de progresso de desafios, indicador de sequência ativa. |
| `rubi` | `#B4322A` | Cor de ação destrutiva e erro. Descurtida, excluir, denunciar, mensagem de erro. |
| `rubi-fundo` | `#F6E1DE` | Tint de erro (background de campo com validação negativa, banner de erro). |
| `ambar` | `#D4A537` | Alerta (leitura em risco, sessão expirada). Reservado a estado, nunca a decoração. |
| `ambar-fundo` | `#F7ECD1` | Tint de alerta. |
| `capa-placeholder` | `#DED4BC` | Preenchimento de capa de livro ainda não carregada. Neutro quente, alto contraste com `tinta` para o título fallback. |

**Regras da paleta:**

1. **Um único acento na página.** `musgo` é a cor de ação em toda a interface. Nenhuma tela usa acento azul, roxo ou rosa para CTA. `rubi` só aparece em contexto destrutivo, `ambar` só em contexto de alerta, `broto` só em contexto de progresso/gamificação.
2. **Nada de gradiente de acento.** Sem "gradient buttons", sem "gradient text" em título. Superfícies são cor sólida ou transparência.
3. **Nada de sombra preta pura.** Elevações usam `rgba(23, 21, 18, 0.06)` a `rgba(23, 21, 18, 0.16)`, tingidas com o hue de `tinta`.
4. **Contraste mínimo:** `tinta` sobre `papel` = 15.2:1 (AAA). `grafite` sobre `papel` = 6.4:1 (AA para body). `grafite-suave` sobre `papel` = 3.9:1 (AA large only, nunca body).

#### 3.1.2 Paleta base (modo escuro)

Modo escuro é obrigatório (RNF-USA-06 + boa prática 2026). O sistema respeita `prefers-color-scheme` por padrão, com toggle manual em Configurações que salva a preferência local.

| Token | Hex | Uso |
|---|---|---|
| `noite` | `#141311` | Background da tela. Preto quente, nunca `#000000`. |
| `noite-elevada` | `#1D1B18` | Superfície elevada. |
| `linha-noite` | `#2A2724` | Divisor. |
| `papel-suave` | `#EDE9E0` | Texto primário sobre `noite`. Contraste 14.1:1. |
| `grafite-claro` | `#B8AFA2` | Texto secundário. Contraste 7.9:1. |
| `grafite-fundo-escuro` | `#7C7466` | Texto terciário / placeholder. AA large only. |
| `musgo-claro` | `#8FB27A` | Acento primário em modo escuro. Contraste suficiente para CTA e link. |
| `musgo-fundo-escuro` | `#243026` | Tint suave para badges e chips ativos. |
| `broto-vivo` | `#A5C285` | Progresso e streak em modo escuro. |
| `rubi-claro` | `#E56354` | Ação destrutiva em modo escuro. |
| `rubi-fundo-escuro` | `#3A1F1D` | Tint de erro. |
| `ambar-claro` | `#E8BC5A` | Alerta. |
| `ambar-fundo-escuro` | `#332816` | Tint de alerta. |
| `capa-placeholder-noite` | `#3A342A` | Placeholder de capa em modo escuro. |

**Regras específicas do modo escuro:**

1. **Modo escuro é lock de página inteira.** Nenhuma seção do app inverte para claro no meio da rolagem. Modo de foco herda o mesmo tema; ele fica ainda mais calmo com `noite` puro e sem qualquer superfície elevada.
2. **Superfícies elevadas ficam mais claras, não mais escuras.** `noite-elevada` está acima de `noite` na hierarquia. Card de resenha sobre background é `noite-elevada` sobre `noite`.
3. **`musgo-claro` é a cor dos elementos ativos**, incluindo o número da sequência ativa, o fill do progresso e a estrela cheia na avaliação. Tema escuro não desatura o acento a ponto de ele sumir.

#### 3.1.3 Aplicações típicas dos tokens

| Elemento | Modo claro | Modo escuro |
|---|---|---|
| Background da tela | `papel` | `noite` |
| Card de livro no feed | `papel-elevado` sobre `papel` | `noite-elevada` sobre `noite` |
| Botão primário fundo | `musgo` | `musgo-claro` |
| Botão primário texto | `papel` | `noite` |
| Link inline | `musgo` sublinhado no hover | `musgo-claro` sublinhado no hover |
| Estrela cheia (nota) | `musgo` | `musgo-claro` |
| Estrela vazia (nota) | `grafite-suave` | `grafite-fundo-escuro` |
| Fill de progresso do desafio | `broto` sobre `musgo-fundo` | `broto-vivo` sobre `musgo-fundo-escuro` |
| Botão destrutivo | `rubi` outline sobre transparente | `rubi-claro` outline sobre transparente |
| Banner de leitura em risco | `ambar-fundo` com ícone `ambar` | `ambar-fundo-escuro` com ícone `ambar-claro` |

### 3.2 Tipografia

O sistema usa quatro famílias, todas disponíveis em Google Fonts (portáteis para web e Flutter via `google_fonts`):

| Papel | Família | Pesos disponíveis usados |
|---|---|---|
| **Display** | Space Grotesk | 500, 600, 700 |
| **UI / Body** | Manrope | 400, 500, 600, 700 |
| **Editorial (leitura longa)** | Newsreader | 400, 500 (regular e italic) |
| **Números e dados** | JetBrains Mono | 400, 500 |
| **Logo (wordmark)** | *a definir* — decisão pendente (interino: Space Grotesk 600) | 600 |

**Justificativa da escolha:**

- **Space Grotesk** substitui a tentação de usar Inter como padrão. É geométrica, com caráter próprio nas letras `a`, `g`, `k`, `t`, e escala bem em título grande. Google Fonts, licença open.
- **Manrope** é sans humanista para UI, com curvas suaves que combinam com o acento verde-musgo. Legível em 14-16px em telas de celular.
- **Newsreader** foi desenhada especificamente para interfaces de leitura pela Production Type. Usada para o **corpo renderizado da resenha** (RF-AVA-02), **frases e trechos** (RF-AVA-06) e **sinopse do livro** (RF-ACV-18). Fora dessas três aplicações, serifa não aparece.
- **JetBrains Mono** para dados: número da sequência diária (RF-GAM-02), páginas lidas, minutos, contadores. Números tabulares evitam salto de layout quando a métrica atualiza.

**Nenhuma das quatro famílias está na lista de bans do design skill** (evitamos Inter como padrão, Fraunces e Instrument Serif como serifa editorial). Se Space Grotesk ficar indisponível, o fallback é `system-ui, -apple-system, "Segoe UI", sans-serif`.

- **Logo (wordmark)** é uma família **exclusiva da marca**: aparece apenas no lockup horizontal da logo (§3.7), nunca na UI. Ela **não substitui** as quatro famílias de texto — Space Grotesk continua sendo o display da interface. A fonte definitiva do wordmark é **decisão pendente da equipe**; até ela ser fechada, o lockup usa **Space Grotesk 600, `-0.015em`** como interino. Quando escolhida, esta linha e o token `wordmark` (§3.2.1) são atualizados na mesma passada.

#### 3.2.1 Escala tipográfica

Escala fixa, mesma na web e no mobile. Nomes semânticos, não `text-4xl`:

| Token | Tamanho | Line-height | Peso | Uso |
|---|---|---|---|---|
| `display-hero` | 40 / 44 | 1.05 | 600 | Título de página especial. Página do livro no mobile (com capa como fundo). |
| `display` | 32 / 36 | 1.1 | 600 | Título de tela principal (estante, feed, perfil). |
| `title-lg` | 24 / 28 | 1.2 | 600 | Título de seção dentro de uma tela. Cabeçalho de card grande. |
| `title` | 20 / 24 | 1.25 | 600 | Título de card, nome do usuário no feed, título de resenha. |
| `title-sm` | 17 / 22 | 1.3 | 600 | Título de item em lista, nome do livro em card compacto. |
| `body-lg` | 17 / 26 | 1.5 | 400 | Corpo de leitura longa (resenha renderizada). Manrope regular. Em contexto editorial, alterna para Newsreader 17/28 regular. |
| `body` | 15 / 22 | 1.45 | 400 | Corpo padrão da interface. Descrição de card, sinopse curta. |
| `body-strong` | 15 / 22 | 1.45 | 600 | Ênfase inline no corpo. |
| `caption` | 13 / 18 | 1.3 | 500 | Metadado, timestamp, contador ("42 leitores"), rótulo de badge. |
| `label` | 12 / 16 | 1.2 | 600 tracking 0.02em | Label de campo de formulário, mini-título de agrupamento. |
| `overline` | 11 / 14 | 1.2 | 700 tracking 0.08em uppercase | Rotulagem hierárquica pontual. **Uso racionado:** máximo 1 overline a cada 3 telas. Ver §7 (Coisas a evitar). |
| `num-display` | 36 / 40 | 1 | 500 | Número grande e sozinho: streak atual, total de páginas lidas no ano, dias por livro. JetBrains Mono. |
| `num-inline` | 15 / 22 | 1.45 | 500 | Números dentro do corpo (páginas, minutos, contador). JetBrains Mono, `font-feature-settings: "tnum"`. |
| `wordmark` | — | 1 | 600 tracking -0.015em | **Exclusivo do lockup da logo** (§3.7). Fonte da logo (pendente; interino Space Grotesk 600). Tamanho definido pelo contexto do lockup, alinhado à altura da caixa alta do símbolo. |

**Regras de emphasis:**

- Ênfase dentro de título usa **itálico da mesma família** (Space Grotesk italic ou Newsreader italic). Jamais injetar serifa random em título sans, ou sans random em título serifa.
- Descenderes com italic em display (`y g j p q`): `line-height` mínimo 1.1 e `padding-bottom: 4px` no wrapper, evitando corte da cauda.

#### 3.2.2 Serifa: quando entra, quando não

Newsreader entra em **três lugares específicos** e em nenhum outro:

1. Corpo da resenha renderizada (RN-13, ao publicar): body-lg em Newsreader regular. O leitor está lendo texto longo, escrito por outro leitor, e a serifa faz o texto respirar como uma resenha impressa.
2. Frases e trechos do livro (RF-AVA-06): body-lg em Newsreader italic. É citação de obra, tratada como tal.
3. Sinopse do livro na página do livro (RF-ACV-18): body-lg em Newsreader regular. É o texto que sustenta "quero ler".

Fora disso, o app inteiro é Manrope. Sinopse curta em card de busca, resenha em preview no feed, dropdown de "leia mais", tudo Manrope. Serifa é da experiência de leitura, não da navegação.

### 3.3 Espaçamento

Escala em múltiplos de 4px, com tokens semânticos:

| Token | Valor | Uso |
|---|---|---|
| `space-1` | 4 | Gap entre ícone e label em botão pequeno. |
| `space-2` | 8 | Gap entre elementos relacionados (título + subtítulo). |
| `space-3` | 12 | Padding interno de botão. |
| `space-4` | 16 | Padding padrão de card, gap entre itens de lista. |
| `space-5` | 20 | Padding lateral padrão da tela em mobile. |
| `space-6` | 24 | Gap entre seções dentro da mesma tela. |
| `space-8` | 32 | Padding lateral padrão da tela em web (a partir de `md`). |
| `space-10` | 40 | Gap entre agrupamentos maiores. |
| `space-12` | 48 | Padding vertical de headers de seção. |
| `space-16` | 64 | Padding vertical de blocos hero da página do livro. |
| `space-24` | 96 | Padding vertical de blocos editoriais no web. |

Ritmo vertical mobile: `space-5` como padding lateral fixo, `space-6` entre blocos, `space-4` dentro de blocos.

### 3.4 Raio

**Shape Consistency Lock:** um único sistema de raios aplicado em toda a interface.

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 6 | Badge, chip pequeno, avatar circular pequeno via `radius-full`. |
| `radius` | 12 | Padrão de input, botão médio, tag maior. |
| `radius-md` | 16 | Card, tile do bento. |
| `radius-lg` | 20 | Modal, bottom sheet, cartão de destaque (capa do livro em card grande). |
| `radius-xl` | 24 | Container de sessão de leitura, dialog central. |
| `radius-full` | 999 | Botão CTA principal, avatar, chip toggleável. |

**Regra:** botões CTA primários usam `radius-full` (pill). Botões secundários, textuais e destrutivos usam `radius` (12). Nunca misturar botão retangular com botão pill em contextos concorrentes na mesma tela.

**Capa de livro** é a exceção declarada: retângulo natural, sem raio arredondado. Livro tem capa, capa tem canto vivo. Aplicar `radius-md` em capa de livro sugere botão, não objeto.

### 3.5 Elevação

Três níveis, tingidos no hue de `tinta`:

| Token | Valor CSS | Uso |
|---|---|---|
| `elev-0` | nenhuma | Superfície flush com o background. |
| `elev-1` | `0 1px 2px rgba(23,21,18,0.06), 0 1px 3px rgba(23,21,18,0.04)` | Card em lista, dropdown fechado. |
| `elev-2` | `0 4px 12px rgba(23,21,18,0.08), 0 2px 4px rgba(23,21,18,0.04)` | Dropdown aberto, tooltip, popover. |
| `elev-3` | `0 12px 32px rgba(23,21,18,0.12), 0 4px 8px rgba(23,21,18,0.04)` | Bottom sheet, modal. |

**No modo escuro**, os mesmos shadows ficam mais fracos (o olho já lê hierarquia pelo contraste de superfície), com opacidade cortada pela metade. Preferimos hierarquia por cor de superfície + `linha-noite` como divisor, não por shadow.

### 3.6 Motion

Todo motion respeita `prefers-reduced-motion`. Sob "reduce", transições viram estáticas ou duração 0.

**Tokens de duração:**

| Token | Valor | Uso |
|---|---|---|
| `dur-instant` | 100 ms | Tap tactile, mudança de estado imediata (icon toggle). |
| `dur-fast` | 180 ms | Hover em web, mudança de aba, entrada de tooltip. |
| `dur-base` | 260 ms | Transição de página, entrada de modal, mudança de status na estante. |
| `dur-slow` | 420 ms | Bottom sheet subindo, sequência de rating (5 estrelas revelando). |

**Tokens de easing:**

| Token | Valor | Uso |
|---|---|---|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Padrão de saída (elemento entrando na tela). |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Movimento contínuo (drag, sheet arrastando). |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Padrão de entrada em elemento saindo. |

**Regras de motion:**

- **Nenhum loop infinito.** Nenhum spinner girando eternamente, nenhum "shimmer" em background que fica sempre repetindo, nenhum "float" perpétuo em card. Loading é skeleton estático com fade in único a cada estado.
- **Zero parallax, zero scroll hijack, zero horizontal scroll pinado.** Este não é um portfolio de agência.
- **Motion motivado.** Cada transição responde a uma pergunta: hierarquia, feedback ou state transition. Se não responde, sai.
- **Modo de foco (RN-16): zero motion.** Nenhuma transição, nenhum ícone que pulsa, nenhum contador que "salta" ao virar dígito. O cronômetro tem transição CSS `dur-instant` no dígito trocando, e ponto.

### 3.7 Marca (logo)

O símbolo é uma **folha (broto de leitura) sobre um livro aberto** — a metáfora do produto: registro e crescimento a partir da leitura. O asset vive em `assets/imagens/logo-leai.svg` (§9.4).

**Símbolo e lockups.** A marca aparece de duas formas:

1. **Símbolo isolado** — só o livro-com-broto, para ícone de app, favicon e espaços apertados.
2. **Lockup horizontal** — `[símbolo] Lê Ai`. Ícone e texto **na mesma cor**; texto no token `wordmark` (§3.2.1); `gap` entre símbolo e texto = `space-3`; a base do texto alinha à altura da caixa alta, e o símbolo ocupa a altura da caixa alta do texto.

**Cor — regra dura.** A logo é um **asset monocromático de cor única**. Ela usa exatamente **duas combinações**:

- `musgo` (`#3E5C42`) sobre `papel`, **ou**
- `papel` sobre `musgo`.

Nunca é recolorida para `rubi`, `ambar`, `broto` ou `tinta`, nem ganha mais de uma cor ao mesmo tempo. Em modo escuro, segue a regra de acento do §3.1.2 (a cor ativa vira `musgo-claro` quando a logo faz papel de elemento de acento sobre superfície escura). O único estado tonal permitido além disso é uma variante **esmaecida** (logo desabilitada/marca-d'água), num neutro derivado — nunca um segundo matiz. A cor é aplicada em runtime (§9.4), não fixada no arquivo.

**Regras de uso:**

- **Área de proteção:** ao menos a **largura da folha** de respiro em todos os lados; nada de texto ou borda dentro dessa margem.
- **Tamanho mínimo:** **24px de altura** para o símbolo permanecer legível.
- **Nunca** distorcer a proporção, aplicar sombra ou girar o símbolo.

---

## 4. Componentes

### 4.1 Botões

Três variantes principais, uma variante destrutiva:

| Variante | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|
| **Primário** | `musgo` (claro) / `musgo-claro` (escuro) | `papel` / `noite` | nenhuma | CTA principal da tela: "Iniciar leitura", "Salvar", "Publicar resenha". |
| **Secundário** | transparente | `tinta` / `papel-suave` | `1px linha` / `1px linha-noite` | Ação secundária ao lado do primário. |
| **Textual** | transparente | `musgo` / `musgo-claro` | nenhuma | Ação inline, "Ver todos", "Cancelar". |
| **Destrutivo** | transparente | `rubi` / `rubi-claro` | `1px rubi` / `1px rubi-claro` | Excluir conta, abandonar leitura, denunciar. Sempre com confirmação (RNF-USA-04). |

**Regras invariáveis:**

- Botão primário é sempre pill (`radius-full`). Botão secundário, textual e destrutivo são `radius`.
- Texto do botão em **uma linha**. Se um label tem que quebrar em duas linhas em mobile, o label está longo demais.
- Padding: `space-3 space-5` (12 vertical, 20 horizontal) em botão médio. Alto de botão fixo em 48px em mobile (tap target), 40px em web.
- Nunca dois CTAs com a mesma intenção na mesma tela. A tela de estante não tem "Adicionar livro" e "Novo livro" concorrendo; escolhe um nome e usa em todos os pontos de entrada.
- Estado `active` (press): `scale(0.98)` + `dur-instant`. Sem "ripple" material design (o app não é Material 3).

### 4.2 Inputs

| Elemento | Especificação |
|---|---|
| Label | `label` token, cor `grafite` / `grafite-claro`, acima do campo, `space-2` de gap. |
| Campo | Alto 48 mobile / 44 web, `radius`, borda `1px linha`, background `papel-elevado`. |
| Placeholder | `grafite-suave` (nunca substitui o label). |
| Texto digitado | `tinta` / `papel-suave`, `body`. |
| Focus | Borda `1.5px musgo`, sem outline padrão do browser, `dur-fast`. |
| Erro | Borda `1.5px rubi`, texto de erro abaixo em `caption` `rubi`, `space-2` de gap. |
| Helper | Abaixo do campo, `caption` `grafite`. |

**Regras invariáveis:**

- Label **acima** do campo, nunca dentro. Placeholder não substitui label.
- Todo campo tem 3 estados visuais: padrão, focus, erro. Web também tem `disabled` (background `linha`, texto `grafite-suave`).
- Contraste do placeholder passa em WCAG AA para tamanho grande apenas: nunca colocar informação essencial no placeholder.

### 4.3 Estrela de avaliação (RF-AVA-01, RN-06)

Meia estrela é obrigatória (11 valores permitidos: 0, 0.5, 1, ..., 5). O componente é sempre 5 estrelas visíveis, com preenchimento parcial na meia.

- Estrela cheia: `musgo` / `musgo-claro`.
- Meia estrela: gradiente hard-stop 50/50 sólido, não `linear-gradient`.
- Estrela vazia: `grafite-suave` outline, sem fill.
- Tamanhos: `sm` (16px, em listas), `md` (24px, em página do livro), `lg` (32px, em ação de dar nota).
- **Não** usar emoji ⭐️ como estrela. Ícones da Phosphor: `Star` (vazia, `regular`), `Star` (cheia, `fill`) e `StarHalf` (`fill`) para a meia estrela.

**Componente de exibição** (leitura, contexto de outros usuários) tem tap disabled, sem hover. **Componente de input** (dar nota) tem tap com feedback tactile e "swipe" para escolher meia estrela.

### 4.4 Nota geral vs Nota dos leitores

RF-ACV-16 e RN-06 exigem que os dois indicadores sejam **exibidos como distintos e rotulados, nunca combinados**. Componente dedicado:

```
┌─────────────────────────────────────┐
│ Nota geral        Nota dos leitores │
│  ★ 4,2               ★ 4,5          │
│  213 avaliações      82 leitores    │
└─────────────────────────────────────┘
```

- Layout lado a lado em mobile e web, separados por `linha` vertical.
- Cada bloco tem título em `label`, nota grande em `num-display`, contagem em `caption`.
- Ausência: texto "sem nota" em `caption` `grafite-suave`. **Nunca exibir `0.0` ou `-` para nota ausente.**
- Livro pessoal (RN-03): componente **não aparece**. Aparece apenas a nota individual do dono, com rótulo "Nota do autor da estante".
- Quando houver avaliações de leitores, a página exibe abaixo um histograma compacto de 0 a 5 estrelas, com meia estrela, contagem e barras em `musgo`. Ausência de avaliações omite o histograma; não se cria estado zerado decorativo.

### 4.5 Card de livro

Quatro variantes, escolhidas por contexto:

| Variante | Uso | Altura | Elementos |
|---|---|---|---|
| **Estante** | Grid de livros na estante | 240px capa + 60px meta | Capa (proporção 2:3), título, autor, status pill. |
| **Feed** | Atividade no feed | Depende do texto | Capa 80x120, título, autor, avatar do autor da atividade + verbo ("terminou de ler", "começou a reler"). |
| **Busca** | Resultado de busca | 120px de altura | Capa 80x120 à esquerda, título + autor + editora + nota, status pill se já está na estante. |
| **Confirmação** | Livro que acabou de entrar no acervo, ou que já estava nele (cadastro por ISBN) | Depende do texto | Card em `papel-elevado` / `noite-elevada`, `radius-md`, padding `space-5`, sem sombra. Capa 60x90 no mobile e 80x120 na web à esquerda; à direita, `space-4` de gap, título em `title-sm` `tinta` (duas linhas no máximo, com reticências), autor em `body` `grafite`, editora e ano separados por ponto médio e total de páginas, ambos em `caption` `grafite-suave`. Sem nota, sem status e sem ação dentro do card: a ação vem abaixo dele, fora. |

**Todas as variantes:**

- Capa nunca com `radius`. Retângulo.
- Placeholder de capa (`capa-placeholder`) mostra título centralizado em `title-sm` `tinta` (dois primeiros nomes do autor abaixo em `caption` `grafite`). Nunca ícone de livro genérico.
- Livro pessoal recebe pequeno badge `caption` `overline` "PESSOAL" no canto inferior esquerdo da capa.
- Livro com status "Lido" recebe pequeno `Check` (Phosphor, `bold`) `musgo` no canto superior direito. Livro com "Relendo" recebe `ArrowsClockwise` (Phosphor, `regular`) `broto`.

### 4.6 Status pill (estante)

`RF-EST-01` define cinco status. Cada um tem cor semântica:

| Status | Fundo | Texto | Ícone (Phosphor) |
|---|---|---|---|
| Quero ler | transparente + `1px linha` | `tinta` / `papel-suave` | `BookmarkSimple` (`regular`) |
| Lendo | `musgo-fundo` / `musgo-fundo-escuro` | `musgo` / `musgo-claro` | `BookOpen` (`regular`) |
| Lido | `musgo` / `musgo-claro` | `papel` / `noite` | `Check` (`bold`) |
| Relendo | `musgo-fundo` / `musgo-fundo-escuro` | `broto` / `broto-vivo` | `ArrowsClockwise` (`regular`) |
| Abandonado | transparente + `1px linha` | `grafite` / `grafite-claro` | `PauseCircle` (`regular`) |

Pill é sempre pequeno (`caption`, `radius-full`, padding `space-1 space-2`).

### 4.7 Progresso de leitura

Barra fina, linear:

- Track: `musgo-fundo` / `musgo-fundo-escuro`, altura 6px, `radius-full`.
- Fill: `musgo` / `musgo-claro`, mesma altura, mesmo raio.
- **Percentual em número** ao lado direito, `num-inline`, `caption`.
- Se a leitura entrou em risco (>= 20 dias, RN-05), o fill vira `ambar-claro` e o ícone `Warning` (Phosphor, `regular`) `ambar` aparece antes do percentual.
- Nunca mostrar "0%" ou "100%". Zero por cento é a página 0, mostra "Iniciada". Cem por cento é "Concluída" com data de fim.

### 4.8 Streak (sequência diária)

Componente com dois números empilhados verticalmente:

- **Sequência atual**: `num-display` em `broto`, com `Flame` (Phosphor, `regular`, 20px) `broto` ao lado.
- **Sequência recorde**: `num-inline` em `grafite`, com rótulo "recorde".
- Se a sequência está em zero, o componente ainda existe e mostra "0" com o subtítulo "leia hoje para começar", em `body` `grafite`.
- **Nada de fogo animado, nada de partículas, nada de emoji 🔥.** `Flame` (Phosphor, `regular`) estático em `broto`.

### 4.9 Feed de atividade

Cada item do feed segue estrutura fixa:

```
[Avatar 40px]  Nome do usuário  ·  2h
              começou a ler
              [Capa 80×120]  Título do livro
                             Autor
              
              [botão curtir]  [botão comentar]  [contador de curtidas]
```

- Avatar circular (`radius-full`), 40px.
- Nome do usuário em `title-sm`, timestamp em `caption` `grafite-suave` com separador `·` de espaço-simples.
- Verbo da atividade em `body` `grafite`. Nunca inverter: "começou a ler" fica na sua própria linha, o link para a página do livro está no card do livro que vem abaixo.
- Botões de ação (curtir, comentar) em `radius-full`, altura 32px, texto em `caption`. Curtir preenchido usa `musgo`, curtir vazio usa `grafite`.

### 4.10 Modo de foco (RN-16)

Este é o componente mais especial do sistema, e o mais rigorosamente calmo.

**Layout:**

- Background sólido `papel` / `noite`. Nenhuma imagem, nenhum gradiente, nenhuma capa como fundo desfocado.
- Centralizado verticalmente. Em mobile, ocupa a viewport inteira (`min-h-[100dvh]`).
- Elementos permitidos, de cima para baixo:
  1. Título do livro (`title` `tinta`, centralizado).
  2. Autor (`body` `grafite`, centralizado).
  3. Cronômetro (`num-display` em 72px, JetBrains Mono, `tinta`), centralizado.
  4. Botão único no fundo, primário, "Encerrar sessão".
  5. Segundo botão textual "Pausar" acima, quando aplicável.
  6. Ação textual "Cancelar sessão", sempre com confirmação.
- **Nada mais na tela.** Sem barra de status própria, sem menu, sem back button próprio, sem barra inferior de navegação (o app está bloqueado, RN-16.3). Gesto ou botão de voltar do sistema não contorna o modo de foco nem abre outra área do aplicativo.

**Motion no modo de foco: zero.** O cronômetro atualiza o dígito com transição `dur-instant`, e ponto. Botão "Encerrar" tem `active: scale(0.98)`, e ponto.

### 4.11 Sobreposição modal (bottom sheet e dialog)

Base única de todo conteúdo que se sobrepõe à tela: confirmação destrutiva (§7.8), menu de ações e formulários curtos como o de §5.4.

- **Abaixo de 768px:** bottom sheet ancorado embaixo, largura total, fundo `papel` no claro e `noite-elevada` no escuro, `radius-lg` só no topo, padding `space-6`, `elev-3`. Alça de 32x4px em `linha` / `linha-noite`, centralizada, `space-5` acima do conteúdo. O padding inferior soma a área segura do aparelho.
- **A partir de 768px:** dialog centrado, 480px de largura, `radius-xl` nos quatro cantos (§3.4), sem alça. Menu que só existe no mobile continua bottom sheet em qualquer largura.
- **Scrim:** `tinta` (`#171512`) a 40% no claro e preto a 60% no escuro. É cor fixa, e não o token `tinta`, que no escuro vira `papel-suave` e clarearia a tela.
- **Motion (§3.6):** o sheet sobe de baixo em `dur-slow` com `ease-out`; o dialog entra em `dur-base` com deslize curto (16px) e fade. Os dois saem em `dur-base` com `ease-in`, com o scrim acompanhando. Sob `prefers-reduced-motion`, entram e saem sem deslizar.
- **Interação:** o foco fica preso dentro enquanto aberto, `Esc` e toque no scrim fecham, e o foco volta ao elemento que abriu. Na confirmação destrutiva o foco entra em `Cancelar`, nunca no destrutivo.
- **Menu de ações:** itens de 56px com ícone Phosphor `regular` de 20px e rótulo em `body`, `space-4` de gap, divisor `linha` entre eles, item destrutivo em `rubi` / `rubi-claro`, e `space-4` depois um botão textual `grafite` de largura total, `Cancelar`.
- **Confirmação destrutiva:** título em `title-sm`, consequência em `body` `grafite` nomeando o que se perde. Na web os botões ficam lado a lado, alinhados à direita, `Cancelar` primeiro; no mobile empilham em largura total, destrutivo em cima.

### 4.12 Área de upload de imagem

Escolha de uma imagem do aparelho (hoje, a capa de livro pessoal, RN-14.7), com quatro estados:

| Estado | Especificação |
|---|---|
| **Vazio** | Retângulo 120x160 no mobile e 200x267 na web, `radius`, borda tracejada 1px `linha`, fundo `papel-elevado`; `ImageSquare` (Phosphor, `regular`, 24px, `grafite-suave`) centralizado e, abaixo, `caption` `grafite` com a ação (`Adicionar capa`). Hover na web em `linha`. |
| **Enviando** | A imagem já posicionada, coberta por `papel` a 60%, com a barra de progresso determinada (§4.13) no centro; abaixo, `caption` `grafite` com o estado (`Enviando capa`). O resto do formulário continua editável. |
| **Preenchido** | A imagem, com botão circular de 28px em `papel` a 90% e `X` de 16px no canto superior direito (área tocável de 48px) para remover, e abaixo o link textual `caption` `musgo` peso 600 para trocar. |
| **Erro** | Volta ao vazio com borda tracejada 1.5px `rubi` e a mensagem abaixo em `caption` `rubi`, acionável (RNF-USA-05). Nada do que foi digitado nos outros campos se perde. |

- A regra do arquivo (formatos e tamanho máximo) fica sempre visível ao lado da área em `caption` `grafite-suave`, não só depois do erro (§7.9).
- No mobile a área fica à esquerda com a regra à direita, `space-4` de gap; na web a regra fica abaixo, `space-3`.
- A imagem é validada no cliente pelos bytes (tipo real, tamanho e dimensões) antes de subir.

### 4.13 Barra de progresso determinada

Quanto de uma transferência já terminou, com o servidor informando o total (upload). **Não é** a barra de progresso de leitura do §4.7, que mostra quanto do livro foi lido.

- Trilha `linha` / `linha-noite`, altura 4px, largura 80px, `radius-full`; preenchimento `musgo` / `musgo-claro`, mesma altura e raio, crescendo em `dur-fast`.
- Sem número ao lado: o percentual vai só para leitor de tela (`progressbar` com valor atual, mínimo e máximo).
- Só existe quando o progresso é real. Espera sem progresso informado é o cartão do §4.14, nunca uma barra inventada (§7.10).

### 4.14 Cartão de progresso de operação longa

Espera de vários segundos sem progresso informado (a importação por ISBN consulta fontes externas com timeout e retentativa, RNF-ERR-08).

- Card `papel-elevado` / `noite-elevada`, `radius-md`, padding `space-5`, sem sombra, no lugar em que o resultado vai aparecer.
- Três barras de skeleton estáticas em `linha` / `linha-noite`, `radius-sm`, alturas de 16, 14 e 14px e larguras de 70%, 45% e 35%, `space-3` de gap: a forma do resultado que vem.
- `space-4` abaixo, uma linha de estado em `caption` `grafite`. Quando a espera passa de um limiar (oito segundos na importação), o texto troca sem trocar o layout, por crossfade em `dur-base`.
- Um único fade de entrada em `dur-base` (§3.6). Sem spinner, sem barra, sem porcentagem e sem contagem regressiva.
- Quando o resultado chega, ele substitui o cartão no mesmo lugar, sem trocar de tela.

### 4.15 Faixa informativa neutra

Informação que não é erro nem alerta, como "este livro já está no acervo". O banner de alerta em `ambar` passaria a ideia errada.

- Fundo `musgo-fundo` / `musgo-fundo-escuro`, `radius`, padding `space-4`, sem borda.
- `Info` (Phosphor, `regular`, 20px, `musgo` / `musgo-claro`) à esquerda, `space-3` de gap, texto em `body`: `tinta` no claro e `musgo-claro` no escuro, como o ícone.
- É conteúdo, não notificação: não fecha, não some sozinha e não tem ação dentro.

### 4.16 Card de decisão

Explica uma consequência e carrega o CTA que a aceita. É diferente do estado vazio (§5.1), que convida a uma ação óbvia: este pede uma escolha informada (hoje, cadastrar como livro pessoal um ISBN que nenhuma fonte conhece).

- Card `papel-elevado` / `noite-elevada`, `radius-md`, padding `space-5`, alinhado à esquerda.
- Título em forma de pergunta, `body-strong` `tinta`; `space-3`; a consequência em `body` `grafite`, dizendo o que muda e o que continua valendo; `space-5`; botão primário pill com a ação, largura total no mobile e largura do rótulo na web.
- A alternativa (voltar, conferir) fica **fora** do card, como botão textual abaixo: o card carrega só a escolha que ele explica.

### 4.17 Etiqueta de natureza do registro

Diz o que o registro **é**, não em que estado está (isso é o status pill do §4.6) nem do que trata (isso é o chip de assunto). Hoje, só `Livro pessoal`, na página do livro, para o dono não confundi-lo com um do acervo.

- Pill de 24px de altura, `radius-full`, padding horizontal `space-3`, fundo `musgo-fundo` / `musgo-fundo-escuro`, texto em `label` `musgo` / `musgo-claro`. Sem ícone e sem ação.
- Não substitui o badge `PESSOAL` na capa das variantes de card (§4.5): a etiqueta vive na página, o badge vive no card.

### 4.18 Linha de atribuição de dono

Diz de quem é o conteúdo quando quem vê não é o dono (modo consulta, §5.8).

- Avatar circular de 24px, `space-2` de gap, texto em `caption` `grafite`: `Livro pessoal de <nome>`, com o nome em `musgo` / `musgo-claro`. O nome é link para o perfil do dono quando essa rota existir; o resto da frase não é.
- Sem avatar, o círculo mostra a inicial do nome em `label` `grafite` sobre `papel-elevado`.
- Centralizada abaixo da etiqueta no mobile; na web, alinhada à esquerda logo abaixo do autor.

### 4.19 Zona de exclusão

Rodapé de um formulário de **edição** onde fica a ação destrutiva do registro, para ela não disputar espaço com salvar e cancelar.

- `space-8` depois das ações do formulário, divisor de 1px `linha`, `space-5`.
- Título em `caption` `grafite` nomeando a ação (`Excluir este livro`); abaixo, `space-3`, botão destrutivo em outline (§4.1), largura total com 48px no mobile e largura do rótulo com 40px na web.
- O botão abre a confirmação do §4.11; a zona nunca exclui direto (RNF-USA-04). Não existe no formulário de criação.

---

## 5. Padrões de tela

**Áreas de navegação.** O app autenticado tem **quatro** áreas de primeiro nível, na ordem: **Estante** (`Books`), **Descobrir** (`Compass`), **Feed** (`Newspaper`) e **Perfil** (`UserCircle`). Elas são barra inferior no mobile e sidebar na web. As demais telas deste capítulo são telas de detalhe empilhadas sobre a área de origem, e não itens de navegação.

### 5.1 Estante

Tela principal do app depois da autenticação. Layout:

- **Header:** `display` "Minha estante" à esquerda, `MagnifyingGlass` (Phosphor, `regular`, 24px) à direita. **A lupa busca dentro da estante do leitor**, por título e autor, combinada com o filtro de status. Ela nunca traz resultado do acervo: encontrar livro novo é a área **Descobrir** (§5.7).
- **Filtros por status:** faixa horizontal rolável com pills, um pill por status (RF-EST-02). O primeiro é `Todos`, seguido dos cinco status na ordem da máquina de estados. **Cada pill traz a contagem** do seu status junto do rótulo (`Lendo 2`): contagem em `num-inline`, rótulo em `caption`. Pill inativo com borda 1px `linha` e texto `grafite`; ativo com fundo `musgo-fundo`, sem borda, texto `musgo` peso 600. Seleção única. Na web os pills cabem numa linha e não rolam.
- **Linha de ordenação:** abaixo da faixa, total de livros do filtro em `caption` `grafite` à esquerda (`10 livros`) e, à direita, o controle de ordenação (RF-EST-02): no mobile, botão textual `musgo` com `ArrowsDownUp` (Phosphor, `regular`, 16px) e o rótulo da ordenação atual, que abre um bottom sheet de opções (§4.11); na web, `select` de 44px. Opções: `Adicionados recentemente` (padrão) e `Adicionados há mais tempo`; `Título, A a Z` e `Título, Z a A`; `Autor, A a Z` e `Autor, Z a A` (livro sem autor por último, empate pelo título); `Maior progresso` e `Menor progresso` (percentual da leitura em andamento; livro sem leitura em andamento por último).
- **Grid:** 2 colunas em mobile, 4 em `md`, 6 em `lg`. Gap `space-4`. Cards da variante Estante (capa, título, autor e status pill, todos vindos da própria listagem da estante).
- **Vazio:** quando o filtro atual não tem livros, ilustração NEUTRA de linha (não fotografia, não emoji) + mensagem em `body` `grafite` + botão primário para ação relevante ("Adicionar livro" quando "Quero ler" está vazio).

### 5.2 Página do livro

A tela mais "editorial" do app. Layout mobile:

- **Hero:** capa 40% do width centralizada, título em `display` centralizado abaixo, autor em `body` `grafite` centralizado.
- **Barra de ação:** botão primário largo "Adicionar à estante" (ou "Iniciar leitura" se já está em Quero ler), botão secundário "Favoritar".
- **Nota geral vs Nota dos leitores:** componente §4.4 abaixo da barra de ação.
- **Sinopse:** título de seção `title-lg`, texto em `body-lg` Newsreader. Se a sinopse estiver ausente (RF-ACV-19, RN-19), a seção exibe essa ausência sem mensagem de erro.
- **Assuntos:** faixa de chips clicáveis (`radius-full`, `caption` uppercase, borda `1px linha`), cada um levando ao filtro de busca por assunto.
- **Autor · Editora · Série:** três blocos em linha, cada um leva à página respectiva.
- **Resenhas dos leitores:** título de seção + lista de resenhas com espaço, cada resenha renderizada em Newsreader.
- **Frases e trechos:** título de seção + lista de citações em blockquote com Newsreader italic.

**Regra crítica de layout:** este é o único lugar do app onde `DESIGN_VARIANCE` sobe para 7. O hero centralizado com display grande, a serifa aparecendo em três blocos, e a densidade menor. É a "tela literária" do produto, e ela contrasta deliberadamente com a estante (previsível, grid), o feed (previsível, cronológico) e as configurações (previsível, formulário).

### 5.3 Feed

Layout mobile:

- **Header:** `display` "Feed" à esquerda, `Bell` (Phosphor, `regular`, 24px — notificações) e `UserCircle` (Phosphor, `regular`, 24px — perfil) à direita.
- **Lista:** itens conforme §4.9, separados por `linha` divisor. Padding lateral `space-5`. Padding vertical entre itens `space-5`.
- **Vazio:** quando o usuário não segue ninguém, mensagem "Comece seguindo leitores" com botão primário "Buscar por username" (não há descoberta aberta, RF-SOC-03).

### 5.4 Registrar progresso

Tela simples, bottom sheet em mobile, dialog centrado em web, sobre a base do §4.11:

- Título: "Registrar progresso"
- Livro sendo lido: card compacto com capa 60×90 + título + autor.
- Campo 1: "Página em que parou" (input numérico, label acima).
- Campo 2: "Tempo gasto" (input com dois sub-campos: horas e minutos, ou seletor de duração).
- Info derivada: "Você leu X páginas" (calculado, `caption` `grafite`).
- Ações: "Salvar" (primário), "Cancelar" (textual).
- Erros de validação (página menor ou igual à atual, página maior que o total) aparecem inline no campo, `caption` `rubi` abaixo.

**Ações de leitura (lista de ações do sheet).** O registro de progresso é formulário; as transições de status do livro (RN-04) são um **menu de ações** sobre a mesma base do §4.11, aberto a partir do card ou da página do livro:

- Cabeçalho com o card compacto do livro (capa 60×90 + título + autor) e o status atual.
- A lista mostra **só as transições que a máquina de estados permite** a partir do status atual. Três papéis: **ação principal** (a transição esperada do status, ex.: `Iniciar leitura`, `Registrar progresso`, `Finalizar leitura`), rótulo em `musgo` peso 600; **ações neutras** (as demais transições válidas), rótulo em `tinta`; **ação destrutiva** (`Abandonar leitura`, `Abandonar releitura`, `Remover da estante`), em `rubi` / `rubi-claro`, **sempre a última**, separada por divisor.
- Toda ação destrutiva passa pela confirmação destrutiva do §4.11 (RNF-USA-04). **As duas confirmações de abandono têm textos distintos e não se unificam**, porque as consequências diferem (RN-04):
  - `Abandonar esta leitura?` / `A leitura fica salva na página 148 e você pode retomá-la depois, continuando de onde parou.`
  - `Abandonar esta releitura?` / `A releitura será salva como incompleta e o livro volta para Lido. Ela não conta como nova conclusão e não pode ser retomada.`
- Ações que pedem data (`Iniciar leitura`, `Finalizar leitura`) abrem o campo de data com padrão hoje e helper sempre visível. Nenhuma transição oferece desfazer.

### 5.5 Perfil

Layout mobile:

- **Header:** avatar grande centralizado (96px), nome em `display`, @username em `caption` `grafite-suave` abaixo.
- **Bio:** `body` centralizada abaixo, max 3 linhas.
- **Contadores em linha:** livros lidos, seguidores, seguindo. Cada um clicável para lista.
- **Streak component (§4.8) se dono do perfil.**
- **Estatísticas do ano (RF-STA-01) se perfil visível:** cards horizontais com número grande em `num-display`.
- **Estante do usuário (subconjunto de RF-SOC-02):** grid compacto de capas, tap leva à estante completa.
- **Resenhas recentes:** lista de 3 resenhas mais recentes.

### 5.6 Notificações

Layout mobile:

- **Header:** `display` "Notificações", botão textual "Marcar todas como lidas" à direita.
- **Lista cronológica reversa:** cada notificação com ícone Phosphor à esquerda (contextual: `Heart` para curtida, `ChatCircle` para comentário, `UserPlus` para seguidor, `Warning` para alerta), texto principal em `body`, timestamp `caption` `grafite-suave`.
- **Indicador de não lida:** ponto `musgo` de 8px à esquerda do ícone (não pill grande, não fundo tingido). Sob leitura, o ponto some com transição `dur-fast`.
- **Ação inline para leitura em risco (RF-NOT-04):** "Abandonar leitura" como botão textual `rubi` inline na notificação.

### 5.7 Descobrir

A área de busca do acervo (RF-ACV-01/02). Separada da estante porque o escopo das duas buscas é diferente: a estante mostra o que o leitor já tem, Descobrir mostra o catálogo. Layout mobile:

- **Header em duas linhas:** `display` "Descobrir" à esquerda com `Bell` à direita na primeira; campo de busca em largura total na segunda, conforme §4.2, com `MagnifyingGlass` (Phosphor, `regular`, 20px) dentro à esquerda. Sem botão de voltar: é área de navegação, não tela empilhada.
- **Filtro por assunto (RF-ACV-02):** faixa horizontal rolável de chips do conjunto curado de RN-21, seleção única. Chip ativo em `musgo-fundo` com texto `musgo` peso 600 e `X` de remoção.
- **Resultados:** lista de cards da variante Busca (§4.5), um por linha, separados por divisor `linha`. Paginação por rolagem. Livro pessoal nunca aparece (RN-03).
- **Vazio da consulta:** o vazio tem saída, e a saída é o cadastro (RF-ACV-05/08), não uma mensagem de ausência.
- **Aterrissagem, sem consulta:** campo e chips, sem foco automático no campo. Sem destaques e sem histórico: curadoria de descoberta não é escopo de nenhum RF.
- **Web:** título e campo na mesma linha do header, painel de assuntos em coluna fixa à esquerda e resultados em grid de duas colunas.

### 5.8 Modo consulta

Variante de uma página de conteúdo aberta por quem não é o dono (hoje, o livro pessoal visto por terceiro pelo feed, RN-15; F-LST vai precisar do mesmo na via por lista).

- **É a mesma página, com um conjunto de ações ausente.** As ações do dono (editar, excluir, estante, favorito, leitura, progresso) **não existem** no modo consulta: não aparecem desabilitadas, em cinza nem escondidas atrás de menu. A restrição é validada no servidor; a interface só não desenha o que não pode ser feito.
- A linha de atribuição (§4.18) entra para dizer de quem é o conteúdo.
- Os rótulos passam da segunda para a terceira pessoa: `Sua nota` vira `Nota de <primeiro nome>`, `Sua resenha` vira `Resenha de <primeiro nome>`.
- Seção sem conteúdo some por completo, sem bloco substituto e sem convite: o convite (`Você ainda não avaliou este livro.`) é só do dono, porque só ele pode agir. A página não pode ficar com buraco quando tudo some.

**Decidido (25/08/2026): Phosphor Icons.** Fechada sem pendência.

Pacotes:

- **Vue (web):** `@phosphor-icons/vue` (Vue 3 nativo). Fallback: `@phosphor-icons/web` para uso via `<i class="ph ph-book">`.
- **Flutter (mobile):** `flutter_phosphor_icons` (mantida ativamente para Flutter 3.x) ou `phosphor_flutter`.

Justificativa: cobertura ampla (mais de 9.000 glifos, cobre `Book`, `BookmarkSimple`, `Heart`, `ChatCircle`, `Star`, `StarHalf`, `MagnifyingGlass`, `Bell`, `Clock`, `Warning`, `Play`, `Pause` sem precisar de outra família), seis variantes visuais (`thin`, `light`, `regular`, `bold`, `fill`, `duotone`), curva humanista que combina com Manrope, licença MIT, disponibilidade paralela em Flutter e Vue.

Alternativas descartadas: **Lucide** (o próprio design skill que orienta este projeto lista como fonte a não usar como padrão, mesmo bonita), **Feather** (só 280 glifos), **Material Symbols** (cara de Material 3 demais, contra o §7.6), **Tabler** (bom, mas visual mais técnico que editorial), **Font Awesome Free** (subset limitado).

**Regras:**

- **Peso padrão: `regular`** (stroke 1.5px) em toda a interface. Isso vira variável de tema (`stroke-width` global no CSS de web, propriedade no widget wrapper do Flutter), não é aplicado ícone a ícone.
- **Peso `fill`** apenas para indicar estado ativo (ícone selecionado no menu inferior, curtir preenchido, favorito preenchido).
- **Uma família só.** Ninguém puxa `@heroicons`, `lucide-vue-next`, `material-icons` ou `@iconify` em cima de Phosphor. Se um glifo específico faltar (raro), abrimos issue no arquivo da feature, não trocamos de biblioteca.
- **Nada de emoji** em copy da interface. Emoji volta a ser aceitável apenas em comentário do usuário e em resenha, porque é conteúdo do usuário.
- **Nada de ícone desenhado à mão** dentro do código (nenhum `<path>` inline decorativo). Se falta um ícone, adicionamos com a Phosphor, não desenhamos SVG.

Tamanhos padrão:

- 16px: ícone inline em label.
- 20px: ícone em botão, ícone em campo de input.
- 24px: ícone em barra de navegação, ícone em card.
- 32px: ícone em ação principal isolada.

---

## 7. Coisas a evitar

Este é o "banlist" do projeto. Toda ferramenta de agente (Claude Code, Claude Design, opencode+codex) recebe este documento em contexto e deve honrar a lista. Divergência é registrada como pendência no arquivo da feature, não silenciada.

### 7.1 Tipografia

- **Nada de Inter como fonte padrão de UI.** Manrope é a escolha; Inter é o vício de IA que devolvemos para o público em muito trabalho ruim.
- **Nada de Instrument Serif e Fraunces** como serifa editorial. Newsreader é a nossa serifa.
- **Nada de serifa random dentro de headline sans.** Ênfase em título é `italic` da mesma família, jamais mistura de família.
- **Nada de overline em toda seção.** Overline serve para hierarquia real, e no máximo 1 a cada 3 telas. Se toda seção tem um `SELECIONADOS`, `RECENTES`, `EM DESTAQUE` uppercase por cima do título, sai.
- **Nada de "eyebrow" numerado (`01 · SEÇÃO`, `06 · como funciona`).** Isso é o vício de portfolio de agência 2018-2023; não é o nosso app.

### 7.2 Cores e superfícies

- **Nada da família bege quente + latão + oxblood + expresso** (`#f5f1ea` + `#b08947` + `#9a2436` + `#1a1714` e variantes). Essa é a paleta que a IA reproduz em todo brief "premium com alma"; ela existe listada no design skill como banida por default. Nosso `papel` `#F4F2EC` está próximo mas dele mas o acento é verde-musgo (`#3E5C42`), não latão. Ninguém desliza para latão sem justificativa explícita.
- **Nada de gradiente roxo/rosa/azul** ("AI purple", aurora mesh, "glow neon"). Zero.
- **Nada de gradiente em botão CTA.** Botão primário é sólido `musgo`.
- **Nada de gradiente em texto de headline.** Título é `tinta`. Ponto.
- **Nada de sombra preta pura.** `rgba(23,21,18,0.06-0.16)` é o suficiente.
- **Nada de `#000000` puro em nenhum lugar.** Usamos `tinta` (`#171512`) no claro e `noite` (`#141311`) no escuro.
- **Nada de fundo com "textura de papel" ou "textura de madeira".** Isso vira "app de café artesanal" imediatamente.

### 7.3 Layout

- **Nada de hero centralizado com fundo mesh gradient.** A tela de página do livro tem hero centralizado com capa como foco, mas o fundo é `papel` sólido.
- **Nada de "3 colunas de features iguais"** com 3 ícones e 3 títulos iguais. Se a informação cabe em 3 cards, cabe em 3 linhas com divisor.
- **Nada de bento grid decorativo em telas de dados** (estatísticas, histórico). Bento pode existir na landing do web (se houver), não no produto.
- **Nada de zigzag "imagem esquerda / texto direita" mais de 2 vezes seguidas.** Vale para toda seção editorial.
- **Nada de layout que não colapsa para uma coluna em mobile.** Toda tela tem que ser explícita no que acontece abaixo de 768px.
- **Nada de conteúdo essencial escondido em hover.** Mobile não tem hover.

### 7.4 Motion

- **Nada de scroll hijacking** (horizontal pan, scroll pinado, sequência de vídeo controlada pelo scroll).
- **Nada de parallax.** Nada.
- **Nada de loop infinito.** Sem shimmer perpétuo em skeleton, sem chama animada no streak, sem "float" em card.
- **Nada de marquee** (faixa horizontal de logos deslizando). Não temos "logo wall".
- **Nada de `window.addEventListener('scroll', ...)`.** Se precisar de scroll progress, usa `IntersectionObserver` na web ou `NotificationListener<ScrollNotification>` no Flutter.
- **Nada de motion no modo de foco.** Nada.

### 7.5 Conteúdo e copy

- **Zero em-dash (`—`) em qualquer texto visível ao usuário, na copy da interface, em labels, botões, mensagens de erro ou placeholder.** Substitui por hífen, dois pontos, ou reescreve a frase. Este é o traço estilístico #1 que denuncia texto gerado por IA. Vale para toda a copy do produto e para todos os documentos deste projeto, incluindo este.
- **Nada de números fake-precisos** ("94%", "4,7×", "48k leitores") em UI de exemplo. Se é mock, é `--` ou mock declarado.
- **Nada de "Utilizado silenciosamente por" ou "Confiado por leitores exigentes"** e copy poética-humilde na landing. Fala normal em pt-BR.
- **Nada de labels poéticos** ("Do balcão", "Do nosso desk", "Anotações de campo"). Título de seção é o que a seção é: "Recomendações", "Resenhas", "Estatísticas".
- **Nada de nomes genéricos** em mock ("João Silva", "Maria Souza") repetidos toda hora. Se precisa de nomes de exemplo, varia (nomes brasileiros comuns, com sobrenomes plausíveis).
- **Nada de emoji na copy da interface.** ⭐️🔥📚 só como conteúdo do usuário (comentário, resenha).
- **Nada de "Feito com ❤️" no rodapé.** Nada.

### 7.6 Componentes e assets

- **Nada de ícone desenhado à mão** (SVG `<path>` inline). Phosphor cobre; se falta, adicionamos com biblioteca, não desenhamos.
- **Nada de placeholder de capa com "livro genérico ilustrado".** Placeholder é retângulo `capa-placeholder` com título do livro em `title-sm` centralizado. Quando um livro carrega sem capa, o design do sistema já dá dignidade.
- **Nada de screenshot fake dentro de fake screen.** Se a landing do web mostra o app, é imagem real (renderizada de um device real) ou ausente.
- **Nada de card com sombra preta pura sobre `papel`.** Ver §3.5.
- **Nada de rounded-full em canto de capa de livro.** Capa tem canto vivo.
- **Nada de "toast" com cor de fundo saturada** (verde para sucesso, vermelho para erro). Toast é `papel-elevado` com barra lateral fina em `musgo` ou `rubi`.
- **Nada de recolorir a logo** para acento de estado (`rubi`, `ambar`, `broto`) ou para um segundo matiz. Ela é só `musgo` sobre `papel` ou `papel` sobre `musgo` (§3.7).
- **Nada de distorcer, sombrear, girar ou usar a logo abaixo de 24px** de altura. Sem variantes de cor da logo em disco — a cor é aplicada em runtime (§9.4).

### 7.7 Modo escuro

- **Nada de "modo dark" com background `#000000` puro.** `noite` é `#141311`.
- **Nada de inverter apenas a paleta** de claro para escuro. Modo escuro tem sua própria hierarquia de superfícies, seus próprios shadows atenuados, seu próprio acento.
- **Nada de meia página em modo escuro e meia em claro** ao rolar. Tema é lock de página inteira.

### 7.8 Interações destrutivas

- **Nada de ação destrutiva sem confirmação** (RNF-USA-04). Excluir conta, abandonar leitura, denunciar: todas passam por confirmação em modal.
- **Nada de botão destrutivo primário** (fundo `rubi`). Destrutivo é outline `rubi`, para dar mais peso à confirmação.
- **Nada de undo em ação destrutiva pesada.** Excluir conta é excluir. Abandonar uma leitura segue a máquina de estados de RN-04.
- Excluir resenha ou comentário usa modal com título direto, consequência irreversível e acento `rubi`. Confirmada a ação, o conteúdo é removido fisicamente; não se oferece undo.
- Conta com exclusão pendente abre somente uma tela de recuperação: informa a data da remoção definitiva e oferece `Cancelar exclusão` como única ação principal. A navegação normal permanece bloqueada até recuperar a conta.

### 7.9 Formulários

- **Nada de placeholder-as-label.** Label sempre acima.
- **Nada de "helper text" que só aparece após erro.** Se a regra existe (senha >= 8 caracteres), o helper aparece o tempo todo, e o erro é sinal de que o helper não foi seguido.
- **Nada de mensagem de erro genérica** ("Algo deu errado", "Erro"). Mensagem em pt-BR, acionável (RNF-USA-05).
- **Nada de campo de senha sem toggle "mostrar"** (o toggle é o único que redime placeholder-as-label; pelo menos deixa o usuário conferir).

### 7.10 Métricas e dados

- **Nada de gráfico com legenda em cores AI-purple/AI-teal** (`#7C3AED`, `#14B8A6`). Gráfico usa `musgo` como principal, `broto` como secundário, `grafite` como neutro.
- **Nada de gráfico com muitas cores.** Máximo 3 séries por gráfico. Se são mais, agrupa.
- **Nada de número exibido sem unidade.** "42" nunca aparece sozinho; é "42 páginas", "42 minutos", "42 livros".
- **Nada de "%" no número quando o contexto já é percentual.** Barra de progresso mostra "63%" ao lado, isso é o percentual.

### 7.11 Landing / web

- **Nada de "Trusted by" com logos.** Não temos parceiros, e mesmo se tivéssemos, é trabalho acadêmico.
- **Nada de "Faixa decorativa" em small mono-caps no rodapé do hero** ("LIVROS · LEITURA · COMUNIDADE"). É o pior tell de agência 2020-2024.
- **Nada de floating action button** com "Fale conosco" no canto. Não temos suporte para atender.

### 7.12 Fora de escopo por decisão (não redecidir)

Estas coisas foram cortadas em `docs/orquestador/REQUISITOS.md` §11 e nenhuma prototipagem, tela ou componente deve reintroduzi-las:

- Camada de "obra" separada de edição.
- Login social (Google/Apple), 2FA.
- Mensagem direta entre usuários.
- Clubes de leitura, grupos, fóruns.
- **Medalhas, conquistas, badges de gamificação.**
- **Ranking de leitores.**
- Leitura de e-book dentro do app.

Se o agente ou o dev vier com uma "boa ideia" de acrescentar medalhas ao perfil, a resposta é: fora de escopo. Redecidir é controle de mudança de requisitos (plano §3), não conversa de design.

---

## 8. O que fazer (estilo positivo)

O contrário de cada bala da §7 é a regra:

- **Usar Manrope na UI, Newsreader nas 3 aplicações editoriais, Space Grotesk no display, JetBrains Mono nos números.**
- **Um único acento visual (`musgo`) em toda a interface**, com `rubi`/`ambar`/`broto` como cores de estado (destrutivo, alerta, progresso).
- **Layout previsível na navegação principal**, editorial na página do livro.
- **Motion motivado, curto (`dur-fast` a `dur-base`), com easing suave (`ease-out`).**
- **Copy direta em pt-BR**, sem poesia forçada, sem em-dash.
- **Ícones da Phosphor, sempre.**
- **Modo escuro tratado como cidadão de primeira classe**, testado em cada tela junto com o claro.
- **Contraste WCAG AA em body**, AAA em headline sempre que dá.
- **Toque físico:** botão primário responde ao `active` com `scale(0.98)`. Card responde ao tap com `dur-fast` fade no background.
- **Espaço para respirar em mobile.** Padding lateral `space-5` em toda tela, gap `space-6` entre seções.
- **Confirmação em ação destrutiva.**
- **Estado vazio com desenho intencional.** Nunca "não há dados", sempre "você ainda não X. Que tal Y?" com CTA claro.

---

## 9. Como este documento se conecta ao código

### 9.1 Tokens compartilhados (RNF-USA-06)

Um único arquivo de tokens, planejado em `docs/design-system/tokens.json` pela feature P0-DS, será lido pelas duas stacks. Formato pretendido:

```json
{
  "color": {
    "papel": { "value": "#F4F2EC", "type": "color" },
    "tinta": { "value": "#171512", "type": "color" },
    "musgo": { "value": "#3E5C42", "type": "color" }
  },
  "spacing": {
    "5": { "value": "20px", "type": "dimension" }
  },
  "typography": {
    "display": {
      "value": {
        "fontFamily": "Space Grotesk",
        "fontWeight": 600,
        "fontSize": "32px",
        "lineHeight": "36px",
        "letterSpacing": "-0.01em"
      },
      "type": "typography"
    }
  }
}
```

Consumo:

- **Web (Vue + Tailwind):** um script gera `tailwind.config.js` a partir do `tokens.json`. Nenhuma cor entra no `tailwind.config` que não venha do JSON.
- **Mobile (Flutter):** um script gera `lib/design/tokens.dart` com `class DesignTokens { static const Color papel = Color(0xFFF4F2EC); ... }` e uma extensão `ThemeData` que consome esses tokens.
- **Prompts do Claude Design** (`docs/design/periodo-N/<FEATURE>/<tela>.md`): mesmo `tokens.json` é injetado como contexto do prompt, garantindo que a tela gerada usa os tokens corretos por nome.

### 9.2 Componentes: dois lados, um contrato

Cada componente central listado em §4 tem sua especificação aqui e uma implementação em cada stack:

- **Web:** componente Vue em `code/front/src/components/ui/<Component>.vue` com styling Tailwind consumindo os tokens.
- **Mobile:** widget Flutter em `code/mobile/lib/design/widgets/<component>.dart`.

Ambos referenciam os mesmos tokens e obedecem à mesma especificação de estados (default, hover, focus, active, disabled, error).

### 9.3 Protótipos

Prompts e protótipos vivem em `docs/design/`, agrupados por período e por feature: um arquivo de prompt por tela em `docs/design/periodo-N/<FEATURE>/<tela>.md` e o HTML exportado ao lado, em `docs/design/periodo-N/<FEATURE>/prototipos/<tela>.html`.

As convenções de escrita do prompt (template obrigatório, disposição dos artboards em modelo Figma, regra da versão web com desenho próprio, checklist de revisão) estão em `docs/design/AGENTS.md`.

Cada prompt recebe em contexto:

1. Este documento (`documento-de-design.md`) inteiro.
2. O `tokens.json`.
3. A seção correspondente de `docs/orquestador/REQUISITOS.md` (a tela sendo prototipada), incluindo a coluna **Web**, que decide se a tela ganha artboards de web.
4. O arquivo da feature em `docs/plano-de-desenvolvimento/periodo-N/`.

O output do Claude Design (bundle HTML na pasta `prototipos/` da feature) é referência visual e de navegabilidade, não especificação de pixel (regra 5 dos agentes, plano §7).

### 9.4 Assets de marca

Os assets vivem em `assets/imagens/`. Dois tipos, com contratos diferentes:

- **Logo (`logo-leai.svg`)** — símbolo monocromático **recolorível**. Todos os fills são `currentColor`; **um único arquivo** cobre todas as cores da marca (§3.7). O texto do wordmark **não** está no SVG: é tipográfico (fonte `wordmark`, §3.2.1).
  - **Web (Vue):** SVG inline (ou `<img>` com máscara) herdando `fill: currentColor`; a cor vem do token `musgo` via `color` no container. Inversão para `papel` é só trocar o `color`.
  - **Mobile (Flutter):** `flutter_svg`, tingindo em runtime — `SvgPicture.asset('assets/imagens/logo-leai.svg', colorFilter: ColorFilter.mode(DesignTokens.musgo, BlendMode.srcIn))` (ou `papel` sobre `musgo`). Não há variantes de cor em disco.
- **Ilustrações (`illustration-leitora-{light,dark}.svg`)** — arte **multicolorida**, não recolorível por tint. Têm **uma versão por tema** (clara e escura), selecionadas pelo tema ativo. Não passam por `ColorFilter`.

---

## 10. Nome do produto

O nome definitivo do aplicativo é **Lê Ai**. A linguagem visual definida neste documento permanece a identidade do produto sob esse nome.

---

## 11. Timeline

### Atualização 29/09/2026

- Público-alvo ampliado de pessoas entre 18 e 30 anos para todas as pessoas com 18 anos ou mais, conforme `REQUISITOS.md` v1.6.
- A mudança afeta apenas a descrição do público nos prompts. Tokens, componentes, padrões de tela e a validação de idade no cadastro permanecem iguais.

### Atualização 26/09/2026

Componentes que nasceram nos prompts de tela de F-EST (`docs/design/periodo-1/F-EST/estante.md` e `acoes-de-leitura.md`) e existiam só nos protótipos, incorporados com aprovação da dona do produto (Ana Luiza) pelo controle de mudança do plano §3.

- **§5.1:** contagem dentro do pill de filtro, linha de ordenação com o controle de ordenação (bottom sheet no mobile, `select` na web) e as oito opções (adicionados, título, autor e progresso, cada uma nos dois sentidos). O card da estante passa a receber título, autor e capa da própria listagem.
- **§5.4:** lista de ações do sheet (principal, neutras, destrutiva por último) para as transições de RN-04, com as duas confirmações de abandono de textos distintos.
- Nenhum token, valor existente, nome de componente ou decisão tipográfica foi alterado.
- **Impacto:** o contrato de `leitura` (`ItemEstante` com `livro { titulo, autor, capaUrl }` e `OrdenacaoEstante` com autor e progresso) acompanha esta mudança; registro em `docs/plano-de-desenvolvimento/periodo-1/feature-F-EST.md`.

### Atualização 23/09/2026

Componentes que nasceram nos prompts de tela de F-ACV-CADASTRO (`docs/design/periodo-1/F-ACV-CADASTRO/`) e já estavam implementados na web e no mobile, incorporados com aprovação do grupo. A especificação segue a implementação, que já resolvia as divergências entre prompt e protótipo registradas na feature.

- **§4.5:** quarta variante do card de livro, **Confirmação**.
- **§4.11 Sobreposição modal:** a base que o §5.4 só nomeava ("bottom sheet em mobile, dialog centrado em web") ganhou medidas, scrim por tema, motion, foco e as duas composições em uso, menu de ações e confirmação destrutiva. O §5.4 passou a apontar para ela.
- **§4.12 a §4.19, novos:** área de upload de imagem, barra de progresso determinada, cartão de progresso de operação longa, faixa informativa neutra, card de decisão, etiqueta de natureza do registro, linha de atribuição de dono e zona de exclusão.
- **§5.8 Modo consulta, novo**, como variante de página.
- Numeração acrescentada ao fim de cada capítulo para não renumerar seções já citadas por prompts e arquivos de feature.
- Nenhum token, valor existente, nome de componente ou decisão tipográfica foi alterado.
- **Impacto:** F-PRG usa a base do §4.11 no registro de progresso; F-LST reutiliza o §5.8 na via por lista; quem precisar de upload de imagem (o avatar de F-PERFIL, por exemplo) parte do §4.12. `docs/5.wireframe.md`, o documento da disciplina derivado deste, não enumera componentes e não muda.

### Atualização 02/09/2026

- **Marca (logo) formalizada em §3.7:** símbolo (folha/broto sobre livro aberto), os dois lockups, regra de cor (`musgo` sobre `papel` ou `papel` sobre `musgo` — nunca recolorir), área de proteção, mínimo de 24px e proibições. O documento antes não descrevia a logo.
- **Fonte da logo:** criado um slot tipográfico dedicado (`wordmark`, §3.2 e §3.2.1), **exclusivo da marca** e que não substitui as famílias de texto. A fonte definitiva é **decisão pendente**; interino é Space Grotesk 600, `-0.015em`.
- **Contrato de asset em §9.4:** `logo-leai.svg` normalizada para `currentColor` (asset monocromático único, recolorido em runtime — `color`/`currentColor` na web, `ColorFilter.srcIn` no Flutter), tingido pelo token `musgo` `#3E5C42`. O arquivo antes trazia um verde fora do token (`#395D35`) e atributos `fill` vermelhos residuais, agora removidos. Ilustrações `illustration-leitora-*` registradas como assets multicoloridos por tema, à parte da logo.
- **Grafia da marca confirmada:** o wordmark é **"Lê Ai"**, coerente com o §10.

### Atualização 01/09/2026

- **Quatro áreas de navegação fixadas na abertura da §5:** Estante, Descobrir, Feed e Perfil. O documento definia os headers tela a tela mas nunca a navegação, lacuna que o protótipo de P0-NAV vinha preenchendo por conta própria.
- **§5.1 passou a dizer o que a lupa da estante busca:** ela filtra a estante do leitor, não o acervo. Antes o ícone estava no header sem escopo declarado, e o protótipo o tratava como porta do acervo. Isso fazia o campo de busca do header web de "Minha estante" devolver o catálogo inteiro.
- **§5.7 Descobrir criada**, com o padrão da tela de busca do acervo. Numeração adicionada ao fim do capítulo para não renumerar §5.2 a §5.6, que já são citadas por prompts e arquivos de feature.
- Histograma de distribuição das notas dos leitores incorporado ao componente de notas da página do livro.
- Exclusão física de resenha/comentário ganhou confirmação irreversível; conta em exclusão pendente ganhou tela restrita de recuperação.
- Nenhum token, valor, nome de componente ou decisão tipográfica foi alterado. Os padrões §5.2 a §5.6 seguem intactos.

### Atualização 31/08/2026

- Caminhos de prompt e protótipo movidos para `docs/design/`, agrupados por período e por feature, com o HTML exportado na pasta `prototipos/` de cada feature. §9.1 e §9.3 atualizados.
- Convenções de escrita do prompt de tela fixadas em `docs/design/AGENTS.md`: template obrigatório, disposição dos artboards em modelo Figma, estados a cobrir, regra da versão web com desenho próprio e checklist de revisão.
- `docs/design-system/tokens.json` permanece a fonte canônica de tokens, sem mudança para a feature P0-DS.
- Nenhum token, valor, nome de componente, padrão de tela ou decisão tipográfica foi alterado.

### Atualização 26/08/2026

- Nome **Lê Ai** formalizado.
- Caminhos atualizados para a estrutura real do repositório.
- Modo de foco alinhado às ações de encerrar e cancelar sessão definidas em RN-16.
- Ausência de sinopse alinhada ao estado previsto em RF-ACV-19 e RN-19.
- Nenhum token, valor, nome de componente ou decisão tipográfica foi alterado.

### Criação 25/08/2026

Versão inicial, alinhada ao `docs/orquestador/REQUISITOS.md` v1.0 (22/08/2026) e ao `docs/orquestador/documento-de-arquitetura.md` v1.0 (22/08/2026). Baseline aberta.

Definido:

- Paleta em modo claro e escuro com `papel`, `tinta`, `grafite` como neutros e `musgo` como acento único.
- Stack tipográfico: Space Grotesk (display), Manrope (UI), Newsreader (editorial), JetBrains Mono (dados).
- Escalas de espaçamento (4/8/12/16/20/24/32/48/64/96), raio (6/12/16/20/24/pill), elevação (3 níveis) e motion (4 durações, 3 easings).
- Componentes centrais especificados: botão, input, estrela de avaliação, nota geral vs leitores, card de livro (3 variantes), status pill, barra de progresso, streak, item de feed, modo de foco.
- Padrões de tela para estante, página do livro, feed, registrar progresso, perfil, notificações.
- Lista explícita de coisas a evitar (`§7`) e do estilo positivo (`§8`).
- Diretriz de tokens compartilhados entre Flutter e Tailwind conforme RNF-USA-06.
