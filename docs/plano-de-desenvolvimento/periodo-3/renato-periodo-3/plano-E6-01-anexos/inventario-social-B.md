# Inventário de testes — grupo social-B (F-LST e F-REC-P2P)

Levantado em 14/11/2026 sobre o código no disco (igual à `origin/desenvolvimento`). Somente leitura.

Fontes lidas: `docs/9.plano_de_testes.md` (§9.6 a §9.8; nenhum caso de listas ou de recomendação existe lá), `docs/plano-de-desenvolvimento/periodo-2/feature-F-LST.md`, `docs/plano-de-desenvolvimento/periodo-2/feature-F-REC-P2P.md`, `docs/orquestador/REQUISITOS.md` (§5.6, §5.13, RN-08, RN-15, RN-22, §8 A01, §9, §10.8) e o log do `ci-back-social` da execução 39883097401 (a referência da §9.7).

Prefixos como no plano: `SO/` = `code/back/social/src/test/java/br/com/leai/social/`, `AC/` = `code/back/acervo/`, `WEB/` = `code/front/src/`, `MOB/` = `code/mobile/test/`.

Formato do nome do teste: Java usa o `@DisplayName` do método. Quando o método fica dentro de uma classe `@Nested`, o `@DisplayName` da classe aparece antes, como um `describe` (ex.: `privacidade (RN-08) › "..."`). Vitest usa `describe › "it"`. Flutter usa `group › "test"` quando há `group`. Os nomes foram copiados do código e conferidos com grep. Nomes com `$status` vêm de laço `for` no Flutter, e o teste conta como 1.

Nenhum dos arquivos citados tem `@Disabled`, `it.skip`, `xit`, `describe.skip` nem `skip:`.

---

## 1. F-LST — Listas

**Dono:** Henrique Carvalho. **Arquivo de feature:** `social` (backend), web e mobile. A etapa 3 também mexeu no `acervo`: a via `?via=lista` do livro pessoal foi implementada lá pelo próprio dono da F-LST em 07/10/2026. RF-LST-01..06; também fecha a parte de listas de RF-SOC-02.

### 1.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da F-LST | Cobre |
|---|---|---|---|
| `SO/integracao/ListaControllerIntegracaoTest.java` | 24 (em 6 classes `@Nested`) | 24 | RF-LST-01..05, RN-08, RN-15.1, RNF-SEC-02/03, RNF-DES-02, RNF-ERR-04, limites 80/300, `contemLivro`, VIEW `v_lista_livro_pessoal_v1` |
| `SO/lista/RegrasDeListaTest.java` | 6 | 6 | RN-15.1 (unitário), livro inativo, cursor `(ordem, id)` |
| `SO/integracao/DenunciaIntegracaoTest.java` | 14 | 1 (é da F-MOD) | RN-15.4 pela via lista: "Livro pessoal pela lista: perfil público basta; privada exige seguir" |
| `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` | 5 | 1 (é da F-CONTA-2) | listas da conta excluída somem e as da outra conta ficam: "remove o que é da conta e o que pende do conteúdo dela; o da outra fica" |
| `AC/test/integracao/livro-pessoal.int-spec.ts` | 32 | 13 (`describe` "terceiro pela lista do dono (RN-15, RN-08)") | RF-LST-06, RN-15.2/3/5/6, RN-08, RNF-SEC-06/07 |
| `AC/src/livros/pessoal/livro-pessoal.service.spec.ts` | 22 | 2 | RF-LST-06 (unitário: via lista válida e inválida) |
| `AC/test/integracao/assuntos-livro-pessoal.int-spec.ts` | 13 | 1 (é da F-ACV-OPC) | "terceiro pela lista vê os assuntos; sem via, 403" |
| `WEB/views/listas/ListaView.spec.ts` | 11 | 11 | RF-LST-02/04/06, RN-08 (403), RNF-TST-06 (falha de rede) |
| `WEB/components/listas/FormularioDeLista.spec.ts` | 6 | 6 | RF-LST-01/03, limite 80, RNF-USA-04, chave de idempotência no reenvio |
| `WEB/components/listas/AdicionarALista.spec.ts` | 5 | 5 | RF-LST-02 (`contemLivro`), RF-LST-05 (faixa do livro pessoal) |
| `WEB/services/listas.spec.ts` | 6 | 6 | contrato HTTP do serviço (RNF-TST-05) |
| `WEB/listas/textos.spec.ts` | 4 | 4 | texto da exclusão e contagem de caracteres igual ao `char_length` |
| `WEB/router/abas.spec.ts` | 2 | 1 (o `it.each` tem linhas de listas) | rotas `/perfil/listas…`, `/leitores/:username/listas/:id` e `via=lista` |
| `WEB/views/perfil/PerfilDeOutroView.spec.ts` | 25 | 2 | aba `Listas` no perfil de outro; RN-08 sem chamar o serviço de listas |
| `WEB/views/livros/LivroPessoalView.spec.ts` | 18 | 0 (2 usam `via=lista`, mas são da F-ACV-OPC e da F-MOD) | — |
| `MOB/features/listas/lista_page_test.dart` | 12 | 12 | RF-LST-02/04/06, RN-08 (403), RNF-TST-06, acessibilidade do reordenar |
| `MOB/features/listas/lista_form_page_test.dart` | 7 | 7 | RF-LST-01/03, limite 80, RNF-USA-04 |
| `MOB/features/listas/listas_do_leitor_test.dart` | 7 | 7 | índice e seção do perfil, RN-08 |
| `MOB/features/listas/folha_adicionar_a_lista_test.dart` | 4 | 4 | RF-LST-02, RF-LST-05 |
| `MOB/features/listas/listas_service_test.dart` | 4 | 4 | contrato HTTP do serviço (RNF-TST-04) |
| `MOB/app/router_test.dart` | 31 | 2 | rotas de listas nas abas Perfil e Feed |
| `MOB/features/livros/livro_pessoal_page_test.dart` | 19 | 1 (+1 da F-MOD com `via: 'lista'`) | estado indisponível pela lista ("Voltar à lista") |
| `MOB/features/livros/livro_oficial_page_test.dart` | 40 | 1 | `Mais ações` (menu criado pela F-LST) acionável pelo leitor de tela |

