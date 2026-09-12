# Web — Lê Ai (Vue + Tailwind)

SPA web em **Vue + Tailwind CSS**, cobrindo um **subconjunto** das funcionalidades do produto — consulta, catálogo e conteúdo escrito, onde teclado e tela grande ajudam. Sem paridade funcional com o mobile; Flutter Web foi vetado. Consome os mesmos microsserviços por HTTP/JSON.

## Requisitos

- Node `24.19.0` LTS, registrado em `.nvmrc`.
- npm `12.0.2`.

## Execução

```bash
npm ci
npm run dev
```

Copie os valores aplicáveis de `.env.example` para um `.env` local e ajuste `VITE_API_BASE_URL` para o ambiente desejado. Arquivos `.env` reais não são versionados.

## Qualidade

```bash
npm run lint
npm test
npm run build
```

O projeto usa Vue 3, TypeScript, Vite, Tailwind CSS 4, Vue Router, Vitest e ESLint. O cliente HTTP central fica em `src/services/api.ts` e trata `X-Correlation-Id`, erros padronizados e o cold start dos serviços no Render.

Fora do escopo web: desafios, gamificação e notificações. A coluna **Web** de cada requisito funcional em [`../../docs/orquestador/REQUISITOS.md`](../../docs/orquestador/REQUISITOS.md) diz o que entra. Convenções da stack em [`AGENTS.md`](AGENTS.md); regras gerais em [`../../AGENTS.md`](../../AGENTS.md).
