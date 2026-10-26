# Catálogo de eventos v1

| Evento | Produtor | Consumidor | Business key | Schema de `data` |
|---|---|---|---|---|
| `ping.teste` | identidade | acervo | `ping:<eventId>` | [`ping.teste.v1`](schemas/ping.teste.v1.schema.json) |
| `seguidor.novo` | identidade | social/notificações | `seguimento:<seguimentoId>` | [`seguidor.novo.v1`](schemas/seguidor.novo.v1.schema.json) |
| `solicitacao.criada` | identidade | social/notificações | `solicitacao:<solicitacaoId>` | [`solicitacao.criada.v1`](schemas/solicitacao.criada.v1.schema.json) |
| `solicitacao.aceita` | identidade | social/notificações | `solicitacao:<solicitacaoId>` | [`solicitacao.aceita.v1`](schemas/solicitacao.aceita.v1.schema.json) |
| `atividade.curtida` | social | social/notificações | `atividade:<atividadeId>:curtida:<autorAcaoId>` | [`atividade.curtida.v1`](schemas/atividade.curtida.v1.schema.json) |
| `atividade.comentada` | social | social/notificações | `comentario:<comentarioId>` | [`atividade.comentada.v1`](schemas/atividade.comentada.v1.schema.json) |
| `comentario.respondido` | social | social/notificações | `comentario:<comentarioId>` | [`comentario.respondido.v1`](schemas/comentario.respondido.v1.schema.json) |
| `usuario.mencionado` | social | social/notificações | `mencao:<comentarioId>:<destinatarioId>` | [`usuario.mencionado.v1`](schemas/usuario.mencionado.v1.schema.json) |
| `leitura.em_risco` | leitura | social/notificações | `leitura:<leituraId>:inatividade:<versao>:<limiar>` | [`leitura.em_risco.v1`](schemas/leitura.em_risco.v1.schema.json) |
| `leitura.expirada` | leitura | social/notificações | `leitura:<leituraId>:inatividade:<versao>:40` | [`leitura.expirada.v1`](schemas/leitura.expirada.v1.schema.json) |
| `livro.importacao_solicitada` | acervo | acervo/importação | `importacao:<importacaoId>` | [`livro.importacao_solicitada.v1`](schemas/livro.importacao_solicitada.v1.schema.json) |
| `livro.pagina_aberta` | acervo | acervo/sinopse | `livro:<livroId>:sinopse` | [`livro.pagina_aberta.v1`](schemas/livro.pagina_aberta.v1.schema.json) |
| `leitura.iniciada` | leitura | social/feed, acervo/capas (F-ACV-NOTA) | `leitura:<leituraId>:iniciada` | [`leitura.iniciada.v1`](schemas/leitura.iniciada.v1.schema.json) |
| `leitura.retomada` | leitura | social/feed | `leitura:<leituraId>:retomada:<eventId>` | [`leitura.retomada.v1`](schemas/leitura.retomada.v1.schema.json) |
| `leitura.finalizada` | leitura | social/feed, leitura/metricas (F-DSF, F-STA) | `leitura:<leituraId>:finalizada` | [`leitura.finalizada.v1`](schemas/leitura.finalizada.v1.schema.json) |
| `leitura.abandonada` | leitura | social/feed | `leitura:<leituraId>:abandonada:<eventId>` | [`leitura.abandonada.v1`](schemas/leitura.abandonada.v1.schema.json) |
| `livro.adicionado_a_estante` | leitura | social/recomendações, acervo/capas (F-ACV-NOTA) | `estante:<usuarioId>:<livroId>` | [`livro.adicionado_a_estante.v1`](schemas/livro.adicionado_a_estante.v1.schema.json) |
| `progresso.registrado` | leitura | leitura/metricas (F-GAM, F-DSF, F-STA) | `progresso:<atualizacaoProgressoId>` | [`progresso.registrado.v1`](schemas/progresso.registrado.v1.schema.json) |
| `nota.alterada` | leitura | acervo/notas (F-ACV-NOTA) | `nota:<usuarioId>:<livroId>` | [`nota.alterada.v1`](schemas/nota.alterada.v1.schema.json) |
| `resenha.publicada` | leitura | social/feed | `resenha:<resenhaId>:publicada` | [`resenha.publicada.v1`](schemas/resenha.publicada.v1.schema.json) |
| `resenha.excluida` | leitura | social/feed | `resenha:<resenhaId>:excluida` | [`resenha.excluida.v1`](schemas/resenha.excluida.v1.schema.json) |
| `recomendacao.recebida` | social | social/notificações | `recomendacao:<recomendacaoId>` | [`recomendacao.recebida.v1`](schemas/recomendacao.recebida.v1.schema.json) |
| `resenha.curtida` | leitura | social/notificações | `resenha:<resenhaId>:curtida:<autorAcaoId>` | [`resenha.curtida.v1`](schemas/resenha.curtida.v1.schema.json) |
| `conta.excluida` | identidade | leitura/conta, social/conta, acervo/conta (F-CONTA-2) | `conta:<usuarioId>` | [`conta.excluida.v1`](schemas/conta.excluida.v1.schema.json) |