**Total da F-LST:** 19 arquivos com testes da feature e 118 testes (social 30, acervo 15, web 35, mobile 38). Outros 6 testes, de outras features (F-MOD, F-CONTA-2, F-ACV-OPC), passam por listas sem testar a F-LST: 5 deles em 4 arquivos só tangenciais e 1 no `livro_pessoal_page_test.dart` do mobile.

### 1.2 Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-LST-01 | RF-LST-01 | Criar lista própria | 201; a lista aparece para o dono com `pertenceAoSolicitante` | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › criar e editar › "cria lista do próprio leitor, que aparece para ele com pertenceAoSolicitante" |
| CT-LST-02 | RF-LST-01 | Título vazio, título com mais de 80 caracteres e descrição com mais de 300 | 400 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › criar e editar › "recusa título vazio, título acima de 80 e descrição acima de 300" |
| CT-LST-03 | RF-LST-01, RF-LST-02 | Criar a lista a partir de um livro (`livroId`) | A lista nasce com o livro na posição 1 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › criar e editar › "com livroId, a lista nasce com o livro na posição 1" |
| CT-LST-04 | RF-LST-03 | Editar só alguns campos | Campo omitido fica igual, descrição nula apaga, corpo vazio é 400 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › criar e editar › "PATCH: omitido mantém, descrição nula apaga, corpo vazio é 400" |
| CT-LST-05 | RF-LST-03, RNF-SEC-02 | Outro leitor tenta editar, excluir, adicionar, remover e mover numa lista que não é dele | 404 em todas as operações; nada muda | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › propriedade › "escrita em lista alheia responde 404 e não altera nada" |
| CT-LST-06 | RF-LST-03 | Excluir lista | A lista some das rotas e da VIEW da via lista; repetir a exclusão dá 204 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › excluir e índice › "excluir tira a lista das rotas e da VIEW de via lista; repetir responde 204" |
| CT-LST-07 | RF-LST-02 | Adicionar um livro que já está na lista | 200 com o item que já existia, sem duplicar | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › livros da lista › "adicionar de novo o mesmo livro responde 200 com o item, sem duplicar" |
| CT-LST-08 | RF-LST-02 | Mover um item para o início, o meio e o fim | Posições continuam seguidas, sem buraco | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › livros da lista › "mover para o início, o meio e o fim mantém as posições contínuas" |
| CT-LST-09 | RF-LST-02 | Mover para uma posição fora de 1..n, ou mover um item que não existe | 400 ou 404; a ordem não fica pela metade | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › livros da lista › "posição fora de 1..n responde 400 e não deixa ordem parcial" |
| CT-LST-10 | RF-LST-02 | Remover um livro do meio | As posições se fecham; remover um livro que não está na lista dá 204 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › livros da lista › "remover fecha o buraco; remover livro ausente responde 204" |
| CT-LST-11 | RF-LST-02 | Livro pessoal excluído no meio da lista | A posição visível continua seguida e mover cai no lugar certo | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › livros da lista › "livro pessoal excluído no meio: posições visíveis seguem contínuas e mover acerta o lugar" |
| CT-LST-12 | RF-LST-04, RNF-DES-02 | Paginar os itens | Cursor funciona; cursor adulterado e limite acima de 50 dão 400 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › livros da lista › "itens paginam por cursor; cursor adulterado e limite acima de 50 são 400" |
| CT-LST-13 | RF-LST-04 | Índice de listas do perfil | Mais recente primeiro, até três capas e a contagem | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › excluir e índice › "índice: alterada mais recente primeiro, três capas e contagem" |
| CT-LST-14 | RF-LST-04, RN-08 | Perfil público | Qualquer leitor vê a lista, os itens e o índice sem seguir | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › privacidade (RN-08) › "perfil público: qualquer leitor vê a lista, os itens e o índice, sem seguir" |
| CT-LST-15 | RF-LST-04, RN-08, RNF-SEC-03 | Perfil privado | O seguidor aceito vê; quem não segue recebe 403 `ACESSO_NEGADO` na lista, nos itens e no índice | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › privacidade (RN-08) › "perfil privado: seguidor aceito vê; quem não segue recebe 403 de perfil privado" |
| CT-LST-16 | RF-LST-04, RN-08 (suspensão) | Lista de conta suspensa | Lista e índice dão 404 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › privacidade (RN-08) › "conta suspensa some: lista e índice respondem 404" |
| CT-LST-17 | RF-LST-05, RN-15.1 | O dono adiciona o próprio livro pessoal e depois o de outro leitor | O próprio entra com link `via=lista`; o de outro dá 422 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › livros da lista › "livro pessoal próprio entra com via=lista; o de outro leitor responde 422" |
| CT-LST-18 | RF-LST-05, RN-15.1 | Regra de quem pode pôr um livro pessoal na lista | Só o dono, só nas listas dele | unitário | `SO/lista/RegrasDeListaTest.java` › "RN-15.1: livro pessoal só entra na lista do próprio dono" |
| CT-LST-19 | RNF-ERR-04 | Repetir a criação com a mesma `Idempotency-Key` e o mesmo corpo | Mesma resposta; uma lista só | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › idempotência › "mesma chave e payload reproduz a resposta sem criar duas listas" |
| CT-LST-20 | RNF-ERR-04 | Mesma chave com outro corpo | 409 | integração | `SO/integracao/ListaControllerIntegracaoTest.java` › idempotência › "mesma chave com outro payload responde 409" |
| CT-LST-21 | RF-LST-06, RN-15, RN-08 | Terceiro abre o livro pessoal pela lista de um dono com perfil público | Página em modo consulta, sem exigir que o terceiro siga o dono | integração | `AC/test/integracao/livro-pessoal.int-spec.ts` › livro pessoal (integração) › terceiro pela lista do dono (RN-15, RN-08) › "perfil público libera qualquer leitor, sem exigir seguimento" |
| CT-LST-22 | RF-LST-06, RN-15.5, RNF-SEC-03 | Terceiro que não segue um dono com perfil privado | 403 | integração | `AC/test/integracao/livro-pessoal.int-spec.ts` › livro pessoal (integração) › terceiro pela lista do dono (RN-15, RN-08) › "não seguidor de perfil privado é negado" |
| CT-LST-23 | RF-LST-06, RNF-SEC-06 | `referenciaId` forjado | 403 | integração | `AC/test/integracao/livro-pessoal.int-spec.ts` › livro pessoal (integração) › terceiro pela lista do dono (RN-15, RN-08) › "referência forjada é negada" |
| CT-LST-24 | RN-15.6 | Lista excluída ou livro tirado da lista | O acesso do terceiro acaba na hora | integração | `AC/test/integracao/livro-pessoal.int-spec.ts` › livro pessoal (integração) › terceiro pela lista do dono (RN-15, RN-08) › "lista excluída ou livro retirado corta o acesso na hora (RN-15.6)" |
| CT-LST-25 | RN-15.3, RNF-SEC-07 | Terceiro chega pela lista e tenta escrever no livro | Escrita negada | integração | `AC/test/integracao/livro-pessoal.int-spec.ts` › livro pessoal (integração) › terceiro pela lista do dono (RN-15, RN-08) › "a via da lista não libera escrita a terceiro (RN-15.3)" |
| CT-LST-26 | RF-LST-02 | Web: mover um livro para baixo | Troca de lugar com o vizinho e envia a posição visível | web | `WEB/views/listas/ListaView.spec.ts` › ListaView › "mover para baixo troca com o vizinho e envia a posição visível" |
| CT-LST-27 | RF-LST-02, RNF-ERR-04 | Web: falha ao mover | A ordem volta e "Tentar de novo" reenvia com a mesma chave | web | `WEB/views/listas/ListaView.spec.ts` › ListaView › "falha ao mover: volta à ordem anterior e oferece repetir com a mesma chave" |
| CT-LST-28 | RF-LST-04, RF-LST-06 | Web: lista de outro leitor | Só leitura; o livro pessoal abre com `via=lista` | web | `WEB/views/listas/ListaView.spec.ts` › ListaView › "outro leitor: só leitura, linha de dono, e livro pessoal abre com via=lista" |
| CT-LST-29 | RN-08 | Web: 403 ao abrir a lista | Bloco de perfil privado, sem o título nem os livros | web | `WEB/views/listas/ListaView.spec.ts` › ListaView › "403: bloco de perfil privado com o nome, sem título nem livros da lista" |
| CT-LST-30 | RF-LST-03, RNF-USA-04 | Web: excluir a lista | Pede confirmação; "Cancelar" mantém o que foi digitado; confirmar exclui | web | `WEB/components/listas/FormularioDeLista.spec.ts` › FormularioDeLista › "excluir troca o conteúdo pela confirmação; Cancelar volta com as mudanças" |
| CT-LST-31 | RF-LST-02 | Mobile: modo `Reordenar` | Alças aparecem no lugar do menu; "Concluir" sai do modo | mobile | `MOB/features/listas/lista_page_test.dart` › "modo de reordenação: alças no lugar do menu e "Concluir" sai do modo" |
| CT-LST-32 | RN-08 | Mobile: perfil privado sem acesso (403) | Bloco de restrição; nada da lista aparece | mobile | `MOB/features/listas/lista_page_test.dart` › "perfil privado sem acesso (403): bloco de restrição, nada da lista" |
| CT-LST-33 | RNF-TST-06 | Mobile: serviço fora do ar | Banner com "Tentar de novo"; tentar de novo carrega | mobile | `MOB/features/listas/lista_page_test.dart` › "serviço fora do ar: banner com "Tentar de novo", e tentar de novo carrega" |
| CT-LST-34 | RF-LST-03, RNF-USA-04 | Mobile: excluir a lista | Pede confirmação com o título e só então chama `DELETE` | mobile | `MOB/features/listas/lista_form_page_test.dart` › "excluir pede confirmação com o título salvo e só então apaga" |

