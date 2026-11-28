# Período 3 — Opcionais e refino

> As features **Opcionais** (`O` em `../../orquestador/REQUISITOS.md` §5), mais **refino**, **testes das desejáveis** do Período 2 e o **ATAM inicial**. As opcionais são o colchão de escopo (`../../orquestador/plano-de-projeto.md` §3): primeiras a serem cortadas se o tempo apertar.
>
> Ver o mapa geral em [../README.md](../README.md).

**Sprint 6 · Alvo:** a partir de 10/11 · **congelamento de features em 17/11** · **Entrega 6 final (40 pts) em 01/12**. Nenhuma feature nova entra depois de 17/11.

| ID | Feature | Serviço | Prioridade | RFs | Escopo |
|---|---|---|---|---|---|
| F-ACV-OPC | Extras de acervo | acervo | opcional | RF-ACV-14, 22 | Recarga manual do data dump; informar assuntos ao cadastrar livro pessoal |
| F-REC-ALG | Recomendação algorítmica + descarte em lote | social | opcional | RF-REC-08..12, 17 | Sugestões por similaridade e por quem o usuário segue (RN-08), com motivo e descarte; descarte em lote das recomendações de um livro (RN-22) |
| F-NOT-OPC | Preferências de notificação + push | social | opcional | RF-NOT-05, 07 | Configurar notificações por tipo; entrega por push em Android (FCM) |
| F-MOD-OPC | Suspensão de conta | social | opcional | RF-MOD-04 | Administrador suspende a conta de um leitor |
| F-GAM-OPC | Calendário e lembrete de streak | leitura | opcional | RF-GAM-04, 05 | Calendário de dias com progresso; lembrete de sequência ativa (depende de push) |
| F-STA-OPC | Distribuição de notas | leitura | opcional | RF-STA-04 | Visualizar a distribuição das notas atribuídas |
| F-DSF-OPC | Histórico de janelas de desafio | leitura | opcional | RF-DSF-05 | Histórico de janelas concluídas de cada desafio, com cumprimento ou não |

## Cross-cutting do período

- **Testes automatizados das features desejáveis** (Período 2).
- **Refino** geral e pendências acumuladas dos períodos anteriores.
- **ATAM inicial** — avaliação de arquitetura (`../../orquestador/documento-de-arquitetura.md` §7 + `../../orquestador/REQUISITOS.md` §7/§8), alimentando o `docs/8.avaliacao_arquitetura.md`.

## Fechamento do Período 3 e da Sprint 6 (28/11/2026)

