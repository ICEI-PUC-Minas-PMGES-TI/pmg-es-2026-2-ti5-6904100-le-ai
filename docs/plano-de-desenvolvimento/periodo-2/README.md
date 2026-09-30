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
| F-EST-2 | Favoritos, histórico e buscas | leitura | desejavel | RF-EST-09, 10, 13 | Favoritar/desfavoritar; histórico de ocorrências concluídas pesquisável por título/autor, com consulta do progresso; busca local na estante |
| F-SESSAO | Sessão de leitura cronometrada (mobile) | leitura | desejavel | RF-PRG-05..12 | Sessão cronometrada com modo de foco (RN-16), pausa/retomada, cancelamento e recuperação de sessão interrompida — apenas mobile |
| F-AVA-2 | Reações, Markdown e frases | leitura | desejavel | RF-AVA-05, 06, 07, 08, 09 | Curtir/descurtir resenhas com contadores separados, Markdown com preview (RN-13), frases/trechos com página (RN-11) |
| F-DSF | Desafios | leitura | desejavel | RF-DSF-01, 02, 03, 04, 06 | Criar desafios (páginas/minutos/livros; janela diária/semanal/mensal/anual), atualização a cada progresso e a cada leitura finalizada, visualização, editar/pausar/excluir |
| F-STA | Estatísticas | leitura | desejavel | RF-STA-01, 02, 03, 05 | Totais e médias, gráficos de evolução, recálculo assíncrono a partir dos eventos de progresso/conclusão |
| F-GAM | Sequência diária (streak) | leitura | desejavel | RF-GAM-01, 02, 03 | Manter sequência diária (RN-18), ver atual e maior já alcançada, zerar em dia sem progresso |
| F-LST | Listas | social | desejavel | RF-LST-01..06 | Criar/editar/excluir listas, add/remove/reordenar livros, ver listas de outros (respeitando privacidade), livros pessoais em modo consulta (RN-15) |
| F-REC-P2P | Recomendação entre usuários + aba unificada | social | desejavel | RF-REC-01..07, 13, 14, 15, 16 | Recomendar livro entre seguimento mútuo (RN-22), mensagem opcional, ver/descartar recebidas, remoção automática ao adicionar à estante, aba Recomendações |
| F-MOD | Moderação | social | desejavel | RF-MOD-01, 02, 03, 05 | Denunciar resenhas/comentários, painel de denúncias, remover/arquivar, log de auditoria |
| F-NOT-2 | Notificações em tempo real | social | desejavel | RF-NOT-06 | Entrega de notificações ao cliente em tempo real, sem recarga manual |

## Divisão do Período 2 entre 5 pessoas

Divisão fechada em **29/09/2026**. Segue o mesmo critério do Período 1 (plano §6: divisão vertical, dono de ponta a ponta), com três regras para reduzir a conversa entre devs:

1. **Continuidade:** quem construiu uma área no Período 1 fica com o que a estende no Período 2. O dono já conhece o código, os contratos e as telas, e não precisa perguntar a ninguém.
2. **Produtor e consumidor com a mesma pessoa:** quando uma feature publica algo e outra consome, as duas ficam com o mesmo dono sempre que der. Assim o contrato é combinado com a própria pessoa.
3. **Telas compartilhadas com um integrador:** o Período 2 tem telas que muitas features editam. Cada uma fica com quem já é dono dela, e os outros só encaixam um item pequeno (item de menu, bloco, botão).

| Pessoa | Features do Período 2 | Serviços | Por que agrupa |
|---|---|---|---|
| Henrique Carvalho | [F-CONTA-2](feature-F-CONTA-2.md) + [F-LST](feature-F-LST.md) | `identidade`, `social` (+ consumidores da exclusão) | É dono de `identidade`, e a exclusão nasce lá. As listas aparecem como aba e seção do perfil (F-PERFIL, dele) e respeitam a privacidade do RN-08, que ele implementou. |
| Vicenzo Fonseca | [F-ACV-DESCOBERTA](feature-F-ACV-DESCOBERTA.md) + [F-DSF](feature-F-DSF.md) + [F-STA](feature-F-STA.md) + [F-GAM](feature-F-GAM.md) | `acervo`, `leitura` | A DESCOBERTA depende da normalização de autor, editora e série feita na F-ACV-INGESTAO (dele). DSF, STA e GAM são os três consumidores de `progresso.registrado` e `leitura.finalizada`: um consumidor, um backfill e os três blocos do Meu perfil, tudo com uma pessoa. |
| Renato Douglas | [F-AVA-2](feature-F-AVA-2.md) + [F-MOD](feature-F-MOD.md) + [F-ACV-NOTA](feature-F-ACV-NOTA.md) | `leitura`, `social`, `acervo` | É dono da página do livro e da resenha. Reações, Markdown e frases estendem a F-AVA (dele). A MOD remove resenha e frase: o comando `social` → `leitura` fica entre features da mesma pessoa. A NOTA consome `nota.alterada` da F-AVA (dele) e mexe na nota exibida na página do livro. |
| Ana Luiza de Freitas | [F-EST-2](feature-F-EST-2.md) + [F-SESSAO](feature-F-SESSAO.md) | `leitura`, mobile | Estante, ações de leitura, registrar progresso e atualizações são telas dela no Período 1. A SESSAO reaproveita o endpoint, a fila offline e as regras de progresso da F-PRG, também dela. As quatro edições dessas telas ficam 100% com ela. |
| Kayke | [F-NOT-2](feature-F-NOT-2.md) + [F-SOCIAL-2](feature-F-SOCIAL-2.md) + [F-REC-P2P](feature-F-REC-P2P.md) | `social` | É dono de feed, comentários e notificações. A SOCIAL-2 edita os comentários dele, a NOT-2 é o transporte das notificações dele, e três dos quatro tipos novos de notificação (menção, recomendação e o tempo real) ficam com ele. A REC-P2P consome `livro.adicionado_a_estante` como o feed já faz. |