São 34 casos, acima da faixa de 10 a 22. A feature tem 6 RFs e mexe em dois serviços (`social` e `acervo`) e em dois clientes. Se for preciso cortar, CT-LST-11, 13, 16, 20 e 31 são os que menos perdem.

Outros testes que valem como caso alternativo, sem ID: "/me/listas com livroId marca contemLivro em cada lista" e "escrita sem Idempotency-Key responde 400" (`ListaControllerIntegracaoTest`). Também: "seguidor aceito de perfil privado abre em modo consulta", "dono suspenso ou em exclusão não libera, mesmo com lista válida", "VIEW de listas indisponível responde 503, nunca 500 nem 403" e "id de atividade do feed não vale como lista, nem o inverso" (`livro-pessoal.int-spec.ts`). E "outro leitor com conteúdo restrito: bloco RN-08 sem consultar o social" (`listas_do_leitor_test.dart`).

### 1.3 Critérios, RNs e RFs sem teste aparente (candidatos a lacuna) — dono: Henrique Carvalho

| # | Lacuna | Requisito ou critério | O que procurei e onde |
|---|---|---|---|
| 1 | Rotas de listas sem token devem dar 401; não há teste próprio | RNF-SEC-01 | Procurei `401` e requisição sem `Authorization` em `ListaControllerIntegracaoTest`. Só existe o teste genérico `SO/integracao/SegurancaIntegracaoTest.java` (CT-TRV-05), com um controller de teste |
| 2 | Limite de escritas por usuário em listas (`limiteDeListas`, 30 por minuto) | Decisão da etapa 2; RNF-SEC-18 por analogia | Procurei `429` e `limiteDe` em `ListaControllerIntegracaoTest`. `LimitePorUsuarioTest` e `RateLimitFilterTest` são genéricos, e o segundo cobre só feed e denúncias |
| 3 | Reordenar com um item de **outra** lista (item alheio) | Critério "Reordenação com item alheio ou ausente é recusada" | CT-LST-09 só testa um UUID aleatório (item ausente, 404) |
| 4 | Idempotência das escritas de item (adicionar, remover, mover) e de `PATCH`/`DELETE` | RNF-ERR-04 | Os 3 testes de `idempotência` usam só `POST /listas` |
| 5 | Título e descrição tratados como texto (escape) | RNF-SEC-14 | Procurei `<script`, `escape` e `html` nos testes de listas do `social`, da web e do mobile |
| 6 | Pedido de seguir ainda **pendente** não libera listas de perfil privado | RN-08, RNF-SEC-03 | O teste de privado só compara seguidor aceito com quem não segue. O caso pendente só existe na VIEW de `identidade` (CT-FEE-04) |
| 7 | Teto de paginação de `GET /perfis/{id}/listas` (`size` acima de 50) | RNF-DES-02 | Só `/me/listas?size=51` é testado |
| 8 | Timeout explícito com API simulada | RNF-TST-06; item de DoD desmarcado | Procurei `timeout`, `TimeoutException` e "tempo limite" nos specs de listas. Só há falha de rede e 503. A Timeline de 25/10 já registra isso |
| 9 | Terceiro abre o livro pessoal pela lista **com sucesso**, em modo consulta, no cliente | RF-LST-06 nos clientes | No mobile, o único teste com `via: 'lista'` cobre só os erros 400 e 403 (indisponível). Na web, `via=lista` só aparece em testes da F-ACV-OPC e da F-MOD, e não há teste do estado "Voltar à lista" |
| 10 | Web: seção e aba `Listas` do **próprio** perfil (`ListasDoPerfil.vue`), índice (`ListasDoLeitorView.vue`) e entrada `Adicionar à lista` no menu `Mais ações` do livro oficial ou pessoal | RF-LST-01/02/04 na web | Esses `.vue` não têm spec. Procurei "Adicionar à lista" nos specs da web: nenhum resultado. No mobile, `listas_do_leitor_test.dart` cobre o equivalente |
| 11 | Teste **unitário** de RN-08 nas listas | RNF-TST-01 | `RegrasDeListaTest` não tem RN-08. Engrossa a L-01 da §9.8 |
| 12 | "Listas funcionam em DES" | Critério de aceite; item de DoD desmarcado | Teste manual. A validação em DES ainda não foi feita (etapa 6 pendente) |

