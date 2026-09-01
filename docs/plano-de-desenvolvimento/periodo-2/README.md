# Período 2 — Funcionalidades desejáveis

> As features **Desejáveis** (`D` em `../../orquestador/REQUISITOS.md` §5), mais os **testes automatizados das prioritárias** do Período 1.
>
> Ver o mapa geral em [../README.md](../README.md).

**Sprint 5 · Alvo:** 06/10–03/11 (semana de 13/10 sem aula) · **Entrega 5 (15 pts)** no fechamento.

| ID | Feature | Serviço | Prioridade | RFs | Escopo |
|---|---|---|---|---|---|
| F-CONTA-2 | Exclusão de conta | identidade | desejavel | RF-AUT-07 | Excluir a própria conta e dados pessoais (LGPD) |
| F-SOCIAL-2 | Comentários (edição) e menções-link | social | desejavel | RF-SOC-13, 15 | Editar/excluir próprios comentários; resolver menções `@username` para link de perfil |
| F-ACV-DESCOBERTA | Filtros e páginas de autor/editora/série | acervo | desejavel | RF-ACV-03, 10, 11, 12, 21 | Filtros avançados de busca; páginas de autor, editora e série; assuntos exibidos e acionáveis como filtro |
| F-ACV-NOTA | Nota geral e cache de capas | acervo | desejavel | RF-ACV-15, 16, 17 | Importar nota geral externa; exibir nota geral e nota dos leitores como indicadores distintos; cache de capas oficiais (RN-14) |
| F-EST-2 | Favoritos, histórico e busca na estante | leitura | desejavel | RF-EST-09, 10, 13 | Favoritar/desfavoritar, histórico por ano e busca local por título/autor |
| F-SESSAO | Sessão de leitura cronometrada (mobile) | leitura | desejavel | RF-PRG-05..12 | Sessão cronometrada com modo de foco (RN-16), pausa/retomada, cancelamento e recuperação de sessão interrompida — apenas mobile |
| F-AVA-2 | Reações, Markdown e frases | leitura | desejavel | RF-AVA-05, 06, 07, 08, 09 | Curtir/descurtir resenhas com contadores separados, Markdown com preview (RN-13), frases/trechos com página (RN-11) |
| F-DSF | Desafios | leitura | desejavel | RF-DSF-01, 02, 03, 04, 06 | Criar desafios (páginas/minutos/livros; janela diária/semanal/mensal/anual), atualização a cada progresso e a cada leitura finalizada, visualização, editar/pausar/excluir |
| F-STA | Estatísticas | leitura | desejavel | RF-STA-01, 02, 03, 05 | Totais e médias, gráficos de evolução, recálculo assíncrono a partir dos eventos de progresso/conclusão |
| F-GAM | Sequência diária (streak) | leitura | desejavel | RF-GAM-01, 02, 03 | Manter sequência diária (RN-18), ver atual e maior já alcançada, zerar em dia sem progresso |
| F-LST | Listas | social | desejavel | RF-LST-01..06 | Criar/editar/excluir listas, add/remove/reordenar livros, ver listas de outros (respeitando privacidade), livros pessoais em modo consulta (RN-15) |
| F-REC-P2P | Recomendação entre usuários + aba unificada | social | desejavel | RF-REC-01..07, 13, 14, 15, 16 | Recomendar livro entre seguimento mútuo (RN-22), mensagem opcional, ver/descartar recebidas, remoção automática ao adicionar à estante, aba Recomendações |
| F-MOD | Moderação | social | desejavel | RF-MOD-01, 02, 03, 05 | Denunciar resenhas/comentários, painel de denúncias, remover/arquivar, log de auditoria |
| F-NOT-2 | Notificações em tempo real | social | desejavel | RF-NOT-06 | Entrega de notificações ao cliente em tempo real, sem recarga manual |

## Cross-cutting do período

- **Testes automatizados das features prioritárias** (Período 1) — o checkpoint verifica o DoD de cada feature; não cria uma feature separada nem adia testes que já deveriam acompanhar a implementação.

## Arquivos de feature

