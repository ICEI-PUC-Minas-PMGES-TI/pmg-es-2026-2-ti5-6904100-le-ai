import {
  boolean,
  integer,
  numeric,
  pgSchema,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * VIEWs de contrato dos outros serviços (arquitetura §4.2).
 *
 * Nenhum serviço lê tabela crua de outro schema: a leitura acontece
 * exclusivamente por VIEW que o serviço dono expõe e mantém como contrato. Este
 * arquivo declara as VIEWs que `acervo` consome, com as colunas exatas que o
 * spec de cada dono publica em `x-database-contracts`.
 *
 * Duas coisas aqui são deliberadas e não devem ser "arrumadas":
 *
 * 1. **`.existing()` em todas.** Sem ele o drizzle-kit geraria `CREATE VIEW` em
 *    schema de outro dono na próxima `db:generate`, e uma migration de `acervo`
 *    passaria a mexer em objeto de `leitura`, `social` ou `identidade`.
 * 2. **Este arquivo fica fora de `src/db/schema.ts`**, e portanto fora do
 *    `schema` passado ao drizzle-kit e ao `drizzle()`. É o segundo cinto de
 *    segurança da mesma regra.
 *
 * O `search_path` da `DATABASE_URL` aponta só para `acervo`, então toda consulta
 * precisa ser qualificada pelo schema — é o que `pgSchema()` garante.
 *
 * As features donas destas VIEWs (F-FEED, F-PERFIL, F-AVA) ainda não estão
 * implementadas. As VIEWs existem fisicamente desde a baseline do DER, então as
 * consultas funcionam e simplesmente não retornam linha. O efeito é fail-closed:
 * enquanto não houver atividade nem seguimento, nenhum terceiro acessa livro
 * pessoal, que é o comportamento correto.
 */

const social = pgSchema('social');
const identidade = pgSchema('identidade');
const leitura = pgSchema('leitura');

/** F-FEED. Só atividades ativas. Prova a via de acesso do feed (RN-15). */
export const vAtividadeLivroPessoal = social
  .view('v_atividade_livro_pessoal_v1', {
    atividadeId: uuid('atividade_id'),
    donoId: uuid('dono_id'),
    livroId: uuid('livro_id'),
  })
  .existing();

/** F-PERFIL. Conta suspensa ou em exclusão já sai de fora da VIEW. */
export const vPerfilReferencia = identidade
  .view('v_perfil_referencia_v1', {
    id: uuid('id'),
    username: text('username'),
    nomeExibicao: text('nome_exibicao'),
    avatarUrl: text('avatar_url'),
    privacidade: text('privacidade'),
    optOutRecomendacao: boolean('opt_out_recomendacao'),
  })
  .existing();

/** F-PERFIL. Seguimento aceito, base da revalidação de RN-08. */
export const vSeguimentoAceito = identidade
  .view('v_seguimento_aceito_v1', {
    seguidorId: uuid('seguidor_id'),
    seguidoId: uuid('seguido_id'),
  })
  .existing();

/** F-AVA. Nota individual do dono; nunca média nem contagem (RN-03). */
export const vNotaPublicacao = leitura
  .view('v_nota_publicacao_v1', {
    usuarioId: uuid('usuario_id'),
    livroId: uuid('livro_id'),
    valor: numeric('valor'),
  })
  .existing();

/** F-AVA. Resenha do dono, exibida na página do livro pessoal. */
export const vResenhaPublicacao = leitura
  .view('v_resenha_publicacao_v1', {
    resenhaId: uuid('resenha_id'),
    usuarioId: uuid('usuario_id'),
    livroId: uuid('livro_id'),
    texto: text('texto'),
    spoiler: boolean('spoiler'),
    criadoEm: timestamp('criado_em', { withTimezone: true }),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }),
    curtidas: integer('curtidas'),
    descurtidas: integer('descurtidas'),
  })
  .existing();