### 1.4 Divergências e coisas estranhas

- **Serviços:** a tabela recebida diz "serviço social". O arquivo de feature lista `social` + web + mobile, mas a etapa 3 (07/10) mudou o `acervo` (`autorizacao-rn15.service.ts`, `contratos-externos.ts`), com 13 testes de integração e 2 unitários lá. Os RFs batem: RF-LST-01..06.
- **CI não conta os 24 testes de `ListaControllerIntegracaoTest`.** Conferi no log da execução 39883097401 (a usada na §9.7):
  - a classe aparece com `Tests run: 0, … -- in br.com.leai.social.integracao.ListaControllerIntegracaoTest`;
  - a soma das linhas por classe dá exatamente os 254 do total;
  - mas o log mostra os contextos Spring das classes `$CriarEEditar`, `$Propriedade`, `$Livros`, `$Privacidade`, `$ExcluirEIndice` e `$Idempotencia`, além de respostas 400, 404 e 422 dentro do bloco da classe. Ou seja, os testes **rodam**.

  Duas consequências: os 254 da §9.7 deixam de fora esses 24, e o resumo do surefire 3.5.6 não mostra se eles passaram. Vale conferir pelo XML do relatório ou rodando localmente. A Timeline da F-LST (25/10) já registra o "0 testes".
