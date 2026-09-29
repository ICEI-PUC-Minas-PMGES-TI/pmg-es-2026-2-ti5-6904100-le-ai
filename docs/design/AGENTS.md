# AGENTS.md · Prompts de tela (Claude Design)

Convenções para escrever os **prompts de tela** que alimentam o Claude Design e para guardar os protótipos exportados. Complementa o [`AGENTS.md`](../../AGENTS.md) da raiz, que traz as regras gerais (branches, commits, DoD, fluxo de feature) e prevalece no que for transversal.

Fontes de verdade, nesta ordem:

| Documento | Papel |
|---|---|
| [`REQUISITOS.md`](../orquestador/REQUISITOS.md) | O que a tela precisa permitir. **Sempre vence.** A coluna **Web** de cada RF decide se a tela tem versão web. |
| [`documento-de-design.md`](../orquestador/documento-de-design.md) | Como a tela se parece e se comporta: tokens, tipografia, componentes, padrões de tela, banlist §7. |
| Arquivo da feature em [`plano-de-desenvolvimento/`](../plano-de-desenvolvimento/) | Recorte daquela entrega: quais telas existem, o que fica de fora, o que é de outro período. |

**O `documento-de-design.md` é a fonte de tudo que é visual.** Este arquivo descreve o **método** de escrever prompt e guardar protótipo; ele não guarda cópia de token, escala, componente nem banlist. Onde uma regra visual for necessária aqui, o que aparece é o ponteiro para a seção da fonte. A única exceção é o **arquivo de prompt**, que reescreve as regras por extenso porque o Claude Design não lê este repositório (§7 e §8).

**Regra 5 dos agentes (plano §7):** protótipo é referência visual, não especificação de pixel. Viewport fixo no protótipo não significa layout fixo na implementação. Como isso se traduz em código está no §10.

**Nenhum agente altera `docs/orquestador/` por conta própria.** Divergência entre o que o protótipo mostra e o que o requisito pede vira pendência no arquivo da feature.

---

## 1. Onde cada coisa mora

```
docs/design/
├── AGENTS.md                  # este arquivo
├── CLAUDE.md                  # ponteiro para este arquivo
└── periodo-N/
    ├── <ID-DA-FEATURE>/       # telas novas da feature (ID em maiúsculas: F-SESSAO)
    │   ├── <tela>.md          # o prompt
    │   └── prototipos/
    │       └── <tela>.html    # o export do Claude Design
    └── <tela>/                # edição consolidada de tela já entregue (kebab minúsculo: pagina-do-livro)
        ├── <tela>.md
        └── prototipos/
            └── <tela>.html
```

- **Uma pasta por feature**, dentro da pasta do período, usando o ID exato do arquivo da feature: `F-EST`, `F-ACV-BUSCA`, `P0-NAV`. Feature de continuação tem pasta própria: `F-EST-2` não entra em `F-EST`.
- **Um arquivo `.md` por tela**, nome em kebab-case pt-BR, sem prefixo de feature (a pasta já é a feature): `estante.md`, `registrar-progresso.md`, `modo-de-foco.md`, `cadastro-por-isbn.md`.
- **O HTML exportado usa o mesmo nome base** e fica em `prototipos/` ao lado do prompt: `prototipos/estante.md` está errado, `prototipos/estante.html` está certo.
- As pastas de período e de feature nascem junto com o primeiro prompt de cada uma. Não crie pasta vazia.
- **Prompt e HTML são commitados juntos.** HTML sem o prompt que o gerou não é reprodutível.
- **Tela já entregue não é reescrita: ela ganha um prompt de edição, um só por tela e por período.** Quando uma ou mais features de outro período mudam uma tela que já tem prompt e protótipo commitados, as mudanças de todas elas entram em **um único prompt de edição consolidado**, numa **pasta com o nome da tela** dentro do período das features: `periodo-2/pagina-do-livro/pagina-do-livro.md` edita a tela de `periodo-1/F-ACV-BUSCA/pagina-do-livro.md` com os RFs de F-ACV-NOTA, F-ACV-DESCOBERTA, F-EST-2, F-AVA-2, F-LST, F-REC-P2P e F-MOD. A edição não tem feature dona; cada feature envolvida aponta para a pasta da tela no seu arquivo. Pasta de feature usa o ID em maiúsculas, pasta de tela usa kebab minúsculo, e as duas convivem no mesmo período. O arquivo antigo não é alterado. Regras no §2.1, fluxo no §3.1 e template no §6.1. *(Regra consolidada adotada em 27/09/2026, antes do primeiro prompt de edição; até então a edição morava na pasta da feature que pedia a mudança.)*

Não existe inventário central de telas neste diretório. A lista de telas de cada feature vive no arquivo da feature; duplicar aqui seria mais um lugar para atualizar e sair de sincronia.

---

## 2. Como derivar a lista de telas de uma feature

Antes de escrever qualquer prompt, leia, nesta ordem:

1. A seção `## Especificação` do arquivo da feature, blocos `### Frontend Web (code/front)` e `### App Flutter (code/mobile)`. É ali que o escopo de interface daquela entrega está descrito.
2. A tabela de RFs da seção correspondente de [`REQUISITOS.md`](../orquestador/REQUISITOS.md) §5, para os IDs, a prioridade e a coluna **Web**.
3. As regras de negócio (RN) citadas no cabeçalho da feature, porque elas definem os estados que a tela precisa mostrar (máquina de estados de RN-04, inatividade de RN-05, privacidade de RN-08, modo de foco de RN-16).
4. Os padrões de tela já fixados no [`documento-de-design.md`](../orquestador/documento-de-design.md) §5, quando a tela é uma das seis já especificadas: estante, página do livro, feed, registrar progresso, perfil, notificações.

