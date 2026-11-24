# Evidências da avaliação da arquitetura (ATAM)

Dados brutos das medições do [`docs/8.avaliacao_arquitetura.md`](../../8.avaliacao_arquitetura.md) §8.5, coletados em **19/11/2026** (e uma segunda rodada do cenário 4 em 21/11/2026, 00:58 a 01:06 UTC) pela E6-03 com os scripts de [`code/scripts/atam/`](../../../code/scripts/atam/README.md). Horários em UTC. Nenhum arquivo contém token, refresh token ou senha. Ids são UUID não sequenciais, e os e-mails das contas de demonstração são `.invalid`.

**Ambientes**

- **DES:** Render (Oregon), Neon `le-ai-oregon`, CloudAMQP `Le-ai-oregon`, rodando a **v0.2.1** (último merge na `main`: `f1f5c7e`). Cliente no Brasil, então as latências incluem a ida e volta até Oregon.
- **Local:** `identidade` e `acervo` no commit `f1f5c7e`, com RabbitMQ 4 (`rabbitmq:4-management`) e Postgres 17 (`postgres:17-alpine`) em Docker. Nada aponta para o Neon nem para a CloudAMQP.
- **Repositório:** análise estática no commit `f1f5c7e`.
- **Contratos de referência:** `docs/api/*.yaml` no `f1f5c7e`.

**Contas de demonstração no DES**, criadas pelo `POST /auth/register` em 19/11/2026 e mantidas lá: `leai.demo.marina` (perfil privado), `leai.demo.caio` (público, seguidor aceito da Marina) e `leai.demo.bia` (pública, não segue ninguém). As senhas ficam fora do repositório. A massa de dados está no plano da tarefa (seção 2).

| Arquivo | Cenário | Ambiente | O que é |
|---|---|---|---|
| `cenario-1-resumo.txt`, `cenario-1-acessos.json` | 1 | DES | Uma linha por requisição: papel, rota, códigos que o contrato declara, status, `X-Correlation-Id`, se o corpo traz conteúdo protegido e um trecho do corpo |
| `cenario-2-resumo.txt`, `cenario-2-acessos.json` | 2 | DES | Idem, mais a conferência do dono depois das tentativas |
| `cenario-3-consultas.json` | 3 | DES | As 10 consultas reais usadas, com a contagem de resultados. Os 3 ISBN-13 foram lidos do `acervo.livro` no Neon `le-ai-oregon` (consulta só de leitura pelo MCP, que também contou 11.011 livros oficiais ativos) |
| `cenario-3-latencias.json` | 3 | DES | Uma linha por busca (fase, cliente, consulta, início, ms, status, `X-Correlation-Id`), a linha de base da rede e o complemento de leituras |
| `cenario-3-resumo.txt` | 3 | DES | p50/p95/p99/máximo por fase e por tipo de consulta, calculados pelo `p95.mjs` (nearest-rank) |
| `cenario-4-cold-start.json` | 4 | DES | Primeira e segunda chamada a `GET /health` de cada serviço depois de período sem tráfego (22:06 UTC) |
| `cenario-4-cold-start-2.json` | 4 | DES | Segunda rodada, em 21/11/2026 às 00:58 UTC, com limite de 300 s na primeira chamada |
| `cenario-4-idempotencia.json` | 4 | DES | Mesmo `POST /leituras/{id}/progresso` da Marina enviado duas vezes com a mesma `Idempotency-Key` (21/11/2026, 01:05 UTC): status, progresso devolvido, contagem de registros antes e depois |
| `cenario-4-web-cold-start.json` | 4 | DES | Login da Marina na web: segundos até sair do login e se o aviso de servidor iniciando apareceu. Os prints não foram versionados. O serviço provavelmente não estava hibernado nessa hora (ver `docs/8.avaliacao_arquitetura.md` §8.5) |
| `cenario-5-ping.txt` | 5 | local | `ping.teste` Spring → Nest: envelope, propriedades AMQP, outbox, recibo e log com o mesmo `correlationId` |
| `cenario-5-duplicado.txt` | 5 | local | Reentrega do mesmo `eventId` |
| `cenario-5-dlq-schema.txt` | 5 | local | Schema inválido para a DLQ e a fila seguindo |
| `cenario-5-retry.txt` | 5 | local | Falha transitória: tentativas com horário do Postgres, intervalos e DLQ; segunda mensagem esperando |
| `cenario-5-broker-fora.txt` | 5 | local | Escrita com o broker parado e a outbox antes e depois |
| `cenario-5-testes-ci.txt` | 5 | CI | Testes de mensageria e os últimos runs verdes da `desenvolvimento` |
| `cenario-6-runtime-{identidade,social,acervo,leitura}.json` | 6 | DES | Spec OpenAPI exposto em runtime (`/v3/api-docs` nos Spring, `/docs-json` nos Nest) |
| `cenario-6-diferencas.txt` | 6 | DES × repositório | Runtime × YAML: rotas, `operationId` e códigos de status |
| `cenario-6-acoplamento.txt` | 6 | repositório | Análise estática de acoplamento entre serviços, com a classificação manual dos achados |

**Impacto no DES:** o tempo ativo do compute do Neon `le-ai-oregon` (`active_time` do projeto, lido pelo MCP) passou de 44.128 s (22:08 UTC) para 44.892 s (22:34 UTC), +764 s, contando também qualquer outro uso do DES nessa janela. Nada foi apagado, e nenhuma fila, configuração ou mensagem do broker de DES foi tocada.

**Dado retirado:** o `cenario-6-runtime-identidade.json` copia o spec exposto em runtime, que traz como `example` de e-mail um endereço `@gmail.com` vindo das anotações `@Schema` do `identidade`. Na cópia versionada aqui, esse valor foi trocado por `exemplo@leai.invalid` (20/11/2026). Nenhum outro campo foi alterado.
