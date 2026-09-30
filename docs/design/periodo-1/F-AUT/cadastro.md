# F-AUT · Cadastro (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `Cadastro`, gerado por `docs/design/periodo-0/P0-NAV/cadastro.md`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-0/P0-NAV/cadastro.md
**Feature:** ../../../plano-de-desenvolvimento/periodo-1/feature-F-AUT.md
**Requisitos que entram:** nenhum RF novo. O que entra é **RNF-SEC-42** (política de privacidade informando dados coletados, finalidade e retenção, acessível **no cadastro** e nas configurações), critério de aceite de `feature-F-AUT.md`.
**Não funcionais:** RNF-SEC-42, RNF-SEC-40 (coleta mínima de dados pessoais), RNF-USA-03 (contraste WCAG AA)
**Regras de negócio:** nenhuma RN se aplica a esta tela
**Versão web:** sim (RF-AUT-01 tem marcação na coluna Web de `REQUISITOS.md` §5.1, e a política precisa estar acessível nas duas plataformas)

---

## 1. O que muda e por quê

Entra **um acesso à política de privacidade** a partir do cadastro, e a tela de política vista por quem ainda não tem conta.

O critério de aceite de F-AUT exige a política "acessível no cadastro e nas configurações de web e mobile". Nas configurações ela já tem lugar, em [`configuracoes.md`](configuracoes.md). No cadastro ela não tinha: o prompt do período 0 desenhou a tela sem nenhuma menção a tratamento de dados, e é isso que esta edição corrige.

**O que entra é informação, não contrato.** A linha é um aviso com link, e o link abre a política dentro do aplicativo. **Não entra checkbox de aceite**, e a proibição da seção 10 do prompt original, que veda aceite de termos com caixa de marcação, continua valendo inteira.

Nada mais muda: os cinco campos, as regras de senha e de idade, os erros de validação e de conflito e o estado de cold start ficam como estão.

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

Não redesenhe nada do que está nesta lista. Se um artboard não for citado na seção 4 ou na 5, ele fica exatamente como está no canvas.

- **Os cinco campos do formulário**, na mesma ordem, com os mesmos labels, helpers e medidas.
- **O wordmark, o título e os espaçamentos** de todos os estados mobile.
- **As duas colunas da web**, com a frase e a linha de apoio da coluna esquerda inalteradas.
- **Os estados de erro de validação e de conflito**, com as mesmas mensagens e o mesmo tratamento de borda.
- **O estado de envio com cold start**, sem spinner.
- **A copy existente inteira**, palavra por palavra.
- **A ausência de shell:** cadastro continua sem barra inferior, sem sidebar e sem sino.
- **A ausência de aceite:** nenhum checkbox entra, nem aqui nem em nenhum outro artboard.

---

## 4. Artboards que mudam

Em todos eles, o acréscimo é o mesmo e entra no mesmo lugar: **abaixo do botão primário `Criar conta`, acima da linha final que leva ao login.**

- `space-5` entre o botão primário e a linha nova.
- Linha em `caption` `grafite`, centralizada no mobile e alinhada à esquerda da coluna na web, quebrando em no máximo duas linhas: `Coletamos o mínimo de dados para manter sua conta. Veja o que guardamos e por quanto tempo na` seguido do botão textual `Política de privacidade` em `caption` peso 600 `musgo`, na mesma frase.
- O botão textual abre a política, no artboard novo da seção 5. Alvo de toque de 48px no mobile.
- A linha final `Já tem conta? Entrar` continua abaixo, com o `space-5` que já existia.

### Cadastro · Padrão (mobile)

Entra a linha com o link. O resto do artboard fica idêntico.

### Cadastro · Erro de validação (mobile)

Entra a mesma linha, no mesmo lugar, abaixo do botão primário. As mensagens de erro nos campos permanecem exatamente como estão.

### Cadastro · Enviando, com cold start (mobile)

Entra a mesma linha, com opacidade reduzida e sem foco possível, junto dos campos, enquanto o envio está em curso.

### Cadastro · Padrão (web)

Na coluna direita, entra a mesma linha abaixo do botão primário, alinhada à esquerda da coluna de 420px. O botão textual ganha `hover` com sublinhado em `dur-fast` e foco de teclado visível, entrando na ordem de tabulação entre `Criar conta` e `Entrar`.

### Cadastro · Modo escuro, mobile padrão

Entra a linha com o texto em `grafite-claro` e o botão textual em `musgo-claro`.

### Cadastro · Modo escuro, web padrão