### Regras de recorte

- **Uma tela é um destino navegável** ou **um bottom sheet / dialog com estados próprios**. "Registrar progresso" é tela, mesmo sendo bottom sheet no mobile (design §5.4).
- **Confirmação de ação destrutiva não é tela.** É um estado dentro do prompt da tela que dispara a ação.
- **Fluxo com passos separados vira um `.md` por passo** quando cada passo ocupa o viewport inteiro. Cadastro por ISBN, ISBN não encontrado e cadastro pessoal (RF-ACV-05, 06, 08) são três arquivos.
- **RF de sistema não gera tela.** Job diário, ingestão de dump, cache de capa, recálculo assíncrono: sem prompt. O cliente só exibe o efeito, e o efeito é um estado de outra tela.
- **Elemento que uma feature acrescenta a uma tela de outra feature do mesmo período não vira arquivo novo.** RF-EST-08 exibe o número de conclusões **na página do livro**, que pertence a F-ACV-BUSCA: isso é um estado a acrescentar em `F-ACV-BUSCA/pagina-do-livro.md`, com o RF citado ali. O prompt mora junto da tela, não junto da feature que pediu o dado. Quem pediu registra a dependência no seu próprio arquivo de feature. **Quando a tela já foi entregue**, com prompt e protótipo commitados, a regra é outra: §2.1.
- **A tela tem versão web quando pelo menos um dos RFs dela tem `✅` na coluna Web.** Se todos estão marcados com traço, a tela é só mobile.
- **Desafios, gamificação e notificações nunca ganham seção web** (`REQUISITOS.md` §2.1, fora do escopo do cliente web), mesmo que algum RF pareça compatível.
- **Nada de reintroduzir escopo cortado.** O `documento-de-design.md` §7.12 e o `REQUISITOS.md` §11 listam o que não existe: medalhas, conquistas, ranking de leitores, mensagem direta, clubes de leitura, login social, leitura de e-book no app, camada de obra. Se um prompt precisa de uma dessas para funcionar, o prompt está errado.

### 2.1 Tela já entregue: o arquivo novo é um prompt de edição

**Quando aplica.** A tela já tem `.md` e `prototipos/<tela>.html` commitados, e uma feature de outro período muda o que ela faz. RF-AVA-09 acrescenta Markdown e pré-visualização à tela de escrever resenha, entregue no Período 1; RF-AVA-06/07, RF-EST-09 e RF-ACV-21 mudam a página do livro pelo mesmo caminho.

**A regra.** O arquivo novo **não** é um prompt de tela nova nem uma cópia editada do anterior. Ele é um **prompt de edição**, escrito para ser rodado **sobre o canvas que já existe** daquela tela no Claude Design. Ele acrescenta, substitui e remove o que estiver descrito nele, e tudo que não estiver descrito permanece como está. Isso precisa estar **declarado na primeira linha do arquivo**, no aviso do §6.1: quem for rodar o prompt tem que saber, antes de colar, que é edição e em qual canvas.

**O que decorre disso:**

- **O arquivo do período anterior não é alterado.** Ele continua sendo a única coisa que reproduz o protótipo daquele período, inclusive a seção 10, cujas proibições estavam certas para o escopo dele. Ele só ganha, no cabeçalho de referências, a linha `**Editada por:**` apontando para o arquivo novo.
- **Um prompt por tela, com todas as features do período.** O cabeçalho lista `**Features:**` e agrupa `**Requisitos que entram:**` por feature. Desenhar as mudanças juntas evita que edições separadas disputem o mesmo espaço (header, barra de ações) e deixa uma única referência visual para todas as features.
- **Ponteiros nos dois sentidos.** O arquivo novo abre com `**Edita:** ../../periodo-N/<ID>/<tela>.md`; o antigo recebe `**Editada por:** ../../periodo-N/<tela>/<tela>.md`.
- **O HTML resultante vai para o `prototipos/` da pasta nova**, com o mesmo nome base. O HTML do período anterior permanece onde está: os dois juntos são o histórico visual da tela.
- **Cada feature envolvida registra no seu arquivo** que a tela de outro período foi editada, apontando para a pasta da tela, como pendência e como item da divergência protótipo × implementação (Definition of Done).
- **Ainda não exportada não é edição.** Se a tela tem prompt mas nenhum protótipo commitado, corrija o próprio arquivo, no lugar. Prompt de edição só existe para o que já foi entregue.

---

## 3. Fluxo de trabalho

1. **Derivar as telas** da feature conforme o §2.
2. **Escrever o `.md`** no template do §6, um arquivo por tela.
3. **Colar o arquivo inteiro** no Claude Design, no projeto `LeAí`, que já carrega o design system. O arquivo é autocontido: o bloco de contexto do design do §7 garante que o resultado não depende do que o projeto lembra.
4. **Revisar os artboards** contra o checklist do §9. Se algo saiu fora da banlist, corrija o prompt e gere de novo; não corrija só o HTML, ou o prompt deixa de reproduzir o protótipo.
5. **Exportar o HTML** para `prototipos/<tela>.html`.
6. **Commitar prompt e HTML juntos.** Se o protótipo divergir do que a implementação precisa fazer, registrar a divergência no arquivo da feature (item do Definition of Done).

