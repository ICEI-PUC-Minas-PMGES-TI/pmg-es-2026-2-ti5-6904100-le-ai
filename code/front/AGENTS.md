# AGENTS.md — Web (Vue + Tailwind)

Convenções da SPA web. Complementa o [`AGENTS.md`](../../AGENTS.md) da raiz — que traz as regras gerais (branches, commits, DoD, segurança, fluxo de feature) e prevalece no que for transversal. Fonte de verdade do escopo: [`docs/orquestador/REQUISITOS.md`](../../docs/orquestador/REQUISITOS.md).

## Stack

- **Vue** (SPA) + **Tailwind CSS**. Site estático hospedado no Render.
- Cobre um **subconjunto** de funcionalidades — sem paridade com o mobile. A coluna **Web** de cada RF em `REQUISITOS.md` define o que entra.
- **Fora do escopo web:** desafios, gamificação e notificações.

> Versão do Node, ferramenta de build, gerenciamento de estado, estrutura de pastas, padrão de teste e comandos serão fixados aqui quando o projeto arrancar. Por ora, apenas a estrutura de pastas existe.

## Pontos de atenção do produto (ver `REQUISITOS.md`)

- **Segurança de renderização:** conteúdo de usuário tratado como texto com escape (RNF-SEC-14). Resenha em Markdown com HTML embutido desabilitado no parser **e** sanitização antes do DOM (RNF-SEC-15). Enviar `Content-Security-Policy` restritivo (RNF-SEC-16).
- Interface **responsiva** (RNF-USA-02); contraste WCAG AA (RNF-USA-03); toda ação destrutiva exige confirmação (RNF-USA-04); mensagens de erro em pt-BR e acionáveis (RNF-USA-05).
- Tratar hibernação do Render (RNF-ERR-09) e indisponibilidade/timeout com API simulada nos testes (RNF-TST-06).
- Ao implementar a partir de um protótipo, seguir [`docs/design/AGENTS.md`](../../docs/design/AGENTS.md) §10: copiar a **estrutura** do protótipo e chegar visualmente muito próximo dele, reconstruindo com CSS Grid, flexbox e unidades relativas. Nada de `position: absolute` para montar layout, nada de largura fixa em px para reproduzir o artboard. As convenções de escrita do prompt de tela estão no mesmo arquivo.
- O [`documento-de-design.md`](../../docs/orquestador/documento-de-design.md) define o sistema; quando criado por P0-DS, `docs/design-system/tokens.json` será a fonte canônica consumida pela configuração do Tailwind e pelo `ThemeData` do Flutter (RNF-USA-06).
- Testes unitários de componentes com lógica e de serviços de acesso à API (RNF-TST-05).
