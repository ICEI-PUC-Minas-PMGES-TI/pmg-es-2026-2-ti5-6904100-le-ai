# Diagramas de dados

Modelo lógico derivado de [REQUISITOS.md v1.5](../orquestador/REQUISITOS.md), da [arquitetura](../orquestador/documento-de-arquitetura.md) e das features. Decisões do grupo incorporadas em 15/09/2026. A apresentação e os contratos entre schemas estão em [4.modelagem.md](../4.modelagem.md#43-modelo-de-dados).

A materializacao no PostgreSQL, as migrations e o checklist do Neon estao em
[`DER.md`](DER.md).

| Schema | Fonte editável | PNG | SVG ampliável |
|---|---|---|---|
| identidade | [Mermaid](modelo-dados-identidade.mmd) | [PNG](../imagens/modelo-dados-identidade.png) | [SVG](../imagens/modelo-dados-identidade.svg) |
| acervo | [Mermaid](modelo-dados-acervo.mmd) | [PNG](../imagens/modelo-dados-acervo.png) | [SVG](../imagens/modelo-dados-acervo.svg) |
| leitura | [Mermaid](modelo-dados-leitura.mmd) | [PNG](../imagens/modelo-dados-leitura.png) | [SVG](../imagens/modelo-dados-leitura.svg) |
| social | [Mermaid](modelo-dados-social.mmd) | [PNG](../imagens/modelo-dados-social.png) | [SVG](../imagens/modelo-dados-social.svg) |

## Convenções

- **PK/FK/UK:** chave primária, estrangeira e única. Unicidades compostas/parciais são descritas nos campos ou comentários; não significam unicidade de cada coluna isolada.
- **Arestas:** somente relações internas ao schema. Linha sólida quando a FK integra a PK da filha; tracejada para relação não identificadora. `o|` indica zero ou um; `||`, exatamente um; `o{`, zero ou muitos.
- **Referências externas:** atributo `→ schema.entidade`, sem FK física; acesso por VIEW do dono, HTTP ou evento versionado. Ausência de aresta para usuário/livro externo é intencional.
- **Agrupamentos:** caixas de organização visual, não tabelas nem schemas adicionais. Não há relação artificial para posicionar entidades.
- **P2/P3:** período de entrada da extensão. O DER contempla o escopo completo, não representa tabelas já migradas.
- **Comentários:** preservam enums extensos, invariantes, regras de exclusão, concorrência e contratos que não cabem com legibilidade nas caixas. Não criar tabelas de sessão cronometrada nem contagem de descartes no servidor: são estados do cliente.
- **Tempo:** `timestamp` é tipo lógico; instantes devem ter semântica UTC/timestamptz na migration. Datas locais e fuso IANA são persistidos quando exigidos pelas regras.

## Renderização reproduzível

Usar **Mermaid CLI 11.17.0** (Node 22), que suporta os agrupamentos de entidades e o layout ELK usados nas fontes. Versões antigas de visualizadores Mermaid podem não aceitar `subgraph` dentro de `erDiagram`; nesse caso consultar PNG/SVG.

Na raiz do repositório:

```sh
npm exec --yes --package=@mermaid-js/mermaid-cli@11.17.0 -- puppeteer browsers install chrome-headless-shell

for schema in identidade acervo leitura social; do
  npm exec --yes --package=@mermaid-js/mermaid-cli@11.17.0 -- mmdc \
    -i "docs/diagramas/modelo-dados-${schema}.mmd" \
    -o "docs/imagens/modelo-dados-${schema}.png" -b white -s 3
  npm exec --yes --package=@mermaid-js/mermaid-cli@11.17.0 -- mmdc \
    -i "docs/diagramas/modelo-dados-${schema}.mmd" \
    -o "docs/imagens/modelo-dados-${schema}.svg" -b white
done
```

O navegador é dependência de renderização, não do aplicativo. As fontes por schema são canônicas; não manter outra cópia monolítica ou PlantUML do DER. Ao editar uma fonte, regenerar seus dois formatos na mesma passada.