### 3.1 Fluxo do prompt de edição

Para o caso do §2.1. Muda o passo 3 e o passo 5.

1. **Escrever o `.md`** no template do §6.1, em `periodo-N/<tela>/`, reunindo as mudanças de todas as features do período que mexem na tela.
2. **Abrir no Claude Design o canvas já existente da tela**, o mesmo que gerou o protótipo commitado. Não comece um canvas em branco: o prompt pressupõe os artboards que já estão lá.
3. **Colar o arquivo inteiro.** Ele continua autocontido quanto ao design: o bloco de contexto do §7 é obrigatório também aqui, porque a edição pode ser rodada em outra sessão, e o que não estiver escrito não existe para o Claude Design.
4. **Revisar contra o checklist do §9, aplicado ao canvas inteiro**, e não só aos artboards novos: o que era para permanecer precisa ter permanecido.
5. **Exportar o HTML** para o `prototipos/` da pasta nova. O protótipo anterior fica onde está.
6. **Commitar prompt e HTML juntos**, mais a linha `**Editada por:**` no arquivo da tela original e o registro no arquivo de cada feature envolvida.

---

## 4. Modelo Figma: como os artboards ficam dispostos

O canvas simula um arquivo de Figma. Isso é obrigatório e precisa estar escrito dentro de cada prompt.

- **Todos os artboards lado a lado no mesmo canvas**, cada um simulando o viewport de um aparelho. Nunca uma tela por página, nunca uma página rolável com as variações empilhadas dentro do mesmo frame.
- **Linha 1: mobile**, viewport `390 x 844`. Estados da esquerda para a direita na ordem em que o usuário os encontra.
- **Linha 2: web**, viewport `1440 x 900`, quando a tela tem versão web (§2). Alinhada abaixo da linha mobile.
- **Linha 3: modo escuro**, no mínimo o estado padrão de cada plataforma que a tela tem.
- **Cada artboard leva um rótulo acima**, no formato `<Nome da tela> · <estado>`, e o viewport abaixo. Rótulo e viewport são chrome do canvas, não elementos da interface: não aparecem dentro do frame.
- **Espaçamento generoso entre artboards** para que a leitura lado a lado funcione, com as linhas claramente separadas.
- **Toda tela autenticada é desenhada dentro do shell** definido em [`periodo-0/P0-NAV/shell-de-navegacao.md`](periodo-0/P0-NAV/shell-de-navegacao.md): barra inferior no mobile, sidebar retrátil na web e o padrão de header com o sino. O prompt da tela **descreve o shell por extenso** e o mantém idêntico, porque o Claude Design não lê este repositório. Telas de autenticação e o modo de foco (RN-16) são as exceções: elas ocupam a viewport sem shell.

### Estados a cobrir

Inclua todos os que fizerem sentido para a tela, e diga no prompt por que um deles não se aplica quando for o caso:

| Estado | O que mostrar |
|---|---|
| Padrão | A tela com dados reais e plausíveis. |
| Vazio | Estado vazio com desenho intencional e CTA claro, na forma que o design define (§5.1, §8). Nunca "não há dados". |
| Carregando | Skeleton com a forma do layout final, na forma que o design define (§3.6, §7.4). |
| Erro | Erro inline no campo ou banner, na forma que o design define (§4.2). Mensagem em pt-BR e acionável (RNF-USA-05). |
| Estados próprios | Os que a regra de negócio cria: filtro de status ativo, leitura em risco (RN-05), sinopse ausente (RF-ACV-19), resenha com spoiler oculto (RF-AVA-03), perfil privado sem seguimento (RN-08), campo com validação negativa. |

O viewport é referência, não especificação. O mobile é Flutter, o web é SPA responsiva, e a implementação não precisa bater pixel com o artboard.

---

## 5. A versão web tem desenho próprio

A web **não** é a coluna mobile esticada dentro de uma tela larga. Quando a tela tem versão web, o prompt descreve um layout desenhado para desktop, com os padrões que se espera de uma aplicação web.

**O que a web ganha:**

- **Navegação persistente** em topbar ou sidebar, com o item ativo destacado. Nada de barra inferior de navegação no desktop.
- **Grid multicoluna**, com o número de colunas por breakpoint que o design fixa (§5.1). Listas ganham colunas ou painel lateral em vez de uma coluna central estreita.
- **Padding lateral maior** a partir de `md`, conforme a escala de espaçamento (§3.3).
- **Dialog centrado no lugar de bottom sheet** (§5.4).
- **Estados de ponteiro:** `hover` em card, link e botão; foco de teclado visível em todo elemento interativo; `disabled` em input (§4.2).
- **Medidas próprias de web** para altura de botão e de campo (§4.1, §4.2).
- **Densidade um pouco maior** em telas de dados, aproveitando a tela grande sem virar dashboard.
- **Layout de duas colunas** onde a informação pede: página do livro com capa e ficha à esquerda e conteúdo editorial à direita, perfil com identidade fixa à esquerda e abas à direita.

**O que a web não faz:**

- Nada de conteúdo essencial escondido em `hover` (§7.3).
- Nada de layout que não colapsa para uma coluna abaixo de 768px. O prompt declara explicitamente o que acontece nesse ponto.
- Nada de tela mobile centralizada num container estreito sobre fundo vazio. Isso é o erro que o prompt existe para evitar.
- Nada de bento grid decorativo em tela de dados, nada de hero de landing dentro do produto (§7.3, §7.11).

