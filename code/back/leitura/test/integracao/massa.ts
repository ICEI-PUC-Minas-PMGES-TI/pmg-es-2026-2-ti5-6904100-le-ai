import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

export interface LivroDeTeste {
  id?: string;
  tipo?: 'oficial' | 'pessoal';
  donoId?: string | null;
  paginas?: number;
  titulo?: string;
  autor?: string | null;
  capaUrl?: string | null;
  ativo?: boolean;
}

export async function inserirLivro(
  pool: Pool,
  livro: LivroDeTeste = {},
): Promise<string> {
  const id = livro.id ?? randomUUID();
  await pool.query(
    `INSERT INTO acervo.v_livro_referencia_v1
       (livro_id, tipo, dono_id, paginas, titulo, autor_exibicao, capa_resolvida, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      livro.tipo ?? 'oficial',
      livro.donoId ?? null,
      livro.paginas ?? 200,
      livro.titulo ?? 'Livro de teste',
      livro.autor === undefined ? 'Autora de Teste' : livro.autor,
      livro.capaUrl === undefined
        ? 'https://covers.openlibrary.org/b/id/1-L.jpg'
        : livro.capaUrl,
      livro.ativo ?? true,
    ],
  );
  return id;
}

export async function inserirPerfil(
  pool: Pool,
  usuarioId: string,
  privacidade: 'publico' | 'privado' = 'publico',
): Promise<void> {
  await pool.query(
    `INSERT INTO identidade.v_perfil_referencia_v1
       (id, username, nome_exibicao, avatar_url, privacidade, opt_out_recomendacao)
     VALUES ($1, $2, $3, NULL, $4, false)`,
    [
      usuarioId,
      `leitora_${usuarioId.slice(0, 8)}`,
      'Leitora de Teste',
      privacidade,
    ],
  );
}

export async function inserirSeguimentoAceito(
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
