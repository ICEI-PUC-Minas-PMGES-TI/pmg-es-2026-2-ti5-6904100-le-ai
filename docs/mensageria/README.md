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