**Nota que todo prompt com versão web precisa carregar:** a SPA em Vue é responsiva. No viewport de celular ela usa o desenho mobile, no desktop usa o desenho web. Os dois artboards são os dois extremos do mesmo componente responsivo, não dois produtos.

---

## 6. Template obrigatório do arquivo de prompt

O arquivo inteiro é colável no Claude Design. O bloco de referências do topo serve de ancoragem e não atrapalha a geração.

````markdown
# <ID da feature> · <Nome da tela>

**Feature:** ../../../plano-de-desenvolvimento/periodo-N/feature-<ID>.md
**Requisitos:** RF-XXX-NN, RF-XXX-NN
**Regras de negócio:** RN-NN
**Versão web:** sim (RF-XXX-NN tem marcação na coluna Web) | não (motivo)

## 1. Contexto

Para que serve a tela, quem usa, de onde se chega, para onde se vai e qual dos
três mecanismos do produto ela sustenta (registro, meta, pertencimento).

## 2. Contexto do design

<bloco de contexto do design, transcrito do documento-de-design conforme o §7 do AGENTS.md>

## 3. Dados que aparecem na tela

Lista dos campos reais com valores de exemplo.

## 4. Artboards mobile (390 x 844)

### 4.1 <Estado>
Layout de cima para baixo, componente por componente, com token por nome e copy literal.

### 4.2 <Estado>
...

## 5. Artboards web (1440 x 900)

### 5.1 <Estado>
...

(Quando não há versão web: uma linha declarando isso e citando a coluna Web dos RFs.)

## 6. Artboards em modo escuro

Quais estados repetir no escuro e o que muda de superfície e de acento.

## 7. Componentes do design system usados

Lista com a seção do documento-de-design que define cada um.

## 8. Copy completa

Todo texto visível, literal.

## 9. Acessibilidade e interação

Contraste, alvo de toque, foco, motion, confirmação de ação destrutiva.

## 10. O que não fazer nesta tela

Os itens aplicáveis do documento-de-design §7, reescritos por extenso (ver §8 do AGENTS.md), mais o que for específico desta tela.
````

### Como preencher cada seção

- **§3 Dados que aparecem na tela.** Valores plausíveis em pt-BR. Nomes brasileiros variados, com sobrenomes plausíveis, sem repetir os mesmos dois em toda tela (design §7.5). Livros reais ou títulos convincentes com autor e editora coerentes. **Todo número com unidade:** "42 páginas", "18 minutos", "7 livros", nunca "42" sozinho (design §7.10). Nada de número fake-preciso do tipo "94%" ou "48k leitores"; se o valor é mock, declare que é mock.
- **§4 e §5 Artboards.** Descreva o estado de cima para baixo, componente por componente. Cite a seção do `documento-de-design.md` que define cada componente ("status pill conforme §4.6", "barra de progresso conforme §4.7"). Use **token por nome**, nunca classe de framework nem hex solto no corpo do texto: `papel`, `papel-elevado`, `tinta`, `grafite`, `musgo`, `title-sm`, `body`, `caption`, `space-5`, `radius-full`, `elev-1`, `dur-base`. Escreva a copy literal no lugar em que ela aparece.
- **§6 Modo escuro.** Modo escuro é lock de página inteira (design §3.1.2). Diga que superfície elevada fica **mais clara** que o fundo, que `musgo-claro` é o acento e que os shadows têm metade da opacidade, porque a hierarquia no escuro vem da cor de superfície e do divisor `linha-noite`.
- **§8 Copy completa.** Todo texto visível, literal, em pt-BR. **Zero em-dash.** Zero emoji. Título de seção diz o que a seção é ("Resenhas", "Estatísticas"), sem label poético. Mensagem de erro específica e acionável, nunca "Algo deu errado".
- **§9 Acessibilidade e interação.** Contraste WCAG AA no corpo, AAA no título quando der. Alvo de toque de 48px no mobile. Foco de teclado visível na web. `prefers-reduced-motion` respeitado. Toda ação destrutiva com confirmação em modal (RNF-USA-04), botão destrutivo em outline `rubi`, nunca preenchido.

### 6.1 Template do prompt de edição

Para o caso do §2.1. Mesmo cabeçalho de referências, mais o aviso de edição, e as seções recortadas no que muda. **Não repita os artboards que continuam iguais**: declare que permanecem.

````markdown
# <ID da feature> · <Nome da tela> (edição)

> **Prompt de edição.** Rode este prompt **sobre o canvas já existente** de `<Nome da tela>`, gerado por `<caminho do prompt original>`. Ele **não** cria um canvas novo: acrescenta, substitui e remove só o que está descrito abaixo. **Tudo que não estiver aqui permanece exatamente como está.**

**Edita:** ../../periodo-N/<ID>/<tela>.md
**Features:** ../../../plano-de-desenvolvimento/periodo-N/feature-<ID>.md, ../../../plano-de-desenvolvimento/periodo-N/feature-<ID>.md
**Requisitos que entram:** <ID>: RF-XXX-NN · <ID>: RF-XXX-NN
**Regras de negócio:** RN-NN
**Versão web:** sim (RF-XXX-NN tem marcação na coluna Web) | não (motivo)

## 1. O que muda e por quê

O recorte da edição em poucas linhas: qual requisito entra, o que ele acrescenta à tela e o que deixa de valer do escopo anterior.

## 2. Contexto do design

<bloco de contexto do design, transcrito conforme o §7. Obrigatório também na edição.>

## 3. O que permanece intocado

