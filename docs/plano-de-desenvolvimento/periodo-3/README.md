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

Ainda não criados. Cada feature ganhará um `feature-<ID>.md` (template em `../../orquestador/plano-de-projeto.md` §9) quando o detalhamento começar.