- **Comentário desatualizado no mobile:** `MOB/features/livros/livro_pessoal_page_test.dart`, antes de "pela lista, $status: indisponível com "Voltar à lista"", ainda diz "até a etapa 3, o `acervo` recusa `via=lista` com 400". A etapa 3 foi entregue em 07/10. O teste ainda vale para 403, mas o 400 deixou de ser o cenário real.
- **Contagens do arquivo de feature:** a Timeline de 05/10 fala em "23 novos em `ListaControllerIntegracaoTest`"; o arquivo tem 24, como diz o Status. A Timeline do `acervo` fala em "14 casos de integração": são 13 no `describe` "terceiro pela lista do dono", mais "via desconhecida é pedido malformado", que fica no `describe` da via feed.
- **DoD:** os itens de teste ("Testes unitários e de integração…" e "Testes web/mobile cobrem reordenação…") estão desmarcados.

---

## 2. F-REC-P2P — Recomendação entre leitores

**Dono:** Kayke. **Arquivo de feature:** `social` (backend), web e mobile. RF-REC-01..07, 13, 14, 15 e 16. RF-REC-17 (descarte em lote) e RF-REC-08..12 ficam na F-REC-ALG e **não** foram contados aqui.

### 2.1 Arquivos de teste

| Arquivo | Testes no arquivo | Da F-REC-P2P | Cobre |
|---|---|---|---|
| `SO/integracao/RecomendacaoControllerIntegracaoTest.java` | 9 | 9 | RF-REC-01..07/15, RN-22.1-5/7/9/11/15, RNF-SEC-02/18, RNF-ERR-04, RNF-DES-02, outbox de `recomendacao.recebida` |
| `SO/recomendacao/service/RemocaoDeRecomendacoesIntegracaoTest.java` | 4 | 4 | RF-REC-16, RN-22.9/10, RNF-ERR-06 |
| `SO/recomendacao/service/ConsumidorDeLivroNaEstanteBrokerTest.java` | 3 | 3 | Fila `leai.social.recomendacoes` ligada a `livro.adicionado_a_estante`, ACK e DLQ (RNF-ERR-07). O `Channel` é mock |
| `SO/messaging/MessageValidatorTest.java` | 7 | 2 | Schemas de `recomendacao.recebida` e `livro.adicionado_a_estante` (RNF-SEC-32) |
| `SO/integracao/NotificacaoControllerIntegracaoTest.java` | 15 | 1 | RF-REC-02: a notificação traz o livro e a mensagem |
| `SO/notificacao/service/ConsumidorDeNotificacaoIntegracaoTest.java` | 7 | 0 (o `@EnumSource` inclui `RECOMENDACAO_RECEBIDA`; já é o CT-NOT-01) | — |
| `SO/notificacao/service/ConsumidorDeNotificacaoBrokerTest.java` | 5 | 0 (verifica a ligação de `recomendacao.recebida`; já é o CT-NOT-03) | — |
| `SO/conta/service/ConsumidorDeContaExcluidaIntegracaoTest.java` | 5 | 0 (é da F-CONTA-2; apaga as recomendações da conta) | — |
| `WEB/components/recomendacoes/DialogoRecomendar.spec.ts` | 10 | 10 | RF-REC-01/03/07, RNF-SEC-18, RNF-TST-06 |
| `WEB/views/recomendacoes/RecomendacoesRecebidasView.spec.ts` | 6 | 6 | RF-REC-04/15, RNF-TST-06 |
| `WEB/views/DescobrirView.spec.ts` | 27 | 3 | RF-REC-04/05/13/14/15 (seção do Descobrir) |
| `WEB/services/social.spec.ts` | 11 | 3 | contrato HTTP de candidatos, recebidas, descarte e envio (RNF-TST-05) |
| `WEB/views/livros/LivroOficialView.spec.ts` | 31 | 0 (um teste da F-ACV-NOTA só confere a posição do botão "Recomendar a um leitor") | — |
| `MOB/features/recomendacoes/recomendar_livro_test.dart` | 10 | 10 | RF-REC-01/03/07, RNF-SEC-18, entrada pela página do livro |
| `MOB/features/recomendacoes/recomendacoes_recebidas_test.dart` | 8 | 8 | RF-REC-04/05/13/14/15, RNF-TST-06 (503) |
| `MOB/features/notificacoes/rotas_notificacoes_test.dart` | 8 | 1 | RF-REC-02 no app: livro, mensagem e destino |