Lista explícita: shell, header, cabeçalho de conteúdo, artboards que não mudam, copy que não muda. É o que impede a edição de virar um redesenho.

## 4. Artboards que mudam

Um bloco por artboard existente, **chamado pelo rótulo que ele já tem no canvas**, dizendo o que entra, o que sai e o que fica.

## 5. Artboards novos

Mobile, web e escuro, no mesmo formato do §6, com o rótulo no padrão `<Nome da tela> · <estado>` e a posição na linha do canvas.

## 6. Artboards a remover

Com o motivo. Se nenhum sai, escreva que nenhum sai.

## 7. Componentes novos ou alterados

Com a seção do documento-de-design que define cada um, e a lista do que nasce aqui e vira pendência de incorporação pelo controle de mudança (plano §3).

## 8. Copy nova ou alterada

Só o delta, literal, com a copy substituída ao lado da que entra.

## 9. Acessibilidade e interação do que muda

## 10. O que não fazer nesta edição

Os itens aplicáveis do documento-de-design §7 reescritos por extenso, mais a regra própria da edição: não redesenhar o que não foi citado, não reordenar artboard existente e não reintroduzir o que a seção 10 do prompt original proibia e continua valendo.
````

---

## 7. Bloco de contexto do design

O [`documento-de-design.md`](../orquestador/documento-de-design.md) é a **fonte**. Este arquivo não guarda cópia de token, hex, escala, duração nem regra de componente: guardar seria criar uma segunda fonte, que sai de sincronia na primeira revisão do design.

A assimetria que governa a escrita do prompt:

| Arquivo | Regra |
|---|---|
| Arquivos do projeto (este `AGENTS.md`, arquivos de feature, `AGENTS.md` de cada stack) | **Apontar para a fonte.** Citar a seção do `documento-de-design.md` e seguir em frente. |
| Arquivo de prompt em `docs/design/.../<tela>.md` | **Reescrever por extenso.** O Claude Design não lê este repositório: o que não estiver escrito no prompt não existe para ele. |

**O prompt é o kickstart, não a fonte visual final.** Ele dá a partida no design dentro do Claude Design; a partir daí o desenho continua sendo trabalhado **lá dentro**, e o resultado aprovado passa a viver no **protótipo `.html`**, não no `.md`. O prompt fica desatualizado por natureza — cada nova iteração no Claude Design não volta para o repositório. Para **implementar** uma tela, a fonte é o protótipo renderizado, nunca o prompt (ver §10).

Por isso todo prompt abre com um **bloco de contexto do design** na sua seção 2, transcrito do `documento-de-design.md` com os valores literais. O bloco precisa cobrir, no mínimo:

| O bloco precisa dizer | Fonte |
|---|---|
| Produto, público, personalidade e o que o design não é | §1 |
| Dials `5 / 4 / 4` e as duas exceções: modo de foco em `1 / 1 / 1`, página do livro com variance 7 | §2, §4.10, §5.2 |
| Paleta clara e escura com os hex, e a regra do acento único mais as cores de estado | §3.1.1, §3.1.2, §3.1.3 |
| As quatro famílias tipográficas e os três únicos lugares onde a serifa entra | §3.2, §3.2.2 |
| A escala tipográfica por nome semântico, com tamanho, entrelinha e peso | §3.2.1 |
| A escala de espaçamento e o padding lateral de mobile e de web | §3.3 |
| A escala de raio, com a exceção declarada da capa de livro | §3.4 |
| Os três níveis de elevação, tingidos no hue de `tinta` | §3.5 |
| Durações, easings e as regras de motion | §3.6 |
| Iconografia Phosphor: família única, peso padrão, peso de estado ativo, tamanhos | §6 |
| Modo escuro como lock de página inteira, com superfície elevada mais clara que o fundo | §3.1.2 |

Regras de transcrição:

- **Copie o valor, não a impressão.** `#3E5C42`, `260 ms`, `48px`, `space-5`. Nada de "verde escuro" ou "transição rápida".
- **Não invente valor que a fonte não tem.** Se o `documento-de-design.md` não define, o prompt não decide: vira pendência no arquivo da feature.
- **Cite a seção de origem** ao lado de cada componente descrito nos artboards ("status pill conforme §4.6"), para que a revisão consiga conferir contra a fonte.
- Se a fonte mudar, os prompts já escritos ficam desatualizados. Revisar os prompts é parte da análise de impacto de qualquer alteração no `documento-de-design.md` (plano §3).

---

## 8. Banlist

A banlist do projeto é o [`documento-de-design.md`](../orquestador/documento-de-design.md) **§7, inteiro**, mais o §7.12 que lista o escopo cortado por decisão. Este arquivo não repete os itens.

Mapa das subseções, para o autor do prompt saber quais ler:

| Subseção | Tema |
|---|---|
| §7.1 | Tipografia: fontes banidas, mistura de família, overline, eyebrow numerado |
| §7.2 | Cores e superfícies: paleta banida, gradiente, preto puro, sombra, textura |
| §7.3 | Layout: hero, colunas iguais, bento, zigzag, colapso em mobile, hover |
| §7.4 | Motion: scroll hijack, parallax, loop infinito, marquee, modo de foco |
| §7.5 | Conteúdo e copy: em-dash, número fake-preciso, label poético, nome genérico, emoji |
| §7.6 | Componentes e assets: ícone à mão, placeholder de capa, raio na capa, toast |
| §7.7 | Modo escuro: preto puro, paleta invertida, tema pela metade |
| §7.8 | Interações destrutivas: confirmação, botão preenchido, undo |
| §7.9 | Formulários: placeholder como label, helper condicional, erro genérico |
| §7.10 | Métricas e dados: cor de gráfico, número de séries, unidade, percentual |
| §7.11 | Landing e web: logo wall, faixa decorativa, botão flutuante |
| §7.12 | Fora de escopo por decisão: medalhas, ranking, mensagem direta, clube, login social, e-book |

