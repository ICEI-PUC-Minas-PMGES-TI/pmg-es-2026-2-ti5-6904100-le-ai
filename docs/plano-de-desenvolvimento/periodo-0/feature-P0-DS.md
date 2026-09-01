# P0-DS — Design system base

**Período:** 0 · **Prioridade:** fundação
**Dono:** a definir · **Serviços afetados:** `code/front` (web) e `code/mobile` (Flutter) — nenhum serviço de backend

> Fonte de verdade: [`../../orquestador/REQUISITOS.md`](../../orquestador/REQUISITOS.md). Design: [`../../orquestador/documento-de-design.md`](../../orquestador/documento-de-design.md) §3 (fundamentos) e §9 (conexão com o código). Em caso de conflito, o `REQUISITOS.md` ganha; protótipo é referência visual, não spec de pixel (plano §7).

## Objetivo

Materializar o design system base: traduzir os **tokens** do [`documento-de-design.md`](../../orquestador/documento-de-design.md) §3 **uma única vez** (RNF-USA-06) para as duas plataformas, de forma que web (Tailwind) e mobile (Flutter `ThemeData`) **não divirjam**. O mecanismo é uma **fonte canônica única** — `docs/design-system/tokens.json` (design §9.1) — da qual as duas traduções são geradas.

Entrega os fundamentos (cores claro+escuro, tipografia, espaçamento, raio, elevação, motion), o carregamento das quatro famílias de fonte, a iconografia (Phosphor) e o modo escuro como cidadão de primeira classe. **Não** implementa os componentes de produto (botão, card, estrela etc.) nem telas — esses vêm com as features de domínio consumindo os tokens; aqui fica a base e, opcionalmente, um ou dois componentes-piloto para validar o contrato.

Requisitos atendidos: **RNF-USA-06** (tokens definidos uma vez, traduzidos para os dois lados), **RNF-USA-01** (interfaces consistentes entre plataformas), **RNF-USA-03** (contraste WCAG AA).

## Status

| Camada | Status | Observação |
|---|---|---|
| Infra | não iniciado | `docs/design-system/tokens.json` + script de geração inexistentes |
| Backend | não aplicável | design system não tem backend |
| Web | não iniciado | `tailwind.config` gerado do JSON + CSS vars de tema (claro/escuro) |
| Mobile | não iniciado | `lib/design/tokens.dart` + extensão `ThemeData` (claro/escuro) |

## Especificação

### Fonte canônica — `docs/design-system/tokens.json` (design §9.1)

Um único arquivo versionado, lido pelas duas stacks (formato W3C-ish). **Nenhuma cor/valor entra em Tailwind ou Flutter que não venha daqui.** Preencher com todos os valores das tabelas de §3.1–3.6:

- **Cores — modo claro** (§3.1.1): `papel #F4F2EC`, `papel-elevado #EDE9DE`, `linha #DFD9C9`, `tinta #171512`, `grafite #5C544B`, `grafite-suave #8A8175`, `musgo #3E5C42` (acento único), `musgo-vivo #4E7455`, `musgo-fundo #E4EAE0`, `broto #8AA274`, `rubi #B4322A`, `rubi-fundo #F6E1DE`, `ambar #D4A537`, `ambar-fundo #F7ECD1`, `capa-placeholder #DED4BC`.
- **Cores — modo escuro** (§3.1.2): `noite #141311`, `noite-elevada #1D1B18`, `linha-noite #2A2724`, `papel-suave #EDE9E0`, `grafite-claro #B8AFA2`, `grafite-fundo-escuro #7C7466`, `musgo-claro #8FB27A`, `musgo-fundo-escuro #243026`, `broto-vivo #A5C285`, `rubi-claro #E56354`, `rubi-fundo-escuro #3A1F1D`, `ambar-claro #E8BC5A`, `ambar-fundo-escuro #332816`, `capa-placeholder-noite #3A342A`.
- **Tipografia** (§3.2): 4 famílias (Space Grotesk / Manrope / Newsreader / JetBrains Mono) e a escala com nomes semânticos — `display-hero`, `display`, `title-lg`, `title`, `title-sm`, `body-lg`, `body`, `body-strong`, `caption`, `label`, `overline`, `num-display`, `num-inline` (tamanho / line-height / peso / tracking de cada, conforme a tabela §3.2.1).
- **Espaçamento** (§3.3): `space-1..space-24` (4/8/12/16/20/24/32/40/48/64/96 px).
- **Raio** (§3.4): `radius-sm 6`, `radius 12`, `radius-md 16`, `radius-lg 20`, `radius-xl 24`, `radius-full 999`.
- **Elevação** (§3.5): `elev-0..elev-3` com os shadows tingidos em `rgba(23,21,18, …)`.
- **Motion** (§3.6): durações `dur-instant/fast/base/slow` (100/180/260/420 ms) e easings `ease-out/in-out/in`.