**Total da F-REC-P2P:** 12 arquivos com testes próprios e 60 testes da feature (social 19, web 22, mobile 19). Outros 4 arquivos tocam a feature só de passagem.

### 2.2 Casos previstos

| ID | Requisito | Cenário | Resultado esperado | Nível | Teste automatizado |
|---|---|---|---|---|---|
| CT-REC-01 | RF-REC-01, RF-REC-07, RN-22.1, RN-22.3, RN-22.4 | Enviar para cinco leitores: um elegível, um que já tem o livro, um sem seguimento mútuo, um no limite de 50 e um que já recebeu esse livro | 200; uma recomendação criada; cada bloqueado vem com o motivo, na ordem do pedido | integração | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Envio a vários cria só para os elegíveis e diz o motivo de cada bloqueio, na ordem" |
| CT-REC-02 | RF-REC-03 | Mensagem acima de 280 caracteres, leitor repetido, mais de 20 destinatários e lista vazia | 400 em todos; 280 caracteres passam | integração | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Corpo inválido responde 400: mensagem longa, leitor repetido e lote acima de 20" |
| CT-REC-03 | RF-REC-06, RN-22.5 | Recomendar livro pessoal; recomendar livro inexistente | Livro pessoal: 422; inexistente: 404; nada gravado nem publicado | integração | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Livro pessoal responde 422 e livro inexistente 404, sem gravar nada" |
| CT-REC-04 | RNF-SEC-18 | Mais envios por minuto que o limite | 429 com a mensagem própria | integração | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Envios acima do limite por minuto respondem 429 (RNF-SEC-18)" |
| CT-REC-05 | RNF-ERR-04 | Repetir o envio com a mesma `Idempotency-Key` | Mesma resposta, sem recomendação nem evento a mais; outro corpo com a mesma chave dá 409 | integração | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Mesma Idempotency-Key reproduz a resposta sem duplicar recomendação nem evento" |
| CT-REC-06 | RF-REC-01, RF-REC-07 | Listar candidatos para um livro | Só seguimentos mútuos, marcando quem já tem o livro e quem atingiu o limite | integração | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Candidatos: só mútuos, com quem já tem o livro e quem atingiu o limite" |
| CT-REC-07 | RF-REC-04, RN-22.7, RN-22.9, RN-22.15, RNF-DES-02 | Ver recebidas, com uma expirada, uma de remetente suspenso, dois remetentes recomendando o mesmo livro e um seguimento mútuo desfeito depois do envio | Paginadas, mais recentes primeiro, sem a expirada nem a do suspenso; as do mesmo livro convivem; a do mútuo desfeito continua; `size` acima de 50 dá 400 | integração | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Recebidas: paginadas, mais recentes primeiro, sem expiradas nem remetente suspenso" |
| CT-REC-08 | RF-REC-15, RN-22.11, RNF-SEC-02 | Remetente e um terceiro tentam descartar; depois o destinatário descarta | 404 para remetente e terceiro; 204 para o destinatário; nenhum evento vai ao remetente | integração | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Só o destinatário descarta; remetente e terceiro recebem 404 e nada muda" |
| CT-REC-09 | RF-REC-02, RN-22.8, RNF-ERR-06 | O evento da outbox passa pelo schema e é consumido duas vezes | Uma notificação só, com a frase, a mensagem e o livro | mensageria | `SO/integracao/RecomendacaoControllerIntegracaoTest.java` › "Evento da outbox passa no schema e vira notificação de quem recebeu, levando ao livro" |
| CT-REC-10 | RF-REC-02 | Notificação de recomendação recebida, incluindo uma de remetente suspenso | Traz o livro e a mensagem; a do suspenso vem sem a mensagem | integração | `SO/integracao/NotificacaoControllerIntegracaoTest.java` › "recomendacao recebida traz livro e mensagem; de remetente suspenso, sem a mensagem" |
| CT-REC-11 | RF-REC-02, RNF-SEC-32 | `recomendacao.recebida` com mensagem acima de 280 caracteres | Recusada pelo schema | unitário | `SO/messaging/MessageValidatorTest.java` › "rejeita recomendacao.recebida com mensagem acima de 280 caracteres" |
| CT-REC-12 | RF-REC-16, RN-22.10 | O destinatário põe o livro na estante | Somem todas as recomendações desse livro para ele, de todos os remetentes; as de outro livro e as de outro leitor ficam | mensageria | `SO/recomendacao/service/RemocaoDeRecomendacoesIntegracaoTest.java` › "Livro na estante remove todas as recomendações dele ao leitor, de todos os remetentes" |
| CT-REC-13 | RF-REC-16, RNF-ERR-06 | `livro.adicionado_a_estante` entregue duas vezes | Sem efeito a mais | mensageria | `SO/recomendacao/service/RemocaoDeRecomendacoesIntegracaoTest.java` › "Reentrega do mesmo fato não tem efeito adicional" |
| CT-REC-14 | RF-REC-16, RNF-ERR-07 | Ligações da fila de recomendações | Ligada a `livro.adicionado_a_estante` do `leitura`, com DLQ | mensageria | `SO/recomendacao/service/ConsumidorDeLivroNaEstanteBrokerTest.java` › "a fila de recomendacoes recebe livro.adicionado_a_estante de leitura, com DLQ" |
| CT-REC-15 | RF-REC-16, RNF-ERR-07, RNF-SEC-32 | Evento sem `livroId` | Recusado pelo schema, vai para a DLQ e não é processado | mensageria | `SO/recomendacao/service/ConsumidorDeLivroNaEstanteBrokerTest.java` › "evento sem livroId e rejeitado pelo schema e vai para a DLQ sem processar" |
| CT-REC-16 | RN-22.9 | Rotina diária de limpeza | Apaga as vencidas e as de livro que já está na estante; mantém as ativas | integração | `SO/recomendacao/service/RemocaoDeRecomendacoesIntegracaoTest.java` › "Rotina diária apaga vencidas e as de livro já na estante, e mantém as ativas" |
| CT-REC-17 | RF-REC-07, RN-22.3, RN-22.4 | Web: escolher destinatários | Quem já tem o livro e quem atingiu o limite aparecem com o motivo e não podem ser escolhidos | web | `WEB/components/recomendacoes/DialogoRecomendar.spec.ts` › DialogoRecomendar › "mostra quem já tem o livro e quem atingiu o limite com o motivo, sem deixar escolher" |
| CT-REC-18 | RF-REC-01 | Web: envio aceito só para parte dos destinatários | A tela continua aberta, diz quem não recebeu e o botão vira "Concluir" | web | `WEB/components/recomendacoes/DialogoRecomendar.spec.ts` › DialogoRecomendar › "envio em parte mantém a tela aberta, diz quem não recebeu e troca o botão por Concluir" |
| CT-REC-19 | RNF-SEC-18, RNF-TST-06 | Web: 429 e depois falha de rede | Avisa sem perder a escolha; a nova tentativa usa a mesma chave | web | `WEB/components/recomendacoes/DialogoRecomendar.spec.ts` › DialogoRecomendar › "limite de frequência avisa sem perder a escolha; falha de rede repete a mesma chave" |
| CT-REC-20 | RF-REC-04, RF-REC-05, RF-REC-13, RF-REC-14 | Web: abrir o Descobrir | Seção rotulada com as recebidas (mensagem e link para o livro), que some quando a busca começa | web | `WEB/views/DescobrirView.spec.ts` › DescobrirView › "aterrissagem mostra as recomendações recebidas, que somem quando a busca começa" |
| CT-REC-21 | RF-REC-15 | Web: descartar na lista completa | Sem confirmação; o item fica esmaecido até o servidor responder e depois sai | web | `WEB/views/recomendacoes/RecomendacoesRecebidasView.spec.ts` › RecomendacoesRecebidasView › "descarte sem confirmação deixa o item esmaecido até o servidor responder e depois o tira" |
| CT-REC-22 | RF-REC-01, RF-REC-03 | Mobile: recomendar pela página do livro | Menu, envio aceito para todos e aviso com os nomes | mobile | `MOB/features/recomendacoes/recomendar_livro_test.dart` › "pela página do livro: menu, envio aceito para todos e aviso com os nomes" |
| CT-REC-23 | RF-REC-07 | Mobile: destinatário bloqueado | Mostra o motivo e não deixa escolher essa pessoa | mobile | `MOB/features/recomendacoes/recomendar_livro_test.dart` › "mostra o motivo de quem não pode receber e não deixa escolher essa pessoa" |
| CT-REC-24 | RF-REC-05, RF-REC-13 | Mobile: seção do Descobrir | Pede só as três mais recentes; tocar no item abre o livro | mobile | `MOB/features/recomendacoes/recomendacoes_recebidas_test.dart` › seção do Descobrir › "pede só as três mais recentes e o item leva ao livro" |
| CT-REC-25 | RF-REC-15, RNF-TST-06 | Mobile: descarte falha com 503 | O item fica; tentar de novo usa a mesma chave | mobile | `MOB/features/recomendacoes/recomendacoes_recebidas_test.dart` › lista completa › "falha ao descartar mantém o item; tentar de novo reusa a mesma chave" |
| CT-REC-26 | RF-REC-02 | Mobile: notificação de recomendação | Traz o livro e a mensagem de quem recomendou; leva à página do livro | mobile | `MOB/features/notificacoes/rotas_notificacoes_test.dart` › "recomendacao recebida traz o livro e a mensagem de quem recomendou" |

