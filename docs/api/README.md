# Contratos HTTP

Um contrato OpenAPI 3.0.3 por serviço:

- [`identidade.yaml`](identidade.yaml): autenticação, conta, perfil, privacidade e seguidores.
- [`acervo.yaml`](acervo.yaml): busca, página do livro, sinopse e cadastro oficial/pessoal.
- [`leitura.yaml`](leitura.yaml): estante, ciclo de leitura, progresso, nota e resenha.
- [`social.yaml`](social.yaml): feed, interações e notificações.

## Estado do contrato

Os arquivos combinam operações já implementadas no Período 0 com contratos planejados para o Período 1. `x-implementation-status` ou `x-contract-status` diferencia esses estados; a presença de uma rota no spec não declara que o código existe.

Na implementação, o spec exposto em runtime (`/v3/api-docs` no Spring ou `@nestjs/swagger` no NestJS) deve permanecer equivalente ao arquivo commitado. A feature só troca o estado de `planned` após implementar e testar a operação.

Os contratos assíncronos ficam separados em [`../mensageria/`](../mensageria/README.md). As VIEWs listadas em `x-database-contracts` são contratos de leitura entre schemas, não endpoints e não substituem autorização no servidor.