Exemplo do formato (design §9.1):
```json
{
  "color": {
    "papel": { "value": "#F4F2EC", "type": "color" },
    "tinta": { "value": "#171512", "type": "color" },
    "musgo": { "value": "#3E5C42", "type": "color" }
  },
  "spacing": { "5": { "value": "20px", "type": "dimension" } },
  "typography": {
    "display": { "value": {
      "fontFamily": "Space Grotesk", "fontWeight": 600,
      "fontSize": "32px", "lineHeight": "36px", "letterSpacing": "-0.01em"
    }, "type": "typography" }
  }
}
```

### Web (`code/front`) — Tailwind consumindo o JSON (design §9.1)

- **Script de geração** que lê `docs/design-system/tokens.json` e produz o `tailwind.config` (cores, `spacing`, `borderRadius`, `boxShadow`, `fontFamily`, `fontSize`, `transitionDuration`, `transitionTimingFunction`) — nomes semânticos, nunca `text-4xl`/`slate-500`. Rodar o script é parte do build; o config não é editado à mão.
- **Modo escuro** via `prefers-color-scheme` por padrão + **toggle manual** que salva a preferência local (design §3.1.2). Estratégia Tailwind `darkMode: 'class'` com CSS vars por tema (claro/escuro), lock de página inteira (nenhuma seção inverte no meio da rolagem).
- **Fontes** via Google Fonts (Space Grotesk, Manrope, Newsreader, JetBrains Mono), com fallback `system-ui, -apple-system, "Segoe UI", sans-serif` para Space Grotesk (design §3.2).
- **CSP** restritivo já previsto (RNF-SEC-16) precisa permitir a origem das fontes.

### App Flutter (`code/mobile`) — `ThemeData` do mesmo JSON (design §9.1)

- **Script de geração** que lê `tokens.json` e produz `lib/design/tokens.dart` (`class DesignTokens { static const Color papel = Color(0xFFF4F2EC); ... }`) + uma **extensão `ThemeData`** (tema claro e escuro) que consome esses tokens. Nada de cor hardcoded fora do arquivo gerado.
- **Modo escuro** por `ThemeMode.system` + toggle salvo local, espelhando a web.
- **Fontes** via `google_fonts` para as quatro famílias, com números tabulares (`fontFeatures: tnum`) no JetBrains Mono (design §3.2.1 `num-inline`).

### Iconografia (design §6)

- Família única **Phosphor Icons** (licença MIT). Web: `@phosphor-icons/vue` (fallback `@phosphor-icons/web`). Flutter: `flutter_phosphor_icons`/`phosphor_flutter`. Peso `regular` como padrão de tema; `fill` só para estado ativo.

### Regras de banlist a honrar (design §7)

Anotadas aqui para que quem implementar componentes não reintroduza: um único acento (`musgo`), sem gradiente de acento, sem `#000000`, sem sombra preta pura, sem Inter/Instrument Serif/Fraunces, sem loop de motion infinito, sem emoji na copy de interface, ação destrutiva sempre com confirmação (RNF-USA-04). Modo de foco (RN-16) = zero motion.

