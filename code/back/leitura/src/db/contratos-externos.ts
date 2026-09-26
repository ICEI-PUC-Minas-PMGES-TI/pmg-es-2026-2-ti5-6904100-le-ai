import { boolean, integer, pgSchema, text, uuid } from 'drizzle-orm/pg-core';

/**
 * VIEWs de contrato dos outros serviços (arquitetura §4.2).
 *
 * Nenhum serviço lê tabela crua de outro schema: a leitura acontece
 * exclusivamente por VIEW que o serviço dono expõe e mantém como contrato. Este
 * arquivo declara as VIEWs que `leitura` consome, com as colunas exatas que o
 * spec de cada dono publica em `x-database-contracts` (`docs/api/acervo.yaml`,
 * `docs/api/identidade.yaml`).
 *
 * Duas coisas aqui são deliberadas e não devem ser "arrumadas":
 *
 * 1. **`.existing()` em todas.** Sem ele o drizzle-kit geraria `CREATE VIEW` em
 *    schema de outro dono na próxima `db:generate`, e uma migration de `leitura`
 *    passaria a mexer em objeto de `acervo` ou `identidade`.
 * 2. **Este arquivo fica fora de `src/db/schema.ts`**, e portanto fora do
 *    `schema` passado ao drizzle-kit e ao `drizzle()`. É o segundo cinto de
 *    segurança da mesma regra.
 *
 * O `search_path` da `DATABASE_URL` aponta só para `leitura`, então toda
 * consulta precisa ser qualificada pelo schema — é o que `pgSchema()` garante.
 */

const acervo = pgSchema('acervo');
const identidade = pgSchema('identidade');

/**
 * Referência estável de livro. Livro pessoal excluído continua na VIEW com
 * `ativo = false`; `dono_id` só é preenchido em livro pessoal.
 */
export const vLivroReferencia = acervo
  .view('v_livro_referencia_v1', {
    livroId: uuid('livro_id'),
    tipo: text('tipo'),
    donoId: uuid('dono_id'),
    paginas: integer('paginas'),
    titulo: text('titulo'),
    autorExibicao: text('autor_exibicao'),
    capaResolvida: text('capa_resolvida'),
    ativo: boolean('ativo'),
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

/** F-PERFIL. Seguimento aceito, base da autorização de perfil privado (RN-08). */
export const vSeguimentoAceito = identidade
  .view('v_seguimento_aceito_v1', {
    seguidorId: uuid('seguidor_id'),
    seguidoId: uuid('seguido_id'),
  })
  .existing();
