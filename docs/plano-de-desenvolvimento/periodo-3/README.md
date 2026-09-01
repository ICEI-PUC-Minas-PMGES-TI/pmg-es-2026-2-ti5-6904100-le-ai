# Período 3 — Opcionais e refino

> As features **Opcionais** (`O` em `../../orquestador/REQUISITOS.md` §5), mais **refino**, **testes das desejáveis** do Período 2 e o **ATAM inicial**. As opcionais são o colchão de escopo (`../../orquestador/plano-de-projeto.md` §3): primeiras a serem cortadas se o tempo apertar.
>
> Ver o mapa geral em [../README.md](../README.md).

**Sprint 6 · Alvo:** a partir de 10/11 · **congelamento de features em 17/11** · **Entrega 6 final (40 pts) em 01/12**. Nenhuma feature nova entra depois de 17/11.

| ID | Feature | Serviço | Prioridade | RFs | Escopo |
|---|---|---|---|---|---|
| F-ACV-OPC | Extras de acervo | acervo | opcional | RF-ACV-14, 22 | Recarga manual do data dump; informar assuntos ao cadastrar livro pessoal |
| F-REC-ALG | Recomendação algorítmica + descarte em lote | social | opcional | RF-REC-08..12, 17 | Sugestões por similaridade e por quem o usuário segue (RN-08), com motivo e descarte; descarte em lote das recomendações de um livro (RN-22) |
| F-NOT-OPC | Preferências de notificação + push | social | opcional | RF-NOT-05, 07 | Configurar categorias de notificação; entrega por push em Android (FCM) |
| F-MOD-OPC | Suspensão de conta | social | opcional | RF-MOD-04 | Administrador suspende a conta de um leitor |
| F-GAM-OPC | Calendário e lembrete de streak | leitura | opcional | RF-GAM-04, 05 | Calendário de dias com progresso; lembrete de sequência ativa (depende de push) |
| F-STA-OPC | Distribuição de notas | leitura | opcional | RF-STA-04 | Visualizar a distribuição das notas atribuídas |
| F-DSF-OPC | Histórico de janelas de desafio | leitura | opcional | RF-DSF-05 | Histórico de janelas concluídas de cada desafio, com cumprimento ou não |

## Cross-cutting do período

- **Testes automatizados das features desejáveis** (Período 2).
- **Refino** geral e pendências acumuladas dos períodos anteriores.
- **ATAM inicial** — avaliação de arquitetura (`../../orquestador/documento-de-arquitetura.md` §7 + `../../orquestador/REQUISITOS.md` §7/§8), alimentando o `docs/8.avaliacao_arquitetura.md`.

## Arquivos de feature

Template em `../../orquestador/plano-de-projeto.md` §9. As **regras de implementação compartilhadas** do projeto (idempotência de escrita, paginação, envelope/schema de evento, backfill antes de consumir, testes por feature) valem também aqui e estão em [`../periodo-1/README.md`](../periodo-1/README.md#regras-de-implementação-compartilhadas).

### Contratos transversais

| Contrato | Produtor/dono | Consumidor | Situação no Período 3 |
|---|---|---|---|
| `v_livro_recomendacao_v1` | `acervo` | `social` / F-REC-ALG | previsto no DER e em `docs/4.modelagem.md` §4.2 como item do Período 3; **conteúdo a fechar com `acervo` no arquivo de F-REC-ALG, antes da migration** |
| `sequencia.lembrete` | `leitura` / F-GAM-OPC | `social` / extensão do consumidor de F-NOT | contrato futuro ainda não aprovado; F-GAM-OPC deve fechar nome, schema, chave, consumidor e DLQ antes de ativar o tipo |
| entrega push (FCM Android) | `social` / F-NOT-OPC | — | a arquitetura §5.2 já prevê o consumidor como "social (+ FCM em Android)"; novo é o **registro de dispositivo**, não o fluxo |
| mapa tipo→categoria de notificação | `social` / F-NOT-OPC | — | **PENDENTE** no DER; F-NOT-OPC propõe o agrupamento dos 12 tipos, o grupo decide, e só então a migration do enum sobe |
| suspensão de conta | `social` / F-MOD-OPC | `identidade` | comando autenticado proposto, no mesmo desenho da remoção de resenha de F-MOD; depende de decisão de baseline |
| `opt_out_recomendacao` | `identidade` | `social` / F-REC-ALG | **PENDENTE** §10.7 — "não migrar antes da decisão"; F-REC-ALG consome o sinal social sem o filtro até o grupo resolver |
| alvo vigente na janela selada | `leitura` / F-DSF-OPC | — | extensão de DER **proposta**: `janela_desafio` não guarda o valor-alvo da janela, e editar o desafio falsificaria a razão exibida no histórico (RN-20.7); `cumprida` já atende à letra de RF-DSF-05 — não migrar antes da decisão |

**Escopo enxuto do período:** as opcionais são o colchão de corte (plano §3). Nenhuma delas cria tabela derivada, evento ou job que o requisito não peça — F-REC-ALG calcula em tempo de consulta (§10.7), F-NOT-OPC estende o consumidor existente em vez de criar outro fluxo, F-GAM-OPC lê o dado que F-GAM já persiste, F-ACV-OPC reaproveita o script de F-ACV-INGESTAO, F-STA-OPC deriva o histograma por agrupamento sem entidade nova e F-DSF-OPC apenas retém e sela a janela que F-DSF já cria.

As 7 features do Período 3 estão detalhadas:

- [F-ACV-OPC — Extras de acervo](feature-F-ACV-OPC.md)
- [F-REC-ALG — Recomendação algorítmica + descarte em lote](feature-F-REC-ALG.md)
- [F-NOT-OPC — Preferências de notificação + push](feature-F-NOT-OPC.md)
- [F-MOD-OPC — Suspensão de conta](feature-F-MOD-OPC.md)
- [F-GAM-OPC — Calendário e lembrete de streak](feature-F-GAM-OPC.md)
- [F-STA-OPC — Distribuição de notas](feature-F-STA-OPC.md)
- [F-DSF-OPC — Histórico de janelas de desafio](feature-F-DSF-OPC.md)

Com o detalhamento fechado, o que resta do período é o **cross-cutting** acima: testes das desejáveis, refino das pendências acumuladas e o ATAM inicial.
