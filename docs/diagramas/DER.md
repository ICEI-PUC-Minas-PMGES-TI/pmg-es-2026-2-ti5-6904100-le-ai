# Implementacao do DER no PostgreSQL

Este documento acompanha a materializacao do DER logico de
[`modelo-dados-identidade.mmd`](modelo-dados-identidade.mmd),
[`modelo-dados-acervo.mmd`](modelo-dados-acervo.mmd),
[`modelo-dados-leitura.mmd`](modelo-dados-leitura.mmd) e
[`modelo-dados-social.mmd`](modelo-dados-social.mmd) no PostgreSQL do Neon.

As fontes de verdade continuam sendo `docs/orquestador/REQUISITOS.md` e o
Documento de Arquitetura. Este arquivo registra somente decisoes fisicas,
migrations, ordem de aplicacao e verificacao. Mudanca de regra de negocio nao
pode ser decidida aqui.

## Estado anterior

Antes desta implementacao, o banco versionado possuia os quatro schemas e
somente uma tabela de dominio: `identidade.usuario`, no recorte minimo de
cadastro de P0-NAV. O Neon contem apenas usuarios de teste a preservar.

| Schema | Estado anterior |
|---|---|
| `identidade` | schema, historico Flyway e `usuario` minimo |
| `acervo` | schema e historico Drizzle |
| `leitura` | schema e historico Drizzle |
| `social` | schema e historico Flyway |

As migrations antigas nao foram alteradas. A evolucao e incremental.

## Migrations do modelo

| Schema | Ferramenta | Migration principal |
|---|---|---|
| `identidade` | Flyway | `V20260915120000__completa_schema_identidade.sql` |
| `acervo` | Drizzle | `0001_20260916110700_modelo_der.sql` |
| `leitura` | Drizzle | `0001_20260916110700_modelo_der.sql` e `0002_20260916111400_ajusta_invariantes.sql` |
| `social` | Flyway | `V20260916024928__cria_modelo_social.sql` |

Resultado esperado: 59 tabelas de dominio, sendo `identidade.usuario`
preservada e ampliada e 58 tabelas novas. As tabelas de historico do Flyway e
Drizzle nao entram nessa contagem.

## Decisoes fisicas

- Identificadores de dominio usam `uuid`; instantes usam `timestamptz`; datas
  de calendario usam `date`; documentos usam `jsonb`; notas usam `numeric`.
- Enums logicos foram implementados como `text` com `CHECK`. Isso permite que
  uma migration futura amplie o conjunto sem recriar um tipo PostgreSQL.
- FKs existem somente dentro do schema dono. IDs de outro servico permanecem
  referencias logicas, conforme a arquitetura.
- `identidade.usuario.email` e `username` foram convertidos para `citext`.
  Os indices anteriores em `lower(...)` sao substituidos por unicidade nativa,
  preservando os valores existentes.
- `usuario.privacidade` recebe `publico` para contas existentes e novos
  cadastros que ainda nao enviarem o campo. Esta escolha foi confirmada pelo
  grupo para esta implantacao.
- `ingestao_execucao.status` usa `em_execucao`, `concluida` e `falha`; seu
  `tipo` usa somente `carga_inicial` e `recarga`.
- `nota_livro_agregada` e tabela de projecao, recalculada a partir de
  `nota_leitor_projecao`; nao e uma leitura da tabela privada de `leitura`.
- A reordenacao de itens de lista usa unicidade adiavel em `(lista_id, ordem)`.
- O limite de dez frases por usuario/livro e protegido por trigger e lock
  transacional, alem da validacao de dominio futura.
- Ledgers, outboxes e auditoria admitem retencao depois de limpar referencias,
  chaves, hashes, payloads, respostas e texto identificavel. Os `CHECK`s
  distinguem o registro operacional do registro anonimizado.
- Migrations posteriores podem refinar indices, contratos e constraints sem
  reescrever o historico. Se o refinamento mudar comportamento de produto,
  deve antes seguir o controle de mudanca dos requisitos.

## Views de contrato

| Dono | Contrato | Forma |
|---|---|---|
| `identidade` | `v_perfil_referencia_v1` | perfil publico de referencia; omite suspensao e exclusao pendente |
| `identidade` | `v_seguimento_aceito_v1` | pares seguidor/seguido visiveis |
| `acervo` | `v_livro_referencia_v1` | livro, tipo, dono, paginas, titulo, autor, capa e atividade |
| `acervo` | `v_livro_recomendacao_v1` | uma linha por livro oficial e assunto; assunto pode ser nulo |
| `leitura` | `v_estante_publica_v1` | usuario, livro, status e conclusoes |
| `leitura` | `v_resenha_publicacao_v1` | resenha e contagens separadas de reacoes ativas |
| `leitura` | `v_nota_publicacao_v1` | nota atual por usuario/livro |
| `social` | `v_atividade_livro_pessoal_v1` | via ativa de acesso pelo feed |
| `social` | `v_lista_livro_pessoal_v1` | via ativa de acesso por lista |