Entra a mesma linha na coluna direita, com o mesmo tratamento.

---

## 5. Artboards novos

Dois, no fim das linhas a que pertencem. Eles desenham **a política vista por quem ainda não tem conta**, que é a mesma política de `configuracoes.md` sem o shell.

### Cadastro · Política de privacidade (mobile, 390 x 844)

Último artboard da linha 1.

- Fundo `papel`, viewport inteira, padding lateral `space-5`. **Sem barra inferior, sem sidebar, sem sino:** o visitante não tem sessão.
- Header de 72px mais a área segura: `ArrowLeft` (Phosphor, `regular`, 24px, `tinta`) à esquerda, com alvo de 48px, voltando ao cadastro, e o título `Política de privacidade` em `display` `tinta` à esquerda, alinhado à base. Nada à direita.
- `space-6` abaixo do header.
- Linha de versão em `caption` `grafite-suave`: `Versão 1.0, de 15 de setembro de 2026`.
- `space-6`.
- Quatro blocos, com `space-6` entre eles. Cada bloco é um título de seção em `title-sm` `tinta` e o texto em `body` `grafite`: `Dados que coletamos`, `Para que usamos`, `Por quanto tempo guardamos`, `Seus direitos`.
- **O texto é interface, não conteúdo editorial: ele usa Manrope, não Newsreader.** A serifa do sistema entra só em resenha, frases e sinopse.
- A tela rola, e o header ganha o divisor de 1px `linha` na base quando o conteúdo passa por baixo dele.
- **Sem aceite, sem checkbox, sem botão de concordar.** O retorno é o `ArrowLeft`.
- **Este artboard é o mesmo conteúdo do artboard `Configurações · Política de privacidade`**, com uma única diferença: aqui não há sino no header, porque não há sessão. Os dois precisam continuar idênticos no texto e na estrutura.

### Cadastro · Política de privacidade (web, 1440 x 900)

Último artboard da linha 2.

- **Sem sidebar:** o visitante não tem sessão, e o shell só existe depois dela.
- Fundo `papel`, conteúdo numa coluna de no máximo 720px centralizada na horizontal, com padding lateral `space-8`.
- No topo da coluna, botão textual `musgo` com `ArrowLeft` (Phosphor, `regular`, 20px) à esquerda do texto `Voltar para o cadastro`.
- `space-6`, título `Política de privacidade` em `display` `tinta`, linha de versão em `caption` `grafite-suave` abaixo.
- `space-8`, os mesmos quatro blocos, com `space-6` entre eles.
- **Abaixo de 768px** a coluna passa a ocupar a largura inteira com padding lateral `space-5` e o retorno vira o `ArrowLeft` do header do mobile.

**Conteúdo dos quatro blocos**, mock declarado, idêntico ao de `configuracoes.md`:

| Bloco | Conteúdo |
|---|---|
| `Dados que coletamos` | e-mail, nome de usuário, nome de exibição, data de nascimento, senha guardada apenas como hash, e o que você registra no aplicativo: livros, leituras, progresso, notas, resenhas, comentários e quem você segue. Avatar e capa de livro pessoal, quando você envia. |
| `Para que usamos` | manter sua conta e sua sessão, montar sua estante e seu feed, mostrar seu perfil conforme a privacidade que você escolheu e enviar o e-mail de recuperação de senha. Não vendemos dados e não usamos seus dados para publicidade. |
| `Por quanto tempo guardamos` | enquanto a conta existir. O token de recuperação de senha vale por 1 hora. Registros de acesso ficam por 6 meses. |
| `Seus direitos` | você pode acessar e corrigir seus dados pelo perfil, e pedir suporte pelo e-mail de contato do projeto. |

O texto jurídico final é entrega do grupo, não do protótipo. O que o protótipo fixa é a estrutura de quatro blocos, o lugar e a ausência de aceite.

---

## 6. Artboards a remover

Nenhum sai.

---

## 7. Componentes novos ou alterados

| Componente | Onde está definido |
|---|---|
| Botão textual em `musgo` dentro de uma frase em `caption` | documento-de-design §4.1 |
| Escala tipográfica, com `title-sm` de título de bloco e `body` de corpo | documento-de-design §3.2.1 |

**Componente que nasce aqui e vira pendência de incorporação ao `documento-de-design.md`** pelo controle de mudança do plano §3:

1. **A tela de documento longo sem shell**, com header de retorno, linha de versão e blocos de título mais texto. Ela é compartilhada com `configuracoes.md`, que a desenha na versão autenticada. Se o documento adotar um padrão diferente, as duas mudam juntas.

**Lembrete para depois da prototipagem.** Exportar e commitar o protótipo **não** decide nada do que está listado acima. Esses itens só passam a valer quando entrarem no `documento-de-design.md` pelo controle de mudança do plano §3, com registro em `## Timeline` e análise de impacto, e nenhum agente altera `docs/orquestador/` por conta própria. As telas do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT são prototipadas e commitadas **no mesmo lote**, e vários destes itens se repetem entre elas: faça **uma única passada de incorporação ao fim do lote**, consolidando as seções 7 de todos os prompts, e não uma alteração por tela. O acompanhamento do lote está em [`../../AGENTS.md`](../../AGENTS.md) §11.

---

## 8. Copy nova ou alterada

| Onde | Texto que entra | Texto que sai |
|---|---|---|
| Linha abaixo do botão primário | `Coletamos o mínimo de dados para manter sua conta. Veja o que guardamos e por quanto tempo na` | nada, a linha não existia |
| Botão textual na mesma linha | `Política de privacidade` | nada |
| Título da tela nova | `Política de privacidade` | nada |
| Versão | `Versão 1.0, de 15 de setembro de 2026` | nada |
| Título de bloco 1 | `Dados que coletamos` | nada |
| Título de bloco 2 | `Para que usamos` | nada |
| Título de bloco 3 | `Por quanto tempo guardamos` | nada |
| Título de bloco 4 | `Seus direitos` | nada |
| Retorno na web | `Voltar para o cadastro` | nada |

Nenhuma copy existente é substituída. Zero em-dash. Zero emoji. Os números, `1 hora` e `6 meses`, aparecem com unidade.

---

## 9. Acessibilidade e interação do que muda

- Alvo de toque de 48px no mobile no botão textual da linha nova e no `ArrowLeft` da tela de política.
- O link dentro da frase é distinguível **sem depender só de cor**: peso 600 além do `musgo`.
- Contraste WCAG AA nos dois temas. O corpo da política usa `grafite`, nunca `grafite-suave`: é informação essencial.
- Os quatro títulos da política são cabeçalhos de seção para leitor de tela, e o documento é texto real, navegável, nunca imagem nem PDF embutido.
- Ao abrir a política, o foco vai para o título da tela; ao voltar, retorna ao link que a abriu.
- Foco de teclado visível na web no link e no botão de retorno, na ordem visual.
- `prefers-reduced-motion` respeitado: o sublinhado de hover aparece sem transição.

---

## 10. O que não fazer nesta edição

**Regra da edição**

- **Não redesenhe o que não foi citado.** Nenhum artboard existente muda além do acréscimo da seção 4.
- **Não reordene os artboards** no canvas. Os dois artboards novos entram no fim das linhas 1 e 2.
- **Não reintroduza nada que a seção 10 do prompt original proíbe.** Em especial: continua proibido aceite de termos com checkbox, login social, verificação de e-mail e medidor de força de senha.
- Não altere nenhuma copy existente.

**Específico deste acréscimo**

- **Não transforme o aviso em aceite.** Nada de checkbox, nada de `Li e concordo`, nada de botão `Aceitar`.
- **Não bloqueie o botão `Criar conta`** até que a política seja aberta ou marcada.
- **Não abra a política em navegador externo, PDF ou modal com rolagem interna.** Ela é uma tela do produto.
- **Não use Newsreader** no corpo da política. Serifa é só resenha, frases e sinopse.
- **Não desenhe termos de uso** como documento separado: RNF-SEC-42 pede política de privacidade, e inventar um segundo documento cria obrigação que não existe.
- Não ponha a linha nova acima do botão primário, empurrando o formulário.
- Não use `caption` `grafite-suave` no aviso: ele é informação essencial e precisa passar em contraste de corpo.

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


**Fora de escopo, não reintroduzir**

- Sem medalhas, conquistas ou selos de gamificação.
- Sem ranking de leitores.
- Sem mensagem direta entre usuários.
- Sem clubes de leitura, grupos ou fóruns.
- Sem login social e sem autenticação de dois fatores.
- Sem leitura de e-book dentro do aplicativo.

**Formulário**

- Nada de placeholder no lugar de label.
- Nada de helper que só aparece depois do erro.
- Nada de campo de senha sem o botão de mostrar.
- Nada de validação que só existe no cliente: a mensagem reflete a regra que o servidor aplica.