Na seção 10 do prompt, **reescreva por extenso** os itens aplicáveis, na imperativa, porque o Claude Design não tem o documento. Sempre aplicáveis, em toda tela: §7.1, §7.2, §7.4, §7.5, §7.6, §7.7 e §7.12. Entram conforme a tela: §7.3 quando há layout multicoluna, §7.8 quando há ação destrutiva, §7.9 quando há formulário, §7.10 quando há número ou gráfico, §7.11 quando há superfície de web.

---

## 9. Checklist antes de exportar

Verificável olhando o canvas gerado. Cada item aponta para a regra na fonte. **Em prompt de edição (§2.1), o checklist vale para o canvas inteiro depois da edição**, e não só para os artboards novos:

- [ ] Todos os estados relevantes estão presentes, incluindo vazio, carregando e erro (§4 deste arquivo).
- [ ] Modo escuro presente, no mínimo o estado padrão de cada plataforma, com o tratamento de superfície de design §3.1.2.
- [ ] Os artboards estão lado a lado no canvas, cada um com o rótulo acima e o viewport abaixo (§4 deste arquivo).
- [ ] A linha web tem desenho próprio de web, não é a tela mobile esticada nem centralizada num container estreito (§5 deste arquivo).
- [ ] Um único acento em toda a tela, com as cores de estado restritas ao seu contexto (design §3.1).
- [ ] Componentes conferem com a especificação de design §4: capa, status pill, progresso, estrela, botão, input, streak, item de feed.
- [ ] Nenhum item da banlist de design §7 aparece no canvas, com atenção a §7.1, §7.2, §7.5 e §7.6, que são os que mais escapam.
- [ ] Nenhum item do escopo cortado de design §7.12 foi reintroduzido.
- [ ] Contraste conferido nos dois temas: texto secundário e terciário dentro do que design §3.1.1 e §3.1.2 permitem.
- [ ] A copy do canvas bate com a seção 8 do prompt, sem em-dash e sem emoji.

Se um item falhar, corrija o **prompt** e gere de novo. Corrigir só o HTML quebra a reprodutibilidade.

---

## 10. Do protótipo para a implementação

Vale para quem for implementar a tela em [`code/front`](../../code/front/AGENTS.md) ou [`code/mobile`](../../code/mobile/AGENTS.md). A referência é o **protótipo**, aberto no navegador.

**A fonte visual é o protótipo renderizado, não o prompt.** O `.md` é só o kickstart (ver §7): depois da geração, o desenho evolui **dentro do Claude Design** e o aprovado vai para o `.html`, não para o prompt. **Nunca implemente a partir do prompt** — ele está desatualizado por natureza. Abra o protótipo `.html` no navegador (ele se resolve sozinho: capas via `<image-slot>`, ilustrações e avatares viram imagem pelo runtime do Claude Design) e implemente contra o que vê ali. Ao terminar, ponha a tela rodando **lado a lado** com o protótipo e confira — passo obrigatório, não opcional.

**O protótipo é o desenho aprovado.** "Referência visual" não é licença para redesenhar a tela na hora de codar. A tela implementada precisa ficar **visualmente muito próxima** do protótipo: mesma hierarquia, mesma ordem de blocos, mesmo agrupamento, mesma densidade, mesmos pesos tipográficos, mesmo uso de cor, **e as ilustrações e estados vazios que ele mostra** (por exemplo a arte de "nenhum resultado"). Quem olhar o protótipo e a tela lado a lado deve reconhecer a mesma tela.

**O protótipo não é especificação de pixel** (regra 5 dos agentes, plano §7). O que se copia é a **estrutura**, não as coordenadas. O HTML exportado resolve o layout do jeito que dá para um artboard de largura fixa; a implementação resolve do jeito certo para a plataforma.

**Na web (`code/front`, Vue + Tailwind):**

- Reconstruir com CSS Grid e flexbox, unidades relativas, `max-width` no container e os breakpoints padrão. Toda tela precisa funcionar entre o viewport de celular e o desktop.
- **Nada de `position: absolute`** para montar layout que é fluxo. Nada de largura ou altura fixa em px para reproduzir o artboard. Nada de `transform: scale()` na página para "fazer caber".
- Os artboards de `390 x 844` e `1440 x 900` são os **dois extremos do mesmo componente responsivo**, não dois arquivos. Entre eles o layout se adapta, e o ponto de virada é o que o prompt declarou (§5).

**No mobile (`code/mobile`, Flutter):**

- Montar com os widgets de layout da plataforma (`Column`, `Row`, `Expanded`, `Flexible`, `Wrap`, `LayoutBuilder`, `MediaQuery`) e com o tema gerado por P0-DS.
- **Nada de `Stack` com `Positioned`** para montar o que é fluxo vertical. Nada de tamanho fixo que quebre em outro tamanho de tela.
- Respeitar o escalonamento de texto do sistema: se o usuário aumenta a fonte, a tela acomoda em vez de cortar.

**Nos dois lados:**

