# Período 1 — Funcionalidades prioritárias

> As features **Essenciais** (`E` em `../../orquestador/REQUISITOS.md` §5) — o MVP não negociável, o ciclo mínimo de valor: encontrar um livro → registrar leitura → acompanhar progresso → ver amigos fazendo o mesmo.
>
> Ver o mapa geral em [../README.md](../README.md).

**Sprint 4 · Alvo:** 15/09–29/09 · **Entrega 4 (15 pts)** no fechamento.

| ID | Feature | Serviço | Prioridade | RFs | Escopo |
|---|---|---|---|---|---|
| F-AUT | Autenticação e conta | identidade | prioritaria | RF-AUT-01..06, 08 | Cadastro, login por e-mail/username, tokens de acesso/renovação, recuperação de senha (Brevo), troca de senha, logout, login de admin |
| F-PERFIL | Perfil, privacidade e seguidores | identidade | prioritaria | RF-SOC-01..08 | Editar perfil, ver perfil de outro, busca por username exato, perfil público/privado, seguir/solicitar seguir, deixar de seguir/remover, listas de seguidores e seguidos |
| F-ACV-BUSCA | Busca e página do livro | acervo | prioritaria | RF-ACV-01, 02, 04, 18, 19 | Busca paginada (título/autor/editora/ISBN), filtro por assunto, página do livro, sinopse sob demanda (RN-19) com fallback sem erro |
| F-ACV-CADASTRO | Cadastro de livros (ISBN + pessoal) | acervo | prioritaria | RF-ACV-05, 06, 07, 08, 09 | Cadastro oficial por ISBN (fonte externa), tratamento de ISBN inexistente/duplicado, cadastro/edição/exclusão de livro pessoal |
| F-ACV-INGESTAO | Ingestão do acervo (dump + assuntos) | acervo | prioritaria | RF-ACV-13, 20 | Carga inicial da base oficial a partir de data dump com normalização (RN-12) e associação de assuntos (RN-21) |
| F-EST | Estante e ciclo de leitura | leitura | prioritaria | RF-EST-01..08, 11, 12 | Status na estante, estante por status, iniciar/finalizar/abandonar/reler/retomar, contagem de conclusões, abandono automático em 40 dias (RN-04) e alertas nos dias 20/30 (RN-05) |
| F-PRG | Progresso manual | leitura | prioritaria | RF-PRG-01..04 | Registrar progresso (página + tempo), cálculo de página atual e % concluído, ver/excluir atualizações, validação de página |
| F-AVA | Nota e resenha | leitura | prioritaria | RF-AVA-01..04 | Nota 0–5 com meia estrela, uma resenha por livro, marcação de spoiler, exclusão |
| F-FEED | Feed e interações sociais | social | prioritaria | RF-SOC-09, 10, 11, 12, 14 | Feed cronológico, publicação de atividades (início/retomada/conclusão/abandono/resenha), curtir, comentar e responder (RN-10), menção pré-preenchida ao responder |
| F-NOT | Notificações in-app | social | prioritaria | RF-NOT-01..04 | Geração de notificações in-app, lista paginada com não lidas, marcar lidas (individual/lote), ação de abandonar na notificação de leitura em risco |

O DER implantado contém **59 tabelas e 9 VIEWs** como baseline física compartilhada. Essa implantação não implica que qualquer uma das dez features esteja implementada: prevalecem os status registrados em cada arquivo. O recorte de cadastro/login/`me` herdado de P0-NAV já existe; o restante do escopo funcional do Período 1 permanece por implementar.

## Contratos transversais do período

As features abaixo compartilham serviços e dados, mas continuam obedecendo à regra da arquitetura: nenhum serviço lê tabela crua de outro schema. Os contratos canônicos já estão definidos e devem ser implementados diretamente a partir destas fontes:

- **HTTP e VIEWs entre schemas:** [`identidade.yaml`](../../api/identidade.yaml), [`acervo.yaml`](../../api/acervo.yaml), [`leitura.yaml`](../../api/leitura.yaml) e [`social.yaml`](../../api/social.yaml). Cada spec distingue contrato planejado de operação implementada.
- **Eventos e payloads:** [catálogo de eventos](../../mensageria/catalogo.md) e [schemas JSON canônicos](../../mensageria/README.md), selecionados pelo par `(type, version)`.
- **Envelope, outbox, recibo, retry, DLQ e topologia:** [P0-MSG](../periodo-0/feature-P0-MSG.md).

Os arquivos de feature registram responsabilidades e critérios de aceite, mas não substituem essas fontes canônicas. Mudança de contrato deve ser coordenada pelos envolvidos e refletida primeiro no spec ou schema correspondente; não se cria contrato paralelo dentro da implementação.

