# Scripts de medição da avaliação da arquitetura (ATAM)

Scripts da E6-03, que geram as evidências de [`docs/evidencias/atam/`](../../../docs/evidencias/atam/README.md) usadas no [`docs/8.avaliacao_arquitetura.md`](../../../docs/8.avaliacao_arquitetura.md). Node 22+, só com `fetch` nativo e sem dependência no repositório.

## Regras

- **DES é compartilhado.** Os scripts de DES fazem uso normal e leve: contas de demonstração, acessos negados e a carga do cenário 3 com no máximo 10 clientes e teto global de 10 req/s. Nada apaga dados, esvazia fila ou muda configuração.
- As URLs vêm de `LEAI_DES_IDENTIDADE`, `LEAI_DES_ACERVO`, `LEAI_DES_LEITURA`, `LEAI_DES_SOCIAL` e `LEAI_DES_WEB`, com padrão nos serviços do Render. O `comum.mjs` recusa qualquer host que não seja `*.onrender.com` ou `localhost`.
- **Senhas fora do repositório:** `~/.leai/contas-demo-des.env` (`LEAI_CONTAS_DEMO` muda o caminho), com `LEAI_DEMO_MARINA_SENHA`, `LEAI_DEMO_CAIO_SENHA`, `LEAI_DEMO_BIA_SENHA` e `PRONTO=1` depois da massa montada. Os ids coletados ficam em `~/.leai/atam-estado.json` (`LEAI_ESTADO_ATAM`).
- O `gravar()` recusa gravar evidência que contenha JWT, e as requisições nunca registram o `Authorization`.
- Os cenários 1, 2 e 6 leem o contrato de `docs/api/` no commit da versão em DES (`LEAI_CONTRATO_REF`, padrão `f1f5c7e`, a v0.2.1). Por isso, rode-os de dentro do repositório.

## Ordem

| Script | O que faz | Onde |
|---|---|---|
| `cenario-4-cold-start.mjs [arquivo.json]` | `GET /health` em cada serviço, um de cada vez, com o tempo até a primeira resposta. Rode primeiro, com os serviços hibernados (15 min sem tráfego) | DES |
| `contas.mjs` | Cria as 3 contas de demonstração pelo `/auth/register` (se não existirem) e monta a massa do plano. Idempotente pelo arquivo de estado | DES |
| `cenario-1-2.mjs` | Cenários 1 e 2: negações, controles positivos e conferência do dono | DES |
| `cenario-3-carga.mjs` e depois `p95.mjs` | Carga leve da busca (1, 5 e 10 clientes) e o cálculo de p50/p95/p99 (nearest-rank) | DES |
| `cenario-4-web.mjs` | Login da Marina na web, com print a cada ~5 s. Exige `PW_DIR` com `playwright-core` instalado fora do repositório e o Edge | DES |
| `cenario-6-specs.mjs` | Spec em runtime × YAML de `docs/api/` | DES |
| `cenario-6-acoplamento.sh [commit]` | Análise estática de acoplamento entre serviços | repositório |
| `cenario-5-mensageria.mjs <log do acervo>` e `cenario-5-broker-fora.mjs` | Mensageria com falhas forçadas | **só local** |

## Cenário 5 (local)

Nunca contra o DES nem contra o broker de dev. Os scripts recusam host que não seja `localhost`.

1. Worktree descartável na `f1f5c7e` (fora do repositório). Build: `./mvnw -DskipTests package` no `identidade`, `npm ci && npm run build` no `acervo`.
2. `docker run -d --name atam-rabbit -p 5673:5672 -p 15673:15672 rabbitmq:4-management` (o `Le-ai-oregon` roda RabbitMQ 4) e `docker run -d --name atam-pg -e POSTGRES_PASSWORD=atam -e POSTGRES_DB=leai_atam -p 55433:5432 postgres:17-alpine -c log_statement=all -c "log_line_prefix=%m [%p] "`.
3. Sem `.env` na worktree. Variáveis só de `localhost`: `DATABASE_URL=jdbc:postgresql://localhost:55433/leai_atam` (e `DATABASE_USERNAME`/`DATABASE_PASSWORD`) no `identidade`, `postgres://postgres:atam@localhost:55433/leai_atam` no `acervo`, `AMQP_URL=amqp://guest:guest@localhost:5673`, `AMQP_ENABLED=true`, `JWT_SECRET` local e portas 18081/18082.
4. Sobe o `identidade` uma vez com `P0_PING_ENABLED=false` (migrations e exchanges). Cria a fila `atam.captura` ligada a `leai.events.identidade` com a chave `ping.teste` pela API de gestão e para o `identidade`.
5. `node dist/db/migrate.js` e `node dist/main.js` no `acervo`, com o log redirecionado para um arquivo.
6. Sobe o `identidade` de novo, com `P0_PING_ENABLED=true`: o ping vai para a outbox e é publicado.
7. `node cenario-5-mensageria.mjs <log do acervo>` e `node cenario-5-broker-fora.mjs`.
8. `docker rm -f atam-rabbit atam-pg`.

## Relatório para entrega (.docx/.pdf)

`gerar-relatorio-docx.py` monta o `assets/arquitetura/Relatorio_ATAM_LeAi.docx` sobre o template da disciplina (`Template_Relatorio_ATAM_PUC_2026.docx`, que fica fora do repositório), com o mesmo conteúdo de `docs/8.avaliacao_arquitetura.md`. Precisa de `python-docx`. O texto está no próprio script: mudou o `.md`, mude o script também.

```
python -I code/scripts/atam/gerar-relatorio-docx.py <template.docx> docs/imagens/componentes.png assets/arquitetura/Relatorio_ATAM_LeAi.docx
```

O `.pdf` sai do Word (Arquivo > Exportar > PDF, ou `ExportAsFixedFormat` pelo COM). Confira o PDF página por página: o bloco de assinaturas começa numa página própria.