Eventos com consumidor futuro são publicados sem fila acumuladora. A feature consumidora executa backfill antes de criar o binding.

`progresso.registrado` e `leitura.finalizada` são consumidos pelo próprio `leitura` na fila `leai.leitura.metricas` (consumidor `leitura.metricas`, com `.dlq`), ligada a `leai.events.leitura` pelas duas routing keys. É o consumidor de métricas único de F-GAM, F-DSF e F-STA: `progresso.registrado` recompõe a sequência diária (F-GAM), os desafios (F-DSF) e as estatísticas (F-STA); `leitura.finalizada` recompõe os desafios e as estatísticas. Os efeitos leem o estado atual do schema, nunca somam o `data`; do `data`, os desafios só usam a data local do fato para limitar a recomposição às janelas que a contêm. Os backfills são `npm run backfill:sequencia`, `npm run backfill:desafios` e `npm run backfill:estatisticas` no `leitura`, rodados antes de o binding subir em cada ambiente. Exclusão de trecho de progresso não publica evento: recalcula dentro do serviço. As escritas de nota também recompõem as estatísticas na própria transação, sem consumir o `nota.alterada`.

`nota.alterada` é consumido pelo `acervo` na fila `leai.acervo.notas` (consumidor `acervo.notas`, com `.dlq`), ligada a `leai.events.leitura`. O consumidor ignora o valor do evento: trava o livro (`pg_advisory_xact_lock`), relê `leitura.v_nota_publicacao_v1` e leva a `nota_leitor_projecao` e a `nota_livro_agregada` ao estado atual, na transação do recibo. Livro pessoal ou inexistente é confirmado sem efeito. O backfill é `npm run backfill:notas` no `acervo`, com a mesma trava, e roda **depois** de o serviço subir em cada ambiente, ao contrário da regra acima: a fila só existe quando o consumidor sobe, e evento publicado antes disso se perde. Rodar o backfill depois recupera o que se perdeu, e os dois convergem mesmo correndo juntos.

O cache de capas oficiais do `acervo` (F-ACV-NOTA, RN-14) consome `livro.adicionado_a_estante` **e** `leitura.iniciada` na fila `leai.acervo.capas` (consumidor `acervo.capas`, com `.dlq`), ligada a `leai.events.leitura` pelas duas routing keys. O segundo evento entra porque iniciar a leitura de um livro fora da estante põe o livro nela sem publicar `livro.adicionado_a_estante`. Os dois só usam o `livroId`, e o efeito lê o estado atual do livro: livro com cópia própria, pessoal ou inexistente é confirmado sem efeito. Ausência e recusa da imagem são confirmadas, e o livro segue com a capa externa; só a indisponibilidade (timeout, rede, 5xx, 429, 420) passa pelo retry e vai à DLQ. **O consumidor só é registrado com `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`**: sem eles a fila não é declarada e os eventos se perdem. O backfill é `npm run backfill:capas` no `acervo`, sobre `leitura.v_estante_publica_v1`, e roda **depois** de o serviço subir em cada ambiente, pelo mesmo motivo do de notas.

`conta.excluida` é publicado pelo job diário do `identidade` quando os 30 dias de recuperação de uma conta vencem (RN-23.5). Cada consumidor tem fila própria, `leai.leitura.conta`, `leai.social.conta` e `leai.acervo.conta`, com sua `.dlq`. Cada um remove do próprio schema os dados e o conteúdo da conta e anonimiza os registros técnicos, conforme a matriz de [F-CONTA-2](../plano-de-desenvolvimento/periodo-2/feature-F-CONTA-2.md#etapa-3-consumidores). O payload leva só o `usuarioId`. Depois de publicado, o envelope é anonimizado na outbox do `identidade`.

`resenha.curtida` (F-AVA-2) é publicado só na **primeira curtida** do par resenha e leitor: o `leitura` guarda `primeira_curtida_em` na reação, mesmo retirada, e retirar e recurtir, alternar ou descurtir não publicam de novo. O destinatário é o autor da resenha. O `livro` do `data` é o snapshot que o `social` guarda para o destino da notificação.

`resenha.excluida` sai também da **remoção pela moderação** (F-MOD): o comando interno `POST /internal/moderacao/resenhas/{id}/remocao` do `leitura` grava o mesmo evento, com o mesmo `data` e a mesma chave de negócio. O `social` já apaga a atividade na própria transação da moderação, então o consumo do evento depois vira no-op.
