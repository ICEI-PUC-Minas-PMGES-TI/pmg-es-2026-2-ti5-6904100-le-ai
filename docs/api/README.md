# Contratos HTTP

Um contrato OpenAPI 3.0.3 por serviço:

- [`identidade.yaml`](identidade.yaml): autenticação, conta, exclusão de conta, perfil, privacidade e seguidores.
- [`acervo.yaml`](acervo.yaml): busca com filtros, página do livro com nota geral e nota dos leitores, sinopse, cadastro oficial/pessoal e páginas de autor, editora e série.
- [`leitura.yaml`](leitura.yaml): estante, favoritos, histórico, ciclo de leitura, progresso, nota, resenha, reações, frases, desafios, sequência, estatísticas e a remoção interna pela moderação.
- [`social.yaml`](social.yaml): feed, interações, comentários, listas, recomendações, notificações (com o canal em tempo real) e moderação.

## Estado do contrato

Em 25/10/2026, com o Período 2 implementado, as 117 operações dos quatro contratos estão implementadas (24 em `identidade`, 15 em `acervo`, 45 em `leitura` e 33 em `social`). Em 19/11/2026 a F-GAM-OPC acrescentou ao `leitura` o calendário da sequência e o job do lembrete, e o `social` passou a consumir `lembrete.sequencia`. O que ainda aparecer como planejado pertence ao Período 3. `x-implementation-status` ou `x-contract-status` diferencia esses estados; a presença de uma rota no spec não declara que o código existe.

Na implementação, o spec exposto em runtime (`/v3/api-docs` no Spring ou `@nestjs/swagger` no NestJS) deve permanecer equivalente ao arquivo commitado. A feature só troca o estado de `planned` após implementar e testar a operação.

## HTML estático

Os quatro contratos também estão em HTML, um arquivo por serviço, que abre com duplo clique, sem servidor e sem internet: **[`html/index.html`](html/index.html)**, com [`identidade`](html/identidade.html), [`acervo`](html/acervo.html), [`leitura`](html/leitura.html) e [`social`](html/social.html). O estado de cada operação (`implementation-status` ou `contract-status`) aparece logo abaixo do título dela. É o anexo dos contratos do Documento de Arquitetura.

Os arquivos são gerados com Redoc (`@redocly/cli` **2.75.0**, versão fixa no `package.json` e no `package-lock.json` do gerador) e não são editados à mão. Depois de mudar um YAML, gere de novo e commite o YAML e o HTML juntos:

```sh
node code/scripts/openapi-html/gerar.mjs
```

Precisa só do Node 20.19+ ou 22.12+; na primeira vez, o gerador instala a ferramenta com `npm ci` na pasta dele. Detalhes em [`code/scripts/openapi-html/README.md`](../../code/scripts/openapi-html/README.md). Para navegar e testar as rotas com o Swagger UI, use o `docker-compose.docs.yml` da raiz.

Os contratos assíncronos ficam separados em [`../mensageria/`](../mensageria/README.md). As VIEWs listadas em `x-database-contracts` são contratos de leitura entre schemas, não endpoints e não substituem autorização no servidor.