| Dono | Contrato canônico de leitura entre schemas | Consumidores no Período 1 | Conteúdo mínimo |
|---|---|---|---|
| `identidade` | [`v_perfil_referencia_v1`](../../api/identidade.yaml) | `acervo`, `leitura`, `social` | id, username, nome de exibição, avatar e privacidade |
| `identidade` | [`v_seguimento_aceito_v1`](../../api/identidade.yaml) | `acervo`, `leitura`, `social` | seguidor e seguido com seguimento aceito |
| `acervo` | [`v_livro_referencia_v1`](../../api/acervo.yaml) | `leitura`, `social` | livro, tipo oficial/pessoal, dono, total de páginas, título, autor para exibição, capa resolvida e estado ativo |
| `leitura` | [`v_estante_publica_v1`](../../api/leitura.yaml) | backfill do cache em F-ACV-NOTA e recomendação futura | usuário, livro, status e nº de conclusões; o perfil usa endpoint autorizado de `leitura` |
| `leitura` | [`v_resenha_publicacao_v1`](../../api/leitura.yaml) | página do livro em `acervo` | resenha, autor, livro, texto, spoiler e timestamps |
| `leitura` | [`v_nota_publicacao_v1`](../../api/leitura.yaml) | página de livro pessoal e recomendação/backfill futuros | autor, livro e valor; a atualização incremental da projeção de `acervo` usa `nota.alterada` |
| `social` | [`v_atividade_livro_pessoal_v1`](../../api/social.yaml) | página de livro pessoal em `acervo` | atividade ativa, autor/dono e livro referenciado, comprovando a via feed de RN-15 |

Tabelas e VIEWs usam nomes distintos porque compartilham o mesmo namespace no PostgreSQL. Os contratos são versionados, documentados junto do spec do serviço dono e só expõem os campos necessários ao consumidor.

### Regras de implementação compartilhadas

