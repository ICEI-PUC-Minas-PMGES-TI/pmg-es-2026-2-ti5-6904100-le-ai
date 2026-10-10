import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

/**
 * Massa dos testes de integração, gravada nas tabelas que fazem papel das VIEWs
 * de `acervo`, `identidade` e `social` (ver `banco.ts`).
 */

export interface LivroDeTeste {
  id?: string;
  tipo?: 'oficial' | 'pessoal';
  /** Obrigatório em livro pessoal; em oficial fica `null`. */
  donoId?: string | null;
  titulo?: string;
  /** `null` reproduz os livros oficiais sem autor do acervo. */
  autor?: string | null;
  capa?: string | null;
  paginas?: number;
  ativo?: boolean;
}

export async function inserirLivro(
  pool: Pool,
  livro: LivroDeTeste = {},
): Promise<string> {
  const id = livro.id ?? randomUUID();
  const tipo = livro.tipo ?? 'oficial';
  await pool.query(
    `INSERT INTO acervo.v_livro_referencia_v1
       (livro_id, tipo, dono_id, paginas, titulo, autor_exibicao,
        capa_resolvida, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      tipo,
      livro.donoId ?? null,
      livro.paginas ?? 200,
      livro.titulo ?? 'Torto Arado',
      livro.autor === undefined ? 'Itamar Vieira Junior' : livro.autor,
      livro.capa === undefined
        ? 'https://covers.openlibrary.org/b/id/1-L.jpg'
        : livro.capa,
      livro.ativo ?? true,
    ],
  );
  return id;
}

export interface PerfilDeTeste {
  id?: string;
  username?: string;
  nomeExibicao?: string;
  avatarUrl?: string | null;
  privacidade?: 'publico' | 'privado';
}

export async function inserirPerfil(
  pool: Pool,
  perfil: PerfilDeTeste = {},
): Promise<string> {
  const id = perfil.id ?? randomUUID();
  await pool.query(
    `INSERT INTO identidade.v_perfil_referencia_v1
       (id, username, nome_exibicao, avatar_url, privacidade,
        opt_out_recomendacao)
     VALUES ($1, $2, $3, $4, $5, false)`,
    [
      id,
      perfil.username ?? `leitora_${id.slice(0, 8)}`,
      perfil.nomeExibicao ?? 'Leitora de Teste',
      perfil.avatarUrl ?? null,
      perfil.privacidade ?? 'publico',
    ],
  );
  return id;
}

/** Seguimento aceito: `seguidorId` passa a ver o conteúdo de `seguidoId`. */
export async function seguir(
  pool: Pool,
  seguidorId: string,
  seguidoId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO identidade.v_seguimento_aceito_v1 (seguidor_id, seguido_id)
     VALUES ($1, $2)`,
    [seguidorId, seguidoId],
  );
}

/** Atividade ativa do dono sobre o livro pessoal: a via do feed de RN-15. */
export async function publicarNoFeed(
  pool: Pool,
  donoId: string,
  livroId: string,
): Promise<string> {
  const atividadeId = randomUUID();
  await pool.query(
    `INSERT INTO social.v_atividade_livro_pessoal_v1 (atividade_id, dono_id, livro_id)
     VALUES ($1, $2, $3)`,
    [atividadeId, donoId, livroId],
  );
  return atividadeId;
}

/** Livro pessoal numa lista ativa do dono: a via da lista de RN-15. */
export async function incluirEmLista(
  pool: Pool,
  donoId: string,
  livroId: string,
): Promise<string> {
  const listaId = randomUUID();
  await pool.query(
    `INSERT INTO social.v_lista_livro_pessoal_v1 (lista_id, dono_id, livro_id)
     VALUES ($1, $2, $3)`,
    [listaId, donoId, livroId],
  );
  return listaId;
}
