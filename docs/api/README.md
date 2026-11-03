# Contratos HTTP

Um contrato OpenAPI 3.0.3 por serviço:

- [`identidade.yaml`](identidade.yaml): autenticação, conta, exclusão de conta, perfil, privacidade e seguidores.
- [`acervo.yaml`](acervo.yaml): busca com filtros, página do livro com nota geral e nota dos leitores, sinopse, cadastro oficial/pessoal e páginas de autor, editora e série.
- [`leitura.yaml`](leitura.yaml): estante, favoritos, histórico, ciclo de leitura, progresso, nota, resenha, reações, frases, desafios, sequência, estatísticas e a remoção interna pela moderação.
- [`social.yaml`](social.yaml): feed, interações, comentários, listas, recomendações, notificações (com o canal em tempo real) e moderação.

## Estado do contrato

Em 25/10/2026, com o Período 2 implementado, as 117 operações dos quatro contratos estão implementadas (24 em `identidade`, 15 em `acervo`, 45 em `leitura` e 33 em `social`). O que ainda aparece como planejado pertence ao Período 3, como o evento `lembrete.sequencia` em `social.yaml`. `x-implementation-status` ou `x-contract-status` diferencia esses estados; a presença de uma rota no spec não declara que o código existe.

Na implementação, o spec exposto em runtime (`/v3/api-docs` no Spring ou `@nestjs/swagger` no NestJS) deve permanecer equivalente ao arquivo commitado. A feature só troca o estado de `planned` após implementar e testar a operação.

Os contratos assíncronos ficam separados em [`../mensageria/`](../mensageria/README.md). As VIEWs listadas em `x-database-contracts` são contratos de leitura entre schemas, não endpoints e não substituem autorização no servidor.