`v_livro_recomendacao_v1` tem as colunas `livro_id`, `titulo`,
`autor_exibicao`, `capa_resolvida`, `serie_id`, `serie_nome`, `assunto_id` e
`assunto_nome`. Livros com varios assuntos produzem varias linhas. Somente
livros oficiais ativos aparecem. Mudancas de cardinalidade ou campos exigem
uma nova versao da view.

As views nao substituem autorizacao. O consumidor ainda revalida propriedade,
privacidade, suspensao e a via de acesso aplicavel antes de exibir conteudo.

## Aplicacao

1. Revisar humanamente cada migration, obrigatorio pelo processo do projeto.
2. Consultar no Neon os historicos de Flyway/Drizzle e confirmar que nao ha
   objeto manual divergente.
3. Criar um ponto de restauracao ou backup recuperavel antes da mudanca.
4. Implantar `identidade` e `social`; o Flyway aplica suas migrations no boot.
5. Implantar `acervo` e `leitura`; `npm run start:prod` aplica Drizzle antes de
   iniciar a API. O runner usa o schema proprio para a tabela de historico.
6. Conferir tabelas, constraints, indices, views e usuarios preservados.

O `DATABASE_URL` de execucao usa TLS e nao depende de `search_path` na URL: as
tabelas Drizzle sao qualificadas por schema e Spring fixa `DB_SCHEMA`. Para uma
aplicacao administrativa manual, preferir a URL `direct` do Neon.

## Verificacao obrigatoria

- banco vazio chega ao modelo completo;
- banco com `identidade.usuario` antigo preserva IDs, hashes e datas;
- cadastro, login e `/me` continuam funcionando depois da conversao para
  `citext`;
- uma segunda execucao nao repete DDL;
- Drizzle nao gera migration adicional sem mudanca de `schema.ts`;
- constraints recusam duplicatas, estados invalidos e referencias internas
  inconsistentes;
- views possuem exatamente as colunas documentadas;
- contas suspensas ou com exclusao pendente nao aparecem nas views publicas de
  identidade;
- registros tecnicos podem ser anonimizados sem violar constraints;
- os quatro builds e suites de teste permanecem verdes.

## Estado da validacao

- `identidade`: `./mvnw -B verify` verde, 63 testes.
- `social`: `./mvnw -B verify` verde, 16 testes.
- `acervo`: lint, build e 3 testes verdes; Drizzle sem schema pendente.
- `leitura`: lint, build e 3 testes verdes; Drizzle sem schema pendente.
- PostgreSQL 17.6 real: todas as migrations aplicadas em banco isolado, com 59
  tabelas e nove views confirmadas. O ensaio preservou uma conta criada pelo
  modelo anterior, incluindo ID logico, caixa de e-mail/username, hash e data,
  e preencheu `privacidade = publico` ao converter e-mail e username para
  `citext`.
- Os runners Drizzle de `acervo` e `leitura` foram executados duas vezes em
  bancos limpos separados. A segunda execucao nao repetiu DDL.
- Foram exercitadas a unicidade sem diferenca de caixa e a trigger que recusa a
  decima primeira frase para o mesmo usuario/livro.
- O ensaio local inicial não alterou o Neon. A aplicação remota ocorreu depois,
  em 16/09/2026, e está registrada no checklist abaixo.

## Checklist do Neon

- [ ] Revisao humana dos quatro conjuntos de migrations
- [x] Inventario somente leitura do estado atual
- [ ] Backup/ponto de restauracao confirmado (dispensado nesta aplicacao por
  decisao do grupo — o banco continha apenas o usuario de teste)
- [x] Teste integral em PostgreSQL 17 real
- [x] Aplicacao no Neon pela conexao apropriada (2026-09-16, PostgreSQL 17.11:
  Drizzle em acervo/leitura, Flyway no boot em identidade/social)
- [x] Contagem de 59 tabelas de dominio confirmada
- [x] Nove views de contrato confirmadas
- [x] Usuarios de teste preservados e com `privacidade = publico`
- [ ] Cadastro, login e health checks validados em DES