Ficam 14 features, com 2 a 4 por pessoa. As pesadas estão espalhadas: CONTA-2 e LST com Henrique, DESCOBERTA com Vicenzo, AVA-2 e MOD com Renato, SESSAO com Ana e REC-P2P com Kayke. GAM, NOT-2 e SOCIAL-2 são leves e servem para equilibrar.

### O que ainda cruza entre pessoas

**Contratos já fechados, sem conversa necessária** (o produtor já existe desde o Período 1 e o schema está no catálogo):

- `progresso.registrado` e `leitura.finalizada`: Ana → Vicenzo.
- `livro.adicionado_a_estante`: Ana → Renato (cache de capa) e Kayke (remove a recomendação).
- `nota.alterada`: o produtor e o consumidor são do Renato.

**Contratos em que alguém mexe no código de outro** (são poucos e pequenos):

| Ponto | Quem faz | No código de | Tamanho |
|---|---|---|---|
| Mapeamento de `resenha.curtida` no consumidor de notificações | Renato | Kayke | Um tipo novo, seguindo o padrão das notificações do Período 2 |
| `v_lista_livro_pessoal_v1` (segunda via de acesso do RN-15 no livro pessoal) | Henrique | Vicenzo (`acervo`, livro pessoal) | Uma VIEW + checagem de acesso |
| Consumidores de `conta.excluida` em `leitura`, `social` e `acervo` | Henrique | todos | Apagam dados; a matriz de remoção por tabela é o contrato |

**Telas compartilhadas e quem integra cada uma:**

| Tela | Integrador | Quem encaixa algo |
|---|---|---|
| Página do livro (7 features) | Renato (AVA-2, MOD e NOTA são dele) | Vicenzo (assuntos e links da ficha), Ana (favoritar), Henrique (`Adicionar à lista`), Kayke (`Recomendar`) |
| Meu perfil e perfil de outro leitor | Henrique (F-PERFIL + LST) | Vicenzo (blocos de streak, estatísticas e desafios), Renato (contagens de reação) |
| Notificações | Kayke | Renato (tipo `curtida`) |
| Descobrir | Vicenzo (filtros) | Kayke (seção de recomendações) |
| Livro pessoal | Renato (frases, reações, denúncia) | Henrique (via lista) |
| Comentários | Kayke | Renato (`Denunciar comentário`) |

Nesses pontos, o integrador abre a estrutura primeiro (o menu `DotsThree` do header e da resenha na página do livro, a aba `Listas` do perfil, o enum de tipos de notificação), e os outros só encaixam o item. É a regra do plano §6, "quem chega primeiro define a estrutura", aplicada de propósito.

### Ordem sugerida (06/10 a 03/11)

1. **Primeira semana:**
   - Os integradores abrem as estruturas das telas compartilhadas.
   - Vicenzo escreve o consumidor de métricas com backfill, que serve para DSF, STA e GAM.
   - Henrique começa pela LST, porque AVA-2 e MOD dependem da via lista (RN-15).
2. **Meio do período:** o miolo de cada feature, cada um no seu serviço.
3. **Fim do período:** a F-CONTA-2 fecha por último. Ela precisa do inventário de todas as tabelas criadas no Período 2, e a matriz de remoção por tabela é o único ponto em que cada dono contribui com uma lista, não com código.

Os testes das prioritárias do Período 1 (cross-cutting abaixo) ficam naturalmente com o mesmo dono de cada área, já que a continuidade foi mantida.

### Alternativas, se o peso ficar torto

Não adotadas; ficam registradas para rebalancear durante o período:

- **Vicenzo sobrecarregado:** passar a F-GAM para a Ana. A GAM é pequena, só mobile, e só consome `progresso.registrado`, que é da Ana. Fica 3 para Vicenzo e 3 para Ana, ao custo de dividir o consumidor de métricas em dois.
- **Renato espalhado em três serviços:** devolver a F-ACV-NOTA para o Vicenzo. A importação da nota geral usa as chaves de dedup da F-ACV-INGESTAO, que são dele. Nesse caso é melhor passar também a GAM para a Ana, para Vicenzo não ficar com cinco features.

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
- [F-EST-2 — Favoritos, histórico e buscas](feature-F-EST-2.md)
- [F-SESSAO — Sessão de leitura cronometrada (mobile)](feature-F-SESSAO.md)
- [F-AVA-2 — Reações, Markdown e frases](feature-F-AVA-2.md)
- [F-DSF — Desafios](feature-F-DSF.md)
- [F-STA — Estatísticas](feature-F-STA.md)
- [F-GAM — Sequência diária (streak)](feature-F-GAM.md)
- [F-LST — Listas](feature-F-LST.md)
- [F-REC-P2P — Recomendação entre usuários + aba unificada](feature-F-REC-P2P.md)
- [F-MOD — Moderação](feature-F-MOD.md)
- [F-NOT-2 — Notificações em tempo real](feature-F-NOT-2.md)
