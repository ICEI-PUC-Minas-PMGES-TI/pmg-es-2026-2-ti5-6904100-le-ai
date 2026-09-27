import { boolean, integer, pgSchema, text, uuid } from 'drizzle-orm/pg-core';

/**
 * VIEWs de contrato dos outros serviços que `leitura` consome (arquitetura
 * §4.2), com as colunas exatas que o spec de cada dono publica em
 * `x-database-contracts` (`docs/api/acervo.yaml`, `docs/api/identidade.yaml`).
 *
 * Nenhum serviço lê tabela crua de outro schema. Duas coisas aqui são
 * deliberadas e não devem ser "arrumadas", como no `acervo`:
 *
 * 1. **`.existing()` em todas.** Sem ele o drizzle-kit geraria `CREATE VIEW` em
 *    schema de outro dono na próxima `db:generate`, e uma migration de
 *    `leitura` passaria a mexer em objeto de `acervo` ou `identidade`.
 * 2. **Este arquivo fica fora de `src/db/schema.ts`**, e portanto fora do
 *    `schema` passado ao drizzle-kit e ao `drizzle()`.
 *
 * O `search_path` da `DATABASE_URL` aponta só para `leitura`, então toda
 * consulta precisa ser qualificada pelo schema — é o que `pgSchema()` garante.
 * VIEW inacessível (GRANT faltando, VIEW ainda não criada) é
 * `ehFalhaDeContratoExterno` e vira 503.
 */

const acervo = pgSchema('acervo');
const identidade = pgSchema('identidade');

/**
 * Referência de livro (dono: `acervo`). Valida existência, tipo, dono e estado
 * antes de qualquer escrita, e fornece o `LivroSnapshot` dos eventos.
 *
 * `autorExibicao` é `NULL` em livro oficial sem autor; livro pessoal sempre
 * traz o autor informado. `donoId` só existe em livro pessoal.
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

/**
 * Perfil (dono: `identidade`). Conta suspensa ou em exclusão já sai de fora da
 * VIEW. Fornece o `UsuarioSnapshot` dos eventos e a privacidade de RN-08.
 */
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

/** Seguimento aceito (dono: `identidade`), base da revalidação de RN-08. */
export const vSeguimentoAceito = identidade
  .view('v_seguimento_aceito_v1', {
    seguidorId: uuid('seguidor_id'),
    seguidoId: uuid('seguido_id'),
  })
  .existing();