São 26 casos, um pouco acima da faixa. Todos os RFs de servidor (01, 02, 03, 04, 06, 07, 15 e 16) têm caso no backend. RF-REC-05, 13 e 14 são de cliente.

Outros testes que valem como caso alternativo, sem ID: "Rotina apaga em lotes até não sobrar vencida", "mensagem valida remove as recomendacoes do livro e confirma a entrega" e "valida recomendacao.recebida com e sem mensagem e livro.adicionado_a_estante". Também "o menu de uma recomendação da aterrissagem descarta só ela e a vaga é preenchida" (web) e "sem mútuos explica a regra, esconde o envio e leva à busca de leitores" (mobile).

### 2.3 Critérios, RNs e RFs sem teste aparente (candidatos a lacuna) — dono: Kayke

| # | Lacuna | Requisito ou critério | O que procurei e onde |
|---|---|---|---|
| 1 | Rotas de `/recomendacoes` sem token devem dar 401; não há teste próprio | RNF-SEC-01 | Procurei `401` e requisição sem `Authorization` em `RecomendacaoControllerIntegracaoTest`. Só existe o genérico CT-TRV-05 |
| 2 | Novo envio depois de um descarte ou da expiração cria outro id e gera outra notificação | Critério "…sem suprimir novo envio futuro"; RN-22.14 | Nenhum teste reenvia depois de descartar. `JA_RECOMENDADO` só é testado com a recomendação ativa |
| 3 | O limite de 50 conta só recomendações **ativas**: as expiradas não contam | RN-22.4, §10.8 | Os testes de limite e de candidatos criam 50 recomendações com 0 dia; nenhum mistura expiradas |
| 4 | Publicação real de `recomendacao.recebida` no broker e DLQ de um `recomendacao.recebida` malformado na fila de notificações | RNF-TST-03 | O teste confere só a linha na outbox. A DLQ da fila de notificações é testada só de forma genérica (CT-NOT-04, evento sem `destinatarioId`), e o caso da mensagem de 281 caracteres está só no validador unitário |
| 5 | Timeout explícito com API simulada | RNF-TST-06; o DoD marca como coberto | Procurei `timeout`, `TimeoutException` e "tempo limite" nos specs de recomendação da web e do mobile. Só há `TypeError('offline')` e 503 |
| 6 | Web: entrada `Recomendar a um leitor` (menu `Mais ações` e botão) abrindo o `DialogoRecomendar` | RF-REC-01 na web | `LivroOficialView.spec.ts` só confere a posição do botão, num teste da F-ACV-NOTA. No mobile, a entrada é testada (CT-REC-22 e "o item do menu Mais ações também abre a tela de recomendar") |
| 7 | "A aba funciona sem a algorítmica" provado de forma explícita | RF-REC-14 | Só de forma implícita: a algorítmica ainda não existe, e os testes da seção mostram só a P2P. Não há teste que simule a algorítmica indisponível |
| 8 | Mensagem de cold start nas recebidas | RNF-ERR-09 | Não implementado nas recebidas (divergência registrada no arquivo de feature), então não há teste |

