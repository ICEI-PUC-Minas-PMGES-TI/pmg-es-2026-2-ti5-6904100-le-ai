package br.com.leai.social.moderacao.repository;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Leituras que a denúncia precisa para achar o alvo e decidir o acesso. A resenha vem de {@code
 * leitura.v_resenha_publicacao_v1}, nunca da tabela crua (AGENTS.md §3); o comentário é local.
 * Livro, perfil e seguimento ficam em {@code lista.repository.ReferenciasDeLista}, reaproveitado.
 */
@Repository
public class ConteudoDenunciavel {

  private final JdbcTemplate jdbc;

  public ConteudoDenunciavel(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** Comentário com a atividade a que pertence. */
  public record Comentario(UUID id, UUID autorId, UUID atividadeId, UUID atividadeAutorId, UUID livroId) {}

  /** Resenha pela VIEW de publicação do {@code leitura}. */
  public record Resenha(UUID id, UUID autorId, UUID livroId) {}

  public Optional<Comentario> comentario(UUID comentarioId) {
    return jdbc
        .query(
            "SELECT c.id, c.autor_id, c.atividade_id, a.autor_id AS atividade_autor_id, a.livro_id"
                + " FROM comentario c JOIN atividade a ON a.id = c.atividade_id WHERE c.id = ?",
            (rs, n) ->
                new Comentario(
                    rs.getObject("id", UUID.class),
                    rs.getObject("autor_id", UUID.class),
                    rs.getObject("atividade_id", UUID.class),
                    rs.getObject("atividade_autor_id", UUID.class),
                    rs.getObject("livro_id", UUID.class)),
            comentarioId)
        .stream()
        .findFirst();
  }

  public Optional<Resenha> resenha(UUID resenhaId) {
    return jdbc
        .query(
            "SELECT resenha_id, usuario_id, livro_id FROM leitura.v_resenha_publicacao_v1"
                + " WHERE resenha_id = ?",
            (rs, n) ->
                new Resenha(
                    rs.getObject("resenha_id", UUID.class),
                    rs.getObject("usuario_id", UUID.class),
                    rs.getObject("livro_id", UUID.class)),
            resenhaId)
        .stream()
        .findFirst();
  }

  /** Atividade de {@code resenha_publicada} da resenha, se o feed já a criou. */
  public Optional<UUID> atividadeDaResenha(UUID resenhaId) {
    return jdbc
        .queryForList(
            "SELECT id FROM atividade WHERE tipo = 'resenha_publicada' AND origem_id = ?",
            UUID.class,
            resenhaId)
        .stream()
        .findFirst();
  }

  /**
   * Via do feed (RN-15), na regra de {@code leitura/src/reacoes/reacoes.repository.ts#viaFeed}, que
   * por sua vez segue a do {@code acervo}: atividade ativa do dono sobre esse livro <b>e</b>
   * seguimento aceito, mesmo com perfil público. O feed só existe entre quem segue.
   */
  public boolean viaFeed(UUID referenciaId, UUID livroId, UUID donoId, UUID solicitanteId) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            """
            SELECT EXISTS (
              SELECT 1
                FROM v_atividade_livro_pessoal_v1 v
                JOIN identidade.v_seguimento_aceito_v1 seg
                  ON seg.seguido_id = v.dono_id AND seg.seguidor_id = ?
                JOIN identidade.v_perfil_referencia_v1 p ON p.id = v.dono_id
               WHERE v.atividade_id = ? AND v.livro_id = ? AND v.dono_id = ?
            )
            """,
            Boolean.class,
            solicitanteId,
            referenciaId,
            livroId,
            donoId));
  }

  /**
   * Via da lista (RN-15), na regra de {@code reacoes.repository.ts#viaLista}: lista ativa do dono
   * com esse livro e perfil público <b>ou</b> seguimento aceito. A lista é recurso de perfil, e
   * RN-08 deixa a de perfil público visível a todos.
   */
  public boolean viaLista(UUID referenciaId, UUID livroId, UUID donoId, UUID solicitanteId) {
    return Boolean.TRUE.equals(
        jdbc.queryForObject(
            """
            SELECT EXISTS (
              SELECT 1
                FROM v_lista_livro_pessoal_v1 v
                JOIN identidade.v_perfil_referencia_v1 p ON p.id = v.dono_id
               WHERE v.lista_id = ? AND v.livro_id = ? AND v.dono_id = ?
                 AND (
                   p.privacidade = 'publico'
                   OR EXISTS (
                     SELECT 1 FROM identidade.v_seguimento_aceito_v1 seg
                      WHERE seg.seguido_id = v.dono_id AND seg.seguidor_id = ?
                   )
                 )
            )
            """,
            Boolean.class,
            referenciaId,
            livroId,
            donoId,
            solicitanteId));
  }
}