- Toda escrita HTTP aplicável aceita `Idempotency-Key` conforme RNF-ERR-04; o spec define escopo, repetição com mesmo payload e conflito quando a chave é reutilizada com payload diferente.
- Toda listagem é paginada e tem limite máximo imposto pelo servidor (RNF-DES-02), inclusive progresso, resenhas, seguidores, feed e notificações.
- Eventos usam o [envelope de P0-MSG](../periodo-0/feature-P0-MSG.md#envelope-v1) e o schema versionado indicado no [catálogo canônico](../../mensageria/catalogo.md). O produtor é aceito pela publicação conforme o contrato; o consumidor é aceito pelo efeito idempotente e pela DLQ, evitando dependência circular no DoD.
- Produtores gravam a alteração de domínio e o evento na mesma transação pela outbox de P0-MSG; publicação direta após commit não atende RNF-ERR-10.
- Deduplicação técnica usa sempre `eventId`, pelo recibo transacional de P0-MSG. Deduplicação semântica não é regra genérica de `businessKey`: só existe quando a feature consumidora a define, como `(leituraId, inatividadeVersao, limiarDias)` nos alertas de inatividade.
- Clientes web e mobile usam o cliente HTTP central com timeout e retentativa com backoff apenas para operações idempotentes; indisponibilidade e timeout têm testes com API simulada (RNF-ERR-03, RNF-TST-06).
- Cada feature inclui testes unitários de regra, integração dos endpoints com banco real/container (RNF-TST-02), testes dos clientes aplicáveis (RNF-TST-04/05) e dos fluxos assíncronos que possuir (RNF-TST-03). O checkpoint do Período 2 revisa esses testes; não adia o DoD do Período 1.
- A massa reproduzível de RNF-TST-08 é entregável transversal: F-PERFIL fornece perfis público/privado e relações, as features de acervo fornecem livro oficial/pessoal, e F-EST fornece todos os estados de leitura. O seed é pequeno e executável em CI/local, sem depender do dump completo.
- Quando o produtor entra antes do consumidor futuro, a feature futura deve executar backfill da fonte contratual antes de consumir novos eventos. Isso se aplica à nota agregada e ao cache de capas; não se presume que mensagens antigas ainda estarão disponíveis no broker.

## Divisão vertical recomendada para 5 pessoas

Esta divisão reduz sobreposição dentro de cada serviço e mantém as integrações mais próximas sob a mesma pessoa. É uma recomendação de trabalho, e cada feature só passa a ter dono quando alguém assume: em 18/09/2026, **F-ACV-INGESTAO e F-ACV-CADASTRO foram assumidas por Vicenzo Fonseca**; em 24/09/2026, **F-AUT e F-PERFIL foram assumidas por Henrique Carvalho**; as demais seguem com **Dono** `a definir`.

| Pessoa | Features | Coesão principal |
|---|---|---|
| 1 | F-AUT + F-PERFIL | serviço `identidade`, sessão, usuário, privacidade e grafo de seguidores |
| 2 | F-ACV-INGESTAO + F-ACV-CADASTRO | modelo e escrita do catálogo no serviço `acervo` |
| 3 | F-ACV-BUSCA + F-AVA | página do livro e sua avaliação, incluindo a fronteira `acervo` ↔ `leitura` |
| 4 | F-EST + F-PRG | máquina de estados, leitura em andamento, progresso e inatividade no serviço `leitura` |
| 5 | F-FEED + F-NOT | projeções, interações e notificações no serviço `social` |

### Ordem de implementação recomendada

1. **Destravar a fundação transversal:** concluir o runtime pendente de [P0-MSG](../periodo-0/feature-P0-MSG.md) (dispatcher, recibo, validação, retry e DLQ). As tabelas de outbox já implantadas não substituem esse runtime.
2. **Fixar produtores e referências básicas em paralelo:** Pessoa 1 implementa F-AUT antes de F-PERFIL; Pessoa 2 implementa F-ACV-INGESTAO antes de F-ACV-CADASTRO; Pessoa 4 implementa o núcleo de F-EST antes de F-PRG. Isso estabiliza sessão, `v_perfil_referencia_v1`, `v_seguimento_aceito_v1`, `v_livro_referencia_v1` e a entidade de leitura sem troca constante entre responsáveis.
3. **Construir a página do livro e seus dados:** Pessoa 3 implementa primeiro o backend/contratos de F-AVA contra `v_livro_referencia_v1` e depois integra F-ACV-BUSCA à `v_resenha_publicacao_v1`; busca e UI podem avançar com o seed reproduzível enquanto a carga completa não termina. Uma única pessoa cuida da principal fronteira visual e de dados da página do livro.
4. **Ligar os consumidores sociais depois dos produtores:** Pessoa 5 prepara a infraestrutura comum de `social`, implementa F-FEED quando os eventos de F-EST/F-AVA e os contratos de F-PERFIL estiverem disponíveis e conclui F-NOT após os produtores de perfil, interação e inatividade. Assim, produtores não ficam bloqueados esperando o efeito consumidor, e cada lado testa sua própria responsabilidade.
5. **Fechar fluxos verticais em DES/HML:** validar na ordem autenticação/perfil → catálogo/página → estante/progresso/avaliação → feed/notificações, usando os contratos canônicos para integrar sem reuniões de redefinição. Falha ou mudança real de contrato volta aos responsáveis pelo produtor e consumidor; implementação normal segue os arquivos já versionados.

### Pendências de consistência da baseline

Estas divergências não podem ser decididas pelos arquivos de feature e devem seguir o controle de mudança do plano §3:

- **Exclusão de conta:** RF-AUT-07 está como Desejável e alocado a F-CONTA-2, mas RNF-SEC-41 pertence ao conjunto de segurança declarado Essencial. F-AUT não marca RNF-SEC-41 como atendido enquanto o grupo não resolver a prioridade.
- **Composição de RF-SOC-02:** o RF Essencial exige listas no perfil, mas F-LST está no Período 2. F-PERFIL entrega no Período 1 identidade, contadores, estante e resenhas disponíveis; não declara RF-SOC-02 integralmente fechado até a decisão do grupo.
- **Delta de ingestão — encerrado em 15/09/2026:** removido do escopo pelo grupo. Carga inicial e recarga manual continuam nas features de acervo.

## Arquivos de feature

Template em `../../orquestador/plano-de-projeto.md` §9. As 10 features do Período 1 estão detalhadas:

- [F-AUT — Autenticação e conta](feature-F-AUT.md)
- [F-PERFIL — Perfil, privacidade e seguidores](feature-F-PERFIL.md)
- [F-ACV-BUSCA — Busca e página do livro](feature-F-ACV-BUSCA.md)
- [F-ACV-CADASTRO — Cadastro de livros (ISBN + pessoal)](feature-F-ACV-CADASTRO.md)
- [F-ACV-INGESTAO — Ingestão do acervo (dump + assuntos)](feature-F-ACV-INGESTAO.md)
- [F-EST — Estante e ciclo de leitura](feature-F-EST.md)
- [F-PRG — Progresso manual](feature-F-PRG.md)
- [F-AVA — Nota e resenha](feature-F-AVA.md)
- [F-FEED — Feed e interações sociais](feature-F-FEED.md)
- [F-NOT — Notificações in-app](feature-F-NOT.md)
