# AGENTS.md — Web (Vue + Tailwind)

Convenções da SPA web. Complementa o [`AGENTS.md`](../../AGENTS.md) da raiz — que traz as regras gerais (branches, commits, DoD, segurança, fluxo de feature) e prevalece no que for transversal. Fonte de verdade do escopo: [`docs/orquestador/REQUISITOS.md`](../../docs/orquestador/REQUISITOS.md).

## Stack

- **Node 24.19.0 LTS** + **npm 12.0.2**, fixados em `.nvmrc`, `package.json` e `package-lock.json`.
- **Vue 3.5 + TypeScript 6 + Vite 8** para a SPA; **Vue Router 5** para navegação.
- **Tailwind CSS 4** pelo plugin oficial `@tailwindcss/vite`. Site estático hospedado no Render.
- **Vitest 5 + Vue Test Utils + jsdom** para testes; **ESLint 10** para análise estática.
- Cobre um **subconjunto** de funcionalidades — sem paridade com o mobile. A coluna **Web** de cada RF em `REQUISITOS.md` define o que entra.
- **Fora do escopo web:** desafios, gamificação e notificações.

Gerenciamento de estado global permanece a definir quando uma feature demonstrar necessidade concreta. Estado local e Vue Router são suficientes para o scaffold.

## Estrutura

- `src/router/`: rotas e guards de navegação.
- `src/views/`: componentes associados a rotas.
- `src/components/`: componentes reutilizáveis; componentes do design system ficam em `src/components/ui/`.
- `src/services/`: integrações externas, incluindo o cliente HTTP central.
- Testes unitários ficam junto do arquivo testado, com sufixo `.spec.ts`.

## Comandos

- `npm ci`: instala exatamente as dependências do lockfile.
- `npm run dev`: inicia o servidor Vite local.
- `npm run lint`: executa o ESLint.
- `npm test`: executa os testes uma vez.
- `npm run test:watch`: executa os testes em modo interativo.
- `npm run build`: verifica os tipos e gera o build de produção em `dist/`.
- `npm run preview`: serve localmente o build de produção.

Use `VITE_API_BASE_URL` para configurar a entrada HTTP do ambiente. O cliente central em `src/services/api.ts` adiciona `X-Correlation-Id` e tolera até 90 segundos de cold start antes de informar timeout.

## Pontos de atenção do produto (ver `REQUISITOS.md`)

- **Segurança de renderização:** conteúdo de usuário tratado como texto com escape (RNF-SEC-14). Resenha em Markdown com HTML embutido desabilitado no parser **e** sanitização antes do DOM (RNF-SEC-15). Enviar `Content-Security-Policy` restritivo (RNF-SEC-16).
- Interface **responsiva** (RNF-USA-02); contraste WCAG AA (RNF-USA-03); toda ação destrutiva exige confirmação (RNF-USA-04); mensagens de erro em pt-BR e acionáveis (RNF-USA-05).
- Tratar hibernação do Render (RNF-ERR-09) e indisponibilidade/timeout com API simulada nos testes (RNF-TST-06).
- Ao implementar a partir de um protótipo, seguir [`docs/design/AGENTS.md`](../../docs/design/AGENTS.md) §10: copiar a **estrutura** do protótipo e chegar visualmente muito próximo dele, reconstruindo com CSS Grid, flexbox e unidades relativas. Nada de `position: absolute` para montar layout, nada de largura fixa em px para reproduzir o artboard. As convenções de escrita do prompt de tela estão no mesmo arquivo.
- O [`documento-de-design.md`](../../docs/orquestador/documento-de-design.md) define o sistema; quando criado por P0-DS, `docs/design-system/tokens.json` será a fonte canônica consumida pela configuração do Tailwind e pelo `ThemeData` do Flutter (RNF-USA-06).
- P0-DS deve integrar seus tokens ao Tailwind 4 pela abordagem CSS-first ou carregar um config gerado com `@config`; não substituir o Tailwind 4 nem duplicar tokens manualmente.
- Testes unitários de componentes com lógica e de serviços de acesso à API (RNF-TST-05).
