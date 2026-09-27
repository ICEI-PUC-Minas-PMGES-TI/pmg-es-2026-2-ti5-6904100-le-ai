# Contratos de mensageria

Fonte canônica dos contratos JSON transportados pelo RabbitMQ. A infraestrutura, o envelope e a política operacional pertencem a [P0-MSG](../plano-de-desenvolvimento/periodo-0/feature-P0-MSG.md); cada feature produtora mantém o schema do `data` que publica.

## Regras

- O envelope é validado por [`schemas/envelope-v1.schema.json`](schemas/envelope-v1.schema.json).
- O par `(type, version)` seleciona o schema de `data` no [catálogo](catalogo.md).
- Todos os schemas usam JSON Schema Draft 2020-12 e `additionalProperties: false`.
- Schema publicado é imutável. Mudança incompatível cria nova versão.
- `eventId` deduplica a mesma entrega; `businessKey` identifica o fato/agregado e não possui unicidade genérica.
- O produtor grava somente `data` em `outbox_*.payload`; o dispatcher monta o envelope.
- O consumidor valida envelope e `data` antes de executar domínio.

## Tipos comuns

[`schemas/common-v1.schema.json`](schemas/common-v1.schema.json) define `UsuarioSnapshot` e `LivroSnapshot`. O snapshot evita chamada síncrona no consumo e representa os dados no instante do fato.

## Runtime

`docs/mensageria` é a fonte canônica. Cada consumidor copia para seus recursos runtime apenas os schemas que aceita; o CI deve comparar a cópia com estes arquivos. Não há pacote compartilhado entre Java e TypeScript.

## Histórico

### 26/09/2026 — `LivroSnapshot.autor` passa a aceitar `null` no `common-v1`

- **O que mudou:** em `common-v1.schema.json`, `LivroSnapshot.autor` passou de `{ "type": "string", "minLength": 1 }` para `{ "type": ["string", "null"], "minLength": 1 }`. O campo continua obrigatório (chave presente); `null` significa livro sem autor. Texto vazio continua proibido.
- **Por quê:** 701 livros oficiais do acervo não têm autor, e `acervo.v_livro_referencia_v1.autor_exibicao` sai `NULL` para eles. Com o schema antigo, qualquer evento sobre esses livros (`resenha.publicada` de F-AVA e os `leitura.*` de F-EST) seria inválido.
- **Exceção à imutabilidade:** a regra "schema publicado é imutável" (arquitetura §5.2, "Contrato canônico"; plano de projeto §8.2) pediria um `common-v2`. A correção foi feita no próprio v1 porque **nenhum evento que carrega `LivroSnapshot` tinha sido publicado** até esta data: o `leitura` ainda não produzia eventos. Decisão do Renato (F-AVA) em 26/09/2026, a comunicar ao grupo.
- **Cópias atualizadas no mesmo commit:** `code/back/identidade/src/main/resources/messaging/schemas/` e `code/back/social/src/main/resources/messaging/schemas/`. O `leitura` recebe a cópia quando passar a produzir os eventos.
- **Consumidor (`social`, F-FEED), 27/09/2026:** a migration `V20260927002000__snap_livro_autor_anulavel.sql` torna `atividade.snap_livro_autor` anulável (`Atividade.java` junto), `docs/api/social.yaml` passou a declarar `autor` anulável e o feed esconde a linha do autor quando ele vem vazio. Feito por F-AVA com autorização do Renato; **vai para a `desenvolvimento` só depois da revisão do Kayke**. Registro para o agente dele em `code/back/social/AGENTS.md`.
- **Enquanto a migration não estiver aplicada num ambiente, nenhum evento com `autor: null` pode ser publicado nele:** o `catch (DataIntegrityViolationException)` do `ConsumidorDeAtividade` engoliria o erro de NOT NULL e a atividade sumiria sem ir para a DLQ.
- **Produtores (`leitura`, F-AVA e F-EST):** montam `autor` a partir de `autor_exibicao` e mandam `null` quando o livro não tem autor. Nunca um texto inventado.
