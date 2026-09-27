import { boolean, integer, pgSchema, text, uuid } from 'drizzle-orm/pg-core';

const acervo = pgSchema('acervo');
const identidade = pgSchema('identidade');

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

export const vSeguimentoAceito = identidade
  .view('v_seguimento_aceito_v1', {
    seguidorId: uuid('seguidor_id'),
    seguidoId: uuid('seguido_id'),
  })
  .existing();