- **Token nomeado, nunca valor copiado do HTML.** Cor, espaçamento, raio, sombra e duração entram pelo tema de P0-DS. Hex ou px lidos do protótipo e colados no código são bug de implementação.
- **Alvo de toque e contraste vêm do requisito**, não do artboard: 48px de alvo no mobile e WCAG AA no corpo continuam valendo mesmo que o protótipo pareça permitir menos.
- **Falta de contrato não poda o design.** Se implementar o protótipo aprovado exige um dado que a API ainda não devolve (por exemplo, a biografia no card de busca), **não corte o elemento em silêncio.** O protótipo continua sendo o alvo: leve o conflito à tona como **pergunta ao dono da feature / a quem decide** — pode ser o caso de mudar o contrato (spec OpenAPI + backend), e não a tela. Quem implementa decide junto; o proibido é omitir o elemento sem levantar a questão. A decisão (mudou o contrato ou cortou de propósito) fica registrada no arquivo da feature.
- **Divergência é registrada, nunca silenciada.** Se a plataforma, um requisito ou a acessibilidade obrigarem a se afastar do protótipo, a divergência entra no arquivo da feature (item do Definition of Done). Não se altera o protótipo por fora nem se implementa diferente sem registro.

---

## 11. Pendências

- **`docs/design-system/tokens.json` existe: pendência fechada.** Entregue por [P0-DS](../plano-de-desenvolvimento/periodo-0/feature-P0-DS.md), ele é a fonte canônica única de tokens (RNF-USA-06), derivada do documento-de-design §3.1 a §3.6, e dele são gerados o `tailwind.config` da web e o `lib/design/tokens.dart` do Flutter. **O bloco de contexto do design do §7 passa a derivar do JSON**, e não mais de uma transcrição manual do documento: ao escrever ou revisar um prompt, confira cor, escala, espaçamento, raio, elevação e motion contra `tokens.json`. Os prompts continuam citando token **por nome** no corpo dos artboards, com os hex apenas dentro do bloco do §7, porque o Claude Design não lê este repositório.
- **Prompts escritos até aqui:** os três do período 0, em [`periodo-0/P0-NAV/`](periodo-0/P0-NAV/), os do período 1 em [`periodo-1/`](periodo-1/) e, desde 27/09/2026, os do período 2 em [`periodo-2/`](periodo-2/), escritos em lotes: o primeiro trouxe `F-SESSAO/modo-de-foco.md`, `F-SESSAO/encerrar-sessao.md`, `F-DSF/desafios.md`, `F-DSF/criar-desafio.md` e `F-EST-2/historico-de-leituras.md`, com protótipos exportados em 28/09/2026; o segundo, de 28/09/2026, trouxe `F-ACV-DESCOBERTA/pagina-do-autor.md`, `pagina-da-editora.md` e `pagina-da-serie.md` e as primeiras edições consolidadas, `descobrir/descobrir.md` e `pagina-do-livro/pagina-do-livro.md`, com protótipos por exportar; o terceiro, de 29/09/2026, trouxe `F-LST/lista.md`, `listas-do-leitor.md`, `criar-lista.md` e `adicionar-a-lista.md` e `F-REC-P2P/recomendar-livro.md` e `recomendacoes-recebidas.md`.
- **Componentes nascidos no lote 1 do período 2, incorporação pendente** (seção 7 de cada prompt; decidir depois dos protótipos, de uma vez, pelo controle de mudança): estado pausado do modo de foco e seletor de pausa de 5, 10 ou 15 minutos, sheets sem motion dentro da sessão (exceção ao §4.11 coerente com o §4.10), formato `h:mm:ss` do cronômetro, variante de encerrar sessão do §5.4 e a página cheia de sessão pendente; card de desafio (ativo, cumprido, pausado), pill `Pausado`, item de menu com linha explicativa, chips de escolha única e campo numérico com unidade; linha de ocorrência de conclusão, cabeçalho de ano preso ao topo e resultado agrupado por livro no histórico.
- **Componentes nascidos no lote 2 do período 2, incorporação pendente** (mesma regra do lote 1): esqueleto de página de catálogo (autor, editora, série: header com o tipo da página, bloco de identidade sem imagem, cards da variante Busca em grid de 3 colunas na web), seção condicional `Biografia` com `Fonte: OpenLibrary`, falha de paginação inline, linha `Livro N` e grupo `Sem número na série`; botão de filtros com contagem, chips de filtros aplicados (`Campo: valor` com `Limpar filtros`), faixa numérica mínimo e máximo com validação cruzada, bloco `Filtros` no painel web, item de recomendação recebida (`<nome> te recomendou · <tempo>`), vazio de seção em uma linha; na página do livro, botão quadrado só com ícone (favorito), superfície do componente de notas §4.4, anatomia do histograma, chip de assunto com lupa e quebra de linha, linha de ficha com link e `CaretRight`, linha de reações, estilo do Markdown renderizado, blockquote de frase com `Página N · @username` e dropdown de menu na web. **Divergências a decidir:** o dropdown da web contraria o §4.11 (menu vira dialog centrado a partir de 768px); o §5.2 pede chip de assunto em caixa alta, e os chips do Descobrir do P1 não usam; o §5.7 diz "sem destaques" e a aterrissagem agora tem a seção de recomendações.
- **Componentes nascidos no lote 3 do período 2, incorporação pendente** (mesma regra): linha de livro numerada, modo de reordenação no mobile (`Reordenar` e `Concluir`, alça no lugar do `DotsThree`) e controles de ordem sempre visíveis na web, linha de visibilidade herdada do perfil, remoção leve sem confirmação, card de lista com mosaico de capas em leque, terceira aba `Listas` no perfil web e seção `Listas` no mobile; formulário em tela cheia sem shell com `X`, confirmação que troca o conteúdo do mesmo dialog, contador de caracteres, área de texto de várias linhas, linha de marcar e desmarcar que salva na hora (`CheckCircle`/`PlusCircle`), sheet sem botão de salvar; seletor de destinatários com caixa de seleção e busca local, linha de pessoa desabilitada com o motivo, barra de envio fixa com contagem, faixa de alerta `ambar-fundo`, toast de confirmação com ação e posição definida, variante do item de recomendação com `DotsThree`. **Divergências a decidir:** remover da lista e descartar recomendação sem confirmação, contra o RNF-USA-04 se o grupo considerar destrutivo; toast de sucesso, que o P1 evita; criar lista sem shell × `criar-desafio` com shell; dropdown web de novo contra o §4.11; duração do toast não definida.
- **Logo do produto: resolvida em 02/09/2026.** A marca deixou de estar em aberto. O `documento-de-design.md` §3.7 define o símbolo (folha sobre livro aberto), o **símbolo isolado** e o **lockup horizontal**, a regra de cor única (`musgo` sobre `papel` ou `papel` sobre `musgo`, nunca recolorida, nunca com dois matizes), a área de proteção de ao menos a largura da folha e o mínimo de 24px de altura. O §3.2.1 criou o token `wordmark`, **exclusivo do lockup**, e o §9.4 fixa o contrato do asset `assets/imagens/logo-leai.svg`, monocromático em `currentColor` e recolorido em runtime. **Prompt novo usa o lockup do §3.7, não o wordmark tipográfico.**
  - **Continua pendente só a fonte da logo:** o token `wordmark` a declara como decisão em aberto, com Space Grotesk 600 e tracking `-0.015em` como interino. Prompt nenhum decide isso.
  - **Consequência assumida, sem prompt de edição:** os protótipos de [`periodo-0/P0-NAV/`](periodo-0/P0-NAV/) (cadastro, login e shell de navegação) foram exportados antes de 02/09 e mostram a marca só como texto. Como essas telas **já estão implementadas**, o grupo decidiu não gerar prompt de edição para elas: a diferença é tratada direto no código, e o protótipo antigo permanece como o histórico visual daquele período.