Template em `../../orquestador/plano-de-projeto.md` §9. As **regras de implementação compartilhadas** do projeto (idempotência de escrita, paginação, envelope/schema de evento, backfill antes de consumir, testes por feature) valem também aqui e estão em [`../periodo-1/README.md`](../periodo-1/README.md#regras-de-implementação-compartilhadas).

### Contratos transversais

| Contrato | Produtor/dono | Consumidor | Situação no Período 2 |
|---|---|---|---|
| `v_lista_livro_pessoal_v1` | `social` / F-LST | `acervo` | aprovado pela feature para autorizar a segunda via de RN-15 |
| `usuario.mencionado` | `social` / F-SOCIAL-2 | `social` / extensão do consumidor de F-NOT | fluxo já previsto na baseline; produtor e novo mapeamento entram juntos em F-SOCIAL-2 |
| `resenha.curtida` | `leitura` / F-AVA-2 | `social` / extensão do consumidor de F-NOT | fluxo já previsto na baseline; produtor e novo mapeamento entram juntos em F-AVA-2 |
| `nota.alterada` | `leitura` / F-AVA | `acervo` / F-ACV-NOTA | fluxo fechado; consumidor mantém projeção individual antes do agregado |
| `livro.adicionado_a_estante` | `leitura` / F-EST | `acervo` / F-ACV-NOTA; `social` / F-REC-P2P | dois consumidores aprovados: cache de capa e remoção de recomendações |
| `recomendacao.recebida` | `social` / F-REC-P2P | `social` / extensão do consumidor de F-NOT | contrato aprovado; produtor e mapeamento entram juntos |
| `progresso.registrado` / `leitura.finalizada` | `leitura` | `leitura` / F-DSF, F-STA e F-GAM | contratos aprovados; publicação por outbox e backfill antes dos consumidores |
| `resenha.excluida` | `leitura` / F-AVA | `social` / F-FEED | contrato aprovado; remove a atividade antiga e suas interações |
| `conta.excluida` | `identidade` / F-CONTA-2 | `leitura`, `social`, `acervo` | aprovado; publicado somente após vencer a recuperação de 30 dias |
| remoção por moderação | `social` / F-MOD | `leitura` | comando HTTP interno autenticado e idempotente |

**Ownership de notificação:** uma feature que introduz um novo tipo entrega também o mapeamento no consumidor de `social`, a chave semântica e os testes de consumo/DLQ. F-NOT permanece a base da lista in-app; F-NOT-2 adiciona somente o transporte em tempo real.

**Escopo enxuto:** quando produtor e efeito pertencem ao mesmo serviço, não se cria evento novo apenas para separar funções internas. Atualização local, recálculo ou marcação de projeção são suficientes, salvo quando o `REQUISITOS.md` exigir explicitamente mensageria.

As 14 features do Período 2 estão detalhadas:

- [F-CONTA-2 — Exclusão de conta](feature-F-CONTA-2.md)
- [F-SOCIAL-2 — Comentários (edição) e menções-link](feature-F-SOCIAL-2.md)
- [F-ACV-DESCOBERTA — Filtros e páginas de autor/editora/série](feature-F-ACV-DESCOBERTA.md)
- [F-ACV-NOTA — Nota geral e cache de capas](feature-F-ACV-NOTA.md)
- [F-EST-2 — Favoritos, histórico e busca na estante](feature-F-EST-2.md)
- [F-SESSAO — Sessão de leitura cronometrada (mobile)](feature-F-SESSAO.md)
- [F-AVA-2 — Reações, Markdown e frases](feature-F-AVA-2.md)
- [F-DSF — Desafios](feature-F-DSF.md)
- [F-STA — Estatísticas](feature-F-STA.md)
- [F-GAM — Sequência diária (streak)](feature-F-GAM.md)
- [F-LST — Listas](feature-F-LST.md)
- [F-REC-P2P — Recomendação entre usuários + aba unificada](feature-F-REC-P2P.md)
- [F-MOD — Moderação](feature-F-MOD.md)
- [F-NOT-2 — Notificações em tempo real](feature-F-NOT-2.md)
