# Gerador do HTML dos contratos OpenAPI

Gera `docs/api/html/<servico>.html` (identidade, acervo, leitura e social) e `docs/api/html/index.html` a partir de `docs/api/*.yaml`. Da raiz do repositório:

```sh
node code/scripts/openapi-html/gerar.mjs
```

- **Ferramenta:** Redoc, via `@redocly/cli build-docs` **2.75.0** (renderiza com o Redoc 3). A versão fica fixa no `package.json` e no `package-lock.json` desta pasta; o gerador roda `npm ci` aqui quando a versão instalada não é essa. Requer Node 20.19+ ou 22.12+.
- **Arquivo único e offline:** `--inlineBundle` embute o Redoc em cada HTML (≈ 2,5 MB cada). O template, dentro do `gerar.mjs`, põe uma Content-Security-Policy que bloqueia toda requisição externa; a única que o Redoc tentaria é a do logo "API docs by" do rodapé, no CDN da Redocly, e o console mostra esse bloqueio.
- **Estado por operação:** `--openapi.showExtensions=true` mostra os `x-` de cada operação logo abaixo do título (`implementation-status`, `contract-status`, `implemented-by`).
- **Telemetria desligada:** o gerador roda o CLI com `REDOCLY_TELEMETRY=off`.
- **Fim de linha:** `docs/api/html/.gitattributes` marca os HTML como `binary`, para o Git não converter LF em CRLF no Windows e a geração ser igual byte a byte em qualquer máquina.

Não edite os HTML à mão. Mudou um YAML de `docs/api/`, gere de novo e commite os dois juntos. Para validar um YAML com o CLI desta pasta (da raiz): `node code/scripts/openapi-html/node_modules/@redocly/cli/bin/cli.js lint docs/api/<servico>.yaml --extends=spec`. Em 19/11/2026 o `identidade` passa limpo; `acervo` (8), `leitura` (4) e `social` (3) acusam `nullable-type-sibling` (`nullable: true` ao lado de `allOf` sem `type`), padrão antigo dos contratos que o Redoc renderiza normalmente. O `npx redocly` da raiz **não** usa este CLI: resolve outro pacote.