### 2.4 Divergências e coisas estranhas

- **Serviços, RFs e clientes batem** com a tabela recebida: `social`, web e mobile; RF-REC-01..07 e 13..16. A "aba Recomendações" é uma **seção** dentro de `Descobrir`, por decisão de 01/09 registrada no arquivo de feature, e não um item da barra.
- **RF-REC-02 na web:** o REQUISITOS §5.13 marca a coluna Web como ❌. A web não tem notificação de recomendação (`RECOMENDACAO_RECEBIDA` só aparece em `mobile/lib` e `mobile/test`), então a falta de teste web aqui é esperada.
- **DoD × código:** o DoD marca "indisponibilidade/timeout com API simulada" como coberto, mas só achei testes de indisponibilidade (503 e falha de rede), nenhum de timeout. "CI verde" está desmarcado no DoD, mas a §9.7 mostra o `ci-back-social`, o `ci-front` e o `ci-mobile` verdes.
- **Testes que provam menos do que o nome diz:**
  - `SO/recomendacao/service/RemocaoDeRecomendacoesIntegracaoTest.java` › "Reentrega do mesmo fato não tem efeito adicional": chama `consumidor.handle` duas vezes direto, sem passar pela deduplicação por `eventId` do `AmqpConsumerService`. Como a primeira chamada já apaga tudo, a segunda não teria o que mudar de qualquer jeito. Prova que o `DELETE` é idempotente, não que a reentrega é descartada.
  - `MOB/features/recomendacoes/recomendacoes_recebidas_test.dart` › seção do Descobrir, menu da recomendação › "descartar tira a recomendação da seção sem avisar o remetente": é um teste de widget e não tem como provar que o remetente não é avisado. Quem prova é o CT-REC-08 (outbox vazia depois do descarte).
  - `SO/recomendacao/service/ConsumidorDeLivroNaEstanteBrokerTest.java`: o nome sugere broker, mas o `Channel` é mock (sem RabbitMQ real). É o mesmo padrão do CT-NOT-03 do Período 1.
- **F-REC-ALG fora da conta:** `AC/test/integracao/livro-pessoal.int-spec.ts` › "livro pessoal fica fora do contrato de recomendação e do catálogo" (`v_livro_recomendacao_v1`) e a coluna `opt_out_recomendacao` nas massas do `social` são da algorítmica e não entraram na conta.

---

## Resumo

| Feature | Arquivos com testes da feature | Testes da feature | Casos previstos | Lacunas candidatas |
|---|---|---|---|---|
| F-LST | 19 (+4 só tangenciais) | 118 | 34 | 12 |
| F-REC-P2P | 12 (+4 só tangenciais) | 60 | 26 | 8 |