- **Três elementos nascem no protótipo do shell e não estão na fonte:** a barra inferior do mobile, a sidebar retrátil da web e o **badge de não lidas no sino**. O `documento-de-design.md` §5 define os headers de tela mas nunca a barra de navegação em si, e o §5.6 só define o ponto de não lida dentro da lista de notificações. O que for aprovado no protótipo precisa ser incorporado ao documento pelo controle de mudança (plano §3), não fica decidido só no prompt. **As quatro áreas de navegação já saíram desta lista:** foram incorporadas ao §5 em 01/09/2026, junto do escopo da lupa da estante (§5.1) e do padrão `Descobrir` (§5.7).
- **Busca na web sem lugar fixo: resolvida em 01/09/2026.** A pendência era que o §5.1 punha a busca no header da estante e a sidebar não tinha campo de busca persistente. Com F-ACV-BUSCA escrita, a ambiguidade apareceu inteira: um campo dentro de `Minha estante` que devolvia o catálogo, e a aba `Estante` marcada como ativa numa tela de resultados de acervo. A solução foi separar as duas buscas em duas áreas: a lupa da estante passou a filtrar a estante, e o acervo ganhou a aba `Descobrir` ([`periodo-1/F-ACV-BUSCA/descobrir.md`](periodo-1/F-ACV-BUSCA/descobrir.md)). Duas consequências continuam abertas e estão registradas nos arquivos de feature: a quarta área muda o shell (`feature-P0-NAV.md`) e a busca na estante é **requisito novo** (`feature-F-EST.md`).
- **`.design-sync/config.json` na raiz cita `src/web` e `src/mobile`** no campo `note`, caminhos que não existem no repositório. O correto é `code/front` e `code/mobile`. Corrigir quando alguém mexer no bundle de design system.
- **Lote de prompts do Período 1 de F-AUT, F-PERFIL, F-FEED e F-NOT: incorporação pendente em uma única passada.** As telas de recuperação, redefinição e troca de senha, configurações, perfil próprio e de outro leitor, edição de perfil, busca por leitor, conexões, solicitações de seguir, feed, comentários e notificações foram escritas com a seção 7 declarando o que **nasce no prompt** e não existe no `documento-de-design.md`. Os itens que se repetem em vários prompts, e que por isso precisam ser decididos uma vez só e aplicados igual em todos, são o **header de tela de detalhe** (`ArrowLeft` mais título mais sino), o **item de pessoa** (avatar de 48px, nome, `@username` e biografia truncada), a **faixa de abas**, o **bloco de restrição de RN-08** e o **carregamento incremental com skeleton no fim da lista**. Os protótipos do lote serão gerados e commitados juntos; a incorporação ao documento acontece **depois disso, de uma vez**, pelo controle de mudança (plano §3), com registro em `## Timeline`. Enquanto não acontecer, nada dessas listas está decidido.
- **Viewports de referência a confirmar** quando o alvo de demonstração Android estiver definido em [P0-CI](../plano-de-desenvolvimento/periodo-0/feature-P0-CI.md). Por ora, `390 x 844` no mobile e `1440 x 900` na web.