> **Caminhos:** o design §9.2/9.3 usa a estrutura real `code/front`/`code/mobile`. Componentes (`src/components/ui/<Component>.vue`, `lib/design/widgets/<component>.dart`) seguem esses caminhos quando entrarem. Prompts de tela e protótipos ficam em `docs/design/periodo-N/<FEATURE>/`, com as convenções em [`docs/design/AGENTS.md`](../../design/AGENTS.md); `docs/design-system/` guarda apenas o `tokens.json` desta feature.

## Critérios de aceite

- [ ] `docs/design-system/tokens.json` existe com **todos** os tokens de §3.1–3.6 (claro + escuro).
- [ ] O `tailwind.config` da web é **gerado** do JSON; não há cor/valor no config que não venha dele.
- [ ] `lib/design/tokens.dart` + extensão `ThemeData` são **gerados** do JSON; não há cor hardcoded fora do gerado.
- [ ] As quatro famílias de fonte carregam em web e mobile, com fallback definido.
- [ ] Modo escuro funciona nos dois lados (`prefers-color-scheme` + toggle salvo), como lock de página inteira.
- [ ] Uma tela/exemplo de cada lado renderiza usando **só** tokens por nome semântico, com contraste WCAG AA verificado (`tinta` sobre `papel`, `grafite` sobre `papel`).
- [ ] Phosphor Icons disponível e funcionando nas duas stacks.
- [ ] Regenerar (rodar o script) após editar o JSON reflete a mudança nos dois lados sem edição manual.

## Definition of Done

(plano §10)

- [ ] Código (tokens.json + scripts + config/tema) mergeado em `desenvolvimento`
- [ ] CI verde ([P0-CI](feature-P0-CI.md)) — web/mobile buildam com os tokens aplicados
- [ ] Testes automatizados dos casos de uso — teste do **script de geração** (JSON → config/Dart correto) e, se houver componente-piloto, teste dele
- [ ] Spec OpenAPI do serviço atualizado em `docs/api/` — **N/A**: feature de front/mobile, sem serviço de backend. Justificativa registrada aqui em vez de remover o item.
- [ ] Fluxo funcionando em DES/HML — os tokens aparecem no site em DES ([P0-DEPLOY](feature-P0-DEPLOY.md)); o APK de DES ([P0-CI](feature-P0-CI.md)) usa o tema
- [ ] Arquivo da feature atualizado: status, pendências, timeline
- [ ] Divergência protótipo × implementação registrada, se houver

**Item próprio:** `tokens.json` é **fonte única** — Tailwind e Flutter são **derivados gerados**, nunca editados à mão. Qualquer divergência entre os dois lados é bug de geração, não de estilo.

## Pendências

- **Depende de [P0-INFRA](feature-P0-INFRA.md)** (projetos web/mobile scaffoldados e compilando).
- Linguagem do **script de geração** (Node/Dart/etc.) a definir — deve rodar no CI e localmente.
- Confirmar pacotes Phosphor exatos disponíveis para Vue e Flutter no arranque.
- Alinhar com [P0-NAV](feature-P0-NAV.md): as primeiras telas navegáveis já devem consumir os tokens (não hardcodar cor no shell de auth).
- Os **componentes** de §4 (botão, input, estrela, card, status pill, progresso, streak, feed, modo de foco) e os protótipos ficam para depois; aqui entra no máximo um componente-piloto para validar o contrato dos dois lados.

## Timeline

### Revisão 31/08/2026: caminhos de prompt e protótipo atualizados para `docs/design/`, acompanhando a atualização do [`documento-de-design.md`](../../orquestador/documento-de-design.md) §9.1/§9.3 de 31/08/2026. `docs/design-system/tokens.json` continua sendo a entrega desta feature, sem mudança de escopo.

### Criação 25/08/2026: arquivo criado a partir do escopo de P0-DS no [periodo-0/README.md](README.md) e do [`documento-de-design.md`](../../orquestador/documento-de-design.md) §3 e §9. Fonte canônica fixada em `docs/design-system/tokens.json`; caminhos de código alinhados a `code/front`/`code/mobile`. Componentes de produto deliberadamente fora de escopo desta feature.