As sete opcionais foram implementadas e integradas à `desenvolvimento` até 24/11/2026 (PRs #61, #62, #68 e #69) e levadas à `main` pelo PR #70 (`ec39afa`), com CI verde e a release [`v0.3.0`](https://github.com/ICEI-PUC-Minas-PMGES-TI/pmg-es-2026-2-ti5-6904100-le-ai/releases/tag/v0.3.0) e o APK Android. O deploy de DES no Render saiu no mesmo dia, com as migrations do período. Depois do congelamento de features, entrou só um refinamento de navegação: [o card da estante abre a página do livro](#refinamento-depois-da-v030) (27/11/2026).

| Feature | Dono | Situação | O que continua aberto (detalhe no arquivo) |
|---|---|---|---|
| [F-ACV-OPC](feature-F-ACV-OPC.md) | Renato Douglas | entregue; assuntos no livro pessoal validados em DES pela API (28/11/2026) | recarga real do dump (decisão do grupo) |
| [F-REC-ALG](feature-F-REC-ALG.md) | Henrique Carvalho | entregue; sugestões e descarte validados em DES pela API (28/11/2026) | descarte em lote não exercitado em DES; lacunas L-45 a L-48 do plano de testes |
| [F-NOT-OPC](feature-F-NOT-OPC.md) | Kayke | entregue e validada em DES (push num Android físico, 24/11/2026) | lacunas L-39 a L-42 do plano de testes |
| [F-MOD-OPC](feature-F-MOD-OPC.md) | Renato Douglas | entregue, na `main` e em DES | **não validada em DES**: o passo de suspender e reativar exige a senha do administrador, que não estava no arquivo de contas |
| [F-GAM-OPC](feature-F-GAM-OPC.md) | Vicenzo Fonseca | entregue; calendário validado em DES pela API (28/11/2026); o job do lembrete roda todo dia com `elegiveis: 0` | ver o lembrete chegar num Android, com uma conta que tenha lido na véspera e não no dia |
| [F-STA-OPC](feature-F-STA-OPC.md) | Ana Luiza de Freitas | entregue; validada em DES pela API (28/11/2026) | lacuna L-34 do plano de testes |
| [F-DSF-OPC](feature-F-DSF-OPC.md) | Vicenzo Fonseca | entregue; validada em DES pela API (28/11/2026) | lacunas L-43 e L-44 do plano de testes |

**Cross-cutting do período:**

- **Testes das desejáveis:** as 14 features do Período 2 têm seção no [plano de testes](../../9.plano_de_testes.md) (9.6.12 a 9.6.25), e as opcionais e o refinamento também (9.6.26 a 9.6.33). Na última execução do CI, passaram os 4.489 testes dos sete projetos, sem falha e sem teste pulado (seção 9.7). Das 48 lacunas levantadas (9.8), 11 foram fechadas, 9 parcialmente e 28 seguem abertas, cada uma com dono.
- **ATAM:** feito em 19 e 20/11/2026 contra a `v0.2.1` em DES ([`8.avaliacao_arquitetura.md`](../../8.avaliacao_arquitetura.md) e a versão para assinatura em `assets/arquitetura/`). As features do Período 3 ficaram fora das medições.
- **Documento de Arquitetura:** versão final v1.11 (28/11/2026), com a recomendação algorítmica, as VIEWs novas e a contagem do banco de DES (65 tabelas e 12 VIEWs).

A validação em DES de 28/11/2026 foi feita pela API com as contas de demonstração (`code/scripts/atam/validacao-periodo-3.mjs`, evidência em [`evidencias/atam/v0.4.0/`](../../evidencias/atam/v0.4.0/)): 12 passos, nenhuma falha. Nada desceu de nível pela regra de corte: as sete opcionais entraram. O que fica aberto é a suspensão em DES (F-MOD-OPC), o lembrete chegando num Android (F-GAM-OPC), a recarga real do dump (F-ACV-OPC) e as lacunas de teste listadas acima.

### Refinamento depois da v0.3.0

Em 27/11/2026 (`3e03eaa`), a capa e o título do card da estante passaram a abrir a página do livro, na web e no mobile; o resto do card e um botão de mais ações (⋯) abrem o painel de ações. Nos perfis, capa e título também levam ao livro, e o livro pessoal fica sem link no perfil de outro leitor (RN-15). O `leitura` passou a devolver `livro.tipo` nos itens da estante. Testado no emulador Android com os serviços locais e conferido em DES depois do deploy automático (`leai-leitura` e `leai-web` no ar com o commit). Casos de teste na seção 9.6.33 do plano.

## Fechamento do período: ajustes manuais no deploy

Itens que o merge na `main` não resolve sozinho. Cada feature mantém o passo a passo no próprio arquivo.

- **F-GAM-OPC e F-NOT-OPC (push):** definir `FIREBASE_CREDENTIALS_JSON` no `leai-social` do Render (projeto Firebase `leai-ti5`) e validar o push e o lembrete num Android físico. **Feito em 24/11/2026:** credencial gravada e push recebido num Android físico; falta ver o lembrete de sequência chegar. Ver [Deploy na `main`](feature-F-GAM-OPC.md#deploy-na-main-fechamento-do-período-3).

## Arquivos de feature

Template em `../../orquestador/plano-de-projeto.md` §9. As **regras de implementação compartilhadas** do projeto (idempotência de escrita, paginação, envelope/schema de evento, backfill antes de consumir, testes por feature) valem também aqui e estão em [`../periodo-1/README.md`](../periodo-1/README.md#regras-de-implementação-compartilhadas).

### Contratos transversais

| Contrato | Produtor/dono | Consumidor | Situação no Período 3 |
|---|---|---|---|
| `v_livro_recomendacao_v1` | `acervo` | `social` / F-REC-ALG | previsto no DER e em `docs/4.modelagem.md` §4.2 como item do Período 3; **conteúdo a fechar com `acervo` no arquivo de F-REC-ALG, antes da migration** |
| `lembrete.sequencia` | `leitura` / F-GAM-OPC (job diário) | `social` / extensão do consumidor de F-NOT | **aprovado em 19/11/2026** (`REQUISITOS.md` v1.10 §7.2, arquitetura v1.9 §5.2): schema `lembrete.sequencia.v1`, chave `sequencia:<usuarioId>:lembrete:<dataLocal>`, retry e DLQ padrão da fila de notificações |
| entrega push (FCM Android) | `social` / F-NOT-OPC | — | a arquitetura §5.2 já prevê o consumidor como "social (+ FCM em Android)"; novo é o **registro de dispositivo**, não o fluxo |
| preferência por tipo de notificação | `social` / F-NOT-OPC | — | incorporado em 15/09/2026: cada tipo configurável individualmente, sem agrupamento |
| suspensão e reativação | `social` / F-MOD-OPC | `identidade` | aprovado: comando HTTP autenticado/idempotente; conteúdo suspenso oculto; consulta administrativa permite reativar |
| `opt_out_recomendacao` | `identidade` | `social` / F-REC-ALG | incorporado em 15/09/2026: configuração no perfil e filtro do sinal social |
| configuração histórica da janela | `leitura` / F-DSF | F-DSF-OPC | aprovado: snapshot de unidade/periodicidade/alvo/fuso desde P2 para offline; P3 expõe histórico incluindo vazios |

**Escopo enxuto do período:** as opcionais são o colchão de corte (plano §3). F-REC-ALG calcula em consulta, F-NOT-OPC estende o fluxo existente, F-GAM-OPC lê dias persistidos, F-ACV-OPC reaproveita a carga manual, F-STA-OPC agrega notas e F-DSF-OPC expõe os snapshots já mantidos por F-DSF.

As 7 features do Período 3 estão detalhadas:

- [F-ACV-OPC — Extras de acervo](feature-F-ACV-OPC.md)
- [F-REC-ALG — Recomendação algorítmica + descarte em lote](feature-F-REC-ALG.md)
- [F-NOT-OPC — Preferências de notificação + push](feature-F-NOT-OPC.md)
- [F-MOD-OPC — Suspensão de conta](feature-F-MOD-OPC.md)
- [F-GAM-OPC — Calendário e lembrete de streak](feature-F-GAM-OPC.md)
- [F-STA-OPC — Distribuição de notas](feature-F-STA-OPC.md)
- [F-DSF-OPC — Histórico de janelas de desafio](feature-F-DSF-OPC.md)

O período está fechado: ver o [fechamento](#fechamento-do-período-3-e-da-sprint-6-28112026).
